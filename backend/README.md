# RetinaScan AI Backend

FastAPI service for RetinaScan AI.

## Local Run

```bash
cd backend
python -m venv .venv
.venv/Scripts/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8080
```

## Endpoints

```text
GET  /
GET  /health
POST /predict
```

Swagger UI:

```text
/docs
```

## Environment

Copy `.env.example` to `.env` locally.

For local development:

```text
FIRESTORE_ENABLED=false
GCS_ENABLED=false
INFERENCE_MODE=stub
```

For GCP production:

```text
GCP_PROJECT_ID=your-gcp-project-id
FIREBASE_PROJECT_ID=your-firebase-project-id
FIRESTORE_ENABLED=true
FIRESTORE_CASES_COLLECTION=cases
GCS_ENABLED=true
INFERENCE_MODE=onnx
MODEL_PATH=models/dr_classifier.onnx
MODEL_GCS_URI=gs://your-model-bucket/models/dr_classifier.onnx
```

The ONNX model should be exported from MATLAB. For local development, place it at `models/dr_classifier.onnx`. For Cloud Run, upload it to Cloud Storage and set `MODEL_GCS_URI`.
