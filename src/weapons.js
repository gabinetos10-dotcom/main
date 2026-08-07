import * as THREE from '../vendor/three.module.js';
import { WEAPONS, MELEE } from './config.js';
import { rand, damp, clamp } from './utils.js';
import { Sfx } from './audio.js';

/** Construit un modèle « vue première personne » à partir de boîtes simples. */
function buildViewModel(id) {
  const g = new THREE.Group();
  const dark = new THREE.MeshLambertMaterial({ color: 0x3c4149 });
  const metal = new THREE.MeshLambertMaterial({ color: 0x767c88 });
  const wood = new THREE.MeshLambertMaterial({ color: 0x7a5330 });

  const add = (geo, mat, x, y, z, rx = 0, ry = 0, rz = 0) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.rotation.set(rx, ry, rz);
    g.add(m);
    return m;
  };

  let muzzleZ = -0.5;
  if (id === 'precision') {
    add(new THREE.BoxGeometry(0.085, 0.1, 1.02), dark, 0, 0, -0.34);
    add(new THREE.BoxGeometry(0.044, 0.044, 0.44), metal, 0, 0, -0.94);        // canon long
    add(new THREE.BoxGeometry(0.1, 0.17, 0.34), wood, 0, -0.05, 0.26, -0.1);   // crosse
    add(new THREE.BoxGeometry(0.055, 0.18, 0.1), dark, 0, -0.14, 0.02, 0.32);  // poignée
    add(new THREE.CylinderGeometry(0.045, 0.045, 0.34, 10), metal, 0, 0.115, -0.3, Math.PI / 2); // lunette
    add(new THREE.CylinderGeometry(0.058, 0.058, 0.05, 10), dark, 0, 0.115, -0.47, Math.PI / 2);
    add(new THREE.BoxGeometry(0.02, 0.05, 0.02), metal, 0, 0.07, -0.18);
    add(new THREE.BoxGeometry(0.02, 0.05, 0.02), metal, 0, 0.07, -0.42);
    muzzleZ = -1.18;
  } else if (id === 'pistolet') {
    add(new THREE.BoxGeometry(0.075, 0.1, 0.42), dark, 0, 0, -0.16);
    add(new THREE.BoxGeometry(0.06, 0.2, 0.1), dark, 0, -0.14, 0.02, 0.28);
    add(new THREE.BoxGeometry(0.04, 0.04, 0.12), metal, 0, 0.005, -0.4);
    add(new THREE.BoxGeometry(0.012, 0.03, 0.02), metal, 0, 0.062, -0.33);
    muzzleZ = -0.47;
  } else if (id === 'fusil') {
    add(new THREE.BoxGeometry(0.1, 0.11, 0.86), dark, 0, 0, -0.28);
    add(new THREE.BoxGeometry(0.075, 0.075, 0.5), metal, 0, -0.085, -0.42);   // pompe
    add(new THREE.BoxGeometry(0.09, 0.16, 0.3), wood, 0, -0.06, 0.22, -0.12);  // crosse
    add(new THREE.BoxGeometry(0.055, 0.17, 0.09), wood, 0, -0.14, 0.0, 0.3);
    add(new THREE.BoxGeometry(0.02, 0.035, 0.02), metal, 0, 0.075, -0.62);
    muzzleZ = -0.74;
  } else {
    add(new THREE.BoxGeometry(0.095, 0.12, 0.78), dark, 0, 0, -0.24);
    add(new THREE.BoxGeometry(0.06, 0.22, 0.13), dark, 0, -0.16, 0.04, 0.22);  // chargeur
    add(new THREE.BoxGeometry(0.055, 0.18, 0.1), dark, 0, -0.14, -0.06, 0.34); // poignée
    add(new THREE.BoxGeometry(0.05, 0.05, 0.3), metal, 0, 0.0, -0.62);         // canon
    add(new THREE.BoxGeometry(0.07, 0.05, 0.2), metal, 0, 0.085, -0.18);       // rail
    add(new THREE.BoxGeometry(0.02, 0.04, 0.02), metal, 0, 0.115, -0.34);
    muzzleZ = -0.78;
  }

  const muzzle = new THREE.Object3D();
  muzzle.position.set(0, 0.005, muzzleZ);
  g.add(muzzle);

  // Éclair de bouche
  const flash = new THREE.Mesh(
    new THREE.SphereGeometry(0.12, 8, 6),
    new THREE.MeshBasicMaterial({ color: 0xffd27a, transparent: true, opacity: 0, depthWrite: false })
  );
  flash.position.copy(muzzle.position);
  flash.scale.set(1, 1, 1.8);
  g.add(flash);

  const light = new THREE.PointLight(0xffc46b, 0, 9, 2);
  light.position.copy(muzzle.position);
  g.add(light);

  g.traverse((o) => {
    if (!o.isMesh) return;
    o.castShadow = false;
    o.frustumCulled = false;
  });
  return { group: g, muzzle, flash, light };
}

export class WeaponSystem {
  constructor(camera, player, effects, scene) {
    this.camera = camera;
    this.player = player;
    this.effects = effects;
    this.scene = scene;

    // L'arme est rendue dans une passe séparée, avec sa propre scène, sa propre
    // caméra (champ de vision plus serré) et son propre éclairage. C'est la
    // méthode classique en FPS : le modèle ne traverse jamais les murs et reste
    // lisible quelle que soit la lumière ambiante.
    this.vmScene = new THREE.Scene();
    this.vmCamera = new THREE.PerspectiveCamera(52, 1, 0.01, 10);
    this.vmScene.add(this.vmCamera);

    this.holder = new THREE.Group();
    this.vmCamera.add(this.holder);

    const keyLight = new THREE.DirectionalLight(0xe6eefa, 2.1);
    keyLight.position.set(0.7, 1.1, 0.6);
    this.vmScene.add(keyLight, keyLight.target);
    const fill = new THREE.DirectionalLight(0x8fa8c6, 0.85);
    fill.position.set(-0.9, -0.3, 0.5);
    this.vmScene.add(fill, fill.target);
    this.vmScene.add(new THREE.AmbientLight(0x50607a, 1.1));

    // Halo projeté dans le monde à chaque tir
    this.worldFlash = new THREE.PointLight(0xffc46b, 0, 14, 2);
    scene.add(this.worldFlash);

    this.slots = {};
    this.order = ['pistolet', 'fusil', 'assaut', 'precision'];
    for (const id of this.order) {
      const def = WEAPONS[id];
      const vm = buildViewModel(id);
      // Reculée et légèrement réduite : à 0,3 m d'une caméra grand angle, une
      // arme à l'échelle réelle occuperait la moitié de l'écran.
      vm.group.scale.setScalar(0.72);
      vm.group.position.set(0.24, -0.2, -0.62);
      vm.group.visible = false;
      this.holder.add(vm.group);
      this.slots[id] = {
        def,
        vm,
        unlocked: id === 'pistolet',
        ammo: def.magSize,
        reserve: def.reserve,
      };
    }

    this.current = 'pistolet';
    this.slots.pistolet.vm.group.visible = true;

    this.cooldown = 0;
    this.reloading = false;
    this.reloadTimer = 0;
    this.switching = 0;
    this.recoil = 0;
    this.recoilPitch = 0;
    this.recoilYaw = 0;
    this.kick = 0;
    this.sway = new THREE.Vector2();
    this.flashTime = 0;
    this.aiming = false;
    this.aimAmount = 0;
    this.shotCount = 0;
    this.meleeCd = 0;
    this.meleeAnim = 0;

    this.onFire = null;      // (origin, dir, damage, opts) => void
    this.onMelee = null;     // () => void, résolu par le jeu
    this.onEmpty = null;
    this.basePos = new THREE.Vector3(0.24, -0.2, -0.62);
    this.aimPos = new THREE.Vector3(0.0, -0.105, -0.5);
    this._v = new THREE.Vector3();
    this._d = new THREE.Vector3();
    this._m = new THREE.Vector3();
  }

  setAspect(a) {
    this.vmCamera.aspect = a;
    this.vmCamera.updateProjectionMatrix();
  }

  /**
   * Position de la bouche du canon dans le monde.
   * Le modèle vit dans une scène à part, dont le repère est celui de la
   * caméra : il suffit donc de repasser ces coordonnées en repère monde.
   */
  muzzleWorld(out = new THREE.Vector3()) {
    this.slot.vm.muzzle.getWorldPosition(out);
    return this.camera.localToWorld(out);
  }

  get slot() { return this.slots[this.current]; }
  get def() { return this.slot.def; }

  magSize(id = this.current) {
    return Math.max(1, Math.floor(WEAPONS[id].magSize * this.player.stats.magMul));
  }

  reset() {
    for (const id of this.order) {
      const s = this.slots[id];
      s.unlocked = id === 'pistolet';
      s.ammo = s.def.magSize;
      s.reserve = s.def.reserve;
      s.vm.group.visible = id === 'pistolet';
    }
    this.current = 'pistolet';
    this.reloading = false;
    this.cooldown = 0;
    this.recoil = 0;
  }

  unlock(id) {
    const s = this.slots[id];
    if (!s || s.unlocked) return false;
    s.unlocked = true;
    s.ammo = this.magSize(id);
    s.reserve = s.def.reserve;
    return true;
  }

  addAmmo(id, amount) {
    const s = this.slots[id];
    if (!s || s.reserve === Infinity) return;
    s.reserve = Math.min(s.def.reserve * 2, s.reserve + amount);
  }

  refillAll(fraction = 0.5) {
    for (const id of this.order) {
      const s = this.slots[id];
      if (!s.unlocked || s.reserve === Infinity) continue;
      s.reserve = Math.min(s.def.reserve * 2, s.reserve + Math.ceil(s.def.reserve * fraction));
    }
  }

  switchTo(id) {
    if (id === this.current) return;
    const s = this.slots[id];
    if (!s || !s.unlocked) return;
    this.slot.vm.group.visible = false;
    this.current = id;
    s.vm.group.visible = true;
    this.reloading = false;
    this.switching = 0.32;
    this.cooldown = Math.max(this.cooldown, 0.28);
  }

  cycle(dir) {
    const unlocked = this.order.filter((id) => this.slots[id].unlocked);
    if (unlocked.length < 2) return;
    let i = unlocked.indexOf(this.current);
    i = (i + (dir > 0 ? 1 : -1) + unlocked.length) % unlocked.length;
    this.switchTo(unlocked[i]);
  }

  canFire() {
    return this.cooldown <= 0 && !this.reloading && this.switching <= 0
      && this.meleeAnim <= 0 && this.slot.ammo > 0;
  }

  /** Champ de vision voulu : la lunette du fusil de précision resserre fort. */
  desiredFov(baseFov, sprinting) {
    const zoom = this.def.zoom || (baseFov - 16);
    return (baseFov + (sprinting ? 6 : 0)) * (1 - this.aimAmount) + zoom * this.aimAmount;
  }

  /** Le viseur à lunette est-il collé à l'œil ? */
  get scoped() {
    return !!this.def.zoom && this.aimAmount > 0.6;
  }

  startReload() {
    const s = this.slot;
    const max = this.magSize();
    if (this.reloading || s.ammo >= max) return;
    if (s.reserve !== Infinity && s.reserve <= 0) return;
    this.reloading = true;
    const base = s.def.id === 'fusil' ? s.def.reloadShell : s.def.reload;
    this.reloadTimer = base * this.player.stats.reloadMul;
    Sfx.reload();
  }

  _finishReload() {
    const s = this.slot;
    const max = this.magSize();
    if (s.def.id === 'fusil') {
      // rechargement cartouche par cartouche
      if (s.reserve > 0 && s.ammo < max) {
        s.ammo++;
        if (s.reserve !== Infinity) s.reserve--;
      }
      if (s.ammo < max && (s.reserve === Infinity || s.reserve > 0)) {
        this.reloadTimer = s.def.reloadShell * this.player.stats.reloadMul;
        Sfx.reload();
        return;
      }
      this.reloading = false;
      Sfx.reloadEnd();
      return;
    }
    const need = max - s.ammo;
    if (s.reserve === Infinity) {
      s.ammo = max;
    } else {
      const take = Math.min(need, s.reserve);
      s.ammo += take;
      s.reserve -= take;
    }
    this.reloading = false;
    Sfx.reloadEnd();
  }

  fire() {
    const s = this.slot;
    const def = s.def;
    const st = this.player.stats;

    s.ammo--;
    this.shotCount++;
    const rpm = def.rpm * st.fireRateMul;
    this.cooldown = 60 / rpm;

    const spreadBase = def.spread * (this.aiming ? 0.45 : 1) * (this.player.sprinting ? 1.6 : 1);
    const dmg = def.damage * st.damageMul;
    const pierce = def.pierce + st.pierce;

    const origin = this.player.eyePos.clone();
    const camDir = this._d.set(0, 0, -1).applyEuler(this.camera.rotation);

    for (let i = 0; i < def.pellets; i++) {
      const dir = camDir.clone();
      const spread = def.pellets > 1 ? spreadBase : spreadBase * rand(0.2, 1);
      // dispersion en cône
      const a = Math.random() * Math.PI * 2;
      const r = Math.sqrt(Math.random()) * spread;
      const up = new THREE.Vector3(0, 1, 0);
      const rightV = new THREE.Vector3().crossVectors(dir, up).normalize();
      const upV = new THREE.Vector3().crossVectors(rightV, dir).normalize();
      dir.addScaledVector(rightV, Math.cos(a) * r).addScaledVector(upV, Math.sin(a) * r).normalize();

      let dmgOut = dmg;
      let crit = false;
      if (Math.random() < st.critChance) { dmgOut *= st.critMul; crit = true; }

      if (this.onFire) {
        this.onFire(origin, dir, dmgOut, {
          range: def.range,
          pierce,
          crit,
          explosive: st.explosive,
          weapon: def.id,
        });
      }
    }

    // Recul
    const rec = def.recoil * (this.aiming ? 0.7 : 1);
    this.recoil = Math.min(1.6, this.recoil + rec * 0.16);
    this.recoilPitch += rec * 0.0085;
    this.recoilYaw += rand(-1, 1) * rec * 0.0035;
    this.kick = Math.min(0.16, this.kick + rec * 0.016);
    this.flashTime = 0.05;
    this.effects.addShake(def.id === 'fusil' ? 0.45 : 0.16);
    Sfx.shoot(def.id);
    this.ejectShell();
  }

  ejectShell() {
    const def = this.def;
    const world = this.muzzleWorld(this._m.clone());
    const right = new THREE.Vector3(1, 0, 0).applyEuler(this.camera.rotation);
    const c = new THREE.Color(def.shellColor);
    this.effects.emit(world.x, world.y, world.z, {
      vx: right.x * rand(2, 4) + rand(-0.5, 0.5),
      vy: rand(1.5, 3),
      vz: right.z * rand(2, 4) + rand(-0.5, 0.5),
      color: c,
      size: 0.05,
      life: 1.4,
      gravity: 18,
      drag: 0.4,
    });
    // fumée de bouche
    this.effects.smoke(world, 2, 0x8a8a8a, 0.25);
  }

  update(dt, input) {
    const s = this.slot;
    this.cooldown = Math.max(0, this.cooldown - dt);
    this.switching = Math.max(0, this.switching - dt);

    // Visée
    this.aiming = input.active && input.mouseDown(2) && !this.player.sprinting;
    this.aimAmount = damp(this.aimAmount, this.aiming ? 1 : 0, 16, dt);

    // Rechargement
    if (this.reloading) {
      this.reloadTimer -= dt;
      if (this.reloadTimer <= 0) this._finishReload();
    }

    // Changement d'arme
    if (input.pressed('Digit1')) this.switchTo('pistolet');
    if (input.pressed('Digit2')) this.switchTo('fusil');
    if (input.pressed('Digit3')) this.switchTo('assaut');
    if (input.pressed('Digit4')) this.switchTo('precision');
    if (input.wheel !== 0) this.cycle(input.wheel);
    if (input.pressed('KeyR')) this.startReload();

    this.meleeCd = Math.max(0, this.meleeCd - dt);
    this.meleeAnim = Math.max(0, this.meleeAnim - dt);
    if ((input.pressed('KeyF') || input.pressed('KeyV')) && this.meleeCd <= 0 && input.active) {
      this.meleeCd = MELEE.cooldown;
      this.meleeAnim = 0.32;
      this.effects.addShake(0.12);
      Sfx.melee();
      if (this.onMelee) this.onMelee();
    }

    // Tir
    const wantsFire = s.def.auto ? input.mouseDown(0) : input.mouseClicked(0);
    if (wantsFire && input.active) {
      if (this.canFire()) {
        this.fire();
      } else if (s.ammo <= 0 && !this.reloading && this.cooldown <= 0) {
        Sfx.dryFire();
        this.cooldown = 0.25;
        this.startReload();
      }
    }
    // Rechargement automatique quand le chargeur est vide
    if (s.ammo <= 0 && !this.reloading && this.switching <= 0) this.startReload();

    this.animate(dt, input);
  }

  animate(dt, input) {
    const vm = this.slot.vm;
    const g = vm.group;

    // Amortissement du recul
    this.recoil = damp(this.recoil, 0, 9, dt);
    this.kick = damp(this.kick, 0, 12, dt);
    this.recoilPitch = damp(this.recoilPitch, 0, 7, dt);
    this.recoilYaw = damp(this.recoilYaw, 0, 7, dt);

    // Le recul de visée est rendu à la caméra puis récupéré progressivement
    this.player.pitch = clamp(this.player.pitch + this.recoilPitch * dt * 12, -1.5, 1.5);
    this.player.yaw += this.recoilYaw * dt * 12;
    this.player.recoilRoll = -this.recoilYaw * 0.6;

    // Ballant lié à la souris
    this.sway.x = damp(this.sway.x, clamp(-input.mouseDX * 0.0016, -0.06, 0.06), 12, dt);
    this.sway.y = damp(this.sway.y, clamp(-input.mouseDY * 0.0016, -0.06, 0.06), 12, dt);

    const p = this.player;
    const bobX = Math.cos(p.bob) * 0.02 * p.bobAmount * (1 - this.aimAmount * 0.8);
    const bobY = Math.abs(Math.sin(p.bob)) * 0.018 * p.bobAmount * (1 - this.aimAmount * 0.8);

    const target = this._v.copy(this.basePos).lerp(this.aimPos, this.aimAmount);
    let sprintTilt = 0;
    if (p.sprinting) { sprintTilt = 0.5; }

    const switchDrop = this.switching > 0 ? Math.sin((this.switching / 0.32) * Math.PI) * 0.28 : 0;
    const reloadDrop = this.reloading ? 0.12 : 0;
    // Coup de crosse : l'arme part en arrière puis balaie vers l'avant.
    const mt = this.meleeAnim > 0 ? this.meleeAnim / 0.32 : 0;
    const meleeSwing = Math.sin(mt * Math.PI) * (mt > 0.5 ? 1 : -0.55);

    g.position.x = damp(g.position.x, target.x + this.sway.x + bobX, 14, dt);
    g.position.y = damp(g.position.y, target.y + this.sway.y + bobY - switchDrop - reloadDrop - sprintTilt * 0.06, 14, dt);
    g.position.z = damp(g.position.z, target.z + this.kick + meleeSwing * 0.22, 18, dt);

    g.rotation.x = damp(g.rotation.x, -this.sway.y * 2.5 + this.recoil * 0.35 + reloadDrop * 2.2 + switchDrop * 1.5 - meleeSwing * 0.5, 14, dt);
    g.rotation.y = damp(g.rotation.y, this.sway.x * 2.5 + sprintTilt * 0.35 + meleeSwing * 0.6, 14, dt);
    g.rotation.z = damp(g.rotation.z, -this.sway.x * 1.5 + sprintTilt * 0.5 + (this.reloading ? 0.35 : 0) + meleeSwing * 0.7, 14, dt);

    // Éclair de bouche
    this.flashTime = Math.max(0, this.flashTime - dt);
    const f = this.flashTime / 0.05;
    vm.flash.material.opacity = f * 0.95;
    vm.flash.scale.set(0.6 + f * 0.9, 0.6 + f * 0.9, 1.2 + f * 1.6);
    vm.flash.rotation.z = Math.random() * 6.28;
    vm.light.intensity = f * 6;

    // À la lunette, le modèle disparaît au profit de l'optique plein écran
    g.visible = !this.scoped;

    // Le halo qui éclaire réellement la scène autour du joueur
    this.worldFlash.intensity = f * 22;
    if (f > 0) this.muzzleWorld(this.worldFlash.position);
  }

  ammoText() {
    const s = this.slot;
    const res = s.reserve === Infinity ? '∞' : s.reserve;
    return `${s.ammo} / ${res}`;
  }
}
