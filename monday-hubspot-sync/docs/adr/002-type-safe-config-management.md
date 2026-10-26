# ADR 002: Type-Safe Configuration Management

**Date:** 2026-03-18 **Status:** Accepted **Tickets:** LWP-8971, LWP-8997

---

## Context

The monday-hubspot-sync service is a Cloudflare Worker that reads all runtime configuration from environment variables. Before this change, configuration was accessed directly via `process.env` scattered throughout the codebase:

```typescript
// Old pattern — repeated everywhere
const apiKey = process.env.MONDAY_API_KEY!;
const readOnly = process.env.READ_ONLY_MODE === 'true'; // silently false if unset
```

Problems with that approach:

-   **Silent misconfiguration**: a missing or misnamed environment variable would either silently use `undefined` or produce a runtime panic far from the source.
-   **No type coercion**: boolean and numeric environment variables required manual parsing at every call site, with no shared validation logic.
-   **Unsafe default for READ_ONLY_MODE**: the equality check `=== 'true'` defaults to `false` when the variable is unset, making an unintentional write to production data easy.
-   **Untestable**: functions that read `process.env` directly cannot be tested without mutating the global environment or using mocks.

---

## Decision

A dedicated `createConfig()` factory (`createConfigs.ts`) provides typed getters for each primitive type. `createAppConfig()` (`config.ts`) calls it once at startup and returns a structured `AppConfig` object that is passed via dependency injection to every function that needs configuration.

```typescript
// createConfigs.ts — single source of type coercion and validation
export const createConfig = (env: Partial<Record<string, string>>) => ({
    getBoolean: (key, fallback?) => { /* validates; throws MissingConfigKeyError or MistypedConfigKeyError */ },
    getInteger: (key, fallback?) => { /* … */ },
    getFloat:   (key, fallback?) => { /* … */ },
    getString:  (key, fallback?) => { /* … */ },
});

// config.ts — single call at startup
export const createAppConfig = (env: NodeJS.ProcessEnv) => {
    const cfg = createConfig(env);
    return {
        readOnlyMode: cfg.getBoolean('READ_ONLY_MODE', true), // safe default
        hubspot: { … },
        monday:  { … },
    };
};
```

Functions receive `appConfig: AppConfig` rather than reading from `process.env` themselves.

---

## Consequences

**Positive:**

-   **Fail-fast**: any missing required variable causes an immediate, descriptive error at startup rather than a silent runtime failure deep in business logic.
-   **Safe default for READ_ONLY_MODE**: defaults to `true`, so an unconfigured deployment cannot accidentally write to production data.
-   **Testability**: functions can be tested with any `AppConfig` value without touching `process.env`.
-   **Single source of truth**: all environment variable names live in `config.ts`; adding a new variable requires touching one file.
-   **Type safety**: `AppConfig` is inferred from `ReturnType<typeof createAppConfig>`, so TypeScript catches missing fields at compile time.

**Negative / Trade-offs:**

-   Slightly more boilerplate when adding new config values (one entry in `config.ts`, one env var).
-   All callsites must accept `appConfig` as a parameter — this was a broad refactor but is now consistent.
-   Validation is fail-on-first rather than collect-all-errors; a deployment with several missing variables requires multiple restart cycles to discover them all. This is a known limitation and an acceptable trade-off given startup errors are immediately visible in logs.
