# Calque — spécification produit

> Source de vérité du projet. Copie intégrale du cahier des charges initial.
> Toute divergence entre le code et ce document doit être tranchée ici d'abord,
> puis reportée dans `DECISIONS.md`.

---

## 1. Rôle

Lead engineer full-stack et architecte produit. Construction seule, de A à Z, d'un
SaaS multi-tenant production-ready. TypeScript strict, testé, documenté, en français
dans l'interface et les commentaires métier.

**Autonomie :** aucune question de configuration. Toutes les décisions structurantes
sont figées au §3. Pour toute décision secondaire non couverte, trancher soi-même,
appliquer le choix le plus standard et le plus maintenable, et le journaliser en une
ligne dans `docs/DECISIONS.md` (format : date · décision · alternative écartée ·
raison). Ne jamais bloquer en attente d'une réponse, sauf aux points de validation de
phase prévus au §22.

---

## 2. Le produit

**Calque** — _« Vos clients modifient leur site. Vous gardez le code. »_

L'agence dépose le ZIP d'un site déjà livré (généré en vibe coding). Le système
**analyse le HTML**, **détecte automatiquement ce qui est modifiable** (textes, images,
liens, couleurs, blocs répétables, SEO), verrouille tout le reste, et génère un
**éditeur visuel** que le client final utilise en autonomie. À la publication, le site
est **régénéré à l'identique** avec les nouveaux contenus, puis redéployé.

Le nom vient de l'architecture : le contenu du client est un **calque** posé par-dessus
le code source, jamais une modification de celui-ci.

**Différenciateur, à ne jamais perdre de vue.** Contrairement à Webflow, Framer,
Builder.io ou Plasmic, on ne demande **jamais** de réauthorer le site dans un format
propriétaire. On part du HTML tel qu'il a été livré, sans refactoring, sans convention
imposée. C'est tout le produit. Toute décision technique qui trahit ce principe est à
rejeter.

**Art antérieur à étudier avant de coder** (inspiration, pas dépendance) : Decap CMS
(annotations), TinaCMS (contextual editing), Puck, Silex, Pinegrow. Rédiger
`docs/ADR-001-approche-technique.md` justifiant l'approche retenue face à ces outils.

**Identité de marque** (pages marketing et interface) : ton sobre, artisanal, rassurant,
français. Palette : encre `#151A21`, papier `#FAF8F4`, accent bleu profond `#2F5CE0`,
accent chaud `#E0703A`. Typo : `Inter` pour l'interface, `Instrument Serif` pour les
titres marketing. Pas de dégradé violet, pas d'esthétique « IA générique ».

---

## 3. Paramètres figés

```yaml
nom_produit: Calque
repo: calque
agence: GJS
domaine_app: app.calque.studio
domaine_marketing: calque.studio
domaine_preview: "*.calque-preview.site" # eTLD+1 distinct : isolation totale des cookies
sites_cibles: statiques HTML/CSS/JS, multi-pages ou one-page, Tailwind CDN ou CSS custom
langues_ui: [fr (défaut), en]
hebergement_app: Vercel
hebergement_sites: Cloudflare Pages (Direct Upload API) — adaptateur Netlify prévu mais non prioritaire
base_de_donnees: Neon Postgres (serverless, branching)
orm: Drizzle
auth: Auth.js v5 — magic link (Resend) + Google
stockage: Cloudflare R2 (S3-compatible, zéro frais d'egress)
jobs_async: Trigger.dev v3
emails: Resend
paiement: Stripe (Checkout + portail client + webhooks)
observabilite: Sentry + pino
region_donnees: Union européenne, exclusivement
```

**Tarification à implémenter :**

| Plan   | Prix       | Sites    | Sièges   | Stockage | Publications/mois | Crédits IA/mois |
| ------ | ---------- | -------- | -------- | -------- | ----------------- | --------------- |
| Solo   | 29 €/mois  | 1        | 3        | 2 Go     | 50                | 100             |
| Studio | 79 €/mois  | 10       | 15       | 20 Go    | 500               | 1 000           |
| Agence | 199 €/mois | illimité | illimité | 100 Go   | illimité          | 5 000           |

Marque blanche (logo, couleur d'accent, domaine, emails à l'entête de l'agence) : plan
Agence uniquement. Essai gratuit 14 jours sans carte.

---

## 4. Stack technique imposée

```
App              Next.js 15 (App Router) · TypeScript strict · Tailwind · shadcn/ui
État éditeur     Zustand + Immer (undo/redo par patches)
Backend          Route Handlers + Server Actions
BDD              Neon Postgres + Drizzle + migrations versionnées
Parsing HTML     parse5 + cheerio — jamais de regex sur du HTML
CSS              postcss + postcss-value-parser (extraction des custom properties)
Images           sharp — webp/avif, srcset 400/800/1200/1600
Runtime éditeur  package séparé, TS vanilla, bundlé esbuild en IIFE, budget < 40 kB gz
Drag & drop      dnd-kit
Recadrage        react-easy-crop
i18n             next-intl
Tests            Vitest (parser, builder, logique métier) + Playwright (E2E)
Monorepo         pnpm workspaces + Turborepo
IA               API Anthropic, modèle claude-sonnet-4-6, serveur uniquement
```

**Règles dures.** `strict: true`, zéro `any` non justifié en commentaire, Zod à toutes
les frontières (API, jobs, postMessage, parsing), aucune clé secrète côté client,
`pnpm typecheck && pnpm test && pnpm build` vert avant chaque commit.

---

## 5. Architecture

```
[Admin / Client] → Next.js (Vercel) ─┬→ Neon Postgres  (blueprint, contenus, versions)
                                     ├→ R2             (sources immuables, médias, builds)
                                     └→ Trigger.dev ─┬→ INGEST : unzip → parse → blueprint.json
                                                     ├→ BUILD  : source + calque → HTML final
                                                     └→ DEPLOY : Cloudflare Pages Direct Upload

[Éditeur]  panneau React ⇄ postMessage typé ⇄ iframe (*.calque-preview.site + editor-runtime.js)
```

**Principe architectural non négociable — le source immuable.**

Les fichiers déposés par l'agence ne sont **jamais mutés**. Ils sont stockés en lecture
seule. Toute modification du client est un **patch de contenu** en JSON. Le site publié
est le résultat d'une fonction pure :

```
build(source_immuable, blueprint, contenu) → site_final
```

Conséquences : historique gratuit, rollback instantané, re-livraison d'un nouveau design
sans perte des contenus, corruption du site original impossible.

---

## 6. Périmètre

**Dans le MVP** — ingestion ZIP/dossier · détection automatique des champs éditables et
verrouillage du reste · éditeur visuel contextuel · ajout / duplication / suppression /
réordonnancement dans les collections détectées · médias (upload, recadrage,
optimisation, srcset) · thème (couleurs, polices) · SEO par page · brouillon /
publication / historique / rollback · multi-tenant, rôles, invitations, quotas ·
déploiement automatique · réconciliation lors d'une re-livraison de design.

**Hors périmètre — ne pas coder** : édition libre du layout au pixel · édition du CSS
brut par le client · sites avec build step (React/Next/Vite — voir §25) · e-commerce ·
blog avec base d'articles · éditeur de code intégré · constructeur de site from scratch.

---

## 7. Personas & parcours

| Persona                  | Besoin                                                            | Parcours                                                              |
| ------------------------ | ----------------------------------------------------------------- | --------------------------------------------------------------------- |
| **Admin agence**         | Onboarder un client en moins de 10 minutes                        | ZIP → relire la détection → renommer/verrouiller → inviter            |
| **Client final**         | Changer un texte, une photo, ajouter un service, sans rien casser | Lien magique → clic sur le texte dans l'aperçu → frappe → « Publier » |
| **Collaborateur client** | Contribuer sans publier                                           | Rôle `editor` → brouillon → l'owner publie                            |

**Le moment magique, à optimiser en priorité :** entre le dépôt du ZIP et le premier
aperçu éditable, **moins de 60 secondes** et **zéro configuration manuelle**.

---

## 8. Module 1 — Ingestion

Entrée : ZIP (drag & drop, 100 Mo max) ou dossier (`webkitdirectory`).

1. **Sécurité** — refuser : path traversal (`../`, chemins absolus), zip bombs (ratio
   > 100, total décompressé > 300 Mo, > 3 000 fichiers), extensions serveur (`.php`,
   > `.asp`, `.env`, `.sql`), `\.git/**`, `node_modules/**`.
2. **Inventaire** — classer en `pages` (`.html`), `styles`, `scripts`, `assets`,
   `fonts`, `autres`. Détecter l'entrée (`index.html` racine, sinon la plus haute dans
   l'arbre).
3. **Snapshot** — upload vers `r2://sites/{siteId}/sources/{versionId}/…`, SHA-256 par
   fichier, table `site_versions`.
4. **Job INGEST** → parser (§9) → `blueprint.json`.
5. **Rapport d'ingestion** pour l'admin : nombre de pages, champs texte, images,
   collections, avertissements. Chaque avertissement est cliquable et surligne
   l'élément concerné dans l'aperçu.

**Cas limites à gérer explicitement et à faire remonter dans le rapport** : contenu
injecté par JS au runtime (avertissement `DYNAMIC_TEXT`, non éditable) · one-page avec
routing JS (traiter les sections `[id]` comme pages virtuelles) · Tailwind CDN ou
compilé (on ne touche jamais aux classes) · fragments HTML sans `<html>` (composants
partagés).

**Re-livraison — fonctionnalité clé.** Si l'agence redéploie une v2 du design, `INGEST`
produit un **mapping de migration** entre ancien et nouveau blueprint : match exact par
`domPath`, sinon score de similarité sur `tag + fingerprint de classes + hash de contenu

- position`. L'admin voit un écran de réconciliation (`conservé`/`nouveau`/`orphelin`) et valide. Les contenus du client survivent.

---

## 9. Module 2 — Le Parser : détection des éléments modifiables ⭐

**C'est le cœur du produit. Couverture de tests maximale ici.**

### 9.1 Identifiants stables

```ts
domPath     = "body > main:nth-of-type(1) > section:nth-of-type(2) > h2:nth-of-type(1)"
fingerprint = tagName + "|" + classes.sort().join(".") + "|" + shapeHash(enfants, profondeur 2)
fieldId     = "fld_" + sha1(pagePath + "::" + domPath).slice(0, 10)
contentHash = sha1(textContent normalisé)
```

`fieldId` est déterministe et recalculable. On stocke `domPath`, `fingerprint` et
`contentHash` pour permettre la réconciliation (§8).

### 9.2 Règles de classification

Parcours en profondeur, application dans cet ordre :

| Type            | Détection                                                                                                                                               |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `text`          | Élément feuille avec du texte, sans enfant élément : `h1-h6, p, span, li, td, th, figcaption, blockquote, label, strong, em`                            |
| `richtext`      | `p`/`div` contenant du HTML inline (`strong`, `em`, `br`, `a`) — édition avec allowlist                                                                 |
| `image`         | `img[src]`, `picture > source[srcset]`, tout élément avec `background-image` (style inline ou classe résolue)                                           |
| `link`          | `a[href]` → champ composite `{ label, href, target, rel }`                                                                                              |
| `cta`           | `a`/`button` dont les classes contiennent `btn`, `button`, `cta` → comme `link`, priorité d'affichage haute                                             |
| `video-embed`   | `iframe[src*="youtube\|vimeo"]`, `video > source`                                                                                                       |
| `map-embed`     | `iframe[src*="google.com/maps"]` → champ « adresse » simplifié                                                                                          |
| `icon`          | `svg` inline ou `i.fa-*`/`i.lucide-*` → sélecteur d'icônes                                                                                              |
| `contact`       | `a[href^="tel:"]`, `a[href^="mailto:"]`, textes matchant téléphone/email → panneau global « Informations de contact », synchronisé sur toutes les pages |
| `social`        | `a[href*="instagram\|facebook\|linkedin\|tiktok\|x.com"]` → panneau global « Réseaux sociaux »                                                          |
| `form-endpoint` | `form[action]` → seuls l'endpoint et les libellés sont éditables, jamais la structure                                                                   |
| `boolean`       | Tout bloc de niveau section → « Afficher / masquer »                                                                                                    |

**Verrouillage automatique** : `script`, `style`, `noscript`, `head` hors SEO, éléments
`aria-hidden="true"` décoratifs, éléments sans texte ni média, wrappers ne contenant que
des `div`, textes < 2 caractères, compteurs animés (`data-count`, classe `counter`).

**Libellés lisibles — critique pour l'UX.** Ne jamais montrer `h2:nth-of-type(3)` au
client. Générer : `aria-label` > `alt` > `id` > classe sémantique > texte tronqué à 40
caractères > libellé par défaut selon le tag. Puis passe IA (§19) pour produire des
libellés français naturels : « Titre principal », « Sous-titre du hero », « Photo de
l'équipe ».

### 9.3 Détection des collections répétables ⭐

**C'est ce qui permet au client d'ajouter des éléments.**

1. Pour chaque conteneur, calculer le `fingerprint` de ses enfants directs.
2. Grouper les enfants **consécutifs** de même `fingerprint`.
3. Si le groupe compte **≥ 2 membres** et que chaque membre contient **≥ 1 champ
   éditable** → le conteneur devient une `collection` (`add`, `duplicate`, `delete`,
   `reorder`), chaque membre un `item`.
4. Le **premier item** devient `itemTemplate` : HTML nettoyé (textes vidés, `src` en
   placeholder) pour instancier de nouveaux items.
5. Nommage par heuristique puis IA : « Cartes services », « Témoignages », « Questions
   fréquentes », « Photos de la galerie », « Membres de l'équipe », « Plats du menu ».
6. Bornes : `min = 1`, `max = max(12, count × 2)`, ajustables par l'admin.
7. **Faux positifs** : groupe sous `nav`/`footer`, ou composé uniquement de liens courts
   (menus, breadcrumbs, mentions légales) → `locked = true` par défaut, déverrouillable
   par l'admin.

**Critère d'acceptation du parser :** sur les 3 fixtures (§22 P1), **≥ 90 % de rappel**
sur les champs annotés dans `expected.json`, et **0 faux positif destructeur** (aucun
élément structurel classé éditable).

### 9.4 Design tokens & thème

Extraire les custom properties de `:root` et `[data-theme]`, typées par valeur (`color`,
`length`, `font-family`, `shadow`, `radius`). Détecter les polices
(`fonts.googleapis.com`, `@font-face`, `font-family`). Si aucune variable CSS n'existe,
compter les couleurs du CSS et proposer les 6 plus fréquentes comme « couleurs du site »,
avec remplacement global **opt-in admin, jamais activé par défaut**.

Le client n'édite jamais du CSS : il édite des tokens. À la publication, on injecte un
bloc `:root{}` de surcharge dans `assets/calque-overrides.css`, chargé en dernier. Le CSS
original n'est jamais modifié.

### 9.5 SEO

Par page : `title`, `meta[name=description]`, `og:title`, `og:description`, `og:image`,
`canonical`, favicon, `html[lang]`. Au niveau site : `robots.txt` et `sitemap.xml`
régénérés à la publication, champ « Identifiant Google Analytics / GTM » injecté
proprement dans `<head>` avec gestion du consentement.

### 9.6 Annotations & overrides

Le parser respecte des annotations optionnelles dans le HTML source, pour piloter la
détection dès le vibe coding :

```html
<h1 data-calque="text" data-calque-label="Titre de la page" data-calque-max="60">…</h1>
<div data-calque="collection" data-calque-label="Nos services" data-calque-max="8">…</div>
<section data-calque="lock">…</section>
<img data-calque="image" data-calque-ratio="4/3" data-calque-label="Photo du plat" />
<div data-calque="group" data-calque-label="Bloc horaires">…</div>
```

Priorité : **annotation explicite > override admin en base > heuristique**. Documenter la
syntaxe dans `docs/ANNOTATIONS.md` — elle deviendra la convention de vibe coding de
l'agence, et un argument commercial.

### 9.7 Sortie : `blueprint.json`

Format exact, validé par un schéma Zod dans `packages/blueprint/schema.ts` :

```json
{
  "blueprintVersion": "1.0",
  "generatedAt": "2026-08-17T10:00:00Z",
  "site": { "entry": "index.html", "pageCount": 4 },
  "theme": {
    "tokens": [
      {
        "id": "tok_a1b2",
        "cssVar": "--color-primary",
        "type": "color",
        "value": "#0F62FE",
        "label": "Couleur principale",
        "usageCount": 34
      }
    ],
    "fonts": [
      {
        "id": "fnt_c3d4",
        "family": "Playfair Display",
        "source": "google",
        "role": "headings"
      }
    ]
  },
  "globals": [
    {
      "id": "grp_contact",
      "label": "Informations de contact",
      "fields": [
        {
          "id": "fld_phone",
          "type": "text",
          "label": "Téléphone",
          "value": "01 23 45 67 89",
          "occurrences": ["index.html", "contact.html"]
        }
      ]
    }
  ],
  "pages": [
    {
      "path": "index.html",
      "label": "Accueil",
      "seo": { "title": "…", "description": "…", "ogImage": "assets/og.jpg" },
      "blocks": [
        {
          "id": "blk_hero",
          "label": "Section Hero",
          "domPath": "body > main:nth-of-type(1) > section:nth-of-type(1)",
          "capabilities": ["hide", "reorder"],
          "fields": [
            {
              "id": "fld_9f8e7d",
              "type": "text",
              "label": "Titre principal",
              "domPath": "… > h1:nth-of-type(1)",
              "value": "Votre projet, notre savoir-faire",
              "constraints": { "maxLength": 70, "multiline": false },
              "meta": { "contentHash": "…", "fingerprint": "h1|hero-title|…" }
            },
            {
              "id": "fld_1a2b3c",
              "type": "image",
              "label": "Visuel principal",
              "domPath": "… > img:nth-of-type(1)",
              "value": { "src": "assets/hero.jpg", "alt": "Atelier" },
              "constraints": { "aspectRatio": "16/9", "maxBytes": 2000000 }
            },
            {
              "id": "fld_4d5e6f",
              "type": "link",
              "label": "Bouton d'appel à l'action",
              "value": {
                "label": "Demander un devis",
                "href": "/contact.html",
                "target": "_self"
              }
            }
          ],
          "collections": []
        },
        {
          "id": "blk_services",
          "label": "Nos services",
          "domPath": "body > main:nth-of-type(1) > section:nth-of-type(2)",
          "capabilities": ["hide", "reorder", "duplicate"],
          "fields": [
            {
              "id": "fld_secttl",
              "type": "text",
              "label": "Titre de section",
              "value": "Ce que nous faisons"
            }
          ],
          "collections": [
            {
              "id": "col_services",
              "label": "Cartes services",
              "containerPath": "… > div.grid:nth-of-type(1)",
              "itemSignature": "article|card shadow|h3+p+a",
              "min": 1,
              "max": 12,
              "locked": false,
              "itemTemplate": {
                "html": "<article class=\"card shadow\"><h3 data-f=\"t\"></h3><p data-f=\"d\"></p><a data-f=\"l\"></a></article>",
                "fields": [
                  {
                    "key": "t",
                    "type": "text",
                    "label": "Titre du service",
                    "constraints": { "maxLength": 40 }
                  },
                  {
                    "key": "d",
                    "type": "text",
                    "label": "Description",
                    "constraints": { "maxLength": 160 }
                  },
                  { "key": "l", "type": "link", "label": "Lien" }
                ]
              },
              "items": [
                {
                  "itemId": "itm_001",
                  "values": {
                    "t": "Rénovation",
                    "d": "…",
                    "l": { "label": "En savoir plus", "href": "#" }
                  }
                }
              ]
            }
          ]
        }
      ]
    }
  ],
  "locked": [{ "domPath": "body > script:nth-of-type(1)", "reason": "script" }],
  "warnings": [
    {
      "code": "DYNAMIC_TEXT",
      "domPath": "…",
      "message": "Texte injecté par JavaScript, non éditable"
    },
    {
      "code": "ANIM_LIB_DETECTED",
      "message": "GSAP ScrollTrigger détecté : mode édition statique activé"
    }
  ]
}
```

---

## 10. Module 3 — Contenu, brouillons, versions

`content_draft` : JSON `{ fieldId | itemId → valeur }` + état des collections (ordre,
items ajoutés/supprimés). Un seul brouillon actif par site. Autosave debounce 800 ms, UI
optimiste, indicateur « Enregistré ». Undo/redo local (pile de patches Immer, 50
niveaux). Verrou d'édition concurrent (heartbeat 30 s, bannière « Marie est en train
d'éditer »).

Publication → snapshot immuable `content_version` (numérotée, auteur, diff) → BUILD →
DEPLOY. Historique avec diff lisible champ par champ (« Titre principal : ancien →
nouveau ») et **rollback en un clic** (crée une nouvelle version, ne supprime jamais).

---

## 11. Module 4 — Editor runtime

Package `packages/editor-runtime`, bundlé IIFE, injecté **uniquement en mode aperçu**,
jamais dans le site publié.

- Résoudre chaque `fieldId` → nœud DOM via `domPath`, fallback `fingerprint` +
  `contentHash`.
- Surlignage au survol : outline 2 px + badge du libellé, hors flux,
  `pointer-events: none`.
- Neutraliser le site en mode édition : `preventDefault` sur liens et submits,
  désactivation du smooth-scroll.
- **Mode édition statique — ne surtout pas négliger.** Si GSAP, ScrollTrigger,
  Locomotive, AOS ou Lenis est détecté, stubber leurs API et forcer les éléments à leur
  état final (`opacity:1; transform:none`) via une feuille de style d'édition. Sans cela,
  l'édition est impossible sur la majorité des sites vibe-codés, dont les éléments
  attendent un scroll pour devenir visibles.
- Édition inline `contenteditable` pour `text` et `richtext`, sanitisation à la frappe
  (aucun HTML collé), compteur de caractères vs `maxLength` (avertissement, jamais
  blocage).
- Protocole `postMessage` typé et versionné (Zod des deux côtés), origines strictement
  vérifiées :
  - runtime → app : `READY`, `FIELD_CLICK`, `FIELD_INPUT`, `HOVER`, `SCROLL_POS`, `ERROR`
  - app → runtime : `SET_VALUE`, `HIGHLIGHT`, `SCROLL_TO`, `SET_MODE`, `COLLECTION_OP`,
    `SET_TOKEN`, `SET_VIEWPORT`
- Application des modifications **en direct**, sans rechargement pendant la frappe.

Sécurité : `<iframe sandbox="allow-scripts allow-same-origin">` servie depuis
`*.calque-preview.site` (eTLD+1 distinct de l'app), CSP stricte, `frame-ancestors` limité
à `app.calque.studio`, aucun token d'authentification transmis dans l'iframe.

---

## 12. Module 5 — Interface d'édition

Trois zones : **navigateur de contenu** (gauche) · **aperçu** (centre) ·
**propriétés** (droite).

- **Gauche** — arbre `Pages → Blocs → Champs & Collections`, icône par type, recherche,
  badge « modifié ». Sections annexes : Thème, Informations de contact, SEO, Médias.
- **Centre** — iframe. Toolbar : desktop/tablette/mobile, zoom, **« Voir les zones
  modifiables »** (toutes les zones éditables s'illuminent — réponse directe au besoin
  « distinguer les éléments modifiables »), « Aperçu réel ».
- **Droite** — formulaire contextuel du champ sélectionné, aide en français simple. Pour
  une collection : liste d'items réordonnables, boutons `+ Ajouter`, `Dupliquer`,
  `Supprimer`.
- **Header** — nom du site, statut (`Brouillon modifié` / `Publié`), `Aperçu`, `Publier`,
  historique, avatar.

**Contraintes UX non négociables :** aucun jargon (jamais « div », « class », « DOM »,
« collection » → dire « bloc », « liste », « carte ») · toute action destructive
annulable (toast « Annuler », 8 s) · onboarding en 4 étapes au premier login ·
navigation clavier complète, focus visible, `aria-live` sur l'autosave, contraste AA ·
FR par défaut, EN disponible.

---

## 13. Module 6 — Ajouter, dupliquer, supprimer, réordonner

- **Ajouter un item** : instancier `itemTemplate.html`, remplir avec des placeholders
  explicites (« Titre du service », image placeholder aux bonnes dimensions), insérer en
  fin de collection, scroller et focus sur le premier champ.
- **Dupliquer un item** : copie des valeurs, suffixe « (copie) » sur le premier champ
  texte.
- **Supprimer** : respect de `min`, confirmation, annulable.
- **Réordonner** : drag & drop dans le panneau **et** dans l'aperçu (poignée au survol).
- **Dupliquer un bloc entier** (ex. une seconde section « Nos services ») :
  ré-attribution de nouveaux `fieldId` (préfixe `dup_`), insertion après le bloc source.
- **Masquer un bloc** : `display:none` via les overrides à la publication, le HTML source
  n'est jamais supprimé.

Garde-fou layout : si un item ajouté déséquilibre visiblement une grille (3 colonnes,
4 items), afficher un avertissement informatif — sans jamais bloquer.

---

## 14. Module 7 — Médias

Bibliothèque par site : upload drag & drop (10 Mo max/fichier), recadrage au ratio du
champ, génération `webp` + `avif` en 400/800/1200/1600, `srcset` + `sizes` +
`loading="lazy"` + `width`/`height` à la publication, alt text obligatoire avec
suggestion IA, dédoublonnage par hash, remplacement global d'une image, quota par plan.

---

## 15. Module 8 — Publication & déploiement

Fonction `build()` **pure et testable**, dans `packages/builder` :

1. Charger le HTML source immuable.
2. Parser en AST (parse5).
3. Résoudre chaque `fieldId` → nœud, appliquer la valeur selon le type (`textContent`,
   `innerHTML` sanitisé, `src`/`srcset`/`alt`, `href`).
4. Collections : supprimer les items retirés, instancier les ajoutés depuis le template,
   réordonner.
5. Appliquer masquages et duplications de blocs.
6. Réécrire les URLs médias vers le CDN.
7. Générer `assets/calque-overrides.css` (tokens + masquages) et l'injecter en dernier
   dans `<head>`.
8. Mettre à jour SEO, `sitemap.xml`, `robots.txt`.
9. **Supprimer tous les attributs `data-calque*` et le runtime éditeur.**
10. Écrire l'arborescence, archiver le build versionné dans R2.
11. Déployer via l'API Cloudflare Pages Direct Upload, stocker l'URL et le statut.
12. Purger le cache, notifier le client par email (« Votre site est à jour »).

**Invariant à tester en tout premier :** `build(source, blueprint, contenu_initial_extrait)`
doit produire un HTML **byte-identique** au source d'origine, à la normalisation près.
Écrire ce test avant toute autre chose dans P3 — c'est le filet de sécurité de tout le
système.

Extras : export ZIP du site, export optionnel vers un dépôt GitHub (commit sur branche
`calque/updates` + PR), domaine personnalisé (instructions DNS + vérification
automatique).

---

## 16. Module 9 — Multi-tenant, rôles, quotas, facturation

Hiérarchie `Organisation (agence) → Sites → Membres`. Rôles : `agency_admin`,
`site_owner` (édite et publie), `site_editor` (édite, ne publie pas), `viewer`.
Invitations par email, lien magique expirant à 7 jours, sans création de mot de passe.

**Isolation des données — double barrière obligatoire :**

1. Couche d'accès : aucun accès direct à `db` hors de `packages/db`. Toute requête passe
   par un repository scopé `withTenant(orgId)`. Ajouter une règle ESLint qui interdit
   l'import direct du client Drizzle dans `apps/web`.
2. RLS Postgres en défense en profondeur : chaque requête s'exécute dans une transaction
   ouvrant par `SET LOCAL app.current_org_id = …`, les policies lisant
   `current_setting('app.current_org_id')`.

Écrire un test d'isolation explicite : un membre de l'organisation A ne peut jamais lire
une ligne de l'organisation B, sur chaque table.

Compteurs de quota (sites, sièges, stockage, publications, crédits IA) vérifiés côté
serveur avant chaque action, avec message clair et lien d'upgrade. Journal d'audit : qui
a modifié quoi, quand, publié quoi — rétention 12 mois.

---

## 17. Sécurité & RGPD

- Sanitisation serveur de tout `richtext` (allowlist `b, strong, i, em, u,
a[href|target|rel], br, ul, ol, li, p, span`), rejet de `on*`, `javascript:`,
  `<script>`, `<iframe>` non whitelisté.
- Uploads validés par magic bytes (jamais par extension), ré-encodés systématiquement via
  sharp, servis en `Content-Disposition: attachment` depuis le stockage.
- Rate limiting (upload, publication, invitations, IA), CSRF sur les Server Actions,
  headers de sécurité (CSP, HSTS, `X-Frame-Options` sur l'app, `frame-ancestors` sur le
  preview), URLs signées à durée courte.
- **RGPD** : hébergement UE exclusivement, registre des traitements, DPA sous-traitants
  (Vercel, Neon, Cloudflare, Resend, Stripe, Anthropic), politique de confidentialité,
  aucun cookie non essentiel dans l'app, export et suppression des données d'un client en
  un clic, durées de rétention documentées. Générer `docs/RGPD.md` avec la matrice RACI
  des traitements (comptes, contenus clients, logs, médias).
- Sauvegardes : PITR Neon, versionnement R2, procédure de restauration documentée **et
  testée** dans `docs/RUNBOOK.md`.

---

## 18. Modèle de données (Drizzle)

Compléter si nécessaire, mais ne pas renommer :

```
organizations    id, name, slug, plan, stripe_customer_id, branding_json, created_at
users            id, email, name, avatar_url, locale, last_seen_at
memberships      id, org_id, user_id, role, created_at            [unique org_id+user_id]
sites            id, org_id, name, slug, status, preview_subdomain, live_url,
                 host_provider, host_project_id, custom_domain, current_version_id
site_versions    id, site_id, label, source_manifest_json, created_by, created_at
blueprints       id, site_id, site_version_id, blueprint_json, parser_version,
                 stats_json, warnings_json, created_at
field_overrides  id, site_id, field_id, label, editable, constraints_json, hidden
content_drafts   id, site_id, data_json, updated_by, updated_at, lock_holder, lock_expires_at
content_versions id, site_id, number, data_json, diff_json, published_by, published_at
media_assets     id, site_id, path, mime, bytes, width, height, hash, alt, variants_json
deployments      id, site_id, content_version_id, status, provider_deploy_id,
                 build_artifact_key, log, started_at, finished_at
invitations      id, org_id, site_id, email, role, token_hash, expires_at, accepted_at
audit_logs       id, org_id, site_id, actor_id, action, target, metadata_json, created_at
subscriptions    id, org_id, stripe_subscription_id, plan, status, current_period_end
usage_counters   id, org_id, period, sites, seats, storage_bytes, publishes, ai_credits
```

Index sur toutes les FK, `sites.slug`, `blueprints.site_id`,
`deployments(site_id, started_at)`.

---

## 19. API & module IA

```
POST   /api/sites                               créer un site
POST   /api/sites/:id/uploads                   URLs signées d'upload
POST   /api/sites/:id/ingest                    job INGEST
GET    /api/sites/:id/blueprint
PATCH  /api/sites/:id/fields/:fieldId           override admin (libellé, verrou, contraintes)
GET    | PATCH  /api/sites/:id/draft            lecture / autosave par patch JSON
POST   /api/sites/:id/collections/:colId/items  { op: add | duplicate | delete | reorder }
POST   /api/sites/:id/publish
GET    /api/sites/:id/versions
POST   /api/sites/:id/rollback/:versionId
POST   /api/sites/:id/media
POST   /api/sites/:id/reconcile                 réconciliation après re-livraison
POST   /api/webhooks/stripe
GET    /preview/:siteId/*                       serveur d'aperçu (*.calque-preview.site)
POST   /api/ai/label | /api/ai/rewrite | /api/ai/alt-text | /api/ai/seo
```

**Module IA** (API Anthropic, `claude-sonnet-4-6`, serveur uniquement, clé jamais
exposée) : nommage automatique des blocs et champs en français naturel à l'ingestion (un
appel par page, envoi du squelette DOM sans contenu sensible) · « Améliorer / Raccourcir
/ Corriger » sur un champ texte · génération d'alt text depuis l'image · suggestion de
meta description.

Toute proposition IA est affichée **en diff** et n'est jamais appliquée sans validation du
client. Décompte des crédits par plan.

---

## 20. Arborescence attendue

```
calque/
├─ apps/web/                  Next.js : marketing, app, éditeur, admin
├─ packages/
│  ├─ blueprint/              types + schémas Zod partagés
│  ├─ parser/                 ingestion, classification, collections, tokens   ⭐
│  ├─ builder/                build() pur : source + calque → site final       ⭐
│  ├─ editor-runtime/         IIFE injecté dans l'iframe                       ⭐
│  ├─ ui/                     composants shadcn partagés
│  └─ db/                     schéma Drizzle, migrations, RLS, repositories
├─ fixtures/                  3 sites de test + expected.json
├─ e2e/                       Playwright
└─ docs/  PRODUCT_SPEC.md · DECISIONS.md · ADR-*.md · ANNOTATIONS.md · RGPD.md · RUNBOOK.md
```

---

## 21. Ce qu'il ne faut jamais faire

- Modifier les fichiers sources du site déposé.
- Parser du HTML avec des expressions régulières.
- Inventer une dépendance ou une version : vérifier ce qui existe réellement avant
  d'installer.
- Livrer un composant mocké en le présentant comme fonctionnel — préfixer tout mock par
  `// MOCK:` et les lister en fin de phase.
- Exposer une clé API côté client, ou désactiver le sandbox de l'iframe.
- Ajouter une fonctionnalité hors du périmètre du §6.
- Enchaîner plusieurs phases d'un coup.
- Employer du jargon technique dans l'interface destinée au client final.

---

## 22. Plan de construction

Une phase = une branche + un commit propre + une démo vérifiable. On ne passe à la phase
suivante que lorsque le critère d'acceptation est atteint. En fin de chaque phase, produire
un court récapitulatif : ce qui marche, ce qui est mocké, comment le vérifier en deux
minutes.

| Phase   | Contenu                                                                                                                                                                                                                 | Critère d'acceptation                                                                                             |
| ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| **P0**  | Monorepo Turborepo, Next.js, Tailwind/shadcn, Drizzle + migrations, Auth.js magic link, CI (typecheck/test/lint), Sentry, `docs/`                                                                                       | `pnpm dev` tourne, connexion par email, CI verte                                                                  |
| **P1**  | 3 fixtures réalistes : landing artisan (grille de services, témoignages, FAQ) · restaurant multi-pages (galerie, menu, horaires) · portfolio one-page avec GSAP ScrollTrigger. Plus `expected.json` annoté pour chacune | Les 3 fixtures existent, sont crédibles visuellement et couvrent les cas durs                                     |
| **P2**  | `packages/parser` + `blueprint.json` + tests                                                                                                                                                                            | ≥ 90 % de rappel sur les fixtures, 0 faux positif destructeur, rapport lisible                                    |
| **P3**  | `packages/builder` + test d'identité byte-à-byte + application des patches                                                                                                                                              | `build(source, contenu_initial) ≡ source` sur les 3 fixtures                                                      |
| **P4**  | Ingestion réelle : upload ZIP, sécurité, R2, job INGEST, écran de rapport admin                                                                                                                                         | Dépôt d'un ZIP → blueprint + rapport en moins de 60 s                                                             |
| **P5**  | `editor-runtime`, serveur d'aperçu, mode édition statique anti-animations, postMessage typé                                                                                                                             | Survol d'un texte dans l'aperçu → surlignage ; modification → changement en direct, y compris sur la fixture GSAP |
| **P6**  | UI éditeur complète : 3 zones, arbre, panneau propriétés, autosave, undo/redo, thème, SEO, médias                                                                                                                       | Une personne non technique modifie 5 champs et 1 image sans aide                                                  |
| **P7**  | Collections : ajouter, dupliquer, supprimer, réordonner + duplication et masquage de blocs                                                                                                                              | Ajout d'une 4ᵉ carte service depuis l'UI, correctement stylée                                                     |
| **P8**  | Publication : BUILD, DEPLOY Cloudflare Pages, versions, rollback, export ZIP                                                                                                                                            | Publication → site en ligne à jour ; retour arrière en un clic                                                    |
| **P9**  | Multi-tenant, rôles, invitations, double barrière d'isolation + tests, quotas, Stripe, marque blanche                                                                                                                   | Un client ne voit que son site ; les tests d'isolation passent sur chaque table                                   |
| **P10** | Réconciliation de re-livraison, module IA, i18n, onboarding, accessibilité, RGPD, runbook, pages marketing                                                                                                              | Re-dépôt d'une v2 du design, les contenus du client survivent                                                     |

**Definition of Done par phase :** types stricts · tests unitaires sur la logique métier ·
un test E2E Playwright sur le parcours ajouté · aucun secret en clair ·
`pnpm typecheck && pnpm test && pnpm build` vert · `docs/DECISIONS.md` à jour.

---

## 23. Première action

1. Lister **les 5 risques techniques majeurs** identifiés dans cette spécification, avec
   la mitigation de chacun.
2. Présenter le plan détaillé de **P0 et P1 uniquement**, avec la liste exacte des
   fichiers à créer.
3. Attendre le « GO » — puis enchaîner P0 et P1 sans s'interrompre.

---

## 24. Note pour la v2 — ne pas coder maintenant

Support des sites avec build step (Next.js, Vite, React). Approche cible : conserver
`packages/blueprint` et l'éditeur, remplacer l'ingestion HTML par un rendu statique
préalable ou une extraction depuis les sources JSX, et la publication par un commit Git +
build CI. **Conséquence dès P2 :** `parser` et `builder` doivent être des adaptateurs
interchangeables derrière une interface commune `SiteAdapter`. La concevoir maintenant,
n'implémenter que l'adaptateur `StaticHtmlAdapter`.
