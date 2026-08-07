// Réglages et records conservés d'une partie à l'autre.
// localStorage peut être indisponible (page embarquée, navigation privée) :
// on retombe alors silencieusement sur une mémoire de session.

const KEY = 'derniere-lueur';

const DEFAULT_SETTINGS = {
  difficulty: 'veteran',
  sensitivity: 1,
  volume: 0.6,
  invertY: false,
  shadows: true,
  fov: 72,
  quality: 1,
};

const DEFAULT_RECORDS = {
  bestScore: 0,
  bestWave: 0,
  totalKills: 0,
  games: 0,
};

function load(name, fallback) {
  try {
    const raw = window.localStorage.getItem(`${KEY}.${name}`);
    if (!raw) return { ...fallback };
    return { ...fallback, ...JSON.parse(raw) };
  } catch (e) {
    return { ...fallback };
  }
}

function save(name, value) {
  try {
    window.localStorage.setItem(`${KEY}.${name}`, JSON.stringify(value));
  } catch (e) { /* stockage indisponible : on garde tout en mémoire */ }
}

export const Store = {
  settings: load('settings', DEFAULT_SETTINGS),
  records: load('records', DEFAULT_RECORDS),

  saveSettings() { save('settings', this.settings); },

  /**
   * Enregistre le résultat d'une partie.
   * Renvoie ce qui a été battu, pour l'afficher à l'écran de fin.
   */
  submitRun({ score, wave, kills }) {
    const beaten = { score: false, wave: false };
    if (score > this.records.bestScore) { this.records.bestScore = score; beaten.score = true; }
    if (wave > this.records.bestWave) { this.records.bestWave = wave; beaten.wave = true; }
    this.records.totalKills += kills;
    this.records.games += 1;
    save('records', this.records);
    return beaten;
  },
};
