# Implementation Roadmap

This roadmap is the recommended execution order for RetinaScan AI. Build the smallest working end-to-end system first, then improve each module.

## 0. What You Need

### Software

- MATLAB
- Image Processing Toolbox
- Computer Vision Toolbox
- Deep Learning Toolbox
- Statistics and Machine Learning Toolbox
- Simulink
- Python 3.10+
- Git
- Kaggle API or browser downloads for datasets

Optional:

- Medical Imaging Toolbox
- MATLAB Compiler
- NVIDIA GPU + CUDA for faster Python training

### Datasets

- APTOS 2019: first classifier training dataset
- IDRiD: Indian DR grading and lesion masks
- Messidor-2: external validation
- DRIVE: vessel segmentation only

### Core Outputs

- DR grade: ICDR 0 to 4
- Referable DR flag: level >= 2
- Sensitivity and specificity
- Grad-CAM explanation
- Clinical-style report
- Throughput simulation
- Final demo video and pitch deck

## 1. Verify Dataset Setup

Run:

```bash
python scripts/check_datasets.py
```

Expected:

```text
APTOS 2019: READY
IDRiD: READY
Messidor-2: READY
DRIVE: READY
```

Do this before any model work. Bad paths will waste hours later.

## 2. Build Dataset Indexes

Goal: create clean CSV indexes that every module can use.

Create:

```text
data/indexes/aptos2019_train.csv
data/indexes/idrid_grading.csv
data/indexes/messidor2_labels.csv
data/indexes/drive_vessels.csv
```

Each classification index should contain:

```text
image_path,label,source_dataset,patient_id_or_image_id,split
```

For APTOS:

- Read `train.csv`
- Join each row to `train_images/<id_code>.png`
- Map `diagnosis` to ICDR label 0 to 4

For IDRiD:

- Read grading ground-truth files
- Join rows to original images
- Preserve train/test source split

For Messidor-2:

- Join image names to `messidor-2.csv`
- Convert labels into referable/non-referable when possible

## 3. Implement M1 Image Quality

Goal: reject obviously bad images before classification.

Start with heuristics:

- Brightness
- Contrast
- Focus score
- Field-of-view estimate

Output:

```text
is_gradeable
focus_score
brightness
contrast
rejection_reason
preprocessed_image
```

Use:

- MATLAB `imread`, `rgb2gray`, `adapthisteq`, `imadjust`
- Python `opencv-python`, `numpy`, `scikit-image` if prototyping

MVP rule:

- Do not over-optimize M1.
- It only needs to reject obviously unusable images and enhance gradeable images.

## 4. Train First M3 Classifier

Goal: get a working 5-class DR classifier, then tune referable DR threshold.

Recommended first model:

- EfficientNet-B0 or ResNet-18
- Input size: 224x224 or 384x384
- Classes: 0, 1, 2, 3, 4

Training plan:

1. Train on APTOS.
2. Use weighted loss or class-balanced sampling.
3. Save checkpoint and metrics.
4. Convert prediction to referable DR:

```text
referable = predicted_level >= 2
```

Important:

- Optimize sensitivity first.
- Report specificity alongside sensitivity.
- Do not rely on accuracy alone because DR datasets are imbalanced.

## 5. Validate On IDRiD And Messidor-2

Goal: prove the model is not only memorizing APTOS.

Validation order:

1. Test on held-out APTOS split.
2. Test on IDRiD grading data.
3. Test on Messidor-2 if labels are usable.

Report:

```text
dataset
sample_count
sensitivity
specificity
AUC
confusion_matrix
threshold
model_version
```

If Messidor-2 label mapping is uncertain, say that clearly and do not claim final clinical validation from it.

## 6. Add M4 Explainability

Goal: make predictions visually reviewable.

First version:

- Grad-CAM heatmap over original image
- Prediction confidence
- Short explanation note

Careful wording:

- Say "model attention heatmap" for Grad-CAM.
- Say "lesion-level annotation" only if validated against IDRiD lesion masks.

MVP output:

```text
input image
predicted grade
confidence
referable DR flag
Grad-CAM overlay
clinical summary
```

## 7. Add M2 Segmentation After Classifier Works

Goal: support explanation, not block the whole project.

Priority:

1. Vessel mask baseline
2. Optic disc/fovea localization
3. Exudates
4. Hemorrhages
5. Microaneurysms

Use IDRiD segmentation masks for validation.

Do not make M2 required for the first demo. The full pipeline should still work if segmentation is disabled.

## 8. Build MATLAB Demo Pipeline

Goal: make the project look MathWorks-native.

Use existing MATLAB entry point:

```matlab
cd('D:/RetinaScan AI/matlab')
startup
result = run_retinascan_demo()
```

Then replace stubs module by module:

- `+retinascan/+m1/assessQuality.m`
- `+retinascan/+m1/preprocessImage.m`
- `+retinascan/+m3/gradeDR.m`
- `+retinascan/+m4/explainPrediction.m`
- `+retinascan/+m5/simulateThroughput.m`

Suggested final MATLAB demo:

1. Select fundus image.
2. Show quality status.
3. Show preprocessed image.
4. Show DR grade and referable flag.
5. Show Grad-CAM overlay.
6. Show clinical summary.
7. Show throughput simulation numbers.

## 9. Build M5 Throughput Simulation

Goal: answer whether rural screening can scale.

Inputs:

- Patients per year
- Working days per year
- Cameras
- Capture time per patient
- Inference time per image
- Positive review rate
- Ophthalmologist review time

Outputs:

- Patients/day required
- Capture capacity/day
- Positive reviews/day
- Ophthalmologist review hours/day
- Bottleneck

Start with MATLAB calculation. Add Simulink if time permits.

## 10. Create Final Demo Assets

Prepare:

- 3 to 5 sample patient image runs
- One rejected poor-quality example
- One no-DR example
- One referable-DR example
- Grad-CAM overlays
- Clinical report screenshot
- Metrics table
- Throughput simulation screenshot
- Backup demo video

## 11. Final Submission Claims

Safe wording:

- "Screening support system"
- "Referable DR prioritization"
- "Ophthalmologist review workflow"
- "Explainable model attention"
- "Validated on available benchmark data"

Avoid:

- "Diagnosis"
- "Clinically approved"
- "Doctor replacement"
- "Lesion-level detection" unless mask metrics exist
- "Deployment-ready" unless privacy, validation, and workflow are complete

## Recommended Execution Order

1. Dataset index builder
2. M1 image quality and preprocessing
3. Python classifier baseline on APTOS
4. Metrics for referable DR
5. Grad-CAM
6. MATLAB wrapper/demo integration
7. IDRiD validation and lesion-mask comparison
8. Messidor-2 external validation
9. Throughput simulation
10. Pitch/demo polish

This order gives you a working demo early and protects the project from getting stuck in the hardest module.
