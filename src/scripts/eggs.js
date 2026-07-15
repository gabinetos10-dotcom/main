/* ═══════════ EASTER EGGS ═══════════
   1. Konami code (↑↑↓↓←→←→BA) or typing "GJS" → DREAM MODE:
      the 3D core goes hyperspace, blobs rain, hues sing — plus the
      secret Strategy Console (with a hidden promo code & a quiz).
   2. Click the logo 5× → the monogram celebrates.
   3. The glowing orb in the footer opens the console directly.
   4. ASCII console.log art for curious developers.               */

const KONAMI = ['ArrowUp','ArrowUp','ArrowDown','ArrowDown','ArrowLeft','ArrowRight','ArrowLeft','ArrowRight','b','a'];

const CONSOLE_GREETING = [
  { t: 'GJS STRATEGY CONSOLE v4.0 — clearance: DREAMER', a: true },
  { t: '' },
  { t: 'Well well. You found the 4th service.' },
  { t: 'Consulting doesn\'t need a mini-game —' },
  { t: 'this console IS the mini-game.' },
  { t: '' },
  { t: 'A message from the founders:' },
  { t: '  "We hide delight in everything we build.' },
  { t: '   Imagine what we\'d hide in yours."  — G · J · S' },
  { t: '' },
  { t: 'Commands: help · strategy · promo · quiz · dream · clear · exit', a: true },
];

const STRATEGIES = [
  'Ship the smallest thing that makes someone smile. Then repeat.',
  'Automate the boring 80%. Spend the saved hours on the magic 20%.',
  'Your data already knows the answer. Scrape it, chart it, act on it.',
  'A slow website is a closed door with nice paint.',
  'If the roadmap fits on a napkin, it might actually happen.',
];

const QUIZ = [
  { q: 'Q1/3 — A task repeats 3× a week. You…', a: 'automate', hint: '(type: automate / suffer)' },
  { q: 'Q2/3 — Your competitor\'s prices are public. You…', a: 'scrape', hint: '(type: scrape / guess)' },
  { q: 'Q3/3 — The future should feel…', a: 'warm', hint: '(type: warm / beige)' },
];

export function initEggs({ hero }) {
  let dream = false;
  let buffer = [];
  let typed = '';
  let logoClicks = 0;
  let logoTimer = null;
  let blobRain = null;
  let quizState = null;

  const secretEl = document.getElementById('secret-console');
  const outEl = document.getElementById('secret-output');
  const inputEl = document.getElementById('secret-input');
  const closeBtn = document.getElementById('secret-close');
  let lastFocused = null;

  /* ── devtools ASCII greeting ── */
  console.log(
    `%c
   ██████╗      ██╗███████╗
  ██╔════╝      ██║██╔════╝
  ██║  ███╗     ██║███████╗
  ██║   ██║██   ██║╚════██║
  ╚██████╔╝╚█████╔╝███████║
   ╚═════╝  ╚════╝ ╚══════╝
  ─────────────────────────────
  Hello, fellow console-opener. ✦
  We like you already.
  Try the Konami code on the site…
  or just type "GJS" anywhere.
  Then come work with us: hello@gjs.agency`,
    'color:#ffc243; text-shadow: 0 0 8px #eb6a29; font-family: monospace;'
  );

  /* ── Dream mode ── */
  function setDream(on) {
    dream = on;
    document.body.classList.toggle('dream-mode', on);
    hero?.setDream?.(on ? 1 : 0);
    if (on) {
      rainBlobs();
      blobRain = setInterval(rainBlobs, 1600);
      openConsole();
    } else {
      clearInterval(blobRain);
    }
  }

  function rainBlobs() {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const colors = ['#ffc243', '#eb6a29', '#9b2d84', '#a0c3eb', '#f0bed9'];
    for (let i = 0; i < 10; i++) {
      const b = document.createElement('span');
      b.className = 'dream-blob';
      b.style.left = `${Math.random() * 100}vw`;
      b.style.background = colors[Math.floor(Math.random() * colors.length)];
      b.style.animationDuration = `${2.4 + Math.random() * 2.4}s`;
      b.style.animationDelay = `${Math.random() * 1.2}s`;
      b.style.width = b.style.height = `${22 + Math.random() * 40}px`;
      document.body.appendChild(b);
      setTimeout(() => b.remove(), 6200);
    }
  }

  /* ── Secret console ── */
  function print(text, accent = false) {
    const span = document.createElement('span');
    if (accent) span.className = 'accent';
    span.textContent = text + '\n';
    outEl.appendChild(span);
    outEl.scrollTop = outEl.scrollHeight;
  }

  function openConsole() {
    lastFocused = document.activeElement;
    secretEl.classList.add('is-open');
    secretEl.setAttribute('aria-hidden', 'false');
    outEl.textContent = '';
    CONSOLE_GREETING.forEach((l, i) => setTimeout(() => print(l.t, l.a), i * 90));
    setTimeout(() => inputEl.focus(), 400);
  }

  function closeConsole() {
    secretEl.classList.remove('is-open');
    secretEl.setAttribute('aria-hidden', 'true');
    quizState = null;
    lastFocused?.focus?.();
  }

  function handleCommand(raw) {
    const cmd = raw.trim().toLowerCase();
    print(`▸ ${raw}`);
    if (quizState !== null) { handleQuiz(cmd); return; }
    switch (cmd) {
      case 'help':
        print('help · strategy · promo · quiz · dream · clear · exit', true);
        break;
      case 'strategy':
        print('✦ ' + STRATEGIES[Math.floor(Math.random() * STRATEGIES.length)], true);
        break;
      case 'promo':
        print('✦ Code: WARMFUTURE10 — mention it, get 10% off your first sprint.', true);
        print('  (Yes, really. Finding this earned it. [EDIT: honor or change])');
        break;
      case 'quiz':
        quizState = 0;
        print('THE 30-SECOND STRATEGY AUDIT:', true);
        print(QUIZ[0].q);
        print(QUIZ[0].hint);
        break;
      case 'dream':
        print(dream ? 'Dream mode OFF. Back to merely excellent.' : 'Dream mode ON. ✦');
        setDream(!dream);
        break;
      case 'clear':
        outEl.textContent = '';
        break;
      case 'exit':
        closeConsole();
        if (dream) setDream(false);
        break;
      case 'gjs':
        print('That\'s us! Warm, isn\'t it?', true);
        break;
      default:
        print(`unknown command: "${cmd}" — try 'help'`);
    }
  }

  function handleQuiz(answer) {
    const q = QUIZ[quizState];
    if (answer === q.a) {
      print('✔ Correct. You\'d fit right in.', true);
    } else {
      print(`✘ Bold choice. (We'd say: ${q.a})`);
    }
    quizState += 1;
    if (quizState >= QUIZ.length) {
      quizState = null;
      print('');
      print('AUDIT COMPLETE — verdict: you need us. Or we need you.', true);
      print('Either way: hello@gjs.agency ✦');
    } else {
      print(QUIZ[quizState].q);
      print(QUIZ[quizState].hint);
    }
  }

  inputEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && inputEl.value.trim()) {
      handleCommand(inputEl.value);
      inputEl.value = '';
    }
    e.stopPropagation(); // typing in the console shouldn't re-trigger "GJS"
  });
  closeBtn.addEventListener('click', closeConsole);
  secretEl.addEventListener('click', (e) => { if (e.target === secretEl) closeConsole(); });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && secretEl.classList.contains('is-open')) closeConsole();
  });

  /* ── Trigger detection: Konami + typed "GJS" ── */
  document.addEventListener('keydown', (e) => {
    if (e.target.matches('input, textarea')) return;
    buffer.push(e.key);
    if (buffer.length > KONAMI.length) buffer.shift();
    if (KONAMI.every((k, i) => buffer[i]?.toLowerCase() === k.toLowerCase())) {
      buffer = [];
      setDream(!dream);
      return;
    }
    typed = (typed + e.key).slice(-3);
    if (typed.toLowerCase() === 'gjs') {
      typed = '';
      setDream(!dream);
    }
  });

  /* ── Egg 2: logo ×5 ── */
  document.getElementById('logo').addEventListener('click', () => {
    logoClicks += 1;
    clearTimeout(logoTimer);
    logoTimer = setTimeout(() => { logoClicks = 0; }, 1800);
    if (logoClicks >= 5) {
      logoClicks = 0;
      const logo = document.getElementById('logo');
      logo.classList.add('is-spinning');
      hero?.pulse?.(1400);
      rainBlobs();
      setTimeout(() => logo.classList.remove('is-spinning'), 1000);
    }
  });

  /* ── Egg 3: the footer orb ── */
  document.getElementById('footer-orb').addEventListener('click', openConsole);
}
