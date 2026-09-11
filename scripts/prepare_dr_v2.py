"""Build a reproducible v2 split manifest without changing v1's splits."""
from __future__ import annotations

import argparse
import csv
import hashlib
import json
import random
from collections import Counter, defaultdict
from pathlib import Path

from PIL import Image, ImageOps

CLASSES = ["no_dr", "mild", "moderate", "severe", "proliferative_dr"]
SEED = 20260909


def read_rows(path):
    with path.open(encoding="utf-8-sig", newline="") as stream:
        return list(csv.DictReader(stream))


def image_hash(path):
    # Decoded pixels also catch exact images saved with different file metadata.
    with Image.open(path) as image:
        image = ImageOps.exif_transpose(image).convert("RGB")
        digest = hashlib.sha256(str(image.size).encode("ascii"))
        digest.update(image.tobytes())
        return digest.hexdigest()


def prepare(repo_root):
    records = []
    for source_path, source in [
        (repo_root / "data/splits/aptos2019_split_v1.csv", "aptos2019"),
        (repo_root / "data/indexes/idrid_disease_grading.csv", "idrid"),
    ]:
        for row in read_rows(source_path):
            grade = int(row["label"])
            if grade not in range(5):
                raise ValueError(f"Invalid ICDR grade: {grade}")
            original_split = row["split"]
            split = "train"
            if source == "aptos2019" and original_split == "validation":
                split = "validation"
            elif source == "idrid" and original_split == "testing":
                split = "external_holdout"
            elif original_split not in ("train", "training"):
                raise ValueError(f"Unexpected source split: {original_split}")
            records.append(dict(
                image_path=row["image_path"], label=grade, label_name=CLASSES[grade],
                referable_dr=int(grade >= 2), source_dataset=source,
                image_id=row["image_id"], split=split,
            ))

    messidor_root = repo_root / "data/raw/messidor2"
    image_paths = defaultdict(list)
    for path in messidor_root.rglob("*"):
        if path.suffix.lower() in (".png", ".jpg", ".jpeg"):
            image_paths[path.name.lower()].append(path)
    ungradeable = 0
    for row in read_rows(messidor_root / "messidor_data.csv"):
        if row["adjudicated_gradable"] != "1":
            ungradeable += 1
            continue
        grade = int(row["adjudicated_dr_grade"])
        if grade not in range(5):
            raise ValueError("Unexpected Messidor grade")
        paths = image_paths[row["image_id"].lower()]
        if len(paths) != 1:
            raise ValueError(f"Expected one Messidor image for {row['image_id']}, found {len(paths)}")
        records.append(dict(
            image_path=str(paths[0]), label=grade, label_name=CLASSES[grade],
            referable_dr=int(grade >= 2), source_dataset="messidor2",
            image_id=row["image_id"], split="external_test",
        ))

    groups = defaultdict(list)
    for index, row in enumerate(records):
        path = Path(row["image_path"])
        if not path.is_file():
            raise FileNotFoundError(path)
        row["image_sha256"] = image_hash(path)
        groups[row["image_sha256"]].append(row)
        if (index + 1) % 250 == 0:
            print(f"Verified {index + 1}/{len(records)} images", flush=True)

    # Retain a held-out copy ahead of training copies; quarantine conflicting labels.
    priority = {"external_test": 0, "external_holdout": 1, "validation": 2, "train": 3}
    for group in groups.values():
        if len({row["label"] for row in group}) != 1:
            for row in group:
                row["split"] = "excluded_label_conflict"
        elif len(group) > 1:
            ordered = sorted(group, key=lambda row: (priority[row["split"]], row["image_path"]))
            for row in ordered[1:]:
                row["split"] = "excluded_duplicate"

    rng = random.Random(SEED)
    for source in ("aptos2019", "idrid"):
        for grade in range(5):
            group = sorted(
                (row for row in records if row["source_dataset"] == source and row["label"] == grade and row["split"] == "train"),
                key=lambda row: row["image_sha256"],
            )
            rng.shuffle(group)
            calibration_count = max(1, round(len(group) * 0.15))
            validation_count = max(1, round(len(group) * 0.15)) if source == "idrid" else 0
            if len(group) <= calibration_count + validation_count:
                raise ValueError(f"Insufficient {source} grade {grade} training samples")
            for row in group[:calibration_count]:
                row["split"] = "calibration"
            for row in group[calibration_count:calibration_count + validation_count]:
                row["split"] = "validation"

    active_hashes = [row["image_sha256"] for row in records if not row["split"].startswith("excluded_")]
    assert len(active_hashes) == len(set(active_hashes)), "Duplicate pixels cross active partitions"
    for row in records:
        row["sample_weight"] = 2 if row["split"] == "train" and row["label"] >= 3 else 1
        row["grade34_focus"] = int(row["label"] >= 3)
        row["split_seed"] = SEED
    records.sort(key=lambda row: (row["source_dataset"], row["image_id"]))
    manifest_path = repo_root / "data/indexes/multidataset_dr_v2.csv"
    manifest_path.parent.mkdir(parents=True, exist_ok=True)
    with manifest_path.open("w", encoding="utf-8", newline="") as stream:
        writer = csv.DictWriter(stream, fieldnames=list(records[0]))
        writer.writeheader()
        writer.writerows(records)
    counts = Counter((row["source_dataset"], row["split"], row["label"]) for row in records)
    report = dict(
        manifest_sha256=hashlib.sha256(manifest_path.read_bytes()).hexdigest(),
        seed=SEED, total_images=len(records), active_images=len(active_hashes),
        excluded_images=len(records) - len(active_hashes),
        messidor_ungradeable_excluded=ungradeable,
        counts=[dict(dataset=key[0], split=key[1], grade=key[2], count=value) for key, value in sorted(counts.items())],
        limitations=[
            "Exact decoded-pixel duplicates checked; near-duplicates are not ruled out.",
            "APTOS and IDRiD patient identifiers are unavailable; patient-disjoint splits are not verified.",
            "IDRiD testing was examined in previous experiments and is a historical benchmark.",
            "Messidor-2 is reserved for external testing; its labels must not select models or thresholds.",
            "Research datasets only; no prospective hospital/PHC validation.",
        ],
    )
    report_path = repo_root / "reports/dr_v2_data_audit.json"
    report_path.parent.mkdir(parents=True, exist_ok=True)
    report_path.write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(json.dumps({key: value for key, value in report.items() if key != "counts"}, indent=2))
    print("Split counts:", dict(Counter(row["split"] for row in records)), flush=True)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--repo-root", type=Path, default=Path(__file__).resolve().parents[1])
    prepare(parser.parse_args().repo_root.resolve())
