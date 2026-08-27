from __future__ import annotations

from typing import Any

from retinascan_ai.contracts import Segmentations


class SegmentationModule:
    def __init__(self, config: dict[str, Any] | None = None) -> None:
        self.config = config or {}

    def run(self, image: Any) -> Segmentations:
        enabled = bool(self.config.get("enabled", False))

        if not enabled:
            return Segmentations(
                enabled=False,
                masks={},
                findings=["M2 disabled for MVP. Enable after M3 classifier baseline works."],
            )

        return Segmentations(
            enabled=True,
            masks={},
            findings=["Segmentation placeholder. Add vessel and lesion masks here."],
        )
