# Python Prototype

This folder is for quick experiments, training code, metrics, and model export. Keep the MATLAB demo stable while Python work evolves.

## Install

```bash
cd "D:/RetinaScan AI/python_prototype"
python -m pip install -e ".[dev]"
```

Optional image/model dependencies:

```bash
python -m pip install -e ".[vision,training,dev]"
```

## Run Smoke Pipeline

```bash
python -m retinascan_ai.cli
```

## Development Rules

- Keep dataset paths configurable.
- Save split files and metrics.
- Export only stable demo checkpoints to `../models/`.
- Do not commit raw datasets or trained weights.
- Mirror mature interfaces back into MATLAB.
