/* Motion system — Lenis smooth scroll + GSAP ScrollTrigger.
   All scroll-driven choreography lives here. Honors reduced motion
   by simply not initializing the fancy parts. */

import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';

gsap.registerPlugin(ScrollTrigger);

const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;

/* Wrap each rendered line of a heading for mask reveals.
   Falls back to word-level spans (good enough & robust). */
function splitLines(el) {
  const words = el.innerHTML.split(/(<[^>]+>[^<]*<\/[^>]+>|\s+)/g).filter((w) => w && !/^\s+$/.test(w));
  el.innerHTML = words
    .map((w) => `<span class="w" style="display:inline-block; overflow:hidden; vertical-align:top;"><span class="line-inner" style="display:inline-block;">${w}&nbsp;</span></span>`)
    .join('');
  return el.querySelectorAll('.line-inner');
}

export function initScroll() {
  /* Scroll progress hairline always works (cheap, useful) */
  const bar = document.getElementById('scroll-progress-bar');
  const updateBar = () => {
    const max = document.documentElement.scrollHeight - innerHeight;
    bar.style.transform = `scaleX(${max > 0 ? window.scrollY / max : 0})`;
  };
  window.addEventListener('scroll', updateBar, { passive: true });
  updateBar();

  if (REDUCED) return { lenis: null };

  /* ── Lenis premium smooth scroll ── */
  const lenis = new Lenis({
    duration: 1.15,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smoothWheel: true,
  });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((time) => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);

  /* Anchor links scroll through Lenis (with header offset) */
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    const target = document.querySelector(a.getAttribute('href'));
    if (!target) return;
    e.preventDefault();
    lenis.scrollTo(target, { offset: -20 });
  });

  /* ── Split-line headline reveals ── */
  document.querySelectorAll('.split-lines').forEach((el) => {
    const inners = splitLines(el);
    gsap.from(inners, {
      yPercent: 110,
      rotate: 3,
      duration: 0.9,
      ease: 'power4.out',
      stagger: 0.03,
      scrollTrigger: { trigger: el, start: 'top 82%' },
    });
  });

  /* ── Generic fade-up reveals ── */
  gsap.utils.toArray(
    '.section-index, .section-sub, .service, .game-card, .step, .work-card, .person, .form__field, .form__submit, .manifesto__badges, .contact__pitch .contact__meta'
  ).forEach((el) => {
    gsap.from(el, {
      y: 44,
      opacity: 0,
      duration: 0.9,
      ease: 'power3.out',
      scrollTrigger: { trigger: el, start: 'top 88%' },
    });
  });

  /* ── Hero entrance (fires right after the loader lifts) ── */
  const heroTl = gsap.timeline({ paused: true });
  heroTl
    .from('.hero__kicker', { y: 24, opacity: 0, duration: 0.7, ease: 'power3.out' })
    .from('.hero__line', { yPercent: 110, duration: 1, ease: 'power4.out', stagger: 0.12 }, '-=0.4')
    .from('.hero__sub', { y: 26, opacity: 0, duration: 0.8, ease: 'power3.out' }, '-=0.55')
    .from('.hero__ctas', { y: 22, opacity: 0, duration: 0.7, ease: 'power3.out' }, '-=0.5')
    .from('.hero__scrollcue', { opacity: 0, duration: 0.9 }, '-=0.3')
    .from('.hero__ticker', { yPercent: 100, duration: 0.7, ease: 'power3.out' }, '-=0.8');

  /* ── Parallax dressing: blobs & orbit drift slower than content ── */
  gsap.utils.toArray('.manifesto__blob, .playground__orbit, .footer__blobfield .blob').forEach((el) => {
    gsap.to(el, {
      yPercent: gsap.utils.random(-24, 24),
      ease: 'none',
      scrollTrigger: { trigger: el.closest('section, footer'), scrub: 1.2 },
    });
  });

  /* ── Tickers: infinite marquee ── */
  const marquee = (el, speed) => {
    if (!el || !el.firstElementChild) return;
    const w = () => el.firstElementChild.offsetWidth;
    gsap.to(el, {
      x: () => -w(),
      duration: speed,
      ease: 'none',
      repeat: -1,
      modifiers: { x: (x) => `${parseFloat(x) % w()}px` },
    });
  };
  marquee(document.getElementById('hero-ticker'), 26);
  marquee(document.getElementById('work-ticker'), 32);

  /* ── Footer wordmark: rises as the footer enters ── */
  gsap.from('.footer__wordmark-text', {
    yPercent: 45,
    opacity: 0.2,
    ease: 'power2.out',
    scrollTrigger: { trigger: '.footer__wordmark', start: 'top 95%', end: 'top 45%', scrub: 0.8 },
  });
  gsap.from('.footer__cta-title', {
    y: 60,
    opacity: 0,
    duration: 1,
    ease: 'power3.out',
    scrollTrigger: { trigger: '.footer__cta-row', start: 'top 85%' },
  });

  return { lenis, playHero: () => heroTl.play() };
}
