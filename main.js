import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

/* ---------------- names & wish ---------------- */
function cleanName(raw) {
  if (!raw) return '';
  let s = raw;
  try { s = decodeURIComponent(raw); } catch {}
  s = s.replace(/[-_+]+/g, ' ').replace(/[<>{}"]/g, '').trim().slice(0, 18);
  return s.replace(/(^|\s)(\p{Ll})/gu, (m, a, b) => a + b.toUpperCase());
}
const params = new URLSearchParams(location.search);
const pathSeg = location.pathname.split('/').filter(Boolean)[0];
const toName = cleanName(params.get('to') || (pathSeg && !pathSeg.includes('.') ? pathSeg : '')) || 'You';
const fromName = cleanName(params.get('from') || '');

const WISHES = [
  'Some light for your year.',
  'May every dark corner of this year find its diya.',
  'For the nights that felt long — here is some light.',
  'Wishing you a year that glows a little warmer.',
  'One small flame, passed on to you.',
];
let h = 0;
for (const ch of toName) h = (h * 31 + ch.codePointAt(0)) >>> 0;
const wish = WISHES[h % WISHES.length];

const $ = (id) => document.getElementById(id);
$('introName').textContent = toName;
$('wishLine').textContent = wish;
$('fromLine').textContent = fromName ? `— with love, ${fromName}` : '';
document.title = toName === 'You' ? 'A Little Light' : `A Little Light for ${toName}`;

/* ---------------- renderer / scene ---------------- */
const canvas = $('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
const DPR = Math.min(window.devicePixelRatio, 2);
renderer.setPixelRatio(DPR);
renderer.setSize(innerWidth, innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x05040a);
scene.fog = new THREE.Fog(0x05040a, 6, 34);

const camera = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.05, 200);
const CAM_START = new THREE.Vector3();
const LOOK_START = new THREE.Vector3(0, 0.26, 0.2);
const portrait = () => innerWidth / innerHeight < 0.85;
function setStartCam() {
  if (portrait()) CAM_START.set(0, 1.05, 3.3); else CAM_START.set(0, 0.9, 2.45);
}
setStartCam();
const CAM_END = new THREE.Vector3(0, 2.6, 13.5);
const LOOK_END = new THREE.Vector3(0, 3.4, 0);
const look = LOOK_START.clone();
camera.position.copy(CAM_START);
camera.lookAt(look);

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.95, 0.6, 0.55);
composer.addPass(bloom);
composer.addPass(new OutputPass());

const hemi = new THREE.HemisphereLight(0x4a4270, 0x120808, 0.9);
scene.add(hemi);
const key = new THREE.SpotLight(0xffe6cc, 34, 0, 0.55, 0.85, 2);
key.position.set(-0.6, 3.4, 2.4);
key.target.position.set(0.25, 0, 0.35);
scene.add(key, key.target);
const rim = new THREE.PointLight(0xff9a50, 1.2, 0, 2);
rim.position.set(0.4, 0.9, -1.2);
scene.add(rim);
const moon = new THREE.DirectionalLight(0x6a6fb0, 0.25);
moon.position.set(-4, 6, -3);
scene.add(moon);

// ground
const ground = new THREE.Mesh(
  new THREE.CircleGeometry(60, 64),
  new THREE.MeshStandardMaterial({ color: 0x120c10, roughness: 0.95, metalness: 0 })
);
ground.rotation.x = -Math.PI / 2;
scene.add(ground);

// stars
{
  const n = 900, pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const th = Math.random() * Math.PI * 2, ph = Math.random() * Math.PI * 0.42;
    const r = 80;
    pos[i * 3] = r * Math.sin(ph) * Math.cos(th);
    pos[i * 3 + 1] = r * Math.cos(ph) + 2;
    pos[i * 3 + 2] = r * Math.sin(ph) * Math.sin(th) - 20;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  scene.add(new THREE.Points(g, new THREE.PointsMaterial({
    color: 0xbfb8ff, size: 0.18, sizeAttenuation: true, fog: false, transparent: true, opacity: 0.55,
  })));
}

/* ---------------- diya ---------------- */
const diyaProfile = [
  [0.0, 0.0], [0.16, 0.0], [0.2, 0.025], [0.3, 0.085], [0.38, 0.165], [0.42, 0.205],
  [0.425, 0.225], [0.405, 0.23], [0.36, 0.19], [0.27, 0.13], [0.0, 0.115],
].map(([x, y]) => new THREE.Vector2(x, y));
const diyaGeo = new THREE.LatheGeometry(diyaProfile, 48);
diyaGeo.computeVertexNormals();
const oilGeo = new THREE.CircleGeometry(0.32, 40).rotateX(-Math.PI / 2).translate(0, 0.155, 0);
const wickGeo = new THREE.CylinderGeometry(0.012, 0.018, 0.09, 8).translate(0, 0.045, 0);
const flameGeo = new THREE.PlaneGeometry(0.17, 0.36).translate(0, 0.17, 0);
const glowGeo = new THREE.PlaneGeometry(2.4, 2.4).rotateX(-Math.PI / 2);
const oilMat = new THREE.MeshStandardMaterial({ color: 0x3a2205, roughness: 0.15, metalness: 0.6 });
const wickMat = new THREE.MeshStandardMaterial({ color: 0x1a1210, roughness: 1 });

const flameVert = /* glsl */`
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
`;
const flameFrag = /* glsl */`
  uniform float uTime; uniform float uIntensity; uniform float uSeed;
  varying vec2 vUv;
  void main() {
    vec2 p = vUv * 2.0 - 1.0;
    float t = uTime * 7.0 + uSeed;
    float y01 = vUv.y;
    p.x += sin(p.y * 3.2 + t) * 0.07 * y01 + sin(t * 1.7) * 0.03 * y01;
    float w = 0.5 * (1.0 - smoothstep(-0.75, 1.0, p.y)) + 0.025;
    float core = 1.0 - smoothstep(0.0, 1.0, abs(p.x) / w);
    float vert = smoothstep(-1.0, -0.62, p.y) * (1.0 - smoothstep(0.2 + 0.1 * sin(t * 0.8), 1.0, p.y));
    float f = core * vert;
    vec3 col = mix(vec3(1.0, 0.28, 0.03), vec3(1.0, 0.72, 0.32), pow(f, 1.4));
    col = mix(col, vec3(1.0, 0.9, 0.65), smoothstep(0.8, 1.0, f));
    col = mix(col, vec3(0.25, 0.35, 1.0), smoothstep(-0.55, -0.9, p.y) * 0.7 * core);
    float halo = exp(-length(p * vec2(1.3, 0.9) + vec2(0.0, 0.25)) * 3.2) * 0.35;
    float a = (f + halo) * uIntensity;
    gl_FragColor = vec4(col * a * 1.35, a);
  }
`;
const glowFrag = /* glsl */`
  uniform float uIntensity;
  varying vec2 vUv;
  void main() {
    float d = length(vUv - 0.5) * 2.0;
    float a = pow(max(0.0, 1.0 - d), 2.4) * uIntensity;
    gl_FragColor = vec4(vec3(1.0, 0.5, 0.15) * a * 0.55, a);
  }
`;

const flameMat = (seed) => new THREE.ShaderMaterial({
  uniforms: { uTime: { value: 0 }, uIntensity: { value: 0 }, uSeed: { value: seed } },
  vertexShader: flameVert, fragmentShader: flameFrag,
  transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false,
});
const glowMat = () => new THREE.ShaderMaterial({
  uniforms: { uIntensity: { value: 0 } },
  vertexShader: flameVert, fragmentShader: glowFrag,
  transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
});

const diyas = [];
function makeDiya(x, z, s, hueJitter) {
  const g = new THREE.Group();
  const clay = new THREE.MeshStandardMaterial({
    color: new THREE.Color().setHSL(0.045 + hueJitter * 0.02, 0.62, 0.36 + hueJitter * 0.05),
    roughness: 0.78,
  });
  g.add(new THREE.Mesh(diyaGeo, clay));
  g.add(new THREE.Mesh(oilGeo, oilMat));
  const wick = new THREE.Mesh(wickGeo, wickMat);
  wick.position.set(0, 0.14, 0);
  wick.rotation.z = 0.25;
  g.add(wick);
  const flame = new THREE.Mesh(flameGeo, flameMat(Math.random() * 100));
  flame.position.set(0.02, 0.215, 0);
  flame.renderOrder = 2;
  g.add(flame);
  const glow = new THREE.Mesh(glowGeo, glowMat());
  glow.position.y = 0.004;
  glow.renderOrder = 1;
  g.add(glow);
  g.position.set(x, 0, z);
  g.scale.setScalar(s);
  scene.add(g);
  const d = { group: g, flame, glow, intensity: 0, at: 0, chimed: false, seed: Math.random() * 10 };
  diyas.push(d);
  return d;
}

const hero = makeDiya(0, 0, 1, 0);
// field of diyas, in loose rings (rangoli-ish), lit outward
const rings = [
  { r: 1.25, n: 7 }, { r: 2.2, n: 11 }, { r: 3.3, n: 15 }, { r: 4.6, n: 19 }, { r: 6.1, n: 22 }, { r: 7.8, n: 24 },
];
rings.forEach(({ r, n }, ri) => {
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + ri * 0.37 + (Math.random() - 0.5) * 0.12;
    const rr = r + (Math.random() - 0.5) * 0.35;
    const px = Math.cos(a) * rr, pz = Math.sin(a) * rr - 1.5;
    if (pz > -0.6 && Math.abs(px) < 2.8) continue;
    if (pz > 1.2) continue;
    const d = makeDiya(px, pz, 0.75 + Math.random() * 0.25, Math.random() - 0.5);
    // light order: outward from hero, swirling a little
    const dist = Math.hypot(d.group.position.x, d.group.position.z);
    d.at = 1.4 + dist * 0.42 + ((a % (Math.PI * 2)) / (Math.PI * 2)) * 0.6 + Math.random() * 0.15;
  }
});

const heroLight = new THREE.PointLight(0xff9a3c, 0, 0, 2);
heroLight.position.set(0.02, 0.42, 0);
scene.add(heroLight);
// a few helper lights that follow the wave of lit diyas
const helpers = [2, 9, 20, 28, 45, 70].map((i) => {
  const d = diyas[Math.min(i, diyas.length - 1)];
  const l = new THREE.PointLight(0xff8a2a, 0, 0, 2);
  l.position.copy(d.group.position).setY(0.6);
  scene.add(l);
  return { l, d };
});

/* ---------------- floating lanterns -> name ---------------- */
const particleVert = /* glsl */`
  attribute vec3 aStart; attribute vec3 aTarget; attribute float aDelay; attribute float aRand;
  uniform float uT; uniform float uScale; uniform float uTime;
  varying float vAlpha; varying float vRand;
  float easeInOut(float x) { return x < 0.5 ? 4.0*x*x*x : 1.0 - pow(-2.0*x + 2.0, 3.0) / 2.0; }
  void main() {
    float k = clamp((uT - aDelay) / 3.6, 0.0, 1.0);
    float e = easeInOut(k);
    vec3 p = mix(aStart, aTarget, e);
    p.y += sin(k * 3.14159) * (1.5 + aRand * 2.0);
    p.x += sin(k * 6.28 + aRand * 20.0) * 0.4 * (1.0 - e);
    p.z += cos(k * 5.0 + aRand * 13.0) * 0.4 * (1.0 - e);
    // settled shimmer
    p += vec3(sin(uTime * 1.3 + aRand * 40.0), cos(uTime * 1.1 + aRand * 30.0), 0.0) * 0.02 * e;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    float size = mix(0.16, 0.085, e) * (0.8 + aRand * 0.5);
    gl_PointSize = size * uScale / -mv.z;
    vAlpha = smoothstep(0.0, 0.08, k) * (0.75 + 0.25 * sin(uTime * 3.0 + aRand * 50.0));
    vRand = aRand;
  }
`;
const particleFrag = /* glsl */`
  varying float vAlpha; varying float vRand;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float a = smoothstep(0.5, 0.0, d);
    float core = smoothstep(0.18, 0.0, d);
    vec3 col = mix(vec3(1.0, 0.45, 0.1), vec3(1.0, 0.92, 0.7), core);
    col = mix(col, vec3(1.0, 0.3, 0.45), step(0.93, vRand) * 0.6);
    gl_FragColor = vec4(col * a * vAlpha * 1.6, a * vAlpha);
  }
`;
const pScale = () => (innerHeight * DPR) / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)));

let nameParticles = null;
let nameBottomY = 4.2;
async function buildNameParticles() {
  try { await document.fonts.load('italic 600 200px "Cormorant Garamond"'); } catch {}
  const cw = 1400, ch = 360;
  const cv = document.createElement('canvas');
  cv.width = cw; cv.height = ch;
  const ctx = cv.getContext('2d');
  let fs = 260;
  const font = (s) => `italic 600 ${s}px "Cormorant Garamond", "Noto Serif Devanagari", "Noto Serif Tamil", serif`;
  ctx.font = font(fs);
  const mw = ctx.measureText(toName).width;
  if (mw > cw * 0.9) { fs = Math.floor(fs * (cw * 0.9) / mw); ctx.font = font(fs); }
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(toName, cw / 2, ch / 2);
  const data = ctx.getImageData(0, 0, cw, ch).data;
  let pts = [];
  for (let y = 0; y < ch; y += 4) for (let x = 0; x < cw; x += 4) if (data[(y * cw + x) * 4 + 3] > 140) pts.push([x, y]);
  const MAX = 3200;
  if (pts.length > MAX) {
    for (let i = pts.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [pts[i], pts[j]] = [pts[j], pts[i]]; }
    pts = pts.slice(0, MAX);
  }
  // visible width at the name plane
  const dist = CAM_END.z - (-1.5);
  const visH = 2 * dist * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
  const visW = visH * camera.aspect;
  const textW = Math.min(11, visW * 0.86);
  const textScale = textW / (cw * 0.9);
  nameBottomY = 5.3 - fs * 0.62 * textScale;
  const n = pts.length;
  const start = new Float32Array(n * 3), target = new Float32Array(n * 3), delay = new Float32Array(n), rand = new Float32Array(n);
  const lit = diyas.slice(1);
  for (let i = 0; i < n; i++) {
    const [x, y] = pts[i];
    const d = lit[(Math.random() * lit.length) | 0].group.position;
    start.set([d.x, 0.35, d.z], i * 3);
    target.set([(x - cw / 2) * textScale, 5.3 - (y - ch / 2) * textScale, -1.5 + (Math.random() - 0.5) * 0.2], i * 3);
    delay[i] = Math.random() * 2.2 + (x / cw) * 0.8;
    rand[i] = Math.random();
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(target, 3));
  g.setAttribute('aStart', new THREE.BufferAttribute(start, 3));
  g.setAttribute('aTarget', new THREE.BufferAttribute(target, 3));
  g.setAttribute('aDelay', new THREE.BufferAttribute(delay, 1));
  g.setAttribute('aRand', new THREE.BufferAttribute(rand, 1));
  const m = new THREE.ShaderMaterial({
    uniforms: { uT: { value: -10 }, uScale: { value: pScale() }, uTime: { value: 0 } },
    vertexShader: particleVert, fragmentShader: particleFrag,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  });
  nameParticles = new THREE.Points(g, m);
  nameParticles.frustumCulled = false;
  scene.add(nameParticles);
}
buildNameParticles();

// drifting embers
const emberMat = new THREE.ShaderMaterial({
  uniforms: { uTime: { value: 0 }, uAlpha: { value: 0 }, uScale: { value: pScale() } },
  vertexShader: /* glsl */`
    attribute float aRand; uniform float uTime; uniform float uScale; varying float vA; uniform float uAlpha;
    void main() {
      float life = fract(uTime * (0.04 + aRand * 0.05) + aRand * 7.0);
      vec3 p = position;
      p.y += life * 9.0;
      p.x += sin(uTime * 0.6 + aRand * 30.0) * 0.6 * life;
      vec4 mv = modelViewMatrix * vec4(p, 1.0);
      gl_Position = projectionMatrix * mv;
      gl_PointSize = (0.05 + aRand * 0.05) * uScale / -mv.z;
      vA = sin(life * 3.14159) * uAlpha;
    }`,
  fragmentShader: /* glsl */`
    varying float vA;
    void main() { float d = length(gl_PointCoord - 0.5); float a = smoothstep(0.5, 0.0, d) * vA;
      gl_FragColor = vec4(vec3(1.0, 0.6, 0.25) * a * 1.4, a); }`,
  transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
});
{
  const n = 260, pos = new Float32Array(n * 3), r = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2, d = 1 + Math.random() * 8;
    pos.set([Math.cos(a) * d, 0.3, Math.sin(a) * d - 1.5], i * 3);
    r[i] = Math.random();
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('aRand', new THREE.BufferAttribute(r, 1));
  const pts = new THREE.Points(g, emberMat);
  pts.frustumCulled = false;
  scene.add(pts);
}

/* ---------------- matchbox + matchstick ---------------- */
function makeCanvasTex(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  const redraw = () => { draw(c.getContext('2d'), w, h); tex.needsUpdate = true; };
  redraw();
  return { tex, redraw };
}
const striker = makeCanvasTex(512, 128, (x, w, h) => {
  x.fillStyle = '#2e1c14'; x.fillRect(0, 0, w, h);
  for (let i = 0; i < 9000; i++) {
    const v = (30 + Math.random() * 70) | 0;
    x.fillStyle = `rgb(${v + 25},${v + 8},${v - 5})`;
    x.fillRect(Math.random() * w, Math.random() * h, 1.6, 1.6);
  }
  // a few scratch marks from earlier strikes
  x.strokeStyle = 'rgba(15,8,5,.6)'; x.lineWidth = 2;
  for (let i = 0; i < 7; i++) { const y = 20 + Math.random() * 90; x.beginPath(); x.moveTo(60 + Math.random() * 150, y); x.lineTo(260 + Math.random() * 200, y + (Math.random() - 0.5) * 12); x.stroke(); }
});
const label = makeCanvasTex(512, 380, (x, w, h) => {
  x.fillStyle = '#7d1525'; x.fillRect(0, 0, w, h);
  x.strokeStyle = '#e9b860'; x.lineWidth = 6; x.strokeRect(18, 18, w - 36, h - 36);
  x.lineWidth = 2; x.strokeRect(32, 32, w - 64, h - 64);
  x.fillStyle = '#e9b860';
  // little diya mark
  x.beginPath(); x.ellipse(w / 2, h * 0.47, 78, 30, 0, 0, Math.PI); x.fill();
  x.fillRect(w / 2 - 82, h * 0.47 - 4, 164, 6);
  x.beginPath(); x.moveTo(w / 2, h * 0.15);
  x.quadraticCurveTo(w / 2 + 34, h * 0.33, w / 2, h * 0.43);
  x.quadraticCurveTo(w / 2 - 34, h * 0.33, w / 2, h * 0.15); x.fill();
  x.textAlign = 'center';
  x.font = 'italic 600 58px "Cormorant Garamond", Georgia, serif';
  x.fillText('Deepam', w / 2, h * 0.74);
  x.font = '600 17px Manrope, sans-serif';
  x.fillText('S A F E T Y    M A T C H E S', w / 2, h * 0.86);
});
document.fonts?.ready.then(() => label.redraw());

const BOX = { w: 0.44, h: 0.12, d: 0.3 };
const boxSide = new THREE.MeshStandardMaterial({ color: 0x6a1220, roughness: 0.7 });
const strikerMat = new THREE.MeshStandardMaterial({ map: striker.tex, roughness: 1 });
const labelMat = new THREE.MeshStandardMaterial({ map: label.tex, roughness: 0.55 });
const matchbox = new THREE.Mesh(
  new THREE.BoxGeometry(BOX.w, BOX.h, BOX.d),
  [boxSide, boxSide, labelMat, boxSide, strikerMat, strikerMat]
);
// a peek of the inner tray with spare matches
{
  const tray = new THREE.Mesh(new THREE.BoxGeometry(0.16, BOX.h * 0.9, BOX.d * 0.94),
    new THREE.MeshStandardMaterial({ color: 0xcfa874, roughness: 0.9 }));
  tray.position.set(-BOX.w / 2 - 0.06, -0.002, 0);
  matchbox.add(tray);
  const headMat = new THREE.MeshStandardMaterial({ color: 0x7a1410, roughness: 0.6 });
  for (let i = 0; i < 5; i++) {
    const h = new THREE.Mesh(new THREE.SphereGeometry(0.02, 10, 8).scale(1.4, 1, 1), headMat);
    h.position.set(-BOX.w / 2 - 0.11, BOX.h * 0.42, -0.1 + i * 0.05);
    matchbox.add(h);
  }
}
matchbox.rotation.y = -0.2;
scene.add(matchbox);

const match = new THREE.Group();
{
  const stick = new THREE.Mesh(
    new THREE.BoxGeometry(0.4, 0.022, 0.022).translate(0.22, 0, 0),
    new THREE.MeshStandardMaterial({ color: 0xd9b07a, roughness: 0.85 })
  );
  const headMat = new THREE.MeshStandardMaterial({ color: 0x7a1410, roughness: 0.6 });
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.026, 16, 12).scale(1.5, 1.05, 1.05), headMat);
  match.add(stick, head);
  match.userData.head = head;
  match.userData.headMat = headMat;
}
const matchFlame = new THREE.Mesh(flameGeo, flameMat(3.3));
matchFlame.renderOrder = 3;
matchFlame.scale.setScalar(0.6);
matchFlame.rotation.order = 'ZYX';
matchFlame.position.y = -0.015;
match.add(matchFlame);
const matchLight = new THREE.PointLight(0xff8a30, 0, 0, 2);
matchLight.position.y = 0.06;
match.add(matchLight);
scene.add(match);

const WICK = new THREE.Vector3(0.04, 0.24, 0);
const boxFront = new THREE.Vector3();
const strikerCorners = [];
const matchRest = new THREE.Vector3();
const M_HIDDEN = new THREE.Vector3(1.6, 1.1, 0.9);
function layoutBox() {
  if (portrait()) matchbox.position.set(0.05, BOX.h / 2, 0.95);
  else matchbox.position.set(0.62, BOX.h / 2, 0.72);
  matchbox.updateMatrixWorld();
  boxFront.set(0, 0, BOX.d / 2);
  matchbox.localToWorld(boxFront);
  strikerCorners.length = 0;
  for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
    strikerCorners.push(matchbox.localToWorld(new THREE.Vector3(sx * BOX.w / 2, sy * BOX.h / 2, BOX.d / 2)));
  }
  matchRest.set(-0.14, BOX.h / 2 + 0.014, 0.05);
  matchbox.localToWorld(matchRest);
}
layoutBox();
match.position.copy(matchRest);
match.rotation.y = matchbox.rotation.y;
let matchState = 'rest', matchT = 0, matchFire = 0, matchLit = false;

// sparks on strike
const SPARKS = 70;
const sparkPos = new Float32Array(SPARKS * 3), sparkCol = new Float32Array(SPARKS * 3);
const sparkVel = Array.from({ length: SPARKS }, () => new THREE.Vector3());
const sparkLife = new Float32Array(SPARKS);
const sparkGeo = new THREE.BufferGeometry();
sparkGeo.setAttribute('position', new THREE.BufferAttribute(sparkPos, 3));
sparkGeo.setAttribute('color', new THREE.BufferAttribute(sparkCol, 3));
const dotTex = (() => {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const x = c.getContext('2d'), g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, '#fff'); g.addColorStop(0.3, 'rgba(255,255,255,.6)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g; x.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
})();
const sparks = new THREE.Points(sparkGeo, new THREE.PointsMaterial({
  size: 0.035, map: dotTex, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
}));
sparks.frustumCulled = false;
scene.add(sparks);
const headWorld = new THREE.Vector3();
function burstSparks(n = SPARKS) {
  match.userData.head.getWorldPosition(headWorld);
  for (let i = 0; i < n; i++) {
    sparkPos.set([headWorld.x, headWorld.y, headWorld.z], i * 3);
    sparkVel[i].set((Math.random() - 0.3) * 1.6, Math.random() * 1.4 + 0.2, (Math.random() - 0.5) * 1.2);
    sparkLife[i] = 0.35 + Math.random() * 0.55;
  }
}
function updateSparks(dt) {
  for (let i = 0; i < SPARKS; i++) {
    if (sparkLife[i] <= 0) { sparkCol.set([0, 0, 0], i * 3); continue; }
    sparkLife[i] -= dt;
    sparkVel[i].y -= 3.2 * dt;
    sparkVel[i].multiplyScalar(0.97);
    sparkPos[i * 3] += sparkVel[i].x * dt;
    sparkPos[i * 3 + 1] += sparkVel[i].y * dt;
    sparkPos[i * 3 + 2] += sparkVel[i].z * dt;
    const k = Math.max(0, sparkLife[i]) * 1.6;
    sparkCol.set([1.6 * k, 0.75 * k, 0.25 * k], i * 3);
  }
  sparkGeo.attributes.position.needsUpdate = true;
  sparkGeo.attributes.color.needsUpdate = true;
}

/* ---------------- sound (tiny, synthesized) ---------------- */
let actx = null;
const audio = () => {
  if (!actx) { try { actx = new (window.AudioContext || window.webkitAudioContext)(); } catch { actx = null; } }
  if (actx && actx.state === 'suspended') actx.resume();
  return actx;
};
function whoosh() {
  const a = audio(); if (!a) return;
  const len = a.sampleRate * 1.3, buf = a.createBuffer(1, len, a.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.2);
  const src = a.createBufferSource(); src.buffer = buf;
  const f = a.createBiquadFilter(); f.type = 'lowpass';
  const t = a.currentTime;
  f.frequency.setValueAtTime(300, t);
  f.frequency.exponentialRampToValueAtTime(2200, t + 0.12);
  f.frequency.exponentialRampToValueAtTime(180, t + 1.2);
  const g = a.createGain(); g.gain.value = 0.45;
  src.connect(f).connect(g).connect(a.destination);
  src.start();
}
function strike() {
  const a = audio(); if (!a) return;
  const len = a.sampleRate * 0.6, buf = a.createBuffer(1, len, a.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) {
    const x = i / len;
    const scratch = x < 0.12 ? 1 : Math.pow(1 - x, 3) * 0.5;
    d[i] = (Math.random() * 2 - 1) * scratch * (Math.random() < 0.02 ? 2.5 : 1);
  }
  const src = a.createBufferSource(); src.buffer = buf;
  const f = a.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 2600; f.Q.value = 0.7;
  const g = a.createGain(); g.gain.value = 0.55;
  src.connect(f).connect(g).connect(a.destination);
  src.start();
}
function scratch() {
  const a = audio(); if (!a) return;
  const len = (a.sampleRate * 0.09) | 0, buf = a.createBuffer(1, len, a.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.sin((i / len) * Math.PI);
  const src = a.createBufferSource(); src.buffer = buf;
  const f = a.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1800 + Math.random() * 1200; f.Q.value = 1.2;
  const g = a.createGain(); g.gain.value = 0.25;
  src.connect(f).connect(g).connect(a.destination);
  src.start();
}
function tone(freq, when, gain = 0.05, dur = 2.4) {
  const a = audio(); if (!a) return;
  const t = a.currentTime + when;
  const o = a.createOscillator(); o.type = 'sine'; o.frequency.value = freq;
  const o2 = a.createOscillator(); o2.type = 'sine'; o2.frequency.value = freq * 2.01;
  const g = a.createGain(); const g2 = a.createGain(); g2.gain.value = 0.25;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); o2.connect(g2).connect(g); g.connect(a.destination);
  o.start(t); o2.start(t); o.stop(t + dur); o2.stop(t + dur);
}
const PENTA = [261.63, 293.66, 329.63, 392.0, 440.0, 523.25, 587.33, 659.25, 783.99];
function chord() { [392, 523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone(f, i * 0.16, 0.045, 3.5)); }

/* ---------------- interaction ---------------- */
let phase = 'idle', litAt = 0, wishShown = false;
let dragging = false, strokeAcc = 0, catchP = 0, lastHead = null, scratchCooldown = 0;
const pointerPx = { x: 0, y: 0 };
const matchTarget = new THREE.Vector3();
const raycaster = new THREE.Raycaster();
const ndc = new THREE.Vector2();
const dragPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
const tmpS = new THREE.Vector3();
const hint = $('hint');
const setHint = (txt) => { if (hint.textContent !== txt) { hint.classList.add('swap'); setTimeout(() => { hint.textContent = txt; hint.classList.remove('swap'); }, 250); } };

function toScreen(v) {
  tmpS.copy(v).project(camera);
  return { x: (tmpS.x + 1) / 2 * innerWidth, y: (1 - tmpS.y) / 2 * innerHeight };
}
const pxScale = () => Math.min(innerWidth, innerHeight) / 800;

function pointerToMatchTarget() {
  // hold the stick a little behind the head, so the finger doesn't cover the flame
  const k = pxScale();
  const hx = pointerPx.x - 70 * k, hy = pointerPx.y - 36 * k;
  const boxS = toScreen(boxFront), wickS = toScreen(WICK);
  const s = clamp01((boxS.y - hy) / Math.max(1, boxS.y - wickS.y));
  const z = THREE.MathUtils.lerp(boxFront.z + 0.05, WICK.z + 0.06, s);
  dragPlane.constant = -z;
  ndc.set((hx / innerWidth) * 2 - 1, -(hy / innerHeight) * 2 + 1);
  raycaster.setFromCamera(ndc, camera);
  raycaster.ray.intersectPlane(dragPlane, matchTarget);
  matchTarget.y = Math.max(matchTarget.y, 0.05);
}

function strikerRect() {
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  for (const c of strikerCorners) {
    const p = toScreen(c);
    x0 = Math.min(x0, p.x); x1 = Math.max(x1, p.x); y0 = Math.min(y0, p.y); y1 = Math.max(y1, p.y);
  }
  const pad = 22 * pxScale();
  return { x0: x0 - pad, x1: x1 + pad, y0: y0 - pad, y1: y1 + pad };
}

function lightMatch() {
  matchLit = true; matchT = 0;
  match.userData.headMat.color.set(0x2a0d08);
  burstSparks();
  strike();
  navigator.vibrate?.(15);
  setHint('now bring the flame to the diya');
}

addEventListener('pointerdown', (e) => {
  if (phase !== 'idle' || matchState === 'leaving') return;
  if (e.target.closest && e.target.closest('dialog, button, a')) return;
  audio();
  dragging = true;
  matchState = 'held';
  pointerPx.x = e.clientX; pointerPx.y = e.clientY;
  lastHead = null;
  document.body.classList.add('grabbing');
  if (!matchLit) setHint('swipe it across the side of the box');
});
addEventListener('pointermove', (e) => { pointerPx.x = e.clientX; pointerPx.y = e.clientY; });
const drop = () => {
  if (!dragging) return;
  dragging = false;
  document.body.classList.remove('grabbing');
  if (!matchLit && phase === 'idle') { matchState = 'rest'; strokeAcc = 0; setHint('pick up the match'); }
};
addEventListener('pointerup', drop);
addEventListener('pointercancel', drop);
// keyboard: light it for you
addEventListener('keydown', (e) => {
  if (phase !== 'idle' || (e.code !== 'Space' && e.code !== 'Enter')) return;
  if (document.querySelector('dialog[open]')) return;
  audio();
  if (!matchLit) lightMatch();
  matchState = 'auto';
});

const clock = new THREE.Clock();
function ignite() {
  phase = 'lit';
  litAt = clock.elapsedTime;
  dragging = false;
  document.body.classList.remove('grabbing');
  $('intro').classList.add('gone');
  $('holdWrap').classList.add('gone');
  matchState = 'leaving'; matchT = 0;
  leaveFrom.copy(match.position);
  navigator.vibrate?.(25);
  whoosh();
}
const leaveFrom = new THREE.Vector3();

// mouse parallax
const mouse = new THREE.Vector2();
addEventListener('pointermove', (e) => {
  mouse.set((e.clientX / innerWidth) * 2 - 1, (e.clientY / innerHeight) * 2 - 1);
});

/* ---------------- loop ---------------- */
const clamp01 = (x) => Math.min(1, Math.max(0, x));
const easeOut = (x) => 1 - Math.pow(1 - x, 3);
const easeInOut = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
const camPos = new THREE.Vector3();
const par = new THREE.Vector3();
const tmpV = new THREE.Vector3();
const wishEl = $('wish');

function frame() {
  const dt = Math.min(clock.getDelta(), 0.05);
  const t = clock.elapsedTime;

  if (phase === 'idle') {
    match.userData.head.getWorldPosition(headWorld);
    const hs = toScreen(headWorld);
    // striking: rub the head across the striker strip
    if (!matchLit && matchState === 'held') {
      const r = strikerRect();
      const inside = hs.x > r.x0 && hs.x < r.x1 && hs.y > r.y0 && hs.y < r.y1;
      if (inside && lastHead) {
        const dx = Math.abs(hs.x - lastHead.x);
        if (dx > 1.5) {
          strokeAcc += dx;
          scratchCooldown -= dt;
          if (Math.random() < 0.35) burstSparks(5);
          if (scratchCooldown <= 0) { scratch(); scratchCooldown = 0.12; }
        }
        if (strokeAcc > 110 * pxScale()) lightMatch();
      } else strokeAcc = Math.max(0, strokeAcc - dt * 60);
      lastHead = hs;
    }
    // the wick catches when the lit match lingers on it
    if (matchLit) {
      const ws = toScreen(WICK);
      const near = Math.hypot(hs.x - ws.x, hs.y - ws.y) < 46 * pxScale();
      catchP = near ? catchP + dt / 0.7 : Math.max(0, catchP - dt * 0.8);
    }
    hero.intensity = catchP > 0 ? catchP * 0.5 * (0.5 + 0.5 * Math.random()) : 0;
    if (catchP >= 1) ignite();
  } else {
    const e = t - litAt;
    hero.intensity = 0.45 + 0.55 * easeOut(clamp01(e / 0.9));
    for (let i = 1; i < diyas.length; i++) {
      const d = diyas[i];
      d.intensity = easeOut(clamp01((e - d.at) / 0.7));
      if (!d.chimed && e > d.at) {
        d.chimed = true;
        if (i % 5 === 0) tone(PENTA[(Math.random() * PENTA.length) | 0] * 2, 0, 0.012, 1.4);
      }
    }
    const cp = easeInOut(clamp01((e - 0.9) / 8.5));
    key.intensity = 34 * (1 - 0.75 * easeOut(clamp01(e / 4)));
    rim.intensity = 1.2 * (1 - clamp01(e / 3));
    camPos.lerpVectors(CAM_START, CAM_END, cp);
    look.lerpVectors(LOOK_START, LOOK_END, cp);
    emberMat.uniforms.uAlpha.value = clamp01((e - 3) / 3);
    if (nameParticles) nameParticles.material.uniforms.uT.value = e - 6.8;
    if (!wishShown && e > 11.8) {
      wishShown = true;
      $('wish').classList.add('show');
      chord();
    }
  }

  if (phase === 'idle') { camPos.copy(CAM_START); }
  // gentle drift (+ parallax once the diya is lit, so dragging stays steady)
  const pk = phase === 'idle' ? 0 : 1;
  par.set(mouse.x * 0.35 * pk + Math.sin(t * 0.25) * 0.05, -mouse.y * 0.18 * pk + Math.sin(t * 0.3) * 0.03, 0);
  camera.position.copy(camPos).add(par);
  camera.lookAt(look);

  // matchstick
  matchT += dt;
  const follow = (target, rate) => match.position.lerp(target, 1 - Math.exp(-dt * rate));
  const turn = (rz, ry, rate) => {
    const k = 1 - Math.exp(-dt * rate);
    match.rotation.z += (rz - match.rotation.z) * k;
    match.rotation.y += (ry - match.rotation.y) * k;
  };
  if (matchState === 'rest') {
    follow(matchRest, 10);
    turn(0, matchbox.rotation.y, 10);
  } else if (matchState === 'held') {
    if (dragging) pointerToMatchTarget();
    const before = match.position.x;
    follow(matchTarget, 20);
    const vx = (match.position.x - before) / Math.max(dt, 1e-3);
    turn(0.55 - THREE.MathUtils.clamp(vx * 0.08, -0.3, 0.3), 0, 12);
  } else if (matchState === 'auto') {
    matchTarget.copy(WICK).add(tmpV.set(0.05, 0.02, 0.06));
    follow(matchTarget, 3);
    turn(0.5, 0, 6);
  } else if (matchState === 'leaving') {
    const k = easeInOut(clamp01((matchT - 0.15) / 1.1));
    match.position.lerpVectors(leaveFrom, M_HIDDEN, k);
    match.position.x += Math.sin(matchT * 40) * 0.025 * Math.max(0, 1 - matchT / 0.5);
    match.rotation.z = 0.5 + k * 0.6;
    if (matchT > 1.4) { matchState = 'gone'; match.visible = false; }
  }
  if (matchLit) {
    matchFire = matchState === 'leaving'
      ? Math.max(0, 1 - matchT / 0.45) // shaken out
      : matchT < 0.3 ? 1.8 - matchT * 2.6 : 1.0; // flare, then settle
  }
  if (phase === 'lit') {
    // tuck the matchbox away
    matchbox.position.y += (-0.6 - matchbox.position.y) * (1 - Math.exp(-dt * 1.2));
  }
  const mFlick = 0.85 + 0.15 * Math.sin(t * 17) * Math.sin(t * 9.3);
  matchFlame.material.uniforms.uTime.value = t;
  matchFlame.material.uniforms.uIntensity.value = matchFire * mFlick;
  matchLight.intensity = matchFire * 1.4 * mFlick;
  match.getWorldPosition(headWorld);
  matchFlame.rotation.y = Math.atan2(camera.position.x - headWorld.x, camera.position.z - headWorld.z);
  matchFlame.rotation.z = -match.rotation.z; // keep the flame pointing up
  updateSparks(dt);

  // place the wish just under the name in the sky
  if (wishShown) {
    tmpV.set(0, nameBottomY - 0.35, -1.5).project(camera);
    const y = (1 - tmpV.y) * 0.5 * innerHeight;
    wishEl.style.setProperty('--wish-top', `${Math.round(Math.min(y, innerHeight - 260))}px`);
  }

  for (const d of diyas) {
    const flick = 0.9 + 0.1 * Math.sin(t * 13 + d.seed) * Math.sin(t * 7.3 + d.seed * 2);
    d.flame.material.uniforms.uTime.value = t;
    d.flame.material.uniforms.uIntensity.value = d.intensity * flick;
    d.glow.material.uniforms.uIntensity.value = d.intensity * flick;
    const wp = d.group.position;
    d.flame.rotation.y = Math.atan2(camera.position.x - wp.x, camera.position.z - wp.z);
  }
  const heroFlick = 0.88 + 0.12 * Math.sin(t * 11) * Math.sin(t * 6.1);
  heroLight.intensity = hero.intensity * 2.6 * heroFlick;
  for (const { l, d } of helpers) l.intensity = d.intensity * 5 * heroFlick;
  emberMat.uniforms.uTime.value = t;
  if (nameParticles) nameParticles.material.uniforms.uTime.value = t;

  composer.render();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  composer.setSize(innerWidth, innerHeight);
  bloom.setSize(innerWidth, innerHeight);
  if (phase === 'idle') { setStartCam(); camPos.copy(CAM_START); camera.position.copy(CAM_START); camera.lookAt(look); layoutBox(); }
  const s = pScale();
  emberMat.uniforms.uScale.value = s;
  if (nameParticles) nameParticles.material.uniforms.uScale.value = s;
});

/* ---------------- share flow ---------------- */
const maker = $('maker');
$('makeBtn').addEventListener('click', () => { maker.showModal(); $('toInput').focus(); });
$('replayBtn').addEventListener('click', () => location.reload());
const slug = (s) => encodeURIComponent(s.trim().replace(/\s+/g, '-'));
$('createBtn').addEventListener('click', () => {
  const to = $('toInput').value.trim();
  if (!to) { $('toInput').focus(); return; }
  const from = $('fromInput').value.trim();
  const url = `${location.origin}/${slug(to)}${from ? `?from=${slug(from)}` : ''}`;
  $('linkOut').textContent = url;
  $('linkBox').hidden = false;
  const text = `I lit a diya for you, ${to} 🪔`;
  $('waBtn').href = `https://wa.me/?text=${encodeURIComponent(`${text}\n${url}`)}`;
  if (navigator.share) {
    $('shareBtn').hidden = false;
    $('shareBtn').onclick = () => navigator.share({ title: 'A little light', text, url }).catch(() => {});
  }
  $('copyBtn').onclick = async () => {
    try { await navigator.clipboard.writeText(url); $('copyBtn').textContent = 'Copied ✓'; } catch { $('copyBtn').textContent = 'Select & copy'; }
    setTimeout(() => ($('copyBtn').textContent = 'Copy'), 1800);
  };
});
