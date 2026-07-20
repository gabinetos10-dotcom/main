/**
 * MINI-JEU « Composez votre univers » — données & générateur.
 * -----------------------------------------------------------------------------
 * Chaque choix porte un triplet de couleurs (issu de la palette de marque) qui
 * pilote EN DIRECT le fond du site (mesh + pétales) : le site réagit au goût de
 * l'utilisateur → démonstration live du savoir-faire « design ».
 *
 * Les textes générés sont rédigés dans la voix de Mélina. // [À VALIDER]
 */

export type MoodMotif =
  | "olivier"
  | "pampa"
  | "rose"
  | "saison"
  | "sceau"
  | "calligraphie"
  | "ruban"
  | "calque"
  | "domaine"
  | "mas"
  | "mer"
  | "orangerie";

export type MoodOption = {
  id: string;
  label: string;
  hint: string;
  /** Triplet [mood-1, mood-2, mood-3] appliqué au fond quand pertinent. */
  colors?: [string, string, string];
  motif?: MoodMotif;
};

export type MoodStepKey = "ambiance" | "palette" | "fleurs" | "lieu" | "papeterie";

export type MoodStep = {
  key: MoodStepKey;
  index: number;
  title: string;
  question: string;
  options: MoodOption[];
};

export const moodSteps: MoodStep[] = [
  {
    key: "ambiance",
    index: 1,
    title: "L'ambiance",
    question: "Quelle atmosphère fait battre votre cœur ?",
    options: [
      {
        id: "boheme",
        label: "Bohème",
        hint: "Pampa, tons chauds, liberté",
        colors: ["var(--miel)", "var(--terracotta)", "var(--sauge)"],
      },
      {
        id: "minerale",
        label: "Élégance minérale",
        hint: "Pierre, lin, épure douce",
        colors: ["var(--sauge)", "var(--creme)", "var(--rose-poudre)"],
      },
      {
        id: "romantique",
        label: "Romantique jardin",
        hint: "Roses, verdure, tendresse",
        colors: ["var(--blush)", "var(--rose-poudre)", "var(--sauge)"],
      },
      {
        id: "solaire",
        label: "Solaire méditerranéen",
        hint: "Soleil du Sud, olivier, or",
        colors: ["var(--soleil)", "var(--terracotta)", "var(--miel)"],
      },
    ],
  },
  {
    key: "palette",
    index: 2,
    title: "La palette",
    question: "Accordons les couleurs de votre journée.",
    options: [
      {
        id: "poudre-dore",
        label: "Poudré & doré",
        hint: "Blush, miel, filets d'or",
        colors: ["var(--blush)", "var(--miel)", "var(--soleil)"],
      },
      {
        id: "terre-soleil",
        label: "Terre & soleil",
        hint: "Terracotta, soleil, sauge",
        colors: ["var(--terracotta)", "var(--soleil)", "var(--sauge)"],
      },
      {
        id: "blanc-vert",
        label: "Blanc, vert, lumière",
        hint: "Crème, eucalyptus, clarté",
        colors: ["var(--creme)", "var(--sauge)", "var(--soleil)"],
      },
      {
        id: "corail-pampa",
        label: "Corail & pampa",
        hint: "Corail chaud, rose, miel",
        colors: ["var(--terracotta)", "var(--blush)", "var(--miel)"],
      },
    ],
  },
  {
    key: "fleurs",
    index: 3,
    title: "Les fleurs",
    question: "Quelle verdure racontera votre histoire ?",
    options: [
      { id: "pampa", label: "Pampa", hint: "Souffle bohème", motif: "pampa" },
      { id: "olivier", label: "Olivier", hint: "Racines du Sud", motif: "olivier" },
      { id: "roses", label: "Roses de jardin", hint: "Romance ancienne", motif: "rose" },
      { id: "saison", label: "Fleurs de saison", hint: "Justesse & local", motif: "saison" },
    ],
  },
  {
    key: "lieu",
    index: 4,
    title: "Le lieu",
    question: "Où poserez-vous votre « oui » ?",
    options: [
      { id: "domaine", label: "Domaine", hint: "Grandes tablées", motif: "domaine" },
      { id: "mas", label: "Mas provençal", hint: "Pierres chaudes", motif: "mas" },
      { id: "mer", label: "Bord de mer", hint: "Lumière & sel", motif: "mer" },
      { id: "orangerie", label: "Orangerie", hint: "Verrière & verdure", motif: "orangerie" },
    ],
  },
  {
    key: "papeterie",
    index: 5,
    title: "Les détails",
    question: "La touche précieuse qui signe l'ensemble.",
    options: [
      { id: "sceau", label: "Sceau de cire", hint: "Serment scellé", motif: "sceau" },
      { id: "calligraphie", label: "Calligraphie", hint: "Encre & main", motif: "calligraphie" },
      { id: "ruban", label: "Ruban de soie", hint: "Mouvement doux", motif: "ruban" },
      { id: "calque", label: "Calque & dentelle", hint: "Transparence", motif: "calque" },
    ],
  },
];

export type MoodSelection = Partial<Record<MoodStepKey, MoodOption>>;

const styleNames: Record<string, string> = {
  boheme: "Bohème solaire",
  minerale: "Élégance minérale",
  romantique: "Romance de jardin",
  solaire: "Solaire méditerranéen",
};

const fleursPhrase: Record<string, string> = {
  pampa: "la pampa qui ondule comme un soupir",
  olivier: "l'olivier, mémoire tranquille du Sud",
  roses: "des roses de jardin cueillies pour vous",
  saison: "des fleurs de saison, justes et vivantes",
};

const lieuPhrase: Record<string, string> = {
  domaine: "un domaine où les tablées s'étirent jusqu'au soir",
  mas: "un mas aux pierres réchauffées par le soleil",
  mer: "un bord de mer lavé de lumière et de sel",
  orangerie: "une orangerie baignée d'une verdure de verre",
};

const papeteriePhrase: Record<string, string> = {
  sceau: "un sceau de cire qui scelle votre promesse",
  calligraphie: "une calligraphie tracée à la main, à l'encre",
  ruban: "des rubans de soie pour laisser danser le mouvement",
  calque: "des calques et dentelles, comme un voile de tendresse",
};

/**
 * Génère le nom du style + un court texte signé Mélina à partir des choix.
 * // [À VALIDER]
 */
export function generateMoodboard(selection: MoodSelection) {
  const ambiance = selection.ambiance?.id ?? "solaire";
  const styleName = styleNames[ambiance] ?? "Votre univers sur-mesure";

  const bits: string[] = [];
  if (selection.fleurs?.motif) bits.push(fleursPhrase[selection.fleurs.motif] ?? "");
  if (selection.lieu?.motif) bits.push(lieuPhrase[selection.lieu.motif] ?? "");
  if (selection.papeterie?.motif)
    bits.push(papeteriePhrase[selection.papeterie.motif] ?? "");

  const woven = bits.filter(Boolean).join(", ");

  const text =
    `Votre mariage respire déjà. J'y vois ${woven || "une lumière qui vous ressemble"}. ` +
    `Une célébration ${styleName.toLowerCase()}, cohérente et sensible — pensée avec le cœur, ` +
    `pour vous et ceux que vous aimez.`;

  return { styleName, text, signature: "Mélina" };
}

/** Retourne le triplet de couleurs actif à partir de la sélection courante. */
export function moodColors(selection: MoodSelection): [string, string, string] {
  return (
    selection.palette?.colors ??
    selection.ambiance?.colors ?? ["var(--blush)", "var(--soleil)", "var(--sauge)"]
  );
}
