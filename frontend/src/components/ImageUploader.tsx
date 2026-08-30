import React, { useState, useRef } from 'react';
import {
  UploadCloud,
  RefreshCw,
  Play,
  RotateCcw,
  FileCheck,
  ChevronDown,
  AlertCircle,
  CheckCircle,
} from 'lucide-react';
import type { EyeCode, PatientInfo, ScreeningFormErrors } from '../types';

interface ImageUploaderProps {
  file: File | null;
  previewUrl: string | null;
  patientInfo: PatientInfo;
  isLoading: boolean;
  onFileChange: (file: File | null) => void;
  onPatientInfoChange: (info: PatientInfo) => void;
  onAnalyze: () => void;
  onReset: () => void;
  hasResult: boolean;
  caseId: string;
  validationErrors: ScreeningFormErrors;
  completedEyes: EyeCode[];
  nextEye: EyeCode | null;
  isCaseComplete: boolean;
  requiresRecapture: boolean;
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
  hasResult,
  caseId,
  validationErrors,
  completedEyes,
  nextEye,
  isCaseComplete,
  requiresRecapture,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const inputBaseClass = 'w-full h-10 px-3 text-xs sm:text-sm bg-white border rounded-lg outline-none focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500';
  const isDemographicsLocked = isLoading || completedEyes.length > 0;

  const getInputClass = (field: keyof ScreeningFormErrors, extra = '') => (
    `${inputBaseClass} ${
      validationErrors[field]
        ? 'border-rose-300 focus:ring-rose-500 focus:border-rose-500'
        : 'border-slate-200'
    } ${extra}`
  );

  const getDescribedBy = (field: keyof ScreeningFormErrors, helpId?: string) => (
    [helpId, validationErrors[field] ? `${field}-error` : null].filter(Boolean).join(' ') || undefined
  );

  const renderError = (field: keyof ScreeningFormErrors) => (
    validationErrors[field] ? (
      <p id={`${field}-error`} className="mt-1.5 text-xs font-semibold text-rose-700 flex items-center gap-1.5" role="alert">
        <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
        <span>{validationErrors[field]}</span>
      </p>
    ) : null
  );

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (isCaseComplete || isLoading) {
      return;
    }
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (isCaseComplete || isLoading) {
      return;
    }
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile && droppedFile.type.startsWith('image/')) {
      onFileChange(droppedFile);
    }
  };

  const handleDropzoneKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (isCaseComplete || isLoading) {
      return;
    }
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      fileInputRef.current?.click();
    }
  };

  const renderEyeButton = (eye: EyeCode, label: string, roundedClass: string) => {
    const isSelected = patientInfo.eye === eye;
    const isCompleted = completedEyes.includes(eye);
    const canSelectBeforeResult = !hasResult;
    const canSelectRequiredEye = hasResult && (nextEye ? nextEye === eye : isSelected);
    const isDisabled = isLoading || isCompleted || isCaseComplete || !(canSelectBeforeResult || canSelectRequiredEye);
    const lockedTitle = requiresRecapture
      ? `Recapture ${formatEyeLabel(nextEye ?? patientInfo.eye)} before selecting the other eye`
      : `Complete ${formatEyeLabel(nextEye ?? patientInfo.eye)} before selecting the other eye`;

    return (
      <button
        type="button"
        role="radio"
        aria-checked={isSelected}
        aria-disabled={isDisabled}
        onClick={() => {
          if (!isDisabled) {
            onPatientInfoChange({ ...patientInfo, eye });
          }
        }}
        disabled={isDisabled}
        className={`flex-1 px-3 text-xs sm:text-sm font-bold border transition-colors flex items-center justify-center gap-1.5 ${roundedClass} ${
          isCompleted
            ? 'bg-emerald-50 text-emerald-800 border-emerald-200 cursor-not-allowed'
            : isDisabled && !isSelected
            ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
            : isSelected
            ? 'bg-teal-600 text-white border-teal-600'
            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
        }`}
        title={isCompleted ? `${eye} screening completed` : isDisabled ? lockedTitle : `${eye} - ${label}`}
      >
        {isCompleted ? (
          <span className="inline-flex items-center justify-center gap-1.5 whitespace-nowrap">
            <span>{eye} Done</span>
            <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          </span>
        ) : (
          label
        )}
      </button>
    );
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 lg:p-8 shadow-sm space-y-4 lg:space-y-6">
      {/* Panel Header */}
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3 lg:gap-4 border-b border-slate-100 pb-3 lg:pb-4">
        <div className="flex items-start gap-3 sm:gap-4 min-w-0">
          <div className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-xl sm:rounded-2xl bg-teal-50 text-teal-700 shrink-0 mt-0.5 shadow-2xs">
            <UploadCloud className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div className="space-y-0.5 sm:space-y-1 min-w-0 flex-1">
            <h2 className="text-lg sm:text-2xl font-bold text-slate-900 leading-tight">Patient Intake & Retinal Scan Acquisition</h2>
            <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">Enter case information and load digital fundus photograph for automated screening.</p>
          </div>
        </div>
        {(file || previewUrl || hasResult) && (
          <button
            onClick={onReset}
            disabled={isLoading}
            className="inline-flex items-center justify-center gap-2 text-sm font-bold text-white transition-all px-4 py-2.5 min-h-[40px] rounded-xl bg-teal-700 hover:bg-teal-800 active:bg-teal-900 shadow-sm border border-teal-700 shrink-0 w-full sm:w-auto self-start lg:self-auto mt-1 sm:mt-1.5 lg:mt-0.5"
            title={hasResult ? 'Clear this case and begin another screening' : 'Clear selected image and patient details'}
          >
            <RotateCcw className="w-4 h-4 text-white" />
            <span>{hasResult ? 'New Screening' : 'Reset'}</span>
          </button>
        )}
      </div>

      {/* Main Horizontal Grid: Left Controls + Right Preview & Action */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
        {/* Left Column (Patient Metadata) */}
        <div className="flex flex-col h-full">
          {/* Patient Metadata Grid */}
          <div className="h-full bg-slate-50/70 p-5 sm:p-6 rounded-2xl border border-slate-200 flex flex-col justify-center">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="case-id" className="block text-xs font-semibold text-slate-600 mb-1.5">
                  Case ID
                </label>
                <input
                  id="case-id"
                  name="caseId"
                  type="text"
                  value={caseId}
                  readOnly
                  aria-readonly="true"
                  aria-invalid={Boolean(validationErrors.caseId)}
                  aria-describedby={getDescribedBy('caseId')}
                  className="w-full h-10 px-3 text-xs sm:text-sm bg-slate-100 border border-slate-200 rounded-lg outline-none focus:outline-none focus:ring-0 focus:border-slate-200 font-mono text-slate-700 cursor-default"
                  title={caseId}
                />
                {renderError('caseId')}
              </div>
              <div>
                <label htmlFor="patient-age" className="block text-xs font-semibold text-slate-600 mb-1.5">
                  Patient Age
                </label>
                <input
                  id="patient-age"
                  name="patientAge"
                  type="text"
                  value={patientInfo.patientAge}
                  onChange={(e) => onPatientInfoChange({ ...patientInfo, patientAge: e.target.value })}
                  placeholder="Enter Patient Age"
                  disabled={isDemographicsLocked}
                  autoComplete="off"
                  inputMode="numeric"
                  spellCheck={false}
                  aria-invalid={Boolean(validationErrors.patientAge)}
                  aria-describedby={getDescribedBy('patientAge')}
                  className={getInputClass('patientAge')}
                />
                {renderError('patientAge')}
              </div>
              <div>
                <label htmlFor="diabetes-type" className="block text-xs font-semibold text-slate-600 mb-1.5">
                  Diabetes Type
                </label>
                <div className="relative">
                  <select
                    id="diabetes-type"
                    name="diabetesType"
                    value={patientInfo.diabetesType}
                    onChange={(e) => onPatientInfoChange({ ...patientInfo, diabetesType: e.target.value })}
                    disabled={isDemographicsLocked}
                    aria-invalid={Boolean(validationErrors.diabetesType)}
                    aria-describedby={getDescribedBy('diabetesType')}
                    className={getInputClass('diabetesType', `appearance-none pr-9 cursor-pointer ${!patientInfo.diabetesType ? 'text-slate-400' : 'text-slate-800 font-medium'}`)}
                  >
                    <option value="" disabled hidden>Select Diabetes Type</option>
                    <option value="Type 1 Diabetes" className="text-slate-800">Type 1 Diabetes</option>
                    <option value="Type 2 Diabetes" className="text-slate-800">Type 2 Diabetes</option>
                    <option value="Gestational Diabetes" className="text-slate-800">Gestational Diabetes</option>
                    <option value="Pre-Diabetes" className="text-slate-800">Pre-Diabetes / Impaired FBG</option>
                    <option value="Secondary / Other" className="text-slate-800">Secondary / Other</option>
                  </select>
                  <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
                {renderError('diabetesType')}
              </div>
              <div>
                <label htmlFor="diabetic-duration" className="block text-xs font-semibold text-slate-600 mb-1.5">
                  Years Since Diagnosis
                </label>
                <input
                  id="diabetic-duration"
                  name="diabeticDuration"
                  type="text"
                  value={patientInfo.diabeticDuration}
                  onChange={(e) => onPatientInfoChange({ ...patientInfo, diabeticDuration: e.target.value })}
                  placeholder="Enter Years Since Diagnosis"
                  disabled={isDemographicsLocked}
                  autoComplete="off"
                  inputMode="decimal"
                  spellCheck={false}
                  aria-invalid={Boolean(validationErrors.diabeticDuration)}
                  aria-describedby={getDescribedBy('diabeticDuration')}
                  className={getInputClass('diabeticDuration')}
                />
                {renderError('diabeticDuration')}
              </div>
              <div className="col-span-1 sm:col-span-2 w-full">
                <span id="eye-examined-label" className="block text-xs font-semibold text-slate-600 mb-1.5">
                  Eye Examined
                </span>
                <div
                  id="eye-examined-group"
                  role="radiogroup"
                  aria-labelledby="eye-examined-label"
                  className="flex rounded-lg shadow-xs h-10 w-full"
                >
                  {renderEyeButton('OD', 'OD (Right)', 'rounded-l-lg')}
                  {renderEyeButton('OS', 'OS (Left)', 'rounded-r-lg border-l-0')}
                </div>
                {renderError('eye')}
                <p className="text-xs sm:text-sm text-slate-600 mt-1.5 leading-relaxed w-full">
                {isCaseComplete ? (
                  <span>
                    <strong className="font-bold text-emerald-800">Both eyes completed.</strong> Start a new screening for the next case.
                  </span>
                  ) : requiresRecapture ? (
                    <span>
                      <strong className="font-bold text-rose-800">Recapture required:</strong> {formatEyeLabel(patientInfo.eye)} must pass the quality gate before moving to the other eye.
                    </span>
                  ) : nextEye ? (
                    <span>
                      <strong className="font-bold text-slate-800">Next capture:</strong> {formatEyeLabel(nextEye)}.
                    </span>
                  ) : (
                    <span>
                      <strong className="font-bold text-slate-800">Note:</strong> OD = Oculus Dexter (Right Eye), OS = Oculus Sinister (Left Eye)
                    </span>
                  )}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column (Dropzone/Preview + Action Button directly below it) */}
        <div className="flex flex-col gap-3 h-full">
          <label htmlFor="fundus-file-input" className="sr-only">
            Upload Retinal Fundus Photograph
          </label>
          <input
            id="fundus-file-input"
            name="fundusFileInput"
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/jpg,image/webp"
            className="hidden"
            disabled={isLoading || isCaseComplete}
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
              onClick={() => {
                if (!isCaseComplete) {
                  fileInputRef.current?.click();
                }
              }}
              onKeyDown={handleDropzoneKeyDown}
              role="button"
              tabIndex={0}
              aria-invalid={Boolean(validationErrors.image)}
              aria-describedby={getDescribedBy('image', 'fundus-file-help')}
              className={`flex-1 border-2 border-dashed rounded-2xl p-5 text-center cursor-pointer transition-all flex flex-col items-center justify-center min-h-[200px] ${
                isCaseComplete
                  ? 'border-slate-200 bg-slate-100/70 cursor-not-allowed opacity-80'
                  : isDragOver
                  ? 'border-teal-500 bg-teal-50/50 scale-[0.99]'
                  : validationErrors.image
                  ? 'border-rose-400 bg-rose-50/30 hover:bg-rose-50/50'
                  : 'border-slate-300 bg-slate-50/50 hover:bg-slate-100/60 hover:border-slate-400'
              }`}
            >
              <div className="w-12 h-12 rounded-full bg-teal-100/70 text-teal-700 flex items-center justify-center mb-2.5 shadow-inner">
                <UploadCloud className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-slate-900">
                Drag and drop fundus photograph here
              </h4>
              <p id="fundus-file-help" className="text-xs text-slate-500 mt-1 max-w-xs leading-relaxed">
                Supports fundus photograph captures (PNG, JPEG, WebP). Max 20MB.
              </p>
              <button
                type="button"
                disabled={isCaseComplete}
                className={`mt-3 px-3.5 py-1.5 text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5 ${
                  isCaseComplete
                    ? 'text-teal-800 bg-teal-50 border border-teal-200 cursor-default shadow-2xs'
                    : 'text-teal-700 bg-white border border-teal-200 shadow-xs hover:bg-teal-50'
                }`}
              >
                {isCaseComplete ? (
                  <>
                    <span>Completed</span>
                    <CheckCircle className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                  </>
                ) : (
                  'Select Fundus Image'
                )}
              </button>
              {renderError('image')}
            </div>
          ) : (
            <div className="flex-1 relative rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 min-h-[200px] flex items-center justify-center p-2">
              <img
                src={previewUrl}
                alt="Selected Retinal Fundus"
                className="max-h-[220px] max-w-full object-contain"
              />

              {/* Change Image Button */}
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isLoading || isCaseComplete}
                className="absolute top-3 right-3 bg-black/70 backdrop-blur-md hover:bg-black/90 text-white text-xs px-2.5 py-1 rounded-lg border border-white/20 transition-all flex items-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Change
              </button>
            </div>
          )}

          {/* Primary Action Button directly under Photograph Select */}
          <button
            onClick={onAnalyze}
            disabled={!file || isLoading || isCaseComplete || completedEyes.includes(patientInfo.eye)}
            className={`w-full min-h-[46px] py-2.5 px-3 sm:px-4 rounded-xl font-bold text-xs sm:text-sm shadow-md flex items-center justify-center gap-2 transition-all shrink-0 ${
              !file || isLoading || isCaseComplete || completedEyes.includes(patientInfo.eye)
                ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                : 'bg-gradient-to-r from-teal-700 via-teal-600 to-teal-700 text-white hover:from-teal-800 hover:to-teal-800 active:scale-[0.99] shadow-teal-700/20'
            }`}
          >
            {isLoading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin shrink-0" />
                <span className="whitespace-nowrap">Processing Fundus Scan...</span>
              </>
            ) : isCaseComplete ? (
              <>
                <FileCheck className="w-4 h-4 shrink-0" />
                <span className="whitespace-nowrap">Both Eyes Completed</span>
              </>
            ) : !file && hasResult ? (
              <>
                <FileCheck className="w-4 h-4 shrink-0" />
                <span className="whitespace-nowrap">
                  {requiresRecapture
                    ? `Select ${patientInfo.eye} Image to Recapture`
                    : nextEye
                    ? `Select ${nextEye} Image to Continue`
                    : 'Saved Screening Report Restored'}
                </span>
              </>
            ) : !file ? (
              <>
                <UploadCloud className="w-4 h-4 shrink-0" />
                <span className="whitespace-nowrap">Select Fundus Image to Start</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-current shrink-0" />
                <span className="whitespace-nowrap">Run Complete Screening Analysis</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

function formatEyeLabel(eye: EyeCode): string {
  return eye === 'OD' ? 'OD Right Eye' : 'OS Left Eye';
}
