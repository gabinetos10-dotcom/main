'use strict';

const { firstLetter, normalizeWord } = require('./config');

const POINTS = {
  UNIQUE: 10,
  DUPLICATE: 5,
  SOLO: 15, // seul joueur à avoir trouvé quelque chose dans la catégorie
};

/**
 * Statuts possibles d'une réponse :
 *  - 'empty'       : rien écrit
 *  - 'wrong-letter': ne commence pas par la lettre tirée (rejet automatique)
 *  - 'rejected'    : invalidée par le vote des autres joueurs
 *  - 'solo'        : valide, seule réponse de la catégorie
 *  - 'unique'      : valide, personne d'autre n'a écrit ce mot
 *  - 'duplicate'   : valide, mais un autre joueur a écrit le même mot
 */

/**
 * Nombre de votes « invalide » nécessaires pour rejeter la réponse d'un joueur.
 * Majorité stricte des autres joueurs présents (l'auteur ne vote pas pour lui-même).
 */
function votesNeeded(voterCount) {
  if (voterCount <= 0) return Infinity; // personne pour contester : la réponse passe
  return Math.floor(voterCount / 2) + 1;
}

/**
 * Calcule le tableau de dépouillement d'une manche.
 *
 * @param {object} params
 * @param {string[]} params.categories   catégories de la manche
 * @param {string} params.letter         lettre tirée
 * @param {Array} params.players         joueurs pris en compte [{id}]
 * @param {object} params.answers        { playerId: { category: texte } }
 * @param {object} params.votes          { 'playerId::category': [voterId] }
 * @returns {{board: object, scores: object}} tableau par catégorie + points par joueur
 */
function computeRound({ categories, letter, players, answers, votes }) {
  const playerIds = players.map((player) => player.id);
  const board = {};
  const scores = {};
  playerIds.forEach((id) => {
    scores[id] = 0;
  });

  for (const category of categories) {
    const entries = playerIds.map((playerId) => {
      const raw = (answers[playerId] && answers[playerId][category]) || '';
      const text = String(raw).trim();
      const key = `${playerId}::${category}`;
      const voters = Array.isArray(votes[key]) ? votes[key] : [];
      // Un joueur ne peut pas invalider sa propre réponse, ni voter s'il a quitté.
      const validVoters = voters.filter((id) => id !== playerId && playerIds.includes(id));
      const needed = votesNeeded(playerIds.length - 1);
      const rejected = validVoters.length >= needed;

      let status = 'unique';
      if (!text) status = 'empty';
      else if (letter && firstLetter(text) !== letter) status = 'wrong-letter';
      else if (rejected) status = 'rejected';

      return {
        playerId,
        text,
        normalized: normalizeWord(text),
        status,
        points: 0,
        votes: validVoters,
        votesNeeded: needed,
      };
    });

    const accepted = entries.filter(
      (entry) => entry.status !== 'empty' && entry.status !== 'wrong-letter' && entry.status !== 'rejected',
    );

    // Comptage des doublons sur le mot normalisé.
    const occurrences = new Map();
    for (const entry of accepted) {
      occurrences.set(entry.normalized, (occurrences.get(entry.normalized) || 0) + 1);
    }

    for (const entry of accepted) {
      if (accepted.length === 1 && playerIds.length > 1) {
        entry.status = 'solo';
        entry.points = POINTS.SOLO;
      } else if (occurrences.get(entry.normalized) > 1) {
        entry.status = 'duplicate';
        entry.points = POINTS.DUPLICATE;
      } else {
        entry.status = 'unique';
        entry.points = POINTS.UNIQUE;
      }
      scores[entry.playerId] += entry.points;
    }

    board[category] = entries;
  }

  return { board, scores };
}

module.exports = { POINTS, computeRound, votesNeeded };
