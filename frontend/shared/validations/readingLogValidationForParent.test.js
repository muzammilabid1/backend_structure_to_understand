import { ReadingMode } from 'lwp-shared';
import { describe, expect, test } from 'vitest';

import { readingLogValidationForParent } from './index';

const entry = (overrides = {}) => ({
    readingMode: ReadingMode.READ_ALOUD,
    readingType: 'SCHOOL_BOOK',
    bookName: 'The Snail and the Whale',
    finishedBook: true,
    readDate: '2026-08-11',
    thoughts: { comment: 'We read it twice.' },
    comments: 'We read it twice.',
    ...overrides
});

const validate = (values, options) => {
    try {
        readingLogValidationForParent(false, false, options).validateSync(values, { abortEarly: false });

        return [];
    } catch (error) {
        return error.errors ?? [error.message];
    }
};

describe('readingLogValidationForParent', () => {
    test('accepts an entry that has a day', () => {
        expect(validate(entry())).not.toContain('Please choose which day this reading was on.');
    });

    test('refuses an entry with no day, rather than letting the API reject it', () => {
        expect(validate(entry({ readDate: '' }))).toContain('Please choose which day this reading was on.');
    });

    test('does not ask for a day when editing, which never sets one', () => {
        expect(validate(entry({ readDate: undefined }), { requireReadDate: false })).not.toContain(
            'Please choose which day this reading was on.'
        );
    });

    test('asks what you are reading', () => {
        expect(validate(entry({ readingType: null }))).toContain('Please choose what you are reading.');
    });

    test('does not ask what you are reading when the child read in the real world', () => {
        expect(validate(entry({ readingType: null, readingMode: ReadingMode.READ_IN_REAL_WORLD }))).not.toContain(
            'Please choose what you are reading.'
        );
    });
});
