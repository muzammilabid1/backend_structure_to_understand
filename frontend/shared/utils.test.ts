import titleize from 'titleizejs';
import { describe, expect, test } from 'vitest';

import { FALLBACK_BOOK_NAME, safeTitleise } from './utils';

describe('FALLBACK_BOOK_NAME', () => {
    test('has a sensible value', () => {
        expect(FALLBACK_BOOK_NAME).toBe('Untitled book');
    });
});

describe('safeTitleise', () => {
    test.each([undefined, null, true, false, 0, 42, {}, [], Symbol()])('returns FALLBACK_BOOK_NAME for invalid input types', (input) => {
        const output = safeTitleise(input);
        expect(output).toBe(FALLBACK_BOOK_NAME);
    });

    test.each(['', ' ', '   '])('returns FALLBACK_BOOK_NAME for empty or whitespace-only strings', (input) => {
        const output = safeTitleise(input);
        expect(output).toBe(FALLBACK_BOOK_NAME);
    });

    test.each`
        input                               | expected
        ${'some-book'}                      | ${'Some-Book'}
        ${'some-book-with-lots-of-hyphens'} | ${'Some-Book-With-Lots-Of-Hyphens'}
    `('preserves ordinary hyphens', ({ input, expected }: { input: string; expected: string }) => {
        const output = safeTitleise(input);
        expect(output).toBe(expected);
    });

    test.each`
        input                                 | expected
        ${'the exagger-tron- orb level 7'}    | ${'The Exagger-Tron — Orb Level 7'}
        ${'the exagger-tron -orb level 7'}    | ${'The Exagger-Tron — Orb Level 7'}
        ${'the exagger-tron - orb level 7'}   | ${'The Exagger-Tron — Orb Level 7'}
        ${'the exagger-tron  -  orb level 7'} | ${'The Exagger-Tron — Orb Level 7'}
    `('replaces hyphens with em dashes where appropriate', ({ input, expected }: { input: string; expected: string }) => {
        const output = safeTitleise(input);
        expect(output).toBe(expected);
    });

    test.each`
        input             | expected
        ${'a-b-'}         | ${'A-B' /* redundant trailing hyphen stripped */}
        ${'a-b- '}        | ${'A-B' /* redundant trailing hyphen stripped */}
        ${'a-b- c'}       | ${'A-B — C' /* medial hyphen with whitespace on one side replaced with em dash */}
        ${'a-b- c-'}      | ${'A-B — C' /* medial hyphen with whitespace on one side replaced with em dash */}
        ${'-a-b-a -b- c'} | ${'A-B-A — B — C'}
    `(
        'handles complex hyphenated strings that would otherwise cause titleize to throw',
        ({ input, expected }: { input: string; expected: string }) => {
            expect(() => titleize(input)).toThrowError();
            const output = safeTitleise(input);
            expect(output).toBe(expected);
        }
    );
});
