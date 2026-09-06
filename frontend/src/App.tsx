import React, { useState, useEffect } from 'react';
import { Cloud, CloudOff, ShieldAlert, FileText, Eye, RefreshCw } from 'lucide-react';
import { ApiError, getCase, resolveApiAssetUrl } from './api';
import type { CaseResult, EyeCode, EyeScreeningResult, PatientInfo, ScreeningFormErrors } from './types';
import { Header } from './components/Header';
import { PipelineFlow } from './components/PipelineFlow';
import { ImageUploader } from './components/ImageUploader';
import { QualityGateCard } from './components/QualityGateCard';
import { PredictionCard } from './components/PredictionCard';
import { ExplainabilityViewer } from './components/ExplainabilityViewer';
import { ClinicalReportCard } from './components/ClinicalReportCard';
import { ClinicalGuideModal } from './components/ClinicalGuideModal';
import { generateCaseId } from './utils/caseId';
import { getTriageDisplay } from './utils/display';
import { caseIdSchema, validateScreeningInput } from './validation/screening';
import { useOnlineStatus } from './offline/network';
import { syncPendingOfflineCases } from './offline/sync';
import { runScreeningAnalysis } from './screening/screeningEngine';

const DEFAULT_PATIENT_INFO: PatientInfo = {
  eye: 'OD',
  patientAge: '',
  diabetesType: '',
  diabeticDuration: '',
};

export function App() {
  const [initialCaseId] = useState<string | null>(() => {
    const raw = getCaseIdFromUrl();
    if (!raw) return null;
    const parsed = caseIdSchema.safeParse(raw);
    if (!parsed.success) {
      clearCaseIdFromUrl();
      return null;
    }
    return parsed.data;
  });
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
  const [activeViewEye, setActiveViewEye] = useState<EyeCode>('OD');
  const [syncNotice, setSyncNotice] = useState<string | null>(null);
  const isOnline = useOnlineStatus();
  const completedEyes = result?.completed_eyes ?? [];
  const nextEye = result?.next_eye ?? null;
  const isCaseComplete = Boolean(result?.is_case_complete);
  const resultPreviewUrl = result ? getResultPreviewUrl(result) : previewUrl;
  const hasValidationErrors = Object.keys(fieldErrors).length > 0;

  const activeEyeResult: EyeScreeningResult | null =
    result?.eyes?.[activeViewEye] ??
    (result?.patient?.eye === activeViewEye
      ? {
          eye: activeViewEye,
          status: result.status,
          patient: result.patient,
          quality: result.quality,
          prediction: result.prediction,
          explanation: result.explanation,
          report: result.report,
          storage: result.storage,
        }
      : null);

  const activeEyePreviewUrl = result
    ? getResultPreviewUrl(result, activeViewEye) ||
      (result.patient?.eye === activeViewEye ? resultPreviewUrl : null)
    : previewUrl;

  useEffect(() => {
    if (!result || activeEyeResult) {
      return;
    }

    const firstAvailableEye = (['OD', 'OS'] as EyeCode[]).find((eyeCode) =>
      Boolean(result.eyes?.[eyeCode] || result.patient?.eye === eyeCode),
    );

    if (firstAvailableEye) {
      setActiveViewEye(firstAvailableEye);
    }
  }, [activeEyeResult, activeViewEye, result]);

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
      getCase(initialCaseId)
        .then((caseResult) => {
          if (isCancelled) {
            return;
          }

          setResult(caseResult);
          setGeneratedCaseId(caseResult.case_id);
          setActiveCaseId(caseResult.case_id);
          setPatientInfo(createPatientInfoFromResult(caseResult));
          setActiveViewEye((caseResult.patient?.eye as EyeCode) || 'OD');
          setPreviewUrl(null);
          setError(null);
          setFieldErrors({});
          setIsRestoringCase(false);
        })
        .catch((err) => {
          if (isCancelled) {
            return;
          }

          setIsRestoringCase(false);

          if (err instanceof ApiError && err.status === 404) {
            clearCaseIdFromUrl();
            setActiveCaseId(null);
            const freshCaseId = generateCaseId();
            setGeneratedCaseId(freshCaseId);
            setError(`Case ID "${initialCaseId}" was not found on the server. A fresh Case ID (${freshCaseId}) has been generated.`);
            return;
          }

          if (err instanceof ApiError && err.status === 409 && restoreAttempts < 5) {
            restoreAttempts += 1;
            setError('This screening is currently being processed. Retrying in a moment...');
            retryTimer = window.setTimeout(restoreCase, 2500);
            return;
          }

          clearCaseIdFromUrl();
          setActiveCaseId(null);
          const fallbackId = generateCaseId();
          setGeneratedCaseId(fallbackId);
          setError(err instanceof Error ? err.message : 'Could not restore screening case.');
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

  useEffect(() => {
    if (!isOnline) {
      setSyncNotice(null);
      return;
    }

    let isCancelled = false;
    syncPendingOfflineCases()
      .then(({ synced, failed }) => {
        if (isCancelled || (synced === 0 && failed === 0)) {
          return;
        }
        setSyncNotice(
          failed > 0
            ? `${synced} offline case(s) synced, ${failed} still pending.`
            : `${synced} offline case(s) synced to cloud.`,
        );
      })
      .catch(() => {
        if (!isCancelled) {
          setSyncNotice('Offline cases are saved on this device. Sync will retry when the backend is reachable.');
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [isOnline]);

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

      const res = await runScreeningAnalysis({
        file: validation.file,
        patientInfo: validation.patientInfo,
        caseId: validation.caseId,
        existingResult: result,
      });
      setResult(res);
      setGeneratedCaseId(res.case_id);
      setActiveCaseId(res.case_id);
      setCaseIdInUrl(res.case_id);
      setActiveViewEye(validation.patientInfo.eye);
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
        <PipelineFlow
          isLoading={isLoading}
          isRestoring={isRestoringCase}
          result={result}
          activeEye={activeViewEye}
        />

        {(!isOnline || syncNotice || result?.runtime === 'offline') && (
          <div
            className={`no-print border rounded-xl px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 shadow-xs ${
              isOnline ? 'bg-emerald-50 border-emerald-200 text-emerald-950' : 'bg-amber-50 border-amber-200 text-amber-950'
            }`}
          >
            <div className="flex items-start gap-3">
              <div className={`mt-0.5 ${isOnline ? 'text-emerald-700' : 'text-amber-700'}`}>
                {isOnline ? <Cloud className="w-5 h-5" /> : <CloudOff className="w-5 h-5" />}
              </div>
              <div>
                <p className="text-sm font-bold">
                  {isOnline ? 'Online sync available' : 'Offline field mode'}
                </p>
                <p className={`text-xs sm:text-sm mt-0.5 ${isOnline ? 'text-emerald-800' : 'text-amber-800'}`}>
                  {syncNotice ??
                    (isOnline
                      ? 'Cloud API is available. New screenings use Cloud Run unless connectivity drops.'
                      : 'No internet detected. NetrAI will use the local aptos-baseline-v1 model if it is installed on this device.')}
                </p>
              </div>
            </div>
            {result?.sync_status === 'pending' && (
              <span className="inline-flex items-center gap-2 rounded-lg border border-amber-200 bg-white/70 px-3 py-1.5 text-xs font-bold text-amber-800 self-start sm:self-auto">
                <RefreshCw className="w-3.5 h-3.5" />
                Pending Cloud Sync
              </span>
            )}
          </div>
        )}

        {error && (
          <div
            className={`border rounded-xl p-5 flex items-start gap-4 shadow-sm ${
              hasValidationErrors
                ? 'bg-amber-50 border-amber-200 text-amber-950'
                : 'bg-rose-50 border-rose-200 text-rose-900'
            }`}
          >
            <ShieldAlert
              className={`w-6 h-6 shrink-0 mt-0.5 ${hasValidationErrors ? 'text-amber-600' : 'text-rose-600'}`}
            />
            <div className="flex-1">
              <span className="font-bold block text-base">
                {hasValidationErrors ? 'Incomplete Intake Details' : 'Screening Analysis Error'}
              </span>
              <p className={`mt-1 text-sm ${hasValidationErrors ? 'text-amber-800' : 'text-rose-700'}`}>
                {error}
              </p>
              <p className={`mt-2 text-sm ${hasValidationErrors ? 'text-amber-700' : 'text-rose-600'}`}>
                {hasValidationErrors
                  ? 'Your selected fundus image is still kept. Complete the highlighted fields and run analysis again.'
                  : 'Please check backend connectivity or try uploading another fundus image.'}
              </p>
            </div>
            <button
              onClick={() => setError(null)}
              className={`text-sm font-semibold ${
                hasValidationErrors ? 'text-amber-700 hover:text-amber-950' : 'text-rose-600 hover:text-rose-900'
              }`}
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
            requiresRecapture={Boolean(result && !result.quality.is_gradeable && !isCaseComplete)}
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
              {/* Diagnostic Bilateral Eye Switcher Toggle */}
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs no-print">
                <div className="flex items-start sm:items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 text-teal-800 shrink-0 mt-0.5 sm:mt-0">
                    <Eye className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm sm:text-base font-bold text-slate-950">Diagnostic Eye Switcher</span>
                      <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-teal-100 text-teal-900 border border-teal-200 whitespace-nowrap">
                        {activeViewEye === 'OD' ? 'OD (Right Eye)' : 'OS (Left Eye)'} Active
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1 sm:mt-0.5 leading-relaxed">
                      Toggle to inspect individual eye quality, DR grade, and heatmap. Full bilateral details are included on export.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 rounded-xl bg-slate-100 p-1.5 border border-slate-200 shrink-0 w-full sm:w-auto gap-1.5" role="tablist" aria-label="Select Eye View">
                  {(['OD', 'OS'] as EyeCode[]).map((eyeCode) => {
                    const eyeData = result.eyes?.[eyeCode] ?? (result.patient?.eye === eyeCode ? result : null);
                    const hasEyeResult = Boolean(eyeData);
                    const isCompleted = completedEyes.includes(eyeCode);
                    const isRejected = Boolean(eyeData && !eyeData.quality.is_gradeable);
                    const triage = eyeData ? getTriageDisplay(eyeData.prediction) : null;
                    const isReferable = Boolean(eyeData?.quality.is_gradeable && triage?.positive);
                    const isSelected = activeViewEye === eyeCode;
                    const canSelect = hasEyeResult;

                    return (
                      <button
                        key={eyeCode}
                        type="button"
                        role="tab"
                        aria-selected={isSelected}
                        aria-disabled={!canSelect}
                        disabled={!canSelect}
                        onClick={() => {
                          if (canSelect) {
                            setActiveViewEye(eyeCode);
                          }
                        }}
                        className={`w-full sm:w-44 lg:w-48 flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-bold border transition-all ${
                          isSelected
                            ? 'bg-white text-teal-900 shadow-xs border-slate-200/90'
                            : !canSelect
                            ? 'border-transparent text-slate-400 bg-slate-200/50 cursor-not-allowed'
                            : 'border-transparent text-slate-600 hover:text-slate-950 hover:bg-slate-200/50'
                        }`}
                        title={
                          !canSelect
                            ? `${eyeCode === 'OD' ? 'OD Right Eye' : 'OS Left Eye'} has no screening result yet. Upload it from the intake form first.`
                            : eyeCode === 'OD'
                            ? 'View OD Right Eye'
                            : 'View OS Left Eye'
                        }
                      >
                        <span className="whitespace-nowrap">
                          <span className="inline lg:hidden">{eyeCode === 'OD' ? 'OD (Right)' : 'OS (Left)'}</span>
                          <span className="hidden lg:inline">{eyeCode === 'OD' ? 'OD (Right Eye)' : 'OS (Left Eye)'}</span>
                        </span>
                        {hasEyeResult ? (
                          <span
                            className={`px-2 py-0.5 text-[10px] font-extrabold rounded-full whitespace-nowrap shrink-0 ${
                              isRejected
                                ? 'bg-amber-100 text-amber-800'
                                : isReferable
                                ? 'bg-rose-100 text-rose-800'
                                : isCompleted
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-slate-200 text-slate-600'
                            }`}
                          >
                            {isRejected
                              ? 'Recapture'
                              : eyeData?.prediction.icdr_grade !== undefined && eyeData?.prediction.icdr_grade !== null
                              ? `Grade ${eyeData.prediction.icdr_grade}`
                              : 'No Grade'}
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 text-[10px] font-medium text-slate-400 bg-slate-200/70 rounded-full whitespace-nowrap shrink-0">
                            Pending
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {activeEyeResult ? (
                <>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
                    <QualityGateCard quality={activeEyeResult.quality} />
                    <PredictionCard prediction={activeEyeResult.prediction} isGradeable={activeEyeResult.quality.is_gradeable} />
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
                    <ExplainabilityViewer
                      previewUrl={activeEyePreviewUrl}
                      explanation={activeEyeResult.explanation}
                      isGradeable={activeEyeResult.quality.is_gradeable}
                    />
                    <ClinicalReportCard result={result} patientInfo={patientInfo} previewUrl={activeEyePreviewUrl} />
                  </div>
                </>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
                  <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-8 sm:p-10 text-center flex flex-col items-center justify-center space-y-4 shadow-xs">
                    <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center">
                      <Eye className="w-7 h-7" />
                    </div>
                    <div className="space-y-1.5 max-w-sm">
                      <h4 className="text-lg font-bold text-slate-900">
                        {activeViewEye === 'OD' ? 'OD (Right Eye)' : 'OS (Left Eye)'} Not Acquired Yet
                      </h4>
                      <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
                        To complete bilateral screening, select {activeViewEye} in the Patient Intake panel above and upload the fundus photograph.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setPatientInfo((prev) => ({ ...prev, eye: activeViewEye }))}
                      className="px-4 py-2 text-xs font-bold text-teal-800 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded-xl transition-colors shadow-2xs"
                    >
                      Select {activeViewEye} in Intake Form
                    </button>
                  </div>
                  <ClinicalReportCard result={result} patientInfo={patientInfo} previewUrl={resultPreviewUrl} />
                </div>
              )}
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

function getResultPreviewUrl(result: CaseResult, eye?: EyeCode): string | null {
  const targetEye = eye ?? (result.patient?.eye as EyeCode | undefined);
  if (targetEye === 'OD' || targetEye === 'OS') {
    const eyeInputUri = result.eyes?.[targetEye]?.storage?.input_uri;
    if (eyeInputUri && /^(https?:|data:|blob:)/.test(eyeInputUri)) {
      return resolveApiAssetUrl(eyeInputUri);
    }
    return resolveApiAssetUrl(`/cases/${result.case_id}/eyes/${targetEye}/input`);
  }

  if (result.storage?.input_uri && /^(https?:|data:|blob:)/.test(result.storage.input_uri)) {
    return resolveApiAssetUrl(result.storage.input_uri);
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
