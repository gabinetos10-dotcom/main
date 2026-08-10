// Audio 100 % procédural (WebAudio) : aucun fichier son à télécharger.

let ctx = null;
let master = null;
let noiseBuffer = null;
let enabled = true;

export function initAudio() {
  if (ctx) return ctx;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) { enabled = false; return null; }
  ctx = new AC();
  master = ctx.createGain();
  master.gain.value = 0.5;
  master.connect(ctx.destination);

  const len = ctx.sampleRate * 2;
  noiseBuffer = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = noiseBuffer.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  return ctx;
}

export function resumeAudio() {
  if (ctx && ctx.state === 'suspended') ctx.resume();
}

export function setVolume(v) {
  if (master) master.gain.value = v;
}

export function setAudioEnabled(v) {
  enabled = v;
  if (master) master.gain.setTargetAtTime(v ? 0.5 : 0, ctx.currentTime, 0.05);
}

function noise(duration, { gain = 0.4, type = 'lowpass', freq = 1200, q = 1, sweepTo = null, delay = 0 } = {}) {
  if (!ctx || !enabled) return;
  const t = ctx.currentTime + delay;
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer;
  src.loop = true;
  const filter = ctx.createBiquadFilter();
  filter.type = type;
  filter.frequency.setValueAtTime(freq, t);
  filter.Q.value = q;
  if (sweepTo !== null) filter.frequency.exponentialRampToValueAtTime(Math.max(40, sweepTo), t + duration);
  const g = ctx.createGain();
  g.gain.setValueAtTime(gain, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + duration);
  src.connect(filter).connect(g).connect(master);
  src.start(t);
  src.stop(t + duration + 0.02);
}

function tone(freq, duration, { gain = 0.2, type = 'sine', to = null, delay = 0 } = {}) {
  if (!ctx || !enabled) return;
  const t = ctx.currentTime + delay;
  const osc = ctx.createOscillator();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  if (to !== null) osc.frequency.exponentialRampToValueAtTime(Math.max(20, to), t + duration);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, t + duration);
  osc.connect(g).connect(master);
  osc.start(t);
  osc.stop(t + duration + 0.02);
}

export const Sfx = {
  shoot(weaponId) {
    if (weaponId === 'fusil') {
      noise(0.34, { gain: 0.55, freq: 2400, sweepTo: 160 });
      tone(90, 0.22, { gain: 0.35, type: 'square', to: 40 });
    } else if (weaponId === 'assaut') {
      noise(0.13, { gain: 0.36, freq: 3400, sweepTo: 420 });
      tone(160, 0.09, { gain: 0.18, type: 'square', to: 60 });
    } else {
      noise(0.16, { gain: 0.34, freq: 2600, sweepTo: 380 });
      tone(210, 0.09, { gain: 0.16, type: 'square', to: 80 });
    }
  },
  dryFire() { tone(1400, 0.04, { gain: 0.08, type: 'square' }); },
  reload() {
    noise(0.07, { gain: 0.2, freq: 900, q: 4 });
    noise(0.07, { gain: 0.2, freq: 700, q: 4, delay: 0.18 });
  },
  reloadEnd() { noise(0.09, { gain: 0.25, freq: 1500, q: 6 }); },
  hit() { noise(0.07, { gain: 0.28, freq: 700, sweepTo: 220 }); },
  headshot() {
    noise(0.1, { gain: 0.4, freq: 1600, sweepTo: 180 });
    tone(880, 0.09, { gain: 0.14, type: 'triangle', to: 1500 });
  },
  wallHit() { noise(0.05, { gain: 0.16, freq: 3000, sweepTo: 900 }); },
  zombieDie() { tone(180, 0.5, { gain: 0.18, type: 'sawtooth', to: 45 }); noise(0.3, { gain: 0.15, freq: 500, sweepTo: 120 }); },
  zombieGrowl() { tone(70 + Math.random() * 40, 0.7, { gain: 0.1, type: 'sawtooth', to: 45 }); },
  bruteRoar() {
    tone(58, 1.3, { gain: 0.3, type: 'sawtooth', to: 30 });
    tone(88, 1.1, { gain: 0.2, type: 'square', to: 42 });
    noise(1.0, { gain: 0.18, freq: 420, sweepTo: 90 });
  },
  slam() {
    tone(48, 0.6, { gain: 0.42, type: 'sine', to: 22 });
    noise(0.45, { gain: 0.35, freq: 900, sweepTo: 60 });
  },
  playerHurt() { tone(220, 0.22, { gain: 0.22, type: 'triangle', to: 110 }); },
  pickup() { tone(660, 0.1, { gain: 0.16, type: 'triangle' }); tone(990, 0.16, { gain: 0.14, type: 'triangle', delay: 0.08 }); },
  upgrade() {
    tone(523, 0.13, { gain: 0.16, type: 'triangle' });
    tone(659, 0.13, { gain: 0.16, type: 'triangle', delay: 0.1 });
    tone(880, 0.28, { gain: 0.18, type: 'triangle', delay: 0.2 });
  },
  crystalBreak() { noise(0.25, { gain: 0.3, freq: 5200, sweepTo: 900, type: 'bandpass', q: 2 }); },
  explosion() {
    noise(0.75, { gain: 0.6, freq: 1600, sweepTo: 45 });
    tone(60, 0.7, { gain: 0.4, type: 'sine', to: 20 });
  },
  waveStart() {
    tone(196, 0.3, { gain: 0.2, type: 'sawtooth' });
    tone(147, 0.5, { gain: 0.22, type: 'sawtooth', delay: 0.25 });
  },
  gameOver() {
    tone(220, 0.9, { gain: 0.25, type: 'sawtooth', to: 60 });
    tone(165, 1.4, { gain: 0.2, type: 'sine', to: 40, delay: 0.3 });
  },
  spit() { noise(0.22, { gain: 0.22, freq: 1800, sweepTo: 300, type: 'bandpass', q: 3 }); },
  melee() {
    noise(0.16, { gain: 0.3, freq: 1200, sweepTo: 260 });
    tone(140, 0.12, { gain: 0.2, type: 'square', to: 60 });
  },
  meleeHit() {
    noise(0.2, { gain: 0.42, freq: 600, sweepTo: 90 });
    tone(90, 0.22, { gain: 0.28, type: 'sine', to: 38 });
  },
  throwGrenade() { noise(0.14, { gain: 0.18, freq: 1400, sweepTo: 500 }); },
  grenadeBounce() { tone(320, 0.05, { gain: 0.12, type: 'square', to: 180 }); },
  grenadeBeep() { tone(1760, 0.05, { gain: 0.1, type: 'square' }); },
  scope() { noise(0.09, { gain: 0.14, freq: 2200, q: 5, type: 'bandpass' }); },
  comboUp(step) {
    const base = 440 * Math.pow(1.26, Math.min(4, step));
    tone(base, 0.1, { gain: 0.14, type: 'triangle' });
    tone(base * 1.5, 0.2, { gain: 0.12, type: 'triangle', delay: 0.07 });
  },
  heartbeat() {
    tone(58, 0.13, { gain: 0.3, type: 'sine', to: 34 });
    tone(52, 0.16, { gain: 0.22, type: 'sine', to: 30, delay: 0.19 });
  },
  record() {
    [523, 659, 784, 1047].forEach((f, i) =>
      tone(f, 0.3, { gain: 0.15, type: 'triangle', delay: i * 0.11 }));
  },

  // --- mode manches ---
  purchase() {
    tone(880, 0.08, { gain: 0.13, type: 'square' });
    tone(1320, 0.16, { gain: 0.11, type: 'square', delay: 0.06 });
  },
  denied() { tone(160, 0.16, { gain: 0.14, type: 'square', to: 90 }); },
  doorOpen() {
    noise(0.7, { gain: 0.3, freq: 500, sweepTo: 120 });
    tone(70, 0.5, { gain: 0.2, type: 'sawtooth', to: 40 });
  },
  perk() {
    [392, 523, 659, 880].forEach((f, i) =>
      tone(f, 0.26, { gain: 0.13, type: 'triangle', delay: i * 0.08 }));
  },
  power() {
    tone(45, 1.6, { gain: 0.3, type: 'sawtooth', to: 120 });
    noise(1.2, { gain: 0.2, freq: 300, sweepTo: 3000 });
    [261, 329, 392].forEach((f, i) =>
      tone(f, 0.5, { gain: 0.12, type: 'triangle', delay: 0.9 + i * 0.12 }));
  },
  boxOpen() {
    noise(0.5, { gain: 0.22, freq: 900, sweepTo: 2600 });
    tone(220, 0.5, { gain: 0.14, type: 'triangle', to: 660 });
  },
  boxTick() { tone(1200 + Math.random() * 500, 0.03, { gain: 0.05, type: 'square' }); },
  upgradeStation() {
    tone(110, 2.2, { gain: 0.2, type: 'sawtooth', to: 900 });
    noise(2.0, { gain: 0.16, freq: 400, sweepTo: 4000 });
  },
  plankTear() {
    noise(0.22, { gain: 0.3, freq: 1500, sweepTo: 260, type: 'bandpass', q: 2 });
    tone(180, 0.14, { gain: 0.12, type: 'square', to: 70 });
  },
  plankPlace() {
    noise(0.1, { gain: 0.22, freq: 700, sweepTo: 220 });
    tone(240, 0.08, { gain: 0.1, type: 'square', to: 140 });
  },
  powerup() {
    [660, 880, 1320].forEach((f, i) =>
      tone(f, 0.24, { gain: 0.15, type: 'triangle', delay: i * 0.07 }));
  },
  roundStart(round) {
    // grondement qui monte, plus grave à mesure que les manches avancent
    const base = Math.max(38, 78 - round * 1.6);
    tone(base, 1.8, { gain: 0.3, type: 'sawtooth', to: base * 0.55 });
    noise(1.6, { gain: 0.18, freq: 260, sweepTo: 70 });
  },
  roundEnd() {
    tone(196, 0.4, { gain: 0.16, type: 'triangle' });
    tone(147, 0.7, { gain: 0.15, type: 'triangle', delay: 0.2 });
  },
  downed() {
    tone(140, 1.4, { gain: 0.3, type: 'sawtooth', to: 45 });
    noise(1.2, { gain: 0.2, freq: 500, sweepTo: 80 });
  },
  revive() {
    [330, 440, 587, 784].forEach((f, i) =>
      tone(f, 0.4, { gain: 0.16, type: 'triangle', delay: i * 0.1 }));
  },
  nuke() {
    tone(30, 2.4, { gain: 0.42, type: 'sine', to: 18 });
    noise(2.0, { gain: 0.4, freq: 2200, sweepTo: 40 });
  },
};
