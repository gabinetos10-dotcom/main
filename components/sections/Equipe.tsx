import { TEAM } from "@/lib/content";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Reveal } from "@/components/ui/Reveal";

const AVATAR_GRADIENTS = [
  "linear-gradient(135deg, #1b4079 0%, #4d7c8a 100%)",
  "linear-gradient(135deg, #4d7c8a 0%, #8fad88 100%)",
  "linear-gradient(135deg, #8fad88 0%, #cbdf90 100%)",
];

/**
 * L'équipe : le panneau le plus chaleureux du site — surfaces adoucies,
 * avatars G·J·S en dégradés de la palette, valeurs, mini-timeline.
 */
export function Equipe() {
  return (
    <section id="equipe" data-section className="scroll-mt-24 py-28 lg:py-40">
      <div className="container-gjs">
        <div className="rounded-[2.5rem] border border-mist/8 bg-gradient-to-b from-deep/70 via-abyss/40 to-transparent p-6 sm:p-10 lg:p-16">
          <SectionHeading index="04" eyebrow={TEAM.eyebrow} title={TEAM.title} />

          <Reveal>
            <p className="mt-8 max-w-2xl text-lead text-cambridge">{TEAM.intro}</p>
          </Reveal>

          {/* Avatars stylisés G · J · S */}
          <div className="mt-14 grid gap-4 sm:grid-cols-3">
            {TEAM.members.map((m, i) => (
              <Reveal key={m.letter} delay={i * 0.1}>
                <div className="group h-full rounded-2xl border border-mist/8 bg-abyss/50 p-7 text-center transition-colors duration-500 hover:border-sage/35">
                  <div
                    className="mx-auto grid h-24 w-24 place-items-center rounded-full font-display text-4xl font-semibold text-ink shadow-glow-sm transition-transform duration-500 ease-(--ease-gjs) group-hover:scale-105 group-hover:rotate-3"
                    style={{ background: AVATAR_GRADIENTS[i] }}
                    aria-hidden
                  >
                    {m.letter}
                  </div>
                  <h3 className="mt-5 font-display text-xl font-semibold text-mist">{m.role}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-cambridge">{m.text}</p>
                  <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.2em] text-cambridge/50">{m.name}</p>
                </div>
              </Reveal>
            ))}
          </div>

          {/* Valeurs */}
          <div className="mt-16 grid gap-4 sm:grid-cols-2">
            {TEAM.values.map((v, i) => (
              <Reveal key={v.title} delay={i * 0.07}>
                <div className="group h-full rounded-2xl border border-mist/8 bg-abyss/40 p-6 transition-colors duration-500 hover:border-mindaro/25 lg:p-8">
                  <div className="flex items-baseline gap-3">
                    <span className="font-mono text-xs text-mindaro">0{i + 1}</span>
                    <h3 className="font-display text-2xl font-semibold text-mist">{v.title}</h3>
                  </div>
                  <p className="mt-3 text-sm leading-relaxed text-cambridge">{v.text}</p>
                </div>
              </Reveal>
            ))}
          </div>

          {/* Timeline */}
          <Reveal className="mt-16">
            <div className="flex flex-col gap-6 border-t border-mist/10 pt-10 sm:flex-row sm:gap-0">
              {TEAM.timeline.map((t, i) => (
                <div key={t.year} className="relative flex-1 sm:px-5 sm:first:pl-0">
                  <div className="flex items-center gap-3">
                    <span aria-hidden className="h-2 w-2 rounded-full bg-mindaro" />
                    <span className="font-mono text-sm text-mindaro">{t.year}</span>
                    {i < TEAM.timeline.length - 1 && (
                      <span aria-hidden className="hidden h-px flex-1 bg-gradient-to-r from-mist/25 to-transparent sm:block" />
                    )}
                  </div>
                  <p className="mt-2.5 pl-5 text-sm text-cambridge sm:pl-0">{t.text}</p>
                </div>
              ))}
            </div>
            <p className="mt-6 font-mono text-[10px] uppercase tracking-[0.2em] text-cambridge/40">
              {TEAM.timelineNote}
            </p>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
