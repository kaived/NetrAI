import React, { useState } from 'react';
import {
  FileText,
  Printer,
  Download,
  FileDown,
  Copy,
  Check,
  AlertCircle,
  Clock,
  Stethoscope
} from 'lucide-react';
import { resolveApiAssetUrl } from '../api';
import type { CaseResult, EyeScreeningResult, PatientInfo } from '../types';
import { buildGradeConsistentReportText, getEyeResults } from '../utils/clinicalReport';
import { displayText, formatGradeLabel, getTriageDisplay, sanitizeForDisplayExport } from '../utils/display';
import { downloadClinicalReportPdf } from '../utils/pdfReport';
import { AuthenticatedImage } from './AuthenticatedImage';

interface ClinicalReportCardProps {
  result: CaseResult;
  patientInfo: PatientInfo;
  previewUrl: string | null;
}

export const ClinicalReportCard: React.FC<ClinicalReportCardProps> = ({ result, patientInfo, previewUrl }) => {
  const [copied, setCopied] = useState(false);
  const finalReport = result.final_report;
  const isFinalReport = Boolean(finalReport);
  const isGradeable = isFinalReport || result.quality.is_gradeable;
  const eye = result.patient?.eye || patientInfo.eye;
  const eyeLabel = isFinalReport ? 'Both Eyes (OD + OS)' : eye === 'OD' ? 'OD (Right Eye)' : 'OS (Left Eye)';
  const caseId = displayText(result.case_id, 'Generated on server');
  const patientAge = displayText(result.patient?.patient_age || patientInfo.patientAge, 'N/A');
  const diabetesType = displayText(result.patient?.diabetes_type || patientInfo.diabetesType, 'N/A');
  const diabeticDurationCompact = formatYearsSinceDiagnosis(
    result.patient?.diabetic_duration || patientInfo.diabeticDuration,
    'compact',
  );
  const diabeticDurationFormal = formatYearsSinceDiagnosis(
    result.patient?.diabetic_duration || patientInfo.diabeticDuration,
    'formal',
  );
  const diabetesProfile =
    diabeticDurationCompact !== 'N/A' ? `${diabetesType} (${diabeticDurationCompact})` : diabetesType;
  const confidenceLevel = displayText(result.prediction.confidence_level, 'unknown');
  const explanationText = displayText(result.explanation.text, 'Explainability note is not available for this case.');
  const compatibilityWarnings =
    result.quality.warnings?.map((warning) => displayText(warning, '')).filter(Boolean) ?? [];
  const eyeResults = getEyeResults(result);
  const reportText = buildGradeConsistentReportText(result, eyeResults);
  const reportSummary = reportText.summary;
  const reportRecommendation = reportText.recommendation;
  const reportDisclaimer = reportText.disclaimer;
  const referable = reportText.referable;

  const handleCopySummary = () => {
    const gradeVal = finalReport?.worst_icdr_grade ?? result.prediction.icdr_grade;
    const gradeDisplay = gradeVal !== null && gradeVal !== undefined ? `Grade ${gradeVal}` : 'No Grade';
    const labelDisplay = formatGradeLabel(finalReport?.worst_label ?? result.prediction.label, gradeVal);

    const text = `
NETRAI - CLINICAL SCREENING SUMMARY
=========================================
Case ID: ${caseId}
Examined Eye: ${eyeLabel}
Patient Age: ${patientAge}
Diabetes Type: ${diabetesType}
Years Since Diagnosis: ${diabeticDurationFormal}
Date: ${new Date().toLocaleDateString()}

QUALITY GATE: ${result.quality.is_gradeable ? 'PASSED (Gradeable)' : 'REJECTED (Ungradeable)'}
- Focus Score: ${result.quality.focus_score.toFixed(1)}
- Brightness: ${result.quality.brightness.toFixed(2)}
- Fundus Compatibility: ${Math.round((result.quality.compatibility_score ?? 1) * 100)}%
- Capture Advisory: ${compatibilityWarnings.length ? `Screening completed, but a more centered fundus image is preferred for higher reliability. ${compatibilityWarnings.join('; ')}` : 'None'}

DIAGNOSTIC TRIAGE:
- Referral Decision: ${referable ? 'REFERRAL REQUIRED' : 'NO REFERRAL REQUIRED (Routine)'}
- ICDR DR Grade: ${gradeDisplay} (${labelDisplay})
- Model Confidence: ${isFinalReport ? 'See per-eye confidence below' : `${(result.prediction.confidence * 100).toFixed(1)}% (${confidenceLevel})`}

PER-EYE RESULTS:
${eyeResults.map(formatEyeSummary).join('\n') || 'Only one eye result available.'}

RECOMMENDATION:
${reportRecommendation}

EXPLAINABILITY:
${explanationText}

DISCLAIMER:
${reportDisclaimer}
    `.trim();

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadJSON = () => {
    const dataStr =
      'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(sanitizeForDisplayExport(result), null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `NetrAI_${caseId}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleDownloadPDF = () => {
    void downloadClinicalReportPdf(result, {
      eyeLabel,
      patientAge,
      diabetesType,
      diabeticDuration: diabeticDurationFormal,
      heatmapUrl: resolveApiAssetUrl(result.explanation.heatmap_url),
      previewUrl,
    });
  };

  const compactCaseId = caseId.length > 14 ? `...${caseId.slice(-8)}` : caseId;

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 lg:p-7 shadow-sm space-y-6 print-card h-full flex flex-col justify-between">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-5">
        <div className="flex items-start gap-3.5 min-w-0">
          <div className="flex h-11 w-11 sm:h-12 sm:w-12 items-center justify-center rounded-xl bg-teal-50 text-teal-800 shrink-0 mt-0.5">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xl sm:text-2xl font-bold text-slate-950 leading-tight">
              {isFinalReport ? 'Final Two-Eye Clinical Report' : 'Clinical Screening Report'}
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
              {isFinalReport ? 'Combined OD/OS Ophthalmic Referral Document' : 'Primary Health Center (PHC) Ophthalmic Referral Document'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 no-print shrink-0 w-full sm:w-auto">
          <button
            onClick={handleCopySummary}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 min-w-0 sm:min-w-[100px] text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors border border-slate-200 shadow-2xs"
            title="Copy formatted summary to clipboard"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied!' : 'Copy'}</span>
          </button>
          <button
            onClick={handleDownloadPDF}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 min-w-0 sm:min-w-[100px] text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-lg shadow-xs transition-colors"
            title="Download clinical report as PDF"
          >
            <FileDown className="w-3.5 h-3.5" />
            <span>PDF</span>
          </button>
          <button
            onClick={handleDownloadJSON}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 min-w-0 sm:min-w-[100px] text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors border border-slate-200 shadow-2xs"
            title="Download full JSON dataset"
          >
            <Download className="w-3.5 h-3.5" />
            <span>JSON</span>
          </button>
          <button
            onClick={handlePrint}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 min-w-0 sm:min-w-[100px] text-xs font-bold text-white bg-slate-800 hover:bg-slate-900 rounded-lg shadow-xs transition-all"
            title="Print clinical referral sheet"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[0.8fr_1.1fr_0.9fr_1.2fr] gap-3 sm:gap-4 bg-slate-50 p-4 sm:p-5 rounded-xl border border-slate-200">
        <div className="min-w-0">
          <span className="text-slate-400 block text-[10px] sm:text-xs uppercase font-bold tracking-wide whitespace-nowrap">Case ID</span>
          <span className="font-mono text-slate-900 font-bold text-sm sm:text-base leading-normal mt-0.5 block whitespace-nowrap truncate" title={caseId}>
            <span className="print:hidden">{compactCaseId}</span>
            <span className="hidden print:inline">{caseId}</span>
          </span>
        </div>
        <div className="min-w-0">
          <span className="text-slate-400 block text-[10px] sm:text-xs uppercase font-bold tracking-wide whitespace-nowrap">Screening Scope</span>
          <span className="font-bold text-teal-800 text-sm sm:text-base leading-normal mt-0.5 block break-words sm:whitespace-nowrap" title={eyeLabel}>
            {eyeLabel}
          </span>
        </div>
        <div className="min-w-0">
          <span className="text-slate-400 block text-[10px] sm:text-xs uppercase font-bold tracking-wide whitespace-nowrap">Patient Age</span>
          <span className="font-semibold text-slate-800 text-sm sm:text-base leading-normal mt-0.5 block whitespace-nowrap" title={patientAge}>
            {patientAge}
          </span>
        </div>
        <div className="min-w-0">
          <span className="text-slate-400 block text-[10px] sm:text-xs uppercase font-bold tracking-wide whitespace-nowrap">Diabetes Profile</span>
          <span className="font-semibold text-slate-800 text-sm sm:text-base leading-normal mt-0.5 block break-words sm:whitespace-nowrap" title={diabetesProfile}>
            {diabetesProfile}
          </span>
        </div>
      </div>

      {(isFinalReport || eyeResults.length > 1) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {eyeResults.map((eyeResult) => {
            const triage = getTriageDisplay(eyeResult.prediction);
            const eyeCode = eyeResult.eye;
            const eyeInputUrl = resolveStoredOrCaseAsset(
              eyeResult.storage?.input_uri,
              `/cases/${result.case_id}/eyes/${eyeCode}/input`,
            ) || (result.patient?.eye === eyeCode ? previewUrl : null);
            const eyeHeatmapUrl =
              resolveApiAssetUrl(eyeResult.explanation?.heatmap_url) ||
              resolveApiAssetUrl(`/cases/${result.case_id}/eyes/${eyeCode}/heatmap`);

            return (
              <div key={eyeResult.eye} className="rounded-xl border border-slate-200 bg-slate-50 p-4 flex flex-col justify-between space-y-3 print:bg-white print:border-slate-300">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wide text-slate-500">
                      {eyeResult.eye === 'OD' ? 'OD Right Eye' : 'OS Left Eye'}
                    </span>
                    <div className="mt-1 text-base sm:text-lg font-extrabold text-slate-950">
                      {eyeResult.prediction.icdr_grade !== null && eyeResult.prediction.icdr_grade !== undefined
                        ? `Grade ${eyeResult.prediction.icdr_grade}`
                        : 'No Grade'}{' '}
                      ({formatGradeLabel(eyeResult.prediction.label, eyeResult.prediction.icdr_grade)})
                    </div>
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-extrabold ${
                      triage.positive
                        ? 'bg-rose-100 text-rose-800'
                        : 'bg-emerald-100 text-emerald-800'
                    }`}
                  >
                    {triage.label}
                  </span>
                </div>

                {/* Retinal Fundus Photograph & Attention Map Preview */}
                {eyeInputUrl && (
                  <div className="relative rounded-lg overflow-hidden bg-slate-950 border border-slate-800 aspect-[4/3] max-h-48 sm:max-h-56 flex items-center justify-center">
                    <AuthenticatedImage
                      src={eyeInputUrl}
                      alt={`${eyeCode} Fundus Scan`}
                      className="absolute inset-0 m-auto max-h-full max-w-full object-contain"
                    />
                    {eyeHeatmapUrl && (
                      <AuthenticatedImage
                        src={eyeHeatmapUrl}
                        alt={`${eyeCode} Attention Heatmap`}
                        className="absolute inset-0 m-auto max-h-full max-w-full object-contain pointer-events-none mix-blend-screen opacity-70"
                      />
                    )}
                  </div>
                )}

                <div className="text-sm text-slate-600">
                  Confidence {(eyeResult.prediction.confidence * 100).toFixed(1)}% ({eyeResult.prediction.confidence_level || 'unknown'})
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="space-y-4">
        <div
          className={`p-4 sm:p-5 rounded-xl border ${
            !isGradeable
              ? 'bg-amber-50 border-amber-200 text-amber-950'
              : referable
              ? 'bg-rose-50 border-rose-200 text-rose-950'
              : 'bg-emerald-50 border-emerald-200 text-emerald-950'
          }`}
        >
          <div className="flex items-start gap-3">
            <Stethoscope className="w-5 h-5 sm:w-6 sm:h-6 shrink-0 mt-0.5 text-inherit" />
            <div className="space-y-1.5 sm:space-y-2 min-w-0 flex-1">
              <h4 className="text-lg sm:text-xl font-bold leading-snug sm:leading-7">{reportSummary}</h4>
              <p className="text-xs sm:text-base leading-relaxed sm:leading-7 opacity-90">{reportRecommendation}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-4 sm:p-5 text-xs sm:text-sm text-amber-900 flex items-start gap-3">
        <div className="flex items-center justify-center shrink-0 w-5 h-5">
          <AlertCircle className="w-5 h-5 text-amber-700" />
        </div>
        <div className="space-y-1 min-w-0 flex-1">
          <span className="font-bold block leading-5">Medical Screening Disclaimer:</span>
          <p className="text-xs sm:text-sm leading-relaxed sm:leading-6 text-amber-800">
            {reportDisclaimer} NetrAI is an automated decision-support triage aid for primary health centers, designed to assist clinical evaluations by certified ophthalmologists and healthcare professionals.
          </p>
        </div>
      </div>
    </div>
  );
};

function formatEyeSummary(eyeResult: EyeScreeningResult): string {
  const eyeLabel = eyeResult.eye === 'OD' ? 'OD Right Eye' : 'OS Left Eye';
  const grade =
    eyeResult.prediction.icdr_grade !== null && eyeResult.prediction.icdr_grade !== undefined
      ? `Grade ${eyeResult.prediction.icdr_grade}`
      : 'No Grade';
  const confidence = (eyeResult.prediction.confidence * 100).toFixed(1);
  const triage = getTriageDisplay(eyeResult.prediction);
  return `- ${eyeLabel}: ${grade} (${formatGradeLabel(eyeResult.prediction.label, eyeResult.prediction.icdr_grade)}), ${confidence}% confidence, ${triage.copyLabel}`;
}

function formatYearsSinceDiagnosis(value: unknown, style: 'compact' | 'formal'): string {
  const cleaned = displayText(value, 'N/A');
  if (cleaned === 'N/A') {
    return cleaned;
  }

  const unit = (years: string) => {
    if (style === 'formal') {
      return years === '1' ? 'year' : 'years';
    }
    return years === '1' ? 'yr' : 'yrs';
  };

  if (/^\d+(?:\.\d+)?$/.test(cleaned)) {
    return `${cleaned} ${unit(cleaned)}`;
  }

  if (/^\d+(?:\.\d+)?\s*y(?:r|rs)?$/i.test(cleaned)) {
    const years = cleaned.match(/^\d+(?:\.\d+)?/)?.[0] ?? cleaned;
    return `${years} ${unit(years)}`;
  }

  return cleaned;
}

function resolveStoredOrCaseAsset(storedUrl: string | null | undefined, fallbackPath: string): string | null {
  if (storedUrl && /^(https?:|data:|blob:)/.test(storedUrl)) {
    return resolveApiAssetUrl(storedUrl);
  }

  return resolveApiAssetUrl(fallbackPath);
}
