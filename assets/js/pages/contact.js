/* ==========================================================================
   GJS — PAGE CONTACT (v2)
   Formulaire en 3 étapes visibles : HUD de progression qui se remplit à mesure
   que les champs requis sont valides, validation en direct accessible,
   pré-remplissage depuis le configurateur (paramètres d'URL), champ piège,
   case d'information RGPD, envoi fetch (POST JSON) vers CONFIG.FORM_ENDPOINT
   (Formspree, Make, n8n…) ou repli « mailto » si aucun endpoint n'est configuré.
   Champs obligatoires (alignés sur la politique de confidentialité, § Champs
   obligatoires) : besoins, budget, délai, nom, email, message (20 caractères).
   ========================================================================== */

import { CONFIG } from '../config.js';
import { env, $, $$, announce } from '../core/utils.js';
import { scrollTo, resizeScroll } from '../core/scroll.js';

const { gsap } = window;

const HORIZON_TO_DELAY = { urgent: 'urgent', '1-3-mois': '1-3-mois', 'plus-tard': 'plus-tard' };
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_RE = /^[0-9+().\s-]{6,20}$/;

const MESSAGES = {
  besoins: () => 'Choisissez au moins un besoin (même « Autre » fait l’affaire).',
  budget: () => 'Indiquez une fourchette de budget — « Je ne sais pas encore » est une réponse valable.',
  delai: () => 'Indiquez un délai, même approximatif.',
  nom: () => 'Indiquez votre nom (2 caractères minimum).',
  email: (v) => (v ? 'Cette adresse semble incomplète : vérifiez le @ et le domaine (ex. nom@entreprise.fr).' : 'Indiquez votre email pour que l’on puisse vous répondre.'),
  telephone: () => 'Ce numéro semble incorrect : chiffres, espaces, +, tirets et parenthèses uniquement.',
  site: () => 'Cette adresse de site semble incorrecte (ex. https://votre-site.fr).',
  message: (v) => `Décrivez votre projet en 20 caractères minimum (encore ${Math.max(0, 20 - v.trim().length)}).`,
  consentement: () => 'Cochez la case pour confirmer que vous avez pris connaissance de la politique de confidentialité.',
};

/* Étapes : champs validés (dans l'ordre du formulaire) et champs requis */
const STEPS = [
  { n: 1, name: 'votre besoin', fields: ['besoins', 'budget', 'delai'], required: ['besoins', 'budget', 'delai'] },
  { n: 2, name: 'vos coordonnées', fields: ['nom', 'email', 'telephone', 'site'], required: ['nom', 'email'] },
  { n: 3, name: 'votre message', fields: ['message', 'consentement'], required: ['message', 'consentement'] },
];
const ALL_FIELDS = STEPS.flatMap((s) => s.fields);
const REQUIRED_TOTAL = STEPS.reduce((sum, s) => sum + s.required.length, 0);

function validate(form, name) {
  const inputs = $$(`[name="${name}"]`, form);
  if (!inputs.length) return '';
  const first = inputs[0];
  if (first.type === 'checkbox' && name === 'besoins') return inputs.some((i) => i.checked) ? '' : MESSAGES.besoins();
  if (first.type === 'radio') return inputs.some((i) => i.checked) ? '' : MESSAGES[name]();
  if (first.type === 'checkbox') return first.checked ? '' : MESSAGES[name]();
  const value = first.value.trim();
  switch (name) {
    case 'nom': return value.length >= 2 ? '' : MESSAGES.nom();
    case 'email': return EMAIL_RE.test(value) ? '' : MESSAGES.email(value);
    case 'telephone': return !value || PHONE_RE.test(value) ? '' : MESSAGES.telephone();
    case 'site': {
      if (!value) return '';
      try { const u = new URL(value); return /^https?:$/.test(u.protocol) && u.hostname.includes('.') ? '' : MESSAGES.site(); } catch { return MESSAGES.site(); }
    }
    case 'message': return value.length >= 20 ? '' : MESSAGES.message(value);
    default: return '';
  }
}

function showError(form, name, message) {
  const inputs = $$(`[name="${name}"]`, form);
  const box = $(`[data-error-for="${name}"]`, form);
  const group = form.querySelector(`[data-group="${name}"]`);
  inputs.forEach((i) => {
    if (message) i.setAttribute('aria-invalid', 'true');
    else i.removeAttribute('aria-invalid');
  });
  if (group) group.toggleAttribute('data-invalid', Boolean(message));
  if (box) box.textContent = message;
}

function prefill(form) {
  const params = new URLSearchParams(window.location.search);
  let filled = false;
  const needs = params.getAll('besoins').flatMap((v) => v.split(',')).map((v) => v.trim()).filter(Boolean);
  needs.forEach((value) => {
    const input = form.querySelector(`input[name="besoins"][value="${CSS.escape(value)}"]`);
    if (input) { input.checked = true; filled = true; }
  });
  const goal = params.get('objectif');
  if (goal) {
    const input = form.querySelector(`input[name="objectif"][value="${CSS.escape(goal)}"]`);
    if (input) { input.checked = true; filled = true; }
  }
  const delay = HORIZON_TO_DELAY[params.get('horizon')] || params.get('delai');
  if (delay) {
    const input = form.querySelector(`input[name="delai"][value="${CSS.escape(delay)}"]`);
    if (input) { input.checked = true; filled = true; }
  }
  const code = params.get('code');
  if (code) {
    const input = form.querySelector('input[name="code"]');
    if (input) input.value = code.slice(0, 32);
  }
  return filled;
}

function collect(form) {
  const data = new FormData(form);
  return {
    besoins: data.getAll('besoins'),
    objectif: data.get('objectif') || '',
    budget: data.get('budget') || '',
    delai: data.get('delai') || '',
    nom: (data.get('nom') || '').trim(),
    email: (data.get('email') || '').trim(),
    entreprise: (data.get('entreprise') || '').trim(),
    telephone: (data.get('telephone') || '').trim(),
    site: (data.get('site') || '').trim(),
    message: (data.get('message') || '').trim(),
    code: (data.get('code') || '').trim(),
    consentement: data.get('consentement') === 'oui',
    page: window.location.href,
    date: new Date().toISOString(),
    _subject: `Nouveau projet — ${(data.get('nom') || '').trim()}`,
  };
}

function labelOf(form, name, value) {
  const input = form.querySelector(`input[name="${name}"][value="${CSS.escape(value)}"]`);
  const box = input && input.nextElementSibling;
  if (!box) return value;
  const clone = box.cloneNode(true);
  clone.querySelectorAll('.choice__index, .choice__mark').forEach((n) => n.remove());
  return clone.textContent.trim();
}

function mailtoFallback(form, data) {
  const lines = [
    `Besoins : ${data.besoins.map((v) => labelOf(form, 'besoins', v)).join(', ')}`,
    data.objectif ? `Objectif : ${labelOf(form, 'objectif', data.objectif)}` : '',
    `Budget : ${labelOf(form, 'budget', data.budget)}`,
    `Délai : ${labelOf(form, 'delai', data.delai)}`,
    '',
    `Nom : ${data.nom}`,
    `Email : ${data.email}`,
    data.entreprise ? `Entreprise : ${data.entreprise}` : '',
    data.telephone ? `Téléphone : ${data.telephone}` : '',
    data.site ? `Site : ${data.site}` : '',
    data.code ? `Code : ${data.code}` : '',
    '',
    data.message,
  ].filter((l, i, arr) => l !== '' || arr[i - 1] !== '');
  const href = `mailto:${CONFIG.EMAIL}?subject=${encodeURIComponent(data._subject)}&body=${encodeURIComponent(lines.join('\n'))}`;
  window.location.href = href;
}

async function send(data) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);
  try {
    const res = await fetch(CONFIG.FORM_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(data),
      signal: controller.signal,
    });
    return res.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

/** Décalage de défilement : header (hauteur de mise en page, même s'il est
    caché : il réapparaît en remontant) + HUD collant + respiration. */
function stickyOffset(form) {
  const header = document.querySelector('[data-header]');
  const hud = $('[data-form-hud]', form);
  return -((header ? header.offsetHeight : 0) + (hud && !form.hidden ? hud.offsetHeight : 0) + 24);
}

/* ---------- Copie de l'email -------------------------------------------- */

async function copyText(value) {
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(value);
      return true;
    } catch { /* permission refusée : repli ci-dessous */ }
  }
  // Repli (http non sécurisé, permission refusée, anciens navigateurs)
  const area = document.createElement('textarea');
  area.value = value;
  area.setAttribute('readonly', '');
  Object.assign(area.style, { position: 'fixed', top: '0', left: '0', opacity: '0', pointerEvents: 'none' });
  document.body.appendChild(area);
  area.select();
  let ok = false;
  try { ok = document.execCommand('copy'); } catch { ok = false; }
  area.remove();
  if (!ok) throw new Error('copie impossible');
  return true;
}

function initCopy(scope, root) {
  const btn = $('[data-copy]', root);
  if (!btn) return;
  const card = btn.closest('[data-copy-card]');
  const label = $('[data-copy-label]', btn);
  const feedback = $('[data-copy-feedback]', root);
  let timer = 0;
  const reset = () => {
    btn.classList.remove('is-copied');
    if (card) card.classList.remove('is-copied');
    if (label) label.textContent = 'Copier';
  };
  scope.on(btn, 'click', async () => {
    const value = btn.dataset.copy || CONFIG.EMAIL;
    try {
      await copyText(value);
      btn.classList.add('is-copied');
      if (card) card.classList.add('is-copied');
      if (label) label.textContent = 'Copié !';
      if (feedback) { feedback.textContent = ''; scope.timeout(() => { feedback.textContent = `Adresse ${value} copiée.`; }, 60); }
      if (!env.reducedMotion) scope.add(() => gsap.fromTo(btn, { scale: 0.92 }, { scale: 1, duration: 0.6, ease: 'elastic.out(1, 0.5)', clearProps: 'transform' }));
      clearTimeout(timer);
      timer = setTimeout(reset, 2400);
    } catch {
      window.location.href = `mailto:${value}`;
    }
  });
  scope.cleanup(() => clearTimeout(timer));
}

/* ---------- Formulaire en 3 étapes -------------------------------------- */

function initForm(scope, root) {
  const form = $('[data-contact-form]', root);
  if (!form) return;
  const steps = $$('[data-step]', form);
  const hudSteps = $$('[data-goto]', form);
  const submit = $('[data-form-submit]', form);
  const submitLabel = $('[data-submit-label]', submit);
  const remaining = $('[data-form-remaining]', form);
  const errors = $('[data-form-errors]', form);
  const success = $('[data-contact-success]', root);
  const counter = $('[data-char-count]', form);
  const countHint = $('[data-count-hint]', form);
  const message = $('#f-message', form);
  const touched = new Set();
  const complete = new Map();
  let ready = false; // pas d'annonce pendant l'initialisation

  // Le JS prend la main (sans JS, le formulaire part en mailto via action)
  form.removeAttribute('action');
  form.classList.add('is-enhanced');
  if (remaining) remaining.hidden = false;

  /* Progression : se remplit à mesure que les champs requis sont valides */
  const progress = () => {
    let validTotal = 0;
    STEPS.forEach((step, i) => {
      const valid = step.required.filter((name) => !validate(form, name)).length;
      const optionalOk = step.fields.filter((name) => !step.required.includes(name)).every((name) => !validate(form, name));
      const isComplete = valid === step.required.length && optionalOk;
      validTotal += valid;
      const fieldset = steps[i];
      const hud = hudSteps[i];
      const hasError = Boolean(fieldset && fieldset.querySelector('[aria-invalid="true"]'));
      if (fieldset) fieldset.classList.toggle('is-complete', isComplete);
      if (hud) {
        hud.classList.toggle('is-complete', isComplete);
        hud.classList.toggle('has-error', hasError);
        const fill = $('[data-step-fill]', hud);
        if (fill) fill.style.setProperty('--p', String(valid / step.required.length));
        const state = $('[data-step-state]', hud);
        if (state) {
          state.textContent = isComplete
            ? ', complète'
            : `, ${valid} sur ${step.required.length} champs obligatoires${hasError ? ', à corriger' : ''}`;
        }
      }
      if (ready && isComplete && !complete.get(step.n)) announce(`Étape ${step.n} complète : ${step.name}.`);
      complete.set(step.n, isComplete);
    });
    if (remaining) {
      const left = REQUIRED_TOTAL - validTotal;
      remaining.classList.toggle('is-ready', left === 0);
      remaining.textContent = left === 0
        ? 'Tout est prêt : vous pouvez envoyer.'
        : `Encore ${left} champ${left > 1 ? 's' : ''} obligatoire${left > 1 ? 's' : ''} à compléter.`;
    }
    if (counter && message) {
      counter.textContent = String(message.value.length);
      if (countHint) countHint.classList.toggle('is-ok', message.value.trim().length >= 20);
    }
  };

  const showSummary = (invalid) => {
    if (!invalid.length) { errors.hidden = true; errors.innerHTML = ''; return; }
    errors.hidden = false;
    errors.innerHTML = `<p><strong>${invalid.length > 1 ? `${invalid.length} points à corriger` : 'Un point à corriger'} :</strong></p><ul>${invalid.map(({ name, msg }) => {
      const target = form.querySelector(`[name="${name}"]`);
      return `<li><a href="#${target ? target.id || '' : ''}" data-fix="${name}">${msg}</a></li>`;
    }).join('')}</ul>`;
  };

  const focusField = (name) => {
    const target = form.querySelector(`[name="${name}"]`);
    if (!target) return;
    const block = target.closest('.contact-form__group, .field') || target;
    scrollTo(block, { offset: stickyOffset(form), immediate: env.reducedMotion, duration: 0.9 });
    target.focus({ preventScroll: true });
  };

  // HUD : un clic amène à l'étape (premier champ à compléter, sinon le premier champ)
  hudSteps.forEach((btn) => {
    scope.on(btn, 'click', () => {
      const n = Number(btn.dataset.goto);
      const step = STEPS[n - 1];
      const fieldset = steps[n - 1];
      if (!step || !fieldset) return;
      const pending = step.fields.find((name) => validate(form, name));
      const first = pending ? form.querySelector(`[name="${pending}"]`) : $('input:not([type="hidden"]), textarea', fieldset);
      scrollTo(fieldset, { offset: stickyOffset(form), immediate: env.reducedMotion, duration: 0.9 });
      if (first) first.focus({ preventScroll: true });
    });
  });

  // Validation en direct : au changement pour les choix, à la frappe après un premier passage
  scope.on(form, 'change', (e) => {
    const { name } = e.target;
    if (!name || name === 'website') return;
    if (e.target.type === 'checkbox' || e.target.type === 'radio' || touched.has(name)) showError(form, name, validate(form, name));
    progress();
  });
  scope.on(form, 'input', (e) => {
    const { name } = e.target;
    if (!name || name === 'website') return;
    if (touched.has(name)) showError(form, name, validate(form, name));
    progress();
  });
  scope.on(form, 'focusout', (e) => {
    const { name, type } = e.target;
    if (!name || type === 'checkbox' || type === 'radio' || name === 'website') return;
    if (name === 'site' && e.target.value && !/^https?:\/\//i.test(e.target.value)) e.target.value = `https://${e.target.value.trim()}`;
    if (e.target.value || touched.has(name)) {
      touched.add(name);
      showError(form, name, validate(form, name));
      progress();
    }
  });
  scope.on(errors, 'click', (e) => {
    const link = e.target.closest('[data-fix]');
    if (!link) return;
    e.preventDefault();
    focusField(link.dataset.fix);
  });

  scope.on(form, 'submit', async (e) => {
    e.preventDefault();
    // Vérification complète, dans l'ordre du formulaire
    const invalid = [];
    ALL_FIELDS.forEach((name) => {
      const msg = validate(form, name);
      showError(form, name, msg);
      touched.add(name);
      if (msg) invalid.push({ name, msg });
    });
    progress();
    if (invalid.length) {
      showSummary(invalid);
      announce(invalid[0].msg, 'assertive');
      focusField(invalid[0].name);
      return;
    }
    showSummary([]);
    const data = collect(form);
    // Champ piège rempli : un robot. On simule un succès sans rien envoyer.
    if (form.querySelector('[name="website"]').value) { showSuccess(scope, form, success, false); return; }

    if (!CONFIG.FORM_ENDPOINT) {
      mailtoFallback(form, data);
      showSuccess(scope, form, success, true);
      return;
    }

    form.classList.add('is-sending');
    form.setAttribute('aria-busy', 'true');
    submit.disabled = true;
    if (submitLabel) submitLabel.textContent = 'Envoi en cours…';
    announce('Envoi en cours.');
    const ok = await send(data);
    if (scope.destroyed) return;
    form.classList.remove('is-sending');
    form.removeAttribute('aria-busy');
    submit.disabled = false;
    if (submitLabel) submitLabel.textContent = 'Envoyer ma demande';
    if (ok) {
      showSuccess(scope, form, success, false);
    } else {
      errors.hidden = false;
      errors.innerHTML = `<p><strong>L’envoi n’a pas abouti.</strong> Votre connexion a peut-être coupé. Réessayez, ou écrivez-nous directement : <a href="mailto:${CONFIG.EMAIL}">${CONFIG.EMAIL}</a>. Vos réponses sont conservées.</p>`;
      announce('L’envoi n’a pas abouti. Réessayez ou écrivez-nous par email.', 'assertive');
      errors.setAttribute('tabindex', '-1');
      scrollTo(errors, { offset: stickyOffset(form), immediate: env.reducedMotion, duration: 0.9 });
      errors.focus({ preventScroll: true });
    }
  });

  const filled = prefill(form);
  progress();
  ready = true;
  // Pré-remplissage : note visible, reliée à la description du formulaire, et
  // annonce différée (après celles du loader / de la transition de page)
  const code = ($('[name="code"]', form) || {}).value;
  const note = $('[data-prefill-note]', form);
  if ((filled || code) && note) {
    const parts = [];
    if (filled) parts.push('Vos choix du configurateur sont repris : vérifiez, complétez, envoyez.');
    if (code) parts.push(`Code ${code} ajouté.`);
    $('[data-prefill-text]', note).textContent = parts.join(' ');
    note.hidden = false;
    form.setAttribute('aria-describedby', 'form-intro form-prefilled');
    scope.timeout(() => announce(filled ? 'Formulaire pré-rempli avec les choix du configurateur.' : `Code ${code} ajouté au formulaire.`), 2600);
  }
}

/* ---------- Succès : le robot décolle avec le message -------------------- */

function showSuccess(scope, form, success, viaMail) {
  if (viaMail) {
    $('[data-success-title]', success).innerHTML = 'Votre messagerie <span class="accent">prend le relais</span>.';
    $('[data-success-text]', success).textContent = `Votre demande est pré-remplie dans un nouvel email : il ne reste qu’à cliquer sur « Envoyer ». Rien ne s’est ouvert ? Écrivez-nous à ${CONFIG.EMAIL}.`;
  }
  form.hidden = true;
  success.hidden = false;
  resizeScroll();
  scrollTo(success, { offset: stickyOffset(form), immediate: true });
  success.focus({ preventScroll: true });
  announce(viaMail ? 'Votre client mail s’ouvre avec la demande pré-remplie.' : 'Message envoyé. Nous revenons vers vous sous 24 heures ouvrées.', 'assertive');
  if (env.reducedMotion) return;
  scope.add(() => {
    const robotEl = $('.contact-success__robot', success);
    const planet = $('.contact-success__planet', success);
    const items = Array.from(success.children).filter((el) => !el.classList.contains('contact-success__visual'));
    gsap.timeline()
      .from(robotEl, { y: 120, autoAlpha: 0, duration: 1.1, ease: 'expo.out' }, 0)
      .from(planet, { scale: 0.4, autoAlpha: 0, duration: 1, ease: 'expo.out' }, 0.1)
      .from(items, { y: 24, autoAlpha: 0, stagger: 0.08, duration: 0.8, ease: 'expo.out', clearProps: 'transform,opacity,visibility' }, 0.25);
  });
}

/* ---------- Cycle de vie --------------------------------------------------- */

export default {
  init(scope, root) {
    initForm(scope, root);
    initCopy(scope, root);
  },
  destroy() {},
};
