# Data Plan

Keep datasets outside git. Store local copies under `data/` and point configs to those paths.

## Datasets

### APTOS 2019

Use for classifier prototyping and training.

Expected contents:
- Images
- Labels with 5-class severity grades

Role:
- Primary classification training source
- Useful for quick baseline experiments

### IDRiD

Use for Indian-domain relevance and lesion/structure validation.

Expected contents:
- DR grading labels
- Lesion segmentation masks for microaneurysms, hemorrhages, and exudates

Role:
- Validate segmentation and explanation claims
- Provide India-specific story for the proposal

### Messidor-2

Use as an external validation benchmark.

Role:
- Report sensitivity and specificity for referable DR only when trusted labels are available
- Reduce risk of overfitting to APTOS

Important:
- The official image package alone is not enough for clinical metrics. Pair it with a trusted label source before reporting sensitivity or specificity.

### DRIVE

Use only for vessel segmentation validation.

Role:
- M2 vessel baseline
- Optional for MVP

## Split Rules

- Do not mix validation images into training.
- Keep patient/image identifiers stable in split files.
- Save split files under `data/splits/`.
- Report metrics separately for each dataset.

## Label Contract

ICDR classes:

```text
0: no DR
1: mild non-proliferative DR
2: moderate non-proliferative DR
3: severe non-proliferative DR
4: proliferative DR
```

Referable DR:

```text
referable = ICDR level >= 2
```

## Privacy

Do not commit raw medical images, patient metadata, or exports that contain patient identifiers.

## Collection Workflow

Use `docs/DATA_COLLECTION.md` for source links and placement rules.

Then run:

```bash
python scripts/check_datasets.py --init
python scripts/check_datasets.py
```
