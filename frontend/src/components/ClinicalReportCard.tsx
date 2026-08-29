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
import type { CaseResult, EyeCode, EyeScreeningResult, PatientInfo } from '../types';
import { downloadClinicalReportPdf } from '../utils/pdfReport';

interface ClinicalReportCardProps {
  result: CaseResult;
  patientInfo: PatientInfo;
  previewUrl: string | null;
}

export const ClinicalReportCard: React.FC<ClinicalReportCardProps> = ({ result, patientInfo, previewUrl }) => {
  const [copied, setCopied] = useState(false);
  const finalReport = result.final_report;
  const isFinalReport = Boolean(finalReport);
  const referable = finalReport?.referable_dr ?? result.prediction.referable_dr;
  const isGradeable = isFinalReport || result.quality.is_gradeable;
  const eye = result.patient?.eye || patientInfo.eye;
  const eyeLabel = isFinalReport ? 'Both Eyes (OD + OS)' : eye === 'OD' ? 'OD (Right Eye)' : 'OS (Left Eye)';
  const patientAge = result.patient?.patient_age || patientInfo.patientAge || 'N/A';
  const diabetesType = result.patient?.diabetes_type || patientInfo.diabetesType || 'N/A';
  const diabeticDuration = result.patient?.diabetic_duration || patientInfo.diabeticDuration || 'N/A';
  const confidenceLevel = result.prediction.confidence_level || 'unknown';
  const reportSummary = finalReport?.summary ?? result.report.summary;
  const reportRecommendation = finalReport?.recommendation ?? result.report.recommendation;
  const reportDisclaimer = finalReport?.disclaimer ?? result.report.disclaimer;
  const eyeResults = getEyeResults(result);

  const handleCopySummary = () => {
    const gradeVal = finalReport?.worst_icdr_grade ?? result.prediction.icdr_grade;
    const gradeDisplay = gradeVal !== null && gradeVal !== undefined ? `Grade ${gradeVal}` : 'No Grade';
    const labelDisplay = finalReport?.worst_label ?? result.prediction.label;

    const text = `
NETRAI - CLINICAL SCREENING SUMMARY
=========================================
Case ID: ${result.case_id}
Examined Eye: ${eyeLabel}
Patient Age: ${patientAge}
Diabetes Type: ${diabetesType}
Years Since Diagnosis: ${diabeticDuration}
Date: ${new Date().toLocaleDateString()}

QUALITY GATE: ${result.quality.is_gradeable ? 'PASSED (Gradeable)' : 'REJECTED (Ungradeable)'}
- Focus Score: ${result.quality.focus_score.toFixed(1)}
- Brightness: ${result.quality.brightness.toFixed(2)}
- Fundus Compatibility: ${Math.round((result.quality.compatibility_score ?? 1) * 100)}%
- Compatibility Warnings: ${result.quality.warnings?.length ? result.quality.warnings.join('; ') : 'None'}

DIAGNOSTIC TRIAGE:
- Referral Decision: ${referable ? 'REFERRAL REQUIRED (Urgent)' : 'NO REFERRAL REQUIRED (Routine)'}
- ICDR DR Grade: ${gradeDisplay} (${labelDisplay})
- Model Confidence: ${isFinalReport ? 'See per-eye confidence below' : `${(result.prediction.confidence * 100).toFixed(1)}% (${confidenceLevel})`}

PER-EYE RESULTS:
${eyeResults.map(formatEyeSummary).join('\n') || 'Only one eye result available.'}

RECOMMENDATION:
${reportRecommendation}

EXPLAINABILITY:
${result.explanation.text}

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
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(result, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `NetrAI_${result.case_id}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleDownloadPDF = () => {
    void downloadClinicalReportPdf(result, {
      eyeLabel,
      patientAge,
      diabetesType,
      diabeticDuration,
      heatmapUrl: resolveApiAssetUrl(result.explanation.heatmap_url),
      previewUrl,
    });
  };

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
            className="inline-flex items-center justify-center gap-1.5 px-4 sm:px-6 py-1.5 min-w-0 sm:min-w-[110px] text-xs sm:text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors border border-slate-200 shadow-2xs"
            title="Copy formatted summary to clipboard"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied!' : 'Copy'}</span>
          </button>
          <button
            onClick={handleDownloadPDF}
            className="inline-flex items-center justify-center gap-1.5 px-4 sm:px-6 py-1.5 min-w-0 sm:min-w-[110px] text-xs sm:text-sm font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-lg shadow-xs transition-colors"
            title="Download clinical report as PDF"
          >
            <FileDown className="w-3.5 h-3.5" />
            <span>PDF</span>
          </button>
          <button
            onClick={handleDownloadJSON}
            className="inline-flex items-center justify-center gap-1.5 px-4 sm:px-6 py-1.5 min-w-0 sm:min-w-[110px] text-xs sm:text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors border border-slate-200 shadow-2xs"
            title="Download full JSON dataset"
          >
            <Download className="w-3.5 h-3.5" />
            <span>JSON</span>
          </button>
          <button
            onClick={handlePrint}
            className="inline-flex items-center justify-center gap-1.5 px-4 sm:px-6 py-1.5 min-w-0 sm:min-w-[110px] text-xs sm:text-sm font-bold text-white bg-slate-800 hover:bg-slate-900 rounded-lg shadow-xs transition-all"
            title="Print clinical referral sheet"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 bg-slate-50 p-4 sm:p-5 rounded-xl border border-slate-200">
        <div>
          <span className="text-slate-400 block text-[10px] sm:text-xs uppercase font-bold tracking-wide">Case ID</span>
          <span className="font-mono text-slate-900 font-bold text-xs sm:text-sm mt-0.5 block truncate" title={result.case_id}>
            {result.case_id}
          </span>
        </div>
        <div>
          <span className="text-slate-400 block text-[10px] sm:text-xs uppercase font-bold tracking-wide">Screening Scope</span>
          <span className="font-bold text-teal-800 text-sm sm:text-base mt-0.5 block truncate">
            {eyeLabel}
          </span>
        </div>
        <div>
          <span className="text-slate-400 block text-[10px] sm:text-xs uppercase font-bold tracking-wide">Patient Age</span>
          <span className="font-semibold text-slate-700 text-sm sm:text-base mt-0.5 block truncate">
            {patientAge}
          </span>
        </div>
        <div>
          <span className="text-slate-400 block text-[10px] sm:text-xs uppercase font-bold tracking-wide">Diabetes Profile</span>
          <span className="font-semibold text-slate-800 text-sm sm:text-base mt-0.5 block truncate" title={`${diabetesType} (${diabeticDuration})`}>
            {diabetesType}{diabeticDuration ? ` • ${diabeticDuration}` : ''}
          </span>
        </div>
      </div>

      {(isFinalReport || eyeResults.length > 1) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {eyeResults.map((eyeResult) => (
            <div key={eyeResult.eye} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wide text-slate-500">
                    {eyeResult.eye === 'OD' ? 'OD Right Eye' : 'OS Left Eye'}
                  </span>
                  <div className="mt-1 text-lg font-extrabold text-slate-950">
                    {eyeResult.prediction.icdr_grade !== null && eyeResult.prediction.icdr_grade !== undefined
                      ? `Grade ${eyeResult.prediction.icdr_grade}`
                      : 'No Grade'}{' '}
                    • {eyeResult.prediction.label}
                  </div>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-extrabold ${
                    eyeResult.prediction.referable_dr
                      ? 'bg-rose-100 text-rose-800'
                      : 'bg-emerald-100 text-emerald-800'
                  }`}
                >
                  {eyeResult.prediction.referable_dr ? 'Referable' : 'Routine'}
                </span>
              </div>
              <div className="mt-3 text-sm text-slate-600">
                Confidence {(eyeResult.prediction.confidence * 100).toFixed(1)}% ({eyeResult.prediction.confidence_level || 'unknown'})
              </div>
            </div>
          ))}
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

        <div className="border border-slate-200 rounded-xl p-4 sm:p-5 space-y-3.5 sm:space-y-4">
          <h4 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-700 flex items-start sm:items-center gap-2">
            <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-teal-600 shrink-0 mt-0.5 sm:mt-0" />
            <span>Rural PHC Recommended Action Protocol</span>
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
            <div className="p-3.5 sm:p-4 rounded-xl bg-slate-50 border border-slate-200">
              <span className="font-bold text-slate-900 block mb-1 sm:mb-2 text-sm sm:text-base">1. Triage Priority</span>
              <p className="text-slate-600 text-xs sm:text-sm leading-relaxed sm:leading-6">
                {referable
                  ? 'Urgent Referral to District Ophthalmic Specialist within 2-4 weeks.'
                  : !isGradeable
                  ? 'Immediate Retake required with proper patient fixation.'
                  : 'Annual routine screening recall (12 months).'}
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <span className="font-bold text-slate-900 block mb-1 sm:mb-2 text-sm sm:text-base">2. Primary Care Guidance</span>
              <p className="text-slate-600 text-xs sm:text-sm leading-relaxed sm:leading-6">
                Evaluate HbA1c glycemic control, blood pressure (target &lt;130/80), and serum lipid profile.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <span className="font-bold text-slate-900 block mb-1 sm:mb-2 text-sm sm:text-base">3. Patient Counseling</span>
              <p className="text-slate-600 text-xs sm:text-sm leading-relaxed sm:leading-6">
                Advise immediate medical attention if sudden vision drop, floaters, or dark spots occur.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-4 sm:p-5 text-xs sm:text-sm text-amber-900 flex items-start gap-3">
        <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-amber-700 shrink-0 mt-0.5" />
        <div className="space-y-1 min-w-0 flex-1">
          <span className="font-bold block">Medical Screening Disclaimer:</span>
          <p className="text-xs sm:text-sm leading-relaxed sm:leading-6 text-amber-800">
            {reportDisclaimer} NetrAI is an automated decision-support triage aid for rural primary health centers. It does NOT replace comprehensive dilated fundus examination by a certified ophthalmologist.
          </p>
        </div>
      </div>
    </div>
  );
};

function getEyeResults(result: CaseResult): EyeScreeningResult[] {
  return (['OD', 'OS'] as EyeCode[])
    .map((eye) => result.eyes?.[eye])
    .filter((eyeResult): eyeResult is EyeScreeningResult => Boolean(eyeResult));
}

function formatEyeSummary(eyeResult: EyeScreeningResult): string {
  const eyeLabel = eyeResult.eye === 'OD' ? 'OD Right Eye' : 'OS Left Eye';
  const grade =
    eyeResult.prediction.icdr_grade !== null && eyeResult.prediction.icdr_grade !== undefined
      ? `Grade ${eyeResult.prediction.icdr_grade}`
      : 'No Grade';
  const confidence = (eyeResult.prediction.confidence * 100).toFixed(1);
  const referral = eyeResult.prediction.referable_dr ? 'Referable' : 'Routine';
  return `- ${eyeLabel}: ${grade} (${eyeResult.prediction.label}), ${confidence}% confidence, ${referral}`;
}
