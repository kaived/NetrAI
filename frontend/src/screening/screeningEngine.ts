import { ApiError, predictImage } from "../api";
import { runOfflineAptosV1Screening } from "../inference/offlineAptosModel";
import type { CaseResult, PatientInfo } from "../types";

type ScreeningEngineInput = {
  file: File;
  patientInfo: PatientInfo;
  caseId: string;
  existingResult?: CaseResult | null;
};

export async function runScreeningAnalysis({
  file,
  patientInfo,
  caseId,
  existingResult,
}: ScreeningEngineInput): Promise<CaseResult> {
  if (navigator.onLine) {
    try {
      const result = await predictImage(file, patientInfo, caseId);
      return {
        ...result,
        runtime: "cloud",
        sync_status: "synced",
      };
    } catch (error) {
      if (error instanceof ApiError && error.status < 500) {
        throw error;
      }
    }
  }

  return runOfflineAptosV1Screening(file, patientInfo, caseId, existingResult);
}
