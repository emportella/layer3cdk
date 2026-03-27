module.exports = {
  maxWorkers: 2,
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  testEnvironment: 'node',
  collectCoverageFrom: ['**/*.(t|j)s'],
  coveragePathIgnorePatterns: ['index.ts'],
  coverageDirectory: '../coverage',
  coverageThreshold: {
    global: {
      statements: 75,
      branches: 75,
      functions: 60,
      lines: 75,
    },
  },
};
