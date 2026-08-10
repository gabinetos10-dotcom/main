/**
 * Champ de navigation.
 *
 * Dans une carte cloisonnée, foncer en ligne droite vers le joueur coince les
 * zombies contre les murs. On maintient donc une grille d'occupation et on y
 * propage une distance depuis le joueur (parcours en largeur). Chaque zombie
 * lit ensuite la case voisine la plus proche du joueur : les couloirs, les
 * portes ouvertes et les fenêtres sont suivis naturellement, et fermer une
 * porte modifie instantanément tous les trajets.
 */

const UNREACHABLE = 65535;

export class NavGrid {
  constructor(halfSize, cell = 1) {
    this.cell = cell;
    this.half = halfSize;
    this.size = Math.ceil((halfSize * 2) / cell);
    this.blocked = new Uint8Array(this.size * this.size);
    this.doorId = new Int16Array(this.size * this.size).fill(-1);
    this.dist = new Uint16Array(this.size * this.size).fill(UNREACHABLE);
    this.queue = new Int32Array(this.size * this.size);
    this.openDoors = new Set();
    this.dirty = true;
    this.rebuildTimer = 0;
  }

  index(ix, iz) { return iz * this.size + ix; }

  toCell(x, z) {
    return [
      Math.floor((x + this.half) / this.cell),
      Math.floor((z + this.half) / this.cell),
    ];
  }

  toWorld(ix, iz) {
    return [
      ix * this.cell - this.half + this.cell / 2,
      iz * this.cell - this.half + this.cell / 2,
    ];
  }

  inBounds(ix, iz) {
    return ix >= 0 && iz >= 0 && ix < this.size && iz < this.size;
  }

  /** Marque comme infranchissable tout le rectangle donné (en mètres). */
  blockRect(minX, minZ, maxX, maxZ, pad = 0) {
    const [ax, az] = this.toCell(minX - pad, minZ - pad);
    const [bx, bz] = this.toCell(maxX + pad, maxZ + pad);
    for (let iz = Math.max(0, az); iz <= Math.min(this.size - 1, bz); iz++) {
      for (let ix = Math.max(0, ax); ix <= Math.min(this.size - 1, bx); ix++) {
        this.blocked[this.index(ix, iz)] = 1;
      }
    }
  }

  /** Rouvre un rectangle (percement d'une porte ou d'une fenêtre). */
  clearRect(minX, minZ, maxX, maxZ, doorId = -1) {
    const [ax, az] = this.toCell(minX, minZ);
    const [bx, bz] = this.toCell(maxX, maxZ);
    for (let iz = Math.max(0, az); iz <= Math.min(this.size - 1, bz); iz++) {
      for (let ix = Math.max(0, ax); ix <= Math.min(this.size - 1, bx); ix++) {
        const i = this.index(ix, iz);
        this.blocked[i] = 0;
        if (doorId >= 0) this.doorId[i] = doorId;
      }
    }
  }

  openDoor(id) {
    this.openDoors.add(id);
    this.dirty = true;
  }

  isPassable(i) {
    if (this.blocked[i]) return false;
    const d = this.doorId[i];
    return d < 0 || this.openDoors.has(d);
  }

  /** Recalcule les distances depuis la position du joueur. */
  rebuild(px, pz) {
    const [sx, sz] = this.toCell(px, pz);
    this.dist.fill(UNREACHABLE);
    if (!this.inBounds(sx, sz)) return;

    let start = this.index(sx, sz);
    if (!this.isPassable(start)) {
      // Le joueur chevauche un mur : on part de la case libre la plus proche.
      let best = -1, bestD = Infinity;
      for (let r = 1; r <= 3 && best < 0; r++) {
        for (let dz = -r; dz <= r; dz++) {
          for (let dx = -r; dx <= r; dx++) {
            const ix = sx + dx, iz = sz + dz;
            if (!this.inBounds(ix, iz)) continue;
            const i = this.index(ix, iz);
            if (!this.isPassable(i)) continue;
            const d = dx * dx + dz * dz;
            if (d < bestD) { bestD = d; best = i; }
          }
        }
      }
      if (best < 0) return;
      start = best;
    }

    const q = this.queue;
    let head = 0, tail = 0;
    q[tail++] = start;
    this.dist[start] = 0;
    const S = this.size;

    while (head < tail) {
      const cur = q[head++];
      const d = this.dist[cur] + 1;
      const cx = cur % S;
      const cz = (cur - cx) / S;

      for (let k = 0; k < 4; k++) {
        const nx = cx + (k === 0 ? 1 : k === 1 ? -1 : 0);
        const nz = cz + (k === 2 ? 1 : k === 3 ? -1 : 0);
        if (nx < 0 || nz < 0 || nx >= S || nz >= S) continue;
        const ni = nz * S + nx;
        if (this.dist[ni] !== UNREACHABLE) continue;
        if (!this.isPassable(ni)) continue;
        this.dist[ni] = d;
        q[tail++] = ni;
      }
    }
    this.dirty = false;
  }

  update(dt, px, pz) {
    this.rebuildTimer -= dt;
    if (this.rebuildTimer <= 0 || this.dirty) {
      this.rebuildTimer = 0.22;
      this.rebuild(px, pz);
    }
  }

  /**
   * Direction conseillée depuis une position du monde, vers le joueur.
   * Renvoie null si la case est isolée (le zombie retombe alors sur une
   * poursuite directe).
   */
  direction(x, z, out) {
    const [cx, cz] = this.toCell(x, z);
    if (!this.inBounds(cx, cz)) return null;
    const here = this.dist[this.index(cx, cz)];

    let bestD = here === UNREACHABLE ? UNREACHABLE : here;
    let bx = -1, bz = -1;
    // Voisinage complet (8 directions) pour des trajectoires moins hachées
    for (let dz = -1; dz <= 1; dz++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dz) continue;
        const ix = cx + dx, iz = cz + dz;
        if (!this.inBounds(ix, iz)) continue;
        const i = this.index(ix, iz);
        if (!this.isPassable(i)) continue;
        // Pas de diagonale à travers un angle de mur
        if (dx && dz) {
          if (!this.isPassable(this.index(cx + dx, cz)) ||
              !this.isPassable(this.index(cx, cz + dz))) continue;
        }
        const d = this.dist[i];
        if (d < bestD) { bestD = d; bx = ix; bz = iz; }
      }
    }
    if (bx < 0) return null;

    const [wx, wz] = this.toWorld(bx, bz);
    out.set(wx - x, 0, wz - z);
    const len = Math.hypot(out.x, out.z);
    if (len < 1e-5) return null;
    out.x /= len; out.z /= len;
    return out;
  }

  /** Le joueur est-il atteignable depuis cette position ? */
  reachable(x, z) {
    const [cx, cz] = this.toCell(x, z);
    if (!this.inBounds(cx, cz)) return false;
    return this.dist[this.index(cx, cz)] !== UNREACHABLE;
  }
}
