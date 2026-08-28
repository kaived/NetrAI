# Datasets

Raw datasets stay local or in private cloud storage. Do not commit them to GitHub.

## Local Layout

```text
data/raw/aptos2019/
data/raw/idrid/
data/raw/messidor2/
data/raw/drive/
data/indexes/
```

## Dataset Use

| Dataset | Purpose | Priority |
|---|---|---|
| APTOS 2019 | First DR classifier training | 1 |
| IDRiD | Indian validation and lesion masks | 2 |
| Messidor-2 | External validation | 3 |
| DRIVE | Vessel segmentation only | 4 |

DRIVE extracts as:

```text
data/raw/drive/training/
data/raw/drive/testing/
```

## Verify Setup

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

## First Index To Build

Create:

```text
data/indexes/aptos2019_train.csv
```

Columns:

```text
image_path,label,label_name,referable_dr,source_dataset,image_id
```

Run in MATLAB:

```matlab
cd(fullfile('<repo-root>', 'matlab'))
startup
indexTable = build_aptos_index();
```

## Class Labels

```text
0: no DR
1: mild
2: moderate
3: severe
4: proliferative DR
```

Referable DR:

```text
label >= 2
```
