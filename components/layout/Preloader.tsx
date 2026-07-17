"use client";

import { useEffect, useRef, useState } from "react";
import { gsap, useGSAP, EASE, EASE_IO } from "@/lib/gsap";
import { useApp, useLenisApi } from "@/components/providers/AppContext";
import { cn } from "@/lib/utils";

/**
 * Écran de chargement « gjs build » — la progression est RÉELLE :
 *   12 % au boot + 25 % polices + 25 % window.load + 38 % scène 3D prête.
 * Un garde-fou (6,5 s) force la sortie quoi qu'il arrive.
 * 2ᵉ visite dans le même onglet ou motion réduite → passage direct.
 * La sortie (lettres qui filent, rideau qui se lève) enchaîne sur
 * l'intro du hero : le loader « devient » le site.
 */
const BOOT_LINES = [
  { at: 3, text: "$ gjs build --agence --prod", accent: true },
  { at: 22, text: "▸ polices chargées …………… OK" },
  { at: 46, text: "▸ scène 3D compilée ………… OK" },
  { at: 70, text: "▸ interface hydratée ……… OK" },
  { at: 97, text: "▸ déploiement ……………… EN LIGNE" },
];

export function Preloader() {
  const { finishPreloader, sceneReady } = useApp();
  const { lock, unlock } = useLenisApi();
  const [mode, setMode] = useState<"pending" | "full" | "skip">("pending");
  const [visible, setVisible] = useState(true);
  const [progress, setProgress] = useState(0);
  const [fontsOk, setFontsOk] = useState(false);
  const [loadOk, setLoadOk] = useState(false);
  const [forced, setForced] = useState(false);

  const rootRef = useRef<HTMLDivElement>(null);
  const lettersRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const tweenObj = useRef({ v: 0 });
  const exited = useRef(false);
  const locked = useRef(false);

  /* Décision : plein écran ou skip (repeat visit / motion réduite) */
  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const visited = sessionStorage.getItem("gjs-visited") === "1";
    setMode(visited || reduced ? "skip" : "full");
  }, []);

  /* Skip : on libère tout immédiatement */
  useEffect(() => {
    if (mode !== "skip") return;
    sessionStorage.setItem("gjs-visited", "1");
    finishPreloader();
    setVisible(false);
  }, [mode, finishPreloader]);

  /* Full : verrou scroll + collecte des signaux réels */
  useEffect(() => {
    if (mode !== "full") return;
    lock();
    locked.current = true;

    document.fonts.ready.then(() => setFontsOk(true));

    if (document.readyState === "complete") setLoadOk(true);
    else {
      const onLoad = () => setLoadOk(true);
      window.addEventListener("load", onLoad, { once: true });
      return () => window.removeEventListener("load", onLoad);
    }
  }, [mode, lock]);

  /* Garde-fou : jamais plus de 6,5 s d'attente */
  useEffect(() => {
    if (mode !== "full") return;
    const t = setTimeout(() => setForced(true), 6500);
    return () => clearTimeout(t);
  }, [mode]);

  /* Progression tweenée vers la cible réelle */
  useEffect(() => {
    if (mode !== "full") return;
    const target = forced
      ? 100
      : Math.min(100, 12 + (fontsOk ? 25 : 0) + (loadOk ? 25 : 0) + (sceneReady ? 38 : 0));
    const tween = gsap.to(tweenObj.current, {
      v: target,
      duration: 0.9,
      ease: "power2.out",
      onUpdate: () => setProgress(Math.round(tweenObj.current.v)),
    });
    return () => {
      tween.kill();
    };
  }, [mode, fontsOk, loadOk, sceneReady, forced]);

  /* Entrée des lettres G·J·S */
  useGSAP(
    () => {
      if (mode !== "full" || !lettersRef.current) return;
      gsap.from(lettersRef.current.children, {
        yPercent: 120,
        duration: 1.1,
        stagger: 0.09,
        ease: EASE,
        delay: 0.15,
      });
    },
    { dependencies: [mode] }
  );

  /* Sortie orchestrée quand on atteint 100 % */
  useEffect(() => {
    if (mode !== "full" || progress < 100 || exited.current) return;
    exited.current = true;
    const tl = gsap.timeline({
      delay: 0.25,
      onComplete: () => {
        sessionStorage.setItem("gjs-visited", "1");
        if (locked.current) {
          unlock();
          locked.current = false;
        }
        finishPreloader();
        setVisible(false);
      },
    });
    if (bottomRef.current) tl.to(bottomRef.current, { autoAlpha: 0, duration: 0.35 }, 0);
    if (lettersRef.current)
      tl.to(
        lettersRef.current.children,
        { yPercent: -130, duration: 0.7, stagger: 0.07, ease: EASE_IO },
        0.05
      );
    if (rootRef.current)
      tl.to(
        rootRef.current,
        { clipPath: "inset(0 0 100% 0)", duration: 0.85, ease: EASE_IO },
        0.38
      );
  }, [mode, progress, finishPreloader, unlock]);

  /* Sécurité : ne jamais laisser le scroll verrouillé */
  useEffect(
    () => () => {
      if (locked.current) unlock();
    },
    [unlock]
  );

  if (!visible || mode === "skip") return null;

  return (
    <div
      ref={rootRef}
      role="status"
      aria-label="Chargement du site GJS"
      className="fixed inset-0 z-[90] flex flex-col justify-between overflow-hidden bg-ink"
      style={{ clipPath: "inset(0 0 0% 0)" }}
    >
      {/* micro-détails haut */}
      <div className="container-gjs flex items-center justify-between pt-6 font-mono text-[10px] tracking-[0.25em] text-cambridge/60">
        <span>GJS — BOOTLOADER</span>
        <span className="hidden sm:block">FR · PARIS</span>
      </div>

      {/* Lettres centrales */}
      <div className="container-gjs flex items-center justify-center">
        <div ref={lettersRef} className="flex overflow-hidden font-display text-[clamp(5rem,24vw,15rem)] font-semibold leading-none tracking-tight text-mist">
          <span className="inline-block">G</span>
          <span className="inline-block">J</span>
          <span className="inline-block">
            S<span className="text-mindaro">.</span>
          </span>
        </div>
      </div>

      {/* Bas : logs + pourcentage + barre */}
      <div ref={bottomRef} className="container-gjs pb-8">
        <div className="flex items-end justify-between gap-6">
          <div className="min-h-[7.5rem] space-y-1.5 font-mono text-[11px] leading-relaxed tracking-wide sm:text-xs" aria-hidden>
            {BOOT_LINES.filter((l) => progress >= l.at).map((l) => (
              <p key={l.text} className={cn(l.accent ? "text-mist" : "text-cambridge")}>
                {l.text.includes("OK") || l.text.includes("EN LIGNE") ? (
                  <>
                    {l.text.split("…")[0]}
                    <span className="text-cambridge/40">{"…".repeat(3)}</span>
                    <span className="text-mindaro"> {l.text.includes("EN LIGNE") ? "EN LIGNE" : "OK"}</span>
                  </>
                ) : (
                  l.text
                )}
              </p>
            ))}
            <p className="text-cambridge/50">
              <span className="animate-blink">▮</span>
            </p>
          </div>
          <div className="text-right font-mono">
            <span className="text-[clamp(2.4rem,8vw,4.5rem)] font-medium leading-none text-mist">
              {String(progress).padStart(3, "0")}
            </span>
            <span className="text-mindaro">%</span>
          </div>
        </div>
        {/* Barre de progression */}
        <div className="mt-5 h-px w-full bg-mist/10">
          <div
            className="h-full origin-left bg-mindaro shadow-glow-sm transition-transform duration-300 ease-out"
            style={{ transform: `scaleX(${progress / 100})` }}
          />
        </div>
      </div>
    </div>
  );
}
