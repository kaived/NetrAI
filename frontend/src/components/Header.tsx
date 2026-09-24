import React from 'react';
import { BookOpen, Download } from 'lucide-react';
import netrAiLogo from '../assets/NetrAI_Logo.webp';
import { useTranslation } from 'react-i18next';

interface HeaderProps {
  onOpenGuide: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenGuide }) => {
  const { t, i18n } = useTranslation();

  const androidApkUrl = import.meta.env.VITE_ANDROID_APK_URL?.trim() ||
    'https://storage.googleapis.com/retinascan-ai-f620e-app-downloads/android/netrai-latest.apk';
  const activeLanguage = i18n.language.split('-')[0].toLowerCase();

  return (
    <header className="fixed inset-x-0 top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-sm no-print">
      <div className="max-w-[1760px] mx-auto px-3 sm:px-6 lg:px-10">
        <div className="flex min-h-[64px] items-center justify-between gap-2 py-2 sm:min-h-[66px] sm:py-1.5 sm:gap-5">
          <div className="flex min-w-0 items-center justify-start">
            <div className="relative h-[48px] w-[132px] overflow-hidden sm:h-[48px] sm:w-[195px] lg:h-[50px] lg:w-[205px]">
              <img
                src={netrAiLogo}
                alt={t('header.logoAlt')}
                className="absolute inset-0 h-full w-full origin-left -translate-x-[22%] translate-y-[8%] scale-[1.32] object-cover object-left select-none drop-shadow-sm sm:-translate-x-[28%] lg:-translate-x-[29.5%]"
              />
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2 sm:gap-4">
            <a
              href={androidApkUrl}
              download
              target="_blank"
              rel="noreferrer"
              title="Download NetrAI Android APK"
              aria-label="Download NetrAI Android APK"
              className="inline-flex items-center gap-1 rounded-lg border border-teal-700 bg-teal-700 px-2 py-1.5 text-[11px] font-semibold leading-none text-white shadow-sm transition-colors hover:bg-teal-800 sm:gap-2 sm:px-3.5 sm:py-1.5 sm:text-sm sm:leading-normal lg:px-4 lg:py-2"
            >
              <Download className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">Android APK</span>
            </a>

            <div className="flex gap-1 rounded-lg border border-slate-200 bg-slate-100 p-1">
              <button onClick={() => i18n.changeLanguage('en')} className={`rounded-md px-2 py-1 text-xs font-bold ${activeLanguage === 'en' ? 'bg-white text-teal-800 shadow-sm' : 'bg-transparent text-slate-600 hover:bg-slate-200'}`}>{t('common.english')}</button>
              <button onClick={() => i18n.changeLanguage('hi')} className={`rounded-md px-2 py-1 text-xs font-bold ${activeLanguage === 'hi' ? 'bg-white text-teal-800 shadow-sm' : 'bg-transparent text-slate-600 hover:bg-slate-200'}`}>{t('common.hindi')}</button>
              <button onClick={() => i18n.changeLanguage('te')} className={`rounded-md px-2 py-1 text-xs font-bold ${activeLanguage === 'te' ? 'bg-white text-teal-800 shadow-sm' : 'bg-transparent text-slate-600 hover:bg-slate-200'}`}>{t('common.telugu')}</button>
            </div>

            <button
              onClick={onOpenGuide}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-100 px-1.5 py-1.5 text-[11px] font-semibold leading-none text-slate-700 shadow-sm transition-colors hover:bg-slate-200 hover:text-slate-900 sm:gap-2 sm:px-3.5 sm:py-1.5 sm:text-sm sm:leading-normal lg:px-4 lg:py-2"
            >
              <BookOpen className="w-3 h-3 text-teal-600 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">{t('header.protocol')}</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
