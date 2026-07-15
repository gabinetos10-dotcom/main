/* Header: condense on scroll, invert over Daylight sections,
   burger → full-screen menu with focus trap + scroll lock. */

export function initHeader() {
  const header = document.getElementById('header');
  const burger = document.getElementById('burger');
  const menu = document.getElementById('menu');

  /* ── Condense on scroll ── */
  let lastY = 0;
  const onScroll = () => {
    const y = window.scrollY;
    header.classList.toggle('is-scrolled', y > 24);
    lastY = y;
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ── Mood inversion: watch which section sits under the header
     (scoped to sections/footer — body carries a default mood too) ── */
  const moodSections = document.querySelectorAll('main [data-mood], footer[data-mood]');
  const probe = () => {
    const probeY = header.offsetHeight / 2 + 1;
    for (const s of moodSections) {
      const r = s.getBoundingClientRect();
      if (r.top <= probeY && r.bottom > probeY) {
        header.classList.toggle('over-day', s.dataset.mood === 'day');
        return;
      }
    }
  };
  window.addEventListener('scroll', probe, { passive: true });
  window.addEventListener('resize', probe);
  probe();

  /* ── Active nav link ── */
  const navLinks = [...document.querySelectorAll('.nav__link')];
  const sectionFor = (a) => document.querySelector(a.getAttribute('href'));
  const markActive = () => {
    let current = null;
    for (const a of navLinks) {
      const s = sectionFor(a);
      if (s && s.getBoundingClientRect().top <= window.innerHeight * 0.4) current = a;
    }
    navLinks.forEach((a) => a.classList.toggle('is-active', a === current));
  };
  window.addEventListener('scroll', markActive, { passive: true });

  /* ── Burger / full-screen menu ── */
  let open = false;
  let lastFocused = null;

  const focusables = () =>
    [...menu.querySelectorAll('a[href], button:not([disabled])')].filter((n) => n.offsetParent !== null);

  const setOpen = (next) => {
    open = next;
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    menu.classList.toggle('is-open', open);
    menu.setAttribute('aria-hidden', String(!open));
    document.documentElement.style.overflow = open ? 'hidden' : '';
    if (open) {
      lastFocused = document.activeElement;
      // stagger indexes for the link cascade
      menu.querySelectorAll('.menu__link').forEach((l, i) => l.style.setProperty('--i', i));
      setTimeout(() => focusables()[0]?.focus(), 250);
    } else {
      lastFocused?.focus?.();
    }
  };

  burger.addEventListener('click', () => setOpen(!open));
  menu.addEventListener('click', (e) => {
    if (e.target.closest('a')) setOpen(false); // navigate & close
  });
  document.addEventListener('keydown', (e) => {
    if (!open) return;
    if (e.key === 'Escape') { setOpen(false); return; }
    if (e.key !== 'Tab') return;
    // focus trap
    const f = focusables();
    if (!f.length) return;
    const first = f[0];
    const last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { last.focus(); e.preventDefault(); }
    else if (!e.shiftKey && document.activeElement === last) { first.focus(); e.preventDefault(); }
  });

  return { closeMenu: () => setOpen(false) };
}
