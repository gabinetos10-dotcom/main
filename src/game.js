import * as THREE from '../vendor/three.module.js';
import { GAME, ZOMBIES, DIFFICULTIES, WAVE_MODIFIERS, COMBO, MELEE, GRENADE } from './config.js';
import { Input } from './input.js';
import { World } from './world.js';
import { Effects } from './effects.js';
import { Player } from './player.js';
import { WeaponSystem } from './weapons.js';
import { ZombieManager } from './enemies.js';
import { PickupManager } from './pickups.js';
import { GrenadeManager } from './grenades.js';
import { Store } from './store.js';
import { HUD } from './hud.js';
import { initAudio, resumeAudio, Sfx, setVolume } from './audio.js';
import { rayAABB, rand, randInt, clamp, dist2D } from './utils.js';

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

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(72, window.innerWidth / window.innerHeight, 0.05, 400);
    this.scene.add(this.camera);

    this.input = new Input(canvas);
    this.world = new World(this.scene);
    this.effects = new Effects(this.scene, this.camera, $('popup-layer'));
    this.player = new Player(this.camera, this.world, this.effects);
    this.weapons = new WeaponSystem(this.camera, this.player, this.effects, this.scene);
    this.zombies = new ZombieManager(this.scene, this.world, this.effects);
    this.pickups = new PickupManager(this.scene, this.world, this.effects, this.player, this.weapons);
    this.grenades = new GrenadeManager(this.scene, this.world, this.effects);
    this.pickups.grenades = this.grenades;
    this.hud = new HUD();

    this.baseFov = 72;
    this.wave = 0;
    this.spawnQueue = [];
    this.spawnTimer = 0;
    this.breakTimer = 0;
    this.waveActive = false;
    this.modifier = null;
    this.hitStop = 0;
    this.combo = 0;
    this.comboTimer = 0;
    this.comboTier = -1;
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

  _wire() {
    this.weapons.onFire = (origin, dir, damage, opts) => this.hitscan(origin, dir, damage, opts);

    this.player.onDamage = (amount, fromPos) => {
      Sfx.playerHurt();
      this.hud.flashDamage(amount);
      this.effects.addShake(clamp(amount / 40, 0.15, 0.8));
      if (fromPos) {
        const dx = fromPos.x - this.player.pos.x;
        const dz = fromPos.z - this.player.pos.z;
        const world = Math.atan2(dx, dz);
        this.hud.damageFrom(-(world - this.player.yaw) + Math.PI);
      }
      if (!this.player.alive) this.gameOver();
    };

    this.pickups.onUpgrade = (up) => {
      this.stats.crystals++;
      this.hud.toast(up.name, '#' + up.color.toString(16).padStart(6, '0'), up.icon);
      this.hud.updateUpgrades(this.player);
      this.player.score += 150;
    };
    this.pickups.onMessage = (msg, color) => {
      this.hud.toast(msg, color || '#ffffff');
      this.hud.updateWeaponList(this.weapons);
    };
    this.pickups.onExplosion = (pos, radius, damage) => {
      this.areaDamage(pos, radius, damage, 0.25, '💥');
    };

    this.weapons.onMelee = () => this.resolveMelee();

    this.grenades.onExplode = (pos, radius, damage) => {
      this.areaDamage(pos, radius, damage, GRENADE.selfDamageMul, '💣');
    };

    this.zombies.onBloat = (zombie, pos) => {
      this.areaDamage(pos, zombie.def.blastRadius, zombie.def.blastDamage * 3.2, 0.55, '☣');
    };

    this.input.onLockChange = (locked) => {
      if (locked) $('mouse-hint').classList.add('hidden');
      else if (this.state === 'playing') this.pause();
    };

    // La capture du pointeur peut être refusée (page embarquée dans une iframe) :
    // on bascule alors sur la visée sans capture, et on explique comment jouer.
    this.input.onFallback = () => {
      $('mouse-hint').classList.remove('hidden');
      this.hud.toast('Souris non capturée — mode visée libre', '#7fdcff', '🖱');
    };
  }

  _freshStats() {
    return {
      shots: 0, hits: 0, headshots: 0, crystals: 0, bestWave: 0,
      melee: 0, grenades: 0, bestCombo: 0, explosions: 0,
    };
  }

  /**
   * Explosion générique : dégâts dégressifs sur les zombies et sur le joueur.
   * Sert aux barils, aux grenades et aux boursouflés.
   */
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

  /** Coup de crosse : cône court devant le joueur, repousse et étourdit. */
  resolveMelee() {
    this.stats.melee++;
    const dir = this.player.lookDirection(new THREE.Vector3());
    dir.y = 0;
    if (dir.lengthSq() < 1e-6) return;
    dir.normalize();

    let touched = 0;
    for (const z of this.zombies.zombies) {
      if (!z.alive) continue;
      const dx = z.pos.x - this.player.pos.x;
      const dz = z.pos.z - this.player.pos.z;
      const d = Math.hypot(dx, dz);
      if (d > MELEE.range + z.radius) continue;
      if ((dx * dir.x + dz * dir.z) / (d || 1) < MELEE.arc) continue;

      const push = new THREE.Vector3(dx / (d || 1), 0, dz / (d || 1));
      const wasAlive = z.alive;
      z.damage(MELEE.damage * this.player.stats.damageMul, 'torso', 1, push, this.effects, false);
      if (z.alive) z.stun(MELEE.stun, push, MELEE.knockback / z.def.mass);
      if (wasAlive && !z.alive) this.onZombieKilled(z, false);
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
    if (this.grenades.throw(origin, dir, inherit)) {
      this.stats.grenades++;
    } else {
      Sfx.dryFire();
      this.hud.toast('Plus de grenades', '#8ea6b3', '💣');
    }
  }

  // ---------------------------------------------------------------- combo

  addCombo(z) {
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
      if (this.comboTimer <= 0) {
        this.combo = 0;
        this.comboTier = -1;
      }
    }
  }

  _applySettings() {
    const st = Store.settings;
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
    this.hud.updateRecords(this.records);
    this.updateDifficultyUI();
  }

  updateDifficultyUI() {
    for (const btn of document.querySelectorAll('.diff-option')) {
      btn.classList.toggle('active', btn.dataset.diff === this.difficulty.id);
    }
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

    // Reprendre le verrouillage souris en cliquant sur la zone de jeu
    this.canvas.addEventListener('click', () => {
      if (this.state === 'playing') this.input.requestLock();
    });

    // Choix de la difficulté sur l'écran d'accueil
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
      st.invertY = e.target.checked;
      this.input.invertY = st.invertY;
      persist();
    });
    $('opt-shadows').addEventListener('change', (e) => {
      st.shadows = e.target.checked;
      this.renderer.shadowMap.enabled = st.shadows;
      this.scene.traverse((o) => { if (o.isMesh && o.material) o.material.needsUpdate = true; });
      persist();
    });
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
    this.effects.reset();
    this.player.reset();
    this.weapons.reset();
    this.wave = 0;
    this.spawnQueue.length = 0;
    this.pendingSpawns = 0;
    this.waveActive = false;
    this.breakTimer = 3;
    this.modifier = null;
    this.combo = 0;
    this.comboTimer = 0;
    this.comboTier = -1;
    this.hitStop = 0;
    this.grenades.reset();
    this.stats = this._freshStats();
    this.state = 'playing';
    this.world.setFog(null);

    this.setupArena();
    this.hud.updateUpgrades(this.player);
    this.hud.updateWeaponList(this.weapons);
    this.hud.announce('PRÉPAREZ-VOUS', `${this.difficulty.name} · la horde arrive…`, 2.6);
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
      score: this.player.score, wave: this.wave, kills: this.player.kills,
    });
    this.records = Store.records;

    $('res-wave').textContent = this.wave;
    $('res-kills').textContent = this.player.kills;
    $('res-score').textContent = this.player.score.toLocaleString('fr-FR');
    $('res-acc').textContent = acc + '%';
    $('res-head').textContent = this.stats.headshots;
    $('res-upg').textContent = this.stats.crystals;
    $('res-combo').textContent = '×' + this.stats.bestCombo;
    $('res-diff').textContent = this.difficulty.name;

    const badge = $('res-record');
    if (beaten.score || beaten.wave) {
      badge.classList.remove('hidden');
      badge.textContent = beaten.score && beaten.wave
        ? 'NOUVEAU RECORD — score et vague'
        : beaten.score ? 'NOUVEAU RECORD — meilleur score' : 'NOUVEAU RECORD — vague la plus lointaine';
      Sfx.record();
    } else {
      badge.classList.add('hidden');
    }
    this.hud.updateRecords(this.records);

    this.show('screen-dead');
    $('hud').classList.add('hidden');
  }

  // ---------------------------------------------------------------- arène

  setupArena() {
    for (let i = 0; i < GAME.barrelCount; i++) {
      this.pickups.spawnBarrel(this.world.freePosition(this.player.pos, 12, 1.2));
    }
    for (let i = 0; i < 2; i++) {
      this.pickups.spawnCrystal(this.world.freePosition(this.player.pos, 10, 2));
    }
  }

  // ---------------------------------------------------------------- vagues

  /** Modificateur de la vague n, ou null pour une vague normale. */
  waveModifier(n) {
    if (n < 3 || n % GAME.bossEveryWaves === 0) return null;   // jamais sur une vague de boss
    if (n % 4 !== 0 && n % 7 !== 0) return null;
    return WAVE_MODIFIERS[(n * 7 + Math.floor(n / 3)) % WAVE_MODIFIERS.length];
  }

  waveComposition(n, mod) {
    const list = [];
    const diff = this.difficulty;
    const countMul = (mod ? mod.count : 1) * diff.count;
    const total = Math.max(3, Math.round((GAME.baseZombies + GAME.zombiesPerWave * (n - 1)) * countMul));

    let runners = n >= 2 ? Math.floor(total * clamp(0.12 + n * 0.035, 0, 0.42)) : 0;
    if (mod && mod.runners) runners = Math.floor(total * 0.8);
    let spitters = n >= 4 ? Math.min(6, Math.floor(1 + (n - 4) * 0.4)) : 0;
    let crawlers = n >= GAME.crawlerFromWave ? Math.min(9, Math.floor(1 + (n - GAME.crawlerFromWave) * 0.6)) : 0;
    if (mod && mod.crawlers) crawlers = Math.floor(total * 0.55);
    let bloaters = n >= GAME.bloaterFromWave ? Math.min(6, Math.floor(1 + (n - GAME.bloaterFromWave) * 0.35)) : 0;
    let brutes = n >= GAME.bruteFromWave ? 1 + Math.floor((n - GAME.bruteFromWave) / 2) : 0;
    if (mod && mod.brutes) brutes = mod.brutes + Math.floor(n / 4);
    brutes = Math.min(brutes, 8);
    const boss = n % GAME.bossEveryWaves === 0 ? Math.max(1, Math.floor(n / 10)) : 0;

    const walkers = Math.max(2, total - runners - spitters - crawlers - bloaters);
    for (let i = 0; i < walkers; i++) list.push('marcheur');
    for (let i = 0; i < runners; i++) list.push('coureur');
    for (let i = 0; i < spitters; i++) list.push('cracheur');
    for (let i = 0; i < crawlers; i++) list.push('rampant');
    for (let i = 0; i < bloaters; i++) list.push('boursoufle');
    for (let i = 0; i < brutes; i++) list.push('brute');
    for (let i = 0; i < boss; i++) list.push('colosse');

    // mélange en gardant les gros vers la fin
    const small = list.filter((t) => !ZOMBIES[t].big);
    const big = list.filter((t) => ZOMBIES[t].big);
    for (let i = small.length - 1; i > 0; i--) {
      const j = randInt(0, i);
      [small[i], small[j]] = [small[j], small[i]];
    }
    const out = [];
    for (let i = 0; i < small.length; i++) {
      out.push(small[i]);
      // on intercale les gros à partir du tiers de la vague
      if (big.length && i > small.length * 0.3 && Math.random() < 0.12) out.push(big.shift());
    }
    while (big.length) out.push(big.shift());
    return out;
  }

  startWave() {
    this.wave++;
    this.stats.bestWave = Math.max(this.stats.bestWave, this.wave);
    this.modifier = this.waveModifier(this.wave);
    this.spawnQueue = this.waveComposition(this.wave, this.modifier);
    this.pendingSpawns = this.spawnQueue.length;
    this.waveActive = true;
    this.spawnTimer = 0.6;

    const diff = this.difficulty;
    const mod = this.modifier;
    this.healthMul = (1 + (this.wave - 1) * 0.16) * diff.health * (mod ? mod.health : 1);
    this.speedMul = (1 + Math.min(0.45, (this.wave - 1) * 0.028)) * diff.speed * (mod ? mod.speed : 1);
    this.world.setFog(mod && mod.fog ? mod.fog : null);

    // Cristaux d'amélioration à faire éclater pendant la vague
    const want = GAME.crystalsPerWave + (this.wave % 3 === 0 ? 1 : 0);
    for (let i = 0; i < want; i++) {
      this.pickups.spawnCrystal(this.world.freePosition(this.player.pos, 14, 2));
    }
    // Barils
    const barrels = this.pickups.shootables.filter((o) => o.kind === 'barrel').length;
    for (let i = barrels; i < GAME.barrelCount; i++) {
      this.pickups.spawnBarrel(this.world.freePosition(this.player.pos, 12, 1.2));
    }
    // Caisses d'armes
    if (this.wave === 2) this.pickups.spawnWeaponCrate(this.world.freePosition(this.player.pos, 10, 1.5), 'fusil');
    if (this.wave === 4) this.pickups.spawnWeaponCrate(this.world.freePosition(this.player.pos, 10, 1.5), 'assaut');
    if (this.wave === GAME.sniperWave) {
      this.pickups.spawnWeaponCrate(this.world.freePosition(this.player.pos, 10, 1.5), 'precision');
    }
    if (this.wave > 4 && this.wave % 3 === 0) {
      const pool = this.wave > GAME.sniperWave ? ['fusil', 'assaut', 'precision'] : ['fusil', 'assaut'];
      this.pickups.spawnWeaponCrate(this.world.freePosition(this.player.pos, 10, 1.5),
        pool[randInt(0, pool.length - 1)]);
    }
    // Caisse de grenades une vague sur deux
    if (this.wave % 2 === 0) {
      this.pickups.spawnDrop(this.world.freePosition(this.player.pos, 9, 1.2), 'grenade');
    }
    // Trousse de soin
    if (Math.random() < GAME.healthCrateChance + (this.player.health < this.player.maxHealth * 0.5 ? 0.4 : 0)) {
      this.pickups.spawnDrop(this.world.freePosition(this.player.pos, 8, 1.2), 'health');
    }

    const isBoss = this.wave % GAME.bossEveryWaves === 0;
    Sfx.waveStart();
    if (mod) {
      this.hud.announce(`VAGUE ${this.wave} — ${mod.name}`, mod.desc, 3.2, mod.color);
      this.hud.setModifier(mod);
    } else {
      this.hud.announce(
        isBoss ? `VAGUE ${this.wave} — COLOSSE` : `VAGUE ${this.wave}`,
        isBoss ? 'Visez les pustules jaunes !' : `${this.spawnQueue.length} infectés en approche`,
        isBoss ? 3.2 : 2.4
      );
      this.hud.setModifier(null);
    }
  }

  updateWaves(dt) {
    if (!this.waveActive) {
      this.breakTimer -= dt;
      if (this.breakTimer <= 0) this.startWave();
      return;
    }

    if (this.spawnQueue.length) {
      this.spawnTimer -= dt;
      const alive = this.zombies.aliveCount();
      if (this.spawnTimer <= 0 && alive < GAME.maxAlive) {
        const type = this.spawnQueue.shift();
        this.pendingSpawns = this.spawnQueue.length;
        const def = ZOMBIES[type];
        const pos = this.world.spawnAwayFrom(this.player.pos, def.big ? 30 : 24);
        this.zombies.spawn(type, pos, this.healthMul * (def.big ? 1 : 1), this.speedMul);
        this.spawnTimer = def.big ? 1.6 : rand(0.35, 0.9) / (1 + this.wave * 0.03);
        if (def.boss) {
          this.hud.announce('LE COLOSSE SE LÈVE', 'Points faibles : pustules jaunes', 2.6);
          Sfx.bruteRoar();
        }
      }
    } else if (this.zombies.aliveCount() === 0) {
      this.waveActive = false;
      this.breakTimer = this.difficulty.waveBreak;
      this.modifier = null;
      this.hud.setModifier(null);
      this.world.setFog(null);
      const bonus = Math.round(500 * this.wave * this.difficulty.scoreMul);
      this.player.score += bonus;
      this.player.heal(15);
      this.weapons.refillAll(0.4);
      this.grenades.add(1);
      this.hud.announce(`VAGUE ${this.wave} TERMINÉE`, `+${bonus} points · réapprovisionnement`, 3);
      this.hud.toast(`Répit : ${this.difficulty.waveBreak} s`, '#7fdcff', '⏱');
      // récompense : un cristal garanti
      this.pickups.spawnCrystal(this.world.freePosition(this.player.pos, 8, 2));
    }
  }

  // ---------------------------------------------------------------- tirs

  worldRaycast(origin, dir, maxDist) {
    let best = maxDist;
    let normal = null;
    for (const b of this.world.obstacles) {
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
    // sol
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
    let pierce = opts.pierce;
    let travelled = 0;
    let start = origin.clone();
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
        // gestion de l'impact au sol
        break;
      }

      if (nearest === pd) {
        this.pickups.damage(pHit.obj, damage, dir, point);
        excludeP.add(pHit.obj);
        didHit = true;
        break;                                  // les objets stoppent la balle
      }

      // Zombie touché
      const z = zHit.zombie;
      const wasAlive = z.alive;
      z.damage(damage, zHit.part, zHit.mul, dir, this.effects, opts.crit, zHit.wi);
      this.stats.hits++;
      didHit = true;
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

    // Traçante depuis la bouche du canon
    const muzzle = this.weapons.muzzleWorld();
    this.effects.tracer(muzzle, end, opts.weapon === 'fusil' ? 0xffc98a : 0xfff2b0);
    return didHit;
  }

  onZombieKilled(z, headshot) {
    this.player.kills++;
    this.addCombo(z);

    const bonus = (headshot ? 1.5 : 1) * this.comboMultiplier * this.difficulty.scoreMul;
    const gained = Math.round(z.def.score * bonus);
    this.player.score += gained;
    if (headshot) this.hud.toast('TÊTE EXPLOSÉE +' + gained, '#ffd166', '💀');

    if (z.def.big) {
      // Court ralenti : la mort d'un gros doit se sentir.
      this.hitStop = Math.max(this.hitStop, z.def.boss ? 0.5 : 0.16);
      this.hud.toast(z.def.name + ' ABATTU', z.def.boss ? '#ff4dd2' : '#ff8a5c', '☠');
      // Récompenses garanties
      const p = z.pos.clone();
      this.pickups.spawnCrystal(p.clone().add(new THREE.Vector3(rand(-2, 2), 0, rand(-2, 2))));
      this.pickups.spawnDrop(p.clone().add(new THREE.Vector3(rand(-2, 2), 0, rand(-2, 2))), 'ammo');
      if (Math.random() < 0.7 || z.def.boss) {
        this.pickups.spawnDrop(p.clone().add(new THREE.Vector3(rand(-3, 3), 0, rand(-3, 3))), 'health');
      }
      if (z.def.boss) {
        this.pickups.spawnCrystal(p.clone().add(new THREE.Vector3(rand(-3, 3), 0, rand(-3, 3))));
        this.pickups.spawnCrystal(p.clone().add(new THREE.Vector3(rand(-3, 3), 0, rand(-3, 3))));
      }
      if (z.def.boss) this.grenades.add(3);
    } else if (Math.random() < 0.08) {
      const roll = Math.random();
      this.pickups.spawnDrop(z.pos.clone(), roll < 0.4 ? 'health' : roll < 0.7 ? 'grenade' : 'ammo');
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

    // Ralenti d'impact : le temps du jeu se fige brièvement sur les gros coups.
    let dt = real;
    if (this.hitStop > 0) {
      this.hitStop = Math.max(0, this.hitStop - real);
      dt = real * 0.18;
    }

    if (this.state === 'playing') {
      if (this.input.pressed('KeyG')) this.throwGrenade();

      this.player.update(dt, this.input);
      this.weapons.update(dt, this.input);
      this.zombies.update(dt, this.player);
      this.grenades.update(dt);
      this.pickups.update(dt, this.time);
      this.updateWaves(dt);
      this.updateCombo(dt);
      this.world.update(dt, this.time);
      this.effects.update(dt);
      this.player.syncCamera();

      // champ de vision : sprint = plus large, visée = plus serré,
      // lunette du fusil de précision = très serré
      const targetFov = this.weapons.desiredFov(this.baseFov, this.player.sprinting);
      this.camera.fov += (targetFov - this.camera.fov) * Math.min(1, real * 11);
      this.camera.updateProjectionMatrix();

      this.hud.update(real, this);

      if (this.input.pressed('Escape')) this.pause();
    } else {
      this.effects.update(dt);
      if (this.state === 'menu') {
        // légère rotation de la caméra en fond de menu
        this.camera.position.set(Math.cos(this.time * 0.08) * 22, 6, Math.sin(this.time * 0.08) * 22);
        this.camera.lookAt(0, 2, 0);
      }
      const pauseVisible = !$('screen-pause').classList.contains('hidden');
      if (this.state === 'paused' && pauseVisible && this.input.pressed('Escape')) this.resume();
    }

    this.renderer.render(this.scene, this.camera);

    // Seconde passe : le modèle d'arme, par-dessus, avec sa propre profondeur
    if (this.state === 'playing' && !this.weapons.scoped) {
      this.renderer.autoClear = false;
      this.renderer.clearDepth();
      this.renderer.render(this.weapons.vmScene, this.weapons.vmCamera);
      this.renderer.autoClear = true;
    }

    this.input.endFrame();
  }
}
