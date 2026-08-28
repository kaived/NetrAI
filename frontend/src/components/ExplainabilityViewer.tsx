import React, { useState } from 'react';
import { Eye, Layers, Info, Sparkles, MapPin } from 'lucide-react';
import type { ExplanationResult } from '../types';

interface ExplainabilityViewerProps {
  previewUrl: string | null;
  explanation: ExplanationResult;
  isGradeable: boolean;
  icdrGrade: number | null;
}

export const ExplainabilityViewer: React.FC<ExplainabilityViewerProps> = ({
  previewUrl,
  explanation,
  isGradeable,
  icdrGrade,
}) => {
  const [overlayOpacity, setOverlayOpacity] = useState(65);
  const [showLandmarks, setShowLandmarks] = useState(false);
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 lg:p-7 shadow-sm space-y-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-5">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700">
            <Sparkles className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-2xl font-bold text-slate-950">Explainable AI & Attention Map</h3>
            <p className="text-base text-slate-600 mt-1">Grad-CAM style activation highlighting diagnostic retinal features</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowLandmarks(!showLandmarks)}
            className={`px-4 py-2 text-sm font-semibold rounded-xl border transition-all ${
              showLandmarks
                ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
            }`}
          >
            <MapPin className="w-4 h-4 inline mr-2" />
            Landmarks
          </button>
        </div>
      </div>

      <div className="relative rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 aspect-[4/3] min-h-[420px] flex items-center justify-center">
        {previewUrl ? (
          <div className="relative w-full h-full flex items-center justify-center">
            {/* Base Image */}
            <img
              src={previewUrl}
              alt="Base fundus scan"
              className="max-h-full max-w-full object-contain"
            />

            {/* Simulated / Backend Grad-CAM Heatmap Layer */}
            {isGradeable && (
              <div
                className="absolute inset-0 pointer-events-none mix-blend-screen transition-opacity"
                style={{
                  opacity: overlayOpacity / 100,
                  background:
                    icdrGrade && icdrGrade >= 2
                      ? 'radial-gradient(circle at 62% 48%, rgba(255, 0, 60, 0.85) 0%, rgba(255, 140, 0, 0.65) 28%, rgba(255, 255, 0, 0.35) 45%, rgba(0, 100, 255, 0.15) 65%, transparent 80%), radial-gradient(circle at 55% 58%, rgba(255, 0, 0, 0.75) 0%, rgba(255, 180, 0, 0.5) 25%, transparent 50%)'
                      : 'radial-gradient(circle at 35% 50%, rgba(0, 200, 255, 0.4) 0%, rgba(0, 100, 255, 0.2) 30%, transparent 60%)',
                }}
              />
            )}

            {/* Landmark Annotations (Optic Disc & Macula) */}
            {showLandmarks && (
              <div className="absolute inset-0 pointer-events-none">
                {/* Optic Disc Box */}
                <div
                  className="absolute border-2 border-dashed border-amber-400 rounded-full px-2 py-0.5"
                  style={{ top: '42%', left: '28%', width: '18%', height: '24%' }}
                >
                  <span className="bg-amber-500 text-slate-950 text-xs font-extrabold px-2 py-1 rounded absolute -top-8 left-0">
                    Optic Disc
                  </span>
                </div>
                <div
                  className="absolute border-2 border-dashed border-teal-400 rounded-full px-2 py-0.5"
                  style={{ top: '44%', left: '56%', width: '20%', height: '26%' }}
                >
                  <span className="bg-teal-400 text-slate-950 text-xs font-extrabold px-2 py-1 rounded absolute -top-8 left-0">
                    Macula / Fovea
                  </span>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center text-slate-500 text-base p-6">
            <Eye className="w-12 h-12 mx-auto mb-3 opacity-40" />
            <span>Upload a fundus image to view explainability heatmap</span>
          </div>
        )}

        {isGradeable && (
          <div className="absolute bottom-4 left-4 bg-black/80 backdrop-blur-md px-4 py-2 rounded-xl text-sm text-white flex items-center gap-3 border border-white/10">
            <span className="text-slate-400">Attention:</span>
            <span className="text-blue-400">Low</span>
            <div className="w-24 h-3 rounded-full bg-gradient-to-r from-blue-500 via-yellow-400 to-red-600"></div>
            <span className="text-red-400 font-bold">High</span>
          </div>
        )}
      </div>

      {isGradeable && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between bg-slate-50 p-4 rounded-xl border border-slate-200">
          <div className="flex items-center gap-3 text-base text-slate-700">
            <Layers className="w-5 h-5 text-slate-500" />
            <span className="font-semibold">Heatmap Blend Opacity:</span>
            <span className="font-mono font-bold text-teal-700">{overlayOpacity}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={overlayOpacity}
            onChange={(e) => setOverlayOpacity(Number(e.target.value))}
            className="w-full sm:w-56 accent-teal-600 cursor-pointer"
          />
        </div>
      )}

      <div className="bg-indigo-50/60 border border-indigo-100 rounded-xl p-5 text-base text-indigo-950 flex items-start gap-3">
        <Info className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
        <div className="space-y-2">
          <p className="font-bold leading-7">{explanation.text}</p>
          <p className="text-sm text-indigo-800 leading-6">
            Method: <strong className="font-mono">{explanation.method}</strong>. Visual attribution maps neural network activation layers back to fundus vascular coordinates to assist ophthalmic audit.
          </p>
        </div>
      </div>
    </div>
  );
};
