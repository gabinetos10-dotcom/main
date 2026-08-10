import * as THREE from '../vendor/three.module.js';
import {
  ZOMBIES, DIFFICULTIES, COMBO, MELEE, GRENADE,
  ECONOMY, ROUNDS, POWERUP_RULES,
} from './config.js';
import { Input } from './input.js';
import { GameMap } from './map.js';
import { Effects } from './effects.js';
import { Player } from './player.js';
import { WeaponSystem } from './weapons.js';
import { ZombieManager } from './enemies.js';
import { PickupManager } from './pickups.js';
import { GrenadeManager } from './grenades.js';
import { InteractionManager } from './interactables.js';
import { PowerupManager } from './powerups.js';
import { HUD } from './hud.js';
import { Store } from './store.js';
import { initAudio, resumeAudio, Sfx, setVolume } from './audio.js';
import { rayAABB, randInt, clamp, dist2D } from './utils.js';

const $ = (id) => document.getElementById(id);

export class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.state = 'menu';
    this.time = 0;
    this.pendingSpawns = 0;

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.25;
    // Atténuation linéaire des lampes plutôt que la décroissance physique en
    // 1/d² : dans un intérieur éclairé au néon, elle donne des halos lisibles
    // sans devoir monter les intensités à plusieurs centaines.
    this.renderer.useLegacyLights = true;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(72, window.innerWidth / window.innerHeight, 0.05, 400);
    this.scene.add(this.camera);

    this.input = new Input(canvas);
    this.map = new GameMap(this.scene);
    this.world = this.map;                    // les systèmes existants parlent de « world »
    this.effects = new Effects(this.scene, this.camera, $('popup-layer'));
    this.player = new Player(this.camera, this.map, this.effects);
    this.weapons = new WeaponSystem(this.camera, this.player, this.effects, this.scene);
    this.zombies = new ZombieManager(this.scene, this.map, this.effects);
    this.pickups = new PickupManager(this.scene, this.map, this.effects, this.player, this.weapons);
    this.grenades = new GrenadeManager(this.scene, this.map, this.effects);
    this.pickups.grenades = this.grenades;
    this.interactions = new InteractionManager(this.scene, this.map);
    this.powerups = new PowerupManager(this.scene, this.effects);
    this.hud = new HUD();

    this.baseFov = 72;
    this.round = 0;
    this.spawnQueue = [];
    this.spawnTimer = 0;
    this.breakTimer = 0;
    this.roundActive = false;
    this.powered = false;
    this.hitStop = 0;
    this.combo = 0;
    this.comboTimer = 0;
    this.comboTier = -1;
    this.interactHold = 0;
    this.holdTarget = null;
    this.stats = this._freshStats();

    this.difficulty = DIFFICULTIES[Store.settings.difficulty] || DIFFICULTIES.veteran;
    this.records = Store.records;

    this._wire();
    this._bindUI();
    this._applySettings();

    window.addEventListener('resize', () => this.resize());
    this.resize();

    this.clock = new THREE.Clock();
    this.loop = this.loop.bind(this);
    requestAnimationFrame(this.loop);
  }

  // ---------------------------------------------------------------- câblage

  _freshStats() {
    return {
      shots: 0, hits: 0, headshots: 0, melee: 0, grenades: 0,
      bestCombo: 0, explosions: 0, doors: 0, perks: 0, boxUses: 0,
      bestRound: 0, downs: 0,
    };
  }

  _wire() {
    this.weapons.onFire = (origin, dir, damage, opts) => this.hitscan(origin, dir, damage, opts);
    this.weapons.onMelee = () => this.resolveMelee();

    this.player.onDamage = (amount, fromPos) => {
      Sfx.playerHurt();
      this.hud.flashDamage(amount);
      this.effects.addShake(clamp(amount / 40, 0.15, 0.8));
      if (fromPos) {
        const dx = fromPos.x - this.player.pos.x;
        const dz = fromPos.z - this.player.pos.z;
        this.hud.damageFrom(-(Math.atan2(dx, dz) - this.player.yaw) + Math.PI);
      }
      if (this.player.downed && this.state === 'playing' && !this.downAnnounced) {
        this.downAnnounced = true;
        Sfx.downed();
        this.hud.announce('À TERRE', 'Second souffle : vous vous relevez seul', 2.6, '#ff6b6b');
        this.stats.downs++;
      }
      if (!this.player.alive) this.gameOver();
    };

    this.pickups.onExplosion = (pos, radius, damage) => {
      this.areaDamage(pos, radius, damage, 0.25, '💥');
    };
    this.grenades.onExplode = (pos, radius, damage) => {
      this.areaDamage(pos, radius, damage, GRENADE.selfDamageMul, '💣');
    };
    this.zombies.onBloat = (zombie, pos) => {
      this.areaDamage(pos, zombie.def.blastRadius, zombie.def.blastDamage * 3.2, 0.55, '☣');
    };
    this.powerups.onCollect = (def) => this.applyPowerup(def);

    this.input.onLockChange = (locked) => {
      if (locked) $('mouse-hint').classList.add('hidden');
      else if (this.state === 'playing') this.pause();
    };
    this.input.onFallback = () => {
      $('mouse-hint').classList.remove('hidden');
      this.hud.toast('Souris non capturée — mode visée libre', '#7fdcff', '🖱');
    };
  }

  _bindUI() {
    $('btn-play').addEventListener('click', () => this.start());
    $('btn-resume').addEventListener('click', () => this.resume());
    $('btn-restart').addEventListener('click', () => this.start());
    $('btn-restart-dead').addEventListener('click', () => this.start());
    $('btn-quit').addEventListener('click', () => this.toMenu());
    $('btn-quit-dead').addEventListener('click', () => this.toMenu());

    this.optionsReturn = 'screen-menu';
    $('btn-options').addEventListener('click', () => { this.optionsReturn = 'screen-menu'; this.show('screen-options'); });
    $('btn-options-pause').addEventListener('click', () => { this.optionsReturn = 'screen-pause'; this.show('screen-options'); });
    $('btn-options-back').addEventListener('click', () => this.show(this.optionsReturn));

    this.canvas.addEventListener('click', () => {
      if (this.state === 'playing') this.input.requestLock();
    });

    for (const btn of document.querySelectorAll('.diff-option')) {
      btn.addEventListener('click', () => {
        this.difficulty = DIFFICULTIES[btn.dataset.diff];
        Store.settings.difficulty = this.difficulty.id;
        Store.saveSettings();
        this.updateDifficultyUI();
      });
    }

    const st = Store.settings;
    const persist = () => Store.saveSettings();
    $('opt-sens').addEventListener('input', (e) => {
      st.sensitivity = parseFloat(e.target.value);
      this.input.sensitivity = 0.0022 * st.sensitivity;
      $('opt-sens-val').textContent = st.sensitivity.toFixed(2) + '×';
      persist();
    });
    $('opt-volume').addEventListener('input', (e) => {
      st.volume = parseFloat(e.target.value);
      $('opt-volume-val').textContent = Math.round(st.volume * 100) + '%';
      setVolume(st.volume * 0.8);
      persist();
    });
    $('opt-fov').addEventListener('input', (e) => {
      st.fov = parseFloat(e.target.value);
      this.baseFov = st.fov;
      $('opt-fov-val').textContent = Math.round(st.fov) + '°';
      persist();
    });
    $('opt-quality').addEventListener('input', (e) => {
      st.quality = parseFloat(e.target.value);
      $('opt-quality-val').textContent = Math.round(st.quality * 100) + '%';
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2) * st.quality);
      this.resize();
      persist();
    });
    $('opt-invert').addEventListener('change', (e) => {
      st.invertY = e.target.checked; this.input.invertY = st.invertY; persist();
    });
    $('opt-shadows').addEventListener('change', (e) => {
      st.shadows = e.target.checked;
      this.renderer.shadowMap.enabled = st.shadows;
      this.scene.traverse((o) => { if (o.isMesh && o.material) o.material.needsUpdate = true; });
      persist();
    });
    $('opt-grain').addEventListener('change', (e) => {
      st.grain = e.target.checked;
      $('film-grain').classList.toggle('hidden', !st.grain);
      persist();
    });
  }

  _applySettings() {
    const st = Store.settings;
    if (st.grain === undefined) st.grain = true;
    this.input.sensitivity = 0.0022 * st.sensitivity;
    this.input.invertY = st.invertY;
    setVolume(st.volume * 0.8);
    this.renderer.shadowMap.enabled = st.shadows;
    this.baseFov = st.fov;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2) * st.quality);
    this.resize();

    $('opt-sens').value = st.sensitivity;
    $('opt-sens-val').textContent = st.sensitivity.toFixed(2) + '×';
    $('opt-volume').value = st.volume;
    $('opt-volume-val').textContent = Math.round(st.volume * 100) + '%';
    $('opt-invert').checked = st.invertY;
    $('opt-shadows').checked = st.shadows;
    $('opt-fov').value = st.fov;
    $('opt-fov-val').textContent = Math.round(st.fov) + '°';
    $('opt-quality').value = st.quality;
    $('opt-quality-val').textContent = Math.round(st.quality * 100) + '%';
    $('opt-grain').checked = st.grain;
    $('film-grain').classList.toggle('hidden', !st.grain);

    this.hud.updateRecords(this.records);
    this.updateDifficultyUI();
  }

  updateDifficultyUI() {
    for (const btn of document.querySelectorAll('.diff-option')) {
      btn.classList.toggle('active', btn.dataset.diff === this.difficulty.id);
    }
  }

  // ---------------------------------------------------------------- économie

  addPoints(amount, showPopup = true) {
    if (amount <= 0) return 0;
    const mul = this.powerups.doublePoints ? 2 : 1;
    const total = Math.round(amount * mul);
    this.player.points += total;
    this.player.pointsEarned += total;
    this.player.score += total;
    if (showPopup) this.hud.pointPopup(total);
    return total;
  }

  spend(amount) {
    this.player.points = Math.max(0, this.player.points - amount);
    this.hud.pointPopup(-amount);
  }

  setPower(on) {
    this.powered = on;
    this.map.setPower(on);
    if (on) {
      this.hud.announce('COURANT RÉTABLI', 'Distributeurs et poste d\'amélioration actifs', 3, '#7fe9ff');
      this.hud.toast('Alimentation en marche', '#7fe9ff', '⚡');
    }
  }

  // ---------------------------------------------------------------- états

  show(id) {
    for (const s of document.querySelectorAll('.screen')) s.classList.add('hidden');
    if (id) $(id).classList.remove('hidden');
  }

  start() {
    initAudio();
    resumeAudio();
    this.zombies.clear();
    this.pickups.clear();
    this.grenades.reset();
    this.powerups.reset();
    this.effects.reset();
    this.player.reset();
    this.weapons.reset();
    this.interactions.reset();

    // Toutes les zones se referment, sauf le hall de départ.
    for (const z of Object.values(this.map.zones)) z.open = z.id === 'hall';
    this.map.closeAllDoors();
    this.map.setPower(false);
    this.powered = false;
    this.downAnnounced = false;

    this.round = 0;
    this.spawnQueue.length = 0;
    this.pendingSpawns = 0;
    this.roundActive = false;
    this.breakTimer = 4;
    this.combo = 0;
    this.comboTimer = 0;
    this.comboTier = -1;
    this.hitStop = 0;
    this.interactHold = 0;
    this.holdTarget = null;
    this.stats = this._freshStats();
    this.state = 'playing';

    for (let i = 0; i < 5; i++) {
      this.pickups.spawnBarrel(this.map.freePosition(this.player.pos, 8, 1.2));
    }

    this.hud.updateWeaponList(this.weapons);
    this.hud.updatePerks(this.player);
    this.hud.setPrompt(null);
    this.hud.announce('TENEZ BON', 'Ils arrivent par les fenêtres', 2.8);
    this.show(null);
    $('hud').classList.remove('hidden');
    this.input.requestLock();
  }

  pause() {
    if (this.state !== 'playing') return;
    this.state = 'paused';
    this.show('screen-pause');
    this.input.exitLock();
  }

  resume() {
    if (this.state !== 'paused') return;
    this.state = 'playing';
    this.show(null);
    this.input.requestLock();
    resumeAudio();
  }

  toMenu() {
    this.state = 'menu';
    this.zombies.clear();
    this.pickups.clear();
    this.powerups.reset();
    this.effects.reset();
    this.show('screen-menu');
    $('hud').classList.add('hidden');
    this.input.exitLock();
  }

  gameOver() {
    if (this.state === 'dead') return;
    this.state = 'dead';
    Sfx.gameOver();
    this.input.exitLock();

    const acc = this.stats.shots ? Math.round((this.stats.hits / this.stats.shots) * 100) : 0;
    const beaten = Store.submitRun({
      score: this.player.pointsEarned, wave: this.round, kills: this.player.kills,
    });
    this.records = Store.records;

    $('res-wave').textContent = this.round;
    $('res-kills').textContent = this.player.kills;
    $('res-score').textContent = this.player.pointsEarned.toLocaleString('fr-FR');
    $('res-acc').textContent = acc + '%';
    $('res-head').textContent = this.stats.headshots;
    $('res-upg').textContent = Object.keys(this.player.perks).length;
    $('res-combo').textContent = '×' + this.stats.bestCombo;
    $('res-diff').textContent = this.difficulty.name;

    const badge = $('res-record');
    if (beaten.score || beaten.wave) {
      badge.classList.remove('hidden');
      badge.textContent = beaten.score && beaten.wave
        ? 'NOUVEAU RECORD — points et manche'
        : beaten.score ? 'NOUVEAU RECORD — total de points' : 'NOUVEAU RECORD — manche la plus lointaine';
      Sfx.record();
    } else {
      badge.classList.add('hidden');
    }
    this.hud.updateRecords(this.records);

    this.show('screen-dead');
    $('hud').classList.add('hidden');
  }

  // ---------------------------------------------------------------- manches

  roundHealthMul(n) {
    if (n <= ROUNDS.healthExpFrom) return 1 + (n - 1) * ROUNDS.healthStep;
    const base = 1 + (ROUNDS.healthExpFrom - 1) * ROUNDS.healthStep;
    return base * Math.pow(ROUNDS.healthExpRate, n - ROUNDS.healthExpFrom);
  }

  roundSpeedMul(n) {
    if (n < ROUNDS.speedFrom) return 0.82;
    if (n < ROUNDS.sprintFrom) return 0.95 + (n - ROUNDS.speedFrom) * 0.035;
    return Math.min(1.45, 1.12 + (n - ROUNDS.sprintFrom) * 0.03);
  }

  roundComposition(n) {
    const diff = this.difficulty;
    const total = Math.max(4, Math.round((ROUNDS.baseCount + ROUNDS.perRound * (n - 1)) * diff.count));
    const list = [];
    const runners = n >= 3 ? Math.floor(total * clamp(0.1 + n * 0.03, 0, 0.4)) : 0;
    const crawlers = n >= 5 ? Math.min(10, Math.floor((n - 4) * 0.7)) : 0;
    const spitters = n >= 7 ? Math.min(5, Math.floor(1 + (n - 7) * 0.3)) : 0;
    const bloaters = n >= 6 ? Math.min(6, Math.floor(1 + (n - 6) * 0.3)) : 0;
    const brutes = n >= 8 ? Math.min(6, 1 + Math.floor((n - 8) / 3)) : 0;
    const boss = n >= 10 && n % 10 === 0 ? Math.floor(n / 10) : 0;

    const walkers = Math.max(2, total - runners - crawlers - spitters - bloaters);
    for (let i = 0; i < walkers; i++) list.push('marcheur');
    for (let i = 0; i < runners; i++) list.push('coureur');
    for (let i = 0; i < crawlers; i++) list.push('rampant');
    for (let i = 0; i < spitters; i++) list.push('cracheur');
    for (let i = 0; i < bloaters; i++) list.push('boursoufle');
    for (let i = 0; i < brutes; i++) list.push('brute');
    for (let i = 0; i < boss; i++) list.push('colosse');

    for (let i = list.length - 1; i > 0; i--) {
      const j = randInt(0, i);
      [list[i], list[j]] = [list[j], list[i]];
    }
    return list;
  }

  startRound() {
    this.round++;
    this.stats.bestRound = Math.max(this.stats.bestRound, this.round);
    this.spawnQueue = this.roundComposition(this.round);
    this.pendingSpawns = this.spawnQueue.length;
    this.roundActive = true;
    this.spawnTimer = 1.4;

    const diff = this.difficulty;
    this.healthMul = this.roundHealthMul(this.round) * diff.health;
    this.speedMul = this.roundSpeedMul(this.round) * diff.speed;
    this.spawnDelay = Math.max(ROUNDS.spawnMin, ROUNDS.spawnInterval - this.round * 0.06) / diff.count;

    Sfx.roundStart(this.round);
    this.hud.roundBanner(this.round);
  }

  updateRounds(dt) {
    if (!this.roundActive) {
      this.breakTimer -= dt;
      if (this.breakTimer <= 0) this.startRound();
      return;
    }

    if (this.spawnQueue.length) {
      this.spawnTimer -= dt;
      const alive = this.zombies.aliveCount();
      const maxAlive = Math.min(ROUNDS.maxAlive, 8 + this.round * 2);
      if (this.spawnTimer <= 0 && alive < maxAlive) {
        const barricades = this.interactions.activeBarricades();
        if (barricades.length) {
          const type = this.spawnQueue.shift();
          this.pendingSpawns = this.spawnQueue.length;
          const def = ZOMBIES[type];
          // On préfère les fenêtres éloignées, sans toujours prendre la même.
          const sorted = barricades
            .map((b) => ({ b, d: dist2D(b.pos, this.player.pos) }))
            .sort((a, b) => b.d - a.d);
          const choice = sorted[randInt(0, Math.min(3, sorted.length - 1))].b;
          this.zombies.spawn(type, choice.outsidePos(), this.healthMul, this.speedMul, choice);
          this.spawnTimer = this.spawnDelay * (def.big ? 2.4 : 1);
          if (def.boss) {
            this.hud.announce('LE COLOSSE ARRIVE', 'Visez les pustules jaunes', 2.6, '#ff4dd2');
            Sfx.bruteRoar();
          }
        }
      }
    } else if (this.zombies.aliveCount() === 0) {
      this.roundActive = false;
      this.breakTimer = ROUNDS.betweenRounds;
      this.grenades.add(1);
      Sfx.roundEnd();
      this.hud.announce(`MANCHE ${this.round} TERMINÉE`, 'Préparez-vous', 2.4, '#7ee787');
    }
  }

  // ---------------------------------------------------------------- bonus

  applyPowerup(def) {
    this.hud.powerupBanner(def);
    switch (def.id) {
      case 'munitions':
        this.weapons.refillMax();
        this.grenades.count = GRENADE.max;
        break;
      case 'bombe': {
        Sfx.nuke();
        this.effects.addShake(1.4);
        const victims = [...this.zombies.zombies].filter((z) => z.alive && !z.def.boss);
        for (const z of victims) {
          z.kill(false, new THREE.Vector3(0, 0, 1), this.effects);
          this.player.kills++;
        }
        this.addPoints(POWERUP_RULES.bombePoints);
        this.hud.flashScreen('#8fe84b');
        break;
      }
      case 'charpente': {
        let repaired = 0;
        for (const b of this.interactions.barricades) {
          while (b.intactCount < 6) { b.use(this); repaired++; }
        }
        this.addPoints(200);
        this.hud.toast(`${repaired} planches reposées`, '#c98a4b', '🔨');
        break;
      }
      default: break;   // « mort instantanée » et « points doublés » : simples durées
    }
  }

  // ---------------------------------------------------------------- combat

  areaDamage(pos, radius, damage, selfMul, icon) {
    this.stats.explosions++;
    const killed = this.zombies.splash(pos, radius, damage, this.effects);
    for (const z of killed) this.onZombieKilled(z, false);
    if (killed.length >= 3) {
      this.hud.toast(`${killed.length} infectés pulvérisés`, '#ff8a5c', icon);
      this.effects.addShake(0.4);
    }
    const d = dist2D(pos, this.player.pos);
    if (d < radius && selfMul > 0) {
      const falloff = 1 - d / radius;
      this.player.takeDamage(damage * selfMul * falloff, pos);
      const dir = new THREE.Vector3(this.player.pos.x - pos.x, 0.4, this.player.pos.z - pos.z);
      if (dir.lengthSq() < 1e-6) dir.set(0, 1, 0);
      this.player.push(dir.normalize(), 11 * falloff);
    }
    return killed.length;
  }

  resolveMelee() {
    this.stats.melee++;
    const dir = this.player.lookDirection(new THREE.Vector3());
    dir.y = 0;
    if (dir.lengthSq() < 1e-6) return;
    dir.normalize();

    let touched = 0;
    for (const z of this.zombies.zombies) {
      if (!z.alive || z.state === 'approach' || z.state === 'tearing') continue;
      const dx = z.pos.x - this.player.pos.x;
      const dz = z.pos.z - this.player.pos.z;
      const d = Math.hypot(dx, dz);
      if (d > MELEE.range + z.radius) continue;
      if ((dx * dir.x + dz * dir.z) / (d || 1) < MELEE.arc) continue;

      const push = new THREE.Vector3(dx / (d || 1), 0, dz / (d || 1));
      const dmg = this.powerups.instantKill && !z.def.big
        ? z.health * 10
        : MELEE.damage * this.player.stats.damageMul;
      const wasAlive = z.alive;
      z.damage(dmg, 'torso', 1, push, this.effects, false);
      if (z.alive) z.stun(MELEE.stun, push, MELEE.knockback / z.def.mass);
      if (wasAlive && !z.alive) this.onZombieKilled(z, false, true);
      touched++;
    }

    if (touched) {
      Sfx.meleeHit();
      this.effects.addShake(0.3);
      this.hud.hitmark('melee');
      this.hitStop = Math.max(this.hitStop, 0.05);
    }
  }

  throwGrenade() {
    const origin = this.player.eyePos.clone();
    const dir = this.player.lookDirection(new THREE.Vector3());
    const inherit = new THREE.Vector3(this.player.vel.x, 0, this.player.vel.z);
    if (this.grenades.throw(origin, dir, inherit)) this.stats.grenades++;
    else { Sfx.dryFire(); this.hud.toast('Plus de grenades', '#8ea6b3', '💣'); }
  }

  worldRaycast(origin, dir, maxDist) {
    let best = maxDist;
    let normal = null;
    for (const b of this.map.obstacles) {
      const t = rayAABB(origin, dir, b.min, b.max, best);
      if (t >= 0 && t < best) {
        best = t;
        const px = origin.x + dir.x * t, py = origin.y + dir.y * t, pz = origin.z + dir.z * t;
        const eps = 0.02;
        if (Math.abs(px - b.min.x) < eps) normal = new THREE.Vector3(-1, 0, 0);
        else if (Math.abs(px - b.max.x) < eps) normal = new THREE.Vector3(1, 0, 0);
        else if (Math.abs(pz - b.min.z) < eps) normal = new THREE.Vector3(0, 0, -1);
        else if (Math.abs(pz - b.max.z) < eps) normal = new THREE.Vector3(0, 0, 1);
        else normal = new THREE.Vector3(0, py > (b.min.y + b.max.y) / 2 ? 1 : -1, 0);
      }
    }
    if (dir.y < -1e-4) {
      const t = -origin.y / dir.y;
      if (t >= 0 && t < best) { best = t; normal = new THREE.Vector3(0, 1, 0); }
    }
    return normal ? { dist: best, normal } : null;
  }

  hitscan(origin, dir, damage, opts) {
    this.stats.shots++;
    const maxDist = opts.range;
    const excludeZ = new Set();
    const excludeP = new Set();
    const pierce = opts.pierce;
    let travelled = 0;
    let end = origin.clone().addScaledVector(dir, maxDist);
    let didHit = false;

    for (let step = 0; step <= pierce; step++) {
      const remaining = maxDist - travelled;
      if (remaining <= 0) break;
      const from = origin.clone().addScaledVector(dir, travelled);

      const zHit = this.zombies.raycast(from, dir, remaining, excludeZ);
      const pHit = this.pickups.raycast(from, dir, remaining, excludeP);
      const wHit = this.worldRaycast(from, dir, remaining);

      const zd = zHit ? zHit.dist : Infinity;
      const pd = pHit ? pHit.dist : Infinity;
      const wd = wHit ? wHit.dist : Infinity;
      const nearest = Math.min(zd, pd, wd);
      if (!isFinite(nearest)) break;

      const point = from.clone().addScaledVector(dir, nearest);
      end = point;

      if (nearest === wd) {
        this.effects.sparks(point, wHit.normal, 7, 0xffd0a0);
        this.effects.decal(point, wHit.normal, 0x0d0d0d, 0.22, 26);
        break;
      }
      if (nearest === pd) {
        this.pickups.damage(pHit.obj, damage, dir, point);
        excludeP.add(pHit.obj);
        didHit = true;
        break;
      }

      const z = zHit.zombie;
      const wasAlive = z.alive;
      const dmg = this.powerups.instantKill && !z.def.boss ? z.health * 10 : damage;
      z.damage(dmg, zHit.part, zHit.mul, dir, this.effects, opts.crit, zHit.wi);
      this.stats.hits++;
      didHit = true;
      this.addPoints(ECONOMY.hitPoints, false);
      if (zHit.part === 'head') this.stats.headshots++;
      this.hud.hitmark(zHit.part === 'head' ? 'head' : zHit.part === 'weak' ? 'weak' : opts.crit ? 'crit' : 'normal');

      if (wasAlive && !z.alive) this.onZombieKilled(z, zHit.part === 'head');

      if (opts.explosive > 0) {
        const r = 2.2 + opts.explosive * 0.8;
        this.effects.explosion(point, r * 0.7);
        const killed = this.zombies.splash(point, r, damage * 0.55 * opts.explosive, this.effects);
        for (const kz of killed) this.onZombieKilled(kz, false);
      }

      excludeZ.add(z);
      travelled = travelled + nearest + 0.05;
      if (step >= pierce) break;
    }

    const muzzle = this.weapons.muzzleWorld();
    this.effects.tracer(muzzle, end, opts.weapon === 'fusil' ? 0xffc98a : 0xfff2b0);
    return didHit;
  }

  onZombieKilled(z, headshot, melee = false) {
    this.player.kills++;
    this.addCombo();

    let base = ECONOMY.killPoints;
    if (headshot) base += ECONOMY.headshotBonus;
    if (melee) base = ECONOMY.meleeKill;
    if (z.def.big) base *= ECONOMY.bigKillMul;
    const gained = this.addPoints(Math.round(base * this.comboMultiplier));

    if (headshot) this.hud.toast('TÊTE EXPLOSÉE +' + gained, '#ffd166', '💀');
    if (z.def.big) {
      this.hitStop = Math.max(this.hitStop, z.def.boss ? 0.5 : 0.16);
      this.hud.toast(z.def.name + ' ABATTU', z.def.boss ? '#ff4dd2' : '#ff8a5c', '☠');
      this.powerups.tryDrop(z.pos, true);
      if (z.def.boss) this.grenades.add(3);
    } else {
      this.powerups.tryDrop(z.pos);
    }
  }

  // ---------------------------------------------------------------- combo

  addCombo() {
    this.combo++;
    this.comboTimer = COMBO.window;
    this.stats.bestCombo = Math.max(this.stats.bestCombo, this.combo);
    let tier = -1;
    for (let i = 0; i < COMBO.tiers.length; i++) {
      if (this.combo >= COMBO.tiers[i].kills) tier = i;
    }
    if (tier > this.comboTier) {
      this.comboTier = tier;
      const t = COMBO.tiers[tier];
      Sfx.comboUp(tier);
      this.hud.comboBanner(t.label, t.mul);
    }
  }

  get comboMultiplier() {
    return this.comboTier >= 0 ? COMBO.tiers[this.comboTier].mul : 1;
  }

  updateCombo(dt) {
    if (this.comboTimer > 0) {
      this.comboTimer -= dt;
      if (this.comboTimer <= 0) { this.combo = 0; this.comboTier = -1; }
    }
  }

  // ---------------------------------------------------------------- interaction

  updateInteraction(dt) {
    const look = this.player.lookDirection(new THREE.Vector3());
    const target = this.player.downed ? null : this.interactions.findTarget(this.player, look);
    const info = target ? target.prompt(this) : null;

    if (!target || !info) {
      this.hud.setPrompt(null);
      this.interactHold = 0;
      this.holdTarget = null;
      return;
    }
    this.hud.setPrompt(info, this.interactHold, target.holdTime);

    if (!this.input.down('KeyE')) {
      this.interactHold = 0;
      this.holdTarget = null;
      return;
    }

    if (target.holdTime > 0) {
      if (this.holdTarget !== target) { this.holdTarget = target; this.interactHold = 0; }
      this.interactHold += dt;
      if (this.interactHold >= target.holdTime) {
        this.interactHold = 0;
        target.use(this);
      }
    } else if (this.input.pressed('KeyE')) {
      if (info.blocked) {
        Sfx.denied();
        if (info.cost && this.player.points < info.cost) {
          this.hud.toast('Points insuffisants', '#ff6b6b', '✖');
        }
      } else {
        const ok = target.use(this);
        if (ok && target.type === 'door') this.stats.doors++;
        if (ok && target.type === 'perk') this.stats.perks++;
        if (ok && target.type === 'box') this.stats.boxUses++;
      }
    }
  }

  // ---------------------------------------------------------------- boucle

  resize() {
    const w = window.innerWidth, h = window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.weapons.setAspect(w / h);
    this.renderer.setSize(w, h);
  }

  loop() {
    requestAnimationFrame(this.loop);
    const real = Math.min(0.05, this.clock.getDelta());
    this.time += real;

    let dt = real;
    if (this.hitStop > 0) {
      this.hitStop = Math.max(0, this.hitStop - real);
      dt = real * 0.18;
    }

    if (this.state === 'playing') {
      if (this.input.pressed('KeyG') && !this.player.downed) this.throwGrenade();

      this.player.update(dt, this.input);
      if (this.player.downed && this.player.downTimer <= 0) {
        this.player.standUp();
        this.downAnnounced = false;
        Sfx.revive();
        this.hud.announce('DEBOUT', 'Second souffle consommé', 2, '#7ee787');
      }

      this.weapons.update(dt, this.input);
      this.zombies.update(dt, this.player);
      this.grenades.update(dt);
      this.pickups.update(dt, this.time);
      this.powerups.update(dt, this.time, this.player, this);
      this.interactions.update(dt, this.time, this);
      this.updateInteraction(real);
      this.updateRounds(dt);
      this.updateCombo(dt);
      this.map.update(dt, this.time, this.player.pos);
      this.effects.update(dt);
      this.player.syncCamera();

      const targetFov = this.weapons.desiredFov(this.baseFov, this.player.sprinting);
      this.camera.fov += (targetFov - this.camera.fov) * Math.min(1, real * 11);
      this.camera.updateProjectionMatrix();

      this.hud.update(real, this);

      if (this.input.pressed('Escape')) this.pause();
    } else {
      this.effects.update(dt);
      if (this.state === 'menu') {
        // survol lent du hall en fond de menu
        const a = this.time * 0.07;
        this.camera.position.set(Math.cos(a) * 8, 3.2, 22 + Math.sin(a) * 8);
        this.camera.lookAt(0, 2, 22);
        this.map.update(dt, this.time, this.camera.position);
      }
      const pauseVisible = !$('screen-pause').classList.contains('hidden');
      if (this.state === 'paused' && pauseVisible && this.input.pressed('Escape')) this.resume();
    }

    this.renderer.render(this.scene, this.camera);

    if (this.state === 'playing' && !this.weapons.scoped) {
      this.renderer.autoClear = false;
      this.renderer.clearDepth();
      this.renderer.render(this.weapons.vmScene, this.weapons.vmCamera);
      this.renderer.autoClear = true;
    }

    this.input.endFrame();
  }
}
