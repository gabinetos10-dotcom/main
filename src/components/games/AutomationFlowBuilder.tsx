"use client";

import { AnimatePresence, motion } from "framer-motion";
import { FileInput, Bot, Database, Zap, RotateCcw, MousePointer2 } from "lucide-react";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

type Pt = { x: number; y: number };
type LinkId = "a" | "b"; // a: node0→node1, b: node1→node2

const NODES = [
  { id: 0, label: "Formulaire client", sub: "Typeform · trigger", icon: FileInput, hue: "#7b61ff" },
  { id: 1, label: "IA Webhook", sub: "GPT · enrichissement", icon: Bot, hue: "#2de2e6" },
  { id: 2, label: "CRM Notion", sub: "Base · destination", icon: Database, hue: "#c4b5fd" },
];

export function AutomationFlowBuilder() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const outRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const inRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const [pts, setPts] = useState<Record<string, Pt>>({});
  const [links, setLinks] = useState<Record<LinkId, boolean>>({ a: false, b: false });
  const [armed, setArmed] = useState<LinkId | null>(null);
  const [drag, setDrag] = useState<{ from: LinkId; pt: Pt } | null>(null);
  const [boost, setBoost] = useState(0);

  const done = links.a && links.b;

  // Measure handle centres relative to the wrapper.
  const measure = useCallback(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const wr = wrap.getBoundingClientRect();
    const center = (el: HTMLElement | null): Pt | null => {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { x: r.left + r.width / 2 - wr.left, y: r.top + r.height / 2 - wr.top };
    };
    const next: Record<string, Pt> = {};
    const o0 = center(outRefs.current[0]);
    const i1 = center(inRefs.current[1]);
    const o1 = center(outRefs.current[1]);
    const i2 = center(inRefs.current[2]);
    if (o0) next.o0 = o0;
    if (i1) next.i1 = i1;
    if (o1) next.o1 = o1;
    if (i2) next.i2 = i2;
    setPts(next);
  }, []);

  useLayoutEffect(() => {
    measure();
    const ro = new ResizeObserver(measure);
    if (wrapRef.current) ro.observe(wrapRef.current);
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [measure]);

  // Success counter.
  useEffect(() => {
    if (!done) {
      setBoost(0);
      return;
    }
    let raf = 0;
    let start: number | null = null;
    const tick = (t: number) => {
      if (start === null) start = t;
      const p = Math.min((t - start) / 1100, 1);
      setBoost(Math.round((1 - Math.pow(1 - p, 3)) * 85));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [done]);

  const connect = (id: LinkId) => {
    setLinks((l) => ({ ...l, [id]: true }));
    setArmed(null);
  };

  const relPoint = (e: PointerEvent | React.PointerEvent): Pt => {
    const wr = wrapRef.current!.getBoundingClientRect();
    return { x: e.clientX - wr.left, y: e.clientY - wr.top };
  };

  const hitInput = (idx: number, clientX: number, clientY: number) => {
    const el = inRefs.current[idx];
    if (!el) return false;
    const r = el.getBoundingClientRect();
    const pad = 16;
    return (
      clientX >= r.left - pad &&
      clientX <= r.right + pad &&
      clientY >= r.top - pad &&
      clientY <= r.bottom + pad
    );
  };

  const startDrag = (from: LinkId) => (e: React.PointerEvent) => {
    e.preventDefault();
    if ((from === "a" && links.a) || (from === "b" && links.b)) return;
    setArmed(from);
    setDrag({ from, pt: relPoint(e) });
    let moved = false;

    const move = (ev: PointerEvent) => {
      moved = true;
      setDrag({ from, pt: relPoint(ev) });
    };
    const up = (ev: PointerEvent) => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      setDrag(null);
      const targetIdx = from === "a" ? 1 : 2;
      if (moved && hitInput(targetIdx, ev.clientX, ev.clientY)) {
        connect(from);
        setArmed(null);
      }
      // if it was a tap (not moved) we keep `armed` for click‑to‑connect
      if (moved) setArmed(null);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  const clickInput = (idx: number) => () => {
    if (armed === "a" && idx === 1) connect("a");
    else if (armed === "b" && idx === 2) connect("b");
  };

  return (
    <div className="border-gradient glass flex h-full flex-col overflow-hidden rounded-[var(--radius-lg)] p-5 sm:p-7">
      <div className="mb-1 flex items-center justify-between">
        <span className="inline-flex items-center gap-2 font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-[0.2em] text-[var(--color-text-mute)]">
          <Zap size={13} className="text-[var(--color-accent-2)]" /> flow‑builder
        </span>
        {(links.a || links.b) && (
          <button
            onClick={() => {
              setLinks({ a: false, b: false });
              setArmed(null);
            }}
            className="inline-flex items-center gap-1 text-[11px] text-[var(--color-text-mute)] transition-colors hover:text-[var(--color-text)]"
          >
            <RotateCcw size={12} /> reset
          </button>
        )}
      </div>

      <p className="mb-4 text-sm text-[var(--color-text-dim)]">
        Reliez les nœuds dans l'ordre — glissez depuis un point{" "}
        <span className="text-[var(--color-accent-2)]">◉</span> vers l'entrée suivante.
      </p>

      {/* Canvas */}
      <div
        ref={wrapRef}
        className="relative flex flex-1 touch-none select-none flex-col items-stretch justify-between gap-6 py-2 md:flex-row md:items-center md:gap-2"
      >
        {/* Wires */}
        <svg className="pointer-events-none absolute inset-0 h-full w-full overflow-visible">
          <defs>
            <linearGradient id="wire" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#7b61ff" />
              <stop offset="100%" stopColor="#2de2e6" />
            </linearGradient>
          </defs>
          {links.a && pts.o0 && pts.i1 && <Wire from={pts.o0} to={pts.i1} />}
          {links.b && pts.o1 && pts.i2 && <Wire from={pts.o1} to={pts.i2} />}
          {drag && (
            <path
              d={bezier(
                drag.from === "a" ? pts.o0 : pts.o1,
                drag.pt
              )}
              stroke="url(#wire)"
              strokeWidth={2}
              strokeDasharray="4 5"
              fill="none"
              opacity={0.7}
            />
          )}
        </svg>

        {NODES.map((node, idx) => {
          const Icon = node.icon;
          const isConnectedIn = (idx === 1 && links.a) || (idx === 2 && links.b);
          const isConnectedOut = (idx === 0 && links.a) || (idx === 1 && links.b);
          return (
            <div
              key={node.id}
              className={`relative z-10 flex-1 rounded-2xl border bg-[var(--color-surface)] p-4 backdrop-blur-md transition-all duration-500 ${
                done
                  ? "border-[var(--color-accent-2)]/40 shadow-[0_0_30px_-8px_var(--color-accent)]"
                  : "border-[var(--color-line)]"
              }`}
            >
              {/* input port (not on first node) */}
              {idx > 0 && (
                <button
                  ref={(el) => {
                    inRefs.current[idx] = el;
                  }}
                  onClick={clickInput(idx)}
                  aria-label={`Entrée ${node.label}`}
                  className={`absolute left-1/2 top-0 z-20 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 transition-all md:left-0 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2 ${
                    isConnectedIn
                      ? "border-[var(--color-accent-2)] bg-[var(--color-accent-2)]"
                      : armed && ((armed === "a" && idx === 1) || (armed === "b" && idx === 2))
                        ? "animate-pulse border-[var(--color-accent-2)] bg-[var(--color-bg)]"
                        : "border-[var(--color-line-strong)] bg-[var(--color-bg)]"
                  }`}
                />
              )}
              {/* output port (not on last node) */}
              {idx < 2 && (
                <button
                  ref={(el) => {
                    outRefs.current[idx] = el;
                  }}
                  onPointerDown={startDrag(idx === 0 ? "a" : "b")}
                  aria-label={`Sortie ${node.label}`}
                  className={`absolute bottom-0 left-1/2 z-20 h-4 w-4 -translate-x-1/2 translate-y-1/2 cursor-grab rounded-full border-2 transition-all active:cursor-grabbing md:bottom-auto md:left-full md:top-1/2 md:-translate-y-1/2 ${
                    isConnectedOut
                      ? "border-[var(--color-accent)] bg-[var(--color-accent)]"
                      : "border-[var(--color-accent)] bg-[var(--color-bg)] hover:scale-125"
                  }`}
                />
              )}

              <div
                className="grid h-10 w-10 place-items-center rounded-xl"
                style={{ background: `${node.hue}18` }}
              >
                <Icon size={18} style={{ color: node.hue }} />
              </div>
              <p className="mt-3 text-sm font-medium text-[var(--color-text)]">{node.label}</p>
              <p className="font-[family-name:var(--font-mono)] text-[10px] text-[var(--color-text-mute)]">
                {node.sub}
              </p>
            </div>
          );
        })}
      </div>

      {/* Result */}
      <div className="mt-4 h-14">
        <AnimatePresence mode="wait">
          {done ? (
            <motion.div
              key="done"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex items-center justify-between rounded-2xl border border-[var(--color-accent-2)]/30 bg-[linear-gradient(120deg,rgba(123,97,255,0.12),rgba(45,226,230,0.08))] px-4 py-3"
            >
              <span className="text-sm font-medium text-[var(--color-text)]">
                ⚡ Workflow optimisé
              </span>
              <span className="font-[family-name:var(--font-display)] text-2xl font-semibold text-accent-gradient tabular-nums">
                +{boost}%
              </span>
            </motion.div>
          ) : (
            <motion.div
              key="hint"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-2 rounded-2xl border border-dashed border-[var(--color-line)] px-4 py-3 text-xs text-[var(--color-text-mute)]"
            >
              <MousePointer2 size={13} />
              {links.a
                ? "Plus qu'un lien : IA Webhook → CRM Notion"
                : "Reliez Formulaire client → IA Webhook pour commencer"}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function bezier(from: Pt | undefined, to: Pt | undefined): string {
  if (!from || !to) return "";
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const horizontal = Math.abs(dx) >= Math.abs(dy);
  const c = Math.max(Math.abs(dx), Math.abs(dy)) * 0.5;
  const cp1 = horizontal ? { x: from.x + c, y: from.y } : { x: from.x, y: from.y + c };
  const cp2 = horizontal ? { x: to.x - c, y: to.y } : { x: to.x, y: to.y - c };
  return `M ${from.x} ${from.y} C ${cp1.x} ${cp1.y}, ${cp2.x} ${cp2.y}, ${to.x} ${to.y}`;
}

function Wire({ from, to }: { from: Pt; to: Pt }) {
  return (
    <motion.path
      d={bezier(from, to)}
      stroke="url(#wire)"
      strokeWidth={2.5}
      strokeLinecap="round"
      fill="none"
      strokeDasharray="1 10"
      initial={{ pathLength: 0, opacity: 0 }}
      animate={{ pathLength: 1, opacity: 1, strokeDashoffset: [0, -22] }}
      transition={{
        pathLength: { duration: 0.5 },
        opacity: { duration: 0.3 },
        strokeDashoffset: { duration: 1, repeat: Infinity, ease: "linear" },
      }}
    />
  );
}
