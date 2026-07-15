/* ═══════════════════════════════════════════════════════════
   HERO CENTERPIECE — "The Code Core"
   A breathing, iridescent prism orbited by a galaxy of glowing
   code glyphs. Pointer-reactive, scroll-reactive, tilt-reactive.
   Procedural only (no model files). Fallbacks:
   - prefers-reduced-motion / no WebGL → static gradient poster.
   - Offscreen or hidden tab → rendering pauses.
   ═══════════════════════════════════════════════════════════ */

import * as THREE from 'three';

const BRAND = {
  gold: new THREE.Color('#ffc243'),
  apricot: new THREE.Color('#eb6a29'),
  raspberry: new THREE.Color('#9b2d84'),
  cloud: new THREE.Color('#a0c3eb'),
  indigo: new THREE.Color('#324ea1'),
  blush: new THREE.Color('#f0bed9'),
};

const GLYPHS = '{}<>=/;*+GJS01()=>&#'.split('');

/* Canvas atlas of code glyphs → point-sprite texture */
function makeGlyphAtlas() {
  const grid = 5; // 5×4 glyph cells
  const rows = 4;
  const cell = 96;
  const cv = document.createElement('canvas');
  cv.width = grid * cell;
  cv.height = rows * cell;
  const ctx = cv.getContext('2d');
  ctx.font = `700 ${cell * 0.68}px 'JetBrains Mono', monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#fff';
  GLYPHS.forEach((g, i) => {
    const cx = (i % grid) * cell + cell / 2;
    const cy = Math.floor(i / grid) * cell + cell / 2;
    ctx.fillText(g, cx, cy);
  });
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  return { tex, grid, rows };
}

/* Soft radial glow sprite (the "sun behind the machine") */
function makeGlowTexture() {
  const cv = document.createElement('canvas');
  cv.width = cv.height = 256;
  const ctx = cv.getContext('2d');
  const g = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
  g.addColorStop(0, 'rgba(255,194,67,0.55)');
  g.addColorStop(0.35, 'rgba(235,106,41,0.25)');
  g.addColorStop(0.7, 'rgba(155,45,132,0.10)');
  g.addColorStop(1, 'rgba(155,45,132,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 256);
  return new THREE.CanvasTexture(cv);
}

/* ── Core shader: iridescent fresnel + gentle organic breathing ── */
const coreVertex = /* glsl */ `
  uniform float uTime;
  uniform float uDream;
  varying vec3 vNormal;
  varying vec3 vView;
  varying float vWave;

  void main() {
    // Cheap layered-sine "noise" — organic breathing without a noise lib
    float w = sin(position.x * 3.1 + uTime * 0.8)
            * sin(position.y * 2.7 + uTime * 0.6)
            * sin(position.z * 3.7 + uTime * 0.7);
    vWave = w;
    vec3 displaced = position + normal * w * (0.06 + uDream * 0.12);
    vec4 mv = modelViewMatrix * vec4(displaced, 1.0);
    vNormal = normalize(normalMatrix * normal);
    vView = normalize(-mv.xyz);
    gl_Position = projectionMatrix * mv;
  }
`;

const coreFragment = /* glsl */ `
  uniform float uTime;
  uniform float uScroll;
  uniform float uDream;
  uniform vec3 uColA; // indigo depth
  uniform vec3 uColB; // raspberry mid
  uniform vec3 uColC; // gold rim
  uniform vec3 uColD; // cloud sheen
  varying vec3 vNormal;
  varying vec3 vView;
  varying float vWave;

  void main() {
    float fresnel = pow(1.0 - max(dot(vNormal, vView), 0.0), 2.0);

    // Prismatic band that sweeps with time + scroll → "chromatic dispersion"
    float band = sin(vNormal.y * 6.0 + uTime * (0.6 + uDream * 2.0) + uScroll * 4.0) * 0.5 + 0.5;

    vec3 base = mix(uColA, uColB, band);
    vec3 rim  = mix(uColC, uColD, sin(uTime * 0.5 + vWave * 4.0) * 0.5 + 0.5);
    vec3 col  = mix(base * 0.55, rim, fresnel);

    // inner glow veins from the displacement wave
    col += uColC * smoothstep(0.55, 0.9, abs(vWave)) * 0.35;

    float alpha = 0.9;
    gl_FragColor = vec4(col, alpha);
  }
`;

/* ── Glyph particle shader ── */
const glyphVertex = /* glsl */ `
  uniform float uTime;
  uniform float uScroll;
  uniform float uDream;
  uniform float uPixelRatio;
  attribute float aSeed;
  attribute float aGlyph;
  attribute vec3 aColor;
  varying vec3 vColor;
  varying float vGlyph;
  varying float vTwinkle;

  void main() {
    vGlyph = aGlyph;
    vColor = aColor;

    vec3 p = position;
    // slow orbital drift, unique per particle
    float t = uTime * (0.12 + aSeed * 0.08) * (1.0 + uDream * 2.5);
    float c = cos(t), s = sin(t);
    p.xz = mat2(c, -s, s, c) * p.xz;
    p.y += sin(uTime * 0.6 + aSeed * 12.0) * 0.08;

    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    vTwinkle = 0.55 + 0.45 * sin(uTime * (1.2 + aSeed) + aSeed * 40.0);
    gl_PointSize = (14.0 + aSeed * 26.0) * uPixelRatio * (1.0 / -mv.z);
    gl_PointSize *= 3.2 + uScroll * 1.5;
    gl_Position = projectionMatrix * mv;
  }
`;

const glyphFragment = /* glsl */ `
  uniform sampler2D uAtlas;
  uniform float uGrid;
  uniform float uRows;
  varying vec3 vColor;
  varying float vGlyph;
  varying float vTwinkle;

  void main() {
    float col = mod(vGlyph, uGrid);
    float row = floor(vGlyph / uGrid);
    vec2 uv = (vec2(col, row) + gl_PointCoord) / vec2(uGrid, uRows);
    // atlas rows are top-down; flip Y inside the cell
    uv.y = 1.0 - uv.y;
    float a = texture2D(uAtlas, uv).r;
    if (a < 0.15) discard;
    gl_FragColor = vec4(vColor * (0.8 + vTwinkle), a * vTwinkle);
  }
`;

export function initHero() {
  const canvas = document.getElementById('hero-canvas');
  const hero = document.getElementById('hero');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const fallback = () => {
    hero.classList.add('no-webgl');
    canvas.remove();
    return { ready: Promise.resolve(), setDream() {}, pulse() {} };
  };

  if (reduced) return fallback();

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  } catch {
    return fallback();
  }

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 50);
  camera.position.set(0, 0, 5);

  const uniforms = {
    uTime: { value: 0 },
    uScroll: { value: 0 },
    uDream: { value: 0 },
  };

  /* Core prism */
  const core = new THREE.Mesh(
    new THREE.IcosahedronGeometry(1.15, 24),
    new THREE.ShaderMaterial({
      vertexShader: coreVertex,
      fragmentShader: coreFragment,
      transparent: true,
      uniforms: {
        ...uniforms,
        uColA: { value: BRAND.indigo },
        uColB: { value: BRAND.raspberry },
        uColC: { value: BRAND.gold },
        uColD: { value: BRAND.cloud },
      },
    })
  );
  scene.add(core);

  /* Wireframe halo — the "engineering" skeleton around the dream */
  const wire = new THREE.Mesh(
    new THREE.IcosahedronGeometry(1.55, 1),
    new THREE.MeshBasicMaterial({ color: BRAND.cloud, wireframe: true, transparent: true, opacity: 0.14 })
  );
  scene.add(wire);

  /* Glyph galaxy */
  const COUNT = 420;
  const positions = new Float32Array(COUNT * 3);
  const seeds = new Float32Array(COUNT);
  const glyphIdx = new Float32Array(COUNT);
  const colors = new Float32Array(COUNT * 3);
  const palette = [BRAND.gold, BRAND.apricot, BRAND.raspberry, BRAND.cloud, BRAND.blush];
  for (let i = 0; i < COUNT; i++) {
    // shell distribution between two radii — a loose galaxy, denser at equator
    const r = 1.9 + Math.random() * 1.6;
    const theta = Math.random() * Math.PI * 2;
    const y = (Math.random() - 0.5) * (Math.random() < 0.7 ? 1.4 : 3.2);
    positions[i * 3] = Math.cos(theta) * r;
    positions[i * 3 + 1] = y;
    positions[i * 3 + 2] = Math.sin(theta) * r;
    seeds[i] = Math.random();
    glyphIdx[i] = Math.floor(Math.random() * GLYPHS.length);
    const c = palette[Math.floor(Math.random() * palette.length)];
    colors[i * 3] = c.r; colors[i * 3 + 1] = c.g; colors[i * 3 + 2] = c.b;
  }
  const glyphGeo = new THREE.BufferGeometry();
  glyphGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  glyphGeo.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1));
  glyphGeo.setAttribute('aGlyph', new THREE.BufferAttribute(glyphIdx, 1));
  glyphGeo.setAttribute('aColor', new THREE.BufferAttribute(colors, 3));
  const atlas = makeGlyphAtlas();
  const glyphs = new THREE.Points(
    glyphGeo,
    new THREE.ShaderMaterial({
      vertexShader: glyphVertex,
      fragmentShader: glyphFragment,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        ...uniforms,
        uAtlas: { value: atlas.tex },
        uGrid: { value: atlas.grid },
        uRows: { value: atlas.rows },
        uPixelRatio: { value: 1 },
      },
    })
  );
  scene.add(glyphs);

  /* Warm glow backdrop */
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({
    map: makeGlowTexture(),
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  }));
  glow.scale.setScalar(7);
  glow.position.z = -1.5;
  scene.add(glow);

  const group = new THREE.Group();
  group.add(core, wire, glyphs, glow);
  scene.add(group);

  /* ── Sizing / DPR budget ── */
  const resize = () => {
    const w = hero.clientWidth;
    const h = hero.clientHeight;
    const dpr = Math.min(devicePixelRatio || 1, 1.75);
    renderer.setPixelRatio(dpr);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    glyphs.material.uniforms.uPixelRatio.value = dpr;
    // desktop: push the core right of the copy; mobile: center it behind
    group.position.x = w > 820 ? 1.5 : 0;
    group.position.y = w > 820 ? 0 : 0.6;
    group.scale.setScalar(w > 820 ? 1 : 0.78);
  };
  resize();
  window.addEventListener('resize', resize);

  /* ── Input: pointer parallax + device tilt ── */
  const target = { x: 0, y: 0 };
  window.addEventListener('pointermove', (e) => {
    target.x = (e.clientX / innerWidth - 0.5) * 2;
    target.y = (e.clientY / innerHeight - 0.5) * 2;
  }, { passive: true });
  window.addEventListener('deviceorientation', (e) => {
    if (e.gamma == null) return;
    target.x = THREE.MathUtils.clamp(e.gamma / 30, -1, 1);
    target.y = THREE.MathUtils.clamp((e.beta - 45) / 30, -1, 1);
  }, { passive: true });

  /* Scroll progress across the hero (0 → 1) */
  const onScroll = () => {
    const h = hero.offsetHeight || 1;
    uniforms.uScroll.value = THREE.MathUtils.clamp(window.scrollY / h, 0, 1);
  };
  window.addEventListener('scroll', onScroll, { passive: true });

  /* ── Render loop: paused offscreen & on hidden tab ── */
  let visible = true;
  let running = false;
  let pulseUntil = 0;
  const clock = new THREE.Clock();

  const frame = () => {
    if (!visible || document.hidden) { running = false; return; }
    const t = clock.getElapsedTime();
    uniforms.uTime.value = t;

    // ease camera toward pointer — dreamy, never snappy
    camera.position.x += (target.x * 0.45 - camera.position.x) * 0.04;
    camera.position.y += (-target.y * 0.35 - camera.position.y) * 0.04;
    camera.lookAt(group.position);

    const dream = uniforms.uDream.value;
    const spin = 0.05 + uniforms.uScroll.value * 0.35 + dream * 0.6;
    core.rotation.y = t * spin * 2.0;
    core.rotation.x = Math.sin(t * 0.2) * 0.3;
    wire.rotation.y = -t * 0.06;
    wire.rotation.z = t * 0.04;
    group.position.z = -uniforms.uScroll.value * 1.2; // recede as you scroll away

    if (performance.now() < pulseUntil) {
      core.scale.setScalar(1 + Math.sin(performance.now() * 0.02) * 0.06);
    } else {
      core.scale.lerp(new THREE.Vector3(1, 1, 1), 0.1);
    }

    renderer.render(scene, camera);
    requestAnimationFrame(frame);
  };
  const start = () => { if (!running) { running = true; requestAnimationFrame(frame); } };

  new IntersectionObserver(([e]) => {
    visible = e.isIntersecting;
    if (visible) start();
  }, { threshold: 0.02 }).observe(hero);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) start(); });

  // First frame before the loader lifts → no white flash under the curtain.
  const ready = new Promise((res) => {
    requestAnimationFrame(() => { renderer.render(scene, camera); start(); res(); });
  });

  return {
    ready,
    /* Dream mode dial: 0 = calm studio, 1 = hyperspace */
    setDream(v) { uniforms.uDream.value = v; },
    /* Short celebratory wobble (logo egg, form success…) */
    pulse(ms = 1200) { pulseUntil = performance.now() + ms; },
  };
}
