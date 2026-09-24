import React from 'react';
import { BookOpen, Download, Eye, Play } from 'lucide-react';
import netrAiLogo from '../assets/NetrAI_Logo.webp';
import { isInstalledAppShell } from '../utils/runtime';

interface HeaderProps {
  onOpenGuide: () => void;
  onStartScreening?: () => void;
  onOpenHardwareWorkflow?: () => void;
  onGoHome?: () => void;
  activeNav?: 'home' | 'screening' | 'protocol' | 'hardware';
}

export const Header: React.FC<HeaderProps> = ({
  onOpenGuide,
  onStartScreening,
  onOpenHardwareWorkflow,
  onGoHome,
  activeNav = 'home',
}) => {
  const androidApkUrl = import.meta.env.VITE_ANDROID_APK_URL?.trim();
  const shouldShowAndroidApkButton = Boolean(androidApkUrl) && !isInstalledAppShell();

  return (
    <header className="fixed inset-x-0 top-0 z-50 bg-forest no-print">
      <div className="max-w-[1760px] mx-auto px-3 sm:px-6 lg:px-10">
        <div className="flex min-h-[64px] items-center justify-between gap-3 py-2 sm:min-h-[68px]">
          <div className="flex min-w-0 items-center gap-6 lg:gap-10">
            <button
              type="button"
              onClick={onGoHome}
              className="relative h-[40px] w-[120px] overflow-hidden sm:h-[44px] sm:w-[160px] lg:h-[46px] lg:w-[175px] brightness-0 invert"
              aria-label="NetrAI home"
            >
              <img
                src={netrAiLogo}
                alt="NetrAI Logo"
                className="absolute inset-0 h-full w-full origin-left -translate-x-[22%] translate-y-[8%] scale-[1.32] object-cover object-left select-none sm:-translate-x-[28%] lg:-translate-x-[29.5%]"
              />
            </button>

            <nav className="hidden md:flex items-center gap-1">
              <NavLink
                label="Screening"
                active={activeNav === 'home' || activeNav === 'screening'}
                onClick={onGoHome}
              />
              <NavLink label="Protocol" active={activeNav === 'protocol'} onClick={onOpenGuide} />
              <NavLink
                label="Cameras"
                active={activeNav === 'hardware'}
                onClick={onOpenHardwareWorkflow}
              />
            </nav>
          </div>

          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2.5">
            {shouldShowAndroidApkButton ? (
              <a
                href={androidApkUrl}
                className="hidden sm:inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-white/80 transition-colors hover:text-white"
                title="Download NetrAI Android APK"
                aria-label="Download NetrAI Android APK"
                target="_blank"
                rel="noreferrer"
              >
                <Download className="w-4 h-4" />
                <span>Android APK</span>
              </a>
            ) : null}

            <button
              type="button"
              onClick={onOpenGuide}
              className="hidden sm:inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-white/80 transition-colors hover:text-white"
              title="View Clinical Protocol"
            >
              <Play className="w-3.5 h-3.5" />
              <span>Clinical Protocol</span>
            </button>

            <button
              type="button"
              onClick={onOpenGuide}
              className="inline-flex sm:hidden items-center justify-center rounded-lg border border-white/20 bg-white/10 p-2 text-white transition-colors hover:bg-white/15"
              title="View Clinical Protocol"
              aria-label="View Clinical Protocol"
            >
              <BookOpen className="w-4 h-4" />
            </button>

            {onStartScreening ? (
              <button
                type="button"
                onClick={onStartScreening}
                className="inline-flex items-center gap-1.5 rounded-lg bg-mint px-3 py-2 text-[12px] font-semibold text-forest shadow-sm transition-colors hover:bg-mint-strong sm:gap-2 sm:px-4 sm:text-sm"
              >
                <Eye className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span>Start Screening</span>
              </button>
            ) : null}

            <div className="hidden lg:flex items-center gap-2.5 pl-2 ml-1 border-l border-white/15">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-mint/30 text-xs font-bold text-mint">
                PHC
              </div>
              <div className="leading-tight">
                <p className="text-sm font-medium text-white">Technician</p>
                <p className="text-[11px] text-mint">Active</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

type NavLinkProps = {
  label: string;
  active?: boolean;
  onClick?: () => void;
};

const NavLink: React.FC<NavLinkProps> = ({ label, active, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className={`relative px-3 py-2 text-sm font-medium transition-colors ${
      active ? 'text-white' : 'text-white/65 hover:text-white'
    }`}
  >
    {label}
    {active ? (
      <span className="absolute inset-x-3 -bottom-0.5 h-0.5 rounded-full bg-mint" />
    ) : null}
  </button>
);
