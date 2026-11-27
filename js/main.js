import * as THREE from '../vendor/three.module.min.js';
import { STAGES, COMPANIES, SECTORS, CITIES, ARCS } from './data.js';

const INK = 0x06080c;
const BONE = 0xebe6da;
const EMBER = 0xffa84a;
const V3 = THREE.Vector3;

const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const ramp = (x, a, b) => clamp((x - a) / (b - a));
const smooth = (x) => x * x * (3 - 2 * x);
const sramp = (x, a, b) => smooth(ramp(x, a, b));
const win = (x, a, b, c, d) => sramp(x, a, b) * (1 - sramp(x, c, d));
const easeOut = (x) => 1 - Math.pow(1 - x, 3);
const mix = (a, b, t) => a + (b - a) * t;

function rng(seed) {
  let t = seed;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}
const rnd = rng(11);

const isDesktop = () => window.innerWidth > 860;
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ------------------------------------------------------------------ */
/* Scroll timeline                                                     */
/* ------------------------------------------------------------------ */
const bounds = [0];
STAGES.forEach((st) => bounds.push(bounds[bounds.length - 1] + st.len));
const totalVh = bounds[bounds.length - 1];
const space = document.getElementById('scroll-space');
let vh = window.innerHeight;

function layoutScroll() {
  vh = window.innerHeight;
  space.style.height = `${(totalVh / 100) * vh + vh}px`;
}

// Preview aid: index.html?s=2.8 holds the page at that point of the timeline.
const PIN = (() => {
  const v = parseFloat(new URLSearchParams(window.location.search).get('s'));
  return Number.isFinite(v) ? clamp(v, 0, STAGES.length) : null;
})();

function scrollToStage() {
  if (PIN !== null) return PIN;
  const v = clamp((window.scrollY / vh) * 100, 0, totalVh);
  let i = STAGES.length - 1;
  for (let k = 0; k < STAGES.length; k++) {
    if (v < bounds[k + 1]) { i = k; break; }
  }
  return i + clamp((v - bounds[i]) / STAGES[i].len);
}

/* ------------------------------------------------------------------ */
/* Renderer                                                            */
/* ------------------------------------------------------------------ */
const canvas = document.getElementById('scene');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
renderer.setClearColor(0x000000, 0);
const scene = new THREE.Scene();
scene.fog = new THREE.Fog(INK, 12, 44);
const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 500);

const glowTex = (() => {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(255,255,255,1)');
  gr.addColorStop(0.22, 'rgba(255,255,255,.85)');
  gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr;
  g.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
})();

// A layer is a group whose materials fade together.
function mkLayer(parent = scene) {
  const L = { group: new THREE.Group(), mats: [], o: -1 };
  parent.add(L.group);
  return L;
}
function reg(L, m) {
  m.transparent = true;
  m.userData.base = m.opacity;
  L.mats.push(m);
  return m;
}
function setO(L, o) {
  if (L.o === o) return;
  L.o = o;
  L.group.visible = o > 0.004;
  for (const m of L.mats) m.opacity = m.userData.base * o;
}
const lineMat = (L, color, opacity, extra = {}) =>
  reg(L, new THREE.LineBasicMaterial({ color, opacity, depthWrite: false, fog: false, ...extra }));
const glowMat = (L, color, size, opacity = 1, extra = {}) =>
  reg(L, new THREE.PointsMaterial({
    color, size, opacity, map: glowTex, depthWrite: false, fog: false,
    blending: THREE.AdditiveBlending, sizeAttenuation: true, ...extra,
  }));
function segGeo(arr) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(arr, 3));
  return g;
}

/* ------------------------------------------------------------------ */
/* Craft: blades -> rack -> rocket -> satellite                         */
/* ------------------------------------------------------------------ */
const craft = new THREE.Group();
scene.add(craft);

// Blades
const N = 14;
const bladeL = mkLayer(craft);
const bladeBox = new THREE.BoxGeometry(1.12, 0.15, 1.12);
const bladeLines = (() => {
  const e = new THREE.EdgesGeometry(bladeBox);
  const a = Array.from(e.attributes.position.array);
  // front and side handles
  a.push(-0.05, 0, 0.562, 0.46, 0, 0.562);
  a.push(0.562, 0, -0.46, 0.562, 0, 0.05);
  return segGeo(a);
})();
const bladeEdgeMat = lineMat(bladeL, BONE, 0.8);
const bladeFillMat = reg(bladeL, new THREE.MeshBasicMaterial({
  color: 0x0a0e15, opacity: 0.93, fog: false, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1,
}));
const ledGeo = segGeo([
  -0.44, 0, 0.57, -0.35, 0, 0.57, -0.26, 0, 0.57,
  0.57, 0, 0.44, 0.57, 0, 0.35, 0.57, 0, 0.26,
]);
const ledDim = new THREE.Color(0x4b4a44);
const ledHot = new THREE.Color(EMBER);
const IDENT = new THREE.Quaternion();
const blades = [];
const CLOSE_DIR = new V3(1.05, 1.1, 3.0).normalize(); // from the chip towards the camera in its close-up
for (let i = 0; i < N; i++) {
  const g = new THREE.Group();
  g.add(new THREE.Mesh(bladeBox, bladeFillMat));
  g.add(new THREE.LineSegments(bladeLines, bladeEdgeMat));
  const ledMat = glowMat(bladeL, 0x4b4a44, 0.1, 1);
  g.add(new THREE.Points(ledGeo, ledMat));
  const scatter = new V3(rnd() * 2 - 1, rnd() * 2 - 1, rnd() * 2 - 1).normalize().multiplyScalar(2.4 + rnd() * 3.4);
  scatter.y *= 0.7;
  if (scatter.x < -1) scatter.x *= -0.85; // keep loose parts clear of the hero copy
  // While the chip is shown close up, loose servers wait behind it and clear of the line of sight.
  const dAlong = scatter.dot(CLOSE_DIR);
  const back = scatter.clone().addScaledVector(CLOSE_DIR, -(dAlong + Math.max(Math.abs(dAlong), 2.6)));
  const side = back.clone().addScaledVector(CLOSE_DIR, -back.dot(CLOSE_DIR));
  const lateral = side.length();
  if (lateral < 2.5) {
    if (lateral < 0.05) side.set(1, 0.3, 0);
    back.addScaledVector(side.normalize(), 2.5 - lateral);
  }
  blades.push({
    g, ledMat, scatter, back,
    slot: new V3(0, -1.45 + i * 0.223, 0),
    q: new THREE.Quaternion().setFromEuler(new THREE.Euler(rnd() * 3, rnd() * 3, rnd() * 3)),
    axis: new V3(rnd() - 0.5, rnd() - 0.5, rnd() - 0.5).normalize(),
    ph: rnd() * 6.28,
  });
  bladeL.group.add(g);
}

// Rack frame
const frameL = mkLayer(craft);
{
  const m = lineMat(frameL, BONE, 0.5);
  frameL.group.add(new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(1.32, 3.34, 1.32)), m));
  const plinth = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(1.56, 0.08, 1.56)), m);
  plinth.position.y = -1.71;
  frameL.group.add(plinth);
  const cap = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(1.4, 0.05, 1.4)), m);
  cap.position.y = 1.7;
  frameL.group.add(cap);
}

// Rocket hull (two fairing halves) and aft section
const hullL = mkLayer(craft);
const hullMat = lineMat(hullL, BONE, 0.55);
function halfHull(theta0) {
  const g = new THREE.Group();
  const cyl = new THREE.CylinderGeometry(0.98, 0.98, 3.7, 7, 1, true, theta0, Math.PI);
  g.add(new THREE.LineSegments(new THREE.EdgesGeometry(cyl, 1), hullMat));
  const cone = new THREE.ConeGeometry(0.98, 1.7, 7, 1, true, theta0, Math.PI);
  cone.translate(0, 1.85 + 0.85, 0);
  g.add(new THREE.LineSegments(new THREE.EdgesGeometry(cone, 1), hullMat));
  const rings = [];
  for (const y of [-1.2, -0.4, 0.4, 1.2]) {
    for (let k = 0; k < 7; k++) {
      const a0 = theta0 + (k / 7) * Math.PI;
      const a1 = theta0 + ((k + 1) / 7) * Math.PI;
      rings.push(0.98 * Math.sin(a0), y, 0.98 * Math.cos(a0), 0.98 * Math.sin(a1), y, 0.98 * Math.cos(a1));
    }
  }
  g.add(new THREE.LineSegments(segGeo(rings), hullMat));
  return g;
}
const hullA = halfHull(0);
const hullB = halfHull(Math.PI);
const aft = new THREE.Group();
{
  const bell = new THREE.CylinderGeometry(0.42, 0.74, 0.6, 10, 1, true);
  bell.translate(0, -1.85 - 0.3, 0);
  aft.add(new THREE.LineSegments(new THREE.EdgesGeometry(bell, 1), hullMat));
  const fins = [];
  for (let k = 0; k < 4; k++) {
    const a = (k / 4) * Math.PI * 2 + Math.PI / 4;
    const sx = Math.sin(a);
    const cz = Math.cos(a);
    const p = [[0.98, -1.85], [1.7, -2.3], [1.7, -1.9], [0.98, -0.8]];
    for (let j = 0; j < p.length; j++) {
      const [r0, y0] = p[j];
      const [r1, y1] = p[(j + 1) % p.length];
      fins.push(r0 * sx, y0, r0 * cz, r1 * sx, y1, r1 * cz);
    }
  }
  aft.add(new THREE.LineSegments(segGeo(fins), hullMat));
}
hullL.group.add(hullA, hullB, aft);

// Exhaust
const exL = mkLayer(craft);
const EXN = 260;
const exPos = new Float32Array(EXN * 3);
const exSeed = Array.from({ length: EXN }, () => [rnd(), rnd() * 6.28, 0.3 + rnd() * 0.7]);
const exGeo = new THREE.BufferGeometry();
exGeo.setAttribute('position', new THREE.BufferAttribute(exPos, 3));
exL.group.add(new THREE.Points(exGeo, glowMat(exL, EMBER, 0.22, 0.9)));

// Solar panels
const panelL = mkLayer(craft);
const PW = 3.2;
const PD = 1.15;
const panelPivots = [];
{
  const lm = lineMat(panelL, BONE, 0.7);
  const fm = reg(panelL, new THREE.MeshBasicMaterial({ color: 0x0f1a2e, opacity: 0.6, side: THREE.DoubleSide, fog: false, depthWrite: false }));
  const lines = [];
  for (let i = 0; i <= 8; i++) { const x = (i / 8) * PW; lines.push(x, 0, -PD / 2, x, 0, PD / 2); }
  for (let j = 0; j <= 3; j++) { const z = -PD / 2 + (j / 3) * PD; lines.push(0, 0, z, PW, 0, z); }
  const lg = segGeo(lines);
  const fg = new THREE.PlaneGeometry(PW, PD);
  fg.rotateX(-Math.PI / 2);
  fg.translate(PW / 2, 0, 0);
  for (const dir of [1, -1]) {
    const pivot = new THREE.Group();
    pivot.position.x = 0.62 * dir;
    pivot.rotation.set(0.5 * dir, dir === 1 ? 0 : Math.PI, 0);
    pivot.add(new THREE.Mesh(fg, fm), new THREE.LineSegments(lg, lm));
    panelL.group.add(pivot);
    panelPivots.push(pivot);
  }
}

/* ------------------------------------------------------------------ */
/* Ground and stars                                                     */
/* ------------------------------------------------------------------ */
const groundL = mkLayer();
{
  const grid = new THREE.GridHelper(70, 70, BONE, BONE);
  grid.material.opacity = 0.2;
  grid.material.depthWrite = false;
  reg(groundL, grid.material);
  groundL.group.add(grid);
}

const starL = mkLayer();
{
  const a = [];
  for (let i = 0; i < 1700; i++) {
    const v = new V3(rnd() * 2 - 1, rnd() * 2 - 1, rnd() * 2 - 1).normalize().multiplyScalar(120 + rnd() * 60);
    a.push(v.x, v.y, v.z);
  }
  const m = reg(starL, new THREE.PointsMaterial({ color: BONE, size: 1.5, sizeAttenuation: false, opacity: 0.75, depthWrite: false, fog: false }));
  starL.group.add(new THREE.Points(segGeo(a), m));
}

/* ------------------------------------------------------------------ */
/* Earth                                                                */
/* ------------------------------------------------------------------ */
const ER = 6;
const EARTH_C = new V3(0, -9.5, 0);
const earthL = mkLayer();
earthL.group.position.copy(EARTH_C);
const earthSpin = new THREE.Group();
earthL.group.add(earthSpin);

function ll(lat, lon, r = ER) {
  const phi = ((90 - lat) * Math.PI) / 180;
  const th = ((lon + 180) * Math.PI) / 180;
  return new V3(-r * Math.sin(phi) * Math.cos(th), r * Math.cos(phi), r * Math.sin(phi) * Math.sin(th));
}

// The dark globe must draw before everything that sits on it, or it paints over the dots.
const ocean = new THREE.Mesh(
  new THREE.SphereGeometry(ER - 0.03, 72, 48),
  reg(earthL, new THREE.MeshBasicMaterial({ color: 0x070b12, opacity: 1, fog: false })),
);
ocean.renderOrder = -10;
earthSpin.add(ocean);
{
  // graticule
  const a = [];
  for (let lat = -60; lat <= 60; lat += 30) {
    for (let lon = -180; lon < 180; lon += 4) {
      const p = ll(lat, lon, ER + 0.005);
      const q = ll(lat, lon + 4, ER + 0.005);
      a.push(p.x, p.y, p.z, q.x, q.y, q.z);
    }
  }
  for (let lon = -180; lon < 180; lon += 30) {
    for (let lat = -80; lat < 80; lat += 4) {
      const p = ll(lat, lon, ER + 0.005);
      const q = ll(lat + 4, lon, ER + 0.005);
      a.push(p.x, p.y, p.z, q.x, q.y, q.z);
    }
  }
  earthSpin.add(new THREE.LineSegments(segGeo(a), lineMat(earthL, BONE, 0.07, { depthWrite: false })));
}
const landMat = reg(earthL, new THREE.PointsMaterial({ color: BONE, size: 0.062, opacity: 0.85, sizeAttenuation: true, depthWrite: false, fog: false }));
{
  const img = new Image();
  img.onload = () => {
    const w = 1024;
    const h = 512;
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const ctx = c.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(img, 0, 0, w, h);
    const d = ctx.getImageData(0, 0, w, h).data;
    const a = [];
    const n = 30000;
    for (let i = 0; i < n; i++) {
      const y = 1 - ((i + 0.5) / n) * 2;
      const lat = (Math.asin(y) * 180) / Math.PI;
      const lon = (((i * 137.50776405) % 360) + 360) % 360 - 180;
      const u = Math.floor(((lon + 180) / 360) * w) % w;
      const v = Math.min(h - 1, Math.floor(((90 - lat) / 180) * h));
      if (d[(v * w + u) * 4] < 90) {
        const p = ll(lat, lon, ER + 0.01);
        a.push(p.x, p.y, p.z);
      }
    }
    const land = new THREE.Points(segGeo(a), landMat);
    land.renderOrder = 1;
    earthSpin.add(land);
  };
  img.src = 'vendor/earth_mask.jpg';
}
const rimMat = new THREE.ShaderMaterial({
  uniforms: { c: { value: new THREE.Color(0x9fc3ff) }, o: { value: 0 } },
  vertexShader: 'varying vec3 vN; varying vec3 vV; void main(){ vec4 mv = modelViewMatrix * vec4(position,1.0); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }',
  fragmentShader: 'uniform vec3 c; uniform float o; varying vec3 vN; varying vec3 vV; void main(){ float f = pow(1.0 - max(dot(normalize(vN), normalize(vV)), 0.0), 3.4); gl_FragColor = vec4(c, f * o * 0.9); }',
  transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false,
});
earthL.group.add(new THREE.Mesh(new THREE.SphereGeometry(ER + 0.04, 72, 48), rimMat));

const cityVec = {};
{
  const a = [];
  for (const [name, lat, lon] of CITIES) {
    const p = ll(lat, lon, ER + 0.03);
    cityVec[name] = p;
    a.push(p.x, p.y, p.z);
  }
  const g = segGeo(a);
  const halo = new THREE.Points(g, glowMat(earthL, EMBER, 0.42, 0.9));
  const core = new THREE.Points(g, glowMat(earthL, 0xffffff, 0.12, 1));
  halo.renderOrder = 2;
  core.renderOrder = 3;
  earthSpin.add(halo, core);
}

// Network arcs
const arcL = mkLayer(earthSpin);
const ARC_SEG = 56;
const arcs = [];
{
  const m = lineMat(arcL, EMBER, 0.75, { blending: THREE.AdditiveBlending });
  for (const [a, b] of ARCS) {
    const va = cityVec[a].clone().normalize();
    const vb = cityVec[b].clone().normalize();
    const ang = va.angleTo(vb);
    const lift = 0.12 + ang * 0.55;
    const pts = [];
    for (let i = 0; i <= ARC_SEG; i++) {
      const u = i / ARC_SEG;
      const s0 = Math.sin((1 - u) * ang) / Math.sin(ang);
      const s1 = Math.sin(u * ang) / Math.sin(ang);
      const p = va.clone().multiplyScalar(s0).addScaledVector(vb, s1);
      p.multiplyScalar(ER + 0.03 + lift * Math.sin(Math.PI * u));
      pts.push(p);
    }
    const g = new THREE.BufferGeometry().setFromPoints(pts);
    g.setDrawRange(0, 0);
    arcL.group.add(new THREE.Line(g, m));
    arcs.push({ g, pts, ph: rnd() });
  }
}
const arcPkPos = new Float32Array(arcs.length * 3);
const arcPkGeo = new THREE.BufferGeometry();
arcPkGeo.setAttribute('position', new THREE.BufferAttribute(arcPkPos, 3));
arcL.group.add(new THREE.Points(arcPkGeo, glowMat(arcL, 0xffffff, 0.2, 1)));
arcL.group.traverse((c) => { c.renderOrder = 4; c.frustumCulled = false; });

// Earth orientation: which part of the globe faces the camera in each stage
const FACE = new V3(0, 0.72, 0.69).normalize();
// Spin the longitude round to the camera, then tilt. Keeps north pointing up,
// which a shortest-arc rotation does not.
function faceQuat(lat, lon) {
  const v = ll(lat, lon).normalize();
  const yaw = new THREE.Quaternion().setFromAxisAngle(new V3(0, 1, 0), -Math.atan2(v.x, v.z));
  const faceElev = Math.atan2(FACE.y, FACE.z);
  const tilt = new THREE.Quaternion().setFromAxisAngle(new V3(1, 0, 0), -(faceElev - (lat * Math.PI) / 180));
  return tilt.multiply(yaw);
}
const qAmericas = faceQuat(36, -108);
const qAsia = faceQuat(18, 96);
const qYaw = new THREE.Quaternion();
const Y_AXIS = new V3(0, 1, 0);

// Beams from the satellite to cities
const BEAM_CITIES = ['San Francisco', 'Los Angeles', 'New York', 'Miami', 'Mexico City', 'Toronto'];
const beamL = mkLayer();
const beamPos = new Float32Array(BEAM_CITIES.length * 6);
const beamGeo = new THREE.BufferGeometry();
beamGeo.setAttribute('position', new THREE.BufferAttribute(beamPos, 3));
beamL.group.add(new THREE.LineSegments(beamGeo, lineMat(beamL, EMBER, 0.5, { blending: THREE.AdditiveBlending })));
const beamPkPos = new Float32Array(BEAM_CITIES.length * 2 * 3);
const beamPkGeo = new THREE.BufferGeometry();
beamPkGeo.setAttribute('position', new THREE.BufferAttribute(beamPkPos, 3));
beamL.group.add(new THREE.Points(beamPkGeo, glowMat(beamL, 0xffffff, 0.16, 1)));
beamL.group.frustumCulled = false;
beamL.group.children.forEach((c) => { c.frustumCulled = false; c.renderOrder = 5; });

/* ------------------------------------------------------------------ */
/* Head and chip                                                        */
/* ------------------------------------------------------------------ */
// The head belongs to a person who stands in the town of the Network stage. In the Mind stage the whole
// town is scaled up so that only the head is in view, at the size and place it was modelled for.
const TOWN_HEAD = 0.1; // the head inside the town, relative to its close-up size
const HEAD_Y = 1.6; // head centre above the ground, in town units
const HEAD_CLOSE = new V3(0, -1.35, 4);
const town = new THREE.Group();
scene.add(town);
const person = new THREE.Group();
town.add(person);
const headL = mkLayer(person);
headL.group.position.set(0, HEAD_Y, 0);
headL.group.scale.setScalar(TOWN_HEAD);
const PROFILE = [
  [-0.55, -1.3], [-0.5, -0.9], [-0.62, -0.55], [-0.88, -0.15], [-0.98, 0.3], [-0.9, 0.75], [-0.62, 1.08],
  [-0.15, 1.22], [0.3, 1.15], [0.62, 0.92], [0.78, 0.58], [0.8, 0.36], [0.74, 0.24], [0.88, 0.02],
  [1.02, -0.14], [0.84, -0.22], [0.86, -0.36], [0.78, -0.44], [0.84, -0.54], [0.76, -0.66], [0.8, -0.84],
  [0.62, -0.98], [0.3, -0.96], [0.14, -1.08], [0.12, -1.3],
];
{
  const curve = new THREE.CatmullRomCurve3(PROFILE.map(([x, y]) => new V3(x, y, 0)), false, 'centripetal');
  const base = curve.getPoints(260);
  const slices = [[-0.42, 0.14], [-0.28, 0.24], [-0.14, 0.42], [0, 0.95], [0.14, 0.42], [0.28, 0.24], [0.42, 0.14]];
  for (const [z, o] of slices) {
    const k = 1 - Math.pow(z / 0.42, 2) * 0.2;
    const pts = base.map((p) => new V3(p.x * k, 0.1 + (p.y - 0.1) * k, z));
    headL.group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), lineMat(headL, BONE, o)));
  }
}
const NEUR = 170;
const neur = [];
for (let i = 0; i < NEUR; i++) {
  let x; let y;
  do { x = rnd() * 2 - 1; y = rnd() * 2 - 1; } while (x * x + y * y > 1);
  neur.push(new V3(-0.1 + x * 0.66, 0.52 + y * 0.43, (rnd() - 0.5) * 0.5));
}
const CHIP_POS = new V3(-0.42, 1.27, 0);
let neurMaxD = 0;
const neurD = neur.map((p) => { const d = p.distanceTo(CHIP_POS); neurMaxD = Math.max(neurMaxD, d); return d; });
const neurCol = new Float32Array(NEUR * 3);
const neurGeo = new THREE.BufferGeometry().setFromPoints(neur);
neurGeo.setAttribute('color', new THREE.BufferAttribute(neurCol, 3));
headL.group.add(new THREE.Points(neurGeo, glowMat(headL, 0xffffff, 0.085, 1, { vertexColors: true })));
const links = [];
for (let i = 0; i < NEUR; i++) {
  const near = neur.map((p, j) => [p.distanceToSquared(neur[i]), j]).sort((a, b) => a[0] - b[0]);
  for (let k = 1; k <= 2; k++) if (near[k][1] > i || k === 1) links.push([i, near[k][1]]);
}
const linkCol = new Float32Array(links.length * 6);
const linkGeo = new THREE.BufferGeometry().setFromPoints(links.flatMap(([a, b]) => [neur[a], neur[b]]));
linkGeo.setAttribute('color', new THREE.BufferAttribute(linkCol, 3));
headL.group.add(new THREE.LineSegments(linkGeo, lineMat(headL, 0xffffff, 0.55, { vertexColors: true })));

const chip = new THREE.Group();
const chipRings = [];
{
  const s = 0.23;
  const a = [];
  const sq = (r) => { a.push(-r, -r, 0, r, -r, 0, r, -r, 0, r, r, 0, r, r, 0, -r, r, 0, -r, r, 0, -r, -r, 0); };
  sq(s); sq(s * 0.56);
  for (let i = -2; i <= 2; i++) {
    const t = i * s * 0.36;
    const p = 0.085;
    a.push(t, s, 0, t, s + p, 0, t, -s, 0, t, -s - p, 0, s, t, 0, s + p, t, 0, -s, t, 0, -s - p, t, 0);
  }
  a.push(-s, s * 0.62, 0, -s * 0.62, s, 0);
  // Solid body so the chip reads against the head lines behind it.
  const body = new THREE.Mesh(
    new THREE.PlaneGeometry(s * 2, s * 2),
    reg(headL, new THREE.MeshBasicMaterial({ color: 0x0a0e15, opacity: 0.96, fog: false, depthWrite: false, depthTest: false })),
  );
  body.renderOrder = 6;
  const die = new THREE.Mesh(
    new THREE.PlaneGeometry(s * 1.12, s * 1.12),
    reg(headL, new THREE.MeshBasicMaterial({ color: EMBER, opacity: 0.3, fog: false, depthWrite: false, depthTest: false })),
  );
  die.renderOrder = 7;
  const lines = new THREE.LineSegments(segGeo(a), lineMat(headL, EMBER, 1, { depthTest: false }));
  lines.renderOrder = 8;
  const glow = new THREE.Points(segGeo([0, 0, 0]), glowMat(headL, EMBER, 0.95, 0.7, { depthTest: false }));
  glow.renderOrder = 9;
  chip.add(body, die, lines, glow);
  // Two rings that pulse outward once the chip is seated.
  const ringGeo = segGeo([-s, -s, 0, s, -s, 0, s, -s, 0, s, s, 0, s, s, 0, -s, s, 0, -s, s, 0, -s, -s, 0]);
  for (let k = 0; k < 2; k++) {
    const m = lineMat(headL, EMBER, 0.9, { depthTest: false });
    const r = new THREE.LineSegments(ringGeo, m);
    r.renderOrder = 8;
    chip.add(r);
    chipRings.push({ r, m });
  }
}
headL.group.add(chip);
const THREADS = 7;
const threadTargets = neurD.map((d, i) => [d, i]).sort((a, b) => a[0] - b[0]).slice(0, THREADS).map(([, i]) => neur[i]);
const threadPos = new Float32Array(THREADS * 6);
const threadGeo = new THREE.BufferGeometry();
threadGeo.setAttribute('position', new THREE.BufferAttribute(threadPos, 3));
headL.group.add(new THREE.LineSegments(threadGeo, lineMat(headL, EMBER, 0.85)));
const skyPos = new Float32Array(6);
const skyGeo = new THREE.BufferGeometry();
skyGeo.setAttribute('position', new THREE.BufferAttribute(skyPos, 3));
const skyMat = lineMat(headL, EMBER, 0.45, { blending: THREE.AdditiveBlending });
headL.group.add(new THREE.Line(skyGeo, skyMat));
headL.group.traverse((c) => { c.frustumCulled = false; });

/* ------------------------------------------------------------------ */
/* Town (Network stage)                                                 */
/* ------------------------------------------------------------------ */
// A wireframe city around the person. Three landmarks carry the Network companies:
// a tower of linked blocks under a coin, a stadium with a market board, and a casino.
// The same town, small, sits on the globe of the closing screen.
const TOWN_P = new V3(0, -1.6, 0);
const MINI = 0.62;
const MINI_N = new V3(0.5, 0.84, 0.22).normalize();
const MINI_P = EARTH_C.clone().addScaledVector(MINI_N, ER - 0.2);
const MINI_Q = new THREE.Quaternion().setFromUnitVectors(new V3(0, 1, 0), MINI_N);
const townL = mkLayer(town); // landmarks and the nearest blocks; also the miniature on the closing globe
const farL = mkLayer(town); // street grid and the rest of the skyline; Network stage only
const bodyL = mkLayer(person);

function shapeMats(L, boneO) {
  return {
    fill: reg(L, new THREE.MeshBasicMaterial({
      color: 0x0a0e15, opacity: 0.93, side: THREE.DoubleSide, fog: false,
      polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1,
    })),
    bone: lineMat(L, BONE, boneO),
    dim: lineMat(L, BONE, boneO * 0.3),
    ember: lineMat(L, EMBER, 0.95),
  };
}
// Collects line segments (bone, dim, ember) and filled faces, then builds them as one group.
function mkShape() {
  const S = { bone: [], dim: [], ember: [], tris: [] };
  S.seg = (a, b, to = S.bone) => to.push(a[0], a[1], a[2], b[0], b[1], b[2]);
  S.path = (pts, closed, to) => {
    for (let i = 0; i < pts.length - (closed ? 0 : 1); i++) S.seg(pts[i], pts[(i + 1) % pts.length], to);
  };
  S.quad = (a, b, c, d) => S.tris.push(...a, ...b, ...c, ...a, ...c, ...d);
  // A box standing on y0, optionally turned about its vertical axis.
  S.box = (cx, y0, cz, w, h, d, rot = 0, to) => {
    const co = Math.cos(rot);
    const si = Math.sin(rot);
    const p = (x, z) => [cx + x * co + z * si, y0, cz - x * si + z * co];
    const lo = [p(-w / 2, -d / 2), p(w / 2, -d / 2), p(w / 2, d / 2), p(-w / 2, d / 2)];
    const hi = lo.map(([x, , z]) => [x, y0 + h, z]);
    S.path(lo, true, to);
    S.path(hi, true, to);
    for (let k = 0; k < 4; k++) {
      S.seg(lo[k], hi[k], to);
      S.quad(lo[k], lo[(k + 1) % 4], hi[(k + 1) % 4], hi[k]);
    }
    S.quad(hi[0], hi[1], hi[2], hi[3]);
  };
  // Sections stacked along y, [y, cx, cz, rx, rz], joined into a tube with n sides.
  S.loft = (secs, n, to) => {
    const rings = secs.map(([y, cx, cz, rx, rz]) => Array.from({ length: n }, (_, k) => {
      const a = ((k + 0.5) / n) * Math.PI * 2;
      return [cx + Math.cos(a) * rx, y, cz + Math.sin(a) * rz];
    }));
    rings.forEach((r) => S.path(r, true, to));
    for (let i = 0; i < rings.length - 1; i++) {
      for (let k = 0; k < n; k++) {
        S.seg(rings[i][k], rings[i + 1][k], to);
        S.quad(rings[i][k], rings[i][(k + 1) % n], rings[i + 1][(k + 1) % n], rings[i + 1][k]);
      }
    }
  };
  S.build = (parent, M) => {
    const g = new THREE.Group();
    if (S.tris.length) {
      const fill = new THREE.Mesh(segGeo(S.tris), M.fill);
      fill.renderOrder = 4;
      g.add(fill);
    }
    for (const k of ['dim', 'bone', 'ember']) {
      if (!S[k].length) continue;
      const l = new THREE.LineSegments(segGeo(S[k]), M[k]);
      l.renderOrder = 5;
      g.add(l);
    }
    parent.add(g);
    return g;
  };
  return S;
}
const circlePts = (r, n, f) => Array.from({ length: n }, (_, k) => {
  const a = (k / n) * Math.PI * 2;
  return f(Math.cos(a) * r, Math.sin(a) * r);
});

const townM = shapeMats(townL, 0.85);
const TOWN_PT = []; // point materials in the town, so their size can follow the town's scale
const townPts = (L, color, size, opacity = 1) => {
  const m = glowMat(L, color, size, opacity);
  m.userData.size = size;
  TOWN_PT.push(m);
  return m;
};
const HEAD_PT = headL.mats.filter((m) => m.isPointsMaterial);
HEAD_PT.forEach((m) => { m.userData.size = m.size; });

// Body: the neck meets the open end of the head profile. The person faces +X, like the head.
{
  const b = mkShape();
  b.loft([
    [1.478, 0, 0, 0.034, 0.036], [1.415, 0, 0, 0.04, 0.05], [1.385, 0, 0, 0.07, 0.205], [1.24, 0.01, 0, 0.09, 0.175],
    [1.02, 0.005, 0, 0.068, 0.13], [0.9, 0, 0, 0.078, 0.15], [0.8, 0, 0, 0.07, 0.145],
  ], 8);
  for (const d of [1, -1]) {
    b.loft([[0.82, 0, 0.075 * d, 0.062, 0.068], [0.46, 0.005, 0.075 * d, 0.045, 0.048], [0.07, -0.005, 0.075 * d, 0.03, 0.032], [0, 0.025, 0.075 * d, 0.055, 0.036]], 6);
    b.loft([[1.37, 0, 0.215 * d, 0.042, 0.04], [1.1, -0.005, 0.245 * d, 0.032, 0.03], [0.86, 0.02, 0.262 * d, 0.024, 0.023], [0.76, 0.03, 0.265 * d, 0.014, 0.026]], 6);
  }
  const g = b.build(bodyL.group, shapeMats(bodyL, 0.8));
  g.position.x = -0.021;
}

// Skyline. Blocks are laid on a street grid, leaving the square and the three landmark plots clear.
const PLOT = { yuga: [-1.4, -2.7], predictex: [2.2, -0.9], gains: [-2.0, 1.5] };
const rise = []; // [group, start, end]: each rises from the ground over that part of the timeline
{
  const trnd = rng(41);
  const keepOut = [[0, 0, 1.75], [...PLOT.yuga, 1.1], [...PLOT.predictex, 1.85], [...PLOT.gains, 1.7]];
  const bands = [mkShape(), mkShape(), mkShape()];
  for (let i = -6; i <= 6; i++) {
    for (let j = -6; j <= 6; j++) {
      const cx = i * 1.5 + (trnd() - 0.5) * 0.22;
      const cz = j * 1.5 + (trnd() - 0.5) * 0.22;
      const w = 0.7 + trnd() * 0.45;
      const d = 0.7 + trnd() * 0.45;
      const tall = Math.pow(trnd(), 1.8);
      const extra = trnd();
      const dist = Math.hypot(cx, cz);
      if (dist > 9.3 || cz > 5.3 || trnd() < 0.1) continue;
      if (keepOut.some(([x, z, r]) => Math.hypot(cx - x, cz - z) < r + 0.5)) continue;
      // An avenue runs back from the square, so the person stands against open ground.
      if (Math.abs(cx) < 1 && cz < 0) continue;
      // Tall at the back, slabs in front, so nothing stands between the viewer and the square.
      const h = cz > 2.3 ? 0.1 + tall * 0.22 : (0.45 + tall * 2.3) * (cz < -2 ? 1 : cz < 1 ? 0.8 : 0.45);
      const S = bands[dist < 3.3 ? 0 : dist < 6.4 ? 1 : 2];
      S.box(cx, 0, cz, w, h, d);
      for (let y = 0.42; y < h - 0.2; y += 0.42) {
        S.path([[cx - w / 2, y, cz - d / 2], [cx + w / 2, y, cz - d / 2], [cx + w / 2, y, cz + d / 2], [cx - w / 2, y, cz + d / 2]], true, S.dim);
      }
      if (h > 1.5 && extra < 0.5) {
        S.box(cx, h, cz, w * 0.58, h * 0.26, d * 0.58);
        if (extra < 0.25) S.seg([cx, h * 1.26, cz], [cx, h * 1.26 + 0.45, cz]);
      }
    }
  }
  // The square the person stands in.
  bands[0].path(circlePts(1.2, 48, (x, z) => [x, 0.01, z]), true, bands[0].dim);
  bands[0].path(circlePts(0.46, 28, (x, z) => [x, 0.01, z]), true, bands[0].ember);
  rise.push([bands[0].build(townL.group, townM), 5.12, 5.4]);
  rise.push([bands[1].build(farL.group, shapeMats(farL, 0.5)), 5.16, 5.46]);
  rise.push([bands[2].build(farL.group, shapeMats(farL, 0.24)), 5.2, 5.5]);

  // Street grid, fading out towards the edge of town.
  const pos = [];
  const col = [];
  const E = 10.5;
  const stepG = 0.75;
  const fade = (x, z) => 1 - sramp(Math.hypot(x, z), 3.5, E);
  for (let a = -E; a <= E + 0.01; a += stepG) {
    for (let b = -E; b < E - 0.01; b += stepG) {
      for (const [x0, z0, x1, z1] of [[a, b, a, b + stepG], [b, a, b + stepG, a]]) {
        pos.push(x0, 0, z0, x1, 0, z1);
        const f0 = fade(x0, z0);
        const f1 = fade(x1, z1);
        col.push(f0, f0, f0, f1, f1, f1);
      }
    }
  }
  const g = segGeo(pos);
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  const grid = new THREE.LineSegments(g, lineMat(farL, BONE, 0.26, { vertexColors: true }));
  grid.renderOrder = 3;
  farL.group.add(grid);
}

// Landmarks. Each has an empty object where its company label is pinned.
const landmark = {};
const mkLandmark = (id, start, end) => {
  const g = new THREE.Group();
  g.position.set(PLOT[id][0], 0, PLOT[id][1]);
  townL.group.add(g);
  rise.push([g, start, end]);
  landmark[id] = new THREE.Object3D();
  g.add(landmark[id]);
  return g;
};

// Yuga Labs: a tower of linked blocks with a coin on top.
const coin = new THREE.Group();
{
  const g = mkLandmark('yuga', 5.2, 5.48);
  const t = mkShape();
  const B = 0.62;
  const GAP = 0.1;
  for (let i = 0; i < 4; i++) {
    const y0 = i * (B + GAP);
    t.box(0, y0, 0, B, B, B, i * 0.22);
    if (i < 3) {
      for (const [x, z] of [[-0.12, -0.12], [0.12, -0.12], [0.12, 0.12], [-0.12, 0.12]]) t.seg([x, y0 + B, z], [x, y0 + B + GAP, z], t.ember);
    }
  }
  const top = 4 * B + 3 * GAP;
  const R = 0.5;
  t.seg([0, top, 0], [0, top + 0.16, 0], t.ember);
  t.build(g, townM);

  const c = mkShape();
  const P = (x, y) => [x * R, y * R, 0];
  c.path(circlePts(1, 40, P), true, c.ember);
  c.path(circlePts(0.84, 40, P), true, c.ember);
  // The coin's mark: a B with two strokes through it.
  const k = 0.56;
  const lobe = (cx, cy) => Array.from({ length: 11 }, (_, i) => {
    const a = Math.PI / 2 - (i / 10) * Math.PI;
    return P((cx + Math.cos(a) * 0.25) * k, (cy + Math.sin(a) * 0.25) * k);
  });
  c.path([P(-0.44 * k, 0.5 * k), ...lobe(0.04, 0.25), P(-0.3 * k, 0)], false, c.ember);
  c.path([P(-0.3 * k, 0), ...lobe(0.12, -0.25), P(-0.44 * k, -0.5 * k)], false, c.ember);
  for (const x of [-0.3, -0.24]) c.seg(P(x * k, 0.5 * k), P(x * k, -0.5 * k), c.ember);
  for (const x of [-0.14, 0.06]) {
    c.seg(P(x * k, 0.5 * k), P(x * k, 0.7 * k), c.ember);
    c.seg(P(x * k, -0.5 * k), P(x * k, -0.7 * k), c.ember);
  }
  const rim = circlePts(1, 40, P);
  for (let i = 1; i < rim.length - 1; i++) c.tris.push(...rim[0], ...rim[i], ...rim[i + 1]);
  c.build(coin, townM);
  coin.position.y = top + 0.16 + R;
  g.add(coin);
  landmark.yuga.position.set(0, top + 0.16 + R * 2, 0);
}

// PredictEX: a stadium, and behind it a board showing the market on the game.
const chartGeo = new THREE.BufferGeometry();
const CHART_N = 13;
{
  const g = mkLandmark('predictex', 5.24, 5.5);
  const t = mkShape();
  const n = 28;
  const ring = (rx, rz, y) => circlePts(1, n, (x, z) => [x * rx, y, z * rz]);
  const base = ring(1.08, 0.8, 0);
  const rimTop = ring(1.2, 0.92, 0.5);
  const inner = ring(0.76, 0.48, 0.1);
  t.path(base, true);
  t.path(rimTop, true);
  t.path(inner, true);
  for (let k = 0; k < n; k++) {
    const q = (k + 1) % n;
    t.quad(base[k], base[q], rimTop[q], rimTop[k]);
    t.quad(rimTop[k], rimTop[q], inner[q], inner[k]);
    if (k % 2 === 0) { t.seg(base[k], rimTop[k], t.dim); t.seg(rimTop[k], inner[k], t.dim); }
  }
  const py = 0.1;
  t.path([[-0.52, py, -0.27], [0.52, py, -0.27], [0.52, py, 0.27], [-0.52, py, 0.27]], true, t.ember);
  t.seg([0, py, -0.27], [0, py, 0.27], t.ember);
  t.path(circlePts(0.11, 14, (x, z) => [x, py, z]), true, t.ember);
  // Board on two masts.
  const bz = -1.08;
  for (const x of [-0.6, 0.6]) t.seg([x, 0, bz], [x, 1.2, bz]);
  t.box(0, 1.2, bz, 1.72, 1.0, 0.06);
  const fz = bz + 0.04;
  t.seg([-0.72, 1.78, fz], [0.72, 1.78, fz], t.dim);
  t.seg([-0.72, 1.44, fz], [0.72, 1.44, fz], t.dim);
  // Odds bar: the filled part is the market's price for one side.
  t.path([[-0.72, 1.27, fz], [0.72, 1.27, fz], [0.72, 1.36, fz], [-0.72, 1.36, fz]], true);
  t.seg([0.2, 1.27, fz], [0.2, 1.36, fz], t.ember);
  t.build(g, townM);
  const bar = new THREE.Mesh(
    segGeo([-0.72, 1.27, fz, 0.2, 1.27, fz, 0.2, 1.36, fz, -0.72, 1.27, fz, 0.2, 1.36, fz, -0.72, 1.36, fz]),
    reg(townL, new THREE.MeshBasicMaterial({ color: EMBER, opacity: 0.6, side: THREE.DoubleSide, fog: false, depthWrite: false })),
  );
  bar.renderOrder = 5;
  g.add(bar);
  // Price line, redrawn over and over.
  const ys = [1.5, 1.6, 1.53, 1.68, 1.62, 1.8, 1.72, 1.9, 1.84, 1.98, 1.92, 2.06, 2.1];
  chartGeo.setFromPoints(ys.map((y, i) => new V3(-0.72 + (i / (CHART_N - 1)) * 1.44, y, fz)));
  const chart = new THREE.Line(chartGeo, townM.ember);
  chart.renderOrder = 5;
  g.add(chart);
  landmark.predictex.position.set(0, 2.2, bz);
}

// Gains: a casino with a lit 777 sign and a pair of dice turning above it.
const dice = [];
const bulbMats = [];
{
  const g = mkLandmark('gains', 5.28, 5.52);
  const t = mkShape();
  const fz = 0.575;
  t.box(0, 0, 0, 1.9, 0.7, 1.15);
  t.box(0, 0.7, -0.1, 1.3, 0.32, 0.8);
  for (const x of [-0.78, -0.5, 0.5, 0.78]) t.seg([x, 0, fz + 0.002], [x, 0.7, fz + 0.002], t.dim);
  t.seg([-0.95, 0.56, fz + 0.002], [0.95, 0.56, fz + 0.002], t.dim);
  const arch = Array.from({ length: 13 }, (_, i) => {
    const a = Math.PI - (i / 12) * Math.PI;
    return [Math.cos(a) * 0.24, 0.26 + Math.sin(a) * 0.24, fz + 0.002];
  });
  t.path([[-0.24, 0, fz + 0.002], ...arch, [0.24, 0, fz + 0.002]], false, t.ember);
  // Sign on the roof.
  const sz = 0.3;
  const y0 = 1.14;
  const y1 = 1.76;
  for (const x of [-0.5, 0.5]) t.seg([x, 1.02, sz], [x, y0, sz]);
  t.box(0, y0, sz, 1.5, y1 - y0, 0.05);
  const s7 = sz + 0.03;
  for (const cx of [-0.44, 0, 0.44]) {
    t.seg([cx - 0.14, 1.63, s7], [cx + 0.14, 1.63, s7], t.ember);
    t.seg([cx + 0.14, 1.63, s7], [cx - 0.04, 1.26, s7], t.ember);
    t.seg([cx + 0.1, 1.63, s7], [cx - 0.08, 1.26, s7], t.ember);
  }
  t.build(g, townM);
  // Bulbs round the sign, in two sets that take turns.
  const sets = [[], []];
  let nb = 0;
  const bulb = (x, y) => sets[nb++ % 2].push(x, y, s7);
  for (let x = -0.75; x <= 0.751; x += 0.125) { bulb(x, y1); }
  for (let y = y1 - 0.124; y >= y0 + 0.01; y -= 0.124) { bulb(0.75, y); }
  for (let x = 0.75; x >= -0.751; x -= 0.125) { bulb(x, y0); }
  for (let y = y0 + 0.124; y <= y1 - 0.01; y += 0.124) { bulb(-0.75, y); }
  for (const a of sets) {
    const m = townPts(townL, 0xffd9a0, 0.075, 1);
    const p = new THREE.Points(segGeo(a), m);
    p.renderOrder = 6;
    g.add(p);
    bulbMats.push(m);
  }
  // Dice.
  const pipM = townPts(townL, 0xffffff, 0.05, 1);
  const D = 0.26;
  const pat = [[], [[0, 0]], [[-1, -1], [1, 1]], [[-1, -1], [0, 0], [1, 1]], [[-1, -1], [1, -1], [1, 1], [-1, 1]],
    [[-1, -1], [1, -1], [1, 1], [-1, 1], [0, 0]], [[-1, -1], [1, -1], [1, 1], [-1, 1], [-1, 0], [1, 0]]];
  // Opposite faces of a die add up to seven.
  const faces = [[1, (u, v) => [0.5, u, v]], [6, (u, v) => [-0.5, u, v]], [2, (u, v) => [u, 0.5, v]],
    [5, (u, v) => [u, -0.5, v]], [3, (u, v) => [u, v, 0.5]], [4, (u, v) => [u, v, -0.5]]];
  for (const [x, y, ph] of [[-0.24, 2.14, 0.4], [0.26, 2.24, 2.1]]) {
    const die = new THREE.Group();
    const s = mkShape();
    s.box(0, -D / 2, 0, D, D, D);
    s.build(die, townM);
    const pips = [];
    for (const [nPips, f] of faces) {
      for (const [u, v] of pat[nPips]) pips.push(...f(u * 0.27, v * 0.27).map((q) => q * D * 1.02));
    }
    const p = new THREE.Points(segGeo(pips), pipM);
    p.renderOrder = 6;
    die.add(p);
    die.position.set(x, y, sz);
    g.add(die);
    dice.push({ die, ph });
  }
  landmark.gains.position.set(0, 2.44, sz);
}

// Lines from the chip in the person's head to each landmark, with a pulse running along each.
const LINK_SEG = 40;
const linkArcs = [];
const linkPkPos = new Float32Array(3 * 3);
const linkPkGeo = new THREE.BufferGeometry();
linkPkGeo.setAttribute('position', new THREE.BufferAttribute(linkPkPos, 3));
{
  const m = lineMat(townL, EMBER, 0.6, { blending: THREE.AdditiveBlending });
  const from = new V3(-0.02, HEAD_Y + 0.15, 0);
  for (const id of ['yuga', 'predictex', 'gains']) {
    const to = landmark[id].position.clone().add(landmark[id].parent.position);
    const mid = from.clone().lerp(to, 0.5);
    mid.y = Math.max(from.y, to.y) + 0.9 + from.distanceTo(to) * 0.12;
    const pts = new THREE.QuadraticBezierCurve3(from, mid, to).getPoints(LINK_SEG);
    const g = new THREE.BufferGeometry().setFromPoints(pts);
    g.setDrawRange(0, 0);
    const l = new THREE.Line(g, m);
    l.renderOrder = 6;
    townL.group.add(l);
    linkArcs.push({ g, pts });
  }
  const pk = new THREE.Points(linkPkGeo, townPts(townL, 0xffffff, 0.11, 1));
  pk.renderOrder = 7;
  townL.group.add(pk);
}
town.traverse((c) => { c.frustumCulled = false; });

/* ------------------------------------------------------------------ */
/* Chip (start of the Intelligence stage)                               */
/* ------------------------------------------------------------------ */
// A processor in wireframe. It is shown alone first, then seats into one server, and that server
// takes its place in the rack with the others.
const HOST = 6; // the server that receives the chip
const lpuL = mkLayer(craft);
const lpu = new THREE.Group();
lpuL.group.add(lpu);
const LPU_FLOAT = new V3(0, 0.42, 0);
const LPU_SEAT = blades[HOST].slot.clone();
LPU_SEAT.y += 0.077;
const lpuRings = [];
{
  const S = mkShape();
  S.box(0, 0, 0, 0.5, 0.024, 0.5); // substrate
  S.box(0, 0.024, 0, 0.32, 0.034, 0.32); // lid
  const y = 0.0585;
  S.path([[-0.1, y, -0.1], [0.1, y, -0.1], [0.1, y, 0.1], [-0.1, y, 0.1]], true, S.ember);
  // Contacts along each edge.
  for (let i = -3; i <= 3; i++) {
    const t = i * 0.066;
    S.seg([t, 0.012, 0.25], [t, 0.012, 0.305]); S.seg([t, 0.012, -0.25], [t, 0.012, -0.305]);
    S.seg([0.25, 0.012, t], [0.305, 0.012, t]); S.seg([-0.25, 0.012, t], [-0.305, 0.012, t]);
  }
  // Corner mark, and the small parts around the lid.
  S.seg([-0.25, 0.0245, -0.17], [-0.17, 0.0245, -0.25], S.ember);
  for (const d of [-1, 1]) {
    for (const t of [-0.1, 0, 0.1]) {
      S.seg([t - 0.026, 0.0245, 0.205 * d], [t + 0.026, 0.0245, 0.205 * d], S.dim);
      S.seg([0.205 * d, 0.0245, t - 0.026], [0.205 * d, 0.0245, t + 0.026], S.dim);
    }
  }
  S.build(lpu, shapeMats(lpuL, 0.9));
  lpu.add(new THREE.Points(segGeo([0, 0.07, 0]), glowMat(lpuL, EMBER, 0.4, 0.8)));
  // Two outlines that pulse outward while the chip is on its own.
  const r = 0.25;
  const ringGeo = segGeo([-r, 0.03, -r, r, 0.03, -r, r, 0.03, -r, r, 0.03, r, r, 0.03, r, -r, 0.03, r, -r, 0.03, r, -r, 0.03, -r]);
  for (let k = 0; k < 2; k++) {
    const m = lineMat(lpuL, EMBER, 0.8);
    const ring = new THREE.LineSegments(ringGeo, m);
    lpu.add(ring);
    lpuRings.push({ ring, m });
  }
  // The socket on the server that receives it.
  const q = 0.29;
  const socket = new THREE.LineSegments(
    segGeo([-q, 0.0765, -q, q, 0.0765, -q, q, 0.0765, -q, q, 0.0765, q, q, 0.0765, q, -q, 0.0765, q, -q, 0.0765, q, -q, 0.0765, -q]),
    lineMat(lpuL, EMBER, 0.55),
  );
  blades[HOST].g.add(socket);
}

/* ------------------------------------------------------------------ */
/* Tail-sitter drone (Earth stage)                                      */
/* ------------------------------------------------------------------ */
// A drone that stands on its tail over a ducted fan: nose along +Y, wings along X. It lifts off
// straight up from the globe and holds a hover.
const vbatL = mkLayer();
const vbat = new THREE.Group();
vbatL.group.add(vbat);
{
  const S = mkShape();
  S.loft([[-0.62, 0, 0, 0.075, 0.075], [-0.3, 0, 0, 0.09, 0.09], [0.38, 0, 0, 0.09, 0.09], [0.8, 0, 0, 0.06, 0.06], [1.02, 0, 0, 0.006, 0.006]], 6);
  for (const d of [1, -1]) {
    const w = [[0.085 * d, 0.24, 0], [1.02 * d, 0.1, 0], [1.02 * d, 0.01, 0], [0.085 * d, -0.06, 0]];
    S.path(w, true);
    S.quad(...w);
  }
  S.loft([[-0.92, 0, 0, 0.215, 0.215], [-0.66, 0, 0, 0.215, 0.215]], 10); // fan duct
  for (let k = 0; k < 4; k++) {
    const a = k * Math.PI * 0.5 + Math.PI * 0.25;
    const c = Math.cos(a);
    const n = Math.sin(a);
    const f = [[c * 0.07, -0.48, n * 0.07], [c * 0.215, -0.66, n * 0.215], [c * 0.215, -0.92, n * 0.215], [c * 0.05, -0.74, n * 0.05]];
    S.path(f, true);
    S.quad(...f);
  }
  S.build(vbat, shapeMats(vbatL, 0.9));
  const washA = new THREE.LineSegments(segGeo([0, -0.94, 0, 0, -1.5, 0]), lineMat(vbatL, EMBER, 0.5));
  const washB = new THREE.LineSegments(segGeo([0, -1.5, 0, 0, -2.4, 0]), lineMat(vbatL, EMBER, 0.18));
  const fan = new THREE.Points(segGeo([0, -0.9, 0]), glowMat(vbatL, EMBER, 0.5, 0.9));
  for (const o of [washA, washB, fan]) o.renderOrder = 5;
  vbat.add(washA, washB, fan);
}

/* ------------------------------------------------------------------ */
/* Jet (Earth stage)                                                    */
/* ------------------------------------------------------------------ */
// An uncrewed fighter in wireframe. Nose along +X, wings along Z, fin along +Y.
const jetL = mkLayer();
const jet = new THREE.Group();
jet.rotation.order = 'ZYX'; // roll about its own axis first, then heading, then climb
jetL.group.add(jet);
{
  const lines = [];
  const tris = [];
  const seg = (a, b) => lines.push(a[0], a[1], a[2], b[0], b[1], b[2]);
  const loop = (pts) => pts.forEach((p, i) => seg(p, pts[(i + 1) % pts.length]));
  const quad = (q) => tris.push(...q[0], ...q[1], ...q[2], ...q[0], ...q[2], ...q[3]);
  // Fuselage: flattened six-sided sections [x, half-width, half-height], joined nose to tail.
  const rings = [[1.14, 0.004, 0.004], [0.8, 0.06, 0.05], [0.38, 0.115, 0.095], [-0.25, 0.13, 0.105], [-0.8, 0.1, 0.085], [-1.03, 0.07, 0.065]]
    .map(([x, w, h]) => [[x, h, w * 0.45], [x, 0, w], [x, -h * 0.8, w * 0.5], [x, -h * 0.8, -w * 0.5], [x, 0, -w], [x, h, -w * 0.45]]);
  rings.slice(2).forEach(loop);
  for (let i = 0; i < rings.length - 1; i++) {
    for (let k = 0; k < 6; k++) {
      seg(rings[i][k], rings[i + 1][k]);
      quad([rings[i][k], rings[i][(k + 1) % 6], rings[i + 1][(k + 1) % 6], rings[i + 1][k]]);
    }
  }
  // Swept wings, tailplanes and fin.
  const surfaces = [[[-0.55, 0.1, 0], [-0.93, 0.52, 0], [-1.08, 0.52, 0], [-1.02, 0.08, 0]]];
  for (const d of [1, -1]) {
    surfaces.push([[0.3, 0, 0.1 * d], [-0.42, 0, 0.94 * d], [-0.63, 0, 0.94 * d], [-0.5, 0, 0.1 * d]]);
    surfaces.push([[-0.72, 0.02, 0.08 * d], [-1.0, 0.02, 0.45 * d], [-1.1, 0.02, 0.45 * d], [-1.04, 0.02, 0.07 * d]]);
  }
  surfaces.forEach((q) => { loop(q); quad(q); });
  const fill = new THREE.Mesh(segGeo(tris), reg(jetL, new THREE.MeshBasicMaterial({
    color: 0x0a0e15, opacity: 0.92, side: THREE.DoubleSide, fog: false,
    polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1,
  })));
  fill.renderOrder = 4;
  const wire = new THREE.LineSegments(segGeo(lines), lineMat(jetL, BONE, 0.9));
  wire.renderOrder = 5;
  // Exhaust: a glow at the nozzle and a trail that thins out behind it.
  const trailA = new THREE.LineSegments(segGeo([-1.05, 0, 0, -1.9, 0, 0]), lineMat(jetL, EMBER, 0.55));
  const trailB = new THREE.LineSegments(segGeo([-1.9, 0, 0, -3.4, 0, 0]), lineMat(jetL, EMBER, 0.2));
  const burn = new THREE.Points(segGeo([-1.07, 0, 0]), glowMat(jetL, EMBER, 0.55, 0.95));
  for (const o of [trailA, trailB, burn]) o.renderOrder = 5;
  jet.add(fill, wire, trailA, trailB, burn);
}

/* ------------------------------------------------------------------ */
/* Camera path                                                          */
/* ------------------------------------------------------------------ */
// [stage position, camera xyz, look-at xyz]
const KEYS = [
  [0.0, 0, 0.8, 11.5, 0, 0, 0],
  [1.0, 3.0, 1.4, 9.2, 0, 0, 0],
  [1.14, 1.05, 1.5, 3.0, 0, 0.4, 0],
  [1.34, 1.25, 1.45, 3.1, 0, 0.38, 0],
  [1.68, 4.7, 1.0, 6.6, 0, 0.05, 0],
  [2.0, 4.9, 0.6, 7.4, 0, 0.3, 0],
  [2.35, 3.6, -2.2, 12.4, 0, -0.9, 0],
  [2.75, 5.6, 2.4, 9.4, 0, -0.3, 0],
  [3.0, 5.0, 2.8, 10.6, 0, -1.0, 0],
  [3.4, 0, 3.0, 17, 0, -4.8, 0],
  [4.0, 0, 2.4, 15.5, 0, -4.4, 0],
  [4.3, 0.9, -1.2, 10.5, 0, -1.3, 4],
  [4.9, 0.4, -1.3, 10.1, 0, -1.3, 4],
  [5.36, 0, 5.0, 12.8, 0, -0.5, 0],
  [5.9, 0.9, 4.7, 12.4, 0, -0.5, 0],
  [6.6, 0, 10, 36, 0, -8.5, 0],
  [7.0, 0, 10, 36, 0, -8.5, 0],
];
const camPos = new V3();
const camTgt = new V3();
const kA = new V3();
const kB = new V3();
function cameraAt(s) {
  let k = 0;
  while (k < KEYS.length - 2 && s > KEYS[k + 1][0]) k++;
  const a = KEYS[k];
  const b = KEYS[k + 1];
  const u = smooth(ramp(s, a[0], b[0]));
  camPos.lerpVectors(kA.set(a[1], a[2], a[3]), kB.set(b[1], b[2], b[3]), u);
  camTgt.lerpVectors(kA.set(a[4], a[5], a[6]), kB.set(b[4], b[5], b[6]), u);
}

/* ------------------------------------------------------------------ */
/* DOM: panels, tiles, cards                                            */
/* ------------------------------------------------------------------ */
const panels = [...document.querySelectorAll('.panel')];
const railTicks = [...document.querySelectorAll('.rail li')];
const stageNum = document.getElementById('stageNum');
const stageName = document.getElementById('stageName');
const leaders = document.getElementById('leaders');
const SVGNS = 'http://www.w3.org/2000/svg';
const TILE_AT = { 1: [1.63, 1.7], 2: [2.68, 2.8], 3: [3.45, 3.58], 4: [4.5, 4.62], 5: [5.5, 5.62] };
const CARD_W = 340;

function chipFor(c) {
  if (c.display === 'name') return '';
  const bg = c.chipBg ? ` style="background:${c.chipBg}"` : '';
  return c.logo
    ? `<span class="chip${c.pad ? ' pad' : ''}"${bg}><img src="${c.logo}" alt=""></span>`
    : `<span class="chip">${c.monogram || c.name[0]}</span>`;
}

for (const c of COMPANIES) {
  const nameOnly = c.display === 'name';
  const tw = document.createElement('div');
  tw.className = 'tw';
  const chipHtml = chipFor(c);
  const badge = c.exited ? '<span class="badge">Exited</span>' : '';
  const link = c.url && !nameOnly
    ? `<a href="${c.url}" target="_blank" rel="noopener noreferrer">Visit site &#8599;</a>`
    : '';
  tw.innerHTML =
    `<button class="tile" type="button" aria-expanded="false">${chipHtml}<span>${c.name}</span>${badge}</button>` +
    `<div class="card"><span class="tag">${c.tag}${c.exited ? ' &middot; Exited' : ''}</span><h3>${c.name}</h3><p>${c.desc}</p>${link}</div>`;
  panels[c.stage].querySelector('.tiles').appendChild(tw);
  c.el = tw;
  c.btn = tw.querySelector('.tile');
  c.card = tw.querySelector('.card');
  c.btn.addEventListener('click', (e) => {
    e.stopPropagation();
    const open = !tw.classList.contains('open');
    closeCards();
    if (open) openCard(c);
  });
  tw.querySelector('.card').addEventListener('click', (e) => e.stopPropagation());
  c.line = document.createElementNS(SVGNS, 'line');
  c.dot = document.createElementNS(SVGNS, 'circle');
  c.dot.setAttribute('r', '3');
  leaders.append(c.line, c.dot);
}

// Closing screen: the whole portfolio as a list, grouped by sector and alphabetical inside each sector.
// Each entry opens the same description as its label does.
const plist = document.getElementById('plist');
const sectorList = {};
for (const sec of SECTORS) {
  const group = document.createElement('section');
  group.className = 'pgroup';
  group.innerHTML = `<h3 class="psec">${sec.label.replace('&', '&amp;')}</h3><ul></ul>`;
  plist.appendChild(group);
  sectorList[sec.id] = group.lastChild;
}
for (const c of [...COMPANIES].sort((a, b) => a.name.localeCompare(b.name, 'en', { sensitivity: 'base' }))) {
  const li = document.createElement('li');
  const badge = c.exited ? '<span class="badge">Exited</span>' : '';
  // Two entries can share a name (one company, two interests); those keep their tag line on phones too.
  const twin = COMPANIES.some((o) => o !== c && o.name === c.name) ? ' twin' : '';
  li.innerHTML = `<button class="pitem${twin}" type="button">${chipFor(c)}<span class="pt"><b>${c.name}${badge}</b><i>${c.tag}</i></span></button>`;
  sectorList[c.sector].appendChild(li);
  const item = li.firstChild;
  c.pitem = item;
  // Hover previews the description; a click keeps it open.
  item.addEventListener('click', (e) => {
    e.stopPropagation();
    if (openCo === c && openVia === 'list' && listPinned) closeCards();
    else openFromList(c, true);
  });
  item.addEventListener('mouseenter', () => {
    if (!(openVia === 'list' && listPinned)) openFromList(c, false);
  });
  item.addEventListener('mouseleave', () => {
    if (openCo === c && openVia === 'list' && !listPinned) closeCards();
  });
}

// Label sizes and where each stage's copy starts, so labels can be kept clear of both.
const copyTop = [];
const rail = document.querySelector('.rail');
const portfolio = document.querySelector('.portfolio');
let portTop = 0; // top and left of the portfolio list on the closing screen, in px
let portLeft = 0;
let railLeft = window.innerWidth;
function measure() {
  for (const c of COMPANIES) {
    c.w = c.btn.offsetWidth || 150;
    c.h = c.btn.offsetHeight || 46;
    c.cardH = c.card.offsetHeight || 280;
  }
  // Labels and descriptions stop short of the progress ticks on the right.
  const rr = rail.getBoundingClientRect();
  railLeft = rr.width ? rr.right - 34 : window.innerWidth;
  const pr = portfolio.getBoundingClientRect();
  portTop = pr.top;
  portLeft = pr.left;
  panels.forEach((p, i) => {
    const copy = p.querySelector('.copy');
    copyTop[i] = copy ? copy.getBoundingClientRect().top : window.innerHeight;
  });
}
// On phones the description opens as a sheet at the bottom of the screen.
const sheet = document.createElement('div');
sheet.id = 'sheet';
sheet.className = 'card';
sheet.addEventListener('click', (e) => {
  e.stopPropagation();
  if (e.target.closest('.x')) closeCards();
});
document.body.appendChild(sheet);
let openCo = null;
let openVia = null; // 'tile' (a label on the model) or 'list' (the portfolio list)
let listPinned = false;

function openCard(c) {
  openCo = c;
  openVia = 'tile';
  c.el.classList.add('open');
  c.btn.setAttribute('aria-expanded', 'true');
  sheet.innerHTML = `<button class="x" type="button" aria-label="Close">&times;</button>${c.card.innerHTML}`;
  sheet.classList.add('open');
}
// From the portfolio list the description floats beside the list on desktop, and is the bottom sheet on phones.
function openFromList(c, pin) {
  closeCards();
  openCo = c;
  openVia = 'list';
  listPinned = pin;
  c.pitem.classList.add('on');
  sheet.innerHTML = `<button class="x" type="button" aria-label="Close">&times;</button>${c.card.innerHTML}`;
  if (isDesktop()) {
    sheet.classList.add('float');
    const lr = plist.getBoundingClientRect();
    const ir = c.pitem.getBoundingClientRect();
    const h = sheet.offsetHeight;
    sheet.style.left = `${Math.max(16, lr.left - 16 - CARD_W)}px`;
    sheet.style.top = `${clamp(ir.top + ir.height / 2 - h / 2, 84, Math.max(84, window.innerHeight - h - 24))}px`;
  }
  sheet.classList.add('open');
}
function closeCards() {
  if (!openCo) return;
  if (openVia === 'list') {
    openCo.pitem.classList.remove('on');
    sheet.classList.remove('float');
    sheet.style.left = '';
    sheet.style.top = '';
  } else {
    openCo.el.classList.remove('open');
    openCo.btn.setAttribute('aria-expanded', 'false');
  }
  openCo = null;
  openVia = null;
  listPinned = false;
  sheet.classList.remove('open');
}
// Preview aid: index.html?s=1.7&open=moonshot shows that company's description open.
{
  const c = COMPANIES.find((x) => x.id === new URLSearchParams(window.location.search).get('open'));
  // On the closing screen (s past 6.5) it opens from the portfolio list instead.
  if (c && PIN !== null && PIN > 6.5) setTimeout(() => openFromList(c, true), 500);
  else if (c) openCard(c);
}
document.addEventListener('click', closeCards);
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeCards(); });

function panelOpacity(i, s) {
  if (i === 0) return 1 - sramp(s, 0.45, 0.9);
  if (i === 6) return sramp(s, 6.42, 6.72);
  return sramp(s, i + 0.05, i + 0.2) * (1 - sramp(s, i + 0.86, i + 0.97));
}

const anchorTmp = new V3();
const normTmp = new V3();
function anchorWorld(c, st, narrow) {
  const a = c.anchor;
  if (a.type === 'blade') {
    if (narrow) return blades[a.i].g.localToWorld(anchorTmp.set(0.56, 0, -0.46));
    return blades[a.i].g.localToWorld(anchorTmp.set(a.edge === 'left' ? -0.56 : 0.56, 0, 0.56));
  }
  if (a.type === 'panel') {
    if (narrow) return craft.localToWorld(anchorTmp.set(0.62 + PW * 0.3 * st.unfold, 0, 0));
    const reachOut = 0.62 + PW * (a.wing === 'left' ? 0.72 : 0.5) * st.unfold;
    return craft.localToWorld(anchorTmp.set(a.wing === 'left' ? -reachOut : reachOut, 0, 0));
  }
  if (a.type === 'lpu') return lpu.localToWorld(anchorTmp.set(0.305, 0.012, 0));
  if (a.type === 'rack') return craft.localToWorld(anchorTmp.set(narrow ? 0.7 : -0.7, 1.72, 0.7));
  if (a.type === 'vbat') return vbat.localToWorld(anchorTmp.set(0, 0.3, 0));
  if (a.type === 'jet') return jet.localToWorld(anchorTmp.set(0, 0.1, 0));
  if (a.type === 'landmark') return landmark[c.id].getWorldPosition(anchorTmp);
  if (a.type === 'hull') {
    return hullA.localToWorld(anchorTmp.set(0.87, 0.9, 0.44));
  }
  if (a.type === 'chip') {
    return chip.getWorldPosition(anchorTmp);
  }
  if (a.type === 'city') {
    earthSpin.localToWorld(anchorTmp.copy(cityVec[a.name]));
    normTmp.copy(anchorTmp).sub(EARTH_C).normalize();
    const facing = normTmp.dot(kA.copy(camera.position).sub(anchorTmp).normalize());
    return facing > 0.08 ? anchorTmp : null;
  }
  return null;
}

const placed = [];
function placeTiles(s, st) {
  const W = window.innerWidth;
  const H = window.innerHeight;
  const narrow = !isDesktop();
  const m = narrow ? 10 : 24;
  const baseReach = narrow ? 26 : 70 + Math.min(110, W * 0.07);
  placed.length = 0;
  for (const c of COMPANIES) {
    const pan = panelOpacity(c.stage, s);
    const o = c.at ? win(s, c.at[0], c.at[1], c.at[2], c.at[3]) : sramp(s, TILE_AT[c.stage][0], TILE_AT[c.stage][1]);
    const reach = narrow || !c.reach ? baseReach : baseReach * c.reach;
    let hit = null;
    if (pan > 0.01 && o > 0.01) {
      const w = anchorWorld(c, st, narrow);
      if (w) {
        w.project(camera);
        const ax = (w.x * 0.5 + 0.5) * W;
        const ay = (-w.y * 0.5 + 0.5) * H;
        if (w.z < 1 && ax > -20 && ax < W + 20 && ay > 0 && ay < H) {
          // Preferred side, unless the label would run off the screen there.
          const side = narrow && ['blade', 'panel', 'lpu', 'rack'].includes(c.anchor.type) ? 1 : c.side;
          // Keep the preferred side with a shorter reach if that still clears the anchor; otherwise swap.
          const maxL = Math.max(m, (narrow ? W - m : railLeft - 16) - c.w);
          const at = (sd) => clamp(sd > 0 ? ax + reach : ax - reach - c.w, m, maxL);
          const clear = (sd, x) => (sd > 0 ? x - ax : ax - (x + c.w));
          let L = at(side);
          if (clear(side, L) < 10 && !c.stack) {
            const alt = at(-side);
            if (clear(-side, alt) > clear(side, L)) L = alt;
          }
          const yMax = narrow ? (copyTop[c.stage] || H) - c.h / 2 - 14 : H - 60;
          let ty = clamp(ay + (narrow ? c.mdy ?? c.dy * 0.7 : c.dy), narrow ? 76 : 90, Math.max(100, yMax));
          // A label hung below-left of its anchor opens its description upward. In a short window,
          // lower the label so the description clears the header, without reaching the stage copy.
          if (!narrow && c.dy > 0 && L + c.w <= ax) {
            const need = 86 + c.cardH + 12 + c.h / 2;
            const cap = (copyTop[c.stage] || H) - c.h / 2 - 18;
            if (ty < need) ty = Math.max(ty, Math.min(need, cap));
          }
          hit = { c, ax, ay, L, ty, o, pan };
        }
      }
    }
    if (hit) { placed.push(hit); continue; }
    c.el.style.opacity = '0';
    c.el.classList.remove('live');
    c.line.style.opacity = '0';
    c.dot.style.opacity = '0';
  }
  // Keep labels from sitting on top of each other.
  placed.sort((a, b) => a.ty - b.ty);
  for (let i = 1; i < placed.length; i++) {
    const a = placed[i];
    for (let j = 0; j < i; j++) {
      const b = placed[j];
      const gap = (a.c.h + b.c.h) / 2 + 8;
      if (a.L < b.L + b.c.w + 8 && b.L < a.L + a.c.w + 8 && a.ty - b.ty < gap) a.ty = b.ty + gap;
    }
  }
  for (const { c, ax, ay, L, ty, o, pan } of placed) {
    c.el.style.transform = `translate3d(${L.toFixed(1)}px, ${ty.toFixed(1)}px, 0)`;
    c.el.style.opacity = o.toFixed(3);
    c.el.classList.toggle('live', o * pan > 0.5);
    // Open upward from the lower half, and for labels on the copy side whenever there is room above.
    const roomAbove = ty - c.h / 2 - 12 - c.cardH >= 80;
    c.el.classList.toggle('up', ty > H * 0.5 || (L + c.w <= ax && roomAbove));
    // Open the description away from the model: leftwards when the label sits left of its anchor,
    // sliding along to stay on screen and clear of the progress ticks.
    if (!narrow) {
      const leftOfAnchor = L + c.w <= ax;
      const cardX = leftOfAnchor
        ? Math.max(16, L + c.w - CARD_W)
        : Math.max(16, Math.min(L, railLeft - 16 - CARD_W));
      c.card.style.left = `${(cardX - L).toFixed(1)}px`;
    }
    c.line.setAttribute('x1', ax); c.line.setAttribute('y1', ay);
    c.line.setAttribute('x2', clamp(ax, L, L + c.w)); c.line.setAttribute('y2', ty);
    c.dot.setAttribute('cx', ax); c.dot.setAttribute('cy', ay);
    const lo = (o * pan).toFixed(3);
    c.line.style.opacity = lo;
    c.dot.style.opacity = lo;
  }
}

/* ------------------------------------------------------------------ */
/* Frame                                                                */
/* ------------------------------------------------------------------ */
let sTarget = 0;
let sCur = 0;
let px = 0;
let py = 0;
let pxT = 0;
let pyT = 0;
let lastT = performance.now();
let time = 0;

window.addEventListener('pointermove', (e) => {
  pxT = (e.clientX / window.innerWidth) * 2 - 1;
  pyT = (e.clientY / window.innerHeight) * 2 - 1;
});

const tmp = new V3();
const slot = new V3();
const qTmp = new THREE.Quaternion();
const colTmp = new THREE.Color();
const dimCol = new THREE.Color(0x3a3d44);
const hotCol = new THREE.Color(EMBER);

function update(s, dt) {
  const st = {};

  /* craft */
  // The chip is shown first. One server comes in to take it, then the rest stack into the rack around it.
  const asm = ramp(s, 1.42, 1.66);
  const hostIn = easeOut(ramp(s, 1.28, 1.42));
  const seat = sramp(s, 1.37, 1.48);
  const aside = sramp(s, 0.98, 1.14);
  const busK = sramp(s, 2.5, 2.7);
  for (let i = 0; i < N; i++) {
    const b = blades[i];
    const e = i === HOST ? hostIn : easeOut(clamp(asm * 1.5 - (i / N) * 0.5));
    const drift = 1 - e;
    tmp.copy(b.scatter).lerp(b.back, aside);
    tmp.x += Math.sin(time * 0.3 + b.ph) * 0.3 * drift;
    tmp.y += Math.cos(time * 0.24 + b.ph) * 0.3 * drift;
    slot.copy(b.slot);
    slot.y *= mix(1, 0.6, busK);
    b.g.position.lerpVectors(tmp, slot, e);
    qTmp.setFromAxisAngle(b.axis, time * 0.16 + b.ph);
    b.g.quaternion.copy(b.q).multiply(qTmp).slerp(IDENT, e);
    const hot = (i === HOST ? seat : ramp(e, 0.97, 1)) * (0.7 + 0.3 * Math.sin(time * 5 + b.ph * 3));
    b.ledMat.color.copy(ledDim).lerp(ledHot, hot);
  }
  const satO = 1 - win(s, 4.0, 4.2, 6.02, 6.3);
  // Loose servers dim while the chip is shown on its own.
  setO(bladeL, satO * (1 - 0.5 * win(s, 1.03, 1.14, 1.3, 1.44)));
  setO(frameL, win(s, 1.44, 1.62, 2.02, 2.2));

  const lpuO = win(s, 1.03, 1.12, 1.9, 2.02);
  setO(lpuL, lpuO);
  if (lpuO > 0.004) {
    const t = reducedMotion ? 0 : time;
    const loose = 1 - sramp(s, 1.32, 1.44); // it levels out before it comes down onto the server
    lpu.position.lerpVectors(LPU_FLOAT, LPU_SEAT, seat);
    lpu.position.y += Math.sin(t * 0.9) * 0.02 * loose;
    lpu.rotation.set(0.62 * loose, (0.45 + Math.sin(t * 0.35) * 0.28) * loose, 0);
    lpu.scale.setScalar(mix(0.78, 1, sramp(s, 1.03, 1.14)));
    const live = 1 - sramp(s, 1.4, 1.5);
    for (let k = 0; k < lpuRings.length; k++) {
      const ph = reducedMotion ? 0.35 : (time * 0.5 + k * 0.5) % 1;
      lpuRings[k].ring.scale.set(1 + ph * 0.9, 1, 1 + ph * 0.9);
      lpuRings[k].m.opacity = lpuRings[k].m.userData.base * lpuO * live * (1 - ph);
    }
  }

  const hullO = win(s, 2.03, 2.2, 2.45, 2.62);
  const sep = sramp(s, 2.42, 2.62);
  setO(hullL, hullO);
  hullA.position.x = sep * 2.4; hullA.rotation.z = -sep * 0.55;
  hullB.position.x = -sep * 2.4; hullB.rotation.z = sep * 0.55;
  aft.position.y = -sep * 3;

  const exO = win(s, 2.2, 2.28, 2.42, 2.52);
  setO(exL, exO);
  if (exO > 0.004) {
    for (let i = 0; i < EXN; i++) {
      const [ph, ang, sp] = exSeed[i];
      const f = (time * 1.4 * sp + ph) % 1;
      const r = 0.25 + f * 1.3;
      exPos[i * 3] = Math.cos(ang) * r * f;
      exPos[i * 3 + 1] = -2.45 - f * 6.5;
      exPos[i * 3 + 2] = Math.sin(ang) * r * f;
    }
    exGeo.attributes.position.needsUpdate = true;
  }

  st.unfold = easeOut(ramp(s, 2.55, 2.74));
  setO(panelL, sramp(s, 2.52, 2.6) * satO);
  for (const p of panelPivots) p.scale.x = Math.max(0.001, st.unfold);

  craft.scale.setScalar(mix(1, 0.42, sramp(s, 3.0, 3.4)));
  craft.rotation.y = -0.35 + s * 0.22 + (reducedMotion ? 0 : Math.sin(time * 0.17) * 0.1);
  craft.rotation.z = sramp(s, 2.62, 3.0) * 0.22;

  /* environment */
  setO(groundL, win(s, 0.55, 1.1, 2.2, 2.46));
  groundL.group.position.y = -1.76 - smooth(ramp(s, 2.2, 2.5)) * 34;
  setO(starL, sramp(s, 2.2, 2.6) * 0.95 + 0.12);
  starL.group.rotation.y = s * 0.05 + time * 0.002;
  starL.group.rotation.x = s * 0.02;

  /* earth */
  const earthO = Math.max(win(s, 2.62, 3.0, 4.0, 4.2), sramp(s, 5.92, 6.25));
  setO(earthL, earthO);
  rimMat.uniforms.o.value = earthO;
  earthSpin.quaternion.copy(qAmericas).slerp(qAsia, sramp(s, 4.2, 5.0));
  qYaw.setFromAxisAngle(Y_AXIS, reducedMotion ? 0 : Math.sin(time * 0.11) * 0.05);
  earthSpin.quaternion.premultiply(qYaw);
  earthL.group.updateMatrixWorld(true);

  /* beams */
  const beamGrow = sramp(s, 3.22, 3.5);
  const beamO = beamGrow > 0 ? 1 - sramp(s, 3.95, 4.1) : 0;
  setO(beamL, beamO);
  if (beamO > 0.004) {
    for (let i = 0; i < BEAM_CITIES.length; i++) {
      earthSpin.localToWorld(tmp.copy(cityVec[BEAM_CITIES[i]]));
      const g = clamp(beamGrow * 1.5 - i * 0.08);
      beamPos[i * 6] = 0; beamPos[i * 6 + 1] = 0; beamPos[i * 6 + 2] = 0;
      beamPos[i * 6 + 3] = tmp.x * g; beamPos[i * 6 + 4] = tmp.y * g; beamPos[i * 6 + 5] = tmp.z * g;
      for (let k = 0; k < 2; k++) {
        const f = ((time * 0.45 + i * 0.19 + k * 0.5) % 1) * g;
        const o3 = (i * 2 + k) * 3;
        beamPkPos[o3] = tmp.x * f; beamPkPos[o3 + 1] = tmp.y * f; beamPkPos[o3 + 2] = tmp.z * f;
      }
    }
    beamGeo.attributes.position.needsUpdate = true;
    beamPkGeo.attributes.position.needsUpdate = true;
  }

  /* jet: flies in over the globe for the Earth stage, then circles the globe on the closing screen */
  const jetEarth = win(s, 3.36, 3.5, 3.92, 4.05);
  const jetClose = sramp(s, 6.45, 6.75);
  setO(jetL, Math.max(jetEarth, jetClose));
  if (jetEarth > 0.004) {
    const small = !isDesktop();
    const along = -(1 - easeOut(ramp(s, 3.34, 3.66))) * 5 + (s - 3.7) * 1.1;
    const wob = reducedMotion ? 0 : Math.sin(time * 0.8);
    jet.position.set(
      (small ? -2.2 : -4.5) + along * 0.95,
      (small ? -2.15 : -2.95) + along * 0.2 + wob * 0.05,
      1.5 + along * 0.2,
    );
    jet.rotation.set(0.85 + wob * 0.06, -0.22, 0.2);
    jet.scale.setScalar(small ? 1 : 1.25);
  } else if (jetClose > 0.004) {
    // A level circle around the globe, banked into the turn; it passes in front of the globe and then behind it.
    const th = reducedMotion ? 1.1 : time * 0.22 + 1.1;
    jet.position.set(EARTH_C.x + Math.cos(th) * 8.4, EARTH_C.y + 1, EARTH_C.z + Math.sin(th) * 8.4);
    jet.rotation.set(0.62, -(th + Math.PI / 2), 0);
    jet.scale.setScalar(1.8);
  }

  /* tail-sitter: lifts straight off the globe and holds a hover across from the jet */
  const vbO = win(s, 3.36, 3.5, 3.92, 4.05);
  setO(vbatL, vbO);
  if (vbO > 0.004) {
    const small = !isDesktop();
    const up = easeOut(ramp(s, 3.36, 3.72));
    const bob = reducedMotion ? 0 : Math.sin(time * 0.9 + 1);
    vbat.position.set(small ? 2.0 : 3.7, (small ? -2.2 : -2.7) - (1 - up) * 2.6 + bob * 0.06, 1.6);
    vbat.rotation.set(0.14 + bob * 0.03, 0.5, -0.12 + bob * 0.02);
    vbat.scale.setScalar(small ? 0.8 : 1.1);
  }

  /* network arcs */
  const arcDraw = ramp(s, 6.05, 6.5);
  setO(arcL, sramp(s, 6.0, 6.12));
  for (let i = 0; i < arcs.length; i++) {
    const a = arcs[i];
    const d = easeOut(clamp(arcDraw * 1.6 - (i / arcs.length) * 0.6));
    a.g.setDrawRange(0, Math.floor(d * (ARC_SEG + 1)));
    const f = ((time * 0.22 + a.ph) % 1) * d;
    const p = a.pts[clamp(Math.floor(f * ARC_SEG), 0, ARC_SEG)];
    arcPkPos[i * 3] = p.x; arcPkPos[i * 3 + 1] = p.y; arcPkPos[i * 3 + 2] = p.z;
  }
  arcPkGeo.attributes.position.needsUpdate = true;

  /* town: scaled up to the head alone for the Mind stage, a city for the Network stage,
     then small on the globe for the closing screen */
  const toCity = sramp(s, 4.9, 5.36);
  const toGlobe = sramp(s, 5.88, 6.4);
  const townS = Math.pow(1 / TOWN_HEAD, 1 - toCity) * Math.pow(MINI, toGlobe);
  town.scale.setScalar(townS);
  town.position.copy(HEAD_CLOSE).lerp(tmp.set(TOWN_P.x, TOWN_P.y + HEAD_Y, TOWN_P.z), toCity);
  town.position.y -= HEAD_Y * Math.pow(1 / TOWN_HEAD, 1 - toCity);
  town.position.lerp(MINI_P, toGlobe);
  town.quaternion.copy(IDENT).slerp(MINI_Q, toGlobe);
  // The head keeps turning as in the Mind stage, then the person settles into a three-quarter view.
  person.rotation.y = mix(-0.32 + (Math.min(s, 4.9) - 4.5) * 0.5, -0.62, sramp(s, 4.9, 5.4)) + px * 0.12;
  const townO = sramp(s, 5.1, 5.3);
  setO(bodyL, sramp(s, 4.93, 5.1));
  setO(townL, townO);
  setO(farL, townO * (1 - sramp(s, 5.86, 6.04)));
  for (const m of TOWN_PT) m.size = m.userData.size * townS;
  for (const m of HEAD_PT) m.size = m.userData.size * townS * TOWN_HEAD;
  if (townO > 0.004) {
    for (const [g, a, b] of rise) g.scale.y = Math.max(0.001, easeOut(ramp(s, a, b)));
    const t = reducedMotion ? 0 : time;
    coin.rotation.y = Math.sin(t * 0.7) * 0.55;
    for (const { die, ph } of dice) die.rotation.set(t * 0.5 + ph, t * 0.37 + ph * 2, 0.3);
    const blink = reducedMotion ? 1 : Math.floor(time * 2.2) % 2;
    bulbMats[0].opacity = townO * (blink ? 1 : 0.22);
    bulbMats[1].opacity = townO * (blink ? 0.22 : 1);
    chartGeo.setDrawRange(0, reducedMotion ? CHART_N : Math.min(CHART_N, 2 + Math.floor(((time * 0.2) % 1) * CHART_N * 1.7)));
    const linkDraw = ramp(s, 5.4, 5.6);
    for (let i = 0; i < linkArcs.length; i++) {
      const a = linkArcs[i];
      const d = easeOut(clamp(linkDraw * 1.4 - i * 0.2));
      a.g.setDrawRange(0, Math.floor(d * (LINK_SEG + 1)));
      const p = a.pts[clamp(Math.floor(((time * 0.35 + i * 0.37) % 1) * d * LINK_SEG), 0, LINK_SEG)];
      linkPkPos[i * 3] = p.x; linkPkPos[i * 3 + 1] = p.y; linkPkPos[i * 3 + 2] = p.z;
    }
    linkPkGeo.attributes.position.needsUpdate = true;
  }

  /* head */
  const headO = sramp(s, 4.12, 4.32);
  setO(headL, headO);
  if (headO > 0.004) {
    const seat = easeOut(ramp(s, 4.3, 4.5));
    chip.position.copy(CHIP_POS);
    chip.position.y += (1 - seat) * 1.7;
    chip.rotation.set(0, -person.rotation.y, 0.16);
    const live = sramp(s, 4.46, 4.56);
    for (let k = 0; k < chipRings.length; k++) {
      const ph = reducedMotion ? 0.35 : (time * 0.55 + k * 0.5) % 1;
      chipRings[k].r.scale.setScalar(1 + ph * 1.5);
      chipRings[k].m.opacity = chipRings[k].m.userData.base * headO * live * (1 - ph);
    }
    const wave = ramp(s, 4.45, 4.72) * 1.35;
    for (let i = 0; i < NEUR; i++) {
      const act = clamp((wave - neurD[i] / neurMaxD) * 4) * (0.72 + 0.28 * Math.sin(time * 3 + i * 1.7));
      colTmp.copy(dimCol).lerp(hotCol, act);
      neurCol[i * 3] = colTmp.r; neurCol[i * 3 + 1] = colTmp.g; neurCol[i * 3 + 2] = colTmp.b;
    }
    neurGeo.attributes.color.needsUpdate = true;
    for (let i = 0; i < links.length; i++) {
      for (let k = 0; k < 2; k++) {
        const j = links[i][k];
        const o3 = (i * 2 + k) * 3;
        linkCol[o3] = neurCol[j * 3] * 0.8; linkCol[o3 + 1] = neurCol[j * 3 + 1] * 0.8; linkCol[o3 + 2] = neurCol[j * 3 + 2] * 0.8;
      }
    }
    linkGeo.attributes.color.needsUpdate = true;
    const th = sramp(s, 4.46, 4.6);
    for (let i = 0; i < THREADS; i++) {
      const t = threadTargets[i];
      threadPos[i * 6] = chip.position.x; threadPos[i * 6 + 1] = chip.position.y; threadPos[i * 6 + 2] = 0;
      threadPos[i * 6 + 3] = mix(chip.position.x, t.x, th);
      threadPos[i * 6 + 4] = mix(chip.position.y, t.y, th);
      threadPos[i * 6 + 5] = mix(0, t.z, th);
    }
    threadGeo.attributes.position.needsUpdate = true;
    skyPos[0] = chip.position.x; skyPos[1] = chip.position.y + 0.2; skyPos[2] = 0;
    skyPos[3] = chip.position.x - 0.5; skyPos[4] = chip.position.y + 7; skyPos[5] = -2;
    skyGeo.attributes.position.needsUpdate = true;
    skyMat.opacity = skyMat.userData.base * headO * seat * (0.6 + 0.4 * Math.sin(time * 4));
  }

  /* camera */
  cameraAt(s);
  const aspect = camera.aspect;
  let dist = aspect < 1 ? 1 + (1 - aspect) * 1.15 : 1;
  // Narrow but not tall (a small window, a tablet): pull back so the model clears the header and copy.
  if (!isDesktop()) dist = Math.max(dist, 1.24);
  // Closing screen: the globe moves aside (left on desktop, up on phones) to make room for the portfolio list.
  const closeK = sramp(s, 6.0, 6.55);
  const cityK = win(s, 4.95, 5.36, 5.9, 6.2);
  // The globe sits in the space the portfolio list leaves free, and is sized to fit it: left of the list
  // on desktop, between the header and the list on phones.
  const desk = isDesktop();
  const globeR = desk
    ? Math.max(60, (portLeft - 60) / 2.3)
    : clamp((portTop - 60) * 0.345, 36, window.innerWidth * 0.24);
  const globeX = portLeft * 0.49;
  const globeY = portTop - 16 - globeR;
  if (!desk) dist *= 1 + 0.1 * cityK;
  if (closeK > 0) {
    // Camera distance at which the globe is globeR px across its radius, as a multiple of the offset.
    const want = (ER * window.innerHeight) / (2 * globeR * Math.tan((camera.fov * Math.PI) / 360));
    const v = kA.copy(camPos).sub(camTgt);
    const w = kB.copy(camTgt).sub(EARTH_C);
    const vv = v.lengthSq();
    const vw = v.dot(w);
    const fit = (-vw + Math.sqrt(Math.max(0, vw * vw - vv * (w.lengthSq() - want * want)))) / vv;
    dist = mix(dist, Math.max(dist, fit), closeK);
  }
  camPos.sub(camTgt).multiplyScalar(dist).add(camTgt);
  const shake = reducedMotion ? 0 : win(s, 2.2, 2.3, 2.4, 2.5) * 0.045;
  camera.position.set(
    camPos.x + px * 0.35 + Math.sin(time * 61) * shake,
    camPos.y - py * 0.22 + Math.cos(time * 53) * shake,
    camPos.z,
  );
  camera.lookAt(camTgt);
  // Shift the picture so the object sits clear of the copy.
  if (desk) {
    // The town is wider than the other models, so it sits nearer the middle.
    // The chip in its close-up sits nearer the middle too, so its description has room beside it.
    let sx = window.innerWidth * (-0.13 + 0.04 * cityK + 0.1 * win(s, 1.02, 1.14, 1.36, 1.56));
    if (closeK > 0) {
      camera.updateMatrixWorld(true);
      const x0 = (kA.copy(EARTH_C).project(camera).x + 1) * 0.5 * window.innerWidth + (shiftX || 0);
      sx = mix(sx, x0 - globeX, closeK);
    }
    setShift(Math.round(sx), Math.round(window.innerHeight * 0.07 * closeK));
  } else {
    const k = win(s, 0.85, 1.2, 2.86, 3.05) * 0.17 + win(s, 4.1, 4.3, 4.9, 5.05) * 0.07 - cityK * 0.02;
    let sy = window.innerHeight * 0.13;
    if (closeK > 0) {
      camera.updateMatrixWorld(true);
      const y0 = (1 - kA.copy(EARTH_C).project(camera).y) * 0.5 * window.innerHeight + (shiftY || 0);
      sy = mix(sy, y0 - globeY, closeK);
    }
    setShift(Math.round(window.innerWidth * k), Math.round(sy));
  }
  camera.updateMatrixWorld(true);
  scene.updateMatrixWorld(true);

  // Keep the land dots at least ~2px on screen however far the camera pulls back.
  landMat.size = Math.max(0.062, (2.2 * camera.position.distanceTo(EARTH_C) * 0.3443) / (0.5 * window.innerHeight));

  /* DOM */
  for (let i = 0; i < panels.length; i++) {
    const o = panelOpacity(i, s);
    const p = panels[i];
    p.style.opacity = o.toFixed(3);
    p.style.visibility = o > 0.01 ? 'visible' : 'hidden';
  }
  placeTiles(s, st);
  if (openCo && PIN === null) {
    const gone = openVia === 'list' ? panelOpacity(6, s) < 0.5 : !openCo.el.classList.contains('live');
    if (gone) closeCards();
  }
  const idx = clamp(Math.floor(s), 0, 6);
  const shownIdx = clamp(idx, 0, 5);
  const num = String(shownIdx).padStart(2, '0');
  if (stageNum.textContent !== num) stageNum.textContent = num;
  const label = STAGES[idx].label;
  if (stageName.textContent !== label) stageName.textContent = label;
  railTicks.forEach((t, i) => t.classList.toggle('on', i === idx - 1));
}

let shiftX = NaN;
let shiftY = NaN;
function setShift(x, y) {
  if (x === shiftX && y === shiftY) return;
  shiftX = x;
  shiftY = y;
  camera.setViewOffset(window.innerWidth, window.innerHeight, x, y, window.innerWidth, window.innerHeight);
}

function resize() {
  const W = window.innerWidth;
  const H = window.innerHeight;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(W, H, false);
  camera.aspect = W / H;
  shiftX = NaN;
  setShift(isDesktop() ? Math.round(-W * 0.13) : 0, isDesktop() ? 0 : Math.round(H * 0.13));
  camera.updateProjectionMatrix();
  layoutScroll();
  measure();
  sTarget = scrollToStage();
}

window.addEventListener('resize', resize);
window.addEventListener('scroll', () => { sTarget = scrollToStage(); }, { passive: true });

function frame(now) {
  const dt = clamp((now - lastT) / 1000, 0, 0.05);
  lastT = now;
  time += dt;
  const k = reducedMotion ? 1 : 1 - Math.exp(-dt * 6.5);
  sCur += (sTarget - sCur) * k;
  if (Math.abs(sTarget - sCur) < 0.0002) sCur = sTarget;
  px += (pxT - px) * 0.05;
  py += (pyT - py) * 0.05;
  update(sCur, dt);
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}

resize();
window.addEventListener('load', measure);
if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure);
sCur = sTarget;
requestAnimationFrame(frame);
