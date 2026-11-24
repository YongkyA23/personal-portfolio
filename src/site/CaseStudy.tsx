import { Fragment, useEffect, useRef } from 'react';
import { sx } from '../lib/css';
import { useFocusTrap } from '../lib/focus';
import type { Project } from '../content/types';

interface Props {
  project: Project;
  nextName: string;
  /** Alternates on every open so the title animation replays. */
  flip: boolean;
  onClose: () => void;
  onNext: () => void;
}

export function CaseStudy({ project, nextName, flip, onClose, onNext }: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  useFocusTrap(rootRef);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    root.scrollTop = 0;
    root.focus({ preventScroll: true });
  }, [project.id]);

  const closeCase = onClose;
  const cs = {
    slug: project.id,
    name: project.name,
    role: project.role,
    status: project.status,
    desc: project.desc,
    stackText: project.stack.join(', '),
    url: project.url,
    hasUrl: !!project.url,
    noUrl: !project.url,
    href: `https://${project.url}`,
    built: project.built,
    how: project.how,
    outcome: project.outcome,
    nextName,
    next: onNext,
    tanim: flip ? 'dk-title-a' : 'dk-title-b',
    shot: project.shot || '',
    phone: project.type === 'phone',
    host: project.url || `${project.id}.internal`,
  };

  return (
    <div ref={rootRef} tabIndex={-1} className="dk-case" role="dialog" aria-modal="true" aria-label="Case study">
    <div style={sx(`position: sticky; top: 0; z-index: 2; background: rgba(7,7,7,0.85); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); border-bottom: 1px solid #1C1C1C`)}>
    <div style={sx(`max-width: 1080px; margin: 0 auto; padding: 10px clamp(20px, 5vw, 64px); display: flex; align-items: center; justify-content: space-between; gap: 12px`)}>
    <button type="button" onClick={closeCase} className="dk-ghost dk-mag" style={sx(`min-height: 44px; padding: 0 16px; border-radius: 12px; border: 1px solid #262626; background: transparent; color: #EDEDED; font-size: 14px`)}>← Back to work</button>
    <span style={sx(`font-family: var(--mono); font-size: 12px; color: #8A8A8A`)}>~/work/{cs.slug}</span>
    <button type="button" onClick={cs.next} className="dk-ghost dk-mag" style={sx(`min-height: 44px; padding: 0 16px; border-radius: 12px; border: 1px solid #262626; background: transparent; color: #EDEDED; font-size: 14px`)}>Next: {cs.nextName} →</button>
    </div>
    </div>
    <div style={sx(`max-width: 1080px; margin: 0 auto; padding: clamp(48px, 8vw, 96px) clamp(20px, 5vw, 64px) 64px; display: flex; flex-direction: column; gap: 40px`)}>
    <div style={sx(`display: flex; flex-direction: column; gap: 20px`)}>
    <span style={sx(`font-family: var(--mono); font-size: 13px; color: #8A8A8A; animation: ${cs.tanim} .7s ease .3s both`)}>{cs.role} · {cs.status}</span>
    <h1 style={sx(`margin: 0; font-weight: 600; font-size: clamp(60px, 11vw, 168px); line-height: 0.9; letter-spacing: -0.06em; animation: ${cs.tanim} .9s cubic-bezier(.2,.8,.2,1) .2s both`)}>{cs.name}</h1>
    <p style={sx(`margin: 0; max-width: 720px; font-size: clamp(18px, 1.8vw, 22px); line-height: 1.55; color: #B5B5B5; animation: ${cs.tanim} .9s cubic-bezier(.2,.8,.2,1) .35s both`)}>{cs.desc}</p>
    </div>
    <dl style={sx(`margin: 0; display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); border: 1px solid #1C1C1C; border-radius: 20px; overflow: hidden; animation: ${cs.tanim} .9s ease .45s both`)}>
    <div style={sx(`padding: 20px; border-right: 1px solid #1C1C1C`)}><dt style={sx(`font-family: var(--mono); font-size: 11px; color: #8A8A8A`)}>ROLE</dt><dd style={sx(`margin: 8px 0 0; font-size: 15px`)}>{cs.role}</dd></div>
    <div style={sx(`padding: 20px; border-right: 1px solid #1C1C1C`)}><dt style={sx(`font-family: var(--mono); font-size: 11px; color: #8A8A8A`)}>STATUS</dt><dd style={sx(`margin: 8px 0 0; font-size: 15px`)}>{cs.status}</dd></div>
    <div style={sx(`padding: 20px; border-right: 1px solid #1C1C1C`)}><dt style={sx(`font-family: var(--mono); font-size: 11px; color: #8A8A8A`)}>STACK</dt><dd style={sx(`margin: 8px 0 0; font-size: 15px; line-height: 1.5`)}>{cs.stackText}</dd></div>
    <div style={sx(`padding: 20px`)}><dt style={sx(`font-family: var(--mono); font-size: 11px; color: #8A8A8A`)}>LINK</dt><dd style={sx(`margin: 8px 0 0; font-size: 15px`)}>
    {cs.hasUrl && (<><a href={cs.href} target="_blank" rel="noreferrer">{cs.url} ↗</a></>)}
    {cs.noUrl && (<><span style={sx(`color: #9A9A9A`)}>Not public</span></>)}
    </dd></div>
    </dl>
    <div style={sx(`position: relative; aspect-ratio: 16 / 8; border-radius: 24px; border: 1px solid #1C1C1C; background: radial-gradient(#1E1E1E 1px, transparent 1px) 0 0/24px 24px, #090909; overflow: hidden; display: flex; align-items: center; justify-content: center`)}>
    {cs.shot ? (
    <div aria-hidden="true" className={cs.phone ? 'pv-case is-phone' : 'pv-case'}>
    {!cs.phone && (<div className="pv-case-bar"><span></span><span></span><span></span><span className="pv-url">{cs.host}</span></div>)}
    <div className={cs.phone ? 'pv-screen is-phone' : 'pv-screen'}><img className="pv-shot" src={cs.shot} alt="" decoding="async" />{cs.phone && <span className="pv-notch"></span>}</div>
    </div>
    ) : (
    <div aria-hidden="true" style={sx(`position: absolute; left: 8%; right: 8%; bottom: 0; height: 74%; border: 1px solid #2A2A2A; border-bottom: 0; border-radius: 16px 16px 0 0; background: #0B0B0B; padding: 18px; box-sizing: border-box; display: flex; flex-direction: column; gap: 12px`)}>
    <div className="dk-skel" style={sx(`height: 12px; width: 30%`)}></div>
    <div style={sx(`display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px`)}><div className="dk-skel" style={sx(`height: 64px; border-radius: 12px`)}></div><div className="dk-skel" style={sx(`height: 64px; border-radius: 12px`)}></div><div className="dk-skel" style={sx(`height: 64px; border-radius: 12px`)}></div></div>
    <div className="dk-skel" style={sx(`flex-grow: 1; border-radius: 12px`)}></div>
    </div>
    )}
    <div aria-hidden="true" style={sx(`position: absolute; left: 0; right: 0; bottom: 0; height: 2px; background: #1C1C1C`)}><div style={sx(`height: 2px; background: #EDEDED; transform-origin: left center; animation: dk-play 8s linear infinite`)}></div></div>
    </div>
    <div style={sx(`display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 32px`)}>
    <div style={sx(`display: flex; flex-direction: column; gap: 14px`)}>
    <span style={sx(`font-family: var(--mono); font-size: 12px; color: #8A8A8A; padding-bottom: 12px; border-bottom: 1px solid #1C1C1C`)}>01 · WHAT I BUILT</span>
    <ul style={sx(`margin: 0; padding: 0; list-style: none; display: flex; flex-direction: column; gap: 10px`)}>
    {cs.built.map((b, i) => (<Fragment key={i}><li style={sx(`display: flex; gap: 10px; font-size: 15px; line-height: 1.55; color: #D4D4D4`)}><span aria-hidden="true" style={sx(`color: #8A8A8A`)}>—</span><span>{b}</span></li></Fragment>))}
    </ul>
    </div>
    <div style={sx(`display: flex; flex-direction: column; gap: 14px`)}>
    <span style={sx(`font-family: var(--mono); font-size: 12px; color: #8A8A8A; padding-bottom: 12px; border-bottom: 1px solid #1C1C1C`)}>02 · HOW IT WAS BUILT</span>
    <p style={sx(`margin: 0; font-size: 15px; line-height: 1.65; color: #D4D4D4`)}>{cs.how}</p>
    </div>
    <div style={sx(`display: flex; flex-direction: column; gap: 14px`)}>
    <span style={sx(`font-family: var(--mono); font-size: 12px; color: #8A8A8A; padding-bottom: 12px; border-bottom: 1px solid #1C1C1C`)}>03 · OUTCOME</span>
    <ul style={sx(`margin: 0; padding: 0; list-style: none; display: flex; flex-direction: column; gap: 10px`)}>
    {cs.outcome.map((o, i) => (<Fragment key={i}><li style={sx(`font-size: 20px; font-weight: 500; letter-spacing: -0.02em; line-height: 1.3`)}>{o}</li></Fragment>))}
    </ul>
    </div>
    </div>
    <button type="button" onClick={cs.next} className="dk-row" style={sx(`margin-top: 24px; border: 0; border-top: 1px solid #1C1C1C; background: transparent; color: #EDEDED; padding: 40px 12px; display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 12px; text-align: left; border-radius: 0 0 20px 20px`)}>
    <span style={sx(`display: flex; flex-direction: column; gap: 8px`)}><span style={sx(`font-family: var(--mono); font-size: 12px; color: #8A8A8A`)}>NEXT CASE STUDY</span><span style={sx(`font-weight: 600; font-size: clamp(40px, 6vw, 80px); letter-spacing: -0.05em; line-height: 1`)}>{cs.nextName}</span></span>
    <span aria-hidden="true" className="dk-mag" style={sx(`width: 64px; height: 64px; border-radius: 50%; border: 1px solid #3A3A3A; display: flex; align-items: center; justify-content: center`)}><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M5 12h14M13 6l6 6-6 6"/></svg></span>
    </button>
    </div>
    </div>
  );
}
