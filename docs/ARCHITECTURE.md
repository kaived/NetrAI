# Architecture

RetinaScan AI is a staged screening pipeline. Each module must have a small, testable interface so the team can swap placeholder logic for trained models without rewriting the whole system.

## System Flow

```text
Fundus image
  -> M1 image quality gate
  -> M1 preprocessing
  -> M2 retinal structure and lesion segmentation
  -> M3 DR severity grading
  -> M4 explanation and clinical summary
  -> M5 throughput simulation and deployment evidence
```

## Module Boundaries

### M1: Image Quality Assessment

Purpose: decide whether an image is usable before it reaches the classifier.

Inputs:
- RGB fundus image
- Quality thresholds from config

Outputs:
- Gradeable flag
- Focus, brightness, and contrast scores
- Recapture guidance when rejected
- Preprocessed image for gradeable inputs

First implementation:
- Brightness and contrast heuristics
- Focus proxy using intensity variance or gradient variance
- CLAHE on green channel when Image Processing Toolbox is available

### M2: Retinal Structure Segmentation

Purpose: generate supporting masks and lesion candidates.

Inputs:
- Preprocessed fundus image

Outputs:
- Vessel mask
- Optic disc/fovea estimates
- Candidate lesion masks when available

First implementation:
- Vessel mask baseline or placeholder
- IDRiD lesion mask loader
- Keep this module optional for MVP grading

### M3: DR Severity Grading

Purpose: classify ICDR grade and referable DR.

Inputs:
- Preprocessed fundus image
- Optional M2 masks or features

Outputs:
- ICDR level 0 to 4
- Referable DR flag, level >= 2
- Confidence scores
- Model version

First implementation:
- Python EfficientNet or ResNet prototype
- MATLAB inference wrapper or port only after the prototype is stable
- Threshold tuned for sensitivity first

### M4: Explainability

Purpose: make model output reviewable by a clinician.

Inputs:
- Image
- Grade prediction
- Optional lesion masks

Outputs:
- Grad-CAM heatmap or attention map
- Top findings
- Confidence statement
- Review recommendation

First implementation:
- Grad-CAM heatmap for classifier
- Plain-language summary
- Avoid claiming lesion-level accuracy until validated against IDRiD masks

### M5: Simulink / Throughput Simulation

Purpose: show operational feasibility at district scale.

Inputs:
- Number of patients
- Camera count
- Review capacity
- Upload bandwidth
- Processing time

Outputs:
- Estimated patients per day and per year
- Bottleneck stage
- Staffing and hardware assumptions

First implementation:
- MATLAB calculation table
- Simulink model if time permits

## Data Flow Contract

Every pipeline run should produce one structured result:

```text
quality: gate result and quality scores
segments: masks and lesion candidates
grade: ICDR class, referable flag, confidence, model version
explanation: heatmap path or matrix, notes, review guidance
report: clinician-facing summary
```

Do not pass raw ad hoc dictionaries between mature modules once implementation starts. Use explicit structs in MATLAB and dataclasses in Python.

## Implementation Strategy

1. Build a runnable stub pipeline first.
2. Replace M1 with real quality heuristics.
3. Train/prototype M3 in Python.
4. Add M4 explanation for the trained classifier.
5. Add M2 only where it improves explanation or validation.
6. Add M5 simulation outputs for the pitch.

This order protects the demo: a usable screening flow is more valuable than partial lesion segmentation with no end-to-end result.
