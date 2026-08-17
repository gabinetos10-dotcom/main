// <my-lightbox> — visionneuse plein écran, composant maison.

/*
 * Le contenu de ce composant vit dans un shadow root : il n'est pas atteignable
 * par un sélecteur CSS depuis le document principal, donc pas par un `domPath`.
 * Un parser qui prétendrait le rendre éditable produirait des champs impossibles
 * à résoudre au moment du build.
 */
class MyLightbox extends HTMLElement {
  connectedCallback() {
    const racine = this.attachShadow({ mode: 'open' });
    const source = this.getAttribute('data-source') || '';

    racine.innerHTML = `
      <style>
        :host { display: block; }
        .cadre {
          border: 1px solid rgba(231, 235, 240, .18);
          padding: 1rem;
        }
        img { width: 100%; display: block; cursor: zoom-in; }
        .legende {
          margin-top: .8rem;
          font-size: .82rem;
          opacity: .6;
          font-family: inherit;
        }
        dialog {
          border: 0;
          padding: 0;
          background: #0b0d11;
          max-width: 96vw;
          max-height: 96vh;
        }
        dialog::backdrop { background: rgba(11, 13, 17, .94); }
      </style>
      <div class="cadre">
        <img src="${source}" alt="Planche contact">
        <p class="legende"><slot name="legende">Planche contact</slot></p>
      </div>
      <dialog><img src="${source}" alt="Planche contact, plein écran"></dialog>
    `;

    const vignette = racine.querySelector('.cadre img');
    const modale = racine.querySelector('dialog');

    vignette.addEventListener('click', () => modale.showModal());
    modale.addEventListener('click', () => modale.close());
  }
}

customElements.define('my-lightbox', MyLightbox);
