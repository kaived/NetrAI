import React from 'react';
import { ShieldCheck, ShieldAlert, CheckCircle, AlertTriangle } from 'lucide-react';
import type { QualityResult } from '../types';

interface QualityGateCardProps {
  quality: QualityResult;
}

export const QualityGateCard: React.FC<QualityGateCardProps> = ({ quality }) => {
  const isGradeable = quality.is_gradeable;

  // Normalized visual metrics
  // Focus score threshold is typically around 100+
  const focusPercent = Math.min(100, Math.round((quality.focus_score / 250) * 100));
  // Brightness: optimal is ~0.4 to 0.7
  const brightnessPercent = Math.round(quality.brightness * 100);
  // Contrast: optimal is ~0.15 to 0.4
  const contrastPercent = Math.min(100, Math.round((quality.contrast / 0.35) * 100));

  return (
    <div
      className={`border rounded-2xl p-6 lg:p-7 shadow-sm transition-all ${
        isGradeable
          ? 'bg-white border-slate-200'
          : 'bg-rose-50/40 border-rose-200 ring-1 ring-rose-200'
      }`}
    >
      <div className="flex items-center justify-between border-b border-slate-100 pb-5 mb-5">
        <div className="flex items-center gap-4">
          <div
            className={`flex h-12 w-12 items-center justify-center rounded-xl ${
              isGradeable ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
            }`}
          >
            {isGradeable ? <ShieldCheck className="w-7 h-7" /> : <ShieldAlert className="w-7 h-7" />}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h3 className="text-2xl font-bold text-slate-950">Image Quality Gate</h3>
              <span
                className={`px-3 py-1 text-xs font-bold uppercase tracking-wide rounded-full ${
                  isGradeable
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-rose-100 text-rose-800'
                }`}
              >
                {isGradeable ? 'PASS • Gradeable' : 'REJECTED • Ungradeable'}
              </span>
            </div>
            <p className="text-base text-slate-600 mt-1">Automated pre-inference clarity and artifact assessment</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
        <div className="bg-slate-50 p-5 rounded-xl border border-slate-200">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-slate-600">Focus Score</span>
            <span className="text-lg font-mono font-bold text-slate-900">
              {quality.focus_score.toFixed(1)}
            </span>
          </div>
          <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
            <div
              className={`h-2.5 rounded-full ${
                quality.focus_score >= 100 ? 'bg-emerald-500' : 'bg-rose-500'
              }`}
              style={{ width: `${Math.max(10, focusPercent)}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-slate-400 mt-2">
            <span>Blur</span>
            <span>Sharp</span>
          </div>
        </div>

        <div className="bg-slate-50 p-5 rounded-xl border border-slate-200">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-slate-600">Brightness</span>
            <span className="text-lg font-mono font-bold text-slate-900">
              {quality.brightness.toFixed(2)}
            </span>
          </div>
          <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
            <div
              className={`h-2.5 rounded-full ${
                quality.brightness >= 0.25 && quality.brightness <= 0.85
                  ? 'bg-emerald-500'
                  : 'bg-amber-500'
              }`}
              style={{ width: `${Math.max(10, brightnessPercent)}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-slate-400 mt-2">
            <span>Dark</span>
            <span>Bright</span>
          </div>
        </div>

        <div className="bg-slate-50 p-5 rounded-xl border border-slate-200">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-slate-600">Contrast</span>
            <span className="text-lg font-mono font-bold text-slate-900">
              {quality.contrast.toFixed(2)}
            </span>
          </div>
          <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
            <div
              className={`h-2.5 rounded-full ${
                quality.contrast >= 0.12 ? 'bg-emerald-500' : 'bg-rose-500'
              }`}
              style={{ width: `${Math.max(10, contrastPercent)}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-slate-400 mt-2">
            <span>Low</span>
            <span>Optimal</span>
          </div>
        </div>
      </div>

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
  );
};
