# Loc'N'Joy — Location premium à Paris

Site vitrine + système de réservation pour l'agence de location de
voitures sportives et premium **Loc'N'Joy** (Paris).

Dark mode par défaut, direction artistique noir/rouge « nuit parisienne »,
animations Framer Motion (preloader, parallax, magnetic hover, text reveals).

## Stack

- **Next.js 15** (App Router) + React 19 + TypeScript
- **Tailwind CSS** — design system noir / rouge, mobile-first
- **Framer Motion** — preloader, transitions, micro-interactions
- **Prisma + SQLite** (bascule PostgreSQL en 2 lignes) — véhicules, réservations, messages
- **date-fns** — calendrier de disponibilité custom

## Démarrage

```bash
cp .env.example .env
npm install
npx prisma db push      # crée la base SQLite + tables
npm run dev             # http://localhost:3000
```

La flotte se seed automatiquement au premier chargement
(ou manuellement : `npm run db:seed`).

## Fonctionnalités

- **Preloader** : silhouette de sportive dessinée en rouge sur fond noir
- **One-page** : Hero parallax → Qui sommes-nous → Flotte (slider swipeable
  mobile / grille desktop) → Réservation → Contact → Footer
- **Réservation** : choix du véhicule, calendrier avec **dates déjà réservées
  grisées et non sélectionnables**, heures de départ/retour, total estimé,
  contrôle de chevauchement côté serveur (HTTP 409 en cas de conflit)
- **Contact** : Prénom, Nom, Email, Snapchat, Message + grille d'icônes
  cliquables (Instagram, Email, Téléphone, Snapchat)
- **Admin `/admin`** : protégé par mot de passe (`ADMIN_PASSWORD`, défaut
  `locnjoy-admin`), vues **Liste / Calendrier / Messages**, approbation et
  annulation des réservations
- **Pages légales** : mentions légales, politique de confidentialité, CGV
  (placeholders `[À compléter]` à renseigner)

## Structure de la base

| Modèle | Rôle |
|---|---|
| `Vehicle` | fiche véhicule (marque, catégorie, prix/jour, perfs, image) |
| `Booking` | réservation (client, dates + heures, statut PENDING / CONFIRMED / CANCELLED) |
| `ContactMessage` | messages du formulaire de contact |

Une annulation (`CANCELLED`) libère automatiquement les dates dans le
calendrier public.

## Passer en production

1. `prisma/schema.prisma` : `provider = "postgresql"` et `DATABASE_URL`
   vers votre base (Supabase, Neon…)
2. Définir un `ADMIN_PASSWORD` fort
3. Remplacer les silhouettes SVG de `public/cars/` par de vraies photos
   détourées des véhicules
4. Compléter les pages légales et les coordonnées réelles (téléphone,
   Instagram, Snapchat) dans `components/Contact.tsx` et `components/Footer.tsx`
