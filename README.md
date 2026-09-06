# Prospection d'enseignes sans site web

Outil en deux morceaux pour démarcher les commerces de proximité dont la fiche
Google Maps ne renvoie vers **aucun vrai site** — et pour lesquels on cherche une
adresse e-mail de contact.

| Morceau | Où ça tourne | À quoi ça sert |
|---|---|---|
| **Le collecteur** (`src/`) | en local, Node 18+ | interroge l'API Google Places, filtre les enseignes sans vitrine, tente de récupérer une adresse e-mail, écrit un JSON et un CSV |
| **La console** (`artifact/`) | publiée sur Artifact | trie les prospects par score, suit les relances, prépare les messages, réexporte le CSV |

**Console publiée :** https://claude.ai/code/artifact/01b99278-5c85-4b2a-876e-9a6e29e0053c

---

## Ce que l'outil peut et ne peut pas faire

À lire avant de commencer, parce que ça détermine votre méthode de travail.

**L'API Google Places ne renvoie jamais d'adresse e-mail.** Aucun champ, aucun
masque, aucune option. C'est une limite du produit Google, pas de cet outil.
Toute solution qui vous promet « les e-mails depuis Google Maps » les récupère
ailleurs — ou les invente.

La chaîne fait donc ceci :

1. **Google Places** donne le nom, l'adresse, le téléphone, les avis, et le lien
   affiché sur la fiche (`websiteUri`).
2. **Le filtre de vitrine** sépare quatre cas très différents que Google mélange
   dans un seul champ :

   | Vitrine | Ce que ça veut dire | Prospect ? |
   |---|---|---|
   | `AUCUNE` | aucun lien sur la fiche | oui |
   | `SITE_MORT` | `business.site` (mini-site Google fermé en mars 2024), Wix gratuit, e-monsite… le lien est cassé ou abandonné | oui, le plus chaud |
   | `RESEAU_SOCIAL` | Facebook, Instagram, Linktree | oui |
   | `PLATEFORME` | TheFork, Planity, Doctolib, Uber Eats… la page appartient à l'intermédiaire | oui |
   | `SITE` | domaine propre | non, écarté |

3. **L'enrichissement** télécharge la page pointée par les fiches des trois
   dernières catégories et y cherche une adresse e-mail (liens `mailto:`,
   désobfuscation `nom [at] domaine`, filtrage du bruit technique).
4. **La console** prend le relais : pour les fiches restées sans e-mail, elle
   propose trois recherches en un clic (Google, page Facebook, Pages Jaunes).
   Comptez une dizaine de secondes par enseigne pour trancher.

**Rendement à attendre :** sur une collecte réelle, entre **15 % et 35 %** des
prospects ressortent avec une adresse exploitable. Les fiches sans aucun lien —
souvent la majorité — n'ont rien à récolter automatiquement : c'est le téléphone,
ou la recherche manuelle. Le jeu d'exemple livré avec la console affiche un taux
plus flatteur (68 %) parce qu'il sert à montrer l'interface remplie.

---

## Installation

```bash
git clone <ce dépôt> && cd main
cp .env.example .env         # puis renseignez votre clé
```

Aucune dépendance à installer : le collecteur n'utilise que la bibliothèque
standard de Node (18.17 ou plus récent).

### La clé Google

Dans [Google Cloud Console](https://console.cloud.google.com/apis/library),
sur un projet avec facturation activée :

1. activez **Places API (New)** — attention, ce n'est pas la même que « Places API » ;
2. activez **Geocoding API** (pour convertir « Nantes » en zone à balayer) ;
3. créez une clé API, **sans restriction de référent HTTP** (elle est appelée
   depuis Node, pas depuis un navigateur) ;
4. collez-la dans `.env` sous `GOOGLE_MAPS_API_KEY`.

---

## Utilisation

```bash
# Chaîne complète : collecte, enrichissement, export
node src/cli.mjs run --lieu "Nantes" --segments restaurant,coiffeur

# Quartier précis, maillage serré
node src/cli.mjs run --lieu "44100" --segments boulangerie --cellule 1.5

# Sans dépenser un centime : jeu d'exemple
node src/cli.mjs demo --out data/exemple.json

# Les 38 segments disponibles
node src/cli.mjs segments
```

Sortie : `data/prospects.json` (à importer dans la console) et
`data/prospects.csv` (Excel / Google Sheets, séparateur `;`, UTF-8 avec BOM).

### Options utiles

| Option | Effet |
|---|---|
| `--lieu` | ville, code postal ou adresse ; sans `--rayon`, on balaie le cadre que Google donne à la commune |
| `--rayon 5` | force un carré de 10 km de côté autour du centre |
| `--cellule 2` | côté des cellules de balayage, en km — **le réglage qui compte** (voir ci-dessous) |
| `--pages-contact` | sur les mini-sites, explore aussi `/contact` et `/mentions-legales` |
| `--sans-enrichissement` | saute la recherche d'e-mails (collecte seule, rapide) |
| `--ignorer-robots` | ne lit pas `robots.txt` avant de télécharger une page |
| `--inclure-sites` | garde aussi les enseignes qui ont déjà un vrai site |

### Le réglage `--cellule`

Une recherche Places plafonne à **60 résultats**. Sur « restaurant » à l'échelle
d'une ville, vous ne verriez que le haut du classement — c'est-à-dire
précisément les enseignes qui ont déjà un site. Le collecteur découpe donc la
zone en cellules et interroge chacune séparément.

Si le journal annonce *« N cellules ont atteint le plafond de 60 résultats »*,
baissez `--cellule` : vous ratez des enseignes. En centre-ville dense, 1 à 1,5 km
est un bon point de départ ; en périphérie, 3 km suffisent.

### Ce que ça coûte

Le nombre d'appels facturés vaut à peu près `cellules × segments` (jusqu'à ×3 si
les cellules débordent). Un rayon de 5 km avec des cellules de 2 km fait 25
cellules ; deux segments, environ 50 à 90 appels. Le collecteur affiche le
compte exact à la fin de chaque exécution.

Demander `websiteUri` et le téléphone place les requêtes dans le palier le plus
cher de Text Search. Google révise sa grille régulièrement et offre un quota
mensuel gratuit : vérifiez le tarif en vigueur sur
[la page tarifaire Places](https://developers.google.com/maps/documentation/places/web-service/usage-and-billing)
avant de lancer une grosse campagne, et posez un plafond de dépense sur le projet
Cloud.

---

## La console

Ouvrez le lien Artifact plus haut, puis **Importer une collecte** et déposez
`data/prospects.json` (le CSV passe aussi).

- **Score de prospection** — combine ce qui manque à la vitrine (un lien mort
  pèse plus qu'une page Facebook), la présence d'un canal de contact, et
  l'activité réelle mesurée par les avis Google.
- **Suivi** — à contacter / contacté / relance / rendez-vous / gagné / perdu,
  plus un champ de notes. Le suivi est indexé sur l'identifiant Google : il
  **survit à un réimport** du même secteur, vous pouvez recollecter tous les mois
  sans perdre votre historique.
- **Messages** — quatre modèles (restauration, beauté, artisans, générique) dont
  la phrase d'accroche est calculée d'après ce qui manque à la fiche du prospect.
  Un bouton « Rédiger avec Claude » propose une variante personnalisée.
- **Export** — CSV des prospects affichés, statuts et notes compris.
- `j` / `k` pour parcourir la liste au clavier.

Le suivi est stocké dans la base de l'artefact quand elle est disponible, sinon
dans le navigateur. Comme la console déclare cette base, l'artefact reste
**interne à votre organisation** et ne peut pas être partagé publiquement.

---

## Cadre légal

Démarcher une adresse professionnelle générique (`contact@…`) est admis entre
professionnels, à trois conditions cumulatives : le message concerne l'activité
du destinataire, l'origine des données est indiquée, et le désabonnement est
immédiat et simple. Les modèles fournis intègrent déjà la mention d'origine et
le « STOP ».

Une adresse nominative (`marie.durand@…`) est une donnée personnelle : le RGPD
(art. 14) impose de l'informer de la collecte. En pratique, préférez les adresses
génériques.

Le collecteur reste dans les clous techniques : API officielle plutôt que
scraping de `maps.google.com`, lecture de `robots.txt`, un seul appel toutes les
1,2 s par hôte, identification dans le `User-Agent`.

---

## Développement

```bash
npm test        # 33 tests unitaires, sans réseau
```

```
src/
  cli.mjs         commandes et orchestration
  places.mjs      client Places (New) + Geocoding, pagination, reprise sur erreur
  geo.mjs         découpage de la zone en cellules
  segments.mjs    38 segments métier -> mots-clés et types Google
  vitrine.mjs     classement du lien affiché (aucun / mort / social / plateforme / site)
  emails.mjs      extraction et notation des adresses trouvées dans du HTML
  enrich.mjs      téléchargement poli des pages (robots.txt, throttling, timeouts)
  score.mjs       note de prospection 0-100
  normaliser.mjs  fiche Places -> enregistrement exploitable
  export.mjs      écriture CSV et JSON
  demo.mjs        jeu d'exemple déterministe
artifact/
  console-prospection.html    la console publiée
```
