/* Registration furniture — every plate gets its press-sheet marks:
   crosshairs, trim corners, a six-ink color bar, and margin folios.
   Injected here so the HTML stays editorial, not cluttered. */

import { INKS, INK_NAMES } from '../config/content.js';

const CROSS_SVG = `<svg viewBox="0 0 22 22" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1">
  <circle cx="11" cy="11" r="6.5"/>
  <line x1="11" y1="0" x2="11" y2="22"/>
  <line x1="0" y1="11" x2="22" y2="11"/>
</svg>`;

export function dressPlates() {
  document.querySelectorAll('.plate[data-plate]').forEach((plate) => {
    const no = plate.dataset.plate;
    const title = plate.dataset.title || '';

    const furniture = document.createElement('div');
    furniture.className = 'reg-furniture';
    furniture.setAttribute('aria-hidden', 'true');
    furniture.innerHTML = `
      ${['tl', 'tr', 'bl', 'br'].map((c) => `<span class="reg-cross reg-cross--${c}">${CROSS_SVG}</span>`).join('')}
      ${['tl', 'tr', 'bl', 'br'].map((c) => `<span class="reg-trim reg-trim--${c}"></span>`).join('')}
      <span class="reg-colorbar">${INK_NAMES.map((n) => `<i style="background:${INKS[n]}"></i>`).join('')}</span>
    `;
    plate.prepend(furniture);

    const margin = document.createElement('div');
    margin.className = 'plate-margin';
    margin.setAttribute('aria-hidden', 'true');
    margin.innerHTML = `
      <span class="plate-no">✛</span>
      <span class="folio">Plate ${no}${title ? ` — <b>${title}</b>` : ''} · GJS Field Almanac</span>
      <span class="plate-no">${no}</span>
    `;
    plate.prepend(margin);
  });
}
