from __future__ import annotations

from dataclasses import dataclass
from io import BytesIO
from pathlib import Path
from typing import Any

import numpy as np
from PIL import Image, ImageFilter, ImageOps

from app.config import Settings
from app.schemas import PredictionResult, QualityResult


CLASS_NAMES = ["no_dr", "mild", "moderate", "severe", "proliferative_dr"]
TARGET_MIN_FOCUS_SCORE = 1.0
TARGET_MIN_BRIGHTNESS = 0.15


@dataclass(frozen=True)
class FundusCompatibility:
    is_supported: bool
    score: float
    fundus_area_ratio: float | None
    edge_artifact_ratio: float | None
    reasons: list[str]
    warnings: list[str]


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
        warnings: list[str] = []
        if focus_score < self.settings.quality_min_focus_score:
            reasons.append("Image is too blurry for reliable retinal screening. Please recapture with steadier alignment.")
        elif focus_score < max(self.settings.quality_min_focus_score, TARGET_MIN_FOCUS_SCORE):
            warnings.append("Slight softness detected. Screening can continue, but a sharper capture is preferred for clinical review.")
        if brightness < self.settings.quality_min_brightness:
            reasons.append("Image is severely underexposed. Please increase illumination and recapture.")
        elif brightness < max(self.settings.quality_min_brightness, TARGET_MIN_BRIGHTNESS):
            warnings.append("Image is darker than ideal. Enhancement will be applied, but manual verification is recommended.")
        if brightness > self.settings.quality_max_brightness:
            reasons.append("Image is too bright or overexposed. Please reduce glare and recapture.")
        if contrast < self.settings.quality_min_contrast:
            reasons.append("Image contrast is too low. Please recapture or improve focus/illumination.")

        compatibility = self.assess_fundus_compatibility(image)
        reasons.extend(compatibility.reasons)

        return QualityResult(
            is_gradeable=not reasons,
            is_supported_fundus=compatibility.is_supported,
            focus_score=focus_score,
            brightness=brightness,
            contrast=contrast,
            compatibility_score=compatibility.score,
            fundus_area_ratio=compatibility.fundus_area_ratio,
            edge_artifact_ratio=compatibility.edge_artifact_ratio,
            reasons=reasons,
            warnings=[*warnings, *compatibility.warnings],
        )

    def assess_fundus_compatibility(self, image: Image.Image) -> FundusCompatibility:
        width, height = image.size
        reasons: list[str] = []
        warnings: list[str] = []
        score = 1.0

        if min(width, height) < self.settings.model_input_size:
            score -= 0.35
            reasons.append("Image resolution is too small for reliable retinal screening. Please upload a clearer fundus image.")

        analysis_image = image
        max_dim = max(width, height)
        if max_dim > 640:
            scale = 640 / max_dim
            analysis_image = image.resize((max(1, int(width * scale)), max(1, int(height * scale))), Image.Resampling.BILINEAR)

        array = np.asarray(analysis_image.convert("RGB"), dtype=np.uint8)
        red = array[:, :, 0].astype(np.float32)
        green = array[:, :, 1].astype(np.float32)
        blue = array[:, :, 2].astype(np.float32)
        value = np.max(array, axis=2).astype(np.float32) / 255.0
        saturation = (np.max(array, axis=2).astype(np.float32) - np.min(array, axis=2).astype(np.float32)) / np.maximum(
            np.max(array, axis=2).astype(np.float32),
            1.0,
        )

        fundus_mask = self._estimate_fundus_mask(array, saturation, value)
        fundus_area_ratio = float(np.mean(fundus_mask)) if fundus_mask.size else None

        edge_artifact_ratio = self._edge_artifact_ratio(value)
        corner_dark_ratio = self._corner_dark_ratio(value)
        white_edge_ratio = self._white_edge_ratio(array, value, saturation)

        if fundus_area_ratio is None or fundus_area_ratio < 0.20:
            score -= 0.70
            reasons.append("No clear fundus field was detected. Upload a standard retinal fundus photograph.")
        elif fundus_area_ratio < 0.32:
            score -= 0.25
            warnings.append("Only a small retinal field is visible, so automated grading may be less reliable.")

        mask_bool = fundus_mask.astype(bool)
        green_dominance_ratio = 0.0
        red_green_balance = 1.0
        if np.any(mask_bool):
            green_dominance_ratio = float(np.mean((green[mask_bool] > red[mask_bool] + 12) & (green[mask_bool] > blue[mask_bool] + 18)))
            mean_red = float(np.mean(red[mask_bool]))
            mean_green = float(np.mean(green[mask_bool]))
            red_green_balance = mean_red / max(mean_green, 1.0)

        if white_edge_ratio > 0.04:
            score -= min(0.25, white_edge_ratio * 2.2)
            warnings.append("Bright text, frame, or capture border is visible near the image edge. Crop the retinal field before screening.")

        if edge_artifact_ratio > self.settings.quality_max_edge_artifact_ratio:
            score -= 0.25
            warnings.append("Large border or peripheral artifact detected. A centered standard fundus capture is preferred.")

        obvious_nonstandard_capture = (
            fundus_area_ratio is not None
            and fundus_area_ratio > 0.90
            and edge_artifact_ratio > 0.58
            and (corner_dark_ratio < 0.18 or white_edge_ratio > 0.04)
        )
        unsupported_widefield = (
            fundus_area_ratio is not None
            and fundus_area_ratio > 0.72
            and edge_artifact_ratio > 0.38
            and corner_dark_ratio < 0.22
        )
        unsupported_color = green_dominance_ratio > self.settings.quality_max_green_dominance_ratio or red_green_balance < 0.88

        if obvious_nonstandard_capture or (unsupported_widefield and unsupported_color):
            score -= 0.55
            reasons.append(
                "Unsupported widefield or non-standard retina capture suspected. "
                "Please use a standard macula/disc-centered fundus image for automated DR grading."
            )
        elif unsupported_widefield:
            score -= 0.30
            warnings.append("Widefield or non-standard retinal capture suspected; model confidence should be manually verified.")

        if unsupported_color:
            score -= 0.25
            warnings.append("Strong green/yellow color cast detected; this may not match the training camera style.")

        score = float(np.clip(score, 0.0, 1.0))
        if score < self.settings.quality_min_compatibility_score and not any("Unsupported" in reason for reason in reasons):
            reasons.append("Image does not match the supported fundus capture style closely enough for automated grading.")

        return FundusCompatibility(
            is_supported=score >= self.settings.quality_min_compatibility_score and not reasons,
            score=score,
            fundus_area_ratio=fundus_area_ratio,
            edge_artifact_ratio=edge_artifact_ratio,
            reasons=reasons,
            warnings=warnings,
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
        referable_probability = float(np.sum(probabilities[2:]))
        referable_dr = grade >= 2

        return PredictionResult(
            icdr_grade=grade,
            label=CLASS_NAMES[grade],
            referable_dr=referable_dr,
            referable_probability=referable_probability,
            confidence=confidence,
            confidence_level=confidence_level(confidence),
            model_version=self.settings.model_version,
        )

    def generate_attention_heatmap(self, image_bytes: bytes) -> bytes:
        image = self.load_image(image_bytes)
        array = np.asarray(image, dtype=np.uint8)

        try:
            import cv2

            heatmap = self._generate_cv_lesion_heatmap(array, cv2)
        except Exception:
            heatmap = self._generate_fallback_attention_heatmap(image)

        output = BytesIO()
        heatmap.save(output, format="PNG")
        return output.getvalue()

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

    def _estimate_fundus_mask(self, array: np.ndarray, saturation: np.ndarray, value: np.ndarray) -> np.ndarray:
        base_mask = ((saturation > 0.10) & (value > 0.08)).astype(np.uint8)

        try:
            import cv2

            height, width = base_mask.shape
            kernel_size = max(9, make_odd(int(min(height, width) * 0.045)))
            kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (kernel_size, kernel_size))
            mask = cv2.morphologyEx(base_mask, cv2.MORPH_CLOSE, kernel)
            mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, kernel)

            contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
            if not contours:
                return base_mask

            largest = max(contours, key=cv2.contourArea)
            refined = np.zeros_like(base_mask)
            cv2.drawContours(refined, [largest], -1, 1, thickness=cv2.FILLED)
            return refined.astype(np.uint8)
        except Exception:
            _ = array
            return base_mask

    @staticmethod
    def _edge_artifact_ratio(value: np.ndarray) -> float:
        band = max(4, int(min(value.shape) * 0.08))
        edge_mask = np.zeros_like(value, dtype=bool)
        edge_mask[:band, :] = True
        edge_mask[-band:, :] = True
        edge_mask[:, :band] = True
        edge_mask[:, -band:] = True
        return float(np.mean(value[edge_mask] > 0.22))

    @staticmethod
    def _corner_dark_ratio(value: np.ndarray) -> float:
        band = max(4, int(min(value.shape) * 0.12))
        corner_mask = np.zeros_like(value, dtype=bool)
        corner_mask[:band, :band] = True
        corner_mask[:band, -band:] = True
        corner_mask[-band:, :band] = True
        corner_mask[-band:, -band:] = True
        return float(np.mean(value[corner_mask] < 0.13))

    @staticmethod
    def _white_edge_ratio(array: np.ndarray, value: np.ndarray, saturation: np.ndarray) -> float:
        band = max(4, int(min(value.shape) * 0.08))
        edge_mask = np.zeros_like(value, dtype=bool)
        edge_mask[:band, :] = True
        edge_mask[-band:, :] = True
        edge_mask[:, :band] = True
        edge_mask[:, -band:] = True

        red = array[:, :, 0]
        green = array[:, :, 1]
        blue = array[:, :, 2]
        bright_neutral = (value > 0.72) & (saturation < 0.16)
        bright_label = (red > 185) & (green > 185) & (blue > 170)
        return float(np.mean((bright_neutral | bright_label)[edge_mask]))

    def _generate_cv_lesion_heatmap(self, array: np.ndarray, cv2) -> Image.Image:
        hsv = cv2.cvtColor(array, cv2.COLOR_RGB2HSV)
        fundus_mask = ((hsv[:, :, 1] > 18) & (hsv[:, :, 2] > 20)).astype(np.uint8)

        close_kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (25, 25))
        fundus_mask = cv2.morphologyEx(fundus_mask, cv2.MORPH_CLOSE, close_kernel)
        fundus_mask = cv2.morphologyEx(fundus_mask, cv2.MORPH_OPEN, close_kernel)

        contours, _ = cv2.findContours(fundus_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        if contours:
            largest = max(contours, key=cv2.contourArea)
            refined_mask = np.zeros_like(fundus_mask)
            cv2.drawContours(refined_mask, [largest], -1, 1, thickness=cv2.FILLED)
            fundus_mask = refined_mask

        height, width = fundus_mask.shape
        erosion_size = max(15, make_odd(int(min(height, width) * 0.025)))
        edge_kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (erosion_size, erosion_size))
        analysis_mask = cv2.erode(fundus_mask, edge_kernel)

        green = array[:, :, 1]
        red = array[:, :, 0]
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
        enhanced_green = clahe.apply(green)
        optic_disc_mask = self._detect_optic_disc_mask(array, enhanced_green, analysis_mask, cv2)
        analysis_mask = np.where(optic_disc_mask > 0, 0, analysis_mask).astype(np.uint8)

        background = cv2.GaussianBlur(enhanced_green, (0, 0), sigmaX=14, sigmaY=14)
        bright_lesions = cv2.subtract(enhanced_green, background).astype(np.float32)
        dark_lesions = cv2.subtract(background, enhanced_green).astype(np.float32)
        red_excess = cv2.subtract(red, green).astype(np.float32)

        bright_map = normalize_attention_map(bright_lesions, analysis_mask, low_percentile=91, high_percentile=99.6)
        dark_map = normalize_attention_map(dark_lesions, analysis_mask, low_percentile=92, high_percentile=99.4)
        red_map = normalize_attention_map(red_excess, analysis_mask, low_percentile=88, high_percentile=99.0)

        saliency = (0.46 * bright_map) + (0.34 * dark_map) + (0.20 * red_map)
        saliency *= analysis_mask.astype(np.float32)
        saliency = cv2.GaussianBlur(saliency, (0, 0), sigmaX=6, sigmaY=6)

        max_value = float(np.max(saliency))
        if max_value > 1e-6:
            saliency = saliency / max_value

        heat = np.clip(saliency * 255.0, 0, 255).astype(np.uint8)
        colored = cv2.applyColorMap(heat, cv2.COLORMAP_JET)
        colored = cv2.cvtColor(colored, cv2.COLOR_BGR2RGB)
        alpha = np.where(
            analysis_mask > 0,
            np.clip(30 + heat.astype(np.float32) * 0.68, 30, 205),
            0,
        ).astype(np.uint8)

        rgba = np.dstack([colored, alpha])
        return Image.fromarray(rgba, mode="RGBA")

    def _detect_optic_disc_mask(self, array: np.ndarray, enhanced_green: np.ndarray, mask: np.ndarray, cv2) -> np.ndarray:
        if not np.any(mask):
            return np.zeros_like(mask, dtype=np.uint8)

        red = array[:, :, 0]
        mask_bool = mask.astype(bool)
        red_threshold = float(np.percentile(red[mask_bool], 98.7))
        green_threshold = float(np.percentile(enhanced_green[mask_bool], 96.5))

        candidates = ((red >= red_threshold) & (enhanced_green >= green_threshold) & mask_bool).astype(np.uint8)
        kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (17, 17))
        candidates = cv2.morphologyEx(candidates, cv2.MORPH_CLOSE, kernel)

        contours, _ = cv2.findContours(candidates, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        if not contours:
            return np.zeros_like(mask, dtype=np.uint8)

        image_area = mask.shape[0] * mask.shape[1]
        eligible = [
            contour
            for contour in contours
            if image_area * 0.0008 <= cv2.contourArea(contour) <= image_area * 0.08
        ]
        if not eligible:
            return np.zeros_like(mask, dtype=np.uint8)

        disc_contour = max(eligible, key=cv2.contourArea)
        disc_mask = np.zeros_like(mask, dtype=np.uint8)
        cv2.drawContours(disc_mask, [disc_contour], -1, 1, thickness=cv2.FILLED)

        dilation_size = max(31, make_odd(int(min(mask.shape) * 0.045)))
        dilation_kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (dilation_size, dilation_size))
        return cv2.dilate(disc_mask, dilation_kernel)

    def _generate_fallback_attention_heatmap(self, image: Image.Image) -> Image.Image:
        gray = ImageOps.grayscale(image)
        blurred = gray.filter(ImageFilter.GaussianBlur(radius=14))

        gray_array = np.asarray(gray, dtype=np.float32)
        blur_array = np.asarray(blurred, dtype=np.float32)
        saliency = np.abs(gray_array - blur_array)
        saliency = normalize_attention_map(saliency, np.ones_like(saliency, dtype=np.uint8), 90, 99.5)

        heat = np.clip(saliency * 255.0, 0, 255).astype(np.uint8)
        alpha = np.clip(28 + heat.astype(np.float32) * 0.65, 28, 195).astype(np.uint8)
        rgba = np.zeros((*heat.shape, 4), dtype=np.uint8)
        rgba[:, :, 0] = heat
        rgba[:, :, 1] = np.clip(255 - np.abs(heat.astype(np.int16) - 128) * 2, 0, 255).astype(np.uint8)
        rgba[:, :, 2] = 255 - heat
        rgba[:, :, 3] = alpha
        return Image.fromarray(rgba, mode="RGBA")

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


def confidence_level(confidence: float) -> str:
    if confidence < 0.50:
        return "low"
    if confidence < 0.70:
        return "moderate"
    return "high"


def normalize_attention_map(
    values: np.ndarray,
    mask: np.ndarray,
    low_percentile: float,
    high_percentile: float,
) -> np.ndarray:
    values = values.astype(np.float32)
    mask_bool = mask.astype(bool)

    if not np.any(mask_bool):
        return np.zeros_like(values, dtype=np.float32)

    masked_values = values[mask_bool]
    low = float(np.percentile(masked_values, low_percentile))
    high = float(np.percentile(masked_values, high_percentile))

    if high <= low:
        return np.zeros_like(values, dtype=np.float32)

    normalized = (values - low) / (high - low)
    normalized = np.clip(normalized, 0.0, 1.0)
    normalized[~mask_bool] = 0.0
    return normalized.astype(np.float32)


def make_odd(value: int) -> int:
    return value if value % 2 == 1 else value + 1


def parse_gcs_uri(uri: str) -> tuple[str, str]:
    if not uri.startswith("gs://"):
        raise ValueError("MODEL_GCS_URI must start with gs://")

    path = uri.removeprefix("gs://")
    bucket_name, separator, blob_name = path.partition("/")
    if not bucket_name or not separator or not blob_name:
        raise ValueError("MODEL_GCS_URI must look like gs://bucket/path/to/model.onnx")

    return bucket_name, blob_name
