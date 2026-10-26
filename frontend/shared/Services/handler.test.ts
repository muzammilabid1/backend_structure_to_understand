import { describe, test, expect } from 'vitest';

import moment from 'moment';

import { ReadingBookOptions } from 'lwp-shared';

import { showDate, getActivityComponentName, matchBooks, _getBase64ToFile } from './handler';

describe('showDate', () => {
    describe('when the `unknownDateSentinel` option is provided', () => {
        test.each([undefined, null, 0, ''])(`returns the empty string if the given date is falsy (%o)`, (givenDate) => {
            // arrange
            const sentinel = new Date('2000-01-01T00:00:00.000Z');

            // act
            const result = showDate({ date: givenDate, unknownDateSentinel: sentinel });

            // assert
            expect(result).toBe('');
        });

        test(`returns 'Unknown' if the given date matches the sentinel`, () => {
            // arrange
            const sentinel = new Date('2000-01-01T00:00:00.000Z');
            const givenDate = new Date(sentinel);

            // act
            const result = showDate({ date: givenDate, unknownDateSentinel: sentinel });

            // assert
            expect(result).toBe('Unknown');
        });

        test(`otherwise, it returns the date in the default format ('dddd DD MMMM')`, () => {
            // arrange
            const sentinel = new Date('2000-01-01T00:00:00.000Z');
            const givenDate = new Date('2025-01-01T00:00:00.000Z');

            // act
            const result = showDate({ date: givenDate, unknownDateSentinel: sentinel });

            // assert
            expect(result).toBe(moment(givenDate).format('dddd DD MMMM'));
        });
    });
});

describe('matchBooks', () => {
    const sameTitleTwice = [
        { bookName: 'the gruffalo', isBookFinished: true, pageNumber: null, readingType: ReadingBookOptions.SCHOOL_BOOK },
        { bookName: 'the gruffalo', isBookFinished: false, pageNumber: 12, readingType: ReadingBookOptions.OWN_BOOK },
        { bookName: 'peace at last', isBookFinished: false, pageNumber: 3, readingType: ReadingBookOptions.OWN_BOOK }
    ];

    test('offers a title once when no reading type narrows the pool', () => {
        const result = matchBooks(sameTitleTwice);

        expect(result.map((book) => book.bookName)).toEqual(['the gruffalo', 'peace at last']);
    });

    test('keeps the first row for a repeated title, which is the finished one', () => {
        const result = matchBooks(sameTitleTwice);

        expect(result[0].isBookFinished).toBe(true);
    });

    test('still partitions by reading type when one is given', () => {
        const result = matchBooks(sameTitleTwice, '', ReadingBookOptions.OWN_BOOK);

        expect(result.map((book) => book.bookName)).toEqual(['the gruffalo', 'peace at last']);
        expect(result[0].pageNumber).toBe(12);
    });

    test('offers a searched title once', () => {
        const result = matchBooks(sameTitleTwice, 'gruff');

        expect(result).toHaveLength(1);
    });
});

describe('getActivityComponentName', () => {
    test('returns null when details is null', () => {
        expect(getActivityComponentName(null)).toBeNull();
    });

    test('returns null when details is undefined', () => {
        expect(getActivityComponentName(undefined)).toBeNull();
    });

    test('returns null when details is an empty string', () => {
        expect(getActivityComponentName('')).toBeNull();
    });

    test('returns the activityComponentName from valid JSON', () => {
        // arrange
        const details = JSON.stringify({ activityComponentName: 'SomeComponent' });

        // act
        const result = getActivityComponentName(details);

        // assert
        expect(result).toBe('SomeComponent');
    });

    test('returns null when activityComponentName is absent from the JSON', () => {
        const result = getActivityComponentName(JSON.stringify({ other: 'value' }));
        expect(result).toBeNull();
    });

    test('returns null and does not throw when details is invalid JSON', () => {
        expect(() => getActivityComponentName('not-json')).not.toThrow();
        expect(getActivityComponentName('not-json')).toBeNull();
    });
});

describe('_getBase64ToFile', () => {
    test.each([
        ['application/msword', 'doc'],
        ['application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'docx'],
        ['application/vnd.ms-powerpoint', 'ppt'],
        ['application/vnd.openxmlformats-officedocument.presentationml.presentation', 'pptx'],
        ['application/pdf', 'pdf'],
        ['image/png', 'png'],
        ['image/jpeg', 'jpeg']
    ])('names a %s file with a .%s extension', (mime, extension) => {
        expect(_getBase64ToFile(`data:${mime};base64,aGk=`, 'resource', true).name).toBe(`resource.${extension}`);
    });
});
