"use client";

import { useEffect, useRef, useState } from "react";
import { PALETTE } from "@/lib/palette";
import { GameEnd, GameIntro, type GameProps } from "./ui";

/**
 * DATA CATCHER — illustre le scraping GJS.
 * Des fragments de données défilent : touchez les données propres,
 * évitez le bruit. Canvas 2D, tactile + souris, 35 secondes.
 */

const GOOD = [
  "prix: 49,90 €",
  "{ sku: 8412 }",
  "contact@pro.fr",
  "SIREN 842 951 067",
  "stock: 122",
  "▲ +12 %",
  "note: 4,8/5",
  "ref: GJS-2201",
  "ville: Lyon",
  "[ 1 024 lignes ]",
];
const BAD = ["▓▓▓▓▓▓", "�corrompu�", "NaN", "captcha!", "erreur 403", "cookie_pub", "<div soup>", "timeout", "%%%%"];

const DURATION = 35;

interface Chip {
  x: number;
  y: number;
  vy: number;
  w: number;
  h: number;
  label: string;
  good: boolean;
  pop: number; // 0 = vivant, >0 = animation de disparition
  popGood: boolean;
}

interface GameState {
  chips: Chip[];
  score: number;
  combo: number;
  time: number;
  spawnAcc: number;
  shake: number;
  caught: number;
}

export default function DataCatcher({ onExit }: GameProps) {
  const [phase, setPhase] = useState<"intro" | "run" | "end">("intro");
  const [finalScore, setFinalScore] = useState(0);
  const [caught, setCaught] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<GameState>({ chips: [], score: 0, combo: 1, time: DURATION, spawnAcc: 0, shake: 0, caught: 0 });

  useEffect(() => {
    if (phase !== "run") return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const S = stateRef.current;
    Object.assign(S, { chips: [], score: 0, combo: 1, time: DURATION, spawnAcc: 0, shake: 0, caught: 0 });

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const family = getComputedStyle(canvas).fontFamily;
    let cw = 0;
    let ch = 0;
    const resize = () => {
      const r = canvas.getBoundingClientRect();
      cw = r.width;
      ch = r.height;
      canvas.width = Math.round(cw * dpr);
      canvas.height = Math.round(ch * dpr);
    };
    resize();
    window.addEventListener("resize", resize);

    const spawn = () => {
      const good = Math.random() > 0.36;
      const label = (good ? GOOD : BAD)[Math.floor(Math.random() * (good ? GOOD : BAD).length)]!;
      ctx.font = `500 13px ${family}`;
      const w = ctx.measureText(label).width + 26;
      S.chips.push({
        x: 8 + Math.random() * Math.max(10, cw - w - 16),
        y: -34,
        vy: 46 + Math.random() * 55 + (DURATION - S.time) * 2.4,
        w,
        h: 32,
        label,
        good,
        pop: 0,
        popGood: false,
      });
    };

    const onPointer = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      const x = e.clientX - r.left;
      const y = e.clientY - r.top;
      for (let i = S.chips.length - 1; i >= 0; i--) {
        const c = S.chips[i]!;
        if (c.pop === 0 && x >= c.x - 6 && x <= c.x + c.w + 6 && y >= c.y - 6 && y <= c.y + c.h + 6) {
          c.pop = 0.0001;
          c.popGood = c.good;
          if (c.good) {
            S.score += 10 * S.combo;
            S.combo = Math.min(S.combo + 1, 5);
            S.caught += 1;
          } else {
            S.score = Math.max(0, S.score - 8);
            S.combo = 1;
            S.shake = 0.35;
          }
          break;
        }
      }
    };
    canvas.addEventListener("pointerdown", onPointer);

    let raf = 0;
    let last = performance.now();

    const loop = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;

      /* update */
      S.time -= dt;
      S.spawnAcc += dt;
      S.shake = Math.max(0, S.shake - dt * 2);
      const interval = Math.max(0.28, 0.75 - (DURATION - S.time) * 0.012);
      while (S.spawnAcc >= interval) {
        S.spawnAcc -= interval;
        spawn();
      }
      for (const c of S.chips) {
        if (c.pop > 0) c.pop = Math.min(1, c.pop + dt * 3.4);
        else {
          c.y += c.vy * dt;
          if (c.y > ch + 20 && c.good) S.combo = 1; // donnée propre perdue → combo cassé
        }
      }
      S.chips = S.chips.filter((c) => c.pop < 1 && c.y < ch + 40);

      /* draw */
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, cw, ch);
      if (S.shake > 0) ctx.translate((Math.random() - 0.5) * S.shake * 10, (Math.random() - 0.5) * S.shake * 10);

      for (const c of S.chips) {
        const t = c.pop;
        const scale = t > 0 ? (c.popGood ? 1 + t * 0.45 : 1 - t * 0.4) : 1;
        const alpha = t > 0 ? 1 - t : 1;
        ctx.save();
        ctx.translate(c.x + c.w / 2, c.y + c.h / 2);
        ctx.scale(scale, scale);
        ctx.globalAlpha = alpha;
        ctx.beginPath();
        ctx.roundRect(-c.w / 2, -c.h / 2, c.w, c.h, 9);
        ctx.fillStyle = t > 0 && c.popGood ? `${PALETTE.mindaro}33` : "#0d1b33cc";
        ctx.fill();
        ctx.strokeStyle =
          t > 0 ? (c.popGood ? PALETTE.mindaro : PALETTE.alert) : c.good ? `${PALETTE.air}99` : "#eaf3ee22";
        ctx.lineWidth = 1.4;
        ctx.stroke();
        ctx.font = `500 13px ${family}`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        if (!c.good && t === 0) {
          ctx.fillStyle = `${PALETTE.alert}55`;
          ctx.fillText(c.label, 1.4, 1);
        }
        ctx.fillStyle = t > 0 && c.popGood ? PALETTE.lumen : c.good ? PALETTE.mist : "#7f9c96aa";
        ctx.fillText(c.label, 0, 0.5);
        ctx.restore();
      }

      /* HUD in-canvas */
      ctx.globalAlpha = 1;
      ctx.font = `600 14px ${family}`;
      ctx.textAlign = "left";
      ctx.textBaseline = "alphabetic";
      ctx.fillStyle = PALETTE.mist;
      ctx.fillText(`SCORE ${S.score}`, 14, 26);
      ctx.textAlign = "right";
      ctx.fillStyle = S.combo > 1 ? PALETTE.mindaro : "#7f9c96";
      ctx.fillText(`COMBO ×${S.combo}`, cw - 14, 26);
      // barre de temps
      ctx.fillStyle = "#eaf3ee1a";
      ctx.fillRect(0, 0, cw, 3);
      ctx.fillStyle = PALETTE.mindaro;
      ctx.fillRect(0, 0, cw * (S.time / DURATION), 3);

      if (S.time <= 0) {
        setFinalScore(S.score);
        setCaught(S.caught);
        setPhase("end");
        return;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame((t) => {
      last = t;
      loop(t);
    });

    return () => {
      cancelAnimationFrame(raf);
      canvas.removeEventListener("pointerdown", onPointer);
      window.removeEventListener("resize", resize);
    };
  }, [phase]);

  if (phase === "intro")
    return (
      <GameIntro
        title="Data Catcher"
        rules={[
          "▸ Touchez les données propres — prix, e-mails, références…",
          "▸ Évitez le bruit : ▓▓▓, captchas, erreurs 403.",
          "▸ Enchaînez sans faute pour monter le combo (×5 max).",
          `▸ ${DURATION} secondes. Prêt·e ?`,
        ]}
        cta="Extraire"
        onStart={() => setPhase("run")}
      />
    );

  if (phase === "end")
    return (
      <GameEnd
        score={String(finalScore)}
        rank={finalScore >= 320 ? "Pipeline vivant" : finalScore >= 180 ? "Analyste data" : "Stagiaire du scraping"}
        pitch={`Vous venez d'extraire ${caught} données propres à la main. Nos robots en trient 3 millions par nuit — dédupliquées, structurées, livrées. C'est exactement notre métier.`}
        onReplay={() => setPhase("run")}
        onExit={onExit}
      />
    );

  return (
    <div className="font-mono">
      <canvas
        ref={canvasRef}
        className="h-[420px] w-full touch-none rounded-2xl border border-mist/10 bg-ink/60 sm:h-[440px]"
        aria-label="Zone de jeu Data Catcher : touchez les données propres qui défilent"
      />
    </div>
  );
}
