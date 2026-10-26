/* Automatic creation of unmatched imported pupils and classes.
 *
 * With the ignore option withheld, a row with no candidate link could only ever say "create new" -
 * so the review makes that choice itself (AUTO_SELECTED links) and the leader only ever sees rows
 * with a real decision to take. These tests pin the two halves of that:
 *
 *   - a school whose MIS data is entirely new completes the whole import on the sync click,
 *     with every pupil and class created and placed, and no review screen ever shown;
 *   - a row that does have a candidate still stops the import and waits for the leader, and
 *     nothing is created until both linking steps are done - no real (possibly duplicate)
 *     pupils may sit on the platform mid-review for teachers to act on.
 *
 * The Wonde pull itself cannot run against a local stack, so the sync is faked the same way the
 * other ImportLinkingSystem specs fake it: the imported (MIS) rows are seeded up front and the
 * resyncWondeData request is intercepted into the review state machine.
 */
import type { Schema } from '@lwp/postgres-client';
import { expect, test } from '@playwright/test';
import { type Kysely } from 'kysely';
import { ImportStatus } from 'lwp-shared';

import { generateFirstName, generateLastName, generateUPN, password } from '../constants';
import { createDb } from '../db';
import { getTokenFromLogin, reimportCachedData, updateClassLinkRequests, updatePupilLinkRequests } from '../graphql';
import { acceptFeatureTooltipPrompt, login, openSideDrawer, waitForLoading } from '../utils';
import { adminAccessToken, createReadyTeddyFixtures, type Fixtures } from './readyTeddyWondeFixtures';

const db: Kysely<Schema.DB> = createDb();
const rt = createReadyTeddyFixtures(db);

test.describe('Import review auto-creates unmatched pupils and classes', () => {
    test.afterAll(async () => {
        await db.destroy();
    });

    /* A pupil the school has never held: random identity, and a date of birth shared with no
     * fixture pupil, so the matcher can propose nothing for them. */
    const seedBrandNewStudent = async (fixtures: Fixtures, dateOfBirth: string) =>
        await rt.seedImportedStudent(fixtures, {
            forename: generateFirstName(),
            surname: generateLastName(),
            UPN: generateUPN(),
            dateOfBirth
        });

    const pupilLinks = async (importedPupilId: string) =>
        await db
            .selectFrom('imported_school_data_proposed_link')
            .where('entityType', '=', 'PUPIL')
            .where('importedEntityId', '=', importedPupilId)
            .select(['platformEntityId', 'status'])
            .execute();

    const createdPupilFor = async (importedPupilId: string) =>
        await db.selectFrom('lwp_pupil').where('importedStudentId', '=', importedPupilId).select(['id', 'schoolId']).executeTakeFirst();

    test('a school of brand-new pupils and a brand-new class: the sync click finishes the import with no review screens', async ({
        page
    }) => {
        const fixtures = await rt.seedSchool({ tagged: false });
        const newClassName = 'Reception Cherry';

        try {
            /* Nothing in the MIS matches the platform: a class name the school does not hold, full
             * of pupils it has never held. Before this change the leader was walked through a pupil
             * screen and a class screen whose every row could only say "create new". */
            const importedClass = await rt.utils.createImportedClass(fixtures.importedSchoolId, {
                id: `rtac${Date.now().toString(36)}`,
                name: newClassName,
                importedFrom: 'WONDE',
                periodIndex: fixtures.newPeriodIndex
            });

            const newStudents = [await seedBrandNewStudent(fixtures, '2022-06-15'), await seedBrandNewStudent(fixtures, '2022-06-16')];

            for (const student of newStudents) {
                await rt.utils.addStudentToImportedClass(importedClass.id, student.id);
            }

            await rt.rollOverSchool(fixtures);
            await rt.interceptWondeSync(page, fixtures);

            await login(page, fixtures.leaderEmail, password);
            await page.waitForURL(/\/school/);
            await waitForLoading(page);
            await expect(page.getByTestId('school-overview-page')).toBeVisible();
            await acceptFeatureTooltipPrompt(page);

            await expect(page.getByText('No data for current academic year')).toBeVisible();
            await page.getByRole('button', { name: 'Sync with Wonde' }).click();
            await waitForLoading(page);

            // The whole review completed on the click: no banner, no review entry, nothing to check.
            const school = await db
                .selectFrom('lwp_school')
                .where('id', '=', fixtures.schoolId)
                .select('importStatus')
                .executeTakeFirstOrThrow();

            expect(school.importStatus).toBe(ImportStatus.COMPLETE);

            await page.goto(`/school/${fixtures.schoolId}`);
            await waitForLoading(page);
            await expect(page.getByTestId('school-overview-page')).toBeVisible();
            await expect(page.locator('.school-imported-data-sync')).toHaveCount(0);
            await openSideDrawer(page);
            await expect(page.getByTestId('sidebar-data-changes-review-btn')).toHaveCount(0);

            /* Every new pupil was created, and each create is recorded as the system's own choice.
             * The link's pupil id is deliberately not compared with the surviving pupil's: the
             * legacy relink that runs as the review completes deletes a parentless imported-linked
             * pupil and recreates it under a new id (it always has - leader-clicked creates went
             * through the same cycle), so the durable facts are the pupil existing for the imported
             * student and the AUTO_SELECTED decision being on record. */
            for (const student of newStudents) {
                const created = await createdPupilFor(student.id);

                expect(created, `a platform pupil should exist for ${student.forename}`).toBeDefined();
                expect(created?.schoolId).toBe(fixtures.schoolId);

                const links = await pupilLinks(student.id);

                expect(links).toHaveLength(1);
                expect(links[0].status).toBe('AUTO_SELECTED');
            }

            // The class was created as this year's registration class, also automatically.
            const createdClass = await db
                .selectFrom('lwp_school_class')
                .where('schoolId', '=', fixtures.schoolId)
                .where('name', '=', newClassName)
                .select(['id', 'isRegistrationClass', 'importedSchoolClassId', 'periodIndex'])
                .executeTakeFirstOrThrow();

            expect(createdClass.isRegistrationClass).toBe(true);
            expect(createdClass.importedSchoolClassId).toBe(importedClass.id);
            expect(createdClass.periodIndex).toBe(fixtures.newPeriodIndex);

            const classLinks = await db
                .selectFrom('imported_school_data_proposed_link')
                .where('entityType', '=', 'CLASS')
                .where('importedEntityId', '=', importedClass.id)
                .select(['platformEntityId', 'status'])
                .execute();

            expect(classLinks).toHaveLength(1);
            expect(classLinks[0].status).toBe('AUTO_SELECTED');
            expect(String(classLinks[0].platformEntityId)).toBe(String(createdClass.id));

            /* The relink that runs as the review completes placed the created pupils into the
             * created class - the leader is never left with new pupils in no class. */
            const placedPupils = await db
                .selectFrom('lwp_class_pupil')
                .where('lwpSchoolClassId', '=', createdClass.id)
                .select('lwpPupilId')
                .execute();

            expect(placedPupils).toHaveLength(newStudents.length);
        } finally {
            await rt.cleanup(fixtures);
        }
    });

    /* Automatic creation must never swallow a real decision: a row with a candidate still stops
     * the import at the pupil step. The candidate-less row is NOT created while the review is
     * open - no real pupil may sit on the platform mid-review for teachers to act on - and is
     * created the moment the last decision completes the linking steps. Driven through the API -
     * what the leader sees on the screen is covered by the multi-form journey. */
    test('a row with a candidate still waits for the leader; candidate-less rows are created only when linking completes', async () => {
        const fixtures = await rt.seedSchool({ tagged: false });

        try {
            const [, , partialPupil] = fixtures.pupils;

            const importedClass = await rt.utils.createImportedClass(fixtures.importedSchoolId, {
                id: `rtac${Date.now().toString(36)}`,
                name: fixtures.className,
                importedFrom: 'WONDE',
                periodIndex: fixtures.newPeriodIndex
            });

            // Shares a name with a platform pupil but disagrees on identity: a genuine question.
            const partialStudent = await rt.seedImportedStudent(fixtures, {
                forename: partialPupil.firstname,
                surname: partialPupil.lastname,
                UPN: generateUPN(),
                dateOfBirth: '2022-01-01'
            });
            const newStudent = await seedBrandNewStudent(fixtures, '2022-06-17');

            for (const student of [partialStudent, newStudent]) {
                await rt.utils.addStudentToImportedClass(importedClass.id, student.id);
            }

            await rt.rollOverSchool(fixtures);

            await db
                .updateTable('lwp_school')
                .set({ importStatus: ImportStatus.DATA_IMPORTED, lastImportedAt: new Date() })
                .where('id', '=', fixtures.schoolId)
                .execute();
            await reimportCachedData(await adminAccessToken(), fixtures.importedSchoolId, fixtures.schoolId);

            // The candidate row parked the import at the pupil step...
            const school = await db
                .selectFrom('lwp_school')
                .where('id', '=', fixtures.schoolId)
                .select('importStatus')
                .executeTakeFirstOrThrow();

            expect(school.importStatus).toBe(ImportStatus.LINKING_PUPILS);

            const partialLinks = await pupilLinks(partialStudent.id);

            expect(partialLinks).toHaveLength(1);
            expect(partialLinks[0].status).toBe('PENDING');
            expect(String(partialLinks[0].platformEntityId)).toBe(String(partialPupil.id));

            // ...and no record was created behind the leader's back for the row they must decide.
            expect(await createdPupilFor(partialStudent.id)).toBeUndefined();

            /* The candidate-less row is not created either while the review is open: a real pupil
             * on the platform mid-review is something teachers can act on (invite parents), and it
             * may duplicate a stale record the completion relink is about to replace. */
            expect(await createdPupilFor(newStudent.id)).toBeUndefined();
            expect(await pupilLinks(newStudent.id)).toHaveLength(0);

            // The last decision (linking the candidate row) completes the review...
            const { accessToken: leaderToken } = await getTokenFromLogin(fixtures.leaderEmail, password);
            const afterLinking = await updatePupilLinkRequests(leaderToken, fixtures.importedSchoolId, [
                { importedStudentId: partialStudent.id, platformPupilId: String(partialPupil.id), action: 'LINK' }
            ]);

            expect(afterLinking.importStatus).toBe(ImportStatus.COMPLETE);

            // ...and only now is the candidate-less row created and linked.
            const created = await createdPupilFor(newStudent.id);

            expect(created).toBeDefined();

            const newLinks = await pupilLinks(newStudent.id);

            expect(newLinks).toHaveLength(1);
            expect(newLinks[0].status).toBe('AUTO_SELECTED');
        } finally {
            await rt.cleanup(fixtures);
        }
    });

    /* "No existing pupil" / "create new" is an implicit create: the mutation only rejects the
     * candidates, the pending-links-only gate lets the phase advance, and the sweeps build the
     * record once BOTH linking gates have passed. This test walks that shape end to end as the
     * LAST decision at each step - the exact case that once wedged the review open in
     * LINKING_PUPILS with an empty screen - and checks nothing real exists mid-review. */
    test('the leader answering the last open row with "create new" completes the phase instead of wedging', async () => {
        const fixtures = await rt.seedSchool({ tagged: false });

        try {
            const [, , partialPupil] = fixtures.pupils;
            const contestedClassName = 'Reception Damson';

            // A platform class in the new period sharing the imported class's name: a class candidate.
            const candidateClass = await rt.utils.createClass(fixtures.schoolId, {
                name: contestedClassName,
                isRegistrationClass: true,
                periodIndex: fixtures.newPeriodIndex,
                mainTeacherId: fixtures.leaderId,
                logCreatedById: fixtures.leaderId
            });

            const importedClass = await rt.utils.createImportedClass(fixtures.importedSchoolId, {
                id: `rtac${Date.now().toString(36)}`,
                name: contestedClassName,
                importedFrom: 'WONDE',
                periodIndex: fixtures.newPeriodIndex
            });

            // A pupil candidate: shares a name with a platform pupil but disagrees on identity.
            const partialStudent = await rt.seedImportedStudent(fixtures, {
                forename: partialPupil.firstname,
                surname: partialPupil.lastname,
                UPN: generateUPN(),
                dateOfBirth: '2022-01-01'
            });

            await rt.utils.addStudentToImportedClass(importedClass.id, partialStudent.id);

            await rt.rollOverSchool(fixtures);

            await db
                .updateTable('lwp_school')
                .set({ importStatus: ImportStatus.DATA_IMPORTED, lastImportedAt: new Date() })
                .where('id', '=', fixtures.schoolId)
                .execute();
            await reimportCachedData(await adminAccessToken(), fixtures.importedSchoolId, fixtures.schoolId);

            const importStatus = async () =>
                (
                    await db.selectFrom('lwp_school').where('id', '=', fixtures.schoolId).select('importStatus').executeTakeFirstOrThrow()
                ).importStatus;

            expect(await importStatus()).toBe(ImportStatus.LINKING_PUPILS);

            const { accessToken: leaderToken } = await getTokenFromLogin(fixtures.leaderEmail, password);

            /* The only open pupil row is answered with "no existing pupil". Creation is implicit:
             * the mutation just rejects the candidates, the phase gate passes, and no pupil is
             * built yet - before the gate fix this exact shape wedged the review open in
             * LINKING_PUPILS with nothing on screen. */
            const afterPupils = await updatePupilLinkRequests(leaderToken, fixtures.importedSchoolId, [
                { importedStudentId: partialStudent.id, action: 'CREATE' }
            ]);

            expect(afterPupils.importStatus).toBe(ImportStatus.LINKING_CLASSES);

            // Mid-review: no pupil exists yet for the answered row, and only REJECTED links remain.
            expect(await createdPupilFor(partialStudent.id)).toBeUndefined();
            expect((await pupilLinks(partialStudent.id)).filter((link) => !link.status.includes('REJECTED'))).toHaveLength(0);

            // Same shape at the class step: the one open class row is answered with "create new".
            const afterClasses = await updateClassLinkRequests(leaderToken, fixtures.importedSchoolId, [
                { importedSchoolClassId: importedClass.id, action: 'CREATE' }
            ]);

            expect(afterClasses.importStatus).toBe(ImportStatus.COMPLETE);

            /* Both linking steps done - the sweeps ran. The pupil now exists (exactly one), with
             * the create on record as the system's own AUTO_SELECTED decision; the leader's "no"
             * survives as the rejected candidate link. */
            const pupilsForStudent = await db
                .selectFrom('lwp_pupil')
                .where('importedStudentId', '=', partialStudent.id)
                .select('id')
                .execute();

            expect(pupilsForStudent).toHaveLength(1);

            const liveLinks = (await pupilLinks(partialStudent.id)).filter((link) => !link.status.includes('REJECTED'));

            expect(liveLinks).toHaveLength(1);
            expect(liveLinks[0].status).toBe('AUTO_SELECTED');

            const stampedClass = await db
                .selectFrom('imported_school_class')
                .where('id', '=', importedClass.id)
                .select('lwpSchoolClassId')
                .executeTakeFirstOrThrow();

            expect(stampedClass.lwpSchoolClassId).not.toBeNull();
            // The leader said "no existing class": the created class is not the seeded candidate.
            expect(String(stampedClass.lwpSchoolClassId)).not.toBe(String(candidateClass.id));

            const classLinks = await db
                .selectFrom('imported_school_data_proposed_link')
                .where('entityType', '=', 'CLASS')
                .where('importedEntityId', '=', importedClass.id)
                .where('status', 'in', ['SELECTED', 'AUTO_SELECTED'])
                .select(['status'])
                .execute();

            expect(classLinks).toHaveLength(1);
            expect(classLinks[0].status).toBe('AUTO_SELECTED');
        } finally {
            await rt.cleanup(fixtures);
        }
    });
});
