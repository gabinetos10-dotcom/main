'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const { WebSocketServer } = require('ws');

const { GameError, Hub, PHASES } = require('./game');
const { LIMITS, cleanText } = require('./config');

const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || '0.0.0.0';
const PUBLIC_DIR = path.join(__dirname, '..', 'public');

/** Un joueur déconnecté du salon d'attente est retiré au bout de ce délai. */
const LOBBY_DROP_MS = 90 * 1000;
/** Garde-fou anti-spam : messages autorisés par fenêtre de 10 s et par socket. */
const RATE_LIMIT = 240;
const RATE_WINDOW_MS = 10 * 1000;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.webmanifest': 'application/manifest+json',
};

const hub = new Hub();

// --------------------------------------------------------------- serveur HTTP

function sendFile(res, filePath) {
  fs.readFile(filePath, (error, content) => {
    if (error) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Page introuvable');
      return;
    }
    const type = MIME_TYPES[path.extname(filePath).toLowerCase()] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': type, 'Cache-Control': 'no-cache' });
    res.end(content);
  });
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

  if (url.pathname === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ status: 'ok', ...hub.stats() }));
    return;
  }

  // Tout le reste est servi depuis public/, en refusant de sortir du dossier.
  const requested = decodeURIComponent(url.pathname);
  const target = path.join(PUBLIC_DIR, requested === '/' ? 'index.html' : requested);
  const resolved = path.resolve(target);
  if (!resolved.startsWith(path.resolve(PUBLIC_DIR))) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Accès refusé');
    return;
  }

  fs.stat(resolved, (error, stats) => {
    // Une URL inconnue (ex. /ABCD partagée à des amis) retombe sur l'application.
    if (error || !stats.isFile()) {
      sendFile(res, path.join(PUBLIC_DIR, 'index.html'));
      return;
    }
    sendFile(res, resolved);
  });
});

/**
 * `ws` réémet les erreurs du serveur HTTP sur le WebSocketServer : sans
 * écouteur des deux côtés, Node lève l'exception avant d'arriver ici.
 */
function handleFatal(error) {
  if (error.code === 'EADDRINUSE') {
    console.error(`\n  Le port ${PORT} est déjà occupé.`);
    console.error(`  Arrête l'autre serveur, ou choisis un autre port : PORT=3001 npm start\n`);
    process.exit(1);
  }
  console.error('Erreur fatale du serveur :', error);
  process.exit(1);
}

server.on('error', handleFatal);

// ------------------------------------------------------------------ WebSocket

const wss = new WebSocketServer({ server, path: '/ws', maxPayload: 64 * 1024 });
wss.on('error', handleFatal);

function reply(socket, payload) {
  if (socket.readyState === 1) socket.send(JSON.stringify(payload));
}

function fail(socket, message) {
  reply(socket, { t: 'error', message });
}

/** Rattache un joueur à son salon et lui renvoie de quoi se reconnecter plus tard. */
function bind(socket, room, player) {
  const previous = hub.sockets.get(player.id);
  if (previous && previous !== socket) {
    previous.ctx = null;
    previous.close(4000, 'Session ouverte ailleurs');
  }
  clearTimeout(player.dropTimer);
  player.dropTimer = null;
  player.connected = true;
  socket.ctx = { playerId: player.id, code: room.code };
  hub.attach(player.id, socket);
  reply(socket, { t: 'session', code: room.code, playerId: player.id, token: player.token });
}

const handlers = {
  create(socket, message) {
    const room = hub.createRoom();
    const player = room.addPlayer(message.name);
    bind(socket, room, player);
    room.broadcast();
  },

  join(socket, message) {
    const room = hub.getRoom(message.code);
    if (!room) throw new GameError("Aucune partie ne porte ce code. Vérifie les 4 lettres.");
    const player = room.addPlayer(message.name);
    bind(socket, room, player);
    room.broadcast();
  },

  resume(socket, message) {
    const room = hub.getRoom(message.code);
    if (!room) throw new GameError('Cette partie est terminée ou a expiré.');
    const player = room.players.get(String(message.playerId || ''));
    if (!player || player.token !== message.token) {
      throw new GameError('Session expirée, rejoins la partie avec le code.');
    }
    bind(socket, room, player);
    room.broadcast();
  },

  rename(socket, message, room, player) {
    const name = cleanText(message.name, LIMITS.nameMax);
    if (!name) return;
    player.name = room.uniqueName(name);
    room.broadcast();
  },

  settings(socket, message, room, player) {
    room.updateSettings(player.id, message.patch || {});
  },

  start(socket, message, room, player) {
    room.start(player.id);
  },

  answers(socket, message, room, player) {
    room.saveAnswers(player.id, message.answers);
  },

  stop(socket, message, room, player) {
    room.stop(player.id);
  },

  vote(socket, message, room, player) {
    room.vote(player.id, String(message.player || ''), String(message.category || ''), Boolean(message.invalid));
  },

  closeReview(socket, message, room, player) {
    room.closeReview(player.id);
  },

  next(socket, message, room, player) {
    room.next(player.id);
  },

  replay(socket, message, room, player) {
    room.replay(player.id);
  },

  kick(socket, message, room, player) {
    room.requireHost(player.id);
    const targetId = String(message.player || '');
    if (targetId === player.id) return;
    const target = room.players.get(targetId);
    if (!target) return;
    const targetSocket = hub.sockets.get(targetId);
    room.removePlayer(targetId);
    hub.detach(targetId);
    if (targetSocket) {
      targetSocket.ctx = null;
      reply(targetSocket, { t: 'kicked' });
      targetSocket.close(4001, 'Exclu du salon');
    }
    room.broadcast();
  },

  leave(socket, message, room, player) {
    room.removePlayer(player.id);
    hub.detach(player.id);
    socket.ctx = null;
    room.broadcast();
  },

  ping(socket) {
    reply(socket, { t: 'pong', now: Date.now() });
  },
};

/** Handlers utilisables sans être déjà assis à une table. */
const ANONYMOUS = new Set(['create', 'join', 'resume', 'ping']);

wss.on('connection', (socket) => {
  socket.isAlive = true;
  socket.ctx = null;
  socket.rate = { count: 0, since: Date.now() };

  socket.on('pong', () => {
    socket.isAlive = true;
  });

  socket.on('message', (raw) => {
    const now = Date.now();
    if (now - socket.rate.since > RATE_WINDOW_MS) socket.rate = { count: 0, since: now };
    socket.rate.count += 1;
    if (socket.rate.count > RATE_LIMIT) {
      fail(socket, 'Trop de messages envoyés, connexion suspendue.');
      socket.close(4008, 'Rate limit');
      return;
    }

    let message;
    try {
      message = JSON.parse(raw.toString());
    } catch {
      fail(socket, 'Message illisible.');
      return;
    }

    const handler = handlers[message && message.t];
    if (!handler) {
      fail(socket, 'Action inconnue.');
      return;
    }

    try {
      if (ANONYMOUS.has(message.t)) {
        handler(socket, message);
        return;
      }
      const ctx = socket.ctx;
      const room = ctx && hub.getRoom(ctx.code);
      const player = room && room.players.get(ctx.playerId);
      if (!room || !player) {
        fail(socket, 'Tu n’es plus dans une partie.');
        return;
      }
      handler(socket, message, room, player);
    } catch (error) {
      if (error instanceof GameError) {
        fail(socket, error.message);
      } else {
        console.error('Erreur lors du traitement du message :', error);
        fail(socket, 'Une erreur est survenue côté serveur.');
      }
    }
  });

  socket.on('close', () => {
    const ctx = socket.ctx;
    if (!ctx) return;
    hub.detach(ctx.playerId);
    const room = hub.getRoom(ctx.code);
    if (!room) return;
    const player = room.players.get(ctx.playerId);
    if (!player) return;

    player.connected = false;
    // Dans le salon d'attente, un joueur parti pour de bon finit par disparaître.
    if (room.phase === PHASES.LOBBY) {
      clearTimeout(player.dropTimer);
      player.dropTimer = setTimeout(() => {
        const current = room.players.get(ctx.playerId);
        if (current && !current.connected) {
          room.removePlayer(ctx.playerId);
          room.broadcast();
        }
      }, LOBBY_DROP_MS);
      if (player.dropTimer.unref) player.dropTimer.unref();
    }
    if (room.hostId === ctx.playerId) room.scheduleHostMigration();
    room.broadcast();
  });

  socket.on('error', () => {});
});

// Coupe les connexions fantômes (onglet fermé brutalement, réseau coupé).
const heartbeat = setInterval(() => {
  for (const socket of wss.clients) {
    if (socket.isAlive === false) {
      socket.terminate();
      continue;
    }
    socket.isAlive = false;
    socket.ping();
  }
}, 30 * 1000);
if (heartbeat.unref) heartbeat.unref();

server.listen(PORT, HOST, () => {
  console.log(`\n  Baccalauréat en ligne — http://localhost:${PORT}\n`);
});

function shutdown() {
  clearInterval(heartbeat);
  wss.close();
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 3000).unref();
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
