from __future__ import annotations

from typing import Any

from retinascan_ai.contracts import ClinicalReport, Explanation, GradePrediction, ImageQuality


class ReportingModule:
    def __init__(self, config: dict[str, Any] | None = None) -> None:
        self.config = config or {}

    def run(
        self,
        quality: ImageQuality,
        grade: GradePrediction,
        explanation: Explanation,
    ) -> ClinicalReport:
        disclaimer = (
            str(
                self.config.get(
                    "disclaimer",
                    "Screening support only. Final clinical decision requires ophthalmologist review.",
                )
            )
            if self.config.get("include_disclaimer", True)
            else ""
        )

        if not quality.is_gradeable:
            return ClinicalReport(
                summary="Image rejected by quality gate. No DR grade assigned.",
                recommendation=" ".join(quality.reasons),
                disclaimer=disclaimer,
            )

        if grade.referable_dr:
            summary = (
                f"Screening result: referable DR suspected. "
                f"ICDR level {grade.icdr_level}, confidence {grade.confidence:.2f}."
            )
        else:
            summary = (
                f"Screening result: no referable DR detected. "
                f"ICDR level {grade.icdr_level}, confidence {grade.confidence:.2f}."
            )

        return ClinicalReport(
            summary=summary,
            recommendation=explanation.review_guidance,
            disclaimer=disclaimer,
        )
