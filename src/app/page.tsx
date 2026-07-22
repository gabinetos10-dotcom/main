"use client";

import { useState } from "react";
import { Preloader } from "@/components/ui/Preloader";
import { Header } from "@/components/ui/Header";
import { Hero } from "@/components/sections/Hero";
import { Expertise } from "@/components/sections/Expertise";
import { Playground } from "@/components/sections/Playground";
import { About } from "@/components/sections/About";
import { CaseStudies } from "@/components/sections/CaseStudies";
import { Contact } from "@/components/sections/Contact";
import { Footer } from "@/components/sections/Footer";
import { CookieConsent } from "@/components/ui/CookieConsent";
import { LegalModal, type LegalType } from "@/components/legal/LegalModal";

export default function Home() {
  const [loaded, setLoaded] = useState(false);
  const [legal, setLegal] = useState<LegalType>(null);

  return (
    <>
      <Preloader onComplete={() => setLoaded(true)} />

      <Header />

      <main>
        <Hero active={loaded} />
        <Expertise />
        <Playground />
        <About />
        <CaseStudies />
        <Contact />
      </main>

      <Footer />

      <CookieConsent onOpenPrivacy={() => setLegal("confidentialite")} />
      <LegalModal type={legal} onClose={() => setLegal(null)} />
    </>
  );
}
