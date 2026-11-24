// The contact form's send: a paper plane takes off from where the card was and flies off the
// top-right of the screen, leaving a trail of dots. A fixed, click-through canvas over the page;
// it removes itself when the flight ends. Loaded lazily, only when a message is sent.
import {
  AmbientLight,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  CubicBezierCurve3,
  DirectionalLight,
  DoubleSide,
  Float32BufferAttribute,
  Mesh,
  MeshStandardMaterial,
  PerspectiveCamera,
  Points,
  PointsMaterial,
  Scene,
  Vector3,
  WebGLRenderer,
} from 'three';

const FLIGHT_MS = 1700;

/** Flies a paper plane from the centre of `from` (screen coordinates). Resolves when it is gone. */
export function flyPlane(from: DOMRect): Promise<void> {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return Promise.resolve();
  const W = window.innerWidth;
  const H = window.innerHeight;
  const renderer = new WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(W, H);
  Object.assign(renderer.domElement.style, { position: 'fixed', inset: '0', zIndex: '90', pointerEvents: 'none' });
  document.body.appendChild(renderer.domElement);

  const scene = new Scene();
  const camera = new PerspectiveCamera(35, W / H, 0.1, 200);
  camera.position.set(0, 0, 30);
  scene.add(new AmbientLight(0xffffff, 0.55));
  const sun = new DirectionalLight(0xffffff, 2.4);
  sun.position.set(-4, 10, 8);
  scene.add(sun);

  // A folded dart: two wings meeting at the spine, and a keel under it.
  const P: Record<string, number[]> = { nose: [0, 0, 2.3], wl: [-1.7, 0.18, -1.6], wr: [1.7, 0.18, -1.6], spine: [0, 0, -1.6], keel: [0, -0.62, -1.6] };
  const tri = (...k: string[]) => k.flatMap((n) => P[n]);
  const geo = new BufferGeometry();
  geo.setAttribute('position', new Float32BufferAttribute([...tri('nose', 'wl', 'spine'), ...tri('nose', 'spine', 'wr'), ...tri('nose', 'spine', 'keel'), ...tri('nose', 'keel', 'spine')], 3));
  geo.computeVertexNormals();
  const plane = new Mesh(geo, new MeshStandardMaterial({ color: 0xf4f4f4, roughness: 0.75, side: DoubleSide, flatShading: true }));
  scene.add(plane);

  const N = 90;
  const trailPos = new Float32Array(N * 3).fill(9999);
  const trailGeo = new BufferGeometry();
  trailGeo.setAttribute('position', new BufferAttribute(trailPos, 3));
  const dot = document.createElement('canvas');
  dot.width = dot.height = 32;
  const g = dot.getContext('2d')!;
  g.fillStyle = '#fff';
  g.beginPath();
  g.arc(16, 16, 5, 0, Math.PI * 2);
  g.fill();
  const dotTex = new CanvasTexture(dot);
  const trail = new Points(trailGeo, new PointsMaterial({ size: 0.35, map: dotTex, transparent: true, depthWrite: false, color: 0xbdbdbd }));
  scene.add(trail);

  // screen point -> world point on the z = 0 plane
  const toWorld = (x: number, y: number) => {
    const v = new Vector3((x / W) * 2 - 1, -(y / H) * 2 + 1, 0.5).unproject(camera);
    const d = v.sub(camera.position).normalize();
    return camera.position.clone().add(d.multiplyScalar(-camera.position.z / d.z));
  };
  const start = toWorld(from.left + from.width / 2, from.top + from.height / 2);
  const corner = toWorld(W, 0);
  const curve = new CubicBezierCurve3(start, new Vector3(start.x + 6, start.y - 5, 6), new Vector3(corner.x - 4, start.y + 2, 2), new Vector3(corner.x + 6, corner.y + 6, -8));
  plane.position.copy(start);

  return new Promise((resolve) => {
    const t0 = performance.now();
    const look = new Vector3();
    let at = 0;
    const frame = (now: number) => {
      const k = Math.min(1, (now - t0) / FLIGHT_MS);
      const p = k * k * (3 - 2 * k);
      curve.getPoint(p, plane.position);
      curve.getPoint(Math.min(1, p + 0.01), look);
      plane.lookAt(look);
      plane.rotateZ(Math.sin(p * Math.PI * 2) * 0.6);
      plane.scale.setScalar(0.6 + Math.sin(Math.min(1, k * 3) * (Math.PI / 2)) * 0.9);
      trailPos.set([plane.position.x, plane.position.y, plane.position.z], (at++ % N) * 3);
      trailGeo.attributes.position.needsUpdate = true;
      renderer.render(scene, camera);
      if (k < 1) requestAnimationFrame(frame);
      else {
        renderer.domElement.remove();
        geo.dispose();
        trailGeo.dispose();
        dotTex.dispose();
        renderer.dispose();
        resolve();
      }
    };
    requestAnimationFrame(frame);
  });
}
