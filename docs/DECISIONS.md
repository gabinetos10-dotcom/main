# Journal des décisions

Format : date · décision · alternative écartée · raison.

Ce journal ne contient que les décisions **secondaires**, tranchées en cours de route
(§1). Les décisions structurantes sont figées dans `PRODUCT_SPEC.md` §3 et §4 ; les
décisions architecturales majeures ont leur propre ADR.

---

## P0 — Fondations

**2026-08-17 · Next.js reste sur la ligne 15 (`15.5.23`)** · _Écarté :_ Next 16, sorti et
disponible. _Raison :_ le §4 fige Next 15. La ligne 15 est toujours maintenue. À
réévaluer en P10, le passage étant peu coûteux (même App Router, même React 19).

**2026-08-17 · Auth.js v5 épinglé à `5.0.0-beta.32`** · _Écarté :_ `next-auth@4.24.15`,
stable. _Raison :_ le §4 impose v5. La version beta est épinglée exactement plutôt que
suivie par le tag `beta`, pour qu'un `pnpm install` ne change jamais le comportement
d'authentification sans commit.

**2026-08-17 · TypeScript 5.9.3 et ESLint 9.39.5** · _Écarté :_ TypeScript 7 et ESLint 10,
tous deux publiés. _Raison :_ `eslint-config-next@15` et `drizzle-kit` ne sont pas validés
sur ces majeures. Réévaluation en P10.

**2026-08-17 · Les packages internes exportent directement leurs sources TypeScript** ·
_Écarté :_ compilation vers `dist/` avec orchestration Turborepo. _Raison :_ supprime une
étape de build et tout le graphe de dépendances associé ; Next les transpile via
`transpilePackages`, Vitest et tsx les résolvent nativement. `packages/editor-runtime`
fera exception en P5 (bundle IIFE via esbuild).

**2026-08-17 · Imports relatifs sans extension** · _Écarté :_ extensions `.js` explicites
(convention NodeNext). _Raison :_ webpack ne résout pas `./x.js` vers `./x.ts` dans un
package transpilé. `moduleResolution: "bundler"` accepte l'absence d'extension, et
Vite/Vitest/tsx aussi.

**2026-08-17 · PGlite pour les tests, Postgres réel pour tout le reste** · _Écarté :_
PGlite comme pilote de développement. _Raison :_ PGlite est un Postgres mono-processus
chargé en WebAssembly. Excellent en test (vrai moteur, migrations et RLS réels, zéro
infrastructure), inadapté à un serveur web multi-processus, et son chargement WASM par
`new URL(..., import.meta.url)` casse sous webpack. Il vit dans `@calque/db/testing`, hors
de portée de tout bundler applicatif. Le développement local utilise
`scripts/postgres-local.sh`.

**2026-08-17 · Fontes auto-hébergées et versionnées, pas `next/font/google`** ·
_Écarté :_ `next/font/google`, et a fortiori un `<link>` vers fonts.googleapis.com.
_Raison :_ deux problèmes distincts. RGPD d'abord — un `<link>` transmet l'IP de chaque
visiteur à un tiers hors UE (§3, §17). Reproductibilité ensuite — `next/font/google`
télécharge au build, ce qui fait dépendre la CI d'un service tiers et échoue derrière un
proxy, `fetch` de Node n'honorant pas `HTTPS_PROXY`. Les `.woff2` (latin + latin-ext, œ
oblige) sont dans `apps/web/public/fonts/`.

**2026-08-17 · L'adaptateur Auth.js est paresseux, via un objet délégateur** ·
_Écarté :_ `await` de haut niveau dans `apps/web/src/auth.ts`. _Raison :_ importer le
module ouvrirait une connexion Postgres — au rendu d'une page publique, pendant la
collecte des routes au build, dans un worker qui ne servira jamais de requête
authentifiée. Un Proxy ne convient pas : Auth.js énumère l'adaptateur avec
`Object.keys()` et n'y verrait rien. La liste des méthodes est donc explicite et
vérifiée contre l'adaptateur réel au premier appel.

**2026-08-17 · Les pilotes de base restent hors du bundle serveur Next** · _Écarté :_
bundling par défaut. _Raison :_ `serverExternalPackages` pour `pg`, `ws` et
`@neondatabase/serverless` — chemins conditionnels et binaires natifs que webpack résout
mal.

**2026-08-17 · La garde d'accès est dans le layout serveur, pas dans un middleware** ·
_Écarté :_ `middleware.ts`. _Raison :_ les sessions sont en base (révocation immédiate,
§16) et le runtime edge d'un middleware ne peut pas interroger Postgres. Un middleware ne
constaterait que la présence d'un cookie, ce qui n'est pas une autorisation. Les en-têtes
de sécurité passent par `headers()` dans `next.config.ts`.

**2026-08-17 · next-intl sans routage préfixé par langue** · _Écarté :_ segment
`[locale]` dès P0. _Raison :_ permet d'écrire toute l'interface avec des clés de
traduction sans figer une arborescence de routes qu'il faudrait déplacer. La négociation
de langue arrive en P10.

**2026-08-17 · Primitives d'interface écrites à la main, conventions shadcn conservées** ·
_Écarté :_ `npx shadcn add`. _Raison :_ la CLI exige un réseau et une invite interactive.
`components.json` est présent et les conventions (`cn`, variantes, `className`
fusionnable) sont respectées : un ajout ultérieur par la CLI s'intègre sans friction.

**2026-08-17 · Zod 4 : `.prefault({})` au lieu de `.default({})` sur les objets à
défauts internes** · _Écarté :_ `.default({})`. _Raison :_ en Zod 4, `.default()` attend
une valeur de _sortie_ — un objet complet. `.prefault()` fait passer la valeur par le
schéma, ce qui applique les défauts internes.

**2026-08-17 · `verification_tokens`, `accounts`, `sessions` ajoutées au modèle §18** ·
_Écarté :_ schéma d'authentification séparé. _Raison :_ le §18 autorise à compléter, pas
à renommer. La propriété TypeScript `image` attendue par Auth.js pointe sur la colonne
`avatar_url` du §18 : aucune colonne renommée ni dupliquée.

**2026-08-17 · Le journal d'audit n'a pas de clé étrangère vers `sites`** · _Écarté :_
FK avec cascade. _Raison :_ une trace d'audit effacée par la suppression de ce qu'elle
décrit n'a plus aucune valeur probante. Rétention 12 mois (§16) indépendante du cycle de
vie des sites.

**2026-08-17 · `sites.current_version_id` sans clé étrangère** · _Écarté :_ FK circulaire
avec `content_versions`. _Raison :_ la référence inverse existe déjà ; une contrainte
circulaire compliquerait la création initiale d'un site sans rien garantir de plus.

**2026-08-17 · Un rôle Postgres non privilégié sera requis pour le RLS (P9)** ·
_Écarté :_ `FORCE ROW LEVEL SECURITY` seul. _Raison :_ vérifié expérimentalement (test
« prémisse RLS ») — un superutilisateur traverse les policies malgré `FORCE`, sans erreur
ni log. `withTenant` accepte donc une option `role`, et la migration qui crée
`calque_app` arrive en P9.

**2026-08-17 · `redirectTo` explicite sur la connexion** · _Écarté :_ comportement par
défaut d'Auth.js. _Raison :_ sans lui, le lien magique ramène à la racine du site,
c'est-à-dire sur la page marketing, alors que la personne vient de se connecter.

**2026-08-17 · L'E2E s'exécute sur `localhost`, pas `127.0.0.1`** · _Écarté :_
`127.0.0.1`. _Raison :_ Auth.js dérive son origine du `NextRequest`, qui la normalise en
`localhost`. Un navigateur sur `127.0.0.1` fait rejeter la `callbackUrl` comme origine
étrangère et retomber sur la racine — un échec silencieux qui ressemble à un problème de
session.

**2026-08-17 · Prise de test `CALQUE_MAGIC_LINK_SINK`** · _Écarté :_ analyse des logs du
serveur depuis les tests. _Raison :_ rend l'E2E déterministe. La variable n'est jamais
définie en production, et la branche est de toute façon inatteignable dès qu'une clé
Resend est configurée.

**2026-08-17 · Le modèle IA est lu depuis `ANTHROPIC_MODEL`** · _Écarté :_
`claude-sonnet-4-6` en dur. _Raison :_ le §4 fige le modèle, et cet identifiant est bien
un modèle réel et actif. L'exposer en variable d'environnement rend le choix réversible
sans redéploiement, le catalogue de modèles évoluant plus vite que le produit. Sans
incidence avant P10.

---

## P1 — Fixtures

**2026-08-17 · Images de fixtures générées par script, pas de photographies** ·
_Écarté :_ photos sous licence libre. _Raison :_ aucune question de droits, poids
maîtrisé, dimensions et ratios choisis pour exercer le recadrage de P6.
`fixtures/tools/generate-assets.mjs` les régénère à l'identique.

**2026-08-17 · Les fixtures sont exclues d'ESLint et de Prettier** · _Écarté :_
formatage uniforme. _Raison :_ ce sont des sites livrés par une agence, imités au plus
près du vibe coding. Les normaliser leur ferait perdre exactement ce qu'elles servent à
tester : du HTML « tel qu'il a été livré » (§2).
