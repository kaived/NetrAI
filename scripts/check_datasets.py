from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any


def main() -> int:
    args = parse_args()
    repo_root = Path(__file__).resolve().parents[1]
    config_path = resolve_path(args.config, repo_root)

    config = json.loads(config_path.read_text(encoding="utf-8"))
    datasets = config.get("datasets", [])

    if args.init:
        initialize_dirs(repo_root, datasets)

    missing_total = 0
    for dataset in sorted(datasets, key=lambda item: int(item.get("priority", 99))):
        missing = check_dataset(repo_root, dataset)
        missing_total += len(missing)

    if missing_total:
        print(f"\nMissing {missing_total} expected dataset path(s).")
        return 1

    print("\nAll expected dataset paths are present.")
    return 0


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Check RetinaScan AI dataset folder layout.")
    parser.add_argument(
        "--config",
        default="configs/datasets.example.json",
        help="Dataset config JSON path.",
    )
    parser.add_argument(
        "--init",
        action="store_true",
        help="Create dataset root folders before checking contents.",
    )
    return parser.parse_args()


def resolve_path(path_value: str, repo_root: Path) -> Path:
    path = Path(path_value)
    if not path.is_absolute():
        path = repo_root / path
    return path


def initialize_dirs(repo_root: Path, datasets: list[dict[str, Any]]) -> None:
    base_dirs = [
        repo_root / "data" / "raw",
    ]

    for path in base_dirs:
        path.mkdir(parents=True, exist_ok=True)

    for dataset in datasets:
        root = resolve_path(str(dataset["root"]), repo_root)
        root.mkdir(parents=True, exist_ok=True)

    print("Dataset folders initialized.")


def check_dataset(repo_root: Path, dataset: dict[str, Any]) -> list[Path]:
    dataset_id = str(dataset["id"])
    root = resolve_path(str(dataset["root"]), repo_root)
    expected_paths = [root / relative for relative in dataset.get("expected_paths", [])]
    missing = [path for path in expected_paths if not path.exists()]

    status = "READY" if root.exists() and not missing else "MISSING"
    print(f"\n[{status}] {dataset_id}: {dataset.get('name', dataset_id)}")
    print(f"  root: {root}")
    print(f"  use: {dataset.get('primary_use', 'unspecified')}")
    print(f"  source: {dataset.get('source_url', 'not listed')}")

    if not root.exists():
        print("  missing root folder")
    for path in missing:
        print(f"  missing: {path.relative_to(root)}")

    if not missing and root.exists():
        print("  expected paths present")

    return missing


if __name__ == "__main__":
    raise SystemExit(main())
