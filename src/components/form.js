/* Contact form — mock but believable: inline validation with
   micro-interactions, loading + success states. Wire it to a real
   endpoint by replacing fakeSend(). */

const fakeSend = () => new Promise((r) => setTimeout(r, 1400));

export function initForm() {
  const form = document.getElementById('contact-form');
  if (!form) return;
  const success = form.querySelector('.form__success');

  const validators = {
    name: (v) => v.trim().length >= 2 || 'Two characters minimum. We believe in you.',
    email: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()) || 'That email looks… improbable.',
    message: (v) => v.trim().length >= 10 || 'Give us at least a sentence to dream on.',
  };

  const validateField = (input) => {
    const field = input.closest('.form__field');
    const err = field.querySelector('.form__error');
    const result = validators[input.name]?.(input.value) ?? true;
    const ok = result === true;
    field.classList.toggle('is-invalid', !ok);
    err.textContent = ok ? '' : result;
    return ok;
  };

  form.querySelectorAll('input, textarea').forEach((input) => {
    input.addEventListener('blur', () => { if (input.value) validateField(input); });
    input.addEventListener('input', () => {
      if (input.closest('.form__field').classList.contains('is-invalid')) validateField(input);
    });
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const inputs = [...form.querySelectorAll('input, textarea')];
    const allValid = inputs.map(validateField).every(Boolean);
    if (!allValid) {
      form.querySelector('.form__field.is-invalid input, .form__field.is-invalid textarea')?.focus();
      return;
    }
    form.classList.add('is-loading');
    await fakeSend(); // [EDIT] replace with a real POST
    form.classList.remove('is-loading');
    form.classList.add('is-sent');
    success.textContent = '✦ RECEIVED. WE\'RE ALREADY SKETCHING. TALK SOON.';
    form.reset();
  });
}
