export const createConfig = (env: Partial<Record<string, string>>) => {
    const getValue = (key: string) => env[key];

    const getTrimmedValue = (key: string) => getValue(key)?.trim();

    return {
        getBoolean: (key: string, fallback?: boolean) => {
            const raw = getTrimmedValue(key);
            if (!raw) {
                if (fallback === undefined) {
                    throw new MissingConfigKeyError(key, 'boolean');
                }
                return fallback;
            }
            const parsed = booleanStrings[raw.toLowerCase()];
            if (parsed === undefined) {
                throw new MistypedConfigKeyError(key, 'boolean', raw);
            }
            return parsed;
        },

        getFloat: (key: string, fallback?: number) => {
            const raw = getTrimmedValue(key);
            if (!raw) {
                if (fallback === undefined) {
                    throw new MissingConfigKeyError(key, 'float');
                }
                if (isNaN(fallback)) {
                    throw new MistypedConfigKeyError(key, 'float', fallback);
                }
                return fallback;
            }
            const parsed = parseFloat(raw);
            if (isNaN(parsed)) {
                throw new MistypedConfigKeyError(key, 'float', raw);
            }
            return parsed;
        },

        getInteger: (key: string, fallback?: number) => {
            const raw = getTrimmedValue(key);
            if (!raw) {
                if (fallback === undefined) {
                    throw new MissingConfigKeyError(key, 'integer');
                }
                if (!Number.isSafeInteger(fallback)) {
                    throw new MistypedConfigKeyError(key, 'integer', fallback);
                }
                return fallback;
            }
            const radix = raw.startsWith('0b')
                ? 2
                : raw.startsWith('0o')
                  ? 8
                  : raw.startsWith('0x')
                    ? 16
                    : 10;
            const parsed =
                radix === 10
                    ? parseFloat(raw)
                    : parseInt(raw.substring(2), radix);
            if (!Number.isSafeInteger(parsed)) {
                throw new MistypedConfigKeyError(key, 'integer', raw);
            }
            return parsed;
        },

        getString: (key: string, fallback?: string) => {
            const value = getValue(key);
            if (value === undefined) {
                if (fallback === undefined) {
                    throw new MissingConfigKeyError(key, 'string');
                }
                return fallback;
            }
            return value;
        },
    };
};

const booleanStrings: Partial<Record<string, boolean>> = {
    '1': true,
    '0': false,
    true: true,
    false: false,
    t: true,
    f: false,
    yes: true,
    no: false,
    y: true,
    n: false,
    on: true,
    off: false,
};

class MissingConfigKeyError extends Error {
    constructor(key: string, type: 'boolean' | 'float' | 'integer' | 'string') {
        super(`Missing config key: ${key}; expected: ${type}`);
        Object.setPrototypeOf(this, MissingConfigKeyError.prototype);
        this.name = 'MissingConfigKeyError';
    }
}

class MistypedConfigKeyError extends Error {
    constructor(
        key: string,
        type: 'boolean' | 'float' | 'integer' | 'string',
        value: number | string,
    ) {
        super(
            `Mistyped config key: ${key}; expected: ${type}; found: ${value}`,
        );
        Object.setPrototypeOf(this, MistypedConfigKeyError.prototype);
        this.name = 'MistypedConfigKeyError';
    }
}