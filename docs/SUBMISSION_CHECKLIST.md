# Submission Checklist

## Proposal Refinement

- Confirm SIH theme and problem statement mapping.
- Add citations for diabetes burden, DR prevalence, preventable blindness, and rural ophthalmologist shortage.
- Reframe the tool as screening support, not diagnosis.
- Add privacy, consent, and human review safeguards.
- Add one architecture diagram.
- Add one sample report or output screenshot.

## Code Readiness

- End-to-end demo command works.
- Config file controls thresholds and paths.
- Sample images are documented.
- Model checkpoint path is configurable.
- Metrics are reproducible from saved split files.
- Offline demo works without internet.

## Pitch Readiness

- Demo video recorded before final day.
- Fallback slides show screenshots for each module.
- Sensitivity and specificity are reported clearly.
- Throughput assumptions are visible.
- Risks and mitigations match what the code actually does.

## Final Demo Flow

1. Open input image.
2. Run quality assessment.
3. Show enhanced/preprocessed image.
4. Show grade and referable DR decision.
5. Show explanation heatmap.
6. Show clinical summary.
7. Show district-scale throughput estimate.
