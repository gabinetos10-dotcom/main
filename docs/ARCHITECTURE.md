# Architecture

> Document de référence technique. Les décisions y sont numérotées (ADR) et citées par les autres
> documents. Mis à jour au fil de l'eau, pas en fin de phase.

---

## 1. Vue d'ensemble

```
                    ┌───────────────────────────────────────────────┐
   éditeur ────────►│ apps/web — back-office (Next 15)              │
                    │                                               │
                    │  shell éditeur ───── bus postMessage ─────┐   │
                    │  Zustand + Immer, dnd-kit, shadcn         │   │
                    │                                           ▼   │
                    │                      /editor/[siteId]/canvas  │
                    │                      renderer + Tiptap        │
                    │                                               │
                    │  tRPC ──► guards.ts ──► Prisma                │
                    └───────────────┬───────────────────────────────┘
                                    │
        ┌───────────────────────────┼────────────────────────────┐
        ▼                           ▼                            ▼
   PostgreSQL                    Redis                     S3 / MinIO
   documents, révisions      queues, cache tenant,      assets + variantes
                             rate limit, compteurs
        ▲                           ▲                            ▲
        │                    ┌──────┴───────┐                    │
        │                    │ apps/worker  │────────────────────┘
        │                    │ BullMQ       │
        │                    └──────────────┘
        │
   ┌────┴────────────────────────────────────┐
   │ apps/sites — runtime public (Next 15)   │◄──── visiteur
   │ middleware host→site, RSC, ISR, sitemap │
   └─────────────────────────────────────────┘
```

Trois consommateurs distincts de `packages/renderer` : `apps/sites` (public, zéro code d'éditeur),
la route canvas de `apps/web` (renderer + affordances + Tiptap), et le shell de `apps/web` (aucun
renderer). C'est cette séparation qui rend tenables *simultanément* le Lighthouse ≥ 95 public et le
confort d'édition.

---

## 2. Arborescence

```
apps/
  web/          back-office : auth, dashboard, shell éditeur + route canvas, billing, tRPC
  sites/        runtime public multi-tenant : rendu, formulaires, analytics, sitemap
  worker/       jobs BullMQ (ADR-005)
packages/
  db/           schéma Prisma, client, guards.ts, quotas, seeds
  auth/         Better Auth, permissions.ts (matrice de rôles), plans.ts (quotas)
  blocks/       définitions + composants + îlots + presets + migrations/
  renderer/     moteur de rendu du document JSON — zéro dépendance d'édition
  tokens/       design tokens des sites, presets de thèmes, catalogue de polices
  ui/           composants back-office (shadcn/ui) + tokens du back-office
  templates/    documents JSON des templates de départ
  emails/       React Email + EmailProvider
  config/       eslint (+ règles maison), tsconfig, tailwind, vitest, env.ts, brand.ts
docs/           PLAN ARCHITECTURE DESIGN DATA_MODEL BLOCKS THEMING EDITOR_BRIDGE API SECURITY DEPLOY
docker/         compose (postgres, redis, minio), Dockerfiles
```

Ajouts par rapport à la PARTIE 2 du brief : `apps/worker` (ADR-005), `packages/auth`
(`permissions.ts` imposé par la PARTIE 7), `docker/`, `docs/` étoffé.

---

## 3. Décisions d'architecture

### ADR-001 — Le document JSON est la source de vérité, jamais du HTML
`Page.content` contient un `PageDocument` (arbre de `BlockNode`). Un seul moteur de rendu sert
l'éditeur et le public. Le HTML n'existe qu'en sortie de rendu.
L'export HTML statique (Business, phase 10) est une **sortie dérivée** générée depuis une révision :
il ne contredit pas cet ADR, rien n'est stocké en HTML.

### ADR-002 — Un block = 3 fichiers, 2 registres ; le renderer ne dépend jamais de l'éditeur
Le contrat `defineBlock()` mélange runtime (schéma, composant) et éditeur (icône, thumbnail,
presets). Importer Lucide dans le runtime public gonflerait le bundle des sites publiés pour rien.

```
packages/blocks/src/blocks/hero.split/
  definition.ts   type, schema Zod, defaults, allowedChildren, version → isomorphe, zéro React
  component.tsx   rendu                                                → runtime (composant partagé)
  client/*.tsx    îlots interactifs ("use client")                     → runtime, chargés à la demande
  editor.ts       label, category, icon, thumbnail, presets, ordre     → éditeur uniquement
  index.ts        defineBlock() qui assemble le tout
```

`runtimeRegistry` (`type → { schema, component }`) et `editorRegistry` (`type → métadonnées d'UI`).
`defineBlock()` reste l'API unique documentée dans `docs/BLOCKS.md`.

**Garde-fou CI** (PARTIE 11) : `packages/renderer/package.json` ne déclare aucune dépendance
d'édition, et un test l'importe dans un contexte Node nu pour prouver qu'il fonctionne seul.

### ADR-003 — Les blocks ne consomment que des tokens
Aucune couleur / taille / rayon / ombre en dur. Une règle ESLint maison
(`no-hardcoded-design-values`) interdit littéraux hexa/rgb et classes Tailwind arbitraires dans
`packages/blocks`. Les overrides locaux vivent dans `BlockNode.style`, sont signalés « custom » dans
l'inspecteur, avec bouton « revenir au thème ».

### ADR-004 — Canvas en iframe same-origin + bus `postMessage` typé
Le canvas est une route de `apps/web` (`/editor/[siteId]/canvas`) chargée dans une iframe
same-origin. **Toute communication passe par un bus typé** ; aucun accès DOM cross-frame hors du bus
(PARTIE 5.3). Protocole : `docs/EDITOR_BRIDGE.md` (phase 3).

Au-delà de la propreté, la frontière sérialisée autorise un futur passage du canvas en
**cross-origin** le jour où on y exécutera du code custom d'utilisateur (plan Business) — ce qu'un
partage de mémoire entre frames fermerait définitivement.

Coût : la latence de sérialisation, face à la cible « 200+ blocks, < 16 ms ». Neutralisée par §6.

### ADR-005 — BullMQ + Redis, et un `apps/worker` dédié
Choix demandé (BullMQ vs Trigger.dev), tranché par la contrainte « tourne en local avec
`docker compose up`, sans compte cloud » : Trigger.dev cloud viole la contrainte, son self-host est
lourd. BullMQ ne demande qu'un Redis, déjà nécessaire pour le rate limiting, le cache de résolution
de tenant et l'agrégation des pageviews — un conteneur, trois usages.

Contrepartie assumée : BullMQ exige un process long, absent de Vercel, d'où `apps/worker`
(Dockerfile fourni). Jobs : variantes d'images + blurhash, publication, vérification DNS avec
backoff, emails, agrégation analytics, purge des révisions (7/30/90 j), purge RGPD à 30 j,
`UsageCounter`.

`apps/worker` n'est créé qu'en **phase 4**, quand le premier job réel existe (variantes d'images).
Les emails de la phase 1 partent en synchrone via `EmailProvider` — pas de file vide en attendant.

### ADR-006 — Le site public ne lit qu'une révision publiée
Publier crée une `Revision` portant un snapshot autonome (pages publiées + header/footer + thème +
SEO + redirections) puis bascule `Site.publishedRevisionId`. Le runtime résout
`hostname → Site → publishedRevisionId → snapshot` : une lecture par page, rollback par repointage
instantané et non destructif. Brouillon et publié sont strictement disjoints.

### ADR-007 — Accès aux données exclusivement via `packages/db/src/guards.ts`
Aucun `prisma.*` hors `packages/db`. Tout passe par `requireOrgAccess(ctx, orgId, permission)`,
`getSiteForOrg(...)`, etc., qui vérifient appartenance **et** permission. Règle ESLint
(`no-direct-prisma`) qui rend la violation non mergeable. Les tests d'autorisation tentent
explicitement l'accès cross-tenant et doivent échouer.

### ADR-008 — Better Auth pour l'identité, modèle d'organisation maison
Better Auth gère identité et sessions : mot de passe **argon2id** (hasher custom), vérification
email, magic link, OAuth Google, reset, sessions révocables, plugin TOTP pour la 2FA des plans
payants. Son plugin « organization » n'est **pas** utilisé : la PARTIE 3 définit ses propres
`Organization`/`Membership`/`Invitation` avec 4 rôles, quotas et lien Stripe ; deux modèles
concurrents seraient une dette immédiate. L'org active est portée par un cookie signé, revalidée à
chaque requête contre `Membership`.

### ADR-009 — Fournisseur de domaines abstrait
`DomainProvider` avec `VercelDomainProvider`, `CaddyDomainProvider` (on-demand TLS + endpoint
`/ask`) et `FakeDomainProvider` (tests, dev local). Sélection par variable d'environnement.

### ADR-010 — Rich text : Tiptap, stocké en JSON
Sortie JSON portable, rendue publiquement par un `RichTextRenderer` qui mappe les nœuds vers des
éléments stylés par tokens. **Tiptap tourne dans l'iframe**, pas dans le shell : les frappes ne
traversent pas le bus, seuls les commits debouncés le font.

### ADR-011 — Blocks RSC-first : zéro JS pour les blocks statiques
> Un `component.tsx` de block ne porte **jamais** `"use client"` à sa racine et n'utilise aucun hook.
> C'est un composant *partagé*. Toute interactivité est isolée dans un îlot `client/*.tsx`.

Côté `apps/sites` le composant s'exécute comme Server Component (zéro JS, seuls les îlots
s'hydratent) ; côté canvas, le même fichier est tiré dans le bundle client sans modification. Un
test de budget de bundle en CI échoue si une page template dépasse le budget fixé.

### ADR-012 — Catalogue de polices fermé
`next/font` exige des polices connues à la **compilation**, or un site choisit sa typographie à
l'exécution. Charger du Google Fonts dynamiquement coûterait une requête tierce, du CLS et un trou
dans la CSP — incompatible avec Lighthouse ≥ 95 et CLS ≈ 0.

Décision : catalogue fermé (~24 familles) déclaré dans `packages/tokens/fonts.ts`, auto-hébergé via
`next/font/local`, subset latin, `display: swap`, préchargé. Ajouter une police = une PR.

### ADR-013 — Rich text assaini structurellement, DOMPurify réservé au HTML brut
Le rich text n'est **jamais du HTML** : c'est du JSON Tiptap. Une allowlist Zod de types de nœuds et
de marques, appliquée à l'entrée *et* au rendu, est strictement plus forte que d'assainir du HTML a
posteriori (rien d'inconnu ne peut exister dans l'arbre) et gratuite à l'exécution.

`isomorphic-dompurify` reste utilisé là où une chaîne HTML brute existe réellement : prévisualisation
du block Embed dans le canvas, contenu importé. Le block Embed publié vit dans une iframe
`sandbox="allow-scripts"` **sans** `allow-same-origin` ; le Code custom est réservé au plan Business,
injecté hors de l'arbre React, avec avertissement explicite.

### ADR-014 — Quotas évalués côté serveur, à deux vitesses
Helper unique `assertQuota(orgId, resource)` appelé depuis `guards.ts` :
- **limites dures** (sites, pages/site, membres, collections) → `COUNT` SQL, autorité absolue, sans
  cache ;
- **compteurs métrés** (stockage, soumissions/mois, pageviews) → `UsageCounter` incrémenté
  transactionnellement, agrégé par le worker.

Le downgrade ne supprime jamais : le webhook Stripe pose `Site.lockedAt` sur les sites au-delà du
quota (l'utilisateur choisit lesquels, à défaut les plus récents), ce qui les bascule en lecture
seule ; l'upgrade lève le verrou. Verrou stocké, non recalculé, pour être auditable.

### ADR-015 — Tout service externe passe par une interface avec implémentation locale
Exigence de la PARTIE 11. Quatre frontières :

| Interface | Implémentations |
|---|---|
| `DomainProvider` | Vercel · Caddy · Fake (dev/tests) |
| `StorageProvider` | S3/R2 · MinIO (docker compose) — API présignée identique |
| `EmailProvider` | Resend · Console (dev : écrit dans les logs et sur disque) |
| `PaymentProvider` | Stripe · Fake (dev/tests : simule webhooks et changements de plan) |

Conséquence directe : la suite E2E complète tourne sans un seul compte cloud, et le self-host Docker
reste un chemin de première classe, pas un mode dégradé.

### ADR-016 — Le back-office a ses propres tokens, étanches à ceux des sites
Piège structurel : le canvas rend un site dont les tokens s'appellent `--color-primary`,
`--radius-md`… Si le back-office utilisait les mêmes noms, tout changement de thème d'un client
repeindrait l'éditeur.

Deux espaces de noms disjoints : `--ui-*` (back-office, `packages/ui`, valeurs figées issues de
`docs/DESIGN.md`) et `--site-*` (sites, `packages/tokens`, valeurs dynamiques par thème). L'iframe
du canvas ne reçoit **que** les `--site-*`. Une règle ESLint interdit les `--site-*` dans
`packages/ui` et `apps/web` hors route canvas.

---

## 4. Flux principaux

### 4.1 Édition
```
frappe / drag / champ d'inspecteur
  → mutation Immer sur le store du shell → patches
  → bus : doc:patch (patches uniquement, jamais le document)
  → store du canvas → re-render du seul sous-arbre concerné
  → autosave debounce 1,5 s → tRPC → verrou optimiste sur draftUpdatedAt
       ↳ conflit ⇒ 409 ⇒ bannière « modifiée ailleurs » (recharger / écraser)
```

### 4.2 Publication
```
« Publier » → job BullMQ
  1. valide chaque document contre les schémas de blocks (échec ⇒ refus + log lisible)
  2. construit le snapshot : pages publiées + header/footer + thème + SEO + redirections
  3. Revision(kind=PUBLISH) + Deployment(QUEUED→BUILDING)
  4. Site.publishedRevisionId = revision.id
  5. revalidateTag(`site:${siteId}`) → purge ISR + cache Redis de résolution de tenant
  6. sitemap.xml / robots.txt ; Deployment → LIVE (ou FAILED + log)

Rollback = repointer publishedRevisionId + revalidateTag. Instantané, non destructif.
```

### 4.3 Requête publique
```
GET https://monsite.fr/tarifs
  → middleware : hostname → siteId (cache Redis, TTL court)
  → app/[[...slug]]/page.tsx : snapshot de la révision publiée
  → renderer (RSC) + tokens du thème en CSS vars + JSON-LD dérivé des blocks présents
  → ISR, tag `site:${siteId}`
```

---

## 5. Bus éditeur ↔ canvas (esquisse — détail en phase 3)

Messages typés, versionnés, validés par Zod aux deux extrémités.

| Sens | Messages |
|---|---|
| shell → canvas | `doc:init`, `doc:patch`, `selection:set`, `hover:set`, `breakpoint:set`, `mode:set`, `dnd:pointer`, `measure:request` |
| canvas → shell | `ready`, `node:click`, `node:hover`, `node:measured`, `dnd:target`, `doc:patch` (commit Tiptap debouncé), `error` |

Règles : aucun accès DOM cross-frame hors bus ; tout message porte un `protocolVersion` ; les rects
sont batchés dans une frame (rAF) ; **les overlays de sélection sont dessinés dans le shell** à
partir des mesures reçues, jamais injectés dans le document du canvas — sinon le canvas ne rendrait
plus exactement ce que le visiteur verra.

---

## 6. Tenir les 16 ms sur 200+ blocks avec un bus sérialisé

Risque n°1 du choix ADR-004. Parades, validées par un banc de mesure dès la phase 3 :

1. **Patches, pas documents** — une frappe produit quelques centaines d'octets.
2. **Store local au canvas** — re-render du seul sous-arbre (sélecteurs par `node.id`, `memo`, clés
   stables).
3. **Tiptap dans l'iframe** — l'édition inline ne traverse pas le bus.
4. **Mesures batchées** — `ResizeObserver` + `IntersectionObserver`, un message par frame.
5. **Virtualisation de l'arborescence** au-delà de 100 nœuds.
6. **Banc de mesure en CI** — document de 250 blocks, budget d'interaction mesuré, échec si
   régression. Sans ce garde-fou, « < 16 ms » n'est qu'une intention.

---

## 7. Modèle de données — ajouts au schéma de la PARTIE 3

Le schéma imposé est implémenté tel quel. Ajouts, chacun justifié (détail dans `DATA_MODEL.md`,
écrit en phase 0 avec le schéma réel) :

| Ajout | Justification |
|---|---|
| `Site.publishedRevisionId` | ADR-006 : révision servie ; rollback = un `UPDATE`. |
| `Site.lockedAt` | ADR-014 : lecture seule après downgrade, sans suppression. |
| `Site.cookieBanner`, `Site.csp` (Json) | Bannière configurable et CSP par site (PARTIE 8). |
| `Revision.kind` (`AUTOSAVE\|PUBLISH\|MANUAL`) | Rétention différenciée 7/30/90 j selon le plan. |
| `Page.contentVersion` | Version de schéma du document (migrations de blocks). |
| `Page.draftUpdatedAt`, `Page.lastEditedById` | Détection de conflit d'édition concurrente. |
| `Redirect` (siteId, from, to, statusCode) | Redirections 301 configurables (PARTIE 6). |
| `PreviewLink` (siteId, token, expiresAt, revokedAt) | Aperçu partagé **révocable** — un JWT seul ne le serait pas. |
| `PageView` (siteId, date, path, referrerHost, country) | Top pages et sources ; `UsageCounter` est mensuel/org, il ne peut pas alimenter un graphe. |
| `Asset.status`, `Asset.variants` (Json) | Upload présigné en deux temps ; variantes webp/avif du worker. |
| `Domain.lastCheckedAt`, `Domain.error`, `Domain.redirectTo` | Polling DNS avec backoff, cause d'échec affichable, www ↔ apex. |
| `Organization.onboarding` (Json) | Checklist de démarrage persistante (PARTIE 7). |
| `DeletionRequest` (scope, targetId, scheduledPurgeAt) | Suppression de compte avec purge à 30 j (PARTIE 8). |
| `Session`, `Account`, `Verification`, `TwoFactor` | Tables Better Auth + plugin TOTP. |
| `Comment` *(phase 10 uniquement)* | Mode collaboration ; pas créé avant d'être utilisé. |

Index : `(siteId, path)` unique, `(orgId)`, `Domain.hostname` unique, `Site.slug` unique,
`(collectionId, slug)` unique, `(siteId, createdAt)` sur `FormSubmission`, `(orgId, period)` unique
sur `UsageCounter`, `(siteId, date, path)` sur `PageView`. Soft delete `archivedAt` sur `Site` et
`Page` via extension Prisma filtrant par défaut, avec échappatoire explicite `withArchived()`.

---

## 8. Sécurité (PARTIE 8)

- **Isolation multi-tenant** : ADR-007 + tests d'accès cross-tenant qui doivent échouer.
- **CSP** : nonce généré par middleware sur le back-office (`frame-ancestors 'self'` pour le canvas) ;
  CSP par site, configurable, sur les sites publiés.
- **Rate limiting Redis** : auth, uploads, soumissions de formulaire, API publique.
- **Uploads** : validation MIME par **magic bytes** (pas par extension ni `Content-Type`), taille max,
  SVG refusés ou assainis, noms aléatoires, URLs présignées à TTL court.
- **Anti-spam** : honeypot + délai minimal de remplissage + rate limit + Turnstile optionnel.
- **RGPD** : bannière configurable, export JSON de l'organisation, suppression avec purge à 30 j,
  journal d'audit, résidence des données documentée dans `DEPLOY.md`.
- **Secrets** : `packages/config/env.ts` valide l'environnement au démarrage (Zod) et fait échouer le
  boot plutôt que de laisser une variable manquante se manifester en production.

---

## 9. Registre des risques

| Risque | Parade |
|---|---|
| Latence du bus sur gros documents | §6 : patches, store local, Tiptap dans l'iframe, banc de perf en CI |
| Divergence rendu éditeur ↔ public | un seul renderer, snapshot tests dans les deux modes sur les mêmes fixtures |
| Un block casse le budget JS public | ADR-011 + test de budget en CI |
| Migrations de blocks à moitié appliquées | migration paresseuse à la lecture + job batch + version par page |
| Fuite inter-tenants | ADR-007 + règle ESLint + tests cross-tenant |
| Quotas contournés par appel direct d'API | ADR-014 : `assertQuota` dans `guards.ts`, jamais dans l'UI seule |
| Downgrade destructeur | `Site.lockedAt` : lecture seule, jamais de suppression |
| Thème d'un client repeignant l'éditeur | ADR-016 : espaces de noms `--ui-*` / `--site-*` disjoints |
| Verrou hébergeur | ADR-009 + ADR-015 + Dockerfiles + worker autonome |
| XSS (rich text, embed, code custom) | ADR-013 : allowlist structurelle, iframe sandbox, gating Business |
