from __future__ import annotations

from app.config import Settings
from app.schemas import (
    CaseResult,
    ExplanationResult,
    PredictionResult,
    ReportResult,
    StorageResult,
)
from app.services.image_pipeline import ImagePipeline
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

    async def predict(self, case_id: str, image_bytes: bytes, filename: str) -> CaseResult:
        quality = self.image_pipeline.run_quality(image_bytes)

        if not quality.is_gradeable:
            prediction = PredictionResult(
                icdr_grade=None,
                label="ungradeable",
                referable_dr=False,
                confidence=0.0,
                model_version=self.settings.model_version,
            )
            explanation = ExplanationResult(
                method="not_applied",
                heatmap_url=None,
                text="Explanation skipped because the image did not pass the quality gate.",
            )
            report = ReportResult(
                summary="Image rejected by quality gate.",
                recommendation=" ".join(quality.reasons),
                disclaimer="Screening support only. Not a final diagnosis.",
            )
            report_uri = self.storage_service.save_output_json(
                case_id,
                "report.json",
                report.model_dump(mode="json"),
            )
            return CaseResult(
                case_id=case_id,
                status="rejected_ungradeable",
                quality=quality,
                prediction=prediction,
                explanation=explanation,
                report=report,
                storage=StorageResult(report_uri=report_uri),
            )

        if self.settings.inference_mode == "onnx":
            return self._predict_with_onnx(case_id, image_bytes, quality)

        return self._predict_stub(case_id, quality)

    def _predict_with_onnx(self, case_id: str, image_bytes: bytes, quality) -> CaseResult:
        prediction = self.image_pipeline.predict_onnx(image_bytes)
        explanation = ExplanationResult(
            method="grad_cam_pending",
            heatmap_url=None,
            text="ONNX inference completed. Grad-CAM will be added after the exported model is stable.",
        )
        report = self._build_report(prediction, explanation)
        report_uri = self.storage_service.save_output_json(case_id, "report.json", report.model_dump(mode="json"))

        return CaseResult(
            case_id=case_id,
            status="completed",
            quality=quality,
            prediction=prediction,
            explanation=explanation,
            report=report,
            storage=StorageResult(report_uri=report_uri),
        )

    def _predict_stub(self, case_id: str, quality) -> CaseResult:
        prediction = PredictionResult(
            icdr_grade=2,
            label="moderate",
            referable_dr=True,
            confidence=0.91,
            model_version=self.settings.model_version,
        )
        explanation = ExplanationResult(
            method="grad_cam_stub",
            heatmap_url=None,
            text="Demo mode: ONNX model file is not connected yet. MATLAB export will replace this stub.",
        )
        report = self._build_report(prediction, explanation)

        report_uri = self.storage_service.save_output_json(case_id, "report.json", report.model_dump(mode="json"))

        return CaseResult(
            case_id=case_id,
            status="completed",
            quality=quality,
            prediction=prediction,
            explanation=explanation,
            report=report,
            storage=StorageResult(report_uri=report_uri),
        )

    def _build_report(self, prediction: PredictionResult, explanation: ExplanationResult) -> ReportResult:
        if prediction.referable_dr:
            summary = f"Referable DR suspected: {prediction.label}, confidence {prediction.confidence:.2f}."
            recommendation = "Ophthalmologist review recommended."
        else:
            summary = f"No referable DR detected: {prediction.label}, confidence {prediction.confidence:.2f}."
            recommendation = "Routine screening follow-up recommended according to local protocol."

        if prediction.icdr_grade is None:
            summary = "No DR grade assigned."
            recommendation = "Please recapture a gradeable retinal image."

        return ReportResult(
            summary=summary,
            recommendation=recommendation,
            disclaimer="Screening support only. Not a final diagnosis.",
        )
