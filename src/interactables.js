import * as THREE from '../vendor/three.module.js';
import {
  WALL_BUYS, BOX_SPOTS, MYSTERY_BOX,
  PERKS, WEAPONS, UPGRADE_STATION, ECONOMY,
} from './config.js';
import { DOORS, WINDOWS } from './map.js';
import { rand, dist2D, clamp, pick } from './utils.js';
import { Sfx } from './audio.js';

const PLANKS_PER_WINDOW = 6;

function textPanel(lines, width = 512, height = 256, opts = {}) {
  const c = document.createElement('canvas');
  c.width = width; c.height = height;
  const g = c.getContext('2d');
  if (opts.bg) { g.fillStyle = opts.bg; g.fillRect(0, 0, width, height); }
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  let y = height / (lines.length + 1);
  for (const line of lines) {
    g.font = `${line.weight || 'bold'} ${line.size || 56}px system-ui, sans-serif`;
    g.fillStyle = line.color || '#ffffff';
    if (opts.stroke) {
      g.lineWidth = 6; g.strokeStyle = 'rgba(0,0,0,0.75)';
      g.strokeText(line.text, width / 2, y);
    }
    g.fillText(line.text, width / 2, y);
    y += height / (lines.length + 1);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.needsUpdate = true;
  return tex;
}

/** Silhouette d'arme tracée à la craie, comme sur un mur d'armurerie. */
function chalkTexture(name, cost) {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 256;
  const g = c.getContext('2d');
  g.clearRect(0, 0, 512, 256);
  g.strokeStyle = 'rgba(226,230,214,0.82)';
  g.fillStyle = 'rgba(226,230,214,0.14)';
  g.lineWidth = 5;
  g.lineJoin = 'round';
  // silhouette schématique
  g.beginPath();
  g.moveTo(70, 120); g.lineTo(330, 120); g.lineTo(330, 96);
  g.lineTo(430, 96); g.lineTo(430, 136); g.lineTo(330, 136);
  g.lineTo(330, 152); g.lineTo(240, 152); g.lineTo(228, 200);
  g.lineTo(186, 200); g.lineTo(196, 152); g.lineTo(120, 152);
  g.lineTo(70, 176); g.closePath();
  g.fill(); g.stroke();

  g.font = 'bold 34px system-ui, sans-serif';
  g.textAlign = 'center';
  g.fillStyle = 'rgba(232,236,220,0.9)';
  g.fillText(name.toUpperCase(), 256, 48);
  g.font = 'bold 44px system-ui, sans-serif';
  g.fillStyle = 'rgba(255,214,102,0.95)';
  g.fillText(String(cost), 256, 236);
  return new THREE.CanvasTexture(c);
}

// ---------------------------------------------------------------------------

class Interactable {
  constructor(type, x, z, y = 1.2) {
    this.type = type;
    this.pos = new THREE.Vector3(x, y, z);
    this.radius = 3.2;
    this.group = new THREE.Group();
    this.group.position.set(x, 0, z);
    this.holdTime = 0;      // > 0 : maintien requis
    this.done = false;
  }
  /** { title, sub, cost, blocked } ou null si rien à proposer. */
  prompt() { return null; }
  use() { return false; }
  update() {}
}

// ---------------------------------------------------------------- porte

export class Door extends Interactable {
  constructor(def, map) {
    const horizontal = def.axis === 'x';
    const cx = horizontal ? def.at : (def.from + def.to) / 2;
    const cz = horizontal ? (def.from + def.to) / 2 : def.at;
    super('door', cx, cz, 1.6);
    this.def = def;
    this.map = map;
    this.radius = 4.2;
  }
  prompt(game) {
    if (this.done) return null;
    return {
      title: this.def.name,
      sub: 'Ouvre : ' + this.map.zones[this.def.zone].name,
      cost: this.def.cost,
      blocked: game.player.points < this.def.cost,
    };
  }
  use(game) {
    if (this.done || game.player.points < this.def.cost) return false;
    game.spend(this.def.cost);
    this.map.openDoor(this.def);
    this.map.nav.dirty = true;
    this.done = true;
    Sfx.doorOpen();
    game.hud.toast('Zone ouverte — ' + this.map.zones[this.def.zone].name, '#7ee787', '🚪');
    return true;
  }
}

// ------------------------------------------------------------ achat mural

export class WallBuy extends Interactable {
  constructor(def) {
    super('wallbuy', def.pos[0], def.pos[1], 1.6);
    this.def = def;
    this.weapon = WEAPONS[def.weapon];
    this.radius = 3.0;

    const tex = chalkTexture(this.weapon.name, def.cost);
    const panel = new THREE.Mesh(
      new THREE.PlaneGeometry(2.6, 1.3),
      new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0.85 })
    );
    panel.position.set(0, 1.9, 0);
    panel.rotation.y = def.rot;
    this.group.add(panel);
    this.panel = panel;
  }
  get ammoCost() { return Math.round(this.def.cost / 2); }
  prompt(game) {
    const owns = game.weapons.owns(this.def.weapon);
    const cost = owns ? this.ammoCost : this.def.cost;
    return {
      title: owns ? 'Munitions — ' + this.weapon.name : this.weapon.name,
      sub: owns ? 'Recharge complète' : 'Prendre l\'arme',
      cost,
      blocked: game.player.points < cost,
    };
  }
  use(game) {
    const owns = game.weapons.owns(this.def.weapon);
    const cost = owns ? this.ammoCost : this.def.cost;
    if (game.player.points < cost) return false;
    game.spend(cost);
    const result = game.weapons.acquire(this.def.weapon);
    Sfx.purchase();
    if (result === 'refill') game.hud.toast('Munitions rechargées', '#ffd166', '📦');
    else if (result === 'new') game.hud.toast(this.weapon.name, '#7ee787', '🔫');
    else game.hud.toast(`${this.weapon.name} remplace ${WEAPONS[result].name}`, '#ffd166', '🔫');
    game.hud.updateWeaponList(game.weapons);
    return true;
  }
  update(dt, time) {
    this.panel.material.opacity = 0.62 + Math.sin(time * 2) * 0.1;
  }
}

// -------------------------------------------------------- distributeur

export class PerkMachine extends Interactable {
  constructor(perk, x, z, rot = 0) {
    super('perk', x, z, 1.5);
    this.perk = perk;
    this.radius = 2.8;

    const body = new THREE.Mesh(
      new THREE.BoxGeometry(1.2, 2.2, 0.9),
      new THREE.MeshPhongMaterial({ color: 0x23262b })
    );
    body.position.y = 1.1;
    body.castShadow = true;
    this.group.add(body);

    const front = new THREE.Mesh(
      new THREE.PlaneGeometry(1.0, 1.5),
      new THREE.MeshBasicMaterial({
        map: textPanel([
          { text: perk.icon, size: 92 },
          { text: perk.name, size: 40, color: '#' + new THREE.Color(perk.color).getHexString() },
          { text: String(perk.cost), size: 44, color: '#ffd666' },
        ], 512, 512),
        transparent: true,
      })
    );
    front.position.set(0, 1.3, 0.46);
    this.group.add(front);
    this.front = front;

    const glow = new THREE.Mesh(
      new THREE.BoxGeometry(1.26, 0.1, 0.96),
      new THREE.MeshBasicMaterial({ color: perk.color })
    );
    glow.position.y = 2.16;
    this.group.add(glow);
    this.glow = glow;

    this.group.rotation.y = rot;
  }
  prompt(game) {
    if (!game.powered) {
      return { title: this.perk.name, sub: 'Alimentation coupée', cost: null, blocked: true };
    }
    if (game.player.perks[this.perk.id]) {
      return { title: this.perk.name, sub: 'Déjà en votre possession', cost: null, blocked: true };
    }
    return {
      title: this.perk.name,
      sub: this.perk.desc,
      cost: this.perk.cost,
      blocked: game.player.points < this.perk.cost,
    };
  }
  use(game) {
    if (!game.powered || game.player.perks[this.perk.id]) return false;
    if (game.player.points < this.perk.cost) return false;
    game.spend(this.perk.cost);
    game.player.grantPerk(this.perk.id);
    Sfx.perk();
    game.hud.toast(this.perk.name, '#' + new THREE.Color(this.perk.color).getHexString(), this.perk.icon);
    game.hud.updatePerks(game.player);
    return true;
  }
  update(dt, time, game) {
    const on = game && game.powered;
    const pulse = on ? 0.7 + Math.sin(time * 3) * 0.3 : 0.05;
    this.glow.material.color.setHex(this.perk.color).multiplyScalar(clamp(pulse, 0.08, 1));
    this.front.material.opacity = on ? 1 : 0.25;
    this.front.material.transparent = true;
  }
}

// ------------------------------------------------------------ interrupteur

export class PowerSwitch extends Interactable {
  constructor(x, z) {
    super('power', x, z, 1.5);
    this.radius = 3.0;
    const box = new THREE.Mesh(
      new THREE.BoxGeometry(1.5, 2.0, 0.5),
      new THREE.MeshPhongMaterial({ color: 0x3a3f36 })
    );
    box.position.y = 1.2;
    box.castShadow = true;
    this.group.add(box);
    this.lever = new THREE.Mesh(
      new THREE.BoxGeometry(0.16, 0.7, 0.16),
      new THREE.MeshPhongMaterial({ color: 0xc23a2a })
    );
    this.lever.position.set(0, 1.5, 0.32);
    this.lever.rotation.x = 0.7;
    this.group.add(this.lever);
    const label = new THREE.Mesh(
      new THREE.PlaneGeometry(1.3, 0.5),
      new THREE.MeshBasicMaterial({
        map: textPanel([{ text: 'ALIMENTATION', size: 58, color: '#ffd666' }], 512, 160),
        transparent: true,
      })
    );
    label.position.set(0, 2.3, 0.27);
    this.group.add(label);
    this.light = new THREE.PointLight(0xff4d3a, 1.4, 9, 1.6);
    this.light.position.set(0, 2.0, 0.5);
    this.group.add(this.light);
  }
  prompt(game) {
    if (game.powered) return null;
    return { title: 'Rétablir le courant', sub: 'Active les distributeurs', cost: 0, blocked: false };
  }
  use(game) {
    if (game.powered) return false;
    game.setPower(true);
    this.lever.rotation.x = -0.7;
    this.light.color.setHex(0x4bff8f);
    Sfx.power();
    return true;
  }
}

// ---------------------------------------------------------- caisse mystère

export class MysteryBox extends Interactable {
  constructor(spots) {
    super('box', spots[0].pos[0], spots[0].pos[1], 1.1);
    this.spots = spots;
    this.spotIndex = 0;
    this.radius = 3.0;
    this.uses = 0;
    this.usesLeft = Math.floor(rand(MYSTERY_BOX.usesBeforeMove[0], MYSTERY_BOX.usesBeforeMove[1]));
    this.state = 'idle';       // idle | spinning | offering | moving
    this.timer = 0;
    this.offered = null;

    const crate = new THREE.Mesh(
      new THREE.BoxGeometry(1.6, 1.0, 1.1),
      new THREE.MeshPhongMaterial({ color: 0x6b5433 })
    );
    crate.position.y = 0.5;
    crate.castShadow = true;
    this.group.add(crate);

    this.lid = new THREE.Mesh(
      new THREE.BoxGeometry(1.66, 0.16, 1.16),
      new THREE.MeshPhongMaterial({ color: 0x4f3d24 })
    );
    this.lid.position.set(0, 1.02, -0.55);
    this.group.add(this.lid);

    const mark = new THREE.Mesh(
      new THREE.PlaneGeometry(0.9, 0.9),
      new THREE.MeshBasicMaterial({
        map: textPanel([{ text: '?', size: 220, color: '#ffd666' }], 256, 256),
        transparent: true,
      })
    );
    mark.position.set(0, 0.62, 0.56);
    this.group.add(mark);

    this.light = new THREE.PointLight(0xffd666, 0, 14, 1.6);
    this.light.position.y = 1.4;
    this.group.add(this.light);

    // arme qui tourne au-dessus pendant le tirage
    this.spinner = new THREE.Group();
    this.spinner.position.y = 1.7;
    this.spinner.visible = false;
    this.group.add(this.spinner);
    const gun = new THREE.Mesh(
      new THREE.BoxGeometry(1.1, 0.16, 0.16),
      new THREE.MeshBasicMaterial({ color: 0xe8dcc0 })
    );
    this.spinner.add(gun);
    const stock = new THREE.Mesh(
      new THREE.BoxGeometry(0.3, 0.24, 0.14),
      new THREE.MeshBasicMaterial({ color: 0xc9a06a })
    );
    stock.position.set(0.45, -0.1, 0);
    this.spinner.add(stock);

    this.nameSprite = new THREE.Sprite(new THREE.SpriteMaterial({ transparent: true }));
    this.nameSprite.scale.set(3.2, 0.8, 1);
    this.nameSprite.position.y = 2.5;
    this.nameSprite.visible = false;
    this.group.add(this.nameSprite);
  }

  moveTo(index) {
    this.spotIndex = index;
    const s = this.spots[index];
    this.pos.set(s.pos[0], 1.1, s.pos[1]);
    this.group.position.set(s.pos[0], 0, s.pos[1]);
  }

  prompt(game) {
    if (this.state === 'spinning' || this.state === 'moving') return null;
    if (this.state === 'offering') {
      return { title: this.offered.name, sub: 'Prendre cette arme', cost: 0, blocked: false };
    }
    return {
      title: 'Caisse mystère',
      sub: `Arme au hasard · ${this.usesLeft} tirage(s) avant déplacement`,
      cost: MYSTERY_BOX.cost,
      blocked: game.player.points < MYSTERY_BOX.cost,
    };
  }

  use(game) {
    if (this.state === 'offering') {
      const result = game.weapons.acquire(this.offered.id);
      Sfx.purchase();
      if (result === 'new' || result === 'refill') {
        game.hud.toast(this.offered.name, '#7ee787', '🔫');
      } else {
        game.hud.toast(`${this.offered.name} remplace ${WEAPONS[result].name}`, '#ffd166', '🔫');
      }
      game.hud.updateWeaponList(game.weapons);
      this.state = 'idle';
      this.spinner.visible = false;
      this.nameSprite.visible = false;
      this.offered = null;
      this.usesLeft--;
      if (this.usesLeft <= 0) {
        this.state = 'moving';
        this.timer = 1.4;
      }
      return true;
    }

    if (this.state !== 'idle' || game.player.points < MYSTERY_BOX.cost) return false;
    game.spend(MYSTERY_BOX.cost);
    this.state = 'spinning';
    this.timer = MYSTERY_BOX.spinTime;
    this.spinner.visible = true;
    Sfx.boxOpen();
    this.candidates = game.weapons.all.filter((w) => w !== 'pistolet');
    return true;
  }

  update(dt, time, game) {
    this.light.intensity = this.state === 'idle'
      ? 1.1 + Math.sin(time * 2) * 0.4
      : 2.6 + Math.sin(time * 18) * 1;

    this.lid.rotation.x = damp(this.lid.rotation.x, this.state === 'idle' || this.state === 'moving' ? 0 : -1.5, 7, dt);

    if (this.state === 'spinning') {
      this.timer -= dt;
      this.spinner.rotation.y += dt * 9;
      this.spinner.position.y = 1.7 + Math.sin(time * 6) * 0.1;
      // l'arme affichée change vite puis ralentit
      const step = Math.max(0.06, (MYSTERY_BOX.spinTime - this.timer) * 0.12);
      this._spinAcc = (this._spinAcc || 0) + dt;
      if (this._spinAcc > step) {
        this._spinAcc = 0;
        this.offered = WEAPONS[pick(this.candidates)];
        this.nameSprite.material.map = textPanel(
          [{ text: this.offered.name, size: 60, color: '#ffe9a8' }], 512, 128, { stroke: true });
        this.nameSprite.material.needsUpdate = true;
        this.nameSprite.visible = true;
        Sfx.boxTick();
      }
      if (this.timer <= 0) {
        this.state = 'offering';
        this.timer = 12;
      }
    } else if (this.state === 'offering') {
      this.timer -= dt;
      this.spinner.rotation.y += dt * 1.5;
      if (this.timer <= 0) {
        // non réclamée : la caisse se referme
        this.state = 'idle';
        this.spinner.visible = false;
        this.nameSprite.visible = false;
        this.offered = null;
      }
    } else if (this.state === 'moving') {
      this.timer -= dt;
      if (this.timer <= 0) {
        let next = this.spotIndex;
        while (next === this.spotIndex && this.spots.length > 1) {
          next = Math.floor(Math.random() * this.spots.length);
        }
        this.moveTo(next);
        this.usesLeft = Math.floor(rand(MYSTERY_BOX.usesBeforeMove[0], MYSTERY_BOX.usesBeforeMove[1]));
        this.state = 'idle';
        if (game) game.hud.toast('La caisse mystère a changé de place', '#ffd166', '📦');
      }
    }
  }
}

function damp(a, b, lambda, dt) { return a + (b - a) * (1 - Math.exp(-lambda * dt)); }

// -------------------------------------------------------- poste d'amélioration

export class UpgradeStation extends Interactable {
  constructor(x, z, rot = 0) {
    super('upgrade', x, z, 1.5);
    this.radius = 3.2;
    this.state = 'idle';
    this.timer = 0;

    const body = new THREE.Mesh(
      new THREE.BoxGeometry(2.4, 2.6, 1.4),
      new THREE.MeshPhongMaterial({ color: 0x2b3038 })
    );
    body.position.y = 1.3;
    body.castShadow = true;
    this.group.add(body);

    const slot = new THREE.Mesh(
      new THREE.BoxGeometry(1.4, 0.3, 0.2),
      new THREE.MeshBasicMaterial({ color: 0x36c2ff })
    );
    slot.position.set(0, 1.5, 0.72);
    this.group.add(slot);
    this.slot = slot;

    const label = new THREE.Mesh(
      new THREE.PlaneGeometry(2.0, 0.7),
      new THREE.MeshBasicMaterial({
        map: textPanel([{ text: 'AMÉLIORATION', size: 58, color: '#7fe9ff' }], 512, 160),
        transparent: true,
      })
    );
    label.position.set(0, 2.3, 0.72);
    this.group.add(label);

    for (let i = 0; i < 2; i++) {
      const coil = new THREE.Mesh(
        new THREE.TorusGeometry(0.42, 0.07, 6, 16),
        new THREE.MeshBasicMaterial({ color: 0x36c2ff })
      );
      coil.position.set(i ? 0.85 : -0.85, 1.9, 0.4);
      this.group.add(coil);
    }

    this.light = new THREE.PointLight(0x36c2ff, 1, 15, 1.6);
    this.light.position.set(0, 2, 1);
    this.group.add(this.light);
    this.group.rotation.y = rot;
  }

  prompt(game) {
    if (!game.powered) {
      return { title: "Poste d'amélioration", sub: 'Alimentation coupée', cost: null, blocked: true };
    }
    if (this.state === 'working') return null;
    const slot = game.weapons.slot;
    if (slot.upgraded) {
      return { title: "Poste d'amélioration", sub: 'Arme déjà améliorée', cost: null, blocked: true };
    }
    if (game.weapons.current === 'pistolet') {
      return { title: "Poste d'amélioration", sub: 'Le pistolet ne peut pas être amélioré', cost: null, blocked: true };
    }
    return {
      title: 'Améliorer ' + slot.def.name,
      sub: `Dégâts ×${UPGRADE_STATION.damageMul} · chargeur ×${UPGRADE_STATION.magMul}`,
      cost: UPGRADE_STATION.cost,
      blocked: game.player.points < UPGRADE_STATION.cost,
    };
  }

  use(game) {
    if (!game.powered || this.state === 'working') return false;
    if (game.weapons.current === 'pistolet' || game.weapons.slot.upgraded) return false;
    if (game.player.points < UPGRADE_STATION.cost) return false;
    game.spend(UPGRADE_STATION.cost);
    this.state = 'working';
    this.timer = 2.4;
    this.pendingWeapon = game.weapons.current;
    this.game = game;
    Sfx.upgradeStation();
    return true;
  }

  update(dt, time, game) {
    const on = game && game.powered;
    this.light.intensity = on ? (this.state === 'working' ? 3.2 + Math.sin(time * 24) * 1.2 : 1.1 + Math.sin(time * 2.2) * 0.4) : 0.05;
    this.slot.material.color.setHex(on ? 0x36c2ff : 0x1b2b33);
    if (this.state === 'working') {
      this.timer -= dt;
      if (this.timer <= 0) {
        this.state = 'idle';
        const g = this.game;
        if (g && g.weapons.upgrade(this.pendingWeapon)) {
          g.hud.toast(g.weapons.slots[this.pendingWeapon].def.name + ' améliorée', '#7fe9ff', '★');
          g.hud.updateWeaponList(g.weapons);
          Sfx.perk();
        }
      }
    }
  }
}

// ---------------------------------------------------------------- barricade

export class Barricade extends Interactable {
  constructor(def, index) {
    super('window', def.pos[0], def.pos[1], 1.2);
    this.def = def;
    this.index = index;
    this.zone = def.zone;
    this.radius = 2.6;
    this.holdTime = 0.45;
    this.planks = [];
    this.dir = new THREE.Vector2(def.dir[0], def.dir[1]);

    const frameMat = new THREE.MeshPhongMaterial({ color: 0x2e3238 });
    const plankMat = new THREE.MeshPhongMaterial({ color: 0x7a5a33 });
    const horizontal = Math.abs(def.dir[0]) > 0.5;   // fenêtre dans un mur est/ouest

    const frame = new THREE.Mesh(
      new THREE.BoxGeometry(horizontal ? 0.9 : 3.4, 3.0, horizontal ? 3.4 : 0.9),
      frameMat
    );
    frame.position.y = 1.5;
    this.group.add(frame);
    // on évide le centre en dessinant deux montants au lieu d'un bloc plein
    frame.visible = false;
    for (let i = 0; i < 2; i++) {
      const post = new THREE.Mesh(
        new THREE.BoxGeometry(horizontal ? 0.9 : 0.35, 3.2, horizontal ? 0.35 : 0.9),
        frameMat
      );
      post.position.set(
        horizontal ? 0 : (i ? 1.5 : -1.5), 1.6,
        horizontal ? (i ? 1.5 : -1.5) : 0
      );
      post.castShadow = true;
      this.group.add(post);
    }

    for (let i = 0; i < PLANKS_PER_WINDOW; i++) {
      const p = new THREE.Mesh(
        new THREE.BoxGeometry(horizontal ? 0.5 : 3.1, 0.3, horizontal ? 3.1 : 0.5),
        plankMat
      );
      p.position.set(0, 0.45 + i * 0.45, 0);
      p.rotation[horizontal ? 'x' : 'z'] = rand(-0.06, 0.06);
      p.castShadow = true;
      this.group.add(p);
      this.planks.push({ mesh: p, intact: true });
    }
    this.intactCount = PLANKS_PER_WINDOW;
  }

  /** Position extérieure d'où arrivent les zombies. */
  outsidePos() {
    return new THREE.Vector3(
      this.pos.x - this.dir.x * 3.4, 0, this.pos.z - this.dir.y * 3.4
    );
  }
  /** Position intérieure une fois la fenêtre franchie. */
  insidePos() {
    return new THREE.Vector3(
      this.pos.x + this.dir.x * 2.4, 0, this.pos.z + this.dir.y * 2.4
    );
  }

  /** Un zombie arrache une planche. Renvoie false s'il n'y en a plus. */
  tearPlank(effects) {
    for (let i = this.planks.length - 1; i >= 0; i--) {
      const p = this.planks[i];
      if (!p.intact) continue;
      p.intact = false;
      p.mesh.visible = false;
      this.intactCount--;
      if (effects) {
        const wp = p.mesh.getWorldPosition(new THREE.Vector3());
        effects.sparks(wp, new THREE.Vector3(this.dir.x, 0.4, this.dir.y), 10, 0x9a7440);
      }
      Sfx.plankTear();
      return true;
    }
    return false;
  }

  get passable() { return this.intactCount <= 2; }

  prompt(game) {
    if (this.intactCount >= PLANKS_PER_WINDOW) return null;
    return {
      title: 'Rebarricader',
      sub: `${this.intactCount}/${PLANKS_PER_WINDOW} planches · +${ECONOMY.repairPlank} pts`,
      cost: 0,
      hold: true,
      blocked: false,
    };
  }

  use(game) {
    for (const p of this.planks) {
      if (p.intact) continue;
      p.intact = true;
      p.mesh.visible = true;
      this.intactCount++;
      game.addPoints(ECONOMY.repairPlank, this.pos);
      Sfx.plankPlace();
      return true;
    }
    return false;
  }

  reset() {
    for (const p of this.planks) { p.intact = true; p.mesh.visible = true; }
    this.intactCount = PLANKS_PER_WINDOW;
  }
}

// ---------------------------------------------------------------- gestion

export class InteractionManager {
  constructor(scene, map) {
    this.scene = scene;
    this.map = map;
    this.items = [];
    this.barricades = [];
    this.target = null;
    this.holdProgress = 0;

    for (const d of DOORS) this.add(new Door(d, map));
    for (const w of WALL_BUYS) this.add(new WallBuy(w));

    // Distributeurs, répartis pour récompenser l'exploration
    this.add(new PerkMachine(PERKS.souffle, -11, 34, Math.PI / 2));
    this.add(new PerkMachine(PERKS.bottes, -35.5, 33, Math.PI / 2));
    this.add(new PerkMachine(PERKS.peau, 35.5, 33, -Math.PI / 2));
    this.add(new PerkMachine(PERKS.mains, -34, 8.4, Math.PI));
    this.add(new PerkMachine(PERKS.doigt, 34, 8.4, Math.PI));

    this.power = new PowerSwitch(-18, -36);
    this.add(this.power);
    this.upgrade = new UpgradeStation(17, -35.5, 0);
    this.add(this.upgrade);

    this.box = new MysteryBox(BOX_SPOTS);
    this.box.moveTo(Math.floor(Math.random() * BOX_SPOTS.length));
    this.add(this.box);

    WINDOWS.forEach((w, i) => {
      const b = new Barricade(w, i);
      this.barricades.push(b);
      this.add(b);
    });
  }

  add(item) {
    this.items.push(item);
    this.scene.add(item.group);
    return item;
  }

  /** Barricades des zones ouvertes — là où les zombies peuvent entrer. */
  activeBarricades() {
    return this.barricades.filter((b) => this.map.zones[b.zone].open);
  }

  reset() {
    for (const b of this.barricades) b.reset();
    for (const it of this.items) {
      if (it.type === 'door') it.done = false;
    }
    this.map.closeAllDoors();
    this.box.state = 'idle';
    this.box.spinner.visible = false;
    this.box.nameSprite.visible = false;
    this.box.moveTo(Math.floor(Math.random() * BOX_SPOTS.length));
    this.power.lever.rotation.x = 0.7;
    this.power.light.color.setHex(0xff4d3a);
    this.upgrade.state = 'idle';
  }

  /** Objet visé : le plus proche devant le joueur. */
  findTarget(player, lookDir) {
    let best = null, bestScore = -Infinity;
    for (const it of this.items) {
      const d = dist2D(it.pos, player.pos);
      if (d > it.radius) continue;
      const dx = it.pos.x - player.pos.x;
      const dz = it.pos.z - player.pos.z;
      const facing = d < 0.4 ? 1 : (dx * lookDir.x + dz * lookDir.z) / d;
      if (facing < 0.15) continue;
      const score = facing * 2 - d * 0.25;
      if (score > bestScore) { bestScore = score; best = it; }
    }
    return best;
  }

  update(dt, time, game) {
    for (const it of this.items) it.update(dt, time, game);
  }
}
