from __future__ import annotations

from io import BytesIO

from fastapi import FastAPI, File, Form, HTTPException, Response, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image, UnidentifiedImageError
from pydantic import ValidationError

from app.config import get_settings
from app.schemas import CaseResult, HealthResponse, ScreeningRequestMetadata
from app.services.cases import CaseRepository
from app.services.inference import InferenceService
from app.services.storage import StorageService

settings = get_settings()

OPENAPI_TAGS = [
    {
        "name": "Service",
        "description": "API discovery and runtime health checks.",
    },
    {
        "name": "Screening",
        "description": "Fundus image upload, quality gate, DR inference, explanation, and report generation.",
    },
    {
        "name": "Case Artifacts",
        "description": "Generated case outputs such as explainability heatmaps.",
    },
]

app = FastAPI(title=settings.app_name, version="0.1.0", openapi_tags=OPENAPI_TAGS)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

storage_service = StorageService(settings)
case_repository = CaseRepository(settings)
inference_service = InferenceService(settings, storage_service)


@app.get("/", tags=["Service"], summary="API landing endpoint")
def root() -> dict[str, str]:
    return {
        "service": settings.app_name,
        "health": "/health",
        "swagger": "/docs",
        "openapi": "/openapi.json",
    }


@app.get("/favicon.ico", include_in_schema=False)
def favicon() -> Response:
    return Response(status_code=204)


@app.on_event("startup")
def prepare_model() -> None:
    inference_service.prepare_model()


@app.get("/health", response_model=HealthResponse, tags=["Service"], summary="Check API and model health")
def health() -> HealthResponse:
    return HealthResponse(
        status="ok",
        environment=settings.environment,
        firestore_enabled=settings.firestore_enabled,
        gcs_enabled=settings.gcs_enabled,
        inference_mode=settings.inference_mode,
        model_version=settings.model_version,
        model_loaded=inference_service.is_model_ready(),
    )


@app.get(
    "/cases/{case_id}",
    response_model=CaseResult,
    tags=["Screening"],
    summary="Get completed screening case",
)
def get_case(case_id: str) -> CaseResult:
    case = case_repository.get_case(case_id)
    if not case:
        raise HTTPException(status_code=404, detail="Case not found.")

    if case.get("status") in {"uploaded", "processing"}:
        raise HTTPException(
            status_code=409,
            detail=f"Case is currently {case.get('status')}. Please wait for screening analysis to complete.",
        )

    try:
        return CaseResult.model_validate(case)
    except ValidationError as exc:
        status = case.get("status", "processing")
        raise HTTPException(
            status_code=409,
            detail=f"Case is currently {status}. Please wait for screening analysis to complete.",
        ) from exc


@app.get(
    "/cases/{case_id}/eyes/{eye}/heatmap",
    tags=["Case Artifacts"],
    summary="Download generated heatmap for one eye",
    response_class=Response,
)
def get_case_eye_heatmap(case_id: str, eye: str) -> Response:
    heatmap_uri = _get_eye_storage_uri(case_id, eye, "heatmap_uri")
    if not heatmap_uri:
        raise HTTPException(status_code=404, detail="Heatmap not found for this eye.")

    try:
        content = storage_service.read_uri(str(heatmap_uri))
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail="Heatmap file is missing.") from exc

    return Response(content=content, media_type="image/png")


@app.get(
    "/cases/{case_id}/eyes/{eye}/input",
    tags=["Case Artifacts"],
    summary="Download uploaded fundus image for one eye",
    response_class=Response,
)
def get_case_eye_input(case_id: str, eye: str) -> Response:
    input_uri = _get_eye_storage_uri(case_id, eye, "input_uri")
    if not input_uri:
        raise HTTPException(status_code=404, detail="Input image not found for this eye.")

    try:
        content = storage_service.read_uri(str(input_uri))
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail="Input image file is missing.") from exc

    return Response(content=content, media_type=_image_media_type(str(input_uri)))


@app.get(
    "/cases/{case_id}/heatmap",
    tags=["Case Artifacts"],
    summary="Download generated heatmap",
    response_class=Response,
)
def get_case_heatmap(case_id: str) -> Response:
    case = case_repository.get_case(case_id)
    if not case:
        raise HTTPException(status_code=404, detail="Case not found.")

    storage = case.get("storage") if isinstance(case.get("storage"), dict) else {}
    heatmap_uri = storage.get("heatmap_uri")
    if not heatmap_uri:
        raise HTTPException(status_code=404, detail="Heatmap not found for this case.")

    try:
        content = storage_service.read_uri(str(heatmap_uri))
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail="Heatmap file is missing.") from exc

    return Response(content=content, media_type="image/png")


@app.get(
    "/cases/{case_id}/input",
    tags=["Case Artifacts"],
    summary="Download uploaded fundus image",
    response_class=Response,
)
def get_case_input(case_id: str) -> Response:
    case = case_repository.get_case(case_id)
    if not case:
        raise HTTPException(status_code=404, detail="Case not found.")

    storage = case.get("storage") if isinstance(case.get("storage"), dict) else {}
    input_uri = storage.get("input_uri") or case.get("input_uri")
    if not input_uri:
        raise HTTPException(status_code=404, detail="Input image not found for this case.")

    try:
        content = storage_service.read_uri(str(input_uri))
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail="Input image file is missing.") from exc

    return Response(content=content, media_type=_image_media_type(str(input_uri)))


@app.post(
    "/predict",
    response_model=CaseResult,
    tags=["Screening"],
    summary="Run retinal screening analysis",
)
async def predict(
    image: UploadFile = File(...),
    case_id: str | None = Form(None),
    eye: str = Form(...),
    patient_age: str = Form(...),
    diabetes_type: str = Form(...),
    diabetic_duration: str | None = Form(None),
) -> CaseResult:
    if image.content_type not in {"image/png", "image/jpeg", "image/jpg", "image/webp"}:
        raise HTTPException(status_code=400, detail="Upload must be a PNG, JPEG, or WebP image file.")

    metadata = _build_screening_metadata(
        case_id=case_id,
        eye=eye,
        patient_age=patient_age,
        diabetes_type=diabetes_type,
        diabetic_duration=diabetic_duration,
    )
    patient = metadata.to_patient_metadata()

    resolved_case_id = metadata.case_id or case_repository.new_case_id()
    existing_case = case_repository.get_case(resolved_case_id)
    if case_repository.is_eye_completed(existing_case, metadata.eye or ""):
        raise HTTPException(
            status_code=409,
            detail=f"{metadata.eye} is already completed for this case. Select the other eye or start a new screening.",
        )

    image_bytes = await image.read()

    if not image_bytes:
        raise HTTPException(status_code=400, detail="Uploaded image is empty.")
    if len(image_bytes) > settings.max_upload_bytes:
        raise HTTPException(status_code=413, detail="Uploaded image is too large. Maximum supported size is 12 MB.")

    _validate_image_payload(image_bytes)

    upload_filename = f"{metadata.eye}_{image.filename or 'upload'}"

    if existing_case:
        case_repository.update_case(resolved_case_id, filename=upload_filename, status="uploaded")
    else:
        case_repository.create_case(resolved_case_id, upload_filename, status="uploaded")

    if patient:
        case_repository.update_case(resolved_case_id, patient=patient.model_dump(mode="json", exclude_none=True))

    input_uri = storage_service.save_input(resolved_case_id, upload_filename, image_bytes)
    case_repository.update_case(resolved_case_id, status="processing", input_uri=input_uri)

    try:
        result = await inference_service.predict(resolved_case_id, image_bytes, image.filename or "original", patient)
    except Exception as exc:
        case_repository.update_case(resolved_case_id, status="failed", error=str(exc))
        raise HTTPException(status_code=500, detail="Inference failed.") from exc

    result.storage.input_uri = input_uri
    return case_repository.save_result(result)


def _build_screening_metadata(
    case_id: str | None,
    eye: str | None,
    patient_age: str | None,
    diabetes_type: str | None,
    diabetic_duration: str | None,
) -> ScreeningRequestMetadata:
    try:
        return ScreeningRequestMetadata(
            case_id=case_id,
            eye=eye,
            patient_age=patient_age,
            diabetes_type=diabetes_type,
            diabetic_duration=diabetic_duration,
        )
    except ValidationError as exc:
        raise HTTPException(status_code=422, detail=_validation_error_detail(exc)) from exc


def _validation_error_detail(exc: ValidationError) -> list[dict[str, str]]:
    return [
        {
            "field": ".".join(str(part) for part in error["loc"]),
            "message": str(error["msg"]),
        }
        for error in exc.errors()
    ]


def _validate_image_payload(image_bytes: bytes) -> None:
    try:
        with Image.open(BytesIO(image_bytes)) as uploaded_image:
            uploaded_image.verify()
    except (UnidentifiedImageError, OSError) as exc:
        raise HTTPException(status_code=400, detail="Uploaded file is not a valid readable image.") from exc


def _get_eye_storage_uri(case_id: str, eye: str, storage_key: str) -> str | None:
    normalized_eye = _normalize_eye(eye)
    case = case_repository.get_case(case_id)
    if not case:
        raise HTTPException(status_code=404, detail="Case not found.")

    eyes = case.get("eyes") if isinstance(case.get("eyes"), dict) else {}
    eye_result = eyes.get(normalized_eye)
    if not isinstance(eye_result, dict):
        raise HTTPException(status_code=404, detail=f"{normalized_eye} result not found for this case.")

    storage = eye_result.get("storage") if isinstance(eye_result.get("storage"), dict) else {}
    value = storage.get(storage_key)
    return str(value) if value else None


def _normalize_eye(eye: str) -> str:
    normalized = eye.upper()
    if normalized not in {"OD", "OS"}:
        raise HTTPException(status_code=400, detail="Eye must be OD or OS.")
    return normalized


def _image_media_type(uri: str) -> str:
    extension = uri.lower().rsplit(".", maxsplit=1)[-1]
    if extension in {"jpg", "jpeg"}:
        return "image/jpeg"
    if extension == "webp":
        return "image/webp"
    if extension == "png":
        return "image/png"
    return "application/octet-stream"
