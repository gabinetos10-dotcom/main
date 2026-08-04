import * as THREE from '../vendor/three.module.js';

export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const lerp = (a, b, t) => a + (b - a) * t;
export const rand = (a, b) => a + Math.random() * (b - a);
export const randInt = (a, b) => Math.floor(rand(a, b + 1));
export const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
export const damp = (a, b, lambda, dt) => lerp(a, b, 1 - Math.exp(-lambda * dt));

export function weightedPick(items, weightFn = (i) => i.weight) {
  let total = 0;
  for (const it of items) total += weightFn(it);
  if (total <= 0) return null;
  let r = Math.random() * total;
  for (const it of items) {
    r -= weightFn(it);
    if (r <= 0) return it;
  }
  return items[items.length - 1];
}

/** Intersection segment / AABB (méthode des slabs). Retourne la distance ou -1. */
export function rayAABB(origin, dir, min, max, maxDist) {
  let tmin = 0;
  let tmax = maxDist;
  for (let i = 0; i < 3; i++) {
    const o = origin.getComponent(i);
    const d = dir.getComponent(i);
    const lo = min.getComponent(i);
    const hi = max.getComponent(i);
    if (Math.abs(d) < 1e-8) {
      if (o < lo || o > hi) return -1;
    } else {
      const inv = 1 / d;
      let t1 = (lo - o) * inv;
      let t2 = (hi - o) * inv;
      if (t1 > t2) { const tmp = t1; t1 = t2; t2 = tmp; }
      if (t1 > tmin) tmin = t1;
      if (t2 < tmax) tmax = t2;
      if (tmin > tmax) return -1;
    }
  }
  return tmin;
}

/** Intersection segment / sphère. Retourne la distance du premier point touché ou -1. */
export function raySphere(origin, dir, center, radius, maxDist) {
  const ox = origin.x - center.x;
  const oy = origin.y - center.y;
  const oz = origin.z - center.z;
  const b = ox * dir.x + oy * dir.y + oz * dir.z;
  const c = ox * ox + oy * oy + oz * oz - radius * radius;
  if (c > 0 && b > 0) return -1;
  const disc = b * b - c;
  if (disc < 0) return -1;
  const sq = Math.sqrt(disc);
  let t = -b - sq;
  if (t < 0) t = -b + sq;
  if (t < 0 || t > maxDist) return -1;
  return t;
}

/** Distance horizontale (XZ) entre deux vecteurs. */
export function dist2D(a, b) {
  const dx = a.x - b.x;
  const dz = a.z - b.z;
  return Math.sqrt(dx * dx + dz * dz);
}

/** Boîte alignée aux axes utilisée pour les collisions du décor. */
export class Box {
  constructor(cx, cz, hx, hz, top = 3, bottom = 0) {
    this.min = new THREE.Vector3(cx - hx, bottom, cz - hz);
    this.max = new THREE.Vector3(cx + hx, top, cz + hz);
  }
  containsXZ(x, z, pad = 0) {
    return x > this.min.x - pad && x < this.max.x + pad &&
           z > this.min.z - pad && z < this.max.z + pad;
  }
}

/**
 * Déplace un cercle (rayon r) en XZ et le repousse hors des boîtes.
 * Résolution par axe : produit un glissement naturel le long des murs.
 */
export function resolveCircleBoxes(pos, radius, boxes, height = 1.7) {
  for (const b of boxes) {
    if (pos.y > b.max.y - 0.05) continue;              // on est passé au-dessus
    if (pos.y + height < b.min.y) continue;            // la boîte est au-dessus
    const cx = clamp(pos.x, b.min.x, b.max.x);
    const cz = clamp(pos.z, b.min.z, b.max.z);
    const dx = pos.x - cx;
    const dz = pos.z - cz;
    const d2 = dx * dx + dz * dz;
    if (d2 > radius * radius) continue;

    if (d2 > 1e-6) {
      const d = Math.sqrt(d2);
      const push = radius - d;
      pos.x += (dx / d) * push;
      pos.z += (dz / d) * push;
    } else {
      // centre à l'intérieur : on sort par la face la plus proche
      const left = Math.abs(pos.x - b.min.x);
      const right = Math.abs(b.max.x - pos.x);
      const back = Math.abs(pos.z - b.min.z);
      const front = Math.abs(b.max.z - pos.z);
      const m = Math.min(left, right, back, front);
      if (m === left) pos.x = b.min.x - radius;
      else if (m === right) pos.x = b.max.x + radius;
      else if (m === back) pos.z = b.min.z - radius;
      else pos.z = b.max.z + radius;
    }
  }
}

/** Le segment a-t-il une ligne de vue dégagée ? (test grossier contre les boîtes) */
export function hasLineOfSight(from, to, boxes) {
  const dir = new THREE.Vector3().subVectors(to, from);
  const len = dir.length();
  if (len < 1e-4) return true;
  dir.multiplyScalar(1 / len);
  for (const b of boxes) {
    const t = rayAABB(from, dir, b.min, b.max, len);
    if (t >= 0 && t < len) return false;
  }
  return true;
}

/** Petit pool d'objets générique. */
export class Pool {
  constructor(factory, reset, size = 32) {
    this.factory = factory;
    this.reset = reset;
    this.free = [];
    this.active = [];
    for (let i = 0; i < size; i++) this.free.push(factory());
  }
  spawn(...args) {
    const obj = this.free.pop() || this.factory();
    this.reset(obj, ...args);
    this.active.push(obj);
    return obj;
  }
  release(obj) {
    const i = this.active.indexOf(obj);
    if (i !== -1) this.active.splice(i, 1);
    this.free.push(obj);
  }
}
