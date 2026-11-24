import { useEffect, type RefObject } from 'react';
import { hasFinePointer, prefersReducedMotion } from '../lib/env';

let floatEl: HTMLElement | null = null;

/** The hover preview is portalled to <body>; it registers itself here so the frame loop can move it. */
export function registerFloat(el: HTMLElement | null): void {
  floatEl = el;
}

const INTERACTIVE = '[data-cursor], a, button, input, textarea, select';

/**
 * One animation-frame loop for everything that follows the pointer or the scroll:
 * the inverting cursor, the trailing project preview, the flashlight position,
 * magnetic buttons and the scroll-velocity skew. Nothing here touches React state.
 */
export function useSiteEffects(cursorRef: RefObject<HTMLDivElement | null>): void {
  useEffect(() => {
    const root = document.documentElement;
    const fine = hasFinePointer();
    const reduced = prefersReducedMotion();
    const pulled = new WeakMap<HTMLElement, { x: number; y: number }>();

    let mx = -200, my = -200; // pointer
    let cx = -200, cy = -200; // cursor (eased)
    let px = -200, py = -200; // preview (eased, slower)
    let moved = false;
    let seen = false;
    let skew = 0;
    let lastY = window.scrollY;
    let raf = 0;

    let down = false;

    // What is under the pointer right now. Asked every frame, not only on mousemove, because
    // content moves under a still pointer (falling chips, scrolling) and pointer capture
    // retargets mouse events to the capturing element.
    const hover = (cur: HTMLDivElement) => {
      const hit = document.elementFromPoint(mx, my);
      const target = hit ? hit.closest(INTERACTIVE) : null;
      const label = target?.getAttribute('data-cursor') || '';
      if (cur.dataset.label !== label) cur.dataset.label = label;
      cur.classList.toggle('is-hover', !!target && !label);
      cur.classList.toggle('has-label', !!label);
      cur.classList.toggle('is-down', down);
    };

    const onMove = (e: MouseEvent) => {
      mx = e.clientX;
      my = e.clientY;
      moved = true;
      if (!seen) {
        seen = true;
        cx = px = mx;
        cy = py = my;
        if (fine) root.classList.add('dk-cur-on');
      }
      cursorRef.current?.classList.remove('is-out');
    };
    const onLeave = () => cursorRef.current?.classList.add('is-out');
    const onDown = () => { down = true; };
    const onUp = () => { down = false; };

    const magnet = () => {
      const els = document.querySelectorAll<HTMLElement>('.dk-mag');
      for (const el of els) {
        const r = el.getBoundingClientRect();
        if (r.width === 0) continue;
        const at = pulled.get(el);
        const dx = mx - (r.left + r.width / 2 - (at?.x ?? 0));
        const dy = my - (r.top + r.height / 2 - (at?.y ?? 0));
        const reach = Math.max(r.width, r.height) / 2 + 36;
        if (dx * dx + dy * dy < reach * reach) {
          const x = dx * 0.32, y = dy * 0.32;
          pulled.set(el, { x, y });
          el.style.transform = `translate(${x.toFixed(1)}px,${y.toFixed(1)}px)`;
        } else if (at) {
          pulled.delete(el);
          el.style.transform = '';
        }
      }
    };

    const frame = () => {
      // While pressed the cursor sits exactly on the pointer, so it stays glued to whatever is being dragged.
      const ease = down ? 1 : 0.24;
      cx += (mx - cx) * ease;
      cy += (my - cy) * ease;
      px += (mx - px) * 0.12;
      py += (my - py) * 0.12;
      const cur = cursorRef.current;
      if (cur && fine) {
        cur.style.transform = `translate3d(${cx.toFixed(1)}px,${cy.toFixed(1)}px,0)`;
        if (seen) hover(cur);
      }
      if (floatEl) floatEl.style.transform = `translate3d(${(px + 28).toFixed(1)}px,${(py + 20).toFixed(1)}px,0)`;
      if (seen) {
        root.style.setProperty('--fx', `${cx.toFixed(0)}px`);
        root.style.setProperty('--fy', `${cy.toFixed(0)}px`);
      }
      if (moved && fine && !reduced) magnet();
      moved = false;

      if (!reduced) {
        const y = window.scrollY;
        const target = Math.max(-7, Math.min(7, (y - lastY) * 0.2));
        lastY = y;
        const next = skew + (target - skew) * 0.12;
        if (Math.abs(next - skew) > 0.0005 || Math.abs(next) > 0.0005) {
          skew = Math.abs(next) < 0.001 ? 0 : next;
          root.style.setProperty('--skew', skew.toFixed(3));
        }
      }
      raf = requestAnimationFrame(frame);
    };

    window.addEventListener('mousemove', onMove, { passive: true });
    window.addEventListener('pointerdown', onDown, { passive: true });
    window.addEventListener('pointerup', onUp, { passive: true });
    window.addEventListener('pointercancel', onUp, { passive: true });
    root.addEventListener('mouseleave', onLeave);
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
      root.removeEventListener('mouseleave', onLeave);
      root.classList.remove('dk-cur-on');
      root.style.removeProperty('--skew');
      root.style.removeProperty('--fx');
      root.style.removeProperty('--fy');
    };
  }, [cursorRef]);
}
