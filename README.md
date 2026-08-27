# RetinaScan AI

Explainable diabetic retinopathy screening pipeline for rural primary health centers.

This repository is structured for a MathWorks/SIH-style build: MATLAB is the primary demo and integration layer, while `python_prototype/` is reserved for rapid model experiments before porting or wrapping.

## Build Shape

- `matlab/`: MATLAB package code for the five proposal modules.
- `python_prototype/`: Python reference/prototype lane for training, metrics, and experiments.
- `configs/`: Runtime configuration and thresholds.
- `docs/`: Architecture, MVP scope, dataset plan, validation plan, and submission checklist.
- `data/`: Local dataset metadata and raw dataset folders. Do not commit datasets.
- `models/`: Generated locally when trained weights are available. Do not commit large model files.
- `reports/`: Generated locally for metrics and demo outputs.

## Refined MVP

The first working version should prove four things:

1. Image quality gate can accept, enhance, or reject a fundus image.
2. Classifier can output ICDR grade plus referable DR decision.
3. Explanation output can show why the model decided, even if lesion-level segmentation is partial.
4. Throughput simulation can justify district-scale screening assumptions.

Lesion segmentation, full clinical report formatting, and polished deployment packaging should come after this MVP is stable.

## Quick Start

Dataset setup:

```bash
python scripts/check_datasets.py --init
python scripts/check_datasets.py
```

See `docs/DATA_COLLECTION.md` for download sources and placement rules.

Implementation guide:

```text
docs/IMPLEMENTATION_ROADMAP.md
```

MATLAB:

```matlab
cd('D:/RetinaScan AI/matlab')
startup
result = run_retinascan_demo()
```

Python prototype:

```bash
cd "D:/RetinaScan AI/python_prototype"
python -m retinascan_ai.cli
```

## Submission Framing

Use cautious clinical language:

- This is a screening support system, not an autonomous diagnosis tool.
- Referable DR positives should be reviewed by an ophthalmologist.
- The demo should report sensitivity and specificity, not just accuracy.
- Grad-CAM should be described as model attention unless lesion masks are quantitatively validated.

See `docs/` before implementing new modules.
