# CLAUDE.md

Guide de travail pour ce dépôt. À maintenir à jour à chaque phase.

> **État actuel : pré-phase 0.** Le plan (`docs/PLAN.md`) attend validation ; aucun code applicatif
> n'existe encore. Les commandes ci-dessous décrivent la cible et seront vérifiées, une par une, à la
> fin de la phase 0. Ne pas les considérer comme fonctionnelles avant.

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

| Domaine | Choix |
|---|---|
| Monorepo | pnpm workspaces + Turborepo |
| Framework | Next.js 15 (App Router) + React 19, TypeScript strict |
| Styling | Tailwind CSS v4 + CSS variables (design tokens) |
| UI back-office | shadcn/ui + Radix + lucide-react |
| Animations | Motion (framer-motion) |
| Base | PostgreSQL + Prisma (migrations versionnées) |
| API | tRPC ; REST uniquement pour webhooks et endpoints publics |
| Auth | Better Auth (mdp, magic link, Google), sessions httpOnly |
| Validation | Zod (API, schémas de blocks, variables d'env) |
| État éditeur | Zustand + Immer (patches pour undo/redo) |
| Drag & drop | dnd-kit |
| Médias | S3-compatible (R2 / MinIO en local), URLs présignées |
| Rich text | Tiptap, stocké en JSON |
| Paiement | Stripe (Checkout, Portal, webhooks) |
| Emails | Resend + React Email |
| Jobs | BullMQ + Redis |
| Tests | Vitest, Testing Library, Playwright |
| Qualité | ESLint flat config, Prettier, Husky + lint-staged, commitlint |
| Observabilité | Sentry + pino |

## Arborescence

```
apps/web      back-office (auth, dashboard, éditeur, billing, tRPC)
apps/sites    runtime public multi-tenant
apps/worker   jobs BullMQ
packages/db blocks renderer tokens ui templates emails config
docs/         PLAN ARCHITECTURE DATA_MODEL BLOCKS THEMING API DEPLOY
docker/       compose + Dockerfiles
```

## Commandes (cible)

```bash
docker compose up -d     # Postgres + Redis + MinIO
pnpm install
pnpm db:migrate          # migrations
pnpm db:seed             # données de démo
pnpm dev                 # toutes les apps
pnpm typecheck && pnpm lint && pnpm test
pnpm test:e2e            # Playwright
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
- Fin de phase = l'app démarre, tests verts, lint vert, commit conventionnel.

## Décisions d'architecture (résumé — détail dans docs/PLAN.md et docs/ARCHITECTURE.md)

- **ADR-001** — Le document JSON est la source de vérité. Jamais de HTML en base.
- **ADR-002** — Un block = `definition.ts` (isomorphe) + `component.tsx` (runtime) + `editor.ts`
  (éditeur), assemblés par `defineBlock()`. Deux registres, pour ne pas envoyer les icônes et
  thumbnails de l'éditeur dans le bundle des sites publiés.
- **ADR-003** — Les blocks ne consomment que des tokens. Aucune valeur en dur ; lint dédié.
- **ADR-004** — Canvas d'édition dans une iframe same-origin, React monté par portal (store partagé,
  pas de `postMessage`). *À valider.*
- **ADR-005** — BullMQ + Redis (pas Trigger.dev) : la contrainte « tout en local sans compte cloud »
  l'impose, et Redis sert aussi au cache et au rate limiting. D'où `apps/worker`.
- **ADR-006** — Le site public ne lit que `Site.currentRevisionId → snapshot`. Le brouillon
  (`Page.content`) n'est jamais servi. Rollback = repointage, non destructif.
- **ADR-007** — Aucun accès Prisma direct hors `packages/db`. Tout passe par `guards.ts`, qui vérifie
  organisation **et** rôle. Garanti par une règle ESLint.
- **ADR-008** — Better Auth pour l'identité uniquement ; modèle d'organisation maison (le plugin
  organization ferait doublon avec le schéma spécifié).
- **ADR-009** — `DomainProvider` abstrait (Vercel | Caddy) : pas de verrou propriétaire.
- **ADR-010** — Tiptap pour le rich text, sortie JSON portable.

## Pièges connus

- **Éditeur ≠ public.** Toute logique de rendu vit dans `packages/renderer`. Dupliquer du rendu côté
  éditeur crée une divergence invisible jusqu'en production.
- **Migrations de blocks.** Modifier un schéma de block sans migration casse les documents existants.
  Une migration + son test sont obligatoires pour tout changement cassant.
- **Multi-tenant.** Une requête non scopée par organisation est une fuite de données. Toujours passer
  par `guards.ts`.
- **Bundle des sites publiés.** Ne jamais importer de code d'éditeur (Tiptap, dnd-kit, lucide,
  shadcn) depuis `apps/sites` ou depuis un `component.tsx` de block.
- **`repeater`.** Les items portent un `id` nanoid stable ; ne jamais référencer un item par index,
  le réordonnancement casserait la référence.
- **Sous-domaines en dev.** Utiliser `*.lvh.me` (résout en 127.0.0.1) plutôt que de bricoler
  `/etc/hosts`.
- **Contenu utilisateur.** Embed HTML en iframe sandboxée, code custom réservé au plan Business,
  rich text assaini par allowlist au rendu.
