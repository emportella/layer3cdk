module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/bin'],
  testMatch: ['**/*.spec.ts'],
  transform: {
    '^.+\\.tsx?$': 'ts-jest',
  },
};
