"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { useEasterEgg } from "@/components/providers/EasterEgg";

type Line = { kind: "in" | "out" | "sys"; text: string };

const BOOT: Line[] = [
  { kind: "sys", text: "GJS//OS v2.049 — secure shell established" },
  { kind: "sys", text: "agent 'GHOST' en ligne. Tapez `help` pour les commandes." },
];

export function MatrixTerminal() {
  const { matrixOpen, closeMatrix } = useEasterEgg();
  const [lines, setLines] = useState<Line[]>(BOOT);
  const [input, setInput] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (matrixOpen) {
      setLines(BOOT);
      setInput("");
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [matrixOpen]);

  useEffect(() => {
    bodyRef.current?.scrollTo({ top: bodyRef.current.scrollHeight });
  }, [lines]);

  useEffect(() => {
    if (!matrixOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && closeMatrix();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [matrixOpen, closeMatrix]);

  const respond = (raw: string): Line[] => {
    const cmd = raw.trim().toLowerCase();
    if (!cmd) return [];
    switch (cmd) {
      case "help":
        return [
          { kind: "out", text: "commandes : about · services · projets · contact · stack · joke · konami · clear · exit" },
        ];
      case "about":
      case "qui":
        return [
          { kind: "out", text: "GJS — studio digital français. On code des expériences, on automatise l'ennui, on transforme la donnée en décisions." },
        ];
      case "services":
      case "expertise":
        return [
          { kind: "out", text: "[01] Création Web  [02] Automatisation  [03] Web Scraping  [04] Conseil Tech" },
        ];
      case "projets":
      case "projects":
        return [{ kind: "out", text: "Aurora Labs · Fluxo CRM · Prisme Data · Atelier Nord — et bientôt, le vôtre." }];
      case "contact":
        return [{ kind: "out", text: "→ hello@gjs.agency · Paris, FR · open for projects" }];
      case "stack":
        return [{ kind: "out", text: "Next.js · React · Three.js · Framer Motion · n8n · Python. Toujours l'outil juste." }];
      case "joke":
        return [{ kind: "out", text: "Il y a 10 types de gens : ceux qui comprennent le binaire et les autres." }];
      case "konami":
        return [{ kind: "out", text: "↑↑↓↓←→←→ B A — vous y êtes déjà, félicitations agent. 👾" }];
      case "clear":
        return [];
      case "exit":
      case "quit":
        setTimeout(closeMatrix, 120);
        return [{ kind: "sys", text: "déconnexion… à bientôt dans la matrice." }];
      default:
        return [
          {
            kind: "out",
            text: `GHOST> "${raw}" bien reçu. Un humain de GJS peut creuser ça — tapez \`contact\`.`,
          },
        ];
    }
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const value = input;
    if (!value.trim()) return;
    const out = respond(value);
    if (value.trim().toLowerCase() === "clear") {
      setLines([]);
    } else {
      setLines((l) => [...l, { kind: "in", text: value }, ...out]);
    }
    setInput("");
  };

  return (
    <AnimatePresence>
      {matrixOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
          className="fixed inset-0 z-[110] bg-black/95"
          onClick={() => inputRef.current?.focus()}
        >
          <MatrixRain />

          {/* CRT scanline overlay */}
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.12]"
            style={{
              backgroundImage:
                "repeating-linear-gradient(0deg, #0f0 0, #0f0 1px, transparent 1px, transparent 3px)",
            }}
          />

          <motion.div
            initial={{ scale: 0.98, y: 10 }}
            animate={{ scale: 1, y: 0 }}
            className="relative z-10 mx-auto flex h-full max-w-3xl flex-col p-4 sm:p-8"
          >
            <div className="flex items-center justify-between border-b border-[#00ff8840] pb-3 font-mono text-[#00ff88]">
              <span className="text-sm">┌─ gjs://ghost‑terminal</span>
              <button
                onClick={closeMatrix}
                className="rounded border border-[#00ff8840] px-2 py-0.5 text-xs transition-colors hover:bg-[#00ff8820]"
              >
                [ esc ] exit
              </button>
            </div>

            <div
              ref={bodyRef}
              className="no-scrollbar flex-1 overflow-y-auto py-4 font-mono text-[13px] leading-relaxed"
            >
              {lines.map((l, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className={
                    l.kind === "in"
                      ? "text-white"
                      : l.kind === "sys"
                        ? "text-[#00ff88]/60"
                        : "text-[#00ff88]"
                  }
                >
                  {l.kind === "in" ? (
                    <span>
                      <span className="text-[#00ff88]">visitor@gjs:~$</span> {l.text}
                    </span>
                  ) : (
                    l.text
                  )}
                </motion.div>
              ))}
            </div>

            <form onSubmit={submit} className="flex items-center gap-2 border-t border-[#00ff8840] pt-3 font-mono text-[13px]">
              <span className="text-[#00ff88]">visitor@gjs:~$</span>
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                spellCheck={false}
                autoComplete="off"
                className="flex-1 bg-transparent text-white caret-[#00ff88] outline-none"
              />
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** Falling‑glyph canvas, throttled and cleaned up. */
function MatrixRain() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let w = (canvas.width = window.innerWidth);
    let h = (canvas.height = window.innerHeight);
    const glyphs = "アイウエオカキクケコサシabcdef0123456789GJS<>{}/".split("");
    const fontSize = 16;
    let columns = Math.floor(w / fontSize);
    let drops = new Array(columns).fill(1);

    const resize = () => {
      w = canvas.width = window.innerWidth;
      h = canvas.height = window.innerHeight;
      columns = Math.floor(w / fontSize);
      drops = new Array(columns).fill(1);
    };
    window.addEventListener("resize", resize);

    let last = 0;
    const draw = (t: number) => {
      raf = requestAnimationFrame(draw);
      if (t - last < 55) return; // ~18fps is plenty and saves battery
      last = t;
      ctx.fillStyle = "rgba(0,0,0,0.08)";
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = "#00ff88";
      ctx.font = `${fontSize}px monospace`;
      for (let i = 0; i < drops.length; i++) {
        const text = glyphs[Math.floor(Math.random() * glyphs.length)];
        ctx.fillText(text, i * fontSize, drops[i] * fontSize);
        if (drops[i] * fontSize > h && Math.random() > 0.975) drops[i] = 0;
        drops[i]++;
      }
    };
    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return <canvas ref={ref} className="absolute inset-0 opacity-40" />;
}
