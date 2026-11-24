import { Fragment, memo, useEffect, useRef, useState, type PointerEvent } from 'react';
import { sx } from '../lib/css';
import type { Profile } from '../content/types';
import { SECTIONS, type SectionId } from './icons';
import { Scramble } from './Scramble';

// Flashlight pull cord: how far it stretches (px) and how far it must be pulled to switch.
const PULL_MAX = 48;
const PULL_TRIGGER = 22;

interface Props {
  profile: Profile;
  enterDelay: string;
  active: SectionId;
  lamp: boolean;
  onCord: () => void;
  onPalette: () => void;
  onTerminal: () => void;
  onReplay: () => void;
}

export const Sidebar = memo(function Sidebar({ profile, enterDelay, active, lamp, onCord, onPalette, onTerminal, onReplay }: Props) {
  const [runs, setRuns] = useState<number[]>(() => SECTIONS.map(() => 0));
  const d = { side: enterDelay };
  const navRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const strip = navRef.current;
    const on = strip?.querySelector<HTMLElement>('[aria-current="page"]');
    if (!strip || !on || strip.scrollWidth <= strip.clientWidth) return;
    strip.scrollTo({ left: on.offsetLeft - (strip.clientWidth - on.offsetWidth) / 2, behavior: 'smooth' });
  }, [active]);

  const cordRef = useRef<HTMLButtonElement>(null);
  const grip = useRef<{ x: number; y: number; moved: boolean } | null>(null);
  const skipClick = useRef(false);
  const skipTug = useRef(true); // no tug on first render

  const setPull = (pull: number, tilt: number) => {
    const el = cordRef.current;
    if (!el) return;
    el.style.setProperty('--pull', `${pull.toFixed(1)}px`);
    el.style.setProperty('--tilt', `${tilt.toFixed(1)}deg`);
  };
  // Rubber band: the further you pull, the harder it gets, up to PULL_MAX.
  const stretch = (dy: number) => PULL_MAX * (1 - Math.exp(-Math.max(0, dy) / PULL_MAX));

  // Switched by a click, the keyboard or Escape: give the cord a short tug so it reads as the switch.
  useEffect(() => {
    if (skipTug.current) {
      skipTug.current = false;
      return;
    }
    setPull(14, 0);
    const t = window.setTimeout(() => setPull(0, 0), 110);
    return () => window.clearTimeout(t);
  }, [lamp]);

  const cordDown = (e: PointerEvent<HTMLButtonElement>) => {
    if (e.button !== 0) return;
    grip.current = { x: e.clientX, y: e.clientY, moved: false };
    e.currentTarget.setPointerCapture(e.pointerId);
    e.currentTarget.classList.add('is-held');
  };
  const cordMove = (e: PointerEvent<HTMLButtonElement>) => {
    const g = grip.current;
    if (!g) return;
    const dx = e.clientX - g.x;
    const dy = e.clientY - g.y;
    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) g.moved = true;
    setPull(stretch(dy), Math.max(-18, Math.min(18, -dx * 0.5)));
  };
  const cordUp = (e: PointerEvent<HTMLButtonElement>) => {
    const g = grip.current;
    if (!g) return;
    grip.current = null;
    e.currentTarget.classList.remove('is-held');
    if (g.moved) {
      // A drag is its own gesture: the click that follows pointerup must not toggle again.
      skipClick.current = true;
      if (e.type === 'pointerup' && stretch(e.clientY - g.y) >= PULL_TRIGGER) {
        skipTug.current = true;
        onCord();
      }
    }
    setPull(0, 0);
  };
  const pullCord = () => {
    if (skipClick.current) {
      skipClick.current = false;
      return;
    }
    onCord();
  };
  const openPal = onPalette;
  const openTerm = onTerminal;
  const replay = onReplay;
  const nav = SECTIONS.map((s, index) => {
    const on = s.id === active;
    return {
      href: `#${s.id}`,
      label: s.label,
      no: s.no,
      d: s.d,
      run: runs[index],
      current: on ? ('page' as const) : undefined,
      bg: on ? '#151515' : 'transparent',
      color: on ? '#FFFFFF' : '#9A9A9A',
      bar: on ? '#EDEDED' : 'transparent',
      hover: () => setRuns((prev) => prev.map((n, i) => (i === index ? n + 1 : n))),
    };
  });
  return (
    <aside className="dk-side dk-side-in" style={sx(`position: sticky; top: 0; height: 100vh; flex: 0 0 264px; box-sizing: border-box; background: #0A0A0A; border-right: 1px solid #1C1C1C; padding: 24px 16px; display: flex; flex-direction: column; gap: 20px; z-index: 5; animation-delay: ${d.side}`)}>
    <button ref={cordRef} type="button" onClick={pullCord} onPointerDown={cordDown} onPointerMove={cordMove} onPointerUp={cordUp} onPointerCancel={cordUp} aria-label="Toggle flashlight mode" aria-pressed={lamp} data-cursor="Pull" className={lamp ? 'dk-cord is-on' : 'dk-cord'}>
    <span aria-hidden="true" className="dk-cord-sway"><span className="dk-cord-pull"><span className="dk-cord-line" /><span className="dk-cord-knob" /></span></span>
    </button>

    <div className="dk-side-id" style={sx(`display: flex; align-items: center; gap: 12px; padding: 0 20px 0 8px`)}>
    <span aria-hidden="true" style={sx(`width: 40px; height: 40px; border-radius: 50%; background: #EDEDED; color: #070707; display: flex; align-items: center; justify-content: center; font-weight: 600; font-size: 14px; letter-spacing: -0.02em; flex: none`)}>{profile.initials}</span>
    <div style={sx(`display: flex; flex-direction: column; min-width: 0`)}>
    <span style={sx(`font-weight: 500; font-size: 15px; letter-spacing: -0.01em`)}>{profile.name}</span>
    <span style={sx(`font-size: 13px; color: #9A9A9A`)}>{profile.role}</span>
    </div>
    </div>

    <div className="dk-side-avail" style={sx(`margin: 0 8px; display: flex; align-items: center; gap: 10px; border: 1px solid #1C1C1C; border-radius: 999px; padding: 8px 14px; font-size: 13px; color: #C9C9C9`)}>
    <span aria-hidden="true" style={sx(`position: relative; width: 7px; height: 7px; flex: none`)}><span style={sx(`position: absolute; inset: 0; border-radius: 50%; background: #EDEDED`)}></span><span style={sx(`position: absolute; inset: -4px; border-radius: 50%; border: 1px solid #EDEDED; animation: dk-ping 2s ease-out infinite`)}></span></span>{profile.availability}
    </div>

    <div className="dk-side-actions" style={sx(`margin: 0 8px; display: flex; gap: 8px`)}>
    <button type="button" onClick={openPal} aria-label="Search or ask" className="dk-ghost" style={sx(`flex-grow: 1; min-width: 0; min-height: 44px; border-radius: 12px; border: 1px solid #1C1C1C; background: #0E0E0E; color: #9A9A9A; display: flex; align-items: center; gap: 8px; padding: 0 10px 0 12px; font-size: 14px`)}>
    <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/></svg>
    <span aria-hidden="true" className="dk-side-hide" style={sx(`flex-grow: 1; text-align: left; white-space: nowrap; font-size: 13px`)}>Search / ask</span>
    <span aria-hidden="true" className="dk-side-hide" style={sx(`font-family: var(--mono); font-size: 11px; border: 1px solid #262626; border-radius: 6px; padding: 2px 6px`)}>⌘K</span>
    </button>
    <button type="button" onClick={openTerm} aria-label="Open terminal mode" className="dk-ghost dk-mag" style={sx(`width: 44px; height: 44px; flex: none; border-radius: 12px; border: 1px solid #1C1C1C; background: #0E0E0E; color: #EDEDED; display: flex; align-items: center; justify-content: center`)}><svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M5 7l5 5-5 5M12 17h7"/></svg></button>
    </div>

    <nav ref={navRef} aria-label="Sections" className="dk-side-nav dk-nav" style={sx(`display: flex; flex-direction: column; gap: 2px; font-size: 14px`)}>
    <span style={sx(`padding: 0 10px 8px; font-family: var(--mono); font-size: 11px; letter-spacing: 0.08em; color: #8A8A8A`)}>NAVIGATE</span>
    {nav.map((n, i) => (<Fragment key={i}>
    <a href={n.href} onMouseEnter={n.hover} aria-current={n.current} aria-label={n.label} style={sx(`position: relative; display: flex; align-items: center; gap: 12px; min-height: 40px; padding: 0 10px; border-radius: 10px; text-decoration: none; background: ${n.bg}; color: ${n.color}; transition: background .3s ease, color .3s ease`)}>
    <span aria-hidden="true" style={sx(`position: absolute; left: -16px; top: 10px; width: 2px; height: 20px; border-radius: 2px; background: ${n.bar}; transition: background .3s ease`)}></span>
    <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"><path d={n.d}/></svg>
    <span aria-hidden="true" style={sx(`flex-grow: 1`)}><Scramble text={n.label} run={n.run} /></span><span aria-hidden="true" style={sx(`font-family: var(--mono); font-size: 11px`)}>{n.no}</span>
    </a>
    </Fragment>))}
    </nav>

    <div className="dk-side-foot" style={sx(`margin-top: auto; display: flex; flex-direction: column; gap: 14px; padding: 0 8px`)}>
    <div style={sx(`display: flex; flex-direction: column; gap: 8px`)}>
    <div style={sx(`display: flex; justify-content: space-between; font-family: var(--mono); font-size: 12px; color: #8A8A8A`)}><span>{profile.location}</span><span>{profile.tz}</span></div>
    <div aria-hidden="true" style={sx(`height: 2px; border-radius: 2px; background: #1C1C1C; overflow: hidden`)}><div className="dk-progress" style={sx(`height: 2px; background: #EDEDED`)}></div></div>
    </div>
    <div style={sx(`display: flex; gap: 8px`)}>
    <a href={profile.github} target="_blank" rel="noreferrer" aria-label="GitHub" className="dk-ghost dk-shine dk-mag" style={sx(`width: 44px; height: 44px; border-radius: 12px; border: 1px solid #1C1C1C; display: flex; align-items: center; justify-content: center`)}><svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M9 19c-4 1.5-4-2-6-2.5M15 21v-3.5c0-1 .1-1.4-.5-2 2.8-.3 5.5-1.4 5.5-6a4.6 4.6 0 0 0-1.3-3.2 4.2 4.2 0 0 0-.1-3.2s-1.1-.3-3.5 1.3a12 12 0 0 0-6.2 0C6.5 2.8 5.4 3.1 5.4 3.1a4.2 4.2 0 0 0-.1 3.2A4.6 4.6 0 0 0 4 9.5c0 4.6 2.7 5.7 5.5 6-.6.6-.6 1.2-.5 2V21"/></svg></a>
    <a href={profile.linkedin} target="_blank" rel="noreferrer" aria-label="LinkedIn" className="dk-ghost dk-shine dk-mag" style={sx(`width: 44px; height: 44px; border-radius: 12px; border: 1px solid #1C1C1C; display: flex; align-items: center; justify-content: center`)}><svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><rect x="3" y="3" width="18" height="18" rx="3"/><path d="M8 10v7M8 7v.01M12 17v-4a2 2 0 0 1 4 0v4M12 10v7"/></svg></a>
    <a href={`mailto:${profile.email}`} aria-label="Email" className="dk-ghost dk-shine dk-mag" style={sx(`width: 44px; height: 44px; border-radius: 12px; border: 1px solid #1C1C1C; display: flex; align-items: center; justify-content: center`)}><svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/></svg></a>
    <button type="button" onClick={replay} aria-label="Replay intro" className="dk-ghost dk-mag" style={sx(`width: 44px; height: 44px; border-radius: 12px; border: 1px solid #1C1C1C; background: transparent; color: #EDEDED; display: flex; align-items: center; justify-content: center; margin-left: auto`)}><svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M4 12a8 8 0 1 0 2.4-5.7M4 4v4h4"/></svg></button>
    </div>
    <a href={profile.cvUrl} download className="dk-solid dk-shine dk-mag" style={sx(`display: flex; align-items: center; justify-content: center; gap: 8px; min-height: 44px; border-radius: 12px; background: #EDEDED; color: #070707; font-weight: 500; font-size: 14px; text-decoration: none`)}><svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 4v11M7 10l5 5 5-5M5 20h14"/></svg>Download CV</a>
    </div>
    </aside>
  );
});
