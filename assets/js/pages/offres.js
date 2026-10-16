/* ==========================================================================
   GJS — PAGE NOS OFFRES (v2)
   - Liens internes [data-jump] (pastilles du hero, sommaire, « Ajouter à mon
     besoin ») : défilement Lenis avec la marge du header, focus déplacé.
   - Expertises : sommaire collant + scrollspy (aria-current="true"), onglets
     (core/tabs.js) animés au changement.
   - Méthode : rail qui se remplit au scroll, étapes activées au passage.
   - Configurateur : synthèse animée → contact.html?besoins=…&horizon=…&objectif=…
   Tout passe par le scope de page (détruit à chaque navigation Barba).
   ========================================================================== */

import { env, $, $$, announce } from '../core/utils.js';
import { scrollTo } from '../core/scroll.js';

const { gsap, ScrollTrigger } = window;

/* ---------- Hero ----------------------------------------------------------- */

function heroIntro(root, tl) {
  const title = $('.offers-hero__title', root);
  const scene = $('[data-hero-scene]', root);
  if (title) tl.add(() => title.classList.add('is-struck'), env.reducedMotion ? 0.3 : 1.15);
  if (!scene) return;
  if (env.reducedMotion) {
    tl.from(scene, { opacity: 0, duration: 0.6 }, 0.2);
    return;
  }
  tl.from($('.offers-hero__planet-wrap', scene), { scale: 0.7, opacity: 0, duration: 1.4, ease: 'expo.out' }, 0.25)
    .from($('.offers-hero__orbit', scene), { scale: 0.85, opacity: 0, duration: 1.4, ease: 'expo.out' }, 0.35)
    .from($('[data-hero-robot]', scene), { y: 80, opacity: 0, duration: 1.3, ease: 'expo.out' }, 0.55)
    .from($$('.offers-hero__star', scene), { scale: 0, opacity: 0, duration: 0.8, stagger: 0.1, ease: 'back.out(2)' }, 0.8);
}

/* Légère profondeur au survol du hero (pointeur fin, mouvement autorisé) */
function initHeroDepth(scope, root) {
  const hero = $('.offers-hero', root);
  const layers = $$('[data-hero-depth]', root);
  if (!hero || !layers.length || env.reducedMotion || !env.finePointer) return;
  const movers = layers.map((el) => ({
    depth: parseFloat(el.dataset.heroDepth) || 0.5,
    x: gsap.quickTo(el, 'x', { duration: 0.9, ease: 'power3.out' }),
    y: gsap.quickTo(el, 'y', { duration: 0.9, ease: 'power3.out' }),
  }));
  scope.on(hero, 'pointermove', (e) => {
    const box = hero.getBoundingClientRect();
    const nx = (e.clientX - box.left) / box.width - 0.5;
    const ny = (e.clientY - box.top) / box.height - 0.5;
    movers.forEach((m) => { m.x(nx * 24 * m.depth); m.y(ny * 18 * m.depth); });
  });
  scope.on(hero, 'pointerleave', () => movers.forEach((m) => { m.x(0); m.y(0); }));
}

/* ---------- Liens internes -------------------------------------------------- */

function jumpTo(target, { focus = target } = {}) {
  const margin = parseFloat(getComputedStyle(target).scrollMarginTop) || 0;
  const y = Math.max(0, target.getBoundingClientRect().top + window.scrollY - margin);
  scrollTo(y);
  history.replaceState(history.state, '', `#${target.id}`);
  if (focus) {
    if (!focus.matches('a, button, input, select, textarea, [tabindex]')) focus.setAttribute('tabindex', '-1');
    focus.focus({ preventScroll: true });
  }
}

function initJumps(scope, root) {
  const form = $('[data-configurator]', root);
  $$('a[data-jump]', root).forEach((link) => {
    scope.on(link, 'click', (e) => {
      if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
      const target = document.getElementById(decodeURIComponent(link.hash.slice(1)));
      if (!target) return;
      e.preventDefault();
      const add = link.dataset.configAdd;
      if (add && form) {
        const input = $(`input[name="besoins"][value="${CSS.escape(add)}"]`, form);
        if (input) {
          if (!input.checked) {
            input.checked = true;
            input.dispatchEvent(new Event('change', { bubbles: true }));
          }
          announce(`${input.dataset.label} ajouté à votre besoin.`);
          jumpTo(target, { focus: input });
          return;
        }
      }
      jumpTo(target);
    });
  });
}

/* ---------- Expertises : scrollspy + onglets ------------------------------ */

function initSpy(scope, root) {
  const nav = $('[data-spy]', root);
  const blocks = $$('[data-expertise]', root);
  if (!nav || !blocks.length) return;
  const links = $$('[data-spy-link]', nav);
  const marker = $('.expertises__marker', nav);
  let active = '';

  const place = () => {
    const link = links.find((a) => a.dataset.spyLink === active);
    nav.classList.toggle('has-current', Boolean(link));
    if (!link || !marker) return;
    const navBox = nav.getBoundingClientRect();
    const box = link.getBoundingClientRect();
    marker.style.setProperty('--marker-y', `${(box.top - navBox.top).toFixed(1)}px`);
    marker.style.setProperty('--marker-h', `${box.height.toFixed(1)}px`);
  };

  const setActive = (id) => {
    if (id === active) return;
    active = id;
    links.forEach((a) => {
      if (a.dataset.spyLink === id) a.setAttribute('aria-current', 'true');
      else a.removeAttribute('aria-current');
    });
    blocks.forEach((b) => b.classList.toggle('is-current', b.id === id));
    place();
  };

  scope.mm.add('(min-width: 1024px)', () => {
    blocks.forEach((block, i) => {
      ScrollTrigger.create({
        trigger: block,
        start: 'top 45%',
        end: 'bottom 45%',
        onToggle: (self) => {
          if (self.isActive) setActive(block.id);
          // Avant le premier bloc : aucun lien courant
          else if (i === 0 && self.direction < 0) setActive('');
        },
      });
    });
    const resize = () => place();
    window.addEventListener('resize', resize);
    return () => {
      window.removeEventListener('resize', resize);
      setActive('');
    };
  });
}

function initTabsMotion(scope, root) {
  $$('.expertise [data-tabs]', root).forEach((group) => {
    scope.on(group, 'tabs:change', (e) => {
      const panel = e.detail && e.detail.panel;
      if (!panel) return;
      const items = panel.querySelectorAll('li, .expertise__not');
      gsap.killTweensOf(items);
      if (env.reducedMotion) {
        gsap.fromTo(items, { opacity: 0 }, { opacity: 1, duration: 0.25, clearProps: 'opacity' });
        return;
      }
      gsap.fromTo(items, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.5, stagger: 0.035, ease: 'power3.out', clearProps: 'opacity,transform' });
    });
  });
}

/* ---------- Méthode : rail qui se remplit -------------------------------- */

function initProcess(scope, root) {
  const section = $('[data-process]', root);
  if (!section) return;
  const timeline = $('.process__timeline', section);
  const rail = $('.process__rail', section);
  const steps = $$('[data-step]', section);
  if (!timeline || !rail) return;

  ScrollTrigger.create({
    trigger: timeline,
    start: 'top 65%',
    end: 'bottom 65%',
    scrub: env.reducedMotion ? true : 0.6,
    onUpdate: (self) => rail.style.setProperty('--progress', self.progress.toFixed(4)),
    onRefresh: (self) => rail.style.setProperty('--progress', self.progress.toFixed(4)),
  });

  steps.forEach((step) => {
    ScrollTrigger.create({
      trigger: step,
      start: 'top 65%',
      onEnter: () => step.classList.add('is-active'),
      onLeaveBack: () => step.classList.remove('is-active'),
      onRefresh: (self) => step.classList.toggle('is-active', self.progress > 0),
    });
  });
}

/* ---------- Configurateur ------------------------------------------------- */

const joinFr = (items) => {
  if (items.length <= 1) return items.join('');
  return `${items.slice(0, -1).join(', ')} et ${items[items.length - 1]}`;
};

function initConfigurator(scope, root) {
  const form = $('[data-configurator]', root);
  if (!form) return;
  const sentence = $('[data-config-sentence]', form);
  const submit = $('[data-config-submit]', form);
  const hint = $('[data-config-hint]', form);
  const summary = $('[data-config-summary]', form);
  const robot = $('[data-config-robot]', form);
  const progress = $$('[data-progress]', form);
  const defaultHint = hint.textContent;
  let last = '';
  let hop = null;

  const read = () => ({
    needs: $$('input[name="besoins"]:checked', form),
    horizon: $('input[name="horizon"]:checked', form),
    goal: $('input[name="objectif"]:checked', form),
  });

  const celebrate = () => {
    if (env.reducedMotion) return;
    if (hop) hop.kill();
    hop = gsap.timeline()
      .fromTo(robot, { y: 0, rotation: 0 }, { y: -12, rotation: -6, duration: 0.18, ease: 'power2.out' })
      .to(robot, { y: 0, rotation: 0, duration: 0.5, ease: 'bounce.out' })
      .fromTo(summary, { boxShadow: '0 0 0 0 rgba(218, 171, 58, 0.55)' }, { boxShadow: '0 0 0 14px rgba(218, 171, 58, 0)', duration: 0.7, ease: 'power2.out', clearProps: 'boxShadow' }, 0);
  };

  const render = ({ animate = true } = {}) => {
    const { needs, horizon, goal } = read();
    const done = { besoins: needs.length > 0, horizon: Boolean(horizon), objectif: Boolean(goal) };
    progress.forEach((li) => li.classList.toggle('is-done', done[li.dataset.progress]));
    let html;
    if (!needs.length) {
      html = '<span class="is-empty">Cochez au moins une expertise : la synthèse se compose ici.</span>';
      submit.setAttribute('aria-disabled', 'true');
    } else {
      const what = joinFr(needs.map((n) => n.dataset.phrase));
      const why = goal ? goal.dataset.phrase : 'faire décoller votre activité';
      const when = horizon ? horizon.dataset.phrase : 'sans urgence';
      html = `Vous voulez <span class="accent">${what}</span> pour <span class="accent">${why}</span>, <span class="accent">${when}</span>. On s’en occupe.`;
      submit.removeAttribute('aria-disabled');
      hint.textContent = defaultHint;
      hint.classList.remove('is-error');
    }
    if (html === last) return;
    last = html;
    sentence.innerHTML = html;
    if (!animate) return;
    const parts = sentence.querySelectorAll('.accent, .is-empty');
    if (env.reducedMotion) {
      gsap.fromTo(parts, { opacity: 0 }, { opacity: 1, duration: 0.3 });
    } else {
      gsap.fromTo(parts, { yPercent: 40, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 0.6, stagger: 0.05, ease: 'expo.out' });
    }
    celebrate();
  };

  scope.on(form, 'change', () => render());
  scope.on(form, 'submit', (e) => {
    e.preventDefault();
    const { needs, horizon, goal } = read();
    if (!needs.length) {
      hint.textContent = 'Choisissez au moins une expertise pour recevoir une proposition.';
      hint.classList.add('is-error');
      announce(hint.textContent, 'assertive');
      $('input[name="besoins"]', form).focus();
      return;
    }
    const params = new URLSearchParams();
    params.set('besoins', needs.map((n) => n.value).join(','));
    if (horizon) params.set('horizon', horizon.value);
    if (goal) params.set('objectif', goal.value);
    const url = `contact.html?${params.toString()}`;
    if (window.barba && typeof window.barba.go === 'function') window.barba.go(url);
    else window.location.href = url;
  });
  scope.cleanup(() => { if (hop) hop.kill(); });
  render({ animate: false });
}

/* ---------- Cycle de vie --------------------------------------------------- */

export default {
  init(scope, root) {
    initJumps(scope, root);
    initHeroDepth(scope, root);
    initSpy(scope, root);
    initTabsMotion(scope, root);
    initProcess(scope, root);
    initConfigurator(scope, root);
  },
  intro(scope, root, tl) {
    heroIntro(root, tl);
  },
  destroy() {},
};
