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
