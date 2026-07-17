"use client";

import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { GameEnd, GameIntro, type GameProps } from "./ui";

/**
 * SHIP IT — illustre la création web (et le conseil) GJS.
 * Un jeu d'empilement : posez chaque bloc d'interface au bon moment,
 * le plus aligné possible, puis déployez. Score façon Lighthouse.
 */

const BLOCKS = ["NAVIGATION", "HERO", "FONCTIONNALITÉS", "TÉMOIGNAGES", "FOOTER"];
const BLOCK_COLORS = ["#1b4079", "#4d7c8a", "#7f9c96", "#8fad88", "#cbdf90"];
const AREA_H = 380;
const BLOCK_H = 46;
const BASE_W = 230;

interface Placed {
  left: number;
  width: number;
  label: string;
  color: string;
}

export default function ShipIt({ onExit }: GameProps) {
  const [phase, setPhase] = useState<"intro" | "run" | "deploy" | "end">("intro");
  const [placed, setPlaced] = useState<Placed[]>([]);
  const [lives, setLives] = useState(3);
  const [missFlash, setMissFlash] = useState(false);
  const [deployPct, setDeployPct] = useState(0);
  const [finalScore, setFinalScore] = useState(0);

  const areaRef = useRef<HTMLDivElement>(null);
  const movingRef = useRef<HTMLDivElement>(null);
  const runtime = useRef({ t: 0, level: 0, width: BASE_W, left: 0, areaW: 320, overlaps: [] as number[], lives: 3 });

  /* Boucle d'oscillation du bloc courant */
  useEffect(() => {
    if (phase !== "run") return;
    const R = runtime.current;
    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      const area = areaRef.current;
      if (area) R.areaW = area.clientWidth;
      const speed = 1.5 + R.level * 0.45;
      R.t += dt * speed;
      const amplitude = Math.max(0, (R.areaW - R.width) / 2 - 4);
      R.left = R.areaW / 2 - R.width / 2 + Math.sin(R.t) * amplitude;
      if (movingRef.current) {
        movingRef.current.style.transform = `translateX(${R.left}px)`;
        movingRef.current.style.width = `${R.width}px`;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame((t) => {
      last = t;
      loop(t);
    });
    return () => cancelAnimationFrame(raf);
  }, [phase]);

  /* Déploiement final */
  useEffect(() => {
    if (phase !== "deploy") return;
    let pct = 0;
    const id = setInterval(() => {
      pct += 2 + Math.random() * 5;
      if (pct >= 100) {
        pct = 100;
        clearInterval(id);
        const R = runtime.current;
        const avg = R.overlaps.length
          ? R.overlaps.reduce((a, b) => a + b, 0) / R.overlaps.length
          : 0;
        // précision moyenne (0-1) + vies restantes → score façon Lighthouse
        const score = Math.round(58 + avg * 36 + R.lives * 2);
        setFinalScore(Math.min(100, score));
        setTimeout(() => setPhase("end"), 500);
      }
      setDeployPct(Math.round(pct));
    }, 90);
    return () => clearInterval(id);
  }, [phase]);

  const start = () => {
    const R = runtime.current;
    R.t = 0;
    R.level = 0;
    R.width = BASE_W;
    R.overlaps = [];
    R.lives = 3;
    setPlaced([]);
    setLives(3);
    setDeployPct(0);
    setPhase("run");
  };

  const drop = () => {
    if (phase !== "run") return;
    const R = runtime.current;
    const prev: Placed | undefined = placed[placed.length - 1];
    const prevLeft = prev ? prev.left : R.areaW / 2 - BASE_W / 2;
    const prevRight = prev ? prev.left + prev.width : R.areaW / 2 + BASE_W / 2;

    const left = Math.max(R.left, prevLeft);
    const right = Math.min(R.left + R.width, prevRight);
    const overlap = right - left;

    if (overlap < 14) {
      // raté — le bloc tombe, une vie en moins
      R.lives -= 1;
      setLives(R.lives);
      setMissFlash(true);
      setTimeout(() => setMissFlash(false), 380);
      if (R.lives <= 0) {
        R.overlaps.push(0);
        setFinalScore(Math.max(38, Math.round(40 + (R.overlaps.reduce((a, b) => a + b, 0) / BLOCKS.length) * 30)));
        setPhase("end");
      }
      return;
    }

    const precision = overlap / R.width;
    R.overlaps.push(precision);
    const newPlaced: Placed = {
      left,
      width: overlap,
      label: BLOCKS[R.level]!,
      color: BLOCK_COLORS[R.level]!,
    };
    setPlaced((p) => [...p, newPlaced]);

    if (R.level === BLOCKS.length - 1) {
      setPhase("deploy");
      return;
    }
    R.level += 1;
    R.width = overlap;
    R.t = 0;
  };

  /* Barre espace = poser */
  useEffect(() => {
    if (phase !== "run") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        e.preventDefault();
        drop();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, placed]);

  if (phase === "intro")
    return (
      <GameIntro
        title="Ship It"
        rules={[
          "▸ La page se construit bloc par bloc, de la nav au footer.",
          "▸ Touchez (ou Espace) pour poser le bloc en mouvement.",
          "▸ Mal aligné = bloc rogné. Trop court = bloc perdu (3 vies).",
          "▸ Objectif : un score Lighthouse digne de la prod.",
        ]}
        cta="Construire"
        onStart={start}
      />
    );

  if (phase === "end")
    return (
      <GameEnd
        score={`${finalScore}/100`}
        scoreLabel="Score Lighthouse"
        rank={finalScore >= 93 ? "Pixel perfect" : finalScore >= 80 ? "Prod-ready" : "MVP fragile"}
        pitch="Un bon site, ce sont des fondations alignées au pixel — structure, performance, finitions. Nous nous chargeons de l'alignement, vous gardez la vision."
        onReplay={start}
        onExit={onExit}
      />
    );

  const currentLabel = BLOCKS[runtime.current.level] ?? "";
  const currentColor = BLOCK_COLORS[runtime.current.level] ?? BLOCK_COLORS[0]!;

  return (
    <div>
      {/* Barre d'état */}
      <div className="mb-3 flex items-center justify-between font-mono text-[11px] uppercase tracking-[0.18em] text-cambridge">
        <span>
          Bloc <span className="text-mindaro">{Math.min(placed.length + 1, BLOCKS.length)}</span>/{BLOCKS.length}
        </span>
        <span aria-label={`${lives} vies restantes`} className="tracking-[0.3em] text-mindaro">
          {"▮".repeat(lives)}
          <span className="text-mist/15">{"▮".repeat(Math.max(0, 3 - lives))}</span>
        </span>
      </div>

      {/* Zone de jeu */}
      <button
        onClick={drop}
        aria-label={`Poser le bloc ${currentLabel}`}
        className={cn(
          "relative block w-full cursor-pointer touch-none overflow-hidden rounded-2xl border bg-ink/60 transition-colors",
          missFlash ? "border-alert/70" : "border-mist/10"
        )}
        style={{ height: AREA_H }}
      >
        {/* grille de fond */}
        <span
          aria-hidden
          className="absolute inset-0 opacity-[0.05] [background-image:linear-gradient(to_right,var(--color-mist)_1px,transparent_1px),linear-gradient(to_bottom,var(--color-mist)_1px,transparent_1px)] [background-size:28px_28px]"
        />

        {phase === "deploy" ? (
          <span className="absolute inset-0 grid place-items-center">
            <span className="w-[min(80%,320px)] font-mono text-xs text-cambridge">
              <span className="mb-2 block text-left">
                $ npm run deploy <span className="animate-blink">▮</span>
              </span>
              <span className="block h-1.5 w-full overflow-hidden rounded-full bg-mist/10">
                <motion.span
                  className="block h-full bg-mindaro shadow-glow-sm"
                  animate={{ width: `${deployPct}%` }}
                  transition={{ ease: "easeOut", duration: 0.15 }}
                />
              </span>
              <span className="mt-2 block text-right text-mindaro">{deployPct}%</span>
            </span>
          </span>
        ) : (
          <>
            {/* bloc en mouvement (en haut) */}
            <span
              ref={movingRef}
              aria-hidden
              className="absolute top-4 left-0 grid place-items-center rounded-lg border font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-mist will-change-transform"
              style={{
                height: BLOCK_H,
                width: runtime.current.width,
                background: `${currentColor}40`,
                borderColor: `${currentColor}`,
              }}
            >
              {currentLabel}
            </span>

            {/* pile posée (depuis le bas) */}
            {placed.map((b, i) => (
              <motion.span
                key={`${b.label}-${i}`}
                aria-hidden
                initial={{ scaleY: 0.6, opacity: 0.6 }}
                animate={{ scaleY: 1, opacity: 1 }}
                transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                className="absolute grid origin-bottom place-items-center overflow-hidden rounded-md border font-mono text-[9px] font-semibold uppercase tracking-[0.12em] text-mist/90"
                style={{
                  height: BLOCK_H,
                  width: b.width,
                  left: b.left,
                  bottom: 44 + i * (BLOCK_H + 2),
                  background: `${b.color}4d`,
                  borderColor: b.color,
                }}
              >
                {b.width > 88 ? b.label : ""}
              </motion.span>
            ))}

            {/* socle serveur */}
            <span
              aria-hidden
              className="absolute bottom-4 left-1/2 grid h-6 -translate-x-1/2 place-items-center rounded-md border border-mist/20 bg-deep px-4 font-mono text-[9px] uppercase tracking-[0.2em] text-cambridge"
              style={{ width: BASE_W + 24 }}
            >
              serveur — prod
            </span>
          </>
        )}
      </button>

      <p className="mt-4 text-center font-mono text-[10px] uppercase tracking-[0.2em] text-cambridge/60">
        {phase === "deploy" ? "mise en production…" : "touchez la zone ou pressez Espace pour poser"}
      </p>
    </div>
  );
}
