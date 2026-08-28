# RetinaScan AI Project Plan

RetinaScan AI is a diabetic retinopathy screening system for rural primary health centers.

## Product Flow

```text
Fundus image
  -> M1 image quality gate
  -> preprocessing
  -> ONNX DR grading model exported from MATLAB
  -> M4 explanation
  -> doctor-readable report
```

## What Makes It Different

Most demos stop at:

```text
image -> prediction
```

RetinaScan AI should show:

```text
image -> quality check -> prediction -> explainability -> report -> rural scale workflow
```

That is the pitch. The differentiator is not only model accuracy. It is a safer, explainable, deployment-ready screening workflow.

## MVP Scope

Must have:

- single image upload
- M1 image quality gate
- preprocessing
- ONNX inference model exported from MATLAB
- referable DR decision, grade >= 2
- confidence score
- Grad-CAM or explanation placeholder
- clinical-style report response
- FastAPI `/predict` endpoint
- frontend upload/result screen

Should have:

- anonymized real validation examples for demo testing
- one gradeable case and one ungradeable/poor-quality case, if available

Do not build now:

- hospital login system
- DICOM/PACS integration
- full patient records
- advanced lesion segmentation
- perfect model tuning
- dashboards
- doctor assignment workflow
- patient history

## MATLAB Modules

```text
M1: image quality and preprocessing
M2: segmentation, optional for MVP
M3: DR grading classifier
M4: explainability and report support
M5: throughput simulation
```

## Execution Order

1. Build APTOS index.
2. Check class distribution.
3. Build MATLAB image loader.
4. Implement M1 preprocessing.
5. Train first classifier.
6. Export classifier to ONNX.
7. Add FastAPI `/predict`.
8. Add frontend upload/result screen.
9. Add Cloud Storage output path if deploying.
10. Deploy to GCP.

## Safe Medical Language

Use:

- screening support
- referable DR prioritization
- ophthalmologist review
- model attention heatmap
- benchmark validation

Avoid:

- final diagnosis
- doctor replacement
- clinically approved
- guaranteed accuracy
- lesion-level detection unless validated with IDRiD masks
