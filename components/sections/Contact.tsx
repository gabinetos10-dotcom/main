import { Section, SectionHeading } from "@/components/ui/Section";
import { Reveal } from "@/components/ui/Reveal";
import ContactForm from "@/components/contact/ContactForm";
import ContactInfo from "@/components/contact/ContactInfo";

export default function Contact() {
  return (
    <Section id="contact">
      <SectionHeading
        align="center"
        kicker="Je me marie !"
        title={
          <>
            On <em className="italic text-sunwash">commence</em> quand ?
          </>
        }
        intro="Dites-nous tout — même en quelques mots. Chaque histoire mérite qu'on l'écoute avec attention."
      />

      <div className="mt-12 grid grid-cols-1 gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Reveal>
          <ContactForm />
        </Reveal>
        <Reveal delay={0.1}>
          <ContactInfo />
        </Reveal>
      </div>
    </Section>
  );
}
