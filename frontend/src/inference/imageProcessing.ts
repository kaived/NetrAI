import type { ExplanationResult, PredictionResult, QualityResult } from "../types";

export const OFFLINE_MODEL_VERSION = "aptos-baseline-v1";
export const OFFLINE_MODEL_URL = import.meta.env.VITE_OFFLINE_MODEL_URL?.trim() || "/offline-models/dr_classifier.onnx";

const CLASS_NAMES = ["no_dr", "mild", "moderate", "severe", "proliferative_dr"] as const;
const MODEL_INPUT_SIZE = 224;

export async function assessImageQuality(file: File): Promise<QualityResult> {
  const image = await loadImageFromFile(file);
  const { canvas, ctx } = drawImageToAnalysisCanvas(image, 640);
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const { data, width, height } = imageData;

  const gray = new Float32Array(width * height);
  const saturation = new Float32Array(width * height);
  const value = new Float32Array(width * height);
  const fundusMask = new Uint8Array(width * height);

  let graySum = 0;
  let redFundus = 0;
  let greenFundus = 0;
  let greenDominanceCount = 0;
  let fundusCount = 0;

  for (let i = 0, p = 0; i < data.length; i += 4, p += 1) {
    const red = data[i] ?? 0;
    const green = data[i + 1] ?? 0;
    const blue = data[i + 2] ?? 0;
    const max = Math.max(red, green, blue);
    const min = Math.min(red, green, blue);
    const sat = max > 0 ? (max - min) / max : 0;
    const val = max / 255;
    const g = 0.299 * red + 0.587 * green + 0.114 * blue;

    gray[p] = g;
    saturation[p] = sat;
    value[p] = val;
    graySum += g;

    if (sat > 0.1 && val > 0.08) {
      fundusMask[p] = 1;
      fundusCount += 1;
      redFundus += red;
      greenFundus += green;
      if (green > red + 12 && green > blue + 18) {
        greenDominanceCount += 1;
      }
    }
  }

  const pixelCount = width * height;
  const grayMean = graySum / Math.max(pixelCount, 1);
  let varianceSum = 0;
  for (const item of gray) {
    varianceSum += (item - grayMean) ** 2;
  }

  const brightness = grayMean / 255;
  const contrast = Math.sqrt(varianceSum / Math.max(pixelCount, 1)) / 255;
  const focusScore = computeFocusScore(gray, width, height);
  const fundusAreaRatio = fundusCount / Math.max(pixelCount, 1);
  const edgeArtifactRatio = computeEdgeArtifactRatio(value, width, height);
  const cornerDarkRatio = computeCornerDarkRatio(value, width, height);
  const whiteEdgeRatio = computeWhiteEdgeRatio(data, saturation, value, width, height);
  const greenDominanceRatio = greenDominanceCount / Math.max(fundusCount, 1);
  const redGreenBalance = redFundus / Math.max(greenFundus, 1);

  const reasons: string[] = [];
  const warnings: string[] = [];
  let compatibilityScore = 1;

  if (focusScore < 1.0) {
    reasons.push("Image may be blurry. Please recapture with steadier alignment.");
  }
  if (brightness < 0.15) {
    reasons.push("Image is too dark. Please increase illumination and recapture.");
  }
  if (brightness > 0.9) {
    reasons.push("Image is too bright or overexposed. Please reduce glare and recapture.");
  }
  if (contrast < 0.05) {
    reasons.push("Image contrast is too low. Please recapture or improve focus/illumination.");
  }
  if (Math.min(image.naturalWidth, image.naturalHeight) < MODEL_INPUT_SIZE) {
    compatibilityScore -= 0.35;
    reasons.push("Image resolution is too small for reliable retinal screening. Please upload a clearer fundus image.");
  }
  if (fundusAreaRatio < 0.2) {
    compatibilityScore -= 0.7;
    reasons.push("No clear fundus field was detected. Upload a standard retinal fundus photograph.");
  } else if (fundusAreaRatio < 0.32) {
    compatibilityScore -= 0.25;
    warnings.push("Only a small retinal field is visible, so automated grading may be less reliable.");
  }
  if (whiteEdgeRatio > 0.04) {
    compatibilityScore -= Math.min(0.25, whiteEdgeRatio * 2.2);
    warnings.push("Bright text, frame, or capture border is visible near the image edge. Crop the retinal field before screening.");
  }
  if (edgeArtifactRatio > 0.52) {
    compatibilityScore -= 0.25;
    warnings.push("Large border or peripheral artifact detected. A centered standard fundus capture is preferred.");
  }

  const unsupportedWidefield = fundusAreaRatio > 0.72 && edgeArtifactRatio > 0.38 && cornerDarkRatio < 0.22;
  const unsupportedColor = greenDominanceRatio > 0.42 || redGreenBalance < 0.88;
  if (unsupportedWidefield && unsupportedColor) {
    compatibilityScore -= 0.55;
    reasons.push("Unsupported widefield or non-standard retina capture suspected. Please use a standard macula/disc-centered fundus image for automated DR grading.");
  } else if (unsupportedWidefield) {
    compatibilityScore -= 0.3;
    warnings.push("Widefield or non-standard retinal capture suspected; model confidence should be manually verified.");
  }
  if (unsupportedColor) {
    compatibilityScore -= 0.25;
    warnings.push("Strong green/yellow color cast detected; this may not match the training camera style.");
  }

  compatibilityScore = clamp(compatibilityScore, 0, 1);
  if (compatibilityScore < 0.55 && !reasons.some((reason) => reason.startsWith("Unsupported"))) {
    reasons.push("Image does not match the supported fundus capture style closely enough for automated grading.");
  }

  return {
    is_gradeable: reasons.length === 0,
    is_supported_fundus: compatibilityScore >= 0.55 && reasons.length === 0,
    focus_score: focusScore,
    brightness,
    contrast,
    compatibility_score: compatibilityScore,
    fundus_area_ratio: fundusAreaRatio,
    edge_artifact_ratio: edgeArtifactRatio,
    reasons,
    warnings,
  };
}

export async function preprocessImageForAptosV1(file: File): Promise<Float32Array> {
  const image = await loadImageFromFile(file);
  const canvas = document.createElement("canvas");
  canvas.width = MODEL_INPUT_SIZE;
  canvas.height = MODEL_INPUT_SIZE;
  const ctx = getCanvasContext(canvas);
  ctx.drawImage(image, 0, 0, MODEL_INPUT_SIZE, MODEL_INPUT_SIZE);

  const imageData = ctx.getImageData(0, 0, MODEL_INPUT_SIZE, MODEL_INPUT_SIZE);
  equalizeGreenChannel(imageData.data);

  const pixels = imageData.data;
  const planeSize = MODEL_INPUT_SIZE * MODEL_INPUT_SIZE;
  const tensor = new Float32Array(3 * planeSize);

  for (let i = 0, p = 0; i < pixels.length; i += 4, p += 1) {
    tensor[p] = (pixels[i] ?? 0) / 255;
    tensor[planeSize + p] = (pixels[i + 1] ?? 0) / 255;
    tensor[planeSize * 2 + p] = (pixels[i + 2] ?? 0) / 255;
  }

  return tensor;
}

export async function buildLocalAttentionHeatmap(file: File): Promise<string> {
  const image = await loadImageFromFile(file);
  const maxDim = 900;
  const scale = Math.min(1, maxDim / Math.max(image.naturalWidth, image.naturalHeight));
  const width = Math.max(1, Math.round(image.naturalWidth * scale));
  const height = Math.max(1, Math.round(image.naturalHeight * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = getCanvasContext(canvas);
  ctx.drawImage(image, 0, 0, width, height);

  const imageData = ctx.getImageData(0, 0, width, height);
  const pixels = imageData.data;
  const green = new Float32Array(width * height);
  const value = new Float32Array(width * height);
  const mask = new Uint8Array(width * height);

  for (let i = 0, p = 0; i < pixels.length; i += 4, p += 1) {
    const red = pixels[i] ?? 0;
    const g = pixels[i + 1] ?? 0;
    const blue = pixels[i + 2] ?? 0;
    const max = Math.max(red, g, blue);
    const min = Math.min(red, g, blue);
    const saturation = max > 0 ? (max - min) / max : 0;
    green[p] = g;
    value[p] = max / 255;
    if (saturation > 0.1 && value[p] > 0.08) {
      mask[p] = 1;
    }
  }

  const background = boxBlur(green, width, height, 9);
  const saliency = new Float32Array(width * height);
  for (let p = 0; p < saliency.length; p += 1) {
    saliency[p] = mask[p] ? Math.abs(green[p] - background[p]) : 0;
  }

  normalizeInPlace(saliency);

  const heatmap = document.createElement("canvas");
  heatmap.width = width;
  heatmap.height = height;
  const heatmapCtx = getCanvasContext(heatmap);
  const output = heatmapCtx.createImageData(width, height);

  for (let p = 0, i = 0; p < saliency.length; p += 1, i += 4) {
    const amount = saliency[p] ?? 0;
    const [red, g, blue] = jetColor(amount);
    output.data[i] = red;
    output.data[i + 1] = g;
    output.data[i + 2] = blue;
    output.data[i + 3] = mask[p] ? Math.round(30 + amount * 185) : 0;
  }

  heatmapCtx.putImageData(output, 0, 0);
  return heatmap.toDataURL("image/png");
}

export function buildRejectedPrediction(): PredictionResult {
  return {
    icdr_grade: null,
    label: "ungradeable",
    referable_dr: false,
    referable_probability: null,
    confidence: 0,
    confidence_level: "unknown",
    model_version: OFFLINE_MODEL_VERSION,
  };
}

export function buildRejectedExplanation(): ExplanationResult {
  return {
    method: "quality_gate",
    heatmap_url: null,
    text: "Image was rejected by the local quality gate before model inference.",
  };
}

export function softmax(scores: ArrayLike<number>): number[] {
  const values = Array.from(scores, Number);
  const max = Math.max(...values);
  const exp = values.map((item) => Math.exp(item - max));
  const sum = exp.reduce((acc, item) => acc + item, 0);
  return exp.map((item) => item / Math.max(sum, Number.EPSILON));
}

export function buildPrediction(scores: ArrayLike<number>): PredictionResult {
  const selected = normalizeModelScores(scores);
  const grade = selected.reduce((best, current, index) => (current > selected[best] ? index : best), 0);
  const confidence = selected[grade] ?? 0;
  const referableProbability = selected.slice(2).reduce((sum, item) => sum + item, 0);

  return {
    icdr_grade: grade,
    label: CLASS_NAMES[grade],
    referable_dr: grade >= 2,
    referable_probability: referableProbability,
    confidence,
    confidence_level: confidence < 0.5 ? "low" : confidence < 0.7 ? "moderate" : "high",
    model_version: OFFLINE_MODEL_VERSION,
  };
}

export function normalizeModelScores(scores: ArrayLike<number>): number[] {
  const selected = Array.from(scores, Number).slice(0, CLASS_NAMES.length);
  const sum = selected.reduce((total, item) => total + item, 0);
  const probabilityLike = selected.every((item) => item >= 0 && item <= 1) && Math.abs(sum - 1) <= 0.05;

  if (probabilityLike) {
    return selected.map((item) => item / Math.max(sum, Number.EPSILON));
  }

  return softmax(selected);
}

export function modelInputShape(): [number, number, number, number] {
  return [1, 3, MODEL_INPUT_SIZE, MODEL_INPUT_SIZE];
}

function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read fundus image."));
    };
    image.src = url;
  });
}

function drawImageToAnalysisCanvas(image: HTMLImageElement, maxDim: number) {
  const scale = Math.min(1, maxDim / Math.max(image.naturalWidth, image.naturalHeight));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
  const ctx = getCanvasContext(canvas);
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
  return { canvas, ctx };
}

function getCanvasContext(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) {
    throw new Error("Browser canvas is not available for local image processing.");
  }
  return ctx;
}

function computeFocusScore(gray: Float32Array, width: number, height: number): number {
  const gradients: number[] = [];
  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const p = y * width + x;
      gradients.push((gray[p + 1] ?? 0) - (gray[p - 1] ?? 0));
      gradients.push((gray[p + width] ?? 0) - (gray[p - width] ?? 0));
    }
  }

  const mean = gradients.reduce((sum, item) => sum + item, 0) / Math.max(gradients.length, 1);
  const variance = gradients.reduce((sum, item) => sum + (item - mean) ** 2, 0) / Math.max(gradients.length, 1);
  return variance;
}

function computeEdgeArtifactRatio(value: Float32Array, width: number, height: number): number {
  const band = Math.max(4, Math.floor(Math.min(width, height) * 0.08));
  let count = 0;
  let total = 0;
  forEachEdgePixel(width, height, band, (p) => {
    total += 1;
    if ((value[p] ?? 0) > 0.22) count += 1;
  });
  return count / Math.max(total, 1);
}

function computeCornerDarkRatio(value: Float32Array, width: number, height: number): number {
  const band = Math.max(4, Math.floor(Math.min(width, height) * 0.12));
  let count = 0;
  let total = 0;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const isCorner = (x < band || x >= width - band) && (y < band || y >= height - band);
      if (!isCorner) continue;
      total += 1;
      if ((value[y * width + x] ?? 0) < 0.13) count += 1;
    }
  }
  return count / Math.max(total, 1);
}

function computeWhiteEdgeRatio(
  rgba: Uint8ClampedArray,
  saturation: Float32Array,
  value: Float32Array,
  width: number,
  height: number,
): number {
  const band = Math.max(4, Math.floor(Math.min(width, height) * 0.08));
  let count = 0;
  let total = 0;
  forEachEdgePixel(width, height, band, (p) => {
    const i = p * 4;
    const red = rgba[i] ?? 0;
    const green = rgba[i + 1] ?? 0;
    const blue = rgba[i + 2] ?? 0;
    const brightNeutral = (value[p] ?? 0) > 0.72 && (saturation[p] ?? 0) < 0.16;
    const brightLabel = red > 185 && green > 185 && blue > 170;
    total += 1;
    if (brightNeutral || brightLabel) count += 1;
  });
  return count / Math.max(total, 1);
}

function forEachEdgePixel(width: number, height: number, band: number, callback: (p: number) => void) {
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (x < band || x >= width - band || y < band || y >= height - band) {
        callback(y * width + x);
      }
    }
  }
}

function equalizeGreenChannel(rgba: Uint8ClampedArray): void {
  const histogram = new Array<number>(256).fill(0);
  for (let i = 1; i < rgba.length; i += 4) {
    histogram[rgba[i] ?? 0] += 1;
  }

  const lut = new Uint8Array(256);
  let cdf = 0;
  const total = rgba.length / 4;
  for (let i = 0; i < histogram.length; i += 1) {
    cdf += histogram[i] ?? 0;
    lut[i] = Math.round((cdf / Math.max(total, 1)) * 255);
  }

  for (let i = 1; i < rgba.length; i += 4) {
    rgba[i] = lut[rgba[i] ?? 0] ?? rgba[i] ?? 0;
  }
}

function boxBlur(values: Float32Array, width: number, height: number, radius: number): Float32Array {
  const output = new Float32Array(values.length);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      let sum = 0;
      let count = 0;
      for (let dy = -radius; dy <= radius; dy += 1) {
        const yy = y + dy;
        if (yy < 0 || yy >= height) continue;
        for (let dx = -radius; dx <= radius; dx += 1) {
          const xx = x + dx;
          if (xx < 0 || xx >= width) continue;
          sum += values[yy * width + xx] ?? 0;
          count += 1;
        }
      }
      output[y * width + x] = sum / Math.max(count, 1);
    }
  }
  return output;
}

function normalizeInPlace(values: Float32Array): void {
  let max = 0;
  for (const item of values) {
    if (item > max) max = item;
  }
  if (max <= 0) return;
  for (let i = 0; i < values.length; i += 1) {
    values[i] = clamp((values[i] ?? 0) / max, 0, 1);
  }
}

function jetColor(value: number): [number, number, number] {
  const four = 4 * clamp(value, 0, 1);
  const red = clamp(Math.min(four - 1.5, -four + 4.5), 0, 1);
  const green = clamp(Math.min(four - 0.5, -four + 3.5), 0, 1);
  const blue = clamp(Math.min(four + 0.5, -four + 2.5), 0, 1);
  return [Math.round(red * 255), Math.round(green * 255), Math.round(blue * 255)];
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
