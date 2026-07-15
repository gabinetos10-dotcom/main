/* ═══════════════════════════════════════════════════════════
   GJS CONTENT — edit copy here. Everything marked [EDIT] is a
   placeholder waiting for real content.
   ═══════════════════════════════════════════════════════════ */

export const NAV = [
  { id: 'services',   label: 'Services',   index: '01' },
  { id: 'playground', label: 'Playground', index: '02' },
  { id: 'process',    label: 'Process',    index: '03' },
  { id: 'work',       label: 'Work',       index: '04' },
  { id: 'about',      label: 'About',      index: '05' },
  { id: 'contact',    label: 'Contact',    index: '06' },
];

export const SERVICES = [
  {
    slug: 'web',
    index: '01',
    title: 'Web Creation',
    desc: 'Custom websites & web apps with a pulse. Designed pixel by pixel, engineered line by line — fast, alive, unmistakably yours. No templates. Ever.',
    tags: ['Design systems', 'WebGL & motion', 'E-commerce', 'Web apps'],
    game: 'code-rush',
    gameHint: 'Feel our tempo → play Code Rush',
  },
  {
    slug: 'automation',
    index: '02',
    title: 'Automations',
    desc: 'Your business, on autopilot. We wire triggers to actions until the boring work does itself — pipelines, integrations, bots that never sleep in.',
    tags: ['Workflow design', 'API plumbing', 'No-code + custom', 'Ops bots'],
    game: 'flow-forge',
    gameHint: 'Wire one yourself → play Flow Forge',
  },
  {
    slug: 'scraping',
    index: '03',
    title: 'Scraping',
    desc: 'The web is full of answers. We harvest them — clean, structured, legal-team-approved. Leads, prices, markets: intelligence on tap.',
    tags: ['Data extraction', 'Lead gen', 'Market intel', 'Monitoring'],
    game: 'data-harvest',
    gameHint: 'Hunt some data → play Data Harvest',
  },
  {
    slug: 'consulting',
    index: '04',
    title: 'Consulting',
    desc: 'Strategy without the 80-slide deck. We sit on your side of the table, find the shortest path to value, and tell you the truth. Gently. Usually.',
    tags: ['Digital strategy', 'Tech audits', 'Roadmapping', 'Advisory'],
    game: null,
    gameHint: 'No game here — the strategy console is… hidden. ↑↑↓↓…',
  },
];

export const GAMES = [
  {
    slug: 'code-rush',
    glyph: '⌨️',
    title: 'Code Rush',
    service: 'WEB CREATION',
    pitch: 'Complete the code before the clock melts. Every right answer builds the site. This is how we think about shipping: fast hands, zero typos.',
    how: 'Pick the token that completes each line.<br/>Desktop: keys 1 · 2 · 3 — Mobile: tap.<br/>Combos multiply. Mistakes cost time.',
    glow: 'linear-gradient(120deg, #ffc243, #eb6a29)',
  },
  {
    slug: 'flow-forge',
    glyph: '⚡',
    title: 'Flow Forge',
    service: 'AUTOMATIONS',
    pitch: 'Drag wires from triggers to actions until the pipeline hums. This is how we think about automation: connect it right, watch it flow.',
    how: 'Drag from a ● output to the matching ○ input.<br/>Wrong wires spark. Finish the level to run the flow.',
    glow: 'linear-gradient(120deg, #324ea1, #9b2d84)',
  },
  {
    slug: 'data-harvest',
    glyph: '🕷️',
    title: 'Data Harvest',
    service: 'SCRAPING',
    pitch: 'Steer the crawler, grab the good data, dodge the CAPTCHAs. This is how we think about scraping: precision, speed, taste.',
    how: 'Arrows / WASD to move — swipe on mobile.<br/>Gold data = big points. Traps = trouble. 60 seconds.',
    glow: 'linear-gradient(120deg, #9b2d84, #eb6a29)',
  },
];

export const PROCESS = [
  {
    num: '01',
    title: 'Listen',
    desc: 'We start with your world, not our portfolio. Goals, constraints, dreams, dealbreakers — everything on the table. [EDIT]',
    color: 'var(--gold)',
  },
  {
    num: '02',
    title: 'Design',
    desc: 'Concepts you can feel. Prototypes you can click. We iterate in the open until the direction makes your team grin. [EDIT]',
    color: 'var(--apricot)',
  },
  {
    num: '03',
    title: 'Build',
    desc: 'Engineering with taste. Weekly demos, honest changelogs, no black boxes. You watch it come alive. [EDIT]',
    color: 'var(--raspberry)',
  },
  {
    num: '04',
    title: 'Launch & grow',
    desc: 'Shipping is the starting line. We measure, tune, automate and stick around while the thing compounds. [EDIT]',
    color: 'var(--indigo)',
  },
];

export const WORK = [
  {
    title: 'Solstice Studio',
    meta: 'Brand site + WebGL configurator — [EDIT: real project]',
    tag: 'WEB',
    glyph: '☀️',
    grad: 'linear-gradient(135deg, #ffc243, #eb6a29 60%, #9b2d84)',
  },
  {
    title: 'Pipeline Nine',
    meta: '340 hrs/month automated away — [EDIT: real project]',
    tag: 'AUTOMATION',
    glyph: '⚙️',
    grad: 'linear-gradient(135deg, #324ea1, #9b2d84)',
  },
  {
    title: 'MarketLens',
    meta: 'Price intelligence across 12 markets — [EDIT: real project]',
    tag: 'SCRAPING',
    glyph: '🔭',
    grad: 'linear-gradient(135deg, #9b2d84, #eb6a29)',
  },
  {
    title: 'Northwind Pivot',
    meta: 'Digital roadmap, 3× conversion — [EDIT: real project]',
    tag: 'CONSULTING',
    glyph: '🧭',
    grad: 'linear-gradient(135deg, #a0c3eb, #f0bed9 55%, #ffc243)',
  },
];

export const PEOPLE = [
  {
    initial: 'G',
    name: '[EDIT: Name]',
    role: 'The Architect',
    bio: 'Draws systems on napkins, ships them by Friday. Believes every pixel deserves a reason to exist. [EDIT bio]',
    grad: 'linear-gradient(135deg, #ffc243, #eb6a29)',
  },
  {
    initial: 'J',
    name: '[EDIT: Name]',
    role: 'The Engineer',
    bio: 'Automates everything, including the coffee order. Has strong opinions about semicolons. Correct ones. [EDIT bio]',
    grad: 'linear-gradient(135deg, #eb6a29, #9b2d84)',
  },
  {
    initial: 'S',
    name: '[EDIT: Name]',
    role: 'The Strategist',
    bio: 'Sees around corners, allergic to buzzwords. Turns "what if" into roadmaps with dates on them. [EDIT bio]',
    grad: 'linear-gradient(135deg, #9b2d84, #324ea1)',
  },
];

export const TICKER_ITEMS = [
  'WEB CREATION', '✦', 'AUTOMATIONS', '✦', 'SCRAPING', '✦', 'CONSULTING', '✦',
  'EST. TOMORROW', '✦', 'THE FUTURE IS WARM', '✦',
];

export const WORK_TICKER_ITEMS = [
  'Websites with heartbeat', '—', 'Robots with manners', '—', 'Data with taste', '—', 'Strategy without slides', '—',
];
