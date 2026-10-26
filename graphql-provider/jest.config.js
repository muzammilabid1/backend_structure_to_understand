/** @type {import('ts-jest').JestConfigWithTsJest} */
const baseConfig = {
    maxWorkers: process.env.CI || process.env.GITHUB_ACTIONS ? '100%' : '25%',
    moduleNameMapper: {
        '^src/(.*)$': '<rootDir>/src/$1'
    },
    modulePaths: ['<rootDir>'],
    preset: 'ts-jest',
    testEnvironment: 'node',
    testPathIgnorePatterns: ['<rootDir>/node_modules/'],
    transform: {
        '^.+\\.(ts|tsx)?$': 'ts-jest',
        '^.+\\.(js|jsx)$': 'babel-jest'
    },
    transformIgnorePatterns: ['/node_modules/(?!mock-jwks)']
};

module.exports = {
    ...baseConfig,
    testMatch: ['<rootDir>/src/**/?(*.)+(spec|test).[jt]s'] // only unit tests
};
