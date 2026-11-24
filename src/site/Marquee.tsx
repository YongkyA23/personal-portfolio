import { memo } from 'react';
import { sx } from '../lib/css';

interface Props {
  rows: [string[], string[]];
}

/** Two rows drifting in opposite directions. Each row is rendered twice so the loop is seamless. */
export const Marquee = memo(function Marquee({ rows }: Props) {
  const row = (words: string[], outlineEven: boolean) =>
    [...words, ...words].map((word, i) => (
      <span key={i} className={((i % words.length) % 2 === 0) === outlineEven ? 'dk-o' : undefined}>
        {word}
      </span>
    ));
  return (
    <div aria-hidden="true" className="dk-skew" style={sx(`padding: 48px 0; border-top: 1px solid #1C1C1C; overflow: hidden; display: flex; flex-direction: column; gap: 4px; font-weight: 600; font-size: clamp(56px, 8.5vw, 124px); line-height: 1.05; letter-spacing: -0.055em; white-space: nowrap`)}>
      <div className="dk-mq dk-mq-l">{row(rows[0], true)}</div>
      <div className="dk-mq dk-mq-r">{row(rows[1], false)}</div>
    </div>
  );
});
