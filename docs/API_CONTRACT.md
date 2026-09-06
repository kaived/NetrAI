# API Contract

The backend exposes a simple upload-to-report API.

## Endpoints

```text
GET  /
GET  /health
POST /predict
POST /sync/cases
GET  /cases/{case_id}
GET  /cases/{case_id}/input
GET  /cases/{case_id}/heatmap
GET  /cases/{case_id}/eyes/{eye}/input
GET  /cases/{case_id}/eyes/{eye}/heatmap
```

## Access Control

`GET /`, `GET /health`, `/docs`, and `/openapi.json` are public service endpoints.

All case, artifact, prediction, and offline sync endpoints require this header when the backend `API_ACCESS_KEY` environment variable is set:

```text
X-NetrAI-API-Key: <pilot access key>
```

This is a pilot access gate. For clinical deployment, add real operator authentication, role-based access, and audit logs.

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
case_id: generated screening case identifier; frontend sends this, backend generates one if omitted
eye: required OD or OS
patient_age: required patient age in years
diabetes_type: required diabetes type
diabetic_duration: optional diabetes duration text
```

Screening session rule:

```text
One case_id represents one two-eye screening visit.
The same case_id may receive one completed OD result and one completed OS result.
Submitting the same completed eye twice returns 409.
If an eye is ungradeable, the same eye can be recaptured under the same case_id.
```

Output:

```json
{
  "case_id": "CASE-20260829-104530-A1B2C3",
  "status": "in_progress",
  "patient": {
    "eye": "OD",
    "patient_age": "54",
    "diabetes_type": "Type 2 Diabetes",
    "diabetic_duration": "8 yrs"
  },
  "quality": {
    "is_gradeable": true,
    "is_supported_fundus": true,
    "focus_score": 184.2,
    "brightness": 0.52,
    "contrast": 0.18,
    "compatibility_score": 0.96,
    "fundus_area_ratio": 0.64,
    "edge_artifact_ratio": 0.08,
    "reasons": [],
    "warnings": []
  },
  "prediction": {
    "icdr_grade": 2,
    "label": "moderate",
    "referable_dr": true,
    "confidence": 0.91,
    "confidence_level": "high",
    "model_version": "baseline-v1"
  },
  "explanation": {
    "method": "cv_lesion_attention_v1",
    "heatmap_url": "/cases/CASE-20260829-104530-A1B2C3/heatmap",
    "text": "Computer-vision lesion attention heatmap generated from contrast-enhanced fundus features."
  },
  "report": {
    "summary": "Referable DR suspected.",
    "recommendation": "Ophthalmologist review recommended.",
    "disclaimer": "Screening support only. Not a final diagnosis."
  },
  "completed_eyes": ["OD"],
  "next_eye": "OS",
  "is_case_complete": false,
  "eyes": {
    "OD": {
      "eye": "OD",
      "status": "completed",
      "quality": {},
      "prediction": {},
      "explanation": {},
      "report": {},
      "storage": {}
    }
  },
  "final_report": null
}
```

`referable_dr` is computed from the ICDR grade:

```text
Grade 0-1: routine / non-referable
Grade 2-4: referable DR
```

The model also returns `referable_probability` as the probability mass for Grade 2-4. IDRiD can be used to calibrate future confidence/triage thresholds without retraining the model.

## POST /sync/cases

Synchronizes a case that was completed offline in the PWA or Android app.

Input:

```json
{
  "case": {
    "case_id": "CASE-20260905-104530-A1B2C3",
    "runtime": "offline",
    "sync_status": "pending",
    "status": "completed",
    "completed_eyes": ["OD", "OS"],
    "is_case_complete": true,
    "eyes": {}
  },
  "images": {
    "OD": "data:image/png;base64,...",
    "OS": "data:image/png;base64,..."
  },
  "heatmaps": {
    "OD": "data:image/png;base64,...",
    "OS": "data:image/png;base64,..."
  }
}
```

Backend behavior:

```text
1. Validates the offline case payload.
2. Stores image and heatmap artifacts in GCS or local runtime storage.
3. Replaces data URLs with storage URIs.
4. Saves the case under cases/{case_id}.
5. Returns the synced CaseResult.
```

This endpoint does not rerun inference. It stores the already completed offline result for cloud review.

## GET /cases/{case_id}

Returns a saved screening case. In online website mode, the frontend keeps the active case in the URL as `?case_id=...` and uses this endpoint to restore the report after refresh. In offline PWA/Android mode, completed offline cases are also stored locally in IndexedDB until cloud sync succeeds.

If the case is actively uploading or processing, the backend returns `409` so the frontend can retry.

Output shape is the same as `POST /predict`.

The final two-eye report is available when:

```json
{
  "completed_eyes": ["OD", "OS"],
  "is_case_complete": true,
  "final_report": {
    "summary": "Final two-eye screening: referable diabetic retinopathy suspected. Worst grade present in both eyes: moderate (Grade 2).",
    "recommendation": "Ophthalmologist review recommended...",
    "disclaimer": "Screening support only. Not a final diagnosis.",
    "referable_dr": true,
    "worst_eye": null,
    "worst_eyes": ["OD", "OS"],
    "worst_icdr_grade": 2,
    "worst_label": "moderate",
    "completed_eyes": ["OD", "OS"]
  }
}
```

## GET /cases/{case_id}/heatmap

Returns the PNG attention heatmap for a completed case.

```text
Content-Type: image/png
```

## GET /cases/{case_id}/eyes/{eye}/heatmap

Returns the PNG attention heatmap for one eye. `eye` must be `OD` or `OS`.

```text
Content-Type: image/png
```

## GET /cases/{case_id}/input

Returns the latest uploaded fundus image for a saved case.

```text
Content-Type: image/png, image/jpeg, image/webp, or application/octet-stream
```

## GET /cases/{case_id}/eyes/{eye}/input

Returns the uploaded fundus image for one eye. The frontend uses this to restore report visuals after page refresh without browser storage.

```text
Content-Type: image/png, image/jpeg, image/webp, or application/octet-stream
```

## Case Status Values

```text
completed
in_progress
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
inputs/cases/{case_id}/OD_original.png
inputs/cases/{case_id}/OS_original.png
outputs/cases/{case_id}/OD_attention_heatmap.png
outputs/cases/{case_id}/OS_attention_heatmap.png
outputs/cases/{case_id}/OD_report.json
outputs/cases/{case_id}/OS_report.json
```
