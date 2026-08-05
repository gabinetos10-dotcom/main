# Plan d'implémentation

> **Statut : en attente de validation.** Aucune ligne de code applicatif n'est écrite.
> Version 3 — spécification complète (PARTIES 0 à 12) intégrée.
>
> Les décisions techniques ont quitté ce document pour `docs/ARCHITECTURE.md` (ADR-001 à ADR-016).
> Le design du back-office est dans `docs/DESIGN.md` (3 directions, une à arbitrer).
> Ce plan est un document d'exécution : questions bloquantes, découpage, arborescences, estimations.

---

## 1. Les 8 questions qui bloquent une bonne implémentation

Questions de produit uniquement — les arbitrages techniques sont tranchés dans `ARCHITECTURE.md`.
Les quatre premières bloquent la phase 0 ; les quatre suivantes bloquent une phase identifiée et
peuvent attendre, mais leur réponse change des choses en amont.

**Bloquantes maintenant**

1. **Nom du produit et domaine.** Conditionne le scope npm (`@x/blocks`), le domaine des
   sous-domaines publiés, les emails, la marque. Le changer tard coûte cher.
2. **Direction esthétique du back-office** — A « Atelier », B « Papier » ou C « Console »
   (`docs/DESIGN.md`). Recommandation : **A**. C'est le socle de `packages/ui`.
3. **Langue de l'interface.** Français seul, anglais seul, ou bilingue dès le départ ? Un back-office
   bilingue impose une infrastructure i18n dès la phase 1 et une discipline sur chaque chaîne écrite ;
   la rétro-adapter plus tard coûte trois fois plus. *(Question distincte du multilingue des **sites**
   publiés, qui est en phase 10.)*
4. **Cible prioritaire.** Indépendants et TPE francophones, ou agences qui livrent des sites à leurs
   clients ? Cela change les templates, les données de seed, le ton, l'importance du multi-membres et
   la valeur relative du plan Business.

**Bloquantes plus tard, mais à trancher tôt**

5. **Onboarding — peut-on partir d'un site vierge ?** Ou le choix d'un template est-il obligatoire
   (parcours en 4 étapes de la PARTIE 7) ? Un site vierge est un état vide de plus à concevoir et
   un chemin de sortie du tunnel d'onboarding. *(phase 5 / 7)*
6. **Les 6 templates de la phase 5.** Ta PARTIE 1 en liste 9, ta phase 5 en demande 6. Ma
   proposition : portfolio, restaurant, agence, SaaS landing, coach/freelance, événement — les 3
   restants (e-commerce vitrine, immobilier, blog) en phase 10, le blog dépendant du CMS de la phase
   9. À confirmer ou réordonner. *(phase 5)*
7. **Hébergement de production et résidence des données.** Vercel + Neon/Supabase + R2 en régions UE,
   ou self-host Docker ? La PARTIE 8 impose de mentionner l'hébergement UE ; ADR-015 garantit que les
   deux chemins restent ouverts, mais la cible détermine ce que la CI vérifie réellement et ce que
   dit `DEPLOY.md`. *(phase 6)*
8. **Analytics — pageviews seulement, ou aussi conversions ?** La PARTIE 8 demande pageviews, sources
   et top pages. Faut-il aussi des événements (clics de CTA, soumissions de formulaire, scroll) ?
   Cela change le schéma de collecte, pas seulement l'affichage. *(phase 8)*

---

## 2. Vue d'ensemble des phases (PARTIE 9)

Une phase à la fois, aucune suivante sans feu vert. Chaque phase se clôt par : l'app démarre,
`pnpm typecheck && pnpm lint && pnpm test` verts, docs à jour, commit conventionnel, **démo textuelle
de ce qui est cliquable + limitations connues + proposition de la phase suivante**.

| # | Phase | Cœur du livrable |
|---|---|---|
| 0 | Fondations | monorepo, Docker, Prisma + seeds, tooling, CI, docs |
| 1 | Auth & organisations | identité, rôles, invitations, shell back-office |
| 2 | Moteur de blocks & renderer | tokens, 10 blocks, renderer, page de démo — aucune UI d'édition |
| 3 | Éditeur v1 | canvas iframe + bus, inspecteur généré, undo/redo, autosave, inline text |
| 4 | Pages, thème, médias | multi-pages, header/footer, éditeur de thème, médiathèque |
| 5 | Templates & publication | 6 templates, révisions, sous-domaines, aperçu partagé, rollback |
| 6 | Domaines & SEO | domaines custom + SSL, sitemap, JSON-LD, Lighthouse, a11y |
| 7 | Billing & quotas | Stripe, plans, quotas serveur, emails, onboarding |
| 8 | Formulaires & analytics | formulaires, anti-spam, export CSV, analytics sans cookie |
| 9 | CMS & contenu dynamique | collections, items, blocks dynamiques, blog |
| 10 | Polish & extensions | historique UI, duplication, multilingue, a11y, perf, export HTML |

Répartition de la bibliothèque de blocks (PARTIE 4.3) : **phase 2** les 10 fondamentaux (Section,
Container, Columns, Grid, Spacer, Divider, Heading, RichText, Image, Button) · **3** ButtonGroup,
Icon, Badge, Quote, Video, Gallery · **4** Header, Footer, Logos · **5** tout le marketing et le
local + Cookie banner · **8** Formulaire, Newsletter, Embed, WhatsApp, Code custom · **9** Collection
List/Item, Blog, Article.

---

## 3. Phase 0 — Fondations *(détaillée)*

**Objectif.** Sur une machine vierge : `docker compose up -d && pnpm install && pnpm db:migrate &&
pnpm db:seed && pnpm dev` démarre, `pnpm test` passe, la CI est verte. Rien d'autre. Aucune UI
fonctionnelle promise, donc aucun bouton mort (PARTIE 11).

**Périmètre volontairement exclu.** `apps/sites` et `apps/worker` **ne sont pas créés** : ils
n'auraient rien à faire avant les phases 5 et 4. Créer des squelettes vides serait du code mort.
`guards.ts` n'expose que ses types et sa signature ; l'implémentation arrive avec les rôles, en
phase 1.

### Arborescence prévue

```
.
├── .github/workflows/ci.yml            typecheck · lint · test · build · migrations
├── .husky/{pre-commit,commit-msg}
├── docker/
│   ├── docker-compose.yml              postgres 16 · redis 7 · minio
│   └── postgres/init.sql               extensions (pgcrypto, citext)
├── docs/{PLAN,ARCHITECTURE,DESIGN,DATA_MODEL}.md
├── package.json · pnpm-workspace.yaml · turbo.json · tsconfig.json
├── .env.example                        exhaustif et commenté (PARTIE 8)
├── .gitignore · .prettierrc · .editorconfig · commitlint.config.ts
├── CLAUDE.md
├── packages/config/
│   ├── eslint/{base.js,next.js,react.js,node.js}
│   ├── eslint/rules/{no-hardcoded-design-values.js,no-direct-prisma.js,no-emoji-jsx.js}
│   ├── eslint/rules/__tests__/*.test.ts          une règle non testée est une règle qui ne tient pas
│   ├── tsconfig/{base,next,node,react-library}.json
│   ├── tailwind/preset.ts
│   ├── vitest/{base,react}.ts
│   └── src/{env.ts,brand.ts,index.ts}            env validé par Zod, marque centralisée
└── packages/db/
    ├── prisma/schema.prisma                       le schéma complet de la PARTIE 3 + ajouts §7 ARCHI
    ├── prisma/migrations/0001_init/
    ├── src/{client.ts,index.ts}
    ├── src/guards.ts                              types + signatures (impl. en phase 1)
    ├── src/extensions/soft-delete.ts
    ├── src/seed/{index.ts,users.ts,organizations.ts,sites.ts}
    └── src/__tests__/{schema.test.ts,soft-delete.test.ts}
```

### Tâches

1. Squelette pnpm + Turborepo, TypeScript strict partagé, Prettier, EditorConfig.
2. ESLint flat config + **les trois règles maison, avec leurs tests** — elles portent des ADR
   (003, 007) et une règle non testée ne protège rien.
3. Husky + lint-staged + commitlint (commits conventionnels imposés dès le premier commit de code).
4. `docker-compose.yml` : Postgres 16, Redis 7, MinIO avec création automatique du bucket. Ports
   non standards pour ne pas heurter une installation locale existante.
5. `packages/config/env.ts` : schéma Zod serveur/client, échec au démarrage si une variable manque.
   `.env.example` exhaustif et commenté.
6. Schéma Prisma complet (PARTIE 3 + ajouts justifiés en ARCHI §7), migration initiale, index, soft
   delete par extension Prisma.
7. Seeds : 2 organisations, 4 utilisateurs couvrant les 4 rôles, 1 site de démonstration — de quoi
   travailler dès la phase 1 sans cliquer.
8. CI GitHub Actions : typecheck, lint, test, build, `prisma migrate diff` pour détecter un schéma
   désynchronisé de ses migrations.
9. `docs/DATA_MODEL.md` écrit **avec** le schéma, pas après.

### Definition of Done

- [ ] Machine vierge : la séquence de démarrage complète fonctionne, documentée dans `README.md`.
- [ ] `pnpm typecheck && pnpm lint && pnpm test` verts.
- [ ] Les 3 règles ESLint échouent bien sur leurs cas de violation (tests).
- [ ] `pnpm db:seed` est idempotent (rejouable sans erreur).
- [ ] CI verte sur la branche.
- [ ] `DATA_MODEL.md` justifie chaque table et chaque index.

**Ordre de grandeur.** ~45–55 fichiers, ~1 800–2 300 lignes dont ~40 % de configuration.
Équivalent humain : **2 à 3 jours**. Aucune inconnue technique ; le risque est la dispersion, pas la
difficulté.

---

## 4. Phase 1 — Auth & organisations *(détaillée)*

**Objectif.** Un utilisateur s'inscrit, vérifie son email, crée une organisation, invite un
collègue, lui donne un rôle, et chacun voit exactement ce que son rôle autorise. Le dashboard est
vide mais réel : pas de carte « Sites » factice tant que les sites n'existent pas.

**Périmètre exclu.** Aucun site, aucune page, aucun éditeur. La 2FA TOTP est câblée côté schéma mais
son UI arrive en phase 7 avec les plans payants (elle y est conditionnée par la PARTIE 7).

### Arborescence prévue

```
packages/auth/
├── src/index.ts                     instance Better Auth (serveur)
├── src/client.ts                    client React
├── src/hash.ts                      argon2id
├── src/session.ts                   organisation active (cookie signé, revalidée à chaque requête)
├── src/permissions.ts               matrice rôle × permission — source unique
├── src/plans.ts                     Free / Pro / Business et leurs quotas (PARTIE 7)
└── src/__tests__/{permissions.test.ts,session.test.ts}      couverture 100 % sur la matrice

packages/emails/
├── src/provider/{index.ts,resend.ts,console.ts}             ADR-015, impl. locale incluse
├── src/components/{layout.tsx,button.tsx,footer.tsx}
├── src/templates/{verify-email,magic-link,invitation,welcome}.tsx
└── src/__tests__/render.test.ts

packages/ui/
├── src/styles/{tokens.css,fonts.ts}                         direction validée dans DESIGN.md
├── src/components/{button,input,field,label,select,checkbox,dialog,dropdown-menu,
│                   avatar,badge,toast,skeleton,empty-state,table,tabs,separator,
│                   tooltip,form}.tsx
├── src/components/__tests__/*.test.tsx                       les 8 états, par composant
└── src/app/design-system/                                    page de revue, dev uniquement

packages/db/src/guards.ts             implémentation réelle : requireOrgAccess, requireRole…
packages/db/src/__tests__/guards.cross-tenant.test.ts         doit échouer à franchir les tenants

apps/web/
├── src/app/(auth)/{login,register,verify-email,forgot-password,reset-password,magic-link}/page.tsx
├── src/app/(auth)/layout.tsx
├── src/app/(app)/layout.tsx                                  shell : nav, switcher d'org, menu user
├── src/app/(app)/[orgSlug]/page.tsx                          dashboard (état vide soigné)
├── src/app/(app)/[orgSlug]/settings/{general,members,billing-placeholder}/page.tsx
├── src/app/(app)/account/{profile,sessions,security}/page.tsx
├── src/app/onboarding/create-organization/page.tsx
├── src/app/invite/[token]/page.tsx
├── src/app/api/auth/[...all]/route.ts
├── src/app/api/trpc/[trpc]/route.ts
├── src/middleware.ts                                         session + CSP à nonce
├── src/server/api/{root.ts,trpc.ts}                           protectedProcedure, orgProcedure
├── src/server/api/routers/{organization,member,invitation,user}.ts
├── src/server/rate-limit.ts                                   Redis, sur les routes d'auth
└── src/components/{app-shell,org-switcher,user-menu,role-badge}.tsx

e2e/{auth.spec.ts,organizations.spec.ts,invitations.spec.ts,permissions.spec.ts}
```

### Tâches

1. Better Auth : mot de passe argon2id, vérification email, magic link, OAuth Google, reset,
   sessions listables et révocables.
2. `permissions.ts` : matrice explicite des 4 rôles de la PARTIE 7 — OWNER (tout + facturation),
   ADMIN (tout sauf facturation), EDITOR (édite, ne publie ni ne supprime), VIEWER (lecture +
   commentaires). **Une seule source**, consommée par le serveur *et* par l'UI. L'UI masque, le
   serveur interdit ; jamais l'inverse (PARTIE 11).
3. `guards.ts` réel + tests d'accès cross-tenant qui doivent échouer.
4. Organisations : création, slug unique, réglages, changement d'organisation active.
5. Invitations : envoi, expiration, acceptation, révocation, ré-invitation ; le cas « déjà membre »
   et le cas « email différent de l'invitation » traités explicitement.
6. `packages/ui` : les composants ci-dessus dans la direction esthétique validée, chacun avec ses 8
   états, plus la page de revue `/design-system`.
7. Rate limiting Redis sur inscription, connexion, reset et magic link.
8. CSP à nonce sur le back-office.
9. E2E : inscription → vérification → organisation → invitation → acceptation → rôle appliqué.

### Definition of Done

- [ ] Les 4 rôles se comportent conformément à la matrice, testés côté serveur.
- [ ] Une requête cross-tenant échoue, prouvé par test.
- [ ] Couverture 100 % sur `permissions.ts`, ≥ 80 % sur `guards.ts`.
- [ ] Chaque composant `packages/ui` traite ses 8 états, vérifiable sur `/design-system`.
- [ ] Les emails partent en local sans compte Resend (`ConsoleEmailProvider`).
- [ ] Aucun élément d'UI ne mène à une fonctionnalité inexistante.
- [ ] E2E verts.

**Ordre de grandeur.** ~80–100 fichiers, ~5 000–6 500 lignes. Équivalent humain : **5 à 7 jours**,
dont environ un tiers pour `packages/ui` — c'est le moment où la direction de `DESIGN.md` devient du
code, et la qualité de cette phase conditionne toutes les suivantes.

**Risques de la phase.** L'intégration Better Auth ↔ modèle d'organisation maison (ADR-008) est le
point d'incertitude principal : c'est là que je peux découvrir une friction demandant un ajustement,
que je signalerai plutôt que de contourner en silence.

---

## 5. Hypothèses appliquées, corrigeables d'un mot

1. **Multilingue des sites** : schéma prêt dès la phase 0 (`locales[]`, `defaultLocale`), le renderer
   transporte la locale, aucune UI de traduction avant la phase 10 — conforme à ta PARTIE 9.
2. **Nom du produit** : à défaut de réponse, `@siteforge/*` et `siteforge.app`, isolés dans
   `packages/config/brand.ts` pour qu'un renommage reste un changement local.
3. **DOMPurify** : remplacé par un assainissement structurel du rich text, DOMPurify conservé pour
   les seules chaînes HTML réelles (ADR-013). Renforcement, pas contournement.
4. **Catalogue de polices fermé** (ADR-012) : conséquence directe de la cible Lighthouse ≥ 95.
5. **`apps/sites` et `apps/worker`** ne sont pas créés en phase 0 mais aux phases 5 et 4, quand ils
   ont quelque chose à faire.

---

Réponses aux questions 1 à 4 du §1 et feu vert ⇒ je démarre la phase 0.
