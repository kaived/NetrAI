from __future__ import annotations

from typing import Any

from retinascan_ai.contracts import ThroughputSimulation


class ThroughputSimulationModule:
    def __init__(self, config: dict[str, Any] | None = None) -> None:
        self.config = config or {}

    def run(self) -> ThroughputSimulation:
        target = int(self.config.get("patients_per_year_target", 100000))
        working_days = int(self.config.get("working_days_per_year", 250))
        cameras = int(self.config.get("cameras", 4))
        capture_minutes = float(self.config.get("capture_minutes_per_patient", 3.0))
        review_seconds = float(self.config.get("ophthalmologist_review_seconds_per_positive", 30.0))
        positive_rate = float(self.config.get("expected_positive_rate", 0.18))

        daily_target = target / working_days
        daily_capture_capacity = cameras * (8 * 60) / capture_minutes
        expected_positive_reviews = daily_target * positive_rate
        review_hours = expected_positive_reviews * review_seconds / 3600

        bottleneck = (
            "capture_capacity"
            if daily_capture_capacity < daily_target
            else "ophthalmologist_review_or_operations"
        )

        return ThroughputSimulation(
            target_patients_per_year=target,
            daily_target_patients=daily_target,
            daily_capture_capacity=daily_capture_capacity,
            expected_positive_reviews_per_day=expected_positive_reviews,
            ophthalmologist_review_hours_per_day=review_hours,
            bottleneck=bottleneck,
        )
