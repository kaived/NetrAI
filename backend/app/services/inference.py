from __future__ import annotations

from app.config import Settings
from app.schemas import (
    CaseResult,
    ExplanationResult,
    PatientMetadata,
    PredictionResult,
    QualityResult,
    ReportResult,
    StorageResult,
)
from app.services.image_pipeline import ImagePipeline
from app.services.image_pipeline import confidence_level as classify_confidence
from app.services.storage import StorageService


class InferenceService:
    def __init__(self, settings: Settings, storage_service: StorageService) -> None:
        self.settings = settings
        self.storage_service = storage_service
        self.image_pipeline = ImagePipeline(settings)

    def is_model_ready(self) -> bool:
        return self.image_pipeline.is_model_ready()

    def prepare_model(self) -> None:
        self.image_pipeline.prepare_model()

    async def predict(
        self,
        case_id: str,
        image_bytes: bytes,
        filename: str,
        patient: PatientMetadata | None = None,
    ) -> CaseResult:
        quality = self.image_pipeline.run_quality(image_bytes)

        if not quality.is_gradeable:
            prediction = PredictionResult(
                icdr_grade=None,
                label="ungradeable",
                referable_dr=False,
                confidence=0.0,
                confidence_level="not_applicable",
                model_version=self.settings.model_version,
            )
            explanation = ExplanationResult(
                method="not_applied",
                heatmap_url=None,
                text="Explanation skipped because the image did not pass the quality gate.",
            )
            report = ReportResult(
                summary="Image rejected by quality gate.",
                recommendation=" ".join(quality.reasons)
                or "Please recapture a standard macula/disc-centered retinal fundus image.",
                disclaimer="Screening support only. Not a final diagnosis.",
            )
            report_uri = self.storage_service.save_output_json(
                case_id,
                self._artifact_name(patient, "report.json"),
                report.model_dump(mode="json"),
            )
            return CaseResult(
                case_id=case_id,
                status="rejected_ungradeable",
                patient=patient,
                quality=quality,
                prediction=prediction,
                explanation=explanation,
                report=report,
                storage=StorageResult(report_uri=report_uri),
            )

        if self.settings.inference_mode == "onnx":
            return self._predict_with_onnx(case_id, image_bytes, quality, patient)

        return self._predict_stub(case_id, quality, patient)

    def _predict_with_onnx(
        self,
        case_id: str,
        image_bytes: bytes,
        quality: QualityResult,
        patient: PatientMetadata | None,
    ) -> CaseResult:
        prediction = self.image_pipeline.predict_onnx(image_bytes)
        self._apply_prediction_safety_review(prediction, quality)
        heatmap_bytes = self.image_pipeline.generate_attention_heatmap(image_bytes)
        heatmap_uri = self.storage_service.save_output_bytes(
            case_id,
            self._artifact_name(patient, "attention_heatmap.png"),
            heatmap_bytes,
            content_type="image/png",
        )
        explanation = ExplanationResult(
            method="cv_lesion_attention_v1",
            heatmap_url=self._heatmap_url(case_id, patient),
            text=self._build_explanation_text(quality),
        )
        report = self._build_report(prediction, explanation)
        report_uri = self.storage_service.save_output_json(
            case_id,
            self._artifact_name(patient, "report.json"),
            report.model_dump(mode="json"),
        )

        return CaseResult(
            case_id=case_id,
            status="completed",
            patient=patient,
            quality=quality,
            prediction=prediction,
            explanation=explanation,
            report=report,
            storage=StorageResult(heatmap_uri=heatmap_uri, report_uri=report_uri),
        )

    def _predict_stub(self, case_id: str, quality: QualityResult, patient: PatientMetadata | None) -> CaseResult:
        prediction = PredictionResult(
            icdr_grade=2,
            label="moderate",
            referable_dr=True,
            confidence=0.91,
            confidence_level="high",
            model_version=self.settings.model_version,
        )
        explanation = ExplanationResult(
            method="grad_cam_stub",
            heatmap_url=None,
            text="Demo mode: ONNX model file is not connected yet. MATLAB export will replace this stub.",
        )
        report = self._build_report(prediction, explanation)

        report_uri = self.storage_service.save_output_json(
            case_id,
            self._artifact_name(patient, "report.json"),
            report.model_dump(mode="json"),
        )

        return CaseResult(
            case_id=case_id,
            status="completed",
            patient=patient,
            quality=quality,
            prediction=prediction,
            explanation=explanation,
            report=report,
            storage=StorageResult(report_uri=report_uri),
        )

    def _build_report(self, prediction: PredictionResult, explanation: ExplanationResult) -> ReportResult:
        level = prediction.confidence_level
        if level == "unknown":
            level = classify_confidence(prediction.confidence)

        if prediction.referable_dr:
            if level == "low":
                summary = (
                    f"Possible referable DR suspected: {prediction.label}, "
                    f"low model confidence {prediction.confidence:.2f}."
                )
                recommendation = "Ophthalmologist review recommended; verify manually because model confidence is low."
            elif level == "moderate":
                summary = (
                    f"Referable DR suspected: {prediction.label}, "
                    f"moderate model confidence {prediction.confidence:.2f}."
                )
                recommendation = "Ophthalmologist review recommended. Treat as triage-positive screening."
            else:
                summary = f"Referable DR suspected: {prediction.label}, high model confidence {prediction.confidence:.2f}."
                recommendation = "Ophthalmologist review recommended."
        else:
            if level == "low":
                summary = (
                    f"No referable DR detected: {prediction.label}, "
                    f"but model confidence is low at {prediction.confidence:.2f}."
                )
                recommendation = "Repeat capture or ophthalmologist review recommended before routine follow-up."
            elif level == "moderate":
                summary = (
                    f"No referable DR detected: {prediction.label}, "
                    f"moderate model confidence {prediction.confidence:.2f}."
                )
                recommendation = "Routine follow-up may be used with clinical review if symptoms or risk factors are present."
            else:
                summary = f"No referable DR detected: {prediction.label}, high model confidence {prediction.confidence:.2f}."
                recommendation = "Routine screening follow-up recommended according to local protocol."

        if prediction.icdr_grade is None:
            summary = "No DR grade assigned."
            recommendation = "Please recapture a gradeable retinal image."

        return ReportResult(
            summary=summary,
            recommendation=recommendation,
            disclaimer="Screening support only. Not a final diagnosis.",
        )

    @staticmethod
    def _apply_prediction_safety_review(prediction: PredictionResult, quality: QualityResult) -> None:
        if not quality.warnings:
            return

        severe_grade = prediction.icdr_grade is not None and prediction.icdr_grade >= 3
        if severe_grade and prediction.confidence < 0.70:
            prediction.confidence_level = "low"

    @staticmethod
    def _build_explanation_text(quality: QualityResult) -> str:
        text = (
            "Computer-vision lesion attention heatmap generated from contrast-enhanced fundus features. "
            "This is a fast explainability layer for screening review."
        )
        if quality.warnings:
            text += " Image compatibility warnings were detected; manual verification is recommended."
        return text

    @staticmethod
    def _artifact_name(patient: PatientMetadata | None, filename: str) -> str:
        if patient and patient.eye in {"OD", "OS"}:
            return f"{patient.eye}_{filename}"
        return filename

    @staticmethod
    def _heatmap_url(case_id: str, patient: PatientMetadata | None) -> str:
        if patient and patient.eye in {"OD", "OS"}:
            return f"/cases/{case_id}/eyes/{patient.eye}/heatmap"
        return f"/cases/{case_id}/heatmap"
