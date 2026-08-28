import React, { useState } from 'react';
import {
  FileText,
  Printer,
  Download,
  Copy,
  Check,
  AlertCircle,
  Clock,
  Stethoscope
} from 'lucide-react';
import type { CaseResult, PatientInfo } from '../types';

interface ClinicalReportCardProps {
  result: CaseResult;
  patientInfo: PatientInfo;
}

export const ClinicalReportCard: React.FC<ClinicalReportCardProps> = ({ result, patientInfo }) => {
  const [copied, setCopied] = useState(false);
  const referable = result.prediction.referable_dr;
  const isGradeable = result.quality.is_gradeable;

  const handleCopySummary = () => {
    const text = `
RETINASCAN AI - CLINICAL SCREENING SUMMARY
=========================================
Case ID: ${result.case_id}
Patient ID: ${patientInfo.patientId || 'N/A'}
Eye Examined: ${patientInfo.eye === 'OD' ? 'OD (Right Eye)' : 'OS (Left Eye)'}
PHC Center: ${patientInfo.phcCenter || 'Rural Health Center'}
Date: ${new Date().toLocaleDateString()}

QUALITY GATE: ${result.quality.is_gradeable ? 'PASSED (Gradeable)' : 'REJECTED (Ungradeable)'}
- Focus Score: ${result.quality.focus_score.toFixed(1)}
- Brightness: ${result.quality.brightness.toFixed(2)}

DIAGNOSTIC TRIAGE:
- Referral Decision: ${referable ? 'REFERRAL REQUIRED (Urgent)' : 'NO REFERRAL REQUIRED (Routine)'}
- ICDR DR Grade: ${result.prediction.icdr_grade ?? 'N/A'} (${result.prediction.label})
- Model Confidence: ${(result.prediction.confidence * 100).toFixed(1)}%

RECOMMENDATION:
${result.report.recommendation}

EXPLAINABILITY:
${result.explanation.text}

DISCLAIMER:
${result.report.disclaimer}
    `.trim();

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadJSON = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify({ ...result, patientInfo }, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `RetinaScan_${result.case_id}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 lg:p-7 shadow-sm space-y-6 print-card">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between border-b border-slate-100 pb-5">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-teal-50 text-teal-800">
            <FileText className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-2xl font-bold text-slate-950">Clinical Screening Report</h3>
            <p className="text-base text-slate-600 mt-1">
              Primary Health Center (PHC) Ophthalmic Referral Document
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 no-print">
          <button
            onClick={handleCopySummary}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
            title="Copy formatted summary to clipboard"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
            <span>{copied ? 'Copied!' : 'Copy'}</span>
          </button>
          <button
            onClick={handleDownloadJSON}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
            title="Download full JSON dataset"
          >
            <Download className="w-4 h-4" />
            <span>JSON</span>
          </button>
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-white bg-slate-800 hover:bg-slate-900 rounded-xl shadow-sm transition-all"
            title="Print clinical referral sheet"
          >
            <Printer className="w-4 h-4" />
            <span>Print Report</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 bg-slate-50 p-5 rounded-xl border border-slate-200">
        <div>
          <span className="text-slate-400 block text-xs uppercase font-bold tracking-wide">Patient Identifier</span>
          <span className="font-mono font-bold text-slate-900 text-base mt-1 block">
            {patientInfo.patientId || 'PHC-ANONYMOUS'}
          </span>
        </div>
        <div>
          <span className="text-slate-400 block text-xs uppercase font-bold tracking-wide">Examined Eye</span>
          <span className="font-bold text-teal-800 text-base mt-1 block">
            {patientInfo.eye === 'OD' ? 'OD (Right Eye)' : 'OS (Left Eye)'}
          </span>
        </div>
        <div>
          <span className="text-slate-400 block text-xs uppercase font-bold tracking-wide">PHC Center / Node</span>
          <span className="font-semibold text-slate-700 text-base mt-1 block">
            {patientInfo.phcCenter || 'Rural Health Subcenter'}
          </span>
        </div>
        <div>
          <span className="text-slate-400 block text-xs uppercase font-bold tracking-wide">Case Reference</span>
          <span className="font-mono text-slate-600 text-sm mt-1 block break-all">{result.case_id}</span>
        </div>
      </div>

      <div className="space-y-4">
        <div
          className={`p-5 rounded-xl border ${
            !isGradeable
              ? 'bg-amber-50 border-amber-200 text-amber-950'
              : referable
              ? 'bg-rose-50 border-rose-200 text-rose-950'
              : 'bg-emerald-50 border-emerald-200 text-emerald-950'
          }`}
        >
          <div className="flex items-start gap-3">
            <Stethoscope className="w-6 h-6 shrink-0 mt-0.5" />
            <div className="space-y-2">
              <h4 className="text-xl font-bold leading-7">{result.report.summary}</h4>
              <p className="text-base leading-7">{result.report.recommendation}</p>
            </div>
          </div>
        </div>

        <div className="border border-slate-200 rounded-xl p-5 space-y-4">
          <h4 className="text-base font-bold uppercase tracking-wide text-slate-700 flex items-center gap-2">
            <Clock className="w-5 h-5 text-teal-600" />
            Rural PHC Recommended Action Protocol
          </h4>

          <div className="grid md:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <span className="font-bold text-slate-900 block mb-2 text-base">1. Triage Priority</span>
              <p className="text-slate-600 text-sm leading-6">
                {referable
                  ? 'Urgent Referral to District Ophthalmic Specialist within 2-4 weeks.'
                  : !isGradeable
                  ? 'Immediate Retake required with proper patient fixation.'
                  : 'Annual routine screening recall (12 months).'}
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <span className="font-bold text-slate-900 block mb-2 text-base">2. Primary Care Guidance</span>
              <p className="text-slate-600 text-sm leading-6">
                Evaluate HbA1c glycemic control, blood pressure (target &lt;130/80), and serum lipid profile.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <span className="font-bold text-slate-900 block mb-2 text-base">3. Patient Counseling</span>
              <p className="text-slate-600 text-sm leading-6">
                Advise immediate medical attention if sudden vision drop, floaters, or dark spots occur.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-5 text-base text-amber-900 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-amber-700 shrink-0 mt-1" />
        <div className="space-y-1">
          <span className="font-bold">Medical Screening Disclaimer:</span>
          <p className="text-sm leading-6 text-amber-800">
            {result.report.disclaimer} RetinaScan AI is an automated decision-support triage aid for rural primary health centers. It does NOT replace comprehensive dilated fundus examination by a certified ophthalmologist.
          </p>
        </div>
      </div>
    </div>
  );
};
