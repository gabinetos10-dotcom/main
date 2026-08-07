import * as THREE from '../vendor/three.module.js';
import { UPGRADES, WEAPONS } from './config.js';
import { rand, weightedPick, raySphere, dist2D, clamp } from './utils.js';
import { Sfx } from './audio.js';

function labelSprite(text, color) {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 128;
  const g = c.getContext('2d');
  g.clearRect(0, 0, 256, 128);
  g.font = 'bold 76px system-ui, sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillStyle = '#000';
  g.globalAlpha = 0.35;
  g.fillText(text, 130, 68);
  g.globalAlpha = 1;
  g.fillStyle = '#' + new THREE.Color(color).getHexString();
  g.fillText(text, 128, 64);
  const tex = new THREE.CanvasTexture(c);
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: true }));
  sp.scale.set(1.1, 0.55, 1);
  return sp;
}

/** Objets destructibles + objets à ramasser. */
export class PickupManager {
  constructor(scene, world, effects, player, weapons) {
    this.scene = scene;
    this.world = world;
    this.effects = effects;
    this.player = player;
    this.weapons = weapons;
    this.grenades = null;    // renseigné par le jeu
    this.shootables = [];   // cristaux, barils, caisses
    this.drops = [];        // soins / munitions au sol
    this.onUpgrade = null;
    this.onMessage = null;
    this.onExplosion = null;

    this.barrelGeo = new THREE.CylinderGeometry(0.42, 0.42, 1.1, 12);
    this.crateGeo = new THREE.BoxGeometry(0.9, 0.9, 0.9);
    this.crystalGeo = new THREE.OctahedronGeometry(0.42, 0);
    this.ringGeo = new THREE.TorusGeometry(0.62, 0.035, 6, 20);
    this.medGeo = new THREE.BoxGeometry(0.5, 0.3, 0.36);
    this.ammoGeo = new THREE.BoxGeometry(0.46, 0.3, 0.3);
  }

  // ---------- Création ----------

  spawnCrystal(pos, forcedUpgrade = null) {
    const counts = this.player.upgrades;
    const pool = UPGRADES.filter((u) => (counts[u.id] || 0) < u.max);
    const up = forcedUpgrade
      ? UPGRADES.find((u) => u.id === forcedUpgrade)
      : (weightedPick(pool.length ? pool : UPGRADES) || UPGRADES[0]);

    const group = new THREE.Group();
    const mat = new THREE.MeshBasicMaterial({ color: up.color });
    const core = new THREE.Mesh(this.crystalGeo, mat);
    group.add(core);
    const shell = new THREE.Mesh(
      this.crystalGeo,
      new THREE.MeshBasicMaterial({ color: up.color, transparent: true, opacity: 0.22, side: THREE.BackSide })
    );
    shell.scale.setScalar(1.7);
    group.add(shell);
    const ring = new THREE.Mesh(this.ringGeo, new THREE.MeshBasicMaterial({ color: up.color, transparent: true, opacity: 0.7 }));
    ring.rotation.x = Math.PI / 2;
    group.add(ring);
    const light = new THREE.PointLight(up.color, 9, 12, 2);
    group.add(light);
    const label = labelSprite(up.icon, 0xffffff);
    label.position.y = 1.05;
    group.add(label);

    group.position.copy(pos);
    group.position.y = 1.5;
    this.scene.add(group);

    const obj = {
      kind: 'crystal', group, core, shell, ring, light, upgrade: up,
      hp: 30, radius: 0.75, baseY: group.position.y, phase: rand(0, 6.28), dead: false,
    };
    this.shootables.push(obj);
    return obj;
  }

  spawnBarrel(pos) {
    const mat = new THREE.MeshLambertMaterial({ color: 0x9c3021 });
    const g = new THREE.Group();
    const body = new THREE.Mesh(this.barrelGeo, mat);
    body.castShadow = true;
    g.add(body);
    const band = new THREE.Mesh(
      new THREE.CylinderGeometry(0.44, 0.44, 0.16, 12),
      new THREE.MeshLambertMaterial({ color: 0xe0c04a })
    );
    band.position.y = 0.15;
    g.add(band);
    g.position.copy(pos);
    g.position.y = 0.55;
    g.rotation.y = rand(0, 6.28);
    this.scene.add(g);
    const obj = { kind: 'barrel', group: g, hp: 45, radius: 0.62, dead: false, fuse: 0 };
    this.shootables.push(obj);
    return obj;
  }

  spawnWeaponCrate(pos, weaponId) {
    const g = new THREE.Group();
    const box = new THREE.Mesh(this.crateGeo, new THREE.MeshLambertMaterial({ color: 0x6b5a33 }));
    box.castShadow = true;
    g.add(box);
    const edge = new THREE.Mesh(
      new THREE.BoxGeometry(0.95, 0.12, 0.95),
      new THREE.MeshLambertMaterial({ color: 0x3f6b33 })
    );
    edge.position.y = 0.46;
    g.add(edge);
    const label = labelSprite('🔫', 0xffffff);
    label.position.y = 0.95;
    g.add(label);
    const light = new THREE.PointLight(0x77ff88, 5, 8, 2);
    light.position.y = 0.8;
    g.add(light);
    g.position.copy(pos);
    g.position.y = 0.45;
    this.scene.add(g);
    const obj = { kind: 'weapon', group: g, hp: 60, radius: 0.8, weaponId, dead: false, phase: rand(0, 6.3) };
    this.shootables.push(obj);
    return obj;
  }

  spawnDrop(pos, type) {
    const isMed = type === 'health';
    const isGrenade = type === 'grenade';
    const g = new THREE.Group();
    const mesh = new THREE.Mesh(
      isMed ? this.medGeo : this.ammoGeo,
      new THREE.MeshLambertMaterial({ color: isMed ? 0xe8e8e8 : isGrenade ? 0x46552f : 0x6f6a3a })
    );
    mesh.castShadow = true;
    g.add(mesh);
    if (isGrenade) {
      // trois grenades posées sur la caisse
      for (let i = 0; i < 3; i++) {
        const gr = new THREE.Mesh(
          new THREE.SphereGeometry(0.09, 8, 6),
          new THREE.MeshLambertMaterial({ color: 0x3d4a2c })
        );
        gr.position.set(-0.12 + i * 0.12, 0.19, 0);
        g.add(gr);
      }
    } else if (isMed) {
      const crossMat = new THREE.MeshBasicMaterial({ color: 0xe03b3b });
      const a = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.09, 0.02), crossMat);
      const b = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.22, 0.02), crossMat);
      a.position.z = 0.19; b.position.z = 0.19;
      g.add(a, b);
    } else {
      const top = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.06, 0.32), new THREE.MeshLambertMaterial({ color: 0x3c3a24 }));
      top.position.y = 0.17;
      g.add(top);
    }
    const light = new THREE.PointLight(isMed ? 0xff6666 : isGrenade ? 0x9bd45a : 0xffdd66, 3.5, 5, 2);
    light.position.y = 0.5;
    g.add(light);
    g.position.copy(pos);
    g.position.y = 0.28;
    this.scene.add(g);
    const obj = { kind: type, group: g, life: 45, phase: rand(0, 6.3), dead: false };
    this.drops.push(obj);
    return obj;
  }

  // ---------- Tirs ----------

  raycast(origin, dir, maxDist, exclude = null) {
    let best = null;
    for (const o of this.shootables) {
      if (o.dead || (exclude && exclude.has(o))) continue;
      const c = o.group.position;
      const t = raySphere(origin, dir, c, o.radius, maxDist);
      if (t >= 0 && (!best || t < best.dist)) best = { obj: o, dist: t };
    }
    return best;
  }

  damage(obj, amount, dir, hitPos) {
    if (obj.dead) return;
    obj.hp -= amount;
    if (obj.kind === 'crystal') {
      this.effects.sparks(hitPos, dir.clone().negate(), 10, obj.upgrade.color);
      obj.core.scale.setScalar(1.25);
    } else if (obj.kind === 'barrel') {
      this.effects.sparks(hitPos, dir.clone().negate(), 8, 0xffaa55);
      if (obj.hp <= 0 && obj.fuse === 0) obj.fuse = 0.001;
    } else {
      this.effects.sparks(hitPos, dir.clone().negate(), 6, 0xd9c07a);
    }
    if (obj.hp <= 0) {
      if (obj.kind === 'crystal') this._breakCrystal(obj);
      else if (obj.kind === 'weapon') this._breakWeaponCrate(obj);
      else if (obj.kind === 'barrel') this._explode(obj);
    }
  }

  _breakCrystal(obj) {
    obj.dead = true;
    this.scene.remove(obj.group);
    const p = obj.group.position.clone();
    for (let i = 0; i < 34; i++) {
      const a = Math.random() * Math.PI * 2;
      this.effects.emit(p.x, p.y, p.z, {
        vx: Math.cos(a) * rand(1, 7), vy: rand(1, 6), vz: Math.sin(a) * rand(1, 7),
        color: new THREE.Color(obj.upgrade.color).multiplyScalar(rand(0.7, 1.3)),
        size: rand(0.05, 0.16), life: rand(0.5, 1.2), gravity: 14,
      });
    }
    Sfx.crystalBreak();
    Sfx.upgrade();
    this.player.applyUpgrade(obj.upgrade.id);
    if (this.onUpgrade) this.onUpgrade(obj.upgrade);
  }

  _breakWeaponCrate(obj) {
    obj.dead = true;
    this.scene.remove(obj.group);
    const p = obj.group.position.clone();
    this.effects.sparks(p, new THREE.Vector3(0, 1, 0), 24, 0xc9a24a);
    const def = WEAPONS[obj.weaponId];
    if (this.weapons.unlock(obj.weaponId)) {
      this.weapons.switchTo(obj.weaponId);
      Sfx.upgrade();
      if (this.onMessage) this.onMessage(`ARME DÉBLOQUÉE — ${def.name}`, '#ffd166');
    } else {
      this.weapons.addAmmo(obj.weaponId, Math.ceil(def.reserve * 0.5));
      Sfx.pickup();
      if (this.onMessage) this.onMessage(`Munitions — ${def.name}`, '#ffd166');
    }
  }

  _explode(obj) {
    obj.dead = true;
    this.scene.remove(obj.group);
    const p = obj.group.position.clone();
    this.effects.explosion(p, 5);
    Sfx.explosion();
    if (this.onExplosion) this.onExplosion(p, 7, 190);
    // réaction en chaîne
    for (const o of this.shootables) {
      if (o.dead || o.kind !== 'barrel') continue;
      if (dist2D(o.group.position, p) < 7) o.fuse = Math.max(o.fuse, rand(0.08, 0.35));
    }
  }

  // ---------- Boucle ----------

  update(dt, time) {
    for (let i = this.shootables.length - 1; i >= 0; i--) {
      const o = this.shootables[i];
      if (o.dead) { this.shootables.splice(i, 1); continue; }
      if (o.kind === 'crystal') {
        o.group.position.y = o.baseY + Math.sin(time * 1.6 + o.phase) * 0.22;
        o.group.rotation.y += dt * 1.1;
        o.core.rotation.x += dt * 0.9;
        o.shell.rotation.y -= dt * 0.6;
        o.ring.rotation.z += dt * 1.6;
        o.light.intensity = 8 + Math.sin(time * 5 + o.phase) * 2.5;
        o.core.scale.setScalar(clamp(o.core.scale.x - dt * 1.6, 1, 1.4));
      } else if (o.kind === 'weapon') {
        o.group.rotation.y += dt * 0.8;
        o.group.position.y = 0.45 + Math.sin(time * 2 + o.phase) * 0.08;
      } else if (o.kind === 'barrel' && o.fuse > 0) {
        o.fuse -= dt;
        o.group.position.y = 0.55 + Math.sin(time * 60) * 0.03;
        if (o.fuse <= 0) this._explode(o);
      }
    }

    for (let i = this.drops.length - 1; i >= 0; i--) {
      const d = this.drops[i];
      d.life -= dt;
      d.group.rotation.y += dt * 1.4;
      d.group.position.y = 0.28 + Math.sin(time * 2.4 + d.phase) * 0.09;
      if (d.life < 6) d.group.visible = Math.sin(time * 12) > -0.3;

      if (dist2D(d.group.position, this.player.pos) < 1.5 && Math.abs(this.player.pos.y - 0) < 2.5) {
        let taken = false;
        if (d.kind === 'health') {
          if (this.player.health < this.player.maxHealth) {
            this.player.heal(35);
            taken = true;
            if (this.onMessage) this.onMessage('+35 PV', '#7ee787');
          }
        } else if (d.kind === 'grenade') {
          if (this.grenades && this.grenades.add(2)) {
            taken = true;
            if (this.onMessage) this.onMessage('Grenades récupérées', '#9bd45a');
          }
        } else {
          this.weapons.refillAll(0.35);
          taken = true;
          if (this.onMessage) this.onMessage('Munitions récupérées', '#ffd166');
        }
        if (taken) {
          Sfx.pickup();
          this.effects.sparks(d.group.position, new THREE.Vector3(0, 1, 0), 12,
            d.kind === 'health' ? 0x66ff88 : d.kind === 'grenade' ? 0x9bd45a : 0xffdd55);
          d.life = -1;
        }
      }

      if (d.life <= 0) {
        this.scene.remove(d.group);
        this.drops.splice(i, 1);
      }
    }
  }

  countCrystals() {
    let n = 0;
    for (const o of this.shootables) if (!o.dead && o.kind === 'crystal') n++;
    return n;
  }

  clear() {
    for (const o of this.shootables) this.scene.remove(o.group);
    for (const d of this.drops) this.scene.remove(d.group);
    this.shootables.length = 0;
    this.drops.length = 0;
  }
}
