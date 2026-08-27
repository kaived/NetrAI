# Validation Plan

The pitch should use clinical screening metrics, not only generic ML accuracy.

## Primary Metrics

- Sensitivity for referable DR
- Specificity for non-referable DR
- AUC for referable DR
- Confusion matrix over ICDR levels 0 to 4
- Image quality rejection precision
- Average inference time per image

## Acceptance Targets

- Sensitivity: greater than 90 percent for referable DR
- Specificity: greater than 85 percent for non-referable DR
- Review time: under 30 seconds per image in demo walkthrough
- Throughput: enough patients/day to support 100,000 patients/year assumptions

## Validation Workflow

1. Freeze a validation split.
2. Choose one model checkpoint as the demo candidate.
3. Tune threshold for screening sensitivity.
4. Evaluate on Messidor-2 or the strongest available external set.
5. Save metrics, threshold, model version, and config.
6. Generate demo outputs from fixed sample images.

## Reporting Rules

- Always specify dataset and sample count.
- Report sensitivity and specificity together.
- Avoid claiming clinical deployment readiness without prospective validation.
- Use "screening support" and "ophthalmologist review" language.

## Explanation Validation

Grad-CAM shows classifier attention. It does not prove lesion detection.

Use stronger language only when:

- Heatmaps are compared with IDRiD lesion masks.
- The comparison metric is reported.
- Failed examples are acknowledged.
