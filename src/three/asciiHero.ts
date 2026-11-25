// The hero's "YA" logo as a three.js model rendered in ASCII characters.
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
  PerspectiveCamera,
  PointLight,
  Scene,
  Shape,
  WebGLRenderer,
} from 'three';
import { TessellateModifier } from 'three/examples/jsm/modifiers/TessellateModifier.js';
import { createTiltAim } from '../lib/tilt';
import { MARK_PATH } from '../site/Mark';

/**
 * The site's "Splice" logo as a solid: its SVG path (absolute M/L/H/V/Z only) becomes a three.js Shape,
 * flipped to y-up and scaled to about 21 units wide, then extruded and split into small triangles
 * so it scatters finely.
 */
export function shapeFromPath(d: string, scale: number): Shape {
  const s = new Shape();
  let x = 0;
  let y = 0;
  let cx = 0;
  let cy = 0;
  const pts: number[][] = [];
  for (const [, cmd, args] of d.matchAll(/([MLHVZ])([^MLHVZ]*)/gi)) {
    const n = args.trim() ? args.trim().split(/[\s,]+/).map(Number) : [];
    if (cmd === 'M' || cmd === 'L') [x, y] = n;
    else if (cmd === 'H') x = n[0];
    else if (cmd === 'V') y = n[0];
    else continue; // Z
    pts.push([x, y]);
  }
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  cx = (Math.min(...xs) + Math.max(...xs)) / 2;
  cy = (Math.min(...ys) + Math.max(...ys)) / 2;
  pts.forEach(([px, py], i) => {
    const sx = (px - cx) * scale;
    const sy = -(py - cy) * scale;
    if (i) s.lineTo(sx, sy);
    else s.moveTo(sx, sy);
  });
  s.closePath();
  return s;
}

const LOGO_SCALE = 0.06;
const LOGO_W = 352 * LOGO_SCALE;

function monogram(): BufferGeometry {
  let g: BufferGeometry = new ExtrudeGeometry(shapeFromPath(MARK_PATH, LOGO_SCALE), { depth: 2.6, bevelEnabled: true, bevelThickness: 0.4, bevelSize: 0.28, bevelSegments: 2, curveSegments: 4 });
  g.center();
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

  // ASCII on a canvas: the scene renders at one pixel per character cell, and each cell's brightness
  // picks a character drawn onto a 2D canvas. (three's AsciiEffect rebuilds a DOM table of text every
  // frame; iOS Safari handled that badly, and the hero text over it could vanish after scrolling.)
  const CHARS = ' .:-+*=%@#';
  const CELL_H = phone ? 9 : 10;
  const FONT = `${CELL_H}px ui-monospace, Menlo, Consolas, "Courier New", monospace`;
  let cellW = 6; // measured from the font actually used, so a whole row can be drawn as one string
  const out = document.createElement('canvas');
  Object.assign(out.style, { position: 'absolute', inset: '0', width: '100%', height: '100%', display: 'block' });
  host.appendChild(out);
  const octx = out.getContext('2d')!;
  const sample = document.createElement('canvas');
  const sctx = sample.getContext('2d', { willReadFrequently: true })!;
  let cols = 0;
  let rows = 0;
  let dpr = 1;
  let ink = '#8F8F8F';
  let inkAt = -1e9;

  const resize = () => {
    const w = host.clientWidth;
    const h = host.clientHeight;
    if (!w || !h) return;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    out.width = Math.round(w * dpr);
    out.height = Math.round(h * dpr);
    octx.setTransform(dpr, 0, 0, dpr, 0, 0);
    octx.font = FONT;
    octx.textBaseline = 'top';
    cellW = octx.measureText('M').width || 6;
    cols = Math.max(1, Math.floor(w / cellW));
    rows = Math.max(1, Math.floor(h / CELL_H));
    renderer.setSize(cols, rows, false);
    sample.width = cols;
    sample.height = rows;
    camera.aspect = w / h;
    // back the camera off until the logo (about 21 units wide) spans ~70% of the box's width
    const fitZ = (LOGO_W / 0.7) / (2 * Math.tan((camera.fov * Math.PI) / 360) * camera.aspect);
    camera.position.set(0, 0, Math.max(36, fitZ));
    camera.updateProjectionMatrix();
  };
  const paint = (now: number) => {
    if (!cols || !rows) return;
    renderer.render(scene, camera);
    sctx.drawImage(renderer.domElement, 0, 0, cols, rows);
    const px = sctx.getImageData(0, 0, cols, rows).data;
    // the colour follows the CSS (dim by default, bright under the flashlight)
    if (now - inkAt > 400) {
      ink = getComputedStyle(host).color;
      inkAt = now;
    }
    octx.clearRect(0, 0, out.width / dpr, out.height / dpr);
    octx.fillStyle = ink;
    const top = CHARS.length - 1;
    for (let y = 0; y < rows; y++) {
      let line = '';
      for (let x = 0; x < cols; x++) {
        const i = (y * cols + x) * 4;
        line += CHARS[Math.round(((0.3 * px[i] + 0.59 * px[i + 1] + 0.11 * px[i + 2]) / 255) * top)];
      }
      if (line.trim()) octx.fillText(line, 0, y * CELL_H);
    }
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
    paint(now);
  }

  let raf = 0;
  let running = false;
  // Phones redraw the character grid at ~30 fps: the same look, half the work while scrolling.
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
      out.remove();
      geometry.dispose();
      renderer.dispose();
    },
  };
}
