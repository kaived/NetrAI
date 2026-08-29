import React from 'react';
import { ShieldCheck, ShieldAlert, CheckCircle, AlertTriangle, ScanEye } from 'lucide-react';
import type { QualityResult } from '../types';

interface QualityGateCardProps {
  quality: QualityResult;
}

const QUALITY_THRESHOLDS = {
  minFocusScore: 1.0,
  minBrightness: 0.15,
  maxBrightness: 0.90,
  minContrast: 0.05,
};

export const QualityGateCard: React.FC<QualityGateCardProps> = ({ quality }) => {
  const isGradeable = quality.is_gradeable;

  const focusPercent = Math.min(100, Math.round((quality.focus_score / (QUALITY_THRESHOLDS.minFocusScore * 4)) * 100));
  const brightnessPercent = Math.round(quality.brightness * 100);
  const contrastPercent = Math.min(100, Math.round((quality.contrast / (QUALITY_THRESHOLDS.minContrast * 4)) * 100));
  const compatibilityScore = quality.compatibility_score ?? 1;
  const compatibilityPercent = Math.round(compatibilityScore * 100);
  const compatibilityPasses = isGradeable && (quality.is_supported_fundus ?? true);
  const focusPasses = quality.focus_score >= QUALITY_THRESHOLDS.minFocusScore;
  const brightnessPasses =
    quality.brightness >= QUALITY_THRESHOLDS.minBrightness &&
    quality.brightness <= QUALITY_THRESHOLDS.maxBrightness;
  const contrastPasses = quality.contrast >= QUALITY_THRESHOLDS.minContrast;

  return (
    <div
      className={`border rounded-2xl p-6 lg:p-7 shadow-sm transition-all h-full flex flex-col justify-between ${
        isGradeable
          ? 'bg-white border-slate-200'
          : 'bg-rose-50/40 border-rose-200 ring-1 ring-rose-200'
      }`}
    >
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-5">
          <div className="flex items-start gap-4 sm:gap-5 min-w-0">
            <div
              className={`flex h-12 w-12 sm:h-13 sm:w-13 items-center justify-center rounded-2xl shrink-0 mt-0.5 shadow-2xs ${
                isGradeable ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
              }`}
            >
              {isGradeable ? <ShieldCheck className="w-6 h-6 sm:w-7 sm:h-7" /> : <ShieldAlert className="w-6 h-6 sm:w-7 sm:h-7" />}
            </div>
            <div className="space-y-1 sm:space-y-1.5">
              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                <h3 className="text-xl sm:text-2xl font-bold text-slate-950 leading-tight">Image Quality Gate</h3>
                <span
                  className={`px-3 py-1 text-xs font-extrabold uppercase tracking-wide rounded-full ${
                    isGradeable
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-rose-100 text-rose-800'
                  }`}
                >
                  {isGradeable ? 'PASS • Gradeable' : 'REJECTED • Ungradeable'}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">Automated pre-inference clarity, artifact, and fundus compatibility assessment</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          <div className="bg-slate-50 p-5 rounded-xl border border-slate-200">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold text-slate-600">Focus Score</span>
              <span className="text-lg font-extrabold text-slate-900">
                {quality.focus_score.toFixed(1)}
              </span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
              <div
                className={`h-2.5 rounded-full ${
                  focusPasses ? 'bg-emerald-500' : 'bg-rose-500'
                }`}
                style={{ width: `${Math.max(10, focusPercent)}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-slate-400 mt-2">
              <span>Blur</span>
              <span>Min {QUALITY_THRESHOLDS.minFocusScore.toFixed(1)}</span>
            </div>
          </div>

          <div className="bg-slate-50 p-5 rounded-xl border border-slate-200">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold text-slate-600">Brightness</span>
              <span className="text-lg font-extrabold text-slate-900">
                {quality.brightness.toFixed(2)}
              </span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
              <div
                className={`h-2.5 rounded-full ${
                  brightnessPasses
                    ? 'bg-emerald-500'
                    : 'bg-amber-500'
                }`}
                style={{ width: `${Math.max(10, brightnessPercent)}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-slate-400 mt-2">
              <span>Dark</span>
              <span>Max {QUALITY_THRESHOLDS.maxBrightness.toFixed(2)}</span>
            </div>
          </div>

          <div className="bg-slate-50 p-5 rounded-xl border border-slate-200">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold text-slate-600">Contrast</span>
              <span className="text-lg font-extrabold text-slate-900">
                {quality.contrast.toFixed(2)}
              </span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
              <div
                className={`h-2.5 rounded-full ${
                  contrastPasses ? 'bg-emerald-500' : 'bg-rose-500'
                }`}
                style={{ width: `${Math.max(10, contrastPercent)}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-slate-400 mt-2">
              <span>Low</span>
              <span>Min {QUALITY_THRESHOLDS.minContrast.toFixed(2)}</span>
            </div>
          </div>

          <div className="bg-slate-50 p-5 rounded-xl border border-slate-200">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold text-slate-600">Compatibility</span>
              <span className="text-lg font-extrabold text-slate-900">
                {compatibilityPercent}%
              </span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
              <div
                className={`h-2.5 rounded-full ${
                  compatibilityPasses ? 'bg-emerald-500' : 'bg-rose-500'
                }`}
                style={{ width: `${Math.max(10, compatibilityPercent)}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-slate-400 mt-2">
              <span>Unsupported</span>
              <span>APTOS-style</span>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-5">
        {quality.warnings && quality.warnings.length > 0 && (
          <div className="mb-4 bg-amber-50/80 border border-amber-200 rounded-xl p-5 text-base text-amber-950 space-y-3">
            <div className="font-bold flex items-center gap-2">
              <ScanEye className="w-5 h-5 text-amber-700" />
              Compatibility Warnings
            </div>
            <ul className="list-disc list-inside space-y-2 pl-1 text-sm text-amber-800">
              {quality.warnings.map((warning, idx) => (
                <li key={idx}>{warning}</li>
              ))}
            </ul>
          </div>
        )}

        {!isGradeable && quality.reasons.length > 0 && (
          <div className="bg-rose-100/70 border border-rose-300 rounded-xl p-5 text-base text-rose-900 space-y-3">
            <div className="font-bold flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-rose-700" />
              Quality Gate Rejection Reasons
            </div>
            <ul className="list-disc list-inside space-y-2 pl-1 text-sm text-rose-800">
              {quality.reasons.map((reason, idx) => (
                <li key={idx}>{reason}</li>
              ))}
            </ul>
            <p className="text-sm text-rose-700 pt-1">
              <strong>Action for PHC Operator:</strong> Recapture the fundus photograph after asking patient to steady gaze and adjusting camera illumination.
            </p>
          </div>
        )}

        {isGradeable && (
          <div className="flex items-start gap-3 text-base text-emerald-800 bg-emerald-50/80 border border-emerald-200 px-5 py-4 rounded-xl">
            <CheckCircle className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5" />
            <span>
              Fundus image passed quality threshold. Optical disc and macula regions are adequately resolved for neural network inference.
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
