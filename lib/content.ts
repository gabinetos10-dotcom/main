/**
 * ══════════════════════════════════════════════════════════════
 *  CONTENU ÉDITORIAL GJS — tout le copywriting du site vit ici.
 *  Pour changer un texte, un chiffre, un projet : c'est ce fichier.
 * ══════════════════════════════════════════════════════════════
 */

export const SITE = {
  name: "GJS",
  legalName: "GJS — Agence de développement web",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.gjs-agence.fr",
  title: "GJS — Agence de développement web · Création, automatisation, data & conseil",
  description:
    "GJS conçoit des sites web d'exception, automatise vos process, collecte et structure vos données, et vous conseille sans jargon. Une agence française, exigeante et chaleureuse.",
  email: "bonjour@gjs-agence.fr", // [À COMPLÉTER] — adresse réelle
  phone: "+33 (0)6 00 00 00 00", // [À COMPLÉTER]
  location: "Paris, France · remote friendly",
  availability: "Disponibles — nouveaux projets Q4 2026",
} as const;

export const NAV_ITEMS = [
  { id: "expertise", label: "Expertise", index: "01" },
  { id: "services", label: "Services", index: "02" },
  { id: "realisations", label: "Réalisations", index: "03" },
  { id: "equipe", label: "L'équipe", index: "04" },
  { id: "contact", label: "Contact", index: "05" },
] as const;

/* ────────────────────────── HERO ────────────────────────── */
export const HERO = {
  eyebrow: "Agence de développement web — France",
  lines: ["Créer.", "Automatiser.", "Accélérer."],
  sub: "GJS transforme vos idées en expériences web remarquables — et vos process en machines bien huilées. Sites sur-mesure, automatisation, données, conseil : tout ce qu'il faut pour que le numérique travaille pour vous.",
  ctaPrimary: "Démarrer un projet",
  ctaSecondary: "Explorer nos services",
  scrollHint: "Défiler pour explorer",
} as const;

/* ─────────────────────── EXPERTISE ─────────────────────── */
export const EXPERTISE = {
  eyebrow: "Expertise",
  title: "L'exigence d'un studio. La rigueur de l'ingénierie.",
  manifesto:
    "Un beau site qui ne convertit pas est un poster. Un process manuel qui pourrait être automatisé est une fuite. Chez GJS, chaque ligne de code a un travail à faire : attirer, convaincre, économiser, accélérer. Nous construisons des outils vivants — et nous restons là quand ils grandissent.",
  counters: [
    { value: 40, suffix: "+", label: "Projets livrés en production" },
    { value: 1200, suffix: " h", label: "Automatisées chaque année chez nos clients" },
    { value: 3, suffix: " M+", label: "Points de données collectés par mois" },
    { value: 98, suffix: " %", label: "De clients qui reviennent avec un 2ᵉ projet" },
  ],
  steps: [
    {
      num: "α",
      title: "Écouter",
      text: "Votre métier d'abord. Nous cartographions objectifs, contraintes et opportunités avant d'écrire la moindre ligne.",
    },
    {
      num: "β",
      title: "Concevoir",
      text: "Prototypes rapides, décisions documentées : vous voyez où l'on va, à chaque étape, sans effet tunnel.",
    },
    {
      num: "γ",
      title: "Construire",
      text: "Design et développement itèrent ensemble, en cycles courts, avec des démos régulières et honnêtes.",
    },
    {
      num: "δ",
      title: "Faire durer",
      text: "Mise en production, mesure, améliorations continues. Un site vivant, pas un livrable figé.",
    },
  ],
} as const;

/* ─────────────────────── SERVICES ─────────────────────── */
export type ServiceAccent = "mindaro" | "sage" | "air" | "cambridge";
export type GameId = "catcher" | "chain" | "shipit";

export interface Service {
  id: string;
  num: string;
  title: string;
  short: string;
  hook: string;
  description: string;
  deliverables: string[];
  accent: ServiceAccent;
  game: GameId;
  gameLabel: string;
}

export const SERVICES: Service[] = [
  {
    id: "creation",
    num: "01",
    title: "Création de sites web",
    short: "Sites & apps",
    hook: "Des sites qui font ce que les autres promettent.",
    description:
      "Vitrines, e-commerce, applications web : nous concevons et développons des expériences sur-mesure, rapides et mémorables. Du premier wireframe à la mise en production, design et code avancent ensemble — jamais l'un derrière l'autre.",
    deliverables: ["Design sur-mesure", "Next.js / React", "E-commerce", "SEO technique", "Performance 90+"],
    accent: "mindaro",
    game: "shipit",
    gameLabel: "Jouer à Ship It",
  },
  {
    id: "automatisation",
    num: "02",
    title: "Automatisation",
    short: "Workflows",
    hook: "Vos process tournent. Vous, vous avancez.",
    description:
      "Nous connectons vos outils et transformons les tâches répétitives en workflows silencieux : CRM, facturation, e-mails, reporting. Chaque heure rendue à votre équipe est une heure réinvestie là où vous êtes irremplaçables.",
    deliverables: ["Workflows n8n · Make · Zapier", "Intégrations API", "Back-offices sur-mesure", "Synchronisation d'outils", "Alertes & reporting"],
    accent: "sage",
    game: "chain",
    gameLabel: "Jouer à Chaîne de réaction",
  },
  {
    id: "data",
    num: "03",
    title: "Scraping & données",
    short: "Data",
    hook: "La donnée que vous cherchez existe. Nous allons la chercher.",
    description:
      "Veille concurrentielle, enrichissement de bases, agrégation de sources : nous collectons, nettoyons et structurons la donnée à grande échelle — proprement, dans le respect du droit, et automatiquement.",
    deliverables: ["Extraction à grande échelle", "Veille prix & marché", "Enrichissement de données", "Pipelines automatisés", "Livraison API · CSV · BDD"],
    accent: "air",
    game: "catcher",
    gameLabel: "Jouer à Data Catcher",
  },
  {
    id: "conseil",
    num: "04",
    title: "Conseil",
    short: "Stratégie",
    hook: "Un partenaire technique qui parle votre langue.",
    description:
      "Audit de l'existant, choix de stack, feuille de route produit : nous mettons notre expérience au service de vos décisions. Pas de jargon, pas de dépendance forcée — des recommandations claires, chiffrées, actionnables.",
    deliverables: ["Audit technique & UX", "Stratégie digitale", "Choix de stack", "Accompagnement d'équipe", "Revue de code"],
    accent: "cambridge",
    game: "shipit",
    gameLabel: "Jouer à Ship It",
  },
];

export const SERVICES_META = {
  eyebrow: "Services",
  title: "Quatre façons de vous faire gagner du temps, des clients et des nerfs.",
  note: "Psst — chaque service cache un mini-jeu. Cherchez le bouton ▶.",
} as const;

/* ────────────────────── TECHNOS (marquee) ────────────────────── */
export const TECHS = [
  "Next.js",
  "React",
  "TypeScript",
  "Node.js",
  "Python",
  "Playwright",
  "n8n",
  "Make",
  "Zapier",
  "Airtable",
  "Shopify",
  "Stripe",
  "Supabase",
  "PostgreSQL",
  "Tailwind CSS",
  "Three.js",
  "GSAP",
  "Docker",
  "Vercel",
] as const;

export const MARQUEE_WORDS = ["Sites", "Automatisation", "Données", "Conseil"] as const;

/* ────────────────────── RÉALISATIONS ────────────────────── */
export interface CaseStudy {
  id: string;
  name: string;
  meta: string;
  year: string;
  description: string;
  stat: { value: string; label: string };
  tags: string[];
  /** teintes du « faux screenshot » généré en CSS */
  tint: [string, string];
}

export const CASES_META = {
  eyebrow: "Réalisations",
  title: "Des preuves, pas des promesses.",
  note: "Études de cas illustratives — les vôtres les remplaceront bientôt.",
} as const;

export const CASES: CaseStudy[] = [
  {
    id: "nordlys",
    name: "Nordlys",
    meta: "E-commerce · Mobilier scandinave",
    year: "2025",
    description:
      "Refonte complète : direction artistique épurée, catalogue avec visualisation 3D des pièces, checkout en une page. Le mobile d'abord, la lenteur nulle part.",
    stat: { value: "+182 %", label: "de conversion en trois mois" },
    tags: ["Next.js", "Shopify headless", "Three.js"],
    tint: ["#1b4079", "#4d7c8a"],
  },
  {
    id: "volteo",
    name: "Voltéo",
    meta: "SaaS · Énergie",
    year: "2025",
    description:
      "Tableau de bord temps réel pour 40 000 foyers : data-visualisation, alertes de consommation, facturation automatisée. L'infra tient, l'interface respire.",
    stat: { value: "40 000", label: "foyers monitorés en temps réel" },
    tags: ["React", "Node.js", "TimescaleDB"],
    tint: ["#4d7c8a", "#8fad88"],
  },
  {
    id: "maison-aube",
    name: "Maison Aube",
    meta: "Hôtellerie · Site vitrine",
    year: "2024",
    description:
      "Une immersion lente et lumineuse dans un lieu d'exception : scrollytelling, réservation intégrée, photographie mise en majesté. Le site ressemble au séjour.",
    stat: { value: "×3", label: "de demandes de réservation directes" },
    tags: ["Next.js", "GSAP", "Sanity"],
    tint: ["#8fad88", "#cbdf90"],
  },
  {
    id: "datapulse",
    name: "Datapulse",
    meta: "Data · Veille concurrentielle",
    year: "2024",
    description:
      "2 millions de prix collectés chaque nuit sur 14 marketplaces, dédupliqués, structurés et servis via API aux équipes pricing. Silencieux, robuste, documenté.",
    stat: { value: "2 M", label: "de prix collectés par nuit" },
    tags: ["Python", "Playwright", "PostgreSQL"],
    tint: ["#142e57", "#7f9c96"],
  },
];

/* ────────────────────── ÉQUIPE ────────────────────── */
export const TEAM = {
  eyebrow: "L'équipe",
  title: "Trois lettres. Une obsession : que ça marche.",
  intro:
    "GJS, c'est un noyau resserré de développeurs, designers et stratèges qui ont choisi de rester petits pour rester bons. Pas de commerciaux entre vous et ceux qui construisent : vous parlez directement aux personnes qui écrivent le code.",
  members: [
    {
      letter: "G",
      role: "Développement",
      text: "Architecture, code, performance. Le « ça tourne » qui tient la nuit.",
      name: "[À COMPLÉTER]",
    },
    {
      letter: "J",
      role: "Design",
      text: "Interfaces, motion, identité. Le détail qu'on ne remarque que s'il manque.",
      name: "[À COMPLÉTER]",
    },
    {
      letter: "S",
      role: "Stratégie",
      text: "Produit, données, croissance. Les bonnes questions avant les bonnes réponses.",
      name: "[À COMPLÉTER]",
    },
  ],
  values: [
    {
      title: "Exigence",
      text: "Le détail qui semble superflu est souvent celui qu'on remarque. Nous polissons jusque-là.",
    },
    {
      title: "Clarté",
      text: "Des devis lisibles, des délais tenus, des explications sans jargon. Vous savez toujours où on en est.",
    },
    {
      title: "Vélocité",
      text: "Des cycles courts, des démos fréquentes. L'élan fait partie de la qualité.",
    },
    {
      title: "Chaleur",
      text: "La tech est notre métier, la relation est notre carburant. Sérieux dans le travail, jamais dans le ton.",
    },
  ],
  timeline: [
    { year: "2021", text: "Premiers projets, premiers clients fidèles" },
    { year: "2023", text: "GJS devient une équipe" },
    { year: "2025", text: "Le cap du million de données traitées par jour" },
    { year: "2026", text: "Toujours petits. Volontairement." },
  ],
  timelineNote: "[À COMPLÉTER — votre vraie histoire ici]",
} as const;

/* ────────────────────── CONTACT ────────────────────── */
export const CONTACT = {
  eyebrow: "Contact",
  title: "Dites-nous tout.",
  sub: "Racontez-nous où vous en êtes — on vous dira franchement ce qu'on ferait à votre place. Premier échange sans engagement, réponse sous 24 h ouvrées.",
  bullets: [
    "Réponse sous 24 h ouvrées",
    "Devis clair et chiffré sous 5 jours",
    "NDA sur simple demande",
  ],
  subjects: ["Création de site", "Automatisation", "Scraping & données", "Conseil", "Autre sujet"],
  consentLabel:
    "J'accepte que mes données soient utilisées pour traiter ma demande, conformément à la politique de confidentialité. Aucune newsletter, promis.",
  success: {
    title: "Message reçu — 200 OK",
    text: "Merci ! Votre message est bien arrivé. On revient vers vous sous 24 h ouvrées. En attendant : le code Konami fonctionne vraiment sur ce site.",
  },
} as const;

/* ────────────────────── FOOTER ────────────────────── */
export const FOOTER = {
  hookSmall: "Un projet précis ? Une idée floue ? Un process qui gratte ?",
  hookBig: "Travaillons ensemble",
  marquee: "Disponibles pour de nouveaux projets — Création · Automatisation · Données · Conseil —",
  columns: {
    nav: { title: "Navigation", items: NAV_ITEMS.map((n) => ({ label: n.label, href: `/#${n.id}` })) },
    services: {
      title: "Services",
      items: SERVICES.map((s) => ({ label: s.title, href: "/#services" })),
    },
    contact: {
      title: "Contact",
      items: [
        { label: SITE.email, href: `mailto:${SITE.email}` },
        { label: SITE.location, href: undefined },
      ],
    },
    social: {
      title: "Réseaux",
      items: [
        { label: "LinkedIn", href: "https://www.linkedin.com" }, // [À COMPLÉTER]
        { label: "GitHub", href: "https://github.com" }, // [À COMPLÉTER]
        { label: "Malt", href: "https://www.malt.fr" }, // [À COMPLÉTER]
      ],
    },
  },
} as const;
