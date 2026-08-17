// Le Comptoir des Halles — interactions

(function () {
  'use strict';

  // Bandeau d'information injecté au chargement. Son texte n'existe pas dans le
  // HTML source : il est écrit ici, donc non éditable depuis un calque de contenu.
  var banniere = document.querySelector('[data-info]');
  if (banniere) {
    banniere.textContent = 'Fermeture exceptionnelle le 15 août';
  }

  // Bascule jour/soir : ajoute data-theme sur <html>, ce que les jetons CSS lisent.
  var bascule = document.querySelector('[data-bascule-theme]');
  if (bascule) {
    bascule.addEventListener('click', function () {
      var actuel = document.documentElement.getAttribute('data-theme');
      document.documentElement.setAttribute('data-theme', actuel === 'soir' ? '' : 'soir');
    });
  }

  // Marque le lien de la page courante dans le menu partagé.
  var chemin = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.menu-principal a').forEach(function (lien) {
    if (lien.getAttribute('href') === chemin) {
      lien.classList.add('actif');
    }
  });
})();
