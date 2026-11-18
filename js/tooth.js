import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

/*
  A procedural 3D molar: no model file needed.
  - Crown: a sphere reshaped into a flat top with four cusps and a narrowing neck.
  - Roots: two lathe-turned tapered shapes that splay slightly outwards.
  - Pearly enamel: physical material with clearcoat + iridescence, lit by a studio environment.
  - Glass bubbles orbit around it; the tooth tilts towards the cursor.
*/

const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

function crownGeometry() {
  const geo = new THREE.SphereGeometry(1, 160, 160);
  const pos = geo.attributes.position;
  const cusps = [[0.44, 0.36], [-0.44, 0.36], [0.44, -0.36], [-0.44, -0.36]];
  for (let i = 0; i < pos.count; i++) {
    let x = pos.getX(i) * 1.12, y = pos.getY(i), z = pos.getZ(i) * 0.98;
    const oy = y;
    if (y > 0.5) y = 0.5 + (y - 0.5) * 0.3;                       // flatten the biting surface
    const w = smooth(0.25, 0.65, oy);
    for (const [cx, cz] of cusps) y += w * 0.2 * Math.exp(-((x - cx) ** 2 + (z - cz) ** 2) / 0.07);
    if (y < 0) { const k = smooth(0, -1, y); x *= 1 - 0.3 * k; z *= 1 - 0.3 * k; y *= 0.85; }   // neck
    pos.setXYZ(i, x, y, z);
  }
  geo.computeVertexNormals();
  return geo;
}

function rootGeometry() {
  const pts = [[0, -1.65], [0.1, -1.58], [0.2, -1.25], [0.28, -0.8], [0.35, -0.3], [0.4, 0.1], [0.38, 0.25], [0, 0.3]]
    .map(([r, y]) => new THREE.Vector2(r, y));
  return new THREE.LatheGeometry(pts, 64);
}

export function initTooth(canvas, { reduce = false } = {}) {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  } catch {
    canvas.remove();
    return null;
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.9;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.55;

  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 50);
  camera.position.set(0, 0.1, 7.5);

  const rim = new THREE.DirectionalLight(0x2bb3a3, 6);
  rim.position.set(-5, 1, -2);
  const key = new THREE.DirectionalLight(0xfff6ea, 2.6);
  key.position.set(4, 5, 4);
  const fill = new THREE.HemisphereLight(0xffffff, 0x7fb9b2, 0.6);
  scene.add(rim, key, fill);

  const enamel = new THREE.MeshPhysicalMaterial({
    color: 0xf1ede4, roughness: 0.22, clearcoat: 1, clearcoatRoughness: 0.05,
    iridescence: 0.35, iridescenceIOR: 1.45, sheen: 0.5, sheenColor: new THREE.Color(0xbdeee7),
  });

  const tooth = new THREE.Group();
  tooth.add(new THREE.Mesh(crownGeometry(), enamel));
  [-1, 1].forEach((side) => {
    const root = new THREE.Mesh(rootGeometry(), enamel);
    root.position.set(side * 0.4, -0.35, 0);
    root.rotation.z = side * 0.13;
    root.scale.set(1, 1, 0.9);
    tooth.add(root);
  });
  const holder = new THREE.Group();   // holder = scroll/intro transforms, tooth = idle + mouse motion
  holder.add(tooth);
  holder.position.y = 0.35;
  scene.add(holder);

  // Soap-bubble look: mostly transparent, rainbow sheen at the edges.
  const glass = new THREE.MeshPhysicalMaterial({
    color: 0xffffff, roughness: 0, metalness: 0, transparent: true, opacity: 0.32, depthWrite: false,
    iridescence: 1, iridescenceIOR: 1.3, iridescenceThicknessRange: [200, 900], clearcoat: 1, envMapIntensity: 2.5,
  });
  const bubbleGeo = new THREE.SphereGeometry(1, 48, 48);
  const bubbles = Array.from({ length: 8 }, (_, i) => {
    const m = new THREE.Mesh(bubbleGeo, glass);
    m.userData = { r: 1.7 + Math.random() * 0.9, a: (i / 8) * Math.PI * 2, s: 0.15 + Math.random() * 0.25, y: (Math.random() - 0.5) * 2.4, sp: 0.15 + Math.random() * 0.2 };
    m.scale.setScalar(0.07 + Math.random() * 0.16);
    scene.add(m);
    return m;
  });

  const resize = () => {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.position.z = w / h < 0.9 ? 8.6 : 7.5;   // pull back on tall/narrow screens
    camera.updateProjectionMatrix();
  };
  resize();
  new ResizeObserver(resize).observe(canvas);

  const target = { x: 0, y: 0 }, mouse = { x: 0, y: 0 };
  window.addEventListener('pointermove', (e) => {
    target.x = e.clientX / window.innerWidth - 0.5;
    target.y = e.clientY / window.innerHeight - 0.5;
  }, { passive: true });

  const clock = new THREE.Clock();
  const frame = () => {
    const t = reduce ? 2 : clock.getElapsedTime();
    mouse.x += (target.x - mouse.x) * 0.05;
    mouse.y += (target.y - mouse.y) * 0.05;
    tooth.rotation.y = t * 0.35 + mouse.x * 0.9;
    tooth.rotation.x = 0.18 + mouse.y * 0.35 + Math.sin(t * 0.6) * 0.05;
    tooth.rotation.z = -0.08 + Math.sin(t * 0.4) * 0.04;
    tooth.position.y = Math.sin(t * 1.1) * 0.08;
    for (const b of bubbles) {
      const d = b.userData, a = d.a + t * d.sp;
      b.position.set(Math.cos(a) * d.r, d.y + Math.sin(t * d.s * 3 + d.a) * 0.25 + 0.35, Math.sin(a) * d.r * 0.6);
    }
    renderer.render(scene, camera);
  };

  if (reduce) frame();
  else new IntersectionObserver(([e]) => renderer.setAnimationLoop(e.isIntersecting ? frame : null)).observe(canvas);

  return { holder, render: frame };
}
