// Camille Ferrand — animations au défilement (GSAP + ScrollTrigger + SplitText)

gsap.registerPlugin(ScrollTrigger, SplitText);

/*
 * SplitText découpe chaque titre en un <div> par ligne, puis en un <span> par
 * caractère. Après son passage, le <h1> ne contient plus de nœud texte : son
 * contenu est réparti dans plusieurs dizaines d'éléments.
 *
 * C'est le cas qui casse le plus violemment un éditeur visuel : le champ existe
 * bien dans le HTML source, mais il a disparu du DOM vivant au moment où
 * l'utilisateur veut cliquer dessus.
 */
document.querySelectorAll('[data-split]').forEach(function (titre) {
  var decoupe = new SplitText(titre, { type: 'lines,chars', linesClass: 'ligne' });

  gsap.from(decoupe.chars, {
    scrollTrigger: { trigger: titre, start: 'top 85%' },
    yPercent: 110,
    opacity: 0,
    duration: 0.9,
    ease: 'power3.out',
    stagger: 0.012,
  });
});

// Apparition au défilement de tout ce qui porte .reveal
gsap.utils.toArray('.reveal').forEach(function (element) {
  gsap.to(element, {
    scrollTrigger: { trigger: element, start: 'top 88%' },
    opacity: 1,
    y: 0,
    duration: 0.8,
    ease: 'power2.out',
  });
});

// Parallaxe sur la section « série en cours »
gsap.to('.bloc--sombre', {
  scrollTrigger: {
    trigger: '.bloc--sombre',
    start: 'top bottom',
    end: 'bottom top',
    scrub: true,
  },
  backgroundPositionY: '30%',
});

// Compteur de progression : son texte est écrit exclusivement par ce script.
var compteur = document.querySelector('[data-progression]');
if (compteur) {
  ScrollTrigger.create({
    trigger: document.body,
    start: 'top top',
    end: 'bottom bottom',
    onUpdate: function (self) {
      compteur.textContent = Math.round(self.progress * 100) + ' %';
    },
  });
}

// Navigation par ancres : chaque section [id] se comporte comme une page.
document.querySelectorAll('[data-lien-section]').forEach(function (lien) {
  lien.addEventListener('click', function (evenement) {
    evenement.preventDefault();
    var cible = document.querySelector(lien.getAttribute('href'));
    if (cible) {
      gsap.to(window, { duration: 0.9, scrollTo: cible, ease: 'power2.inOut' });
      history.replaceState(null, '', lien.getAttribute('href'));
    }
  });
});

// Marque la section visible dans la navigation.
document.querySelectorAll('main section[id]').forEach(function (section) {
  ScrollTrigger.create({
    trigger: section,
    start: 'top 40%',
    end: 'bottom 40%',
    onToggle: function (self) {
      var lien = document.querySelector('[href="#' + section.id + '"]');
      if (lien) lien.setAttribute('aria-current', self.isActive ? 'true' : 'false');
    },
  });
});

// Année courante, écrite au runtime.
var annee = document.querySelector('[data-annee]');
if (annee) {
  annee.textContent = new Date().getFullYear().toString();
}
