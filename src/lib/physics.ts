/** Tiny box-stacking simulation for the stack playground: gravity, walls, AABB separation, drag and throw. */

interface Body {
  el: HTMLElement;
  w: number;
  h: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  inside: boolean;
}

export interface World {
  step(): void;
  grab(index: number, clientX: number, clientY: number): void;
  drag(clientX: number, clientY: number): void;
  release(): void;
  shake(): void;
  drop(): void;
  resize(): void;
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

export function createWorld(box: HTMLElement, chips: HTMLElement[]): World {
  let W = box.clientWidth;
  let H = box.clientHeight;
  let held: { i: number; ox: number; oy: number; t: number } | null = null;

  const bodies: Body[] = chips.map((el) => ({ el, w: el.offsetWidth, h: el.offsetHeight, x: 0, y: 0, vx: 0, vy: 0, r: 0, inside: false }));

  const scatter = () => {
    bodies.forEach((b, i) => {
      b.x = Math.random() * Math.max(1, W - b.w);
      b.y = -b.h - i * 34 - Math.random() * 30;
      b.vx = (Math.random() - 0.5) * 3;
      b.vy = 0;
      b.inside = false;
    });
  };
  scatter();

  const separate = (grabbed: number) => {
    for (let i = 0; i < bodies.length; i++) {
      for (let j = i + 1; j < bodies.length; j++) {
        const a = bodies[i], c = bodies[j];
        const dx = a.x + a.w / 2 - (c.x + c.w / 2);
        const dy = a.y + a.h / 2 - (c.y + c.h / 2);
        const ox = (a.w + c.w) / 2 - Math.abs(dx);
        const oy = (a.h + c.h) / 2 - Math.abs(dy);
        if (ox <= 0 || oy <= 0) continue;
        const wa = i === grabbed ? 0 : j === grabbed ? 1 : 0.5;
        const wc = j === grabbed ? 0 : i === grabbed ? 1 : 0.5;
        if (ox < oy) {
          const s = dx < 0 ? -1 : 1;
          a.x += s * ox * wa;
          c.x -= s * ox * wc;
          const m = (a.vx + c.vx) / 2;
          if (i !== grabbed) a.vx = m * 0.8;
          if (j !== grabbed) c.vx = m * 0.8;
        } else {
          const s = dy < 0 ? -1 : 1;
          a.y += s * oy * wa;
          c.y -= s * oy * wc;
          const m = (a.vy + c.vy) / 2;
          if (i !== grabbed) a.vy = m * 0.5;
          if (j !== grabbed) c.vy = m * 0.5;
        }
      }
    }
  };

  return {
    step() {
      const grabbed = held ? held.i : -1;
      for (let i = 0; i < bodies.length; i++) {
        if (i === grabbed) continue;
        const b = bodies[i];
        b.vy += 0.6;
        b.vx *= 0.995;
        b.vx = clamp(b.vx, -40, 40);
        b.vy = clamp(b.vy, -40, 40);
        b.x += b.vx;
        b.y += b.vy;
        if (b.x < 0) { b.x = 0; b.vx = -b.vx * 0.5; }
        if (b.x + b.w > W) { b.x = W - b.w; b.vx = -b.vx * 0.5; }
        if (b.y + b.h > H) {
          b.y = H - b.h;
          b.vy = -b.vy * 0.3;
          b.vx *= 0.9;
          if (Math.abs(b.vy) < 0.7) b.vy = 0;
        }
        if (b.y >= 0) b.inside = true;
        if (b.inside && b.y < 0) { b.y = 0; b.vy = -b.vy * 0.4; }
      }
      for (let pass = 0; pass < 3; pass++) separate(grabbed);
      for (const b of bodies) {
        if (b.y + b.h > H) b.y = H - b.h;
        b.x = clamp(b.x, 0, Math.max(0, W - b.w));
        b.r += (clamp(b.vx * 1.4, -16, 16) - b.r) * 0.15;
        b.el.style.transform = `translate3d(${b.x.toFixed(1)}px,${b.y.toFixed(1)}px,0) rotate(${b.r.toFixed(1)}deg)`;
      }
    },
    grab(index, clientX, clientY) {
      const b = bodies[index];
      if (!b) return;
      const r = box.getBoundingClientRect();
      held = { i: index, ox: clientX - r.left - b.x, oy: clientY - r.top - b.y, t: performance.now() };
      b.vx = 0;
      b.vy = 0;
      b.inside = true;
    },
    drag(clientX, clientY) {
      if (!held) return;
      const b = bodies[held.i];
      const r = box.getBoundingClientRect();
      const nx = clamp(clientX - r.left - held.ox, 0, Math.max(0, W - b.w));
      const ny = clamp(clientY - r.top - held.oy, 0, Math.max(0, H - b.h));
      // Velocity in px per 60 Hz frame, whatever the mouse's event rate, smoothed over a few moves.
      const now = performance.now();
      const k = 16.7 / Math.max(4, now - held.t);
      held.t = now;
      b.vx = b.vx * 0.4 + (nx - b.x) * k * 0.6;
      b.vy = b.vy * 0.4 + (ny - b.y) * k * 0.6;
      b.x = nx;
      b.y = ny;
    },
    release() {
      // Held still before letting go: drop it, don't fling it with the last movement.
      if (held && performance.now() - held.t > 80) {
        bodies[held.i].vx = 0;
        bodies[held.i].vy = 0;
      }
      held = null;
    },
    shake() {
      for (const b of bodies) {
        b.vy -= 12 + Math.random() * 12;
        b.vx += (Math.random() - 0.5) * 22;
      }
    },
    drop: scatter,
    resize() {
      W = box.clientWidth;
      H = box.clientHeight;
      for (const b of bodies) {
        b.w = b.el.offsetWidth;
        b.h = b.el.offsetHeight;
      }
    },
  };
}

type Vec = { x?: number | null; y?: number | null; z?: number | null } | null | undefined;

/**
 * Turns devicemotion readings into "the phone was shaken" moments.
 * Uses acceleration without gravity when the device reports it, otherwise the jump between two
 * gravity-included readings. A shake fires at most once per cooldown.
 * ponytail: one fixed threshold (m/s²); tune it if real phones feel too eager or too dull.
 */
export function createShakeDetector(threshold = 14, cooldownMs = 800) {
  let last = -Infinity;
  let prev: { x: number; y: number; z: number } | null = null;
  return (acc: Vec, withGravity: Vec, now: number): boolean => {
    let mag: number;
    if (acc && typeof acc.x === 'number') {
      mag = Math.hypot(acc.x, acc.y ?? 0, acc.z ?? 0);
    } else if (withGravity && typeof withGravity.x === 'number') {
      const cur = { x: withGravity.x, y: withGravity.y ?? 0, z: withGravity.z ?? 0 };
      mag = prev ? Math.hypot(cur.x - prev.x, cur.y - prev.y, cur.z - prev.z) : 0;
      prev = cur;
    } else return false;
    if (mag < threshold || now - last < cooldownMs) return false;
    last = now;
    return true;
  };
}
