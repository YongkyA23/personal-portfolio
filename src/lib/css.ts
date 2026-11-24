import type { CSSProperties } from 'react';

const cache = new Map<string, CSSProperties>();

/**
 * Turns a CSS declaration string into a React style object, memoised per string.
 * The markup was ported from the design canvas, which is authored with inline
 * styles; keeping the declarations verbatim keeps the two pixel-identical.
 * Returning the same object for the same string also lets React skip the diff.
 */
export function sx(declarations: string): CSSProperties {
  const hit = cache.get(declarations);
  if (hit) return hit;
  const style: Record<string, string> = {};
  for (const part of declarations.split(';')) {
    const at = part.indexOf(':');
    if (at < 0) continue;
    const prop = part.slice(0, at).trim();
    const value = part.slice(at + 1).trim();
    if (!prop || !value) continue;
    const key = prop.startsWith('--') ? prop : prop.replace(/-([a-z])/g, (_, ch: string) => ch.toUpperCase());
    style[key] = value;
  }
  const frozen = Object.freeze(style) as CSSProperties;
  cache.set(declarations, frozen);
  return frozen;
}
