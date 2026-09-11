import React, { useState } from 'react';
import { Eye, Layers } from 'lucide-react';
import { resolveApiAssetUrl } from '../api';
import type { ExplanationResult } from '../types';
import { AuthenticatedImage } from './AuthenticatedImage';

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
  const [overlayOpacity, setOverlayOpacity] = useState(70);
  const heatmapSrc = resolveApiAssetUrl(explanation.heatmap_url);
  const hasHeatmap = Boolean(isGradeable && heatmapSrc);
  const effectiveOverlayOpacity = hasHeatmap ? Math.max(25, overlayOpacity) : overlayOpacity;

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 lg:p-7 shadow-sm space-y-5 h-full flex flex-col">
      <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-5">
        <div className="flex items-start gap-4 sm:gap-5 min-w-0">
          <div className="flex h-12 w-12 sm:h-13 sm:w-13 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-700 shrink-0 mt-0.5 shadow-2xs">
            <Eye className="w-6 h-6 sm:w-7 sm:h-7" />
          </div>
          <div className="space-y-1 sm:space-y-1.5 min-w-0">
            <h3 className="text-xl sm:text-2xl font-bold text-slate-950 leading-tight">Image-Based Attention Map</h3>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">Image contrast for visual review</p>
          </div>
        </div>
      </div>

      <div className="relative rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 aspect-[4/3] flex-1 min-h-[380px] flex items-center justify-center">
        {previewUrl ? (
          <div className="relative w-full h-full flex items-center justify-center">
            {/* Base Image */}
            <AuthenticatedImage
              src={previewUrl}
              alt="Base fundus scan"
              className="absolute inset-0 m-auto max-h-full max-w-full object-contain"
            />

            {hasHeatmap && (
              <AuthenticatedImage
                src={heatmapSrc ?? undefined}
                alt="Image-based attention heatmap"
                className="absolute inset-0 m-auto max-h-full max-w-full object-contain pointer-events-none transition-opacity"
                style={{ opacity: effectiveOverlayOpacity / 100 }}
              />
            )}

            {isGradeable && !heatmapSrc && (
              <div className="absolute bottom-5 right-5 max-w-xs rounded-xl border border-white/10 bg-black/75 px-4 py-3 text-sm text-slate-200 shadow-lg">
                No heatmap is available for this case.
              </div>
            )}
          </div>
        ) : (
          <div className="text-center text-slate-500 text-base p-6">
            <Eye className="w-12 h-12 mx-auto mb-3 opacity-40" />
            <span>No fundus image available</span>
          </div>
        )}

        {hasHeatmap && (
          <div className="absolute bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2 bg-black/85 backdrop-blur-md px-4 sm:px-5 py-2 sm:py-2.5 rounded-full text-xs sm:text-sm text-white flex items-center gap-2.5 sm:gap-3 border border-white/15 shadow-xl whitespace-nowrap z-10">
            <span className="flex items-center gap-1.5 leading-none">
              <span className="text-slate-300 font-medium">Contrast:</span>
              <span className="text-blue-400 font-semibold">Low</span>
            </span>
            <div
              className="w-20 sm:w-28 h-2 sm:h-2.5 rounded-full shrink-0"
              style={{ background: 'linear-gradient(90deg, #1d4ed8 0%, #38bdf8 24%, #facc15 56%, #fb923c 74%, #dc2626 100%)' }}
            ></div>
            <span className="text-rose-400 font-bold leading-none">High</span>
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
            <span className="font-bold text-teal-800 text-xs sm:text-sm">{effectiveOverlayOpacity}%</span>
          </div>
          <label htmlFor="heatmap-opacity-range" className="sr-only">
            Heatmap Blend Opacity
          </label>
          {(() => {
            const fillPercent = ((effectiveOverlayOpacity - 25) / 75) * 100;
            return (
              <input
                id="heatmap-opacity-range"
                name="overlayOpacity"
                type="range"
                min="25"
                max="100"
                value={effectiveOverlayOpacity}
                onChange={(e) => setOverlayOpacity(Number(e.target.value))}
                style={{
                  background: `linear-gradient(to right, #0f766e 0%, #0f766e ${fillPercent}%, #e2e8f0 ${fillPercent}%, #e2e8f0 100%)`
                }}
                className="w-full sm:w-56 h-2 rounded-lg appearance-none cursor-pointer accent-teal-700 outline-none"
              />
            );
          })()}
        </div>
      )}
    </div>
  );
};
