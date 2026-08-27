from __future__ import annotations

from typing import Any

from retinascan_ai.contracts import ImageQuality, PreprocessedImage


class ImageQualityModule:
    def __init__(self, config: dict[str, Any] | None = None) -> None:
        self.config = config or {}

    def run(self, image: Any) -> ImageQuality:
        if image is None:
            return ImageQuality(
                is_gradeable=False,
                focus_score=0.0,
                brightness=0.0,
                contrast=0.0,
                reasons=["No image supplied."],
            )

        stats = _try_array_stats(image)
        if stats is None:
            return ImageQuality(
                is_gradeable=True,
                focus_score=999.0,
                brightness=0.50,
                contrast=0.20,
                reasons=["Stub quality scores used because image pixels were not loaded."],
            )

        min_focus = float(self.config.get("min_focus_score", 120.0))
        min_brightness = float(self.config.get("min_brightness", 0.15))
        max_brightness = float(self.config.get("max_brightness", 0.90))
        min_contrast = float(self.config.get("min_contrast", 0.05))

        reasons: list[str] = []
        if stats["focus_score"] < min_focus:
            reasons.append("Image may be out of focus.")
        if stats["brightness"] < min_brightness:
            reasons.append("Image is too dark.")
        if stats["brightness"] > max_brightness:
            reasons.append("Image is too bright.")
        if stats["contrast"] < min_contrast:
            reasons.append("Image contrast is too low.")

        return ImageQuality(
            is_gradeable=not reasons,
            focus_score=stats["focus_score"],
            brightness=stats["brightness"],
            contrast=stats["contrast"],
            reasons=reasons,
        )

    def preprocess(self, image: Any) -> PreprocessedImage:
        return PreprocessedImage(
            image=image,
            method="stub_passthrough",
            notes=["Replace with resize, crop, illumination normalization, and CLAHE."],
        )


def _try_array_stats(image: Any) -> dict[str, float] | None:
    try:
        import numpy as np
    except ImportError:
        return None

    try:
        array = np.asarray(image, dtype="float32")
    except Exception:
        return None

    if array.size == 0:
        return None

    if array.max() > 1.0:
        array = array / 255.0

    if array.ndim == 3:
        gray = 0.2989 * array[..., 0] + 0.5870 * array[..., 1] + 0.1140 * array[..., 2]
    else:
        gray = array

    return {
        "focus_score": float(np.var(gray * 255.0)),
        "brightness": float(np.mean(gray)),
        "contrast": float(np.std(gray)),
    }
