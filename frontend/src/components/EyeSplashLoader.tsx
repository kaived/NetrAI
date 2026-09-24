import React, { useEffect, useState } from 'react';

type EyeSplashLoaderProps = {
  minDurationMs?: number;
  onFinished?: () => void;
};

export const EyeSplashLoader: React.FC<EyeSplashLoaderProps> = ({
  minDurationMs = 2600,
  onFinished,
}) => {
  const [phase, setPhase] = useState<'visible' | 'leaving' | 'gone'>('visible');

  useEffect(() => {
    const leaveTimer = window.setTimeout(() => setPhase('leaving'), minDurationMs);
    return () => window.clearTimeout(leaveTimer);
  }, [minDurationMs]);

  useEffect(() => {
    if (phase !== 'leaving') return;
    const goneTimer = window.setTimeout(() => {
      setPhase('gone');
      onFinished?.();
    }, 560);
    return () => window.clearTimeout(goneTimer);
  }, [phase, onFinished]);

  if (phase === 'gone') return null;

  return (
    <div
      className={`eye-splash ${phase === 'leaving' ? 'eye-splash--leave' : ''}`}
      role="status"
      aria-live="polite"
      aria-label="Loading NetrAI"
    >
      <div className="eye-splash__vignette" aria-hidden />

      <div className="eye-splash__stage" aria-hidden>
        <RealisticEye />
      </div>

      <div className="eye-splash__copy">
        <p className="eye-splash__brand">NetrAI</p>
        <p className="eye-splash__tag">Preparing retinal screening…</p>
      </div>
    </div>
  );
};

const RealisticEye: React.FC = () => (
  <svg
    className="eye-splash__svg"
    viewBox="0 0 320 220"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden
  >
    <defs>
      <radialGradient id="eyeSclera" cx="48%" cy="42%" r="62%">
        <stop offset="0%" stopColor="#ffffff" />
        <stop offset="55%" stopColor="#f4f1ea" />
        <stop offset="100%" stopColor="#d9d2c6" />
      </radialGradient>

      <radialGradient id="eyeIris" cx="42%" cy="38%" r="58%">
        <stop offset="0%" stopColor="#5a8f72" />
        <stop offset="28%" stopColor="#2f6b52" />
        <stop offset="62%" stopColor="#184a38" />
        <stop offset="88%" stopColor="#0c2f24" />
        <stop offset="100%" stopColor="#071c16" />
      </radialGradient>

      <radialGradient id="eyePupil" cx="45%" cy="40%" r="55%">
        <stop offset="0%" stopColor="#2a2a2a" />
        <stop offset="70%" stopColor="#050505" />
        <stop offset="100%" stopColor="#000000" />
      </radialGradient>

      <radialGradient id="eyeCornea" cx="35%" cy="28%" r="70%">
        <stop offset="0%" stopColor="rgba(255,255,255,0.55)" />
        <stop offset="35%" stopColor="rgba(255,255,255,0.12)" />
        <stop offset="100%" stopColor="rgba(255,255,255,0)" />
      </radialGradient>

      <linearGradient id="upperLidShade" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#1a1210" />
        <stop offset="55%" stopColor="#3a2a24" />
        <stop offset="100%" stopColor="#5c4338" />
      </linearGradient>

      <linearGradient id="lowerLidShade" x1="0" y1="1" x2="0" y2="0">
        <stop offset="0%" stopColor="#2a1d18" />
        <stop offset="100%" stopColor="#6a5246" />
      </linearGradient>

      <clipPath id="eyeAperture">
        <path d="M28 110 C78 48, 242 48, 292 110 C242 172, 78 172, 28 110 Z" />
      </clipPath>

      <filter id="eyeSoftShadow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="10" stdDeviation="12" floodColor="#000" floodOpacity="0.45" />
      </filter>
    </defs>

    {/* Soft orbital shadow */}
    <ellipse cx="160" cy="118" rx="128" ry="78" fill="rgba(0,0,0,0.28)" filter="url(#eyeSoftShadow)" />

    {/* Eyeball + iris group (moves as a unit) */}
    <g className="eye-splash__gaze" clipPath="url(#eyeAperture)">
      <ellipse cx="160" cy="110" rx="138" ry="92" fill="url(#eyeSclera)" />

      {/* Subtle vessels */}
      <g opacity="0.28" stroke="#c47a72" strokeWidth="0.9" fill="none">
        <path d="M42 96 C70 88, 92 102, 108 108" />
        <path d="M48 128 C76 134, 98 122, 118 118" />
        <path d="M268 94 C244 86, 228 100, 214 108" />
        <path d="M274 130 C248 138, 230 124, 214 118" />
      </g>

      {/* Iris */}
      <g className="eye-splash__iris-spin" transform="translate(160 110)">
        <circle r="48" fill="url(#eyeIris)" />
        {/* Radial iris fibers */}
        <g stroke="rgba(180,220,190,0.18)" strokeWidth="0.7">
          {Array.from({ length: 28 }).map((_, i) => {
            const a = (i / 28) * Math.PI * 2;
            const x2 = Math.cos(a) * 46;
            const y2 = Math.sin(a) * 46;
            return <line key={i} x1={Math.cos(a) * 16} y1={Math.sin(a) * 16} x2={x2} y2={y2} />;
          })}
        </g>
        {/* Limbus ring */}
        <circle r="47.2" fill="none" stroke="rgba(0,0,0,0.45)" strokeWidth="2.2" />
        <circle r="44" fill="none" stroke="rgba(120,180,150,0.15)" strokeWidth="3" />
        {/* Pupil */}
        <circle className="eye-splash__pupil-breathe" r="17.5" fill="url(#eyePupil)" />
        {/* Specular highlights */}
        <ellipse cx="-10" cy="-11" rx="7.5" ry="5.2" fill="rgba(255,255,255,0.88)" transform="rotate(-18)" />
        <ellipse cx="8" cy="6" rx="2.4" ry="1.6" fill="rgba(255,255,255,0.35)" />
      </g>

      {/* Corneal sheen over the whole aperture */}
      <ellipse cx="128" cy="78" rx="74" ry="42" fill="url(#eyeCornea)" />
    </g>

    {/* Aperture outline / wet edge */}
    <path
      d="M28 110 C78 48, 242 48, 292 110 C242 172, 78 172, 28 110 Z"
      fill="none"
      stroke="rgba(255,255,255,0.18)"
      strokeWidth="1.4"
    />
    <path
      d="M28 110 C78 48, 242 48, 292 110 C242 172, 78 172, 28 110 Z"
      fill="none"
      stroke="rgba(0,0,0,0.35)"
      strokeWidth="2.2"
      opacity="0.55"
    />

    {/* Upper eyelid */}
    <g className="eye-splash__lid-upper">
      <path
        d="M20 112 C70 28, 250 28, 300 112 C250 78, 70 78, 20 112 Z"
        fill="url(#upperLidShade)"
      />
      <path
        d="M34 104 C90 52, 230 52, 286 104"
        fill="none"
        stroke="rgba(255,220,200,0.12)"
        strokeWidth="2"
      />
      {/* Lashes */}
      <g stroke="#120c0a" strokeWidth="1.35" strokeLinecap="round" opacity="0.85">
        <path d="M58 78 C52 64, 48 54, 46 46" />
        <path d="M82 64 C78 50, 76 40, 75 32" />
        <path d="M112 54 C110 40, 110 30, 111 22" />
        <path d="M148 50 C148 36, 149 26, 150 18" />
        <path d="M184 52 C186 38, 188 28, 190 20" />
        <path d="M218 58 C222 44, 226 34, 230 26" />
        <path d="M248 70 C254 56, 260 46, 266 38" />
      </g>
    </g>

    {/* Lower eyelid */}
    <g className="eye-splash__lid-lower">
      <path
        d="M22 108 C74 168, 246 168, 298 108 C246 138, 74 138, 22 108 Z"
        fill="url(#lowerLidShade)"
      />
      <path
        d="M40 122 C100 150, 220 150, 280 122"
        fill="none"
        stroke="rgba(255,220,200,0.1)"
        strokeWidth="1.6"
      />
    </g>

    {/* Tear-line catchlight */}
    <path
      d="M56 128 C110 146, 210 146, 264 128"
      fill="none"
      stroke="rgba(255,255,255,0.16)"
      strokeWidth="1.2"
    />
  </svg>
);
