import React from 'react';
import { Capacitor } from '@capacitor/core';
import { BookOpen, Download } from 'lucide-react';
import netrAiLogo from '../assets/NetrAI_Logo.webp';

interface HeaderProps {
  onOpenGuide: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenGuide,
}) => {
  const androidApkUrl = import.meta.env.VITE_ANDROID_APK_URL?.trim();
  const shouldShowAndroidApkButton = Boolean(androidApkUrl) && !isInstalledAppShell();

  return (
    <header className="fixed inset-x-0 top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-sm no-print">
      <div className="max-w-[1760px] mx-auto px-3 sm:px-6 lg:px-10">
        <div className="flex min-h-[64px] items-center justify-between gap-2 py-2 sm:min-h-[80px] sm:py-2.5 sm:gap-5">
          <div className="flex min-w-0 items-center justify-start">
            <div className="relative h-[48px] w-[132px] overflow-hidden sm:h-[58px] sm:w-[230px] lg:h-[66px] lg:w-[260px]">
              <img
                src={netrAiLogo}
                alt="NetrAI Logo"
                className="absolute inset-0 h-full w-full origin-left -translate-x-[22%] translate-y-[8%] scale-[1.32] object-cover object-left select-none drop-shadow-sm sm:-translate-x-[28%] lg:-translate-x-[29.5%]"
              />
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1 sm:gap-2">
            {shouldShowAndroidApkButton ? (
              <a
                href={androidApkUrl}
                className="inline-flex items-center gap-1 rounded-lg border border-teal-700 bg-teal-700 px-1.5 py-1.5 text-[11px] font-semibold leading-none text-white shadow-sm transition-colors hover:bg-teal-800 sm:gap-2 sm:px-4 sm:py-2 sm:text-sm sm:leading-normal lg:px-5 lg:py-2.5"
                title="Download NetrAI Android APK"
                aria-label="Download NetrAI Android APK"
                target="_blank"
                rel="noreferrer"
              >
                <Download className="w-3 h-3 sm:w-4 sm:h-4" />
                <span>Android APK</span>
              </a>
            ) : null}

            <button
              onClick={onOpenGuide}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-100 px-1.5 py-1.5 text-[11px] font-semibold leading-none text-slate-700 shadow-sm transition-colors hover:bg-slate-200 hover:text-slate-900 sm:gap-2 sm:px-4 sm:py-2 sm:text-sm sm:leading-normal lg:px-5 lg:py-2.5"
              title="View ICDR DR Grading & Image Quality Clinical Protocol"
            >
              <BookOpen className="w-3 h-3 text-teal-600 sm:w-4 sm:h-4" />
              <span>Clinical Protocol</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

function isInstalledAppShell(): boolean {
  if (Capacitor.isNativePlatform()) {
    return true;
  }

  if (typeof window === 'undefined') {
    return false;
  }

  const isStandalonePwa = window.matchMedia?.('(display-mode: standalone)').matches ?? false;
  const isIosStandalone = typeof navigator !== 'undefined' && (navigator as Navigator & { standalone?: boolean }).standalone === true;
  return isStandalonePwa || isIosStandalone;
}
