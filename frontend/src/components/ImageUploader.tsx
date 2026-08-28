import React, { useState, useRef } from 'react';
import {
  UploadCloud,
  RefreshCw,
  Play,
  RotateCcw,
} from 'lucide-react';
import type { PatientInfo } from '../types';

interface ImageUploaderProps {
  file: File | null;
  previewUrl: string | null;
  patientInfo: PatientInfo;
  isLoading: boolean;
  onFileChange: (file: File | null) => void;
  onPatientInfoChange: (info: PatientInfo) => void;
  onAnalyze: () => void;
  onReset: () => void;
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({
  file,
  previewUrl,
  patientInfo,
  isLoading,
  onFileChange,
  onPatientInfoChange,
  onAnalyze,
  onReset,
}) => {
  const [filterMode, setFilterMode] = useState<'normal' | 'green' | 'clahe' | 'inverted'>('normal');
  const [zoomLevel, setZoomLevel] = useState<1 | 1.5 | 2>(1);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile && droppedFile.type.startsWith('image/')) {
      onFileChange(droppedFile);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 lg:p-8 shadow-sm space-y-6">
      {/* Panel Header */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        <div className="flex items-center gap-3.5">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
            <UploadCloud className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">Patient Intake & Retinal Scan Acquisition</h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">Enter case information and load standard 45°/50° digital fundus photograph for automated screening.</p>
          </div>
        </div>
        {file && (
          <button
            onClick={onReset}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-slate-500 hover:text-slate-800 transition-colors px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50"
          >
            <RotateCcw className="w-4 h-4" />
            Reset
          </button>
        )}
      </div>

      {/* Main Horizontal Grid: Left Controls + Right Preview & Action */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
        {/* Left Column (Patient Metadata) */}
        <div className="flex flex-col h-full">
          {/* Patient Metadata 2x2 Grid */}
          <div className="h-full bg-slate-50/70 p-5 sm:p-6 rounded-2xl border border-slate-200 flex flex-col justify-center">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  Patient / Case ID
                </label>
                <input
                  type="text"
                  value={patientInfo.patientId}
                  onChange={(e) => onPatientInfoChange({ ...patientInfo, patientId: e.target.value })}
                  placeholder="e.g. PHC-WB-0412"
                  disabled={isLoading}
                  className="w-full h-10 px-3 text-xs sm:text-sm bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  PHC Center Code
                </label>
                <input
                  type="text"
                  value={patientInfo.phcCenter}
                  onChange={(e) => onPatientInfoChange({ ...patientInfo, phcCenter: e.target.value })}
                  placeholder="e.g. PHC-BISHNUPUR-01"
                  disabled={isLoading}
                  className="w-full h-10 px-3 text-xs sm:text-sm bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  Patient Age / History
                </label>
                <input
                  type="text"
                  value={patientInfo.patientAge}
                  onChange={(e) => onPatientInfoChange({ ...patientInfo, patientAge: e.target.value })}
                  placeholder="e.g. 54y (Type 2 DM, 8 yrs)"
                  disabled={isLoading}
                  className="w-full h-10 px-3 text-xs sm:text-sm bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  Eye Examined
                </label>
                <div className="flex rounded-lg shadow-xs h-10" role="group">
                  <button
                    type="button"
                    onClick={() => onPatientInfoChange({ ...patientInfo, eye: 'OD' })}
                    disabled={isLoading}
                    className={`flex-1 px-3 text-xs sm:text-sm font-bold rounded-l-lg border ${
                      patientInfo.eye === 'OD'
                        ? 'bg-teal-600 text-white border-teal-600'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                    title="OD - Right Eye (Oculus Dexter)"
                  >
                    OD Right
                  </button>
                  <button
                    type="button"
                    onClick={() => onPatientInfoChange({ ...patientInfo, eye: 'OS' })}
                    disabled={isLoading}
                    className={`flex-1 px-3 text-xs sm:text-sm font-bold rounded-r-lg border-t border-b border-r ${
                      patientInfo.eye === 'OS'
                        ? 'bg-teal-600 text-white border-teal-600'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                    title="OS - Left Eye (Oculus Sinister)"
                  >
                    OS Left
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column (Dropzone/Preview + Action Button directly below it) */}
        <div className="flex flex-col gap-3 h-full">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/jpg,image/webp"
            className="hidden"
            onChange={(e) => {
              const selected = e.target.files?.[0];
              if (selected) onFileChange(selected);
            }}
          />

          {!previewUrl ? (
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`flex-1 border-2 border-dashed rounded-2xl p-5 text-center cursor-pointer transition-all flex flex-col items-center justify-center min-h-[200px] ${
                isDragOver
                  ? 'border-teal-500 bg-teal-50/50 scale-[0.99]'
                  : 'border-slate-300 bg-slate-50/50 hover:bg-slate-100/60 hover:border-slate-400'
              }`}
            >
              <div className="w-12 h-12 rounded-full bg-teal-100/70 text-teal-700 flex items-center justify-center mb-2.5 shadow-inner">
                <UploadCloud className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-slate-900">
                Drag and drop fundus photograph here
              </h4>
              <p className="text-xs text-slate-500 mt-1 max-w-xs leading-relaxed">
                Supports standard 45° / 50° captures (PNG, JPEG).
              </p>
              <button
                type="button"
                className="mt-3 px-3.5 py-1.5 text-xs font-bold text-teal-700 bg-white border border-teal-200 rounded-lg shadow-xs hover:bg-teal-50 transition-colors"
              >
                Select Fundus Image
              </button>
            </div>
          ) : (
            <div className="flex-1 relative rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 min-h-[200px] flex items-center justify-center">
              <img
                src={previewUrl}
                alt="Selected Retinal Fundus"
                className={`max-h-[200px] max-w-full object-contain transition-all duration-200 ${
                  filterMode === 'green'
                    ? 'filter-green-channel'
                    : filterMode === 'clahe'
                    ? 'filter-clahe-sim'
                    : filterMode === 'inverted'
                    ? 'filter-inverted'
                    : ''
                }`}
                style={{ transform: `scale(${zoomLevel})` }}
              />

              {/* Top Viewport Badge */}
              <div className="absolute top-3 left-3 bg-black/70 backdrop-blur-md px-2.5 py-1 rounded-lg text-xs text-white font-mono flex items-center gap-2 border border-white/10 max-w-[70%]">
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                <span className="truncate">{file?.name || 'fundus_scan.png'}</span>
              </div>

              {/* Change Image Button */}
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isLoading}
                className="absolute top-3 right-3 bg-black/70 backdrop-blur-md hover:bg-black/90 text-white text-xs px-2.5 py-1 rounded-lg border border-white/20 transition-all flex items-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Change
              </button>

              {/* Bottom Inspection Toolbar */}
              <div className="absolute bottom-2.5 inset-x-2.5 flex flex-wrap items-center justify-between gap-2 bg-black/75 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/15 text-white">
                <div className="flex items-center gap-1 text-xs">
                  <span className="text-[11px] text-slate-300 mr-1 hidden sm:inline">Filter:</span>
                  <button
                    onClick={() => setFilterMode('normal')}
                    className={`px-2 py-0.5 rounded text-xs font-semibold transition-all ${
                      filterMode === 'normal' ? 'bg-teal-500 text-white' : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    Color
                  </button>
                  <button
                    onClick={() => setFilterMode('green')}
                    className={`px-2 py-0.5 rounded text-xs font-semibold transition-all ${
                      filterMode === 'green' ? 'bg-emerald-500 text-white' : 'text-slate-300 hover:text-white'
                    }`}
                    title="Green-channel enhancement"
                  >
                    Green
                  </button>
                  <button
                    onClick={() => setFilterMode('clahe')}
                    className={`px-2 py-0.5 rounded text-xs font-semibold transition-all ${
                      filterMode === 'clahe' ? 'bg-amber-500 text-white' : 'text-slate-300 hover:text-white'
                    }`}
                    title="CLAHE Contrast"
                  >
                    CLAHE
                  </button>
                  <button
                    onClick={() => setFilterMode('inverted')}
                    className={`px-2 py-0.5 rounded text-xs font-semibold transition-all ${
                      filterMode === 'inverted' ? 'bg-indigo-500 text-white' : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    Invert
                  </button>
                </div>

                <div className="flex items-center gap-1 text-xs">
                  {([1, 1.5, 2] as const).map((lvl) => (
                    <button
                      key={lvl}
                      onClick={() => setZoomLevel(lvl)}
                      className={`px-2 py-0.5 rounded text-xs font-semibold ${
                        zoomLevel === lvl ? 'bg-white/30 text-white' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {lvl}x
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Primary Action Button directly under Photograph Select */}
          <button
            onClick={onAnalyze}
            disabled={!file || isLoading}
            className={`w-full min-h-[46px] py-2.5 px-4 rounded-xl font-bold text-sm shadow-md flex items-center justify-center gap-2 transition-all shrink-0 ${
              !file || isLoading
                ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                : 'bg-gradient-to-r from-teal-700 via-teal-600 to-teal-700 text-white hover:from-teal-800 hover:to-teal-800 active:scale-[0.99] shadow-teal-700/20'
            }`}
          >
            {isLoading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Processing Fundus Scan...</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-current" />
                <span>Run Complete Screening Analysis</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
