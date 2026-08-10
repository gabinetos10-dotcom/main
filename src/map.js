import * as THREE from '../vendor/three.module.js';
import { Box, rand, dist2D } from './utils.js';
import { NavGrid } from './navgrid.js';

/**
 * Le complexe : cinq salles cloisonnées, reliées par des portes à déverrouiller.
 * La carte est fixe — on doit pouvoir l'apprendre par cœur — seuls les détails
 * du décor sont tirés au hasard.
 *
 *   z=36  ┌───────────┬───────────┬───────────┐
 *         │  CANTINE  │   HALL    │  ATELIER  │
 *   z=10  ├───────────┴─────┬─────┴───────────┤
 *         │            COULOIR                │
 *   z=-2  └────────┬──────────────┬───────────┘
 *                  │  MACHINES    │
 *   z=-38          └──────────────┘
 *
 * Les murs mitoyens sont percés d'une seule porte : le trajet est donc
 * hall → cantine / atelier (impasses à récompenses) et hall → couloir → machines.
 */

const WALL_H = 5.6;
const WALL_T = 0.7;
const WINDOW_HALF = 1.6;      // demi-largeur d'une fenêtre
const SILL_H = 1.65;          // hauteur d'appui : infranchissable pour le joueur
const LINTEL_Y = 3.1;         // bas du linteau

export const ZONES = {
  hall: { id: 'hall', name: 'HALL', min: [-13, 10], max: [13, 36], open: true },
  cantine: { id: 'cantine', name: 'CANTINE', min: [-38, 10], max: [-13, 36], open: false },
  atelier: { id: 'atelier', name: 'ATELIER', min: [13, 10], max: [38, 36], open: false },
  couloir: { id: 'couloir', name: 'COULOIR', min: [-38, -2], max: [38, 10], open: false },
  generateur: { id: 'generateur', name: 'SALLE DES MACHINES', min: [-22, -38], max: [22, -2], open: false },
};

/** Portes : une ouverture dans un mur mitoyen, un prix, une zone débloquée. */
export const DOORS = [
  { id: 0, name: 'Porte de la cantine', zone: 'cantine', cost: 750, axis: 'x', at: -13, from: 18, to: 24 },
  { id: 1, name: "Porte de l'atelier", zone: 'atelier', cost: 1000, axis: 'x', at: 13, from: 18, to: 24 },
  { id: 2, name: 'Grille du couloir', zone: 'couloir', cost: 1250, axis: 'z', at: 10, from: -4, to: 4 },
  { id: 3, name: 'Sas des machines', zone: 'generateur', cost: 1750, axis: 'z', at: -2, from: -5, to: 5 },
];

/** Fenêtres : `side` désigne le mur extérieur, `at` la position le long du mur. */
const WINDOW_DEFS = [
  { zone: 'hall', side: 'n', at: -6 }, { zone: 'hall', side: 'n', at: 6 },
  { zone: 'cantine', side: 'w', at: 16 }, { zone: 'cantine', side: 'w', at: 30 },
  { zone: 'cantine', side: 'n', at: -26 },
  { zone: 'atelier', side: 'e', at: 16 }, { zone: 'atelier', side: 'e', at: 30 },
  { zone: 'atelier', side: 'n', at: 26 },
  { zone: 'couloir', side: 'w', at: 4 }, { zone: 'couloir', side: 'e', at: 4 },
  { zone: 'couloir', side: 's', at: -30 }, { zone: 'couloir', side: 's', at: 30 },
  { zone: 'generateur', side: 'w', at: -14 }, { zone: 'generateur', side: 'w', at: -30 },
  { zone: 'generateur', side: 'e', at: -14 }, { zone: 'generateur', side: 'e', at: -30 },
  { zone: 'generateur', side: 's', at: -8 }, { zone: 'generateur', side: 's', at: 8 },
];

/** Position et direction d'entrée déduites de la géométrie de la zone. */
export const WINDOWS = WINDOW_DEFS.map((w) => {
  const z = ZONES[w.zone];
  switch (w.side) {
    case 'w': return { ...w, pos: [z.min[0], w.at], dir: [1, 0] };
    case 'e': return { ...w, pos: [z.max[0], w.at], dir: [-1, 0] };
    case 's': return { ...w, pos: [w.at, z.min[1]], dir: [0, 1] };
    default: return { ...w, pos: [w.at, z.max[1]], dir: [0, -1] };
  }
});

// ---------------------------------------------------------------- textures

function concreteTexture(base = '#4a4842', grime = 0.5) {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = base;
  g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 40; i++) {
    const x = Math.random() * 256, w = Math.random() * 30 + 4;
    const h = Math.random() * 160 + 20;
    const grd = g.createLinearGradient(x, 0, x, h);
    grd.addColorStop(0, `rgba(18,16,12,${0.18 * grime})`);
    grd.addColorStop(1, 'rgba(18,16,12,0)');
    g.fillStyle = grd;
    g.fillRect(x, Math.random() * 200, w, h);
  }
  const img = g.getImageData(0, 0, 256, 256);
  for (let i = 0; i < img.data.length; i += 4) {
    const n = (Math.random() - 0.5) * 26;
    img.data[i] += n; img.data[i + 1] += n; img.data[i + 2] += n;
  }
  g.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

function floorTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 512;
  const g = c.getContext('2d');
  g.fillStyle = '#32312b';
  g.fillRect(0, 0, 512, 512);
  g.strokeStyle = 'rgba(0,0,0,0.42)';
  g.lineWidth = 2;
  for (let i = 0; i <= 512; i += 64) {
    g.beginPath(); g.moveTo(i, 0); g.lineTo(i, 512); g.stroke();
    g.beginPath(); g.moveTo(0, i); g.lineTo(512, i); g.stroke();
  }
  for (let i = 0; i < 140; i++) {
    const x = Math.random() * 512, y = Math.random() * 512;
    const r = Math.random() * 34 + 6;
    const grd = g.createRadialGradient(x, y, 0, x, y, r);
    grd.addColorStop(0, Math.random() < 0.7 ? 'rgba(10,10,9,0.5)' : 'rgba(70,24,18,0.3)');
    grd.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grd;
    g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
  }
  const img = g.getImageData(0, 0, 512, 512);
  for (let i = 0; i < img.data.length; i += 4) {
    const n = (Math.random() - 0.5) * 22;
    img.data[i] += n; img.data[i + 1] += n; img.data[i + 2] += n;
  }
  g.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(22, 22);
  return tex;
}

// ---------------------------------------------------------------- carte

export class GameMap {
  constructor(scene) {
    this.scene = scene;
    this.obstacles = [];
    this.group = new THREE.Group();
    scene.add(this.group);
    this.half = 46;
    this.nav = new NavGrid(this.half, 1);
    this.zones = {};
    for (const [k, v] of Object.entries(ZONES)) this.zones[k] = { ...v };
    this.lamps = [];
    this.powered = false;
    this.doorMeshes = new Map();
    this.doorBoxes = new Map();
    this.fogTarget = null;
    this._build();
  }

  _addBox(box) {
    this.obstacles.push(box);
    return box;
  }

  /** Bloc de mur : maillage + collision + case de navigation. */
  _block(cx, cz, hx, hz, y0, y1, mat) {
    const h = y1 - y0;
    const m = new THREE.Mesh(new THREE.BoxGeometry(hx * 2, h, hz * 2), mat);
    m.position.set(cx, y0 + h / 2, cz);
    m.castShadow = true;
    m.receiveShadow = true;
    this.group.add(m);
    const box = new Box(cx, cz, hx, hz, y1, y0);
    this._addBox(box);
    // Seuls les blocs qui touchent le sol coupent le passage.
    if (y0 < 1.2) this.nav.blockRect(box.min.x, box.min.z, box.max.x, box.max.z);
    return { mesh: m, box };
  }

  /**
   * Mur droit percé d'ouvertures.
   * `axis` = 'x' : mur vertical à l'abscisse `at`, s'étendant de `from` à `to` en z.
   * `axis` = 'z' : mur horizontal à l'ordonnée `at`, s'étendant en x.
   * `gaps` : [{ from, to, kind, ref }] — 'door' (pleine hauteur) ou 'window'.
   */
  _wallRun(axis, at, from, to, gaps, mat) {
    const sorted = [...gaps].sort((a, b) => a.from - b.from);
    let cursor = from;

    const piece = (a, b, y0, y1) => {
      if (b - a < 0.01) return null;
      const mid = (a + b) / 2;
      const half = (b - a) / 2;
      return axis === 'x'
        ? this._block(at, mid, WALL_T / 2, half, y0, y1, mat)
        : this._block(mid, at, half, WALL_T / 2, y0, y1, mat);
    };

    for (const gap of sorted) {
      piece(cursor, gap.from, 0, WALL_H);
      if (gap.kind === 'window') {
        // appui bas + linteau : on voit et on tire à travers, on ne passe pas
        const sill = piece(gap.from, gap.to, 0, SILL_H);
        const lintel = piece(gap.from, gap.to, LINTEL_Y, WALL_H);
        if (gap.ref) gap.ref.sill = sill;
        void lintel;
      } else if (gap.kind === 'door') {
        // barrière pleine hauteur, retirée à l'achat
        const b = piece(gap.from, gap.to, 0, WALL_H);
        this.doorBoxes.set(gap.ref.id, b);
        this.doorMeshes.set(gap.ref.id, b.mesh);
        this.nav.clearRect(b.box.min.x, b.box.min.z, b.box.max.x, b.box.max.z, gap.ref.id);
      }
      cursor = gap.to;
    }
    piece(cursor, to, 0, WALL_H);
  }

  _build() {
    this.scene.background = new THREE.Color(0x0a0d0f);
    this.scene.fog = new THREE.Fog(0x0a0d0f, 5, 46);

    const matte = { shininess: 0, specular: 0x000000 };
    this.wallMat = new THREE.MeshPhongMaterial({ map: concreteTexture('#4a4842'), ...matte });
    this.wallMat.map.repeat.set(5, 1.6);
    this.innerMat = new THREE.MeshPhongMaterial({ map: concreteTexture('#414a45', 0.85), ...matte });
    this.innerMat.map.repeat.set(5, 1.6);
    this.ceilMat = new THREE.MeshPhongMaterial({ map: concreteTexture('#24242a', 0.9), side: THREE.DoubleSide, ...matte });
    this.ceilMat.map.repeat.set(9, 9);

    this.ambient = new THREE.HemisphereLight(0x5a6a80, 0x2a2a20, 0.85);
    this.scene.add(this.ambient);
    this.moon = new THREE.DirectionalLight(0x9fb4d4, 0.55);
    this.moon.position.set(-30, 60, 30);
    this.moon.castShadow = true;
    this.moon.shadow.mapSize.set(2048, 2048);
    this.moon.shadow.camera.left = -48; this.moon.shadow.camera.right = 48;
    this.moon.shadow.camera.top = 48; this.moon.shadow.camera.bottom = -48;
    this.moon.shadow.camera.far = 200;
    this.moon.shadow.bias = -0.0009;
    this.scene.add(this.moon);

    this._floor();
    this._walls();
    this._ceilings();
    this._props();
    this._outside();

    // Les salles sont franchissables, les murs les redécoupent ensuite.
    for (const z of Object.values(this.zones)) {
      this.nav.clearRect(z.min[0] + 0.6, z.min[1] + 0.6, z.max[0] - 0.6, z.max[1] - 0.6);
    }
    for (const b of this.obstacles) {
      if (b.min.y < 1.2) this.nav.blockRect(b.min.x, b.min.z, b.max.x, b.max.z);
    }
    for (const d of DOORS) {
      const entry = this.doorBoxes.get(d.id);
      if (entry) this.nav.clearRect(entry.box.min.x, entry.box.min.z, entry.box.max.x, entry.box.max.z, d.id);
    }
    this.nav.openDoors.clear();
    this.nav.dirty = true;
  }

  _floor() {
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(this.half * 2 + 30, this.half * 2 + 30),
      new THREE.MeshPhongMaterial({ map: floorTexture(), shininess: 0, specular: 0x000000 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.group.add(ground);
  }

  _windowGaps(zoneId, side) {
    return WINDOWS
      .filter((w) => w.zone === zoneId && w.side === side)
      .map((w) => ({ from: w.at - WINDOW_HALF, to: w.at + WINDOW_HALF, kind: 'window', ref: w }));
  }

  _doorGaps(axis, at) {
    return DOORS
      .filter((d) => d.axis === axis && Math.abs(d.at - at) < 0.01)
      .map((d) => ({ from: d.from, to: d.to, kind: 'door', ref: d }));
  }

  _walls() {
    const W = this.wallMat, I = this.innerMat;

    // --- enceinte extérieure ---
    // nord (z = 36) : cantine + hall + atelier
    this._wallRun('z', 36, -38, 38, [
      ...this._windowGaps('cantine', 'n'),
      ...this._windowGaps('hall', 'n'),
      ...this._windowGaps('atelier', 'n'),
    ], W);
    // ouest (x = -38) : cantine puis couloir
    this._wallRun('x', -38, -2, 36, [
      ...this._windowGaps('cantine', 'w'),
      ...this._windowGaps('couloir', 'w'),
    ], W);
    // est (x = 38)
    this._wallRun('x', 38, -2, 36, [
      ...this._windowGaps('atelier', 'e'),
      ...this._windowGaps('couloir', 'e'),
    ], W);
    // sud du couloir (z = -2), de part et d'autre de la salle des machines
    this._wallRun('z', -2, -38, -22, this._windowGaps('couloir', 's').filter((g) => g.to < -22), W);
    this._wallRun('z', -2, 22, 38, this._windowGaps('couloir', 's').filter((g) => g.from > 22), W);
    // salle des machines
    this._wallRun('x', -22, -38, -2, this._windowGaps('generateur', 'w'), W);
    this._wallRun('x', 22, -38, -2, this._windowGaps('generateur', 'e'), W);
    this._wallRun('z', -38, -22, 22, this._windowGaps('generateur', 's'), W);

    // --- murs mitoyens, percés d'une porte chacun ---
    this._wallRun('x', -13, 10, 36, this._doorGaps('x', -13), I);   // hall / cantine
    this._wallRun('x', 13, 10, 36, this._doorGaps('x', 13), I);     // hall / atelier
    this._wallRun('z', 10, -38, 38, this._doorGaps('z', 10), I);    // salles / couloir
    this._wallRun('z', -2, -22, 22, this._doorGaps('z', -2), I);    // couloir / machines
  }

  _ceilings() {
    for (const z of Object.values(this.zones)) {
      const [x0, z0] = z.min, [x1, z1] = z.max;
      const w = x1 - x0, d = z1 - z0;
      const ceil = new THREE.Mesh(new THREE.PlaneGeometry(w, d), this.ceilMat);
      ceil.rotation.x = Math.PI / 2;
      ceil.position.set((x0 + x1) / 2, WALL_H - 0.05, (z0 + z1) / 2);
      this.group.add(ceil);

      // Peu de lampes, volontairement : chacune coûte cher en éclairage par pixel.
      const cols = Math.min(3, Math.max(1, Math.round(w / 22)));
      const rows = Math.min(2, Math.max(1, Math.round(d / 22)));
      for (let i = 0; i < cols; i++) {
        for (let j = 0; j < rows; j++) {
          this._neon(
            x0 + (w / (cols + 1)) * (i + 1),
            z0 + (d / (rows + 1)) * (j + 1),
            z.id
          );
        }
      }
    }
  }

  _neon(x, z, zoneId) {
    const tube = new THREE.Mesh(
      new THREE.BoxGeometry(2.8, 0.12, 0.34),
      new THREE.MeshBasicMaterial({ color: 0x2a2622 })
    );
    tube.position.set(x, WALL_H - 0.3, z);
    tube.rotation.y = Math.random() < 0.5 ? 0 : Math.PI / 2;
    this.group.add(tube);

    const light = new THREE.PointLight(0xffd2a0, 0, 34, 1.6);
    light.position.set(x, WALL_H - 0.75, z);
    this.group.add(light);

    this.lamps.push({
      tube, light, zone: zoneId,
      phase: Math.random() * 10,
      broken: Math.random() < 0.24,
      onColor: new THREE.Color(0xffd2a0),
      offColor: new THREE.Color(0x2a2622),
    });
  }

  _props() {
    const metal = new THREE.MeshPhongMaterial({ color: 0x474c51 });
    const rust = new THREE.MeshPhongMaterial({ color: 0x63452f });
    const crate = new THREE.MeshPhongMaterial({ color: 0x63532f });

    const clutter = [
      // hall — dégagé au centre pour pouvoir tourner
      [-9, 14, 2.0, 0.8, 1.5, crate], [9, 14, 2.0, 0.8, 1.5, crate],
      [-10.5, 26, 0.8, 2.6, 2.3, metal], [10.5, 26, 0.8, 2.6, 2.3, metal],
      [0, 34, 1.6, 0.9, 1.2, crate],
      // cantine — tables en rangées
      [-32, 16, 3.2, 0.7, 1.0, metal], [-22, 16, 3.2, 0.7, 1.0, metal],
      [-32, 26, 3.2, 0.7, 1.0, metal], [-22, 26, 3.2, 0.7, 1.0, metal],
      [-27, 33, 1.3, 1.3, 1.8, crate],
      // atelier — établis et casiers
      [22, 16, 3.0, 0.8, 1.1, metal], [33, 16, 0.8, 3.0, 2.4, metal],
      [22, 28, 1.5, 1.5, 1.3, rust], [33, 30, 1.0, 3.0, 2.2, metal],
      // couloir — obstacles ponctuels
      [-24, 4, 1.4, 1.4, 1.3, crate], [24, 4, 1.4, 1.4, 1.3, crate],
      [0, 2, 2.4, 0.8, 1.1, metal], [-12, 7, 1.0, 1.0, 1.6, rust], [12, 7, 1.0, 1.0, 1.6, rust],
      // salle des machines — gros blocs
      [-14, -14, 2.2, 2.2, 2.6, metal], [14, -14, 2.2, 2.2, 2.6, metal],
      [0, -28, 3.8, 1.3, 1.9, rust], [-16, -30, 1.5, 1.5, 2.2, rust],
      [16, -30, 1.5, 1.5, 2.2, rust],
    ];
    for (const [x, z, hx, hz, h, mat] of clutter) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(hx * 2, h, hz * 2), mat);
      m.position.set(x, h / 2, z);
      m.castShadow = true; m.receiveShadow = true;
      this.group.add(m);
      this._addBox(new Box(x, z, hx, hz, h));
    }

    // tuyauterie au plafond du couloir
    const pipeMat = new THREE.MeshPhongMaterial({ color: 0x514b45 });
    for (let i = 0; i < 6; i++) {
      const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 74, 8), pipeMat);
      pipe.rotation.z = Math.PI / 2;
      pipe.position.set(0, WALL_H - 0.55 - (i % 2) * 0.3, 1 + i * 0.55);
      this.group.add(pipe);
    }
  }

  /** Silhouettes aperçues par les fenêtres : la ville morte. */
  _outside() {
    const dark = new THREE.MeshPhongMaterial({ color: 0x191d21 });
    for (let i = 0; i < 30; i++) {
      const a = (i / 30) * Math.PI * 2;
      const r = 56 + rand(0, 18);
      const h = rand(5, 18);
      const m = new THREE.Mesh(new THREE.BoxGeometry(rand(5, 12), h, rand(5, 12)), dark);
      m.position.set(Math.cos(a) * r, h / 2, Math.sin(a) * r);
      this.group.add(m);
    }
  }

  // ------------------------------------------------------------ interrogation

  zoneAt(x, z) {
    for (const zn of Object.values(this.zones)) {
      if (x >= zn.min[0] && x <= zn.max[0] && z >= zn.min[1] && z <= zn.max[1]) return zn;
    }
    return null;
  }

  openZone(id) {
    const z = this.zones[id];
    if (!z || z.open) return false;
    z.open = true;
    return true;
  }

  /** Achat d'une porte : le panneau disparaît, la collision aussi. */
  openDoor(door) {
    const entry = this.doorBoxes.get(door.id);
    if (entry) {
      this.group.remove(entry.mesh);
      const i = this.obstacles.indexOf(entry.box);
      if (i >= 0) this.obstacles.splice(i, 1);
    }
    this.nav.openDoor(door.id);
    this.openZone(door.zone);
    return true;
  }

  /** Remise en place de toutes les portes (nouvelle partie). */
  closeAllDoors() {
    for (const d of DOORS) {
      const entry = this.doorBoxes.get(d.id);
      if (!entry) continue;
      if (!entry.mesh.parent) this.group.add(entry.mesh);
      if (!this.obstacles.includes(entry.box)) this.obstacles.push(entry.box);
    }
    this.nav.openDoors.clear();
    this.nav.dirty = true;
  }

  freePosition(avoid = null, minDist = 0, pad = 1.2, tries = 90) {
    const openZones = Object.values(this.zones).filter((z) => z.open);
    for (let i = 0; i < tries; i++) {
      const z = openZones[Math.floor(Math.random() * openZones.length)];
      const x = rand(z.min[0] + 3, z.max[0] - 3);
      const zz = rand(z.min[1] + 3, z.max[1] - 3);
      if (this._blocked(x, zz, pad)) continue;
      if (avoid && dist2D({ x, z: zz }, avoid) < minDist) continue;
      return new THREE.Vector3(x, 0, zz);
    }
    const z = openZones[0];
    return new THREE.Vector3((z.min[0] + z.max[0]) / 2, 0, (z.min[1] + z.max[1]) / 2);
  }

  _blocked(x, z, pad = 0) {
    for (const b of this.obstacles) {
      if (b.min.y > 1.2) continue;
      if (b.containsXZ(x, z, pad)) return true;
    }
    return false;
  }

  setPower(on) { this.powered = on; }

  setFog(near) {
    this.fogTarget = near === null ? { near: 5, far: 46 } : { near, far: near * 3 };
  }

  update(dt, time, playerPos) {
    this.nav.update(dt, playerPos.x, playerPos.z);

    if (this.fogTarget) {
      const f = this.scene.fog;
      f.near += (this.fogTarget.near - f.near) * Math.min(1, dt * 1.6);
      f.far += (this.fogTarget.far - f.far) * Math.min(1, dt * 1.6);
    }

    // Sans courant, seules quelques lampes de secours rougeoient.
    for (const l of this.lamps) {
      const zoneOpen = this.zones[l.zone].open;
      let target = 0;
      if (zoneOpen) {
        if (this.powered) target = l.broken ? (Math.random() < 0.05 ? 0 : 1) : 1;
        else target = l.broken ? 0.1 : 0.36;      // éclairage de secours
      }
      const flicker = 0.85 + Math.sin(time * 7 + l.phase) * 0.08;
      l.light.intensity = target * 2.4 * flicker;
      l.light.color.setHex(this.powered ? 0xffd2a0 : 0xd8623c);
      const c = this.powered ? l.onColor : new THREE.Color(0x7a2e1e);
      l.tube.material.color.copy(target > 0 ? c : l.offColor)
        .multiplyScalar(Math.max(0.22, target * flicker));
    }
    this.ambient.intensity = this.powered ? 0.95 : 0.62;
  }
}
