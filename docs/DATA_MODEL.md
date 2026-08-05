# Modèle de données

Référence du schéma Prisma (`packages/db/prisma/schema.prisma`). Chaque écart au brief (PARTIE 3)
est justifié ici. Mis à jour à chaque migration, pas en fin de phase.

## Règles

- **Accès** — aucun `prisma.*` hors de `packages/db` (ADR-007). La règle ESLint
  `atelier/no-direct-prisma` bloque l'import du client ailleurs.
- **Identifiants** — `cuid()` partout. Triables, non devinables, sûrs en URL.
- **Documents** — `Page.content`, `Revision.snapshot`, `Theme.tokens`, `Collection.fields` sont du
  JSON validé par Zod à l'écriture, jamais par la base (ADR-001).
- **Suppression** — `archivedAt` sur `Site` et `Page` (voir § Soft delete). Partout ailleurs, la
  suppression est réelle et les cascades sont explicites.

## Identité (ADR-008)

| Table          | Rôle                                                                                                                                                                                                                                                      |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `User`         | identité. `image` plutôt que `avatarUrl` : c'est le nom attendu par Better Auth, et une couche de mapping sur tout le flux d'authentification coûterait plus qu'elle ne rapporte. `locale` porte la langue du back-office (FR par défaut, EN disponible). |
| `Session`      | sessions révocables (PARTIE 7).                                                                                                                                                                                                                           |
| `Account`      | fournisseurs d'identité. `password` contient un hash **argon2id** pour le fournisseur « credential » — jamais un mot de passe en clair.                                                                                                                   |
| `Verification` | jetons de vérification email, magic link, réinitialisation.                                                                                                                                                                                               |
| `TwoFactor`    | TOTP, réservé aux plans payants. Le schéma existe dès la phase 0 ; l'interface arrive avec le billing (phase 7).                                                                                                                                          |

Les quatre premières sont imposées par Better Auth ; les créer plus tard aurait signifié une
migration sur une base déjà peuplée.

## Organisations

`Organization` · `Membership` · `Invitation`, conformes au brief.

- `Membership` est unique sur `(userId, orgId)` : sans cette contrainte, un même utilisateur
  pourrait accumuler deux rôles contradictoires dans la même organisation.
- `Invitation` est unique sur `(orgId, email)` : réinviter quelqu'un met à jour l'invitation
  existante au lieu d'en empiler une deuxième.
- `Invitation.invitedById` — traçabilité (« invité par ») et journal d'audit.
- `Organization.onboarding` (Json) — checklist de démarrage persistante (PARTIE 7).

## Sites, pages, thème

| Ajout                                        | Pourquoi                                                                                                                                                  |
| -------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Site.publishedRevisionId` (unique)          | ADR-006 : la seule révision servie au public. Le rollback devient un `UPDATE`, non destructif et instantané.                                              |
| `Site.lockedAt`                              | ADR-014 : après un downgrade, les sites au-delà du quota passent en lecture seule. Jamais de suppression. Stocké et non recalculé, pour rester auditable. |
| `Site.cookieBanner`, `Site.csp`              | Bannière cookies configurable et CSP par site (PARTIE 8).                                                                                                 |
| `Page.contentVersion`                        | Version de schéma du document, pour les migrations de blocks (PARTIE 4.5). Sans elle, impossible de savoir quels documents restent à migrer.              |
| `Page.draftUpdatedAt`, `Page.lastEditedById` | Verrou optimiste de l'autosave et détection d'édition concurrente (PARTIE 5.2).                                                                           |

**Écart assumé** : le brief portait à la fois `Site.themeId` et `Theme.siteId`. C'est redondant et
ouvre la porte à deux sources de vérité divergentes. Le schéma ne garde que `Theme.siteId @unique` —
un thème par site.

## Publication

| Table         | Notes                                                                                                                                                                                                               |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Revision`    | `kind` (`AUTOSAVE\|PUBLISH\|MANUAL`) permet des rétentions différenciées : 7 / 30 / 90 jours selon le plan (PARTIE 7). Sans cette distinction, purger les autosaves supprimerait aussi l'historique de publication. |
| `Deployment`  | file de publication, statut et log lisible en cas d'échec.                                                                                                                                                          |
| `Domain`      | `lastCheckedAt` et `error` servent au polling DNS avec backoff ; `redirectTo` porte la redirection www ↔ apex (PARTIE 6).                                                                                           |
| `Redirect`    | redirections 301 configurables, uniques sur `(siteId, from)`.                                                                                                                                                       |
| `PreviewLink` | lien d'aperçu partagé. **Stocké** plutôt que signé : un JWT ne serait pas révocable, or « révoquer le lien envoyé au client » est exactement l'usage attendu.                                                       |

Deux relations distinctes lient `Site` et `Revision` : `SiteRevisions` (l'historique) et
`PublishedRevision` (le pointeur). Elles sont nommées pour que Prisma ne les confonde pas.

## Médias, CMS, formulaires

- `Asset.status` — l'upload est présigné en deux temps : la ligne existe avant que le worker n'ait
  calculé dimensions, blurhash et variantes.
- `Asset.variants` (Json) — déclinaisons webp/avif et tailles responsives (PARTIE 5.4).
- `Collection` / `CollectionItem` — uniques sur `(siteId, slug)` et `(collectionId, slug)` : une URL
  de contenu dynamique doit désigner un seul item.
- `FormSubmission` — indexée sur `(siteId, createdAt)`, l'ordre de lecture du tableau de bord.

## Mesure et conformité

- `PageView` — agrégat quotidien `(siteId, date, path, referrerHost, country)`. `UsageCounter` est
  mensuel et par organisation : il ne peut pas alimenter un graphe de top pages ni de sources.
  L'agrégat évite de stocker une ligne par visite.
- `UsageCounter` — compteurs métrés (ADR-014). `storageBytes` est un `BigInt` : 50 Go dépassent la
  portée d'un `Int`.
- `AuditLog` — journal exigé par la PARTIE 8.
- `DeletionRequest` — suppression de compte ou d'organisation avec purge différée à 30 jours
  (PARTIE 8). Une purge immédiate rendrait toute erreur irréversible.

## Soft delete

Filtré par défaut sur `Site` et `Page` via une extension du client Prisma
(`packages/db/src/extensions/soft-delete.ts`) :

- `findMany`, `findFirst`, `count`, `aggregate`, `groupBy` reçoivent `archivedAt: null` ;
- `findUnique` ne peut pas recevoir de filtre non unique : le résultat est écarté après coup, et
  `archivedAt` est retiré de la réponse quand l'appelant ne l'avait pas demandé ;
- l'échappatoire est **explicite** : `withArchived()` renvoie le client non filtré. Volontairement
  verbeux — on doit pouvoir retrouver tous ses usages en une recherche.

Couvert par `packages/db/src/__tests__/soft-delete.test.ts`.

## Index

| Index                                   | Motif                                           |
| --------------------------------------- | ----------------------------------------------- |
| `Site.slug` unique                      | sous-domaine, résolu à chaque requête publique  |
| `Domain.hostname` unique                | résolution de tenant sur domaine personnalisé   |
| `Page (siteId, path)` unique            | une page par chemin et par site                 |
| `Page (siteId, order)`                  | tri de la navigation                            |
| `Site (orgId)`, `Site (archivedAt)`     | listes du tableau de bord et comptage de quota  |
| `Revision (siteId, createdAt)`          | historique et purge par rétention               |
| `FormSubmission (siteId, createdAt)`    | tableau des soumissions                         |
| `PageView (siteId, date)`               | graphes de statistiques                         |
| `UsageCounter (orgId, period)` unique   | un compteur par organisation et par mois        |
| `CollectionItem (collectionId, status)` | listes publiques filtrées sur les items publiés |
| `DeletionRequest (scheduledPurgeAt)`    | balayage quotidien du worker                    |

## État actuel

Migration `20260805092556_init` — 26 tables, 13 énumérations. Tables non encore utilisées par du
code applicatif : elles le seront à la phase indiquée dans `docs/PLAN.md`. Le schéma est créé en une
fois parce qu'une migration sur base peuplée coûte plus cher qu'une colonne inutilisée quelques
semaines.
