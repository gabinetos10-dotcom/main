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

---

## P2 — Parser

**2026-08-18 · `blueprintVersion` passe à `1.1`** · _Écarté :_ rester en `1.0`.
_Raison :_ quatre ajouts optionnels au schéma, tous exigés par le builder du P3 ou par
le §8 : `meta.valueRanges` (une étendue par partie réécrivable), `item.valueMeta` (où
écrire chaque valeur d'un item), `page.anchorBlockId` (page virtuelle d'un one-page),
`globals[].fields[].fieldIds` (les champs qu'un panneau global commande). Ajouts
uniquement, donc incrément mineur selon la règle de compatibilité du schéma.

**2026-08-18 · L'empreinte de forme est un descripteur lisible, pas un hachage** ·
_Écarté :_ `shapeHash` au sens strict du §9.1. _Raison :_ un hachage ne se compare que
par égalité, et l'égalité est exactement ce qui échoue sur une collection hétérogène.
`img+div(h3+p+a)` se compare jeton à jeton, se lit dans le rapport d'ingestion, et
alimente la similarité graduée du §9.3. Le §9.7 montre d'ailleurs une signature de cette
forme (`article|card shadow|h3+p+a`).

**2026-08-18 · Regroupement à 0,65 de similarité, plancher de forme à 0,6** · _Écarté :_
le seuil provisoire de 0,75 posé en P0, sans plancher. _Raison :_ calibré sur les trois
fixtures. 0,65 est le plus haut seuil qui regroupe les trois cartes de la fixture 01 —
dont une porte un badge et une n'a pas d'image — et le plancher de forme sépare la
galerie dont un item se passe de `<picture>` (0,67) de deux paragraphes voisins dont
l'un porte des liens (0,5). Les cas limites sont gelés dans
`packages/parser/test/collections.test.ts` : le seuil ne peut plus bouger sans qu'un
test le dise.

**2026-08-18 · Pondération forme 60 % / classes 40 %** · _Écarté :_ classes 60 % / forme
40 %. _Raison :_ une classe modificatrice (`carte--populaire`) est le bruit le plus
fréquent du vibe coding, alors qu'une forme franchement différente signale un composant
réellement différent. Deux conteneurs sans aucune classe ont par ailleurs une similarité
de classes parfaite, ce qui rendait le critère trompeur.

**2026-08-18 · Un groupe qui tombe sous les faux positifs du §9.3.7 n'est pas une
collection verrouillée : il n'est pas une collection du tout** · _Écarté :_ émettre une
`collection` avec `locked: true`. _Raison :_ une collection avale les champs de ses
items sous forme de valeurs. Un menu verrouillé aurait donc fait disparaître les liens
de contact et de réseaux sociaux qu'il contient. Le conteneur est consigné dans
`locked[]` et ses enfants restent des champs ordinaires — ce qui préserve, sur la
fixture 01, les liens Instagram et Facebook du pied de page.

**2026-08-18 · Le gabarit d'item vient du membre le plus riche, pas du premier** ·
_Écarté :_ « le premier item devient `itemTemplate` » (§9.3.4). _Raison :_ sur une
collection hétérogène, le premier item peut être le plus pauvre. Le gabarit serait alors
incapable d'exprimer les champs des autres — la carte sans image donnerait un gabarit
sans emplacement d'image, et l'ajout d'une carte illustrée deviendrait impossible.

**2026-08-18 · Les valeurs d'un item sont appariées au gabarit par chemin relatif, puis
par ordre** · _Écarté :_ appariement par (type, rang dans le type). _Raison :_ un
appariement indépendant décale toutes les valeurs d'un cran dès qu'un item porte un
élément en plus : sur la fixture 01, le titre de la première carte atterrissait dans
l'emplacement du badge. L'alignement monotone garde l'ordre du document.

**2026-08-18 · Le texte visible passe avant l'`id` et la classe dans le libellé d'un
champ** · _Écarté :_ l'ordre littéral du §9.2 (`aria-label` > `alt` > `id` > classe >
texte). _Raison :_ sur un site Tailwind, la classe donne « Mt 3 » ou « Btn primaire » —
du jargon, que le §21 interdit dans l'interface du client. Le texte visible est ce qu'il
reconnaît. `aria-label` et `alt` restent prioritaires, l'`id` et la classe servent de
repli quand il n'y a pas de texte.

**2026-08-18 · Un `<button>` sans destination est un champ `text`, pas un `cta`** ·
_Écarté :_ `cta` pour tout `a`/`button` portant une classe de bouton (§9.2). _Raison :_
un `cta` porte une valeur `{ label, href }`. Un bouton d'envoi de formulaire n'a pas de
`href` : le classer `cta` obligerait à en inventer un vide, que le client pourrait
ensuite « modifier » sans effet.

**2026-08-18 · Un `<a>` vers la page d'accueil, sans autre contenu que du texte, est un
champ `text`** · _Écarté :_ `link`. _Raison :_ c'est le lien de marque. Sa destination
ne change jamais ; ce que le client veut modifier est le nom de son entreprise. Un champ
`link` lui présenterait une URL à ne pas toucher.

**2026-08-18 · Les classes de bouton reconnues incluent `bouton`** · _Écarté :_ la liste
anglaise du §9.2 (`btn`, `button`, `cta`). _Raison :_ le produit est français et
l'agence vibe-code en français. Sans `bouton`, aucun bouton des fixtures 02 et 03 n'est
reconnu comme appel à l'action.

**2026-08-18 · Un `<a>` de menu est verrouillé quelle que soit sa classification** ·
_Écarté :_ ne verrouiller que les types `link` et `cta`. _Raison :_ le lien « Accueil »
d'un menu pointe vers la page d'entrée, donc est classé `text` par la règle du lien de
marque. Sans ce correctif, il aurait été le seul lien du menu resté modifiable. Les
coordonnées et les réseaux sociaux échappent au verrou : ce sont des contenus, où qu'ils
soient posés.

**2026-08-18 · Deux éléments feuilles voisins ne forment jamais une collection** ·
_Écarté :_ s'en tenir au critère « ≥ 2 membres, ≥ 1 champ éditable chacun » du §9.3.3.
_Raison :_ deux paragraphes de prose ont la même empreinte sans être une liste. Le
client se verrait offrir un bouton « ajouter un paragraphe » au milieu d'un texte suivi.
Un item de collection est un composant répété, donc structuré.

**2026-08-18 · L'analyse des scripts passe par un arbre syntaxique (acorn), pas par une
recherche de texte** · _Écarté :_ expressions régulières sur le JavaScript. _Raison :_
il faut relier `element.textContent = …` au sélecteur qui a produit `element`, ce
qu'aucune recherche de motif ne fait de façon fiable. Une approximation verrouillerait,
sur la fixture 01, tous les liens d'ancrage de la page — quatorze champs perdus pour un
gain nul.

**2026-08-18 · Un sélecteur de script hors périmètre est ignoré, pas approximé** ·
_Écarté :_ interpréter au mieux les sélecteurs à combinateur. _Raison :_ ces sélecteurs
décident d'un verrou. `main section[id]` mal interprété verrouillerait toutes les
sections de la fixture 03. Ne rien faire est le mauvais choix le moins cher.

**2026-08-18 · Les polices d'une configuration Tailwind CDN sont lues dans le script
inline** · _Écarté :_ s'en tenir aux sources du §9.4 (`@import`, `@font-face`,
`font-family`). _Raison :_ un site servi par le CDN Tailwind n'a aucune de ces trois
sources : sa typographie est écrite en JavaScript. Le panneau de thème s'ouvrirait vide
sur le cas le plus courant du vibe coding.

**2026-08-18 · `DYNAMIC_TEXT` est remonté par sélecteur détecté, même sans élément
correspondant** · _Écarté :_ n'avertir que si un élément de la page correspond.
_Raison :_ c'est exactement le cas du §8 « contenu injecté par JS au runtime » : le
bandeau de la fixture 02 n'existe pas dans le HTML, il est écrit au chargement.
N'avertir que sur les éléments présents tairait le cas que l'avertissement vise.

**2026-08-18 · Une page virtuelle ne porte aucun bloc** · _Écarté :_ recopier les blocs
de la section visée. _Raison :_ le contenu existerait alors deux fois dans le blueprint,
et une édition en désynchroniserait les copies. La page virtuelle est une entrée de
navigation : elle pointe un bloc par `anchorBlockId`.

**2026-08-18 · `analyze()` est une fonction, l'adaptateur `StaticHtmlAdapter` attend le
P3** · _Écarté :_ livrer la classe dès maintenant, avec un `build()` qui lève.
_Raison :_ le §21 interdit de présenter comme fonctionnel ce qui ne l'est pas. La
signature de `analyze()` est exactement celle de l'interface : le P3 assemblera
l'adaptateur autour d'elle et du builder, sans rien refactorer.

**2026-08-18 · Le découpage par intervalles (`applySplices`) vit dans le parser** ·
_Écarté :_ le placer d'emblée dans `@calque/blueprint`. _Raison :_ le gabarit d'item en
a besoin dès le P2, mais c'est d'abord un outil de builder. Le P3 le promouvra là où il
appartient quand il aura deux appelants — le déplacer alors coûte un import.

**2026-08-18 · Les fixtures sont un package chargeable, pas un dossier de fichiers** ·
_Écarté :_ lecture directe du disque par les tests du parser. _Raison :_ le parser reçoit
un `SourceSnapshot` (§24), pas des chemins. Faire passer les tests par l'interface évite
d'écrire un parser qui ne saurait analyser que des fichiers locaux — le P4 lui donnera
un ZIP déposé sur R2.

**2026-08-18 · Le banc de rappel résout les sélecteurs avec cheerio, mais calcule le
`domPath` avec le code du parser** · _Écarté :_ une seconde implémentation du `domPath`
dans les tests. _Raison :_ deux implémentations divergent — sur un `<tbody>` implicite,
par exemple — et la mesure du rappel deviendrait fausse sans qu'aucun test n'échoue.
`computeDomPath` est générique sur un accesseur d'arbre ; le test fournit l'accesseur
cheerio, le parser l'accesseur parse5. Leur accord est lui-même testé.

**2026-08-18 · Le rappel typé tolère un écart de type sur une valeur d'item** ·
_Écarté :_ exiger le type annoté partout. _Raison :_ un emplacement de collection a un
seul type pour toute la colonne. Dans une liste de coordonnées dont deux lignes portent
un lien et une non, exiger le type élément par élément demanderait au gabarit d'être
trois choses à la fois. On exige la même _forme de valeur_, ce qui garantit que
l'éditeur affichera un contrôle utilisable.

**2026-08-18 · `pnpm db:migrate` lit `.env` par `--env-file-if-exists`** · _Écarté :_
exiger l'export des variables dans le shell. _Raison :_ le RUNBOOK promet
`cp .env.example .env` puis `pnpm db:migrate` ; la commande échouait en réalité sur un
shell neuf, faute de charger le fichier. Le drapeau de Node n'écrase jamais une variable
déjà définie : la CI, qui les fournit par l'environnement, garde la main. Correctif de
P0 relevé en P2.

---

## P3 — Builder

**2026-08-18 · Le builder ne réécrit que ce qui a changé** · _Écarté :_ réécrire chaque
champ à chaque build. _Raison :_ c'est la seule façon d'obtenir l'identité byte-à-byte du
§15. Une valeur de texte est normalisée à l'analyse (espaces compactés, `&nbsp;` décodé) ;
la réécrire systématiquement produirait un fichier différent du source alors que rien n'a
changé. La comparaison porte sur la valeur du blueprint, pas sur le texte du fichier.

**2026-08-18 · Le builder reparse le source et re-résout chaque champ** · _Écarté :_ se
fier aux offsets enregistrés dans le blueprint. _Raison :_ le §15 étape 3 demande une
résolution, et les offsets deviennent faux dès que le source change. La résolution dégrade
en trois étages — `domPath`, empreinte + hachage, empreinte seule — puis renonce : un
champ irrésolu part dans `unresolvedFieldIds` et rien n'est écrit.

**2026-08-18 · Les identifiants d'items sont dérivés de la collection et du rang** ·
_Écarté :_ un compteur par page (`itm_001`, `itm_002`…). _Raison :_ le contenu du client
est un dictionnaire plat à l'échelle du site. Deux pages numérotant leurs items à partir
de 1 voyaient leurs valeurs se recouvrir — les horaires de la page contact affichaient les
plats de la carte. C'est le test d'identité byte-à-byte qui l'a révélé, sur la seule page
concernée.

**2026-08-18 · Une collection inchangée n'est pas réécrite du tout** · _Écarté :_
régénérer systématiquement l'intérieur du conteneur depuis les items. _Raison :_ une
régénération perd l'indentation d'origine et casse l'identité. Deux régimes : inchangée →
les valeurs s'écrivent comme n'importe quel champ ; modifiée → l'intérieur du conteneur est
réécrit d'un seul tenant, dans l'ordre demandé.

**2026-08-18 · Les valeurs de jetons sont validées par liste blanche, pas filtrées par
liste noire** · _Écarté :_ retirer `{`, `}` et `;` d'une valeur libre. _Raison :_ une
liste noire finit toujours par laisser passer la forme à laquelle on n'avait pas pensé.
Chaque type de jeton a son motif — couleur, longueur, rayon, police, ombre — et une valeur
non conforme est rejetée : le jeton garde alors la valeur du site.

**2026-08-18 · Un élément hors liste blanche est déballé, pas supprimé** · _Écarté :_
supprimer l'élément et son contenu. _Raison :_ supprimer ferait disparaître du texte que
le client croyait avoir écrit. Déballer ne perd que la mise en forme, ce qui est visible et
rattrapable.

**2026-08-18 · `reconcile()` est livré en P3, alors que le §22 le place en P10** ·
_Écarté :_ attendre la phase de re-livraison. _Raison :_ c'est une fonction pure de deux
blueprints, et l'interface `SiteAdapter` l'exige. La livrer maintenant évite un adaptateur
incomplet, et son test — insérer une section en tête de page, ce qui décale tous les rangs
— vérifie du même coup que le blueprint porte bien de quoi survivre à une re-livraison.

**2026-08-18 · Le builder dépend du parser pour les utilitaires d'arbre** · _Écarté :_ un
package `@calque/html` partagé. _Raison :_ les deux moitiés de l'adaptateur `static-html`
manipulent le même arbre parse5 avec les mêmes helpers. Un troisième package pour six
fonctions coûterait plus qu'il ne clarifie ; à revoir si un second adaptateur apparaît en
v2.

**2026-08-18 · Le masquage d'un bloc passe par un sélecteur CSS dérivé du `domPath`** ·
_Écarté :_ retirer le bloc du HTML. _Raison :_ le §13 impose que le HTML source ne soit
jamais supprimé. Un `domPath` est déjà un sélecteur CSS valide — `body > main:nth-of-type(1)

> section:nth-of-type(2)` — ce qui évite d'ajouter un attribut au HTML publié.

---

## P4 — Ingestion

**2026-08-18 · L'archive est écrite directement dans le stockage par le navigateur** ·
_Écarté :_ un envoi vers une route de l'application, qui la relaierait. _Raison :_ le §8
autorise 100 Mo. Les fonctions serverless de Vercel plafonnent le corps d'une requête bien
en dessous : le parcours aurait fonctionné en local et échoué en production sur les sites
qui comptent. Le navigateur reçoit une URL signée valable quinze minutes et pour une seule
clé. En développement, la même interface écrit dans une route protégée par la session.

**2026-08-18 · Les entrées douteuses d'une archive sont écartées, pas rejetantes** ·
_Écarté :_ refuser toute archive contenant un fichier interdit. _Raison :_ une archive
contient presque toujours un `.DS_Store` ou un `__MACOSX/`. Refuser le dépôt entier pour
ça serait insupportable. Seules les menaces qui portent sur l'archive dans son ensemble —
bombe de décompression, taille, nombre de fichiers — l'interrompent ; le reste est écarté
et listé dans le rapport.

**2026-08-18 · Le filtre de sécurité s'applique avant la décompression** · _Écarté :_
décompresser puis vérifier. _Raison :_ une bombe de décompression fait quelques kilo-octets
et en produit des giga. Vérifier après coup, c'est l'avoir déjà allouée. fflate expose un
filtre appelé sur les métadonnées de chaque entrée, avant toute allocation — c'est ce qui
a décidé du choix de la bibliothèque.

**2026-08-18 · `CALQUE_ENV` distingue le déploiement de la build** · _Écarté :_ tout
décider sur `NODE_ENV`. _Raison :_ les tests de bout en bout démarrent volontairement une
build de production — c'est le seul moyen de vérifier ce qui sera réellement déployé — sur
une machine de développement, avec un stockage sur disque. Sans cette distinction il aurait
fallu soit tester autre chose que la production, soit ouvrir une porte dérobée dans la
validation du stockage.

**2026-08-18 · Le pilote R2 est écrit à la main plutôt que tiré du SDK AWS** · _Écarté :_
`@aws-sdk/client-s3`. _Raison :_ le produit n'a besoin que de cinq opérations, et le SDK
pèse plusieurs mégaoctets qu'il faudrait ensuite exclure du bundle Next. La canonisation
SigV4 — la partie où une erreur produit une signature valide mais fausse — est testée
séparément. **Le dialogue HTTP avec un bucket réel n'est pas exercé** : aucune clé R2
n'existe dans ce dépôt.

**2026-08-18 · Le lecteur de listing S3 découpe la chaîne au lieu d'analyser le XML** ·
_Écarté :_ un analyseur XML. _Raison :_ ce XML est produit par S3, très contraint, et cinq
balises suffisent. Ce n'est pas du HTML — l'interdit du §21 ne s'applique pas — et ajouter
une dépendance d'analyse pour ça coûterait plus qu'il ne rapporte.

**2026-08-18 · Un travail est une fonction pure ; le lanceur décide du quand** ·
_Écarté :_ écrire INGEST directement dans une route Next. _Raison :_ le §3 fige Trigger.dev
comme lanceur de production. Séparer la définition du travail de son exécution permet de
l'exercer en test contre un vrai Postgres, et de brancher Trigger.dev sans réécrire la
logique. **Seul le lanceur en ligne est écrit et exercé** : aucun projet Trigger.dev n'est
joignable depuis ce dépôt.

**2026-08-18 · Un dépôt en échec laisse le site visible, en état d'échec** · _Écarté :_
supprimer le site. _Raison :_ un site qui disparaît laisse l'agence sans explication et
sans recours. Le statut `echec_ingestion` garde la trace, le message d'erreur reste
lisible, et redéposer est un geste évident.

**2026-08-18 · L'organisation est créée à la première connexion** · _Écarté :_ un écran
d'onboarding dédié. _Raison :_ le multi-tenant du §16 n'a pas d'état « utilisateur sans
organisation » à représenter, et un écran de plus avant le premier dépôt n'apporte rien.
L'écran d'onboarding du §22 P10 pourra la renommer.

---

## P5 — Runtime d'édition

**2026-08-18 · Le runtime est injecté en tête du `<head>`, pas en fin de `<body>`** ·
_Écarté :_ l'emplacement habituel d'un script d'instrumentation. _Raison :_ le mode
d'édition statique doit neutraliser GSAP ou AOS **avant** que le CDN ne les définisse.
Injecté en fin de page, le runtime arrive après la bibliothèque, les éléments sont déjà
revenus à `opacity: 0`, et l'aperçu de la fixture 03 reste une page blanche.

**2026-08-18 · Les bouchons sont posés en propriétés non réinscriptibles** · _Écarté :_
une simple affectation `window.gsap = bouchon`. _Raison :_ le script du CDN s'exécute
ensuite et écraserait le bouchon. `Object.defineProperty` avec `writable: false` fait
échouer silencieusement cette réécriture — ce qui est exactement le comportement voulu.

**2026-08-18 · Un élément hors liste blanche est déballé à la frappe** · _Écarté :_
bloquer le collage. _Raison :_ le §11 impose « aucun HTML collé », mais refuser le collage
rendrait l'édition pénible. Le texte est inséré en clair, la mise en forme reconnue
survit, le reste est déballé.

**2026-08-18 · `zod/mini` dans le protocole** · _Écarté :_ Zod complet, comme partout
ailleurs. _Raison :_ le §11 impose Zod des deux côtés, et le §4 fixe le runtime à 40 kB
gzip. Zod complet en coûte 67 à lui seul. La variante mini a la même sémantique de
validation et ramène le bundle à 9,5 kB.

**2026-08-18 · L'aperçu construit les pages à la demande, mais sert les médias depuis le
stockage** · _Écarté :_ reconstruire le site entier à chaque requête. _Raison :_ le build
recopie tous les fichiers, images comprises. À chaque frappe, cela chargerait tout le site
en mémoire pour renvoyer une page. L'option `pagesOnly` limite la sortie aux pages ; le
reste est inchangé par le build et servi directement.

**2026-08-18 · L'identifiant de version est imposé par l'appelant, pas généré par la
base** · _Écarté :_ laisser Postgres générer la clé de `site_versions`. _Raison :_ les
fichiers sont déjà écrits dans le stockage sous cet identifiant. Deux identifiants
distincts obligeaient à une table de correspondance — et, en pratique, l'aperçu cherchait
les sources là où elles n'étaient pas, avec un échec qui n'apparaissait qu'à l'ouverture
de l'éditeur.

**2026-08-18 · L'aperçu est servi par l'application, pas encore depuis un eTLD+1
distinct** · _Écarté :_ prétendre que `*.calque-preview.site` est en place. _Raison :_ le
§11 le demande pour que les cookies de session soient inaccessibles depuis la page éditée.
Cela suppose un domaine et une entrée DNS, qui n'existent pas ici. En attendant, l'iframe
reste en bac à sable, la CSP interdit tout le superflu et `frame-ancestors` limite
l'encadrement. C'est consigné dans le runbook comme préalable à la mise en production.

---

## P6 — Interface d'édition

**2026-08-18 · L'autosave passe par une route, pas par une action serveur** ·
_Écarté :_ `enregistrerBrouillon` en action serveur, comme le reste. _Raison :_ deux
défauts rédhibitoires. Une action serveur fait revalider la route courante à chaque
appel — donc re-rendre tout l'éditeur toutes les 800 ms de frappe — et n'accepte pas
`keepalive`, indispensable pour vider la file au moment où l'onglet se ferme. Le symptôme
observé était le pire possible : la dernière modification perdue exactement quand
l'utilisateur croit avoir fini.

**2026-08-18 · L'éditeur envoie un patch de ce qui vient de changer, jamais le contenu
entier** · _Écarté :_ renvoyer tout le contenu à chaque enregistrement. _Raison :_ deux
enregistrements différés peuvent se croiser. Avec le contenu entier, le plus ancien
écrase le plus récent ; avec un patch, chacun ne touche que ses propres clés et l'ordre
d'arrivée cesse d'importer. C'est aussi ce qui permet à deux onglets de cohabiter (§10).

**2026-08-18 · La file d'enregistrement est vidée sur `pagehide`** · _Écarté :_ se fier
au seul débounce. _Raison :_ 800 ms suffisent à perdre une modification si l'utilisateur
recharge ou ferme dans la foulée. `fetch(..., { keepalive: true })` laisse la requête
partir alors que la page disparaît.

**2026-08-18 · Ouvrir une section annexe garde la sélection courante** · _Écarté :_ une
sélection exclusive entre l'arbre et les sections. _Raison :_ on ouvre la bibliothèque
d'images **depuis** un champ image, pour y poser une image. Effacer la sélection en
chemin faisait réussir le dépôt sans que rien n'apparaisse dans la page.

**2026-08-18 · L'annulation rejoue des patches Immer, pas des états complets** ·
_Écarté :_ une pile de copies du contenu. _Raison :_ le §4 le demande, et sur un site de
plusieurs centaines de champs, cinquante copies coûteraient des mégaoctets pour une
fonctionnalité utilisée trois fois par session.

**2026-08-18 · Le blueprint ne descend pas dans le client** · _Écarté :_ passer le
blueprint entier au panneau. _Raison :_ il pèse plusieurs centaines de kilo-octets sur un
site multi-pages, dont l'interface n'a que faire. Le serveur en extrait un modèle
d'affichage — libellés, types, contraintes, valeurs — et rien d'autre.

**2026-08-18 · Le compteur de caractères avertit sans bloquer** · _Écarté :_ un
`maxLength` dur sur la saisie. _Raison :_ le §11 est explicite. Dépasser la longueur
prévue déforme la mise en page ; ce n'est pas une faute, et bloquer la frappe au milieu
d'un mot est la façon la plus sûre de faire abandonner quelqu'un.

**2026-08-18 · Les variantes d'image ne sont jamais agrandies** · _Écarté :_ produire
systématiquement les quatre largeurs du §14. _Raison :_ une variante 1600 tirée d'une
source 800 est plus lourde que l'original pour une image plus floue. Une image plus
petite que la plus petite largeur cible garde tout de même une déclinaison, sans quoi la
publication n'aurait aucun `srcset` à écrire.

**2026-08-18 · Un SVG n'est ni recadré ni décliné** · _Écarté :_ le traiter comme les
autres images. _Raison :_ c'est un vecteur. Le redimensionner n'a pas de sens, le
rastériser lui ferait perdre exactement ce pour quoi il a été choisi.

**2026-08-18 · Les médias sont déposés par le navigateur, comme les archives** ·
_Écarté :_ un envoi par action serveur. _Raison :_ le §14 autorise 10 Mo par fichier, au-delà
de ce qu'une fonction serverless accepte en corps de requête. Le mécanisme d'URL signée du
P4 est réutilisé tel quel, avec une clé temporaire effacée après traitement.
