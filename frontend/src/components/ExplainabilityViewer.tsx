import React, { useState } from 'react';
import { Eye, Layers, Info, BrainCircuit } from 'lucide-react';
import { resolveApiAssetUrl } from '../api';
import type { ExplanationResult } from '../types';

interface ExplainabilityViewerProps {
  previewUrl: string | null;
  explanation: ExplanationResult;
  isGradeable: boolean;
}

export const ExplainabilityViewer: React.FC<ExplainabilityViewerProps> = ({
  previewUrl,
  explanation,
  isGradeable,
}) => {
  const [overlayOpacity, setOverlayOpacity] = useState(65);
  const heatmapSrc = resolveApiAssetUrl(explanation.heatmap_url);
  const hasHeatmap = Boolean(isGradeable && heatmapSrc);

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 lg:p-7 shadow-sm space-y-5 h-full flex flex-col justify-between">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-5">
        <div className="flex items-start gap-3.5 min-w-0">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700 shrink-0 mt-0.5">
            <BrainCircuit className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xl sm:text-2xl font-bold text-slate-950 leading-tight">Explainable AI & Attention Map</h3>
            <p className="text-xs sm:text-sm text-slate-600 mt-0.5">Grad-CAM style activation highlighting diagnostic retinal features</p>
          </div>
        </div>

        <div className="inline-flex items-center self-start sm:self-auto w-fit gap-1.5 shrink-0 rounded-lg border border-indigo-200/80 bg-indigo-50/80 px-3 py-1.5 text-xs font-bold text-indigo-700 whitespace-nowrap shadow-xs">
          <span className={`w-2 h-2 rounded-full ${hasHeatmap ? 'bg-indigo-500' : 'bg-slate-400'}`}></span>
          <span>{hasHeatmap ? 'Heatmap Generated' : 'Awaiting Heatmap'}</span>
        </div>
      </div>

      <div className="relative rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 aspect-[4/3] min-h-[420px] flex items-center justify-center">
        {previewUrl ? (
          <div className="relative w-full h-full flex items-center justify-center">
            {/* Base Image */}
            <img
              src={previewUrl}
              alt="Base fundus scan"
              className="absolute inset-0 m-auto max-h-full max-w-full object-contain"
            />

            {hasHeatmap && (
              <img
                src={heatmapSrc ?? undefined}
                alt="Backend-generated lesion attention heatmap"
                className="absolute inset-0 m-auto max-h-full max-w-full object-contain pointer-events-none mix-blend-screen transition-opacity"
                style={{ opacity: overlayOpacity / 100 }}
              />
            )}

            {isGradeable && !heatmapSrc && (
              <div className="absolute bottom-5 right-5 max-w-xs rounded-xl border border-white/10 bg-black/75 px-4 py-3 text-sm text-slate-200 shadow-lg">
                Heatmap was not returned by the backend for this case.
              </div>
            )}
          </div>
        ) : (
          <div className="text-center text-slate-500 text-base p-6">
            <Eye className="w-12 h-12 mx-auto mb-3 opacity-40" />
            <span>Upload a fundus image to view explainability heatmap</span>
          </div>
        )}

        {hasHeatmap && (
          <div className="absolute bottom-4 left-4 bg-black/80 backdrop-blur-md px-4 py-2 rounded-xl text-sm text-white flex items-center gap-3 border border-white/10">
            <span className="text-slate-400">Attention:</span>
            <span className="text-blue-400">Low</span>
            <div className="w-24 h-3 rounded-full bg-gradient-to-r from-blue-500 via-yellow-400 to-red-600"></div>
            <span className="text-red-400 font-bold">High</span>
          </div>
        )}
      </div>

      {hasHeatmap && (
        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between bg-slate-50 p-3.5 sm:p-4 rounded-xl border border-slate-200">
          <div className="flex items-center justify-between sm:justify-start gap-2.5 sm:gap-3 text-xs sm:text-sm font-semibold text-slate-700 whitespace-nowrap">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 sm:w-5 sm:h-5 text-slate-500 shrink-0" />
              <span>Heatmap Blend Opacity:</span>
            </div>
            <span className="font-mono font-bold text-teal-700 text-xs sm:text-sm">{overlayOpacity}%</span>
          </div>
          <label htmlFor="heatmap-opacity-range" className="sr-only">
            Heatmap Blend Opacity
          </label>
          <input
            id="heatmap-opacity-range"
            name="overlayOpacity"
            type="range"
            min="0"
            max="100"
            value={overlayOpacity}
            onChange={(e) => setOverlayOpacity(Number(e.target.value))}
            style={{
              background: `linear-gradient(to right, #0d9488 0%, #0d9488 ${overlayOpacity}%, #e2e8f0 ${overlayOpacity}%, #e2e8f0 100%)`
            }}
            className="w-full sm:w-56 h-2 rounded-lg appearance-none cursor-pointer accent-teal-600 outline-none"
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
