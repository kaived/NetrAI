import type { CaseResult, EyeCode, EyeScreeningResult, PatientInfo } from "../types";
import { fileToDataUrl, saveOfflineCaseSnapshot } from "../offline/db";
import {
  OFFLINE_MODEL_URL,
  OFFLINE_MODEL_VERSION,
  assessImageQuality,
  buildLocalAttentionHeatmap,
  buildPrediction,
  buildRejectedExplanation,
  buildRejectedPrediction,
  modelInputShape,
  preprocessImageForAptosV1,
} from "./imageProcessing";

let sessionPromise: Promise<import("onnxruntime-web/wasm").InferenceSession> | null = null;

export async function runOfflineAptosV1Screening(
  file: File,
  patientInfo: PatientInfo,
  caseId: string,
  existingResult?: CaseResult | null,
): Promise<CaseResult> {
  const imageDataUrl = await fileToDataUrl(file);
  const quality = await assessImageQuality(file);
  const patient = {
    eye: patientInfo.eye,
    patient_age: patientInfo.patientAge,
    diabetes_type: patientInfo.diabetesType,
    diabetic_duration: patientInfo.diabeticDuration,
  };

  if (!quality.is_gradeable) {
    const rejected = mergeEyeResult(existingResult, {
      eye: patientInfo.eye,
      status: "rejected_ungradeable",
      patient,
      quality,
      prediction: buildRejectedPrediction(),
      explanation: buildRejectedExplanation(),
      report: {
        summary: "Image rejected by quality gate before DR classification.",
        recommendation: "Recapture the fundus photograph and run screening again.",
        disclaimer: "Screening support only. Not a final diagnosis.",
      },
      storage: {
        input_uri: imageDataUrl,
        heatmap_uri: null,
        report_uri: null,
      },
    }, caseId);
    await saveOfflineCaseSnapshot(rejected, imageDataUrl);
    return rejected;
  }

  const session = await getOfflineSession();
  const inputTensor = await preprocessImageForAptosV1(file);
  const ort = await import("onnxruntime-web/wasm");
  const tensor = new ort.Tensor("float32", inputTensor, modelInputShape());
  const feeds: Record<string, import("onnxruntime-web/wasm").Tensor> = {
    [session.inputNames[0] ?? "input"]: tensor,
  };
  const output = await session.run(feeds);
  const outputTensor = output[session.outputNames[0] ?? Object.keys(output)[0]];
  if (!outputTensor) {
    throw new Error("Offline model did not return prediction scores.");
  }

  const prediction = buildPrediction(outputTensor.data as Float32Array);
  const heatmapDataUrl = await buildLocalAttentionHeatmap(file);
  const result = mergeEyeResult(existingResult, {
    eye: patientInfo.eye,
    status: "completed",
    patient,
    quality,
    prediction,
    explanation: {
      method: "offline_cv_lesion_attention_v1",
      heatmap_url: heatmapDataUrl,
      text: "Offline APTOS v1 inference completed. Computer-vision lesion attention heatmap was generated locally on device.",
    },
    report: buildSingleEyeReport(prediction),
    storage: {
      input_uri: imageDataUrl,
      heatmap_uri: heatmapDataUrl,
      report_uri: null,
    },
  }, caseId);

  await saveOfflineCaseSnapshot(result, imageDataUrl, heatmapDataUrl);
  return result;
}

async function getOfflineSession(): Promise<import("onnxruntime-web/wasm").InferenceSession> {
  if (sessionPromise) {
    return sessionPromise;
  }

  sessionPromise = import("onnxruntime-web/wasm").then(async (ort) => {
    ort.env.wasm.wasmPaths = "/ort/";
    ort.env.wasm.numThreads = 1;

    try {
      return await ort.InferenceSession.create(OFFLINE_MODEL_URL, {
        executionProviders: ["wasm"],
      });
    } catch (error) {
      sessionPromise = null;
      throw new Error(
        `Offline APTOS model is not available at ${OFFLINE_MODEL_URL}. Copy backend/models/dr_classifier.onnx into frontend/public/offline-models/dr_classifier.onnx before building the offline app.`,
      );
    }
  });

  return sessionPromise;
}

function mergeEyeResult(
  existingResult: CaseResult | null | undefined,
  eyeResult: EyeScreeningResult,
  caseId: string,
): CaseResult {
  const eyes: Partial<Record<EyeCode, EyeScreeningResult>> = {
    ...(existingResult?.eyes ?? {}),
    [eyeResult.eye]: eyeResult,
  };
  const completedEyes = (["OD", "OS"] as EyeCode[]).filter(
    (eye) => eyes[eye]?.status === "completed" && eyes[eye]?.quality.is_gradeable,
  );
  const finalReport = completedEyes.length === 2 ? buildFinalReport(eyes) : null;
  const nextEye = eyeResult.status !== "completed" || !eyeResult.quality.is_gradeable
    ? eyeResult.eye
    : (["OD", "OS"] as EyeCode[]).find((eye) => !completedEyes.includes(eye)) ?? null;

  return {
    case_id: caseId,
    status: finalReport ? "completed" : eyeResult.status === "completed" ? "in_progress" : "rejected_ungradeable",
    runtime: "offline",
    sync_status: "pending",
    patient: eyeResult.patient,
    quality: eyeResult.quality,
    prediction: eyeResult.prediction,
    explanation: eyeResult.explanation,
    report: eyeResult.report,
    storage: eyeResult.storage,
    completed_eyes: completedEyes,
    next_eye: nextEye,
    is_case_complete: Boolean(finalReport),
    eyes,
    final_report: finalReport,
  };
}

function buildSingleEyeReport(prediction: EyeScreeningResult["prediction"]) {
  const grade = prediction.icdr_grade;
  const label = prediction.label.replace(/_/g, " ");
  const confidence = prediction.confidence.toFixed(2);
  const lowConfidence = prediction.confidence_level === "low";

  if (grade !== null && grade >= 2) {
    return {
      summary: `Referable DR suspected: ${label}, confidence ${confidence}.`,
      recommendation: lowConfidence
        ? "Ophthalmologist review recommended. Low model confidence; manual verification is recommended."
        : "Ophthalmologist review recommended.",
      disclaimer: "Screening support only. Not a final diagnosis.",
    };
  }

  return {
    summary: `No referable DR detected: ${label}, confidence ${confidence}.`,
    recommendation: lowConfidence
      ? "Routine follow-up may be used, but low model confidence should be manually verified."
      : "Routine screening follow-up.",
    disclaimer: "Screening support only. Not a final diagnosis.",
  };
}

function buildFinalReport(eyes: Partial<Record<EyeCode, EyeScreeningResult>>): CaseResult["final_report"] {
  const completed = (["OD", "OS"] as EyeCode[]).map((eye) => eyes[eye]).filter(Boolean) as EyeScreeningResult[];
  const worstGrade = Math.max(...completed.map((eye) => eye.prediction.icdr_grade ?? -1));
  const worstResults = completed.filter((eye) => (eye.prediction.icdr_grade ?? -1) === worstGrade);
  const referable = completed.some((eye) => (eye.prediction.icdr_grade ?? -1) >= 2);
  const worstEyes = worstResults.map((eye) => eye.eye);
  const worstLabel = worstResults[0]?.prediction.label ?? null;
  const tied = worstEyes.length > 1;
  const eyeText = tied ? "both eyes" : worstEyes[0] === "OD" ? "OD Right" : "OS Left";
  const lowConfidence = completed.some((eye) => eye.prediction.confidence_level === "low");

  const summary = referable
    ? `Final two-eye screening: referable diabetic retinopathy suspected. Worst grade present in ${eyeText}: ${worstLabel} (Grade ${worstGrade}).`
    : `Final two-eye screening: no referable diabetic retinopathy detected in either eye. Highest grade present in ${eyeText}: ${worstLabel} (Grade ${worstGrade}).`;
  const recommendation = `${referable
    ? "Ophthalmologist review recommended. Treat as triage-positive because at least one eye is Grade 2 or higher."
    : "Routine screening follow-up may be used unless symptoms or clinical risk factors require review."}${lowConfidence ? " At least one eye has low model confidence, so manual verification is recommended." : ""}`;

  return {
    summary,
    recommendation,
    disclaimer: "Screening support only. Not a final diagnosis.",
    referable_dr: referable,
    worst_eye: tied ? null : worstEyes[0] ?? null,
    worst_eyes: worstEyes,
    worst_icdr_grade: worstGrade,
    worst_label: worstLabel,
    completed_eyes: ["OD", "OS"],
  };
}
