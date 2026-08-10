import * as THREE from '../vendor/three.module.js';
import { ZOMBIES, PLAYER } from './config.js';
import { clamp, damp, rand, dist2D, raySphere, resolveCircleBoxes, hasLineOfSight } from './utils.js';
import { Sfx } from './audio.js';

const GEO = {
  torso: new THREE.BoxGeometry(0.62, 0.82, 0.34),
  hip: new THREE.BoxGeometry(0.5, 0.34, 0.3),
  head: new THREE.SphereGeometry(0.21, 10, 8),
  jaw: new THREE.BoxGeometry(0.2, 0.09, 0.16),
  arm: new THREE.BoxGeometry(0.16, 0.62, 0.16),
  leg: new THREE.BoxGeometry(0.19, 0.72, 0.19),
  spike: new THREE.ConeGeometry(0.12, 0.34, 5),
  weak: new THREE.SphereGeometry(0.16, 8, 6),
  belly: new THREE.SphereGeometry(0.44, 10, 8),
  blister: new THREE.SphereGeometry(0.09, 6, 5),
  gib: new THREE.BoxGeometry(0.16, 0.16, 0.16),
};
GEO.arm.translate(0, -0.31, 0);
GEO.leg.translate(0, -0.36, 0);

const BAR_GEO = new THREE.PlaneGeometry(1, 0.12);

/** Un zombie : corps articulé simple + machine à états. */
class Zombie {
  constructor(manager, type) {
    this.mgr = manager;
    this.def = ZOMBIES[type];
    this.type = type;
    this.group = new THREE.Group();
    this.pos = new THREE.Vector3();
    this.vel = new THREE.Vector3();
    this.yaw = 0;
    this.alive = true;
    this.dead = false;
    this._build();
  }

  _build() {
    const d = this.def;
    const s = d.scale;
    const base = new THREE.Color(d.color);
    const skin = base.clone().offsetHSL(rand(-0.03, 0.03), rand(-0.08, 0.08), rand(-0.07, 0.07));
    this.mat = new THREE.MeshPhongMaterial({ color: skin });
    this.clothMat = new THREE.MeshPhongMaterial({
      color: new THREE.Color().setHSL(rand(0, 1), 0.11, rand(0.07, 0.17)),
    });

    const g = new THREE.Group();
    this.body = g;
    this.group.add(g);
    this.group.scale.setScalar(s);

    // Le rampant avance plié en deux, presque au ras du sol.
    // Basculé de 57° vers l'avant et abaissé : le buste racle le sol, la tête
    // reste visible devant. Les sphères de toucher plus bas reprennent
    // exactement cette géométrie.
    if (d.crawler) {
      g.rotation.x = -1.0;
      g.position.y = -0.33;
    }

    this.torso = new THREE.Mesh(GEO.torso, this.clothMat);
    this.torso.position.y = 1.18;
    g.add(this.torso);

    this.hip = new THREE.Mesh(GEO.hip, this.clothMat);
    this.hip.position.y = 0.78;
    g.add(this.hip);

    // Le boursouflé traîne un abdomen distendu, prêt à éclater.
    if (d.bloated) {
      this.torso.scale.set(1.35, 1.15, 1.5);
      this.belly = new THREE.Mesh(GEO.belly, this.mat);
      this.belly.position.set(0, 1.0, -0.16);
      g.add(this.belly);
      for (let i = 0; i < 5; i++) {
        const b = new THREE.Mesh(GEO.blister, new THREE.MeshBasicMaterial({ color: 0xc9e04a }));
        b.position.set(rand(-0.32, 0.32), 0.85 + rand(0, 0.5), -0.38 + rand(-0.06, 0.06));
        g.add(b);
      }
    }

    this.head = new THREE.Mesh(GEO.head, this.mat);
    this.head.position.y = 1.72;
    g.add(this.head);
    const jaw = new THREE.Mesh(GEO.jaw, this.mat);
    jaw.position.set(0, -0.09, -0.14);
    this.head.add(jaw);
    this.jaw = jaw;

    // yeux luisants
    const eyeMat = new THREE.MeshBasicMaterial({ color: d.boss ? 0xff3b6b : 0xff9a28 });
    this.eyes = [];
    for (const sx of [-1, 1]) {
      const e = new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 5), eyeMat);
      e.position.set(sx * 0.08, 0.03, -0.185);
      this.head.add(e);
      this.eyes.push(e);
      // halo : c'est ce qu'on repère en premier dans le noir
      const halo = new THREE.Sprite(new THREE.SpriteMaterial({
        color: d.boss ? 0xff3b6b : 0xff9a28,
        transparent: true, opacity: 0.55, depthWrite: false,
        blending: THREE.AdditiveBlending,
      }));
      halo.scale.set(0.34, 0.34, 1);
      halo.position.copy(e.position);
      this.head.add(halo);
    }

    this.armL = new THREE.Mesh(GEO.arm, this.mat);
    this.armL.position.set(-0.4, 1.5, 0);
    this.armR = new THREE.Mesh(GEO.arm, this.mat);
    this.armR.position.set(0.4, 1.5, 0);
    g.add(this.armL, this.armR);

    this.legL = new THREE.Mesh(GEO.leg, this.clothMat);
    this.legL.position.set(-0.16, 0.72, 0);
    this.legR = new THREE.Mesh(GEO.leg, this.clothMat);
    this.legR.position.set(0.16, 0.72, 0);
    g.add(this.legL, this.legR);

    // Points faibles des gros zombies : pustules jaunes à faire éclater
    this.weakSpots = [];
    if (d.weakSpots) {
      // En saillie sur l'avant : elles doivent être touchables avant la sphère
      // du torse, sinon elles seraient inatteignables. Volontairement décalées
      // du centre de masse pour que les faire éclater demande de viser.
      const spots = [
        [-0.3, 1.46, -0.34], [0.44, 1.06, -0.26], [-0.44, 1.06, -0.26],
      ];
      for (const [x, y, z] of spots) {
        const m = new THREE.Mesh(GEO.weak, new THREE.MeshBasicMaterial({ color: 0xd8e04a }));
        m.position.set(x, y, z);
        m.scale.setScalar(1.15);
        g.add(m);
        this.weakSpots.push({ mesh: m, broken: false, offset: new THREE.Vector3(x, y, z) });
      }
      // pointes dorsales
      for (let i = 0; i < 4; i++) {
        const sp = new THREE.Mesh(GEO.spike, this.mat);
        sp.position.set(rand(-0.2, 0.2), 1.15 + i * 0.16, 0.19);
        sp.rotation.x = -0.9;
        g.add(sp);
      }
    }

    g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = false; } });

    // Barre de vie flottante pour les gros (posée sur le groupe racine pour
    // rester horizontale même quand le corps est incliné)
    if (d.big) {
      this.barBg = new THREE.Mesh(BAR_GEO, new THREE.MeshBasicMaterial({ color: 0x220000, depthTest: false, transparent: true, opacity: 0.75 }));
      this.barFg = new THREE.Mesh(BAR_GEO, new THREE.MeshBasicMaterial({ color: 0xff3b30, depthTest: false }));
      this.barBg.renderOrder = 900; this.barFg.renderOrder = 901;
      this.barBg.position.y = 2.25; this.barFg.position.y = 2.25;
      this.barFg.position.z = 0.001;
      const bw = 1.4;
      this.barBg.scale.set(bw, 1, 1);
      this.barFg.scale.set(bw, 1, 1);
      this.barWidth = bw;
      this.group.add(this.barBg, this.barFg);
    }
  }

  spawn(pos, healthMul = 1, speedMul = 1, barricade = null) {
    const d = this.def;
    this.barricade = barricade;
    this.tearTimer = 0;
    this.climbT = 0;
    this.pos.copy(pos);
    this.pos.y = 0;
    this.vel.set(0, 0, 0);
    this.maxHealth = d.health * healthMul;
    this.health = this.maxHealth;
    this.speed = d.speed * speedMul * rand(0.92, 1.08);
    this.alive = true;
    this.dead = false;
    this.state = barricade ? 'approach' : 'rise';
    this.stateTime = 0;
    this.attackCd = rand(0, 0.4);
    this.stagger = 0;
    this.flash = 0;
    this.walkPhase = Math.random() * 10;
    this.growlCd = rand(1, 6);
    this.deathTimer = 0;
    this.chargeCd = rand(4, 8);
    this.charging = 0;
    this.slamCd = rand(3, 6);
    this.slamWind = 0;
    this.summonedAt = [];
    this.headGone = false;
    this.gibbed = false;
    this.exploded = false;
    this.charged = 0;
    this.avoid = new THREE.Vector3();
    this.wander = rand(-1, 1);

    this.group.visible = true;
    this.group.position.copy(this.pos);
    this.group.rotation.set(0, 0, 0);
    this.group.scale.setScalar(d.scale);
    this.body.visible = true;
    this.head.visible = true;
    this.head.position.y = 1.72;
    for (const w of this.weakSpots) { w.broken = false; w.mesh.visible = true; }
    this.mat.emissive.setHex(0x000000);
    this.clothMat.emissive.setHex(0x000000);
    if (this.barBg) { this.barBg.visible = true; this.barFg.visible = true; }
  }

  get radius() { return 0.42 * this.def.scale; }
  get headWorld() {
    return this.group.localToWorld(new THREE.Vector3(0, this.head.position.y, 0));
  }

  /** Sphères de collision utilisées par les tirs. */
  hitSpheres(out) {
    out.length = 0;
    const s = this.def.scale;
    const cy = Math.cos(this.yaw), sy = Math.sin(this.yaw);
    const put = (x, y, z, r, part, mul, wi) => {
      out.push({
        x: this.pos.x + (x * cy + z * sy) * s,
        y: this.pos.y + y * s,
        z: this.pos.z + (-x * sy + z * cy) * s,
        r: r * s, part, mul, wi,
      });
    };
    if (this.def.crawler) {
      // Corps allongé vers l'avant : les sphères suivent la silhouette basculée.
      if (!this.headGone) put(0, 0.6, -1.45, 0.23, 'head', this.def.headMul);
      put(0, 0.35, -0.95, 0.33, 'torso', 1);
      put(0, 0.28, -0.4, 0.3, 'body', 0.9);
    } else {
      if (!this.headGone) put(0, this.head.position.y, 0, 0.24, 'head', this.def.headMul);
      put(0, 1.2, 0, 0.42, 'torso', 1);
      put(0, 0.75, 0, 0.36, 'body', 0.9);
      put(0, 0.35, 0, 0.3, 'legs', 0.7);
      if (this.def.bloated) put(0, 1.0, -0.16, 0.46, 'belly', 1.6);
    }
    for (let i = 0; i < this.weakSpots.length; i++) {
      const w = this.weakSpots[i];
      if (w.broken) continue;
      put(w.offset.x, w.offset.y, w.offset.z, 0.24, 'weak', 4.5, i);
    }
  }

  /** Renvoie les dégâts réellement infligés. */
  damage(amount, part, mul, dir, effects, isCrit, weakIndex = -1) {
    if (!this.alive) return 0;
    let dmg = amount * (mul || 1);

    if (part === 'weak') {
      // Point faible : dégâts pleins (l'armure ne s'applique pas) + la pustule éclate
      const w = weakIndex >= 0 ? this.weakSpots[weakIndex] : this.weakSpots.find((x) => !x.broken);
      if (w && !w.broken) {
        w.broken = true;
        w.mesh.visible = false;
        effects.blood(w.mesh.getWorldPosition(new THREE.Vector3()), dir, 22, 0xc8d43a);
      }
    } else if (this.def.armor) {
      dmg *= 1 - this.def.armor;
    }

    this.health -= dmg;
    this.flash = 1;
    this.stagger = Math.min(0.35, this.stagger + dmg / (this.def.health * 0.8));

    // Recul proportionnel aux dégâts, très réduit sur les gros
    const kb = clamp(dmg / (12 * this.def.mass), 0, 3.2);
    this.vel.x += dir.x * kb;
    this.vel.z += dir.z * kb;

    const hitPos = new THREE.Vector3(this.pos.x, this.pos.y + (part === 'head' ? this.head.position.y : 1.15) * this.def.scale, this.pos.z);
    effects.blood(hitPos, dir, part === 'head' ? 20 : 10, this.def.boss ? 0x5a1030 : 0x9b1b1b);

    let kind = 'normal';
    if (part === 'head') kind = 'head';
    else if (part === 'weak') kind = 'weak';
    else if (isCrit) kind = 'crit';
    effects.damageNumber(hitPos.clone().add(new THREE.Vector3(rand(-0.3, 0.3), rand(0.1, 0.5), rand(-0.3, 0.3))), dmg, kind);

    if (part === 'head') Sfx.headshot(); else Sfx.hit();

    if (this.health <= 0) {
      this.kill(part === 'head', dir, effects, -this.health);
      return dmg;
    }
    return dmg;
  }

  kill(decapitate, dir, effects, overkill = 0) {
    this.alive = false;
    this.state = 'dying';
    this.deathTimer = 0;
    this.vel.x += dir.x * 2;
    this.vel.z += dir.z * 2;

    const center = new THREE.Vector3(this.pos.x, this.pos.y + 1.1 * this.def.scale, this.pos.z);

    // Un tir très au-delà des points de vie restants pulvérise le corps.
    const gibbed = !this.def.big && overkill > this.def.health * 0.9;
    if (gibbed) {
      this.gibbed = true;
      this.body.visible = false;
      this.mgr.spawnGibs(center, dir, this.def.scale, this.mat.color);
      effects.blood(center, dir, 46, 0x9b1b1b);
      effects.addShake(0.28);
    } else if (decapitate && !this.def.big) {
      this.headGone = true;
      this.head.visible = false;
      const hp = new THREE.Vector3(this.pos.x, this.pos.y + 1.72 * this.def.scale, this.pos.z);
      effects.blood(hp, dir, 34, 0x9b1b1b);
    }

    const feet = new THREE.Vector3(this.pos.x, 0.02, this.pos.z);
    effects.decal(feet, new THREE.Vector3(0, 1, 0), 0x2b0606, 1.4 * this.def.scale, 30);
    if (this.barBg) { this.barBg.visible = false; this.barFg.visible = false; }
    Sfx.zombieDie();

    // Le boursouflé éclate : dégâts de zone sur tout ce qui l'entoure.
    if (this.def.bloated && !this.exploded) {
      this.exploded = true;
      this.mgr.bloatExplosion(this);
    }
  }

  /** Étourdissement infligé par le coup de crosse. */
  stun(duration, dir, force) {
    this.stagger = Math.max(this.stagger, duration);
    this.vel.x += dir.x * force;
    this.vel.z += dir.z * force;
    this.flash = 1;
  }

  update(dt, player, world, mgr) {
    const d = this.def;
    this.flash = Math.max(0, this.flash - dt * 6);
    const em = this.flash * 0.9;
    this.mat.emissive.setRGB(em, em * 0.25, em * 0.25);
    this.clothMat.emissive.setRGB(em * 0.7, em * 0.15, em * 0.15);

    if (this.state === 'dying') {
      this.deathTimer += dt;
      // chute vers l'avant puis enfoncement dans le sol
      this.group.rotation.x = damp(this.group.rotation.x, Math.PI / 2, 7, dt);
      this.pos.x += this.vel.x * dt;
      this.pos.z += this.vel.z * dt;
      this.vel.multiplyScalar(Math.max(0, 1 - 4 * dt));
      if (this.deathTimer > 3) {
        this.pos.y -= dt * 0.5;
        if (this.deathTimer > 5) { this.dead = true; this.group.visible = false; }
      }
      this.group.position.copy(this.pos);
      return;
    }

    if (this.state === 'rise') {
      this.stateTime += dt;
      const t = clamp(this.stateTime / 0.9, 0, 1);
      this.group.position.set(this.pos.x, this.pos.y - (1 - t) * 2.2 * d.scale, this.pos.z);
      this.group.rotation.y = this.yaw;
      if (t >= 1) { this.state = 'chase'; Sfx.zombieGrowl(); }
      return;
    }

    // --- Arrivée par une fenêtre barricadée ---
    if (this.state === 'approach') {
      const b = this.barricade;
      if (!b) { this.state = 'chase'; }
      else {
        const target = b.outsidePos();
        const dx = target.x - this.pos.x, dz = target.z - this.pos.z;
        const dd = Math.hypot(dx, dz);
        this.yaw = Math.atan2(-dx, -dz);
        if (dd < 1.1) {
          this.state = b.passable ? 'climb' : 'tearing';
          this.climbT = 0;
        } else {
          const sp = this.speed * 0.9;
          this.pos.x += (dx / dd) * sp * dt;
          this.pos.z += (dz / dd) * sp * dt;
        }
        this.group.position.copy(this.pos);
        this.group.rotation.y = this.yaw;
        this._animate(dt, this.speed);
        return;
      }
    }

    if (this.state === 'tearing') {
      const b = this.barricade;
      if (!b || b.passable) { this.state = 'climb'; this.climbT = 0; }
      else {
        this.tearTimer -= dt;
        if (this.tearTimer <= 0) {
          this.tearTimer = 1.05;
          b.tearPlank(mgr.effects);
        }
        // gestes d'arrachage
        this.armL.rotation.x = -2.5 + Math.sin(performance.now() * 0.012) * 0.7;
        this.armR.rotation.x = -2.5 - Math.sin(performance.now() * 0.012) * 0.7;
        this.group.position.copy(this.pos);
        this.group.rotation.y = this.yaw;
        return;
      }
    }

    if (this.state === 'climb') {
      const b = this.barricade;
      this.climbT += dt;
      const t = clamp(this.climbT / 1.15, 0, 1);
      if (b) {
        const from = b.outsidePos();
        const to = b.insidePos();
        this.pos.x = from.x + (to.x - from.x) * t;
        this.pos.z = from.z + (to.z - from.z) * t;
        this.yaw = Math.atan2(-(to.x - from.x), -(to.z - from.z));
      }
      // le corps se hisse puis retombe
      this.group.position.set(this.pos.x, this.pos.y + Math.sin(t * Math.PI) * 0.55, this.pos.z);
      this.group.rotation.y = this.yaw;
      this.group.rotation.z = Math.sin(t * Math.PI) * 0.3;
      this.armL.rotation.x = -2.6;
      this.armR.rotation.x = -2.6;
      if (t >= 1) {
        this.state = 'chase';
        this.group.rotation.z = 0;
        this.barricade = null;
        Sfx.zombieGrowl();
      }
      return;
    }

    const toPlayer = new THREE.Vector3(player.pos.x - this.pos.x, 0, player.pos.z - this.pos.z);
    const distance = toPlayer.length();
    if (distance > 0.001) toPlayer.multiplyScalar(1 / distance);

    // Orientation
    const targetYaw = Math.atan2(-toPlayer.x, -toPlayer.z);
    let diff = targetYaw - this.yaw;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    this.yaw += clamp(diff, -3.5 * dt, 3.5 * dt);

    this.stagger = Math.max(0, this.stagger - dt);
    this.attackCd = Math.max(0, this.attackCd - dt);
    this.growlCd -= dt;
    if (this.growlCd <= 0) {
      this.growlCd = rand(4, 11);
      if (distance < 30 && Math.random() < 0.6) {
        if (d.big) Sfx.bruteRoar(); else Sfx.zombieGrowl();
      }
    }

    let speed = this.speed * (1 - this.stagger * 1.4);
    speed = Math.max(0, speed);

    // --- Capacités des gros zombies ---
    if (d.charge) {
      this.chargeCd -= dt;
      if (this.charging > 0) {
        this.charging -= dt;
        speed = this.speed * 3.4;
        if (Math.random() < 0.6) {
          this.mgr.effects.smoke(new THREE.Vector3(this.pos.x, 0.2, this.pos.z), 1, 0x6a5a4a, 0.6);
        }
        if (distance < d.reach * 0.9 && this.attackCd <= 0) {
          this._hitPlayer(player, d.damage * 1.4, toPlayer, 14);
          this.charging = 0;
          this.chargeCd = rand(6, 9);
        }
      } else if (this.chargeCd <= 0 && distance > 8 && distance < 40) {
        this.charging = 2.2;
        this.chargeCd = rand(7, 11);
        Sfx.bruteRoar();
      }
    }

    if (d.slam) {
      this.slamCd -= dt;
      if (this.slamWind > 0) {
        this.slamWind -= dt;
        speed = 0;
        this.armL.rotation.x = damp(this.armL.rotation.x, -2.4, 12, dt);
        this.armR.rotation.x = damp(this.armR.rotation.x, -2.4, 12, dt);
        if (this.slamWind <= 0) this._slam(player);
      } else if (this.slamCd <= 0 && distance < d.reach * 2.1) {
        this.slamWind = 0.75;
        this.slamCd = rand(5, 8);
      }
    }

    if (d.summon && this.alive) {
      const ratio = this.health / this.maxHealth;
      for (const th of [0.75, 0.5, 0.25]) {
        if (ratio < th && !this.summonedAt.includes(th)) {
          this.summonedAt.push(th);
          mgr.summonAround(this.pos, 4);
          Sfx.bruteRoar();
        }
      }
    }

    // --- Attaque ---
    if (d.ranged) {
      if (distance < d.reach && this.attackCd <= 0 && hasLineOfSight(
        new THREE.Vector3(this.pos.x, 1.4, this.pos.z),
        new THREE.Vector3(player.pos.x, player.pos.y + 1.2, player.pos.z), world.obstacles)) {
        this.attackCd = d.attackRate;
        mgr.spawnSpit(this, player);
        this.armR.rotation.x = -2.6;
      }
      if (distance < 7) speed *= -0.6;             // le cracheur garde ses distances
      else if (distance < 14) speed *= 0.2;
    } else if (distance < d.reach + PLAYER.radius) {
      if (d.bloated) {
        // Attaque suicide : il se déchire sur place.
        this.health = 0;
        this.kill(false, toPlayer, mgr.effects);
        return;
      }
      if (this.attackCd <= 0 && this.slamWind <= 0) {
        this.attackCd = d.attackRate;
        this._hitPlayer(player, d.damage, toPlayer, d.big ? 7 : 2);
        this.armR.rotation.x = -2.2;
      }
      speed *= 0.15;
    }

    // --- Déplacement : champ de navigation + séparation ---
    // Près du joueur on repasse en poursuite directe, plus fluide que la grille.
    let steerX = toPlayer.x, steerZ = toPlayer.z;
    if (distance > 3.5 && mgr.nav) {
      const flow = mgr.nav.direction(this.pos.x, this.pos.z, mgr._flow);
      if (flow) {
        // mélange progressif pour éviter les virages à angle droit
        const w = clamp((distance - 3.5) / 4, 0, 1);
        steerX = toPlayer.x * (1 - w) + flow.x * w;
        steerZ = toPlayer.z * (1 - w) + flow.z * w;
        const len = Math.hypot(steerX, steerZ) || 1;
        steerX /= len; steerZ /= len;
      }
    }

    const sep = mgr.separation(this);
    let mx = steerX * speed + sep.x;
    let mz = steerZ * speed + sep.z;

    // léger zigzag pour éviter les files indiennes, seulement en espace ouvert
    if (distance > 6 && !d.big) {
      this.wander = damp(this.wander, Math.sin(performance.now() * 0.0004 + this.walkPhase) * 0.8, 1.5, dt);
      mx += -steerZ * this.wander * 0.18;
      mz += steerX * this.wander * 0.18;
    }

    this.vel.x = damp(this.vel.x, mx, 9, dt);
    this.vel.z = damp(this.vel.z, mz, 9, dt);

    const prevX = this.pos.x, prevZ = this.pos.z;
    this.pos.x += this.vel.x * dt;
    this.pos.z += this.vel.z * dt;

    resolveCircleBoxes(this.pos, this.radius, world.obstacles, 1.8 * d.scale);

    // Si bloqué, on tente de contourner
    if (Math.abs(this.pos.x - prevX) < 0.001 && Math.abs(this.pos.z - prevZ) < 0.001 && speed > 0.2) {
      this.pos.x += -steerZ * dt * speed * 0.8;
      this.pos.z += steerX * dt * speed * 0.8;
      resolveCircleBoxes(this.pos, this.radius, world.obstacles, 1.8 * d.scale);
    }

    const lim = world.half - 1;
    this.pos.x = clamp(this.pos.x, -lim, lim);
    this.pos.z = clamp(this.pos.z, -lim, lim);

    this.group.position.copy(this.pos);
    this.group.rotation.y = this.yaw;
    this.group.rotation.x = 0;

    this._animate(dt, Math.hypot(this.vel.x, this.vel.z));
    this._updateBar(player);

    // Signal visuel : plus le boursouflé est près, plus il palpite.
    if (d.bloated && this.belly) {
      const urgency = clamp(1 - (distance - d.reach) / 10, 0, 1);
      const pulse = 1 + Math.sin(this.walkPhase * (3 + urgency * 14)) * (0.06 + urgency * 0.14);
      this.belly.scale.setScalar(pulse);
      const glow = urgency * (0.5 + Math.sin(this.walkPhase * 18) * 0.5);
      this.mat.emissive.setRGB(glow * 0.55, glow * 0.6, glow * 0.1);
    }
  }

  _hitPlayer(player, damage, dir, knock) {
    const d3 = new THREE.Vector3(dir.x, 0, dir.z);
    player.takeDamage(damage, this.pos);
    player.push(d3, knock);
    this.mgr.effects.addShake(this.def.big ? 0.8 : 0.3);
  }

  _slam(player) {
    const radius = this.def.reach * 1.8;
    const dist = dist2D(this.pos, player.pos);
    Sfx.slam();
    const e = this.mgr.effects;
    e.addShake(1.1);
    const center = new THREE.Vector3(this.pos.x, 0.1, this.pos.z);
    e.smoke(center, 26, 0x6b5f4d, 3);
    e.decal(center, new THREE.Vector3(0, 1, 0), 0x1a1512, radius, 18);
    for (let i = 0; i < 40; i++) {
      const a = (i / 40) * Math.PI * 2;
      e.emit(center.x, 0.1, center.z, {
        vx: Math.cos(a) * rand(6, 13), vy: rand(1, 4), vz: Math.sin(a) * rand(6, 13),
        color: new THREE.Color(0x8a7a63), size: rand(0.06, 0.18), life: rand(0.4, 0.9), gravity: 18,
      });
    }
    if (dist < radius) {
      const dir = new THREE.Vector3(player.pos.x - this.pos.x, 0, player.pos.z - this.pos.z).normalize();
      const falloff = 1 - dist / radius;
      player.takeDamage(this.def.damage * (0.5 + falloff * 0.8), this.pos);
      player.push(dir, 9 * falloff);
      player.vel.y += 4 * falloff;
    }
    this.armL.rotation.x = 0.6;
    this.armR.rotation.x = 0.6;
  }

  _animate(dt, speed) {
    this.walkPhase += dt * (2.2 + speed * 1.6);
    const sw = Math.sin(this.walkPhase * 2) * clamp(speed / 3, 0.15, 1);

    if (this.def.crawler) {
      // Reptation : les bras tirent le corps, les jambes traînent derrière.
      this.armL.rotation.x = damp(this.armL.rotation.x, -2.5 + sw * 0.8, 9, dt);
      this.armR.rotation.x = damp(this.armR.rotation.x, -2.5 - sw * 0.8, 9, dt);
      this.armL.rotation.z = 0.5 + sw * 0.2;
      this.armR.rotation.z = -0.5 - sw * 0.2;
      this.legL.rotation.x = 1.0 + sw * 0.45;
      this.legR.rotation.x = 1.0 - sw * 0.45;
      this.legL.rotation.z = 0.3;
      this.legR.rotation.z = -0.3;
      this.torso.rotation.y = Math.sin(this.walkPhase) * 0.2;
      this.torso.rotation.x = 0;
      this.head.rotation.x = 0.95;               // la tête se relève vers la proie
      this.head.rotation.z = Math.sin(this.walkPhase * 0.8) * 0.2;
      this.jaw.rotation.x = 0.25 + Math.abs(Math.sin(this.walkPhase * 1.6)) * 0.4;
      this.group.position.y = this.pos.y + Math.abs(Math.sin(this.walkPhase * 2)) * 0.03;
      return;
    }

    this.legL.rotation.x = sw * 0.9;
    this.legR.rotation.x = -sw * 0.9;
    this.armL.rotation.x = damp(this.armL.rotation.x, -1.5 + sw * 0.35, 6, dt);
    this.armR.rotation.x = damp(this.armR.rotation.x, -1.5 - sw * 0.35, 6, dt);
    this.armL.rotation.z = 0.18 + Math.sin(this.walkPhase) * 0.06;
    this.armR.rotation.z = -0.18 - Math.sin(this.walkPhase) * 0.06;
    this.torso.rotation.y = Math.sin(this.walkPhase) * 0.12;
    this.torso.rotation.x = 0.16;
    this.head.rotation.z = Math.sin(this.walkPhase * 0.7) * 0.14;
    this.jaw.rotation.x = 0.2 + Math.abs(Math.sin(this.walkPhase * 1.3)) * 0.35;
    this.group.position.y = this.pos.y + Math.abs(Math.sin(this.walkPhase * 2)) * 0.045 * this.def.scale;
  }

  _updateBar(player) {
    if (!this.barBg) return;
    const ratio = clamp(this.health / this.maxHealth, 0, 1);
    this.barFg.scale.x = this.barWidth * ratio;
    this.barFg.position.x = -this.barWidth * (1 - ratio) / 2;
    // orienté vers la caméra (annule la rotation du groupe)
    const yaw = Math.atan2(player.pos.x - this.pos.x, player.pos.z - this.pos.z);
    this.barBg.rotation.y = yaw - this.yaw;
    this.barFg.rotation.y = yaw - this.yaw;
  }
}

/** Projectile acide du cracheur. */
class Spit {
  constructor(scene) {
    this.mesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.16, 8, 6),
      new THREE.MeshBasicMaterial({ color: 0xb6d43a })
    );
    this.mesh.visible = false;
    scene.add(this.mesh);
    this.pos = new THREE.Vector3();
    this.vel = new THREE.Vector3();
    this.life = 0;
    this.damage = 0;
  }
}

export class ZombieManager {
  constructor(scene, world, effects) {
    this.scene = scene;
    this.world = world;
    this.effects = effects;
    this.zombies = [];
    this.pools = {};
    this.spits = [];
    this.spitPool = [];
    this._spheres = [];
    this.onKill = null;
    this.onBloat = null;     // (zombie) => void, câblé par le jeu
    this.boss = null;
    this.gibs = [];
    this.gibPool = [];
    this.nav = world.nav || null;
    this._flow = new THREE.Vector3();
  }

  /** Morceaux projetés quand un corps est pulvérisé. */
  spawnGibs(center, dir, scale, color) {
    const count = 7;
    for (let i = 0; i < count; i++) {
      let gib = this.gibPool.pop();
      if (!gib) {
        gib = {
          mesh: new THREE.Mesh(GEO.gib, new THREE.MeshPhongMaterial({ color: 0x8a2b2b })),
          vel: new THREE.Vector3(), spin: new THREE.Vector3(), life: 0,
        };
        gib.mesh.castShadow = true;
        this.scene.add(gib.mesh);
      }
      gib.mesh.material.color.copy(color).multiplyScalar(rand(0.5, 0.9));
      gib.mesh.visible = true;
      gib.mesh.position.copy(center);
      gib.mesh.scale.setScalar(scale * rand(0.6, 1.5));
      gib.vel.set(
        dir.x * rand(2, 7) + rand(-4.5, 4.5),
        rand(3, 8),
        dir.z * rand(2, 7) + rand(-4.5, 4.5)
      );
      gib.spin.set(rand(-9, 9), rand(-9, 9), rand(-9, 9));
      gib.life = rand(3.5, 6);
      this.gibs.push(gib);
    }
  }

  _updateGibs(dt) {
    for (let i = this.gibs.length - 1; i >= 0; i--) {
      const g = this.gibs[i];
      g.life -= dt;
      if (g.life <= 0) {
        g.mesh.visible = false;
        this.gibs.splice(i, 1);
        this.gibPool.push(g);
        continue;
      }
      g.vel.y -= 24 * dt;
      g.mesh.position.addScaledVector(g.vel, dt);
      if (g.mesh.position.y < 0.08) {
        g.mesh.position.y = 0.08;
        g.vel.y *= -0.32;
        g.vel.x *= 0.6; g.vel.z *= 0.6;
        g.spin.multiplyScalar(0.5);
        if (Math.abs(g.vel.y) < 0.6) { g.vel.set(0, 0, 0); g.spin.set(0, 0, 0); }
      }
      g.mesh.rotation.x += g.spin.x * dt;
      g.mesh.rotation.y += g.spin.y * dt;
      g.mesh.rotation.z += g.spin.z * dt;
      if (g.life < 1) g.mesh.scale.multiplyScalar(1 - dt * 0.9);
    }
  }

  /** Détonation d'un boursouflé : dégâts autour de lui, joueur compris. */
  bloatExplosion(zombie) {
    const p = new THREE.Vector3(zombie.pos.x, 1 * zombie.def.scale, zombie.pos.z);
    const e = this.effects;
    e.addShake(0.7);
    Sfx.explosion();
    for (let i = 0; i < 70; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = rand(4, 15);
      e.emit(p.x, p.y, p.z, {
        vx: Math.cos(a) * sp, vy: rand(-1, 8), vz: Math.sin(a) * sp,
        color: new THREE.Color(0xb9d43a).multiplyScalar(rand(0.6, 1.2)),
        size: rand(0.08, 0.3), life: rand(0.5, 1.3), gravity: 12, drag: 2,
      });
    }
    e.smoke(p, 18, 0x6d7a2a, 2.2);
    e.decal(new THREE.Vector3(p.x, 0.02, p.z), new THREE.Vector3(0, 1, 0), 0x3a4512, zombie.def.blastRadius * 0.9, 20);
    if (this.onBloat) this.onBloat(zombie, p);
  }

  _obtain(type) {
    const pool = this.pools[type] || (this.pools[type] = []);
    let z = pool.pop();
    if (!z) {
      z = new Zombie(this, type);
      this.scene.add(z.group);
    }
    return z;
  }

  spawn(type, pos, healthMul = 1, speedMul = 1, barricade = null) {
    const z = this._obtain(type);
    z.mgr = this;
    z.spawn(pos, healthMul, speedMul, barricade);
    z.yaw = Math.atan2(-pos.x, -pos.z);
    this.zombies.push(z);
    if (z.def.boss) this.boss = z;
    return z;
  }

  summonAround(pos, count) {
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2 + Math.random();
      const p = new THREE.Vector3(pos.x + Math.cos(a) * 5, 0, pos.z + Math.sin(a) * 5);
      p.x = clamp(p.x, -this.world.half + 2, this.world.half - 2);
      p.z = clamp(p.z, -this.world.half + 2, this.world.half - 2);
      this.spawn(Math.random() < 0.5 ? 'coureur' : 'marcheur', p, 1, 1);
    }
  }

  spawnSpit(zombie, player) {
    let s = this.spitPool.pop();
    if (!s) s = new Spit(this.scene);
    const from = new THREE.Vector3(zombie.pos.x, 1.5 * zombie.def.scale, zombie.pos.z);
    const to = new THREE.Vector3(player.pos.x, player.pos.y + 1.1, player.pos.z);
    const dir = to.sub(from);
    const dist = dir.length();
    dir.normalize();
    const speed = zombie.def.projectileSpeed;
    // tir en cloche : on compense la chute
    const t = dist / speed;
    s.pos.copy(from);
    s.vel.copy(dir).multiplyScalar(speed);
    s.vel.y += 0.5 * 9 * t;
    s.life = 4;
    s.damage = zombie.def.damage;
    s.mesh.visible = true;
    s.mesh.position.copy(s.pos);
    this.spits.push(s);
    Sfx.spit();
  }

  separation(z) {
    let sx = 0, sz = 0;
    const r = z.radius * 2.1;
    for (const o of this.zombies) {
      if (o === z || !o.alive || o.state === 'rise') continue;
      const dx = z.pos.x - o.pos.x;
      const dz = z.pos.z - o.pos.z;
      const d2 = dx * dx + dz * dz;
      const rr = r + o.radius;
      if (d2 > rr * rr || d2 < 1e-5) continue;
      const d = Math.sqrt(d2);
      const push = (rr - d) / rr;
      // les gros ne se laissent pas bousculer
      const w = (o.def.mass / z.def.mass) * 3.2;
      sx += (dx / d) * push * w;
      sz += (dz / d) * push * w;
    }
    return { x: sx, z: sz };
  }

  /**
   * Test de tir : renvoie le premier zombie touché le long du rayon.
   * exclude : ensemble de zombies déjà traversés (perforation).
   */
  raycast(origin, dir, maxDist, exclude = null) {
    let best = null;
    for (const z of this.zombies) {
      if (!z.alive || z.state === 'rise') continue;
      if (exclude && exclude.has(z)) continue;
      // rejet rapide
      const dx = z.pos.x - origin.x, dz = z.pos.z - origin.z, dy = z.pos.y + 1 - origin.y;
      const along = dx * dir.x + dy * dir.y + dz * dir.z;
      if (along < -2 || along > maxDist + 2) continue;

      z.hitSpheres(this._spheres);
      for (const s of this._spheres) {
        const t = raySphere(origin, dir, s, s.r, maxDist);
        if (t >= 0 && (!best || t < best.dist)) {
          best = { zombie: z, dist: t, part: s.part, mul: s.mul, wi: s.wi ?? -1 };
        }
      }
    }
    return best;
  }

  update(dt, player) {
    this._updateGibs(dt);
    for (let i = this.zombies.length - 1; i >= 0; i--) {
      const z = this.zombies[i];
      z.update(dt, player, this.world, this);
      if (z.dead) {
        this.zombies.splice(i, 1);
        (this.pools[z.type] || (this.pools[z.type] = [])).push(z);
        if (this.boss === z) this.boss = null;
      }
    }

    // Projectiles acides
    for (let i = this.spits.length - 1; i >= 0; i--) {
      const s = this.spits[i];
      s.life -= dt;
      s.vel.y -= 9 * dt;
      s.pos.addScaledVector(s.vel, dt);
      s.mesh.position.copy(s.pos);
      let hit = false;
      if (s.pos.y <= 0.15) {
        hit = true;
        this.effects.decal(new THREE.Vector3(s.pos.x, 0.02, s.pos.z), new THREE.Vector3(0, 1, 0), 0x3d4a12, 1.6, 12);
      }
      if (dist2D(s.pos, player.pos) < 0.8 && Math.abs(s.pos.y - (player.pos.y + 1)) < 1.4) {
        hit = true;
        player.takeDamage(s.damage, s.pos);
      }
      for (const b of this.world.obstacles) {
        if (b.containsXZ(s.pos.x, s.pos.z, 0.1) && s.pos.y < b.max.y) { hit = true; break; }
      }
      if (hit || s.life <= 0) {
        this.effects.blood(s.pos, new THREE.Vector3(0, 1, 0), 14, 0xa8c832);
        s.mesh.visible = false;
        this.spits.splice(i, 1);
        this.spitPool.push(s);
      }
    }
  }

  aliveCount() {
    let n = 0;
    for (const z of this.zombies) if (z.alive) n++;
    return n;
  }

  /** Dégâts de zone (explosions). Renvoie la liste des zombies tués. */
  splash(center, radius, damage, effects) {
    const killed = [];
    for (const z of this.zombies) {
      if (!z.alive) continue;
      const d = dist2D(z.pos, center);
      if (d > radius) continue;
      const falloff = 1 - d / radius;
      const dir = new THREE.Vector3(z.pos.x - center.x, 0, z.pos.z - center.z);
      if (dir.lengthSq() < 1e-6) dir.set(0, 0, 1);
      dir.normalize();
      z.damage(damage * falloff, 'torso', 1, dir, effects, false);
      if (!z.alive) killed.push(z);
    }
    return killed;
  }

  clear() {
    for (const z of this.zombies) {
      z.group.visible = false;
      (this.pools[z.type] || (this.pools[z.type] = [])).push(z);
    }
    this.zombies.length = 0;
    for (const s of this.spits) { s.mesh.visible = false; this.spitPool.push(s); }
    this.spits.length = 0;
    for (const g of this.gibs) { g.mesh.visible = false; this.gibPool.push(g); }
    this.gibs.length = 0;
    this.boss = null;
  }
}
