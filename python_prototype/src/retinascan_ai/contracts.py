from __future__ import annotations

from dataclasses import asdict, dataclass, field
from typing import Any


@dataclass
class ImageQuality:
    is_gradeable: bool
    focus_score: float
    brightness: float
    contrast: float
    reasons: list[str] = field(default_factory=list)


@dataclass
class PreprocessedImage:
    image: Any
    method: str
    notes: list[str] = field(default_factory=list)


@dataclass
class Segmentations:
    enabled: bool
    masks: dict[str, Any] = field(default_factory=dict)
    findings: list[str] = field(default_factory=list)


@dataclass
class GradePrediction:
    icdr_level: int | None
    class_label: str
    referable_dr: bool
    confidence: float
    model_version: str
    notes: list[str] = field(default_factory=list)


@dataclass
class Explanation:
    method: str
    heatmap: Any
    notes: list[str] = field(default_factory=list)
    review_guidance: str = ""


@dataclass
class ThroughputSimulation:
    target_patients_per_year: int
    daily_target_patients: float
    daily_capture_capacity: float
    expected_positive_reviews_per_day: float
    ophthalmologist_review_hours_per_day: float
    bottleneck: str


@dataclass
class ClinicalReport:
    summary: str
    recommendation: str
    disclaimer: str


@dataclass
class PipelineResult:
    quality: ImageQuality
    preprocessed: PreprocessedImage
    segments: Segmentations
    grade: GradePrediction
    explanation: Explanation
    throughput: ThroughputSimulation
    report: ClinicalReport

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)
