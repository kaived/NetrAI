from __future__ import annotations

import re

from pydantic import BaseModel, Field, field_validator, model_validator

CASE_ID_PATTERN = re.compile(r"^CASE-\d{8}-\d{6}-[A-F0-9]{6}$")
DIABETES_DURATION_PATTERN = re.compile(r"^\d{1,2}(?:\.\d{1,2})?\s*(?:yrs?|years?)?$", re.IGNORECASE)
DIABETES_TYPES = {
    "Type 2 DM",
    "Type 1 DM",
    "Gestational DM",
    "Pre-Diabetes",
    "Secondary / Other",
    "Type 2 Diabetes",
    "Type 1 Diabetes",
    "Gestational Diabetes",
}


class HealthResponse(BaseModel):
    status: str
    environment: str
    firestore_enabled: bool
    gcs_enabled: bool
    inference_mode: str
    model_version: str
    model_loaded: bool


class QualityResult(BaseModel):
    is_gradeable: bool
    is_supported_fundus: bool = True
    focus_score: float
    brightness: float
    contrast: float
    compatibility_score: float = 1.0
    fundus_area_ratio: float | None = None
    edge_artifact_ratio: float | None = None
    reasons: list[str] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)


class PredictionResult(BaseModel):
    icdr_grade: int | None
    label: str
    referable_dr: bool
    referable_probability: float | None = None
    confidence: float
    confidence_level: str = "unknown"
    model_version: str


class ExplanationResult(BaseModel):
    method: str
    heatmap_url: str | None = None
    text: str


class ReportResult(BaseModel):
    summary: str
    recommendation: str
    disclaimer: str


class StorageResult(BaseModel):
    input_uri: str | None = None
    heatmap_uri: str | None = None
    report_uri: str | None = None


class FinalReportResult(BaseModel):
    summary: str
    recommendation: str
    disclaimer: str
    referable_dr: bool
    worst_eye: str | None = None
    worst_eyes: list[str] = Field(default_factory=list)
    worst_icdr_grade: int | None = None
    worst_label: str | None = None
    completed_eyes: list[str] = Field(default_factory=list)


class PatientMetadata(BaseModel):
    eye: str | None = None
    patient_age: str | None = None
    diabetes_type: str | None = None
    diabetic_duration: str | None = None

    @field_validator("eye", "patient_age", "diabetes_type", "diabetic_duration", mode="before")
    @classmethod
    def clean_optional_text(cls, value: str | None) -> str | None:
        if value is None:
            return None
        if not isinstance(value, str):
            raise ValueError("must be text")
        cleaned = value.strip()
        return cleaned or None

    @field_validator("eye")
    @classmethod
    def validate_eye(cls, value: str | None) -> str | None:
        if value is None:
            return None
        normalized = value.upper()
        if normalized not in {"OD", "OS"}:
            raise ValueError("eye must be OD or OS")
        return normalized

    @field_validator("patient_age")
    @classmethod
    def validate_patient_age(cls, value: str | None) -> str | None:
        if value is None:
            return None
        if not value.isdigit():
            raise ValueError("patient age must be a number in years")
        age = int(value)
        if age < 1 or age > 120:
            raise ValueError("patient age must be between 1 and 120")
        return value

    @field_validator("diabetes_type")
    @classmethod
    def validate_diabetes_type(cls, value: str | None) -> str | None:
        if value is None:
            return None
        if value not in DIABETES_TYPES:
            raise ValueError("diabetes type is not supported")
        return value

    @field_validator("diabetic_duration")
    @classmethod
    def validate_diabetic_duration(cls, value: str | None) -> str | None:
        if value is None:
            return None
        if len(value) > 20 or not DIABETES_DURATION_PATTERN.fullmatch(value):
            raise ValueError("years since diagnosis must look like 8 or 8 yrs")
        return value


class ScreeningRequestMetadata(PatientMetadata):
    case_id: str | None = None

    @field_validator("case_id", mode="before")
    @classmethod
    def clean_case_id(cls, value: str | None) -> str | None:
        return cls.clean_optional_text(value)

    @field_validator("case_id")
    @classmethod
    def validate_case_id(cls, value: str | None) -> str | None:
        if value is None:
            return None
        normalized = value.upper()
        if not CASE_ID_PATTERN.fullmatch(normalized):
            raise ValueError("case_id must look like CASE-YYYYMMDD-HHMMSS-ABC123")
        return normalized

    @model_validator(mode="after")
    def validate_required_screening_fields(self) -> "ScreeningRequestMetadata":
        missing = []
        if not self.eye:
            missing.append("eye")
        if not self.patient_age:
            missing.append("patient_age")
        if not self.diabetes_type:
            missing.append("diabetes_type")

        if missing:
            raise ValueError(f"required screening field(s) missing: {', '.join(missing)}")

        return self

    def to_patient_metadata(self) -> PatientMetadata | None:
        patient = PatientMetadata(
            eye=self.eye,
            patient_age=self.patient_age,
            diabetes_type=self.diabetes_type,
            diabetic_duration=self.diabetic_duration,
        )
        if not any(patient.model_dump(exclude_none=True).values()):
            return None
        return patient


class EyeScreeningResult(BaseModel):
    eye: str
    status: str
    patient: PatientMetadata | None = None
    quality: QualityResult
    prediction: PredictionResult
    explanation: ExplanationResult
    report: ReportResult
    storage: StorageResult


class CaseResult(BaseModel):
    case_id: str
    status: str
    runtime: str | None = None
    sync_status: str | None = None
    patient: PatientMetadata | None = None
    quality: QualityResult
    prediction: PredictionResult
    explanation: ExplanationResult
    report: ReportResult
    storage: StorageResult
    completed_eyes: list[str] = Field(default_factory=list)
    next_eye: str | None = None
    is_case_complete: bool = False
    eyes: dict[str, EyeScreeningResult] = Field(default_factory=dict)
    final_report: FinalReportResult | None = None


class OfflineCaseSyncRequest(BaseModel):
    case: CaseResult
    images: dict[str, str] = Field(default_factory=dict)
    heatmaps: dict[str, str] = Field(default_factory=dict)
