import { PERKS } from './config.js';
import { clamp } from './utils.js';
import { Sfx } from './audio.js';

const $ = (id) => document.getElementById(id);

export class HUD {
  constructor() {
    this.el = {
      // couches plein écran
      vignette: $('vignette'),
      blood: $('blood-layer'),
      damageDir: $('damage-dir'),
      scope: $('scope'),
      flash: $('screen-flash'),
      downed: $('downed-overlay'),
      downedTimer: $('downed-timer'),

      // viseur
      crosshair: $('crosshair'),
      hitmarker: $('hitmarker'),

      // économie
      points: $('points-value'),
      pointsBox: $('points-box'),
      pointsPopups: $('points-popups'),
      round: $('round-value'),
      roundPips: $('round-pips'),
      perks: $('perk-row'),

      // armes
      ammo: $('ammo-count'),
      ammoReserve: $('ammo-reserve'),
      weaponName: $('weapon-name'),
      weaponList: $('weapon-list'),
      reloadRing: $('reload-ring'),
      lowAmmo: $('low-ammo'),
      grenades: $('grenade-count'),

      // divers
      prompt: $('prompt'),
      promptTitle: $('prompt-title'),
      promptSub: $('prompt-sub'),
      promptCost: $('prompt-cost'),
      promptFill: $('prompt-fill'),
      powerupBar: $('powerup-bar'),
      toasts: $('toasts'),
      announce: $('announce'),
      announceSub: $('announce-sub'),
      roundBannerEl: $('round-banner'),
      combo: $('combo'),
      comboCount: $('combo-count'),
      comboMul: $('combo-mul'),
      comboBar: $('combo-bar'),
      bossBar: $('boss-bar'),
      bossFill: $('boss-fill'),
      bossName: $('boss-name'),
      enemies: $('enemies-value'),

      // records (menus)
      recMenuScore: $('rec-score'),
      recMenuWave: $('rec-wave'),
      recMenuKills: $('rec-kills'),
      recDeadScore: $('rec-dead-score'),
      recDeadWave: $('rec-dead-wave'),
    };
    this.hitTime = 0;
    this.announceTime = 0;
    this.vignetteAmount = 0;
    this.heartbeatTimer = 0;
    this.lastCombo = 0;
    this.shownPoints = 0;
  }

  // ---------------------------------------------------------------- messages

  toast(text, color = '#ffffff', icon = '') {
    const el = document.createElement('div');
    el.className = 'toast';
    el.innerHTML = `${icon ? `<span class="toast-icon">${icon}</span>` : ''}<span>${text}</span>`;
    el.style.borderColor = color;
    el.style.color = color;
    this.el.toasts.appendChild(el);
    setTimeout(() => el.classList.add('out'), 2200);
    setTimeout(() => el.remove(), 2800);
    while (this.el.toasts.children.length > 5) this.el.toasts.firstChild.remove();
  }

  announce(main, sub = '', duration = 2.4, color = null) {
    this.el.announce.style.color = color || '#fff';
    this.el.announce.textContent = main;
    this.el.announceSub.textContent = sub;
    this.el.announce.classList.remove('hidden');
    this.el.announce.classList.add('pop');
    this.el.announceSub.classList.remove('hidden');
    this.announceTime = duration;
    setTimeout(() => this.el.announce.classList.remove('pop'), 400);
  }

  /** Grand carton de début de manche. */
  roundBanner(n) {
    const el = this.el.roundBannerEl;
    el.innerHTML = `<span>MANCHE</span><b>${n}</b>`;
    el.classList.remove('hidden');
    el.classList.remove('play');
    void el.offsetWidth;
    el.classList.add('play');
    setTimeout(() => el.classList.add('hidden'), 2600);
  }

  powerupBanner(def) {
    const el = document.createElement('div');
    el.className = 'powerup-banner';
    el.innerHTML = `<span>${def.icon}</span><b>${def.name}</b>`;
    el.style.color = '#' + def.color.toString(16).padStart(6, '0');
    this.el.toasts.parentElement.appendChild(el);
    setTimeout(() => el.remove(), 2000);
  }

  comboBanner(label, mul) {
    const el = document.createElement('div');
    el.className = 'combo-banner';
    el.innerHTML = `<span>${label}</span><b>×${mul}</b>`;
    this.el.toasts.parentElement.appendChild(el);
    setTimeout(() => el.remove(), 1400);
  }

  flashScreen(color) {
    const f = this.el.flash;
    f.style.background = color;
    f.classList.remove('play');
    void f.offsetWidth;
    f.classList.add('play');
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

  flashDamage(amount) {
    this.vignetteAmount = clamp(this.vignetteAmount + amount / 35, 0, 1);
    this.bloodSplat(amount);
  }

  bloodSplat(amount) {
    if (!this.el.blood) return;
    const n = clamp(Math.round(amount / 10), 1, 5);
    for (let i = 0; i < n; i++) {
      const el = document.createElement('div');
      el.className = 'blood-splat';
      const size = 110 + Math.random() * 260;
      el.style.width = el.style.height = size + 'px';
      el.style.left = Math.random() * 100 + '%';
      el.style.top = Math.random() * 100 + '%';
      el.style.setProperty('--rot', (Math.random() * 360) + 'deg');
      this.el.blood.appendChild(el);
      setTimeout(() => el.remove(), 5200);
    }
    while (this.el.blood.children.length > 16) this.el.blood.firstChild.remove();
  }

  /** Petit « +50 » qui monte à côté du compteur de points. */
  pointPopup(amount) {
    if (!this.el.pointsPopups || amount === 0) return;
    const el = document.createElement('div');
    el.className = 'point-popup' + (amount < 0 ? ' spend' : '');
    el.textContent = (amount > 0 ? '+' : '') + amount;
    this.el.pointsPopups.appendChild(el);
    setTimeout(() => el.remove(), 1000);
    while (this.el.pointsPopups.children.length > 6) this.el.pointsPopups.firstChild.remove();
  }

  // ---------------------------------------------------------------- panneaux

  setPrompt(info, hold = 0, holdTime = 0) {
    const p = this.el.prompt;
    if (!info) { p.classList.add('hidden'); return; }
    p.classList.remove('hidden');
    p.classList.toggle('blocked', !!info.blocked);
    this.el.promptTitle.textContent = info.title;
    this.el.promptSub.textContent = info.sub || '';
    if (info.cost) {
      this.el.promptCost.textContent = info.cost + ' pts';
      this.el.promptCost.classList.remove('hidden');
    } else {
      this.el.promptCost.classList.add('hidden');
    }
    const ratio = holdTime > 0 ? clamp(hold / holdTime, 0, 1) : 0;
    this.el.promptFill.style.transform = `scaleX(${ratio})`;
  }

  updatePerks(player) {
    const parts = [];
    for (const id of Object.keys(player.perks)) {
      const p = PERKS[id];
      if (!p) continue;
      parts.push(
        `<li style="--c:#${p.color.toString(16).padStart(6, '0')}" title="${p.desc}">` +
        `<span>${p.icon}</span></li>`
      );
    }
    this.el.perks.innerHTML = parts.join('');
  }

  updateWeaponList(weapons) {
    const parts = [];
    weapons.owned.forEach((id, i) => {
      const s = weapons.slots[id];
      parts.push(
        `<li class="${id === weapons.current ? 'active' : ''}">` +
        `<b>${i + 1}</b>${weapons.displayName(id)}</li>`
      );
    });
    this.el.weaponList.innerHTML = parts.join('');
  }

  updateRecords(records) {
    const fmt = (n) => n.toLocaleString('fr-FR');
    if (this.el.recMenuScore) this.el.recMenuScore.textContent = fmt(records.bestScore);
    if (this.el.recMenuWave) this.el.recMenuWave.textContent = records.bestWave;
    if (this.el.recMenuKills) this.el.recMenuKills.textContent = fmt(records.totalKills);
    if (this.el.recDeadScore) this.el.recDeadScore.textContent = fmt(records.bestScore);
    if (this.el.recDeadWave) this.el.recDeadWave.textContent = records.bestWave;
  }

  // ---------------------------------------------------------------- boucle

  update(dt, game) {
    const p = game.player;
    const w = game.weapons;

    // Points : le compteur rattrape la valeur réelle, ça se voit mieux.
    this.shownPoints += (p.points - this.shownPoints) * Math.min(1, dt * 9);
    if (Math.abs(p.points - this.shownPoints) < 1) this.shownPoints = p.points;
    this.el.points.textContent = Math.round(this.shownPoints).toLocaleString('fr-FR');
    this.el.pointsBox.classList.toggle('rich', p.points >= 5000);

    // Manche
    this.el.round.textContent = game.round;
    const pips = Math.min(game.round, 12);
    if (this.el.roundPips.childElementCount !== pips) {
      this.el.roundPips.innerHTML = '<i></i>'.repeat(pips);
    }
    this.el.enemies.textContent = game.zombies.aliveCount() + game.pendingSpawns;

    // Munitions
    const slot = w.slot;
    this.el.ammo.textContent = slot.ammo;
    this.el.ammoReserve.textContent = slot.reserve === Infinity ? '∞' : slot.reserve;
    this.el.weaponName.textContent = w.displayName();
    this.el.weaponName.classList.toggle('upgraded', slot.upgraded);
    this.el.ammo.classList.toggle('empty', slot.ammo === 0);
    this.el.lowAmmo.classList.toggle('hidden', !(slot.ammo <= Math.max(1, w.magSize() * 0.25) && !w.reloading));
    this.el.grenades.textContent = game.grenades.count;
    this.el.grenades.parentElement.classList.toggle('empty', game.grenades.count === 0);

    if (w.reloading) {
      const total = (slot.def.id === 'fusil' ? slot.def.reloadShell : slot.def.reload) * p.stats.reloadMul;
      const t = 1 - clamp(w.reloadTimer / total, 0, 1);
      this.el.reloadRing.classList.remove('hidden');
      this.el.reloadRing.style.background =
        `conic-gradient(#ffd166 ${t * 360}deg, rgba(255,255,255,0.12) 0deg)`;
    } else {
      this.el.reloadRing.classList.add('hidden');
    }

    // Bonus actifs
    const active = game.powerups.activeList();
    if (active.length) {
      this.el.powerupBar.classList.remove('hidden');
      this.el.powerupBar.innerHTML = active.map((a) =>
        `<div class="pw" style="--c:#${a.def.color.toString(16).padStart(6, '0')}">` +
        `<span>${a.def.icon}</span><b>${Math.ceil(a.time)}</b></div>`).join('');
    } else {
      this.el.powerupBar.classList.add('hidden');
    }

    // Combo
    if (game.combo > 1) {
      this.el.combo.classList.remove('hidden');
      this.el.comboCount.textContent = game.combo;
      const mul = game.comboMultiplier;
      this.el.comboMul.textContent = mul > 1 ? '×' + mul : '';
      this.el.comboBar.style.transform = `scaleX(${clamp(game.comboTimer / 3.6, 0, 1)})`;
      this.el.combo.classList.toggle('hot', mul >= 2);
      if (game.combo !== this.lastCombo) {
        this.el.comboCount.classList.remove('bump');
        void this.el.comboCount.offsetWidth;
        this.el.comboCount.classList.add('bump');
        this.lastCombo = game.combo;
      }
    } else {
      this.el.combo.classList.add('hidden');
      this.lastCombo = 0;
    }

    // Lunette et réticule
    this.el.scope.classList.toggle('hidden', !w.scoped);
    const spread = w.def.spread * (w.aiming ? 0.45 : 1) * (p.sprinting ? 1.6 : 1);
    this.el.crosshair.style.setProperty('--gap', (4 + spread * 620 + w.recoil * 18).toFixed(1) + 'px');
    this.el.crosshair.classList.toggle('hidden', w.aimAmount > 0.7 || p.downed);

    this.hitTime = Math.max(0, this.hitTime - dt);
    this.el.hitmarker.style.opacity = this.hitTime > 0 ? String(clamp(this.hitTime / 0.14, 0, 1)) : '0';

    // Santé : pas de barre, seulement l'écran qui se couvre de sang
    const hp = clamp(p.health / p.maxHealth, 0, 1);
    const hurt = Math.pow(1 - hp, 1.4);
    this.vignetteAmount = Math.max(this.vignetteAmount - dt * 1.1, hurt * 0.92);
    this.el.vignette.style.opacity = clamp(this.vignetteAmount, 0, 1).toFixed(3);

    if (hp < 0.5 && p.alive) {
      this.heartbeatTimer -= dt;
      if (this.heartbeatTimer <= 0) {
        this.heartbeatTimer = 0.45 + hp * 1.5;
        Sfx.heartbeat();
      }
    } else {
      this.heartbeatTimer = 0;
    }

    // À terre
    if (p.downed) {
      this.el.downed.classList.remove('hidden');
      this.el.downedTimer.textContent = Math.max(0, p.downTimer).toFixed(1);
    } else {
      this.el.downed.classList.add('hidden');
    }

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
  }
}
