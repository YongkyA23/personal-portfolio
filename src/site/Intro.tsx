import { sx } from '../lib/css';

interface Props {
  name: string;
  initials: string;
  projectCount: number;
  experienceCount: number;
  onSkip: () => void;
}

/** First-visit loading screen. The lift-off is a CSS animation; the parent unmounts it afterwards. */
export function Intro({ name, initials, projectCount, experienceCount, onSkip }: Props) {
  const skip = onSkip;
  return (
    <div className="dk-intro" role="status" aria-label="Loading portfolio">
    <div style={sx(`display: flex; justify-content: space-between; align-items: center; gap: 16px`)}>
    <div style={sx(`display: flex; align-items: center; gap: 12px`)}>
    <span aria-hidden="true" style={sx(`width: 40px; height: 40px; border-radius: 50%; background: #EDEDED; color: #050505; display: flex; align-items: center; justify-content: center; font-weight: 600; font-size: 14px`)}>{initials}</span>
    <span style={sx(`font-weight: 500; font-size: 15px`)}>{name}</span>
    </div>
    <button type="button" onClick={skip} className="dk-ghost" style={sx(`min-height: 44px; padding: 0 16px; border-radius: 999px; border: 1px solid #262626; background: transparent; color: #C9C9C9; font-family: var(--mono); font-size: 12px; letter-spacing: 0.06em`)}>SKIP INTRO →</button>
    </div>
    <div className="dk-log" style={sx(`font-family: var(--mono); font-size: 14px; line-height: 2; color: #8F8F8F`)}>
    <span style={sx(`animation-delay: .15s`)}>&gt; init yongky.portfolio</span>
    <span style={sx(`animation-delay: .55s`)}>&gt; GET /api/projects <span style={sx(`color: #EDEDED`)}>200 · {projectCount} items</span></span>
    <span style={sx(`animation-delay: .95s`)}>&gt; GET /api/experience <span style={sx(`color: #EDEDED`)}>200 · {experienceCount} items</span></span>
    <span style={sx(`animation-delay: 1.35s`)}>&gt; waking up the AI agent <span style={sx(`color: #EDEDED`)}>ok</span></span>
    <span style={sx(`animation-delay: 1.8s; color: #EDEDED`)}>&gt; ready<span className="dk-blink">_</span></span>
    </div>
    <div style={sx(`display: flex; flex-direction: column; gap: 18px`)}>
    <div style={sx(`display: flex; justify-content: space-between; align-items: flex-end; gap: 16px`)}>
    <span style={sx(`font-family: var(--mono); font-size: 12px; color: #8A8A8A`)}>FIRST VISIT ONLY · VIBECODER · JAKARTA</span>
    <span style={sx(`font-weight: 500; font-size: clamp(72px, 12vw, 168px); line-height: 0.8; letter-spacing: -0.06em`)}><span className="dk-pct"></span><span style={sx(`color: #6E6E6E`)}>%</span></span>
    </div>
    <div aria-hidden="true" style={sx(`height: 1px; background: #222222`)}><div className="dk-bar" style={sx(`height: 1px; background: #EDEDED`)}></div></div>
    </div>
    </div>
  );
}
