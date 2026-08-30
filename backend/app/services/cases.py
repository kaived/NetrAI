from __future__ import annotations

import json
from datetime import UTC, datetime, timedelta, timezone
from pathlib import Path
from uuid import uuid4

from app.config import Settings
from app.schemas import CaseResult, EyeScreeningResult, FinalReportResult

EYE_ORDER = ("OD", "OS")

CASE_ID_TIMEZONE = timezone(timedelta(hours=5, minutes=30), name="IST")


class CaseRepository:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings
        self.local_dir = Path(settings.local_storage_dir) / "cases"
        self.local_dir.mkdir(parents=True, exist_ok=True)
        self._firestore_client = None
        self.collection_name = settings.firestore_cases_collection

    def new_case_id(self) -> str:
        timestamp = datetime.now(CASE_ID_TIMEZONE).strftime("%Y%m%d-%H%M%S")
        return f"CASE-{timestamp}-{uuid4().hex[:6].upper()}"

    def create_case(self, case_id: str, filename: str, status: str) -> None:
        self._write_case(
            case_id,
            {
                "case_id": case_id,
                "filename": filename,
                "status": status,
                "created_at": datetime.now(UTC).isoformat(),
            },
        )

    def update_case(self, case_id: str, **updates: object) -> None:
        case = self.get_case(case_id) or {"case_id": case_id}
        case.update(updates)
        case["updated_at"] = datetime.now(UTC).isoformat()
        self._write_case(case_id, case)

    def save_result(self, result: CaseResult) -> CaseResult:
        aggregate_result = self._build_aggregate_result(result)
        data = aggregate_result.model_dump(mode="json")
        data["updated_at"] = datetime.now(UTC).isoformat()
        self._write_case(result.case_id, data)
        return aggregate_result

    @staticmethod
    def is_eye_completed(case: dict | None, eye: str) -> bool:
        if not case:
            return False

        eye_result = _get_eye_result(case, eye)
        return bool(eye_result and eye_result.status == "completed" and eye_result.quality.is_gradeable)

    def get_case(self, case_id: str) -> dict | None:
        if self.settings.firestore_enabled:
            client = self._get_firestore_client()
            doc = client.collection(self.collection_name).document(case_id).get()
            return doc.to_dict() if doc.exists else None

        path = self.local_dir / f"{case_id}.json"
        if not path.exists():
            return None
        return json.loads(path.read_text(encoding="utf-8"))

    def _write_case(self, case_id: str, data: dict) -> None:
        if self.settings.firestore_enabled:
            client = self._get_firestore_client()
            client.collection(self.collection_name).document(case_id).set(data, merge=True)
            return

        path = self.local_dir / f"{case_id}.json"
        path.write_text(json.dumps(data, indent=2), encoding="utf-8")

    def _get_firestore_client(self):
        if self._firestore_client is None:
            import firebase_admin
            from firebase_admin import credentials, firestore

            try:
                firebase_admin.get_app()
            except ValueError:
                options = {}
                project_id = self.settings.firebase_project_id or self.settings.gcp_project_id
                if project_id:
                    options["projectId"] = project_id

                if self.settings.firebase_credentials_path:
                    cred = credentials.Certificate(self.settings.firebase_credentials_path)
                    firebase_admin.initialize_app(cred, options)
                else:
                    firebase_admin.initialize_app(options=options or None)

            self._firestore_client = firestore.client()
        return self._firestore_client

    def _build_aggregate_result(self, result: CaseResult) -> CaseResult:
        eye = result.patient.eye if result.patient and result.patient.eye else None
        if eye not in EYE_ORDER:
            return result

        existing_case = self.get_case(result.case_id) or {}
        eyes = _parse_eye_results(existing_case.get("eyes"))
        eyes[eye] = EyeScreeningResult(
            eye=eye,
            status=result.status,
            patient=result.patient,
            quality=result.quality,
            prediction=result.prediction,
            explanation=result.explanation,
            report=result.report,
            storage=result.storage,
        )

        completed_eyes = _completed_eyes(eyes)
        final_report = _build_final_report(eyes, completed_eyes)
        next_eye = _next_eye(eye, completed_eyes, result)
        status = "completed" if final_report else _case_status(result)

        return CaseResult(
            case_id=result.case_id,
            status=status,
            patient=result.patient,
            quality=result.quality,
            prediction=result.prediction,
            explanation=result.explanation,
            report=result.report,
            storage=result.storage,
            completed_eyes=completed_eyes,
            next_eye=next_eye,
            is_case_complete=final_report is not None,
            eyes=eyes,
            final_report=final_report,
        )


def _get_eye_result(case: dict, eye: str) -> EyeScreeningResult | None:
    eyes = _parse_eye_results(case.get("eyes"))
    return eyes.get(eye)


def _parse_eye_results(raw_eyes: object) -> dict[str, EyeScreeningResult]:
    if not isinstance(raw_eyes, dict):
        return {}

    parsed: dict[str, EyeScreeningResult] = {}
    for eye, payload in raw_eyes.items():
        normalized_eye = str(eye).upper()
        if normalized_eye not in EYE_ORDER:
            continue
        try:
            parsed[normalized_eye] = EyeScreeningResult.model_validate(payload)
        except Exception:
            continue
    return parsed


def _completed_eyes(eyes: dict[str, EyeScreeningResult]) -> list[str]:
    return [
        eye
        for eye in EYE_ORDER
        if eye in eyes and eyes[eye].status == "completed" and eyes[eye].quality.is_gradeable
    ]


def _build_final_report(
    eyes: dict[str, EyeScreeningResult],
    completed_eyes: list[str],
) -> FinalReportResult | None:
    if any(eye not in completed_eyes for eye in EYE_ORDER):
        return None

    completed_results = [eyes[eye] for eye in EYE_ORDER]
    worst_grade = max(_grade_value(item) for item in completed_results)
    worst_results = [item for item in completed_results if _grade_value(item) == worst_grade]
    worst_result = max(worst_results, key=lambda item: item.prediction.confidence)
    worst_label = worst_result.prediction.label
    worst_eyes = [item.eye for item in worst_results]
    has_worst_grade_tie = len(worst_eyes) > 1
    worst_eye_text = "both eyes" if has_worst_grade_tie else _eye_label(worst_result.eye)
    referable = any(_grade_value(item) >= 2 for item in completed_results)
    low_confidence = any((item.prediction.confidence_level or "").lower() == "low" for item in completed_results)

    if referable:
        finding_text = (
            f"Worst grade present in {worst_eye_text}: {worst_label} (Grade {worst_grade})."
            if has_worst_grade_tie
            else f"Worst eye {worst_eye_text}: {worst_label} (Grade {worst_grade})."
        )
        summary = (
            "Final two-eye screening: referable diabetic retinopathy suspected. "
            f"{finding_text}"
        )
        recommendation = "Ophthalmologist review recommended. Treat as triage-positive because at least one eye is Grade 2 or higher."
    else:
        finding_text = (
            f"Highest grade present in {worst_eye_text}: {worst_label} (Grade {worst_grade})."
            if has_worst_grade_tie
            else f"Highest finding {_eye_label(worst_result.eye)}: {worst_label} (Grade {worst_grade})."
        )
        summary = (
            "Final two-eye screening: no referable diabetic retinopathy detected in either eye. "
            f"{finding_text}"
        )
        recommendation = "Routine screening follow-up may be used unless symptoms or clinical risk factors require review."

    if low_confidence:
        recommendation += " At least one eye has low model confidence, so manual verification is recommended."

    return FinalReportResult(
        summary=summary,
        recommendation=recommendation,
        disclaimer="Screening support only. Not a final diagnosis.",
        referable_dr=referable,
        worst_eye=None if has_worst_grade_tie else worst_result.eye,
        worst_eyes=worst_eyes,
        worst_icdr_grade=worst_grade,
        worst_label=worst_label,
        completed_eyes=completed_eyes,
    )


def _grade_value(result: EyeScreeningResult) -> int:
    return result.prediction.icdr_grade if result.prediction.icdr_grade is not None else -1


def _next_eye(current_eye: str, completed_eyes: list[str], result: CaseResult) -> str | None:
    if result.status != "completed" or not result.quality.is_gradeable:
        return current_eye

    for eye in EYE_ORDER:
        if eye not in completed_eyes:
            return eye
    return None


def _case_status(result: CaseResult) -> str:
    if result.status == "rejected_ungradeable":
        return "rejected_ungradeable"
    return "in_progress"


def _eye_label(eye: str) -> str:
    return "OD Right" if eye == "OD" else "OS Left"
