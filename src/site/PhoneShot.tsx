import { useEffect, useState, type SyntheticEvent } from 'react';
import { prefersReducedMotion } from '../lib/env';

const SCREEN_RATIO = 844 / 390; // phone screen height / width
const DWELL_MS = 3200;

/**
 * A phone with a real screenshot inside. The image is either one tall page, which scrolls,
 * or a strip of whole screens stacked top to bottom (detected from its height), which the
 * phone pages through one screen at a time like an app demo.
 */
export function PhoneShot({ src, className, anim }: { src: string; className?: string; anim?: string }) {
  const [screens, setScreens] = useState(1);
  const [at, setAt] = useState(0);

  useEffect(() => {
    setScreens(1);
    setAt(0);
  }, [src]);

  useEffect(() => {
    if (screens < 2 || prefersReducedMotion()) return;
    const t = window.setInterval(() => setAt((i) => (i + 1) % screens), DWELL_MS);
    return () => window.clearInterval(t);
  }, [screens]);

  const measure = (e: SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    const ratio = img.naturalHeight / img.naturalWidth / SCREEN_RATIO;
    const n = Math.round(ratio);
    setScreens(n >= 2 && n <= 8 && Math.abs(ratio - n) < 0.06 ? n : 1);
  };

  const strip = screens > 1;
  return (
    <span aria-hidden="true" className={`pv-device ${className ?? ''}`} style={anim ? { animation: `${anim} .7s cubic-bezier(.2,.8,.2,1) .1s both` } : undefined}>
      <span className="pv-device-body">
        <span className={strip ? 'pv-device-screen is-strip' : 'pv-device-screen'}>
          <img
            className="pv-shot"
            src={src}
            alt=""
            decoding="async"
            onLoad={measure}
            style={strip ? { transform: `translateY(${(-at * 100) / screens}%)` } : undefined}
          />
          <span className="pv-island" />
        </span>
      </span>
    </span>
  );
}
