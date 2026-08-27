from __future__ import annotations

from typing import Any

from retinascan_ai.contracts import GradePrediction, Segmentations


class DRGradingModule:
    def __init__(self, config: dict[str, Any] | None = None, model_version: str = "stub-0.1.0") -> None:
        self.config = config or {}
        self.model_version = model_version

    def run(self, image: Any, segments: Segmentations | None = None) -> GradePrediction:
        return GradePrediction(
            icdr_level=0,
            class_label="no_dr",
            referable_dr=False,
            confidence=0.50,
            model_version=self.model_version,
            notes=["Stub classifier. Replace with trained DR model before reporting metrics."],
        )

    def ungradeable(self) -> GradePrediction:
        return GradePrediction(
            icdr_level=None,
            class_label="ungradeable",
            referable_dr=False,
            confidence=0.0,
            model_version=self.model_version,
            notes=["No DR grade assigned because image was rejected."],
        )
