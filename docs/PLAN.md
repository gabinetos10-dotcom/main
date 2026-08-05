# Plan d'implémentation — SaaS de création de sites web

> **Statut : EN ATTENTE DE FEU VERT POUR LA PHASE 0.** Aucun code applicatif produit à ce stade.
> Version 2 — spécification complète (PARTIES 0 à 9) intégrée.

**Changements v1 → v2** (la v1 avait été rédigée sans les PARTIES 5 à 9) :
- **ADR-004 réécrit** : bus `postMessage` typé au lieu du portal React à store partagé (§5.3 impose
  le bus). Conséquences de perf traitées en §7.
- **ADR-006 aligné** : `Site.publishedRevisionId` (nommage de ta PARTIE 6), pas `currentRevisionId`.
- **`packages/auth`** ajouté à l'arborescence (§7 impose `packages/auth/permissions.ts`).
- **Section 6 remplacée** par tes 11 phases (PARTIE 9) ; mon découpage en 13 phases est abandonné.
- **ADR-011 à ADR-014** ajoutés : blocks RSC-first (zéro JS), catalogue de polices fermé,
  assainissement structurel du rich text, quotas serveur.
- **Multilingue** : question tranchée par ta PARTIE 9 — schéma prêt dès la phase 0, UI en phase 10.

---

## 1. Décisions d'architecture (ADR)

### ADR-001 — Le document JSON est la source de vérité, jamais du HTML
`Page.content` contient un `PageDocument` (arbre de `BlockNode`). Le même document alimente
l'éditeur et le site public via **un seul moteur de rendu** (`packages/renderer`). Le HTML n'existe
qu'en sortie de rendu.
*Note :* l'export HTML statique (plan Business, phase 10) est une **sortie dérivée**, générée à la
demande depuis une révision. Il ne contredit pas cet ADR — rien n'est stocké en HTML.

### ADR-002 — Un block = 3 fichiers, 2 registres
Le contrat `defineBlock()` mélange runtime (schéma, composant) et éditeur (icône Lucide, thumbnail,
presets). Importer Lucide dans le runtime public gonflerait le bundle des sites publiés pour rien.

```
packages/blocks/src/blocks/hero.split/
  definition.ts   # type, schema Zod, defaults, allowedChildren, version → isomorphe, zéro React
  component.tsx   # rendu                                               → runtime (partagé)
  client/*.tsx    # îlots interactifs ("use client")                    → runtime, chargés à la demande
  editor.ts       # label, category, icon, thumbnail, presets, ordre    → éditeur uniquement
  index.ts        # defineBlock() qui assemble le tout
```

Deux registres construits statiquement : `runtimeRegistry` (`type → { schema, component }`, importé
par `apps/sites` et par le canvas) et `editorRegistry` (`type → métadonnées d'UI`, importé par
`apps/web` seulement). `defineBlock()` reste l'API unique documentée dans `docs/BLOCKS.md`.

### ADR-003 — Les blocks ne consomment que des tokens
Aucune couleur / taille / rayon / ombre en dur. Tout passe par des CSS variables générées depuis
`Theme.tokens`. Une règle ESLint maison interdit les littéraux hexa/rgb et les classes Tailwind
arbitraires dans `packages/blocks`. Les overrides locaux vivent dans `BlockNode.style`, sont
signalés « custom » dans l'inspecteur, avec bouton « revenir au thème ».

### ADR-004 — Canvas en iframe same-origin + bus `postMessage` typé *(réécrit)*
Le canvas est une route dédiée de `apps/web` (`/editor/[siteId]/canvas`) chargée dans une iframe
same-origin. **Toute communication passe par un bus de messages typé** ; aucun accès DOM cross-frame
en dehors du bus (§5.3). Protocole documenté dans `docs/EDITOR_BRIDGE.md`.

> La v1 de ce plan proposait de monter React dans l'iframe par portal avec un store Zustand partagé,
> précisément pour éviter la sérialisation. Ta PARTIE 5.3 tranche pour le bus : je m'y range. C'est
> défendable au-delà de la propreté — la frontière sérialisée permettra de passer le canvas en
> **cross-origin** le jour où on y exécutera du code custom d'utilisateur, ce que le portal
> interdirait définitivement.

Le coût du bus est la latence de sérialisation. Il est neutralisé par trois choix (détail §7) :
1. **on transporte des patches Immer, jamais le document** — quelques centaines d'octets par frappe ;
2. le canvas possède **son propre store** et applique les patches localement ;
3. **Tiptap tourne dans l'iframe**, pas dans le shell : les frappes de l'édition inline ne
   traversent jamais le bus, seuls les commits debouncés le font.

Conséquence sur les bundles : **trois consommateurs distincts** du renderer —
`apps/sites` (public, zéro code d'éditeur), la route canvas de `apps/web` (renderer + affordances +
Tiptap), et le shell de `apps/web` (aucun renderer). C'est ce qui rend tenable à la fois le
Lighthouse ≥ 95 public et le confort d'édition.

### ADR-005 — BullMQ + Redis, et un `apps/worker` dédié
Choix demandé (BullMQ vs Trigger.dev), tranché par la contrainte « tourne en local avec
`docker compose up`, sans compte cloud » : Trigger.dev cloud viole la contrainte et son self-host
est lourd. BullMQ ne demande qu'un Redis, déjà nécessaire pour le rate limiting (PARTIE 8), le cache
de résolution de tenant et l'agrégation des pageviews (PARTIE 8/phase 8) — un conteneur, trois usages.

Contrepartie assumée : BullMQ exige un process long, absent de Vercel. D'où `apps/worker`
(process Node, Dockerfile fourni), ajout à l'arborescence de la PARTIE 2.
Jobs : finalisation d'upload (variantes webp/avif + blurhash), publication, vérification DNS avec
backoff, emails, agrégation analytics, purge des révisions selon le plan (7/30/90 j), purge RGPD à
30 j, calcul des `UsageCounter`.

### ADR-006 — Le site public ne lit qu'une révision publiée
Publier crée une `Revision` portant un **snapshot autonome** (pages publiées + header/footer + thème
+ SEO + redirections) puis bascule `Site.publishedRevisionId`. Le runtime résout
`hostname → Site → publishedRevisionId → snapshot` : une lecture pour rendre n'importe quelle page,
et le rollback devient un repointage instantané et non destructif. Brouillon (`Page.content`) et
publié sont strictement disjoints : éditer ne touche jamais le site en ligne (PARTIE 6).

### ADR-007 — Accès aux données exclusivement via `packages/db/src/guards.ts`
Aucun `prisma.*` hors `packages/db`. Tout passe par `requireOrgAccess(ctx, orgId, permission)`,
`getSiteForOrg(...)`, etc., qui vérifient appartenance **et** permission. Une règle ESLint
(`no-restricted-imports` sur le client Prisma) rend la violation non mergeable. Les tests
d'autorisation tentent explicitement l'accès cross-tenant et doivent échouer (PARTIE 8).

### ADR-008 — Better Auth pour l'identité, modèle d'organisation maison
Better Auth gère identité et sessions (mot de passe **argon2id** via hasher custom, vérification
email, magic link, OAuth Google, reset, sessions révocables, plugin TOTP pour la 2FA des plans
payants). Son plugin « organization » n'est **pas** utilisé : la PARTIE 3 définit ses propres
`Organization`/`Membership`/`Invitation` avec 4 rôles, quotas et lien Stripe ; deux modèles
concurrents seraient une dette immédiate. L'org active est portée par un cookie signé, revalidée
à chaque requête contre `Membership`.

### ADR-009 — Fournisseur de domaines abstrait
Interface `DomainProvider` avec `VercelDomainProvider` (API Vercel Domains) et `CaddyDomainProvider`
(on-demand TLS + endpoint `/ask`) pour le self-host, plus un `FakeDomainProvider` pour les tests et
le dev local. Sélection par variable d'environnement. Aucune API propriétaire dans le cœur.

### ADR-010 — Rich text : Tiptap, stocké en JSON
Sortie JSON portable (jamais de HTML en base), rendue publiquement par un `RichTextRenderer` qui
mappe les nœuds vers des éléments stylés par tokens. Le bundle Tiptap ne part que dans le canvas.

### ADR-011 — Blocks RSC-first : zéro JS pour les blocks statiques *(nouveau)*
Cible Lighthouse ≥ 95 et « les blocks statiques ne shippent pas de JS » (PARTIE 6). Règle :

> **Un `component.tsx` de block ne porte jamais `"use client"` à sa racine.** Il n'utilise ni hook
> ni API serveur : c'est un composant *partagé*. Toute interactivité est isolée dans un îlot
> `client/*.tsx` marqué `"use client"`.

Effet : côté `apps/sites` le composant s'exécute comme Server Component (zéro JS envoyé, seuls les
îlots s'hydratent) ; côté canvas, le même composant est tiré dans le bundle client sans modification.
Un test de budget de bundle en CI échoue si une page template dépasse le budget JS fixé.

### ADR-012 — Catalogue de polices fermé *(nouveau)*
`next/font` exige des polices connues à la **compilation**, or les sites choisissent leur typographie
à l'exécution. Une police chargée dynamiquement depuis Google Fonts coûterait une requête tierce, du
CLS et un point de CSP — incompatible avec Lighthouse ≥ 95 et CLS ≈ 0.

Décision : un **catalogue fermé et curaté** (~24 familles) déclaré statiquement dans
`packages/tokens/fonts.ts`, auto-hébergé via `next/font/local`, sous-ensemble latin, `display: swap`,
préchargé. Les 8 à 12 presets de thèmes puisent dedans. Ajouter une police = une PR, pas une action
utilisateur. C'est une restriction réelle par rapport à « choisis ta police » : elle est le prix de
la cible de performance, et elle protège aussi la cohérence esthétique voulue en PARTIE 4.4.

### ADR-013 — Rich text assaini *structurellement*, DOMPurify réservé au HTML brut *(nouveau)*
La PARTIE 8 demande DOMPurify côté serveur au rendu. Précision : le rich text n'est **jamais du
HTML** — c'est du JSON Tiptap. Le valider avec une allowlist Zod de types de nœuds et de marques à
l'entrée *et* au rendu est plus fort que d'assainir du HTML a posteriori (rien d'inconnu ne peut
exister dans l'arbre) et ne coûte rien à l'exécution.

DOMPurify (`isomorphic-dompurify`) reste utilisé là où une chaîne HTML brute existe réellement :
prévisualisation du block Embed dans le canvas, et contenu importé. Le block Embed publié reste dans
une iframe `sandbox="allow-scripts"` **sans** `allow-same-origin`, et le Code custom est réservé au
plan Business, injecté hors de l'arbre React, avec avertissement explicite.

### ADR-014 — Quotas évalués côté serveur, à deux vitesses *(nouveau)*
« Appliqué côté serveur, pas seulement dans l'UI » (PARTIE 7). Un helper unique
`assertQuota(orgId, resource)` appelé depuis `guards.ts`, avec deux régimes :
- **limites dures et peu coûteuses à compter** (sites, pages/site, membres, collections) → `COUNT`
  SQL, autorité absolue, jamais de cache ;
- **compteurs métrés** (stockage, soumissions/mois, pageviews) → `UsageCounter`, incrémenté de façon
  transactionnelle, agrégé par le worker.

Le downgrade ne supprime **jamais** : le webhook Stripe pose `Site.lockedAt` sur les sites au-delà du
quota (les plus récents d'abord, l'utilisateur peut choisir lesquels), ce qui les bascule en lecture
seule ; l'upgrade lève le verrou. Verrou stocké et non recalculé, pour être auditable.

---

## 2. Arborescence cible

```
apps/
  web/          back-office : auth, dashboard, éditeur (shell + route canvas), billing, tRPC
  sites/        runtime public multi-tenant : rendu, formulaires, analytics, sitemap
  worker/       jobs BullMQ (ADR-005)
packages/
  db/           schéma Prisma, client, guards.ts, quotas, seeds
  auth/         Better Auth, permissions.ts (matrice de rôles), plans & quotas
  blocks/       définitions + composants + îlots + presets + migrations/
  renderer/     moteur de rendu du document JSON
  tokens/       design tokens, presets de thèmes, catalogue de polices, compilation CSS vars
  ui/           composants back-office (shadcn/ui)
  templates/    documents JSON des templates de départ
  emails/       React Email
  config/       eslint (dont règles maison), tsconfig, tailwind, vitest, env.ts
docs/           PLAN ARCHITECTURE DATA_MODEL BLOCKS THEMING EDITOR_BRIDGE API SECURITY DEPLOY
docker/         compose (postgres, redis, minio), Dockerfiles
```

Ajouts par rapport à la PARTIE 2 : `apps/worker` (ADR-005), `packages/auth` (imposé par §7),
`docker/`, `docs/` étoffé.

---

## 3. Modèle de données — ajouts proposés

Le schéma de la PARTIE 3 est implémenté tel quel. Ajouts nécessaires, chacun justifié
(détail à venir dans `docs/DATA_MODEL.md`) :

| Ajout | Justification |
|---|---|
| `Site.publishedRevisionId` | ADR-006 : révision servie. Rollback = un `UPDATE`. |
| `Site.lockedAt` | ADR-014 : lecture seule après downgrade, sans suppression. |
| `Site.cookieBanner`, `Site.csp` (Json) | Bannière configurable et CSP par site (PARTIE 8). |
| `Revision.kind` (`AUTOSAVE\|PUBLISH\|MANUAL`) | Rétention différenciée : 7/30/90 j selon le plan. |
| `Page.contentVersion` | Version de schéma du document, pour les migrations de blocks (§4.5). |
| `Page.draftUpdatedAt`, `Page.lastEditedById` | Détection de conflit d'édition concurrente (§5.2). |
| `Redirect` (siteId, from, to, statusCode) | Redirections 301 configurables (PARTIE 6). |
| `PreviewLink` (siteId, token, expiresAt, revokedAt) | Lien d'aperçu partagé, révocable et non indexé (§5.2). Un JWT seul ne serait pas révocable. |
| `PageView` (siteId, date, path, referrerHost, country) | Analytics privacy-first : pageviews, sources, top pages (phase 8). `UsageCounter` est mensuel/org, insuffisant. |
| `Asset.status`, `Asset.variants` (Json) | Upload présigné en deux temps ; variantes webp/avif générées par le worker (§5.4). |
| `Domain.lastCheckedAt`, `Domain.error`, `Domain.redirectTo` | Polling DNS avec backoff, cause d'échec affichable, redirection www ↔ apex (PARTIE 6). |
| `Organization.onboarding` (Json) | Checklist de démarrage persistante (PARTIE 7). |
| `DeletionRequest` (scope, targetId, scheduledPurgeAt) | Suppression de compte avec purge à 30 j (PARTIE 8). |
| `Session`, `Account`, `Verification`, `TwoFactor` | Tables Better Auth + plugin TOTP. |
| `Comment` *(phase 10)* | Mode collaboration ; créé seulement en phase 10, pas avant. |

Index : `(siteId, path)` unique, `(orgId)`, `Domain.hostname` unique, `Site.slug` unique,
`(collectionId, slug)` unique, `(siteId, createdAt)` sur `FormSubmission`, `(orgId, period)` unique
sur `UsageCounter`, `(siteId, date, path)` sur `PageView`. Soft delete `archivedAt` sur `Site` et
`Page` via une extension Prisma qui filtre par défaut, avec échappatoire explicite `withArchived()`.

---

## 4. Blocks : contrat, champs, migrations

- **Champs typés** (`text`, `richText`, `number`, `slider`, `toggle`, `select`, `color`, `image`,
  `video`, `icon`, `link`, `spacing`, `alignment`, `repeater`, `collectionRef`, `animation`) :
  schémas Zod portant une métadonnée d'UI dans un registre `fieldMeta`. L'inspecteur parcourt le
  schéma et génère ses contrôles, groupés en sections repliables
  (Contenu / Style / Layout / Animation / Avancé) et éditables par breakpoint quand la métadonnée
  le déclare. **Ajouter un champ à un block ne demande aucun code d'inspecteur.**
- **`repeater`** : items à `id` nanoid stable, réordonnables (dnd-kit), dupliquables, min/max,
  template d'item. Jamais de référence par index — un réordonnancement la casserait.
- **Migrations** (`packages/blocks/migrations/NNNN-*.ts`) : `{ version, description, up(document) }`.
  `migrateDocument()` applique la chaîne depuis `document.version`. Application **paresseuse à la
  lecture** (jamais de document non migré rendu) + job batch pour le stock. **Un test par migration**,
  sur une fixture réelle figée.

### Répartition de la bibliothèque (PARTIE 4.3) sur les phases

| Phase | Blocks livrés |
|---|---|
| 2 | Section, Container, Columns, Grid, Spacer, Divider, Heading, RichText, Image, Button *(les 10 fondamentaux)* |
| 3 | ButtonGroup, Icon, Badge, Quote, Video, Gallery *(exercent repeater, link, icon, media)* |
| 4 | Header, Footer, Logos clients |
| 5 | Hero ×3, Features ×3, Stats, Témoignages ×2, Pricing, FAQ, CTA banner, Timeline, Équipe, Process, Carte, Horaires, Coordonnées, Cookie banner *(les 6 templates en dépendent)* |
| 8 | Formulaire, Newsletter, Embed (Calendly/HTML), Bouton WhatsApp, Code custom *(gaté Business)* |
| 9 | Collection List, Collection Item, Blog list, Article |

---

## 5. Pipeline de publication

```
Éditeur ──autosave (debounce 1,5 s + flush avant navigation + beforeunload)──► Page.content
   │      verrou optimiste sur draftUpdatedAt → 409 → bannière « modifiée ailleurs »
   │
   └─ « Publier » ─► job BullMQ
        1. valide chaque document contre les schémas de blocks (échec ⇒ publication refusée, log)
        2. construit le snapshot : pages publiées + header/footer + thème + SEO + redirections
        3. crée Revision(kind=PUBLISH) + Deployment(QUEUED→BUILDING)
        4. Site.publishedRevisionId = revision.id
        5. revalidateTag(`site:${siteId}`) → purge ISR + cache Redis de résolution de tenant
        6. génère sitemap.xml / robots.txt ; Deployment → LIVE (ou FAILED + log lisible)

Rollback = repointer publishedRevisionId + revalidateTag. Instantané, non destructif.
```

`apps/sites` : middleware `hostname → siteId` (cache Redis, TTL court), `app/[[...slug]]/page.tsx`
rend depuis le snapshot, `generateMetadata` depuis `Page.seo`, JSON-LD dérivé des blocks présents,
ISR + cache tags. Dev local : `*.lvh.me` (résout en 127.0.0.1, zéro configuration).

---

## 6. Protocole du bus éditeur ↔ canvas (esquisse — `docs/EDITOR_BRIDGE.md` en phase 3)

Messages typés, versionnés, validés par Zod aux deux extrémités. Shell → canvas :
`doc:init`, `doc:patch` (patches Immer), `selection:set`, `hover:set`, `breakpoint:set`,
`mode:set` (edit/preview), `dnd:pointer`, `measure:request`.
Canvas → shell : `ready`, `node:click`, `node:hover`, `node:measured` (rects + offsets de scroll),
`dnd:target` (parentId, index, rect d'insertion), `doc:patch` (édition inline Tiptap, debouncée),
`error`.

Règles : aucun accès DOM cross-frame hors bus ; tout message porte un `protocolVersion` ; les rects
sont batchés dans une seule frame (rAF) ; les overlays de sélection sont dessinés dans le **shell**
à partir des mesures reçues, jamais injectés dans le document du canvas.

---

## 7. Tenir les 16 ms sur 200+ blocks avec un bus sérialisé

Le risque n°1 du choix ADR-004. Parades, à valider par un banc de mesure dès la phase 3 :

1. **Patches, pas documents.** Une frappe produit un patch Immer de quelques centaines d'octets.
2. **Store local au canvas.** Le canvas applique le patch et ne re-render que le sous-arbre concerné
   (sélecteurs Zustand par `node.id`, `memo`, clés stables).
3. **Tiptap dans l'iframe.** L'édition inline ne traverse pas le bus ; seul le commit debouncé le fait.
4. **Mesures batchées.** `ResizeObserver` + `IntersectionObserver`, un seul message par frame.
5. **Virtualisation de l'arborescence** au-delà de 100 nœuds.
6. **Banc de mesure en CI** : un document de 250 blocks, budget d'interaction mesuré, échec si
   régression. Sans ce garde-fou, la cible « < 16 ms » n'est qu'une intention.

---

## 8. Phases de livraison (PARTIE 9)

Une phase à la fois, aucune suivante sans feu vert. Chaque phase se termine par : l'app démarre,
`pnpm typecheck && pnpm lint && pnpm test` verts, docs à jour, commit conventionnel, **démo textuelle
de ce qui est cliquable + limitations connues + proposition de la phase suivante**.

**Phase 0 — Fondations.** Monorepo pnpm + Turborepo, TS strict, ESLint flat (+ règles maison
tokens/guards), Prettier, Husky + lint-staged + commitlint, `docker compose` (Postgres/Redis/MinIO),
schéma Prisma complet + migrations + seeds, `packages/config/env.ts` (Zod) + `.env.example`
commenté, CI GitHub Actions, `CLAUDE.md`, `docs/ARCHITECTURE.md`.
*DoD :* sur machine vierge, `docker compose up -d && pnpm install && pnpm db:migrate && pnpm db:seed
&& pnpm dev` démarre ; `pnpm test` passe ; CI verte.

**Phase 1 — Auth & organisations.** Inscription/connexion argon2id, vérification email, magic link,
OAuth Google, reset, sessions révocables, organisations, membres, rôles, invitations expirantes,
`packages/auth/permissions.ts` (matrice testée), dashboard vide, layout back-office.
*DoD :* parcours E2E inscription → org → invitation → acceptation ; tests d'autorisation cross-tenant
qui échouent bien ; matrice de permissions couverte à 100 %.

**Phase 2 — Moteur de blocks & renderer.** `packages/tokens` (compilation CSS vars, catalogue de
polices, 2 thèmes), `packages/blocks` (10 fondamentaux), `packages/renderer`, infra de migrations de
documents. Page de démo rendant un document codé en dur. **Aucune UI d'édition.**
*DoD :* rendu SSR d'une fixture, snapshot tests, 1 migration + son test, budget JS de la page de démo
respecté, couverture ≥ 80 % sur blocks et renderer.

**Phase 3 — Éditeur v1.** Canvas iframe + bus typé + `docs/EDITOR_BRIDGE.md`, sélection/survol +
overlays + barre d'actions flottante, inspecteur généré, ajout/suppression/duplication/
réordonnancement, DnD palette → canvas et arborescence (synchronisés), undo/redo (patches Immer),
autosave + conflits, breakpoints + zoom, édition inline Tiptap, raccourcis (⌘Z ⌘⇧Z ⌘D ⌘S ⌘P ⌘K),
copier/coller inter-pages, mode aperçu, banc de perf.
*DoD :* E2E complet d'édition ; 250 blocks sous le budget d'interaction ; états vides soignés.

**Phase 4 — Pages, thème, médias.** Multi-pages + arborescence + SEO par page + 404, header/footer
globaux (avec avertissement « modifie toutes les pages »), éditeur de thème (tokens live), bibliothèque
de médias, uploads présignés, validation MIME par magic bytes, variantes webp/avif + blurhash.
*DoD :* E2E : 3 pages, nav hiérarchique, header partagé, changement de token répercuté sans reload,
upload → variantes servies.

**Phase 5 — Templates & publication.** 6 templates complets et aboutis, galerie, création de site
depuis template, révisions, publication sur sous-domaine, aperçu partagé (`PreviewLink`, noindex),
rollback.
*DoD :* E2E : template → édition → publication → `slug.lvh.me` → modification → republication →
rollback ; le brouillon n'est jamais servi.

**Phase 6 — Domaines & SEO.** `DomainProvider` (Vercel + Caddy + Fake), instructions DNS, vérification
par job avec backoff, SSL, www ↔ apex, sitemap, robots, JSON-LD (Organization, LocalBusiness, Article,
FAQ selon blocks), redirections 301, 404 personnalisable, audit Lighthouse, a11y (contraste signalé
dans l'éditeur, alt obligatoire ou décoratif explicite, `prefers-reduced-motion`).
*DoD :* Lighthouse ≥ 95 sur les 4 axes pour un template par défaut ; zéro violation axe critique.

**Phase 7 — Billing & quotas.** Stripe Checkout + Portal + webhooks idempotents, plans Free/Pro/
Business, essai 14 j, quotas serveur (ADR-014), downgrade → lecture seule, emails transactionnels
(bienvenue, vérification, invitation, site publié, domaine actif, échec de paiement, quota 80/100 %),
onboarding 4 étapes + checklist, `AuditLog`.
*DoD :* E2E Stripe en mode test ; dépassement de quota bloqué côté serveur et expliqué côté UI ;
downgrade testé sans perte de données ; couverture ≥ 80 % sur quotas.

**Phase 8 — Formulaires & analytics.** Block formulaire configurable, endpoint public, anti-spam
(honeypot + timing + rate limit + Turnstile optionnel), stockage, notifications, export CSV,
analytics privacy-first sans cookie tiers (pageviews, sources, top pages), blocks Embed/Newsletter/
WhatsApp/Code custom gaté.
*DoD :* E2E soumission → dashboard + email ; beacon analytics agrégé par le worker ; RGPD : bannière
cookies, export JSON de l'org, suppression de compte planifiée à 30 j.

**Phase 9 — CMS & contenu dynamique.** Collections, champs personnalisés, items, blocks Collection
List / Item, blog, pagination, filtres, routes dynamiques + sitemap.
*DoD :* E2E : collection → 3 items → liste + détail publics + sitemap à jour.

**Phase 10 — Polish & extensions.** UI d'historique de versions, duplication de site, multilingue
(routing, hreflang, sélecteur), dark mode des sites, animations au scroll, commentaires de
collaboration, export HTML statique (Business), audit a11y, passe de performance.
*DoD :* audit a11y et performance documentés, sans régression sur les phases précédentes.

---

## 9. Tests & qualité

- **Unitaire (Vitest)** : compilation des tokens, schémas de blocks, migrations de documents,
  `guards.ts` (matrice rôle × action), quotas, réducteurs du store éditeur, protocole du bus.
- **Composants (Testing Library)** : chaque block testé avec ses defaults et chacun de ses presets.
- **E2E (Playwright)** : inscription → template → édition → publication → domaine → paiement, sur
  base éphémère (`docker compose` + `migrate deploy` + seed).
- **Couverture ≥ 80 %** exigée sur `packages/blocks`, `packages/renderer`, permissions et quotas
  (seuils appliqués en CI, pas seulement mesurés).
- **Non-régression** : tout bug corrigé arrive avec son test, référencé dans le message de commit.
- **CI** : typecheck → lint → test → build → vérification des migrations → budget de bundle →
  banc de perf éditeur, en parallèle via Turborepo.

---

## 10. Risques et parades

| Risque | Parade |
|---|---|
| Latence du bus sur gros documents | §7 : patches, store local, Tiptap dans l'iframe, banc de perf en CI |
| Divergence rendu éditeur ↔ public | un seul `packages/renderer`, snapshot tests exécutés dans les deux modes sur les mêmes fixtures |
| Un block casse le budget JS public | ADR-011 + test de budget en CI |
| Migrations de blocks à moitié appliquées | migration paresseuse à la lecture + job batch + version par page |
| Fuite inter-tenants | ADR-007 + règle ESLint + tests d'accès cross-tenant qui doivent échouer |
| Quotas contournés par appel direct d'API | ADR-014 : `assertQuota` dans `guards.ts`, jamais dans l'UI seule |
| Downgrade destructeur | `Site.lockedAt` : lecture seule, jamais de suppression |
| CSP stricte vs Next (scripts inline) | CSP à nonce via middleware ; `frame-ancestors 'self'` pour le canvas |
| Verrou Vercel | ADR-009 + Dockerfiles + worker autonome |
| XSS (rich text, embed, code custom) | ADR-013 : allowlist structurelle, iframe sandbox sans `allow-same-origin`, gating Business |

---

## 11. Hypothèses prises et question restante

**Question non tranchée — nom du produit.** Sans réponse, je pars sur un placeholder centralisé :
scope npm `@siteforge/*`, domaine `siteforge.app`, avec le nom et le domaine isolés dans une seule
constante (`packages/config/brand.ts`) et les variables d'env — de sorte qu'un renommage ultérieur
reste un changement local. Dis-moi le vrai nom et je câble dessus dès la phase 0.

**Hypothèses appliquées, corrigeables d'un mot :**
1. **Multilingue** : schéma prêt en phase 0 (`locales[]`, `defaultLocale`), le renderer transporte la
   locale, aucune UI de traduction avant la phase 10 — conforme à ton placement en PARTIE 9.
2. **Templates** : ta phase 5 en demande 6, ta PARTIE 1 en liste 9. Je livre 6 en phase 5
   (portfolio, restaurant, agence, SaaS landing, coach/freelance, événement) et les 3 restants
   (e-commerce vitrine, immobilier, blog) en phase 10, le blog dépendant de toute façon du CMS
   livré en phase 9.
3. **DOMPurify** : remplacé par un assainissement structurel du rich text, DOMPurify conservé pour
   les seules chaînes HTML réelles (ADR-013). C'est un renforcement, pas un contournement.
4. **Catalogue de polices fermé** (ADR-012) : conséquence directe de la cible Lighthouse ≥ 95.

Feu vert sur ce plan ⇒ je démarre la phase 0 et je te livre la démo textuelle + limitations en fin
de phase.
