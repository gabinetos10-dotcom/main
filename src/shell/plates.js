/* Data-driven plate content: work cards, people cards, exhibit high
   scores, and the intent pre-highlight from the loader's question. */

import { WORK, PEOPLE, INKS, INTENTS, GAMES } from '../config/content.js';
import { store } from '../core/prefs.js';
import { initOverprint } from '../core/overprint.js';

export function renderWork() {
  const track = document.querySelector('#work .pageturn-track');
  if (!track) return;
  track.innerHTML = WORK.map((w) => `
    <article class="pageturn-page work-card" style="--op-a:${INKS[w.inks[0]]};--op-b:${INKS[w.inks[1]]}">
      <span class="wc-plate" aria-hidden="true"><i style="background:${INKS[w.inks[0]]}"></i><i style="background:${INKS[w.inks[1]]}"></i></span>
      <span class="wc-tag">${w.tag} · ${w.year}</span>
      <h3 class="op">${w.title}</h3>
      <p>${w.note}</p>
    </article>`).join('');
  initOverprint(track);
}

export function renderPeople() {
  const grid = document.querySelector('#people .people-grid');
  if (!grid) return;
  grid.innerHTML = PEOPLE.map((p) => `
    <article class="person op-frame" style="--op-a:${INKS[p.inks[0]]};--op-b:${INKS[p.inks[1]]}" data-ink-layer>
      <span class="t-display p-initial op" aria-hidden="true">${p.initial}</span>
      <h3>${p.name}</h3>
      <span class="p-role">${p.role}</span>
      <p>${p.note}</p>
    </article>`).join('');
  initOverprint(grid);
}

export function paintHighScores() {
  document.querySelectorAll('[data-hs]').forEach((el) => {
    const hs = store.get(`hs-${el.dataset.hs}`, 0);
    el.textContent = hs ? `press-room record · ${hs}` : 'no record yet — set one';
  });
}

/** The loader's intent answer pre-highlights the matching service. */
export function applyIntentHighlight(intentId) {
  const intent = INTENTS.find((i) => i.id === intentId);
  if (!intent) return;
  document.getElementById(intent.plate)?.classList.add('is-intended');
  document.querySelector(`.svc-chip[data-svc="${intent.plate}"]`)?.classList.add('is-intended');
  if (intent.game) {
    const ex = document.querySelector(`.exhibit[data-game="${intent.game}"] .ex-tag`);
    if (ex) ex.textContent += ' · picked for you';
  }
}

/** One-line toast in press-note styling. */
let noteTimer;
export function pressNote(text, ms = 4200) {
  const el = document.querySelector('.press-note');
  if (!el) return;
  el.textContent = text;
  el.classList.add('is-shown');
  clearTimeout(noteTimer);
  noteTimer = setTimeout(() => el.classList.remove('is-shown'), ms);
}

export function gameMeta(id) { return GAMES[id]; }
