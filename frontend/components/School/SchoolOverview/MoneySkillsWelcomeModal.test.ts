import moment from 'moment';
import { describe, expect, it } from 'vitest';

import { isWelcomeSeenThisYear } from './MoneySkillsWelcomeModal';

const now = moment('2026-10-06T12:00:00Z');
const yearStart = '2026-09-01T00:00:00Z';

describe('isWelcomeSeenThisYear', () => {
    it('is false for a leader who has never seen it', () => {
        expect(isWelcomeSeenThisYear(null, yearStart, now)).toBe(false);
        expect(isWelcomeSeenThisYear(undefined, yearStart, now)).toBe(false);
    });

    it('is false when they last saw it before this academic year began', () => {
        expect(isWelcomeSeenThisYear('2025-10-01T09:00:00Z', yearStart, now)).toBe(false);
    });

    it('is true when they saw it after this academic year began', () => {
        expect(isWelcomeSeenThisYear('2026-09-15T09:00:00Z', yearStart, now)).toBe(true);
    });

    it('is true when they saw it at the very start of the year', () => {
        expect(isWelcomeSeenThisYear(yearStart, yearStart, now)).toBe(true);
    });

    it('is true for any sighting when the year has no start date', () => {
        expect(isWelcomeSeenThisYear('2025-10-01T09:00:00Z', null, now)).toBe(true);
    });

    it('is true for any sighting when the year has not started yet, so a school moved on early is not shown it again', () => {
        expect(isWelcomeSeenThisYear('2025-10-01T09:00:00Z', '2026-11-01T00:00:00Z', now)).toBe(true);
    });
});
