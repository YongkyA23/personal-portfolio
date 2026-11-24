import { memo, useMemo } from 'react';
import { sx } from '../lib/css';

interface Props {
  text: string;
}

export const Statement = memo(function Statement({ text }: Props) {
  // Word i lights up between a% and b% of the section's pass through the viewport.
  const words = useMemo(() => {
    const list = text.split(/\s+/).filter(Boolean);
    return list.map((t, i) => {
      const a = 14 + (i / list.length) * 46;
      return { t, style: sx(`--a: ${a.toFixed(1)}%; --b: ${(a + 5).toFixed(1)}%`) };
    });
  }, [text]);
  return (
    <section aria-label="How I work" className="dk-about" style={sx(`padding: clamp(80px, 12vw, 160px) clamp(20px, 5vw, 64px); border-top: 1px solid #1C1C1C`)}>
      <div style={sx(`max-width: 1080px; margin: 0 auto; display: flex; flex-direction: column; gap: 28px`)}>
        <span style={sx(`font-family: var(--mono); font-size: 13px; color: #8A8A8A`)}>~/yongky · how i work</span>
        <p className="dk-skew" style={sx(`margin: 0; font-size: clamp(30px, 4.2vw, 58px); font-weight: 500; line-height: 1.15; letter-spacing: -0.035em`)}>
          {words.map((w, i) => (
            <span key={i} className="dk-word" style={w.style}>
              {w.t}
            </span>
          ))}
        </p>
      </div>
    </section>
  );
});
