# Model Improvement Roadmap

This roadmap starts after SIH Demo 1. The current production/demo model remains `aptos-baseline-v1` until a new model beats it on recorded validation metrics.

## Goal

Improve RetinaScan AI from a working DR screening prototype into a stronger explainable screening pipeline for rural PHC and hospital workflows.

## Promotion Rule

A new model can replace `aptos-baseline-v1` only when it satisfies all of these:

- APTOS validation does not degrade meaningfully.
- IDRiD external validation improves, especially Grade 3 and Grade 4 recall.
- Referable DR sensitivity remains above the target screening threshold.
- Specificity is measured and reported, not guessed.
- False negatives are reviewed case-by-case.
- Model confidence and uncertainty are visible in the app.
- Heatmaps are described as decision-support evidence, not final diagnosis.

## Workstream 1: True Grad-CAM

Current state: the app/backend shows a computer-vision attention heatmap. MATLAB M4 also has a placeholder.

Implementation steps:

1. Load the trained MATLAB network artifact.
2. Identify the final convolutional layer for ResNet-18.
3. Generate true model-layer Grad-CAM for the predicted class.
4. Save heatmap output for each evaluated image.
5. Compare Grad-CAM attention with IDRiD lesion masks where masks exist.
6. Update report language to say whether attention overlaps clinically relevant regions.

Deliverables:

- MATLAB Grad-CAM function under `matlab/+retinascan/+m4/`.
- Batch script to export Grad-CAM examples to `reports/gradcam/`.
- Before/after evidence images for judges.

Success check:

- Heatmap is generated from model gradients, not from handcrafted image processing.
- Heatmap aligns with lesion areas more often than random background regions.

## Workstream 2: IDRiD Lesion Localization

Current state: IDRiD disease grading is indexed and used for external validation. Lesion masks are not yet connected.

Implementation steps:

1. Build an IDRiD lesion-mask index.
2. Normalize mask labels into:
   - microaneurysm
   - hard exudate
   - hemorrhage
   - soft exudate
3. Create MATLAB datastores for image-mask pairs.
4. Train or prototype lesion segmentation models.
5. Measure Dice, IoU, precision, and recall per lesion class.
6. Use lesion masks as explainability evidence, not as the only grade decision.

Deliverables:

- `matlab/scripts/build_idrid_lesion_index.m`
- `matlab/scripts/create_idrid_lesion_datastores.m`
- `matlab/scripts/evaluate_lesion_localization.m`
- lesion metrics saved under `reports/`

Success check:

- The system can point to suspected lesion regions with mask-level evidence.

## Workstream 3: DRIVE Vessel Segmentation

Current state: DRIVE is listed for vessel segmentation but not connected.

Implementation steps:

1. Build DRIVE image-mask index.
2. Train or evaluate a vessel segmentation model.
3. Compute Dice, IoU, sensitivity, specificity, and vessel clarity score.
4. Use vessel segmentation as a quality and structure feature.
5. Keep DRIVE separate from DR severity labels.

Deliverables:

- `matlab/scripts/build_drive_index.m`
- `matlab/scripts/train_drive_vessel_segmentation.m`
- `matlab/scripts/evaluate_drive_vessels.m`

Success check:

- Vessel maps are reliable enough to support image-quality and report explainability.

## Workstream 4: Grade 3/4 Model Improvement

Current state: `aptos-baseline-v1` performs well for referable DR on APTOS, but Grade 3 and Grade 4 recall must improve for unseen external images.

Implementation steps:

1. Combine APTOS with IDRiD training disease-grading data.
2. Add Messidor/EyePACS only after labels and license constraints are clear.
3. Use class-balanced sampling or weighted loss.
4. Oversample Grade 3 and Grade 4.
5. Add camera/device-style augmentation:
   - blur
   - uneven illumination
   - JPEG compression
   - color temperature shift
   - vignette
   - partial field-of-view crop
6. Evaluate per dataset, not only merged accuracy.

Deliverables:

- new MATLAB training script, likely `train_multidataset_dr_v2.m`
- dataset-origin metrics tables
- false-negative review table for Grade 3/4

Success check:

- Grade 3 and Grade 4 recall improves without creating too many false positives.

## Workstream 5: Referable Threshold Calibration

Current state: APTOS and IDRiD threshold calibration exists, but the active threshold is still conservative demo configuration.

Implementation steps:

1. Calibrate on validation data without touching test/external holdout.
2. Optimize for referable DR, where referable means Grade 2+.
3. Prefer high sensitivity for rural screening.
4. Record sensitivity, specificity, false negatives, false positives, precision, F1, and AUC.
5. Add uncertainty behavior:
   - low confidence
   - near-threshold prediction
   - poor image quality warning

Deliverables:

- threshold report under `reports/`
- updated backend/frontend threshold only after review
- uncertainty warning text in app reports

Success check:

- The threshold is justified by data and can be explained to judges.

## Workstream 6: Simulink District Workflow Simulation

Current state: MATLAB throughput estimation exists as code. A Simulink model is still needed for the MathWorks problem statement.

Implementation steps:

1. Model patient arrivals at camps/PHCs.
2. Model two-eye image acquisition time.
3. Model bandwidth constraints for sync.
4. Model offline queue growth during no-internet periods.
5. Model AI processing throughput.
6. Model ophthalmologist review capacity for positive/uncertain cases.
7. Compare district scenarios for 100,000+ patients/year.

Deliverables:

- Simulink model file under `matlab/simulink/`
- scenario table under `reports/`
- screenshots/plots for demo deck

Success check:

- Judges can see how many cameras, technicians, and review doctors are needed.

## Workstream 7: Hardware Workflow Page

Current state: app supports image import and offline/online behavior. The product surface needs a clearer hardware workflow.

Implementation steps:

1. Show that retinal capture happens on a fundus camera, not the phone camera.
2. Support rural portable fundus camera workflow.
3. Support hospital tabletop fundus camera workflow.
4. Show transfer paths:
   - USB cable
   - Bluetooth
   - Wi-Fi or camera hotspot
   - SD card/gallery import
   - hospital computer export
5. Keep wording outcome-based and simple.

Deliverables:

- Landing-page hardware workflow section.
- Documentation in `docs/OFFLINE_FIELD_APP.md`.

Success check:

- A technician understands how the image reaches NetrAI before screening starts.

## Recommended Execution Order

1. Hardware workflow page, because it strengthens the demo immediately.
2. Referable threshold and uncertainty behavior, because it improves clinical safety.
3. True Grad-CAM, because it directly addresses explainability.
4. IDRiD lesion-mask indexing and evaluation.
5. Grade 3/4 model improvement training.
6. DRIVE vessel segmentation.
7. Simulink district workflow simulation.

## Demo Language

Use:

- automated DR screening support
- referable DR triage
- ophthalmologist review
- model attention evidence
- lesion-localization research module
- rural offline queue and sync

Avoid:

- final diagnosis
- doctor replacement
- clinically approved
- guaranteed accuracy
- lesion detection claims before IDRiD mask metrics exist
