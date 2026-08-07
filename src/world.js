import * as THREE from '../vendor/three.module.js';
import { WORLD } from './config.js';
import { Box, rand, randInt, dist2D } from './utils.js';

function groundTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 512;
  const g = c.getContext('2d');
  g.fillStyle = '#35372f';
  g.fillRect(0, 0, 512, 512);
  // grain
  const img = g.getImageData(0, 0, 512, 512);
  for (let i = 0; i < img.data.length; i += 4) {
    const n = (Math.random() - 0.5) * 26;
    img.data[i] += n; img.data[i + 1] += n; img.data[i + 2] += n;
  }
  g.putImageData(img, 0, 0);
  // fissures
  g.strokeStyle = 'rgba(15,15,14,0.55)';
  for (let i = 0; i < 26; i++) {
    g.lineWidth = Math.random() * 2 + 0.4;
    g.beginPath();
    let x = Math.random() * 512, y = Math.random() * 512;
    g.moveTo(x, y);
    for (let s = 0; s < 7; s++) {
      x += (Math.random() - 0.5) * 90;
      y += (Math.random() - 0.5) * 90;
      g.lineTo(x, y);
    }
    g.stroke();
  }
  // flaques sombres
  for (let i = 0; i < 18; i++) {
    const r = Math.random() * 40 + 10;
    const x = Math.random() * 512, y = Math.random() * 512;
    const grd = g.createRadialGradient(x, y, 0, x, y, r);
    grd.addColorStop(0, 'rgba(10,12,10,0.5)');
    grd.addColorStop(1, 'rgba(10,12,10,0)');
    g.fillStyle = grd;
    g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(28, 28);
  tex.anisotropy = 4;
  return tex;
}

function wallTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = '#4c4a44';
  g.fillRect(0, 0, 256, 256);
  g.strokeStyle = 'rgba(0,0,0,0.35)';
  g.lineWidth = 2;
  for (let y = 0; y < 256; y += 32) {
    g.beginPath(); g.moveTo(0, y); g.lineTo(256, y); g.stroke();
    const off = (y / 32) % 2 ? 32 : 0;
    for (let x = off; x < 256; x += 64) {
      g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + 32); g.stroke();
    }
  }
  const img = g.getImageData(0, 0, 256, 256);
  for (let i = 0; i < img.data.length; i += 4) {
    const n = (Math.random() - 0.5) * 22;
    img.data[i] += n; img.data[i + 1] += n; img.data[i + 2] += n;
  }
  g.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

export class World {
  constructor(scene) {
    this.scene = scene;
    this.obstacles = [];      // boîtes de collision (Box)
    this.spawnPoints = [];
    this.group = new THREE.Group();
    scene.add(this.group);
    this.half = WORLD.size / 2;
    this._build();
  }

  _add(mesh, box) {
    this.group.add(mesh);
    if (box) this.obstacles.push(box);
  }

  _build() {
    const S = WORLD.size;
    const H = this.half;

    // Ciel + brouillard : nuit bleutée, assez claire pour rester lisible
    this.scene.background = new THREE.Color(0x1a222b);
    this.scene.fog = new THREE.Fog(0x1a222b, WORLD.fogNear, WORLD.fogFar);

    // Lumières
    const hemi = new THREE.HemisphereLight(0x8ea6c4, 0x2e2f26, 1.15);
    this.scene.add(hemi);
    const moon = new THREE.DirectionalLight(0xc3d6f0, 1.35);
    moon.position.set(-40, 60, 25);
    moon.castShadow = true;
    moon.shadow.mapSize.set(2048, 2048);
    moon.shadow.camera.left = -H; moon.shadow.camera.right = H;
    moon.shadow.camera.top = H; moon.shadow.camera.bottom = -H;
    moon.shadow.camera.far = 200;
    moon.shadow.bias = -0.0008;
    this.scene.add(moon);
    this.moon = moon;

    // Sol
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(S, S),
      new THREE.MeshLambertMaterial({ map: groundTexture() })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.group.add(ground);

    // Murs d'enceinte
    const wallMat = new THREE.MeshLambertMaterial({ map: wallTexture() });
    const wallTex = wallMat.map;
    wallTex.repeat.set(S / 6, WORLD.wallHeight / 3);
    const t = 2;
    const sides = [
      [0, -H - t / 2, S + t * 2, t],
      [0, H + t / 2, S + t * 2, t],
      [-H - t / 2, 0, t, S + t * 2],
      [H + t / 2, 0, t, S + t * 2],
    ];
    for (const [x, z, sx, sz] of sides) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(sx, WORLD.wallHeight, sz), wallMat);
      m.position.set(x, WORLD.wallHeight / 2, z);
      m.castShadow = true; m.receiveShadow = true;
      this._add(m, new Box(x, z, sx / 2, sz / 2, WORLD.wallHeight));
    }

    this._buildings();
    this._props();
    this._spawnPoints();
  }

  _buildings() {
    const concrete = new THREE.MeshLambertMaterial({ map: wallTexture() });
    const placed = [];
    const H = this.half;

    const tryPlace = (x, z, w, d) => {
      if (Math.hypot(x, z) < 14) return false;             // on garde le centre dégagé
      for (const p of placed) {
        if (Math.abs(x - p.x) < (w + p.w) / 2 + 5 && Math.abs(z - p.z) < (d + p.d) / 2 + 5) return false;
      }
      placed.push({ x, z, w, d });
      return true;
    };

    // Bâtiments en ruine
    for (let i = 0; i < 14; i++) {
      let x, z, w, d, tries = 0;
      do {
        w = rand(6, 14); d = rand(6, 14);
        x = rand(-H + 12, H - 12); z = rand(-H + 12, H - 12);
        tries++;
      } while (!tryPlace(x, z, w, d) && tries < 40);
      if (tries >= 40) continue;

      const h = rand(4, 11);
      const mat = concrete.clone();
      mat.map = concrete.map.clone();
      mat.map.needsUpdate = true;
      mat.map.repeat.set(w / 4, h / 4);
      mat.color.setHSL(0.09, 0.05, rand(0.38, 0.56));
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
      m.position.set(x, h / 2, z);
      m.castShadow = true; m.receiveShadow = true;
      this._add(m, new Box(x, z, w / 2, d / 2, h));

      // débris au pied du bâtiment
      for (let k = 0; k < 3; k++) {
        const rw = rand(1, 3), rh = rand(0.4, 1.4), rd = rand(1, 3);
        const rx = x + rand(-w, w), rz = z + rand(-d, d);
        const r = new THREE.Mesh(new THREE.BoxGeometry(rw, rh, rd), mat);
        r.position.set(rx, rh / 2, rz);
        r.rotation.y = rand(0, Math.PI);
        r.castShadow = true; r.receiveShadow = true;
        this._add(r, new Box(rx, rz, rw / 2, rd / 2, rh));
      }
    }

    // Conteneurs colorés (couverture)
    const containerColors = [0x8c3b2f, 0x2f5d8c, 0x4d7a3b, 0x8c7a2f];
    for (let i = 0; i < 12; i++) {
      let x, z, tries = 0;
      const w = 6.2, d = 2.6, h = 2.6;
      do { x = rand(-H + 8, H - 8); z = rand(-H + 8, H - 8); tries++; }
      while (!tryPlace(x, z, w, d) && tries < 30);
      if (tries >= 30) continue;
      const rot = Math.random() < 0.5;
      const mat = new THREE.MeshLambertMaterial({ color: containerColors[i % containerColors.length] });
      const m = new THREE.Mesh(new THREE.BoxGeometry(rot ? d : w, h, rot ? w : d), mat);
      m.position.set(x, h / 2, z);
      m.castShadow = true; m.receiveShadow = true;
      this._add(m, new Box(x, z, (rot ? d : w) / 2, (rot ? w : d) / 2, h));
    }
  }

  _props() {
    const H = this.half;
    // Lampadaires : points lumineux qui structurent l'arène
    const poleMat = new THREE.MeshLambertMaterial({ color: 0x2a2a2a });
    const lampGeo = new THREE.SphereGeometry(0.28, 10, 8);
    const lampMat = new THREE.MeshBasicMaterial({ color: 0xffd9a0 });
    this.lamps = [];
    const spots = [[-28, -28], [28, -28], [-28, 28], [28, 28], [0, -38], [0, 38], [-38, 0], [38, 0]];
    for (const [x, z] of spots) {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.2, 6.5, 8), poleMat);
      pole.position.set(x, 3.25, z);
      pole.castShadow = true;
      this._add(pole, new Box(x, z, 0.3, 0.3, 6.5));
      const bulb = new THREE.Mesh(lampGeo, lampMat.clone());
      bulb.position.set(x, 6.5, z);
      this.group.add(bulb);
      const light = new THREE.PointLight(0xffc98a, 26, 26, 2);
      light.position.set(x, 6.2, z);
      this.group.add(light);
      this.lamps.push({ bulb, light, base: 26, phase: Math.random() * 10 });
    }

    // Arbres morts (décor, non bloquant au-dessus du tronc)
    const barkMat = new THREE.MeshLambertMaterial({ color: 0x3a2f26 });
    for (let i = 0; i < 22; i++) {
      const x = rand(-H + 6, H - 6), z = rand(-H + 6, H - 6);
      if (Math.hypot(x, z) < 12) continue;
      if (this._blocked(x, z, 1.2)) continue;
      const h = rand(3.5, 7);
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.34, h, 6), barkMat);
      trunk.position.set(x, h / 2, z);
      trunk.rotation.z = rand(-0.12, 0.12);
      trunk.castShadow = true;
      this._add(trunk, new Box(x, z, 0.36, 0.36, h));
      for (let b = 0; b < 3; b++) {
        const bl = rand(0.8, 2);
        const br = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.12, bl, 5), barkMat);
        br.position.set(x + rand(-0.4, 0.4), h * rand(0.55, 0.9), z + rand(-0.4, 0.4));
        br.rotation.set(rand(-1, 1), rand(0, 6.28), rand(-1, 1));
        this.group.add(br);
      }
    }

    // Sacs de sable / barricades basses
    const sandMat = new THREE.MeshLambertMaterial({ color: 0x6b6247 });
    for (let i = 0; i < 10; i++) {
      const x = rand(-H + 10, H - 10), z = rand(-H + 10, H - 10);
      if (Math.hypot(x, z) < 10 || this._blocked(x, z, 3)) continue;
      const len = rand(3, 6);
      const rot = Math.random() < 0.5;
      const w = rot ? 1.1 : len, d = rot ? len : 1.1;
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, 1.1, d), sandMat);
      m.position.set(x, 0.55, z);
      m.castShadow = true; m.receiveShadow = true;
      this._add(m, new Box(x, z, w / 2, d / 2, 1.1));
    }
  }

  _blocked(x, z, pad = 0) {
    for (const b of this.obstacles) if (b.containsXZ(x, z, pad)) return true;
    return false;
  }

  /** Position libre pour faire apparaître quelque chose. */
  freePosition(minDistFrom = null, minDist = 0, pad = 1.2, tries = 60) {
    const H = this.half - 4;
    for (let i = 0; i < tries; i++) {
      const x = rand(-H, H), z = rand(-H, H);
      if (this._blocked(x, z, pad)) continue;
      if (minDistFrom && dist2D({ x, z }, minDistFrom) < minDist) continue;
      return new THREE.Vector3(x, 0, z);
    }
    return new THREE.Vector3(rand(-H, H), 0, rand(-H, H));
  }

  _spawnPoints() {
    const H = this.half - 6;
    for (let i = 0; i < 40; i++) {
      const a = (i / 40) * Math.PI * 2;
      const r = H * rand(0.75, 1);
      const x = Math.cos(a) * r, z = Math.sin(a) * r;
      if (this._blocked(x, z, 1.5)) continue;
      this.spawnPoints.push(new THREE.Vector3(x, 0, z));
    }
    if (!this.spawnPoints.length) {
      this.spawnPoints.push(new THREE.Vector3(H, 0, 0), new THREE.Vector3(-H, 0, 0));
    }
  }

  /** Point d'apparition loin du joueur, hors champ si possible. */
  spawnAwayFrom(playerPos, minDist = 26) {
    const candidates = this.spawnPoints.filter((p) => dist2D(p, playerPos) > minDist);
    const list = candidates.length ? candidates : this.spawnPoints;
    return list[randInt(0, list.length - 1)].clone();
  }

  /**
   * Densifie le brouillard pour la vague « brouillard toxique ».
   * `near` à null rétablit la visibilité normale.
   */
  setFog(near) {
    const target = near === null ? WORLD.fogNear : near;
    const far = near === null ? WORLD.fogFar : near * 2.6;
    this.fogTarget = { near: target, far };
    this.scene.fog.color.setHex(near === null ? 0x1a222b : 0x27352b);
    this.scene.background.setHex(near === null ? 0x1a222b : 0x27352b);
  }

  update(dt, time) {
    // Transition douce du brouillard
    if (this.fogTarget) {
      const f = this.scene.fog;
      f.near += (this.fogTarget.near - f.near) * Math.min(1, dt * 1.6);
      f.far += (this.fogTarget.far - f.far) * Math.min(1, dt * 1.6);
    }

    // Vacillement des lampadaires
    for (const l of this.lamps) {
      const f = 0.85 + Math.sin(time * 9 + l.phase) * 0.06 + (Math.random() < 0.006 ? -0.6 : 0);
      l.light.intensity = l.base * f;
      l.bulb.material.color.setRGB(Math.min(1, f), Math.min(1, 0.85 * f), Math.min(1, 0.63 * f));
    }
  }
}
