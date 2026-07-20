import Hero from "@/components/sections/Hero";
import Manifesto from "@/components/sections/Manifesto";
import Services from "@/components/sections/Services";
import JourneyTimeline from "@/components/sections/JourneyTimeline";
import MoodboardGame from "@/components/sections/MoodboardGame";
import Portfolio from "@/components/sections/Portfolio";
import Testimonials from "@/components/sections/Testimonials";
import BlogTeaser from "@/components/sections/BlogTeaser";
import InstagramGrid from "@/components/sections/InstagramGrid";
import Contact from "@/components/sections/Contact";
import RibbonDivider from "@/components/decor/RibbonDivider";

export default function HomePage() {
  return (
    <>
      <span id="top" />
      <Hero />
      <Manifesto />
      <RibbonDivider />
      <Services />
      <JourneyTimeline />
      <MoodboardGame />
      <RibbonDivider />
      <Portfolio />
      <Testimonials />
      <BlogTeaser />
      <InstagramGrid />
      <RibbonDivider />
      <Contact />
    </>
  );
}
