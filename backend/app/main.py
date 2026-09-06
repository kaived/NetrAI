from __future__ import annotations

import base64
import binascii
import secrets
from io import BytesIO

from fastapi import FastAPI, File, Form, HTTPException, Request, Response, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from PIL import Image, UnidentifiedImageError
from pydantic import ValidationError

from app.config import get_settings
from app.schemas import CASE_ID_PATTERN, CaseResult, HealthResponse, OfflineCaseSyncRequest, ScreeningRequestMetadata
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
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

PUBLIC_PATHS = {"/", "/health", "/favicon.ico", "/docs", "/redoc", "/openapi.json"}


@app.middleware("http")
async def enforce_api_access_key(request: Request, call_next):
    if not settings.api_access_key or request.method == "OPTIONS" or request.url.path in PUBLIC_PATHS:
        return await call_next(request)

    supplied_key = request.headers.get("x-netrai-api-key", "")
    if not secrets.compare_digest(supplied_key, settings.api_access_key):
        return JSONResponse(status_code=401, content={"detail": "Invalid or missing API access key."})

    return await call_next(request)

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
    case_id = _normalize_case_id(case_id)
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
    case_id = _normalize_case_id(case_id)
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
    case_id = _normalize_case_id(case_id)
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
    case_id = _normalize_case_id(case_id)
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
    case_id = _normalize_case_id(case_id)
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
        raise HTTPException(status_code=413, detail="Uploaded image is too large. Maximum supported size is 20 MB.")

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


@app.post(
    "/sync/cases",
    response_model=CaseResult,
    tags=["Screening"],
    summary="Sync an offline screening case",
)
async def sync_case(payload: OfflineCaseSyncRequest) -> CaseResult:
    result = payload.case
    result.case_id = _normalize_case_id(result.case_id)
    if not result.eyes:
        raise HTTPException(status_code=422, detail="Offline sync payload must include at least one eye result.")

    normalized_eyes = {}
    for eye, eye_result in result.eyes.items():
        normalized_eye = _normalize_eye(eye)
        eye_result.eye = normalized_eye
        eye_result.storage.input_uri = None
        eye_result.storage.heatmap_uri = None
        eye_result.storage.report_uri = None

        image_data_url = payload.images.get(normalized_eye)
        if image_data_url:
            image_bytes, image_extension, _image_media_type = _decode_data_url_image(image_data_url)
            _validate_image_payload(image_bytes)
            eye_result.storage.input_uri = storage_service.save_input(
                result.case_id,
                f"{normalized_eye}_offline_sync.{image_extension}",
                image_bytes,
            )

        heatmap_data_url = payload.heatmaps.get(normalized_eye)
        if heatmap_data_url:
            heatmap_bytes, heatmap_extension, heatmap_media_type = _decode_data_url_image(heatmap_data_url)
            eye_result.storage.heatmap_uri = storage_service.save_output_bytes(
                result.case_id,
                f"{normalized_eye}_offline_heatmap.{heatmap_extension}",
                heatmap_bytes,
                content_type=heatmap_media_type,
            )

        normalized_eyes[normalized_eye] = eye_result
        if result.patient and result.patient.eye == normalized_eye:
            result.storage = eye_result.storage

    result.eyes = normalized_eyes

    result.runtime = "cloud"
    result.sync_status = "synced"
    result.storage.report_uri = storage_service.save_output_json(
        result.case_id,
        "offline_sync_report.json",
        result.model_dump(mode="json"),
    )

    return case_repository.save_synced_case(result)


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
            if uploaded_image.width * uploaded_image.height > settings.max_image_pixels:
                raise HTTPException(status_code=413, detail="Uploaded image dimensions are too large.")
            uploaded_image.verify()
    except (UnidentifiedImageError, OSError) as exc:
        raise HTTPException(status_code=400, detail="Uploaded file is not a valid readable image.") from exc


def _decode_data_url_image(data_url: str) -> tuple[bytes, str, str]:
    header, separator, payload = data_url.partition(",")
    if not separator or ";base64" not in header:
        raise HTTPException(status_code=422, detail="Offline artifact must be a base64 data URL.")

    max_base64_length = ((settings.max_upload_bytes + 2) // 3) * 4
    if len(payload) > max_base64_length:
        raise HTTPException(status_code=413, detail="Offline artifact is too large.")

    media_type = header.removeprefix("data:").split(";", maxsplit=1)[0] or "image/png"
    if media_type not in {"image/png", "image/jpeg", "image/jpg", "image/webp"}:
        raise HTTPException(status_code=422, detail="Offline artifact must be PNG, JPEG, or WebP.")

    try:
        content = base64.b64decode(payload, validate=True)
    except (ValueError, binascii.Error) as exc:
        raise HTTPException(status_code=422, detail="Offline artifact data URL is not valid base64.") from exc

    if len(content) > settings.max_upload_bytes:
        raise HTTPException(status_code=413, detail="Offline artifact is too large.")

    extension = "jpg" if media_type in {"image/jpeg", "image/jpg"} else media_type.rsplit("/", maxsplit=1)[-1]
    return content, extension, media_type


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


def _normalize_case_id(case_id: str) -> str:
    normalized = case_id.strip().upper()
    if not CASE_ID_PATTERN.fullmatch(normalized):
        raise HTTPException(status_code=400, detail="Case ID is invalid.")
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
