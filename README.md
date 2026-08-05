# L'atelier du web

SaaS de création de sites web pour utilisateurs non techniques : galerie de templates, éditeur
visuel par sections composables, thème global par design tokens, publication sur sous-domaine puis
domaine personnalisé, mini-CMS, formulaires, statistiques, abonnements.

Un site est un **document JSON versionné**, jamais du HTML stocké. Le même moteur de rendu sert
l'éditeur et le site publié.

> **État : phase 0 (fondations) terminée.** L'application n'a pas encore de surface produit :
> `/` affiche l'état des services, `/design-system` les tokens de la direction « Atelier ».
> Le découpage complet est dans [`docs/PLAN.md`](docs/PLAN.md).

## Démarrer

Prérequis : Node ≥ 22, pnpm ≥ 10, Docker.

```bash
cp .env.example .env
pnpm install
pnpm docker:up      # PostgreSQL · Redis · MinIO
pnpm db:migrate     # applique les migrations
pnpm db:seed        # 2 organisations, 5 utilisateurs, 1 site de démonstration
pnpm dev            # http://localhost:3000
```

Vérifications :

```bash
pnpm typecheck && pnpm lint && pnpm test
```

Les services tournent sur des ports décalés (Postgres `55432`, Redis `56379`, MinIO `59000`, console
MinIO `59001`) pour ne pas heurter une installation locale existante.

## Documentation

| Document                                       | Contenu                                                      |
| ---------------------------------------------- | ------------------------------------------------------------ |
| [`docs/PLAN.md`](docs/PLAN.md)                 | découpage en phases, questions ouvertes, estimations         |
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | ADR-001 à 016, flux, bus éditeur, sécurité, risques          |
| [`docs/DESIGN.md`](docs/DESIGN.md)             | direction esthétique du back-office, tokens, matrice d'états |
| [`docs/DATA_MODEL.md`](docs/DATA_MODEL.md)     | chaque table, chaque index, chaque écart au brief            |
| [`CLAUDE.md`](CLAUDE.md)                       | conventions de travail sur ce dépôt                          |

## Structure

```
apps/web          back-office (auth, dashboard, éditeur, billing)
packages/config   eslint (+ règles maison), tsconfig, env, marque
packages/db       schéma Prisma, client, seeds
packages/ui       design system du back-office
docker/           compose : PostgreSQL, Redis, MinIO
```

`apps/sites`, `apps/worker`, `packages/blocks`, `packages/renderer`, `packages/tokens`,
`packages/auth`, `packages/emails` et `packages/templates` sont créés à la phase où ils ont quelque
chose à faire. Un dossier vide est du code mort.
