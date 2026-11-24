const query = (q: string) => typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia(q).matches;

export const prefersReducedMotion = () => query('(prefers-reduced-motion: reduce)');
export const hasFinePointer = () => query('(hover: hover) and (pointer: fine)');
export const supportsScrollTimeline = () =>
  typeof CSS !== 'undefined' && typeof CSS.supports === 'function' && CSS.supports('animation-timeline: view()');

const INTRO_KEY = 'ya-intro-seen';

export function introSeen(): boolean {
  try {
    return window.localStorage.getItem(INTRO_KEY) === '1';
  } catch {
    return false;
  }
}

export function markIntroSeen(): void {
  try {
    window.localStorage.setItem(INTRO_KEY, '1');
  } catch {
    /* private mode: the intro simply plays again next time */
  }
}
