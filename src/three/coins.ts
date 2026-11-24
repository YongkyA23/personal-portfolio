// The stack as coins: each item is a coin with its logo (or its name) on both faces, dropped into
// the box with real physics (cannon-es). Tap a coin to flip it; shake and drop again from outside.
// Renders only while the box is on screen; with reduced motion the pile settles and draws once.
import {
  AmbientLight,
  CanvasTexture,
  CylinderGeometry,
  DirectionalLight,
  Mesh,
  MeshStandardMaterial,
  PCFSoftShadowMap,
  PerspectiveCamera,
  PlaneGeometry,
  Raycaster,
  Scene,
  ShadowMaterial,
  SRGBColorSpace,
  Vector2,
  WebGLRenderer,
} from 'three';
import { Body, Box, Cylinder, Plane, Vec3, World } from 'cannon-es';

export interface CoinItem {
  name: string;
  /** Simple Icons path (24x24), or undefined to print the name instead */
  path?: string;
  light: boolean;
}
export interface Coins {
  drop(): void;
  shake(): void;
  destroy(): void;
}

const R = 1.15;
const H = 0.3;

function face(item: CoinItem): CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d')!;
  g.fillStyle = item.light ? '#EDEDED' : '#151515';
  g.beginPath();
  g.arc(128, 128, 128, 0, Math.PI * 2);
  g.fill();
  g.strokeStyle = item.light ? '#BDBDBD' : '#3A3A3A';
  g.lineWidth = 6;
  g.beginPath();
  g.arc(128, 128, 118, 0, Math.PI * 2);
  g.stroke();
  g.fillStyle = item.light ? '#070707' : '#EDEDED';
  if (item.path) {
    g.save();
    g.translate(128, 128);
    g.scale(5.2, 5.2);
    g.translate(-12, -12);
    g.fill(new Path2D(item.path));
    g.restore();
  } else {
    const words = item.name.split(/[\s-]+/);
    g.font = '600 44px Geist, system-ui, sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    words.forEach((w, i) => g.fillText(w, 128, 128 + (i - (words.length - 1) / 2) * 48));
  }
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

export function mountCoins(box: HTMLElement, items: CoinItem[], onPick: (name: string) => void): Coins {
  const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const renderer = new WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = PCFSoftShadowMap;
  Object.assign(renderer.domElement.style, { position: 'absolute', inset: '0', width: '100%', height: '100%', display: 'block', touchAction: 'pan-y' });
  box.appendChild(renderer.domElement);

  const scene = new Scene();
  const camera = new PerspectiveCamera(34, 1.6, 0.1, 200);
  scene.add(new AmbientLight(0xffffff, 0.5));
  const sun = new DirectionalLight(0xffffff, 2.2);
  sun.position.set(-6, 16, 8);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  Object.assign(sun.shadow.camera, { left: -12, right: 12, top: 12, bottom: -12 });
  scene.add(sun);
  const floor = new Mesh(new PlaneGeometry(60, 60), new ShadowMaterial({ opacity: 0.45 }));
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  const world = new World({ gravity: new Vec3(0, -30, 0) });
  world.allowSleep = true;
  world.defaultContactMaterial.friction = 0.35;
  world.defaultContactMaterial.restitution = 0.25;
  const ground = new Body({ mass: 0, shape: new Plane() });
  ground.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
  world.addBody(ground);
  const walls: Body[] = [];
  let hw = 7.5;
  let hd = 4.6;
  const setWalls = () => {
    walls.forEach((w) => world.removeBody(w));
    walls.length = 0;
    for (const [x, z, sx, sz] of [[hw + 0.5, 0, 0.5, hd + 1], [-hw - 0.5, 0, 0.5, hd + 1], [0, hd + 0.5, hw + 1, 0.5], [0, -hd - 0.5, hw + 1, 0.5]]) {
      const b = new Body({ mass: 0, shape: new Box(new Vec3(sx, 10, sz)) });
      b.position.set(x, 10, z);
      world.addBody(b);
      walls.push(b);
    }
  };

  const geo = new CylinderGeometry(R, R, H, 48);
  const rim = new MeshStandardMaterial({ color: 0x2b2b2e, metalness: 0.8, roughness: 0.35 });
  const textures: CanvasTexture[] = [];
  const coins = items.map((item) => {
    const tex = face(item);
    textures.push(tex);
    const top = new MeshStandardMaterial({ map: tex, metalness: 0.2, roughness: 0.55 });
    const mesh = new Mesh(geo, [rim, top, top]);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.userData.name = item.name;
    scene.add(mesh);
    const body = new Body({ mass: 1, shape: new Cylinder(R, R, H, 16), linearDamping: 0.05, angularDamping: 0.1 });
    world.addBody(body);
    return { mesh, body, top };
  });

  const sync = () => coins.forEach(({ mesh, body }) => {
    mesh.position.set(body.position.x, body.position.y, body.position.z);
    mesh.quaternion.set(body.quaternion.x, body.quaternion.y, body.quaternion.z, body.quaternion.w);
  });
  const settle = () => {
    for (let i = 0; i < 400; i++) world.step(1 / 60);
    sync();
    renderer.render(scene, camera);
  };

  const drop = () => {
    coins.forEach(({ body }, i) => {
      body.position.set((Math.random() - 0.5) * hw * 1.4, 6 + i * 0.7, (Math.random() - 0.5) * hd * 1.2);
      body.quaternion.setFromEuler(Math.random() * 6, Math.random() * 6, Math.random() * 6);
      body.velocity.set(0, 0, 0);
      body.angularVelocity.set(0, 0, 0);
      body.wakeUp();
    });
    if (still) settle();
  };
  const shake = () => {
    coins.forEach(({ body }) => {
      body.wakeUp();
      body.applyImpulse(new Vec3((Math.random() - 0.5) * 6, 9 + Math.random() * 7, (Math.random() - 0.5) * 6));
      body.angularVelocity.set((Math.random() - 0.5) * 18, (Math.random() - 0.5) * 18, (Math.random() - 0.5) * 18);
    });
    if (still) settle();
  };

  const fit = () => {
    const w = box.clientWidth;
    const h = box.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    const wide = camera.aspect > 1;
    hw = wide ? 7.5 : 4.4;
    hd = wide ? 4.6 : 6.2;
    setWalls();
    camera.position.set(0, wide ? 15 : 20, wide ? 13 : 15);
    camera.lookAt(0, 0, 0.6);
    if (still) renderer.render(scene, camera);
  };
  const ro = new ResizeObserver(fit);
  ro.observe(box);
  fit();

  // tap a coin: flip it and report its name
  const ray = new Raycaster();
  const ndc = new Vector2();
  const onDown = (e: PointerEvent) => {
    const r = box.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const hit = ray.intersectObjects(coins.map((c) => c.mesh))[0];
    if (!hit) return;
    const c = coins.find((x) => x.mesh === hit.object)!;
    c.body.wakeUp();
    c.body.applyImpulse(new Vec3(0, 12, 0), new Vec3(R * 0.6, 0, 0));
    onPick(c.mesh.userData.name as string);
    if (still) settle();
  };
  renderer.domElement.addEventListener('pointerdown', onDown);

  let raf = 0;
  let running = false;
  const loop = () => {
    world.fixedStep();
    sync();
    renderer.render(scene, camera);
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
  io.observe(box);
  drop();

  return {
    drop,
    shake,
    destroy() {
      running = false;
      cancelAnimationFrame(raf);
      io.disconnect();
      ro.disconnect();
      renderer.domElement.removeEventListener('pointerdown', onDown);
      renderer.domElement.remove();
      geo.dispose();
      rim.dispose();
      coins.forEach((c) => c.top.dispose());
      textures.forEach((t) => t.dispose());
      renderer.dispose();
    },
  };
}
