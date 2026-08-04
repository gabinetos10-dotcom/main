import * as THREE from '../vendor/three.module.js';
import { PLAYER, WORLD, UPGRADES } from './config.js';
import { clamp, damp, resolveCircleBoxes } from './utils.js';

export class Player {
  constructor(camera, world, effects) {
    this.camera = camera;
    this.world = world;
    this.effects = effects;

    this.pos = new THREE.Vector3(0, 0, 0);
    this.vel = new THREE.Vector3();
    this.yaw = 0;
    this.pitch = 0;
    this.onGround = true;

    this.maxHealth = PLAYER.maxHealth;
    this.health = this.maxHealth;
    this.stamina = PLAYER.staminaMax;
    this.crouch = 0;
    this.bob = 0;
    this.bobAmount = 0;
    this.timeSinceDamage = 99;
    this.alive = true;
    this.kills = 0;
    this.score = 0;

    // Statistiques modifiées par les améliorations
    this.stats = {
      damageMul: 1,
      fireRateMul: 1,
      magMul: 1,
      speedMul: 1,
      reloadMul: 1,
      pierce: 0,
      regen: 0,
      critChance: 0.05,
      critMul: 2.2,
      explosive: 0,
    };
    this.upgrades = {};
    for (const u of UPGRADES) this.upgrades[u.id] = 0;

    this.forward = new THREE.Vector3();
    this.right = new THREE.Vector3();
    this._tmp = new THREE.Vector3();
    this.onDamage = null;
  }

  reset() {
    this.pos.set(0, 0, 8);
    this.vel.set(0, 0, 0);
    this.yaw = 0; this.pitch = 0;
    this.maxHealth = PLAYER.maxHealth;
    this.health = this.maxHealth;
    this.stamina = PLAYER.staminaMax;
    this.alive = true;
    this.kills = 0;
    this.score = 0;
    this.timeSinceDamage = 99;
    this.stats = {
      damageMul: 1, fireRateMul: 1, magMul: 1, speedMul: 1, reloadMul: 1,
      pierce: 0, regen: 0, critChance: 0.05, critMul: 2.2, explosive: 0,
    };
    for (const u of UPGRADES) this.upgrades[u.id] = 0;
  }

  applyUpgrade(id) {
    this.upgrades[id] = (this.upgrades[id] || 0) + 1;
    const s = this.stats;
    switch (id) {
      case 'damage': s.damageMul *= 1.15; break;
      case 'firerate': s.fireRateMul *= 1.12; break;
      case 'mag': s.magMul *= 1.25; break;
      case 'speed': s.speedMul *= 1.08; break;
      case 'maxhp':
        this.maxHealth += 20;
        this.health = Math.min(this.maxHealth, this.health + 20);
        break;
      case 'reload': s.reloadMul *= 0.85; break;
      case 'pierce': s.pierce += 1; break;
      case 'regen': s.regen += 1; break;
      case 'crit': s.critChance = clamp(s.critChance + 0.08, 0, 0.85); break;
      case 'explosive': s.explosive += 1; break;
    }
  }

  heal(amount) {
    this.health = Math.min(this.maxHealth, this.health + amount);
  }

  takeDamage(amount, fromPos = null) {
    if (!this.alive) return;
    this.health -= amount;
    this.timeSinceDamage = 0;
    if (this.health <= 0) {
      this.health = 0;
      this.alive = false;
    }
    // notifié après la mise à jour de l'état : le jeu peut y détecter la mort
    if (this.onDamage) this.onDamage(amount, fromPos);
  }

  /** Recul / projection (attaque de brute, explosion). */
  push(dir, force) {
    this.vel.x += dir.x * force;
    this.vel.z += dir.z * force;
    if (dir.y) this.vel.y += dir.y * force;
  }

  get eyeHeight() {
    return PLAYER.eye - this.crouch * (PLAYER.eye - 0.95);
  }

  get eyePos() {
    return this._tmp.set(this.pos.x, this.pos.y + this.eyeHeight, this.pos.z);
  }

  updateLook(input) {
    if (!input.locked) return;
    this.yaw -= input.mouseDX * input.sensitivity;
    const dy = input.mouseDY * input.sensitivity * (input.invertY ? -1 : 1);
    this.pitch = clamp(this.pitch - dy, -Math.PI / 2 + 0.02, Math.PI / 2 - 0.02);
  }

  update(dt, input) {
    if (!this.alive) return;
    this.updateLook(input);

    const wantCrouch = input.down('ControlLeft') || input.down('KeyC');
    this.crouch = damp(this.crouch, wantCrouch ? 1 : 0, 14, dt);

    const mv = input.moveVector();
    const moving = mv.x !== 0 || mv.z !== 0;
    const wantSprint = input.down('ShiftLeft') && mv.z > 0.2 && this.stamina > 1 && !wantCrouch;

    if (wantSprint) this.stamina = Math.max(0, this.stamina - PLAYER.staminaDrain * dt);
    else this.stamina = Math.min(PLAYER.staminaMax, this.stamina + PLAYER.staminaGain * dt);

    const speed = PLAYER.walkSpeed * this.stats.speedMul
      * (wantSprint ? PLAYER.sprintMul : 1)
      * (1 - this.crouch * (1 - PLAYER.crouchMul));
    this.sprinting = wantSprint;

    // Base locale sur le plan horizontal
    this.forward.set(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
    this.right.set(Math.cos(this.yaw), 0, -Math.sin(this.yaw));

    const wishX = this.right.x * mv.x + this.forward.x * mv.z;
    const wishZ = this.right.z * mv.x + this.forward.z * mv.z;

    const accel = this.onGround ? PLAYER.accel : PLAYER.accel * 0.28;
    this.vel.x += wishX * speed * accel * dt / Math.max(1, speed);
    this.vel.z += wishZ * speed * accel * dt / Math.max(1, speed);

    // Frottements horizontaux
    if (this.onGround) {
      const f = Math.max(0, 1 - PLAYER.friction * dt * (moving ? 0.55 : 1));
      this.vel.x *= f;
      this.vel.z *= f;
    }

    // Vitesse horizontale plafonnée
    const hs = Math.hypot(this.vel.x, this.vel.z);
    if (hs > speed) {
      const k = speed / hs;
      this.vel.x *= k; this.vel.z *= k;
    }

    // Saut / gravité
    if (input.down('Space') && this.onGround) {
      this.vel.y = PLAYER.jumpSpeed;
      this.onGround = false;
    }
    this.vel.y -= WORLD.gravity * dt;

    this.pos.x += this.vel.x * dt;
    this.pos.y += this.vel.y * dt;
    this.pos.z += this.vel.z * dt;

    // Sol
    if (this.pos.y <= 0) {
      this.pos.y = 0;
      this.vel.y = 0;
      this.onGround = true;
    }

    // Collisions avec le décor
    resolveCircleBoxes(this.pos, PLAYER.radius, this.world.obstacles, PLAYER.height);

    // Limites de l'arène (sécurité)
    const lim = this.world.half - 1.2;
    this.pos.x = clamp(this.pos.x, -lim, lim);
    this.pos.z = clamp(this.pos.z, -lim, lim);

    // Balancement de marche
    const hspeed = Math.hypot(this.vel.x, this.vel.z);
    this.bob += hspeed * dt * (wantSprint ? 1.5 : 1.1);
    this.bobAmount = damp(this.bobAmount, this.onGround ? Math.min(1, hspeed / 6) : 0, 8, dt);

    // Régénération
    this.timeSinceDamage += dt;
    if (this.stats.regen > 0 && this.timeSinceDamage > PLAYER.regenDelay && this.health < this.maxHealth) {
      this.health = Math.min(this.maxHealth, this.health + PLAYER.regenRate * this.stats.regen * dt);
    }

    this.syncCamera();
  }

  syncCamera() {
    const bobY = Math.sin(this.bob * 2) * 0.055 * this.bobAmount;
    const bobX = Math.cos(this.bob) * 0.045 * this.bobAmount;
    const shake = this.effects ? this.effects.shakeVec : { x: 0, y: 0, z: 0 };
    this.camera.position.set(
      this.pos.x + bobX + shake.x,
      this.pos.y + this.eyeHeight + bobY + shake.y,
      this.pos.z + shake.z
    );
    this.camera.rotation.set(0, 0, 0);
    this.camera.rotation.order = 'YXZ';
    this.camera.rotation.y = this.yaw;
    this.camera.rotation.x = this.pitch;
    this.camera.rotation.z = -bobX * 0.3 + (this.recoilRoll || 0);
  }

  lookDirection(out = new THREE.Vector3()) {
    return out.set(0, 0, -1).applyEuler(this.camera.rotation);
  }
}
