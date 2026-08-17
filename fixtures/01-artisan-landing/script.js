// Menuiserie Rousseau — animations légères

// Compteurs animés. Le contenu de ces éléments est écrit par JavaScript :
// un éditeur qui les proposerait à la modification afficherait « 0 » au client
// et son texte serait de toute façon écrasé au chargement de la page.
document.querySelectorAll('.counter').forEach(function (element) {
  var cible = parseInt(element.dataset.count, 10);
  var debut = null;

  function pas(horodatage) {
    if (!debut) debut = horodatage;
    var progression = Math.min((horodatage - debut) / 1400, 1);
    element.textContent = Math.floor(progression * cible).toString();
    if (progression < 1) requestAnimationFrame(pas);
  }

  var observateur = new IntersectionObserver(function (entrees) {
    entrees.forEach(function (entree) {
      if (entree.isIntersecting) {
        requestAnimationFrame(pas);
        observateur.disconnect();
      }
    });
  }, { threshold: 0.4 });

  observateur.observe(element);
});

// Défilement doux vers les ancres
document.querySelectorAll('a[href^="#"]').forEach(function (lien) {
  lien.addEventListener('click', function (evenement) {
    var cible = document.querySelector(lien.getAttribute('href'));
    if (!cible) return;
    evenement.preventDefault();
    cible.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
});

// Année courante dans le pied de page — également injectée au runtime.
var anneeCourante = document.querySelector('[data-annee]');
if (anneeCourante) {
  anneeCourante.textContent = new Date().getFullYear().toString();
}
