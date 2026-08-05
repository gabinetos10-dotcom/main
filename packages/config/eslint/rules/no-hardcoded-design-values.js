/**
 * ADR-003 — Les blocks ne consomment que des tokens.
 *
 * Interdit les valeurs de design écrites en dur (couleurs hexadécimales, rgb()/hsl(), classes
 * Tailwind à valeur arbitraire). Sans cette règle, un `#0D0C0B` finit toujours par se glisser dans
 * un composant, et le changement de thème d'un client ne le repeint pas — un bug invisible en
 * revue, visible en production.
 */

const HEX_COLOR = /#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})\b/;
const FUNCTIONAL_COLOR = /\b(?:rgba?|hsla?|oklch|lab)\(\s*[\d.]/;
const ARBITRARY_TAILWIND = /\b(?:bg|text|border|ring|fill|stroke|shadow|from|via|to)-\[[^\]]+\]/;

/** @type {import('eslint').Rule.RuleModule} */
export default {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Interdit les valeurs de design en dur : tout passe par les design tokens (ADR-003).',
    },
    schema: [
      {
        type: 'object',
        properties: {
          /** Fichiers où les valeurs brutes sont légitimes (définition des tokens eux-mêmes). */
          allowIn: { type: 'array', items: { type: 'string' } },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      hardcodedColor:
        'Couleur en dur « {{value}} ». Utilise un design token (ADR-003) : var(--site-*) dans un block, var(--ui-*) dans le back-office.',
      arbitraryUtility:
        'Classe Tailwind à valeur arbitraire « {{value}} ». Passe par un token (ADR-003).',
    },
  },

  create(context) {
    const [{ allowIn = [] } = {}] = context.options;
    const filename = context.filename ?? context.getFilename();
    if (allowIn.some((fragment) => filename.includes(fragment))) {
      return {};
    }

    /**
     * @param {import('estree').Node} node
     * @param {string} raw
     */
    function check(node, raw) {
      // L'utilitaire arbitraire est testé en premier : `bg-[#0D0C0B]` contient une couleur en dur,
      // mais c'est la classe qu'il faut nommer à l'auteur pour qu'il sache quoi corriger.
      const arbitrary = ARBITRARY_TAILWIND.exec(raw);
      if (arbitrary) {
        context.report({ node, messageId: 'arbitraryUtility', data: { value: arbitrary[0] } });
        return;
      }
      const hex = HEX_COLOR.exec(raw);
      if (hex) {
        context.report({ node, messageId: 'hardcodedColor', data: { value: hex[0] } });
        return;
      }
      const functional = FUNCTIONAL_COLOR.exec(raw);
      if (functional) {
        context.report({ node, messageId: 'hardcodedColor', data: { value: functional[0] } });
      }
    }

    return {
      Literal(node) {
        if (typeof node.value === 'string') {
          check(node, node.value);
        }
      },
      TemplateElement(node) {
        check(node, node.value.raw);
      },
    };
  },
};
