import { describe, expect, test } from 'vitest';

import { activationDestination } from './activationDestination';

/**
 * These cases are written against the two decisions the destination rests on rather than against the
 * shape of the expression, so removing either condition fails a test that says why it was there.
 */
describe('activationDestination', () => {
    const classId = 'class-1';
    const schoolId = 'school-1';

    const moneySkillsRoute = `/class/${classId}/money-skills-auto-schedule`;
    const schoolOverviewRoute = `/school/${schoolId}`;

    const destinationFor = (input: { isSchoolLeader?: boolean | null; shouldOfferMoneySkills?: boolean | null }) =>
        activationDestination({ classId, schoolId, ...input });

    test('sends a school leader to the Money Skills page when the class can be offered it', () => {
        expect(destinationFor({ isSchoolLeader: true, shouldOfferMoneySkills: true })).toBe(moneySkillsRoute);
    });

    /**
     * Deliberately asserted even though no class can currently produce it: the only inactive class a
     * teacher can see sits in a future academic year, which the API refuses anyway. This pins the
     * intent for when that stops being true, since what it prevents is a silent Unauthorized rather
     * than a visible fault. See the note on isSchoolLeader.
     */
    test('sends a teacher to the school overview even when the class can be auto-scheduled', () => {
        expect(destinationFor({ isSchoolLeader: false, shouldOfferMoneySkills: true })).toBe(schoolOverviewRoute);
    });

    /**
     * Ready Teddy and full programme classes included. Accepted when this was agreed: they are offered
     * auto-scheduling from the class schedule page instead, and this journey belongs to Money Skills.
     */
    test('sends a leader to the school overview when the class cannot be offered Money Skills', () => {
        expect(destinationFor({ isSchoolLeader: true, shouldOfferMoneySkills: false })).toBe(schoolOverviewRoute);
    });

    /** Neither field is guaranteed to have arrived, and nothing known is not a reason to offer a page. */
    test('sends anyone to the school overview when nothing is known', () => {
        expect(destinationFor({})).toBe(schoolOverviewRoute);
    });
});
