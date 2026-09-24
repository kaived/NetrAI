import React from 'react';
import {
  ArrowRight,
  Bluetooth,
  Cable,
  Camera,
  CheckCircle2,
  ClipboardCheck,
  Computer,
  Eye,
  FileCheck2,
  FileImage,
  Hospital,
  ShieldCheck,
  UploadCloud,
  Wifi,
  WifiOff,
} from 'lucide-react';
import type { OfflineQueueSummary } from '../types';
import { LandingWorkflowVisualizer } from './LandingWorkflowVisualizer';
import { BlinkingEyesPair } from './BlinkingEyesPair';

type LandingPageProps = {
  isOnline: boolean;
  offlineQueue: OfflineQueueSummary;
  onStartScreening: () => void;
  onOpenHardwareWorkflow: () => void;
  onOpenGuide: () => void;
};

export const LandingPage: React.FC<LandingPageProps> = ({
  isOnline,
  offlineQueue,
  onStartScreening,
  onOpenHardwareWorkflow,
  onOpenGuide,
}) => {
  const pendingCount = offlineQueue.pending + offlineQueue.failed;

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* Main workspace card — refera-style white panel on gray canvas */}
      <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
        <div className="border-b border-slate-100 px-5 py-5 sm:px-8 sm:py-6 lg:px-10">
          <div className="flex items-start justify-between gap-4 sm:gap-6">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-slate-400">Retinal screening workspace</p>
              <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl lg:text-[2rem]">
                Protect sight with faster retinal screening
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-500 sm:text-[15px]">
                Load fundus photos from field cameras, screen both eyes, and produce a clear referral report that helps patients reach care earlier.
              </p>
            </div>
            <BlinkingEyesPair />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1.05fr_1fr] xl:grid-cols-[1.1fr_1fr] gap-0 lg:gap-0">
          {/* Left: actions + outcomes */}
          <div className="space-y-6 border-b border-slate-100 px-5 py-6 sm:px-8 sm:py-7 lg:border-b-0 lg:border-r lg:px-10 lg:py-8">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-md bg-mint-soft px-2.5 py-1 text-xs font-semibold text-forest">
                <Eye className="h-3.5 w-3.5" />
                PHC & eye-care teams
              </span>
              <span
                className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold ${
                  isOnline
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'bg-amber-50 text-amber-700'
                }`}
              >
                {isOnline ? 'Cloud online' : 'Offline mode'}
              </span>
              {pendingCount > 0 && (
                <span className="inline-flex items-center rounded-md bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800">
                  {pendingCount} case{pendingCount === 1 ? '' : 's'} waiting to sync
                </span>
              )}
            </div>

            <div className="flex flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:items-center">
              <button
                type="button"
                onClick={onStartScreening}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-mint px-5 py-2.5 text-sm font-semibold text-forest shadow-sm transition-colors hover:bg-mint-strong"
              >
                <Eye className="h-4 w-4" />
                Start Screening
                <ArrowRight className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={onOpenGuide}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-mint-strong/50 bg-white px-4 py-2.5 text-sm font-semibold text-forest transition-colors hover:bg-mint-soft/60"
              >
                <ClipboardCheck className="h-4 w-4" />
                View Clinical Protocol
              </button>
              <button
                type="button"
                onClick={onOpenHardwareWorkflow}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50"
              >
                <Camera className="h-4 w-4 text-forest" />
                Camera Workflow
              </button>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <OutcomeChip
                icon={<ShieldCheck className="h-4 w-4" />}
                title="Find referral cases sooner"
                copy="Flag patients who need ophthalmologist review earlier."
              />
              <OutcomeChip
                icon={<WifiOff className="h-4 w-4" />}
                title="Works during field camps"
                copy="Continue screening offline; sync cases later."
              />
              <OutcomeChip
                icon={<FileCheck2 className="h-4 w-4" />}
                title="One report for both eyes"
                copy="OD and OS results stay together for handoff."
              />
              <OutcomeChip
                icon={<Hospital className="h-4 w-4" />}
                title="Fits PHC and hospital flow"
                copy="USB, Bluetooth, Wi-Fi, or gallery import."
              />
            </div>
          </div>

          {/* Right: process visualizer (like dental chart panel) */}
          <div className="bg-slate-50/70 px-4 py-5 sm:px-6 sm:py-6 lg:px-7 lg:py-7">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-slate-800">How screening works</h2>
              <span className="text-xs font-medium text-slate-400">Live preview</span>
            </div>
            <LandingWorkflowVisualizer />
          </div>
        </div>
      </section>

      {/* Technician workflow strip */}
      <section className="rounded-2xl border border-slate-200/80 bg-white px-5 py-5 shadow-[0_1px_3px_rgba(15,23,42,0.04)] sm:px-8 sm:py-6 lg:px-10">
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[0.85fr_1.15fr] lg:items-center">
          <div className="space-y-1.5">
            <h2 className="text-lg font-bold text-slate-900">How a technician uses it</h2>
            <p className="max-w-md text-sm leading-relaxed text-slate-500">
              Start with patient intake, import fundus photos from the camera workflow, screen both eyes, and keep a clear queue for offline cases.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
            <WorkflowStep icon={<UploadCloud className="h-4 w-4" />} title="Load Photo" copy="Import OD or OS fundus image." />
            <WorkflowStep icon={<Eye className="h-4 w-4" />} title="Screen Eyes" copy="Complete both eye captures." />
            <WorkflowStep icon={<CheckCircle2 className="h-4 w-4" />} title="Share Report" copy="Review, print, or sync later." />
          </div>
        </div>
      </section>

      {/* Camera workflow */}
      <section className="rounded-2xl border border-slate-200/80 bg-white px-5 py-6 shadow-[0_1px_3px_rgba(15,23,42,0.04)] sm:px-8 sm:py-7 lg:px-10">
        <div className="space-y-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="max-w-2xl space-y-2">
              <span className="inline-flex items-center gap-1.5 rounded-md bg-mint-soft px-2.5 py-1 text-xs font-semibold text-forest">
                <Camera className="h-3.5 w-3.5" />
                Fundus camera workflow
              </span>
              <h2 className="text-xl font-bold text-slate-900">Capture on the fundus camera. Screen in NetrAI.</h2>
              <p className="text-sm leading-relaxed text-slate-500">
                NetrAI does not use the phone camera for retinal capture. Import the exported fundus photo from a portable or hospital fundus camera, then complete screening in the app.
              </p>
            </div>
            <button
              type="button"
              onClick={onOpenHardwareWorkflow}
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-mint px-4 py-2.5 text-sm font-semibold text-forest shadow-sm transition-colors hover:bg-mint-strong"
            >
              <Camera className="h-4 w-4" />
              Open Camera Workflow
            </button>
          </div>

          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
            <HardwareStep
              icon={<Camera className="h-4 w-4" />}
              title="Portable fundus camera"
              copy="For PHC camps and field visits where the camera exports retinal photos to phone or tablet."
            />
            <HardwareStep
              icon={<Computer className="h-4 w-4" />}
              title="Hospital fundus camera"
              copy="For eye hospitals using tabletop systems that export images from a desktop workflow."
            />
            <HardwareStep
              icon={<Cable className="h-4 w-4" />}
              title="USB cable"
              copy="Copy the exported retinal image from camera, phone, tablet, or hospital computer."
            />
            <HardwareStep
              icon={<Bluetooth className="h-4 w-4" />}
              title="Bluetooth"
              copy="Receive supported image exports when the camera or capture phone allows Bluetooth sharing."
            />
            <HardwareStep
              icon={<Wifi className="h-4 w-4" />}
              title="Wi-Fi or hotspot"
              copy="Import images through camera hotspot, Wi-Fi Direct, local sharing, or device gallery."
            />
            <HardwareStep
              icon={<FileImage className="h-4 w-4" />}
              title="SD card or gallery"
              copy="Load saved JPG or PNG fundus photos after transfer from memory card or file manager."
            />
          </div>
        </div>
      </section>
    </div>
  );
};

type OutcomeCardProps = {
  icon: React.ReactNode;
  title: string;
  copy: string;
};

const OutcomeChip: React.FC<OutcomeCardProps> = ({ icon, title, copy }) => (
  <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3.5 transition-colors hover:border-mint-strong/40 hover:bg-mint-soft/30">
    <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-lg bg-mint-soft text-forest">
      {icon}
    </div>
    <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
    <p className="mt-1 text-xs leading-relaxed text-slate-500">{copy}</p>
  </div>
);

const WorkflowStep: React.FC<OutcomeCardProps> = ({ icon, title, copy }) => (
  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5">
    <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-lg bg-white text-forest shadow-sm">
      {icon}
    </div>
    <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
    <p className="mt-0.5 text-xs leading-relaxed text-slate-500">{copy}</p>
  </div>
);

const HardwareStep: React.FC<OutcomeCardProps> = ({ icon, title, copy }) => (
  <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 transition-colors hover:bg-white">
    <div className="mb-2.5 flex h-9 w-9 items-center justify-center rounded-lg bg-white text-forest shadow-sm">
      {icon}
    </div>
    <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
    <p className="mt-1.5 text-xs leading-relaxed text-slate-500">{copy}</p>
  </div>
);
