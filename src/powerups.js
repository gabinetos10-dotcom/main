import * as THREE from '../vendor/three.module.js';
import { POWERUPS, POWERUP_RULES } from './config.js';
import { weightedPick, dist2D, clamp } from './utils.js';
import { Sfx } from './audio.js';

/**
 * Bonus lâchés au hasard par les zombies. Ils flottent en tournant, clignotent
 * avant de disparaître, et s'appliquent dès qu'on marche dessus.
 */
export class PowerupManager {
  constructor(scene, effects) {
    this.scene = scene;
    this.effects = effects;
    this.live = [];
    this.pool = [];
    this.sinceLast = 999;
    this.active = {};         // id -> secondes restantes
    this.onCollect = null;

    this.geo = new THREE.BoxGeometry(0.62, 0.62, 0.62);
    this.ringGeo = new THREE.TorusGeometry(0.55, 0.05, 6, 18);
  }

  reset() {
    for (const p of this.live) { p.group.visible = false; this.pool.push(p); }
    this.live.length = 0;
    this.active = {};
    this.sinceLast = 999;
  }

  isActive(id) { return (this.active[id] || 0) > 0; }
  get instantKill() { return this.isActive('instant'); }
  get doublePoints() { return this.isActive('double'); }

  _obtain() {
    let p = this.pool.pop();
    if (!p) {
      const group = new THREE.Group();
      const box = new THREE.Mesh(this.geo, new THREE.MeshBasicMaterial({ color: 0xffffff }));
      const ring = new THREE.Mesh(this.ringGeo, new THREE.MeshBasicMaterial({ color: 0xffffff }));
      ring.rotation.x = Math.PI / 2;
      const light = new THREE.PointLight(0xffffff, 2, 16, 1.6);
      const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ transparent: true }));
      sprite.scale.set(1.2, 1.2, 1);
      sprite.position.y = 0.05;
      group.add(box, ring, light, sprite);
      this.scene.add(group);
      p = { group, box, ring, light, sprite, def: null, life: 0, phase: 0 };
    }
    return p;
  }

  /** Tente un largage à la mort d'un zombie. */
  tryDrop(pos, force = false) {
    if (!force) {
      if (this.sinceLast < POWERUP_RULES.minInterval) return null;
      if (Math.random() > POWERUP_RULES.dropChance) return null;
    }
    return this.spawn(pos, weightedPick(Object.values(POWERUPS)));
  }

  spawn(pos, def) {
    if (!def) return null;
    this.sinceLast = 0;
    const p = this._obtain();
    p.def = def;
    p.life = POWERUP_RULES.life;
    p.phase = Math.random() * 6.28;
    p.group.visible = true;
    p.group.position.set(pos.x, 1.0, pos.z);

    const col = new THREE.Color(def.color);
    p.box.material.color.copy(col);
    p.ring.material.color.copy(col);
    p.light.color.copy(col);

    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const g = c.getContext('2d');
    g.font = 'bold 92px system-ui, sans-serif';
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillStyle = '#fff';
    g.fillText(def.icon, 64, 68);
    p.sprite.material.map = new THREE.CanvasTexture(c);
    p.sprite.material.needsUpdate = true;

    this.live.push(p);
    return p;
  }

  collect(p, game) {
    const def = p.def;
    Sfx.powerup();
    this.effects.sparks(p.group.position, new THREE.Vector3(0, 1, 0), 26, def.color);
    if (def.duration > 0) {
      this.active[def.id] = def.duration;
    }
    if (this.onCollect) this.onCollect(def);
    p.group.visible = false;
    p.life = -1;
  }

  update(dt, time, player, game) {
    this.sinceLast += dt;
    for (const id of Object.keys(this.active)) {
      this.active[id] -= dt;
      if (this.active[id] <= 0) delete this.active[id];
    }

    for (let i = this.live.length - 1; i >= 0; i--) {
      const p = this.live[i];
      p.life -= dt;
      p.group.position.y = 1.0 + Math.sin(time * 2.2 + p.phase) * 0.22;
      p.box.rotation.y += dt * 1.9;
      p.box.rotation.x += dt * 0.8;
      p.ring.rotation.z += dt * 2.4;
      p.light.intensity = 1.9 + Math.sin(time * 6 + p.phase) * 0.7;
      if (p.life < 6) p.group.visible = Math.sin(time * 14) > -0.35;

      if (p.life > 0 && dist2D(p.group.position, player.pos) < 2.2) {
        this.collect(p, game);
      }
      if (p.life <= 0) {
        p.group.visible = false;
        this.live.splice(i, 1);
        this.pool.push(p);
      }
    }
  }

  /** Secondes restantes du bonus temporaire le plus long, pour le HUD. */
  activeList() {
    return Object.entries(this.active)
      .map(([id, t]) => ({ def: POWERUPS[id], time: t }))
      .filter((e) => e.def)
      .sort((a, b) => b.time - a.time);
  }
}
