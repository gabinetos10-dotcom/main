# GJS — Site de l'agence (marketing digital & communication)

Site statique complet, sans build : HTML5 sémantique, CSS (custom properties, aucun framework), JavaScript en modules ES natifs.
Librairies épinglées via CDN (avec empreintes SRI) : **GSAP 3.13.0** (ScrollTrigger, SplitText, Flip, CustomEase), **Lenis 1.3.26**, **Barba.js 2.10.3**. Mini-jeux en **Canvas 2D** natif.

> Les seuls contenus provisoires sont les **médias** (images, vidéo) et les **textes signalés `[À REMPLACER]`** (étiquette rouille bien visible dans les pages). Rien d'autre n'est un placeholder.

---

## 1. Voir le site (important : pas de double-clic sur `index.html`)

Ouvert par double-clic, le site s'affiche avec une adresse `file://…` : les navigateurs bloquent alors les modules JavaScript (sécurité CORS). On obtient une **version statique, sans loader, transitions ni jeux** (un message l'explique en bas de l'écran). Il faut passer par un petit serveur local, ou mettre le site en ligne.

**Récupérer le bon dossier** : le site est sur la branche `claude/eager-gauss-qymcxp` (la branche `main` ne contient pas le site). Archive ZIP de la branche : https://github.com/gabinetos10-dotcom/main/archive/refs/heads/claude/eager-gauss-qymcxp.zip — dézippez-la avant de lancer quoi que ce soit.

### A. Double-clic sur un lanceur (le plus simple)

Prérequis : [Node.js](https://nodejs.org) (version LTS) installé une fois pour toutes.

| Système | Fichier | Remarque |
|---|---|---|
| Windows | `lancer-le-site.bat` | Une fenêtre noire s'ouvre (le serveur), puis le navigateur sur http://localhost:3000. Fermez la fenêtre pour arrêter. Si Windows affiche « Windows a protégé votre ordinateur » : **Informations complémentaires › Exécuter quand même**. |
| macOS | `lancer-le-site.command` | La 1re fois, macOS bloque un fichier téléchargé : clic droit › **Ouvrir** (macOS 15 et + : Réglages système › Confidentialité et sécurité › **Ouvrir quand même**). Si le fichier n'est pas exécutable après dézippage : `chmod +x lancer-le-site.command` dans un terminal. |
| Linux | `./lancer-le-site.command` | Dans un terminal, depuis le dossier du site. |

Sans Node.js, les lanceurs utilisent Python s'il est présent (http://localhost:8000). Le navigateur s'ouvre tout seul dès que le serveur répond (au premier lancement, le téléchargement de `serve` peut prendre jusqu'à une minute). Le serveur n'écoute que sur cet ordinateur ; si le pare-feu Windows pose une question, « Annuler » suffit.

### B. En ligne de commande

Ouvrez un terminal **dans le dossier du site** (celui qui contient `index.html`), puis :

```bash
npx serve .            # puis http://localhost:3000
# ou, avec Python :
python3 -m http.server 8000      # macOS / Linux, puis http://localhost:8000
py -m http.server 8000           # Windows (Python de python.org)
```

Le fichier `serve.json` désactive les « clean URLs » de `serve` pour que les liens `offres.html`, `contact.html`… restent identiques en local et en production.

### C. Avec VS Code

Installez l'extension **Live Server**, ouvrez le dossier du site, clic droit sur `index.html` › « Open with Live Server ».

### D. En ligne, sans rien installer

- **Netlify Drop** : glissez le dossier du site sur https://app.netlify.com/drop → une URL publique est générée en quelques secondes.
- **GitHub Pages** (dépôt public, ou offre payante pour un dépôt privé) : dans le dépôt, Settings › Pages › Source « Deploy from a branch », branche `claude/eager-gauss-qymcxp`, dossier `/ (root)`. Le site sera servi sous `https://<compte>.github.io/main/` : tout fonctionne, sauf la page 404 personnalisée qui attend la racine d'un domaine (voir ci-dessous).

### Toujours peu d'animations ?

- **Réglage « réduire les animations » du système** (Windows 11 : Paramètres › Accessibilité › Effets visuels › Effets d'animation ; Windows 10 : Paramètres › Options d'ergonomie › Affichage › Afficher les animations dans Windows ; macOS : Réglages › Accessibilité › Affichage › Réduire les animations). Le site le respecte volontairement : scroll natif, fondus simples, loader court, vidéo en pause. Réactivez les animations du système pour voir la version complète.
- **Réseau filtré ou bloqueur de contenu** empêchant jsDelivr : le site bascule alors aussitôt en version statique (message dans la console). Testez sur une autre connexion ou auto-hébergez les librairies (§9).
Une connexion internet est nécessaire pour les librairies d'animation (jsDelivr) — les polices, images et vidéos sont hébergées avec le site. Voir §9 pour auto-héberger aussi les librairies.

La page `404.html` utilise des chemins absolus (`/assets/…`) : elle doit être servie à la racine du domaine (comportement par défaut de Netlify, Vercel, `serve`, Apache avec `ErrorDocument 404 /404.html`, etc.).

---

## 2. Direction artistique (v2 « orbite chaude »)

1. **Palette de marque** : gris lunaire `#E5E7E6`, crème sable `#EEE6D8`, or `#DAAB3A`, cuivre `#B67332`, rouille `#93441A`. Deux teintes dérivées pour le texte et les sections « espace » : encre brune `#1F1812` et nuit chaude `#16100C`.
2. **Règles de contraste mesurées (WCAG AA)** : sur fond clair, texte encre (14:1), texte secondaire `#5D564D` (5,8:1), accent texte rouille (5,5:1) ; le cuivre est réservé aux grands titres (3,1:1) et l'or n'est jamais utilisé en texte sur fond clair (1,7:1) — il sert aux boutons (texte encre 8,2:1), étoiles, pastilles et états actifs. Sur la nuit chaude : crème (15:1), or (8,9:1), cuivre (4,9:1).
3. **Typographie** : titres en **League Spartan** (700-800, grande hauteur d'x), texte en **Archivo Narrow** (17-19 px, interlignage 1,6), un seul sur-titre par section, un ou deux mots d'accent en cuivre par titre.
4. **Un seul conteneur** (1 280 px utiles, marges latérales 20 → 64 px) : tous les blocs, le logo du header et le footer partagent exactement le même bord gauche et droit.
5. **Sections à fond propre** (`data-theme="cream|grey|space|gold"`) qui alternent pour séparer les blocs d'information ; respiration verticale 80 → 144 px.
6. **Univers espace & robots** : mascotte robot SVG (logo, footer, bandeau cookies, 404…) dont les yeux suivent le pointeur et qui répond quand on clique dessus ; planètes cuivrées à anneau, ciels étoilés chauds, vaisseau GJS (loader, transitions, méthode, jeux).
7. **Interactions** : survol et focus clavier identiques sur tout ce qui est cliquable (cartes qui se soulèvent avec bord or, liens fléchés dont la pastille se remplit), onglets, filtres animés, sommaire de lecture, compteurs, mini-jeux. Plus de curseur personnalisé : le pointeur reste celui du système.
8. **Motion** à easing expo, reveals ligne par ligne, rien qui gêne la lecture ; `prefers-reduced-motion` respecté partout.

---

## 3. Arborescence

```
/index.html  /offres.html  /a-propos.html  /contact.html  /404.html
/mentions-legales.html  /politique-confidentialite.html  /politique-cookies.html  /exercer-vos-droits.html
/robots.txt  /sitemap.xml  /site.webmanifest  /favicon.svg  /serve.json
/lancer-le-site.bat (Windows)  /lancer-le-site.command (macOS / Linux)
/assets/css/   tokens.css · base.css · layout.css · components.css · games.css (chargé à la demande)
               pages/ home.css · offres.css · about.css · contact.css · legal.css · error.css
/assets/js/    main.js (bootstrap, Barba, cycle de vie) · config.js (CONFIG central) · easter-egg.js
               core/  loader · transitions · scroll · splitText · magnetic · marquee · menu (header + menu mobile)
                      cookies · reveal · scope (anti-fuite) · head (sync <head>) · footer · accordion · tabs
                      robot (mascotte) · grid (touche G) · utils
               pages/ home · offres · about · contact · legal · error   (chargés à la demande)
               games/ arcade (coque) · button-game · race-game · maze-game · ship-hunt · utils
/assets/img/   placeholders AVIF + WebP (srcset), og-image.jpg, icons/
/assets/video/ hero.mp4 · hero.webm · hero-poster.jpg
/assets/fonts/ League Spartan + Archivo Narrow (variables, OFL, auto-hébergées)
```

### Cycle de vie des pages

Chaque module de `pages/` exporte `{ init(scope, container), intro(scope, container, tl), destroy() }`.
`main.js` crée un **scope** par page (`core/scope.js`) qui regroupe un `gsap.context`, un `gsap.matchMedia`, les écouteurs, observers, intervalles et boucles : tout est détruit d'un appel à la sortie de page (hook Barba `afterLeave`).

### Composants et attributs (sans JS spécifique)

| Attribut / composant | Effet |
|---|---|
| `data-split="lines\|chars"` | Reveal de texte masqué (SplitText, lisible par les lecteurs d'écran) |
| `data-reveal="fade\|stagger\|image\|line"` | Fondu, cascade d'enfants, image par clip-path + scale, trait |
| `data-intro` + `data-delay` | Joué à l'entrée de page (après loader / rideau) au lieu du scroll |
| `data-parallax="0.15"` | Parallaxe (profondeur, négatif = sens inverse) |
| `data-counter="140"` (+ `data-prefix`, `data-suffix`, `data-decimals`) | Compteur animé |
| `data-theme="cream\|grey\|space\|gold"` | Fond et palette de la section |
| `[data-tabs]` + `role="tab"` / `role="tabpanel"` | Onglets accessibles (flèches, Début, Fin) ; sans JS tous les panneaux restent visibles |
| `svg[data-robot]`, `[data-robot-talk]` (+ `data-messages="…\|…"`) | Robot dont les yeux suivent le pointeur ; bulle de répliques au clic, annoncée aux lecteurs d'écran |
| `data-magnetic="0.35"` | Bouton magnétique (module conservé, **non utilisé en v2** : plus aucun élément ne se déplace avec la souris) |
| `data-marquee` (+ `data-speed`, `data-direction`) | Bande défilante réactive à la vélocité du scroll |
| `data-launch-game="button\|race\|maze"` | Ouvre un jeu de l'Arcade |
| `data-config="email\|phone\|booking\|availability"`, `data-social="LinkedIn"` | Synchronisé avec `CONFIG` |
| `data-cookie-manage` | Rouvre le choix des cookies |

---

## 4. Historique

**v1** — site complet selon le brief : loader vaisseau, hero vidéo, menu plein écran, transitions Barba, 3 pages + 2 pages légales + 404, Arcade (3 jeux), 4 easter eggs, bandeau cookies, SEO, accessibilité, performance.

**v2 (refonte demandée par le client)** — chaque demande et sa réponse :

| Demande | Réponse |
|---|---|
| Information moins brouillon, site plus aéré et clair | Un seul sur-titre par section (fini les « [01] — … »), en-têtes de section normalisés, sections à fond propre qui alternent, respiration verticale 80 → 144 px, textes resserrés, tailles de titres raisonnables |
| Éléments pas à la même marge | Un seul conteneur pour tout le site : titres, textes, cartes, images, header et footer partagent le même bord (écart mesuré ≤ 1 px de 360 à 2 560 px, voir §10) ; plus de décalages en escalier ni de rotations |
| Renforcer l'interaction | Onglets (expertises, offres), filtres animés des projets, panneau projet, sommaire collant avec repérage, comparatif interactif, configurateur avec synthèse animée, frises qui se remplissent, cartes qui réagissent au survol et au clavier, robot qui parle, formulaire avec progression, visionneuse photo, Arcade |
| Identité plus marquante, couleurs imposées, univers espace / robots | Palette `#E5E7E6` `#EEE6D8` `#DAAB3A` `#B67332` `#93441A` (+ encre et nuit chaude dérivées), mascotte robot, planètes, ciels étoilés, vaisseau ; médias régénérés dans cette palette |
| Enlever l'effet sur le curseur | Curseur personnalisé supprimé (module, styles, attributs) : pointeur du système partout |
| Typographies League Spartan / Archivo Narrow | Auto-hébergées, préchargées, fallbacks calés |
| Header plus marqué et visuel | Capsule sombre toujours lisible, logo robot, navigation visible dès 1 024 px avec page courante, bouton or « Démarrer un projet », menu plein écran en mobile |
| Footer moins gros, plus compréhensible, GJS présent | Bande d'appel à l'action avec robot, « GJS » en taille maîtrisée avec orbite, 4 colonnes claires (Navigation, Expertises, Légal & RGPD, Contact), barre de bas de page |
| Pages RGPD intégrées au footer | Mentions légales, Confidentialité, Cookies, Exercer vos droits (avec formulaire), bouton « Gérer les cookies » — colonne « Légal & RGPD » du footer et onglets entre les 4 pages |


**Revue contradictoire de la v2** — un relecteur indépendant a passé le site au crible des 9 demandes (28 constats). Corrigés : capsule du header renforcée (visible aussi sur les sections sombres), footer mobile ramené de 1 439 à 906 px (desktop 789 px), loader et transitions raccourcis (≈ 2,3 s à la 1re visite, ≈ 1,2 s par changement de page), méthode unifiée en 5 étapes (une seule source pour l'Accueil et les Offres), filtres de projets qui mettent en avant au lieu de masquer (grille toujours pleine), témoignages entiers, sommaire légal entièrement visible, noms d'expertises identiques partout, configurateur sans présélection et avec les mêmes délais que le formulaire, détail des expertises replié sur mobile, plus aucun élément qui se déplace avec la souris (bouton magnétique et parallaxe au pointeur retirés ; seuls les yeux du robot suivent le pointeur), bandeau défilant avec bouton pause, couleurs du jeu Lead Rush ramenées à la palette, mention RGPD du formulaire alignée sur la politique de confidentialité. Laissé au choix du client : afficher ou non le bandeau cookies tant qu'aucun traceur soumis à consentement n'est actif (il est affiché par défaut).

---

## 5. Médias à remplacer

Toutes les images sont servies en `<picture>` : **AVIF** puis **WebP**, avec `srcset` et `width`/`height`. Pour chaque base ci-dessous, fournir un fichier par largeur et par format, nommé `base-LARGEUR.avif` / `base-LARGEUR.webp` (ou `base.avif` / `base.webp` quand une seule largeur est listée). Les visuels actuels sont des compositions génératives marquées `[À REMPLACER]`.

Pensez à mettre à jour les attributs `alt` dans le HTML (ils décrivent déjà le contenu attendu).

### Vidéo hero

| Fichier | Format | Specs recommandées |
|---|---|---|
| `assets/video/hero.mp4` | H.264 (MP4) | 1920×1080, 10-15 s en boucle parfaite, CRF 26, `-movflags +faststart`, **sans audio**, < 4 Mo |
| `assets/video/hero.webm` | VP9 (WebM) | Mêmes specs, `-b:v 0 -crf 38` environ, < 3 Mo |
| `assets/video/hero-poster.jpg` | JPEG | 1920×1080 (1re image de la vidéo), ≤ 150 Ko — sert aussi de repli (autoplay bloqué, économie de données, mouvement réduit) |

```bash
ffmpeg -i source.mov -t 12 -vf "scale=1920:-2" -an -c:v libx264 -preset slow -crf 26 -pix_fmt yuv420p -movflags +faststart assets/video/hero.mp4
ffmpeg -i source.mov -t 12 -vf "scale=1920:-2" -an -c:v libvpx-vp9 -b:v 0 -crf 38 -row-mt 1 assets/video/hero.webm
ffmpeg -i assets/video/hero.mp4 -frames:v 1 -q:v 3 assets/video/hero-poster.jpg
```

La vidéo actuelle est un placeholder génératif (ciel étoilé chaud, planète cuivrée à anneau), volontairement sans libellé incrusté. Le bouton « Pause » du hero est obligatoire (WCAG 2.2.2) ; la vidéo est aussi mise en pause hors écran, en économie de données et en mouvement réduit.

### Images

| Fichier (base) | Dimensions natives | Largeurs générées | Poids cible (par fichier WebP le plus large) | Contenu attendu |
|---|---|---|---|---|
| `service-site` | 1200×1500 | 600 / 1200 | ≤ 140 Ko | Maquettes d’un site web responsive affichées sur ordinateur et mobile |
| `service-automatisation` | 1200×1500 | 600 / 1200 | ≤ 140 Ko | Schéma de workflow reliant un CRM, une boîte mail et un tableau de bord |
| `service-ads` | 1200×1500 | 600 / 1200 | ≤ 140 Ko | Tableau de bord de performances publicitaires en hausse |
| `service-ia` | 1200×1500 | 600 / 1200 | ≤ 140 Ko | Interface d’un agent conversationnel qui qualifie une demande client |
| `service-social` | 1200×1500 | 600 / 1200 | ≤ 140 Ko | Grille de publications Instagram d’une marque |
| `projet-01` | 1600×1200 | 800 / 1600 | ≤ 180 Ko (WebP 1600 px) | Page d’accueil du site e-commerce du projet Atlas |
| `projet-02` | 1600×1200 | 800 / 1600 | ≤ 180 Ko (WebP 1600 px) | Tableau de bord logistique automatisé du projet Borealis |
| `projet-03` | 1600×1200 | 800 / 1600 | ≤ 180 Ko (WebP 1600 px) | Visuels publicitaires de la campagne Cassiopée |
| `projet-04` | 1600×1200 | 800 / 1600 | ≤ 180 Ko (WebP 1600 px) | Grille de contenus social media du projet Draco |
| `projet-05` | 1600×1200 | 800 / 1600 | ≤ 180 Ko (WebP 1600 px) | Agent IA de qualification de leads du projet Eridan |
| `projet-06` | 1600×1200 | 800 / 1600 | ≤ 180 Ko (WebP 1600 px) | Site vitrine animé du projet Fornax |
| `equipe-01` | 900×1200 | 450 / 900 | ≤ 90 Ko | Portrait de Prénom Nom, Fondateur, Stratégie & SEO |
| `equipe-02` | 900×1200 | 450 / 900 | ≤ 90 Ko | Portrait de Prénom Nom, Lead développeuse, Web & IA |
| `equipe-03` | 900×1200 | 450 / 900 | ≤ 90 Ko | Portrait de Prénom Nom, Head of Ads, Acquisition |
| `equipe-04` | 900×1200 | 450 / 900 | ≤ 90 Ko | Portrait de Prénom Nom, Directrice de création, Social |
| `coulisses-01` | 1000×1250 | 500 / 1000 | ≤ 140 Ko | Atelier de stratégie autour d’un grand mur de post-its |
| `coulisses-02` | 1200×800 | 600 / 1200 | ≤ 140 Ko | Écrans de développement avec du code et un prototype |
| `coulisses-03` | 1000×1250 | 500 / 1000 | ≤ 140 Ko | Séance photo produit pour un client |
| `coulisses-04` | 1200×800 | 600 / 1200 | ≤ 140 Ko | Réunion d’équipe autour d’un tableau de bord |
| `coulisses-05` | 1200×800 | 600 / 1200 | ≤ 140 Ko | Tournage d’une vidéo courte pour les réseaux sociaux |
| `coulisses-06` | 1000×1250 | 500 / 1000 | ≤ 140 Ko | Détail d’un carnet de croquis UX |
| `coulisses-07` | 1000×1250 | 500 / 1000 | ≤ 140 Ko | Plan de travail avec maquettes imprimées |
| `coulisses-08` | 1200×800 | 600 / 1200 | ≤ 140 Ko | L’équipe GJS dans les locaux à Paris |

```bash
npx sharp-cli -i projet-01.jpg -o assets/img/projet-01-1600.avif resize 1600 -f avif -q 50
npx sharp-cli -i projet-01.jpg -o assets/img/projet-01-1600.webp resize 1600 -f webp -q 72
# … idem en 800 px
```

### Autres fichiers

| Fichier | Format / dimensions | Rôle |
|---|---|---|
| `assets/img/og-image.jpg` | JPEG 1200×630, ≤ 200 Ko | Partage réseaux sociaux (Open Graph / Twitter) |
| `favicon.svg` | SVG carré | Favicon (le « G » + point signal actuel peut être conservé) |
| `assets/img/icons/apple-touch-icon.png` | PNG 180×180 | iOS |
| `assets/img/icons/icon-192.png`, `icon-512.png` | PNG | Manifeste PWA |
| `assets/img/icons/icon-maskable-512.png` | PNG 512×512, logo dans les 80 % centraux | Icône « maskable » Android |

---

## 6. Textes à remplacer

Recherchez `[À REMPLACER]` dans les fichiers HTML : chaque bloc concerné porte une étiquette rouille bien visible.

| Où | Quoi |
|---|---|
| Accueil — Projets | 6 projets fictifs (« Projet Atlas »… « Projet Fornax ») : nom, client, année, problème, solution, KPI |
| Accueil — Chiffres | 4 statistiques (+140 %, ×3,2, 12 h, 0,9 s) — **à remplacer par des chiffres réels et vérifiables** |
| Accueil — Témoignages | 4 citations, noms et fonctions |
| Offres — Mini-cas | 1 chiffre + contexte par expertise |
| À propos | Équipe (4 portraits, noms, rôles, « en mission sur… », liens LinkedIn), trajectoire 2021-2026, 8 photos des coulisses |
| Contact | Lien de prise de rendez-vous (`CONFIG.BOOKING_URL`), téléphone réel |
| Mentions légales | Dénomination exacte, forme, capital, siège, RCS, SIRET, TVA, directeur de la publication, hébergeur (nom, raison sociale, adresse, téléphone), crédits des visuels, section médiation à garder seulement si vous avez des clients particuliers |
| Confidentialité | DPO (ou « non désigné »), prestataires réels et pays (messagerie, réception du formulaire, rendez-vous, facturation, expert-comptable), garanties de transfert hors UE, durée exacte des journaux de l'hébergeur, mesures de sécurité concrètes |
| Cookies | Outil de mesure d'audience s'il est activé (nom, éditeur, traceurs, durées) |
| Accroche hero | Commentaire `<!-- [À REMPLACER] accroche principale -->` |

Les textes juridiques ont été relus par un contradicteur juridique puis révisés ; faites-les tout de même valider par un professionnel avant la mise en ligne (voir §9).

---

## 7. Configuration (`assets/js/config.js`)

| Clé | Rôle | Valeur par défaut |
|---|---|---|
| `SITE_URL` | Domaine de production | `https://www.gjs-agence.fr` |
| `EMAIL`, `PHONE`, `PHONE_HREF`, `ADDRESS` | Coordonnées, synchronisées sur tous les éléments `[data-config]` | exemples |
| `LOCATION` | Ville, coordonnées, fuseau de l'horloge du footer | Paris, `Europe/Paris` |
| `FORM_ENDPOINT` | URL de réception du formulaire (POST JSON) — vide = repli mailto | `''` |
| `BOOKING_URL` | Lien de rendez-vous | `https://cal.com/` |
| `SOCIALS` | Réseaux `{ label, url }` ; supprimer une ligne masque le lien | LinkedIn, Instagram, TikTok |
| `PROMO_CODE` | Code débloqué par le mode Hyperespace | `HYPERGJS` |
| `AVAILABILITY` | Statut affiché dans le hero et sur Contact | « Disponible pour nouveaux projets » |
| `LOADER` | Durées du loader en secondes (`min` 1,6, `max` 2,6, `short` 0,6 pour les pages suivantes) | |
| `ANALYTICS` | Script de mesure chargé **uniquement après consentement** : `{ src, attrs }` | `null` |
| `CONSENT_VERSION` | À incrémenter quand un traceur est ajouté (le choix est redemandé) | `1` |
| `CONSENT_MAX_AGE_DAYS` | Validité du choix cookies | `182` (6 mois, CNIL) |

**Le contenu doit rester dans le HTML pour le SEO** : après avoir changé l'email, le téléphone, les réseaux ou le domaine dans `CONFIG`, faites aussi un rechercher/remplacer dans les `*.html`, `sitemap.xml` et `robots.txt` (`bonjour@gjs-agence.fr`, `+33 1 00 00 00 00`, `https://www.gjs-agence.fr`).

Exemple de mesure d'audience respectueuse :

```js
ANALYTICS: { src: 'https://plausible.io/js/script.js', attrs: { 'data-domain': 'gjs-agence.fr' } },
```

---

## 8. Connecter le formulaire de contact

Le formulaire envoie un `POST` JSON (`Content-Type: application/json`, `Accept: application/json`) vers `CONFIG.FORM_ENDPOINT`, avec un délai maximal de 12 s. Toute réponse `2xx` affiche l'écran de succès ; sinon un message d'erreur accessible propose de réessayer ou d'écrire par email (les réponses saisies sont conservées).

Données envoyées :

```json
{
  "besoins": ["site", "ia"], "objectif": "leads", "budget": "15-30k", "delai": "1-3-mois",
  "nom": "…", "email": "…", "entreprise": "…", "telephone": "…", "site": "https://…",
  "message": "…", "code": "HYPERGJS", "consentement": true,
  "page": "https://…/contact.html", "date": "2026-10-15T09:30:00.000Z", "_subject": "Nouveau projet — …"
}
```

- **Formspree** : créez un formulaire, copiez l'URL `https://formspree.io/f/xxxxxxx` dans `FORM_ENDPOINT`. Formspree accepte le JSON et utilise `_subject` comme objet du mail.
- **Make** : scénario « Webhooks › Custom webhook », copiez l'URL du webhook, puis enchaînez (email, CRM, Slack…).
- **n8n** : nœud « Webhook » (méthode POST, réponse 200), URL de production dans `FORM_ENDPOINT`. En cas de domaine différent, autorisez l'origine du site (CORS) dans n8n.

Sans endpoint configuré, l'envoi ouvre le client mail du visiteur avec la demande pré-remplie (vers `CONFIG.EMAIL`). Sans JavaScript, le formulaire reste visible en entier et part en `mailto:`.

Protection anti-spam : champ piège `website` (honeypot) — s'il est rempli, rien n'est envoyé. La case d'information RGPD est obligatoire et jamais pré-cochée (ce n'est pas un consentement : le traitement repose sur les mesures précontractuelles, voir la politique de confidentialité).

**Pré-remplissage** : le configurateur de « Nos offres » renvoie vers `contact.html?besoins=site,ia&delai=urgent&objectif=leads` (mêmes délais que le formulaire) ; le mode Hyperespace vers `contact.html?code=HYPERGJS`. Les paramètres reconnus sont `besoins` (liste ou répétés), `objectif`, `delai` (ou l'ancien `horizon`), `code`.

---

## 9. Polices, librairies et RGPD

### Polices

- **League Spartan** (titres) et **Archivo Narrow** (texte), versions variables, sont **auto-hébergées** dans `assets/fonts/` (sous-ensembles latin et latin étendu, licence SIL OFL 1.1 incluse) et préchargées. Aucune police n'est chargée depuis un service tiers.
- Polices de repli (`GJS Display Fallback`, `GJS Text Fallback` dans `tokens.css`) calées sur des mesures réelles pour limiter le décalage pendant le chargement.

### Librairies

Les librairies JS viennent de jsDelivr avec intégrité SRI. L'adresse IP des visiteurs est donc transmise à ce réseau (c'est indiqué dans la politique de confidentialité et la politique cookies). Pour supprimer ce transfert, copiez les fichiers `dist/` des paquets npm `gsap@3.13.0`, `lenis@1.3.26`, `@barba/core@2.10.3` dans `assets/vendor/`, remplacez les URL dans les pages (les empreintes SRI restent valides, les fichiers sont identiques) **et mettez à jour les passages jsDelivr des pages légales**.

### Pages RGPD (toutes reliées dans le footer, colonne « Légal & RGPD »)

| Page | Contenu |
|---|---|
| `mentions-legales.html` | Éditeur, directeur de la publication, hébergeur (art. 1-1 et 19 LCEN), propriété intellectuelle, liens, crédits, médiation (si clientèle de particuliers) |
| `politique-confidentialite.html` | Toutes les informations de l'article 13 du RGPD : responsable, finalités et bases légales, champs obligatoires, destinataires et sous-traitants, transferts hors UE, durées de conservation, droits, sécurité |
| `politique-cookies.html` | Tableau exact des stockages du site, catégories du bandeau, comment accepter / refuser / changer d'avis, réglages des navigateurs, services externes |
| `exercer-vos-droits.html` | Chaque droit expliqué, délais, vérification d'identité, recours CNIL, et un **formulaire qui prépare l'email** de demande (aperçu en direct, rien n'est envoyé par le site ; sans JavaScript il part en `mailto:`) |

Ces textes ont été rédigés puis relus point par point par un contradicteur juridique (RGPD, recommandations CNIL, LCEN) et révisés. Ils restent une base : **faites-les valider par un professionnel avant la mise en ligne** et complétez chaque `[À REMPLACER]` (liste au §6).

Points à vérifier côté client, relevés pendant la relecture : coordonnées complètes de la société et de l'hébergeur, désignation (ou non) d'un DPO, prestataires réels (messagerie, réception du formulaire, prise de rendez-vous, facturation, expert-comptable) et leurs garanties de transfert hors UE, certification Data Privacy Framework de Cloudflare et Fastly (jsDelivr), mesures de sécurité concrètes, crédits des visuels, section médiation à garder ou supprimer, numéro de téléphone réel, liens d'aide des navigateurs (Safari, licence GSAP) à contrôler.

### Bandeau cookies

« Tout refuser », « Personnaliser » et « Tout accepter » ont exactement le même style ; aucun script de mesure avant consentement ; choix conservé 6 mois puis effacé et redemandé (ou dès que `CONSENT_VERSION` change) ; bouton « Gérer les cookies » dans le footer de chaque page et sur la politique cookies. Les seuls stockages actifs par défaut sont fonctionnels (`gjs-consent`, `gjs-visited`, `gjs-arcade-*`) et détaillés dans la politique cookies.

---

## 10. Recette — résultats mesurés (v2)

Tests automatisés (Playwright + Chromium) exécutés pendant la refonte, librairies servies depuis des copies locales identiques aux fichiers CDN épinglés :

| Contrôle | Résultat |
|---|---|
| 9 pages × 5 largeurs (360, 768, 1024, 1440, 1920 px), chargement direct + défilement complet | **0** erreur console, **0** réponse HTTP en erreur, **0** image cassée, **0** débordement horizontal |
| Alignement : bord gauche et droit de chaque titre, texte, carte, image et bloc du footer comparés à ceux du header | **0** élément hors des marges sur les 45 combinaisons (écart mesuré ≤ 1 px, de 360 à 2 560 px dans les recettes de page) |
| Revue contradictoire : 23 vérifications ciblées après corrections (header sur fond sombre, projets, filtres, méthode, témoignages, pause du bandeau, footer, sommaire légal, offres mobile, configurateur → contact) | 22 OK ; le 23e (portraits en noir et blanc dans une fenêtre étroite avec souris) est le comportement voulu, les portraits restent en couleur sur écran tactile |
| axe-core (WCAG 2.2 A/AA + bonnes pratiques), 9 pages à 360 / 390 / 1440 px, mouvement normal et réduit | **0** violation |
| `prefers-reduced-motion` | Textes d'intro visibles sur toutes les pages, pas de parallaxe ni de défilement doux, vidéo en pause, frises remplies, jeux jouables |
| Navigation Barba : 2 tours complets des 9 pages (desktop et mobile, menu mobile inclus) + ouverture/fermeture d'un jeu | Compteurs de ScrollTriggers et de tweens identiques d'un tour à l'autre (pas de fuite), 1 seule feuille de style de page chargée, aucune modale ni verrou de défilement restant, 0 erreur |
| Ancres entre pages (ex. footer → `offres.html#ads`) | Arrivée sur le bloc visé, sous le header |
| Formulaires : contact (79 vérifications : champs requis, erreurs, mailto, POST JSON, échec réseau, pré-remplissage, piège anti-spam) et « Exercer vos droits » | OK |
| Arcade et easter eggs : 3 jeux au clavier et au tactile, pause, fin, record, focus ; Konami, « gjs », console, 7 clics | OK |
| Sans JavaScript / ouverture en `file://` | Page lisible, navigation visible, panneaux d'onglets dépliés, formulaires en `mailto:` ; message d'aide en `file://` |
| Lighthouse desktop (Accueil, Offres, À propos, Contact) | **99-100 / 100 / 100 / 100** — LCP 0,6-0,8 s, TBT 0-10 ms |
| Lighthouse mobile (CPU ×4, 4G lente) | Accueil **94** / 100 / 100 / 100 (LCP 2,9 s : le titre apparaît à la fin de l'intro du loader ; CLS 0,056 pendant l'écran de chargement), Offres **99** / 100 / 100 / 100 (LCP 2,1 s) |

Limites connues : Lighthouse a été lancé en local avec les médias de substitution ; refaites une mesure sur l'hébergement final avec les vrais médias.

---

## 11. Easter eggs (spoilers)

1. **Code Konami** ↑ ↑ ↓ ↓ ← → ← → B A : mode Hyperespace (warp 5 s, vaisseau, typos qui tremblent) puis modale secrète avec le code `HYPERGJS`.
2. Taper **« gjs »** hors d'un champ : le logo du header fait un tonneau avec traînée.
3. **Console** : logo ASCII et invitation à écrire.
4. **7 clics** sur le « GJS » du footer : défi caché — toucher le vaisseau 5 fois en 10 s.
5. Bonus studio : touche **G** (desktop) pour afficher la grille.
