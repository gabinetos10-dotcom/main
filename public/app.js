/* =============================================================================
   Baccalauréat en ligne — client
   Le serveur fait autorité : on lui envoie des intentions, il renvoie l'état
   complet, et l'interface se contente de le dessiner.
   ========================================================================== */

'use strict';

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

const STORAGE_KEY = 'bac.session';
const SCREENS = {
  lobby: 'lobby',
  countdown: 'round',
  playing: 'round',
  review: 'review',
  scores: 'scores',
  finished: 'final',
};

const app = {
  socket: null,
  state: null,
  session: null,
  clockOffset: 0,     // horloge serveur - horloge locale
  retries: 0,
  builtRound: null,   // manche pour laquelle la grille a été construite
  answers: {},        // brouillon local, fait foi pendant la saisie
  dirty: false,       // des frappes restent à envoyer au serveur
  sendTimer: null,
  wantsHome: false,   // l'utilisateur a explicitement quitté
};

// ------------------------------------------------------------------ session

function loadSession() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveSession(session) {
  app.session = session;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  } catch {
    /* navigation privée : on continue sans persistance */
  }
}

function clearSession() {
  app.session = null;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignoré */
  }
}

// --------------------------------------------------------------- connexion

function connect() {
  const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
  const socket = new WebSocket(`${protocol}//${location.host}/ws`);
  app.socket = socket;

  socket.addEventListener('open', () => {
    app.retries = 0;
    $('#offline').hidden = true;
    const session = app.session || loadSession();
    if (session && session.code && !app.wantsHome) {
      app.session = session;
      send({ t: 'resume', ...session });
    } else {
      showHome();
    }
  });

  socket.addEventListener('message', (event) => {
    let message;
    try {
      message = JSON.parse(event.data);
    } catch {
      return;
    }
    handle(message);
  });

  socket.addEventListener('close', () => {
    if (app.state) $('#offline').hidden = false;
    // Reconnexion avec un délai croissant, plafonné à 8 s.
    const delay = Math.min(8000, 600 * 2 ** app.retries);
    app.retries += 1;
    setTimeout(connect, delay);
  });

  socket.addEventListener('error', () => socket.close());
}

function send(payload) {
  if (app.socket && app.socket.readyState === WebSocket.OPEN) {
    app.socket.send(JSON.stringify(payload));
    return true;
  }
  toast("Pas de connexion au serveur, réessaie dans un instant.", 'error');
  return false;
}

function handle(message) {
  switch (message.t) {
    case 'session':
      saveSession({ code: message.code, playerId: message.playerId, token: message.token });
      history.replaceState(null, '', `/${message.code}`);
      break;

    case 'state':
      app.clockOffset = message.now - Date.now();
      render(message);
      break;

    case 'error':
      toast(message.message, 'error');
      // Une session invalide ne doit pas bloquer l'écran de démarrage.
      if (!app.state) {
        clearSession();
        showHome();
      }
      break;

    case 'kicked':
      clearSession();
      app.state = null;
      app.wantsHome = true;
      toast("Tu as été exclu du salon.", 'error');
      showHome();
      break;

    default:
      break;
  }
}

// -------------------------------------------------------------- rendu global

function showHome() {
  app.state = null;
  document.body.dataset.screen = 'home';
  history.replaceState(null, '', '/');
}

function render(state) {
  const previous = app.state;
  app.state = state;
  app.wantsHome = false;

  document.body.dataset.screen = SCREENS[state.phase] || 'lobby';

  switch (state.phase) {
    case 'lobby':
      renderLobby(state);
      break;
    case 'countdown':
    case 'playing':
      renderRound(state, previous);
      break;
    case 'review':
      renderReview(state);
      break;
    case 'scores':
      renderScores(state);
      break;
    case 'finished':
      renderFinal(state);
      break;
    default:
      break;
  }
}

const serverNow = () => Date.now() + app.clockOffset;
const isHost = (state) => state.you && state.you.id === state.hostId;
const playerById = (state, id) => state.players.find((player) => player.id === id);

// ------------------------------------------------------------------- salon

function renderLobby(state) {
  $('#room-code').textContent = state.code;
  $('#player-count').textContent = state.players.length;

  const host = isHost(state);
  const list = $('#lobby-players');
  list.replaceChildren(...state.players.map((player) => {
    const item = document.createElement('li');
    item.className = `player${player.connected ? '' : ' player--off'}`;

    const dot = document.createElement('span');
    dot.className = 'player__dot';
    dot.style.background = player.color;

    const name = document.createElement('span');
    name.className = 'player__name';
    name.textContent = player.name;

    item.append(dot, name);

    if (player.isHost) {
      const tag = document.createElement('span');
      tag.className = 'player__tag';
      tag.textContent = 'hôte';
      item.append(tag);
    }
    if (player.id === state.you.id) {
      const tag = document.createElement('span');
      tag.className = 'player__score';
      tag.textContent = 'toi';
      item.append(tag);
    }
    if (host && player.id !== state.you.id) {
      const kick = document.createElement('button');
      kick.className = 'player__kick';
      kick.type = 'button';
      kick.textContent = 'exclure';
      kick.title = `Exclure ${player.name}`;
      kick.addEventListener('click', () => send({ t: 'kick', player: player.id }));
      item.append(kick);
    }
    return item;
  }));

  renderSettings(state, host);

  const startBtn = $('#start-game');
  startBtn.hidden = !host;
  startBtn.disabled = state.settings.categories.length < state.limits.categoriesMin;
  $('#settings-lock').hidden = host;
  $('#lobby-note').textContent = host
    ? (state.players.length < 2
      ? "Tu peux lancer seul pour tester, mais c'est plus drôle à plusieurs."
      : `${state.players.length} joueurs prêts.`)
    : "En attente du lancement par l'hôte…";
}

function renderSettings(state, host) {
  const settings = state.settings;
  $('#category-count').textContent = settings.categories.length;

  // Catégories retenues.
  $('#chips-active').replaceChildren(...settings.categories.map((category) => {
    const item = document.createElement('li');
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'chip chip--active';
    chip.disabled = !host;
    chip.innerHTML = `<span></span><span class="chip__x" aria-hidden="true">×</span>`;
    chip.firstChild.textContent = category;
    chip.title = host ? `Retirer « ${category} »` : category;
    chip.addEventListener('click', () => {
      if (settings.categories.length <= state.limits.categoriesMin) {
        toast(`Il faut au moins ${state.limits.categoriesMin} catégories.`, 'error');
        return;
      }
      send({ t: 'settings', patch: { categories: settings.categories.filter((c) => c !== category) } });
    });
    item.append(chip);
    return item;
  }));

  // Bibliothèque de catégories.
  const active = new Set(settings.categories.map((c) => c.toLowerCase()));
  $('#chips-library').replaceChildren(...state.library
    .filter((category) => !active.has(category.toLowerCase()))
    .map((category) => {
      const item = document.createElement('li');
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'chip';
      chip.textContent = category;
      chip.disabled = !host;
      chip.addEventListener('click', () => addCategory(category));
      item.append(chip);
      return item;
    }));

  // Lettres écartées.
  const excluded = new Set(settings.excludedLetters);
  $('#chips-letters').replaceChildren(...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map((letter) => {
    const item = document.createElement('li');
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = `chip${excluded.has(letter) ? ' chip--active' : ''}`;
    chip.textContent = letter;
    chip.disabled = !host;
    chip.title = excluded.has(letter) ? `${letter} est écartée du tirage` : `${letter} peut sortir`;
    chip.addEventListener('click', () => {
      const next = excluded.has(letter)
        ? settings.excludedLetters.filter((l) => l !== letter)
        : [...settings.excludedLetters, letter];
      send({ t: 'settings', patch: { excludedLetters: next } });
    });
    item.append(chip);
    return item;
  }));

  // Curseurs numériques : on ne réécrit pas un champ en cours d'édition.
  setNumber('#set-rounds', settings.rounds, host);
  setNumber('#set-duration', settings.roundDuration, host);
  setNumber('#set-grace', settings.graceSeconds, host);

  const allowStop = $('#set-allowstop');
  if (document.activeElement !== allowStop) allowStop.checked = settings.allowStop;
  allowStop.disabled = !host;

  $('#category-new').disabled = !host;
  $('#category-add').disabled = !host;
}

function setNumber(selector, value, enabled) {
  const input = $(selector);
  if (document.activeElement !== input) input.value = value;
  input.disabled = !enabled;
}

function addCategory(rawCategory) {
  const state = app.state;
  const category = String(rawCategory || '').trim();
  if (!state || !category) return;
  if (state.settings.categories.length >= state.limits.categoriesMax) {
    toast(`Maximum ${state.limits.categoriesMax} catégories.`, 'error');
    return;
  }
  if (state.settings.categories.some((c) => c.toLowerCase() === category.toLowerCase())) {
    toast('Cette catégorie est déjà là.', 'error');
    return;
  }
  send({ t: 'settings', patch: { categories: [...state.settings.categories, category] } });
}

// ------------------------------------------------------------- la manche

function renderRound(state, previous) {
  const reveal = $('#reveal');
  const play = $('#play');
  const wait = $('#spectating');

  if (state.spectating) {
    reveal.hidden = true;
    play.hidden = true;
    wait.hidden = false;
    return;
  }
  wait.hidden = true;

  if (state.phase === 'countdown') {
    reveal.hidden = false;
    play.hidden = true;
    $('#reveal-round').textContent = `Manche ${state.round} sur ${state.rounds}`;
    $('#reveal-letter').textContent = state.letter;
    return;
  }

  reveal.hidden = true;
  play.hidden = false;
  $('#play-letter').textContent = state.letter;
  $('#play-round').textContent = `Manche ${state.round} / ${state.rounds} · lettre ${state.letter}`;

  // La grille n'est reconstruite qu'au changement de manche, pour ne jamais
  // effacer ce que le joueur est en train de taper.
  const signature = `${state.round}:${state.categories.join('|')}`;
  if (app.builtRound !== signature) {
    app.builtRound = signature;
    app.answers = { ...(state.yourAnswers || {}) };
    buildGrid(state);
  }

  renderStopButton(state);
  renderProgress(state);

  const alert = $('#stop-alert');
  if (state.stoppedBy) {
    const stopper = playerById(state, state.stoppedBy);
    const who = state.stoppedBy === state.you.id ? 'Tu as' : `${stopper ? stopper.name : 'Quelqu’un'} a`;
    alert.textContent = `${who} crié STOP ! Dernières secondes…`;
    alert.hidden = false;
  } else {
    alert.hidden = true;
  }

  if (previous && previous.phase !== 'playing') {
    const first = $('#answers-form .slot__input');
    if (first && window.matchMedia('(min-width: 720px)').matches) first.focus();
  }
}

function buildGrid(state) {
  const form = $('#answers-form');
  form.replaceChildren(...state.categories.map((category, index) => {
    const wrapper = document.createElement('label');
    wrapper.className = 'slot';
    wrapper.style.animationDelay = `${Math.min(index * 45, 400)}ms`;

    const label = document.createElement('span');
    label.className = 'slot__label';
    label.textContent = category;

    const input = document.createElement('input');
    input.className = 'slot__input';
    input.type = 'text';
    input.maxLength = 40;
    input.autocomplete = 'off';
    input.autocapitalize = 'words';
    input.spellcheck = false;
    input.placeholder = `${state.letter}…`;
    input.value = app.answers[category] || '';
    input.dataset.category = category;

    input.addEventListener('input', () => {
      app.answers[category] = input.value;
      wrapper.classList.toggle('slot--filled', Boolean(input.value.trim()));
      queueAnswers();
      renderStopButton(app.state);
    });

    // Entrée passe à la case suivante plutôt que de soumettre le formulaire.
    input.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter') return;
      event.preventDefault();
      const inputs = $$('#answers-form .slot__input');
      const next = inputs[inputs.indexOf(input) + 1];
      if (next) next.focus();
      else input.blur();
    });

    input.addEventListener('blur', () => flushAnswers());

    if (input.value.trim()) wrapper.classList.add('slot--filled');
    wrapper.append(label, input);
    return wrapper;
  }));
}

/** Envoi groupé : on n'inonde pas le serveur à chaque frappe. */
function queueAnswers() {
  app.dirty = true;
  clearTimeout(app.sendTimer);
  app.sendTimer = setTimeout(flushAnswers, 400);
}

function flushAnswers() {
  clearTimeout(app.sendTimer);
  if (!app.dirty) return;
  if (!app.state || app.state.phase !== 'playing') return;
  app.dirty = false;
  send({ t: 'answers', answers: app.answers });
}

function renderStopButton(state) {
  if (!state || state.phase !== 'playing') return;
  const button = $('#stop-btn');
  const total = state.categories.length;
  const filled = state.categories.filter((category) => (app.answers[category] || '').trim()).length;

  if (!state.settings.allowStop) {
    button.hidden = true;
    return;
  }
  button.hidden = false;

  if (state.stoppedBy) {
    button.disabled = true;
    button.textContent = 'STOPPÉ';
    return;
  }
  const ready = filled >= total;
  button.disabled = !ready;
  button.textContent = ready ? 'STOP !' : `${filled}/${total}`;
  button.title = ready ? 'Arrêter la manche' : 'Remplis toutes les cases pour pouvoir arrêter';
}

function renderProgress(state) {
  const total = state.categories.length;
  $('#play-progress').replaceChildren(...state.players
    .filter((player) => player.inRound)
    .map((player) => {
      const item = document.createElement('li');
      const done = player.filled >= total;
      item.className = `${done ? 'is-done' : ''} ${player.connected ? '' : 'is-off'}`.trim();

      const name = document.createElement('span');
      name.textContent = player.id === state.you.id ? 'toi' : player.name;

      const bar = document.createElement('span');
      bar.className = 'progress__bar';
      const fill = document.createElement('i');
      fill.style.width = `${total ? (player.filled / total) * 100 : 0}%`;
      bar.append(fill);

      const count = document.createElement('span');
      count.textContent = `${player.filled}/${total}`;

      item.append(name, bar, count);
      return item;
    }));
}

// ------------------------------------------------------------- chronomètre

const STATUS_LABEL = {
  'wrong-letter': 'mauvaise lettre',
  rejected: 'refusé',
  duplicate: 'en double',
  solo: 'seul à trouver !',
};

function tick() {
  const state = app.state;
  if (!state || !state.deadline || state.phase !== 'playing') return;

  const remaining = Math.max(0, state.deadline - serverNow());

  // Dernières secondes : on n'attend pas la fin de l'anti-rebond, sinon le mot
  // tapé juste avant le buzzer partirait après la fermeture de la manche.
  if (remaining < 3000 && app.dirty) flushAnswers();

  const totalMs = state.stoppedBy
    ? Math.max(1, state.settings.graceSeconds * 1000)
    : state.settings.roundDuration * 1000;

  const seconds = Math.ceil(remaining / 1000);
  const value = $('#timer-value');
  const text = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
  if (value.textContent !== text) value.textContent = text;

  $('#timer-fill').style.transform = `scaleX(${Math.min(1, remaining / totalMs)})`;

  const timer = $('.timer');
  timer.classList.toggle('timer--danger', seconds <= 10);
  timer.classList.toggle('timer--warning', seconds > 10 && seconds <= 30);
}

setInterval(tick, 200);

// ------------------------------------------------------------ dépouillement

function renderReview(state) {
  $('#review-round').textContent = state.round;
  $('#review-letter').textContent = state.letter;

  const board = $('#review-board');
  board.replaceChildren(...state.categories.map((category, index) => {
    const entries = (state.board && state.board[category]) || [];
    const section = document.createElement('section');
    section.className = 'cat';
    section.style.animationDelay = `${Math.min(index * 50, 400)}ms`;

    const title = document.createElement('h3');
    title.className = 'cat__title';
    title.textContent = category;

    const list = document.createElement('ul');
    list.className = 'answers';
    list.append(...entries.map((entry) => reviewRow(state, category, entry)));

    section.append(title, list);
    return section;
  }));

  const host = isHost(state);
  $('#close-review').hidden = !host;
  $('#review-note').textContent = host
    ? 'Quand tout le monde a contesté ce qu’il voulait, valide.'
    : "L'hôte valide le dépouillement quand chacun a fini.";
}

function reviewRow(state, category, entry) {
  const player = playerById(state, entry.playerId);
  const row = document.createElement('li');
  const dead = entry.status === 'rejected' || entry.status === 'wrong-letter';
  row.className = `answer${dead ? ' answer--dead' : ''}`;

  const dot = document.createElement('span');
  dot.className = 'answer__dot';
  dot.style.background = player ? player.color : 'transparent';

  const who = document.createElement('span');
  who.className = 'answer__who';
  who.textContent = player ? (player.id === state.you.id ? `${player.name} (toi)` : player.name) : '—';

  const word = document.createElement('span');
  if (entry.text) {
    word.className = 'answer__word';
    word.textContent = entry.text;
  } else {
    word.className = 'answer__word answer__word--empty';
    word.textContent = 'rien écrit';
  }

  const note = document.createElement('span');
  note.className = 'answer__why';
  note.textContent = STATUS_LABEL[entry.status] || '';

  const points = document.createElement('span');
  points.className = 'answer__pts';
  if (!entry.points) points.classList.add('answer__pts--zero');
  else if (entry.status === 'duplicate') points.classList.add('answer__pts--dup');
  points.textContent = entry.points ? `+${entry.points}` : '0';

  row.append(dot, who, word, note, points);

  // On ne conteste que les réponses des autres, et seulement si elles existent.
  const contestable = entry.text && entry.playerId !== state.you.id && entry.status !== 'wrong-letter';
  const vote = document.createElement('button');
  vote.type = 'button';
  if (contestable) {
    vote.className = `answer__vote${entry.iVoted ? ' answer__vote--on' : ''}`;
    vote.textContent = entry.votes ? `contesté ${entry.votes}/${entry.votesNeeded}` : 'contester';
    vote.addEventListener('click', () => {
      send({ t: 'vote', player: entry.playerId, category, invalid: !entry.iVoted });
    });
  } else {
    vote.className = 'answer__vote answer__vote--placeholder';
    vote.textContent = 'contester';
    vote.tabIndex = -1;
    vote.setAttribute('aria-hidden', 'true');
  }
  row.append(vote);

  return row;
}

// ------------------------------------------------------------------ scores

function renderScores(state) {
  $('#scores-round').textContent = state.round;
  $('#ranking').replaceChildren(...state.players.map((player, index) => rankRow(state, player, index)));

  const host = isHost(state);
  const last = state.round >= state.rounds;
  const button = $('#next-round');
  button.hidden = !host;
  button.textContent = last ? 'Voir le classement final' : 'Manche suivante';
  $('#scores-note').textContent = host
    ? `Manche ${state.round} sur ${state.rounds} jouée.`
    : "L'hôte lance la suite…";
}

function rankRow(state, player, index) {
  const row = document.createElement('li');
  row.className = `rank rank--${index + 1}`;
  row.style.animationDelay = `${Math.min(index * 60, 400)}ms`;

  const position = document.createElement('span');
  position.className = 'rank__pos';
  position.textContent = index + 1;

  const dot = document.createElement('span');
  dot.className = 'rank__dot';
  dot.style.background = player.color;

  const name = document.createElement('span');
  name.className = 'rank__name';
  name.textContent = player.id === state.you.id ? `${player.name} (toi)` : player.name;

  const delta = document.createElement('span');
  delta.className = 'rank__delta';
  delta.textContent = player.roundScore ? `+${player.roundScore}` : '';

  const total = document.createElement('span');
  total.className = 'rank__total';
  total.textContent = player.score;

  row.append(position, dot, name, delta, total);
  return row;
}

// ------------------------------------------------------------------ podium

function renderFinal(state) {
  const top = state.players.slice(0, 3);
  $('#podium').replaceChildren(...top.map((player, index) => {
    const step = document.createElement('div');
    step.className = `step step--${index + 1}`;
    step.style.animationDelay = `${index * 140}ms`;

    if (index === 0) {
      const crown = document.createElement('span');
      crown.className = 'crown';
      crown.textContent = 'champion !';
      step.append(crown);
    }

    const name = document.createElement('span');
    name.className = 'step__name';
    name.textContent = player.name;

    const score = document.createElement('span');
    score.className = 'step__score';
    score.textContent = `${player.score} pts`;

    const block = document.createElement('div');
    block.className = 'step__block';
    block.textContent = index + 1;

    step.append(name, score, block);
    return step;
  }));

  $('#final-ranking').replaceChildren(...state.players.slice(3).map((player, index) => rankRow(state, player, index + 3)));

  const host = isHost(state);
  $('#replay').hidden = !host;
  $('#final-note').textContent = host
    ? 'Les scores repartent à zéro, les joueurs restent.'
    : "L'hôte peut relancer une partie.";
}

// ------------------------------------------------------------------ alertes

function toast(message, kind = '') {
  const element = document.createElement('div');
  element.className = `toast${kind ? ` toast--${kind}` : ''}`;
  element.textContent = message;
  $('#toasts').append(element);
  setTimeout(() => {
    element.classList.add('is-leaving');
    setTimeout(() => element.remove(), 320);
  }, 3600);
}

async function copy(text, label) {
  try {
    await navigator.clipboard.writeText(text);
    toast(`${label} copié !`, 'good');
  } catch {
    toast(`Copie impossible — ${text}`, 'error');
  }
}

// ------------------------------------------------------------- interactions

$('#form-create').addEventListener('submit', (event) => {
  event.preventDefault();
  const name = $('#create-name').value.trim();
  if (!name) return;
  app.wantsHome = false;
  send({ t: 'create', name });
});

$('#form-join').addEventListener('submit', (event) => {
  event.preventDefault();
  const code = $('#join-code').value.trim().toUpperCase();
  const name = $('#join-name').value.trim();
  if (!code || !name) return;
  app.wantsHome = false;
  send({ t: 'join', code, name });
});

$('#join-code').addEventListener('input', (event) => {
  event.target.value = event.target.value.toUpperCase().replace(/[^A-Z]/g, '');
});

$('#copy-code').addEventListener('click', () => copy(app.state.code, 'Code'));
$('#copy-link').addEventListener('click', () => copy(`${location.origin}/${app.state.code}`, 'Lien'));

$('#category-add').addEventListener('click', () => {
  const input = $('#category-new');
  addCategory(input.value);
  input.value = '';
  input.focus();
});

$('#category-new').addEventListener('keydown', (event) => {
  if (event.key !== 'Enter') return;
  event.preventDefault();
  $('#category-add').click();
});

const numberInputs = [
  ['#set-rounds', 'rounds'],
  ['#set-duration', 'roundDuration'],
  ['#set-grace', 'graceSeconds'],
];
for (const [selector, key] of numberInputs) {
  $(selector).addEventListener('change', (event) => {
    send({ t: 'settings', patch: { [key]: Number(event.target.value) } });
  });
}

$('#set-allowstop').addEventListener('change', (event) => {
  send({ t: 'settings', patch: { allowStop: event.target.checked } });
});

$('#start-game').addEventListener('click', () => send({ t: 'start' }));
$('#stop-btn').addEventListener('click', () => {
  flushAnswers();
  send({ t: 'stop' });
});
$('#close-review').addEventListener('click', () => send({ t: 'closeReview' }));
$('#next-round').addEventListener('click', () => send({ t: 'next' }));
$('#replay').addEventListener('click', () => send({ t: 'replay' }));

$('#leave-lobby').addEventListener('click', () => {
  if (!confirm('Quitter le salon ?')) return;
  send({ t: 'leave' });
  clearSession();
  app.state = null;
  app.wantsHome = true;
  showHome();
});

$('#answers-form').addEventListener('submit', (event) => event.preventDefault());

// La page redevient visible : l'état local peut avoir pris du retard.
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && app.socket && app.socket.readyState !== WebSocket.OPEN) {
    connect();
  }
});

// ---------------------------------------------------------------- démarrage

(function boot() {
  // Un lien /ABCD pré-remplit le code de la partie.
  const fromPath = location.pathname.slice(1).toUpperCase();
  const fromQuery = new URLSearchParams(location.search).get('code');
  const code = (fromQuery || fromPath || '').toUpperCase().replace(/[^A-Z]/g, '').slice(0, 4);
  if (code.length === 4) {
    $('#join-code').value = code;
    const stored = loadSession();
    // Un code différent de la session enregistrée : on rejoint la nouvelle partie.
    if (stored && stored.code !== code) clearSession();
  }

  const stored = loadSession();
  app.session = stored;
  $('#boot-text').textContent = stored ? 'Reprise de ta partie…' : 'Connexion…';
  if (!stored) document.body.dataset.screen = 'home';

  connect();
})();
