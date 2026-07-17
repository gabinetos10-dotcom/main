import { CONTACT, SITE } from "@/lib/content";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Reveal } from "@/components/ui/Reveal";
import { ContactForm } from "./ContactForm";

/**
 * Contact : promesse claire à gauche, formulaire premium à droite.
 */
export function Contact() {
  return (
    <section id="contact" data-section className="scroll-mt-24 py-28 lg:py-40">
      <div className="container-gjs grid gap-14 lg:grid-cols-[1fr_1.15fr] lg:gap-20">
        <div>
          <SectionHeading index="05" eyebrow={CONTACT.eyebrow} title={CONTACT.title} />
          <Reveal>
            <p className="mt-7 max-w-md text-lead text-cambridge">{CONTACT.sub}</p>
          </Reveal>
          <Reveal delay={0.1}>
            <ul className="mt-9 space-y-3.5">
              {CONTACT.bullets.map((b) => (
                <li key={b} className="flex items-center gap-3 text-sm text-mist">
                  <span
                    aria-hidden
                    className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-mindaro/15 font-mono text-[10px] text-mindaro"
                  >
                    ✓
                  </span>
                  {b}
                </li>
              ))}
            </ul>
          </Reveal>
          <Reveal delay={0.16}>
            <div className="mt-11 space-y-2 font-mono text-sm">
              <a href={`mailto:${SITE.email}`} className="link-sweep block w-fit text-mist hover:text-mindaro">
                {SITE.email}
              </a>
              <p className="text-cambridge">{SITE.location}</p>
            </div>
          </Reveal>
        </div>

        <Reveal delay={0.08} y={48}>
          <ContactForm />
        </Reveal>
      </div>
    </section>
  );
}
