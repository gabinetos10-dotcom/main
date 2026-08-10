'use strict';

/**
 * Test bout-en-bout : lance le serveur, branche trois vrais clients WebSocket
 * et joue une partie complète en vérifiant le décompte des points.
 *
 *   node test/e2e.js
 */

const assert = require('assert');
const { spawn } = require('child_process');
const path = require('path');
const WebSocket = require('ws');

const PORT = Number(process.env.TEST_PORT) || 3987;
const BASE = `ws://127.0.0.1:${PORT}/ws`;

let failures = 0;
function check(label, run) {
  try {
    run();
    console.log(`  ✓ ${label}`);
  } catch (error) {
    failures += 1;
    console.error(`  ✗ ${label}\n    ${error.message}`);
  }
}

/** Client de test : garde le dernier état reçu et sait attendre une condition. */
class Client {
  constructor(label) {
    this.label = label;
    this.state = null;
    this.session = null;
    this.errors = [];
    this.waiters = [];
  }

  connect() {
    return new Promise((resolve, reject) => {
      this.socket = new WebSocket(BASE);
      this.socket.on('open', resolve);
      this.socket.on('error', reject);
      this.socket.on('message', (raw) => {
        const message = JSON.parse(raw.toString());
        if (message.t === 'session') this.session = message;
        if (message.t === 'error') this.errors.push(message.message);
        if (message.t === 'state') {
          this.state = message;
          this.waiters = this.waiters.filter((waiter) => {
            if (!waiter.predicate(message)) return true;
            waiter.resolve(message);
            return false;
          });
        }
      });
    });
  }

  send(payload) {
    this.socket.send(JSON.stringify(payload));
  }

  /** Attend un état satisfaisant la condition (ou échoue au bout de `timeout`). */
  until(predicate, description, timeout = 8000) {
    if (this.state && predicate(this.state)) return Promise.resolve(this.state);
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`[${this.label}] délai dépassé en attendant : ${description}`));
      }, timeout);
      this.waiters.push({
        predicate,
        resolve: (state) => {
          clearTimeout(timer);
          resolve(state);
        },
      });
    });
  }

  close() {
    if (this.socket) this.socket.close();
  }

  me() {
    return this.state.players.find((player) => player.id === this.state.you.id);
  }

  playerNamed(name) {
    return this.state.players.find((player) => player.name === name);
  }
}

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
  console.log('\nDémarrage du serveur de test…');
  const server = spawn(process.execPath, [path.join(__dirname, '..', 'server', 'index.js')], {
    env: { ...process.env, PORT: String(PORT) },
    stdio: ['ignore', 'pipe', 'inherit'],
  });
  await new Promise((resolve, reject) => {
    server.stdout.on('data', (chunk) => {
      if (chunk.toString().includes('http://localhost')) resolve();
    });
    server.on('error', reject);
    setTimeout(() => reject(new Error('le serveur ne démarre pas')), 8000);
  });

  const alice = new Client('Alice');
  const bob = new Client('Bob');
  const carol = new Client('Carol');

  try {
    // ------------------------------------------------------ salon et code
    await alice.connect();
    alice.send({ t: 'create', name: 'Alice' });
    await alice.until((state) => state.phase === 'lobby', 'salon créé');

    const code = alice.session.code;
    check('le code de partie fait 4 lettres', () => assert.match(code, /^[A-Z]{4}$/));
    check('le créateur est hôte', () => assert.strictEqual(alice.state.hostId, alice.state.you.id));

    await bob.connect();
    bob.send({ t: 'join', code, name: 'Bob' });
    await bob.until((state) => state.phase === 'lobby', 'Bob a rejoint');

    await carol.connect();
    carol.send({ t: 'join', code, name: 'Carol' });
    await carol.until((state) => state.phase === 'lobby', 'Carol a rejoint');
    await alice.until((state) => state.players.length === 3, 'Alice voit 3 joueurs');

    check('les trois joueurs sont dans le salon', () => assert.strictEqual(alice.state.players.length, 3));
    check('chaque joueur a une couleur distincte', () => {
      const colors = new Set(alice.state.players.map((player) => player.color));
      assert.strictEqual(colors.size, 3);
    });

    // un code inconnu doit être refusé
    const ghost = new Client('Ghost');
    await ghost.connect();
    ghost.send({ t: 'join', code: 'ZZZZ', name: 'Fantôme' });
    await wait(200);
    check('un code inconnu est refusé', () => assert.strictEqual(ghost.errors.length, 1));
    ghost.close();

    // un non-hôte ne peut pas lancer la partie
    bob.send({ t: 'start' });
    await wait(200);
    check("seul l'hôte peut lancer la partie", () => {
      assert.ok(bob.errors.some((message) => message.includes("l'hôte")));
      assert.strictEqual(alice.state.phase, 'lobby');
    });

    // --------------------------------------------------------- réglages
    alice.send({
      t: 'settings',
      patch: { categories: ['Animal', 'Ville', 'Pays'], rounds: 2, roundDuration: 30, graceSeconds: 0 },
    });
    await alice.until((state) => state.settings.categories.length === 3, 'réglages appliqués');
    await bob.until((state) => state.settings.categories.length === 3, 'Bob reçoit les réglages');
    check('les réglages sont diffusés à tout le monde', () => {
      assert.deepStrictEqual(bob.state.settings.categories, ['Animal', 'Ville', 'Pays']);
      assert.strictEqual(bob.state.settings.rounds, 2);
    });

    alice.send({ t: 'settings', patch: { categories: ['Animal'] } });
    await wait(200);
    check('moins de 3 catégories est refusé', () => {
      assert.ok(alice.errors.some((message) => message.includes('au moins')));
      assert.strictEqual(alice.state.settings.categories.length, 3);
    });

    // ------------------------------------------------------ manche 1
    alice.send({ t: 'start' });
    await alice.until((state) => state.phase === 'countdown', 'décompte lancé');
    const letter = alice.state.letter;
    check('une lettre est tirée', () => assert.match(letter, /^[A-Z]$/));
    check('la lettre est hors des lettres écartées', () =>
      assert.ok(!alice.state.settings.excludedLetters.includes(letter)));

    await alice.until((state) => state.phase === 'playing', 'manche démarrée');
    await bob.until((state) => state.phase === 'playing', 'Bob joue');
    await carol.until((state) => state.phase === 'playing', 'Carol joue');

    check('aucune réponse adverse ne fuite pendant la manche', () => {
      assert.strictEqual(bob.state.board, undefined);
      assert.deepStrictEqual(Object.keys(bob.state.yourAnswers || {}), []);
    });

    // Une lettre différente de celle tirée, pour tester le rejet automatique.
    const wrongLetter = letter === 'M' ? 'B' : 'M';

    alice.send({ t: 'answers', answers: { Animal: `${letter}aa`, Ville: `${letter}bb`, Pays: `${letter}cc` } });
    bob.send({ t: 'answers', answers: { Animal: `${letter}AA`, Ville: `${letter}zz`, Pays: '' } });
    carol.send({ t: 'answers', answers: { Animal: `${letter}aa`, Ville: '', Pays: `${wrongLetter}ouf` } });

    // On attend que les trois envois soient traités, sinon on lit une progression partielle.
    await alice.until(
      (state) => state.players.find((player) => player.name === 'Alice').filled === 3
        && state.players.find((player) => player.name === 'Bob').filled === 2
        // Carol a deux cases remplies : la validité de la lettre ne se juge qu'au dépouillement.
        && state.players.find((player) => player.name === 'Carol').filled === 2,
      'progression des trois joueurs reçue',
    );

    check('la progression des autres est visible sans leurs mots', () => {
      const bobRow = alice.state.players.find((player) => player.name === 'Bob');
      assert.strictEqual(bobRow.filled, 2);
      assert.strictEqual(bobRow.answers, undefined);
    });

    // Bob n'a pas tout rempli : il ne peut pas arrêter la manche.
    bob.errors.length = 0;
    bob.send({ t: 'stop' });
    await wait(200);
    check('impossible de crier STOP avec des cases vides', () =>
      assert.ok(bob.errors.some((message) => message.includes('toutes les cases'))));

    alice.send({ t: 'stop' });
    await alice.until((state) => state.phase === 'review', 'dépouillement ouvert');
    await bob.until((state) => state.phase === 'review', 'Bob au dépouillement');

    // -------------------------------------------------- barème de la manche
    // Toujours relire l'état courant : `alice.state` est remplacé à chaque message.
    const find = (category, name) =>
      alice.state.board[category].find((entry) => entry.playerId === alice.playerNamed(name).id);

    check('un mot écrit par plusieurs joueurs vaut 5 points', () => {
      assert.strictEqual(find('Animal', 'Alice').points, 5);
      assert.strictEqual(find('Animal', 'Bob').points, 5, 'la casse ne doit pas éviter le doublon');
      assert.strictEqual(find('Animal', 'Carol').points, 5);
    });

    check('un mot unique vaut 10 points', () => {
      assert.strictEqual(find('Ville', 'Alice').points, 10);
      assert.strictEqual(find('Ville', 'Bob').points, 10);
    });

    check('une case vide vaut 0', () => {
      assert.strictEqual(find('Ville', 'Carol').points, 0);
      assert.strictEqual(find('Ville', 'Carol').status, 'empty');
    });

    check('un mot commençant par la mauvaise lettre est rejeté', () => {
      assert.strictEqual(find('Pays', 'Carol').status, 'wrong-letter');
      assert.strictEqual(find('Pays', 'Carol').points, 0);
    });

    check('être le seul à répondre vaut 15 points', () => {
      assert.strictEqual(find('Pays', 'Alice').status, 'solo');
      assert.strictEqual(find('Pays', 'Alice').points, 15);
    });

    check('le total provisoire de la manche est correct', () => {
      assert.strictEqual(alice.me().roundScore, 30); // 5 + 10 + 15
      assert.strictEqual(alice.playerNamed('Bob').roundScore, 15); // 5 + 10 + 0
      assert.strictEqual(alice.playerNamed('Carol').roundScore, 5); // 5 + 0 + 0
    });

    // ------------------------------------------------------------- votes
    alice.errors.length = 0;
    alice.send({ t: 'vote', player: alice.state.you.id, category: 'Pays', invalid: true });
    await wait(200);
    check('on ne peut pas contester sa propre réponse', () =>
      assert.ok(alice.errors.some((message) => message.includes('sa propre'))));

    const aliceId = bob.state.you && alice.state.you.id;
    bob.send({ t: 'vote', player: aliceId, category: 'Pays', invalid: true });
    await alice.until((state) => state.board.Pays.some((entry) => entry.votes === 1), 'un vote enregistré');

    check("une seule contestation sur trois joueurs ne suffit pas", () => {
      assert.strictEqual(find('Pays', 'Alice').points, 15);
      assert.strictEqual(find('Pays', 'Alice').votesNeeded, 2);
    });

    carol.send({ t: 'vote', player: aliceId, category: 'Pays', invalid: true });
    await alice.until((state) => state.board.Pays.some((entry) => entry.status === 'rejected'),
      'réponse rejetée à la majorité');

    check('la majorité fait sauter la réponse', () => {
      assert.strictEqual(find('Pays', 'Alice').status, 'rejected');
      assert.strictEqual(find('Pays', 'Alice').points, 0);
      assert.strictEqual(alice.me().roundScore, 15);
    });

    // Un joueur peut retirer son vote.
    carol.send({ t: 'vote', player: aliceId, category: 'Pays', invalid: false });
    await alice.until((state) => state.board.Pays.every((entry) => entry.status !== 'rejected'),
      'vote retiré');
    check('retirer un vote rétablit la réponse', () => assert.strictEqual(find('Pays', 'Alice').points, 15));

    carol.send({ t: 'vote', player: aliceId, category: 'Pays', invalid: true });
    await alice.until((state) => state.board.Pays.some((entry) => entry.status === 'rejected'), 'rejet rétabli');

    // ------------------------------------------------------ fin de manche
    alice.send({ t: 'closeReview' });
    await alice.until((state) => state.phase === 'scores', 'scores affichés');

    check('les totaux cumulés sont justes', () => {
      assert.strictEqual(alice.me().score, 15);
      assert.strictEqual(alice.playerNamed('Bob').score, 15);
      assert.strictEqual(alice.playerNamed('Carol').score, 5);
    });

    check('le classement est trié par score', () => {
      const scores = alice.state.players.map((player) => player.score);
      assert.deepStrictEqual(scores, [...scores].sort((a, b) => b - a));
    });

    // ------------------------------------------- reconnexion en cours de jeu
    const bobSession = bob.session;
    bob.close();
    await wait(300);
    const bobBack = new Client('Bob-retour');
    await bobBack.connect();
    bobBack.send({ t: 'resume', code: bobSession.code, playerId: bobSession.playerId, token: bobSession.token });
    await bobBack.until((state) => state.phase === 'scores', 'Bob a repris sa place');
    check('la reconnexion conserve le score', () => {
      assert.strictEqual(bobBack.me().score, 15);
      assert.strictEqual(bobBack.me().name, 'Bob');
    });

    const impostor = new Client('Impostor');
    await impostor.connect();
    impostor.send({ t: 'resume', code: bobSession.code, playerId: bobSession.playerId, token: 'faux-jeton' });
    await wait(200);
    check('un jeton invalide est rejeté', () => assert.strictEqual(impostor.errors.length, 1));
    impostor.close();

    // ------------------------------------------------------------ manche 2
    alice.send({ t: 'next' });
    await alice.until((state) => state.phase === 'countdown' && state.round === 2, 'manche 2 lancée');
    check('la lettre de la manche 2 est différente', () =>
      assert.notStrictEqual(alice.state.letter, letter));
    check('les scores sont conservés entre les manches', () => assert.strictEqual(alice.me().score, 15));

    await alice.until((state) => state.phase === 'playing', 'manche 2 en cours');
    const letter2 = alice.state.letter;
    alice.send({ t: 'answers', answers: { Animal: `${letter2}xx`, Ville: `${letter2}yy`, Pays: `${letter2}zz` } });
    await alice.until(
      (state) => state.players.find((player) => player.name === 'Alice').filled === 3,
      'Alice a rempli la manche 2',
    );
    alice.send({ t: 'stop' });
    await alice.until((state) => state.phase === 'review', 'dépouillement 2');
    alice.send({ t: 'closeReview' });
    await alice.until((state) => state.phase === 'scores', 'scores 2');

    alice.send({ t: 'next' });
    await alice.until((state) => state.phase === 'finished', 'partie terminée');
    check('la partie se termine après la dernière manche', () =>
      assert.strictEqual(alice.state.phase, 'finished'));

    // ------------------------------------------------------------- rejouer
    alice.send({ t: 'replay' });
    await alice.until((state) => state.phase === 'lobby', 'retour au salon');
    check('rejouer remet les scores à zéro', () =>
      assert.ok(alice.state.players.every((player) => player.score === 0)));
    check('rejouer garde les joueurs', () => assert.strictEqual(alice.state.players.length, 3));

    // --------------------------------------------------------- exclusion
    const carolId = alice.playerNamed('Carol').id;
    alice.send({ t: 'kick', player: carolId });
    await alice.until((state) => state.players.length === 2, 'Carol exclue');
    check("l'hôte peut exclure un joueur", () =>
      assert.ok(!alice.state.players.some((player) => player.name === 'Carol')));

    alice.close();
    bobBack.close();
    carol.close();
  } finally {
    await wait(200);
    server.kill('SIGTERM');
  }

  console.log(failures ? `\n${failures} test(s) en échec.\n` : '\nTous les tests passent.\n');
  process.exit(failures ? 1 : 0);
}

main().catch((error) => {
  console.error('\nLe test a planté :', error.message);
  process.exit(1);
});
