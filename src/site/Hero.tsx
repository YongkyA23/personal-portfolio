import { memo, useEffect, useRef, useState } from 'react';
import { sx } from '../lib/css';
import type { Profile } from '../content/types';
import { spot } from './pointer';
import { Scramble } from './Scramble';

export interface EnterDelays {
  side: string;
  k: string;
  l1: string;
  l2: string;
  p: string;
  ask: string;
  dl: string;
}

interface Props {
  profile: Profile;
  d: EnterDelays;
  kickerRun: number;
  onPalette: () => void;
}

const WHOLE_NUMBER = /^\d+$/;

const hasWebGL = () => {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    return false;
  }
};

export const Hero = memo(function Hero({ profile, d, kickerRun, onPalette }: Props) {
  const openPal = onPalette;
  const last = profile.stats.length - 1;
  const heroRef = useRef<HTMLElement>(null);
  const asciiRef = useRef<HTMLDivElement>(null);
  const [ascii, setAscii] = useState(false);

  // The ASCII monogram (three.js) loads after the page is up; the outlined initials stay until it is ready,
  // and remain the fallback where WebGL is missing.
  useEffect(() => {
    const host = asciiRef.current;
    const hero = heroRef.current;
    if (!host || !hero || !hasWebGL()) return;
    let dead = false;
    let inst: { destroy(): void } | null = null;
    const go = () =>
      import('../three/asciiHero')
        .then((m) => {
          if (dead) return;
          inst = m.mountAsciiHero(host, hero);
          setAscii(true);
        })
        .catch(() => {});
    const idle = window.requestIdleCallback ? window.requestIdleCallback(go, { timeout: 2500 }) : window.setTimeout(go, 800);
    return () => {
      dead = true;
      if (window.cancelIdleCallback) window.cancelIdleCallback(idle);
      else window.clearTimeout(idle);
      inst?.destroy();
    };
  }, []);
  return (
    <section ref={heroRef} id="overview" onMouseMove={spot} className="dk-spot" style={sx(`position: relative; overflow: clip`)}>
    <div ref={asciiRef} aria-hidden="true" className={ascii ? 'dk-ascii is-on' : 'dk-ascii'}></div>
    <div aria-hidden="true" className="dk-para" style={sx(`opacity: ${ascii ? 0 : 1}; transition: opacity .6s ease; position: absolute; right: -6%; top: 4%; font-weight: 600; font-size: clamp(260px, 36vw, 520px); line-height: 0.8; letter-spacing: -0.08em; color: transparent; -webkit-text-stroke: 1px #1E1E1E; pointer-events: none; z-index: 0`)}>{profile.initials}</div>
    <div aria-hidden="true" className="dk-para" style={sx(`position: absolute; left: 10%; top: -20%; width: 720px; height: 720px; border-radius: 50%; background: radial-gradient(circle, rgba(255,255,255,0.06), rgba(255,255,255,0) 62%); pointer-events: none; z-index: 0`)}></div>
    <div aria-hidden="true" style={sx(`position: absolute; inset: 0; background: radial-gradient(#161616 1px, transparent 1px) 0 0/28px 28px; -webkit-mask: linear-gradient(180deg, #000, transparent 85%); mask: linear-gradient(180deg, #000, transparent 85%); pointer-events: none; z-index: 0`)}></div>
    <span aria-hidden="true" className="dk-secret" style={sx(`position: absolute; right: 8%; bottom: 120px; z-index: 1; font-family: var(--mono); font-size: 13px; line-height: 1.6; text-align: right; white-space: pre-line`)}>{profile.secrets[0]}</span>

    <div className="dk-heroout" style={sx(`position: relative; z-index: 1; max-width: 1080px; margin: 0 auto; padding: clamp(56px, 9vw, 120px) clamp(20px, 5vw, 64px) 72px; display: flex; flex-direction: column; gap: 36px`)}>
    <span className="dk-enter" style={sx(`font-family: var(--mono); font-size: 13px; color: #8A8A8A; animation-delay: ${d.k}`)}><Scramble text={profile.kicker} run={kickerRun} /></span>
    <h1 style={sx(`margin: 0; font-weight: 500; font-size: clamp(44px, 6.6vw, 88px); line-height: 1; letter-spacing: -0.045em`)}>
    <span className="dk-line"><span style={sx(`animation-delay: ${d.l1}`)}>{profile.headline[0]}</span></span>
    <span className="dk-line"><span style={sx(`animation-delay: ${d.l2}`)}><span className="dk-sheen">{profile.headline[1]}</span></span></span>
    </h1>
    <p className="dk-enter" style={sx(`margin: 0; max-width: 560px; font-size: 18px; line-height: 1.6; color: #A8A8A8; animation-delay: ${d.p}`)}>{profile.intro}</p>
    <div className="dk-enter" style={sx(`max-width: 620px; animation-delay: ${d.ask}`)}>
    <button type="button" onClick={openPal} className="dk-ghost dk-shine" style={sx(`width: 100%; min-height: 56px; border-radius: 16px; border: 1px solid #262626; background: #0E0E0E; color: #A8A8A8; display: flex; align-items: center; gap: 12px; padding: 0 12px 0 18px; font-size: 15px; text-align: left`)}>
    <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8z"/><path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z"/></svg>
    <span style={sx(`flex-grow: 1`)}>Ask my AI agent, or jump anywhere</span>
    <span aria-hidden="true" className="dk-kbd" style={sx(`font-family: var(--mono); font-size: 12px; color: #9A9A9A; border: 1px solid #262626; border-radius: 6px; padding: 3px 7px; white-space: nowrap`)}>⌘ K</span>
    </button>
    </div>
    <dl className="dk-enter" style={sx(`margin: 24px 0 0; display: grid; grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)); border: 1px solid #1C1C1C; border-radius: 20px; overflow: hidden; background: rgba(7,7,7,0.6); animation-delay: ${d.dl}`)}>
    {profile.stats.map((stat, i) => (
    <div key={i} style={sx(i < last ? `padding: 24px; border-right: 1px solid #1C1C1C` : `padding: 24px`)}><dt style={sx(`font-size: 40px; font-weight: 500; letter-spacing: -0.04em; line-height: 1`)}>{WHOLE_NUMBER.test(stat.value) ? (<><span className="dk-count" aria-hidden="true" style={sx(`--to: ${stat.value}`)}></span><span className="dk-sr">{stat.value}</span></>) : stat.value}</dt><dd style={sx(`margin: 10px 0 0; font-size: 14px; color: #9A9A9A`)}>{stat.label}</dd></div>
    ))}
    </dl>
    </div>
    </section>
  );
});
