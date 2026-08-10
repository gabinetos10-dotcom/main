'use strict';

const crypto = require('crypto');
const {
  ALPHABET,
  CATEGORY_LIBRARY,
  CODE_ALPHABET,
  CODE_LENGTH,
  DEFAULT_SETTINGS,
  LIMITS,
  PLAYER_COLORS,
  cleanText,
  clamp,
} = require('./config');
const { computeRound } = require('./scoring');

const COUNTDOWN_MS = 4000; // révélation de la lettre
const PROGRESS_BROADCAST_MS = 350; // regroupement des mises à jour de progression
const HOST_GRACE_MS = 12000; // délai avant de transférer l'hôte à quelqu'un d'autre
const EMPTY_ROOM_TTL_MS = 15 * 60 * 1000; // salon vidé de ses joueurs connectés
const ROOM_MAX_AGE_MS = 8 * 60 * 60 * 1000;

const PHASES = {
  LOBBY: 'lobby',
  COUNTDOWN: 'countdown',
  PLAYING: 'playing',
  REVIEW: 'review',
  SCORES: 'scores',
  FINISHED: 'finished',
};

function randomId() {
  return crypto.randomBytes(9).toString('base64url');
}

class GameError extends Error {}

class Room {
  constructor(code, hub) {
    this.code = code;
    this.hub = hub;
    this.players = new Map();
    this.settings = {
      ...DEFAULT_SETTINGS,
      categories: DEFAULT_SETTINGS.categories.slice(),
      excludedLetters: DEFAULT_SETTINGS.excludedLetters.slice(),
    };
    this.phase = PHASES.LOBBY;
    this.hostId = null;
    this.round = 0;
    this.letter = null;
    this.usedLetters = [];
    this.deadline = null;
    this.answers = {};
    this.votes = {};
    this.roundPlayers = [];
    this.stoppedBy = null;
    this.board = null;
    this.roundScores = {};
    this.timer = null;
    this.hostTimer = null;
    this.pendingBroadcast = null;
    this.createdAt = Date.now();
    this.lastActivity = Date.now();
  }

  // ---------------------------------------------------------------- joueurs

  addPlayer(name) {
    if (this.players.size >= LIMITS.playersMax) {
      throw new GameError(`Ce salon est complet (${LIMITS.playersMax} joueurs maximum).`);
    }
    const player = {
      id: randomId(),
      token: randomId(),
      name: this.uniqueName(name),
      color: this.nextColor(),
      connected: true,
      score: 0,
      joinedAt: Date.now(),
    };
    this.players.set(player.id, player);
    if (!this.hostId) this.hostId = player.id;
    this.touch();
    return player;
  }

  /** Évite deux « Gabin » indiscernables dans la liste. */
  uniqueName(rawName) {
    const base = cleanText(rawName, LIMITS.nameMax) || 'Joueur';
    const taken = new Set([...this.players.values()].map((player) => player.name.toLowerCase()));
    if (!taken.has(base.toLowerCase())) return base;
    for (let suffix = 2; suffix < 100; suffix += 1) {
      const candidate = `${base} ${suffix}`;
      if (!taken.has(candidate.toLowerCase())) return candidate;
    }
    return base;
  }

  nextColor() {
    const used = new Set([...this.players.values()].map((player) => player.color));
    return PLAYER_COLORS.find((color) => !used.has(color)) || PLAYER_COLORS[this.players.size % PLAYER_COLORS.length];
  }

  removePlayer(playerId) {
    const player = this.players.get(playerId);
    if (!player) return;
    this.players.delete(playerId);
    delete this.answers[playerId];
    this.roundPlayers = this.roundPlayers.filter((id) => id !== playerId);
    if (this.hostId === playerId) this.hostId = this.firstConnectedId();
    this.touch();
  }

  firstConnectedId() {
    for (const player of this.players.values()) {
      if (player.connected) return player.id;
    }
    return this.players.size ? [...this.players.keys()][0] : null;
  }

  connectedCount() {
    return [...this.players.values()].filter((player) => player.connected).length;
  }

  /**
   * L'hôte s'est déconnecté : on attend un peu (il recharge peut-être sa page)
   * avant de confier le salon à quelqu'un d'autre.
   */
  scheduleHostMigration() {
    clearTimeout(this.hostTimer);
    this.hostTimer = setTimeout(() => {
      const host = this.players.get(this.hostId);
      if (host && host.connected) return;
      const heir = this.firstConnectedId();
      if (heir && heir !== this.hostId) {
        this.hostId = heir;
        this.broadcast();
      }
    }, HOST_GRACE_MS);
  }

  requireHost(playerId) {
    if (playerId !== this.hostId) throw new GameError("Seul l'hôte de la partie peut faire ça.");
  }

  touch() {
    this.lastActivity = Date.now();
  }

  // -------------------------------------------------------------- réglages

  updateSettings(playerId, patch) {
    this.requireHost(playerId);
    if (this.phase !== PHASES.LOBBY) throw new GameError('Les réglages se changent avant le lancement de la partie.');
    const settings = this.settings;

    if (Array.isArray(patch.categories)) {
      const seen = new Set();
      const categories = [];
      for (const raw of patch.categories) {
        const category = cleanText(raw, LIMITS.categoryMax);
        const key = category.toLowerCase();
        if (!category || seen.has(key)) continue;
        seen.add(key);
        categories.push(category);
        if (categories.length >= LIMITS.categoriesMax) break;
      }
      if (categories.length < LIMITS.categoriesMin) {
        throw new GameError(`Il faut au moins ${LIMITS.categoriesMin} catégories.`);
      }
      settings.categories = categories;
    }

    if (patch.rounds !== undefined) {
      settings.rounds = clamp(patch.rounds, LIMITS.roundsMin, LIMITS.roundsMax, settings.rounds);
    }
    if (patch.roundDuration !== undefined) {
      settings.roundDuration = clamp(patch.roundDuration, LIMITS.durationMin, LIMITS.durationMax, settings.roundDuration);
    }
    if (patch.graceSeconds !== undefined) {
      settings.graceSeconds = clamp(patch.graceSeconds, LIMITS.graceMin, LIMITS.graceMax, settings.graceSeconds);
    }
    if (patch.allowStop !== undefined) {
      settings.allowStop = Boolean(patch.allowStop);
    }
    if (Array.isArray(patch.excludedLetters)) {
      const excluded = patch.excludedLetters
        .map((letter) => String(letter || '').toUpperCase())
        .filter((letter) => ALPHABET.includes(letter));
      // On garde toujours au moins 6 lettres jouables.
      if (ALPHABET.length - new Set(excluded).size >= 6) {
        settings.excludedLetters = [...new Set(excluded)];
      }
    }
    this.touch();
    this.broadcast();
  }

  // ------------------------------------------------------------ déroulement

  availableLetters() {
    const excluded = new Set(this.settings.excludedLetters);
    const used = new Set(this.usedLetters);
    let pool = ALPHABET.filter((letter) => !excluded.has(letter) && !used.has(letter));
    // Toutes les lettres du pool sont passées : on repart pour un tour.
    if (!pool.length) pool = ALPHABET.filter((letter) => !excluded.has(letter));
    return pool;
  }

  drawLetter() {
    const pool = this.availableLetters();
    const letter = pool[crypto.randomInt(pool.length)];
    this.usedLetters.push(letter);
    return letter;
  }

  start(playerId) {
    this.requireHost(playerId);
    if (this.phase !== PHASES.LOBBY) throw new GameError('La partie est déjà lancée.');
    if (this.settings.categories.length < LIMITS.categoriesMin) {
      throw new GameError(`Il faut au moins ${LIMITS.categoriesMin} catégories.`);
    }
    this.round = 0;
    this.usedLetters = [];
    for (const player of this.players.values()) player.score = 0;
    this.beginRound();
  }

  beginRound() {
    this.round += 1;
    this.letter = this.drawLetter();
    this.answers = {};
    this.votes = {};
    this.board = null;
    this.roundScores = {};
    this.stoppedBy = null;
    this.roundPlayers = [...this.players.keys()];
    this.phase = PHASES.COUNTDOWN;
    this.deadline = Date.now() + COUNTDOWN_MS;
    this.setTimer(() => this.beginPlaying(), COUNTDOWN_MS);
    this.touch();
    this.broadcast();
  }

  beginPlaying() {
    this.phase = PHASES.PLAYING;
    this.deadline = Date.now() + this.settings.roundDuration * 1000;
    this.setTimer(() => this.endRound(), this.settings.roundDuration * 1000);
    this.broadcast();
  }

  saveAnswers(playerId, incoming) {
    if (this.phase !== PHASES.PLAYING) return;
    if (!this.roundPlayers.includes(playerId)) return;
    if (!incoming || typeof incoming !== 'object') return;
    const stored = this.answers[playerId] || (this.answers[playerId] = {});
    for (const category of this.settings.categories) {
      if (Object.prototype.hasOwnProperty.call(incoming, category)) {
        stored[category] = cleanText(incoming[category], LIMITS.answerMax);
      }
    }
    this.touch();
    // On ne rediffuse que la progression, jamais le contenu des réponses — et on
    // regroupe les envois : à seize joueurs qui tapent, un envoi par frappe
    // saturerait le salon pour un compteur « 4/6 ».
    this.broadcastSoon();
  }

  filledCount(playerId) {
    const stored = this.answers[playerId] || {};
    return this.settings.categories.filter((category) => (stored[category] || '').trim()).length;
  }

  stop(playerId) {
    if (this.phase !== PHASES.PLAYING) throw new GameError("Ce n'est pas le moment d'appuyer sur STOP.");
    if (!this.settings.allowStop) throw new GameError('Le bouton STOP est désactivé sur cette partie.');
    if (this.stoppedBy) return;
    if (this.filledCount(playerId) < this.settings.categories.length) {
      throw new GameError('Il faut avoir rempli toutes les cases pour arrêter la manche.');
    }
    this.stoppedBy = playerId;
    const graceMs = this.settings.graceSeconds * 1000;
    const newDeadline = Date.now() + graceMs;
    if (newDeadline < this.deadline) {
      this.deadline = newDeadline;
      this.setTimer(() => this.endRound(), graceMs);
    }
    this.touch();
    this.broadcast();
  }

  endRound() {
    this.clearTimer();
    this.phase = PHASES.REVIEW;
    this.deadline = null;
    this.recount();
    this.touch();
    this.broadcast();
  }

  /** Recalcule le dépouillement (appelé à chaque vote pour un retour immédiat). */
  recount() {
    const players = this.roundPlayers
      .filter((id) => this.players.has(id))
      .map((id) => ({ id }));
    const { board, scores } = computeRound({
      categories: this.settings.categories,
      letter: this.letter,
      players,
      answers: this.answers,
      votes: this.votes,
    });
    this.board = board;
    this.roundScores = scores;
  }

  vote(playerId, targetId, category, invalid) {
    if (this.phase !== PHASES.REVIEW) throw new GameError('Le dépouillement est terminé.');
    if (playerId === targetId) throw new GameError('On ne peut pas contester sa propre réponse.');
    if (!this.players.has(targetId)) return;
    if (!this.settings.categories.includes(category)) return;
    const key = `${targetId}::${category}`;
    const voters = new Set(this.votes[key] || []);
    if (invalid) voters.add(playerId);
    else voters.delete(playerId);
    this.votes[key] = [...voters];
    this.recount();
    this.touch();
    this.broadcast();
  }

  closeReview(playerId) {
    this.requireHost(playerId);
    if (this.phase !== PHASES.REVIEW) throw new GameError('Le dépouillement est déjà validé.');
    this.recount();
    for (const [id, points] of Object.entries(this.roundScores)) {
      const player = this.players.get(id);
      if (player) player.score += points;
    }
    this.phase = PHASES.SCORES;
    this.touch();
    this.broadcast();
  }

  next(playerId) {
    this.requireHost(playerId);
    if (this.phase !== PHASES.SCORES) throw new GameError("Ce n'est pas le moment.");
    if (this.round >= this.settings.rounds) {
      this.phase = PHASES.FINISHED;
      this.touch();
      this.broadcast();
      return;
    }
    this.beginRound();
  }

  replay(playerId) {
    this.requireHost(playerId);
    this.clearTimer();
    this.phase = PHASES.LOBBY;
    this.round = 0;
    this.letter = null;
    this.usedLetters = [];
    this.deadline = null;
    this.answers = {};
    this.votes = {};
    this.board = null;
    this.roundScores = {};
    this.stoppedBy = null;
    this.roundPlayers = [];
    for (const player of this.players.values()) player.score = 0;
    this.touch();
    this.broadcast();
  }

  // ---------------------------------------------------------------- timers

  setTimer(callback, delay) {
    this.clearTimer();
    this.timer = setTimeout(() => {
      this.timer = null;
      try {
        callback();
      } catch (error) {
        console.error(`[salon ${this.code}] erreur de minuterie :`, error);
      }
    }, delay);
  }

  clearTimer() {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
  }

  dispose() {
    this.clearTimer();
    clearTimeout(this.hostTimer);
    clearTimeout(this.pendingBroadcast);
    this.pendingBroadcast = null;
  }

  // ------------------------------------------------------------------- vue

  /** État envoyé à un joueur donné (les réponses des autres restent cachées en jeu). */
  viewFor(playerId) {
    const inRound = this.roundPlayers.includes(playerId);
    const state = {
      t: 'state',
      now: Date.now(),
      code: this.code,
      phase: this.phase,
      round: this.round,
      rounds: this.settings.rounds,
      letter: this.letter,
      usedLetters: this.usedLetters,
      deadline: this.deadline,
      settings: this.settings,
      hostId: this.hostId,
      categories: this.settings.categories,
      stoppedBy: this.stoppedBy,
      spectating: this.phase !== PHASES.LOBBY && !inRound,
      players: [...this.players.values()]
        .map((player) => ({
          id: player.id,
          name: player.name,
          color: player.color,
          connected: player.connected,
          isHost: player.id === this.hostId,
          inRound: this.roundPlayers.includes(player.id),
          score: player.score,
          roundScore: this.roundScores[player.id] || 0,
          filled: this.phase === PHASES.PLAYING ? this.filledCount(player.id) : 0,
          stopped: this.stoppedBy === player.id,
        }))
        .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name, 'fr')),
    };

    const me = this.players.get(playerId);
    if (me) state.you = { id: me.id, name: me.name, color: me.color, isHost: me.id === this.hostId };

    // Constantes utiles au seul écran de réglages : inutile de les répéter en jeu.
    if (this.phase === PHASES.LOBBY) {
      state.library = CATEGORY_LIBRARY;
      state.limits = LIMITS;
    }

    if (this.phase === PHASES.PLAYING || this.phase === PHASES.COUNTDOWN) {
      state.yourAnswers = this.answers[playerId] || {};
    }

    if (this.board && (this.phase === PHASES.REVIEW || this.phase === PHASES.SCORES || this.phase === PHASES.FINISHED)) {
      state.board = {};
      for (const [category, entries] of Object.entries(this.board)) {
        state.board[category] = entries.map((entry) => ({
          playerId: entry.playerId,
          text: entry.text,
          status: entry.status,
          points: entry.points,
          votes: entry.votes.length,
          votesNeeded: entry.votesNeeded,
          iVoted: entry.votes.includes(playerId),
        }));
      }
    }

    return state;
  }

  broadcast() {
    if (this.pendingBroadcast) {
      clearTimeout(this.pendingBroadcast);
      this.pendingBroadcast = null;
    }
    this.hub.broadcast(this);
  }

  /** Diffusion différée et coalescée, pour les mises à jour non urgentes. */
  broadcastSoon() {
    if (this.pendingBroadcast) return;
    this.pendingBroadcast = setTimeout(() => {
      this.pendingBroadcast = null;
      this.hub.broadcast(this);
    }, PROGRESS_BROADCAST_MS);
  }
}

class Hub {
  constructor() {
    this.rooms = new Map();
    this.sockets = new Map(); // playerId -> WebSocket
    this.sweeper = setInterval(() => this.sweep(), 60 * 1000);
    if (this.sweeper.unref) this.sweeper.unref();
  }

  createCode() {
    for (let attempt = 0; attempt < 200; attempt += 1) {
      let code = '';
      for (let index = 0; index < CODE_LENGTH; index += 1) {
        code += CODE_ALPHABET[crypto.randomInt(CODE_ALPHABET.length)];
      }
      if (!this.rooms.has(code)) return code;
    }
    throw new GameError('Impossible de générer un code de partie, réessaie.');
  }

  createRoom() {
    const code = this.createCode();
    const room = new Room(code, this);
    this.rooms.set(code, room);
    return room;
  }

  getRoom(code) {
    return this.rooms.get(String(code || '').toUpperCase().trim());
  }

  attach(playerId, socket) {
    this.sockets.set(playerId, socket);
  }

  detach(playerId) {
    this.sockets.delete(playerId);
  }

  send(playerId, payload) {
    const socket = this.sockets.get(playerId);
    if (socket && socket.readyState === 1) {
      socket.send(JSON.stringify(payload));
    }
  }

  broadcast(room) {
    for (const playerId of room.players.keys()) {
      const socket = this.sockets.get(playerId);
      if (socket && socket.readyState === 1) {
        socket.send(JSON.stringify(room.viewFor(playerId)));
      }
    }
  }

  /** Ferme les salons vides ou trop vieux pour ne pas fuir de mémoire. */
  sweep() {
    const now = Date.now();
    for (const [code, room] of this.rooms) {
      const empty = room.connectedCount() === 0;
      const stale = empty && now - room.lastActivity > EMPTY_ROOM_TTL_MS;
      if (stale || now - room.createdAt > ROOM_MAX_AGE_MS) {
        room.dispose();
        this.rooms.delete(code);
      }
    }
  }

  stats() {
    return {
      rooms: this.rooms.size,
      players: [...this.rooms.values()].reduce((total, room) => total + room.connectedCount(), 0),
    };
  }
}

module.exports = { GameError, Hub, PHASES, Room };
