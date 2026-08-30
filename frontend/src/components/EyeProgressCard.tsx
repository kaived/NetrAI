import React from 'react';
import { CheckCircle, CircleDashed, ClipboardList, RotateCcw } from 'lucide-react';
import type { CaseResult, EyeCode } from '../types';
import { displayText } from '../utils/display';

interface EyeProgressCardProps {
  result: CaseResult;
}

const EYES: Array<{ code: EyeCode; label: string }> = [
  { code: 'OD', label: 'Right Eye' },
  { code: 'OS', label: 'Left Eye' },
];

export const EyeProgressCard: React.FC<EyeProgressCardProps> = ({ result }) => {
  const completedEyes = result.completed_eyes ?? [];
  const currentEye = result.patient?.eye as EyeCode | undefined;
  const needsRecapture = !result.quality.is_gradeable;
  const caseId = displayText(result.case_id, 'Generated on server');

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 lg:p-7 shadow-sm space-y-6 h-full">
      <div className="flex items-start gap-3.5 border-b border-slate-100 pb-5">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-teal-50 text-teal-700 shrink-0 mt-0.5">
          <ClipboardList className="w-6 h-6" />
        </div>
        <div>
          <h3 className="text-xl sm:text-2xl font-bold text-slate-950 leading-tight">Two-Eye Screening Progress</h3>
          <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
            Final clinical report unlocks after both OD and OS are completed.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {EYES.map((eye) => {
          const isCompleted = completedEyes.includes(eye.code);
          const isCurrent = currentEye === eye.code;

          return (
            <div
              key={eye.code}
              className={`rounded-xl border p-5 ${
                isCompleted
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-950'
                  : isCurrent && needsRecapture
                  ? 'border-amber-200 bg-amber-50 text-amber-950'
                  : 'border-slate-200 bg-slate-50 text-slate-800'
              }`}
            >
              <div className="flex items-center gap-3">
                {isCompleted ? (
                  <CheckCircle className="w-6 h-6 text-emerald-600" />
                ) : isCurrent && needsRecapture ? (
                  <RotateCcw className="w-6 h-6 text-amber-600" />
                ) : (
                  <CircleDashed className="w-6 h-6 text-slate-400" />
                )}
                <div>
                  <div className="text-sm font-extrabold">{eye.code} {eye.label}</div>
                  <div className="text-xs font-semibold opacity-75">
                    {isCompleted ? 'Completed' : isCurrent && needsRecapture ? 'Recapture required' : 'Pending capture'}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
        <div className="text-xs font-bold uppercase tracking-wide text-slate-500">Current Case</div>
        <div className="mt-2 font-mono text-sm font-bold text-slate-900">{caseId}</div>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          {needsRecapture
            ? `${currentEye ?? 'This eye'} did not pass the quality gate. Recapture the same eye before moving ahead.`
            : result.next_eye
            ? `${currentEye ?? 'First eye'} is completed. Capture ${result.next_eye === 'OD' ? 'OD Right Eye' : 'OS Left Eye'} next using the same Case ID.`
            : 'Both eyes are complete. The final clinical report is ready.'}
        </p>
      </div>
    </div>
  );
};
