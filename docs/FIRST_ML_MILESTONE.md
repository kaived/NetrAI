# First ML Milestone

This document records the first working diabetic retinopathy classifier baseline.

## Model

```text
Dataset: APTOS 2019 Blindness Detection
Architecture: ResNet-18 baseline
Task: ICDR grade 0-4 classification
Serving format: ONNX export for FastAPI / ONNX Runtime
Model version: aptos-baseline-v1
```

## Dataset Split

```text
Total labeled images: 3662
Training images: 2929
Validation images: 733
Missing images from train.csv: 0
```

Training distribution:

| Class | Label | Count |
|---|---:|---:|
| no_dr | 0 | 1444 |
| mild | 1 | 296 |
| moderate | 2 | 799 |
| severe | 3 | 154 |
| proliferative_dr | 4 | 236 |

Validation distribution:

| Class | Label | Count |
|---|---:|---:|
| no_dr | 0 | 361 |
| mild | 1 | 74 |
| moderate | 2 | 200 |
| severe | 3 | 39 |
| proliferative_dr | 4 | 59 |

## Validation Metrics

```text
Validation accuracy: 81.72%
Referable DR sensitivity: 91.95%
Referable DR specificity: 92.18%
Referable DR AUC: 98.21%
True positives: 274
True negatives: 401
False positives: 34
False negatives: 24
```

Class recall:

| Class | Recall |
|---|---:|
| no_dr | 97.23% |
| mild | 51.35% |
| moderate | 82.50% |
| severe | 43.59% |
| proliferative_dr | 47.46% |

## Interpretation

This is a good first demo baseline because referable DR sensitivity is high enough to show the screening workflow clearly.

It is not the final clinical model. The weak points are severe and proliferative class recall, which need more training, stronger augmentation, class balancing, and external validation.

## Next ML Work

1. Train for more epochs and track validation stability.
2. Improve minority-class handling for severe and proliferative DR.
3. Validate on Messidor-2 and IDRiD after the demo pipeline is stable.
4. Add Grad-CAM or another explainability output that matches the deployed model.
5. Keep sensitivity for referable DR as the primary screening metric.
