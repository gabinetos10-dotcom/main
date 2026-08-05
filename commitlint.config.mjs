/**
 * Commits conventionnels, scopés par paquet quand c'est pertinent : `feat(blocks): ...`
 * Voir CLAUDE.md § Conventions.
 */
export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      ['feat', 'fix', 'chore', 'docs', 'test', 'refactor', 'perf', 'build', 'ci', 'revert'],
    ],
    'scope-enum': [
      2,
      'always',
      [
        '',
        'web',
        'sites',
        'worker',
        'db',
        'auth',
        'blocks',
        'renderer',
        'tokens',
        'ui',
        'templates',
        'emails',
        'config',
        'docker',
        'ci',
        'deps',
      ],
    ],
    'subject-case': [0],
    'header-max-length': [2, 'always', 100],
  },
};
