# YUSHO — Boutique Shopify (thème Pitch, brouillon)

Boutique : `yusho-shoes.myshopify.com` · Devise EUR · France
Thème de travail : **Pitch** (rôle `UNPUBLISHED` / brouillon) — `gid://shopify/OnlineStoreTheme/200319729996`

Ce dossier contient une **sauvegarde des templates** personnalisés poussés dans le thème Pitch
via l'API Admin Shopify (`themeFilesUpsert`). Ils sont mobile-first et utilisent l'architecture
à blocs de Pitch.

## Ce qui a été fait (via API)

### Thème Pitch (brouillon)
- **`templates/index.json`** — Page d'accueil refondue :
  - **Hero plein écran « yusho »** (`section_height: full-screen`), configuré pour une **vidéo**
    de fond (`media_type_1: video`), color scheme sombre `scheme-5` + overlay pour la lisibilité,
    cliquable vers `/collections/all`.
  - Section **Concept** (« Une base, mille styles »).
  - Carrousel **Catalogue** (collection `all`) avec image en ratio **`adapt`** (photos non rognées),
    carrousel sur mobile.
- **`templates/collection.json`** — Page **Produits** (`/collections/all`) :
  - **Filtres activés** (`enable_filtering: true`) + tri + densité de grille (déjà fournis par Pitch).
  - Cartes produit en ratio **`adapt`** (non rognées) + pastilles de couleur (swatches).
- **`templates/page.contact.json`** — Page **Contact** : formulaire Shopify natif (`contact-form`),
  bouton d'envoi traduit en **« Envoyer »**.

### Contenu / réglages boutique
- **Stock illimité** : les 33 produits actifs (117 variantes) passés en **non-suivi de stock**
  → toujours achetables, aucune rupture possible.
- **Page « À propos »** (`/pages/a-propos`) : contenu éditorial YUSHO rédigé et publié.
- **Page « Contact »** (`/pages/contact`) : texte d'introduction ajouté, publiée.
- **Menu principal** : `Accueil · Produits · À propos · Contact`.

## Étapes manuelles restantes (non automatisables par l'API)

1. **Vidéo du hero** — aucune vidéo n'est encore uploadée dans la boutique.
   Dans l'éditeur de thème (Pitch → section *Hero*), déposer le fichier vidéo dans le slot
   « Media 1 ». (Ou fournir une URL de vidéo et je l'attache via l'API.)
   Tant qu'aucune vidéo n'est ajoutée, le hero affiche le fond brun YUSHO + le titre.

2. **Moyens de paiement** — non activables par l'API (sécurité Shopify).
   Admin → **Réglages → Paiements** :
   - Activer **Shopify Payments** (CB/Apple Pay/Google Pay) — nécessite les infos légales/bancaires,
   - et/ou ajouter **PayPal**, **Klarna**, etc.

3. **Publication du thème** — Pitch reste en **brouillon** (la publication est volontairement
   bloquée par l'API). Quand tout est validé : Boutique en ligne → Thèmes → *Publier*.

4. *(Optionnel)* **Filtres avancés** — via l'app **Search & Discovery**, ajouter des filtres par
   tag (usage : Sneakers/Ville/Skate ; couleur) en plus des filtres par défaut
   (disponibilité, prix, type, pointure).

## Mise à jour — Identité visuelle & promo (v2)

### Identité couleur (sneaker : jaune chaud + verts)
- `config/settings_data.json` : 7 color schemes refondus.
  - Jaune `#FFC83D`, vert `#1E7A46`, vert foncé `#0E4D2C`, vert pastel `#BFE6C3`, vert nuit `#072B1A`.
  - Boutons jaunes à texte vert, cartes arrondies (rayon 16), pastilles pill.
  - scheme-4 = bandeau jaune ; scheme-5 = hero vert nuit + titre jaune ; scheme-3 = badges promo.
- **Logo** : `assets/yusho-logo.svg` (wordmark YUSHO jaune, contour vert) téléversé dans Files et défini comme logo du thème (`logo: shopify://shop_images/yusho-logo.svg`).

### Page d'accueil (v2)
- **Bandeau promo** jaune (scheme-4) : « Bienvenue chez YUSHO — -20% avec le code YUSHO20 ».
- **Hero vidéo plein écran** en custom-liquid : vidéo desktop (`format_pc`) + mobile (`format_mobile`) avec bascule CSS, overlay, titre **YUSHO** en majuscules jaune, CTA.
- **Segmentation** : Les Bases · Revêtements Sneakers · Revêtements Ville · Revêtements Skate (carrousels, photos non rognées).

### Promotion
- Code **YUSHO20** = -20%, tous clients, actif (créé via l'API).

### Notes
- Le réglage natif `video` de la section hero n'accepte pas de référence via l'API → hero vidéo réalisé en custom-liquid (URLs CDN des sources). 100% fonctionnel.
- `templates/page.vtest.json` : fichier de test inerte resté sur le thème (suppression bloquée par l'API) — sans impact, supprimable à la main dans l'éditeur de code.
