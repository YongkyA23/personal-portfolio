import { Fragment, memo, useEffect, useRef } from 'react';
import { sx } from '../lib/css';
import type { Experience as ExperienceItem } from '../content/types';
import { prefersReducedMotion, supportsScrollTimeline } from '../lib/env';
import { Scramble } from './Scramble';

interface Props {
  items: ExperienceItem[];
  active: boolean;
}

/**
 * On wide screens with scroll-driven animations, the section pins and vertical
 * scrolling moves the cards sideways. Everywhere else it is a row you can swipe.
 */
export const Experience = memo(function Experience({ items, active }: Props) {
  const secRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const sec = secRef.current;
    const pin = sec?.querySelector<HTMLElement>('.dk-hpin');
    const track = sec?.querySelector<HTMLElement>('.dk-htrack');
    if (!sec || !pin || !track) return;

    const layout = () => {
      const on = supportsScrollTimeline() && !prefersReducedMotion();
      sec.classList.toggle('is-on', on);
      if (!on) {
        sec.style.height = '';
        return;
      }
      const shift = Math.max(0, track.scrollWidth - pin.clientWidth);
      track.style.setProperty('--shift', `${shift}px`);
      sec.style.height = `${pin.offsetHeight + shift}px`;
    };

    layout();
    const observer = new ResizeObserver(layout);
    observer.observe(pin);
    observer.observe(track);
    window.addEventListener('resize', layout);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', layout);
      sec.classList.remove('is-on');
      sec.style.height = '';
    };
  }, [items]);

  const total = String(items.length).padStart(2, '0');
  const experience = items.map((e, i) => ({ ...e, idx: `${String(i + 1).padStart(2, '0')} / ${total}` }));

  return (
    <section ref={secRef} id="experience" className="dk-hsec" style={sx(`border-top: 1px solid #1C1C1C`)}>
    <div className="dk-hpin" style={sx(`padding: 72px 0`)}>
    <div style={sx(`padding: 0 clamp(20px, 5vw, 64px) 32px max(clamp(20px, 5vw, 64px), calc((100% - 1080px) / 2 + clamp(20px, 5vw, 64px))); display: flex; flex-wrap: wrap; align-items: flex-end; justify-content: space-between; gap: 16px`)}>
    <div style={sx(`display: flex; flex-direction: column; gap: 10px`)}>
    <span style={sx(`font-family: var(--mono); font-size: 13px; color: #8A8A8A`)}>03 · experience</span>
    <h2 aria-label="Experience" style={sx(`margin: 0; font-weight: 500; font-size: clamp(32px, 4vw, 48px); letter-spacing: -0.04em; line-height: 1`)}><span aria-hidden="true"><Scramble text="Experience" when={active} /></span></h2>
    </div>
    <div style={sx(`display: flex; align-items: center; gap: 14px; font-family: var(--mono); font-size: 12px; color: #8A8A8A`)}>
    <span>KEEP SCROLLING →</span>
    <span aria-hidden="true" style={sx(`width: 120px; height: 2px; border-radius: 2px; background: #1C1C1C; overflow: hidden`)}><span className="dk-hprog" style={sx(`height: 2px; background: #EDEDED`)}></span></span>
    </div>
    </div>
    <div className="dk-htrack" style={sx(`padding: 0 clamp(20px, 5vw, 64px) 8px max(clamp(20px, 5vw, 64px), calc((100vw - 264px - 1080px) / 2 + clamp(20px, 5vw, 64px)))`)}>
    {experience.map((e, i) => (<Fragment key={i}>
    <article style={sx(`flex: none; width: min(420px, 80vw); min-height: 320px; box-sizing: border-box; border: 1px solid #1C1C1C; border-radius: 24px; background: #0B0B0B; padding: 28px; display: flex; flex-direction: column; gap: 18px`)}>
    <div style={sx(`display: flex; justify-content: space-between; font-family: var(--mono); font-size: 12px; color: #9A9A9A`)}><span>{e.when}</span><span>{e.idx}</span></div>
    <div style={sx(`font-weight: 600; font-size: 64px; letter-spacing: -0.06em; line-height: 0.9; color: #2E2E2E`)}>{e.year}</div>
    <div style={sx(`display: flex; flex-direction: column; gap: 4px; margin-top: auto`)}><span style={sx(`font-size: 22px; font-weight: 500; letter-spacing: -0.02em`)}>{e.role}</span><span style={sx(`font-size: 14px; color: #9A9A9A`)}>{e.org}</span></div>
    <p style={sx(`margin: 0; font-size: 15px; line-height: 1.6; color: #B5B5B5`)}>{e.note}</p>
    </article>
    </Fragment>))}
    </div>
    </div>
    </section>
  );
});
