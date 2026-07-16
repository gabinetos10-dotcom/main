/* Press choreography — Lenis smooth scroll wired to GSAP, and the
   per-plate "prints itself" sequence: registration marks settle,
   ink layers drop in one by one, then the plate is .is-inked. */

import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import { reducedMotion } from './prefs.js';

gsap.registerPlugin(ScrollTrigger);

export let lenis = null;

export function initMotion() {
  if (!reducedMotion()) {
    lenis = new Lenis({ lerp: 0.12, wheelMultiplier: 1 });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((time) => lenis.raf(time * 1000));
    gsap.ticker.lagSmoothing(0);
  }
  return { gsap, ScrollTrigger };
}

export function scrollToEl(target, offset = 0) {
  if (lenis) lenis.scrollTo(target, { offset, duration: 1.1 });
  else {
    const y = (typeof target === 'number' ? target : target.getBoundingClientRect().top + scrollY) + offset;
    scrollTo({ top: y, behavior: reducedMotion() ? 'auto' : 'smooth' });
  }
}

export function stopScroll(stop) {
  if (!lenis) return;
  stop ? lenis.stop() : lenis.start();
}

/** Each plate prints itself as it enters the viewport. */
export function initPlateChoreo() {
  const plates = document.querySelectorAll('.plate[data-plate]');

  if (reducedMotion()) {
    plates.forEach((p) => p.classList.add('is-inked'));
    return;
  }

  plates.forEach((plate) => {
    const layers = plate.querySelectorAll('[data-ink-layer]');
    gsap.set(layers, { autoAlpha: 0, y: 26 });

    ScrollTrigger.create({
      trigger: plate,
      start: 'top 74%',
      once: true,
      onEnter() {
        plate.classList.add('is-inked'); // registration marks settle (CSS)
        gsap.to(layers, {
          autoAlpha: 1,
          y: 0,
          duration: 0.8,
          stagger: 0.13,
          ease: 'power3.out',
          clearProps: 'transform',
        });
      },
    });
  });
}

/** Header states: condensed on scroll, inverted over night sheets. */
export function initHeaderState(header) {
  const onScroll = () => header.classList.toggle('is-condensed', scrollY > 40);
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  const nightSheets = document.querySelectorAll('.plate--night, .colophon');
  const check = () => {
    const probe = header.getBoundingClientRect().height / 2;
    let night = false;
    nightSheets.forEach((s) => {
      const r = s.getBoundingClientRect();
      if (r.top <= probe && r.bottom >= probe) night = true;
    });
    header.classList.toggle('is-night', night);
  };
  addEventListener('scroll', check, { passive: true });
  check();
}

/** Refined magnetic pull on nav links (fine pointers, motion allowed). */
export function initMagnetic(els) {
  if (reducedMotion() || !matchMedia('(pointer: fine)').matches) return;
  els.forEach((el) => {
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      const dx = e.clientX - (r.left + r.width / 2);
      const dy = e.clientY - (r.top + r.height / 2);
      gsap.to(el, { x: dx * 0.25, y: dy * 0.3, duration: 0.3, ease: 'power2.out' });
    });
    el.addEventListener('pointerleave', () => {
      gsap.to(el, { x: 0, y: 0, duration: 0.5, ease: 'elastic.out(1, 0.45)' });
    });
  });
}

/** Horizontal page-turn spread. Pins on desktop; native snap otherwise. */
export function initPageTurn(section) {
  const track = section.querySelector('.pageturn-track');
  if (!track) return;

  const useNative = reducedMotion() || matchMedia('(max-width: 900px)').matches;
  if (useNative) {
    section.classList.add('is-native');
    return;
  }

  const getDistance = () => Math.max(0, track.scrollWidth - section.clientWidth + 160);
  gsap.to(track, {
    x: () => -getDistance(),
    ease: 'none',
    scrollTrigger: {
      trigger: section,
      start: 'top top',
      end: () => `+=${getDistance()}`,
      pin: true,
      scrub: 0.6,
      invalidateOnRefresh: true,
    },
  });
}
