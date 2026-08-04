import { UPGRADES } from './config.js';
import { clamp } from './utils.js';

const $ = (id) => document.getElementById(id);

export class HUD {
  constructor() {
    this.el = {
      health: $('health-fill'),
      healthText: $('health-text'),
      stamina: $('stamina-fill'),
      ammo: $('ammo-count'),
      ammoReserve: $('ammo-reserve'),
      weaponName: $('weapon-name'),
      weaponList: $('weapon-list'),
      wave: $('wave-value'),
      enemies: $('enemies-value'),
      score: $('score-value'),
      kills: $('kills-value'),
      crosshair: $('crosshair'),
      hitmarker: $('hitmarker'),
      toasts: $('toasts'),
      upgrades: $('upgrade-list'),
      bossBar: $('boss-bar'),
      bossFill: $('boss-fill'),
      bossName: $('boss-name'),
      announce: $('announce'),
      announceSub: $('announce-sub'),
      vignette: $('vignette'),
      damageDir: $('damage-dir'),
      minimap: $('minimap'),
      reloadRing: $('reload-ring'),
      lowAmmo: $('low-ammo'),
    };
    this.map = this.el.minimap ? this.el.minimap.getContext('2d') : null;
    this.hitTime = 0;
    this.announceTime = 0;
    this.vignetteAmount = 0;
    this.dirIndicators = [];
  }

  toast(text, color = '#ffffff', icon = '') {
    const el = document.createElement('div');
    el.className = 'toast';
    el.innerHTML = `${icon ? `<span class="toast-icon">${icon}</span>` : ''}<span>${text}</span>`;
    el.style.borderColor = color;
    el.style.color = color;
    this.el.toasts.appendChild(el);
    setTimeout(() => el.classList.add('out'), 2200);
    setTimeout(() => el.remove(), 2800);
    while (this.el.toasts.children.length > 6) this.el.toasts.firstChild.remove();
  }

  announce(main, sub = '', duration = 2.4) {
    this.el.announce.textContent = main;
    this.el.announceSub.textContent = sub;
    this.el.announce.classList.remove('hidden');
    this.el.announce.classList.add('pop');
    this.el.announceSub.classList.remove('hidden');
    this.announceTime = duration;
    setTimeout(() => this.el.announce.classList.remove('pop'), 400);
  }

  hitmark(kind = 'normal') {
    this.hitTime = 0.14;
    this.el.hitmarker.className = 'hit-' + kind;
  }

  damageFrom(angle) {
    const el = document.createElement('div');
    el.className = 'dir-indicator';
    el.style.transform = `rotate(${angle}rad)`;
    this.el.damageDir.appendChild(el);
    setTimeout(() => el.remove(), 900);
  }

  updateUpgrades(player) {
    const parts = [];
    for (const u of UPGRADES) {
      const n = player.upgrades[u.id] || 0;
      if (n > 0) {
        parts.push(`<li style="--c:#${u.color.toString(16).padStart(6, '0')}"><span>${u.icon}</span>${u.name.replace(/ \+.*| .*%/, '')}<b>×${n}</b></li>`);
      }
    }
    this.el.upgrades.innerHTML = parts.join('') || '<li class="empty">Tirez sur les cristaux pour vous renforcer</li>';
  }

  updateWeaponList(weapons) {
    const parts = [];
    for (const id of weapons.order) {
      const s = weapons.slots[id];
      if (!s.unlocked) continue;
      const idx = weapons.order.indexOf(id) + 1;
      parts.push(`<li class="${id === weapons.current ? 'active' : ''}"><b>${idx}</b>${s.def.name}</li>`);
    }
    this.el.weaponList.innerHTML = parts.join('');
  }

  update(dt, game) {
    const p = game.player;
    const w = game.weapons;

    // Vie
    const hp = clamp(p.health / p.maxHealth, 0, 1);
    this.el.health.style.width = (hp * 100).toFixed(1) + '%';
    this.el.health.style.background = hp > 0.5
      ? 'linear-gradient(90deg,#3ddc84,#2fbf6f)'
      : hp > 0.25 ? 'linear-gradient(90deg,#ffbb33,#ff9500)' : 'linear-gradient(90deg,#ff5252,#c62828)';
    this.el.healthText.textContent = `${Math.ceil(p.health)} / ${p.maxHealth}`;

    // Endurance
    this.el.stamina.style.width = (p.stamina / 100 * 100).toFixed(1) + '%';

    // Munitions
    const slot = w.slot;
    this.el.ammo.textContent = slot.ammo;
    this.el.ammoReserve.textContent = slot.reserve === Infinity ? '∞' : slot.reserve;
    this.el.weaponName.textContent = slot.def.name;
    this.el.ammo.classList.toggle('empty', slot.ammo === 0);
    this.el.lowAmmo.classList.toggle('hidden', !(slot.ammo <= Math.max(1, w.magSize() * 0.25) && !w.reloading));

    // Anneau de rechargement
    if (w.reloading) {
      const total = (slot.def.id === 'fusil' ? slot.def.reloadShell : slot.def.reload) * p.stats.reloadMul;
      const t = 1 - clamp(w.reloadTimer / total, 0, 1);
      this.el.reloadRing.classList.remove('hidden');
      this.el.reloadRing.style.background =
        `conic-gradient(#ffd166 ${t * 360}deg, rgba(255,255,255,0.12) 0deg)`;
    } else {
      this.el.reloadRing.classList.add('hidden');
    }

    // Vagues
    this.el.wave.textContent = game.wave;
    this.el.enemies.textContent = game.zombies.aliveCount() + game.pendingSpawns;
    this.el.score.textContent = p.score.toLocaleString('fr-FR');
    this.el.kills.textContent = p.kills;

    // Réticule : s'ouvre avec la dispersion
    const spread = w.def.spread * (w.aiming ? 0.45 : 1) * (p.sprinting ? 1.6 : 1);
    const gap = 4 + spread * 620 + w.recoil * 18;
    this.el.crosshair.style.setProperty('--gap', gap.toFixed(1) + 'px');
    this.el.crosshair.classList.toggle('hidden', w.aimAmount > 0.7);

    // Marqueur de touche
    this.hitTime = Math.max(0, this.hitTime - dt);
    this.el.hitmarker.style.opacity = this.hitTime > 0 ? String(clamp(this.hitTime / 0.14, 0, 1)) : '0';

    // Vignette de dégâts : discrète en combat, elle ne s'installe qu'en dessous
    // de 35 % de vie pour signaler le danger sans masquer la scène.
    const hpRatio = clamp(p.health / p.maxHealth, 0, 1);
    const critical = Math.max(0, (0.35 - hpRatio) / 0.35) * 0.62;
    this.vignetteAmount = Math.max(this.vignetteAmount - dt * 1.6, critical);
    this.el.vignette.style.opacity = clamp(this.vignetteAmount, 0, 1).toFixed(3);

    // Annonce
    if (this.announceTime > 0) {
      this.announceTime -= dt;
      if (this.announceTime <= 0) {
        this.el.announce.classList.add('hidden');
        this.el.announceSub.classList.add('hidden');
      }
    }

    // Barre de boss
    const boss = game.zombies.boss;
    if (boss && boss.alive) {
      this.el.bossBar.classList.remove('hidden');
      this.el.bossFill.style.width = (clamp(boss.health / boss.maxHealth, 0, 1) * 100).toFixed(1) + '%';
      this.el.bossName.textContent = boss.def.name;
    } else {
      this.el.bossBar.classList.add('hidden');
    }

    this.drawMinimap(game);
  }

  flashDamage(amount) {
    this.vignetteAmount = clamp(this.vignetteAmount + amount / 45, 0, 1);
  }

  drawMinimap(game) {
    const ctx = this.map;
    if (!ctx) return;
    const c = this.el.minimap;
    const size = c.width;
    const range = 46;                     // rayon couvert en mètres
    const p = game.player;
    ctx.clearRect(0, 0, size, size);

    ctx.save();
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2 - 1, 0, Math.PI * 2);
    ctx.clip();
    ctx.fillStyle = 'rgba(8,12,10,0.72)';
    ctx.fillRect(0, 0, size, size);

    const scale = (size / 2) / range;
    const cos = Math.cos(-p.yaw), sin = Math.sin(-p.yaw);
    const toMap = (x, z) => {
      const dx = x - p.pos.x, dz = z - p.pos.z;
      // rotation pour garder le joueur orienté vers le haut
      const rx = dx * cos - dz * sin;
      const rz = dx * sin + dz * cos;
      return [size / 2 + rx * scale, size / 2 + rz * scale];
    };

    // décor
    ctx.fillStyle = 'rgba(120,130,120,0.35)';
    for (const b of game.world.obstacles) {
      const cx = (b.min.x + b.max.x) / 2, cz = (b.min.z + b.max.z) / 2;
      if (Math.hypot(cx - p.pos.x, cz - p.pos.z) > range * 1.6) continue;
      const hw = (b.max.x - b.min.x) / 2, hh = (b.max.z - b.min.z) / 2;
      const [mx, my] = toMap(cx, cz);
      ctx.save();
      ctx.translate(mx, my);
      ctx.rotate(-p.yaw);
      ctx.fillRect(-hw * scale, -hh * scale, hw * 2 * scale, hh * 2 * scale);
      ctx.restore();
    }

    // cristaux
    for (const o of game.pickups.shootables) {
      if (o.dead) continue;
      const [mx, my] = toMap(o.group.position.x, o.group.position.z);
      ctx.fillStyle = o.kind === 'crystal' ? '#' + o.upgrade.color.toString(16).padStart(6, '0')
        : o.kind === 'weapon' ? '#8ef58e' : '#c0553f';
      ctx.beginPath();
      ctx.arc(mx, my, o.kind === 'barrel' ? 2 : 3.2, 0, Math.PI * 2);
      ctx.fill();
    }

    // objets au sol
    for (const d of game.pickups.drops) {
      const [mx, my] = toMap(d.group.position.x, d.group.position.z);
      ctx.fillStyle = d.kind === 'health' ? '#66ff99' : '#ffdd55';
      ctx.fillRect(mx - 2, my - 2, 4, 4);
    }

    // zombies
    for (const z of game.zombies.zombies) {
      if (!z.alive) continue;
      const [mx, my] = toMap(z.pos.x, z.pos.z);
      ctx.fillStyle = z.def.boss ? '#ff2d95' : z.def.big ? '#ff7043' : '#ff4444';
      ctx.beginPath();
      ctx.arc(mx, my, z.def.big ? 4.2 : 2.6, 0, Math.PI * 2);
      ctx.fill();
    }

    // joueur + cône de vision
    ctx.fillStyle = 'rgba(120,220,255,0.18)';
    ctx.beginPath();
    ctx.moveTo(size / 2, size / 2);
    ctx.arc(size / 2, size / 2, size / 2, -Math.PI / 2 - 0.6, -Math.PI / 2 + 0.6);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#7fdcff';
    ctx.beginPath();
    ctx.moveTo(size / 2, size / 2 - 5);
    ctx.lineTo(size / 2 - 4, size / 2 + 4);
    ctx.lineTo(size / 2 + 4, size / 2 + 4);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2 - 1, 0, Math.PI * 2);
    ctx.stroke();
  }
}
