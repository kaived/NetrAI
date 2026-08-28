from __future__ import annotations

from pydantic import BaseModel, Field


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
    focus_score: float
    brightness: float
    contrast: float
    reasons: list[str] = Field(default_factory=list)


class PredictionResult(BaseModel):
    icdr_grade: int | None
    label: str
    referable_dr: bool
    confidence: float
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


class CaseResult(BaseModel):
    case_id: str
    status: str
    quality: QualityResult
    prediction: PredictionResult
    explanation: ExplanationResult
    report: ReportResult
    storage: StorageResult
