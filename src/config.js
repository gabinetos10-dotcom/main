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
  mitraillette: {
    id: 'mitraillette',
    name: 'Mitraillette',
    damage: 17,
    rpm: 880,
    magSize: 32,
    reserve: 240,
    reload: 1.9,
    spread: 0.031,
    pellets: 1,
    range: 70,
    recoil: 1.0,
    auto: true,
    pierce: 0,
    shellColor: 0xb8a05c,
  },
  lourde: {
    id: 'lourde',
    name: 'Mitrailleuse lourde',
    damage: 26,
    rpm: 720,
    magSize: 100,
    reserve: 300,
    reload: 4.4,
    spread: 0.036,
    pellets: 1,
    range: 95,
    recoil: 1.7,
    auto: true,
    pierce: 1,
    shellColor: 0xc9a94f,
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
    color: 0x9aa08c,
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
    color: 0x8f8a78,
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
    color: 0x7f9660,
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
    color: 0x8a8470,
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
    color: 0x93a05a,
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
    color: 0x8a7566,
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
    color: 0x6b5a70,
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

// =====================================================================
//  MODE MANCHES — économie de points, atouts, achats
//  Inspiré des modes de survie « round-based » : on gagne des points en
//  tirant, on les dépense pour ouvrir la carte et se renforcer.
// =====================================================================

export const ECONOMY = {
  startPoints: 500,
  hitPoints: 10,          // par balle qui touche
  killPoints: 60,
  headshotBonus: 70,      // total 130 sur une tête
  meleeKill: 130,
  bigKillMul: 4,          // brutes et colosses
  repairPlank: 10,        // par planche reposée sur une fenêtre
  reviveCost: 1500,       // relève automatique (atout « Seconde souffle »)
};

export const ROUNDS = {
  baseCount: 6,
  perRound: 2.2,
  healthBase: 100,
  healthStep: 0.14,       // +14 % par manche, exponentiel après la 10e
  healthExpFrom: 10,
  healthExpRate: 1.09,
  speedFrom: 4,           // les zombies commencent à trotter
  sprintFrom: 9,          // puis à courir
  maxAlive: 26,
  spawnInterval: 1.6,     // délai entre deux apparitions, réduit par manche
  spawnMin: 0.32,
  betweenRounds: 6.5,     // court sas entre deux manches
};

// Distributeurs d'atouts. Achetés une fois, conservés jusqu'à la mort.
export const PERKS = {
  peau: {
    id: 'peau', name: 'PEAU DURE', short: 'Peau',
    cost: 2500, color: 0xd94141, icon: '🛡',
    desc: 'Vous encaissez deux fois plus de coups',
  },
  souffle: {
    id: 'souffle', name: 'SECOND SOUFFLE', short: 'Souffle',
    cost: 1500, color: 0x4bb3e8, icon: '✚',
    desc: 'Vous vous relevez seul une fois par partie',
  },
  mains: {
    id: 'mains', name: 'MAINS AGILES', short: 'Mains',
    cost: 3000, color: 0xe8d04b, icon: '🖐',
    desc: 'Rechargement deux fois plus rapide',
  },
  doigt: {
    id: 'doigt', name: 'DOIGT LÉGER', short: 'Doigt',
    cost: 3000, color: 0x8f4be8, icon: '⚡',
    desc: 'Cadence de tir nettement supérieure',
  },
  bottes: {
    id: 'bottes', name: 'BOTTES LESTES', short: 'Bottes',
    cost: 2000, color: 0x4be88f, icon: '👟',
    desc: 'Déplacement et endurance améliorés',
  },
};

// Bonus lâchés par les zombies, ramassés en marchant dessus.
export const POWERUPS = {
  munitions: { id: 'munitions', name: 'MUNITIONS MAX', color: 0x4bb3e8, icon: '🔋', weight: 26, duration: 0 },
  instant:   { id: 'instant', name: 'MORT INSTANTANÉE', color: 0xe84b4b, icon: '💀', weight: 20, duration: 30 },
  double:    { id: 'double', name: 'POINTS DOUBLÉS', color: 0xe8c14b, icon: '✖', weight: 22, duration: 30 },
  bombe:     { id: 'bombe', name: 'ANÉANTISSEMENT', color: 0x8fe84b, icon: '☢', weight: 16, duration: 0 },
  charpente: { id: 'charpente', name: 'CHARPENTIER', color: 0xc98a4b, icon: '🔨', weight: 16, duration: 0 },
};

export const POWERUP_RULES = {
  dropChance: 0.028,       // par élimination
  minInterval: 22,         // secondes entre deux bonus
  life: 30,                // avant disparition
  bombePoints: 400,
  bombeDamage: 100000,
};

// Poste d'amélioration : double les dégâts et la taille du chargeur.
// Achats muraux : silhouette à la craie sur le mur, prix affiché.
export const WALL_BUYS = [
  { weapon: 'fusil', cost: 1200, zone: 'hall', pos: [-12.4, 30], rot: Math.PI / 2 },
  { weapon: 'mitraillette', cost: 1000, zone: 'cantine', pos: [-37.4, 22], rot: Math.PI / 2 },
  { weapon: 'assaut', cost: 1500, zone: 'atelier', pos: [37.4, 22], rot: -Math.PI / 2 },
  { weapon: 'precision', cost: 2400, zone: 'couloir', pos: [-8, -1.4], rot: 0 },
  { weapon: 'lourde', cost: 2800, zone: 'generateur', pos: [0, -37.4], rot: 0 },
];

// Inventaire limité : le pistolet plus deux armes ramassées.
export const INVENTORY_SLOTS = 3;

// Emplacements possibles de la caisse mystère (elle se déplace).
export const BOX_SPOTS = [
  { zone: 'hall', pos: [7, 32] },
  { zone: 'atelier', pos: [30, 22] },
  { zone: 'cantine', pos: [-30, 22] },
  { zone: 'generateur', pos: [0, -20] },
];

export const MYSTERY_BOX = {
  cost: 950,
  spinTime: 3.2,
  usesBeforeMove: [5, 9],
};

export const UPGRADE_STATION = {
  cost: 5000,
  damageMul: 2.35,
  magMul: 1.8,
  reserveMul: 1.6,
};
