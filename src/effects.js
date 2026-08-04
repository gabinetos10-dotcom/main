import * as THREE from '../vendor/three.module.js';
import { rand, clamp } from './utils.js';

const MAX_PARTICLES = 4000;
const MAX_TRACERS = 64;
const MAX_DECALS = 90;
const MAX_POPUPS = 28;

const particleVS = `
  attribute float size;
  attribute float alpha;
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    vColor = color;
    vAlpha = alpha;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = size * (300.0 / max(0.001, -mv.z));
    gl_Position = projectionMatrix * mv;
  }
`;

const particleFS = `
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    vec2 d = gl_PointCoord - vec2(0.5);
    float r = dot(d, d);
    if (r > 0.25) discard;
    float soft = smoothstep(0.25, 0.02, r);
    gl_FragColor = vec4(vColor, vAlpha * soft);
  }
`;

export class Effects {
  constructor(scene, camera, popupLayer) {
    this.scene = scene;
    this.camera = camera;
    this.popupLayer = popupLayer;
    this.shake = 0;
    this.shakeVec = new THREE.Vector3();

    // --- Particules ---
    this.pPos = new Float32Array(MAX_PARTICLES * 3);
    this.pCol = new Float32Array(MAX_PARTICLES * 3);
    this.pSize = new Float32Array(MAX_PARTICLES);
    this.pAlpha = new Float32Array(MAX_PARTICLES);
    this.pVel = new Float32Array(MAX_PARTICLES * 3);
    this.pLife = new Float32Array(MAX_PARTICLES);
    this.pMaxLife = new Float32Array(MAX_PARTICLES);
    this.pGrav = new Float32Array(MAX_PARTICLES);
    this.pDrag = new Float32Array(MAX_PARTICLES);
    this.pCount = 0;

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(this.pPos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(this.pCol, 3));
    geo.setAttribute('size', new THREE.BufferAttribute(this.pSize, 1));
    geo.setAttribute('alpha', new THREE.BufferAttribute(this.pAlpha, 1));
    geo.setDrawRange(0, 0);
    this.pGeo = geo;

    this.points = new THREE.Points(geo, new THREE.ShaderMaterial({
      vertexShader: particleVS,
      fragmentShader: particleFS,
      transparent: true,
      depthWrite: false,
      vertexColors: true,
      blending: THREE.NormalBlending,
    }));
    this.points.frustumCulled = false;
    scene.add(this.points);

    // --- Traçantes ---
    this.tracerPos = new Float32Array(MAX_TRACERS * 6);
    this.tracerCol = new Float32Array(MAX_TRACERS * 6);
    this.tracerLife = new Float32Array(MAX_TRACERS);
    this.tracerIdx = 0;
    const tGeo = new THREE.BufferGeometry();
    tGeo.setAttribute('position', new THREE.BufferAttribute(this.tracerPos, 3));
    tGeo.setAttribute('color', new THREE.BufferAttribute(this.tracerCol, 3));
    this.tracerGeo = tGeo;
    this.tracers = new THREE.LineSegments(tGeo, new THREE.LineBasicMaterial({
      vertexColors: true, transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending,
    }));
    this.tracers.frustumCulled = false;
    scene.add(this.tracers);

    // --- Impacts au sol / sur les murs ---
    this.decals = [];
    this.decalIdx = 0;
    const decalGeo = new THREE.PlaneGeometry(1, 1);
    for (let i = 0; i < MAX_DECALS; i++) {
      const m = new THREE.Mesh(decalGeo, new THREE.MeshBasicMaterial({
        color: 0x000000, transparent: true, opacity: 0, depthWrite: false,
        polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4,
      }));
      m.visible = false;
      m.renderOrder = 2;
      scene.add(m);
      this.decals.push({ mesh: m, life: 0, maxLife: 1 });
    }

    // --- Chiffres de dégâts (DOM) ---
    this.popups = [];
    if (popupLayer) {
      for (let i = 0; i < MAX_POPUPS; i++) {
        const el = document.createElement('div');
        el.className = 'dmg-popup';
        el.style.display = 'none';
        popupLayer.appendChild(el);
        this.popups.push({ el, life: 0, maxLife: 1, pos: new THREE.Vector3(), vel: new THREE.Vector3() });
      }
    }
    this.popupIdx = 0;
    this._v = new THREE.Vector3();
  }

  emit(x, y, z, opts) {
    if (this.pCount >= MAX_PARTICLES) return;
    const i = this.pCount++;
    const i3 = i * 3;
    this.pPos[i3] = x; this.pPos[i3 + 1] = y; this.pPos[i3 + 2] = z;
    this.pVel[i3] = opts.vx; this.pVel[i3 + 1] = opts.vy; this.pVel[i3 + 2] = opts.vz;
    const c = opts.color;
    this.pCol[i3] = c.r; this.pCol[i3 + 1] = c.g; this.pCol[i3 + 2] = c.b;
    this.pSize[i] = opts.size;
    this.pAlpha[i] = 1;
    this.pLife[i] = opts.life;
    this.pMaxLife[i] = opts.life;
    this.pGrav[i] = opts.gravity ?? 18;
    this.pDrag[i] = opts.drag ?? 1.2;
  }

  _kill(i) {
    const last = --this.pCount;
    if (i !== last) {
      const i3 = i * 3, l3 = last * 3;
      for (let k = 0; k < 3; k++) {
        this.pPos[i3 + k] = this.pPos[l3 + k];
        this.pVel[i3 + k] = this.pVel[l3 + k];
        this.pCol[i3 + k] = this.pCol[l3 + k];
      }
      this.pSize[i] = this.pSize[last];
      this.pAlpha[i] = this.pAlpha[last];
      this.pLife[i] = this.pLife[last];
      this.pMaxLife[i] = this.pMaxLife[last];
      this.pGrav[i] = this.pGrav[last];
      this.pDrag[i] = this.pDrag[last];
    }
  }

  blood(pos, dir, amount = 14, color = 0x9b1b1b) {
    const c = new THREE.Color(color);
    for (let i = 0; i < amount; i++) {
      const spread = 3.2;
      this.emit(pos.x, pos.y, pos.z, {
        vx: dir.x * rand(1, 5) + rand(-spread, spread),
        vy: rand(0.5, 4.5),
        vz: dir.z * rand(1, 5) + rand(-spread, spread),
        color: c.clone().multiplyScalar(rand(0.65, 1.15)),
        size: rand(0.045, 0.14),
        life: rand(0.5, 1.2),
        gravity: 20,
      });
    }
  }

  sparks(pos, normal, amount = 8, color = 0xffc46b) {
    const c = new THREE.Color(color);
    for (let i = 0; i < amount; i++) {
      this.emit(pos.x, pos.y, pos.z, {
        vx: normal.x * rand(1, 4) + rand(-2.4, 2.4),
        vy: normal.y * rand(1, 4) + rand(0, 2.6),
        vz: normal.z * rand(1, 4) + rand(-2.4, 2.4),
        color: c.clone().multiplyScalar(rand(0.7, 1.3)),
        size: rand(0.02, 0.06),
        life: rand(0.15, 0.45),
        gravity: 14,
      });
    }
  }

  smoke(pos, amount = 10, color = 0x555555, spread = 1) {
    const c = new THREE.Color(color);
    for (let i = 0; i < amount; i++) {
      this.emit(pos.x, pos.y, pos.z, {
        vx: rand(-spread, spread), vy: rand(0.4, 2.2), vz: rand(-spread, spread),
        color: c.clone().multiplyScalar(rand(0.7, 1.2)),
        size: rand(0.25, 0.7),
        life: rand(0.8, 1.8),
        gravity: -1.4,
        drag: 2.2,
      });
    }
  }

  explosion(pos, radius = 4) {
    const hot = new THREE.Color(0xffd27a);
    const fire = new THREE.Color(0xff5a1f);
    for (let i = 0; i < 90; i++) {
      const a = Math.random() * Math.PI * 2;
      const e = rand(-0.3, 1);
      const s = rand(5, 17) * (radius / 4);
      this.emit(pos.x, pos.y, pos.z, {
        vx: Math.cos(a) * s, vy: e * s * 0.7, vz: Math.sin(a) * s,
        color: (Math.random() < 0.5 ? hot : fire).clone().multiplyScalar(rand(0.7, 1.2)),
        size: rand(0.1, 0.4),
        life: rand(0.3, 0.9),
        gravity: 8,
        drag: 2.6,
      });
    }
    this.smoke(pos, 26, 0x2c2c2c, 2.5);
    this.decal(pos, new THREE.Vector3(0, 1, 0), 0x141414, radius * 1.3, 22);
    this.addShake(0.9);
  }

  tracer(from, to, color = 0xfff2b0) {
    const i = this.tracerIdx = (this.tracerIdx + 1) % MAX_TRACERS;
    const i6 = i * 6;
    this.tracerPos[i6] = from.x; this.tracerPos[i6 + 1] = from.y; this.tracerPos[i6 + 2] = from.z;
    this.tracerPos[i6 + 3] = to.x; this.tracerPos[i6 + 4] = to.y; this.tracerPos[i6 + 5] = to.z;
    const c = new THREE.Color(color);
    for (let k = 0; k < 2; k++) {
      this.tracerCol[i6 + k * 3] = c.r;
      this.tracerCol[i6 + k * 3 + 1] = c.g;
      this.tracerCol[i6 + k * 3 + 2] = c.b;
    }
    this.tracerLife[i] = 0.06;
    this.tracerGeo.attributes.position.needsUpdate = true;
    this.tracerGeo.attributes.color.needsUpdate = true;
  }

  decal(pos, normal, color = 0x3a0a0a, size = 1, life = 26) {
    const d = this.decals[this.decalIdx];
    this.decalIdx = (this.decalIdx + 1) % this.decals.length;
    d.mesh.visible = true;
    d.mesh.position.copy(pos).addScaledVector(normal, 0.02);
    if (Math.abs(normal.y) > 0.9) {
      d.mesh.rotation.set(-Math.PI / 2, 0, Math.random() * Math.PI * 2);
    } else {
      d.mesh.lookAt(pos.clone().add(normal));
      d.mesh.rotateZ(Math.random() * Math.PI * 2);
    }
    const s = size * rand(0.8, 1.25);
    d.mesh.scale.set(s, s, s);
    d.mesh.material.color.setHex(color);
    d.mesh.material.opacity = 0.85;
    d.life = life;
    d.maxLife = life;
  }

  damageNumber(worldPos, value, kind = 'normal') {
    if (!this.popups.length) return;
    const p = this.popups[this.popupIdx];
    this.popupIdx = (this.popupIdx + 1) % this.popups.length;
    p.el.textContent = typeof value === 'number' ? Math.round(value) : value;
    p.el.className = 'dmg-popup ' + kind;
    p.el.style.display = 'block';
    p.pos.copy(worldPos);
    p.vel.set(rand(-0.6, 0.6), rand(1.6, 2.4), rand(-0.6, 0.6));
    p.life = kind === 'crit' || kind === 'head' ? 1.1 : 0.8;
    p.maxLife = p.life;
  }

  addShake(v) { this.shake = Math.min(1.6, this.shake + v); }

  update(dt) {
    // Particules
    for (let i = this.pCount - 1; i >= 0; i--) {
      this.pLife[i] -= dt;
      if (this.pLife[i] <= 0) { this._kill(i); continue; }
      const i3 = i * 3;
      const drag = Math.max(0, 1 - this.pDrag[i] * dt);
      this.pVel[i3] *= drag;
      this.pVel[i3 + 2] *= drag;
      this.pVel[i3 + 1] -= this.pGrav[i] * dt;
      this.pPos[i3] += this.pVel[i3] * dt;
      this.pPos[i3 + 1] += this.pVel[i3 + 1] * dt;
      this.pPos[i3 + 2] += this.pVel[i3 + 2] * dt;
      if (this.pPos[i3 + 1] < 0.02) {           // rebond mou au sol
        this.pPos[i3 + 1] = 0.02;
        this.pVel[i3 + 1] *= -0.28;
        this.pVel[i3] *= 0.6;
        this.pVel[i3 + 2] *= 0.6;
      }
      this.pAlpha[i] = clamp(this.pLife[i] / this.pMaxLife[i], 0, 1);
    }
    this.pGeo.setDrawRange(0, this.pCount);
    this.pGeo.attributes.position.needsUpdate = true;
    this.pGeo.attributes.color.needsUpdate = true;
    this.pGeo.attributes.size.needsUpdate = true;
    this.pGeo.attributes.alpha.needsUpdate = true;

    // Traçantes
    let anyTracer = false;
    for (let i = 0; i < MAX_TRACERS; i++) {
      if (this.tracerLife[i] > 0) {
        this.tracerLife[i] -= dt;
        anyTracer = true;
        if (this.tracerLife[i] <= 0) {
          const i6 = i * 6;
          for (let k = 0; k < 6; k++) this.tracerPos[i6 + k] = 0;
          this.tracerGeo.attributes.position.needsUpdate = true;
        }
      }
    }
    this.tracers.visible = anyTracer;

    // Décalques
    for (const d of this.decals) {
      if (d.life > 0) {
        d.life -= dt;
        if (d.life <= 0) { d.mesh.visible = false; d.mesh.material.opacity = 0; }
        else if (d.life < 3) d.mesh.material.opacity = 0.85 * (d.life / 3);
      }
    }

    // Chiffres de dégâts
    for (const p of this.popups) {
      if (p.life <= 0) continue;
      p.life -= dt;
      if (p.life <= 0) { p.el.style.display = 'none'; continue; }
      p.pos.addScaledVector(p.vel, dt);
      p.vel.y -= 2.2 * dt;
      this._v.copy(p.pos).project(this.camera);
      if (this._v.z > 1 || this._v.z < -1) { p.el.style.display = 'none'; continue; }
      const x = (this._v.x * 0.5 + 0.5) * window.innerWidth;
      const y = (-this._v.y * 0.5 + 0.5) * window.innerHeight;
      const t = p.life / p.maxLife;
      p.el.style.display = 'block';
      p.el.style.transform = `translate(-50%,-50%) translate(${x}px,${y}px) scale(${0.85 + t * 0.35})`;
      p.el.style.opacity = String(clamp(t * 1.6, 0, 1));
    }

    // Secousse caméra
    if (this.shake > 0) {
      this.shake = Math.max(0, this.shake - dt * 2.6);
      const s = this.shake * this.shake * 0.14;
      this.shakeVec.set(rand(-s, s), rand(-s, s), rand(-s, s));
    } else {
      this.shakeVec.set(0, 0, 0);
    }
  }

  reset() {
    this.pCount = 0;
    this.pGeo.setDrawRange(0, 0);
    for (const d of this.decals) { d.life = 0; d.mesh.visible = false; }
    for (const p of this.popups) { p.life = 0; p.el.style.display = 'none'; }
    for (let i = 0; i < MAX_TRACERS; i++) this.tracerLife[i] = 0;
    this.shake = 0;
  }
}
