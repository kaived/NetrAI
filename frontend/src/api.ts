import type { CaseResult, PatientInfo } from "./types";

const LOCAL_API_BASE_URL = "http://localhost:8080";
const PRODUCTION_API_BASE_URL = "https://retinascan-api-58990504584.asia-south1.run.app";

export const API_BASE_URL = getApiBaseUrl();
const API_ACCESS_KEY = import.meta.env.VITE_API_ACCESS_KEY?.trim() || "";

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function readApiError(response: Response, fallback: string): Promise<string> {
  const details = await response.text();
  let message = fallback;
  try {
    const payload = details ? JSON.parse(details) : null;
    if (typeof payload.detail === "string") {
      message = payload.detail;
    } else if (Array.isArray(payload.detail)) {
      message = payload.detail
        .map((item: { message?: string; msg?: string }) => item.message || item.msg)
        .filter(Boolean)
        .join(" ");
    }
  } catch {
    message = details || message;
  }
  return message;
}

export async function getCase(caseId: string): Promise<CaseResult> {
  const response = await fetch(`${API_BASE_URL}/cases/${encodeURIComponent(caseId)}`, {
    headers: buildApiHeaders(),
  });

  if (!response.ok) {
    throw new ApiError(await readApiError(response, "Could not load screening case."), response.status);
  }

  return response.json();
}

export async function predictImage(file: File, patientInfo: PatientInfo, caseId: string): Promise<CaseResult> {
  const formData = new FormData();
  formData.append("image", file);
  formData.append("case_id", caseId);
  formData.append("eye", patientInfo.eye);
  formData.append("patient_age", patientInfo.patientAge);
  formData.append("diabetes_type", patientInfo.diabetesType);
  formData.append("diabetic_duration", patientInfo.diabeticDuration);

  const response = await fetch(`${API_BASE_URL}/predict`, {
    method: "POST",
    headers: buildApiHeaders(),
    body: formData
  });

  if (!response.ok) {
    throw new ApiError(await readApiError(response, "Prediction failed."), response.status);
  }

  return response.json();
}

export function resolveApiAssetUrl(url: string | null): string | null {
  if (!url) {
    return null;
  }

  if (/^(https?:|data:|blob:)/.test(url)) {
    return url;
  }

  return `${API_BASE_URL.replace(/\/$/, "")}/${url.replace(/^\//, "")}`;
}

export function shouldFetchAssetWithApiHeaders(url: string | null): boolean {
  const resolvedUrl = resolveApiAssetUrl(url);
  if (!resolvedUrl || /^(data:|blob:)/.test(resolvedUrl)) {
    return false;
  }

  try {
    const baseHref = typeof window !== "undefined" ? window.location.href : API_BASE_URL;
    const assetUrl = new URL(resolvedUrl, baseHref);
    const apiUrl = new URL(API_BASE_URL);
    return assetUrl.origin === apiUrl.origin && assetUrl.pathname.startsWith("/cases/");
  } catch {
    return false;
  }
}

export async function fetchDisplayAssetUrl(url: string): Promise<{ url: string; revoke: () => void }> {
  const resolvedUrl = resolveApiAssetUrl(url);
  if (!resolvedUrl) {
    throw new ApiError("Image asset URL is missing.", 0);
  }

  if (!shouldFetchAssetWithApiHeaders(resolvedUrl)) {
    return { url: resolvedUrl, revoke: () => undefined };
  }

  const response = await fetch(resolvedUrl, {
    headers: buildApiHeaders(),
  });

  if (!response.ok) {
    throw new ApiError(await readApiError(response, "Could not load image asset."), response.status);
  }

  const objectUrl = URL.createObjectURL(await response.blob());
  return {
    url: objectUrl,
    revoke: () => URL.revokeObjectURL(objectUrl),
  };
}

function getApiBaseUrl(): string {
  const configuredUrl = import.meta.env.VITE_API_BASE_URL?.trim();
  if (configuredUrl) {
    return configuredUrl.replace(/\/$/, "");
  }

  if (typeof window !== "undefined" && window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1") {
    return PRODUCTION_API_BASE_URL;
  }

  return LOCAL_API_BASE_URL;
}

export function buildApiHeaders(headers?: HeadersInit): Headers {
  const nextHeaders = new Headers(headers);
  if (API_ACCESS_KEY) {
    nextHeaders.set("X-NetrAI-API-Key", API_ACCESS_KEY);
  }
  return nextHeaders;
}
