# Model Development Record

This document records RetinaScan AI model development work: datasets, MATLAB training, evaluation metrics, exported artifacts, model decisions, current limitations, advice, and future model plans.

## Current Model Status

| Field | Value |
|---|---|
| Task | Diabetic retinopathy screening |
| Primary output | ICDR grade 0-4 |
| Referral output | Referable DR yes/no |
| Current model version | `aptos-baseline-v1` |
| Training dataset | APTOS 2019 Blindness Detection |
| Training environment | MATLAB |
| Architecture | ResNet-18 transfer learning |
| Input size | `224x224x3` |
| Export format | ONNX |
| Current referable threshold | `0.50` |

MATLAB is used for dataset indexing, datastore creation, preprocessing, training, evaluation, external validation, threshold calibration, and ONNX export.

The exported ONNX model is used for inference outside MATLAB. MATLAB is not required during inference after the model has been exported.

The first offline PWA/Android implementation uses the same exported `aptos-baseline-v1` ONNX model before starting the next model-improvement cycle.

## What Has Been Completed

1. Downloaded and organized the retinal image datasets for the project workspace.
2. Extracted and prepared APTOS 2019 for MATLAB training.
3. Built the APTOS 2019 image-label index from `train.csv`.
4. Checked APTOS class distribution.
5. Verified APTOS image path coverage with zero missing training images.
6. Built MATLAB image datastores for APTOS training and validation.
7. Implemented MATLAB preprocessing for ResNet-18 model input size.
8. Trained the first APTOS ResNet-18 transfer-learning classifier.
9. Evaluated the APTOS baseline model on the fixed validation split.
10. Exported the trained MATLAB network to ONNX.
11. Added a pre-inference image quality gate.
12. Added retina-image compatibility checks for non-standard/widefield input rejection.
13. Added confidence-level handling for low, moderate, and high confidence outputs.
14. Added computer-vision attention heatmap generation for model explainability.
15. Added IDRiD disease-grading indexing.
16. Evaluated the APTOS-trained baseline model on IDRiD testing images.
17. Ran IDRiD referable-threshold calibration.
18. Trained a second APTOS ResNet-18 experiment named `aptos-resnet18-stable-v2`.
19. Compared Stable V2 against the baseline using the same APTOS validation split.

## APTOS 2019 Dataset

APTOS 2019 is the main dataset used to train the current classifier.

| Item | Value |
|---|---:|
| Total labeled images | 3662 |
| Training images | 2929 |
| Validation images | 733 |
| Missing images from `train.csv` | 0 |

Training split distribution:

| ICDR Grade | Label | Count |
|---:|---|---:|
| 0 | `no_dr` | 1444 |
| 1 | `mild` | 296 |
| 2 | `moderate` | 799 |
| 3 | `severe` | 154 |
| 4 | `proliferative_dr` | 236 |

Validation split distribution:

| ICDR Grade | Label | Count |
|---:|---|---:|
| 0 | `no_dr` | 361 |
| 1 | `mild` | 74 |
| 2 | `moderate` | 200 |
| 3 | `severe` | 39 |
| 4 | `proliferative_dr` | 59 |

## APTOS Baseline Model

| Field | Value |
|---|---|
| Model version | `aptos-baseline-v1` |
| Model family | ResNet-18 transfer learning |
| Input size | `224x224x3` |
| Training dataset | APTOS 2019 |
| Validation dataset | APTOS fixed validation split |
| MATLAB artifact | `models/trained_dr_network.mat` |
| ONNX artifact | Generated ONNX classifier artifact |
| Metrics artifact | `reports/aptos_baseline_fixed_split_metrics.json` |

APTOS baseline validation metrics:

| Metric | Value |
|---|---:|
| Accuracy | 0.9031 |
| Balanced accuracy | 0.7993 |
| Macro precision | 0.8763 |
| Macro recall | 0.7993 |
| Macro F1 | 0.8241 |
| Quadratic weighted kappa | 0.9327 |
| Referable DR sensitivity | 0.9664 |
| Referable DR specificity | 0.9632 |
| Referable DR precision | 0.9474 |
| Referable DR F1 | 0.9568 |
| Referable DR AUC | 0.9955 |
| True positives | 288 |
| True negatives | 419 |
| False positives | 16 |
| False negatives | 10 |
| Mean confidence | 0.9007 |
| Median confidence | 0.9825 |
| Low-confidence predictions | 15 |
| Moderate-confidence predictions | 80 |
| High-confidence predictions | 638 |

APTOS baseline confusion matrix:

| Actual \ Predicted | `no_dr` | `mild` | `moderate` | `severe` | `proliferative_dr` |
|---|---:|---:|---:|---:|---:|
| `no_dr` | 355 | 4 | 2 | 0 | 0 |
| `mild` | 3 | 57 | 14 | 0 | 0 |
| `moderate` | 0 | 8 | 188 | 4 | 0 |
| `severe` | 0 | 0 | 10 | 29 | 0 |
| `proliferative_dr` | 0 | 2 | 20 | 4 | 33 |

APTOS baseline per-class recall:

| Class | Recall |
|---|---:|
| `no_dr` | 0.9834 |
| `mild` | 0.7703 |
| `moderate` | 0.9400 |
| `severe` | 0.7436 |
| `proliferative_dr` | 0.5593 |

The APTOS baseline evaluation also produced a referable DR threshold grid. The script-selected threshold on the APTOS validation split was `0.19`, with threshold sensitivity `1.0000`, threshold specificity `0.9172`, threshold false negatives `0`, and threshold false positives `36`.

## Stable V2 Experiment

Stable V2 was trained as a second experiment using the same APTOS fixed validation split.

| Field | Value |
|---|---|
| Experiment name | `aptos-resnet18-stable-v2` |
| Model family | ResNet-18 transfer learning via `imagePretrainedNetwork` and `trainnet` |
| Input size | `224x224x3` |
| Dataset | APTOS 2019 fixed split |
| Balanced training | Enabled |
| Maximum epochs configured | 12 |
| Training stop point | Epoch 6 of 12 |
| Stop reason | Validation criterion met |
| MATLAB artifact | `models/aptos_resnet18_stable_v2.mat` |
| ONNX artifact | Generated ONNX experiment artifact |
| Metrics artifact | `reports/aptos_resnet18_stable_v2_metrics.json` |
| Summary artifact | `reports/aptos_resnet18_stable_v2_summary.md` |

Stable V2 validation metrics:

| Metric | Value |
|---|---:|
| Accuracy | 0.8172 |
| Balanced accuracy | 0.6294 |
| Macro precision | 0.6701 |
| Macro recall | 0.6294 |
| Macro F1 | 0.6419 |
| Quadratic weighted kappa | 0.8877 |
| Referable DR sensitivity | 0.9060 |
| Referable DR specificity | 0.9540 |
| Referable DR precision | 0.9310 |
| Referable DR F1 | 0.9184 |
| Referable DR AUC | 0.9846 |
| True positives | 270 |
| True negatives | 415 |
| False positives | 20 |
| False negatives | 28 |
| Low-confidence predictions | 24 |
| Moderate-confidence predictions | 82 |
| High-confidence predictions | 627 |

Stable V2 confusion matrix:

| Actual \ Predicted | `no_dr` | `mild` | `moderate` | `severe` | `proliferative_dr` |
|---|---:|---:|---:|---:|---:|
| `no_dr` | 355 | 3 | 3 | 0 | 0 |
| `mild` | 11 | 46 | 16 | 0 | 1 |
| `moderate` | 2 | 23 | 162 | 6 | 7 |
| `severe` | 0 | 0 | 21 | 14 | 4 |
| `proliferative_dr` | 0 | 3 | 18 | 16 | 22 |

Stable V2 per-class recall:

| Class | Recall |
|---|---:|
| `no_dr` | 0.9834 |
| `mild` | 0.6216 |
| `moderate` | 0.8100 |
| `severe` | 0.3590 |
| `proliferative_dr` | 0.3729 |

Baseline and Stable V2 comparison:

| Metric | Baseline | Stable V2 |
|---|---:|---:|
| Accuracy | 0.9031 | 0.8172 |
| Balanced accuracy | 0.7993 | 0.6294 |
| Macro F1 | 0.8241 | 0.6419 |
| Quadratic weighted kappa | 0.9327 | 0.8877 |
| Referable DR sensitivity | 0.9664 | 0.9060 |
| Referable DR specificity | 0.9632 | 0.9540 |
| Referable DR AUC | 0.9955 | 0.9846 |
| False negatives | 10 | 28 |
| False positives | 16 | 20 |

Decision note: `aptos-baseline-v1` remains the stronger current model based on the recorded APTOS validation metrics. Stable V2 is recorded as an experiment and not as the current replacement model.

## IDRiD External Validation

IDRiD disease grading was used for external validation of the APTOS-trained baseline model. IDRiD was not used to train the current baseline model.

MATLAB commands executed:

```matlab
stores = create_idrid_datastore([], [224 224 3], "testing");
metrics = validate_idrid_with_model([], '../models/trained_dr_network.mat', "testing");
```

IDRiD testing split distribution:

| ICDR Grade | Label | Count |
|---:|---|---:|
| 0 | `no_dr` | 34 |
| 1 | `mild` | 5 |
| 2 | `moderate` | 32 |
| 3 | `severe` | 19 |
| 4 | `proliferative_dr` | 13 |

IDRiD external validation metrics:

| Metric | Value |
|---|---:|
| Dataset | `idrid_disease_grading_testing` |
| Sample count | 103 |
| Accuracy | 0.3883 |
| Balanced accuracy | 0.3268 |
| Macro F1 | 0.2824 |
| Quadratic weighted kappa | 0.4818 |
| Referable DR sensitivity | 0.9219 |
| Referable DR specificity | 0.4103 |
| Referable DR precision | 0.7195 |
| Referable DR F1 | 0.8082 |
| Referable DR AUC | 0.8618 |
| True positives | 59 |
| True negatives | 16 |
| False positives | 23 |
| False negatives | 5 |
| Mean confidence | 0.7730 |
| Median confidence | 0.8027 |
| Low-confidence predictions | 8 |
| Moderate-confidence predictions | 26 |
| High-confidence predictions | 69 |

IDRiD confusion matrix:

| Actual \ Predicted | `no_dr` | `mild` | `moderate` | `severe` | `proliferative_dr` |
|---|---:|---:|---:|---:|---:|
| `no_dr` | 7 | 7 | 20 | 0 | 0 |
| `mild` | 1 | 1 | 3 | 0 | 0 |
| `moderate` | 1 | 4 | 27 | 0 | 0 |
| `severe` | 0 | 0 | 15 | 0 | 4 |
| `proliferative_dr` | 0 | 0 | 8 | 0 | 5 |

IDRiD per-class recall:

| Class | Recall |
|---|---:|
| `no_dr` | 0.2059 |
| `mild` | 0.2000 |
| `moderate` | 0.8438 |
| `severe` | 0.0000 |
| `proliferative_dr` | 0.3846 |

Generated IDRiD validation artifacts:

| Artifact | Path |
|---|---|
| Disease-grading index | `data/indexes/idrid_disease_grading.csv` |
| Metrics JSON | `reports/idrid_testing_external_validation_metrics.json` |
| Summary Markdown | `reports/idrid_testing_external_validation_summary.md` |

Advice note: IDRiD shows strong referable DR sensitivity but weak specificity and weak severe/proliferative class recall. This makes IDRiD useful as an external stress test, not a final clinical validation result.

## IDRiD Threshold Calibration

IDRiD testing data was used to calibrate the referable/non-referable probability threshold for the APTOS baseline model.

MATLAB command executed:

```matlab
calibration = calibrate_idrid_referable_threshold([], '../models/trained_dr_network.mat', "testing", 0.90);
```

The referable probability is computed as:

```text
P(moderate) + P(severe) + P(proliferative_dr)
```

Calibration output:

| Field | Value |
|---|---:|
| Dataset | `idrid_disease_grading_testing` |
| Sample count | 103 |
| Minimum sensitivity input | 0.9000 |
| Script-selected threshold | 0.5350 |
| Sensitivity at selected threshold | 0.9063 |
| Specificity at selected threshold | 0.3846 |
| Precision at selected threshold | 0.7073 |
| F1 at selected threshold | 0.7945 |
| False negatives at selected threshold | 6 |
| False positives at selected threshold | 24 |
| True positives at selected threshold | 58 |
| True negatives at selected threshold | 15 |

Generated calibration artifacts:

| Artifact | Path |
|---|---|
| Calibration JSON | `reports/idrid_testing_referable_threshold_calibration.json` |
| Calibration Markdown | `reports/idrid_testing_referable_threshold_calibration.md` |

Advice note: the IDRiD threshold result is useful analysis evidence, but it should not replace the active threshold by itself because specificity remains weak and the result is based on only 103 IDRiD testing images.

## Dataset Usage Status

| Dataset | Current project usage |
|---|---|
| APTOS 2019 | Primary classifier training and internal validation |
| IDRiD disease grading | External validation and threshold calibration |
| IDRiD lesion masks | Downloaded resource, not connected to current model training |
| Messidor-2 | Downloaded resource, not used in the current recorded model metrics |
| DRIVE | Downloaded resource for vessel segmentation experiments, not used in the current DR classifier |

## Model Advice

1. Keep `aptos-baseline-v1` as the active demo model until another model beats it on the same APTOS validation split and external validation does not degrade.
2. Treat Stable V2 as an experiment result, not as the current model replacement.
3. Use APTOS metrics for internal training progress.
4. Use IDRiD metrics for external stress testing and India-context behavior analysis.
5. Do not present Messidor-2 as benchmark evidence until Messidor-2 evaluation has actually been run and metrics are saved.
6. Keep report language as screening support, not final diagnosis.
7. Route low-confidence and poor-quality cases toward retake or ophthalmologist review.
8. Keep MATLAB in the training/evaluation/export role and ONNX in the inference role.
9. Keep trained model binaries outside Git because they are large generated artifacts.

## Future Model Plan

The detailed post-Demo 1 roadmap is recorded in `docs/MODEL_IMPROVEMENT_ROADMAP.md`.

### Phase 1: Demo-Stable Model

1. Keep `aptos-baseline-v1` as the demo model.
2. Keep the current retina compatibility gate active for non-standard image rejection.
3. Keep confidence labels visible in model outputs.
4. Keep the current heatmap as an attention map, not as final lesion proof.
5. Keep APTOS baseline metrics and IDRiD validation metrics ready for presentation.

### Phase 2: Messidor-2 External Validation

1. Build a Messidor-2 image index.
2. Map Messidor-2 labels into referable/non-referable form.
3. Run the current APTOS baseline model on Messidor-2.
4. Save Messidor-2 metrics under `reports/`.
5. Add Messidor-2 sensitivity, specificity, AUC, false negatives, and false positives to this document.

### Phase 3: IDRiD-Based Improvement

1. Preserve the IDRiD testing split as the external validation reference.
2. Use IDRiD training data for later fine-tuning experiments.
3. Use IDRiD lesion masks for microaneurysm, hemorrhage, hard exudate, and soft exudate localization experiments.
4. Compare any fine-tuned model on APTOS validation, IDRiD testing, and Messidor-2 validation.
5. Promote a new model only when screening metrics improve and false negatives remain controlled.

### Phase 4: Explainability Upgrade

1. Replace the current computer-vision attention heatmap with true model-layer Grad-CAM or lesion-supervised heatmaps.
2. Save heatmap outputs per image.
3. Add explanation text that separates model confidence from visual attention evidence.
4. Use IDRiD lesion masks to check whether heatmap regions align with actual lesion annotations.

### Phase 5: Vessel Segmentation Work

1. Keep DRIVE separate from DR grading.
2. Use DRIVE for vessel segmentation experiments.
3. Convert vessel visibility and vessel clarity into image-quality features.
4. Use vessel segmentation as secondary evidence, not as the main DR grade classifier.

### Phase 6: Indian-Origin Specificity

1. Use IDRiD as the first India-context validation dataset.
2. Track APTOS, IDRiD, and Messidor-2 performance separately.
3. Report whether the model over-refers or under-detects on IDRiD compared with APTOS.
4. Add dataset-origin notes in the model card.
5. Add more India-specific screening samples when ethically and legally available.

## Artifact Inventory

MATLAB scripts:

| Script | Purpose |
|---|---|
| `matlab/scripts/create_aptos_fixed_split.m` | Create deterministic APTOS split |
| `matlab/scripts/create_aptos_datastore.m` | Build APTOS datastores |
| `matlab/scripts/train_aptos_resnet18_baseline.m` | Train baseline ResNet-18 model |
| `matlab/scripts/train_aptos_resnet18_stable_v2.m` | Train Stable V2 experiment |
| `matlab/scripts/evaluate_dr_classifier.m` | Evaluate DR classifier metrics |
| `matlab/scripts/export_network_to_onnx.m` | Export MATLAB model to ONNX |
| `matlab/scripts/build_idrid_index.m` | Build IDRiD disease-grading index |
| `matlab/scripts/create_idrid_datastore.m` | Build IDRiD datastores |
| `matlab/scripts/validate_idrid_with_model.m` | Run IDRiD external validation |
| `matlab/scripts/calibrate_idrid_referable_threshold.m` | Run IDRiD referable-threshold calibration |

Model and report artifacts:

| Artifact | Path |
|---|---|
| Baseline MATLAB model | `models/trained_dr_network.mat` |
| Current ONNX model | Generated ONNX classifier artifact |
| Stable V2 MATLAB model | `models/aptos_resnet18_stable_v2.mat` |
| Stable V2 ONNX model | Generated ONNX experiment artifact |
| APTOS baseline metrics | `reports/aptos_baseline_fixed_split_metrics.json` |
| Stable V2 metrics | `reports/aptos_resnet18_stable_v2_metrics.json` |
| IDRiD validation metrics | `reports/idrid_testing_external_validation_metrics.json` |
| IDRiD threshold calibration | `reports/idrid_testing_referable_threshold_calibration.json` |

## Current Model Gaps

| Area | Current state |
|---|---|
| True model-layer Grad-CAM | Current output uses a computer-vision attention heatmap |
| Messidor-2 validation metrics | No generated metrics file recorded in the repo |
| IDRiD lesion-mask training | Lesion masks are not connected to the current classifier pipeline |
| DRIVE vessel segmentation | Not connected to the current DR classifier |
| Clinical validation | No clinical validation study is recorded in this repo |

## Repo Notes

1. Raw datasets are excluded from Git.
2. Large trained model artifacts are excluded from Git.
3. Credentials and local environment files are excluded from Git.
4. Generated metrics and summaries are kept as model evidence.
