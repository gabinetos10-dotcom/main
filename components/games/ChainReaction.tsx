"use client";

import { motion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { GameEnd, GameIntro, type GameProps } from "./ui";

/**
 * CHAÎNE DE RÉACTION — illustre l'automatisation GJS.
 * Reconstituez le workflow dans l'ordre logique, puis regardez la
 * cascade s'exécuter. 3 manches, de plus en plus longues.
 */

type Kind = "Déclencheur" | "Filtre" | "Action" | "Sortie";

interface Node {
  kind: Kind;
  label: string;
}

const ROUNDS: Node[][] = [
  [
    { kind: "Déclencheur", label: "Nouvelle commande reçue" },
    { kind: "Filtre", label: "Montant > 100 €" },
    { kind: "Action", label: "Générer la facture PDF" },
    { kind: "Sortie", label: "Notifier l'équipe sur Slack" },
  ],
  [
    { kind: "Déclencheur", label: "Formulaire complété" },
    { kind: "Action", label: "Enrichir le contact" },
    { kind: "Filtre", label: "Score prospect > 50" },
    { kind: "Action", label: "Créer la fiche CRM" },
    { kind: "Sortie", label: "Lancer la séquence e-mail" },
  ],
  [
    { kind: "Déclencheur", label: "Prix concurrent détecté" },
    { kind: "Action", label: "Comparer à la marge cible" },
    { kind: "Filtre", label: "Écart > 5 %" },
    { kind: "Action", label: "Recalculer le prix" },
    { kind: "Action", label: "Mettre à jour la boutique" },
    { kind: "Sortie", label: "Consigner au rapport hebdo" },
  ],
];

const KIND_STYLE: Record<Kind, string> = {
  Déclencheur: "text-mindaro border-mindaro/40",
  Filtre: "text-air border-air/50",
  Action: "text-sage border-sage/40",
  Sortie: "text-cambridge border-cambridge/40",
};

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

export default function ChainReaction({ onExit }: GameProps) {
  const [phase, setPhase] = useState<"intro" | "run" | "cascade" | "end">("intro");
  const [round, setRound] = useState(0);
  const [nextIdx, setNextIdx] = useState(0); // prochaine étape attendue
  const [placed, setPlaced] = useState<number[]>([]); // index (dans l'ordre mélangé) déjà validés
  const [wrongIdx, setWrongIdx] = useState<number | null>(null);
  const [cascadeIdx, setCascadeIdx] = useState(-1);
  const [errors, setErrors] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [seed, setSeed] = useState(0); // force un nouveau mélange au replay
  const startRef = useRef(0);

  const nodes = ROUNDS[round]!;
  const shuffled = useMemo(
    () => shuffle(nodes.map((_, i) => i)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [round, seed]
  );

  /* Chronomètre */
  useEffect(() => {
    if (phase !== "run" && phase !== "cascade") return;
    const id = setInterval(() => setElapsed((performance.now() - startRef.current) / 1000), 200);
    return () => clearInterval(id);
  }, [phase]);

  /* Cascade d'exécution après une manche complétée */
  useEffect(() => {
    if (phase !== "cascade") return;
    setCascadeIdx(-1);
    let i = 0;
    const id = setInterval(() => {
      setCascadeIdx(i);
      i++;
      if (i > nodes.length) {
        clearInterval(id);
        setTimeout(() => {
          if (round < ROUNDS.length - 1) {
            setRound((r) => r + 1);
            setNextIdx(0);
            setPlaced([]);
            setCascadeIdx(-1);
            setPhase("run");
          } else {
            setPhase("end");
          }
        }, 550);
      }
    }, 300);
    return () => clearInterval(id);
  }, [phase, nodes.length, round]);

  const start = () => {
    setRound(0);
    setNextIdx(0);
    setPlaced([]);
    setErrors(0);
    setElapsed(0);
    setCascadeIdx(-1);
    setSeed((s) => s + 1);
    startRef.current = performance.now();
    setPhase("run");
  };

  const tap = (shuffledPos: number) => {
    if (phase !== "run") return;
    const originalIdx = shuffled[shuffledPos]!;
    if (placed.includes(shuffledPos)) return;
    if (originalIdx === nextIdx) {
      const newPlaced = [...placed, shuffledPos];
      setPlaced(newPlaced);
      setNextIdx(nextIdx + 1);
      if (newPlaced.length === nodes.length) setPhase("cascade");
    } else {
      setErrors((e) => e + 1);
      setWrongIdx(shuffledPos);
      setTimeout(() => setWrongIdx(null), 450);
    }
  };

  if (phase === "intro")
    return (
      <GameIntro
        title="Chaîne de réaction"
        rules={[
          "▸ Touchez les blocs dans l'ordre logique du workflow :",
          "▸ Déclencheur → conditions → actions → sortie.",
          "▸ 3 manches, de plus en plus longues.",
          "▸ Chaque erreur coûte des points. Le chrono tourne.",
        ]}
        cta="Câbler"
        onStart={start}
      />
    );

  if (phase === "end") {
    const score = Math.max(100, Math.round(1000 - elapsed * 12 - errors * 40));
    return (
      <GameEnd
        score={String(score)}
        rank={score >= 800 ? "Architecte de flux" : score >= 550 ? "Automaticien·ne confirmé·e" : "Apprenti·e plombier·ère de données"}
        extra={
          <p className="font-mono text-xs text-cambridge">
            {elapsed.toFixed(1)} s · {errors} erreur{errors > 1 ? "s" : ""}
          </p>
        }
        pitch="Chaque workflow bien câblé, ce sont des heures rendues à votre équipe. Nous branchons vos outils pour que tout se déclenche tout seul — la nuit comme le lundi matin."
        onReplay={start}
        onExit={onExit}
      />
    );
  }

  return (
    <div className="min-h-[380px]">
      {/* Barre d'état */}
      <div className="mb-4 flex items-center justify-between font-mono text-[11px] uppercase tracking-[0.18em] text-cambridge">
        <span>
          Manche <span className="text-mindaro">{round + 1}</span>/{ROUNDS.length}
        </span>
        <span className="flex items-center gap-4">
          <span>{elapsed.toFixed(1)} s</span>
          <span>
            err <span className={errors > 0 ? "text-alert" : ""}>{errors}</span>
          </span>
        </span>
      </div>

      {/* Légende */}
      <div className="mb-5 flex flex-wrap gap-2">
        {(Object.keys(KIND_STYLE) as Kind[]).map((k) => (
          <span key={k} className={cn("rounded-full border px-2.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.14em]", KIND_STYLE[k])}>
            {k}
          </span>
        ))}
      </div>

      {/* Blocs */}
      <div className="grid gap-3 sm:grid-cols-2">
        {shuffled.map((originalIdx, pos) => {
          const node = nodes[originalIdx]!;
          const done = placed.includes(pos);
          const step = done ? placed.indexOf(pos) : -1;
          const firing = phase === "cascade" && step > -1 && step <= cascadeIdx;
          return (
            <motion.button
              key={`${round}-${seed}-${pos}`}
              onClick={() => tap(pos)}
              animate={wrongIdx === pos ? { x: [0, -7, 7, -4, 4, 0] } : firing ? { scale: [1, 1.06, 1] } : {}}
              transition={{ duration: 0.4 }}
              disabled={done && phase === "run"}
              className={cn(
                "relative min-h-[64px] rounded-xl border p-3.5 text-left transition-colors duration-300",
                done
                  ? firing
                    ? "border-mindaro bg-mindaro/15 shadow-glow-sm"
                    : "border-sage/60 bg-sage/10"
                  : "border-mist/12 bg-deep/50 hover:border-mist/30",
                wrongIdx === pos && "border-alert/70"
              )}
            >
              <span className={cn("font-mono text-[9px] uppercase tracking-[0.16em]", KIND_STYLE[node.kind].split(" ")[0])}>
                {node.kind}
              </span>
              <span className="mt-1 block text-sm font-medium text-mist">{node.label}</span>
              {done && (
                <span
                  className={cn(
                    "absolute right-3 top-3 grid h-6 w-6 place-items-center rounded-full font-mono text-[10px]",
                    firing ? "bg-mindaro text-ink" : "bg-sage/25 text-sage"
                  )}
                >
                  {step + 1}
                </span>
              )}
            </motion.button>
          );
        })}
      </div>

      <p className="mt-5 text-center font-mono text-[10px] uppercase tracking-[0.2em] text-cambridge/60">
        {phase === "cascade" ? "▶ exécution du workflow…" : `étape attendue : ${nextIdx + 1}/${nodes.length}`}
      </p>
    </div>
  );
}
