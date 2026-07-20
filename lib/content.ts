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
  // [À VALIDER] — contenus rédigés par le studio pour les pages dédiées.
  pitch: string;
  forWho: string;
  approach: { title: string; text: string }[];
  hues: [string, string];
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
    pitch:
      "Organiser un mariage, c'est prendre cent décisions et coordonner autant de personnes. Mon rôle est de porter cette charge pour vous : structurer, anticiper, sécuriser — pour que vous gardiez l'esprit libre et le plaisir intact, du premier rendez-vous au dernier au revoir.",
    forWho:
      "Pour les couples qui veulent être accompagnés de A à Z, ou seulement coordonnés le jour J.",
    approach: [
      { title: "Cadrer", text: "On pose ensemble vos priorités, votre budget et le rétroplanning qui rythmera l'année." },
      { title: "Constituer", text: "Je sélectionne et négocie les prestataires justes, puis j'orchestre leur collaboration." },
      { title: "Coordonner", text: "Le jour J, je veille en coulisses sur le moindre détail. Vous n'avez qu'à savourer." },
    ],
    hues: ["var(--sauge)", "var(--soleil)"],
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
    pitch:
      "Un mariage cohérent se ressent avant de se comprendre. En wedding designer, je compose une direction artistique complète — palette, matières, lumière, fleurs, papeterie — pour que chaque espace raconte la même histoire : la vôtre. Rien de plaqué, tout est pensé pour vous ressembler.",
    forWho:
      "Pour les couples qui rêvent d'une esthétique forte et cohérente, sans fausse note.",
    approach: [
      { title: "Ressentir", text: "J'écoute vos références, vos couleurs de cœur, ce qui vous émeut. Le concept naît de là." },
      { title: "Dessiner", text: "Je traduis l'intention en planches, palettes et plans de scénographie précis." },
      { title: "Sublimer", text: "Je pilote les artisans et installe le décor pour révéler le lieu le jour venu." },
    ],
    hues: ["var(--blush)", "var(--terracotta)"],
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

export type Post = {
  slug: string;
  category: string;
  title: string;
  date: string;
  readingTime: string;
  hues: [string, string];
  excerpt: string;
  body: string[];
};

// [À VALIDER] — articles d'illustration pour le blog (contenus rédigés par le studio).
export const posts: Post[] = [
  {
    slug: "palette-mariage-solaire",
    category: "Inspirations",
    title: "Composer une palette solaire sans tomber dans le criard",
    date: "2026-06-12",
    readingTime: "5 min",
    hues: ["var(--soleil)", "var(--terracotta)"],
    excerpt:
      "Le soleil du Sud invite aux couleurs chaudes — encore faut-il les accorder avec justesse. Voici ma méthode pour une palette lumineuse et raffinée.",
    body: [
      "Une palette solaire réussie ne crie pas : elle réchauffe. Tout l'enjeu est de doser l'intensité pour que le jaune, le corail et le rose se répondent sans se disputer l'attention.",
      "Ma règle de départ : une base crème ou ivoire qui occupe la majorité de l'espace, deux teintes secondaires — un blush poudré et un jaune doux —, puis des accents plus soutenus, terracotta ou or, à la dose homéopathique.",
      "Pensez aussi à la matière : le lin, le rotin et la cire adoucissent les couleurs vives, tandis qu'un filet doré très fin apporte le précieux sans jamais surcharger.",
      "Enfin, testez toujours votre palette à la lumière du lieu, à l'heure de votre cérémonie. Le soleil de fin d'après-midi transforme tout — et c'est souvent là que la magie opère.",
    ],
  },
  {
    slug: "choisir-son-lieu-herault",
    category: "Conseils",
    title: "Choisir son lieu de mariage dans l'Hérault : 6 questions à se poser",
    date: "2026-05-03",
    readingTime: "7 min",
    hues: ["var(--sauge)", "var(--miel)"],
    excerpt:
      "Domaine, mas provençal, orangerie, bord de mer… Le lieu donne le ton de tout le mariage. Six questions pour trouver le vôtre sans se tromper.",
    body: [
      "Le lieu n'est pas qu'un décor : c'est le cadre logistique et émotionnel de votre journée. Avant de tomber amoureux d'un domaine, prenez le temps de vous poser les bonnes questions.",
      "Combien serez-vous, vraiment ? La capacité conditionne tout le reste. Un lieu trop grand se ressent autant qu'un lieu trop petit.",
      "Quelle autonomie souhaitez-vous ? Certains lieux imposent leurs prestataires, d'autres vous laissent une liberté totale. Ni bien ni mal — cela dépend de votre projet.",
      "Y a-t-il un plan B en cas de pluie ? Dans l'Hérault, les soirées sont douces, mais un abri de repli élégant reste indispensable.",
      "Pensez enfin à la lumière, aux accès, à l'hébergement des proches. Ces détails, invisibles au coup de cœur, font toute la fluidité du jour J.",
    ],
  },
  {
    slug: "coulisses-jour-j",
    category: "Coulisses",
    title: "Dans les coulisses d'un jour J parfaitement orchestré",
    date: "2026-04-18",
    readingTime: "4 min",
    hues: ["var(--blush)", "var(--rose-poudre)"],
    excerpt:
      "Ce que vous ne voyez pas le jour J : le ballet millimétré qui vous laisse, vous, entièrement disponible pour vivre chaque instant.",
    body: [
      "Un mariage fluide est un mariage invisible — dans le sens où l'organisation ne se voit jamais. C'est précisément là que se joue mon métier.",
      "Dès le matin, je coordonne les livraisons, l'installation du décor, l'accueil des prestataires. Chacun connaît son heure et son rôle grâce à un déroulé minuté partagé en amont.",
      "Pendant la journée, je reste en coulisses : anticiper le grain de sable, ajuster le timing, résoudre l'imprévu avant même qu'il ne vous atteigne.",
      "Le plus beau compliment ? Quand les mariés me disent qu'ils n'ont eu à penser à rien. C'est tout l'objet de ma présence : que vous soyez, ce jour-là, simplement heureux.",
    ],
  },
];

export const prestationOptions = [
  "Wedding Planner (organisation)",
  "Wedding Designer (décoration)",
  "Les deux",
  "Je ne sais pas encore",
];
