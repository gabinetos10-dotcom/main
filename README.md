# GJS Group - Site Web Complet

Site web moderne et complet en HTML, CSS et JavaScript pur - sans framework, sans npm, sans serveur.

## 🚀 Utilisation

1. **Ouvrir le site** : Double-cliquez simplement sur `index.html` dans votre navigateur
2. **C'est tout !** Le site fonctionne directement sans installation ni serveur

## 📁 Structure

```
site-gjs/
├── index.html      # Page d'accueil
├── about.html      # À propos
├── services.html   # Services
├── partners.html   # Partenaires
├── contact.html    # Contact (avec formulaire)
├── blog.html       # Blog
├── style.css       # Tous les styles CSS
├── script.js       # Toutes les interactions JavaScript
└── README.md       # Ce fichier
```

## ✨ Fonctionnalités

### Design Moderne
- ✅ Design moderne et futuriste (2025)
- ✅ Arrière-plan dynamique avec particules 3D (Canvas)
- ✅ Dégradés fluides et effets visuels
- ✅ Typographie élégante (Space Grotesk + Inter)
- ✅ Couleurs modernes et contrastées

### Animations
- ✅ Particules 3D animées sur la page d'accueil
- ✅ Animations au scroll (reveal on scroll)
- ✅ Compteur animé sur les statistiques
- ✅ Carrousel de logos partenaires animé
- ✅ Effets de survol sur les cartes et images
- ✅ Transitions douces entre les pages

### Pages
- ✅ **index.html** : Page d'accueil avec hero, stats, features, services preview
- ✅ **about.html** : À propos avec histoire, valeurs, équipe
- ✅ **services.html** : Services détaillés avec processus
- ✅ **partners.html** : Partenaires avec carrousel animé
- ✅ **contact.html** : Formulaire de contact fonctionnel avec validation
- ✅ **blog.html** : Blog avec articles et pagination

### Responsive
- ✅ Mobile-first design
- ✅ Adapté à tous les écrans (mobile, tablette, desktop)
- ✅ Menu mobile avec animation
- ✅ Navigation fluide

### Formulaire de Contact
- ✅ Validation en temps réel
- ✅ Messages d'erreur personnalisés
- ✅ Protection anti-spam (honeypot)
- ✅ Toast notifications (succès/erreur)
- ✅ États de chargement

## 🎨 Personnalisation

### Changer les couleurs

Éditez les variables CSS dans `style.css` (lignes 8-20) :

```css
:root {
    --primary: #6366f1;
    --secondary: #ec4899;
    --accent: #f59e0b;
    /* ... */
}
```

### Modifier les textes

Tous les textes sont directement dans les fichiers HTML. Recherchez et remplacez les contenus.

### Configurer le formulaire

Pour connecter le formulaire à Formspree ou EmailJS, modifiez la fonction `initContactForm()` dans `script.js` :

```javascript
// Remplacez cette partie :
await new Promise(resolve => setTimeout(resolve, 1500));

// Par :
const response = await fetch('https://formspree.io/f/VOTRE_ID', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(formData),
});
```

### Changer les images

Les images utilisent Unsplash. Pour utiliser vos propres images :
1. Placez vos images dans un dossier `images/`
2. Remplacez les URLs Unsplash par vos chemins locaux
3. Exemple : `src="images/votre-image.jpg"`

## 📱 Compatibilité

- ✅ Chrome/Edge (dernières versions)
- ✅ Firefox (dernières versions)
- ✅ Safari (dernières versions)
- ✅ Mobile browsers (iOS Safari, Chrome Mobile)

## 🔧 Améliorations possibles

- Ajouter un favicon personnalisé
- Intégrer Google Analytics (avec consentement)
- Optimiser les images (WebP, lazy loading)
- Ajouter un système de recherche pour le blog
- Ajouter des animations GSAP pour plus d'effets

## 📝 Notes

- Le site est entièrement autonome et fonctionne hors ligne
- Aucune dépendance externe (sauf Google Fonts pour la typographie)
- Compatible avec tous les hébergeurs statiques (GitHub Pages, Netlify, Vercel, etc.)
- Les images Unsplash se chargent depuis Internet (ajoutez vos propres images pour un site 100% offline)

## 🚀 Déploiement

### GitHub Pages

1. Créez un repository GitHub
2. Uploadez les fichiers
3. Activez GitHub Pages dans les paramètres
4. Votre site sera accessible à `https://votre-username.github.io/repo-name/`

### Netlify

1. Allez sur [netlify.com](https://netlify.com)
2. Glissez-déposez le dossier `site-gjs`
3. Votre site est en ligne !

### Vercel

1. Allez sur [vercel.com](https://vercel.com)
2. Importez le dossier
3. Déployez !

## 📞 Support

Pour toute question, contactez : contact@gjs-group.fr

