# Backend Models

Place exported production model files here locally:

```text
backend/models/dr_classifier.onnx
```

Do not commit model binaries to GitHub unless they are intentionally small and license-safe.

For production, either:

- include the ONNX file in the backend container image, or
- download it from a private Cloud Storage bucket during deployment/startup.
