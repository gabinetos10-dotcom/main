# Plan d'implémentation

> **Statut : phase 0 livrée. En attente de feu vert pour la phase 1.**
> Version 4 — spécification complète (PARTIES 0 à 12) intégrée.
>
> Les décisions techniques sont dans `docs/ARCHITECTURE.md` (ADR-001 à ADR-016), le design du
> back-office dans `docs/DESIGN.md`, le schéma dans `docs/DATA_MODEL.md`.
> Ce plan est un document d'exécution : décisions produit, découpage, arborescences, estimations.

---

## 1. Décisions produit

**Tranchées.**

| Sujet                 | Décision                                                                                                                                                                                                                                                        |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Nom du produit        | **L'atelier du web**. Scope npm `@atelier/*`, domaine `atelierduweb.fr`, centralisé dans `packages/config/src/brand.ts`. Le domaine des sites publiés est une variable distincte (`SITES_BASE_DOMAIN`) : les déménager plus tard ne demandera pas de migration. |
| Direction esthétique  | **A — « Atelier »** : encre chaude, filets nets, accent vermillon unique, mono sur les valeurs numériques. Implémentée en tokens dès la phase 0.                                                                                                                |
| Langue de l'interface | **Français par défaut, anglais disponible.** `next-intl`, français à la racine (`/`), anglais sous préfixe (`/en`). Infrastructure posée en phase 0 pour ne pas restructurer `app/` plus tard.                                                                  |
| Cible                 | **Indépendants et agences**, avec des templates nettement plus poussés que le standard du marché. Voir § 5 pour ce que cela change au planning.                                                                                                                 |

**Encore ouvertes** — aucune ne bloque la phase 1.

5. **Onboarding — peut-on partir d'un site vierge ?** Ou le choix d'un template est-il obligatoire
   (parcours en 4 étapes, PARTIE 7) ? Un site vierge est un état vide de plus à concevoir et un
   chemin de sortie du tunnel. _(phase 5 / 7)_
6. **Les 6 templates de la phase 5.** Proposition : portfolio, restaurant, agence, SaaS landing,
   coach/freelance, événement — les 3 restants (e-commerce vitrine, immobilier, blog) en phase 10,
   le blog dépendant du CMS de la phase 9. _(phase 5)_
7. **Hébergement de production et résidence des données.** Vercel + Neon/Supabase + R2 en régions
   UE, ou self-host Docker ? ADR-015 garde les deux ouverts, mais la cible détermine ce que la CI
   vérifie et ce que dit `DEPLOY.md`. _(phase 6)_
8. **Analytics — pageviews seulement, ou aussi les conversions ?** Événements de clic sur CTA,
   soumissions, scroll : cela change le schéma de collecte, pas seulement l'affichage. _(phase 8)_

---

## 2. Vue d'ensemble des phases (PARTIE 9)

Une phase à la fois, aucune suivante sans feu vert. Chaque phase se clôt par : l'app démarre,
`pnpm typecheck && pnpm lint && pnpm test` verts, docs à jour, commit conventionnel, **démo textuelle
de ce qui est cliquable + limitations connues + proposition de la phase suivante**.

| #        | Phase                       | Cœur du livrable                                                              |
| -------- | --------------------------- | ----------------------------------------------------------------------------- |
| **0** ✅ | **Fondations**              | monorepo, Docker, Prisma + seeds, tooling, CI, docs, tokens de la direction A |
| 1        | Auth & organisations        | identité, rôles, invitations, shell back-office, `packages/ui`                |
| 2        | Moteur de blocks & renderer | tokens des sites, 10 blocks, renderer, page de démo — aucune UI d'édition     |
| 3        | Éditeur v1                  | canvas iframe + bus, inspecteur généré, undo/redo, autosave, texte inline     |
| 4        | Pages, thème, médias        | multi-pages, header/footer, éditeur de thème, médiathèque, `apps/worker`      |
| 5        | Templates & publication     | 6 templates, révisions, sous-domaines, aperçu partagé, rollback, `apps/sites` |
| 6        | Domaines & SEO              | domaines custom + SSL, sitemap, JSON-LD, Lighthouse, accessibilité            |
| 7        | Billing & quotas            | Stripe, plans, quotas serveur, emails, onboarding                             |
| 8        | Formulaires & analytics     | formulaires, anti-spam, export CSV, analytics sans cookie                     |
| 9        | CMS & contenu dynamique     | collections, items, blocks dynamiques, blog                                   |
| 10       | Polish & extensions         | historique UI, duplication, multilingue, a11y, perf, export HTML              |

Répartition de la bibliothèque de blocks (PARTIE 4.3) : **phase 2** les 10 fondamentaux (Section,
Container, Columns, Grid, Spacer, Divider, Heading, RichText, Image, Button) · **3** ButtonGroup,
Icon, Badge, Quote, Video, Gallery · **4** Header, Footer, Logos · **5** tout le marketing et le
local + Cookie banner · **8** Formulaire, Newsletter, Embed, WhatsApp, Code custom · **9**
Collection List/Item, Blog, Article.

---

## 3. Phase 0 — Fondations ✅ livrée

**Objectif atteint.** Sur une machine vierge : `pnpm install && pnpm docker:up && pnpm db:migrate &&
pnpm db:seed && pnpm dev` démarre ; `pnpm typecheck && pnpm lint && pnpm test` verts ; `pnpm build`
passe.

### Ce qui existe

```
.github/workflows/ci.yml          typecheck · lint · test · build · dérive schéma/migrations
.husky/{pre-commit,commit-msg}    lint-staged · commitlint
docker/docker-compose.yml         Postgres 16 · Redis 7 · MinIO (+ création du bucket)
scripts/fetch-fonts.mjs           récupération des polices auto-hébergées

packages/config/
  eslint/{base,node,react,next}.js
  eslint/rules/{no-hardcoded-design-values,no-direct-prisma,no-emoji-jsx}.js  + 28 tests
  tsconfig/{base,node,next,react-library}.json
  src/{env.ts,brand.ts,load-env.ts}                                          + 9 tests

packages/db/
  prisma/schema.prisma            26 tables, 13 énumérations, migration initiale
  src/client.ts                   client + échappatoire withArchived()
  src/extensions/soft-delete.ts   filtre transparent sur Site et Page          + 7 tests
  src/health.ts                   sonde de connexion (ADR-007 : pas de SELECT hors du paquet)
  src/seed/                       2 organisations, 5 utilisateurs, 1 site      + 5 tests de schéma

packages/ui/
  src/styles/tokens.css           tous les --ui-*, direction « Atelier »
  src/styles/fonts.ts + fonts/    Cabinet Grotesk · Switzer · Martian Mono (117 Ko)

apps/web/
  src/app/[locale]/page.tsx       état des services, en direct
  src/app/[locale]/design-system/ revue des tokens, développement uniquement
  src/i18n/                       next-intl : FR à la racine, EN sous /en
  src/lib/health.ts               sondes Postgres · Redis · stockage
  messages/{fr,en}.json
```

### Vérifications

| Contrôle                                  | Résultat                      |
| ----------------------------------------- | ----------------------------- |
| `pnpm typecheck`                          | 4 paquets, 0 erreur           |
| `pnpm lint`                               | 4 paquets, 0 erreur           |
| `pnpm test`                               | 49 tests, 7 fichiers          |
| `pnpm build`                              | passe, 102 kB de JS partagé   |
| `pnpm db:seed` rejoué deux fois           | idempotent                    |
| Règles ESLint maison sur leurs violations | échouent bien (28 cas testés) |

### Écarts assumés par rapport au plan validé

1. **Pas de `guards.ts` en phase 0.** Le plan prévoyait « types et signatures, implémentation en
   phase 1 ». Un fichier de signatures non implémentées est exactement le TODO fantôme que
   `CLAUDE.md` interdit. `guards.ts` sera écrit en phase 1, avec les rôles qu'il doit vérifier.
2. **`packages/ui` créé plus tôt que prévu**, avec les seuls tokens et polices. La page
   `/design-system` sans tokens n'aurait rien montré ; les composants restent en phase 1.
3. **`apps/web` livre deux pages réelles** (état des services, revue des tokens) plutôt qu'un
   squelette. Sur une machine fraîchement clonée, la panne la plus fréquente est un
   `docker compose` oublié : autant le dire lisiblement.

---

## 4. Phase 1 — Auth & organisations _(à venir)_

**Objectif.** Un utilisateur s'inscrit, vérifie son email, crée une organisation, invite un
collègue, lui donne un rôle, et chacun voit exactement ce que son rôle autorise. Le dashboard est
vide mais réel : pas de carte « Sites » factice tant que les sites n'existent pas.

**Périmètre exclu.** Aucun site, aucune page, aucun éditeur. La 2FA TOTP est au schéma mais son
interface arrive en phase 7, où la PARTIE 7 la conditionne aux plans payants.

### Arborescence prévue

```
packages/auth/
├── src/index.ts                  instance Better Auth (serveur)
├── src/client.ts                 client React
├── src/hash.ts                   argon2id
├── src/session.ts                organisation active (cookie signé, revalidée à chaque requête)
├── src/permissions.ts            matrice rôle × permission — source unique
├── src/plans.ts                  Free / Pro / Business et leurs quotas (PARTIE 7)
└── src/__tests__/                couverture 100 % sur la matrice

packages/emails/
├── src/provider/{index,resend,console}.ts        ADR-015, implémentation locale incluse
├── src/components/{layout,button,footer}.tsx
└── src/templates/{verify-email,magic-link,invitation,welcome}.tsx

packages/ui/
├── src/components/{button,input,field,label,select,checkbox,dialog,dropdown-menu,
│                   avatar,badge,toast,skeleton,empty-state,table,tabs,separator,
│                   tooltip,form}.tsx
└── src/components/__tests__/                      les 8 états, par composant

packages/db/src/guards.ts                          requireOrgAccess, requireRole, assertQuota
packages/db/src/__tests__/guards.cross-tenant.test.ts   doit échouer à franchir les tenants

apps/web/
├── src/app/[locale]/(auth)/{login,register,verify-email,forgot-password,reset-password}/page.tsx
├── src/app/[locale]/(app)/layout.tsx              shell : nav, switcher d'org, menu utilisateur
├── src/app/[locale]/(app)/[orgSlug]/page.tsx      dashboard (état vide soigné)
├── src/app/[locale]/(app)/[orgSlug]/settings/{general,members}/page.tsx
├── src/app/[locale]/(app)/account/{profile,sessions,security}/page.tsx
├── src/app/[locale]/onboarding/create-organization/page.tsx
├── src/app/[locale]/invite/[token]/page.tsx
├── src/app/api/auth/[...all]/route.ts
├── src/app/api/trpc/[trpc]/route.ts
├── src/server/api/{root,trpc}.ts                   protectedProcedure, orgProcedure
├── src/server/api/routers/{organization,member,invitation,user}.ts
├── src/server/rate-limit.ts                        Redis, sur les routes d'authentification
└── src/components/{app-shell,org-switcher,user-menu,role-badge}.tsx

e2e/{auth,organizations,invitations,permissions}.spec.ts
```

### Tâches

1. Better Auth : mot de passe argon2id, vérification email, magic link, OAuth Google, reset,
   sessions listables et révocables.
2. `permissions.ts` : les 4 rôles de la PARTIE 7 — OWNER (tout + facturation), ADMIN (tout sauf
   facturation), EDITOR (édite, ne publie ni ne supprime), VIEWER (lecture + commentaires). **Une
   seule source**, consommée par le serveur _et_ par l'UI. L'UI masque, le serveur interdit.
3. `guards.ts` réel + tests d'accès cross-tenant qui doivent échouer.
4. Organisations : création, slug unique, réglages, changement d'organisation active.
5. Invitations : envoi, expiration, acceptation, révocation, ré-invitation ; les cas « déjà membre »
   et « email différent de l'invitation » traités explicitement.
6. `packages/ui` : les composants ci-dessus, chacun avec ses 8 états, exposés sur `/design-system`.
7. Rate limiting Redis sur inscription, connexion, reset et magic link.
8. CSP à nonce sur le back-office.
9. Traduction FR + EN de toutes les chaînes, y compris les emails.
10. E2E : inscription → vérification → organisation → invitation → acceptation → rôle appliqué.

### Definition of Done

- [ ] Les 4 rôles se comportent conformément à la matrice, testés côté serveur.
- [ ] Une requête cross-tenant échoue, prouvé par test.
- [ ] Couverture 100 % sur `permissions.ts`, ≥ 80 % sur `guards.ts`.
- [ ] Chaque composant de `packages/ui` traite ses 8 états, vérifiable sur `/design-system`.
- [ ] Les emails partent en local sans compte Resend (`ConsoleEmailProvider`).
- [ ] Aucune chaîne en dur : FR et EN complets.
- [ ] Aucun élément d'interface ne mène à une fonctionnalité inexistante.
- [ ] E2E verts.

**Ordre de grandeur.** ~85–105 fichiers, ~5 500–7 000 lignes. Équivalent humain : **6 à 8 jours**
(un jour de plus que l'estimation initiale, à cause du bilinguisme), dont environ un tiers pour
`packages/ui` — c'est le moment où la direction « Atelier » devient du code, et la qualité de cette
phase conditionne toutes les suivantes.

**Risque de la phase.** L'intégration Better Auth ↔ modèle d'organisation maison (ADR-008) est le
point d'incertitude principal. Je le signalerai plutôt que de le contourner en silence.

---

## 5. Ce que la cible « indépendants **et** agences » change

Décision produit n° 4. Conséquences à anticiper, sans les implémenter avant leur phase :

- **Templates nettement plus poussés** (phase 5) : plus de blocks marketing disponibles en amont,
  plus de presets par block, et de vraies photographies. Prévoir une banque d'images sous licence
  ouverte, optimisée et versionnée dans `packages/templates` — un template au contenu générique se
  voit immédiatement et détruit l'argument de vente.
- **Multi-sites et multi-membres au premier plan** (phases 1 et 7) : le switcher d'organisation, les
  rôles et les quotas du plan Business ne sont pas des à-côtés pour une agence, ce sont le produit.
- **Duplication de site** (phase 10) : une agence part rarement de zéro. À remonter dans le planning
  si les retours le confirment.
- **Marque blanche** — retirer « Fait avec L'atelier du web » est prévu dès Pro (PARTIE 7). Une
  marque blanche plus poussée (domaine d'aperçu, emails aux couleurs de l'agence) n'est pas au
  brief : à arbitrer si la cible agence se confirme.

---

## 6. Hypothèses appliquées, corrigeables d'un mot

1. **Multilingue des sites** : schéma prêt (`locales[]`, `defaultLocale`), aucune UI de traduction
   avant la phase 10 — conforme à la PARTIE 9. À ne pas confondre avec le bilinguisme du
   back-office, livré dès la phase 0.
2. **DOMPurify** : remplacé par un assainissement structurel du rich text ; DOMPurify conservé pour
   les seules chaînes HTML réelles (ADR-013). Renforcement, pas contournement.
3. **Catalogue de polices fermé** (ADR-012) : conséquence directe de la cible Lighthouse ≥ 95.
4. **`apps/sites`, `apps/worker`, `packages/blocks`, `renderer`, `tokens`, `auth`, `emails`,
   `templates`** sont créés à la phase où ils ont quelque chose à faire, pas avant.
