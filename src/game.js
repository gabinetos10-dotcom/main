import * as THREE from '../vendor/three.module.js';
import { GAME, ZOMBIES } from './config.js';
import { Input } from './input.js';
import { World } from './world.js';
import { Effects } from './effects.js';
import { Player } from './player.js';
import { WeaponSystem } from './weapons.js';
import { ZombieManager } from './enemies.js';
import { PickupManager } from './pickups.js';
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
    this.hud = new HUD();

    this.baseFov = 72;
    this.wave = 0;
    this.spawnQueue = [];
    this.spawnTimer = 0;
    this.breakTimer = 0;
    this.waveActive = false;
    this.stats = { shots: 0, hits: 0, headshots: 0, crystals: 0, bestWave: 0 };

    this._wire();
    this._bindUI();

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
      const killed = this.zombies.splash(pos, radius, damage, this.effects);
      for (const z of killed) this.onZombieKilled(z, false);
      if (killed.length >= 3) this.hud.toast(`${killed.length} infectés pulvérisés`, '#ff8a5c', '💥');
      if (dist2D(pos, this.player.pos) < radius) {
        const d = dist2D(pos, this.player.pos);
        const falloff = 1 - d / radius;
        this.player.takeDamage(damage * 0.25 * falloff, pos);
        const dir = new THREE.Vector3(this.player.pos.x - pos.x, 0, this.player.pos.z - pos.z).normalize();
        this.player.push(dir, 10 * falloff);
      }
    };

    this.input.onLockChange = (locked) => {
      if (!locked && this.state === 'playing') this.pause();
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

    // Reprendre le verrouillage souris en cliquant sur la zone de jeu
    this.canvas.addEventListener('click', () => {
      if (this.state === 'playing') this.input.requestLock();
    });

    const sens = $('opt-sens');
    sens.addEventListener('input', () => {
      this.input.sensitivity = 0.0022 * parseFloat(sens.value);
      $('opt-sens-val').textContent = parseFloat(sens.value).toFixed(2) + '×';
    });
    const vol = $('opt-volume');
    vol.addEventListener('input', () => {
      const v = parseFloat(vol.value);
      $('opt-volume-val').textContent = Math.round(v * 100) + '%';
      setVolume(v * 0.8);
    });
    $('opt-invert').addEventListener('change', (e) => { this.input.invertY = e.target.checked; });
    $('opt-shadows').addEventListener('change', (e) => {
      this.renderer.shadowMap.enabled = e.target.checked;
      this.scene.traverse((o) => { if (o.isMesh && o.material) o.material.needsUpdate = true; });
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
    this.stats = { shots: 0, hits: 0, headshots: 0, crystals: 0, bestWave: 0 };
    this.state = 'playing';

    this.setupArena();
    this.hud.updateUpgrades(this.player);
    this.hud.updateWeaponList(this.weapons);
    this.hud.announce('PRÉPAREZ-VOUS', 'La horde arrive…', 2.6);
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
    $('res-wave').textContent = this.wave;
    $('res-kills').textContent = this.player.kills;
    $('res-score').textContent = this.player.score.toLocaleString('fr-FR');
    $('res-acc').textContent = acc + '%';
    $('res-head').textContent = this.stats.headshots;
    $('res-upg').textContent = this.stats.crystals;
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

  waveComposition(n) {
    const list = [];
    const total = Math.round(GAME.baseZombies + GAME.zombiesPerWave * (n - 1));
    let runners = n >= 2 ? Math.floor(total * clamp(0.12 + n * 0.035, 0, 0.42)) : 0;
    let spitters = n >= 4 ? Math.min(6, Math.floor(1 + (n - 4) * 0.4)) : 0;
    let brutes = n >= GAME.bruteFromWave ? 1 + Math.floor((n - GAME.bruteFromWave) / 2) : 0;
    brutes = Math.min(brutes, 6);
    const boss = n % GAME.bossEveryWaves === 0 ? Math.max(1, Math.floor(n / 10)) : 0;

    const walkers = Math.max(2, total - runners - spitters);
    for (let i = 0; i < walkers; i++) list.push('marcheur');
    for (let i = 0; i < runners; i++) list.push('coureur');
    for (let i = 0; i < spitters; i++) list.push('cracheur');
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
    this.spawnQueue = this.waveComposition(this.wave);
    this.pendingSpawns = this.spawnQueue.length;
    this.waveActive = true;
    this.spawnTimer = 0.6;

    this.healthMul = 1 + (this.wave - 1) * 0.16;
    this.speedMul = 1 + Math.min(0.45, (this.wave - 1) * 0.028);

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
    if (this.wave > 4 && this.wave % 3 === 0) {
      const id = Math.random() < 0.5 ? 'fusil' : 'assaut';
      this.pickups.spawnWeaponCrate(this.world.freePosition(this.player.pos, 10, 1.5), id);
    }
    // Trousse de soin
    if (Math.random() < GAME.healthCrateChance + (this.player.health < this.player.maxHealth * 0.5 ? 0.4 : 0)) {
      this.pickups.spawnDrop(this.world.freePosition(this.player.pos, 8, 1.2), 'health');
    }

    const isBoss = this.wave % GAME.bossEveryWaves === 0;
    Sfx.waveStart();
    this.hud.announce(
      isBoss ? `VAGUE ${this.wave} — COLOSSE` : `VAGUE ${this.wave}`,
      isBoss ? 'Visez les pustules jaunes !' : `${this.spawnQueue.length} infectés en approche`,
      isBoss ? 3.2 : 2.4
    );
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
      this.breakTimer = GAME.waveBreak;
      const bonus = 500 * this.wave;
      this.player.score += bonus;
      this.player.heal(15);
      this.weapons.refillAll(0.4);
      this.hud.announce(`VAGUE ${this.wave} TERMINÉE`, `+${bonus} points · munitions réapprovisionnées`, 3);
      this.hud.toast('Répit : ' + GAME.waveBreak + ' s', '#7fdcff', '⏱');
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
    const bonus = headshot ? 1.5 : 1;
    this.player.score += Math.round(z.def.score * bonus);
    if (headshot) this.hud.toast('TÊTE EXPLOSÉE +' + Math.round(z.def.score * 1.5), '#ffd166', '💀');

    if (z.def.big) {
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
    } else if (Math.random() < 0.06) {
      this.pickups.spawnDrop(z.pos.clone(), Math.random() < 0.5 ? 'health' : 'ammo');
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
    const dt = Math.min(0.05, this.clock.getDelta());
    this.time += dt;

    if (this.state === 'playing') {
      this.player.update(dt, this.input);
      this.weapons.update(dt, this.input);
      this.zombies.update(dt, this.player);
      this.pickups.update(dt, this.time);
      this.updateWaves(dt);
      this.world.update(dt, this.time);
      this.effects.update(dt);
      this.player.syncCamera();

      // champ de vision : sprint = plus large, visée = plus serré
      const targetFov = this.baseFov
        + (this.player.sprinting ? 6 : 0)
        - this.weapons.aimAmount * 16;
      this.camera.fov += (targetFov - this.camera.fov) * Math.min(1, dt * 9);
      this.camera.updateProjectionMatrix();

      this.hud.update(dt, this);

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
    if (this.state === 'playing') {
      this.renderer.autoClear = false;
      this.renderer.clearDepth();
      this.renderer.render(this.weapons.vmScene, this.weapons.vmCamera);
      this.renderer.autoClear = true;
    }

    this.input.endFrame();
  }
}
