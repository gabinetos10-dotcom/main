/* Data-driven rendering — nav, services, games, process, work,
   people, footer lists, tickers. Content lives in src/data/content.js. */

import { NAV, SERVICES, GAMES, PROCESS, WORK, PEOPLE, TICKER_ITEMS, WORK_TICKER_ITEMS } from '../data/content.js';

const el = (html) => {
  const t = document.createElement('template');
  t.innerHTML = html.trim();
  return t.content;
};

export function renderAll() {
  /* Nav (header + menu + footer) */
  document.getElementById('nav-list').append(el(NAV.map((n) => `
    <li><a class="nav__link" href="#${n.id}"><span class="mono">${n.index}</span>${n.label}</a></li>
  `).join('')));

  document.getElementById('menu-list').append(el(NAV.map((n) => `
    <li><a class="menu__link" href="#${n.id}"><span class="mono">${n.index}</span>${n.label}</a></li>
  `).join('')));

  document.getElementById('footer-nav').append(el(NAV.map((n) => `
    <li><a href="#${n.id}">${n.label}</a></li>
  `).join('')));

  document.getElementById('footer-services').append(el(SERVICES.map((s) => `
    <li><a href="#services">${s.title}</a></li>
  `).join('')));

  /* Services */
  document.getElementById('services-list').append(el(SERVICES.map((s) => `
    <article class="service service--${s.slug} plus-corners" data-service="${s.slug}">
      <div class="service__art" aria-hidden="true"></div>
      <p class="service__index mono">${s.index} /</p>
      <h3 class="service__title">${s.title}</h3>
      <p class="service__desc">${s.desc}</p>
      <ul class="service__tags">${s.tags.map((t) => `<li class="service__tag">${t}</li>`).join('')}</ul>
      <p class="service__game-hint mono">${s.game
        ? `▸ <a href="#playground" data-launch="${s.game}">${s.gameHint}</a>`
        : `✦ ${s.gameHint}`}</p>
    </article>
  `).join('')));

  /* Game cards */
  document.getElementById('games-list').append(el(GAMES.map((g) => `
    <button class="game-card" data-game="${g.slug}" style="--card-glow:${g.glow}" data-cursor="Play">
      <span class="game-card__glyph" aria-hidden="true">${g.glyph}</span>
      <span class="game-card__best mono" data-best="${g.slug}"></span>
      <span class="game-card__service mono">${g.service}</span>
      <span class="game-card__title">${g.title}</span>
      <span class="game-card__pitch">${g.pitch}</span>
      <span class="game-card__cta">Insert coin</span>
    </button>
  `).join('')));

  /* Process */
  document.getElementById('process-list').append(el(PROCESS.map((p) => `
    <li class="step" style="--step-color:${p.color}">
      <span class="step__dot" aria-hidden="true"></span>
      <p class="step__num mono">STEP ${p.num}</p>
      <h3 class="step__title">${p.title}</h3>
      <p class="step__desc">${p.desc}</p>
    </li>
  `).join('')));

  /* Work */
  document.getElementById('work-list').append(el(WORK.map((w) => `
    <article class="work-card" style="--work-grad:${w.grad}; --work-glyph:'${w.glyph}'">
      <div class="work-card__visual" aria-hidden="true"></div>
      <div class="work-card__scrim" aria-hidden="true"></div>
      <span class="work-card__tag mono">${w.tag}</span>
      <h3 class="work-card__title">${w.title}</h3>
      <p class="work-card__meta">${w.meta}</p>
    </article>
  `).join('')));

  /* People */
  document.getElementById('about-list').append(el(PEOPLE.map((p) => `
    <article class="person">
      <span class="person__initial" style="background:${p.grad}" aria-hidden="true">${p.initial}</span>
      <h3 class="person__name">${p.name}</h3>
      <p class="person__role mono">${p.role}</p>
      <p class="person__bio">${p.bio}</p>
    </article>
  `).join('')));

  /* Tickers — duplicated content for a seamless loop */
  const tickerHTML = `<span>${TICKER_ITEMS.map((t) => `<i>${t}</i>`).join('')}</span>`;
  document.getElementById('hero-ticker').innerHTML = tickerHTML + tickerHTML + tickerHTML;
  const workTickerHTML = `<span>${WORK_TICKER_ITEMS.map((t) => `<i>${t}</i>`).join('')}</span>`;
  document.getElementById('work-ticker').innerHTML = workTickerHTML + workTickerHTML + workTickerHTML;

  document.getElementById('year').textContent = new Date().getFullYear();
}
