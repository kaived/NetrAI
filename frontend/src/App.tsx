import React, { useState, useEffect } from 'react';
import { ShieldAlert, FileText } from 'lucide-react';
import { ApiError, getCase, predictImage, resolveApiAssetUrl } from './api';
import type { CaseResult, PatientInfo, ScreeningFormErrors } from './types';
import { Header } from './components/Header';
import { PipelineFlow } from './components/PipelineFlow';
import { ImageUploader } from './components/ImageUploader';
import { QualityGateCard } from './components/QualityGateCard';
import { PredictionCard } from './components/PredictionCard';
import { ExplainabilityViewer } from './components/ExplainabilityViewer';
import { ClinicalReportCard } from './components/ClinicalReportCard';
import { EyeProgressCard } from './components/EyeProgressCard';
import { ClinicalGuideModal } from './components/ClinicalGuideModal';
import { generateCaseId } from './utils/caseId';
import { validateScreeningInput } from './validation/screening';

const DEFAULT_PATIENT_INFO: PatientInfo = {
  eye: 'OD',
  patientAge: '',
  diabetesType: '',
  diabeticDuration: '',
};

export function App() {
  const [initialCaseId] = useState<string | null>(() => getCaseIdFromUrl());
  const [activeCaseId, setActiveCaseId] = useState<string | null>(() => initialCaseId);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [result, setResult] = useState<CaseResult | null>(null);
  const [generatedCaseId, setGeneratedCaseId] = useState<string>(() => initialCaseId || generateCaseId());
  const [isLoading, setIsLoading] = useState(false);
  const [isRestoringCase, setIsRestoringCase] = useState(() => Boolean(initialCaseId));
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<ScreeningFormErrors>({});
  const [patientInfo, setPatientInfo] = useState<PatientInfo>(() => createFreshPatientInfo());
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const completedEyes = result?.completed_eyes ?? [];
  const nextEye = result?.next_eye ?? null;
  const isCaseComplete = Boolean(result?.is_case_complete);
  const resultPreviewUrl = result ? getResultPreviewUrl(result) : previewUrl;

  useEffect(() => {
    if (!file) {
      return;
    }

    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  useEffect(() => {
    if (!initialCaseId) {
      return;
    }

    let isCancelled = false;
    let retryTimer: number | undefined;
    let restoreAttempts = 0;
    setIsRestoringCase(true);

    const restoreCase = () => {
      restoreAttempts += 1;

      getCase(initialCaseId)
        .then((caseResult) => {
          if (isCancelled) {
            return;
          }

          setResult(caseResult);
          setGeneratedCaseId(caseResult.case_id);
          setPatientInfo(createPatientInfoFromResult(caseResult));
          setPreviewUrl(null);
          setError(null);
          setFieldErrors({});
          setIsRestoringCase(false);
        })
        .catch((err) => {
          if (isCancelled) {
            return;
          }

          setGeneratedCaseId(initialCaseId);
          if (err instanceof ApiError && [404, 409].includes(err.status) && restoreAttempts < 20) {
            setError('This screening is still processing. The report will restore automatically when it is ready.');
            retryTimer = window.setTimeout(restoreCase, 3000);
            return;
          }

          setError(err instanceof Error ? err.message : 'Could not restore screening case.');
          setIsRestoringCase(false);
        });
    };

    restoreCase();

    return () => {
      isCancelled = true;
      if (retryTimer) {
        window.clearTimeout(retryTimer);
      }
    };
  }, [initialCaseId]);

  const handleAnalyze = async () => {
    if (completedEyes.includes(patientInfo.eye)) {
      setFieldErrors({ eye: `${patientInfo.eye} is already completed for this case.` });
      setError('Select the pending eye or start a new screening.');
      return;
    }

    const validation = validateScreeningInput(patientInfo, file, generatedCaseId);
    if (!validation.success) {
      setFieldErrors(validation.errors);
      setError('Please fix the highlighted intake fields before running screening.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setFieldErrors({});

    try {
      setPatientInfo(validation.patientInfo);
      setGeneratedCaseId(validation.caseId);
      setActiveCaseId(validation.caseId);
      setCaseIdInUrl(validation.caseId);

      const res = await predictImage(validation.file, validation.patientInfo, validation.caseId);
      setResult(res);
      setGeneratedCaseId(res.case_id);
      setActiveCaseId(res.case_id);
      setCaseIdInUrl(res.case_id);
      setFile(null);
      setPreviewUrl(null);
      setPatientInfo({
        ...validation.patientInfo,
        eye: res.next_eye ?? validation.patientInfo.eye,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Prediction failed.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setPreviewUrl(null);
    setResult(null);
    setError(null);
    setFieldErrors({});
    setGeneratedCaseId(generateCaseId());
    setPatientInfo(createFreshPatientInfo());
    setActiveCaseId(null);
    clearCaseIdFromUrl();
  };

  return (
    <div className="min-h-screen bg-[#f5f8fb] flex flex-col font-sans text-slate-950">
      <Header onOpenGuide={() => setIsGuideOpen(true)} />

      <main className="flex-1 w-full max-w-[1760px] mx-auto px-6 lg:px-10 py-8 space-y-8">
        <PipelineFlow isLoading={isLoading || isRestoringCase} result={result} />

        {error && (
          <div className="bg-rose-50 border border-rose-200 rounded-xl p-5 flex items-start gap-4 text-rose-900 shadow-sm">
            <ShieldAlert className="w-6 h-6 text-rose-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <span className="font-bold block text-base">Screening Analysis Error</span>
              <p className="mt-1 text-sm text-rose-700">{error}</p>
              <p className="mt-2 text-sm text-rose-600">
                Please check backend connectivity or try uploading another fundus image.
              </p>
            </div>
            <button
              onClick={() => setError(null)}
              className="text-rose-600 hover:text-rose-900 text-sm font-semibold"
            >
              Dismiss
            </button>
          </div>
        )}

        <section className="no-print">
          <ImageUploader
            file={file}
            previewUrl={previewUrl}
            patientInfo={patientInfo}
            isLoading={isLoading || isRestoringCase}
            hasResult={Boolean(result || activeCaseId)}
            caseId={result?.case_id ?? generatedCaseId}
            validationErrors={fieldErrors}
            completedEyes={completedEyes}
            nextEye={nextEye}
            isCaseComplete={isCaseComplete}
            onFileChange={(f) => {
              setFile(f);
              if (!f) {
                setPreviewUrl(null);
              }
              setError(null);
              setFieldErrors({});
              if (!activeCaseId) {
                setResult(null);
                setGeneratedCaseId(generateCaseId());
                clearCaseIdFromUrl();
              }
            }}
            onPatientInfoChange={(next) => {
              setPatientInfo(next);
              setFieldErrors({});
              setError(null);
            }}
            onAnalyze={handleAnalyze}
            onReset={handleReset}
          />
        </section>

        <section className="space-y-6">
          {result ? (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
                <QualityGateCard quality={result.quality} />
                <PredictionCard prediction={result.prediction} isGradeable={result.quality.is_gradeable} />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
                <ExplainabilityViewer
                  previewUrl={resultPreviewUrl}
                  explanation={result.explanation}
                  isGradeable={result.quality.is_gradeable}
                />
                {result.is_case_complete ? (
                  <ClinicalReportCard result={result} patientInfo={patientInfo} previewUrl={resultPreviewUrl} />
                ) : (
                  <EyeProgressCard result={result} />
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-3xl p-8 sm:p-12 lg:p-16 shadow-sm flex flex-col items-center justify-center text-center min-h-[480px] space-y-9 w-full">
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-teal-50 text-teal-600 flex items-center justify-center shadow-inner">
                <FileText className="w-10 h-10 sm:w-12 sm:h-12" />
              </div>

              <div className="max-w-3xl space-y-3">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 text-xs sm:text-sm font-bold uppercase tracking-wider bg-teal-50 text-teal-700 border border-teal-200 rounded-full">
                  Diagnostic Report Console
                </div>
                <h3 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-900 tracking-tight">
                  Clinical Screening Report & Triage
                </h3>
                <p className="text-sm sm:text-base lg:text-lg text-slate-600 leading-relaxed max-w-2xl mx-auto">
                  Upload a real fundus image to generate the automated quality gate score, ICDR severity classification, explainable attention heatmap, and PHC referral guidance.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 lg:gap-6 w-full text-left">
                <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200/90 space-y-2.5 hover:bg-slate-100/70 transition-all shadow-xs">
                  <div className="font-bold text-teal-900 flex items-center gap-2.5 text-base">
                    <span className="w-7 h-7 rounded-full bg-teal-100 text-teal-800 flex items-center justify-center text-xs font-extrabold">1</span>
                    Quality Gate
                  </div>
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                    Assesses focus sharpness, illumination, and artifact clearance.
                  </p>
                </div>

                <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200/90 space-y-2.5 hover:bg-slate-100/70 transition-all shadow-xs">
                  <div className="font-bold text-teal-900 flex items-center gap-2.5 text-base">
                    <span className="w-7 h-7 rounded-full bg-teal-100 text-teal-800 flex items-center justify-center text-xs font-extrabold">2</span>
                    ICDR DR Grade
                  </div>
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                    5-stage classification (0 to 4) with statistical confidence.
                  </p>
                </div>

                <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200/90 space-y-2.5 hover:bg-slate-100/70 transition-all shadow-xs">
                  <div className="font-bold text-teal-900 flex items-center gap-2.5 text-base">
                    <span className="w-7 h-7 rounded-full bg-teal-100 text-teal-800 flex items-center justify-center text-xs font-extrabold">3</span>
                    Explainable AI
                  </div>
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                    Grad-CAM activation heatmap overlay with opacity controls.
                  </p>
                </div>

                <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200/90 space-y-2.5 hover:bg-slate-100/70 transition-all shadow-xs">
                  <div className="font-bold text-teal-900 flex items-center gap-2.5 text-base">
                    <span className="w-7 h-7 rounded-full bg-teal-100 text-teal-800 flex items-center justify-center text-xs font-extrabold">4</span>
                    Referral Protocol
                  </div>
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                    Actionable PHC triage recommendations & printable sheet.
                  </p>
                </div>
              </div>
            </div>
          )}
        </section>
      </main>

      <footer className="mt-auto border-t border-slate-200 bg-white py-4 sm:py-5 no-print">
        <div className="max-w-[1760px] mx-auto px-4 sm:px-6 lg:px-10 flex flex-col sm:flex-row items-center justify-between gap-2 sm:gap-4">
          <p className="text-xs sm:text-sm text-slate-600 text-center sm:text-left">
            <span className="font-semibold text-slate-800">NetrAI</span>
            <span className="mx-2 text-slate-300">•</span>
            <span>Rural Primary Health Center DR Screening & Triage</span>
          </p>
          <p className="text-xs sm:text-sm text-slate-400 text-center sm:text-right">
            For medical screening support only • Requires certified ophthalmologist review
          </p>
        </div>
      </footer>

      <ClinicalGuideModal isOpen={isGuideOpen} onClose={() => setIsGuideOpen(false)} />
    </div>
  );
}

export default App;

function createFreshPatientInfo(): PatientInfo {
  return { ...DEFAULT_PATIENT_INFO };
}

function createPatientInfoFromResult(result: CaseResult): PatientInfo {
  return {
    ...DEFAULT_PATIENT_INFO,
    eye: result.next_eye ?? (result.patient?.eye === 'OS' ? 'OS' : 'OD'),
    patientAge: result.patient?.patient_age || '',
    diabetesType: result.patient?.diabetes_type || '',
    diabeticDuration: result.patient?.diabetic_duration || '',
  };
}

function getResultPreviewUrl(result: CaseResult): string | null {
  const eye = result.patient?.eye;
  if (eye === 'OD' || eye === 'OS') {
    return resolveApiAssetUrl(`/cases/${result.case_id}/eyes/${eye}/input`);
  }

  return resolveApiAssetUrl(`/cases/${result.case_id}/input`);
}

function getCaseIdFromUrl(): string | null {
  const caseId = new URLSearchParams(window.location.search).get('case_id')?.trim();
  return caseId || null;
}

function setCaseIdInUrl(caseId: string) {
  const url = new URL(window.location.href);
  url.searchParams.set('case_id', caseId);
  window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
}

function clearCaseIdFromUrl() {
  const url = new URL(window.location.href);
  url.searchParams.delete('case_id');
  window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
}
