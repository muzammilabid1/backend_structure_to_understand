const { createDefaultPreset } = require("ts-jest");

const tsJestTransformCfg = createDefaultPreset().transform;

/** @type {import("jest").Config} **/
module.exports = {
  testEnvironment: "node",
  transform: {
    ...tsJestTransformCfg,
    // jose@6 is ESM-only and this package compiles to CommonJS. Node 22 can
    // require() ESM, but jest's module registry cannot, so jose is transpiled
    // rather than left untransformed like the rest of node_modules.
    "^.+\\.js$": [
      "ts-jest",
      { tsconfig: { allowJs: true, module: "commonjs", target: "es2022" } },
    ],
  },
  transformIgnorePatterns: ["/node_modules/(?!jose/)"],
  // dist/ holds compiled copies of these specs; running them tests stale build output.
  testPathIgnorePatterns: ["/node_modules/", "/dist/"],
};
