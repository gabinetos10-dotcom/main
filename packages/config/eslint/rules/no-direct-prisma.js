/**
 * ADR-007 — Aucun accès Prisma direct hors `packages/db`.
 *
 * Une requête non scopée par organisation est une fuite de données inter-tenants. La revue humaine
 * ne l'attrape pas de manière fiable : cette règle, si.
 */

const FORBIDDEN = [/^@prisma\/client$/, /^\.prisma\/client/, /^@atelier\/db\/client$/];

/** @type {import('eslint').Rule.RuleModule} */
export default {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Interdit les imports du client Prisma hors de packages/db : tout passe par guards.ts (ADR-007).',
    },
    schema: [],
    messages: {
      forbidden:
        "Import interdit de « {{source}} ». L'accès aux données passe par les helpers de @atelier/db (guards.ts), qui vérifient l'organisation et le rôle (ADR-007).",
    },
  },

  create(context) {
    /**
     * @param {import('estree').Node} node
     * @param {string} source
     */
    function report(node, source) {
      if (FORBIDDEN.some((pattern) => pattern.test(source))) {
        context.report({ node, messageId: 'forbidden', data: { source } });
      }
    }

    return {
      ImportDeclaration(node) {
        report(node, String(node.source.value));
      },
      ImportExpression(node) {
        if (node.source.type === 'Literal' && typeof node.source.value === 'string') {
          report(node, node.source.value);
        }
      },
      CallExpression(node) {
        if (
          node.callee.type === 'Identifier' &&
          node.callee.name === 'require' &&
          node.arguments[0]?.type === 'Literal' &&
          typeof node.arguments[0].value === 'string'
        ) {
          report(node, node.arguments[0].value);
        }
      },
    };
  },
};
