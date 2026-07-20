/**
 * CONTENU DU SITE — Maison Jolie Wedding
 * -----------------------------------------------------------------------------
 * Les faits (nom, zone, baseline, offres, coordonnées, crédits) proviennent du
 * brief client et NE DOIVENT PAS être inventés.
 *
 * Les textes marqués `// [À VALIDER]` sont rédigés par le studio dans la voix de
 * la marque (poétique, sincère, solaire) et sont à faire valider par Mélina.
 * Les mentions légales portent des champs `[À COMPLÉTER]`.
 */

export const brand = {
  name: "Maison Jolie Wedding",
  founder: "Mélina",
  role: "Wedding Planner & Wedding Designer",
  roleLong: "Wedding Planner & Designer, experte du design et de l'émotion",
  baseline: "Une sensibilité esthétique, guidée par les liens humains.",
  signature:
    "Des mariages élégants, pensés avec le cœur, pour des moments précieux partagés avec ceux que vous aimez.",
  footerBaseline: "Des mariages élégants, pensés avec le cœur.",
  luxe: "Le luxe réside dans l'attention portée aux personnes.",
  area: {
    region: "Occitanie · Sud de la France",
    cities: ["Montpellier", "Béziers", "Narbonne"],
    departement: "Hérault",
  },
  contact: {
    phone: "07 68 18 94 58",
    phoneHref: "tel:+33768189458",
    email: "contact@maisonjoliewedding.com",
    emailHref: "mailto:contact@maisonjoliewedding.com",
    instagram: "@maisonjolie_wedding",
    instagramHref: "https://www.instagram.com/maisonjolie_wedding/",
  },
} as const;

export const nav = [
  { label: "Accueil", href: "/" },
  {
    label: "Mes services",
    href: "/#services",
    children: [
      { label: "Wedding Planner", href: "/wedding-planner" },
      { label: "Wedding Designer", href: "/wedding-designer" },
    ],
  },
  { label: "Portfolio", href: "/portfolio" },
  { label: "Blog", href: "/blog" },
  { label: "Contact", href: "/contact" },
] as const;

// [À VALIDER] — récit reformulé à partir des éléments factuels du brief.
export const manifesto = {
  kicker: "Le manifeste",
  title: "Une sensibilité esthétique, guidée par les liens humains.",
  paragraphs: [
    "Formée aux arts appliqués, je porte sur chaque mariage un double regard : celui du design — les matières, les équilibres, la lumière, le détail juste — et celui de l'humain, qui écoute avant de composer.",
    "Je crois que le vrai luxe ne se mesure pas : il réside dans l'attention portée aux personnes. Dans une écoute sincère, une justesse de ton, une bienveillance qui traverse chaque décision.",
    "De cette double culture naissent des mariages élégants, cohérents et profondément sensibles — des célébrations qui vous ressemblent, jamais des mariages « catalogue ».",
  ],
  quote: "Le luxe réside dans l'attention portée aux personnes.",
  signature: "Mélina",
};

export type Service = {
  slug: string;
  eyebrow: string;
  title: string;
  tagline: string;
  ambience: "planner" | "designer";
  intro: string;
  prestations: string[];
  href: string;
};

export const services: Service[] = [
  {
    slug: "wedding-planner",
    eyebrow: "L'organisation",
    title: "Wedding Planner",
    tagline: "Je porte la logistique, vous vivez l'instant.",
    ambience: "planner",
    // [À VALIDER]
    intro:
      "De la première idée au dernier au revoir, j'orchestre chaque étape de votre mariage avec méthode et douceur, pour que le jour J ne vous laisse que l'émotion.",
    prestations: [
      "Conception & fil conducteur du projet",
      "Recherche & sélection de lieux",
      "Constitution et pilotage des prestataires",
      "Gestion du budget et du rétroplanning",
      "Coordination complète du jour J",
    ],
    href: "/wedding-planner",
  },
  {
    slug: "wedding-designer",
    eyebrow: "La scénographie",
    title: "Wedding Designer",
    tagline: "Je donne une âme visuelle à votre histoire.",
    ambience: "designer",
    // [À VALIDER]
    intro:
      "Direction artistique, palette, matières, fleurs et lumière : je dessine une scénographie cohérente, sensible et sur-mesure, pensée comme le décor de votre récit.",
    prestations: [
      "Direction artistique & concept déco",
      "Palette de couleurs & univers de matières",
      "Scénographie des espaces & tables",
      "Papeterie, signalétique & détails précieux",
      "Coordination des artisans (fleuristes, loueurs…)",
    ],
    href: "/wedding-designer",
  },
];

// [À VALIDER] — libellés d'étapes rédigés par le studio.
export const journey = [
  {
    step: "01",
    title: "La rencontre",
    text: "On se raconte. Vos envies, votre histoire, votre manière de recevoir. Rien ne se dessine sans cette écoute première.",
  },
  {
    step: "02",
    title: "La conception",
    text: "Je traduis vos mots en un fil conducteur : intentions, budget, rétroplanning, prestataires choisis avec soin.",
  },
  {
    step: "03",
    title: "La direction artistique",
    text: "Palette, matières, fleurs, lumière et papeterie s'accordent en une scénographie cohérente qui vous ressemble.",
  },
  {
    step: "04",
    title: "Le jour J",
    text: "Je coordonne chaque instant en coulisses. Vous n'avez plus qu'une chose à faire : vivre, pleinement.",
  },
];

// [À VALIDER] — statistiques indicatives, à confirmer / alimenter par Mélina.
export const stats = [
  { value: 8, suffix: "+", label: "années à imaginer des mariages" },
  { value: 120, suffix: "+", label: "célébrations accompagnées" },
  { value: 3, suffix: "", label: "départements de cœur en Occitanie" },
  { value: 100, suffix: "%", label: "sur-mesure, jamais « catalogue »" },
];

export type Project = {
  slug: string;
  title: string;
  location: string;
  style: string; // clé de filtre
  styleLabel: string;
  credit: string;
  span: "tall" | "wide" | "regular";
  // Paire de teintes pour le visuel art-dirigé (placeholder en attendant les vraies photos).
  hues: [string, string];
};

// Crédits photo réels à citer (© Yann Bader, © Cindy Gonzalez, © Lydia Torresan).
// [À VALIDER] — titres & lieux d'illustration ; à remplacer par les vrais mariages.
export const projects: Project[] = [
  {
    slug: "lumiere-domaine",
    title: "Lumière au domaine",
    location: "Hérault",
    style: "solaire",
    styleLabel: "Solaire méditerranéen",
    credit: "© Yann Bader",
    span: "tall",
    hues: ["var(--soleil)", "var(--terracotta)"],
  },
  {
    slug: "jardin-suspendu",
    title: "Jardin suspendu",
    location: "Montpellier",
    style: "romantique",
    styleLabel: "Romantique jardin",
    credit: "© Cindy Gonzalez",
    span: "wide",
    hues: ["var(--blush)", "var(--sauge)"],
  },
  {
    slug: "mas-provencal",
    title: "Un oui au mas",
    location: "Béziers",
    style: "boheme",
    styleLabel: "Bohème",
    credit: "© Lydia Torresan",
    span: "regular",
    hues: ["var(--miel)", "var(--rose-poudre)"],
  },
  {
    slug: "elegance-minerale",
    title: "Élégance minérale",
    location: "Narbonne",
    style: "minerale",
    styleLabel: "Élégance minérale",
    credit: "© Yann Bader",
    span: "regular",
    hues: ["var(--sauge)", "var(--creme)"],
  },
  {
    slug: "orangerie-doree",
    title: "Orangerie dorée",
    location: "Hérault",
    style: "solaire",
    styleLabel: "Solaire méditerranéen",
    credit: "© Cindy Gonzalez",
    span: "wide",
    hues: ["var(--miel)", "var(--soleil)"],
  },
  {
    slug: "bord-de-mer",
    title: "Serment en bord de mer",
    location: "Narbonne-Plage",
    style: "boheme",
    styleLabel: "Bohème",
    credit: "© Lydia Torresan",
    span: "tall",
    hues: ["var(--blush)", "var(--miel)"],
  },
];

export const portfolioFilters = [
  { key: "tous", label: "Tous les univers" },
  { key: "solaire", label: "Solaire méditerranéen" },
  { key: "romantique", label: "Romantique jardin" },
  { key: "boheme", label: "Bohème" },
  { key: "minerale", label: "Élégance minérale" },
];

// [À VALIDER] — témoignages d'illustration, à remplacer par de vrais avis.
export const testimonials = [
  {
    quote:
      "Mélina a compris notre histoire avant même qu'on la raconte. Tout était juste, jusqu'au moindre détail. On a simplement vécu notre journée.",
    author: "Camille & Julien",
    place: "Domaine dans l'Hérault",
  },
  {
    quote:
      "Une douceur et une exigence rares. Notre mariage nous ressemblait profondément — nos invités en parlent encore.",
    author: "Sarah & Thomas",
    place: "Mas près de Béziers",
  },
  {
    quote:
      "Elle a transformé nos idées un peu floues en une scénographie d'une cohérence bluffante. Merci pour cette élégance.",
    author: "Léa & Antoine",
    place: "Orangerie, Montpellier",
  },
];

// [À VALIDER] — articles d'illustration pour le teaser du blog.
export const posts = [
  {
    slug: "palette-mariage-solaire",
    category: "Inspirations",
    title: "Composer une palette solaire sans tomber dans le criard",
    date: "2026-06-12",
    readingTime: "5 min",
    hues: ["var(--soleil)", "var(--terracotta)"],
  },
  {
    slug: "choisir-son-lieu-herault",
    category: "Conseils",
    title: "Choisir son lieu de mariage dans l'Hérault : 6 questions à se poser",
    date: "2026-05-03",
    readingTime: "7 min",
    hues: ["var(--sauge)", "var(--miel)"],
  },
  {
    slug: "coulisses-jour-j",
    category: "Coulisses",
    title: "Dans les coulisses d'un jour J parfaitement orchestré",
    date: "2026-04-18",
    readingTime: "4 min",
    hues: ["var(--blush)", "var(--rose-poudre)"],
  },
];

export const prestationOptions = [
  "Wedding Planner (organisation)",
  "Wedding Designer (décoration)",
  "Les deux",
  "Je ne sais pas encore",
];
