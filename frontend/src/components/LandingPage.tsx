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

type LandingPageProps = {
  isOnline: boolean;
  offlineQueue: OfflineQueueSummary;
  onStartScreening: () => void;
  onOpenGuide: () => void;
};

export const LandingPage: React.FC<LandingPageProps> = ({
  isOnline,
  offlineQueue,
  onStartScreening,
  onOpenGuide,
}) => {
  const pendingCount = offlineQueue.pending + offlineQueue.failed;

  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-3.5 sm:p-8 lg:p-12 shadow-sm">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.1fr] xl:grid-cols-[1fr_1.15fr] gap-6 lg:gap-12 items-center">
          {/* Left Column: Heading, Subtext, Buttons */}
          <div className="space-y-4 sm:space-y-6">
            <div className="inline-flex items-center gap-1.5 sm:gap-2 rounded-full border border-teal-200 bg-teal-50 px-3 py-1 sm:px-3.5 sm:py-1.5 text-[11px] sm:text-xs font-bold text-teal-800 shadow-2xs whitespace-nowrap">
              <Eye className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0 text-teal-600" />
              <span className="hidden sm:inline whitespace-nowrap">Retinal screening support for PHC and eye-care teams</span>
              <span className="sm:hidden whitespace-nowrap">Retinal screening for PHC & eye care</span>
            </div>

            <div className="space-y-4">
              <h1 className="text-3xl font-extrabold leading-tight text-slate-950 sm:text-4xl lg:text-5xl xl:text-6xl tracking-tight">
                Protect sight with faster retinal screening.
              </h1>
              <p className="max-w-xl text-base leading-relaxed text-slate-600 sm:text-lg">
                Load fundus photos from field cameras, screen both eyes, and produce a clear referral report that helps patients reach care earlier.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={onStartScreening}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-teal-700 px-5 py-3 text-sm font-bold text-white shadow-sm transition-all hover:bg-teal-800 active:bg-teal-900"
              >
                <Eye className="h-5 w-5" />
                <span>Start Screening</span>
                <ArrowRight className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={onOpenGuide}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 shadow-xs transition-all hover:bg-slate-50 hover:text-slate-950 active:bg-slate-100"
              >
                <ClipboardCheck className="h-5 w-5 text-teal-700" />
                <span>View Clinical Protocol</span>
              </button>
            </div>

            {pendingCount > 0 && (
              <div className="flex flex-wrap gap-2 pt-1 text-xs font-bold">
                <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-amber-800 shadow-2xs">
                  {pendingCount} saved case{pendingCount === 1 ? '' : 's'} waiting to sync
                </span>
              </div>
            )}
          </div>

          {/* Right Column: Animated Step-by-Step Screening Journey */}
          <div className="w-full">
            <LandingWorkflowVisualizer />
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <OutcomeCard
          icon={<ShieldCheck className="h-6 w-6" />}
          title="Find referral cases sooner"
          copy="Flag patients who need ophthalmologist review before vision loss becomes harder to prevent."
        />
        <OutcomeCard
          icon={<WifiOff className="h-6 w-6" />}
          title="Works during field camps"
          copy="Screenings can continue when internet drops, with cases saved on the device for later sync."
        />
        <OutcomeCard
          icon={<FileCheck2 className="h-6 w-6" />}
          title="One report for both eyes"
          copy="OD and OS results are kept together so the review handoff stays simple and traceable."
        />
        <OutcomeCard
          icon={<Hospital className="h-6 w-6" />}
          title="Fits PHC and hospital flow"
          copy="Use images from portable fundus cameras, tabletop systems, USB transfer, Bluetooth, or gallery import."
        />
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white px-6 py-8 shadow-sm sm:px-10 lg:px-12">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div className="space-y-3">
            <h2 className="text-2xl font-extrabold text-slate-950">How a technician uses it</h2>
            <p className="max-w-2xl text-sm leading-relaxed text-slate-600 sm:text-base">
              The app starts with patient intake, accepts fundus photos from the camera workflow, screens both eyes, and keeps a clear queue for saved offline cases.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <WorkflowStep icon={<UploadCloud className="h-5 w-5" />} title="Load Photo" copy="Import OD or OS fundus image." />
            <WorkflowStep icon={<Eye className="h-5 w-5" />} title="Screen Eyes" copy="Complete both eye captures." />
            <WorkflowStep icon={<CheckCircle2 className="h-5 w-5" />} title="Share Report" copy="Review, print, or sync later." />
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white px-6 py-8 shadow-sm sm:px-10 lg:px-12">
        <div className="space-y-6">
          <div className="max-w-3xl space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-teal-200 bg-teal-50 px-3.5 py-1.5 text-xs font-bold text-teal-800 shadow-2xs">
              <Camera className="h-4 w-4 text-teal-700" />
              <span>Fundus camera workflow</span>
            </div>
            <h2 className="text-2xl font-extrabold text-slate-950">Capture on the fundus camera. Screen in NetrAI.</h2>
            <p className="text-sm leading-relaxed text-slate-600 sm:text-base">
              NetrAI does not use the phone camera for retinal capture. The technician imports the exported fundus photo from a portable or hospital fundus camera, then completes screening in the app.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            <HardwareStep
              icon={<Camera className="h-5 w-5" />}
              title="Portable fundus camera"
              copy="For PHC camps and field visits where the camera exports retinal photos to phone or tablet."
            />
            <HardwareStep
              icon={<Computer className="h-5 w-5" />}
              title="Hospital fundus camera"
              copy="For eye hospitals using tabletop systems that export images from a desktop workflow."
            />
            <HardwareStep
              icon={<Cable className="h-5 w-5" />}
              title="USB cable"
              copy="Copy the exported retinal image from camera, phone, tablet, or hospital computer."
            />
            <HardwareStep
              icon={<Bluetooth className="h-5 w-5" />}
              title="Bluetooth"
              copy="Receive supported image exports when the camera or capture phone allows Bluetooth sharing."
            />
            <HardwareStep
              icon={<Wifi className="h-5 w-5" />}
              title="Wi-Fi or hotspot"
              copy="Import images through camera hotspot, Wi-Fi Direct, local sharing, or device gallery."
            />
            <HardwareStep
              icon={<FileImage className="h-5 w-5" />}
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

const OutcomeCard: React.FC<OutcomeCardProps> = ({ icon, title, copy }) => (
  <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
    <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-lg border border-teal-200 bg-teal-50 text-teal-700">
      {icon}
    </div>
    <h3 className="text-base font-extrabold text-slate-950">{title}</h3>
    <p className="mt-2 text-sm leading-relaxed text-slate-600">{copy}</p>
  </div>
);

const WorkflowStep: React.FC<OutcomeCardProps> = ({ icon, title, copy }) => (
  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
    <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-white text-teal-700 shadow-2xs">
      {icon}
    </div>
    <h3 className="text-sm font-extrabold text-slate-950">{title}</h3>
    <p className="mt-1 text-xs leading-relaxed text-slate-600">{copy}</p>
  </div>
);

const HardwareStep: React.FC<OutcomeCardProps> = ({ icon, title, copy }) => (
  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
    <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-white text-teal-700 shadow-2xs">
      {icon}
    </div>
    <h3 className="text-sm font-extrabold text-slate-950 sm:text-base">{title}</h3>
    <p className="mt-2 text-xs leading-relaxed text-slate-600 sm:text-sm">{copy}</p>
  </div>
);
