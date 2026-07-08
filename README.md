# GJS Group — Digital Showcase

Site vitrine premium en HTML, CSS et JavaScript pur — sans framework, sans npm, sans serveur. Expérience single-page avec routes virtuelles, transitions "rideau", champ de particules interactif et design glassmorphique néon.

## 🚀 Utilisation

1. **Ouvrir le site** : double-cliquez simplement sur `index.html` dans votre navigateur
2. **C'est tout !** Le site fonctionne directement sans installation ni serveur

## 📁 Structure

```
site-gjs/
├── index.html      # Application complète : 6 vues (Accueil, À propos, Services, Expertise, Blog, Contact)
├── style.css       # Design system : tokens, glassmorphism, animations, responsive mobile-first
├── script.js       # Moteur : routeur virtuel, particules canvas, curseur, reveals, formulaire
├── about.html      # Redirection → index.html#/a-propos
├── services.html   # Redirection → index.html#/services
├── partners.html   # Redirection → index.html#/expertise
├── blog.html       # Redirection → index.html#/blog
├── contact.html    # Redirection → index.html#/contact
├── images/         # Logo & visuels expertise
└── README.md       # Ce fichier
```

Les anciennes pages multi-fichiers sont conservées comme redirections : tout lien ou favori existant atterrit sur la bonne vue.

## ✨ Fonctionnalités

### Expérience single-page (SPA)
- ✅ Routeur virtuel en Vanilla JS (`history.pushState` + hash `#/route`)
- ✅ Transitions de page "rideau" en deux temps (indigo → fond) avec libellé de destination
- ✅ Deep-linking : `index.html#/services` ouvre directement la vue Services
- ✅ Boutons précédent/suivant du navigateur pris en charge (`popstate`)
- ✅ Titre du document et état `aria-current` mis à jour à chaque navigation

### Design futuriste
- ✅ Fond cyber profond (`#0a0a0f`), accents néon indigo/violet, rose électrique, ambre
- ✅ Glassmorphism généralisé (`backdrop-filter: blur`, bordures semi-transparentes)
- ✅ Bento-grid asymétrique, rangées de services avec index néon, panneaux CTA à bordure dégradée
- ✅ Orbes aurora animés + grain cinématographique en arrière-plan
- ✅ Typographie fluide (`clamp()`) — Space Grotesk (titres) + Inter (texte)

### Interactions & animations
- ✅ Champ de particules canvas haute densité avec **attraction gravitationnelle du curseur**
- ✅ Curseur personnalisé (point + anneau magnétique) sur pointeurs fins uniquement
- ✅ Reveals au scroll en cascade (`IntersectionObserver` + délais échelonnés)
- ✅ Compteurs animés avec easing exponentiel
- ✅ Spotlight sur les cartes de verre suivant le pointeur
- ✅ Marquee infini sans couture, menu mobile en `clip-path` circulaire

### Performance & accessibilité
- ✅ Mobile-first : densité de particules et rayons réduits via `matchMedia`
- ✅ Le canvas se met en pause hors écran et onglet masqué (IntersectionObserver + `visibilitychange`)
- ✅ `prefers-reduced-motion` respecté partout (rendu statique, transitions désactivées)
- ✅ Skip-link, focus visible, `aria-expanded`/`aria-current`, labels de formulaire conservés
- ✅ DPR plafonné à 2, scroll listeners passifs, resize débouncé

### Formulaire de contact
- ✅ Validation en temps réel + messages d'erreur personnalisés
- ✅ Protection anti-spam (honeypot)
- ✅ Envoi Formspree ou EmailJS (voir configuration ci-dessous)
- ✅ Toast notifications (succès/erreur) et état de chargement

## 🎨 Personnalisation

### Changer les couleurs

Éditez les design tokens en tête de `style.css` :

```css
:root {
    --bg-1: #0a0a0f;
    --indigo: #6366f1;
    --violet: #8b5cf6;
    --pink: #ec4899;
    --amber: #f59e0b;
    /* ... */
}
```

### Configurer le formulaire

Renseignez `CONTACT_SEND` en tête de `script.js` :

```javascript
const CONTACT_SEND = {
    formsprreeEndpoint: 'https://formspree.io/f/VOTRE_ID',
    emailJs: {
        publicKey: '',
        serviceId: '',
        templateId: '',
    }
};
```

Formspree est utilisé en priorité ; EmailJS sert de repli si l'endpoint est vide.

### Ajouter une vue

1. Dupliquez une `<section class="view" data-view="...">` dans `index.html`
2. Déclarez la route dans `Router.routes` (`script.js`) avec son libellé et son titre
3. Ajoutez le lien `data-link="..."` dans la navigation

## 📱 Compatibilité

- ✅ Chrome/Edge (dernières versions)
- ✅ Firefox (dernières versions)
- ✅ Safari (dernières versions)
- ✅ Mobile browsers (iOS Safari, Chrome Mobile)

## 📝 Notes

- Aucune dépendance externe hormis Google Fonts et le SDK EmailJS (optionnel)
- Compatible avec tous les hébergeurs statiques (GitHub Pages, Netlify, Vercel, etc.)
- Les visuels Unsplash se chargent depuis Internet — remplacez-les par vos propres images dans `images/` pour un site 100 % offline

## 🚀 Déploiement

### GitHub Pages

1. Créez un repository GitHub
2. Uploadez les fichiers
3. Activez GitHub Pages dans les paramètres
4. Votre site sera accessible à `https://votre-username.github.io/repo-name/`

### Netlify / Vercel

Glissez-déposez le dossier ou importez le repository : aucun build n'est nécessaire.

## 📞 Support

Pour toute question, contactez : gjsgroup.contact@gmail.com
