/* Paper feed — replaces the native scrollbar (desktop, fine pointer)
   with a margin gauge: a thin accent-ink thumb plus registration
   ticks marking where each plate sits in the run. Native scrolling
   stays fully functional; mobile keeps its system bar. */

import { NAV, INKS } from '../config/content.js';
import { INTENTS } from '../config/content.js';
import { scrollToEl } from '../core/motion.js';

export function initPaperFeed() {
  if (!matchMedia('(min-width: 900px) and (pointer: fine)').matches) return;

  document.documentElement.classList.add('has-feed');

  const feed = document.createElement('div');
  feed.className = 'paper-feed';
  feed.setAttribute('role', 'presentation');
  document.body.appendChild(feed);

  const thumb = document.createElement('div');
  thumb.className = 'feed-thumb';
  feed.appendChild(thumb);

  const inkForPlate = (id) => {
    const intent = INTENTS.find((i) => i.plate === id);
    return intent ? INKS[intent.ink] : 'var(--ink)';
  };

  const ticks = [];
  NAV.forEach((item) => {
    const section = document.getElementById(item.id);
    if (!section) return;
    const t = document.createElement('button');
    t.className = 'feed-tick';
    t.type = 'button';
    t.style.setProperty('--tick', inkForPlate(item.id));
    t.setAttribute('aria-label', `Go to plate ${item.no} — ${item.title}`);
    t.addEventListener('click', () => scrollToEl(section, -8));
    feed.appendChild(t);
    ticks.push([t, section]);
  });

  function layout() {
    const docH = document.documentElement.scrollHeight;
    const vh = innerHeight;
    thumb.style.height = `${Math.max(34, (vh / docH) * vh)}px`;
    ticks.forEach(([t, s]) => {
      t.style.top = `${((s.offsetTop + s.offsetHeight / 2) / docH) * vh - 1}px`;
    });
  }

  function paint() {
    const docH = document.documentElement.scrollHeight - innerHeight;
    const p = docH > 0 ? scrollY / docH : 0;
    const travel = innerHeight - thumb.offsetHeight;
    thumb.style.transform = `translateY(${p * travel}px)`;
  }

  layout();
  paint();
  addEventListener('scroll', paint, { passive: true });
  addEventListener('resize', () => { layout(); paint(); });
  // plate heights settle after fonts/pinning — re-measure a beat later
  setTimeout(layout, 1200);
}
