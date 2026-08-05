# Design du back-office — direction « Atelier »

> **Statut : direction validée et implémentée** (tokens en place depuis la phase 0).
> Les directions « Papier » et « Console » ont été écartées ; elles ne sont pas conservées ici,
> une alternative non retenue qui traîne dans un document finit par être reprise par erreur.

Le produit vend du design : l'interface qui sert à en fabriquer ne peut pas ressembler à un template.

**Le parti pris.** Un outil d'atelier : encre chaude, filets nets, un seul accent qui signale
l'action. La référence est l'instrument de mesure — Braun, aviation, table de montage — pas le SaaS
générique. La densité y est une qualité, pas une contrainte subie.

---

## 1. Interdits (PARTIE 10) et comment ils sont tenus

| Interdit                                          | Garde-fou                                                                                                                                                                             |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Inter / Roboto / system-ui comme police de marque | Catalogue fermé, déclaré dans `packages/ui/src/styles/fonts.ts`. Aucune de ces familles n'y figure.                                                                                   |
| Dégradés violet → bleu sur fond blanc             | Aucun token de dégradé dans `--ui-*`. Un dégradé ne peut exister que déclaré explicitement.                                                                                           |
| Cartes arrondies génériques empilées              | Rayon maximal 6 px. La hiérarchie vient des filets et de la densité, pas de l'empilement de boîtes.                                                                                   |
| Emojis en guise d'icônes                          | Lucide uniquement, trait 1,5 px, tailles 16/20/24. La règle ESLint `atelier/no-emoji-jsx` échoue le lint dans `apps/web` et `packages/ui`.                                            |
| Écrans vides sans illustration ni action          | Le composant `<EmptyState>` exigera un visuel et au moins une action en props obligatoires : un écran vide sans action ne compilera pas. _(à implémenter avec le composant, phase 1)_ |

---

## 2. Palette

Implémentée dans `packages/ui/src/styles/tokens.css`, seul fichier du dépôt autorisé à écrire des
valeurs de couleur en dur (ADR-003).

| Rôle             | Token                                       | Valeur                        |
| ---------------- | ------------------------------------------- | ----------------------------- |
| Fond             | `--ui-bg`                                   | `#0D0C0B`                     |
| Surfaces         | `--ui-surface-1/2/3`                        | `#131211` `#191715` `#201E1B` |
| Canvas d'édition | `--ui-canvas-bg`                            | `#EDEAE5`                     |
| Filets           | `--ui-border`, `--ui-border-strong`         | blanc cassé à 9 % / 16 %      |
| Texte            | `--ui-text` / `-muted` / `-subtle`          | `#F5F1EC` `#A8A19A` `#6E6862` |
| Accent           | `--ui-accent` / `-hover` / `-active`        | `#FF4D14` `#FF6B3D` `#E23F0B` |
| Sur accent       | `--ui-text-on-accent`                       | `#0D0C0B` (contraste 6,6:1)   |
| Fonctionnels     | `--ui-success` `--ui-warning` `--ui-danger` | `#3FB950` `#E3A008` `#F04438` |

Neutre **chaud** (teinte ~35°, saturation ~4 %) : trois niveaux de surface, jamais plus — au-delà,
la hiérarchie devient illisible.

L'accent est réservé à l'action primaire, à la sélection et au focus. **Interdit en surface de
remplissage large** : un vermillon très saturé vibre sur un fond chaud.

---

## 3. Typographie

| Usage              | Famille         | Token               | Source                            |
| ------------------ | --------------- | ------------------- | --------------------------------- |
| Titres             | Cabinet Grotesk | `--ui-font-display` | Fontshare, usage commercial libre |
| Interface dense    | Switzer         | `--ui-font-sans`    | Fontshare, usage commercial libre |
| Valeurs numériques | Martian Mono    | `--ui-font-mono`    | SIL Open Font License             |

Auto-hébergées via `next/font/local` (ADR-012), subset latin, `display: swap`, préchargées.
Rafraîchies par `pnpm fonts:fetch`.

**La signature de la direction** : le mono sur toutes les valeurs numériques. Un inspecteur où
« 24 px », « #FF4D14 » et « 1440 × 900 » s'alignent en chiffres tabulaires _lit_ comme un
instrument — c'est ce qui sépare visuellement cet outil d'un CMS. Utilitaire `.numeric`
(`font-variant-numeric: tabular-nums`).

Échelle : `--ui-text-micro` 11 px (libellés de section, capitales espacées) · `xs` 12 · `dense` 13
(panneaux de l'éditeur) · `base` 14 (dashboard) · `md` 16 · `lg` 20 · `xl` 24 · `2xl` 28.
Interlettrage des titres : −0,02 em.

---

## 4. Formes

Rayons **2 / 4 / 6 px**, `full` réservé aux avatars. Filets 1 px, jamais 2. Ombres quasi absentes :
la profondeur vient des filets et des trois niveaux de surface. Une seule ombre autorisée, pour les
surfaces flottantes — `--ui-shadow-float`.

---

## 5. Mouvement

| Token                | Valeur                        | Usage                                  |
| -------------------- | ----------------------------- | -------------------------------------- |
| `--ui-ease`          | `cubic-bezier(.2, .8, .2, 1)` | défaut : départ franc, arrivée amortie |
| `--ui-ease-out`      | `cubic-bezier(.16, 1, .3, 1)` | entrées de panneaux, popovers          |
| `--ui-duration-fast` | `150ms`                       | hover, focus, pression                 |
| `--ui-duration`      | `200ms`                       | ouvertures, bascules, toasts           |
| `--ui-duration-slow` | `250ms`                       | panneaux latéraux, dialogues           |

Rien au-delà de 250 ms. `prefers-reduced-motion` ramène les trois durées à 0 ms — on annule le
mouvement, pas les transitions d'opacité, qui restent perceptibles et utiles.

**Jamais de spinner** : des squelettes calqués sur la forme du contenu attendu. Feedback optimiste
immédiat sur toute action, réconciliation silencieuse, rollback accompagné d'un toast en cas
d'échec.

---

## 6. Matrice d'états — obligatoire par composant

`default · hover · focus-visible · active · disabled · loading · error · selected`

- Focus **toujours** visible : anneau `--ui-focus-ring` (2 px) décalé de 2 px, couleur accent.
  `outline: none` sans remplacement est un bug d'accessibilité, pas un choix esthétique.
- `disabled` : opacité 0,45 et `cursor: not-allowed` — jamais un gris qui se confond avec du texte
  secondaire.
- `loading` : le contrôle garde sa largeur, le libellé est remplacé par un squelette de même
  métrique. Pas de saut de layout.
- Un composant qui ne traite que quatre états n'est pas terminé.

Vérifiable sur `/design-system`, exclue de la production. Elle affiche aujourd'hui les tokens ;
elle accueillera chaque composant dans ses 8 états à partir de la phase 1.

---

## 7. Densité et responsive

| Contexte                                    | Texte    | Hauteur de contrôle | Interligne |
| ------------------------------------------- | -------- | ------------------- | ---------- |
| Panneaux de l'éditeur (inspecteur, calques) | 13 px    | 28 px               | 1,4        |
| Dashboard, réglages                         | 14 px    | 36 px               | 1,5        |
| Titres de section                           | 16–28 px | —                   | 1,2        |

Échelle d'espacement 4 px. Gouttière de panneau 12 px, respiration de section 24 px.

**Responsive** : l'éditeur est utilisable à partir de **1280 px** ; en dessous, un écran
d'invitation à passer sur desktop — assumé, pas dégradé : il explique pourquoi, propose l'aperçu du
site et le retour au dashboard. Dashboard, réglages, facturation et médiathèque sont pleinement
responsives jusqu'à 375 px.

---

## 8. Chrome sombre, canvas clair

L'UI ne concurrence jamais le site en cours d'édition :

- le chrome de l'éditeur reste sombre et désaturé ;
- le canvas est posé sur `--ui-canvas-bg`, avec une ombre portée minimale pour le détacher ;
- aucune couleur d'accent du back-office ne déborde dans le canvas — seuls les overlays de
  sélection l'utilisent, en trait fin ;
- espaces de noms disjoints `--ui-*` / `--site-*` (ADR-016), et l'iframe du canvas ne reçoit que
  les `--site-*`.

---

## 9. Écrit à ce jour

- `packages/ui/src/styles/tokens.css` — l'ensemble des `--ui-*`.
- `packages/ui/src/styles/fonts.ts` + `fonts/*.woff2` — les trois familles, auto-hébergées.
- `apps/web/src/app/globals.css` — pont vers les utilitaires Tailwind v4 (`@theme inline`),
  focus visible global, utilitaire `.numeric`.
- `apps/web/src/app/[locale]/design-system/page.tsx` — revue des tokens, développement uniquement.

Reste à écrire en phase 1 : les composants de `packages/ui` et leurs 8 états, l'`<EmptyState>` à
props obligatoires, et les squelettes.
