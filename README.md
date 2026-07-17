# GJS — Site vitrine

Site signature de **GJS**, agence de développement web française : création de sites, automatisation, scraping & données, conseil.

Expérience single-page scrollytelling : préloader « `gjs build` » branché sur le vrai chargement, scène 3D « flux de données » réactive au curseur et au scroll, curseur custom magnétique, menu plein écran immersif, 3 mini-jeux, terminal secret, footer Mindaro contrastant — le tout mobile-first, accessible et conforme RGPD.

---

## Stack

| Rôle | Outil |
|---|---|
| Framework | **Next.js 15** (App Router) + **TypeScript** |
| Styles | **Tailwind CSS v4** (tokens custom dans `styles/globals.css`) |
| 3D / WebGL | **React Three Fiber** + **three.js** (shaders custom) |
| Orchestration scroll & texte | **GSAP 3.13** (ScrollTrigger, SplitText, CustomEase — tous gratuits) |
| Smooth scroll | **Lenis**, synchronisé avec ScrollTrigger via le ticker GSAP |
| Micro-interactions | **Framer Motion** |
| Polices | **Clash Display**, **Satoshi** (Fontshare), **JetBrains Mono** — auto-hébergées, zéro requête tierce |

> **Substitution documentée** : le brief prévoyait `@react-three/postprocessing` pour un bloom léger. Le glow lime est obtenu ici par **blending additif + sprites doux dans le shader** (même rendu perçu, coût GPU quasi nul, une dépendance en moins). Si vous voulez un vrai bloom, ajoutez `@react-three/postprocessing` et un `<EffectComposer>` dans `components/three/Scene.tsx`.

## Démarrage

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # build de production
npm start        # sert le build
```

Variable d'environnement optionnelle : `NEXT_PUBLIC_SITE_URL` (URL canonique, utilisée par le SEO/sitemap — défaut `https://www.gjs-agence.fr`).

## Structure

```
app/                    routes (home, mentions légales, confidentialité, API contact, SEO)
components/
  layout/               Header, menu plein écran, Footer, Preloader, curseur, HUD, cookies
  sections/             Hero, Expertise, Services, Réalisations, Équipe, Contact
  three/                scène R3F « flux de données » + orchestrateur de fallbacks
  games/                Data Catcher, Chaîne de réaction, Ship It + modale
  terminal/             terminal secret, commandes, déclencheurs d'easter eggs
  fx/                   aurore CSS, marquees, pluie Matrix
  ui/                   boutons magnétiques, reveals GSAP, compteurs…
  providers/            état global, Lenis + ScrollTrigger, contextes
lib/                    design tokens partagés, contenu éditorial, GSAP, consentement
hooks/                  media queries, ancres fluides
styles/globals.css      tokens Tailwind v4 (palette, typo, easings, animations)
public/fonts/           polices variables auto-hébergées + licences
```

### Où éditer le contenu ?

**Tout le copywriting vit dans `lib/content.ts`** : navigation, hero, services, chiffres, études de cas, équipe, contact, footer. Les pages légales sont dans `app/mentions-legales` et `app/politique-de-confidentialite`. Les réponses du terminal sont dans `components/terminal/commands.ts`.

## 🥚 Easter eggs (documentés, comme promis)

| Déclencheur | Effet |
|---|---|
| Taper les lettres **`g` `j` `s`** n'importe où (hors champs de saisie) | Ouvre le **terminal secret** |
| **Code Konami** `↑ ↑ ↓ ↓ ← → ← → B A` | **Pluie de données Matrix** aux couleurs GJS (12 s) + terminal |
| **5 clics rapides sur le logo** GJS | Ouvre le terminal |

Commandes du terminal : `help`, `about`, `services`, `projets`, `stack`, `play data|flow|ship` (lance les mini-jeux), `matrix`, `contact`, `hire`, `whoami`, `sudo`, `coffee`, `ls`, `cat secrets`, `clear`, `exit`… et quelques autres non documentées.

## 🎮 Mini-jeux

Chaque service a sa démo jouable (boutons ▶ dans la section Services, ou `play` dans le terminal) :

- **Data Catcher** (scraping) — attrapez les données propres, évitez le bruit. Combo ×5, 35 s.
- **Chaîne de réaction** (automatisation) — câblez le workflow dans l'ordre, regardez la cascade s'exécuter. 3 manches.
- **Ship It** (création web / conseil) — empilez les blocs d'interface au pixel près, déployez, score façon Lighthouse.

Tous jouables au tactile, cohérents avec la palette, avec un message d'expertise GJS en fin de partie.

## RGPD & confidentialité

- **Zéro traceur embarqué.** Le bandeau cookies (refus aussi simple qu'accepter, choix granulaire, persisté en localStorage) pilote `lib/consent.ts` : c'est **le seul endroit** où brancher un jour une mesure d'audience — rien ne se charge avant consentement.
- Formulaire de contact : consentement **non pré-coché** obligatoire, lien vers la politique de confidentialité, honeypot anti-spam, rate-limit, **minimisation** (le contenu des messages n'est pas journalisé côté serveur).
- API `app/api/contact/route.ts` **mockée** : log + réponse 200, prête à brancher (Resend, Brevo, SMTP… — voir le commentaire `[À COMPLÉTER]`).
- Pages **Mentions légales** et **Politique de confidentialité** accessibles depuis le footer et le menu.

## Performance & accessibilité

- Scène 3D **code-splittée** (`ssr:false`), particules en `THREE.Points` + shader (un seul draw call), DPR plafonné, rendu **coupé onglet masqué**, comptage réduit sur tactile.
- **Fallbacks systématiques** : sans WebGL, sur appareil modeste ou en `prefers-reduced-motion`, l'aurore CSS prend le relais ; Lenis, reveals GSAP, curseur custom et marquees se désactivent proprement. Le contenu reste lisible **sans JavaScript** (les états cachés ne sont posés que par JS).
- Navigation clavier complète (skip-link, focus visibles, ESC ferme menu/modales/terminal), ARIA sur les composants interactifs, contrastes AA vérifiés (navy sur Mindaro ≈ 7:1).
- SEO : metadata par page, Open Graph généré (`app/opengraph-image.tsx`), JSON-LD Organization, sitemap, robots, manifest, `lang="fr"`.
- Préloader : progression **réelle** (polices + `window.load` + première frame 3D), garde-fou 6,5 s, sauté dès la 2ᵉ vue du même onglet.

## Polices & licences

- Clash Display & Satoshi — [Fontshare Free Font License](public/fonts/FFL.txt) (gratuites, usage commercial OK).
- JetBrains Mono — SIL Open Font License.
- Auto-hébergées dans `public/fonts/` : aucune requête vers Google/Fontshare au runtime.

## `[À COMPLÉTER]` avant mise en ligne

- [ ] `lib/content.ts` → e-mail, téléphone, liens réseaux réels, disponibilité
- [ ] `app/mentions-legales/page.tsx` → forme juridique, SIRET, siège, hébergeur, directeur·rice de publication
- [ ] `app/politique-de-confidentialite/page.tsx` → responsable de traitement, hébergeur des données
- [ ] `app/api/contact/route.ts` → brancher un vrai service d'envoi d'e-mails
- [ ] `NEXT_PUBLIC_SITE_URL` → URL de production
- [ ] Noms de l'équipe (section « L'équipe ») et vraie timeline
- [ ] Remplacer les études de cas illustratives par vos vrais projets
