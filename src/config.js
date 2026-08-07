// Toutes les constantes de réglage du jeu.
// Modifier ces valeurs suffit pour rééquilibrer la partie.

export const WORLD = {
  size: 120,            // côté de l'arène (carré)
  wallHeight: 9,
  fogNear: 22,
  fogFar: 110,
  gravity: 26,
};

export const PLAYER = {
  radius: 0.42,
  height: 1.75,
  eye: 1.62,
  maxHealth: 100,
  regenDelay: 6,        // secondes sans dégâts avant régénération
  regenRate: 4,         // pv/s (débloqué par une amélioration)
  walkSpeed: 6.2,
  sprintMul: 1.6,
  crouchMul: 0.45,
  accel: 60,
  friction: 11,
  jumpSpeed: 8.4,
  staminaMax: 100,
  staminaDrain: 26,
  staminaGain: 18,
  mouseSensitivity: 0.0022,
};

// Quatre armes, débloquées au fil des vagues et par les caisses.
export const WEAPONS = {
  pistolet: {
    id: 'pistolet',
    name: 'Pistolet 9mm',
    damage: 26,
    rpm: 320,
    magSize: 15,
    reserve: Infinity,   // munitions infinies en réserve
    reload: 1.15,
    spread: 0.010,
    pellets: 1,
    range: 90,
    recoil: 0.9,
    auto: false,
    pierce: 0,
    shellColor: 0xd9b45a,
  },
  fusil: {
    id: 'fusil',
    name: 'Fusil à pompe',
    damage: 22,          // par plomb
    rpm: 78,
    magSize: 6,
    reserve: 36,
    reloadShell: 0.42,   // rechargement cartouche par cartouche
    reload: 0.42,
    spread: 0.075,
    pellets: 9,
    range: 34,
    recoil: 3.4,
    auto: false,
    pierce: 1,
    shellColor: 0xc0392b,
  },
  precision: {
    id: 'precision',
    name: 'Fusil de précision',
    damage: 165,
    rpm: 48,
    magSize: 5,
    reserve: 30,
    reload: 2.7,
    spread: 0.0016,
    pellets: 1,
    range: 220,
    recoil: 6.5,
    auto: false,
    pierce: 2,          // traverse deux corps
    zoom: 22,           // champ de vision en visée : lunette
    shellColor: 0xcfae63,
  },
  assaut: {
    id: 'assaut',
    name: 'Fusil d\'assaut',
    damage: 19,
    rpm: 660,
    magSize: 30,
    reserve: 180,
    reload: 2.0,
    spread: 0.022,
    pellets: 1,
    range: 110,
    recoil: 1.35,
    auto: true,
    pierce: 0,
    shellColor: 0xb8a05c,
  },
};

// Coup de crosse : l'outil de survie quand un zombie est collé à vous.
export const MELEE = {
  damage: 55,
  range: 3.0,
  arc: 0.62,            // cosinus de l'angle du cône devant le joueur
  cooldown: 0.7,
  knockback: 11,
  stun: 1.1,
};

export const GRENADE = {
  max: 3,
  start: 2,
  damage: 260,
  radius: 8.5,
  fuse: 1.5,
  throwSpeed: 19,
  selfDamageMul: 0.3,
};

export const ZOMBIES = {
  marcheur: {
    id: 'marcheur',
    name: 'Marcheur',
    health: 100,
    speed: 2.3,
    damage: 12,
    attackRate: 1.1,
    reach: 1.9,
    scale: 1,
    score: 100,
    color: 0x5e7a4a,
    headMul: 2.6,        // multiplicateur de dégâts tête
    mass: 1,
  },
  coureur: {
    id: 'coureur',
    name: 'Coureur',
    health: 62,
    speed: 5.6,
    damage: 9,
    attackRate: 0.75,
    reach: 1.8,
    scale: 0.92,
    score: 150,
    color: 0x8c5a3c,
    headMul: 2.8,
    mass: 0.8,
  },
  cracheur: {
    id: 'cracheur',
    name: 'Cracheur',
    health: 90,
    speed: 2.0,
    damage: 14,
    attackRate: 2.6,
    reach: 24,           // attaque à distance
    ranged: true,
    projectileSpeed: 17,
    scale: 1.02,
    score: 200,
    color: 0x6f8f2f,
    headMul: 2.4,
    mass: 1,
  },
  rampant: {
    id: 'rampant',
    name: 'Rampant',
    health: 55,
    speed: 4.9,
    damage: 10,
    attackRate: 0.7,
    reach: 1.7,
    scale: 0.95,
    score: 220,
    color: 0x7a6a3c,
    headMul: 3.2,
    mass: 0.7,
    crawler: true,       // silhouette basse : difficile à toucher
  },
  boursoufle: {
    id: 'boursoufle',
    name: 'Boursouflé',
    health: 130,
    speed: 2.15,
    damage: 8,
    attackRate: 1.5,
    reach: 2.2,
    scale: 1.3,
    score: 300,
    color: 0x8f9e3a,
    headMul: 2.2,
    mass: 1.6,
    bloated: true,       // explose en mourant
    blastDamage: 58,
    blastRadius: 6.5,
  },
  brute: {
    id: 'brute',
    name: 'BRUTE',
    health: 750,
    speed: 2.05,
    damage: 34,
    attackRate: 1.8,
    reach: 3.2,
    scale: 2.25,
    score: 900,
    color: 0x7a4038,
    headMul: 1.6,        // tête blindée : moins vulnérable
    mass: 6,
    armor: 0.45,         // 45 % des dégâts absorbés hors points faibles
    weakSpots: true,     // 3 pustules jaunes à faire éclater
    slam: true,
    big: true,
  },
  colosse: {
    id: 'colosse',
    name: 'COLOSSE',
    health: 3400,
    speed: 2.5,
    damage: 48,
    attackRate: 2.2,
    reach: 4.4,
    scale: 3.6,
    score: 4000,
    color: 0x4a2b4d,
    headMul: 1.5,
    mass: 14,
    armor: 0.55,
    weakSpots: true,
    slam: true,
    charge: true,
    summon: true,
    big: true,
    boss: true,
  },
};

// Améliorations obtenues en tirant sur les cristaux / caisses.
export const UPGRADES = [
  { id: 'damage',   name: 'Dégâts +15 %',        color: 0xff4d4d, weight: 20, max: 12, icon: '🔥' },
  { id: 'firerate', name: 'Cadence +12 %',       color: 0xffa726, weight: 16, max: 10, icon: '⚡' },
  { id: 'mag',      name: 'Chargeur +25 %',      color: 0x42a5f5, weight: 14, max: 8,  icon: '📦' },
  { id: 'speed',    name: 'Vitesse +8 %',        color: 0x26c6da, weight: 13, max: 8,  icon: '👟' },
  { id: 'maxhp',    name: 'PV max +20',          color: 0x66bb6a, weight: 12, max: 10, icon: '❤️' },
  { id: 'reload',   name: 'Rechargement +15 %',  color: 0xab47bc, weight: 11, max: 8,  icon: '🔄' },
  { id: 'pierce',   name: 'Perforation +1',      color: 0xffee58, weight: 6,  max: 4,  icon: '🎯' },
  { id: 'regen',    name: 'Régénération',        color: 0x81c784, weight: 5,  max: 4,  icon: '✚' },
  { id: 'crit',     name: 'Coup critique +8 %',  color: 0xf06292, weight: 8,  max: 6,  icon: '💥' },
  { id: 'explosive',name: 'Balles explosives',   color: 0xff7043, weight: 4,  max: 3,  icon: '💣' },
];

// Trois réglages de difficulté, choisis avant la partie.
export const DIFFICULTIES = {
  survivant: {
    id: 'survivant',
    name: 'Survivant',
    tagline: 'Pour découvrir le jeu',
    health: 0.78, damage: 0.7, speed: 0.94, count: 0.85,
    scoreMul: 0.8, waveBreak: 11,
  },
  veteran: {
    id: 'veteran',
    name: 'Vétéran',
    tagline: 'L\'équilibre prévu',
    health: 1, damage: 1, speed: 1, count: 1,
    scoreMul: 1, waveBreak: 8,
  },
  cauchemar: {
    id: 'cauchemar',
    name: 'Cauchemar',
    tagline: 'Ils sont plus rapides. Vous, non.',
    health: 1.4, damage: 1.35, speed: 1.12, count: 1.3,
    scoreMul: 1.6, waveBreak: 6,
  },
};

// Vagues spéciales : elles cassent le rythme et forcent à changer de jeu.
export const WAVE_MODIFIERS = [
  {
    id: 'horde', name: 'DÉFERLANTE', color: '#ff7043',
    desc: 'Deux fois plus nombreux, deux fois plus rapides',
    count: 2, health: 0.6, speed: 1.3, runners: 1,
  },
  {
    id: 'blindee', name: 'COLONNE BLINDÉE', color: '#b07de0',
    desc: 'Des brutes, beaucoup de brutes',
    count: 0.55, health: 1.15, speed: 1, brutes: 3,
  },
  {
    id: 'brouillard', name: 'BROUILLARD TOXIQUE', color: '#6fbf8f',
    desc: 'Visibilité réduite — fiez-vous à la minicarte',
    count: 1, health: 1, speed: 1, fog: 13,
  },
  {
    id: 'meute', name: 'MEUTE DE RAMPANTS', color: '#d4c463',
    desc: 'Ils arrivent au ras du sol',
    count: 1.35, health: 0.85, speed: 1.1, crawlers: 1,
  },
];

// Multiplicateur de score selon la chaîne d'éliminations.
export const COMBO = {
  window: 3.6,          // secondes pour enchaîner
  tiers: [
    { kills: 4, mul: 1.5, label: 'ENCHAÎNÉ' },
    { kills: 9, mul: 2, label: 'CARNAGE' },
    { kills: 16, mul: 3, label: 'BOUCHERIE' },
    { kills: 26, mul: 4, label: 'APOCALYPSE' },
  ],
};

export const GAME = {
  waveBreak: 8,             // secondes entre deux vagues
  baseZombies: 6,
  zombiesPerWave: 2.6,
  bruteFromWave: 3,
  bossEveryWaves: 5,
  maxAlive: 46,
  crystalsPerWave: 3,
  barrelCount: 10,
  healthCrateChance: 0.35,
  crawlerFromWave: 4,
  bloaterFromWave: 5,
  sniperWave: 7,
};
