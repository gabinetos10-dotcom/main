/* ==========================================================================
   GJS — PAGES LÉGALES & RGPD
   - Sommaire : rubrique active (aria-current), barre de progression de
     lecture, replié par défaut sur mobile, toujours ouvert sur desktop.
   - Page « Exercer vos droits » : formulaire qui prépare un email
     (objet + corps) vers l'adresse de contact, avec aperçu en direct.
     Rien n'est envoyé par le site.
   ========================================================================== */

import { $, $$, announce } from '../core/utils.js';
import { CONFIG } from '../config.js';

const { ScrollTrigger } = window;

const ARTICLES = {
  acces: 'article 15 du RGPD',
  rectification: 'article 16 du RGPD',
  effacement: 'article 17 du RGPD',
  limitation: 'article 18 du RGPD',
  portabilite: 'article 20 du RGPD',
  opposition: 'article 21 du RGPD',
  consentement: 'article 7.3 du RGPD',
  'post-mortem': 'article 85 de la loi Informatique et Libertés',
};

function toc(scope, root) {
  const details = $('[data-legal-toc]', root);
  const links = $$('.legal__toc-link', root);
  const content = $('[data-legal-content]', root);
  const bar = $('[data-legal-progress]', root);

  if (details) {
    const summary = details.querySelector('summary');
    const desktop = window.matchMedia('(min-width: 1024px)');
    const sync = () => {
      details.open = desktop.matches || details.dataset.userOpen === 'true';
      summary.tabIndex = desktop.matches ? -1 : 0;
    };
    sync();
    scope.on(desktop, 'change', sync);
    scope.on(summary, 'click', (e) => {
      if (desktop.matches) { e.preventDefault(); return; }
      details.dataset.userOpen = String(!details.open);
    });
    // Sur mobile, choisir une rubrique replie le sommaire
    links.forEach((link) => scope.on(link, 'click', () => {
      if (!desktop.matches) { details.open = false; details.dataset.userOpen = 'false'; }
    }));
  }

  links.forEach((link) => {
    const section = root.querySelector(link.getAttribute('href'));
    if (!section) return;
    ScrollTrigger.create({
      trigger: section,
      start: 'top 40%',
      end: 'bottom 40%',
      onToggle: (self) => {
        if (!self.isActive) return;
        links.forEach((l) => l.removeAttribute('aria-current'));
        link.setAttribute('aria-current', 'true');
      },
    });
  });

  if (content && bar) {
    ScrollTrigger.create({
      trigger: content,
      start: 'top 60%',
      end: 'bottom bottom',
      onUpdate: (self) => bar.style.setProperty('--progress', self.progress.toFixed(3)),
    });
  }
}

function rightsForm(scope, root) {
  const form = $('[data-rights-form]', root);
  if (!form) return;
  const preview = $('[data-rights-preview]', form);
  const subjectEl = $('[data-rights-subject]', form);
  const bodyEl = $('[data-rights-body]', form);
  const copyBtn = $('[data-rights-copy]', form);
  const status = $('[data-rights-status]', form);
  const email = form.elements.email;
  const nom = form.elements.nom;

  const compose = () => {
    const choice = form.querySelector('input[name="droit"]:checked');
    const label = choice ? choice.dataset.label : '';
    const who = nom.value.trim();
    const details = form.elements.precisions.value.trim();
    const subject = `Exercice de mes droits RGPD — ${label || '[droit à préciser]'}`;
    const lines = [
      'Bonjour,',
      '',
      `Je souhaite exercer mon droit « ${label ? label.toLowerCase() : '[droit à préciser]'} » (${choice ? ARTICLES[choice.value] : 'RGPD'}) concernant les données personnelles que GJS détient à mon sujet.`,
    ];
    if (details) lines.push('', details);
    lines.push(
      '',
      `Nom : ${who || '[votre nom]'}`,
      `Email utilisé avec GJS : ${email.value.trim() || '[votre email]'}`,
      '',
      'Merci de me répondre dans le délai d’un mois prévu par l’article 12 du RGPD.',
      '',
      'Cordialement,',
      who || '[votre nom]',
    );
    return { subject, body: lines.join('\n') };
  };

  const render = () => {
    const { subject, body } = compose();
    subjectEl.textContent = subject;
    bodyEl.textContent = body;
    preview.hidden = false;
    if (copyBtn) copyBtn.hidden = !navigator.clipboard;
  };

  const setError = (input, msg) => {
    const out = input.type === 'radio'
      ? $('[data-error-for="droit"]', form)
      : document.getElementById(`${input.id}-error`);
    if (input.type === 'radio') {
      $$('input[name="droit"]', form).forEach((r) => r.setAttribute('aria-invalid', msg ? 'true' : 'false'));
    } else {
      input.setAttribute('aria-invalid', msg ? 'true' : 'false');
    }
    if (out) out.textContent = msg;
  };

  const validate = () => {
    const errors = [];
    const radio = form.querySelector('input[name="droit"]');
    if (!form.querySelector('input[name="droit"]:checked')) {
      setError(radio, 'Choisissez le droit concerné.');
      errors.push(radio);
    } else setError(radio, '');
    if (!nom.value.trim()) { setError(nom, 'Indiquez votre nom.'); errors.push(nom); } else setError(nom, '');
    if (!email.value.trim()) { setError(email, 'Indiquez votre email.'); errors.push(email); }
    else if (!email.checkValidity()) { setError(email, 'Cet email ne semble pas valide (exemple : prenom@entreprise.fr).'); errors.push(email); }
    else setError(email, '');
    return errors;
  };

  scope.on(form, 'input', render);
  scope.on(form, 'change', render);

  scope.on(form, 'submit', (e) => {
    e.preventDefault();
    render();
    const errors = validate();
    if (errors.length) {
      errors[0].focus();
      announce(`${errors.length} champ${errors.length > 1 ? 's' : ''} à compléter.`, 'assertive');
      return;
    }
    const { subject, body } = compose();
    window.location.href = `mailto:${CONFIG.EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    status.textContent = 'Votre messagerie s’ouvre avec le message prêt. Vérifiez-le, puis envoyez-le.';
  });

  if (copyBtn) {
    scope.on(copyBtn, 'click', async () => {
      const { subject, body } = compose();
      try {
        await navigator.clipboard.writeText(`${subject}\n\n${body}`);
        copyBtn.textContent = 'Message copié';
        status.textContent = `Message copié. Collez-le dans un email à ${CONFIG.EMAIL}.`;
        scope.timeout(() => { copyBtn.textContent = 'Copier le message'; }, 2400);
      } catch {
        status.textContent = 'La copie a échoué : sélectionnez le texte de l’aperçu.';
      }
    });
  }
}

export default {
  init(scope, root) {
    toc(scope, root);
    rightsForm(scope, root);
  },
  destroy() {},
};
