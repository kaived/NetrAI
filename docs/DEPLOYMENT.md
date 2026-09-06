# Deployment

Production target:

```text
Cloudflare Pages frontend
  -> FastAPI on GCP Cloud Run
  -> ONNX Runtime model inference
  -> Cloud Storage for optional input/output files
  -> Firebase Firestore for case/report metadata
```

## Why This Path

You do not have a MATLAB Production Server license, so MATLAB should not be the production serving runtime.

Use MATLAB for:

- dataset loading experiments
- preprocessing experiments
- training/evaluation
- exporting the trained network to ONNX

Use FastAPI for:

- upload API
- image quality gate
- ONNX inference
- report response
- Cloud Storage/Firestore integration

## Frontend

Deploy `frontend/` to Cloudflare Pages.

Set:

```text
VITE_API_BASE_URL=https://retinascan-api-58990504584.asia-south1.run.app
```

If the backend is deployed with the optional pilot API key, set the same value in the frontend build:

```text
VITE_API_ACCESS_KEY=<same value as backend API_ACCESS_KEY>
```

This is a simple access barrier for pilot deployments. It is not a substitute for real PHC/operator login because frontend and APK environment values can be extracted.

For production PWA offline inference, also set:

```text
VITE_OFFLINE_MODEL_URL=https://storage.googleapis.com/retinascan-ai-f620e-offline-assets/models/aptos-baseline-v1/dr_classifier.onnx
VITE_PREFETCH_OFFLINE_MODEL=true
```

To show the direct Android APK download button on the production website, publish the signed APK and set:

```text
VITE_ANDROID_APK_URL=https://storage.googleapis.com/retinascan-ai-f620e-app-downloads/android/netrai-latest.apk
```

Cloudflare Pages has a 25 MiB maximum per static asset, so do not upload `dr_classifier.onnx` directly as a Pages asset. Publish the model to a production asset bucket instead:

```powershell
.\infra\gcp\publish-offline-model.ps1
```

The normal frontend build removes any locally copied `frontend/public/offline-models/dr_classifier.onnx` before building, so Cloudflare receives only small web assets and downloads the model from `VITE_OFFLINE_MODEL_URL`.

Publish the Android APK after building the signed release:

```powershell
cd frontend
npm run android:apk
npm run android:publish
```

The APK publish script uploads the release APK to Cloud Storage and grants public read access only on the APK object. Do not commit the generated APK or signing key.

Do not run MATLAB or ONNX inference in Cloudflare Workers.

## Backend

Deploy `backend/` to GCP Cloud Run.

Environment:

```text
ENVIRONMENT=production
API_ACCESS_KEY=<long random pilot key>
INFERENCE_MODE=onnx
MODEL_VERSION=aptos-baseline-v1
MODEL_PATH=models/dr_classifier.onnx
MODEL_GCS_URI=gs://your-model-bucket/models/dr_classifier.onnx
API_CORS_ORIGINS=https://netr-ai.orbionixtech.com,https://www.netr-ai.orbionixtech.com
MODEL_OUTPUT_FORMAT=probabilities
MODEL_LAYOUT=auto
MODEL_INPUT_SCALE=0_1
MODEL_APPLY_CLAHE=true
MODEL_REFERABLE_THRESHOLD=0.50
QUALITY_MIN_FOCUS_SCORE=1.0
QUALITY_MIN_BRIGHTNESS=0.15
QUALITY_MAX_BRIGHTNESS=0.90
QUALITY_MIN_CONTRAST=0.05
QUALITY_MIN_COMPATIBILITY_SCORE=0.55
QUALITY_MAX_EDGE_ARTIFACT_RATIO=0.52
QUALITY_MAX_GREEN_DOMINANCE_RATIO=0.42
GCS_ENABLED=true
GCS_INPUT_BUCKET=
GCS_OUTPUT_BUCKET=
FIRESTORE_ENABLED=true
FIRESTORE_CASES_COLLECTION=cases
MAX_UPLOAD_BYTES=20971520
MAX_IMAGE_PIXELS=25000000
```

Firestore stores the case/report metadata. Cloud Storage stores uploaded images and report JSON files when enabled.

For a pilot backend access gate, set a long random key before deploy:

```powershell
$env:NETRAI_API_ACCESS_KEY="<long-random-value>"
.\infra\gcp\deploy-backend.ps1
```

Cloud Run still uses `--allow-unauthenticated` so Cloudflare/PWA/APK clients can reach it, but protected endpoints require `X-NetrAI-API-Key` when `API_ACCESS_KEY` is configured.

For CORS, use the exact browser origin without a trailing slash. For the production frontend, that is:

```text
https://netr-ai.orbionixtech.com
```

## Model Flow

```text
train/evaluate in MATLAB
  -> export_network_to_onnx(...)
  -> backend/models/dr_classifier.onnx
  -> FastAPI loads ONNX model once
  -> /predict returns report
```

## First Production Milestone

Build this vertical slice:

```text
Cloudflare website upload
  -> Cloud Run FastAPI
  -> image quality gate
  -> ONNX inference
  -> report returned to website
```

## Local Full-Stack Check

```bash
docker compose up --build
```

Local URLs:

```text
frontend: http://localhost:5173
backend:  http://localhost:8080
health:   http://localhost:8080/health
```

## Latency Rules

- Use ONNX Runtime in the FastAPI container.
- Load the model once when the backend starts.
- Keep image input size fixed, such as 224 or 384.
- Keep Grad-CAM optional until prediction latency is good.
- Use Cloud Run minimum instances if cold start is a problem.
- Move to Vertex AI or GPU-backed serving only if CPU inference is too slow.
