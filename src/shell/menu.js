/* The index card — a full-screen table of contents that slides in
   like a printed insert. Focus-trapped, ESC to close, scroll-locked.
   Carries the easter-egg breadcrumb in its foot. */

import { NAV } from '../config/content.js';
import { initOverprint } from '../core/overprint.js';
import { scrollToEl, stopScroll } from '../core/motion.js';
import { blip } from '../core/audio.js';

export function initMenu() {
  const burger = document.querySelector('.burger');
  const card = document.querySelector('.index-card');
  if (!burger || !card) return;

  // build the table of contents from config
  const list = card.querySelector('.index-list');
  list.innerHTML = NAV.map((item) => `
    <li>
      <a href="#${item.id}" data-wobble-parent tabindex="0">
        <span class="idx-no">${item.no}</span>
        <span class="op">${item.title}</span>
        <span class="idx-dots" aria-hidden="true"></span>
        <span class="idx-pg">p.${item.no}</span>
      </a>
    </li>`).join('');
  initOverprint(card);

  let lastFocus = null;

  function setOpen(open) {
    card.classList.toggle('is-open', open);
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? 'Close index' : 'Open index');
    document.documentElement.classList.toggle('is-locked', open);
    stopScroll(open);
    blip(open ? 'good' : 'tap');
    if (open) {
      lastFocus = document.activeElement;
      card.querySelector('a, button')?.focus();
    } else {
      lastFocus?.focus?.();
    }
  }

  burger.addEventListener('click', () => setOpen(!card.classList.contains('is-open')));

  card.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    e.preventDefault();
    const target = document.querySelector(a.getAttribute('href'));
    setOpen(false);
    if (target) setTimeout(() => scrollToEl(target, -8), 120);
    history.replaceState(null, '', a.getAttribute('href'));
  });

  // focus trap + escape
  document.addEventListener('keydown', (e) => {
    if (!card.classList.contains('is-open')) return;
    if (e.key === 'Escape') { setOpen(false); return; }
    if (e.key !== 'Tab') return;
    const focusables = [burger, ...card.querySelectorAll('a, button')];
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });
}
