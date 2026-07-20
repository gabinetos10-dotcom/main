"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Section, SectionHeading } from "@/components/ui/Section";
import Button from "@/components/ui/Button";
import { burst } from "@/lib/confetti";
import {
  moodSteps,
  generateMoodboard,
  moodColors,
  type MoodSelection,
  type MoodOption,
  type MoodStepKey,
  type MoodMotif,
} from "@/lib/moodboard";

const EASE = [0.22, 1, 0.36, 1] as const;

const DEFAULT_MOOD: [string, string, string] = [
  "var(--blush)",
  "var(--soleil)",
  "var(--sauge)",
];

export default function MoodboardGame() {
  const [selection, setSelection] = useState<MoodSelection>({});
  const [stepIndex, setStepIndex] = useState(0);
  const [generated, setGenerated] = useState(false);
  const previewRef = useRef<HTMLDivElement | null>(null);

  const step = moodSteps[stepIndex];
  const activeColors = useMemo(() => moodColors(selection), [selection]);
  const completed = Object.keys(selection).length;

  // Applique la palette choisie AU SITE ENTIER (le fond réagit en direct).
  const applyMood = useCallback((colors: [string, string, string]) => {
    const root = document.documentElement.style;
    root.setProperty("--mood-1", colors[0]);
    root.setProperty("--mood-2", colors[1]);
    root.setProperty("--mood-3", colors[2]);
  }, []);

  const resetMood = useCallback(() => applyMood(DEFAULT_MOOD), [applyMood]);

  const choose = (key: MoodStepKey, option: MoodOption) => {
    const next = { ...selection, [key]: option };
    setSelection(next);
    if (option.colors) applyMood(option.colors);
    else applyMood(moodColors(next));
    // Avance en douceur vers l'étape suivante.
    if (stepIndex < moodSteps.length - 1) {
      window.setTimeout(() => setStepIndex((i) => Math.min(i + 1, moodSteps.length - 1)), 320);
    }
  };

  const generate = () => {
    applyMood(activeColors);
    setGenerated(true);
    const el = previewRef.current;
    if (el) {
      const r = el.getBoundingClientRect();
      burst(r.left + r.width / 2, r.top + r.height / 2, { count: 46, power: 12 });
    }
  };

  const restart = () => {
    setSelection({});
    setStepIndex(0);
    setGenerated(false);
    resetMood();
  };

  const result = useMemo(() => generateMoodboard(selection), [selection]);
  const allChosen = completed >= moodSteps.length;

  // Message pré-rempli pour le formulaire de contact (capture du lead).
  const contactHref = useMemo(() => {
    const parts = moodSteps
      .map((s) => selection[s.key]?.label)
      .filter(Boolean)
      .join(" · ");
    const msg = `Bonjour Mélina, j'ai composé mon univers sur votre site : « ${result.styleName} » (${parts}). J'aimerais qu'on en parle !`;
    const prestation = "Wedding Designer (décoration)";
    const params = new URLSearchParams({ style: result.styleName, message: msg, prestation });
    return `/contact?${params.toString()}`;
  }, [selection, result.styleName]);

  return (
    <Section id="univers" className="overflow-hidden">
      <SectionHeading
        align="center"
        kicker="Le petit jeu"
        title={
          <>
            Composez <em className="italic text-sunwash">votre univers</em>.
          </>
        }
        intro="Choisissez, et regardez le décor s'accorder à votre goût en temps réel — une manière ludique de découvrir mon regard de designer. À la fin, votre moodboard vous attend."
      />

      <div className="mx-auto mt-14 grid max-w-6xl grid-cols-1 gap-8 lg:grid-cols-[1fr_1.05fr]">
        {/* Colonne interaction */}
        <div className="order-2 lg:order-1">
          <AnimatePresence mode="wait">
            {!generated ? (
              <motion.div
                key={`step-${stepIndex}`}
                initial={{ opacity: 0, x: 24, filter: "blur(6px)" }}
                animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
                exit={{ opacity: 0, x: -24, filter: "blur(6px)" }}
                transition={{ duration: 0.4, ease: EASE }}
              >
                {/* Progression */}
                <div className="mb-6 flex items-center gap-2">
                  {moodSteps.map((s, i) => (
                    <button
                      key={s.key}
                      onClick={() => i <= completed && setStepIndex(i)}
                      disabled={i > completed}
                      aria-label={`Étape ${i + 1} : ${s.title}`}
                      className={`h-1.5 rounded-full transition-all duration-500 ${
                        i === stepIndex
                          ? "w-8 bg-terracotta"
                          : selection[s.key]
                            ? "w-4 bg-terracotta/50"
                            : "w-4 bg-prune/15"
                      }`}
                    />
                  ))}
                </div>

                <p className="script-accent text-2xl text-terracotta">{step.title}</p>
                <h3 className="mt-1 font-serif text-2xl font-light text-prune">{step.question}</h3>

                <div
                  role="listbox"
                  aria-label={step.question}
                  className="mt-6 grid grid-cols-2 gap-3"
                >
                  {step.options.map((option) => {
                    const active = selection[step.key]?.id === option.id;
                    return (
                      <button
                        key={option.id}
                        role="option"
                        aria-selected={active}
                        onClick={() => choose(step.key, option)}
                        className={`group relative overflow-hidden rounded-2xl border p-4 text-left transition-all duration-300 ${
                          active
                            ? "border-terracotta bg-ivoire shadow-bloom"
                            : "border-or/20 bg-ivoire/70 hover:border-or/50 hover:shadow-blush"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          {option.colors ? (
                            <span className="flex -space-x-1.5">
                              {option.colors.map((c, i) => (
                                <span
                                  key={i}
                                  className="h-6 w-6 rounded-full border-2 border-ivoire"
                                  style={{ background: c }}
                                />
                              ))}
                            </span>
                          ) : (
                            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-blush/40 text-terracotta">
                              <MotifIcon motif={option.motif} />
                            </span>
                          )}
                          <span className="font-serif text-lg text-prune">{option.label}</span>
                        </div>
                        <p className="mt-2 text-xs text-prune/55">{option.hint}</p>
                      </button>
                    );
                  })}
                </div>

                <div className="mt-6 flex items-center justify-between">
                  <button
                    onClick={() => setStepIndex((i) => Math.max(0, i - 1))}
                    disabled={stepIndex === 0}
                    className="text-sm text-prune/60 underline disabled:opacity-30"
                  >
                    Précédent
                  </button>
                  {allChosen ? (
                    <Button onClick={generate} className="px-6">
                      Révéler mon moodboard ✿
                    </Button>
                  ) : (
                    <button
                      onClick={() => completed > stepIndex && setStepIndex((i) => Math.min(moodSteps.length - 1, i + 1))}
                      disabled={!selection[step.key]}
                      className="text-sm font-semibold text-terracotta underline disabled:opacity-30"
                    >
                      Suivant
                    </button>
                  )}
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="result"
                initial={{ opacity: 0, y: 24, filter: "blur(6px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                transition={{ duration: 0.6, ease: EASE }}
              >
                <p className="kicker">Votre univers</p>
                <h3 className="mt-2 font-serif text-4xl font-light text-prune">
                  {result.styleName}
                </h3>
                {/* Texte signé Mélina — [À VALIDER] */}
                <p className="mt-4 text-base leading-relaxed text-prune/75 text-pretty">
                  {result.text}
                </p>
                <p className="script-accent mt-3 text-3xl text-terracotta">{result.signature}</p>

                <div className="mt-7 flex flex-wrap items-center gap-3">
                  <Button href={contactHref} confettiOnHover>
                    Recevez votre moodboard &amp; parlons-en
                  </Button>
                  <button onClick={restart} className="text-sm text-prune/60 underline">
                    Recommencer
                  </button>
                  <ShareButton styleName={result.styleName} />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Colonne aperçu — le moodboard qui se recompose en direct */}
        <div className="order-1 lg:order-2">
          <div
            ref={previewRef}
            className="invitation-card relative aspect-[4/5] overflow-hidden p-3 sm:aspect-[5/5]"
          >
            <MoodboardPreview colors={activeColors} selection={selection} styleName={generated ? result.styleName : undefined} />
          </div>
        </div>
      </div>
    </Section>
  );
}

/** Aperçu vivant : dégradé + pétales + swatches + motifs choisis. */
function MoodboardPreview({
  colors,
  selection,
  styleName,
}: {
  colors: [string, string, string];
  selection: MoodSelection;
  styleName?: string;
}) {
  const [c1, c2, c3] = colors;
  return (
    <div className="relative h-full w-full overflow-hidden rounded-[1.4rem]">
      {/* Champ de dégradé animé */}
      <motion.div
        key={colors.join()}
        initial={{ opacity: 0.6 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, ease: EASE }}
        className="absolute inset-0"
        style={{
          background: `radial-gradient(120% 100% at 20% 10%, color-mix(in oklab, ${c2} 75%, var(--ivoire)), transparent 60%), radial-gradient(120% 120% at 90% 90%, color-mix(in oklab, ${c1} 75%, var(--creme)), transparent 55%), linear-gradient(160deg, color-mix(in oklab, ${c3} 40%, var(--creme)), var(--ivoire))`,
        }}
      />

      {/* Pétales flottants dans les teintes choisies */}
      {Array.from({ length: 9 }).map((_, i) => (
        <span
          key={i}
          className="absolute rounded-full blur-[1px] animate-float-slow"
          style={{
            width: `${10 + (i % 3) * 8}px`,
            height: `${10 + (i % 3) * 8}px`,
            top: `${(i * 37) % 90}%`,
            left: `${(i * 53) % 90}%`,
            background: [c1, c2, c3][i % 3],
            opacity: 0.5,
            animationDelay: `${i * 0.4}s`,
          }}
        />
      ))}

      {/* Swatches */}
      <div className="absolute right-4 top-4 flex flex-col gap-1.5">
        {colors.map((c, i) => (
          <motion.span
            key={i}
            layout
            className="h-8 w-8 rounded-full border-2 border-ivoire shadow-sm"
            style={{ background: c }}
          />
        ))}
      </div>

      {/* Motifs choisis */}
      <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between">
        <div className="flex flex-col gap-1">
          {selection.fleurs && <Tag icon={<MotifIcon motif={selection.fleurs.motif} />} label={selection.fleurs.label} />}
          {selection.lieu && <Tag icon={<MotifIcon motif={selection.lieu.motif} />} label={selection.lieu.label} />}
          {selection.papeterie && <Tag icon={<MotifIcon motif={selection.papeterie.motif} />} label={selection.papeterie.label} />}
        </div>
        {styleName ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="rounded-2xl bg-ivoire/85 px-4 py-2 text-right backdrop-blur"
          >
            <span className="block text-[0.6rem] uppercase tracking-kicker text-terracotta">Votre style</span>
            <span className="font-serif text-lg text-prune">{styleName}</span>
          </motion.div>
        ) : (
          <span className="script-accent text-2xl text-prune/50">à composer…</span>
        )}
      </div>
    </div>
  );
}

function Tag({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-ivoire/80 px-2.5 py-1 text-xs text-prune backdrop-blur">
      <span className="text-terracotta">{icon}</span>
      {label}
    </span>
  );
}

function ShareButton({ styleName }: { styleName: string }) {
  const [done, setDone] = useState(false);
  const share = async () => {
    const text = `Mon univers de mariage selon Maison Jolie : « ${styleName} » ✿`;
    try {
      if (navigator.share) {
        await navigator.share({ title: "Maison Jolie Wedding", text });
      } else {
        await navigator.clipboard.writeText(text);
        setDone(true);
        window.setTimeout(() => setDone(false), 2000);
      }
    } catch {
      /* annulé */
    }
  };
  return (
    <button onClick={share} className="text-sm text-prune/60 underline">
      {done ? "Copié ✓" : "Partager"}
    </button>
  );
}

/** Petits motifs illustrés (fleurs / lieux / papeterie). */
function MotifIcon({ motif }: { motif?: MoodMotif }) {
  const p = { fill: "none", stroke: "currentColor", strokeWidth: 1.4, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  switch (motif) {
    case "olivier":
      return (
        <svg viewBox="0 0 24 24" className="h-4 w-4"><path d="M4 20c6-2 10-8 16-16" {...p} /><path d="M9 12c2 .5 4-1 4-3M14 9c1.5 1.5 4 1 5-.5" {...p} /></svg>
      );
    case "pampa":
      return (
        <svg viewBox="0 0 24 24" className="h-4 w-4"><path d="M12 21V6" {...p} /><path d="M12 8c-2-2-5-2-7-4M12 8c2-2 5-2 7-4M12 12c-2-1-4-1-6-2M12 12c2-1 4-1 6-2" {...p} /></svg>
      );
    case "rose":
      return (
        <svg viewBox="0 0 24 24" className="h-4 w-4"><circle cx="12" cy="10" r="4" {...p} /><path d="M12 14v6M9 8c1-2 5-2 6 0" {...p} /></svg>
      );
    case "saison":
      return (
        <svg viewBox="0 0 24 24" className="h-4 w-4"><circle cx="12" cy="12" r="2.2" {...p} />{[0, 72, 144, 216, 288].map((a) => { const r = (a * Math.PI) / 180; return <ellipse key={a} cx={12 + Math.cos(r) * 5} cy={12 + Math.sin(r) * 5} rx="2.4" ry="1.3" transform={`rotate(${a} ${12 + Math.cos(r) * 5} ${12 + Math.sin(r) * 5})`} {...p} />; })}</svg>
      );
    case "domaine":
      return <svg viewBox="0 0 24 24" className="h-4 w-4"><path d="M4 20V10l8-5 8 5v10M9 20v-5h6v5" {...p} /></svg>;
    case "mas":
      return <svg viewBox="0 0 24 24" className="h-4 w-4"><path d="M4 20V11l8-6 8 6v9zM10 20v-6h4v6" {...p} /></svg>;
    case "mer":
      return <svg viewBox="0 0 24 24" className="h-4 w-4"><path d="M3 16c2 0 2 1.5 4.5 1.5S10 16 12 16s2 1.5 4.5 1.5S19 16 21 16M3 12c2 0 2 1.5 4.5 1.5S10 12 12 12" {...p} /><circle cx="17" cy="7" r="2.4" {...p} /></svg>;
    case "orangerie":
      return <svg viewBox="0 0 24 24" className="h-4 w-4"><rect x="5" y="4" width="14" height="16" rx="7" {...p} /><path d="M12 4v16M5 12h14" {...p} /></svg>;
    case "sceau":
      return <svg viewBox="0 0 24 24" className="h-4 w-4"><circle cx="12" cy="12" r="6" {...p} /><path d="M12 8v8M9 10l6 4M15 10l-6 4" {...p} /></svg>;
    case "calligraphie":
      return <svg viewBox="0 0 24 24" className="h-4 w-4"><path d="M4 18c4-1 6-8 9-12M8 16c3-1 6-1 9 1" {...p} /></svg>;
    case "ruban":
      return <svg viewBox="0 0 24 24" className="h-4 w-4"><path d="M4 8c4 4 12 4 16 0M4 16c4-4 12-4 16 0" {...p} /></svg>;
    case "calque":
      return <svg viewBox="0 0 24 24" className="h-4 w-4"><rect x="5" y="5" width="12" height="12" rx="2" {...p} /><rect x="9" y="9" width="10" height="10" rx="2" {...p} /></svg>;
    default:
      return <svg viewBox="0 0 24 24" className="h-4 w-4"><circle cx="12" cy="12" r="6" {...p} /></svg>;
  }
}
