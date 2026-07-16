/* ============================================================
   GJS · OVERPRINT — content.js
   Everything editable lives here: inks, nav, services, plates,
   games copy, people. All copy is PLACEHOLDER — replace freely.
   ============================================================ */

export const INKS = {
  indigo:    '#324ea1',
  raspberry: '#9b2d84',
  apricot:   '#eb6a29',
  gold:      '#ffc243',
  cloud:     '#a0c3eb',
  blush:     '#f0bed9',
};

export const INK_NAMES = Object.keys(INKS);

/** The loader's intent question → session accent ink + focus targets. */
export const INTENTS = [
  { id: 'website',    label: 'A website',      ink: 'indigo',    plate: 'web',        game: 'pressrun' },
  { id: 'automation', label: 'An automation',  ink: 'raspberry', plate: 'automation', game: 'inkrouting' },
  { id: 'data',       label: 'Data',           ink: 'apricot',   plate: 'scraping',   game: 'fieldcollector' },
  { id: 'advice',     label: 'Advice',         ink: 'gold',      plate: 'consulting', game: null },
];

export const NAV = [
  { id: 'cover',      no: '00', title: 'Cover' },
  { id: 'manifesto',  no: '01', title: 'Manifesto' },
  { id: 'web',        no: '02', title: 'Web Creation' },
  { id: 'automation', no: '03', title: 'Automations' },
  { id: 'scraping',   no: '04', title: 'Scraping' },
  { id: 'consulting', no: '05', title: 'Consulting' },
  { id: 'process',    no: '06', title: 'Process' },
  { id: 'work',       no: '07', title: 'Selected Work' },
  { id: 'people',     no: '08', title: 'The People' },
  { id: 'contact',    no: '09', title: 'Contact' },
];

export const GAMES = {
  pressrun: {
    id: 'pressrun',
    exhibit: 'Exhibit A',
    title: 'Press Run',
    service: 'Web Creation',
    desc: 'Set the type before the press outruns you. Each correct block prints another row of the page.',
    keys: 'Desktop: type the highlighted token · Mobile: tap the right block',
    endline: 'That rush of blocks becoming a page? That is what we do all day. — GJS, Web Creation',
  },
  inkrouting: {
    id: 'inkrouting',
    exhibit: 'Exhibit B',
    title: 'Ink Routing',
    service: 'Automations',
    desc: 'Rotate the press pipes to route ink from trigger to action before the reservoir runs dry.',
    keys: 'Tap or click a pipe to rotate it · finish all routes to advance',
    endline: 'Trigger, route, action — a workflow is just plumbing done beautifully. — GJS, Automations',
  },
  fieldcollector: {
    id: 'fieldcollector',
    exhibit: 'Exhibit C',
    title: 'Field Collector',
    service: 'Scraping',
    desc: 'Steer the little crawler across the printed field. Harvest clean specimens, dodge the smudges.',
    keys: 'Desktop: arrows / WASD · Mobile: touch and drag anywhere',
    endline: 'Good data is harvested, not hoarded — clean rows, no smudges. — GJS, Scraping',
  },
};

export const PEOPLE = [
  {
    initial: 'G',
    name: '[Founder name]',
    role: 'Craft & direction',
    note: 'Placeholder bio. The one who worries about letter-spacing at 2 a.m. and believes every pixel should earn its ink.',
    inks: ['indigo', 'cloud'],
  },
  {
    initial: 'J',
    name: '[Founder name]',
    role: 'Code & systems',
    note: 'Placeholder bio. Builds the presses: pipelines, integrations, and the machinery that hums when nobody is watching.',
    inks: ['raspberry', 'blush'],
  },
  {
    initial: 'S',
    name: '[Founder name]',
    role: 'Strategy & stories',
    note: 'Placeholder bio. Asks the awkward questions first, so the answer ships on time and means something.',
    inks: ['apricot', 'gold'],
  },
];

export const WORK = [
  {
    title: 'Atelier Nord',
    tag: 'Web creation',
    year: '2025',
    note: 'Placeholder case. A furniture maker’s catalogue rebuilt as a printed lookbook that loads in under a second.',
    inks: ['indigo', 'apricot'],
  },
  {
    title: 'Meridian Ops',
    tag: 'Automation',
    year: '2025',
    note: 'Placeholder case. Forty hours of weekly copy-paste routed into a single overnight press run.',
    inks: ['raspberry', 'gold'],
  },
  {
    title: 'Signal Harvest',
    tag: 'Scraping',
    year: '2024',
    note: 'Placeholder case. Market prices from 300 sources, gathered nightly, deduplicated, delivered before coffee.',
    inks: ['apricot', 'cloud'],
  },
  {
    title: 'Cartographie Bleue',
    tag: 'Consulting',
    year: '2024',
    note: 'Placeholder case. A six-week audit that cancelled a rewrite and saved a runway.',
    inks: ['indigo', 'blush'],
  },
  {
    title: 'Presse Libre',
    tag: 'Web + automation',
    year: '2024',
    note: 'Placeholder case. An independent magazine with a self-setting front page — editors write, the press composes.',
    inks: ['raspberry', 'cloud'],
  },
];

export const PROMO_CODE = 'MISPRINT-2026';
