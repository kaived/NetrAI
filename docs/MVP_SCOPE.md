# MVP Scope

The proposal is strong, but the implementation scope needs a sharper first milestone.

## Must Have

- Load a fundus image from disk.
- Reject clearly poor images with a human-readable recapture reason.
- Preprocess gradeable images.
- Predict ICDR grade 0 to 4.
- Derive referable DR as ICDR level >= 2.
- Show confidence and model version.
- Generate an explanation artifact, initially Grad-CAM.
- Produce a short clinical-style report.
- Run a throughput estimate for 100,000 patients/year assumptions.

## Should Have

- Messidor-2 validation split and metrics table.
- IDRiD overlay comparison for explanation/lesion work.
- Confusion matrix and ROC/threshold analysis.
- Offline demo mode with bundled sample outputs.
- Basic UI or notebook for judges to inspect inputs and outputs.

## Could Have

- Vessel segmentation.
- Microaneurysm, hemorrhage, and exudate masks.
- Simulink block diagram instead of calculation-only simulation.
- MATLAB Compiler packaging.
- Telemedicine queue dashboard.

## Avoid For MVP

- Building a full electronic medical record system.
- Claiming diagnosis or autonomous treatment recommendations.
- Training every model from scratch during the hackathon.
- Making lesion-level claims without mask-level validation.
- Chasing perfect multi-dataset generalization before the demo works.

## Recommended Demo Story

1. Show a rural PHC capture scenario.
2. Run image quality gate.
3. Process a gradeable image.
4. Display grade, referable DR decision, confidence, and heatmap.
5. Generate a short report for ophthalmologist review.
6. Show throughput simulation that estimates district-scale screening capacity.
