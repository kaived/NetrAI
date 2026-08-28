import type { CaseResult, HealthResponse } from "./types";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8080";

export async function getHealth(): Promise<HealthResponse> {
  const response = await fetch(`${API_BASE_URL}/health`);
  if (!response.ok) {
    throw new Error("Backend health check failed.");
  }
  return response.json();
}

export async function predictImage(file: File): Promise<CaseResult> {
  const formData = new FormData();
  formData.append("image", file);

  const response = await fetch(`${API_BASE_URL}/predict`, {
    method: "POST",
    body: formData
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(details || "Prediction failed.");
  }

  return response.json();
}
