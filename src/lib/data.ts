import {
  Code2,
  Workflow,
  Radar,
  Compass,
  type LucideIcon,
} from "lucide-react";

export type NavLink = { label: string; href: string };

export const NAV_LINKS: NavLink[] = [
  { label: "Expertise", href: "#expertise" },
  { label: "Playground", href: "#playground" },
  { label: "ADN", href: "#adn" },
  { label: "Projets", href: "#projets" },
  { label: "Contact", href: "#contact" },
];

export type Pillar = {
  id: string;
  index: string;
  title: string;
  tagline: string;
  description: string;
  icon: LucideIcon;
  accent: string;
  features: string[];
};

export const PILLARS: Pillar[] = [
  {
    id: "web",
    index: "01",
    title: "Création Web",
    tagline: "Sur‑mesure, ultra‑rapide, mémorable.",
    description:
      "Des sites vitrines et applications web taillés main : design system unique, animations 60fps et performances Lighthouse au vert.",
    icon: Code2,
    accent: "#7b61ff",
    features: ["Next.js / React", "Design system", "SEO & Core Web Vitals", "Headless CMS"],
  },
  {
    id: "automation",
    index: "02",
    title: "Automatisation",
    tagline: "Vos process en pilotage automatique.",
    description:
      "On relie vos outils, on supprime les tâches répétitives et on orchestre des workflows fiables qui tournent 24/7 sans vous.",
    icon: Workflow,
    accent: "#2de2e6",
    features: ["Make / n8n", "Webhooks & API", "IA générative", "Notion / CRM"],
  },
  {
    id: "scraping",
    index: "03",
    title: "Web Scraping",
    tagline: "La donnée, extraite et structurée.",
    description:
      "Extraction de données à grande échelle, nettoyage, structuration et livraison — de la veille tarifaire au lead‑gen ciblé.",
    icon: Radar,
    accent: "#c4b5fd",
    features: ["Crawlers résilients", "Anti‑bot & proxies", "Parsing structuré", "Export API/CSV"],
  },
  {
    id: "conseil",
    index: "04",
    title: "Conseil Tech",
    tagline: "Un copilote pour vos décisions.",
    description:
      "Audit, architecture et accompagnement : on éclaire vos choix techniques pour investir juste et scaler sereinement.",
    icon: Compass,
    accent: "#ff7a59",
    features: ["Audit & cadrage", "Architecture", "Choix de stack", "Formation équipe"],
  },
];

export type Stat = { value: number; suffix: string; label: string };

export const STATS: Stat[] = [
  { value: 60, suffix: "+", label: "Projets livrés" },
  { value: 85, suffix: "%", label: "Temps gagné en moyenne" },
  { value: 12, suffix: "k", label: "Heures automatisées" },
  { value: 100, suffix: "%", label: "Made in France" },
];

export const VALUES: { title: string; body: string }[] = [
  {
    title: "Craft obsessionnel",
    body: "Chaque pixel, chaque milliseconde compte. On peaufine jusqu'à ce que ça paraisse évident.",
  },
  {
    title: "Transparence radicale",
    body: "Pas de jargon opaque. Vous comprenez ce qu'on construit et pourquoi, à chaque étape.",
  },
  {
    title: "Vitesse & fiabilité",
    body: "On livre vite, mais on livre solide. Le sur‑mesure ne veut pas dire fragile.",
  },
];

export type Project = {
  id: string;
  name: string;
  category: string;
  year: string;
  blurb: string;
  metric: string;
  hue: string;
};

export const PROJECTS: Project[] = [
  {
    id: "aurora",
    name: "Aurora Labs",
    category: "Site sur‑mesure · WebGL",
    year: "2025",
    blurb: "Une expérience produit immersive pour une startup deeptech.",
    metric: "+38% de conversion",
    hue: "#7b61ff",
  },
  {
    id: "fluxo",
    name: "Fluxo CRM",
    category: "Automatisation · IA",
    year: "2025",
    blurb: "Pipeline lead‑to‑cash entièrement automatisé, zéro saisie manuelle.",
    metric: "9h gagnées / semaine",
    hue: "#2de2e6",
  },
  {
    id: "prisme",
    name: "Prisme Data",
    category: "Scraping · Veille",
    year: "2024",
    blurb: "Veille concurrentielle temps réel sur 2 400 sources.",
    metric: "2.4k sources suivies",
    hue: "#c4b5fd",
  },
  {
    id: "atelier",
    name: "Atelier Nord",
    category: "Site & conseil",
    year: "2024",
    blurb: "Refonte complète et stratégie tech pour une maison de design.",
    metric: "x3 trafic organique",
    hue: "#ff7a59",
  },
];

/** Contact wizard steps. */
export const PROJECT_TYPES = [
  "Création Web",
  "Automatisation",
  "Web Scraping",
  "Conseil Tech",
] as const;

export const BUDGET_RANGES = [
  "< 3k €",
  "3k – 8k €",
  "8k – 20k €",
  "> 20k €",
] as const;

export const TIMELINES = ["Urgent (< 1 mois)", "1 – 3 mois", "3 mois +", "Flexible"] as const;
