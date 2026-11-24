import { Fragment, memo, useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { sx } from '../lib/css';
import type { Profile } from '../content/types';
import { sendHirePing } from '../lib/api';

interface Props {
  profile: Profile;
  copied: boolean;
  onCopy: () => void;
}

const HOLD_MS = 1600;
const burst = Array.from({ length: 12 }, (_, i) => ({ a: `${i * 30}deg`, d: `${((i % 3) * 0.04).toFixed(2)}s` }));
const year = new Date().getFullYear();

export const Contact = memo(function Contact({ profile, copied, onCopy }: Props) {
  const [holding, setHolding] = useState(false);
  const [hired, setHired] = useState(false);
  const [saved, setSaved] = useState(false);
  const timer = useRef(0);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const begin = () => {
    if (hired || holding) return;
    setHolding(true);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      setHolding(false);
      setHired(true);
      void sendHirePing().then(setSaved);
    }, HOLD_MS);
  };
  const end = () => {
    window.clearTimeout(timer.current);
    setHolding(false);
  };

  const copy = onCopy;
  const copyLabel = copied ? 'COPIED ✓' : 'COPY';
  const holdCls = hired ? 'is-done' : holding ? 'is-holding' : '';
  const holdInner = hired ? '#EDEDED' : '#0A0A0A';
  const holdInk = hired ? '#070707' : '#EDEDED';
  const holdTitle = hired ? 'Sent ✓' : holding ? 'Keep holding' : 'Hold to hire';
  const holdSub = hired ? 'talk soon' : holding ? 'almost…' : 'press and hold';
  const holdNote = saved
    ? 'Ping received. For a real conversation, email works best.'
    : 'Nice. Now make it official: an email reaches me fastest.';
  const holdStart = (e: PointerEvent) => {
    e.preventDefault();
    begin();
  };
  const holdEnd = end;
  const holdKey = (e: KeyboardEvent) => {
    if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) {
      e.preventDefault();
      begin();
    }
  };
  const holdKeyUp = (e: KeyboardEvent) => {
    if (e.key === ' ' || e.key === 'Enter') end();
  };
  const resetHold = () => {
    setHired(false);
    setSaved(false);
  };

  return (
    <section id="contact" style={sx(`position: relative; padding: 96px 0 40px; border-top: 1px solid #1C1C1C; display: flex; flex-direction: column; gap: 32px`)}>
    <span aria-hidden="true" className="dk-secret" style={sx(`position: absolute; left: 0; bottom: 120px; font-family: var(--mono); font-size: 12px`)}>{profile.secrets[2]}</span>
    <span className="dk-reveal" style={sx(`font-family: var(--mono); font-size: 13px; color: #8A8A8A`)}>05 · contact</span>
    <div style={sx(`display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 40px`)}>
    <div style={sx(`flex: 999 1 420px; min-width: 0; display: flex; flex-direction: column; gap: 32px`)}>
    <h2 className="dk-reveal" style={sx(`margin: 0; font-weight: 500; font-size: clamp(44px, 7vw, 96px); letter-spacing: -0.05em; line-height: 0.95`)}>{profile.contactHeadline[0]}<br /><span className="dk-sheen">{profile.contactHeadline[1]}</span></h2>
    <div style={sx(`display: flex; flex-wrap: wrap; gap: 10px`)}>
    <button type="button" onClick={copy} data-cursor="Copy" className="dk-solid dk-shine dk-mag" style={sx(`min-height: 52px; padding: 0 20px; border: 0; border-radius: 14px; background: #EDEDED; color: #070707; display: inline-flex; align-items: center; gap: 12px; font-size: 15px; font-weight: 500`)}>{profile.email} <span style={sx(`font-family: var(--mono); font-size: 12px; border-left: 1px solid #BDBDBD; padding-left: 12px`)}>{copyLabel}</span></button>
    <a href={profile.linkedin} target="_blank" rel="noreferrer" className="dk-ghost dk-shine dk-mag" style={sx(`display: inline-flex; align-items: center; min-height: 52px; padding: 0 20px; border-radius: 14px; border: 1px solid #262626; font-size: 15px; text-decoration: none`)}>LinkedIn</a>
    <a href={profile.github} target="_blank" rel="noreferrer" className="dk-ghost dk-shine dk-mag" style={sx(`display: inline-flex; align-items: center; min-height: 52px; padding: 0 20px; border-radius: 14px; border: 1px solid #262626; font-size: 15px; text-decoration: none`)}>GitHub</a>
    </div>
    </div>

    <div style={sx(`flex: 1 1 220px; display: flex; flex-direction: column; align-items: center; gap: 14px`)}>
    <div style={sx(`position: relative; width: 176px; height: 176px`)}>
    {hired && (<>
    {burst.map((b, i) => (<Fragment key={i}><span aria-hidden="true" style={sx(`position: absolute; left: 84px; top: 84px; width: 8px; height: 8px; border-radius: 50%; background: #EDEDED; --a: ${b.a}; animation: dk-burst .9s cubic-bezier(.2,.8,.2,1) ${b.d} both`)}></span></Fragment>))}
    </>)}
    <button type="button" className={`dk-hold ${holdCls}`} data-cursor={hired ? undefined : 'Hold'} onPointerDown={holdStart} onPointerUp={holdEnd} onPointerLeave={holdEnd} onKeyDown={holdKey} onKeyUp={holdKeyUp} aria-label="Hold to send a hire request" style={sx(`position: relative; width: 176px; height: 176px; border-radius: 50%; border: 0; padding: 6px; box-sizing: border-box; touch-action: none; user-select: none`)}>
    <span style={sx(`width: 100%; height: 100%; border-radius: 50%; background: ${holdInner}; color: ${holdInk}; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 6px; transition: background .4s ease, color .4s ease`)}>
    <span style={sx(`font-weight: 600; font-size: 20px; letter-spacing: -0.03em`)}>{holdTitle}</span>
    <span style={sx(`font-family: var(--mono); font-size: 11px; opacity: 0.7`)}>{holdSub}</span>
    </span>
    </button>
    </div>
    {hired && (<>
    <p style={sx(`margin: 0; max-width: 260px; text-align: center; font-size: 13px; line-height: 1.5; color: #9A9A9A; animation: dk-swap-a .5s ease both`)}>{holdNote} <button type="button" onClick={resetHold} style={sx(`border: 0; background: transparent; color: #EDEDED; text-decoration: underline; font-size: 13px; padding: 0; min-height: 24px`)}>Reset</button></p>
    </>)}
    </div>
    </div>
    <footer style={sx(`margin-top: 48px; padding-top: 20px; border-top: 1px solid #1C1C1C; display: flex; flex-wrap: wrap; justify-content: space-between; gap: 8px 24px; font-family: var(--mono); font-size: 12px; color: #8A8A8A`)}>
    <span>© {year} {profile.name}</span><span>⌘K to search · ` for terminal · pull the cord</span>
    </footer>
    </section>
  );
});
