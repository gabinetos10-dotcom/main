"use client";

import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { useApp, useLenisApi } from "@/components/providers/AppContext";
import { runCommand } from "./commands";
import { cn } from "@/lib/utils";

interface Entry {
  type: "in" | "out";
  text: string;
}

const WELCOME: Entry[] = [
  { type: "out", text: "GJS Terminal v1.0 — bienvenue, agent." },
  { type: "out", text: "Tapez 'help' pour la liste des commandes." },
];

/**
 * Terminal secret GJS — s'ouvre en tapant « gjs », via le code Konami,
 * ou après 5 clics sur le logo. Fenêtre mono, historique ↑↓, commandes
 * de marque + surprises.
 */
export default function Terminal() {
  const { setTerminalOpen, setMatrixOn, matrixOn, openGame } = useApp();
  const { scrollTo } = useLenisApi();
  const [entries, setEntries] = useState<Entry[]>(() => [
    ...WELCOME,
    ...(matrixOn ? [{ type: "out", text: "⇧ KONAMI DÉTECTÉ — pluie de données activée (12 s)" } as Entry] : []),
  ]);
  const [input, setInput] = useState("");
  const [cmdHistory, setCmdHistory] = useState<string[]>([]);
  const [histIdx, setHistIdx] = useState(-1);
  const bodyRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // léger différé : la touche qui a OUVERT le terminal (le « s » de gjs,
    // le « a » du Konami) ne doit pas fuir dans le champ de saisie
    const t = setTimeout(() => inputRef.current?.focus(), 40);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const el = bodyRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [entries]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setTerminalOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setTerminalOpen]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const raw = input;
    setInput("");
    setHistIdx(-1);
    if (raw.trim()) setCmdHistory((h) => [raw, ...h].slice(0, 40));

    const result = runCommand(raw);

    if (result.action === "clear") {
      setEntries([]);
      return;
    }

    setEntries((prev) => [
      ...prev,
      { type: "in", text: raw },
      ...result.lines.map((l): Entry => ({ type: "out", text: l })),
    ]);

    if (result.action === "exit") {
      setTimeout(() => setTerminalOpen(false), 450);
    } else if (result.action && typeof result.action === "object") {
      const a = result.action;
      if (a.type === "game") {
        setTimeout(() => {
          setTerminalOpen(false);
          openGame(a.game);
        }, 350);
      } else if (a.type === "matrix") {
        setMatrixOn(true);
        setTimeout(() => setMatrixOn(false), 12000);
      } else if (a.type === "goto") {
        setTimeout(() => {
          setTerminalOpen(false);
          scrollTo(a.target);
        }, 500);
      }
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowUp") {
      e.preventDefault();
      const next = Math.min(histIdx + 1, cmdHistory.length - 1);
      if (cmdHistory[next] != null) {
        setHistIdx(next);
        setInput(cmdHistory[next]);
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      const next = histIdx - 1;
      setHistIdx(Math.max(next, -1));
      setInput(next >= 0 ? (cmdHistory[next] ?? "") : "");
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 40, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      role="dialog"
      aria-label="Terminal secret GJS"
      className="fixed bottom-4 left-4 right-4 z-[95] flex h-[min(68vh,440px)] flex-col overflow-hidden rounded-2xl border border-mindaro/25 bg-ink/95 font-mono text-[13px] shadow-panel backdrop-blur-md sm:left-auto sm:w-[560px]"
    >
      {/* Barre de fenêtre */}
      <div className="flex items-center justify-between border-b border-mist/10 px-4 py-2.5">
        <div className="flex items-center gap-2">
          <span aria-hidden className="h-2.5 w-2.5 rounded-full bg-mist/15" />
          <span aria-hidden className="h-2.5 w-2.5 rounded-full bg-sage/60" />
          <span aria-hidden className="h-2.5 w-2.5 rounded-full bg-mindaro" />
          <span className="ml-2 text-[11px] tracking-[0.14em] text-cambridge">invité@gjs — ~/agence</span>
        </div>
        <button
          onClick={() => setTerminalOpen(false)}
          aria-label="Fermer le terminal"
          className="grid h-7 w-7 place-items-center rounded-full text-cambridge transition-colors hover:bg-mist/10 hover:text-mist"
        >
          ✕
        </button>
      </div>

      {/* Sortie */}
      <div ref={bodyRef} className="flex-1 space-y-1 overflow-y-auto px-4 py-3 leading-relaxed">
        {entries.map((e, i) => (
          <p
            key={i}
            className={cn(
              "whitespace-pre-wrap break-words",
              e.type === "in" ? "text-mist" : "text-cambridge"
            )}
          >
            {e.type === "in" && <span className="mr-2 text-mindaro">❯</span>}
            {e.text}
          </p>
        ))}
      </div>

      {/* Saisie */}
      <form onSubmit={submit} className="flex items-center gap-2 border-t border-mist/10 px-4 py-3">
        <span aria-hidden className="text-mindaro">
          ❯
        </span>
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          aria-label="Ligne de commande GJS"
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
          className="flex-1 bg-transparent text-mist caret-mindaro outline-none placeholder:text-cambridge/40"
          placeholder="help"
        />
      </form>
    </motion.div>
  );
}
