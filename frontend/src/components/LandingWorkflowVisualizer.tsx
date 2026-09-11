import React, { useState, useEffect } from 'react';
import {
  User,
  ShieldCheck,
  Cpu,
  FileText,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  Pause,
  Play,
  Eye,
  Activity,
  FileDown,
  Printer
} from 'lucide-react';

const STEPS = [
  {
    id: 1,
    title: 'Intake & Eye Selection',
    shortTitle: '1. Intake',
    tagline: 'Patient demographic intake and bilateral eye designation (OD / OS).',
    icon: User,
  },
  {
    id: 2,
    title: 'Quality Gate Validation',
    shortTitle: '2. Quality',
    tagline: 'Automated pre-screening check for blur, illumination, and fundus field.',
    icon: ShieldCheck,
  },
  {
    id: 3,
    title: 'Analysis & Heatmap',
    shortTitle: '3. Analysis',
    tagline: 'ICDR grading (0-4) with a separate image-based attention map.',
    icon: Cpu,
  },
  {
    id: 4,
    title: 'Clinical Triage Report',
    shortTitle: '4. Referral',
    tagline: 'Consolidated bilateral referral document with actionable PHC protocols.',
    icon: FileText,
  },
];

const STEP_DURATION_MS = 4500;

export const LandingWorkflowVisualizer: React.FC = () => {
  const [activeStep, setActiveStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [progress, setProgress] = useState(0);

  // Smooth interval timer to advance progress
  useEffect(() => {
    if (!isPlaying) {
      return;
    }

    const intervalStep = 50;
    const stepIncrement = (intervalStep / STEP_DURATION_MS) * 100;

    const timer = window.setInterval(() => {
      setProgress((prev) => {
        if (prev + stepIncrement >= 100) {
          return 100;
        }
        return prev + stepIncrement;
      });
    }, intervalStep);

    return () => {
      window.clearInterval(timer);
    };
  }, [isPlaying, activeStep]);

  // Advance to next step once progress reaches 100%
  useEffect(() => {
    if (progress >= 100) {
      setActiveStep((curr) => (curr + 1) % STEPS.length);
      setProgress(0);
    }
  }, [progress]);

  const handleSelectStep = (index: number) => {
    setActiveStep(index);
    setProgress(0);
  };

  const handleTogglePlay = () => {
    setIsPlaying((prev) => !prev);
  };

  const handlePrev = () => {
    setActiveStep((curr) => (curr === 0 ? STEPS.length - 1 : curr - 1));
    setProgress(0);
  };

  const handleNext = () => {
    setActiveStep((curr) => (curr + 1) % STEPS.length);
    setProgress(0);
  };

  return (
    <div className="relative w-full rounded-2xl sm:rounded-3xl border border-slate-200 bg-white p-3.5 sm:p-5 lg:p-6 transition-all flex flex-col justify-between">
      {/* Top Bar: Pipeline Stage Tabs & Controls */}
      <div className="space-y-2 sm:space-y-2.5 border-b border-slate-100 pb-1.5 sm:pb-2">
        <div className="flex items-center justify-between gap-1.5 sm:gap-2">
          <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
            <span className="h-2 w-2 rounded-full bg-teal-600 shrink-0" />
            <span className="text-[10px] sm:text-xs font-extrabold uppercase tracking-wider text-slate-600 truncate">
              How It Works · Process Visualizer
            </span>
          </div>

          <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
            <button
              type="button"
              onClick={handleTogglePlay}
              className={`flex h-6 w-6 sm:h-8 sm:w-8 items-center justify-center rounded-lg border transition-all cursor-pointer shadow-2xs active:scale-95 ${
                isPlaying
                  ? 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  : 'border-teal-300 bg-teal-50 text-teal-700 hover:bg-teal-100 hover:text-teal-900'
              }`}
              title={isPlaying ? 'Pause auto-play' : 'Resume auto-play'}
              aria-label={isPlaying ? 'Pause auto-play' : 'Resume auto-play'}
            >
              {isPlaying ? (
                <Pause className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
              ) : (
                <Play className="h-3 w-3 sm:h-3.5 sm:w-3.5 fill-current" />
              )}
            </button>
            <button
              type="button"
              onClick={handlePrev}
              className="flex h-6 w-6 sm:h-8 sm:w-8 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900 active:scale-95 transition-all cursor-pointer shadow-2xs"
              title="Previous step"
              aria-label="Previous step"
            >
              <ChevronLeft className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
            </button>
            <button
              type="button"
              onClick={handleNext}
              className="flex h-6 w-6 sm:h-8 sm:w-8 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900 active:scale-95 transition-all cursor-pointer shadow-2xs"
              title="Next step"
              aria-label="Next step"
            >
              <ChevronRight className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
            </button>
          </div>
        </div>

        {/* Step Tabs */}
        <div className="grid grid-cols-4 gap-1 sm:gap-1.5">
          {STEPS.map((step, idx) => {
            const isActive = activeStep === idx;
            const Icon = step.icon;
            return (
              <button
                key={step.id}
                type="button"
                onClick={() => handleSelectStep(idx)}
                className={`group relative flex flex-col items-center justify-center rounded-lg sm:rounded-xl px-1 py-1.5 sm:px-3 sm:py-2 text-center transition-all cursor-pointer ${
                  isActive
                    ? 'bg-teal-50 text-teal-900 font-extrabold border border-teal-200 shadow-2xs'
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                }`}
              >
                <div className="flex items-center justify-center gap-0.5 sm:gap-1.5 min-w-0 w-full">
                  <Icon className={`h-3 w-3 sm:h-4 sm:w-4 shrink-0 ${isActive ? 'text-teal-700' : 'text-slate-400 group-hover:text-slate-600'}`} />
                  <span className="text-[9.5px] xs:text-[10px] sm:text-xs lg:text-sm truncate leading-tight">{step.shortTitle}</span>
                </div>
                {isActive && (
                  <div className="absolute bottom-0 inset-x-1 sm:inset-x-2 h-0.5 sm:h-1 rounded-full bg-teal-200 overflow-hidden">
                    <div
                      className="h-full bg-teal-700 transition-all duration-75 ease-linear"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Visual Display Area */}
      <div className="py-2.5 sm:py-3.5 min-h-[195px] sm:min-h-[235px] lg:min-h-[255px] flex flex-col justify-center">
        {activeStep === 0 && <StepIntakeVisual />}
        {activeStep === 1 && <StepQualityVisual />}
        {activeStep === 2 && <StepInferenceVisual />}
        {activeStep === 3 && <StepReportVisual />}
      </div>

      {/* Bottom Step Description & Dots */}
      <div className="border-t border-slate-100 pt-2.5 sm:pt-3 flex items-center justify-between gap-2.5">
        <div className="space-y-0.5 min-w-0 flex-1">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <span className="text-xs sm:text-sm lg:text-base font-extrabold text-slate-900">
              {STEPS[activeStep].title}
            </span>
            <span className="rounded-full bg-teal-100 px-1.5 sm:px-2 py-0.5 text-[9.5px] sm:text-[11px] font-extrabold text-teal-800 whitespace-nowrap shrink-0">
              Step {activeStep + 1} of 4
            </span>
          </div>
          <p className="text-[10px] sm:text-xs lg:text-sm text-slate-600 leading-tight line-clamp-2">
            {STEPS[activeStep].tagline}
          </p>
        </div>

        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
          {STEPS.map((_, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleSelectStep(idx)}
              aria-label={`Jump to step ${idx + 1}`}
              className={`h-1.5 sm:h-2 rounded-full transition-all cursor-pointer ${
                activeStep === idx ? 'w-4 sm:w-6 bg-teal-700' : 'w-1.5 sm:w-2 bg-slate-200 hover:bg-slate-300'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

/* -------------------------------------------------------------
   Step 1: Intake Visual (Patient Card & Bilateral Switcher)
------------------------------------------------------------- */
const StepIntakeVisual: React.FC = () => {
  return (
    <div className="space-y-2 sm:space-y-3">
      {/* Patient Demographic Bar */}
      <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50/80 px-2.5 py-2 sm:px-4 sm:py-3 gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex h-6 w-6 sm:h-8 sm:w-8 items-center justify-center rounded-lg bg-teal-100 text-teal-800 font-extrabold text-[10px] sm:text-xs shrink-0 shadow-2xs">
            PT
          </div>
          <div className="min-w-0">
            <span className="font-extrabold text-slate-900 text-xs sm:text-sm block truncate">Patient #5802</span>
            <span className="text-slate-500 text-[10px] sm:text-xs block truncate">Age 58 · Type 2 Diabetes (10 yrs)</span>
          </div>
        </div>
        <span className="rounded-md bg-emerald-100 px-2 py-0.5 sm:px-2.5 sm:py-1 text-[9px] sm:text-xs font-extrabold text-emerald-800 shrink-0">
          Intake Active
        </span>
      </div>

      {/* Bilateral Eye Switcher Simulation */}
      <div className="grid grid-cols-2 gap-1.5 sm:gap-3">
        <div className="rounded-xl border-2 border-teal-700 bg-teal-50/50 p-2 sm:p-3 text-center shadow-xs">
          <div className="flex items-center justify-center gap-1 sm:gap-1.5 text-teal-900 font-extrabold text-[11px] sm:text-sm">
            <CheckCircle2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-teal-700 shrink-0" />
            <span>OD Right Eye</span>
          </div>
          <p className="mt-0.5 text-[9.5px] sm:text-xs text-teal-700 font-semibold">Fundus Ready ✓</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-2 sm:p-3 text-center hover:border-slate-300 transition-colors shadow-2xs">
          <div className="flex items-center justify-center gap-1 sm:gap-1.5 text-slate-600 font-bold text-[11px] sm:text-sm">
            <Eye className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-slate-400 shrink-0" />
            <span>OS Left Eye</span>
          </div>
          <p className="mt-0.5 text-[9.5px] sm:text-xs text-slate-500">Scheduled</p>
        </div>
      </div>

      {/* Camera Capture Target Visualizer */}
      <div className="relative rounded-xl overflow-hidden border border-teal-200/90 bg-teal-50/50 p-2 sm:p-3 flex items-center justify-between text-slate-900 shadow-2xs gap-2">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <div className="h-8 w-8 sm:h-11 sm:w-11 rounded-lg sm:rounded-xl bg-white border border-teal-200 flex items-center justify-center text-teal-700 shrink-0 shadow-xs">
            <RetinaEyeSvg className="h-5 w-5 sm:h-7 sm:w-7" />
          </div>
          <div className="min-w-0">
            <span className="text-[11px] sm:text-sm font-extrabold text-slate-900 block truncate">50° Non-Mydriatic Field</span>
            <span className="text-[9.5px] sm:text-xs text-teal-700 font-semibold block truncate">Macula & Optic Disc Centered</span>
          </div>
        </div>
        <span className="rounded-full bg-white px-2 py-0.5 sm:px-2.5 sm:py-1 text-[9.5px] sm:text-xs font-mono font-bold text-teal-800 border border-teal-200 shadow-2xs shrink-0">
          RAW 1080p
        </span>
      </div>
    </div>
  );
};

/* -------------------------------------------------------------
   Step 2: Quality Gate Visual (4 Gauge Cards with Badges)
------------------------------------------------------------- */
const StepQualityVisual: React.FC = () => {
  return (
    <div className="space-y-2 sm:space-y-3">
      <div className="flex items-center justify-between gap-2 px-0.5 min-w-0">
        <span className="text-[11px] sm:text-sm font-extrabold uppercase tracking-wide text-slate-700 truncate min-w-0">
          Quality Gate Pre-Check
        </span>
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] sm:text-xs font-extrabold text-emerald-800 shadow-2xs shrink-0 whitespace-nowrap leading-none">
          <CheckCircle2 className="h-3 w-3 sm:h-3.5 sm:w-3.5 shrink-0" />
          <span className="whitespace-nowrap">Gradeable Image</span>
        </span>
      </div>

      <div className="grid grid-cols-2 gap-1.5 sm:gap-2.5">
        {/* Metric 1: Focus */}
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-2 sm:p-3">
          <div className="flex items-center justify-between text-[11px] sm:text-sm">
            <span className="font-semibold text-slate-700">Focus</span>
            <span className="font-extrabold text-slate-950 font-mono text-xs sm:text-base">1.0</span>
          </div>
          <div className="mt-1 sm:mt-1.5 h-1 sm:h-1.5 w-full rounded-full bg-slate-200 overflow-hidden">
            <div className="h-full bg-emerald-500 rounded-full w-[85%]" />
          </div>
          <div className="mt-0.5 sm:mt-1 flex justify-between text-[9px] sm:text-xs text-slate-500">
            <span>Sharpness</span>
            <span className="text-emerald-700 font-extrabold">Passed ✓</span>
          </div>
        </div>

        {/* Metric 2: Brightness */}
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-2 sm:p-3">
          <div className="flex items-center justify-between text-[11px] sm:text-sm">
            <span className="font-semibold text-slate-700">Brightness</span>
            <span className="font-extrabold text-slate-950 font-mono text-xs sm:text-base">0.18</span>
          </div>
          <div className="mt-1 sm:mt-1.5 h-1 sm:h-1.5 w-full rounded-full bg-slate-200 overflow-hidden">
            <div className="h-full bg-emerald-500 rounded-full w-[65%]" />
          </div>
          <div className="mt-0.5 sm:mt-1 flex justify-between text-[9px] sm:text-xs text-slate-500">
            <span>Illumination</span>
            <span className="text-emerald-700 font-extrabold">Passed ✓</span>
          </div>
        </div>

        {/* Metric 3: Contrast */}
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-2 sm:p-3">
          <div className="flex items-center justify-between text-[11px] sm:text-sm">
            <span className="font-semibold text-slate-700">Contrast</span>
            <span className="font-extrabold text-slate-950 font-mono text-xs sm:text-base">0.07</span>
          </div>
          <div className="mt-1 sm:mt-1.5 h-1 sm:h-1.5 w-full rounded-full bg-slate-200 overflow-hidden">
            <div className="h-full bg-emerald-500 rounded-full w-[70%]" />
          </div>
          <div className="mt-0.5 sm:mt-1 flex justify-between text-[9px] sm:text-xs text-slate-500">
            <span>Vessels</span>
            <span className="text-emerald-700 font-extrabold">Passed ✓</span>
          </div>
        </div>

        {/* Metric 4: Compatibility */}
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-2 sm:p-3">
          <div className="flex items-center justify-between text-[11px] sm:text-sm">
            <span className="font-semibold text-slate-700">Field</span>
            <span className="font-extrabold text-slate-950 font-mono text-xs sm:text-base">100%</span>
          </div>
          <div className="mt-1 sm:mt-1.5 h-1 sm:h-1.5 w-full rounded-full bg-slate-200 overflow-hidden">
            <div className="h-full bg-emerald-500 rounded-full w-full" />
          </div>
          <div className="mt-0.5 sm:mt-1 flex justify-between text-[9px] sm:text-xs text-slate-500">
            <span>Standard</span>
            <span className="text-emerald-700 font-extrabold">Standard ✓</span>
          </div>
        </div>
      </div>
    </div>
  );
};

/* -------------------------------------------------------------
   Step 3: Classification Workflow Illustration
------------------------------------------------------------- */
const StepInferenceVisual: React.FC = () => {
  return (
    <div className="space-y-2 sm:space-y-3">
      <div className="flex items-center justify-between gap-2 px-0.5 min-w-0">
        <span className="text-[11px] sm:text-sm font-extrabold uppercase tracking-wide text-slate-700 truncate min-w-0">
          Classification & Attention Map
        </span>
        <span className="inline-flex items-center gap-1 rounded-full bg-teal-100 px-2.5 py-1 text-[10px] sm:text-xs font-extrabold text-teal-800 shadow-2xs shrink-0 whitespace-nowrap leading-none">
          <Activity className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-teal-700 animate-pulse shrink-0" />
          <span className="whitespace-nowrap">Illustration</span>
        </span>
      </div>

      <div className="relative rounded-xl sm:rounded-2xl overflow-hidden border border-slate-200 bg-slate-50/80 p-2.5 sm:p-4 text-slate-900 flex items-center justify-between gap-2.5 sm:gap-4 shadow-2xs">
        {/* Illustrative retinal graphic, not a computed model output. */}
        <div className="relative h-16 w-16 sm:h-24 sm:w-24 lg:h-28 lg:w-28 rounded-full overflow-hidden border-2 border-amber-300/80 bg-gradient-to-br from-amber-100 via-orange-50 to-amber-200/50 shrink-0 flex items-center justify-center shadow-inner text-amber-900">
          <RetinaEyeSvg className="h-11 w-11 sm:h-18 sm:w-18 lg:h-22 lg:w-22 text-amber-900/70" />
          {/* Scanning Beam */}
          <div className="absolute inset-x-0 h-1 sm:h-1.5 bg-gradient-to-r from-transparent via-teal-600 to-transparent animate-bounce opacity-70" />
        </div>

        <div className="flex-1 space-y-1 sm:space-y-1.5 min-w-0">
          <div className="flex items-center justify-between text-[10.5px] sm:text-xs lg:text-sm gap-1">
            <span className="text-slate-500 font-medium shrink-0">
              Map
            </span>
            <span className="font-extrabold text-teal-800 text-[10.5px] sm:text-xs lg:text-sm text-right shrink-0">
              Image contrast
            </span>
          </div>
          <div className="flex items-center justify-between text-[10.5px] sm:text-xs lg:text-sm gap-1">
            <span className="text-slate-500 font-medium shrink-0">
              Grading
            </span>
            <span className="font-extrabold text-emerald-700 font-mono text-[11px] sm:text-sm lg:text-base text-right shrink-0">
              ICDR 0-4
            </span>
          </div>
          <div className="flex items-center justify-between text-[10.5px] sm:text-xs lg:text-sm gap-1">
            <span className="text-slate-500 font-medium shrink-0">Review</span>
            <span className="font-mono text-slate-700 font-semibold text-[10px] sm:text-xs text-right shrink-0">
              Clinician
            </span>
          </div>

          <div className="pt-0.5 sm:pt-1 flex flex-wrap gap-1 sm:gap-1.5">
            <span className="rounded-md bg-teal-50 border border-teal-200 px-1.5 py-0.5 text-[9px] sm:text-xs font-mono font-bold text-teal-800 shadow-2xs">
              Screening support
            </span>
            <span className="rounded-md bg-white border border-slate-200 px-1.5 py-0.5 text-[9px] sm:text-xs font-mono font-bold text-slate-700 shadow-2xs">
              Both eyes
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

/* -------------------------------------------------------------
   Step 4: Report Visual (Grade Pill, Referral Protocol & PDF)
------------------------------------------------------------- */
const StepReportVisual: React.FC = () => {
  return (
    <div className="space-y-2 sm:space-y-3">
      <div className="flex items-center justify-between gap-2 px-0.5 min-w-0">
        <span className="text-[11px] sm:text-sm font-extrabold uppercase tracking-wide text-slate-700 truncate min-w-0">
          Referral Summary
        </span>
        <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-1 text-[10px] sm:text-xs font-extrabold text-rose-800 shadow-2xs shrink-0 whitespace-nowrap leading-none">
          <span className="whitespace-nowrap">Referral Required</span>
        </span>
      </div>

      {/* Grade Output Banner */}
      <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-2.5 sm:p-4 flex items-center justify-between shadow-2xs gap-2">
        <div className="min-w-0">
          <span className="text-[9.5px] sm:text-xs font-bold uppercase tracking-wide text-amber-900 block truncate">
            Highest Finding · OD Right Eye
          </span>
          <span className="text-xs sm:text-base lg:text-lg font-extrabold text-amber-950 block truncate">
            Grade 2 (Moderate NPDR)
          </span>
        </div>
        <div className="text-right shrink-0">
          <span className="text-[9.5px] sm:text-xs text-slate-500 block">Triage Action</span>
          <span className="text-[11px] sm:text-sm font-extrabold text-amber-900">
            Refer in 2-4 wks
          </span>
        </div>
      </div>

      {/* Clinical Guidance Protocol */}
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-2 sm:p-3 text-xs sm:text-sm text-slate-700 flex items-center justify-between gap-2 shadow-2xs">
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex h-7 w-7 sm:h-9 sm:w-9 items-center justify-center rounded-lg bg-teal-100 text-teal-800 shrink-0 shadow-2xs">
            <FileText className="h-3.5 w-3.5 sm:h-5 sm:w-5" />
          </div>
          <span className="truncate text-slate-800 font-medium text-[11px] sm:text-xs lg:text-sm">
            Consolidated Bilateral Referral Protocol
          </span>
        </div>
        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
          <span className="inline-flex items-center gap-1 rounded-lg bg-teal-700 px-2 py-1 text-[10px] sm:text-xs font-bold text-white shadow-2xs">
            <FileDown className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
            <span>PDF</span>
          </span>
          <span className="inline-flex items-center gap-1 rounded-lg bg-white border border-slate-200 px-2 py-1 text-[10px] sm:text-xs font-bold text-slate-700 shadow-2xs">
            <Printer className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
            <span>Print</span>
          </span>
        </div>
      </div>
    </div>
  );
};

/* -------------------------------------------------------------
   SVG Graphic for Retinal Eye & Vessels
------------------------------------------------------------- */
const RetinaEyeSvg: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <circle cx="50" cy="50" r="46" stroke="currentColor" strokeWidth="3" opacity="0.4" />
    <circle cx="35" cy="50" r="10" fill="currentColor" opacity="0.35" />
    <circle cx="35" cy="50" r="6" stroke="currentColor" strokeWidth="1.5" opacity="0.6" />
    <circle cx="68" cy="50" r="5" fill="currentColor" opacity="0.25" />
    <circle cx="68" cy="50" r="1.5" fill="currentColor" opacity="0.7" />
    <path
      d="M35 44 C 40 32, 55 24, 75 28"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      opacity="0.8"
    />
    <path
      d="M50 30 C 58 24, 66 22, 82 22"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      opacity="0.6"
    />
    <path
      d="M35 56 C 40 68, 55 76, 75 72"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      opacity="0.8"
    />
    <path
      d="M50 70 C 58 76, 66 78, 82 78"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      opacity="0.6"
    />
    <path
      d="M28 50 C 22 48, 16 46, 10 44"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      opacity="0.6"
    />
    <path
      d="M28 50 C 22 52, 16 54, 10 56"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      opacity="0.6"
    />
  </svg>
);
