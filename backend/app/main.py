from __future__ import annotations

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.schemas import CaseResult, HealthResponse
from app.services.cases import CaseRepository
from app.services.inference import InferenceService
from app.services.storage import StorageService

settings = get_settings()

app = FastAPI(title=settings.app_name, version="0.1.0")

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


@app.get("/")
def root() -> dict[str, str]:
    return {
        "service": settings.app_name,
        "health": "/health",
        "swagger": "/docs",
        "openapi": "/openapi.json",
    }


@app.on_event("startup")
def prepare_model() -> None:
    inference_service.prepare_model()


@app.get("/health", response_model=HealthResponse)
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


@app.post("/predict", response_model=CaseResult)
async def predict(image: UploadFile = File(...)) -> CaseResult:
    if not image.content_type or not image.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Upload must be an image file.")

    case_id = case_repository.new_case_id()
    image_bytes = await image.read()

    if not image_bytes:
        raise HTTPException(status_code=400, detail="Uploaded image is empty.")

    case_repository.create_case(case_id, image.filename or "upload", status="uploaded")
    input_uri = storage_service.save_input(case_id, image.filename or "original", image_bytes)
    case_repository.update_case(case_id, status="processing", input_uri=input_uri)

    try:
        result = await inference_service.predict(case_id, image_bytes, image.filename or "original")
    except Exception as exc:
        case_repository.update_case(case_id, status="failed", error=str(exc))
        raise HTTPException(status_code=500, detail="Inference failed.") from exc

    result.storage.input_uri = input_uri
    case_repository.save_result(result)
    return result
