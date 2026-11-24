import { Fragment, memo, useCallback, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { sx } from '../lib/css';
import type { Project, ProjectCategory } from '../content/types';
import { registerFloat } from './effects';
import { tilt, untilt } from './pointer';
import { Scramble } from './Scramble';

type Filter = 'all' | ProjectCategory;

const FILTERS: Array<{ id: Filter; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'product', label: 'Products' },
  { id: 'internal', label: 'Internal' },
  { id: 'personal', label: 'Personal' },
];

const BAR_HEIGHTS = [42, 58, 36, 70, 52, 84, 48, 66, 92, 60, 74, 100];
const bars = BAR_HEIGHTS.map((h, i) => ({
  h: `${h}%`,
  d: `${(i * 0.12).toFixed(2)}s`,
  c: i === BAR_HEIGHTS.length - 1 ? '#EDEDED' : '#2C2C2C',
}));

interface Props {
  projects: Project[];
  secret: string;
  active: boolean;
  onOpenCase: (id: string) => void;
}

export const Work = memo(function Work({ projects, secret, active, onOpenCase }: Props) {
  const [filter, setFilter] = useState<Filter>('all');
  const [picked, setPicked] = useState<string | null>(null);
  const [flip, setFlip] = useState(false);
  const [listFlip, setListFlip] = useState(false);
  const [hoverId, setHoverId] = useState<string | null>(null);

  const shown = useMemo(() => {
    const list = projects.filter((p) => filter === 'all' || p.cat === filter);
    return list.length > 0 ? list : projects;
  }, [projects, filter]);
  const s = shown.find((p) => p.id === picked) ?? shown[0];
  const selId = s.id;

  // The two keyframe names are identical; alternating them restarts the animation.
  const anim = flip ? 'dk-swap-a' : 'dk-swap-b';
  const sweep = flip ? 'dk-sweep-a' : 'dk-sweep-b';
  const listAnim = listFlip ? 'dk-swap-a' : 'dk-swap-b';

  const filters = FILTERS.map((f) => ({
    ...f,
    count: f.id === 'all' ? projects.length : projects.filter((p) => p.cat === f.id).length,
  }))
    .filter((f) => f.count > 0)
    .map((f) => {
      const on = f.id === filter;
      return {
        label: f.label,
        count: f.count,
        on,
        bg: on ? '#EDEDED' : 'transparent',
        color: on ? '#070707' : '#A8A8A8',
        pick: () => {
          setFilter(f.id);
          setPicked(null);
          setFlip((v) => !v);
          setListFlip((v) => !v);
        },
      };
    });

  const list = shown.map((p, i) => {
    const on = p.id === selId;
    return {
      id: p.id,
      no: String(i + 1).padStart(2, '0'),
      name: p.name,
      kind: p.kind,
      status: p.status,
      on,
      anim: listAnim,
      delay: `${(i * 0.04).toFixed(2)}s`,
      bg: on ? '#151515' : 'transparent',
      color: on ? '#FFFFFF' : '#C9C9C9',
      bar: on ? '#EDEDED' : 'transparent',
      pick: () => {
        if (p.id === selId) return;
        setPicked(p.id);
        setFlip((v) => !v);
      },
      enter: () => setHoverId(p.id),
    };
  });

  const sel = {
    name: s.name,
    role: s.role,
    status: s.status,
    desc: s.desc,
    stack: s.stack,
    host: s.url || `${s.id}.internal`,
    url: s.url,
    hasUrl: !!s.url,
    href: `https://${s.url}`,
    isWeb: s.type === 'web',
    isPhone: s.type === 'phone',
    isTerm: s.type === 'term',
    lines: (s.lines ?? []).map(([t, bright]) => ({ t, c: bright ? '#EDEDED' : '#8F8F8F' })),
  };

  const hovered = hoverId ? projects.find((p) => p.id === hoverId) : undefined;
  const fl = hovered ? { op: 1, sc: 1, name: hovered.name, status: hovered.status } : { op: 0, sc: 0.85, name: '', status: '' };
  const leaveP = useCallback(() => setHoverId(null), []);
  const openSel = () => {
    setHoverId(null);
    onOpenCase(selId);
  };

  return (
    <>
    <section id="work" style={sx(`position: relative; padding: 72px 0; border-top: 1px solid #1C1C1C`)}>
    <span aria-hidden="true" className="dk-secret" style={sx(`position: absolute; right: 0; top: 24px; font-family: var(--mono); font-size: 12px`)}>{secret}</span>
    <div className="dk-reveal" style={sx(`display: flex; flex-wrap: wrap; align-items: flex-end; justify-content: space-between; gap: 20px; margin-bottom: 32px`)}>
    <div style={sx(`display: flex; flex-direction: column; gap: 10px`)}>
    <span style={sx(`font-family: var(--mono); font-size: 13px; color: #8A8A8A`)}>02 · work</span>
    <h2 aria-label="Selected work" style={sx(`margin: 0; font-weight: 500; font-size: clamp(32px, 4vw, 48px); letter-spacing: -0.04em; line-height: 1`)}><span aria-hidden="true"><Scramble text="Selected work" when={active} /></span></h2>
    </div>
    <div role="group" aria-label="Filter projects" style={sx(`display: flex; flex-wrap: wrap; gap: 4px; padding: 4px; border: 1px solid #1C1C1C; border-radius: 999px`)}>
    {filters.map((f, i) => (<Fragment key={i}>
    <button type="button" onClick={f.pick} aria-pressed={f.on} style={sx(`min-height: 36px; padding: 0 14px; border: 0; border-radius: 999px; background: ${f.bg}; color: ${f.color}; font-size: 13px; font-weight: 500; transition: background .3s ease, color .3s ease`)}>{f.label} <span style={sx(`font-family: var(--mono); font-size: 11px; opacity: 0.7`)}>{f.count}</span></button>
    </Fragment>))}
    </div>
    </div>

    <div style={sx(`display: flex; flex-wrap: wrap; gap: 24px`)}>
    <ul className="dk-reveal" onMouseLeave={leaveP} style={sx(`flex: 1 1 300px; min-width: 0; list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 2px`)}>
    {list.map((p, i) => (<Fragment key={i}>
    <li style={sx(`animation: ${p.anim} .45s ease both; animation-delay: ${p.delay}`)}>
    <button type="button" onClick={p.pick} onMouseEnter={p.enter} aria-pressed={p.on} data-cursor="View" className="dk-row" style={sx(`position: relative; width: 100%; min-height: 60px; border: 0; border-radius: 14px; background: ${p.bg}; color: ${p.color}; display: flex; align-items: center; gap: 14px; padding: 0 16px; text-align: left`)}>
    <span aria-hidden="true" style={sx(`position: absolute; left: 0; top: 18px; width: 2px; height: 24px; border-radius: 2px; background: ${p.bar}`)}></span>
    <span style={sx(`font-family: var(--mono); font-size: 12px; color: #8A8A8A; flex: 0 0 22px`)}>{p.no}</span>
    <span style={sx(`flex-grow: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px`)}><span style={sx(`font-size: 16px; font-weight: 500; letter-spacing: -0.01em`)}>{p.name}</span><span style={sx(`font-size: 13px; color: #8F8F8F`)}>{p.kind}</span></span>
    <span style={sx(`font-family: var(--mono); font-size: 11px; color: #9A9A9A`)}>{p.status}</span>
    </button>
    </li>
    </Fragment>))}
    </ul>

    <article className="dk-sticky dk-reveal" aria-live="polite" style={sx(`flex: 999 1 440px; min-width: 0; align-self: flex-start; position: sticky; top: 24px; perspective: 1000px`)}>
    <div className="dk-tilt dk-spot" onMouseMove={tilt} onMouseLeave={untilt} style={sx(`position: relative; border: 1px solid #1C1C1C; border-radius: 24px; background: #0C0C0C; padding: 12px; display: flex; flex-direction: column; gap: 20px`)}>
    <button type="button" onClick={openSel} data-cursor="Open" aria-label="Open case study" style={sx(`position: relative; z-index: 1; display: block; width: 100%; aspect-ratio: 16 / 10; border-radius: 16px; border: 1px solid #1C1C1C; background: radial-gradient(#1E1E1E 1px, transparent 1px) 0 0/22px 22px, #090909; overflow: hidden; padding: 18px 20px; box-sizing: border-box; color: #EDEDED; text-align: left`)}>
    <span aria-hidden="true" style={sx(`position: absolute; inset: 0; z-index: 4; background: linear-gradient(105deg, transparent 35%, rgba(255,255,255,0.10) 50%, transparent 65%); animation: ${sweep} .9s cubic-bezier(.4,0,.2,1) both; pointer-events: none`)}></span>
    <span style={sx(`position: absolute; z-index: 3; left: 20px; right: 20px; top: 18px; display: block`)}>
<span style={sx(`position: relative; z-index: 3; display: flex; justify-content: space-between; align-items: center; font-family: var(--mono); font-size: 12px; color: #9A9A9A`)}><span style={sx(`display: flex; align-items: center; gap: 8px`)}><span aria-hidden="true" style={sx(`width: 6px; height: 6px; border-radius: 50%; background: #EDEDED`)}></span>{sel.host}</span><span style={sx(`display: flex; align-items: center; gap: 6px`)}><span aria-hidden="true" style={sx(`width: 6px; height: 6px; border-radius: 50%; background: #EDEDED; animation: dk-rec 1.2s steps(1) infinite`)}></span>PREVIEW</span></span>
    <span style={sx(`position: relative; z-index: 3; display: block; margin-top: 10px; font-weight: 600; font-size: clamp(28px, 3.6vw, 48px); letter-spacing: -0.05em; line-height: 0.95; animation: ${anim} .6s cubic-bezier(.2,.8,.2,1) both`)}>{sel.name}</span>
            </span>

            {sel.isWeb && (<>
    <span aria-hidden="true" style={sx(`position: absolute; z-index: 2; left: 6%; right: 6%; bottom: 0; height: 58%; border: 1px solid #2A2A2A; border-bottom: 0; border-radius: 12px 12px 0 0; background: #0B0B0B; overflow: hidden; display: flex; flex-direction: column; animation: ${anim} .7s cubic-bezier(.2,.8,.2,1) .1s both`)}>
    <span style={sx(`height: 24px; flex: none; display: flex; align-items: center; gap: 5px; padding: 0 10px; border-bottom: 1px solid #1C1C1C`)}><span style={sx(`width: 6px; height: 6px; border-radius: 50%; background: #333333`)}></span><span style={sx(`width: 6px; height: 6px; border-radius: 50%; background: #333333`)}></span><span style={sx(`width: 6px; height: 6px; border-radius: 50%; background: #333333`)}></span><span className="dk-skel" style={sx(`height: 8px; width: 30%; margin-left: 12px`)}></span></span>
    <span style={sx(`flex-grow: 1; display: flex; gap: 10px; padding: 10px; min-height: 0`)}>
    <span style={sx(`flex: 0 0 16%; display: flex; flex-direction: column; gap: 7px`)}><span className="dk-skel" style={sx(`height: 8px; width: 80%`)}></span><span className="dk-skel" style={sx(`height: 8px; width: 60%`)}></span><span className="dk-skel" style={sx(`height: 8px; width: 70%`)}></span><span className="dk-skel" style={sx(`height: 8px; width: 50%`)}></span></span>
    <span style={sx(`flex-grow: 1; min-width: 0; display: flex; flex-direction: column; gap: 8px`)}>
    <span style={sx(`display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 6px`)}><span className="dk-skel" style={sx(`height: 26px`)}></span><span className="dk-skel" style={sx(`height: 26px`)}></span><span className="dk-skel" style={sx(`height: 26px`)}></span></span>
    <span style={sx(`flex-grow: 1; min-height: 0; display: flex; align-items: flex-end; gap: 4px; border-bottom: 1px solid #222222`)}>
    {bars.map((b, i) => (<Fragment key={i}><span style={sx(`flex: 1 1 0; height: ${b.h}; background: ${b.c}; border-radius: 3px 3px 0 0; transform-origin: bottom; animation: dk-grow 2.6s ease-in-out infinite; animation-delay: ${b.d}`)}></span></Fragment>))}
    </span>
    </span>
    </span>
    </span>
    </>)}

    {sel.isPhone && (<>
    <span aria-hidden="true" style={sx(`position: absolute; z-index: 2; right: 10%; bottom: 0; width: 26%; height: 80%; border: 1px solid #2E2E2E; border-bottom: 0; border-radius: 26px 26px 0 0; background: #0B0B0B; overflow: hidden; padding: 10px 8px 0; box-sizing: border-box; animation: ${anim} .7s cubic-bezier(.2,.8,.2,1) .1s both`)}>
    <span style={sx(`display: block; width: 34%; height: 6px; border-radius: 6px; background: #1E1E1E; margin: 0 auto 10px`)}></span>
    <span style={sx(`display: flex; flex-direction: column; gap: 7px; animation: dk-scrollui 7s ease-in-out infinite alternate`)}>
    <span className="dk-skel" style={sx(`height: 10px; width: 55%`)}></span>
    <span className="dk-skel" style={sx(`height: 72px; border-radius: 12px`)}></span>
    <span style={sx(`display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 6px`)}><span className="dk-skel" style={sx(`height: 44px; border-radius: 10px`)}></span><span className="dk-skel" style={sx(`height: 44px; border-radius: 10px`)}></span><span className="dk-skel" style={sx(`height: 44px; border-radius: 10px`)}></span><span className="dk-skel" style={sx(`height: 44px; border-radius: 10px`)}></span></span>
    <span className="dk-skel" style={sx(`height: 10px; width: 80%`)}></span>
    <span className="dk-skel" style={sx(`height: 56px; border-radius: 12px`)}></span>
    <span className="dk-skel" style={sx(`height: 10px; width: 70%`)}></span>
    <span className="dk-skel" style={sx(`height: 56px; border-radius: 12px`)}></span>
    </span>
    </span>
    <span aria-hidden="true" style={sx(`position: absolute; z-index: 2; left: 6%; bottom: 14%; width: 46%; display: flex; flex-direction: column; gap: 8px`)}><span className="dk-skel" style={sx(`height: 10px; width: 90%`)}></span><span className="dk-skel" style={sx(`height: 10px; width: 70%`)}></span><span className="dk-skel" style={sx(`height: 10px; width: 80%`)}></span></span>
    </>)}

    {sel.isTerm && (<>
    <span aria-hidden="true" style={sx(`position: absolute; z-index: 2; left: 6%; right: 6%; bottom: 0; height: 58%; border: 1px solid #2A2A2A; border-bottom: 0; border-radius: 12px 12px 0 0; background: #050505; overflow: hidden; padding: 12px 14px; box-sizing: border-box; font-family: var(--mono); font-size: 11px; line-height: 1.8; animation: ${anim} .7s cubic-bezier(.2,.8,.2,1) .1s both`)}>
    <span style={sx(`display: block; animation: dk-scrollui 9s linear infinite alternate`)}>
    {sel.lines.map((l, i) => (<Fragment key={i}><span style={sx(`display: block; color: ${l.c}; white-space: nowrap`)}>{l.t}</span></Fragment>))}
    </span>
    </span>
    </>)}
    <span aria-hidden="true" style={sx(`position: absolute; z-index: 3; left: 0; right: 0; bottom: 0; height: 2px; background: #1C1C1C`)}><span style={sx(`display: block; height: 2px; background: #EDEDED; transform-origin: left center; animation: dk-play 8s linear infinite`)}></span></span>
    </button>

    <div style={sx(`position: relative; z-index: 1; padding: 4px 12px 14px; display: flex; flex-direction: column; gap: 14px; animation: ${anim} .6s cubic-bezier(.2,.8,.2,1) .08s both`)}>
    <div style={sx(`display: flex; flex-wrap: wrap; justify-content: space-between; gap: 8px; font-size: 13px; color: #9A9A9A`)}><span>{sel.role}</span><span style={sx(`font-family: var(--mono)`)}>{sel.status}</span></div>
    <p style={sx(`margin: 0; font-size: 16px; line-height: 1.6; color: #C9C9C9`)}>{sel.desc}</p>
    <div style={sx(`display: flex; flex-wrap: wrap; gap: 6px`)}>
    {sel.stack.map((s, i) => (<Fragment key={i}><span style={sx(`border: 1px solid #262626; border-radius: 999px; padding: 5px 12px; font-family: var(--mono); font-size: 12px; color: #C9C9C9`)}>{s}</span></Fragment>))}
    </div>
    <div style={sx(`display: flex; flex-wrap: wrap; gap: 8px`)}>
    <button type="button" onClick={openSel} className="dk-solid dk-shine dk-mag" style={sx(`display: inline-flex; align-items: center; gap: 8px; min-height: 44px; padding: 0 18px; border: 0; border-radius: 12px; background: #EDEDED; color: #070707; font-weight: 500; font-size: 14px`)}>Read case study<svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M13 6l6 6-6 6"/></svg></button>
    {sel.hasUrl && (<>
    <a href={sel.href} target="_blank" rel="noreferrer" className="dk-ghost dk-shine dk-mag" style={sx(`display: inline-flex; align-items: center; gap: 8px; min-height: 44px; padding: 0 18px; border-radius: 12px; border: 1px solid #262626; font-weight: 500; font-size: 14px; text-decoration: none`)}>Visit {sel.url}<svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M7 17L17 7M9 7h8v8"/></svg></a>
    </>)}
    </div>
    </div>
    </div>
    </article>
    </div>
    </section>
      {createPortal(
        <div className="dk-float" aria-hidden="true" ref={registerFloat}>
        <div style={sx(`opacity: ${fl.op}; transform: scale(${fl.sc}) rotate(-3deg); transform-origin: top left; transition: opacity .25s ease, transform .35s cubic-bezier(.2,.8,.2,1); border-radius: 16px; border: 1px solid #2A2A2A; background: #0E0E0E; box-shadow: 0 24px 60px rgba(0,0,0,0.6); padding: 10px; display: flex; flex-direction: column; gap: 10px`)}>
        <div style={sx(`aspect-ratio: 16 / 10; border-radius: 10px; background: radial-gradient(#1E1E1E 1px, transparent 1px) 0 0/14px 14px, #090909; border: 1px solid #1C1C1C; padding: 10px; box-sizing: border-box; display: flex; flex-direction: column; justify-content: flex-end; gap: 6px`)}>
        <div className="dk-skel" style={sx(`height: 7px; width: 70%`)}></div><div className="dk-skel" style={sx(`height: 7px; width: 45%`)}></div><div className="dk-skel" style={sx(`height: 28px`)}></div>
        </div>
        <div style={sx(`display: flex; justify-content: space-between; align-items: baseline; gap: 8px; padding: 0 4px 2px`)}><span style={sx(`font-weight: 600; font-size: 15px; letter-spacing: -0.02em`)}>{fl.name}</span><span style={sx(`font-family: var(--mono); font-size: 10px; color: #9A9A9A`)}>{fl.status}</span></div>
        </div>
        </div>,
        document.body,
      )}
    </>
  );
});
