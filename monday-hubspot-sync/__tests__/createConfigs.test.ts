import { createConfig } from '../createConfigs';

describe('createConfig', () => {
    describe('getBoolean', () => {
        it('throws MissingConfigKeyError when key is absent and no fallback given', () => {
            const cfg = createConfig({});
            expect(() => cfg.getBoolean('MISSING_KEY')).toThrow(
                'Missing config key: MISSING_KEY; expected: boolean',
            );
        });

        it('thrown error has name MissingConfigKeyError', () => {
            const cfg = createConfig({});
            try {
                cfg.getBoolean('MISSING_KEY');
                fail('expected to throw');
            } catch (err) {
                expect((err as Error).name).toBe('MissingConfigKeyError');
                expect(err).toBeInstanceOf(Error);
            }
        });

        it('returns fallback when key is absent', () => {
            const cfg = createConfig({});
            expect(cfg.getBoolean('MISSING_KEY', true)).toBe(true);
            expect(cfg.getBoolean('MISSING_KEY', false)).toBe(false);
        });

        it('throws MistypedConfigKeyError for an unrecognised boolean string', () => {
            const cfg = createConfig({ MY_BOOL: 'maybe' });
            expect(() => cfg.getBoolean('MY_BOOL')).toThrow(
                'Mistyped config key: MY_BOOL; expected: boolean; found: maybe',
            );
        });

        it('thrown MistypedConfigKeyError has correct name', () => {
            const cfg = createConfig({ MY_BOOL: 'maybe' });
            try {
                cfg.getBoolean('MY_BOOL');
                fail('expected to throw');
            } catch (err) {
                expect((err as Error).name).toBe('MistypedConfigKeyError');
                expect(err).toBeInstanceOf(Error);
            }
        });

        it.each([
            ['1', true],
            ['0', false],
            ['true', true],
            ['false', false],
            ['True', true],
            ['False', false],
            ['TRUE', true],
            ['FALSE', false],
            ['t', true],
            ['f', false],
            ['yes', true],
            ['no', false],
            ['YES', true],
            ['NO', false],
            ['y', true],
            ['n', false],
            ['on', true],
            ['off', false],
            ['ON', true],
            ['OFF', false],
        ])('parses "%s" as %s', (raw, expected) => {
            const cfg = createConfig({ MY_BOOL: raw });
            expect(cfg.getBoolean('MY_BOOL')).toBe(expected);
        });

        it('trims whitespace before parsing', () => {
            const cfg = createConfig({ MY_BOOL: '  true  ' });
            expect(cfg.getBoolean('MY_BOOL')).toBe(true);
        });
    });

    describe('getInteger', () => {
        it('throws MissingConfigKeyError when key is absent and no fallback given', () => {
            const cfg = createConfig({});
            expect(() => cfg.getInteger('MISSING_KEY')).toThrow(
                'Missing config key: MISSING_KEY; expected: integer',
            );
        });

        it('returns fallback when key is absent', () => {
            const cfg = createConfig({});
            expect(cfg.getInteger('MISSING_KEY', 42)).toBe(42);
        });

        it('throws MistypedConfigKeyError when fallback is not a safe integer', () => {
            const cfg = createConfig({});
            expect(() => cfg.getInteger('MISSING_KEY', 1.5)).toThrow(
                'Mistyped config key: MISSING_KEY; expected: integer; found: 1.5',
            );
        });

        it('throws MistypedConfigKeyError for a non-integer string', () => {
            const cfg = createConfig({ MY_INT: 'abc' });
            expect(() => cfg.getInteger('MY_INT')).toThrow(
                'Mistyped config key: MY_INT; expected: integer; found: abc',
            );
        });

        it('throws MistypedConfigKeyError for a float string', () => {
            const cfg = createConfig({ MY_INT: '3.14' });
            expect(() => cfg.getInteger('MY_INT')).toThrow('Mistyped config key: MY_INT; expected: integer');
        });

        it('parses a decimal integer string', () => {
            const cfg = createConfig({ MY_INT: '123' });
            expect(cfg.getInteger('MY_INT')).toBe(123);
        });

        it('parses a hex string (0x prefix)', () => {
            const cfg = createConfig({ MY_INT: '0xff' });
            expect(cfg.getInteger('MY_INT')).toBe(255);
        });

        it('parses an octal string (0o prefix)', () => {
            const cfg = createConfig({ MY_INT: '0o10' });
            expect(cfg.getInteger('MY_INT')).toBe(8);
        });

        it('parses a binary string (0b prefix)', () => {
            const cfg = createConfig({ MY_INT: '0b1010' });
            expect(cfg.getInteger('MY_INT')).toBe(10);
        });
    });

    describe('getFloat', () => {
        it('throws MissingConfigKeyError when key is absent and no fallback given', () => {
            const cfg = createConfig({});
            expect(() => cfg.getFloat('MISSING_KEY')).toThrow(
                'Missing config key: MISSING_KEY; expected: float',
            );
        });

        it('returns fallback when key is absent', () => {
            const cfg = createConfig({});
            expect(cfg.getFloat('MISSING_KEY', 3.14)).toBe(3.14);
        });

        it('throws MistypedConfigKeyError when fallback is NaN', () => {
            const cfg = createConfig({});
            expect(() => cfg.getFloat('MISSING_KEY', NaN)).toThrow(
                'Mistyped config key: MISSING_KEY; expected: float',
            );
        });

        it('throws MistypedConfigKeyError for a non-numeric string', () => {
            const cfg = createConfig({ MY_FLOAT: 'not-a-number' });
            expect(() => cfg.getFloat('MY_FLOAT')).toThrow(
                'Mistyped config key: MY_FLOAT; expected: float; found: not-a-number',
            );
        });

        it('parses a float string', () => {
            const cfg = createConfig({ MY_FLOAT: '2.718' });
            expect(cfg.getFloat('MY_FLOAT')).toBeCloseTo(2.718);
        });

        it('parses an integer string as a float', () => {
            const cfg = createConfig({ MY_FLOAT: '10' });
            expect(cfg.getFloat('MY_FLOAT')).toBe(10);
        });
    });

    describe('getString', () => {
        it('throws MissingConfigKeyError when key is undefined and no fallback given', () => {
            const cfg = createConfig({});
            expect(() => cfg.getString('MISSING_KEY')).toThrow(
                'Missing config key: MISSING_KEY; expected: string',
            );
        });

        it('returns fallback when key is absent', () => {
            const cfg = createConfig({});
            expect(cfg.getString('MISSING_KEY', 'default')).toBe('default');
        });

        it('returns the value when key is present', () => {
            const cfg = createConfig({ MY_STR: 'hello' });
            expect(cfg.getString('MY_STR')).toBe('hello');
        });

        it('returns empty string when key is explicitly set to empty string', () => {
            // An empty string is a valid value (key exists), not a missing key
            const cfg = createConfig({ MY_STR: '' });
            expect(cfg.getString('MY_STR')).toBe('');
        });

        it('returns fallback when key is explicitly set to empty string and fallback provided', () => {
            // getString uses getValue (not getTrimmedValue), so '' is still treated as present
            const cfg = createConfig({ MY_STR: '' });
            expect(cfg.getString('MY_STR', 'fallback')).toBe('');
        });
    });
});
