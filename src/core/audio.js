/* Tiny procedural press sounds — WebAudio blips, no assets.
   One mute toggle, persisted for the session and beyond. */

import { store } from './prefs.js';

let ctx = null;
let muted = store.get('muted', false);

function ac() {
  if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

export function isMuted() { return muted; }

export function setMuted(m) {
  muted = m;
  store.set('muted', m);
}

/** A short ink blip. kind: 'tap' | 'good' | 'bad' | 'win' | 'stamp' */
export function blip(kind = 'tap') {
  if (muted) return;
  try {
    const a = ac();
    const t = a.currentTime;
    const gain = a.createGain();
    gain.connect(a.destination);
    const osc = a.createOscillator();
    osc.connect(gain);

    const conf = {
      tap:   { f0: 520, f1: 480, dur: 0.06, vol: 0.06, type: 'triangle' },
      good:  { f0: 620, f1: 880, dur: 0.12, vol: 0.08, type: 'triangle' },
      bad:   { f0: 220, f1: 120, dur: 0.18, vol: 0.09, type: 'sawtooth' },
      win:   { f0: 520, f1: 1040, dur: 0.35, vol: 0.09, type: 'triangle' },
      stamp: { f0: 140, f1: 70, dur: 0.12, vol: 0.12, type: 'square' },
    }[kind] || {};

    osc.type = conf.type;
    osc.frequency.setValueAtTime(conf.f0, t);
    osc.frequency.exponentialRampToValueAtTime(Math.max(30, conf.f1), t + conf.dur);
    gain.gain.setValueAtTime(conf.vol, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + conf.dur);
    osc.start(t);
    osc.stop(t + conf.dur + 0.02);
  } catch { /* audio unavailable — stay silent */ }
}
