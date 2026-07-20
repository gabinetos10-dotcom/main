/**
 * Burst de pétales/confettis — canvas overlay unique, réutilisé.
 * Appelé sur les actions clés (CTA, envoi formulaire, génération moodboard,
 * easter egg). No-op si prefers-reduced-motion.
 */

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  rot: number;
  vr: number;
  color: string;
  life: number;
  maxLife: number;
  shape: "petal" | "confetti" | "heart";
};

const COLORS = ["#F6D2CE", "#E39AA1", "#FBE3A1", "#F4C871", "#E38B6D", "#C9A227"];

let canvas: HTMLCanvasElement | null = null;
let ctx: CanvasRenderingContext2D | null = null;
let particles: Particle[] = [];
let raf = 0;
let dpr = 1;

function prefersReduced() {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

function ensureCanvas() {
  if (canvas) return;
  canvas = document.createElement("canvas");
  canvas.setAttribute("aria-hidden", "true");
  Object.assign(canvas.style, {
    position: "fixed",
    inset: "0",
    width: "100%",
    height: "100%",
    pointerEvents: "none",
    zIndex: "80",
  } as CSSStyleDeclaration);
  document.body.appendChild(canvas);
  ctx = canvas.getContext("2d");
  resize();
  window.addEventListener("resize", resize);
}

function resize() {
  if (!canvas || !ctx) return;
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = window.innerWidth * dpr;
  canvas.height = window.innerHeight * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function drawParticle(p: Particle) {
  if (!ctx) return;
  const alpha = Math.max(0, Math.min(1, p.life / p.maxLife));
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(p.rot);
  ctx.globalAlpha = alpha;
  ctx.fillStyle = p.color;
  if (p.shape === "petal") {
    ctx.beginPath();
    ctx.moveTo(0, -p.size);
    ctx.quadraticCurveTo(p.size * 0.7, 0, 0, p.size);
    ctx.quadraticCurveTo(-p.size * 0.7, 0, 0, -p.size);
    ctx.fill();
  } else if (p.shape === "heart") {
    const s = p.size * 0.5;
    ctx.beginPath();
    ctx.moveTo(0, s * 0.6);
    ctx.bezierCurveTo(s * 1.4, -s * 0.6, s * 0.6, -s * 1.6, 0, -s * 0.6);
    ctx.bezierCurveTo(-s * 0.6, -s * 1.6, -s * 1.4, -s * 0.6, 0, s * 0.6);
    ctx.fill();
  } else {
    ctx.fillRect(-p.size * 0.5, -p.size * 0.3, p.size, p.size * 0.6);
  }
  ctx.restore();
}

function loop() {
  if (!ctx || !canvas) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  particles = particles.filter((p) => p.life > 0);

  for (const p of particles) {
    p.vy += 0.12; // gravité douce
    p.vx *= 0.99;
    p.x += p.vx;
    p.y += p.vy;
    p.rot += p.vr;
    p.life -= 1;
    drawParticle(p);
  }

  if (particles.length > 0) {
    raf = requestAnimationFrame(loop);
  } else {
    cancelAnimationFrame(raf);
    raf = 0;
  }
}

export type BurstOptions = {
  count?: number;
  spread?: number;
  power?: number;
  shapes?: Particle["shape"][];
};

/** Déclenche un burst centré sur (x, y) en pixels viewport. */
export function burst(x: number, y: number, opts: BurstOptions = {}) {
  if (prefersReduced()) return;
  ensureCanvas();
  const { count = 26, spread = Math.PI * 2, power = 9, shapes = ["petal", "confetti"] } = opts;

  for (let i = 0; i < count; i++) {
    const angle = -Math.PI / 2 + (Math.random() - 0.5) * spread;
    const speed = power * (0.4 + Math.random() * 0.9);
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 2,
      size: 5 + Math.random() * 8,
      rot: Math.random() * Math.PI,
      vr: (Math.random() - 0.5) * 0.3,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      life: 70 + Math.random() * 50,
      maxLife: 120,
      shape: shapes[Math.floor(Math.random() * shapes.length)],
    });
  }
  if (!raf) raf = requestAnimationFrame(loop);
}

/** Pluie de pétales depuis le haut de l'écran (easter egg). */
export function petalRain(duration = 3400) {
  if (prefersReduced()) return;
  ensureCanvas();
  const start = performance.now();
  const spawn = () => {
    if (performance.now() - start > duration) return;
    for (let i = 0; i < 3; i++) {
      particles.push({
        x: Math.random() * window.innerWidth,
        y: -20,
        vx: (Math.random() - 0.5) * 1.5,
        vy: 1 + Math.random() * 2,
        size: 6 + Math.random() * 9,
        rot: Math.random() * Math.PI,
        vr: (Math.random() - 0.5) * 0.2,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        life: 220,
        maxLife: 220,
        shape: Math.random() > 0.6 ? "heart" : "petal",
      });
    }
    if (!raf) raf = requestAnimationFrame(loop);
    setTimeout(spawn, 90);
  };
  spawn();
}

/** Burst centré sur un élément DOM. */
export function burstFromElement(el: HTMLElement | null, opts?: BurstOptions) {
  if (!el) return;
  const rect = el.getBoundingClientRect();
  burst(rect.left + rect.width / 2, rect.top + rect.height / 2, opts);
}
