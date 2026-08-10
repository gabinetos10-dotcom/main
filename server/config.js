'use strict';

/** Catégories proposées par défaut dans le salon. */
const DEFAULT_CATEGORIES = [
  'Prénom',
  'Animal',
  'Ville',
  'Pays',
  'Métier',
  'Fruit ou légume',
];

/** Catégories que l'hôte peut ajouter en un clic. */
const CATEGORY_LIBRARY = [
  'Prénom',
  'Animal',
  'Ville',
  'Pays',
  'Métier',
  'Fruit ou légume',
  'Objet',
  'Couleur',
  'Marque',
  'Sport',
  'Plat ou nourriture',
  'Célébrité',
  'Film ou série',
  'Partie du corps',
  'Instrument de musique',
  'Véhicule',
  'Vêtement',
  'Fleur ou arbre',
  'Groupe ou chanteur',
  'Jeu vidéo',
  'Mot en anglais',
  'Adjectif',
];

/** Lettres écartées par défaut : trop peu de mots en français. */
const DEFAULT_EXCLUDED_LETTERS = ['K', 'Q', 'W', 'X', 'Y', 'Z'];

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

/** Alphabet des codes de partie : ni I, ni O, pour éviter les confusions avec 1 et 0. */
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const CODE_LENGTH = 4;

const LIMITS = {
  nameMax: 18,
  categoryMax: 28,
  answerMax: 40,
  categoriesMin: 3,
  categoriesMax: 12,
  playersMax: 16,
  roundsMin: 1,
  roundsMax: 15,
  durationMin: 30,
  durationMax: 600,
  graceMin: 0,
  graceMax: 30,
};

const DEFAULT_SETTINGS = {
  categories: DEFAULT_CATEGORIES.slice(),
  rounds: 5,
  roundDuration: 150,
  graceSeconds: 8,
  excludedLetters: DEFAULT_EXCLUDED_LETTERS.slice(),
  allowStop: true,
};

/** Couleurs d'encre attribuées aux joueurs, dans l'ordre d'arrivée. */
const PLAYER_COLORS = [
  '#1F3A93',
  '#C0392B',
  '#1E7A5E',
  '#B7791F',
  '#7D3C98',
  '#0E7490',
  '#BE5504',
  '#4A5568',
  '#9D174D',
  '#3F6212',
  '#5B21B6',
  '#0F766E',
  '#92400E',
  '#1E40AF',
  '#B91C1C',
  '#065F46',
];

/**
 * Normalise un mot pour comparer deux réponses entre elles :
 * minuscules, sans accents, sans ponctuation, espaces compactés.
 */
function normalizeWord(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s'-]/g, '')
    .replace(/[\s'-]+/g, ' ')
    .trim();
}

/** Première lettre significative d'une réponse, en majuscule (ou '' si vide). */
function firstLetter(value) {
  const normalized = normalizeWord(value).replace(/[^a-z]/g, '');
  return normalized ? normalized[0].toUpperCase() : '';
}

function clamp(value, min, max, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, Math.round(number)));
}

/** Coupe et nettoie une chaîne venue du client (jamais de confiance aveugle). */
function cleanText(value, maxLength) {
  return String(value == null ? '' : value)
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
}

module.exports = {
  ALPHABET,
  CATEGORY_LIBRARY,
  CODE_ALPHABET,
  CODE_LENGTH,
  DEFAULT_CATEGORIES,
  DEFAULT_EXCLUDED_LETTERS,
  DEFAULT_SETTINGS,
  LIMITS,
  PLAYER_COLORS,
  cleanText,
  clamp,
  firstLetter,
  normalizeWord,
};
