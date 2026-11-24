import type { MouseEvent } from 'react';

/** Feeds the cursor position to the `.dk-spot` radial highlight. */
export function spot(e: MouseEvent<HTMLElement>): void {
  const el = e.currentTarget;
  const r = el.getBoundingClientRect();
  el.style.setProperty('--mx', `${e.clientX - r.left}px`);
  el.style.setProperty('--my', `${e.clientY - r.top}px`);
}

/** 3D tilt towards the cursor, plus the same highlight as `spot`. */
export function tilt(e: MouseEvent<HTMLElement>): void {
  const el = e.currentTarget;
  const r = el.getBoundingClientRect();
  const x = (e.clientX - r.left) / r.width - 0.5;
  const y = (e.clientY - r.top) / r.height - 0.5;
  el.style.transform = `rotateX(${(-y * 7).toFixed(2)}deg) rotateY(${(x * 9).toFixed(2)}deg)`;
  el.style.setProperty('--mx', `${e.clientX - r.left}px`);
  el.style.setProperty('--my', `${e.clientY - r.top}px`);
}

export function untilt(e: MouseEvent<HTMLElement>): void {
  e.currentTarget.style.transform = '';
}
