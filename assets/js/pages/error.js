/* ==========================================================================
   GJS — PAGE 404 : le robot (et son vaisseau) à la dérive
   ========================================================================== */

import { env, $, rand } from '../core/utils.js';

const { gsap } = window;

function starfield(scope, canvas) {
  const ctx = canvas.getContext('2d');
  let w = 0;
  let h = 0;
  let stars = [];
  let visible = true;

  const resize = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = canvas.offsetWidth;
    h = canvas.offsetHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    stars = Array.from({ length: Math.round((w * h) / 3500) }, () => ({
      x: rand(0, w), y: rand(0, h), s: rand(0.5, 1.8), v: rand(4, 22), p: rand(0, Math.PI * 2), gold: Math.random() < 0.15,
    }));
  };

  resize();
  scope.resize(canvas, resize);
  scope.intersect(canvas, (entry) => { visible = entry.isIntersecting; });

  const draw = (time, deltaMs) => {
    if (!visible) return;
    const dt = Math.min(deltaMs / 1000, 0.05);
    ctx.clearRect(0, 0, w, h);
    for (const s of stars) {
      if (!env.reducedMotion) {
        s.x -= s.v * dt;
        s.y += s.v * dt * 0.25;
        if (s.x < 0) s.x = w;
        if (s.y > h) s.y = 0;
      }
      const a = 0.3 + 0.5 * Math.abs(Math.sin(time * 0.8 + s.p));
      ctx.fillStyle = s.gold ? `rgba(218,171,58,${a})` : `rgba(238,230,216,${a})`;
      ctx.fillRect(s.x, s.y, s.s, s.s);
    }
  };
  scope.ticker(draw);
}

export default {
  init(scope, root) {
    const canvas = $('[data-lost-stars]', root);
    if (canvas) starfield(scope, canvas);
    const ship = $('[data-lost-ship]', root);
    const robot = $('[data-lost-robot]', root);
    if (!env.reducedMotion) {
      // Le vaisseau tourne sur lui-même, le robot flotte : ils cherchent leur chemin
      if (ship) {
        gsap.to(ship, { rotation: 360, duration: 26, ease: 'none', repeat: -1 });
        gsap.to(ship, { x: -40, y: 24, duration: 7, ease: 'sine.inOut', yoyo: true, repeat: -1 });
      }
      if (robot) gsap.to(robot, { y: -14, rotation: -4, duration: 2.6, ease: 'sine.inOut', yoyo: true, repeat: -1 });
    }
  },
  destroy() {},
};
