# Design du back-office

> **Statut : 3 directions proposées, en attente d'arbitrage.** Une seule sera implémentée ; les deux
> autres seront supprimées de ce document, pas conservées « au cas où ».

Le produit vend du design : l'interface qui sert à en fabriquer ne peut pas ressembler à un template.
Ce document fixe d'abord ce qui ne dépend pas de la direction retenue (§1 à §5), puis les trois
directions (§6).

---

## 1. Interdits (PARTIE 10) et comment ils sont tenus

| Interdit | Garde-fou |
|---|---|
| Inter / Roboto / system-ui comme police de marque | Le catalogue du back-office est fermé et déclaré dans `packages/ui`. Aucune de ces trois familles n'y figure. `system-ui` reste autorisé pour les seuls `input` natifs de secours. |
| Dégradés violet → bleu sur fond blanc | Aucun token de dégradé dans `--ui-*`. Un dégradé ne peut exister que déclaré explicitement, jamais par défaut. |
| Cartes arrondies génériques empilées | Rayon maximal 6 px, hiérarchie portée par les filets et la densité, pas par l'empilement de boîtes. |
| Emojis en guise d'icônes | Lucide uniquement, trait 1,5 px, tailles 16/20/24. Une règle ESLint interdit les emojis dans le JSX de `apps/web` et `packages/ui`. |
| Écrans vides sans illustration ni action | Le composant `<EmptyState>` **exige** un visuel et au moins une action (props obligatoires). Un écran vide sans action ne compile pas. |

---

## 2. Système de mouvement

| Token | Valeur | Usage |
|---|---|---|
| `--ui-ease` | `cubic-bezier(.2, .8, .2, 1)` | défaut : départ franc, arrivée amortie |
| `--ui-ease-out` | `cubic-bezier(.16, 1, .3, 1)` | entrées de panneaux, popovers |
| `--ui-duration-fast` | `150 ms` | hover, focus, pression |
| `--ui-duration` | `200 ms` | ouvertures, bascules, toasts |
| `--ui-duration-slow` | `250 ms` | panneaux latéraux, dialogues |

Règles : rien au-delà de 250 ms ; `prefers-reduced-motion` réduit tout à 0 ms sauf les changements
d'opacité ; **jamais de spinner** — squelettes calqués sur la forme du contenu attendu ; feedback
optimiste immédiat sur toute action, réconciliation silencieuse, rollback + toast en cas d'échec.

---

## 3. Matrice d'états — obligatoire pour chaque composant

`default · hover · focus-visible · active · disabled · loading · error · selected`

- Focus visible **toujours** : anneau 2 px décalé de 2 px, couleur accent, jamais `outline: none`.
- `disabled` : opacité 0,45 + `cursor: not-allowed`, jamais un simple gris qui se confond avec du texte secondaire.
- `loading` : le contrôle garde sa largeur (pas de saut de layout), le libellé est remplacé par un squelette de même métrique.
- La revue d'un composant vérifie les 8 états ; un composant qui n'en traite que quatre n'est pas terminé.

---

## 4. Densité et responsive

Le back-office est un outil, pas une landing page : la densité est un choix, pas un accident.

| Contexte | Texte | Hauteur de contrôle | Interligne |
|---|---|---|---|
| Panneaux de l'éditeur (inspecteur, calques) | 13 px | 28 px | 1,4 |
| Dashboard, réglages | 14 px | 36 px | 1,5 |
| Titres de section | 16–28 px | — | 1,2 |

Échelle d'espacement 4 px. Gouttière de panneau 12 px, respiration de section 24 px.

**Responsive (PARTIE 10)** : l'éditeur est utilisable à partir de **1280 px** ; en dessous, un écran
d'invitation à passer sur desktop — pas une version dégradée, une page assumée qui explique pourquoi,
propose l'aperçu du site et le retour au dashboard. Dashboard, réglages, facturation et médias sont
pleinement responsives jusqu'à 375 px.

---

## 5. Chrome sombre, canvas clair

L'UI ne concurrence jamais le site en cours d'édition :
- le chrome de l'éditeur reste sombre et désaturé quelle que soit la direction retenue ;
- le canvas est posé sur un fond neutre, avec une ombre portée minimale pour le détacher ;
- aucune couleur d'accent du back-office ne déborde dans le canvas — seuls les overlays de sélection
  l'utilisent, en trait fin ;
- espaces de noms de tokens disjoints (`--ui-*` / `--site-*`), imposé par ADR-016.

---

## 6. Les trois directions

Toutes les polices citées sont libres d'usage commercial et auto-hébergeables (OFL ou Fontshare),
conformément à ADR-012.

---

### Direction A — « Atelier » *(instrument de précision — correspond à ton inclination)*

Un outil d'atelier : encre chaude, filets nets, un seul accent qui signale l'action. La référence
est l'instrument de mesure — Braun, aviation, table de montage — pas le SaaS générique.

**Palette**
| Rôle | Valeur |
|---|---|
| Fond | `#0D0C0B` (neutre chaud, teinte ~35°, saturation ~4 %) |
| Surfaces | `#131211` → `#191715` → `#201E1B` (3 niveaux, jamais plus) |
| Filet | `rgba(245, 241, 236, .09)` — 1 px, jamais 2 |
| Texte | `#F5F1EC` · secondaire `#A8A19A` · tertiaire `#6E6862` |
| Accent | **vermillon `#FF4D14`**, texte sur accent `#0D0C0B` (contraste 6,6:1) |
| Fonctionnels | succès `#3FB950` · alerte `#E3A008` · danger `#F04438` |

**Typographie** — Cabinet Grotesk (titres, 500/700, interlettrage −0,02 em) · Switzer (UI, 400/500/600)
· Martian Mono (valeurs numériques : dimensions, tokens, coordonnées, chiffres tabulaires).

**Formes** — rayons 2 / 4 / 6 px, `full` réservé aux avatars. Ombres quasi absentes : la profondeur
vient des filets et des trois niveaux de surface ; une seule ombre autorisée pour les surfaces
flottantes (`0 8px 24px -12px rgba(0,0,0,.6)`).

**Signature** — le mono sur toutes les valeurs numériques. Un inspecteur où « 24 px », « #FF4D14 » et
« 1440 × 900 » s'alignent en chiffres tabulaires *lit* comme un instrument, et c'est ce qui sépare
visuellement cet outil d'un CMS.

**Risque** — un accent chaud très saturé peut vibrer sur fond chaud ; il est donc réservé à l'action
primaire, à la sélection et au focus, et interdit en surface de remplissage large.

---

### Direction B — « Papier » *(éditorial suisse contemporain)*

Le back-office comme un studio de design : fond papier chaud, hiérarchie portée par la typographie
plutôt que par des boîtes, filets d'imprimeur, un seul bleu d'encre. L'éditeur, lui, garde son chrome
sombre (§5).

**Palette**
| Rôle | Valeur |
|---|---|
| Fond | `#FBF8F3` (papier chaud) · surface `#FFFFFF` |
| Filet | `#E4DED4` — 1 px |
| Texte | `#16130F` · secondaire `#6B6259` · tertiaire `#988E82` |
| Accent | **bleu d'imprimerie `#1B34C7`**, texte sur accent `#FFFFFF` |
| Chrome éditeur | `#14110D` avec les mêmes filets, inversés |
| Fonctionnels | succès `#1F7A4C` · alerte `#B26A00` · danger `#C0311F` |

**Typographie** — Instrument Serif (titres, italique disponible, très caractériel) · Instrument Sans
(UI) · JetBrains Mono (données).

**Formes** — rayons 2 px, filets 1 px, aucune ombre portée sauf sur les surfaces flottantes.
Beaucoup de blanc, échelle typographique large (16 → 32 px) pour hiérarchiser sans encadrer.

**Signature** — une interface qui ressemble à une maquette d'imprimeur. Très forte personnalité de
marque, excellente en captures d'écran et en page d'accueil.

**Risque** — assumé et réel : deux registres cohabitent (dashboard clair, éditeur sombre). C'est
défendable — le dashboard est un lieu de lecture, l'éditeur un lieu de travail — mais cela double le
système de tokens et le coût de chaque composant. En sessions longues, un dense panneau clair fatigue
davantage.

---

### Direction C — « Console » *(brutaliste technique)*

Grille visible, zéro rayon, mono en tête, accent phosphore. Le parti pris le plus tranché.

**Palette**
| Rôle | Valeur |
|---|---|
| Fond | `#08090A` · surfaces `#0E1011` → `#141718` |
| Filet | `#1C2022` — 1 px, omniprésent, grille apparente |
| Texte | `#E6EAEA` · secondaire `#8A9394` |
| Accent | **acide `#C9F31D`**, texte sur accent `#08090A` |
| Fonctionnels | succès `#3DDC84` · alerte `#FFB627` · danger `#FF5A52` |

**Typographie** — Departure Mono (libellés, données, micro-titres capitales espacées) · General Sans
(prose et champs longs).

**Formes** — rayon 0 partout, aucune ombre, séparateurs plein cadre, libellés en capitales à fort
interlettrage.

**Signature** — mémorable immédiatement, et impossible à confondre avec un concurrent.

**Risque** — le plus élevé des trois, et il est produit avant d'être esthétique : la cible est
explicitement **non technique** (PARTIE 1). Une interface qui évoque un terminal peut intimider
exactement les utilisateurs qu'on cherche à servir. Les capitales à fort interlettrage supportent
par ailleurs mal les libellés français longs et les diacritiques. Je la propose parce qu'elle est
défendable, pas parce que je la recommande.

---

## 7. Recommandation

**Direction A.** Elle correspond à ton inclination, elle est la seule des trois à faire de la densité
une qualité plutôt qu'une contrainte, et son chrome sombre unique évite le double système de tokens
de la direction B. Le mono sur les valeurs numériques lui donne une signature propre sans coûter en
lisibilité.

Si tu veux une marque plus affirmée sur le marketing, une piste hybride existe : direction A dans le
produit, registre éditorial de la direction B pour le site public et l'onboarding. À valider
explicitement — je ne l'implémenterai pas de moi-même.

---

## 8. Ce qui sera écrit dès la direction validée

- `packages/ui/src/styles/tokens.css` — tous les `--ui-*` (couleurs, densité, rayons, mouvement).
- `packages/ui/src/styles/fonts.ts` — polices du back-office, `next/font/local`, subset latin.
- `docs/DESIGN.md` — réduit à la seule direction retenue, enrichi des specs par composant.
- Une page `/design-system` en développement uniquement (exclue du build de production), qui affiche
  chaque composant dans ses 8 états — c'est le seul moyen de vérifier la matrice §3 sans la relire à
  la main à chaque revue.
