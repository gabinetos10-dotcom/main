import type { Metadata } from "next";
import PageHero from "@/components/ui/PageHero";
import { Section } from "@/components/ui/Section";
import { Reveal } from "@/components/ui/Reveal";
import ContactForm from "@/components/contact/ContactForm";
import ContactInfo from "@/components/contact/ContactInfo";

export const metadata: Metadata = {
  title: "Contact — parlons de votre mariage",
  description:
    "Contactez Maison Jolie — Mélina, wedding planner & designer en Occitanie. 07 68 18 94 58 · contact@maisonjoliewedding.com.",
  alternates: { canonical: "/contact" },
};

export default function ContactPage() {
  return (
    <>
      <PageHero
        kicker="Je me marie !"
        title={
          <>
            On <em className="italic text-sunwash">commence</em> quand ?
          </>
        }
        intro="Dites-nous tout — même en quelques mots. Je réponds à chaque message personnellement, avec le même soin que pour un mariage."
      />
      <Section className="pt-6">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.4fr_1fr]">
          <Reveal>
            <ContactForm />
          </Reveal>
          <Reveal delay={0.1}>
            <ContactInfo />
          </Reveal>
        </div>
      </Section>
    </>
  );
}
