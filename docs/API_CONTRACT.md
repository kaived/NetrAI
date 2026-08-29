# API Contract

The backend exposes a simple upload-to-report API.

## Endpoints

```text
GET  /
GET  /health
POST /predict
GET  /cases/{case_id}
GET  /cases/{case_id}/input
GET  /cases/{case_id}/heatmap
GET  /cases/{case_id}/eyes/{eye}/input
GET  /cases/{case_id}/eyes/{eye}/heatmap
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

## GET /cases/{case_id}

Returns a saved screening case. The frontend stores no browser persistence; it keeps the active case in the URL as `?case_id=...` and uses this endpoint to restore the report after refresh.

If the case is actively uploading or processing, the backend returns `409` so the frontend can retry.

Output shape is the same as `POST /predict`.

The final two-eye report is available when:

```json
{
  "completed_eyes": ["OD", "OS"],
  "is_case_complete": true,
  "final_report": {
    "summary": "Final two-eye screening: referable diabetic retinopathy suspected...",
    "recommendation": "Ophthalmologist review recommended...",
    "disclaimer": "Screening support only. Not a final diagnosis.",
    "referable_dr": true,
    "worst_eye": "OD",
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
