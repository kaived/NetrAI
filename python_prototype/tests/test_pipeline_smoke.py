from retinascan_ai.pipeline import RetinaScanPipeline


def test_pipeline_smoke_run_returns_report() -> None:
    result = RetinaScanPipeline().run(object())

    assert result.quality.is_gradeable is True
    assert result.grade.class_label == "no_dr"
    assert "Screening result" in result.report.summary
