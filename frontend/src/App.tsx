import React, { useState, useEffect } from 'react';
import { Eye, ShieldAlert, Sparkles, FileText } from 'lucide-react';
import { getHealth, predictImage } from './api';
import type { CaseResult, HealthResponse, PatientInfo } from './types';
import { Header } from './components/Header';
import { PipelineFlow } from './components/PipelineFlow';
import { ImageUploader } from './components/ImageUploader';
import { QualityGateCard } from './components/QualityGateCard';
import { PredictionCard } from './components/PredictionCard';
import { ExplainabilityViewer } from './components/ExplainabilityViewer';
import { ClinicalReportCard } from './components/ClinicalReportCard';
import { ClinicalGuideModal } from './components/ClinicalGuideModal';

export function App() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [result, setResult] = useState<CaseResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Patient metadata
  const [patientInfo, setPatientInfo] = useState<PatientInfo>({
    patientId: 'PHC-WB-0412',
    phcCenter: 'PHC-BISHNUPUR-01',
    eye: 'OD',
    patientAge: '54y (Type 2 DM, 8 yrs)',
    diabeticDuration: '8 yrs',
  });

  // Modals
  const [isGuideOpen, setIsGuideOpen] = useState(false);

  // Health poll on load and every 20 seconds
  useEffect(() => {
    const checkHealth = () => {
      getHealth()
        .then(setHealth)
        .catch(() => setHealth(null));
    };

    checkHealth();
    const interval = setInterval(checkHealth, 20000);
    return () => clearInterval(interval);
  }, []);

  // Update object URL when file changes
  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const handleAnalyze = async () => {
    if (!file) return;
    setIsLoading(true);
    setError(null);

    try {
      const res = await predictImage(file);
      setResult(res);
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
  };

  return (
    <div className="min-h-screen bg-[#f5f8fb] flex flex-col font-sans text-slate-950">
      <Header
        health={health}
        onOpenGuide={() => setIsGuideOpen(true)}
      />

      <main className="flex-1 w-full max-w-[1760px] mx-auto px-6 lg:px-10 py-8 space-y-8">
        <PipelineFlow isLoading={isLoading} result={result} />

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

        {/* 1. Patient Intake & Retinal Scan Acquisition Section */}
        <section className="no-print">
          <ImageUploader
            file={file}
            previewUrl={previewUrl}
            patientInfo={patientInfo}
            isLoading={isLoading}
            onFileChange={(f) => {
              setFile(f);
              setResult(null);
              setError(null);
            }}
            onPatientInfoChange={setPatientInfo}
            onAnalyze={handleAnalyze}
            onReset={handleReset}
          />
        </section>

        {/* 2. Screening Report Section Below */}
        <section className="space-y-6">
          {result ? (
            <div className="space-y-6">
              {/* Row 1: Quality Gate & Prediction / Triage */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                <QualityGateCard quality={result.quality} />
                <PredictionCard
                  prediction={result.prediction}
                  isGradeable={result.quality.is_gradeable}
                />
              </div>

              {/* Row 2: Explainability Heatmap & Official Clinical Referral Report */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                <ExplainabilityViewer
                  previewUrl={previewUrl}
                  explanation={result.explanation}
                  isGradeable={result.quality.is_gradeable}
                  icdrGrade={result.prediction.icdr_grade}
                />
                <ClinicalReportCard result={result} patientInfo={patientInfo} />
              </div>
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-3xl p-8 sm:p-12 lg:p-16 shadow-sm flex flex-col items-center justify-center text-center min-h-[480px] space-y-9 w-full">
              <div className="relative">
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-teal-50 text-teal-600 flex items-center justify-center shadow-inner">
                  <FileText className="w-10 h-10 sm:w-12 sm:h-12" />
                </div>
                <div className="absolute -bottom-1.5 -right-1.5 p-2 bg-teal-600 text-white rounded-full shadow-md">
                  <Sparkles className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
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

              {/* 4 Full-Width Deliverable Cards with Generous Spacing */}
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

      {/* Footer */}
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

      {/* Clinical Reference Modal */}
      <ClinicalGuideModal
        isOpen={isGuideOpen}
        onClose={() => setIsGuideOpen(false)}
      />
    </div>
  );
}

export default App;
