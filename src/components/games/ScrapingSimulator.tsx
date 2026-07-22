"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Play, RotateCcw, Terminal, Check } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type Phase = "idle" | "running" | "done";
type LogLine = { text: string; tone: "sys" | "ok" | "muted" | "accent" };

const RESULT_ROWS = [
  { field: "title", value: "Casque audio Pro X", type: "string" },
  { field: "price", value: "249,00 €", type: "currency" },
  { field: "rating", value: "4.8 / 5", type: "float" },
  { field: "stock", value: "in_stock", type: "enum" },
  { field: "sku", value: "GJS-AX-2049", type: "string" },
];

export function ScrapingSimulator() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [url, setUrl] = useState("boutique-demo.fr/produits");
  const [logs, setLogs] = useState<LogLine[]>([]);
  const [rows, setRows] = useState<number>(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearTimers = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };
  useEffect(() => () => clearTimers(), []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [logs]);

  const run = () => {
    if (phase === "running") return;
    clearTimers();
    setPhase("running");
    setLogs([]);
    setRows(0);

    const clean = url.replace(/^https?:\/\//, "").replace(/\/$/, "");
    const script: LogLine[] = [
      { text: `$ gjs-scraper fetch https://${clean}`, tone: "accent" },
      { text: `→ resolving DNS… 34ms`, tone: "muted" },
      { text: `→ GET / · 200 OK · 128kb`, tone: "ok" },
      { text: `→ rendering headless (chromium)…`, tone: "muted" },
      { text: `→ waiting for [data-product] selectors`, tone: "sys" },
      { text: `✓ 24 nodes matched`, tone: "ok" },
      { text: `→ extracting: title · price · rating · stock · sku`, tone: "sys" },
      { text: `→ normalising currency → EUR`, tone: "muted" },
      { text: `✓ structured 24 records · 0 errors`, tone: "ok" },
    ];

    let delay = 260;
    script.forEach((line, i) => {
      timers.current.push(
        setTimeout(() => {
          setLogs((l) => [...l, line]);
          if (i === script.length - 1) {
            // reveal structured rows one by one
            RESULT_ROWS.forEach((_, r) => {
              timers.current.push(setTimeout(() => setRows(r + 1), 180 * (r + 1)));
            });
            timers.current.push(setTimeout(() => setPhase("done"), 180 * RESULT_ROWS.length + 200));
          }
        }, delay)
      );
      delay += 320 + Math.random() * 180;
    });
  };

  const reset = () => {
    clearTimers();
    setPhase("idle");
    setLogs([]);
    setRows(0);
  };

  return (
    <div className="border-gradient glass flex h-full flex-col overflow-hidden rounded-[var(--radius-lg)]">
      {/* Toolbar */}
      <div className="flex items-center gap-2 border-b border-[var(--color-line)] px-4 py-3">
        <div className="flex gap-1.5">
          <span className="h-3 w-3 rounded-full bg-[#ff5f57]" />
          <span className="h-3 w-3 rounded-full bg-[#febc2e]" />
          <span className="h-3 w-3 rounded-full bg-[#28c840]" />
        </div>
        <div className="ml-2 flex items-center gap-2 text-[var(--color-text-dim)]">
          <Terminal size={13} />
          <span className="font-[family-name:var(--font-mono)] text-xs">gjs-scraper</span>
        </div>
      </div>

      {/* URL bar */}
      <div className="flex items-center gap-2 px-4 py-3">
        <span className="font-[family-name:var(--font-mono)] text-xs text-[var(--color-text-mute)]">
          https://
        </span>
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          spellCheck={false}
          className="min-w-0 flex-1 rounded-lg border border-[var(--color-line)] bg-[var(--color-bg)] px-3 py-2 font-[family-name:var(--font-mono)] text-xs text-[var(--color-text)] outline-none transition-colors focus:border-[var(--color-accent)]"
        />
        <button
          onClick={phase === "done" ? reset : run}
          disabled={phase === "running"}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-[linear-gradient(120deg,var(--color-accent),var(--color-accent-2))] px-3.5 py-2 text-xs font-medium text-white transition-opacity disabled:opacity-50"
        >
          {phase === "done" ? (
            <>
              <RotateCcw size={13} /> Relancer
            </>
          ) : (
            <>
              <Play size={13} /> {phase === "running" ? "Extraction…" : "Lancer l'extraction"}
            </>
          )}
        </button>
      </div>

      {/* Body */}
      <div className="grid flex-1 grid-cols-1 gap-0 md:grid-cols-2">
        {/* Terminal logs */}
        <div
          ref={scrollRef}
          className="no-scrollbar min-h-[220px] overflow-y-auto border-t border-[var(--color-line)] bg-[var(--color-bg)] p-4 font-[family-name:var(--font-mono)] text-[11px] leading-relaxed md:border-r"
        >
          {logs.length === 0 && (
            <span className="text-[var(--color-text-mute)]">
              {"// Entrez une URL et lancez l'extraction…"}
            </span>
          )}
          {logs.map((l, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              className={
                l.tone === "ok"
                  ? "text-[#4ade80]"
                  : l.tone === "accent"
                    ? "text-[var(--color-accent-2)]"
                    : l.tone === "muted"
                      ? "text-[var(--color-text-mute)]"
                      : "text-[var(--color-text-dim)]"
              }
            >
              {l.text}
            </motion.div>
          ))}
          {phase === "running" && <span className="caret text-transparent" />}
        </div>

        {/* Structured output */}
        <div className="min-h-[220px] border-t border-[var(--color-line)] p-4">
          <div className="mb-3 flex items-center justify-between">
            <span className="font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-[0.2em] text-[var(--color-text-mute)]">
              output.json
            </span>
            <AnimatePresence>
              {phase === "done" && (
                <motion.span
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="inline-flex items-center gap-1 rounded-full bg-[#4ade8022] px-2 py-0.5 text-[10px] text-[#4ade80]"
                >
                  <Check size={11} /> structuré
                </motion.span>
              )}
            </AnimatePresence>
          </div>
          <div className="space-y-1.5">
            {RESULT_ROWS.slice(0, rows).map((row) => (
              <motion.div
                key={row.field}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="flex items-center justify-between rounded-lg border border-[var(--color-line)] bg-[var(--color-surface)] px-3 py-2 font-[family-name:var(--font-mono)] text-[11px]"
              >
                <span className="text-[var(--color-accent-2)]">
                  &quot;{row.field}&quot;
                </span>
                <span className="flex items-center gap-2">
                  <span className="text-[var(--color-text)]">{row.value}</span>
                  <span className="rounded bg-[var(--color-surface-strong)] px-1.5 py-0.5 text-[9px] text-[var(--color-text-mute)]">
                    {row.type}
                  </span>
                </span>
              </motion.div>
            ))}
            {rows === 0 && (
              <div className="grid h-40 place-items-center text-center font-[family-name:var(--font-mono)] text-[11px] text-[var(--color-text-mute)]">
                {"{ }"} en attente de données…
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
