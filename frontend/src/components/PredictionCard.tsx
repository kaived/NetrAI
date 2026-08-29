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
  const confidenceLevel = prediction.confidence_level || getConfidenceLevel(prediction.confidence);
  const confidenceTone = getConfidenceTone(confidenceLevel);

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 lg:p-7 shadow-sm space-y-6 h-full flex flex-col justify-between">
      <div
        className={`p-5 sm:p-6 rounded-2xl border flex flex-col lg:flex-row items-start lg:items-center justify-between gap-5 ${
          !isGradeable
            ? 'bg-slate-100 border-slate-300 text-slate-700'
            : referable
            ? 'bg-rose-50 border-rose-300 text-rose-950'
            : 'bg-emerald-50 border-emerald-300 text-emerald-950'
        }`}
      >
        <div className="flex items-start gap-4 sm:gap-5 min-w-0">
          <div
            className={`flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-2xl shadow-xs shrink-0 mt-0.5 ${
              !isGradeable
                ? 'bg-slate-200 text-slate-700'
                : referable
                ? 'bg-rose-600 text-white'
                : 'bg-emerald-600 text-white'
            }`}
          >
            {!isGradeable ? (
              <HelpCircle className="w-6 h-6 sm:w-8 sm:h-8" />
            ) : referable ? (
              <AlertTriangle className="w-6 h-6 sm:w-8 sm:h-8" />
            ) : (
              <CheckCircle2 className="w-6 h-6 sm:w-8 sm:h-8" />
            )}
          </div>
          <div className="space-y-1 sm:space-y-1.5 min-w-0">
            <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
              <span className="text-xs uppercase font-bold tracking-wider opacity-75">
                Screening Triage Result
              </span>
              <span
                className={`px-2.5 py-0.5 text-[11px] sm:text-xs font-extrabold uppercase rounded-full whitespace-nowrap ${
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
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-extrabold tracking-tight leading-tight">
              {!isGradeable
                ? 'Ungradeable Fundus Scan'
                : referable
                ? `Referral Indicated: ${prediction.label.toUpperCase()}`
                : `No Referral Required (${prediction.label})`}
            </h2>
          </div>
        </div>

        {isGradeable && (
          <div className="flex flex-wrap sm:flex-nowrap lg:flex-col items-center sm:items-end justify-between gap-2.5 w-full lg:w-auto pt-3.5 lg:pt-0 border-t lg:border-t-0 border-inherit/40 shrink-0">
            <span className="text-xs sm:text-sm font-semibold opacity-80 whitespace-nowrap">Model Confidence</span>
            <div className="flex items-baseline gap-1 my-0.5">
              <span className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-none">{confidencePercent}%</span>
            </div>
            <span className={`rounded-full px-2.5 sm:px-3 py-0.5 text-[10px] sm:text-xs font-extrabold uppercase whitespace-nowrap shadow-2xs ${confidenceTone}`}>
              {confidenceLevel} confidence
            </span>
          </div>
        )}
      </div>

      <div>
        <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between mb-3.5">
          <span className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-700">
            International Clinical DR (ICDR) Scale
          </span>
          <span className="text-xs sm:text-sm text-slate-500 whitespace-nowrap">
            Predicted Grade:{' '}
            <strong className="text-slate-900 font-bold">
              {grade !== null && grade !== undefined ? `Grade ${grade} (${prediction.label})` : 'No Grade'}
            </strong>
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-2.5 sm:gap-3">
          {ICDR_STAGES.map((stage) => {
            const isSelected = isGradeable && grade === stage.grade;

            return (
              <div
                key={stage.grade}
                className={`min-h-[116px] sm:min-h-[128px] p-3 rounded-xl border text-center transition-all flex flex-col justify-between ${
                  isSelected
                    ? `${stage.border} bg-slate-900 text-white shadow-md ring-2 ring-teal-500/50 scale-[1.02] z-10`
                    : 'border-slate-200 bg-slate-50/80 text-slate-700 hover:border-slate-300'
                }`}
              >
                <div>
                  <div className="flex items-center justify-center gap-1.5 mb-1.5">
                    <span
                      className={`w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full shrink-0 ${stage.color} ${
                        isSelected ? 'ring-1 sm:ring-2 ring-white' : ''
                      }`}
                    ></span>
                    <span className={`text-xs sm:text-sm font-bold ${isSelected ? 'text-white' : 'text-slate-900'}`}>
                      Grade {stage.grade}
                    </span>
                  </div>
                  <div className={`text-xs sm:text-sm font-bold leading-tight ${isSelected ? 'text-teal-300' : 'text-slate-800'}`}>
                    {stage.label}
                  </div>
                  <div className={`text-[10px] sm:text-xs mt-1.5 leading-4 ${isSelected ? 'text-slate-300' : 'text-slate-500'}`}>
                    {stage.desc}
                  </div>
                </div>
                {isSelected && (
                  <div className="mt-2.5 inline-flex items-center justify-center gap-1 px-2.5 py-0.5 text-[10px] sm:text-xs font-bold bg-teal-500 text-white rounded-full shadow-xs mx-auto">
                    <Check className="w-3 h-3" />
                    <span>MATCH</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between text-xs sm:text-sm text-slate-500 mt-4 px-1">
          <span>Grade 0-1: Routine Annual Screening</span>
          <span className="text-rose-600 font-semibold">Grade 2-4: Refer to Eye Specialist</span>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-5 border-t border-slate-100 text-xs sm:text-sm text-slate-500">
        <div className="flex items-center gap-2 flex-wrap">
          <Cpu className="w-4 h-4 sm:w-5 sm:h-5 text-teal-600 shrink-0" />
          <span>Model Architecture:</span>
          <span className="font-bold text-slate-800 bg-slate-100 px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-lg text-xs sm:text-sm">
            {prediction.model_version}
          </span>
        </div>
        <div className="text-xs sm:text-sm text-slate-400">
          Trained on APTOS 2019 Blindness Detection benchmark
        </div>
      </div>
    </div>
  );
};

function getConfidenceLevel(confidence: number) {
  if (confidence < 0.5) return 'low';
  if (confidence < 0.7) return 'moderate';
  return 'high';
}

function getConfidenceTone(level: string) {
  if (level === 'low') return 'bg-amber-200 text-amber-950';
  if (level === 'moderate') return 'bg-sky-100 text-sky-900';
  if (level === 'high') return 'bg-emerald-100 text-emerald-900';
  return 'bg-slate-200 text-slate-800';
}
