import { PLAYER } from './config.js';

export class Input {
  constructor(canvas) {
    this.canvas = canvas;
    this.keys = new Set();
    this.mouseDX = 0;
    this.mouseDY = 0;
    this.mouse = [false, false, false];
    this.mousePressed = [false, false, false];
    this.wheel = 0;
    this.locked = false;
    // Repli utilisé quand la capture du pointeur est refusée (page embarquée
    // dans une iframe, navigateur restrictif) : on vise avec les mouvements de
    // souris bruts et on pivote en amenant le curseur sur les bords.
    this.fallbackLook = false;
    this.edgeX = 0;
    this.sensitivity = PLAYER.mouseSensitivity;
    this.invertY = false;
    this.onLockChange = null;
    this.onFallback = null;
    this.pressedKeys = new Set();

    window.addEventListener('keydown', (e) => {
      if (e.repeat) return;
      const code = e.code;
      this.keys.add(code);
      this.pressedKeys.add(code);
      if (this.locked && ['Space', 'Tab', 'F1', 'F5'].includes(code) && code !== 'F5') e.preventDefault();
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    window.addEventListener('blur', () => { this.keys.clear(); this.mouse = [false, false, false]; });

    document.addEventListener('pointerlockchange', () => {
      this.locked = document.pointerLockElement === this.canvas;
      if (this.locked) this.fallbackLook = false;
      if (this.onLockChange) this.onLockChange(this.locked);
    });
    document.addEventListener('pointerlockerror', () => this.enableFallback());

    document.addEventListener('mousemove', (e) => {
      if (this.locked) {
        this.mouseDX += e.movementX || 0;
        this.mouseDY += e.movementY || 0;
      } else if (this.fallbackLook) {
        this.mouseDX += e.movementX || 0;
        this.mouseDY += e.movementY || 0;
        this.edgeX = (e.clientX / window.innerWidth) * 2 - 1;
      }
    });

    canvas.addEventListener('mousedown', (e) => {
      if (!this.active) return;
      this.mouse[e.button] = true;
      this.mousePressed[e.button] = true;
    });
    window.addEventListener('mouseup', (e) => { this.mouse[e.button] = false; });
    window.addEventListener('contextmenu', (e) => { if (this.active) e.preventDefault(); });
    window.addEventListener('wheel', (e) => { if (this.active) this.wheel += Math.sign(e.deltaY); }, { passive: true });
  }

  /** Le joueur contrôle-t-il la vue ? (pointeur capturé ou mode de repli) */
  get active() { return this.locked || this.fallbackLook; }

  requestLock() {
    if (this.locked) return;
    if (!this.canvas.requestPointerLock) { this.enableFallback(); return; }
    // Chrome refuse un verrouillage demandé juste après une sortie par Échap :
    // dans ce cas le joueur peut simplement recliquer, on ne bascule pas en repli.
    try {
      const r = this.canvas.requestPointerLock();
      if (r && typeof r.catch === 'function') {
        r.catch((err) => {
          if (!err || err.name !== 'SecurityError') this.enableFallback();
        });
      }
    } catch (e) {
      this.enableFallback();
    }
  }

  enableFallback() {
    if (this.fallbackLook || this.locked) return;
    this.fallbackLook = true;
    if (this.onFallback) this.onFallback();
  }

  exitLock() {
    if (this.locked) document.exitPointerLock();
    this.fallbackLook = false;
    this.edgeX = 0;
  }

  down(code) { return this.keys.has(code); }
  pressed(code) { return this.pressedKeys.has(code); }
  mouseDown(b) { return this.mouse[b]; }
  mouseClicked(b) { return this.mousePressed[b]; }

  /** À appeler en fin de frame : remet à zéro les états « appuyé cette frame ». */
  endFrame() {
    this.mouseDX = 0;
    this.mouseDY = 0;
    this.wheel = 0;
    this.mousePressed = [false, false, false];
    this.pressedKeys.clear();
  }

  /** Vecteur de déplacement souhaité en repère local (x = droite, z = avant). */
  moveVector() {
    let x = 0, z = 0;
    if (this.down('KeyW') || this.down('ArrowUp')) z += 1;
    if (this.down('KeyS') || this.down('ArrowDown')) z -= 1;
    if (this.down('KeyD') || this.down('ArrowRight')) x += 1;
    if (this.down('KeyA') || this.down('ArrowLeft')) x -= 1;
    const len = Math.hypot(x, z);
    if (len > 1) { x /= len; z /= len; }
    return { x, z };
  }
}
