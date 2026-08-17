# Calque

> Vos clients modifient leur site. Vous gardez le code.

L'agence dépose le ZIP d'un site déjà livré. Calque analyse le HTML, détecte
automatiquement ce qui est modifiable, verrouille le reste, et génère un éditeur
visuel que le client final utilise en autonomie. À la publication, le site est
régénéré à l'identique avec les nouveaux contenus.

Le contenu du client est un **calque** posé par-dessus le code source — jamais une
modification de celui-ci.

```
build(source_immuable, blueprint, contenu) → site_final
```

## Démarrage

```bash
pnpm install
cp .env.example .env          # DATABASE_DRIVER=pglite suffit pour démarrer
pnpm db:migrate
pnpm dev                      # http://localhost:3000
```

Sans clé Resend, les liens magiques de connexion sont écrits dans les logs du
serveur au lieu d'être envoyés par email. Le parcours de connexion est donc
utilisable immédiatement, sans compte tiers.

## Commandes

| Commande           | Effet                                                  |
| ------------------ | ------------------------------------------------------ |
| `pnpm dev`         | Serveur de développement Next.js                       |
| `pnpm typecheck`   | `tsc --noEmit` sur tous les packages                   |
| `pnpm lint`        | ESLint sur le monorepo                                 |
| `pnpm test`        | Vitest (unitaires + intégration sur Postgres embarqué) |
| `pnpm build`       | Build de production                                    |
| `pnpm e2e`         | Playwright                                             |
| `pnpm db:generate` | Génère une migration SQL depuis le schéma Drizzle      |
| `pnpm db:migrate`  | Applique les migrations                                |

## Structure

```
apps/web/            Next.js : marketing, application, éditeur, administration
packages/blueprint/  Types et schémas Zod partagés, interface SiteAdapter
packages/db/         Schéma Drizzle, migrations, repositories
packages/ui/         Design system Calque
fixtures/            3 sites de test + vérité terrain annotée
e2e/                 Playwright
docs/                Spécification, décisions, ADR, runbook
```

`packages/parser`, `packages/builder` et `packages/editor-runtime` arrivent
respectivement en P2, P3 et P5.

## Documentation

- [`docs/PRODUCT_SPEC.md`](docs/PRODUCT_SPEC.md) — source de vérité du produit
- [`docs/ADR-001-approche-technique.md`](docs/ADR-001-approche-technique.md) — pourquoi cette approche plutôt que Decap, Tina, Puck, Silex ou Pinegrow
- [`docs/ADR-002-identite-et-serialisation.md`](docs/ADR-002-identite-et-serialisation.md) — identité des champs et invariant byte-à-byte
- [`docs/DECISIONS.md`](docs/DECISIONS.md) — journal des décisions
- [`docs/RUNBOOK.md`](docs/RUNBOOK.md) — exploitation, sauvegardes, restauration
