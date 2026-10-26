const baseConfig = require('./jest.config');

module.exports = {
    ...baseConfig,
    testMatch: ['<rootDir>/src/**/*.functional-test.[tj]s'],
    verbose: true
};
