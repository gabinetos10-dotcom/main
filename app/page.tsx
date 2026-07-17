import { Preloader } from "@/components/layout/Preloader";
import { HUD } from "@/components/layout/HUD";
import { Background } from "@/components/three/Background";
import { Hero } from "@/components/sections/Hero";
import { Expertise } from "@/components/sections/Expertise";
import { TechMarquee } from "@/components/sections/TechMarquee";
import { Services } from "@/components/sections/Services";
import { Realisations } from "@/components/sections/Realisations";
import { Equipe } from "@/components/sections/Equipe";
import { Contact } from "@/components/sections/Contact";

export default function HomePage() {
  return (
    <>
      <Preloader />
      <Background />
      <HUD />
      <main id="contenu">
        <Hero />
        <Expertise />
        <TechMarquee />
        <Services />
        <Realisations />
        <Equipe />
        <Contact />
      </main>
    </>
  );
}
