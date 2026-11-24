// The hero's "YA" monogram as a three.js model rendered in ASCII characters.
// It turns toward the cursor (or with the phone's tilt), scatters into loose characters as the
// hero scrolls away, renders only while the hero is on screen, and draws one still frame when
// the visitor prefers reduced motion. Loaded lazily, after the page is up.
import {
  AmbientLight,
  BufferGeometry,
  Color,
  DirectionalLight,
  DoubleSide,
  ExtrudeGeometry,
  Mesh,
  MeshPhongMaterial,
  Path,
  PerspectiveCamera,
  PointLight,
  Scene,
  Shape,
  WebGLRenderer,
} from 'three';
import { AsciiEffect } from 'three/examples/jsm/effects/AsciiEffect.js';
import { TessellateModifier } from 'three/examples/jsm/modifiers/TessellateModifier.js';
import { createTiltAim } from '../lib/tilt';

/** "Y" and "A" as two extruded outlines (no font file), split into small triangles so they scatter finely. */
function monogram(): BufferGeometry {
  const poly = (pts: number[][], ox: number) => {
    const s = new Shape();
    pts.forEach(([x, y], i) => (i ? s.lineTo(x + ox, y) : s.moveTo(x + ox, y)));
    s.closePath();
    return s;
  };
  const Y = poly([[0, 10], [2.5, 10], [4, 7], [5.5, 10], [8, 10], [5.15, 4.8], [5.15, 0], [2.85, 0], [2.85, 4.8]], -8.9);
  const A = poly([[0, 0], [3.1, 10], [4.9, 10], [8, 0], [5.7, 0], [5.1, 2.1], [2.9, 2.1], [2.3, 0]], 0.9);
  const hole = new Path();
  [[3.45, 4.1], [4.55, 4.1], [4, 6.2]].forEach(([x, y], i) => (i ? hole.lineTo(x + 0.9, y) : hole.moveTo(x + 0.9, y)));
  hole.closePath();
  A.holes.push(hole);
  let g: BufferGeometry = new ExtrudeGeometry([Y, A], { depth: 2.6, bevelEnabled: true, bevelThickness: 0.4, bevelSize: 0.28, bevelSegments: 2, curveSegments: 4 });
  g.center();
  g.scale(1.15, 1.15, 1.15);
  g = new TessellateModifier(1.1, 4).modify(g.index ? g.toNonIndexed() : g);
  g.computeVertexNormals();
  return g;
}

export interface AsciiHero {
  destroy(): void;
}

export function mountAsciiHero(host: HTMLElement, hero: HTMLElement): AsciiHero {
  const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const phone = window.matchMedia('(hover: none) and (pointer: coarse)').matches;

  const renderer = new WebGLRenderer({ antialias: false });
  const scene = new Scene();
  scene.background = new Color(0x000000);
  const camera = new PerspectiveCamera(38, 1, 1, 200);
  const key = new DirectionalLight(0xffffff, 2.6);
  key.position.set(6, 10, 14);
  const rim = new PointLight(0xffffff, 900, 0, 2);
  rim.position.set(-18, -6, 10);
  scene.add(key, rim, new AmbientLight(0xffffff, 0.08));

  const geometry = monogram();
  const mesh = new Mesh(geometry, new MeshPhongMaterial({ color: 0xffffff, flatShading: true, shininess: 40, side: DoubleSide }));
  scene.add(mesh);

  // Each triangle drifts its own way when the hero scrolls off, and comes back on the way up.
  const pos = geometry.attributes.position.array as Float32Array;
  const base = pos.slice();
  const drift = new Float32Array(pos.length);
  for (let t = 0; t < pos.length; t += 9) {
    const cx = (pos[t] + pos[t + 3] + pos[t + 6]) / 3;
    const cy = (pos[t + 1] + pos[t + 4] + pos[t + 7]) / 3;
    const cz = (pos[t + 2] + pos[t + 5] + pos[t + 8]) / 3;
    const len = Math.hypot(cx, cy, cz) || 1;
    const k = 0.6 + Math.random() * 1.2;
    const d = [(cx / len + (Math.random() - 0.5) * 0.9) * k, (cy / len + (Math.random() - 0.5) * 0.9 + 0.35) * k, (cz / len + (Math.random() - 0.5) * 0.9) * k];
    for (let v = 0; v < 9; v += 3) drift.set(d, t + v);
  }
  let lastScatter = -1;
  const scatter = (p: number) => {
    if (Math.abs(p - lastScatter) < 0.002) return;
    lastScatter = p;
    const s = p * 22;
    for (let i = 0; i < pos.length; i++) pos[i] = base[i] + drift[i] * s;
    geometry.attributes.position.needsUpdate = true;
  };

  const effect = new AsciiEffect(renderer, ' .:-+*=%@#', { invert: true, resolution: phone ? 0.2 : 0.17 });
  effect.domElement.style.color = 'inherit';
  effect.domElement.style.backgroundColor = 'transparent';
  host.appendChild(effect.domElement);

  const resize = () => {
    const w = host.clientWidth;
    const h = host.clientHeight;
    if (!w || !h) return;
    camera.aspect = w / h;
    // keep the whole monogram in frame in a tall, narrow box (phones)
    camera.position.set(0, 0, camera.aspect < 0.9 ? (36 / Math.max(camera.aspect, 0.5)) * 0.9 : 36);
    camera.updateProjectionMatrix();
    effect.setSize(w, h);
  };
  const ro = new ResizeObserver(() => {
    resize();
    if (still) draw(0);
  });
  ro.observe(host);
  resize();

  // Steering: the cursor on desktop; the phone's tilt where the browser shares it.
  let aimX = 0;
  let aimY = 0;
  const onPointer = (e: PointerEvent) => {
    if (e.pointerType !== 'mouse') return;
    const r = hero.getBoundingClientRect();
    aimX = ((e.clientX - r.left) / r.width - 0.62) * 2;
    aimY = ((e.clientY - r.top) / r.height - 0.5) * 2;
  };
  const onLeave = () => {
    aimX = 0;
    aimY = 0;
  };
  const tilt = createTiltAim();
  const onTilt = (e: DeviceOrientationEvent) => {
    const aim = tilt(e.beta, e.gamma, screen.orientation?.angle ?? 0);
    if (!aim) return;
    aimX = aim.x;
    aimY = aim.y;
  };
  hero.addEventListener('pointermove', onPointer);
  hero.addEventListener('pointerleave', onLeave);
  if (phone) window.addEventListener('deviceorientation', onTilt);

  const progress = () => {
    const r = hero.getBoundingClientRect();
    const p = Math.min(1, Math.max(0, -r.top / (r.height * 0.85)));
    return p * p;
  };
  let rx = 0;
  let ry = 0;
  function draw(now: number) {
    const t = now / 1000;
    const ty = (still ? 0.35 : Math.sin(t * 0.5) * 0.35) + aimX * 0.7;
    const tx = (still ? -0.12 : Math.sin(t * 0.37) * 0.12) + aimY * 0.45;
    const k = still ? 1 : phone ? 0.05 : 0.08;
    rx += (tx - rx) * k;
    ry += (ty - ry) * k;
    mesh.rotation.set(rx, ry, 0);
    scatter(still ? 0 : progress());
    effect.render(scene, camera);
  }

  let raf = 0;
  let running = false;
  // Phones redraw the character grid at ~30 fps: the same look, half the layout work while scrolling.
  let lastDraw = 0;
  const loop = (now: number) => {
    if (!phone || now - lastDraw > 30) {
      lastDraw = now;
      draw(now);
    }
    if (running) raf = requestAnimationFrame(loop);
  };
  const io = new IntersectionObserver(([entry]) => {
    if (entry.isIntersecting && !running && !still) {
      running = true;
      raf = requestAnimationFrame(loop);
    } else if (!entry.isIntersecting) {
      running = false;
      cancelAnimationFrame(raf);
    }
  });
  io.observe(hero);
  if (still) draw(0);

  return {
    destroy() {
      running = false;
      cancelAnimationFrame(raf);
      io.disconnect();
      ro.disconnect();
      hero.removeEventListener('pointermove', onPointer);
      hero.removeEventListener('pointerleave', onLeave);
      window.removeEventListener('deviceorientation', onTilt);
      effect.domElement.remove();
      geometry.dispose();
      renderer.dispose();
    },
  };
}
