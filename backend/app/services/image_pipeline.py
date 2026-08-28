from __future__ import annotations

from io import BytesIO
from pathlib import Path
from typing import Any

import numpy as np
from PIL import Image, ImageOps

from app.config import Settings
from app.schemas import PredictionResult, QualityResult


CLASS_NAMES = ["no_dr", "mild", "moderate", "severe", "proliferative_dr"]


class ImagePipeline:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings
        self._session: Any | None = None
        self._input_name: str | None = None
        self._input_shape: list[Any] | None = None

    def is_model_ready(self) -> bool:
        if self.settings.inference_mode != "onnx":
            return False
        return Path(self.settings.model_path).exists()

    def prepare_model(self) -> None:
        if self.settings.inference_mode != "onnx":
            return

        self._ensure_model_file()
        if Path(self.settings.model_path).exists():
            self._get_session()

    def run_quality(self, image_bytes: bytes) -> QualityResult:
        image = self.load_image(image_bytes)
        gray = np.asarray(ImageOps.grayscale(image), dtype=np.float32)

        brightness = float(gray.mean() / 255.0)
        contrast = float(gray.std() / 255.0)
        gy, gx = np.gradient(gray)
        focus_score = float(np.var(gx) + np.var(gy))

        reasons: list[str] = []
        if focus_score < self.settings.quality_min_focus_score:
            reasons.append("Image may be blurry. Please recapture with steadier alignment.")
        if brightness < self.settings.quality_min_brightness:
            reasons.append("Image is too dark. Please increase illumination and recapture.")
        if brightness > self.settings.quality_max_brightness:
            reasons.append("Image is too bright or overexposed. Please reduce glare and recapture.")
        if contrast < self.settings.quality_min_contrast:
            reasons.append("Image contrast is too low. Please recapture or improve focus/illumination.")

        return QualityResult(
            is_gradeable=not reasons,
            focus_score=focus_score,
            brightness=brightness,
            contrast=contrast,
            reasons=reasons,
        )

    def predict_onnx(self, image_bytes: bytes) -> PredictionResult:
        session = self._get_session()
        image = self.load_image(image_bytes)
        input_tensor = self.preprocess_for_model(image)
        outputs = session.run(None, {self._input_name: input_tensor})
        scores = np.asarray(outputs[0]).reshape(-1).astype(np.float32)

        if scores.size < len(CLASS_NAMES):
            raise RuntimeError(f"ONNX model returned {scores.size} score(s); expected 5.")

        scores = scores[: len(CLASS_NAMES)]
        probabilities = scores if self.settings.model_output_format == "probabilities" else softmax(scores)

        grade = int(np.argmax(probabilities))
        confidence = float(probabilities[grade])

        return PredictionResult(
            icdr_grade=grade,
            label=CLASS_NAMES[grade],
            referable_dr=grade >= 2,
            confidence=confidence,
            model_version=self.settings.model_version,
        )

    def load_image(self, image_bytes: bytes) -> Image.Image:
        image = Image.open(BytesIO(image_bytes))
        return ImageOps.exif_transpose(image).convert("RGB")

    def preprocess_for_model(self, image: Image.Image) -> np.ndarray:
        if self.settings.model_apply_clahe:
            image = self.apply_green_clahe(image)

        image = image.resize(
            (self.settings.model_input_size, self.settings.model_input_size),
            Image.Resampling.BILINEAR,
        )
        array = np.asarray(image, dtype=np.float32)

        if self.settings.model_channel_order == "bgr":
            array = array[..., ::-1]

        if self.settings.model_input_scale == "0_1":
            array = array / 255.0

        if self._resolved_layout() == "nchw":
            array = np.transpose(array, (2, 0, 1))

        return np.expand_dims(array, axis=0).astype(np.float32)

    def apply_green_clahe(self, image: Image.Image) -> Image.Image:
        array = np.asarray(image.convert("RGB"), dtype=np.uint8).copy()

        try:
            import cv2

            clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
            array[:, :, 1] = clahe.apply(array[:, :, 1])
        except Exception:
            green = Image.fromarray(array[:, :, 1])
            array[:, :, 1] = np.asarray(ImageOps.equalize(green), dtype=np.uint8)

        return Image.fromarray(array)

    def _resolved_layout(self) -> str:
        if self.settings.model_layout != "auto":
            return self.settings.model_layout

        if self._input_shape and len(self._input_shape) == 4:
            if self._input_shape[1] == 3:
                return "nchw"
            if self._input_shape[3] == 3:
                return "nhwc"

        return "nchw"

    def _get_session(self):
        if self._session is not None:
            return self._session

        self._ensure_model_file()

        model_path = Path(self.settings.model_path)
        if not model_path.exists():
            raise FileNotFoundError(
                f"ONNX model not found: {model_path}. "
                "Export the MATLAB model to ONNX, set MODEL_GCS_URI, or set INFERENCE_MODE=stub."
            )

        import onnxruntime as ort

        providers = ["CPUExecutionProvider"]
        self._session = ort.InferenceSession(str(model_path), providers=providers)
        model_input = self._session.get_inputs()[0]
        self._input_name = model_input.name
        self._input_shape = list(model_input.shape)
        return self._session

    def _ensure_model_file(self) -> None:
        model_path = Path(self.settings.model_path)
        if model_path.exists() or not self.settings.model_gcs_uri:
            return

        bucket_name, blob_name = parse_gcs_uri(self.settings.model_gcs_uri)
        model_path.parent.mkdir(parents=True, exist_ok=True)

        from google.cloud import storage

        if self.settings.gcp_project_id:
            client = storage.Client(project=self.settings.gcp_project_id)
        else:
            client = storage.Client()

        client.bucket(bucket_name).blob(blob_name).download_to_filename(str(model_path))


def softmax(scores: np.ndarray) -> np.ndarray:
    shifted = scores - np.max(scores)
    exp_scores = np.exp(shifted)
    return exp_scores / np.sum(exp_scores)


def parse_gcs_uri(uri: str) -> tuple[str, str]:
    if not uri.startswith("gs://"):
        raise ValueError("MODEL_GCS_URI must start with gs://")

    path = uri.removeprefix("gs://")
    bucket_name, separator, blob_name = path.partition("/")
    if not bucket_name or not separator or not blob_name:
        raise ValueError("MODEL_GCS_URI must look like gs://bucket/path/to/model.onnx")

    return bucket_name, blob_name
