# API Contract

The backend exposes a simple upload-to-report API.

## Endpoints

```text
GET  /
GET  /health
POST /predict
```

## GET /

Output:

```json
{
  "service": "RetinaScan AI API",
  "health": "/health",
  "swagger": "/docs",
  "openapi": "/openapi.json"
}
```

Swagger UI is available at:

```text
/docs
```

OpenAPI JSON is available at:

```text
/openapi.json
```

## GET /health

Output:

```json
{
  "status": "ok",
  "environment": "development",
  "firestore_enabled": false,
  "gcs_enabled": false,
  "inference_mode": "stub",
  "model_version": "demo-stub-v0",
  "model_loaded": false
}
```

## POST /predict

Input:

```text
multipart/form-data
image: retinal image file
```

Output:

```json
{
  "case_id": "case_001",
  "status": "completed",
  "quality": {
    "is_gradeable": true,
    "focus_score": 184.2,
    "brightness": 0.52,
    "contrast": 0.18,
    "reasons": []
  },
  "prediction": {
    "icdr_grade": 2,
    "label": "moderate",
    "referable_dr": true,
    "confidence": 0.91,
    "model_version": "baseline-v1"
  },
  "explanation": {
    "method": "grad_cam",
    "heatmap_url": "/outputs/case_001/heatmap.png",
    "text": "Model attention is concentrated around abnormal retinal regions."
  },
  "report": {
    "summary": "Referable DR suspected.",
    "recommendation": "Ophthalmologist review recommended.",
    "disclaimer": "Screening support only. Not a final diagnosis."
  }
}
```

## Case Status Values

```text
completed
failed
rejected_ungradeable
```

## Optional Firestore Collection

```text
cases/{case_id}
```

Firestore is optional for local development and recommended for production demo persistence.
The collection name is controlled by `FIRESTORE_CASES_COLLECTION`.

## Storage Paths

```text
inputs/cases/{case_id}/original.png
outputs/cases/{case_id}/heatmap.png
outputs/cases/{case_id}/report.json
```
