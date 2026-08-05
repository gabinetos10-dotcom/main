/**
 * DESIGN.md — « Emojis en guise d'icônes » fait partie des interdits.
 *
 * Les emojis se rendent différemment sur chaque plateforme, ne s'alignent pas sur la grille
 * typographique et ne peuvent pas prendre la couleur d'un token. Les icônes viennent de Lucide.
 */

const EMOJI = /\p{Extended_Pictographic}/u;
const ALLOWED = new Set(['©', '®', '™']);

/** @type {import('eslint').Rule.RuleModule} */
export default {
  meta: {
    type: 'problem',
    docs: {
      description: "Interdit les emojis dans l'interface : les icônes viennent de Lucide.",
    },
    schema: [],
    messages: {
      emoji:
        "Emoji « {{value}} » dans l'interface. Utilise une icône Lucide (DESIGN.md § Interdits).",
    },
  },

  create(context) {
    /**
     * @param {import('estree').Node} node
     * @param {string} raw
     */
    function check(node, raw) {
      for (const character of raw) {
        if (EMOJI.test(character) && !ALLOWED.has(character)) {
          context.report({ node, messageId: 'emoji', data: { value: character } });
          return;
        }
      }
    }

    return {
      JSXText(node) {
        check(node, node.value);
      },
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
