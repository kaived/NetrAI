import React from 'react';
import { BookOpen } from 'lucide-react';
import netrAiLogo from '../assets/NetrAI_Logo.webp';

interface HeaderProps {
  onOpenGuide: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenGuide,
}) => {
  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-sm no-print">
      <div className="max-w-[1760px] mx-auto px-4 sm:px-6 lg:px-10">
        <div className="flex min-h-[70px] items-center justify-between gap-3 py-2 sm:min-h-[80px] sm:py-2.5 sm:gap-5">
          <div className="flex min-w-0 items-center justify-start">
            <div className="relative h-[50px] w-[190px] overflow-hidden sm:h-[58px] sm:w-[225px] lg:h-[66px] lg:w-[255px]">
              <img
                src={netrAiLogo}
                alt="NetrAI Logo"
                className="absolute inset-0 h-full w-full origin-left -translate-x-[34%] translate-y-[8%] scale-[1.32] object-cover object-left select-none drop-shadow-sm"
              />
            </div>
          </div>

          <button
            onClick={onOpenGuide}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-100 px-2.5 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-200 hover:text-slate-900 sm:gap-2 sm:px-4 sm:py-2 sm:text-sm lg:px-5 lg:py-2.5"
            title="View ICDR DR Grading & Image Quality Clinical Protocol"
          >
            <BookOpen className="w-3.5 h-3.5 text-teal-600 sm:w-4 sm:h-4" />
            <span>Clinical Protocol</span>
          </button>
        </div>
      </div>
    </header>
  );
};
