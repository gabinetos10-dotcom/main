/* Reactive marginalia — footnote refs and sidenotes cross-highlight:
   hover/focus a reference and its note lights up (and vice versa);
   clicking a ref scrolls its note into view on small screens. */

import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { reducedMotion } from '../core/prefs.js';

export function initMarginalia() {
  document.querySelectorAll('.fn-ref[data-note]').forEach((ref) => {
    const note = document.getElementById(ref.dataset.note);
    if (!note) return;

    const lit = (on) => note.classList.toggle('is-lit', on);
    ref.addEventListener('mouseenter', () => lit(true));
    ref.addEventListener('mouseleave', () => lit(false));
    ref.addEventListener('focus', () => lit(true));
    ref.addEventListener('blur', () => lit(false));
    ref.addEventListener('click', (e) => {
      e.preventDefault();
      note.scrollIntoView({ behavior: reducedMotion() ? 'auto' : 'smooth', block: 'center' });
      lit(true);
      setTimeout(() => lit(false), 1800);
    });

    // the note points back: hovering it dims everything but its passage
    note.addEventListener('mouseenter', () => ref.classList.add('is-lit'));
    note.addEventListener('mouseleave', () => ref.classList.remove('is-lit'));
  });

  // sidenotes slide in from the margin as they enter
  if (!reducedMotion()) {
    document.querySelectorAll('.sidenote').forEach((n) => {
      gsap.from(n, {
        x: 18,
        autoAlpha: 0,
        duration: 0.7,
        ease: 'power2.out',
        scrollTrigger: { trigger: n, start: 'top 88%', once: true },
      });
    });
  }
}
