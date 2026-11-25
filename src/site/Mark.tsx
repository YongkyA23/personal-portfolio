import type { CSSProperties } from 'react';

/** The YA "Splice" mark: Y's right arm runs on into the A as one shape. Path in 432-unit space. */
export const MARK_PATH = 'M40 106H103L151 185L204 106H295L392 323H322L303 278H195L220 224H281L243 149L132 325H61L117 234Z';

/** Cropped to the shape (352 × 219), filled with the current text colour. */
export function YaMark({ style, title }: { style?: CSSProperties; title?: string }) {
  return (
    <svg viewBox="40 106 352 219" style={{ display: 'block', ...style }} role={title ? 'img' : undefined} aria-hidden={title ? undefined : true} aria-label={title}>
      <path fill="currentColor" d={MARK_PATH} />
    </svg>
  );
}
