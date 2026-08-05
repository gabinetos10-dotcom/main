# Plan d'implémentation — SaaS de création de sites web

> **Statut : EN ATTENTE DE VALIDATION.** Aucun code produit tant que ce document n'est pas validé.
> Version 1 — rédigé à partir des PARTIES 0 à 4.5 de la spécification.

---

## 0. Lacunes de la spécification reçue

La spec transmise s'arrête à la **PARTIE 4.5**, mais la PARTIE 0 référence explicitement la
**PARTIE 9 (phases livrables)**. Les parties **5 à 9 n'ont pas été reçues**. Elles couvrent
vraisemblablement : l'UX de l'éditeur, la publication/domaines, le billing & quotas, les critères
de qualité, et le découpage en phases.

**Conséquence :** la section 6 de ce plan propose un découpage en phases *de mon cru*. Si tes
PARTIES 5-9 existent, envoie-les : je remplacerai la section 6 et j'ajusterai le reste avant tout
code. Les décisions ci-dessous sont prises pour ne rien fermer prématurément.

Trois zones où j'ai extrapolé faute de spec, à valider :
- l'architecture du canvas d'édition (§ ADR-004) ;
- la stratégie de lecture des sites publiés (§ ADR-006 + ajouts au modèle de données) ;
- le périmètre du multilingue (`Site.locales[]` existe au schéma, mais aucune spec d'UX i18n).

---

## 1. Décisions d'architecture (ADR)

Chaque ADR sera repris en version courte dans `CLAUDE.md` et détaillé dans `docs/ARCHITECTURE.md`.

### ADR-001 — Le document JSON est la source de vérité, jamais du HTML
Une page n'est jamais stockée en HTML. `Page.content` contient un `PageDocument` (arbre de
`BlockNode`). Le même document alimente l'éditeur (React client) et le site public (RSC/SSG).
Corollaire : **un seul moteur de rendu** (`packages/renderer`), zéro divergence éditeur/public.
Le HTML n'existe qu'en sortie de rendu, jamais en base.

### ADR-002 — Un block = 3 fichiers, 2 registres
Le contrat `defineBlock()` de la spec mélange des préoccupations runtime (schéma, composant) et
éditeur (icône Lucide, thumbnail, label, catégorie, presets). Importer les icônes Lucide dans le
runtime public gonflerait inutilement le bundle des sites publiés.

Chaque block est donc éclaté :

```
packages/blocks/src/blocks/hero.split/
  definition.ts   # type, schema Zod, defaults, allowedChildren, version  → isomorphe, zéro React
  component.tsx   # le composant de rendu                                 → runtime
  editor.ts       # label, category, icon, thumbnail, presets, inspector  → éditeur uniquement
  index.ts        # re-export + defineBlock() qui assemble les trois
```

Deux registres construits à la compilation :
- `runtimeRegistry` : `type → { schema, component }` — importé par `apps/sites` et le canvas ;
- `editorRegistry` : `type → { label, icon, thumbnail, presets, fieldOrder }` — importé par
  `apps/web` uniquement.

`defineBlock()` reste l'API publique unique documentée dans `docs/BLOCKS.md` (guide « ajouter un
block ») ; le découpage est un détail d'implémentation imposé par le budget de bundle.

### ADR-003 — Les blocks ne consomment que des tokens
Aucune valeur de couleur / taille / rayon / ombre en dur dans un composant de block. Tout passe par
des CSS variables (`--color-primary`, `--space-xl`, …) générées depuis `Theme.tokens`. Un lint
custom (règle ESLint maison, phase 2) interdit les littéraux de couleur hexa et les classes Tailwind
de couleur arbitraire dans `packages/blocks`. Les overrides locaux sont stockés dans
`BlockNode.style` et affichés comme « custom » dans l'inspecteur avec un bouton « revenir au thème ».

### ADR-004 — Canvas d'édition dans une iframe same-origin *(à valider — cf. § Questions)*
Deux options réelles :

| | iframe same-origin | conteneur scopé (pas d'iframe) |
|---|---|---|
| Isolation CSS site ↔ back-office | totale | fragile (Embed HTML, code custom, scripts) |
| Media queries responsives | natives, exactes | impossibles → tout en `@container` |
| Polices du site | isolées | conflit avec les polices du back-office |
| Drag & drop palette → canvas | traversée de document à gérer | trivial |
| Complexité | moyenne | faible |

**Recommandation : iframe same-origin.** Comme les deux documents partagent l'origine, on monte
React *directement* dans l'iframe via `createPortal(document.body de l'iframe)` : le store Zustand
est partagé, pas de `postMessage`, pas de sérialisation. Le preview responsive redimensionne
réellement l'iframe → les media queries se comportent comme en production, ce qui est la seule
manière d'avoir un preview honnête.

Conséquence sur le DnD, assumée dans le planning :
- réordonnancement *dans* le canvas → dnd-kit monté dans le document de l'iframe ;
- réordonnancement dans l'arborescence (panneau Layers) → dnd-kit dans le document parent ;
- glisser depuis la palette *vers* le canvas → nécessite un pont de coordonnées (pointer events de
  l'iframe relayés au parent, offset appliqué). **Livré en phase 5**, pas en phase 4. La phase 4
  livre l'insertion par clic + clavier + drop zones explicites, qui est déjà complète
  fonctionnellement.

### ADR-005 — BullMQ + Redis, et un `apps/worker` dédié
Le choix demandé (BullMQ vs Trigger.dev) est tranché par la contrainte forte
« tourne en local avec `docker compose up`, sans compte cloud » :
- **Trigger.dev cloud** = dépendance SaaS obligatoire → viole la contrainte ; son self-host est
  lourd (plusieurs services + sa propre Postgres).
- **BullMQ** ne demande qu'un Redis — déjà nécessaire de toute façon pour le rate limiting, le
  cache des sites publiés et l'agrégation des pageviews. Un seul conteneur sert trois besoins.

Contrepartie : BullMQ exige un process long, ce que Vercel ne fournit pas. On ajoute donc
`apps/worker` (process Node, Dockerfile fourni, déployable Railway/Fly/VPS). C'est un ajout à
l'arborescence de la PARTIE 2, justifié ici et documenté dans `docs/ARCHITECTURE.md`.

Jobs prévus : finalisation d'upload (dimensions, blurhash, variantes), build/publication, vérification
DNS des domaines, envoi d'emails, agrégation analytics, purge des révisions, calcul des `UsageCounter`.

### ADR-006 — Le site public ne lit que des révisions, jamais le brouillon
`Page.content` est le **brouillon**. Publier crée une `Revision` contenant un snapshot complet et
autonome du site (toutes les pages publiées + header/footer + thème + réglages SEO). Le runtime
public résout `hostname → Site → currentRevision → snapshot` : **une seule lecture** pour rendre
n'importe quelle page, et le rollback devient un simple changement de pointeur.

Cela impose deux ajouts au schéma (§3). Sans eux, le runtime public devrait joindre 5 tables par
requête et un rollback deviendrait une restauration destructive.

### ADR-007 — Accès aux données exclusivement via `packages/db/src/guards.ts`
Aucun `prisma.*` direct dans une route, un routeur tRPC ou un composant serveur. Tout passe par des
helpers `requireOrgAccess(ctx, orgId, minRole)`, `getSiteForOrg(...)`, etc., qui vérifient
l'appartenance **et** le rôle. Une règle ESLint (`no-restricted-imports` sur `@repo/db/client`
hors `packages/db`) rend la violation impossible à merger.

### ADR-008 — Better Auth pour l'identité, modèle d'organisation maison
Better Auth gère `User`/`Session`/`Account`/`Verification` (email+mot de passe, magic link, OAuth
Google, sessions httpOnly). Le plugin « organization » de Better Auth n'est **pas** utilisé : la spec
définit ses propres `Organization`/`Membership`/`Invitation` avec 4 rôles, des quotas et un lien
Stripe. Deux modèles concurrents d'organisation seraient une dette immédiate. L'organisation active
est portée par un cookie signé + revalidée à chaque requête contre `Membership`.

### ADR-009 — Fournisseur de domaines abstrait
`DomainProvider` (interface) avec deux implémentations : `VercelDomainProvider` (API Vercel Domains)
et `CaddyDomainProvider` (Caddy + on-demand TLS + endpoint `/ask`) pour le self-host. Sélection par
variable d'environnement. Rien de propriétaire dans le cœur — conformément à la contrainte.

### ADR-010 — Rich text : Tiptap, stocké en JSON
Le champ `richText()` a besoin d'un éditeur inline sur canvas. Tiptap (ProseMirror) est retenu :
sortie **JSON portable** (jamais du HTML brut en base), rendu public par un `RichTextRenderer` qui
mappe les nœuds vers des éléments stylés par tokens — le bundle éditeur ne part donc jamais sur les
sites publiés. C'est le seul ajout notable à la stack imposée ; il n'y a pas d'alternative crédible.

---

## 2. Arborescence cible

```
apps/
  web/          back-office : auth, dashboard, éditeur, billing, tRPC
  sites/        runtime public multi-tenant : rendu, formulaires, analytics
  worker/       jobs BullMQ (ADR-005)
packages/
  db/           schéma Prisma, client, guards.ts, seeds
  blocks/       définitions + composants + presets + migrations/
  renderer/     moteur de rendu du document JSON
  tokens/       design tokens, presets de thèmes, compilation en CSS vars
  ui/           composants back-office (shadcn/ui)
  templates/    documents JSON des templates de départ
  emails/       React Email
  config/       eslint, tsconfig, tailwind, vitest partagés
docs/           PLAN, ARCHITECTURE, DATA_MODEL, BLOCKS, THEMING, API, DEPLOY
docker/         compose (postgres, redis, minio), Dockerfiles
```

Ajouts par rapport à la PARTIE 2 : `apps/worker` (ADR-005), `docker/`, `docs/` étoffé.

---

## 3. Modèle de données — ajouts proposés

Le schéma de la PARTIE 3 est implémenté tel quel. Ajouts nécessaires, chacun justifié
(le détail ira dans `docs/DATA_MODEL.md`) :

| Ajout | Justification |
|---|---|
| `Site.currentRevisionId` | ADR-006 : pointeur vers la révision servie. Rollback = un `UPDATE`. |
| `Revision.kind` (`AUTOSAVE \| PUBLISH \| MANUAL`) | Distinguer historique d'édition et snapshots de publication ; permet des politiques de purge différentes. |
| `Page.contentVersion` (int) | Version du schéma de document, pour les migrations de blocks (§4.5 de la spec). |
| `Page.draftUpdatedAt` + `Page.lastEditedById` | Verrouillage optimiste de l'autosave (détection d'édition concurrente) et affichage « édité par X ». |
| `Session`, `Account`, `Verification` | Tables requises par Better Auth. |
| `PageView` (agrégat jour/site/path) | La spec veut des stats ; `UsageCounter` est mensuel et par org, insuffisant pour un graphe. |
| `Asset.status` (`PENDING \| READY \| FAILED`) | Upload présigné en deux temps : la ligne existe avant que le worker n'ait calculé dimensions/blurhash. |
| `Domain.lastCheckedAt`, `Domain.error` | Vérification DNS asynchrone : il faut mémoriser le dernier essai et la cause d'échec. |
| `Invitation.invitedById` | Traçabilité (et affichage « invité par »). |

Index : `(siteId, path)` unique, `(orgId)`, `Domain.hostname` unique, `Site.slug` unique,
`(collectionId, slug)` unique, `(siteId, createdAt)` sur `FormSubmission`, `(orgId, period)` unique
sur `UsageCounter`. Soft delete `archivedAt` sur `Site` et `Page`, avec une extension Prisma qui
filtre par défaut (et un échappatoire explicite `withArchived()`).

---

## 4. Contrat de blocks — précisions d'implémentation

- **Champs typés** (`text`, `richText`, `number`, `slider`, `toggle`, `select`, `color`, `image`,
  `video`, `icon`, `link`, `spacing`, `alignment`, `repeater`, `collectionRef`, `animation`) :
  implémentés comme des schémas Zod **portant une métadonnée d'UI** (`.describe()` structuré via un
  registre `fieldMeta`). L'inspecteur parcourt le schéma et génère ses contrôles automatiquement —
  ajouter un champ à un block ne demande **aucun** code d'inspecteur.
- **`repeater`** (critique) : items identifiés par un `id` nanoid stable, réordonnables via dnd-kit,
  dupliquables, avec min/max et un template d'item. Il ne stocke pas d'index : les réordonnancements
  ne doivent jamais casser une référence.
- **Migrations** (`packages/blocks/migrations/NNNN-*.ts`) : chaque migration expose
  `{ version, description, up(document) }`. `migrateDocument()` applique la chaîne depuis
  `document.version` jusqu'à la version courante. Application **paresseuse à la lecture** (jamais de
  document non migré rendu) + job batch pour convertir le stock. **Un test par migration**, avec un
  document réel figé en fixture. Toute évolution cassante d'un schéma de block sans migration est
  refusée en revue.
- **Sécurité** : `Embed HTML` rendu dans une iframe sandboxée (`sandbox="allow-scripts"` sans
  `allow-same-origin`) ; `Code custom` réservé au plan Business, injecté hors du DOM React, avec
  avertissement explicite. Le rich text est assaini au rendu (allowlist de nœuds), jamais
  `dangerouslySetInnerHTML` sur du contenu utilisateur non assaini.

---

## 5. Pipeline de publication

```
Éditeur ──autosave (debounce 800ms, verrou optimiste)──► Page.content (brouillon)
   │
   └─ « Publier » ─► job BullMQ
        1. valide chaque document contre les schémas de blocks (échec = publication refusée)
        2. construit le snapshot : pages publiées + header/footer + thème + SEO + domaines
        3. crée Revision(kind=PUBLISH) + Deployment(QUEUED→BUILDING)
        4. Site.currentRevisionId = revision.id
        5. revalidateTag(`site:${siteId}`) → purge ISR + cache Redis
        6. génère sitemap.xml / robots.txt ; Deployment → LIVE (ou FAILED + log)

Rollback = repointer currentRevisionId sur une révision antérieure + revalidateTag. Non destructif.
```

Runtime public (`apps/sites`) : middleware `hostname → siteId` (cache Redis, TTL court),
`app/[[...slug]]/page.tsx` rend depuis le snapshot, `generateMetadata` depuis `Page.seo`,
ISR + cache tags. Dev local : `*.lvh.me` (résout en 127.0.0.1, zéro configuration).

---

## 6. Phases livrables *(à remplacer par ta PARTIE 9 si elle existe)*

Chaque phase se termine par : l'app démarre, `pnpm typecheck && pnpm lint && pnpm test` passent,
docs à jour, commit conventionnel.

| # | Phase | Contenu | Definition of Done |
|---|---|---|---|
| 0 | Fondations | monorepo pnpm+Turbo, TS strict, ESLint flat, Prettier, Husky+lint-staged+commitlint, `docker compose up` (Postgres/Redis/MinIO), CI GitHub Actions, `CLAUDE.md`, squelette `docs/` | `docker compose up && pnpm dev` sur machine vierge ; CI verte |
| 1 | Données & auth | schéma Prisma complet + migrations + seeds, `guards.ts`, Better Auth (mdp, magic link, Google), orgs/membres/invitations, tRPC + `orgProcedure`, shell du dashboard | inscription → org créée → invitation d'un membre → rôles appliqués ; E2E auth |
| 2 | Thème & tokens | `packages/tokens`, compilation CSS vars, 8-12 presets caractériels, chargement `next/font`, dark mode, lint anti-valeurs-en-dur | changer un token repeint une page de démo sans reload ; tests de compilation |
| 3 | Renderer & socle blocks | `packages/renderer`, `defineBlock`, tous les champs typés, ~12 blocks structure+contenu, `PageDocument` + validation + infra de migrations | rendu SSR d'un document fixture ; snapshot tests ; 1 migration + son test |
| 4 | Éditeur v1 | canvas iframe, sélection/survol, inspecteur auto-généré, arborescence, ajouter/supprimer/dupliquer/réordonner, undo/redo (patches Immer), autosave, preview responsive | E2E : créer une page, insérer 3 blocks, éditer, undo/redo, rechargement conforme |
| 5 | Bibliothèque complète | tous les blocks Marketing/Conversion/Local/Globaux, presets, `repeater` avec DnD, media library + uploads présignés + blurhash, DnD palette→canvas (ADR-004) | chaque block a un test de rendu + ses presets ; media library E2E |
| 6 | Pages & navigation | multi-pages, arborescence de nav, header/footer globaux, SEO par page, 404, redirections | E2E : créer 3 pages, nav hiérarchique, header partagé |
| 7 | Publication | révisions, déploiements, `apps/sites`, sous-domaines, ISR + invalidation, rollback, sitemap/robots | E2E : publier → visiter `slug.lvh.me` → modifier → republier → rollback |
| 8 | Domaines & SSL | `DomainProvider` (Vercel + Caddy), vérification DNS asynchrone, statuts, domaine principal | E2E avec provider simulé ; procédure self-host documentée |
| 9 | CMS collections | collections, items, blocks Collection List/Item, blog + article, routes dynamiques + sitemap | E2E : créer une collection, 3 items, lister et détailler côté public |
| 10 | Formulaires & analytics | blocks formulaire, endpoint public, anti-spam (honeypot + timing + rate limit + Turnstile optionnel), notifications email, beacon pageviews, dashboard stats | E2E : soumettre un formulaire → visible au dashboard + email envoyé |
| 11 | Billing & quotas | Stripe Checkout + Portal + webhooks, plans Free/Pro/Business, application des quotas, `UsageCounter`, `AuditLog` | E2E avec Stripe en mode test ; dépassement de quota bloqué et expliqué |
| 12 | Templates & finition | 9 templates réels (portfolio, restaurant, agence, e-commerce vitrine, SaaS landing, événement, immobilier, coach, blog), onboarding, a11y (axe), budgets de perf, Sentry + pino | Lighthouse ≥ 95 sur un site publié ; zéro violation axe critique |

Les phases 0-4 sont le chemin critique : sans elles rien d'autre n'a de sens. Les phases 8, 11 et
certaines parties de 10 dépendent de comptes externes et sont conçues pour être testables avec des
providers simulés.

---

## 7. Stratégie de tests

- **Unitaire (Vitest)** : compilation des tokens, validation des schémas de blocks, migrations de
  documents, `guards.ts` (matrice rôle × action), réducteurs du store éditeur, résolution de liens.
- **Composants (Testing Library)** : chaque block a un test de rendu avec ses defaults et ses presets.
- **E2E (Playwright)** : parcours listés en DoD ci-dessus, sur une base éphémère (`docker compose`
  + `prisma migrate deploy` + seed).
- **Non-régression** : tout bug corrigé arrive avec son test, référencé dans le message de commit.
- **CI** : `typecheck → lint → test → build → migrate --dry-run`, en parallèle via Turborepo, avec
  cache.

---

## 8. Risques identifiés et parades

| Risque | Parade |
|---|---|
| Perf du canvas sur documents longs | mémoïsation par `node.id`, re-rendu du seul sous-arbre modifié, virtualisation de l'arborescence si > 200 nœuds |
| Le sélecteur de tokens qui casse tout le site | validation du thème avec Zod + preview avant application ; les révisions permettent le rollback |
| Divergence rendu éditeur ↔ public | un seul `packages/renderer`, snapshot tests exécutés dans les deux modes sur les mêmes fixtures |
| Migrations de blocks appliquées à moitié | migration paresseuse à la lecture + job batch + version stockée par page ; jamais de rendu d'un document non migré |
| Fuite inter-tenants | `guards.ts` obligatoire (ADR-007) + règle ESLint + tests de la matrice d'accès |
| Vercel-lock | `DomainProvider` abstrait (ADR-009), pas d'API propriétaire dans le cœur, Dockerfiles fournis |
| XSS via Embed/Code custom/rich text | iframe sandboxée, gating par plan, assainissement du rich text à allowlist |

---

## 9. Questions groupées (bloquantes avant la phase 0)

1. **PARTIES 5 à 9** — existent-elles ? Si oui, envoie-les : je réécris la section 6 avant tout code.
2. **Canvas** — iframe same-origin (ADR-004, recommandé) ou conteneur scopé sans iframe ?
3. **Nom du produit et domaine** — `leproduit.app` est un placeholder. Il faut le vrai nom
   (packages `@quoi/*`, domaine de base des sous-domaines, emails, branding).
4. **Multilingue** — `Site.locales[]` est au schéma. v1 = mono-langue avec le schéma prêt (recommandé),
   ou multilingue complet (routing `/fr`, `/en`, traduction des documents, hreflang) dès maintenant ?

Réponses à ces quatre points → je démarre la phase 0 immédiatement et j'enchaîne sans te solliciter
fichier par fichier.
