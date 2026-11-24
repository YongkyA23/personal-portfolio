import { memo, useEffect, useRef, useState } from 'react';
import { prefersReducedMotion } from '../lib/env';

const GLYPHS = '!<>-_/[]{}=+*^?#01ABCDEFXYZ';
const FRAMES = 18;
const FRAME_MS = 32;

interface Props {
  text: string;
  /** Bump this number to replay the effect. */
  run?: number;
  /** Replays whenever this flips to true. */
  when?: boolean;
}

/** Decrypt-style text: random glyphs resolve into the real string, left to right. */
export const Scramble = memo(function Scramble({ text, run = 0, when = false }: Props) {
  const [shown, setShown] = useState(text);
  const first = useRef(true);

  useEffect(() => {
    setShown(text);
    const skip = first.current && !when && run === 0;
    first.current = false;
    if (skip || (!when && run === 0) || prefersReducedMotion()) return;
    let frame = 0;
    const timer = window.setInterval(() => {
      frame += 1;
      const reveal = Math.floor((text.length * frame) / FRAMES);
      let out = '';
      for (let i = 0; i < text.length; i++) {
        out += i < reveal || text[i] === ' ' ? text[i] : GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
      }
      setShown(out);
      if (frame >= FRAMES) window.clearInterval(timer);
    }, FRAME_MS);
    return () => window.clearInterval(timer);
  }, [text, run, when]);

  return <>{shown}</>;
});
