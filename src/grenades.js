import * as THREE from '../vendor/three.module.js';
import { GRENADE, WORLD } from './config.js';
import { clamp, rand, dist2D, resolveCircleBoxes } from './utils.js';
import { Sfx } from './audio.js';

/**
 * Grenades lancées à la main : trajectoire balistique, rebonds sur le décor,
 * fusée sonore puis explosion. C'est l'outil de dégagement quand la horde
 * referme le cercle.
 */
export class GrenadeManager {
  constructor(scene, world, effects) {
    this.scene = scene;
    this.world = world;
    this.effects = effects;
    this.live = [];
    this.pool = [];
    this.count = GRENADE.start;
    this.onExplode = null;   // (position, radius, damage) => void

    this.geo = new THREE.SphereGeometry(0.13, 10, 8);
    this.mat = new THREE.MeshLambertMaterial({ color: 0x4a5b39 });
    this.lightMat = new THREE.MeshBasicMaterial({ color: 0xff3b30 });
    this.lightGeo = new THREE.SphereGeometry(0.045, 6, 5);
  }

  get max() { return GRENADE.max; }

  add(n = 1) {
    const before = this.count;
    this.count = Math.min(GRENADE.max, this.count + n);
    return this.count > before;
  }

  reset() {
    for (const g of this.live) { g.group.visible = false; this.pool.push(g); }
    this.live.length = 0;
    this.count = GRENADE.start;
  }

  _obtain() {
    let g = this.pool.pop();
    if (!g) {
      const group = new THREE.Group();
      const body = new THREE.Mesh(this.geo, this.mat);
      body.castShadow = true;
      const led = new THREE.Mesh(this.lightGeo, this.lightMat.clone());
      led.position.set(0, 0.13, 0);
      group.add(body, led);
      this.scene.add(group);
      g = { group, led, vel: new THREE.Vector3(), spin: new THREE.Vector3(), fuse: 0, beep: 0 };
    }
    return g;
  }

  /** Lance une grenade depuis l'œil du joueur. Renvoie false s'il n'en a plus. */
  throw(origin, dir, inherit = null) {
    if (this.count <= 0) return false;
    this.count--;
    const g = this._obtain();
    g.group.visible = true;
    g.group.position.copy(origin).addScaledVector(dir, 0.5);
    g.vel.copy(dir).multiplyScalar(GRENADE.throwSpeed);
    g.vel.y += 2.4;                       // léger arc vers le haut
    if (inherit) g.vel.add(inherit.clone().multiplyScalar(0.5));
    g.spin.set(rand(-12, 12), rand(-12, 12), rand(-12, 12));
    g.fuse = GRENADE.fuse;
    g.beep = 0;
    this.live.push(g);
    Sfx.throwGrenade();
    return true;
  }

  _explode(g) {
    const p = g.group.position.clone();
    p.y = Math.max(0.2, p.y);
    this.effects.explosion(p, 6);
    Sfx.explosion();
    g.group.visible = false;
    if (this.onExplode) this.onExplode(p, GRENADE.radius, GRENADE.damage);
  }

  update(dt) {
    for (let i = this.live.length - 1; i >= 0; i--) {
      const g = this.live[i];
      g.fuse -= dt;

      // Bip d'amorçage, de plus en plus pressant
      g.beep -= dt;
      if (g.beep <= 0) {
        g.beep = clamp(g.fuse * 0.35, 0.08, 0.4);
        Sfx.grenadeBeep();
      }
      g.led.material.color.setRGB(1, g.fuse < 0.5 ? 0.1 : 0.35, 0.1);
      g.led.visible = Math.sin(g.fuse * 40) > -0.2;

      g.vel.y -= WORLD.gravity * dt;
      const p = g.group.position;
      p.addScaledVector(g.vel, dt);

      // Sol
      if (p.y < 0.13) {
        p.y = 0.13;
        g.vel.y *= -0.42;
        g.vel.x *= 0.68; g.vel.z *= 0.68;
        g.spin.multiplyScalar(0.6);
        if (Math.abs(g.vel.y) > 1.2) Sfx.grenadeBounce();
      }

      // Décor : on repousse la grenade hors des boîtes et on inverse l'élan
      const before = { x: p.x, z: p.z };
      resolveCircleBoxes(p, 0.16, this.world.obstacles, 0.26);
      if (Math.abs(p.x - before.x) > 1e-4 || Math.abs(p.z - before.z) > 1e-4) {
        const nx = p.x - before.x, nz = p.z - before.z;
        const len = Math.hypot(nx, nz) || 1;
        const dot = (g.vel.x * nx + g.vel.z * nz) / len;
        g.vel.x -= 1.5 * dot * (nx / len);
        g.vel.z -= 1.5 * dot * (nz / len);
        g.vel.multiplyScalar(0.6);
        Sfx.grenadeBounce();
      }

      const lim = this.world.half - 0.5;
      p.x = clamp(p.x, -lim, lim);
      p.z = clamp(p.z, -lim, lim);

      g.group.rotation.x += g.spin.x * dt;
      g.group.rotation.y += g.spin.y * dt;
      g.group.rotation.z += g.spin.z * dt;

      // Traînée de fumée
      if (Math.random() < 0.4) this.effects.smoke(p, 1, 0x6a6a6a, 0.25);

      if (g.fuse <= 0) {
        this._explode(g);
        this.live.splice(i, 1);
        this.pool.push(g);
      }
    }
  }

  /** Distance de la grenade active la plus proche (pour l'alerte du HUD). */
  nearestFuse(pos) {
    let best = null;
    for (const g of this.live) {
      const d = dist2D(g.group.position, pos);
      if (d < GRENADE.radius && (!best || g.fuse < best)) best = g.fuse;
    }
    return best;
  }
}
