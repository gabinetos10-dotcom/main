# CLAUDE.md

Guide de travail pour ce dépôt. À maintenir à jour à chaque phase.

> **État actuel : phase 0 livrée**, phase 1 (auth & organisations) en attente de feu vert.
> Produit : **L'atelier du web** — scope npm `@atelier/*`, marque centralisée dans
> `packages/config/src/brand.ts`. Back-office **bilingue** : français par défaut à la racine,
> anglais sous `/en`.

---

## Produit

SaaS de création de sites web pour utilisateurs non techniques : galerie de templates, éditeur
visuel par sections composables, thème global par design tokens, publication sur sous-domaine puis
domaine personnalisé, mini-CMS, formulaires, stats, abonnements.

**Le cœur technique** : un site est un **document JSON versionné**, pas du HTML stocké. Le même
moteur de rendu sert l'éditeur et le site publié. Tout le reste gravite autour de ce principe.

Périmètre volontairement plus étroit que Webflow/Framer : **édition par sections composables**, pas
de canvas libre en position absolue.

## Stack

| Domaine        | Choix                                                         |
| -------------- | ------------------------------------------------------------- |
| Monorepo       | pnpm workspaces + Turborepo                                   |
| Framework      | Next.js 15 (App Router) + React 19, TypeScript strict         |
| Styling        | Tailwind CSS v4 + CSS variables (design tokens)               |
| UI back-office | shadcn/ui + Radix + lucide-react                              |
| Animations     | Motion (framer-motion)                                        |
| Base           | PostgreSQL + Prisma (migrations versionnées)                  |
| API            | tRPC ; REST uniquement pour webhooks et endpoints publics     |
| Auth           | Better Auth (mdp, magic link, Google), sessions httpOnly      |
| Validation     | Zod (API, schémas de blocks, variables d'env)                 |
| État éditeur   | Zustand + Immer (patches pour undo/redo)                      |
| Drag & drop    | dnd-kit                                                       |
| Médias         | S3-compatible (R2 / MinIO en local), URLs présignées          |
| Rich text      | Tiptap, stocké en JSON                                        |
| Paiement       | Stripe (Checkout, Portal, webhooks)                           |
| Emails         | Resend + React Email                                          |
| Jobs           | BullMQ + Redis                                                |
| Tests          | Vitest, Testing Library, Playwright                           |
| Qualité        | ESLint flat config, Prettier, Husky + lint-staged, commitlint |
| Observabilité  | Sentry + pino                                                 |

## Arborescence

Ce qui existe (phase 0) :

```
apps/web          back-office — état des services, /design-system
packages/config   eslint (+ 3 règles maison), tsconfig, env, marque
packages/db       schéma Prisma, client, soft delete, seeds
packages/ui       tokens et polices du back-office
docker/           compose : Postgres, Redis, MinIO
docs/             PLAN ARCHITECTURE DESIGN DATA_MODEL
```

Créé à la phase où c'est utile — jamais avant : `packages/auth` et `packages/emails` (1),
`packages/blocks renderer tokens` (2), `apps/worker` (4), `apps/sites` et `packages/templates` (5).

## Commandes

```bash
pnpm install
pnpm docker:up           # Postgres (55432) + Redis (56379) + MinIO (59000)
pnpm db:migrate          # migrations
pnpm db:seed             # données de démo, idempotent
pnpm dev                 # http://localhost:3000
pnpm typecheck && pnpm lint && pnpm test
pnpm format              # Prettier
pnpm fonts:fetch         # rafraîchit les polices auto-hébergées
```

## Conventions

- **TypeScript strict.** Pas de `any` sans commentaire justifiant l'échappatoire. Pas de
  `@ts-expect-error` sans explication.
- **Pas de code mort, pas de TODO fantôme, pas de mock résiduel.** Une fonctionnalité non implémentée
  n'apparaît pas dans l'UI.
- **Commits conventionnels** (`feat:`, `fix:`, `chore:`, `docs:`, `test:`, `refactor:`), scopés par
  package quand c'est pertinent : `feat(blocks): ...`.
- **Chaque module métier a des tests. Chaque bug corrigé a son test de non-régression**, référencé
  dans le message de commit.
- Documentation mise à jour dans `docs/` **au fil de l'eau**, pas en fin de phase.
- **Fin de phase** = l'app démarre, tests verts, lint vert, commit conventionnel, puis : démo
  textuelle de ce qui est cliquable, limitations connues, proposition de la phase suivante.
  Aucune phase suivante sans feu vert explicite.
- **Couverture ≥ 80 %** appliquée en CI sur `packages/blocks`, `packages/renderer`, permissions,
  quotas.
- **Bilingue.** Aucune chaîne visible en dur : tout passe par `next-intl` (`messages/fr.json`,
  `messages/en.json`). Le français est la langue de référence ; l'anglais la suit dans le même
  commit. Les composants de `packages/ui` ne contiennent aucun texte : il arrive par props.
- **Marque.** Le nom du produit ne s'écrit qu'à un seul endroit : `packages/config/src/brand.ts`.
- **Imports relatifs sans extension** dans les paquets TypeScript (`./client`, pas `./client.js`) :
  webpack ne résout pas `.js` vers un `.ts` dans les paquets transpilés par Next.

## Décisions d'architecture (résumé — détail dans docs/PLAN.md et docs/ARCHITECTURE.md)

- **ADR-001** — Le document JSON est la source de vérité. Jamais de HTML en base.
- **ADR-002** — Un block = `definition.ts` (isomorphe) + `component.tsx` (runtime) + `editor.ts`
  (éditeur), assemblés par `defineBlock()`. Deux registres, pour ne pas envoyer les icônes et
  thumbnails de l'éditeur dans le bundle des sites publiés.
- **ADR-003** — Les blocks ne consomment que des tokens. Aucune valeur en dur ; lint dédié.
- **ADR-004** — Canvas d'édition dans une iframe same-origin (route `/editor/[siteId]/canvas` de
  `apps/web`), pilotée par un **bus `postMessage` typé** documenté dans `docs/EDITOR_BRIDGE.md`.
  Aucun accès DOM cross-frame hors du bus. On transporte des **patches Immer**, jamais le document.
- **ADR-005** — BullMQ + Redis (pas Trigger.dev) : la contrainte « tout en local sans compte cloud »
  l'impose, et Redis sert aussi au cache et au rate limiting. D'où `apps/worker`.
- **ADR-006** — Le site public ne lit que `Site.publishedRevisionId → snapshot`. Le brouillon
  (`Page.content`) n'est jamais servi. Rollback = repointage, non destructif.
- **ADR-007** — Aucun accès Prisma direct hors `packages/db`. Tout passe par `guards.ts`, qui vérifie
  organisation **et** rôle. Garanti par une règle ESLint.
- **ADR-008** — Better Auth pour l'identité uniquement ; modèle d'organisation maison (le plugin
  organization ferait doublon avec le schéma spécifié).
- **ADR-009** — `DomainProvider` abstrait (Vercel | Caddy) : pas de verrou propriétaire.
- **ADR-010** — Tiptap pour le rich text, sortie JSON portable. Tiptap tourne **dans l'iframe**, pas
  dans le shell : les frappes ne traversent pas le bus, seuls les commits debouncés le font.
- **ADR-011** — Blocks RSC-first : un `component.tsx` ne porte **jamais** `"use client"` à sa racine
  et n'utilise aucun hook ; l'interactivité vit dans des îlots `client/*.tsx`. Budget JS vérifié en CI.
- **ADR-012** — Catalogue de polices **fermé** (~24 familles, `next/font/local`, auto-hébergées).
  `next/font` exige des polices connues à la compilation ; c'est le prix du Lighthouse ≥ 95.
- **ADR-013** — Rich text assaini **structurellement** (allowlist Zod de nœuds/marques), pas par
  DOMPurify — le rich text est du JSON, jamais du HTML. DOMPurify réservé aux vraies chaînes HTML.
- **ADR-014** — Quotas côté serveur via `assertQuota()` : `COUNT` SQL pour les limites dures,
  `UsageCounter` pour le métré. Downgrade ⇒ `Site.lockedAt` (lecture seule), jamais de suppression.
- **ADR-015** — Tout service externe passe par une interface avec **implémentation locale** :
  `DomainProvider`, `StorageProvider`, `EmailProvider`, `PaymentProvider`. La suite E2E complète
  tourne sans un seul compte cloud.
- **ADR-016** — Tokens du back-office (`--ui-*`) et tokens des sites (`--site-*`) dans des espaces de
  noms **disjoints**. Sinon le thème d'un client repeindrait l'éditeur.

## Design du back-office (détail : `docs/DESIGN.md`)

Le produit vend du design ; l'interface qui sert à en fabriquer ne peut pas ressembler à un template.

- **Interdits** : Inter/Roboto/system-ui comme police de marque, dégradés violet→bleu sur fond blanc,
  cartes arrondies génériques empilées, emojis en guise d'icônes (Lucide uniquement), écrans vides
  sans illustration ni action.
- **Chrome sombre, canvas clair** : l'UI ne concurrence jamais visuellement le site en cours d'édition.
- **8 états obligatoires par composant** : default, hover, focus-visible, active, disabled, loading,
  error, selected. Vérifiables sur `/design-system` (dev uniquement).
- **Mouvement** : 150–250 ms, easing custom, feedback optimiste, squelettes — jamais de spinner.
- **Responsive** : éditeur ≥ 1280 px (en dessous, écran d'invitation assumé) ; dashboard et réglages
  responsives jusqu'à 375 px.

## Pièges connus

- **Éditeur ≠ public.** Toute logique de rendu vit dans `packages/renderer`. Dupliquer du rendu côté
  éditeur crée une divergence invisible jusqu'en production.
- **Migrations de blocks.** Modifier un schéma de block sans migration casse les documents existants.
  Une migration + son test sont obligatoires pour tout changement cassant.
- **Multi-tenant.** Une requête non scopée par organisation est une fuite de données. Toujours passer
  par `guards.ts`.
- **Bundle des sites publiés.** Ne jamais importer de code d'éditeur (Tiptap, dnd-kit, lucide,
  shadcn) depuis `apps/sites` ou depuis un `component.tsx` de block.
- **Polices.** Aucune police chargée dynamiquement : passer par le catalogue de
  `packages/tokens/fonts.ts` (ADR-012). Une police en plus = une PR.
- **Perf de l'éditeur.** Ne jamais envoyer le document entier sur le bus — uniquement des patches.
  Le banc de mesure (250 blocks, < 16 ms) tourne en CI et bloque les régressions.
- **`repeater`.** Les items portent un `id` nanoid stable ; ne jamais référencer un item par index,
  le réordonnancement casserait la référence.
- **Sous-domaines en dev.** Utiliser `*.lvh.me` (résout en 127.0.0.1) plutôt que de bricoler
  `/etc/hosts`.
- **Contenu utilisateur.** Embed HTML en iframe sandboxée, code custom réservé au plan Business,
  rich text assaini par allowlist au rendu.
- **Renderer autonome.** `packages/renderer` ne déclare aucune dépendance d'édition et doit
  s'importer dans un contexte Node nu — vérifié par test (PARTIE 11).
- **Permissions et quotas.** L'UI masque, le serveur interdit. Jamais l'inverse.
- **Pas de squelette anticipé.** `apps/sites` et `apps/worker` ne sont créés qu'à la phase où ils ont
  quelque chose à faire (5 et 4). Un dossier vide est du code mort.
