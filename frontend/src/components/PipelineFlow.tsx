import React from 'react';
import { ShieldCheck, Cpu, GitCommit, FileCheck, Layers, Loader2, ShieldAlert } from 'lucide-react';
import type { CaseResult, EyeCode, EyeScreeningResult } from '../types';

interface PipelineFlowProps {
  isLoading: boolean;
  isRestoring?: boolean;
  result: CaseResult | null;
  activeEye?: EyeCode;
}

export const PipelineFlow: React.FC<PipelineFlowProps> = ({ isLoading, isRestoring = false, result, activeEye }) => {
  const targetEye = activeEye ?? (result?.patient?.eye as EyeCode | undefined);
  const eyeResult: EyeScreeningResult | CaseResult | null =
    targetEye && result?.eyes?.[targetEye]
      ? result.eyes[targetEye]!
      : result?.patient?.eye === targetEye
      ? result
      : result;

  const isEyePending = Boolean(result && targetEye && !result.eyes?.[targetEye] && result.patient?.eye !== targetEye);
  const completedEyes = result?.completed_eyes ?? [];
  const hasBilateralResults = Boolean(result?.eyes?.OD && result?.eyes?.OS);
  const isBilateralComplete = Boolean(
    result?.is_case_complete ||
      hasBilateralResults ||
      (completedEyes.includes('OD') && completedEyes.includes('OS')),
  );
  const bilateralEyeResults = (['OD', 'OS'] as EyeCode[])
    .map((eye) => result?.eyes?.[eye])
    .filter((eye): eye is EyeScreeningResult => Boolean(eye));
  const allBilateralImagesGradeable =
    isBilateralComplete &&
    bilateralEyeResults.length === 2 &&
    bilateralEyeResults.every((eye) => eye.quality.is_gradeable);

  const steps = [
    {
      id: 'quality',
      title: 'Image Quality Gate',
      desc: 'Focus & Illumination',
      icon: ShieldCheck,
      failedIcon: ShieldAlert,
    },
    {
      id: 'preprocess',
      title: 'Preprocessing',
      desc: 'Crop & Green Filter',
      icon: Layers,
    },
    {
      id: 'model',
      title: 'DR Classification',
      desc: 'ONNX Deep Net',
      icon: Cpu,
    },
    {
      id: 'decision',
      title: 'Referral Triage',
      desc: 'ICDR Grade 0-4',
      icon: GitCommit,
    },
    {
      id: 'report',
      title: 'Clinical Report',
      desc: 'Explainable Summary',
      icon: FileCheck,
    },
  ];

  const getStepStatus = (index: number): 'pending' | 'processing' | 'success' | 'warning' | 'failed' | 'skipped' => {
    if (!result && !isLoading) {
      return 'pending';
    }

    if (isLoading) {
      return index === 0 ? 'processing' : 'pending';
    }

    if (!result || isEyePending || !eyeResult) return 'pending';

    if (index === 0) {
      return eyeResult.quality.is_gradeable ? 'success' : 'failed';
    }

    if (!eyeResult.quality.is_gradeable) {
      return 'skipped';
    }

    if (index === 1) return 'success';
    if (index === 2) return eyeResult.prediction.icdr_grade !== null ? 'success' : 'skipped';
    if (index === 3) return eyeResult.prediction.icdr_grade !== null ? 'success' : 'skipped';
    if (index === 4) return 'success';

    return 'success';
  };

  const getStatusBadge = () => {
    if (isRestoring) {
      return (
        <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200 shadow-xs">
          <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-500" />
          <span>Status: Restoring Saved Screening</span>
        </span>
      );
    }

    if (isLoading) {
      return (
        <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-teal-50 text-teal-700 border border-teal-200 shadow-xs animate-pulse">
          <Loader2 className="w-3.5 h-3.5 animate-spin text-teal-600" />
          <span>Status: Running Image Quality Gate (1/5 Stages)</span>
        </span>
      );
    }

    if (isEyePending && targetEye) {
      return (
        <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200 shadow-xs">
          <span className="h-2 w-2 rounded-full bg-slate-400"></span>
          <span>Status: {targetEye === 'OD' ? 'OD Right Eye' : 'OS Left Eye'} (Pending Capture)</span>
        </span>
      );
    }

    if (eyeResult) {
      const isPass = eyeResult.quality.is_gradeable;
      const eyePrefix = targetEye ? `${targetEye === 'OD' ? 'OD' : 'OS'}: ` : '';

      return (
        <span
          className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold ${
            isPass
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              : 'bg-amber-50 text-amber-700 border border-amber-200'
          } shadow-xs`}
        >
          <span className={`h-2 w-2 rounded-full ${isPass ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
          <span>
            {allBilateralImagesGradeable
              ? 'Status: Both Eyes Complete (5/5 Stages)'
              : isPass
              ? `Status: ${eyePrefix}Complete (5/5 Stages)`
              : `Status: ${eyePrefix}Quality Gate Flagged (1/5 Stages)`}
          </span>
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200 shadow-xs">
        <span className="h-2 w-2 rounded-full bg-slate-400"></span>
        <span>Status: Standby (0/5 Stages)</span>
      </span>
    );
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm no-print">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-5">
        <h3 className="text-base font-extrabold uppercase tracking-wide text-slate-700">
          RetinaScan Automated Screening Pipeline
        </h3>
        {getStatusBadge()}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {steps.map((step, index) => {
          const status = getStepStatus(index);
          const Icon = status === 'failed' && step.failedIcon ? step.failedIcon : step.icon;

          let badgeBg = 'bg-slate-50 text-slate-700 border-slate-200';
          let iconColor = 'text-slate-400';
          let titleColor = 'text-slate-800 font-semibold';
          let descColor = 'text-slate-500';

          if (status === 'processing') {
            badgeBg = 'bg-teal-50/90 text-teal-900 border-teal-400 ring-2 ring-teal-400/40 shadow-sm animate-pulse';
            iconColor = 'text-teal-600';
            titleColor = 'text-teal-950 font-extrabold';
            descColor = 'text-teal-700 font-medium';
          } else if (status === 'success') {
            badgeBg = 'bg-emerald-50/80 text-emerald-900 border-emerald-300 shadow-xs';
            iconColor = 'text-emerald-600';
            titleColor = 'text-emerald-950 font-bold';
            descColor = 'text-emerald-700';
          } else if (status === 'warning') {
            badgeBg = 'bg-rose-50 text-rose-900 border-rose-300 shadow-xs';
            iconColor = 'text-rose-600';
            titleColor = 'text-rose-950 font-bold';
            descColor = 'text-rose-700';
          } else if (status === 'failed') {
            badgeBg = 'bg-red-50 text-red-900 border-red-300 shadow-xs';
            iconColor = 'text-red-600';
            titleColor = 'text-red-950 font-bold';
            descColor = 'text-red-700';
          } else if (status === 'skipped') {
            badgeBg = 'bg-slate-50/90 text-slate-600 border-slate-200';
            iconColor = 'text-slate-400';
            titleColor = 'text-slate-600 font-medium';
            descColor = 'text-slate-500';
          }

          return (
            <div
              key={step.id}
              className={`flex min-h-[92px] items-center gap-4 p-4 rounded-xl border text-left transition-all ${badgeBg}`}
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white shadow-sm border border-inherit shrink-0">
                {status === 'processing' ? (
                  <Loader2 className="w-6 h-6 animate-spin text-teal-600" />
                ) : (
                  <Icon className={`w-6 h-6 ${iconColor}`} />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <span className={`text-base leading-tight ${titleColor}`}>
                    {step.title}
                  </span>
                </div>
                <p className={`text-sm leading-5 mt-1 ${descColor}`}>
                  {step.desc}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
