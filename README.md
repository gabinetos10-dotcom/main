# GJS — Site de l'agence (marketing digital & communication)

Site statique complet, sans build : HTML5 sémantique, CSS (custom properties, aucun framework), JavaScript en modules ES natifs.
Librairies épinglées via CDN (avec empreintes SRI) : **GSAP 3.13.0** (ScrollTrigger, SplitText, Flip, CustomEase), **Lenis 1.3.26**, **Barba.js 2.10.3**. Mini-jeux en **Canvas 2D** natif.

> Les seuls contenus provisoires sont les **médias** (images, vidéo) et les **textes signalés `[À REMPLACER]`** (commentaires HTML et petites étiquettes « … d'exemple » dans les pages). Rien d'autre n'est un placeholder.
>
> **Version actuelle : v3 « orbite cyan »** (17 octobre 2026), refonte de la v1 selon les 8 demandes du client (voir §4). La v2 (palette chaude, robots), refusée, reste consultable dans l'historique git (commit `20efa8b`).

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

Le fichier `serve.json` règle `serve` pour ce site :
- les adresses gardent leur `.html` (`offres.html`, `contact.html`…), comme en production ;
- l'accueil est servi à la racine, http://localhost:3000 ;
- un dossier sans page affiche la page 404 du site, et non une liste de fichiers ;
- le navigateur revérifie chaque fichier : après une mise à jour, il ne garde pas l'ancienne version en cache.

### C. Avec VS Code

Installez l'extension **Live Server**, ouvrez le dossier du site, clic droit sur `index.html` › « Open with Live Server ».

### D. En ligne, sans rien installer

- **Netlify Drop** : glissez le dossier du site sur https://app.netlify.com/drop → une URL publique est générée en quelques secondes.
- **GitHub Pages** (dépôt public, ou offre payante pour un dépôt privé) : dans le dépôt, Settings › Pages › Source « Deploy from a branch », branche `claude/eager-gauss-qymcxp`, dossier `/ (root)`. Le site sera servi sous `https://<compte>.github.io/main/` : tout fonctionne, sauf la page 404 personnalisée qui attend la racine d'un domaine (voir ci-dessous).

### L'accueil ne s'affiche pas ?

- **Une liste de fichiers (« Index of… ») s'affiche à la place de l'accueil** : vous avez une copie antérieure au 17 octobre 2026. Son `serve.json` empêchait `serve` d'ouvrir l'accueil à la racine. Téléchargez la version à jour, ou ouvrez directement http://localhost:3000/index.html.
- **Le site ressemble encore à l'ancienne version** : rechargez la page sans le cache (Ctrl+F5 sous Windows, Cmd+Maj+R sur Mac).

### Toujours peu d'animations ?

- **Réglage « réduire les animations » du système** (Windows 11 : Paramètres › Accessibilité › Effets visuels › Effets d'animation ; Windows 10 : Paramètres › Options d'ergonomie › Affichage › Afficher les animations dans Windows ; macOS : Réglages › Accessibilité › Affichage › Réduire les animations). Le site le respecte volontairement : scroll natif, fondus simples, loader court, vidéo en pause. Réactivez les animations du système pour voir la version complète.
- **Réseau filtré ou bloqueur de contenu** empêchant jsDelivr : le site bascule alors aussitôt en version statique (message dans la console). Testez sur une autre connexion ou auto-hébergez les librairies (§9).

Une connexion internet est nécessaire pour les librairies d'animation (jsDelivr). Les polices, images et vidéos sont hébergées avec le site (§9 pour auto-héberger aussi les librairies).

La page `404.html` utilise des chemins absolus (`/assets/…`) : elle doit être servie à la racine du domaine (comportement par défaut de Netlify, Vercel, `serve`, Apache avec `ErrorDocument 404 /404.html`, etc.).

---

## 2. Direction artistique v3 « orbite cyan »

1. **Univers de la v1 conservé** : nuit spatiale, vaisseau GJS en fil rouge (loader, transitions, trajectoire de la méthode, 404, easter eggs), grain discret.
2. **Palette plus marquante** : nuit `#050A1A` / nuit profonde `#02050E`, **cyan `#55D5E0`** (CTA, accents, états actifs, halos), glace `#EAF2F3` pour les sections claires, bleu électrique `#4C7DFF` en dégradés. Sur fond clair, l'accent texte passe en cyan profond `#0B6E78` (contraste AA mesuré) ; un bloc par page peut être entièrement cyan.
3. **Typographies** : titres en **Bebas Neue** (capitales hautes et serrées), texte en **Archivo Narrow** ; libellés en Archivo Narrow 700 capitales espacées. Plus d'italique serif ni de police mono.
4. **Grille unique** : un seul conteneur (1 360 px utiles, marges 20 → 80 px) partagé par le header, toutes les sections et le footer ; grille 12 / 6 / 4 colonnes ; mêmes en-têtes de section partout (sur-titre, titre sur 8 colonnes, texte d'appui sur 4).
5. **Information allégée** : un seul sur-titre par section, plus de libellés techniques en série, cartes de même taille, aucune rotation ni décalage en escalier.
6. **Mouvement, zoom, transitions** au survol, au focus, au clic et au défilement — **jamais au pointeur** : pages qui reculent puis se posent en zoom, rideau + vaisseau entre les pages, sections qui arrivent en carte et s'agrandissent, images qui dézooment, cartes empilées, compteurs, frises qui se remplissent, libellés de boutons qui « roulent ». Tout est coupé en `prefers-reduced-motion`.
7. **Header en capsule** de verre sombre : logo GJS avec orbite animée, pastille cyan qui glisse d'un lien à l'autre, progression de lecture, CTA cyan, menu plein écran qui s'ouvre en cercle.
8. **Footer compact** : GJS en grand, promesse + CTA à gauche, quatre colonnes claires à droite (Navigation, Expertises, Légal & RGPD, Contact), barre de bas de page.

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
               core/  loader · transitions (rideau + zoom des pages) · scroll · splitText · marquee
                      menu (header, pastille, menu plein écran) · cookies · reveal (révélations, zoom, thèmes)
                      scope (anti-fuite) · head (sync <head>) · footer · cta · accordion · grid (touche G) · utils
               pages/ home · offres · about · contact · legal · error   (chargés à la demande)
               games/ arcade (coque) · button-game · race-game · maze-game · ship-hunt · utils
/assets/img/   placeholders AVIF + WebP (srcset), og-image.jpg, icons/
/assets/video/ hero.mp4 · hero.webm · hero-poster.jpg
/assets/fonts/ Bebas Neue + Archivo Narrow (OFL, auto-hébergées)
```

### Cycle de vie des pages

Chaque module de `pages/` exporte `{ init(scope, container), intro(scope, container, tl), destroy() }`.
`main.js` crée un **scope** par page (`core/scope.js`) qui regroupe un `gsap.context`, un `gsap.matchMedia`, les écouteurs, observers, intervalles et boucles : tout est détruit d'un appel à la sortie de page (hook Barba `afterLeave`). Vérifié : après 10 navigations Barba, le nombre de ScrollTriggers et de tweens actifs revient exactement à la même valeur pour chaque page.

### Attributs pilotant les animations (sans JS spécifique)

| Attribut | Effet |
|---|---|
| `data-split="lines\|chars"` | Titre révélé ligne par ligne derrière un masque (SplitText, lisible par les lecteurs d'écran) |
| `data-reveal="fade\|stagger\|image\|line\|zoom\|rise"` | Fondu, cascade, image (rideau + dézoom), trait, zoom avant, montée avec léger zoom (`data-reveal-items` pour une cascade de cartes) |
| `data-intro` + `data-delay` | Joué à l'entrée de page (après loader / rideau) au lieu du défilement |
| `data-zoom-scroll="1.2"` | L'image d'un `.media` dézoome en continu pendant le défilement |
| `data-enter="zoom"` | La section arrive en carte arrondie et s'agrandit jusqu'à pleine largeur |
| `data-parallax="0.15"` | Parallaxe au défilement (profondeur, négatif = sens inverse) |
| `data-counter="140"` (+ `data-prefix`, `data-suffix`, `data-decimals`) | Compteur animé |
| `data-theme="night\|deep\|ice\|cyan"` | Fond et couleurs de la section (et couleur de la barre du navigateur) |
| `data-marquee` (+ `data-speed`, `data-direction`) | Bandeau défilant réactif à la vitesse du défilement, avec bouton pause |
| `data-launch-game="button\|race\|maze"` | Ouvre un jeu de l'Arcade |
| `data-config="email\|phone\|booking\|availability"`, `data-social="LinkedIn"` | Synchronisé avec `CONFIG` |

Classes d'interaction au survol / focus (CSS) : `.card--hover` (élévation + liseré cyan), `.media--zoom` (zoom de l'image), `.media--shine` (reflet), `.btn` (aplat qui monte, flèche qui avance, libellé qui roule), `.arrow-link`.

---

## 4. Historique

**v1** (15 octobre 2026) — site complet selon le brief : loader vaisseau, hero vidéo, menu plein écran, transitions Barba, 3 pages + 2 pages légales + 404, Arcade (3 jeux), 4 easter eggs, bandeau cookies, SEO, accessibilité, performance. Puis lanceurs locaux et message d'aide en `file://`.

**v2** (16-17 octobre 2026) — refonte « espace chaud & robots », **refusée par le client**. Conservée dans l'historique git (commit `20efa8b`).

**v3 « orbite cyan »** (17 octobre 2026) — repart de la v1 (commit `1b3ee42` et lanceurs) ; chaque demande et sa réponse :

| Demande du client | Réponse |
|---|---|
| Information moins brouillon ; éléments pas à la même marge, déséquilibres | Un seul conteneur et une seule grille pour tout le site (header, sections, footer : mêmes bords, écart mesuré ≤ 1,5 px de 360 à 1 920 px) ; en-têtes de section identiques partout ; un sur-titre par section ; plus de libellés techniques en série ; cartes et images de même taille ; plus aucune rotation, aucun décalage en escalier |
| Renforcer l'interaction (mouvements, zoom, transitions) | Pages qui reculent et se posent en zoom, rideau + vaisseau entre les pages, sections qui arrivent en carte et s'agrandissent, images qui dézooment, leviers en cartes empilées qui reculent, panneau projet qui s'ouvre en zoom depuis la vignette, compteurs, frise de méthode parcourue par le vaisseau, menu qui s'ouvre en cercle, pastille du header, boutons dont le libellé roule, cartes qui s'élèvent, reflets et zooms au survol |
| Palette plus marquante, bleu plus clair type `#55D5E0` | Nuit + **cyan `#55D5E0`** + glace ; un bloc entièrement cyan par page ; images recolorées (les bleus deviennent cyan), nouvelle vidéo hero et image de partage, favicon et icônes |
| Enlever l'effet sur le curseur | Curseur personnalisé supprimé, ainsi que tout ce qui suivait la souris (boutons aimantés, titre CTA, aperçu du menu) : les mouvements naissent du survol, du clic et du défilement |
| Titres type Bebas Neue, texte type Archivo Narrow | Bebas Neue et Archivo Narrow, auto-hébergées et préchargées, avec polices de repli calées sur leurs métriques |
| Header plus design et stylé | Capsule de verre sombre alignée sur le contenu : logo GJS + orbite animée, pastille cyan qui glisse d'un lien à l'autre, fil de progression de lecture, CTA cyan, bouton menu animé |
| Footer moins gros, plus compréhensible, GJS impactant | GJS en très grand (cyan, orbite, lettres qui montent), promesse + CTA, quatre colonnes nommées (Navigation, Expertises, Légal & RGPD, Contact) sur une seule rangée, barre de bas de page ; hauteur mesurée ramenée de 924 à 550 px sur ordinateur (1 440 px de large) et de 1 329 à 960 px sur mobile |
| Rédiger les pages RGPD et les intégrer au footer | Mentions légales, Politique de confidentialité, Politique de cookies, Exercer vos droits (formulaire) : colonne « Légal & RGPD » du footer + bouton « Gérer les cookies », liens depuis le bandeau cookies et le menu |

**Correctif du 17 octobre 2026 (accueil sous `npx serve .`)** — http://localhost:3000 affichait une liste de fichiers au lieu de l'accueil : `serve.json` désactivait, avec les clean URLs, la recherche de `index.html` à la racine. Corrigé (réécriture `/` → `/index.html`, listes de dossiers désactivées, revalidation du cache) ; le site reconnaît aussi `/` comme l'accueil.

---

## 5. Médias à remplacer

Toutes les images sont servies en `<picture>` : **AVIF** puis **WebP**, avec `srcset` et `width`/`height`. Pour chaque base ci-dessous, fournir un fichier par largeur et par format, nommé `base-LARGEUR.avif` / `base-LARGEUR.webp` (ou `base.avif` / `base.webp` quand une seule largeur est listée). Les visuels actuels sont des compositions génératives marquées `[À REMPLACER]` (petite légende dans l'image), recolorées dans la palette v3. La vidéo hero (planète annelée bleu-cyan, 12 s en boucle) a été régénérée pour la v3, sans légende incrustée.

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

Le bouton « Son » bascule `muted` : il n'a d'effet que si votre vidéo contient une piste audio.

### Images

| Fichier (base) | Dimensions natives | Largeurs générées | Poids cible (par fichier WebP le plus large) | Contenu attendu |
|---|---|---|---|---|
| `service-site` | 1200×1500 | 600 / 1200 | ≤ 140 Ko | Maquettes d’un site web responsive affichées sur ordinateur et mobile |
| `service-automatisation` | 1200×1500 | 600 / 1200 | ≤ 140 Ko | Schéma de workflow reliant un CRM, une boîte mail et un tableau de bord |
| `service-ads` | 1200×1500 | 600 / 1200 | ≤ 140 Ko | Tableau de bord de performances publicitaires en hausse |
| `service-ia` | 1200×1500 | 600 / 1200 | ≤ 140 Ko | Interface d’un agent conversationnel qui qualifie une demande client |
| `service-social` | 1200×1500 | 600 / 1200 | ≤ 140 Ko | Grille de publications Instagram d’une marque |
| `projet-01` | 1600×2000 | 800 / 1600 | ≤ 180 Ko (WebP 1600 px) | Page d’accueil du site e-commerce du projet Atlas |
| `projet-02` | 1600×1067 | 800 / 1600 | ≤ 180 Ko (WebP 1600 px) | Tableau de bord logistique automatisé du projet Borealis |
| `projet-03` | 1200×1500 | 800 / 1200 | ≤ 140 Ko | Visuels publicitaires de la campagne Cassiopée |
| `projet-04` | 1600×1200 | 800 / 1600 | ≤ 180 Ko (WebP 1600 px) | Grille de contenus social media du projet Draco |
| `projet-05` | 1600×1067 | 800 / 1600 | ≤ 180 Ko (WebP 1600 px) | Agent IA de qualification de leads du projet Eridan |
| `projet-06` | 1200×1600 | 800 / 1200 | ≤ 140 Ko | Site vitrine animé du projet Fornax |
| `manifeste-01` | 480×480 | 480 | ≤ 60 Ko |  |
| `manifeste-02` | 480×480 | 480 | ≤ 60 Ko |  |
| `manifeste-03` | 480×480 | 480 | ≤ 60 Ko |  |
| `offres-surmesure` | 1200×1500 | 600 / 1200 | ≤ 140 Ko | Atelier de cadrage : post-its, schémas et maquettes sur une table |
| `equipe-01` | 900×1200 | 450 / 900 | ≤ 90 Ko | Portrait de Prénom Nom, Fondateur — Stratégie & SEO |
| `equipe-02` | 900×1200 | 450 / 900 | ≤ 90 Ko | Portrait de Prénom Nom, Lead développeuse — Web & IA |
| `equipe-03` | 900×1200 | 450 / 900 | ≤ 90 Ko | Portrait de Prénom Nom, Head of Ads — Acquisition |
| `equipe-04` | 900×1200 | 450 / 900 | ≤ 90 Ko | Portrait de Prénom Nom, Directrice de création — Social |
| `coulisses-01` | 1000×1250 | 500 / 1000 | ≤ 90 Ko | Atelier de stratégie autour d’un grand mur de post-its |
| `coulisses-02` | 1200×800 | 600 / 1200 | ≤ 140 Ko | Écrans de développement avec du code et un prototype |
| `coulisses-03` | 1000×1250 | 500 / 1000 | ≤ 90 Ko | Séance photo produit pour un client |
| `coulisses-04` | 1200×800 | 600 / 1200 | ≤ 140 Ko | Réunion d’équipe autour d’un tableau de bord |
| `coulisses-05` | 1200×800 | 600 / 1200 | ≤ 140 Ko | Tournage d’une vidéo courte pour les réseaux sociaux |
| `coulisses-06` | 1000×1250 | 500 / 1000 | ≤ 90 Ko | Détail d’un carnet de croquis UX |
| `coulisses-07` | 1000×1250 | 500 / 1000 | ≤ 90 Ko | Plan de travail avec maquettes imprimées |
| `coulisses-08` | 1200×800 | 600 / 1200 | ≤ 140 Ko | L’équipe GJS dans les locaux à Paris |
| `about-01` | 900×1200 | 450 / 900 | ≤ 90 Ko |  |
| `about-02` | 900×1200 | 450 / 900 | ≤ 90 Ko |  |
| `menu-accueil` | 640×800 | 640 | ≤ 60 Ko | Aperçu menu — accueil |
| `menu-offres` | 640×800 | 640 | ≤ 60 Ko | Aperçu menu — offres |
| `menu-a-propos` | 640×800 | 640 | ≤ 60 Ko | Aperçu menu — a-propos |
| `menu-contact` | 640×800 | 640 | ≤ 60 Ko | Aperçu menu — contact |
| `menu-arcade` | 640×800 | 640 | ≤ 60 Ko | Aperçu menu — arcade |
Commande type pour produire les deux formats aux bonnes largeurs (exemple avec [sharp-cli](https://www.npmjs.com/package/sharp-cli)) :

```bash
npx sharp-cli -i projet-01.jpg -o assets/img/projet-01-1600.avif resize 1600 -f avif -q 50
npx sharp-cli -i projet-01.jpg -o assets/img/projet-01-1600.webp resize 1600 -f webp -q 72
# … idem en 800 px
```

### Autres fichiers

| Fichier | Format / dimensions | Rôle |
|---|---|---|
| `assets/img/og-image.jpg` | JPEG 1200×630, ≤ 200 Ko | Partage réseaux sociaux (Open Graph / Twitter) |
| `favicon.svg` | SVG carré | Favicon (le « G » + point cyan actuel peut être conservé) |
| `assets/img/icons/apple-touch-icon.png` | PNG 180×180 | iOS |
| `assets/img/icons/icon-192.png`, `icon-512.png` | PNG | Manifeste PWA |
| `assets/img/icons/icon-maskable-512.png` | PNG 512×512, logo dans les 80 % centraux | Icône « maskable » Android |

---

## 6. Textes à remplacer

Recherchez `[À REMPLACER]` dans les fichiers HTML : chaque bloc concerné porte une étiquette visible.

| Où | Quoi |
|---|---|
| Accueil — Projets | 6 projets fictifs (« Projet Atlas »… « Projet Fornax ») : nom, client, année, problème, solution, KPI |
| Accueil — Chiffres | 4 statistiques (+140 %, ×3,2, 12 h, 0,9 s) — **à remplacer par des chiffres réels et vérifiables** |
| Accueil — Témoignages | 4 citations, noms et fonctions |
| Offres — Mini-cas | 1 chiffre + contexte par expertise |
| À propos | Équipe (4 portraits), trajectoire 2021-2026, coulisses, « Paris, depuis 2022 » |
| Contact | Lien de prise de rendez-vous (`CONFIG.BOOKING_URL`) |
| Mentions légales | Raison sociale, forme, capital, adresse, RCS, SIRET, TVA, directeur de publication, hébergeur, crédits photo |
| Confidentialité | Coordonnées du responsable, DPO, sous-traitants (hébergeur, formulaire, mesure d'audience), date de mise à jour |
| Accroche hero | Commentaire `<!-- [À REMPLACER] accroche principale -->` (texte du brief) |

Les textes juridiques sont une base structurée conforme au RGPD et aux recommandations CNIL ; faites-les valider avant mise en ligne.

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
| `LOADER` | Durées du loader (`min` 1,6 s, `max` 2,6 s, `short` 0,6 s) | |
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

Protection anti-spam : champ piège `website` (honeypot) — s'il est rempli, rien n'est envoyé. Le consentement RGPD est obligatoire et jamais pré-coché.

**Pré-remplissage** : le configurateur de « Nos offres » renvoie vers `contact.html?besoins=site,ia&horizon=urgent&objectif=leads` ; le mode Hyperespace vers `contact.html?code=HYPERGJS`. Les paramètres reconnus sont `besoins` (liste ou répétés), `objectif`, `horizon` / `delai`, `code`.

---

## 9. Polices, librairies et RGPD

- **Bebas Neue** (titres) et **Archivo Narrow** (texte, variable 400-700) sont auto-hébergées en WOFF2 (sous-ensembles latin et latin étendu, licence SIL OFL incluse dans `assets/fonts/`) et préchargées. Aucune police n'est chargée depuis un service tiers.
- Les librairies JS viennent de jsDelivr avec intégrité SRI. Pour les auto-héberger, copiez les fichiers `dist/` des paquets npm `gsap@3.13.0`, `lenis@1.3.26`, `@barba/core@2.10.3` et remplacez les URL (les empreintes SRI restent valides, les fichiers sont identiques).
- **Pages RGPD** (toutes reliées dans le footer, colonne « Légal & RGPD ») : `mentions-legales.html`, `politique-confidentialite.html`, `politique-cookies.html`, `exercer-vos-droits.html` (formulaire qui prépare un email pré-rempli vers `CONFIG.EMAIL`, rien n'est envoyé par le site).
- **Bandeau cookies** sur-mesure : « Tout refuser », « Personnaliser » et « Tout accepter » ont le même poids visuel ; aucun script de mesure avant consentement ; choix conservé 6 mois puis effacé et redemandé ; bouton « Gérer les cookies » dans le footer. Les seuls stockages actifs par défaut sont fonctionnels (`gjs-consent`, `gjs-visited`, `gjs-arcade-*`) et listés dans la politique de cookies.

---

## 10. Recette — résultats mesurés

Tests automatisés (Playwright + Chromium) exécutés pendant le développement, librairies servies depuis des copies locales identiques aux fichiers CDN épinglés :

| Contrôle | Résultat |
|---|---|
| Erreurs console sur les 7 pages (chargement direct + défilement complet) | **0** |
| Loader complet (1re visite) / court (visites suivantes) / réduit | OK, « Passer l'intro » au clavier, annonce `aria-live`, scroll bloqué |
| Transitions Barba, titre et focus mis à jour, CSS de page chargée à la volée | OK |
| 10 navigations Barba consécutives | ScrollTriggers et tweens actifs identiques à chaque retour sur une page (pas de fuite) |
| Configurateur → Contact pré-rempli ; validation, erreurs accessibles, succès | OK |
| Arcade : 3 jeux jouables (clavier + pad tactile / balayage), pause, fin, record, CTA | OK |
| Easter eggs : Konami, « gjs », console, 7 clics footer | OK |
| `prefers-reduced-motion` | Lenis, parallaxe, distorsions coupés ; vidéo en pause ; loader ≈ 1 s ; fondus simples |
| Clavier : skip link, ordre de tabulation, focus piégé (menu, modales, jeux), Échap | OK |
| axe-core (WCAG 2.2 A/AA + bonnes pratiques) | 0 violation sur 6 pages ; sur l'accueil, seuls les mots du manifeste à 15 % d'opacité avant leur révélation au scroll (effet demandé, désactivé en mouvement réduit) |
| Lighthouse desktop (Accueil, Offres, À propos, Contact, Mentions) | **100 / 100 / 100 / 100** — LCP 0,5-0,6 s, CLS 0, TBT 0 ms |
| Lighthouse mobile (Accueil, CPU ×4, 4G lente) | 98 / 100 / 100 / 100 — LCP 2,3 s, CLS 0 |
| Rendu 360 → 2560 px, paysage mobile | Captures à 360, 390, 768, 1024, 1440, 2560 px et 844×390 (paysage) : aucun débordement horizontal, aucune erreur ; grilles 12/6/4, typographie géante conservée |

Limites connues de ces mesures : les polices Fontshare n'étaient pas joignables dans l'environnement de test (rendu avec la police de repli) et Lighthouse a été lancé en local ; refaites une mesure sur l'hébergement final avec les vrais médias.

---

## 11. Easter eggs (spoilers)

1. **Code Konami** ↑ ↑ ↓ ↓ ← → ← → B A : mode Hyperespace (warp 5 s, vaisseau, typos qui tremblent) puis modale secrète avec le code `HYPERGJS`.
2. Taper **« gjs »** hors d'un champ : le logo du header fait un tonneau avec traînée.
3. **Console** : logo ASCII et invitation à écrire.
4. **7 clics** sur le « GJS » géant du footer : défi caché — toucher le vaisseau 5 fois en 10 s.
5. Bonus studio : touche **G** (desktop) pour afficher la grille.
