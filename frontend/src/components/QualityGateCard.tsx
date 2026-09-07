import React from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  CheckCircle,
  AlertTriangle,
  ScanEye,
  AlertCircle
} from 'lucide-react';
import type { QualityResult } from '../types';
import { displayText } from '../utils/display';

interface QualityGateCardProps {
  quality: QualityResult;
}

const QUALITY_THRESHOLDS = {
  minFocusScore: 0.75,
  minBrightness: 0.10,
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

        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          <div className="bg-slate-50 p-3.5 sm:p-4 rounded-xl border border-slate-200 flex flex-col justify-between">
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-xs sm:text-sm font-semibold text-slate-700">Focus Score</span>
              <span className="text-base sm:text-lg font-extrabold text-slate-900 shrink-0">
                {quality.focus_score.toFixed(1)}
              </span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden my-1">
              <div
                className={`h-2 rounded-full ${
                  focusPasses ? 'bg-emerald-500' : 'bg-rose-500'
                }`}
                style={{ width: `${Math.max(10, focusPercent)}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[11px] sm:text-xs text-slate-500 mt-1 gap-1 whitespace-nowrap">
              <span>Blur</span>
              <span className="font-medium">Hard min {QUALITY_THRESHOLDS.minFocusScore.toFixed(2)}</span>
            </div>
          </div>

          <div className="bg-slate-50 p-3.5 sm:p-4 rounded-xl border border-slate-200 flex flex-col justify-between">
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-xs sm:text-sm font-semibold text-slate-700">Brightness</span>
              <span className="text-base sm:text-lg font-extrabold text-slate-900 shrink-0">
                {quality.brightness.toFixed(2)}
              </span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden my-1">
              <div
                className={`h-2 rounded-full ${
                  brightnessPasses
                    ? 'bg-emerald-500'
                    : 'bg-amber-500'
                }`}
                style={{ width: `${Math.max(10, brightnessPercent)}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[11px] sm:text-xs text-slate-500 mt-1 gap-1 whitespace-nowrap">
              <span>Dark</span>
              <span className="font-medium">Min {QUALITY_THRESHOLDS.minBrightness.toFixed(2)}</span>
            </div>
          </div>

          <div className="bg-slate-50 p-3.5 sm:p-4 rounded-xl border border-slate-200 flex flex-col justify-between">
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-xs sm:text-sm font-semibold text-slate-700">Contrast</span>
              <span className="text-base sm:text-lg font-extrabold text-slate-900 shrink-0">
                {quality.contrast.toFixed(2)}
              </span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden my-1">
              <div
                className={`h-2 rounded-full ${
                  contrastPasses ? 'bg-emerald-500' : 'bg-rose-500'
                }`}
                style={{ width: `${Math.max(10, contrastPercent)}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[11px] sm:text-xs text-slate-500 mt-1 gap-1 whitespace-nowrap">
              <span>Low</span>
              <span className="font-medium">Min {QUALITY_THRESHOLDS.minContrast.toFixed(2)}</span>
            </div>
          </div>

          <div className="bg-slate-50 p-3.5 sm:p-4 rounded-xl border border-slate-200 flex flex-col justify-between">
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-xs sm:text-sm font-semibold text-slate-700">Compatibility</span>
              <span className="text-base sm:text-lg font-extrabold text-slate-900 shrink-0">
                {compatibilityPercent}%
              </span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden my-1">
              <div
                className={`h-2 rounded-full ${
                  compatibilityPasses ? 'bg-emerald-500' : 'bg-rose-500'
                }`}
                style={{ width: `${Math.max(10, compatibilityPercent)}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[11px] sm:text-xs text-slate-500 mt-1 gap-1 whitespace-nowrap">
              <span>Low</span>
              <span className="font-medium">Standard</span>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-5">
        {quality.warnings && quality.warnings.length > 0 && (
          <div className="mb-4 bg-amber-50/80 border border-amber-200 rounded-xl p-4 sm:p-5 text-amber-950 space-y-2.5">
            <div className="font-bold flex items-center gap-2.5 text-sm sm:text-base leading-6 text-amber-950">
              <ScanEye className="w-5 h-5 text-amber-700 shrink-0" />
              <span>Capture Advisory</span>
            </div>
            {isGradeable && (
              <p className="text-xs sm:text-sm text-amber-900/90 leading-relaxed">
                Screening completed, but a more centered fundus image is preferred for higher reliability.
              </p>
            )}
            <div className="space-y-2 text-xs sm:text-sm text-amber-900/90 leading-relaxed">
              {quality.warnings.map((warning, idx) => (
                <div key={idx} className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <span className="flex-1 min-w-0">{displayText(warning, 'Quality warning not available')}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {!isGradeable && quality.reasons.length > 0 && (
          <div className="bg-rose-100/70 border border-rose-300 rounded-xl p-4 sm:p-5 text-rose-900 space-y-2.5">
            <div className="font-bold flex items-center gap-2.5 text-sm sm:text-base leading-6 text-rose-950">
              <AlertTriangle className="w-5 h-5 text-rose-700 shrink-0" />
              <span>Quality Gate Rejection Reasons</span>
            </div>
            <div className="space-y-2 text-xs sm:text-sm text-rose-900/90 leading-relaxed">
              {quality.reasons.map((reason, idx) => (
                <div key={idx} className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span className="flex-1 min-w-0">{displayText(reason, 'Quality rejection reason not available')}</span>
                </div>
              ))}
            </div>
            <p className="text-xs sm:text-sm text-rose-800 pt-1 leading-relaxed">
              <strong>Action for PHC Operator:</strong> Recapture the fundus photograph after asking patient to steady gaze and adjusting camera illumination.
            </p>
          </div>
        )}

        {isGradeable && (
          <div className="flex items-start gap-2.5 sm:gap-3 text-xs sm:text-sm text-emerald-900 bg-emerald-50/80 border border-emerald-200 p-4 sm:p-5 rounded-xl">
            <CheckCircle className="w-4 h-4 sm:w-[18px] sm:h-[18px] text-emerald-600 shrink-0 mt-0.5" />
            <p className="leading-snug sm:leading-relaxed font-medium text-emerald-950 flex-1 min-w-0">
              Fundus image passed quality threshold. Optical disc and macula regions are adequately resolved for neural network inference.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
