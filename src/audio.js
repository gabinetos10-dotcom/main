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
};
