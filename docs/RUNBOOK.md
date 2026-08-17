# Runbook

État : **partiel**. Complété au fil des phases. Ce qui n'est pas encore vérifiable est
marqué comme tel — un runbook qui décrit une procédure jamais exécutée est pire qu'un
runbook vide.

---

## Environnement de développement

### Démarrage complet

```bash
pnpm install
./scripts/postgres-local.sh start     # affiche la DATABASE_URL à copier
cp .env.example .env                  # y coller DATABASE_URL, générer AUTH_SECRET
pnpm db:migrate
pnpm dev                              # http://localhost:3000
```

`AUTH_SECRET` : `openssl rand -base64 32`.

Sans `RESEND_API_KEY`, les liens de connexion sont écrits dans les logs du serveur au lieu
d'être envoyés — le parcours reste complet, aucun compte tiers n'est nécessaire.

### Postgres local

| Commande                             | Effet                                       |
| ------------------------------------ | ------------------------------------------- |
| `./scripts/postgres-local.sh start`  | Initialise si besoin, démarre, crée la base |
| `./scripts/postgres-local.sh stop`   | Arrête proprement                           |
| `./scripts/postgres-local.sh status` | État du cluster                             |
| `./scripts/postgres-local.sh url`    | Affiche la `DATABASE_URL`                   |
| `./scripts/postgres-local.sh reset`  | Supprime le cluster et repart de zéro       |

Le cluster vit dans `.data/pg` (ignoré par git), sur le port 54329 pour ne pas entrer en
conflit avec un Postgres système. En conteneur exécuté en root, le script bascule
automatiquement sur un compte système dédié — PostgreSQL refuse de tourner en root.

### Tests

```bash
pnpm test        # unitaires + intégration, sur Postgres embarqué (PGlite) — aucune infra
pnpm e2e         # parcours navigateur, exige un Postgres migré
```

`pnpm test` ne nécessite ni base ni variable d'environnement. `pnpm e2e` construit
l'application et la démarre en mode production.

---

## Migrations

```bash
pnpm db:generate   # après modification du schéma Drizzle → SQL versionné
pnpm db:migrate    # applique sur DATABASE_URL
```

Les migrations sont versionnées dans `packages/db/drizzle/` et **jamais modifiées après
commit**. Une correction se fait par une nouvelle migration.

Le schéma testé sur PGlite et celui déployé sur Neon proviennent du même dossier SQL :
c'est ce qui rend les tests d'intégration représentatifs.

---

## Incidents

### Les migrations échouent au démarrage

1. `DATABASE_URL` pointe-t-elle sur une base joignable ? `./scripts/postgres-local.sh status`
2. La table `drizzle.__drizzle_migrations` liste les migrations déjà appliquées.
3. Rejouer les migrations est idempotent (couvert par un test).

### Un lien de connexion ne fonctionne pas

- **« Ce lien a expiré ou a déjà été utilisé »** : comportement attendu. Un lien magique
  est à usage unique et vaut 24 heures.
- **Le lien renvoie vers la page d'accueil au lieu du tableau de bord** : l'hôte du lien
  et celui du navigateur diffèrent (`localhost` vs `127.0.0.1`). Auth.js rejette alors la
  `callbackUrl` comme origine étrangère. Aligner `AUTH_URL` sur l'hôte réellement utilisé.
- **Aucun email reçu** : vérifier `RESEND_API_KEY`. Sans clé, chercher dans les logs la
  ligne « lien de connexion journalisé ».

### Le build échoue sur les fontes

Les fontes sont versionnées dans `apps/web/public/fonts/` : le build ne télécharge rien.
Si elles manquent, les regénérer depuis Google Fonts (voir `apps/web/src/app/fonts.css`
pour les sous-ensembles attendus : latin et latin-ext, ce dernier portant « œ »).

---

## À compléter

| Sujet                                                | Phase |
| ---------------------------------------------------- | ----- |
| Restauration PITR Neon — procédure **et test**       | P8    |
| Versionnement et restauration R2                     | P8    |
| Reprise d'un déploiement Cloudflare Pages échoué     | P8    |
| Rotation des secrets                                 | P9    |
| Export et suppression des données d'un client (RGPD) | P10   |
| Procédure de restauration testée de bout en bout     | P10   |

Le §17 exige que la procédure de restauration soit **documentée et testée**. Tant que la
ligne « testée » n'est pas cochée, elle ne compte pas.
