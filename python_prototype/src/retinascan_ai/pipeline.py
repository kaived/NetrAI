from __future__ import annotations

from typing import Any

from retinascan_ai.contracts import PipelineResult, PreprocessedImage, Segmentations
from retinascan_ai.modules.explainability import ExplainabilityModule
from retinascan_ai.modules.grading import DRGradingModule
from retinascan_ai.modules.image_quality import ImageQualityModule
from retinascan_ai.modules.reporting import ReportingModule
from retinascan_ai.modules.segmentation import SegmentationModule
from retinascan_ai.modules.simulation import ThroughputSimulationModule


class RetinaScanPipeline:
    """End-to-end prototype pipeline with replaceable module boundaries."""

    def __init__(self, config: dict[str, Any] | None = None) -> None:
        self.config = config or {}
        self.quality_module = ImageQualityModule(self.config.get("m1", {}))
        self.segmentation_module = SegmentationModule(self.config.get("m2", {}))
        self.grading_module = DRGradingModule(self.config.get("m3", {}), self._model_version())
        self.explainability_module = ExplainabilityModule(self.config.get("m4", {}))
        self.simulation_module = ThroughputSimulationModule(self.config.get("m5", {}))
        self.reporting_module = ReportingModule(self.config.get("report", {}))

    def run(self, image: Any) -> PipelineResult:
        quality = self.quality_module.run(image)

        if quality.is_gradeable:
            preprocessed = self.quality_module.preprocess(image)
            segments = self.segmentation_module.run(preprocessed.image)
            grade = self.grading_module.run(preprocessed.image, segments)
            explanation = self.explainability_module.run(preprocessed.image, grade, segments)
        else:
            preprocessed = PreprocessedImage(
                image=None,
                method="not_applied",
                notes=["Image rejected by quality gate."],
            )
            segments = Segmentations(
                enabled=False,
                findings=["Skipped because image was not gradeable."],
            )
            grade = self.grading_module.ungradeable()
            explanation = self.explainability_module.skipped()

        throughput = self.simulation_module.run()
        report = self.reporting_module.run(quality, grade, explanation)

        return PipelineResult(
            quality=quality,
            preprocessed=preprocessed,
            segments=segments,
            grade=grade,
            explanation=explanation,
            throughput=throughput,
            report=report,
        )

    def _model_version(self) -> str:
        project = self.config.get("project", {})
        return str(project.get("model_version", "stub-0.1.0"))
