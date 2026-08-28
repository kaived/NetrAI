import React from 'react';
import { ShieldCheck, Cpu, GitCommit, FileCheck, Layers } from 'lucide-react';
import type { CaseResult } from '../types';

interface PipelineFlowProps {
  isLoading: boolean;
  result: CaseResult | null;
}

export const PipelineFlow: React.FC<PipelineFlowProps> = ({ isLoading, result }) => {
  const steps = [
    {
      id: 'quality',
      title: 'Image Quality Gate',
      desc: 'Focus & Illumination',
      icon: ShieldCheck,
      status: !result && !isLoading ? 'pending' : isLoading ? 'processing' : result?.quality.is_gradeable ? 'success' : 'failed',
    },
    {
      id: 'preprocess',
      title: 'Preprocessing',
      desc: 'Crop & Green Filter',
      icon: Layers,
      status: !result && !isLoading ? 'pending' : isLoading ? 'processing' : result?.quality.is_gradeable ? 'success' : 'skipped',
    },
    {
      id: 'model',
      title: 'DR Classification',
      desc: 'ONNX Deep Net',
      icon: Cpu,
      status: !result && !isLoading ? 'pending' : isLoading ? 'processing' : result?.prediction.icdr_grade !== null ? 'success' : 'skipped',
    },
    {
      id: 'decision',
      title: 'Referral Triage',
      desc: 'ICDR Grade 0-4',
      icon: GitCommit,
      status: !result && !isLoading ? 'pending' : isLoading ? 'processing' : result?.prediction.referable_dr ? 'warning' : 'success',
    },
    {
      id: 'report',
      title: 'Clinical Report',
      desc: 'Explainable Summary',
      icon: FileCheck,
      status: !result && !isLoading ? 'pending' : isLoading ? 'processing' : 'success',
    },
  ];

  const getStatusBadge = () => {
    if (isLoading) {
      return (
        <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-teal-50 text-teal-700 border border-teal-200 shadow-xs">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-teal-600"></span>
          </span>
          <span>Status: Processing Pipeline (5 Stages Active)</span>
        </span>
      );
    }
    if (result) {
      const isPass = result.quality.is_gradeable;
      return (
        <span
          className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold ${
            isPass
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              : 'bg-amber-50 text-amber-700 border border-amber-200'
          } shadow-xs`}
        >
          <span className={`h-2 w-2 rounded-full ${isPass ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
          <span>{isPass ? 'Status: Complete (5/5 Stages)' : 'Status: Quality Gate Flagged (1/5 Stages)'}</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200 shadow-xs">
        <span className="h-2 w-2 rounded-full bg-slate-400"></span>
        <span>Status: Standby (0/5 Stages)</span>
      </span>
    );
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm no-print">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-5">
        <h3 className="text-base font-extrabold uppercase tracking-wide text-slate-700">
          RetinaScan Automated Screening Pipeline
        </h3>
        {getStatusBadge()}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {steps.map((step) => {
          const Icon = step.icon;
          let badgeBg = 'bg-slate-50 text-slate-600 border-slate-200';
          let iconColor = 'text-slate-400';

          if (step.status === 'processing') {
            badgeBg = 'bg-teal-50 text-teal-800 border-teal-300 ring-2 ring-teal-400/30 animate-pulse';
            iconColor = 'text-teal-600';
          } else if (step.status === 'success') {
            badgeBg = 'bg-emerald-50 text-emerald-800 border-emerald-300';
            iconColor = 'text-emerald-600';
          } else if (step.status === 'warning') {
            badgeBg = 'bg-rose-50 text-rose-800 border-rose-300';
            iconColor = 'text-rose-600';
          } else if (step.status === 'failed') {
            badgeBg = 'bg-red-50 text-red-800 border-red-300';
            iconColor = 'text-red-600';
          } else if (step.status === 'skipped') {
            badgeBg = 'bg-slate-100 text-slate-400 border-slate-200 opacity-60';
            iconColor = 'text-slate-300';
          }

          return (
            <div
              key={step.id}
              className={`flex min-h-[92px] items-center gap-4 p-4 rounded-xl border text-left transition-all ${badgeBg}`}
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white shadow-sm border border-inherit shrink-0">
                <Icon className={`w-6 h-6 ${iconColor}`} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-base font-bold leading-tight text-slate-900">
                    {step.title}
                  </span>
                </div>
                <p className="text-sm text-slate-500 leading-5 mt-1">
                  {step.desc}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
