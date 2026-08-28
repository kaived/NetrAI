# RetinaScan AI

Explainable diabetic retinopathy screening for rural primary health centers.

## Architecture

```text
frontend/   React screening console
backend/    FastAPI API, ONNX Runtime inference, Cloud Storage/Firestore switches
matlab/     model development, preprocessing experiments, ONNX export helpers
data/       local dataset metadata and raw dataset folders
configs/    dataset and pipeline configuration
scripts/    setup and verification helpers
docs/       product, API, dataset, and deployment docs
```

## Current Goal

Build a production-ready vertical slice:

```text
fundus image
  -> FastAPI upload
  -> ONNX model exported from MATLAB
  -> quality result
  -> DR prediction
  -> report JSON
  -> frontend result screen
```

## Key Docs

- `docs/PROJECT_PLAN.md`
- `docs/DATASETS.md`
- `docs/API_CONTRACT.md`
- `docs/DEPLOYMENT.md`
- `docs/FIREBASE_SETUP.md`
- `docs/GCP_SETUP.md`
- `docs/FIRST_ML_MILESTONE.md`

## Dataset Check

```bash
python scripts/check_datasets.py
```

Install Python 3.11+ first if `python` is not recognized in PowerShell.

## MATLAB

```matlab
cd(fullfile('<repo-root>', 'matlab'))
startup
indexTable = build_aptos_index();
stores = create_aptos_datastores();
[trainedNet, info, metrics] = train_aptos_resnet18_baseline();
```

Test one image after training:

```matlab
imagePath = fullfile('<repo-root>', 'data', 'raw', 'aptos2019', 'train_images', '000c1434d8d7.png');
result = predict_aptos_sample(imagePath);
```

## Backend

```bash
cd backend
python -m venv .venv
.venv/Scripts/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8080
```

## Frontend

```bash
cd frontend
npm install
npm run dev
```

## Local Full Stack

```bash
docker compose up --build
```

Then open:

```text
http://localhost:5173
```

## Safety

- Do not commit raw datasets.
- Do not commit large model files.
- Do not claim final diagnosis.
- Keep uploaded medical images private.
- Every result must include ophthalmologist-review disclaimer.
