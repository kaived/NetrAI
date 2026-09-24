import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  ArrowRight,
  Route,
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
  const { t } = useTranslation();
  const pendingCount = offlineQueue.pending + offlineQueue.failed;

  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-3.5 sm:p-8 lg:p-12 shadow-sm">
        <div className="grid grid-cols-1 lg:grid-cols-[1.18fr_1fr] xl:grid-cols-[1.2fr_1.05fr] gap-6 lg:gap-8 xl:gap-10 items-center">
          {/* Left Column: Heading, Subtext, Buttons */}
          <div className="space-y-4 sm:space-y-6">
            <div className="inline-flex items-center gap-1.5 sm:gap-2 rounded-full border border-teal-200 bg-teal-50 px-3 py-1 sm:px-3.5 sm:py-1.5 text-[11px] sm:text-xs font-bold text-teal-800 shadow-2xs whitespace-nowrap">
              <Eye className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0 text-teal-600" />
              <span className="hidden sm:inline whitespace-nowrap">{t('landing.eyebrow')}</span>
              <span className="sm:hidden whitespace-nowrap">{t('landing.eyebrowMobile')}</span>
            </div>

            <div className="space-y-4">
              <h1 className="text-3xl font-extrabold leading-tight text-slate-950 sm:text-4xl lg:text-5xl xl:text-6xl tracking-tight">
                {t('landing.title')}
              </h1>
              <p className="max-w-xl text-base leading-relaxed text-slate-600 sm:text-lg">
                {t('landing.description')}
              </p>
            </div>

            <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:flex-nowrap lg:gap-3">
              <button
                type="button"
                onClick={onStartScreening}
                className="inline-flex items-center justify-center gap-1.5 sm:gap-2 rounded-xl bg-teal-700 px-3.5 sm:px-4 xl:px-5 py-3 text-xs sm:text-sm font-bold text-white shadow-sm transition-all hover:bg-teal-800 active:bg-teal-900 whitespace-nowrap shrink-0"
              >
                <Eye className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" />
                <span className="whitespace-nowrap">{t('start_screening')}</span>
                <ArrowRight className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
              </button>
              <button
                type="button"
                onClick={onOpenGuide}
                className="inline-flex items-center justify-center gap-1.5 sm:gap-2 rounded-xl border border-slate-200 bg-white px-3.5 sm:px-4 xl:px-5 py-3 text-xs sm:text-sm font-bold text-slate-700 shadow-xs transition-all hover:bg-slate-50 hover:text-slate-950 active:bg-slate-100 whitespace-nowrap shrink-0"
              >
                <ClipboardCheck className="h-4 w-4 sm:h-5 sm:w-5 shrink-0 text-teal-700" />
                <span className="whitespace-nowrap">{t('landing.protocol')}</span>
              </button>
              <button
                type="button"
                onClick={onOpenHardwareWorkflow}
                className="inline-flex items-center justify-center gap-1.5 sm:gap-2 rounded-xl border border-teal-200 bg-teal-50 px-3.5 sm:px-4 xl:px-5 py-3 text-xs sm:text-sm font-bold text-teal-800 shadow-xs transition-all hover:border-teal-300 hover:bg-[#c9f2e0] hover:text-teal-900 active:bg-teal-100 whitespace-nowrap shrink-0"
              >
                <Camera className="h-4 w-4 sm:h-5 sm:w-5 shrink-0 text-teal-700" />
                <span className="whitespace-nowrap">{t('landing.cameraWorkflow')}</span>
              </button>
            </div>

            {pendingCount > 0 && (
              <div className="flex flex-wrap gap-2 pt-1 text-xs font-bold">
                <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-amber-800 shadow-2xs">
                  {t('landing.pendingCases', { count: pendingCount })}
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
          title={t('landing.findCases')}
          copy={t('landing.findCasesHelp')}
        />
        <OutcomeCard
          icon={<WifiOff className="h-6 w-6" />}
          title={t('landing.fieldCamps')}
          copy={t('landing.fieldCampsHelp')}
        />
        <OutcomeCard
          icon={<FileCheck2 className="h-6 w-6" />}
          title={t('landing.oneReport')}
          copy={t('landing.oneReportHelp')}
        />
        <OutcomeCard
          icon={<Hospital className="h-6 w-6" />}
          title={t('landing.fitsFlow')}
          copy={t('landing.fitsFlowHelp')}
        />
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white px-4 py-6 sm:px-10 sm:py-8 lg:px-12 shadow-sm">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div className="space-y-3">
            <h2 className="text-lg sm:text-xl md:text-2xl font-extrabold text-slate-950 whitespace-nowrap">{t('landing.technicianTitle')}</h2>
            <p className="max-w-2xl text-sm leading-relaxed text-slate-600 sm:text-base">
              {t('landing.technicianHelp')}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <WorkflowStep icon={<UploadCloud className="h-5 w-5" />} title={t('landing.loadPhoto')} copy={t('landing.loadPhotoHelp')} />
            <WorkflowStep icon={<Eye className="h-5 w-5" />} title={t('landing.screenEyes')} copy={t('landing.screenEyesHelp')} />
            <WorkflowStep icon={<CheckCircle2 className="h-5 w-5" />} title={t('landing.shareReport')} copy={t('landing.shareReportHelp')} />
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white px-6 py-8 shadow-sm sm:px-10 lg:px-12">
        <div className="space-y-6">
          <div className="max-w-3xl space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-teal-200 bg-teal-50 px-3.5 py-1.5 text-xs font-bold text-teal-800 shadow-2xs">
              <Camera className="h-4 w-4 text-teal-700" />
              <span>{t('landing.fundusWorkflow')}</span>
            </div>
            <h2 className="text-2xl font-extrabold text-slate-950">{t('landing.fundusTitle')}</h2>
            <p className="text-sm leading-relaxed text-slate-600 sm:text-base">
              {t('landing.fundusHelp')}
            </p>
            <button
              type="button"
              onClick={onOpenHardwareWorkflow}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-teal-700 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-teal-800 active:bg-teal-900"
            >
              <Camera className="h-4 w-4" />
              <span>{t('landing.openCameraWorkflow')}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            <HardwareStep
              icon={<Camera className="h-5 w-5" />}
              title={t('landing.portableCamera')}
              copy={t('landing.portableCameraHelp')}
            />
            <HardwareStep
              icon={<Computer className="h-5 w-5" />}
              title={t('landing.hospitalCamera')}
              copy={t('landing.hospitalCameraHelp')}
            />
            <HardwareStep
              icon={<Cable className="h-5 w-5" />}
              title={t('landing.usb')}
              copy={t('landing.usbHelp')}
            />
            <HardwareStep
              icon={<Bluetooth className="h-5 w-5" />}
              title={t('landing.bluetooth')}
              copy={t('landing.bluetoothHelp')}
            />
            <HardwareStep
              icon={<Wifi className="h-5 w-5" />}
              title={t('landing.wifi')}
              copy={t('landing.wifiHelp')}
            />
            <HardwareStep
              icon={<FileImage className="h-5 w-5" />}
              title={t('landing.sd')}
              copy={t('landing.sdHelp')}
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
