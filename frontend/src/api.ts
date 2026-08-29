import type { CaseResult, PatientInfo } from "./types";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8080";

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
  const response = await fetch(`${API_BASE_URL}/cases/${encodeURIComponent(caseId)}`);

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
