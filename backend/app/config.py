from __future__ import annotations

from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    environment: str = "development"
    app_name: str = "RetinaScan AI API"
    api_cors_origins: str = "http://localhost:5173"

    gcp_project_id: str = ""
    firebase_project_id: str = ""
    firebase_credentials_path: str = ""
    firestore_enabled: bool = False
    firestore_cases_collection: str = "cases"
    gcs_enabled: bool = False
    gcs_input_bucket: str = ""
    gcs_output_bucket: str = ""

    inference_mode: str = Field(default="stub", pattern="^(stub|onnx)$")
    model_version: str = "demo-stub-v0"
    model_path: str = "models/dr_classifier.onnx"
    model_gcs_uri: str = ""
    model_input_size: int = 224
    model_output_format: str = Field(default="logits", pattern="^(logits|probabilities)$")
    model_channel_order: str = Field(default="rgb", pattern="^(rgb|bgr)$")
    model_layout: str = Field(default="auto", pattern="^(auto|nchw|nhwc)$")
    model_input_scale: str = Field(default="0_1", pattern="^(0_1|0_255)$")
    model_apply_clahe: bool = True

    quality_min_focus_score: float = 1.0
    quality_min_brightness: float = 0.15
    quality_max_brightness: float = 0.90
    quality_min_contrast: float = 0.05

    local_storage_dir: str = "runtime_storage"
    max_upload_bytes: int = 12 * 1024 * 1024

    @property
    def cors_origins(self) -> list[str]:
        return [origin.strip() for origin in self.api_cors_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
