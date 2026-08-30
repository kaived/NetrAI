import type { CaseResult, EyeCode, EyeScreeningResult } from '../types';
import { displayText, getTriageDisplay } from './display';

type ClinicalReportText = {
  summary: string;
  recommendation: string;
  disclaimer: string;
  referable: boolean;
};

export function getEyeResults(result: CaseResult): EyeScreeningResult[] {
  return (['OD', 'OS'] as EyeCode[])
    .map((eye) => result.eyes?.[eye])
    .filter((eyeResult): eyeResult is EyeScreeningResult => Boolean(eyeResult));
}

export function formatEyeLabel(eye: EyeCode) {
  return eye === 'OD' ? 'OD Right Eye' : 'OS Left Eye';
}

export function isGradeBasedReferable(result: CaseResult, eyeResults = getEyeResults(result)) {
  if (result.final_report && eyeResults.length > 0) {
    return eyeResults.some((eyeResult) => getGradeValue(eyeResult) >= 2);
  }

  return getTriageDisplay(result.prediction).positive;
}

export function buildGradeConsistentReportText(
  result: CaseResult,
  eyeResults = getEyeResults(result),
): ClinicalReportText {
  const disclaimer = displayText(result.final_report?.disclaimer ?? result.report.disclaimer, 'Screening support only.');
  const referable = isGradeBasedReferable(result, eyeResults);

  if (result.final_report && eyeResults.length > 1) {
    return {
      ...buildFinalTwoEyeText(result, eyeResults, referable),
      disclaimer,
      referable,
    };
  }

  if (!result.quality.is_gradeable || result.prediction.icdr_grade === null || result.prediction.icdr_grade === undefined) {
    return {
      summary: displayText(result.report.summary, 'Image was not gradeable for DR screening.'),
      recommendation: displayText(result.report.recommendation, 'Recapture a clearer standard fundus photograph.'),
      disclaimer,
      referable,
    };
  }

  return {
    ...buildSingleEyeText(result, referable),
    disclaimer,
    referable,
  };
}

function buildFinalTwoEyeText(result: CaseResult, eyeResults: EyeScreeningResult[], referable: boolean) {
  const finalReport = result.final_report;
  const fallbackWorstGrade = Math.max(...eyeResults.map(getGradeValue));
  const worstGrade = finalReport?.worst_icdr_grade ?? fallbackWorstGrade;
  const worstEyes = getWorstEyes(result, eyeResults, worstGrade);
  const firstWorstResult = eyeResults.find((eyeResult) => worstEyes.includes(eyeResult.eye)) ?? eyeResults[0];
  const worstLabel = displayText(finalReport?.worst_label ?? firstWorstResult?.prediction.label, 'screening result');
  const gradeText = formatGradeText(worstGrade, worstLabel);
  const location = worstEyes.length > 1 ? 'both eyes' : formatEyeLabel(worstEyes[0] ?? firstWorstResult.eye);
  const finding =
    worstEyes.length > 1
      ? `${referable ? 'Worst' : 'Highest'} grade present in ${location}: ${gradeText}.`
      : referable
      ? `Worst eye ${location}: ${gradeText}.`
      : `Highest finding ${location}: ${gradeText}.`;
  const lowConfidence = eyeResults.some((eyeResult) => isLowConfidence(eyeResult.prediction.confidence_level));

  let recommendation = referable
    ? 'Ophthalmologist review recommended. Treat as triage-positive because at least one eye is Grade 2 or higher.'
    : 'Routine screening follow-up may be used unless symptoms or clinical risk factors require review.';

  if (lowConfidence) {
    recommendation += ' At least one eye has low model confidence, so manual verification is recommended.';
  }

  return {
    summary: referable
      ? `Final two-eye screening: referable diabetic retinopathy suspected. ${finding}`
      : `Final two-eye screening: no referable diabetic retinopathy detected in either eye. ${finding}`,
    recommendation,
  };
}

function buildSingleEyeText(result: CaseResult, referable: boolean) {
  const grade = result.prediction.icdr_grade;
  const label = displayText(result.prediction.label, 'screening result');
  const confidence = Number.isFinite(result.prediction.confidence)
    ? result.prediction.confidence.toFixed(2)
    : 'not available';
  const lowConfidence = isLowConfidence(result.prediction.confidence_level);

  if (referable) {
    return {
      summary: `${lowConfidence ? 'Possible referable' : 'Referable'} DR suspected: ${label}, confidence ${confidence}.`,
      recommendation: 'Ophthalmologist review recommended.',
    };
  }

  return {
    summary: lowConfidence
      ? `No referable DR detected: ${label}, but model confidence is low at ${confidence}.`
      : `No referable DR detected: ${label} (Grade ${grade}), confidence ${confidence}.`,
    recommendation: lowConfidence
      ? 'Routine category by grade, but manual verification is recommended because confidence is low.'
      : 'Routine screening follow-up recommended.',
  };
}

function getWorstEyes(result: CaseResult, eyeResults: EyeScreeningResult[], worstGrade: number): EyeCode[] {
  const reportWorstEyes = result.final_report?.worst_eyes?.filter(isEyeCode) ?? [];

  if (reportWorstEyes.length > 0) {
    return reportWorstEyes;
  }

  const gradeMatchedEyes = eyeResults
    .filter((eyeResult) => getGradeValue(eyeResult) === worstGrade)
    .map((eyeResult) => eyeResult.eye);

  if (gradeMatchedEyes.length > 0) {
    return gradeMatchedEyes;
  }

  return isEyeCode(result.final_report?.worst_eye) ? [result.final_report.worst_eye] : [];
}

function getGradeValue(eyeResult: EyeScreeningResult) {
  return eyeResult.prediction.icdr_grade ?? -1;
}

function isEyeCode(value: unknown): value is EyeCode {
  return value === 'OD' || value === 'OS';
}

function formatGradeText(grade: number | null | undefined, label: string) {
  return grade !== null && grade !== undefined && grade >= 0 ? `${label} (Grade ${grade})` : label;
}

function isLowConfidence(level: unknown) {
  return displayText(level, '').toLowerCase() === 'low';
}
