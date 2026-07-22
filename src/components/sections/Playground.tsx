"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Radar, Workflow } from "lucide-react";
import { useState } from "react";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Em } from "@/components/ui/Em";
import { ScrapingSimulator } from "@/components/games/ScrapingSimulator";
import { AutomationFlowBuilder } from "@/components/games/AutomationFlowBuilder";

const TABS = [
  {
    id: "scraping",
    label: "Scraping Simulator",
    icon: Radar,
    blurb: "Entrez une URL, lancez l'extraction et regardez la donnée se structurer en temps réel.",
  },
  {
    id: "automation",
    label: "Automation Builder",
    icon: Workflow,
    blurb: "Reliez les nœuds d'un workflow et débloquez le gain de productivité.",
  },
] as const;

export function Playground() {
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("scraping");
  const active = TABS.find((t) => t.id === tab)!;

  return (
    <section id="playground" className="relative py-28 sm:py-36">
      <div className="container-x">
        <SectionHeading
          kicker="Playground"
          index="02"
          title={
            <>
              Ne nous croyez pas sur parole. <Em accent>Essayez.</Em>
            </>
          }
          intro="Deux démos jouables qui montrent, concrètement, ce qu'on fabrique au quotidien."
        />

        {/* Tabs */}
        <div className="mt-10 flex flex-wrap gap-2">
          {TABS.map((t) => {
            const Icon = t.icon;
            const on = t.id === tab;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`relative inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium transition-colors ${
                  on ? "text-white" : "text-[var(--color-text-dim)] hover:text-[var(--color-text)]"
                }`}
              >
                {on && (
                  <motion.span
                    layoutId="pg-tab"
                    className="absolute inset-0 -z-10 rounded-full bg-[linear-gradient(120deg,var(--color-accent),var(--color-accent-2))]"
                    transition={{ type: "spring", stiffness: 350, damping: 30 }}
                  />
                )}
                <Icon size={15} />
                {t.label}
              </button>
            );
          })}
        </div>

        <p className="mt-4 max-w-xl text-sm text-[var(--color-text-dim)]">{active.blurb}</p>

        {/* Game surface */}
        <div className="mt-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={tab}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            >
              {tab === "scraping" ? <ScrapingSimulator /> : <AutomationFlowBuilder />}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}
