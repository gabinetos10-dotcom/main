/* ============================================================
   The code specimen — real 3D, printed.

   A slowly turning form built from ~1,400 glyphs of living code,
   posterized to exactly two spot inks and dithered at the edges
   so it reads as a riso plate that impossibly moves. The canvas
   itself is multiplied into the paper (CSS mix-blend-mode), so
   the specimen overprints the sheet like everything else.

   It morphs with scroll between the three technical services:
   a code block → an automation route → a data lattice.

   Perf: lazy-initialized after the loader hands off, DPR capped,
   paused when offscreen, and never started at all under
   prefers-reduced-motion or on low-power devices (the halftone
   poster fallback stays instead).
   ============================================================ */

import * as THREE from 'three';
import { hexToRgb } from '../core/inks.js';

const COUNT = 1400;
const GLYPHS = '{}[]<>/\\=+*#$%&;:.·01∎▚▞○◆'.split('');
const ATLAS_GRID = 6; // 6x6 cells

function makeGlyphAtlas() {
  const cell = 64;
  const cv = document.createElement('canvas');
  cv.width = cv.height = cell * ATLAS_GRID;
  const g = cv.getContext('2d');
  g.fillStyle = '#000';
  g.fillRect(0, 0, cv.width, cv.height);
  g.fillStyle = '#fff';
  g.font = `700 ${cell * 0.72}px "Spline Sans Mono", monospace`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  for (let i = 0; i < ATLAS_GRID * ATLAS_GRID; i++) {
    const ch = GLYPHS[i % GLYPHS.length];
    const x = (i % ATLAS_GRID + 0.5) * cell;
    const y = (Math.floor(i / ATLAS_GRID) + 0.5) * cell;
    g.fillText(ch, x, y);
  }
  const tex = new THREE.CanvasTexture(cv);
  tex.minFilter = THREE.LinearFilter;
  return tex;
}

/* ---- the three formations -------------------------------- */
function formationCode() {
  // a slab of set type: ragged-right rows on two z planes
  const pts = new Float32Array(COUNT * 3);
  const rows = 26, maxCols = 30;
  let i = 0;
  outer: for (let r = 0; r < rows * 2; r++) {
    const row = r % rows;
    const len = 6 + Math.floor(Math.random() * (maxCols - 6));
    const indent = Math.random() < 0.4 ? Math.floor(Math.random() * 4) : 0;
    for (let c = indent; c < len; c++) {
      if (i >= COUNT) break outer;
      pts[i * 3] = (c - maxCols / 2) * 0.42;
      pts[i * 3 + 1] = (rows / 2 - row) * 0.52;
      pts[i * 3 + 2] = (r >= rows ? -1.4 : 1.4) + (Math.random() - 0.5) * 0.3;
      i++;
    }
  }
  for (; i < COUNT; i++) { // spare glyphs drift as loose type
    pts[i * 3] = (Math.random() - 0.5) * 16;
    pts[i * 3 + 1] = (Math.random() - 0.5) * 16;
    pts[i * 3 + 2] = (Math.random() - 0.5) * 6;
  }
  return pts;
}

function formationRoute() {
  // an automation circuit: nodes joined by flowing edges
  const pts = new Float32Array(COUNT * 3);
  const nodes = [];
  const N = 8;
  for (let n = 0; n < N; n++) {
    const a = (n / N) * Math.PI * 2;
    nodes.push([
      Math.cos(a) * (5 + Math.sin(n * 2.7) * 1.6),
      Math.sin(a) * (4 + Math.cos(n * 1.9) * 1.4),
      Math.sin(n * 2.1) * 2.2,
    ]);
  }
  for (let i = 0; i < COUNT; i++) {
    if (i % 5 === 0) { // cluster at a node
      const nd = nodes[i % N];
      pts[i * 3] = nd[0] + (Math.random() - 0.5) * 1.1;
      pts[i * 3 + 1] = nd[1] + (Math.random() - 0.5) * 1.1;
      pts[i * 3 + 2] = nd[2] + (Math.random() - 0.5) * 1.1;
    } else { // along an edge
      const a = nodes[i % N];
      const b = nodes[(i + 1) % N];
      const t = Math.random();
      pts[i * 3] = a[0] + (b[0] - a[0]) * t + (Math.random() - 0.5) * 0.35;
      pts[i * 3 + 1] = a[1] + (b[1] - a[1]) * t + (Math.random() - 0.5) * 0.35;
      pts[i * 3 + 2] = a[2] + (b[2] - a[2]) * t + (Math.random() - 0.5) * 0.35;
    }
  }
  return pts;
}

function formationLattice() {
  // a data lattice: fibonacci sphere with an inner shell
  const pts = new Float32Array(COUNT * 3);
  const phi = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < COUNT; i++) {
    const shellR = i % 4 === 0 ? 4.2 : 6.4;
    const y = 1 - (i / (COUNT - 1)) * 2;
    const rad = Math.sqrt(1 - y * y);
    const th = phi * i;
    pts[i * 3] = Math.cos(th) * rad * shellR;
    pts[i * 3 + 1] = y * shellR;
    pts[i * 3 + 2] = Math.sin(th) * rad * shellR;
  }
  return pts;
}

const VERT = /* glsl */ `
  attribute vec3 posA;
  attribute vec3 posB;
  attribute vec3 posC;
  attribute float glyph;
  attribute float inkSel;
  attribute float seed;
  uniform float uMorph;   // 0 → code, 1 → route, 2 → lattice
  uniform float uTime;
  uniform float uSize;
  varying float vGlyph;
  varying float vInk;
  varying float vSeed;

  void main() {
    float m1 = smoothstep(0.0, 1.0, clamp(uMorph, 0.0, 1.0));
    float m2 = smoothstep(0.0, 1.0, clamp(uMorph - 1.0, 0.0, 1.0));
    vec3 p = mix(mix(posA, posB, m1), posC, m2);
    // living ink: a slow breathing drift per glyph
    p += 0.10 * vec3(
      sin(uTime * 0.6 + seed * 17.0),
      cos(uTime * 0.5 + seed * 23.0),
      sin(uTime * 0.7 + seed * 31.0));
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_PointSize = uSize * (340.0 / -mv.z);
    gl_Position = projectionMatrix * mv;
    vGlyph = glyph;
    vInk = inkSel;
    vSeed = seed;
  }
`;

const FRAG = /* glsl */ `
  uniform sampler2D uAtlas;
  uniform vec3 uInkA;
  uniform vec3 uInkB;
  uniform float uTime;
  varying float vGlyph;
  varying float vInk;
  varying float vSeed;

  // 4x4 Bayer matrix — the dither that makes edges print, not fade
  float bayer(vec2 p) {
    int x = int(mod(p.x, 4.0));
    int y = int(mod(p.y, 4.0));
    int i = x + y * 4;
    float m[16];
    m[0]=0.0;  m[1]=8.0;  m[2]=2.0;  m[3]=10.0;
    m[4]=12.0; m[5]=4.0;  m[6]=14.0; m[7]=6.0;
    m[8]=3.0;  m[9]=11.0; m[10]=1.0; m[11]=9.0;
    m[12]=15.0;m[13]=7.0; m[14]=13.0;m[15]=5.0;
    for (int k = 0; k < 16; k++) { if (k == i) return m[k] / 16.0; }
    return 0.0;
  }

  void main() {
    float grid = ${ATLAS_GRID}.0;
    vec2 cell = vec2(mod(vGlyph, grid), floor(vGlyph / grid));
    vec2 uv = (cell + gl_PointCoord) / grid;
    float a = texture2D(uAtlas, uv).r;

    // the glyph "reprints" — ink coverage pulses per glyph
    float pulse = 0.65 + 0.35 * sin(uTime * 1.4 + vSeed * 43.0);
    a *= pulse;

    // posterize to solid ink through an ordered dither
    if (a < bayer(gl_FragCoord.xy) + 0.18) discard;
    vec3 ink = vInk > 0.5 ? uInkB : uInkA;
    gl_FragColor = vec4(ink, 1.0);
  }
`;

export function initSpecimen({ container, scrollDriver, inks }) {
  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: false, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
  renderer.setClearColor(0x000000, 0);
  container.appendChild(renderer.domElement);
  renderer.domElement.style.mixBlendMode = 'multiply'; // overprint into the paper

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
  camera.position.z = 20;

  const geo = new THREE.BufferGeometry();
  const a = formationCode(), b = formationRoute(), c = formationLattice();
  geo.setAttribute('position', new THREE.BufferAttribute(a, 3)); // for bounding sphere
  geo.setAttribute('posA', new THREE.BufferAttribute(a, 3));
  geo.setAttribute('posB', new THREE.BufferAttribute(b, 3));
  geo.setAttribute('posC', new THREE.BufferAttribute(c, 3));
  const glyph = new Float32Array(COUNT);
  const inkSel = new Float32Array(COUNT);
  const seed = new Float32Array(COUNT);
  for (let i = 0; i < COUNT; i++) {
    glyph[i] = Math.floor(Math.random() * ATLAS_GRID * ATLAS_GRID);
    inkSel[i] = Math.random() < 0.5 ? 0 : 1;
    seed[i] = Math.random();
  }
  geo.setAttribute('glyph', new THREE.BufferAttribute(glyph, 1));
  geo.setAttribute('inkSel', new THREE.BufferAttribute(inkSel, 1));
  geo.setAttribute('seed', new THREE.BufferAttribute(seed, 1));

  const toVec = (hex) => new THREE.Vector3(...hexToRgb(hex).map((v) => v / 255));
  const mat = new THREE.ShaderMaterial({
    vertexShader: VERT,
    fragmentShader: FRAG,
    transparent: false,
    uniforms: {
      uAtlas: { value: makeGlyphAtlas() },
      uInkA: { value: toVec(inks.a) },
      uInkB: { value: toVec(inks.b) },
      uMorph: { value: 0 },
      uTime: { value: 0 },
      uSize: { value: 1.05 },
    },
  });

  const points = new THREE.Points(geo, mat);
  scene.add(points);

  /* ---- pointer & device-orientation parallax ---- */
  let px = 0, py = 0;
  addEventListener('pointermove', (e) => {
    px = (e.clientX / innerWidth - 0.5) * 2;
    py = (e.clientY / innerHeight - 0.5) * 2;
  }, { passive: true });
  addEventListener('deviceorientation', (e) => {
    if (e.gamma == null) return;
    px = Math.max(-1, Math.min(1, e.gamma / 30));
    py = Math.max(-1, Math.min(1, (e.beta - 40) / 30));
  }, { passive: true });

  /* ---- size / visibility ---- */
  function resize() {
    const w = container.clientWidth || 1;
    const h = container.clientHeight || 1;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  resize();
  new ResizeObserver(resize).observe(container);

  let visible = true;
  new IntersectionObserver(([en]) => { visible = en.isIntersecting; }, { threshold: 0 })
    .observe(container);

  /* ---- render loop ---- */
  let morphTarget = 0;
  scrollDriver((p) => { morphTarget = p * 2; }); // 0..1 → 0..2

  const clock = new THREE.Clock();
  let raf;
  function loop() {
    raf = requestAnimationFrame(loop);
    if (!visible || document.hidden) return;
    const t = clock.getElapsedTime();
    mat.uniforms.uTime.value = t;
    mat.uniforms.uMorph.value += (morphTarget - mat.uniforms.uMorph.value) * 0.06;
    points.rotation.y = t * 0.12 + px * 0.5;
    points.rotation.x = py * 0.3 + Math.sin(t * 0.2) * 0.06;
    renderer.render(scene, camera);
  }
  loop();

  /* ---- re-ink when the session inks change (mixer/misprint) ---- */
  function setInks(hexA, hexB) {
    mat.uniforms.uInkA.value = toVec(hexA);
    mat.uniforms.uInkB.value = toVec(hexB);
  }

  container.closest('.cover-specimen')?.classList.add('is-live');

  return {
    setInks,
    destroy() {
      cancelAnimationFrame(raf);
      renderer.dispose();
      geo.dispose();
      mat.dispose();
    },
  };
}
