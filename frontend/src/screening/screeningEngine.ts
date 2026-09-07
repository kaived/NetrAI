import { ApiError, predictImage } from "../api";
import { runOfflineAptosV1Screening } from "../inference/offlineAptosModel";
import type { CaseResult, PatientInfo } from "../types";
import { withTimeout } from "../utils/timeout";

type ScreeningEngineInput = {
  file: File;
  patientInfo: PatientInfo;
  caseId: string;
  existingResult?: CaseResult | null;
};

const SCREENING_ANALYSIS_TIMEOUT_MS = 120_000;

export async function runScreeningAnalysis({
  file,
  patientInfo,
  caseId,
  existingResult,
}: ScreeningEngineInput): Promise<CaseResult> {
  return withTimeout(
    runScreeningAnalysisInner({ file, patientInfo, caseId, existingResult }),
    SCREENING_ANALYSIS_TIMEOUT_MS,
    "Screening analysis took too long. Please try again; if the network is weak, switch to the installed offline app.",
  );
}

async function runScreeningAnalysisInner({
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
      if (error instanceof ApiError && error.status >= 400 && error.status < 500) {
        throw error;
      }
    }
  }

  return runOfflineAptosV1Screening(file, patientInfo, caseId, existingResult);
}
