# GCP Setup

Target production shape:

```text
Cloudflare Pages frontend
  -> GCP Cloud Run FastAPI backend
  -> Firebase Firestore case metadata
  -> Cloud Storage images, reports, and ONNX model
```

Use the same project as Firebase:

```text
Project ID: retinascan-ai-f620e
Region: asia-south1
```

## 0. Enable Billing

Cloud Run, Cloud Build, Artifact Registry, and production Cloud Storage require a billing account linked to the project.

If bootstrap fails with:

```text
Billing account for project ... is not found
```

open Google Cloud Console:

```text
Google Cloud Console -> Billing -> Link a billing account
```

Select:

```text
retinascan-ai-f620e
```

Then rerun the bootstrap script.

## 1. Login And Select Project

From PowerShell:

```powershell
cd "<repo-root>"
.\infra\gcp\login.ps1
```

If `gcloud` shows a local config permission warning, use the provided scripts. They store gcloud config in the repo-local `.gcloud/` folder, which is ignored by Git.

## 2. Bootstrap GCP

Run:

```powershell
cd "<repo-root>"
.\infra\gcp\bootstrap.ps1
```

This creates or confirms:

```text
Cloud Run API
Cloud Build API
Artifact Registry API
Firestore API
Cloud Storage API
Artifact Registry repo: retinascan
Service account: retinascan-api-sa
Bucket: gs://retinascan-ai-f620e-models
Bucket: gs://retinascan-ai-f620e-inputs
Bucket: gs://retinascan-ai-f620e-outputs
```

## 3. Deploy Backend Now In Stub Mode

Do this while the MATLAB model is still training:

```powershell
.\infra\gcp\deploy-backend.ps1 -InferenceMode stub
```

This deploys the real FastAPI backend with Firebase and GCS enabled, but prediction uses the temporary demo stub.

Use this to verify:

```text
Cloud Run URL /health
```

Expected:

```json
{
  "status": "ok",
  "environment": "production",
  "firestore_enabled": true,
  "gcs_enabled": true,
  "inference_mode": "stub"
}
```

## 4. After MATLAB Training

When MATLAB creates:

```text
backend/models/dr_classifier.onnx
```

deploy real ONNX mode:

```powershell
.\infra\gcp\deploy-backend.ps1 -InferenceMode onnx
```

The script uploads the model to:

```text
gs://retinascan-ai-f620e-models/models/dr_classifier.onnx
```

and deploys Cloud Run with:

```text
INFERENCE_MODE=onnx
MODEL_GCS_URI=gs://retinascan-ai-f620e-models/models/dr_classifier.onnx
```

## 5. Cloudflare Pages Frontend

After Cloud Run deploys, copy the Cloud Run service URL.

In Cloudflare Pages, set:

```text
VITE_API_BASE_URL=https://retinascan-api-58990504584.asia-south1.run.app
```

Then deploy `frontend/`.

## 6. What MATLAB Does

MATLAB remains the training/export tool:

```text
APTOS index
M1 preprocessing
ResNet-18 baseline training
metrics JSON
ONNX export
```

Production does not run MATLAB. Production runs ONNX Runtime inside FastAPI on Cloud Run.

## 7. Cost And Latency Notes

For the first demo:

```text
Cloud Run memory: 2Gi
Cloud Run CPU: 2
min instances: 0
max instances: 5
input size: 224
```

If cold starts feel slow during final presentation, set minimum instances to 1 in Cloud Run.
