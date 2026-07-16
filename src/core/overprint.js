/* The overprint engine's JS half.
   CSS draws the two plates (see overprint.css); this module
   fills in data-op automatically and offers a wobble trigger. */

/** Any .op element without data-op gets it from its own text. */
export function initOverprint(root = document) {
  root.querySelectorAll('.op:not([data-op])').forEach((el) => {
    el.dataset.op = el.textContent.trim();
  });
}

/** Programmatic registration wobble (used by nav, transitions, egg). */
export function wobble(el) {
  if (!el || !el.classList.contains('op')) el = el?.querySelector?.('.op');
  if (!el) return;
  el.classList.remove('is-wobbling');
  // restart the CSS animation
  void el.offsetWidth;
  el.classList.add('is-wobbling');
  el.addEventListener('animationend', () => el.classList.remove('is-wobbling'), { once: true });
}
