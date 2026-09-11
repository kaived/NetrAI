import type { CaseResult, PatientInfo } from "./types";

const LOCAL_API_BASE_URL = "http://localhost:8080";
const PRODUCTION_API_BASE_URL = "https://retinascan-api-58990504584.asia-south1.run.app";

export const API_BASE_URL = getApiBaseUrl();
export const API_REQUEST_TIMEOUTS = {
  caseRead: 30_000,
  health: 5_000,
  predict: 45_000,
  asset: 30_000,
  sync: 90_000,
} as const;
const API_ACCESS_KEY = import.meta.env.VITE_API_ACCESS_KEY?.trim() || "";

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export async function readApiError(response: Response, fallback: string): Promise<string> {
  const details = await response.text();
  let message = fallback;
  try {
    const payload = details ? JSON.parse(details) : null;
    if (typeof payload?.detail === "string") {
      message = payload.detail;
    } else if (Array.isArray(payload?.detail)) {
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
  const response = await fetchWithTimeout(
    `${API_BASE_URL}/cases/${encodeURIComponent(caseId)}`,
    {
      headers: buildApiHeaders(),
    },
    API_REQUEST_TIMEOUTS.caseRead,
    "Case restore timed out. Check the connection and try again.",
  );

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

  const response = await fetchWithTimeout(
    `${API_BASE_URL}/predict`,
    {
      method: "POST",
      headers: buildApiHeaders(),
      body: formData,
    },
    API_REQUEST_TIMEOUTS.predict,
    "Cloud screening took too long. The app will try offline screening if the offline model is available.",
  );

  if (!response.ok) {
    throw new ApiError(await readApiError(response, "Prediction failed."), response.status);
  }

  return response.json();
}

export async function checkApiHealth(timeoutMs: number = API_REQUEST_TIMEOUTS.health, signal?: AbortSignal): Promise<boolean> {
  try {
    const response = await fetchWithTimeout(
      `${API_BASE_URL}/health`,
      {
        method: "GET",
        cache: "no-store",
        signal,
      },
      timeoutMs,
      "Cloud API health check timed out.",
    );
    return response.ok;
  } catch {
    return false;
  }
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

  const response = await fetchWithTimeout(
    resolvedUrl,
    {
      headers: buildApiHeaders(),
    },
    API_REQUEST_TIMEOUTS.asset,
    "Could not load image asset in time.",
  );

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

export async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit,
  timeoutMs: number,
  timeoutMessage: string,
): Promise<Response> {
  const controller = new AbortController();
  const abortFromCaller = () => controller.abort();
  init.signal?.addEventListener("abort", abortFromCaller, { once: true });
  if (init.signal?.aborted) controller.abort();
  const timeoutId = globalThis.setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(input, {
      ...init,
      signal: controller.signal,
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new ApiError(timeoutMessage, 0);
    }
    throw error;
  } finally {
    globalThis.clearTimeout(timeoutId);
    init.signal?.removeEventListener("abort", abortFromCaller);
  }
}
