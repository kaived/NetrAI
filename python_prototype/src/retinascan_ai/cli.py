from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any

from retinascan_ai.pipeline import RetinaScanPipeline


def main() -> None:
    parser = argparse.ArgumentParser(description="Run the RetinaScan AI prototype pipeline.")
    parser.add_argument("--image", help="Optional fundus image path. Stub mode accepts omitted image.")
    parser.add_argument("--config", type=Path, default=_default_config_path())
    args = parser.parse_args()

    config = _load_json(args.config)
    image: Any = args.image if args.image else object()

    result = RetinaScanPipeline(config).run(image)
    print(json.dumps(result.to_dict(), indent=2, default=str))


def _default_config_path() -> Path:
    return Path(__file__).resolve().parents[3] / "configs" / "retinascan.example.json"


def _load_json(path: Path) -> dict[str, Any]:
    if not path.exists():
        raise FileNotFoundError(f"Config file not found: {path}")

    return json.loads(path.read_text(encoding="utf-8"))


if __name__ == "__main__":
    main()
