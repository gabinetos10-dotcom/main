import { Game } from './game.js';
import { resumeAudio } from './audio.js';

function boot() {
  const canvas = document.getElementById('game');
  const loading = document.getElementById('loading');
  try {
    const game = new Game(canvas);
    game.show('screen-menu');
    window.game = game;   // pratique pour déboguer depuis la console
    loading.style.display = 'none';
    // Le navigateur exige un geste utilisateur pour démarrer l'audio.
    window.addEventListener('pointerdown', () => resumeAudio(), { once: false });
  } catch (err) {
    console.error(err);
    loading.innerHTML =
      `<b>Impossible de démarrer le jeu.</b><br>${err.message}<br>` +
      `<small>WebGL est-il activé ? Le jeu doit être servi par un serveur HTTP (voir le README).</small>`;
  }
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
else boot();
