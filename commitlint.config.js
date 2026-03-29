module.exports = {
  extends: ['@commitlint/config-conventional'],
  parserPreset: {
    parserOpts: {
      // Matches: "<branch> <type>(<scope>): <subject>"
      // The branch name is captured but ignored by commitlint's type/scope/subject parsing
      headerPattern: /^\S+ (\w+)(?:\(([^)]*)\))?:\s(.+)$/,
      headerCorrespondence: ['type', 'scope', 'subject'],
    },
  },
  plugins: [
    {
      rules: {
        'branch-prefix': (parsed, _when, _value) => {
          const header = (parsed.header || '').trim();
          const hasBranchPrefix = /^\S+ \w+(\([^)]*\))?:\s.+$/.test(header);
          return [
            hasBranchPrefix,
            'commit message must start with branch name (added by prepare-commit-msg hook)',
          ];
        },
      },
    },
  ],
  rules: {
    'branch-prefix': [2, 'always'],
    'subject-case': [0],
  },
};
