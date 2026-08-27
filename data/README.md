# Data Directory

Do not commit raw medical images, trained splits with patient identifiers, or dataset archives.

Expected layout:

```text
data/
  raw/
    aptos2019/
    idrid/
    messidor2/
    drive/
```

Use `configs/datasets.example.json` as the source of truth for expected dataset locations.

Run:

```bash
python scripts/check_datasets.py --init
python scripts/check_datasets.py
```

Derived datasets, split files, and exports can be created later as needed. Keep them out of git.
