import React, { useCallback, useEffect, useId, useRef, useState } from 'react';

type Gaze = { x: number; y: number };

const MAX_LOOK = 7; // px iris travel inside the eye

/** Playful OD/OS pair: follows pointer, click blinks, double-click winks. */
export const BlinkingEyesPair: React.FC = () => {
  const rootRef = useRef<HTMLDivElement>(null);
  const [gaze, setGaze] = useState<Gaze>({ x: 0, y: 0 });
  const [blink, setBlink] = useState(false);
  const [wink, setWink] = useState<'od' | 'os' | null>(null);
  const [hint, setHint] = useState('Move around · click to blink');
  const autoBlinkRef = useRef<number | undefined>(undefined);
  const blinkClearRef = useRef<number | undefined>(undefined);

  const triggerBlink = useCallback((mode: 'both' | 'od' | 'os' = 'both') => {
    window.clearTimeout(blinkClearRef.current);
    if (mode === 'both') {
      setWink(null);
      setBlink(true);
      setHint('Blink!');
    } else {
      setBlink(false);
      setWink(mode);
      setHint(mode === 'od' ? 'OD wink' : 'OS wink');
    }
    blinkClearRef.current = window.setTimeout(() => {
      setBlink(false);
      setWink(null);
      setHint('Move around · click to blink');
    }, 180);
  }, []);

  useEffect(() => {
    const onMove = (event: PointerEvent) => {
      const root = rootRef.current;
      if (!root) return;
      const rect = root.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = event.clientX - cx;
      const dy = event.clientY - cy;
      const dist = Math.hypot(dx, dy) || 1;
      const clamp = Math.min(1, 140 / dist);
      setGaze({
        x: (dx / dist) * MAX_LOOK * clamp * Math.min(1, dist / 80),
        y: (dy / dist) * (MAX_LOOK * 0.7) * clamp * Math.min(1, dist / 80),
      });
    };

    window.addEventListener('pointermove', onMove, { passive: true });
    return () => window.removeEventListener('pointermove', onMove);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const schedule = () => {
      const delay = 2800 + Math.random() * 3200;
      autoBlinkRef.current = window.setTimeout(() => {
        if (cancelled) return;
        setWink(null);
        setBlink(true);
        blinkClearRef.current = window.setTimeout(() => {
          if (!cancelled) setBlink(false);
        }, 160);
        schedule();
      }, delay);
    };
    schedule();
    return () => {
      cancelled = true;
      window.clearTimeout(autoBlinkRef.current);
      window.clearTimeout(blinkClearRef.current);
    };
  }, []);

  const onClick = () => triggerBlink('both');
  const onDoubleClick = (event: React.MouseEvent) => {
    event.preventDefault();
    const rect = rootRef.current?.getBoundingClientRect();
    if (!rect) return;
    const mid = rect.left + rect.width / 2;
    triggerBlink(event.clientX < mid ? 'od' : 'os');
  };

  const odClosed = blink || wink === 'od';
  const osClosed = blink || wink === 'os';

  return (
    <div
      ref={rootRef}
      className={`blink-eyes blink-eyes--play no-print${blink || wink ? ' blink-eyes--shut' : ''}`}
      role="button"
      tabIndex={0}
      aria-label="Playful eyes. Move the pointer to look around. Click to blink. Double-click to wink."
      title="Move pointer · click blink · double-click wink"
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          triggerBlink('both');
        }
      }}
    >
      <div className="blink-eyes__row">
        <div className="blink-eyes__unit">
          <SingleEye side="od" gaze={gaze} closed={odClosed} />
          <span className="blink-eyes__label">OD</span>
        </div>
        <div className="blink-eyes__unit">
          <SingleEye side="os" gaze={gaze} closed={osClosed} />
          <span className="blink-eyes__label">OS</span>
        </div>
      </div>
      <p className="blink-eyes__hint">{hint}</p>
    </div>
  );
};

type SingleEyeProps = {
  side: 'od' | 'os';
  gaze: Gaze;
  closed: boolean;
};

const SingleEye: React.FC<SingleEyeProps> = ({ side, gaze, closed }) => {
  const uid = `${useId().replace(/:/g, '')}-${side}`;
  const irisX = 60 + gaze.x + (side === 'od' ? -1.5 : 1.5);
  const irisY = 40 + gaze.y;

  return (
    <svg
      className={`blink-eyes__eye blink-eyes__eye--${side}${closed ? ' is-closed' : ''}`}
      viewBox="0 0 120 80"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <radialGradient id={`${uid}-sclera`} cx="48%" cy="42%" r="62%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="70%" stopColor="#f3f0ea" />
          <stop offset="100%" stopColor="#ddd6cc" />
        </radialGradient>
        <radialGradient id={`${uid}-iris`} cx="40%" cy="36%" r="58%">
          <stop offset="0%" stopColor="#6fa88a" />
          <stop offset="40%" stopColor="#2f6b52" />
          <stop offset="100%" stopColor="#0c2a20" />
        </radialGradient>
        <clipPath id={`${uid}-aperture`}>
          <path d="M8 40 C28 14, 92 14, 112 40 C92 66, 28 66, 8 40 Z" />
        </clipPath>
      </defs>

      <g clipPath={`url(#${uid}-aperture)`}>
        <ellipse cx="60" cy="40" rx="54" ry="34" fill={`url(#${uid}-sclera)`} />
        <g
          className="blink-eyes__iris"
          style={{
            transform: `translate(${irisX - 60}px, ${irisY - 40}px)`,
          }}
        >
          <circle cx="60" cy="40" r="18" fill={`url(#${uid}-iris)`} />
          <circle cx="60" cy="40" r="17.5" fill="none" stroke="rgba(0,0,0,0.35)" strokeWidth="1.2" />
          <circle cx="60" cy="40" r="7" fill="#0a0a0a" />
          <ellipse cx="55" cy="35" rx="3.2" ry="2.1" fill="rgba(255,255,255,0.85)" />
        </g>
      </g>

      <path
        d="M8 40 C28 14, 92 14, 112 40 C92 66, 28 66, 8 40 Z"
        fill="none"
        stroke="rgba(11,61,51,0.18)"
        strokeWidth="1.2"
      />

      <g
        className={`blink-eyes__lid blink-eyes__lid--upper${closed ? ' is-closed' : ''}`}
      >
        <path d="M6 41 C30 8, 90 8, 114 41 C90 28, 30 28, 6 41 Z" fill="#4a372e" />
      </g>
      <g
        className={`blink-eyes__lid blink-eyes__lid--lower${closed ? ' is-closed' : ''}`}
      >
        <path d="M7 39 C32 62, 88 62, 113 39 C88 50, 32 50, 7 39 Z" fill="#3a2a24" />
      </g>
    </svg>
  );
};
