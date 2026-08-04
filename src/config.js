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

// Trois armes, débloquées au fil des vagues et par les caisses.
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
};
