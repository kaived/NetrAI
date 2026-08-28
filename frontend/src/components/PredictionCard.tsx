import React from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  Cpu,
  Check
} from 'lucide-react';
import type { PredictionResult } from '../types';

interface PredictionCardProps {
  prediction: PredictionResult;
  isGradeable: boolean;
}

const ICDR_STAGES = [
  { grade: 0, label: 'No DR', desc: 'No microaneurysms or lesions', color: 'bg-emerald-500', border: 'border-emerald-500' },
  { grade: 1, label: 'Mild', desc: 'Microaneurysms only', color: 'bg-teal-500', border: 'border-teal-500' },
  { grade: 2, label: 'Moderate', desc: 'Microaneurysms + hard exudates', color: 'bg-amber-500', border: 'border-amber-500' },
  { grade: 3, label: 'Severe', desc: '4-2-1 rule: hemorrhages / IRMA', color: 'bg-orange-500', border: 'border-orange-500' },
  { grade: 4, label: 'Proliferative', desc: 'Neovascularization / vitreous bleed', color: 'bg-rose-600', border: 'border-rose-600' },
];

export const PredictionCard: React.FC<PredictionCardProps> = ({ prediction, isGradeable }) => {
  const referable = prediction.referable_dr;
  const grade = prediction.icdr_grade;
  const confidencePercent = Math.round(prediction.confidence * 100);

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 lg:p-7 shadow-sm space-y-6">
      <div
        className={`p-6 rounded-2xl border flex flex-col lg:flex-row items-start lg:items-center justify-between gap-5 ${
          !isGradeable
            ? 'bg-slate-100 border-slate-300 text-slate-700'
            : referable
            ? 'bg-rose-50 border-rose-300 text-rose-950'
            : 'bg-emerald-50 border-emerald-300 text-emerald-950'
        }`}
      >
        <div className="flex items-center gap-5">
          <div
            className={`flex h-16 w-16 items-center justify-center rounded-2xl shadow-sm ${
              !isGradeable
                ? 'bg-slate-200 text-slate-700'
                : referable
                ? 'bg-rose-600 text-white'
                : 'bg-emerald-600 text-white'
            }`}
          >
            {!isGradeable ? (
              <HelpCircle className="w-9 h-9" />
            ) : referable ? (
              <AlertTriangle className="w-9 h-9" />
            ) : (
              <CheckCircle2 className="w-9 h-9" />
            )}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-sm uppercase font-bold tracking-wide opacity-75">
                Screening Triage Result
              </span>
              <span
                className={`px-3 py-1 text-xs font-extrabold uppercase rounded-full ${
                  !isGradeable
                    ? 'bg-slate-200 text-slate-800'
                    : referable
                    ? 'bg-rose-200 text-rose-900 animate-pulse'
                    : 'bg-emerald-200 text-emerald-900'
                }`}
              >
                {!isGradeable
                  ? 'Recapture Required'
                  : referable
                  ? 'Urgent Referable DR'
                  : 'Non-Referable DR'}
                </span>
            </div>
            <h2 className="text-3xl font-extrabold tracking-tight mt-2 leading-tight">
              {!isGradeable
                ? 'Ungradeable Fundus Scan'
                : referable
                ? `Referral Indicated: ${prediction.label.toUpperCase()}`
                : `No Referral Required (${prediction.label})`}
            </h2>
          </div>
        </div>

        {isGradeable && (
          <div className="flex lg:flex-col items-center lg:items-end justify-between w-full lg:w-auto pt-4 lg:pt-0 border-t lg:border-t-0 border-inherit/40">
            <span className="text-sm font-semibold opacity-80">Model Confidence</span>
            <div className="flex items-baseline gap-1">
              <span className="text-5xl font-black font-mono leading-none">{confidencePercent}%</span>
            </div>
          </div>
        )}
      </div>

      <div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-4">
          <span className="text-base font-bold uppercase tracking-wide text-slate-700">
            International Clinical DR (ICDR) Severity Scale
          </span>
          <span className="text-sm text-slate-500">
            Predicted Grade:{' '}
            <strong className="text-slate-800 font-mono">
              {grade !== null ? `Grade ${grade} (${prediction.label})` : 'N/A'}
            </strong>
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          {ICDR_STAGES.map((stage) => {
            const isSelected = isGradeable && grade === stage.grade;
            const isPrior = isGradeable && grade !== null && grade > stage.grade;

            return (
              <div
                key={stage.grade}
                className={`min-h-[126px] p-4 rounded-xl border text-center transition-all ${
                  isSelected
                    ? `${stage.border} bg-slate-900 text-white shadow-md ring-2 ring-teal-500/50 scale-[1.03] z-10`
                    : isPrior
                    ? 'border-slate-200 bg-slate-100/80 text-slate-600'
                    : 'border-slate-200 bg-slate-50/60 text-slate-400 opacity-60'
                }`}
              >
                <div className="flex items-center justify-center gap-2 mb-2">
                  <span
                    className={`w-3 h-3 rounded-full ${stage.color} ${
                      isSelected ? 'ring-2 ring-white' : ''
                    }`}
                  ></span>
                  <span className="text-sm font-bold">Grade {stage.grade}</span>
                </div>
                <div className={`text-base font-bold ${isSelected ? 'text-teal-300' : 'text-slate-700'}`}>
                  {stage.label}
                </div>
                <div className="text-xs text-slate-400 hidden md:block mt-2 leading-5">
                  {stage.desc}
                </div>
                {isSelected && (
                  <div className="mt-3 inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold bg-teal-500 text-white rounded-full">
                    <Check className="w-3 h-3" />
                    MATCH
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between text-sm text-slate-500 mt-4 px-1">
          <span>Grade 0-1: Routine Annual Screening</span>
          <span className="text-rose-600 font-semibold">Grade 2-4: Refer to Eye Specialist</span>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 pt-5 border-t border-slate-100 text-sm text-slate-500">
        <div className="flex items-center gap-2">
          <Cpu className="w-5 h-5 text-teal-600" />
          <span>Model Architecture:</span>
          <span className="font-mono font-semibold text-slate-800 bg-slate-100 px-3 py-1 rounded-lg">
            {prediction.model_version}
          </span>
        </div>
        <div className="text-sm text-slate-400">
          Trained on APTOS 2019 / Messidor-2 benchmarks
        </div>
      </div>
    </div>
  );
};
