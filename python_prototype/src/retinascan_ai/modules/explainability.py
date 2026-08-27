from __future__ import annotations

from typing import Any

from retinascan_ai.contracts import Explanation, GradePrediction, Segmentations


class ExplainabilityModule:
    def __init__(self, config: dict[str, Any] | None = None) -> None:
        self.config = config or {}

    def run(self, image: Any, grade: GradePrediction, segments: Segmentations) -> Explanation:
        method = str(self.config.get("method", "grad_cam"))
        guidance = (
            "Refer to ophthalmologist for priority review."
            if grade.referable_dr
            else "No referable DR detected by screening model. Follow local screening schedule."
        )

        return Explanation(
            method=method,
            heatmap=None,
            notes=[f"Placeholder {method} output. Add model-specific gradients here."],
            review_guidance=guidance,
        )

    def skipped(self) -> Explanation:
        return Explanation(
            method="not_applied",
            heatmap=None,
            notes=["Explanation skipped because image was not gradeable."],
            review_guidance="Review unavailable.",
        )
