/* The complete Ready Teddy academic-year-switch journey: the real rollover (driven through
 * the admin changeSchoolPeriod mutation, which converts tagged schools' pre-admission
 * cohorts) and the school leader's import review.
 *
 * A school with Ready Teddy provision stays on the review for every import, not just the
 * first of the academic year: reception pupils, and whole reception classes, arrive in the
 * MIS throughout it and need the same linking decisions as the intake present at the start.
 * The routing therefore does not revert once the review completes, and the tests assert that
 * it does not - a reverted school would take the next arrivals through the legacy sync.
 *
 * Conversion into a group across classes is gated on the CREATE_GROUP_FOR_RT_CLASSES
 * school tag: the multi-form test tags its school and reviews the converted cohort; the
 * single-form-entry test leaves its school untagged, so the class survives the rollover
 * as a registration class and the whole review auto-links in one click.
 *
 * The review's linking steps never place a pupil in a class, so DataImportService runs the
 * legacy relink once on the way out. That relink is what puts the pupils in this year's
 * registration classes - the tests assert it, because without it a leader finishes the
 * review with a school of pupils in no class.
 *
 * The Wonde pull itself cannot run against a local stack, so the sync click is faked:
 * the imported (MIS) rows are seeded up front, and the resyncWondeData request is
 * intercepted - the interception hands the school to the review state machine
 * (DATA_IMPORTED + reimportCachedData as admin, i.e. linking without a Wonde fetch)
 * and responds with the real resulting status.
 *
 * Screenshots for each step land in the test's output directory (test-results/...), and the
 * school overview is captured at every stage rather than only at the ends: the overview is
 * the page a leader actually sits on, and the states between "review finished" and "the
 * nightly sync has caught up" are the uncertain ones. Video is recorded per test; set
 * PLAYWRIGHT_SLOWMO (ms) to space the actions out into a watchable walkthrough - it
 * defaults to 0 so CI is not slowed down.
 */
import type { Schema } from '@lwp/postgres-client';
import { expect, type Page, test, type TestInfo } from '@playwright/test';
import { type Kysely, type Selectable } from 'kysely';
import { ImportStatus, PupilParentStatus } from 'lwp-shared';

import { createDb } from '../db';
import { admin, generateFirstName, generateLastName, generateUPN, generateUserEmail, password } from '../constants';
import { reimportCachedData } from '../graphql';
import { acceptFeatureTooltipPrompt, login, openSideDrawer, waitForLoading } from '../utils';
import { adminAccessToken, createReadyTeddyFixtures, type Fixtures } from './readyTeddyWondeFixtures';

/* Default 0: CI runs at full speed. Locally, PLAYWRIGHT_SLOWMO=250 spaces every action out
 * so the recording plays back as a walkthrough instead of a flicker. */
const slowMo = Number(process.env.PLAYWRIGHT_SLOWMO ?? 0);

test.use({
    video: { mode: 'on', size: { width: 1280, height: 720 } },
    viewport: { width: 1280, height: 720 },
    launchOptions: { slowMo }
});

/* The pg Pool is lazy, so the connection is only opened by the first query - the fixtures
 * can own it from module scope and the suite just tears it down at the end. */
const db: Kysely<Schema.DB> = createDb();
const rt = createReadyTeddyFixtures(db);

test.describe('Ready Teddy year switch and Wonde import review', () => {
    test.afterAll(async () => {
        await db.destroy();
    });

    const screenshot = async (page: Page, testInfo: TestInfo, name: string): Promise<void> => {
        await page.screenshot({ path: testInfo.outputPath(`${name}.png`), fullPage: true });
    };

    /* Mid-review, between the two linking steps. The review is server-side state, so stepping
     * away to the overview and back must not lose the leader's place - and while it is
     * unfinished the overview has to keep pointing them at it. */
    const assertOverviewMidReview = async (page: Page, fixtures: Fixtures, testInfo: TestInfo, name: string): Promise<void> => {
        await page.goto(`/school/${fixtures.schoolId}`);
        await waitForLoading(page);
        await expect(page.getByTestId('school-overview-page')).toBeVisible();
        await expect(page.getByText('Data imported - please check to continue')).toBeVisible();
        await screenshot(page, testInfo, name);
    };

    /* The window the leader is actually left in when the review completes: the import has
     * finished, but the next nightly one will not run for hours. Nothing the leader sees here
     * may depend on it having run - above all the pupils must already be in their classes,
     * from the relink DataImportService runs on the way out, or the school sits in "pupils not
     * in a class" until the overnight job catches up. */
    const assertOverviewAfterReviewBeforeNextSync = async (
        page: Page,
        fixtures: Fixtures,
        testInfo: TestInfo,
        screenshotPrefix: string
    ): Promise<void> => {
        const school = await db
            .selectFrom('lwp_school')
            .where('id', '=', fixtures.schoolId)
            .select(['importStatus', 'lastImportedAt'])
            .executeTakeFirstOrThrow();

        // The review wrote COMPLETE and stamped the import itself; no later sync has run yet.
        expect(school.importStatus).toBe(ImportStatus.COMPLETE);
        expect(school.lastImportedAt).not.toBeNull();

        /* Completing the review does not hand the school back to the legacy sync: its Ready
         * Teddy provision still routes it, so the next nightly run is reviewed as well. */
        await rt.expectRouting(fixtures.schoolId, true);

        await page.goto(`/school/${fixtures.schoolId}`);
        await waitForLoading(page);
        await expect(page.getByTestId('school-overview-page')).toBeVisible();
        // A COMPLETE school is not prompted to sync, review, or re-import.
        await expect(page.locator('.school-imported-data-sync')).toHaveCount(0);

        await openSideDrawer(page);
        // Nothing left to review, and every pupil already placed - both without waiting for the sync.
        await expect(page.getByTestId('sidebar-data-changes-review-btn')).toHaveCount(0);
        await expect(page.getByTestId('sidebar-pupils-not-in-class-btn').locator('.MuiBadge-badge')).toHaveCount(0);
        await screenshot(page, testInfo, `${screenshotPrefix}-overview-review-done-sync-pending`);

        /* The Imported pupil data tile is gated on the same routing flag, so it stays available
         * to a Ready Teddy school instead of vanishing once the first import of the year is done -
         * it is the leader's only way back to the page when the next arrivals need reviewing. */
        await page.goto(`/school/${fixtures.schoolId}/settings`);
        await waitForLoading(page);
        await expect(page.getByTestId('school-settings-data-changes')).toBeVisible();
        await screenshot(page, testInfo, `${screenshotPrefix}-settings-imported-pupil-data-tile`);
    };

    /* The leader must see nothing new from a subsequent nightly sync that brings no changes:
     * no sync banner, no "Changes from wonde" drawer entry, and a quiet data-changes page. */
    const assertImportUiIsQuiet = async (page: Page, fixtures: Fixtures, testInfo: TestInfo, screenshotPrefix: string): Promise<void> => {
        // Still routed to the review, so the run being simulated is a reviewed import.
        await rt.expectRouting(fixtures.schoolId, true);

        /* Simulate that run finding nothing to decide: with every MIS row already linked the
         * review auto-completes and lands the school back on COMPLETE without asking anything. */
        await db
            .updateTable('lwp_school')
            .set({ importStatus: ImportStatus.COMPLETE, lastImportedAt: new Date() })
            .where('id', '=', fixtures.schoolId)
            .execute();

        await page.goto(`/school/${fixtures.schoolId}`);
        await waitForLoading(page);
        await expect(page.getByTestId('school-overview-page')).toBeVisible();
        await expect(page.locator('.school-imported-data-sync')).toHaveCount(0);
        await openSideDrawer(page);
        await expect(page.getByTestId('sidebar-data-changes-review-btn')).toHaveCount(0);
        // No "Pupils not in a class" badge: the relink placed everyone the MIS knows about.
        await expect(page.getByTestId('sidebar-pupils-not-in-class-btn').locator('.MuiBadge-badge')).toHaveCount(0);
        await screenshot(page, testInfo, `${screenshotPrefix}-overview-after-next-sync`);

        await page.goto(`/school/${fixtures.schoolId}/data-changes`);
        await waitForLoading(page);
        await expect(page.getByTestId('data-changes-last-import-title')).toContainText('No remaining changes');
        // The "include previously rejected changes" toggle is hidden while diffing is disabled.
        await expect(page.getByText('Include previously rejected changes')).toHaveCount(0);
        await screenshot(page, testInfo, `${screenshotPrefix}-data-changes-quiet`);
    };


    test('tagged multi-form school: cohort converts at the year switch, leader reviews it, and stays on the review after', async ({
        page
    }, testInfo) => {
        const fixtures = await rt.seedSchool({ tagged: true });

        try {
            // The MIS holds this year's reception class: two pupils identical to the platform (they
            // auto-link), one who only matches by name (needs a decision), and one brand new (created
            // automatically - with no candidate, "create new" was the only choice a leader could have
            // made). Every student is in that class, as real MIS data is - class membership is what
            // the relink reads to place pupils once the review is done.
            const [exactPupil, partialPupil, secondExactPupil] = fixtures.pupils;
            const newClassName = 'Reception Maple';

            const importedClass = await rt.utils.createImportedClass(fixtures.importedSchoolId, {
                id: `rtwc${Date.now().toString(36)}`,
                name: newClassName,
                importedFrom: 'WONDE',
                periodIndex: fixtures.newPeriodIndex
            });

            const exactStudent = await rt.seedImportedStudent(fixtures, {
                forename: exactPupil.firstname,
                surname: exactPupil.lastname,
                UPN: exactPupil.UPN,
                dateOfBirth: '2022-03-10'
            });
            const secondExactStudent = await rt.seedImportedStudent(fixtures, {
                forename: secondExactPupil.firstname,
                surname: secondExactPupil.lastname,
                UPN: secondExactPupil.UPN,
                dateOfBirth: '2022-03-12'
            });
            const partialStudent = await rt.seedImportedStudent(fixtures, {
                forename: partialPupil.firstname,
                surname: partialPupil.lastname,
                UPN: generateUPN(),
                dateOfBirth: '2022-01-01'
            });
            const newStudent = await rt.seedImportedStudent(fixtures, {
                forename: generateFirstName(),
                surname: generateLastName(),
                UPN: generateUPN(),
                dateOfBirth: '2022-02-02'
            });

            for (const student of [exactStudent, secondExactStudent, partialStudent, newStudent]) {
                await rt.utils.addStudentToImportedClass(importedClass.id, student.id);
            }

            /* Already routed to the review before the year switch: the pre-admission Ready Teddy
             * class sits on the incoming year, and last year's COMPLETE no longer excuses the
             * school from it. */
            await rt.expectRouting(fixtures.schoolId, true);

            await rt.rollOverSchool(fixtures);

            // The tagged school's cohort became a group across classes.
            const convertedClass = await db
                .selectFrom('lwp_school_class')
                .where('id', '=', fixtures.classId)
                .select(['isGroupAcrossClasses', 'isRegistrationClass', 'convertedFromPreAdmissionPeriodIndex'])
                .executeTakeFirstOrThrow();

            expect(convertedClass.isGroupAcrossClasses).toBe(true);
            expect(convertedClass.isRegistrationClass).toBe(false);
            expect(convertedClass.convertedFromPreAdmissionPeriodIndex).toBe(fixtures.newPeriodIndex);

            await rt.expectRouting(fixtures.schoolId, true);
            await rt.interceptWondeSync(page, fixtures);

            await login(page, fixtures.leaderEmail, password);
            await page.waitForURL(/\/school/);
            await waitForLoading(page);
            await expect(page.getByTestId('school-overview-page')).toBeVisible();
            await acceptFeatureTooltipPrompt(page);

            await expect(page.getByText('No data for current academic year')).toBeVisible();
            await screenshot(page, testInfo, '01-overview-sync-prompt');

            await page.getByRole('button', { name: 'Sync with Wonde' }).click();
            await waitForLoading(page);
            await page.reload();
            await waitForLoading(page);

            await expect(page.getByText('Data imported - please check to continue')).toBeVisible();
            await screenshot(page, testInfo, '02-overview-check-imported-data');

            await page.getByRole('button', { name: 'Check imported data' }).click();
            await page.waitForURL(/\/school\/\d+\/data-changes/);
            await waitForLoading(page);

            await expect(page.getByTestId('link-pupils-page')).toBeVisible();
            await screenshot(page, testInfo, '03-link-pupils');

            /* The identical pupils auto-linked, and the brand-new pupil - who could only ever have
             * been "create new" - was created automatically at sync time, so the one decision left
             * is the pupil whose MIS record disagrees on identity. */
            await expect(page.getByTestId(`platform-pupil-select-${newStudent.forename}-${newStudent.surname}`)).toHaveCount(0);

            // Mid-review: stepping out to the overview and back must not lose the leader's place.
            await assertOverviewMidReview(page, fixtures, testInfo, '04-overview-mid-review');
            await page.goto(`/school/${fixtures.schoolId}/data-changes`);
            await waitForLoading(page);
            await expect(page.getByTestId('link-pupils-page')).toBeVisible();

            await page.getByTestId(`platform-pupil-select-${partialStudent.forename}-${partialStudent.surname}`).click();
            await page.getByRole('option', { name: `${partialPupil.firstname} ${partialPupil.lastname}` }).first().click();
            await screenshot(page, testInfo, '05-link-pupils-resolved');
            await page.getByTestId('link-pupils-button').click();
            await waitForLoading(page);
            await expect(
                page.locator('.MuiAlert-message').filter({ hasText: 'External pupils linked successfully with LWP pupils' })
            ).toBeVisible();
            await waitForLoading(page);

            /* No class step: the MIS class has no candidate (the converted Ready Teddy group is not
             * offered), so it too was created automatically and the review ran straight to done. */
            await expect(page.getByTestId('link-classes-page')).toHaveCount(0);
            await expect(page.getByTestId('data-changes-last-import-title')).toContainText('No remaining changes');
            await screenshot(page, testInfo, '07-review-complete');

            /* The uncertain window: review done, legacy sync still hours away. Asserted before
             * anything simulates that sync, so nothing below can borrow its effects. */
            await assertOverviewAfterReviewBeforeNextSync(page, fixtures, testInfo, '08');

            // Backend outcomes: review COMPLETE, links landed, the group was left alone.
            const school = await db
                .selectFrom('lwp_school')
                .where('id', '=', fixtures.schoolId)
                .select('importStatus')
                .executeTakeFirstOrThrow();

            expect(school.importStatus).toBe(ImportStatus.COMPLETE);

            const linkedExact = await db
                .selectFrom('lwp_pupil')
                .where('id', '=', exactPupil.id)
                .select('importedStudentId')
                .executeTakeFirstOrThrow();

            expect(linkedExact.importedStudentId).not.toBeNull();

            const createdPupils = await db.selectFrom('lwp_pupil').where('importedStudentId', '=', newStudent.id).select('id').execute();

            expect(createdPupils).toHaveLength(1);

            /* The system made that create, not the leader: the link records AUTO_SELECTED. Its pupil
             * id is not compared with the surviving pupil's - the relink deletes a parentless
             * imported-linked pupil and recreates it under a new id, as it always has. */
            const newStudentLinks = await db
                .selectFrom('imported_school_data_proposed_link')
                .where('entityType', '=', 'PUPIL')
                .where('importedEntityId', '=', newStudent.id)
                .select(['platformEntityId', 'status'])
                .execute();

            expect(newStudentLinks).toHaveLength(1);
            expect(newStudentLinks[0].status).toBe('AUTO_SELECTED');

            const createdClasses = await db
                .selectFrom('lwp_school_class')
                .where('schoolId', '=', fixtures.schoolId)
                .where('name', '=', newClassName)
                .select(['id', 'isRegistrationClass', 'importedSchoolClassId'])
                .execute();

            expect(createdClasses).toHaveLength(1);
            expect(createdClasses[0].isRegistrationClass).toBe(true);

            // The class create was automatic too.
            const importedClassLinks = await db
                .selectFrom('imported_school_data_proposed_link')
                .where('entityType', '=', 'CLASS')
                .where('importedEntityId', '=', importedClass.id)
                .select(['platformEntityId', 'status'])
                .execute();

            expect(importedClassLinks.map((link) => ({ ...link, platformEntityId: String(link.platformEntityId) }))).toEqual([
                { platformEntityId: String(createdClasses[0].id), status: 'AUTO_SELECTED' }
            ]);

            /* The relink that runs as the review completes put every pupil the MIS holds into the new
             * registration class, so the leader is not left with a school of pupils in no class until
             * the overnight sync. */
            const registrationClassPupils = await db
                .selectFrom('lwp_class_pupil')
                .where('lwpSchoolClassId', '=', createdClasses[0].id)
                .select('lwpPupilId')
                .execute();

            expect(registrationClassPupils).toHaveLength(4);

            // ...and the converted cohort still holds its own pupils: the relink leaves groups alone.
            const groupPupils = await db
                .selectFrom('lwp_class_pupil')
                .where('lwpSchoolClassId', '=', fixtures.classId)
                .select('lwpPupilId')
                .execute();

            expect(groupPupils.map((row) => row.lwpPupilId).sort()).toEqual(fixtures.pupils.map((pupil) => pupil.id).sort());

            const group = await db
                .selectFrom('lwp_school_class')
                .where('id', '=', fixtures.classId)
                .select(['isGroupAcrossClasses', 'importedSchoolClassId'])
                .executeTakeFirstOrThrow();

            expect(group.isGroupAcrossClasses).toBe(true);
            expect(group.importedSchoolClassId).toBeNull();

            await assertImportUiIsQuiet(page, fixtures, testInfo, '09');
        } finally {
            await rt.cleanup(fixtures);
        }
    });

    test('untagged single-form-entry school: class survives the year switch and everything auto-links with nothing to review', async ({
        page
    }, testInfo) => {
        const fixtures = await rt.seedSchool({ tagged: false });

        try {
            // The MIS mirrors the platform exactly: the same pupils, and one reception class
            // with the same name containing them - so pupils auto-link on identity and the
            // class auto-links on name + pupils in common, with no leader decisions.
            const importedClass = await rt.utils.createImportedClass(fixtures.importedSchoolId, {
                id: `rtwc${Date.now().toString(36)}`,
                name: fixtures.className,
                importedFrom: 'WONDE',
                periodIndex: fixtures.newPeriodIndex
            });

            for (const pupil of fixtures.pupils) {
                const student = await rt.seedImportedStudent(fixtures, {
                    forename: pupil.firstname,
                    surname: pupil.lastname,
                    UPN: pupil.UPN,
                    dateOfBirth: new Date(pupil.dateOfBirth as unknown as string).toISOString().slice(0, 10)
                });

                await rt.utils.addStudentToImportedClass(importedClass.id, student.id);
            }

            // Routed to the review before the year switch too, on the pre-admission class alone.
            await rt.expectRouting(fixtures.schoolId, true);

            await rt.rollOverSchool(fixtures);

            // No conversion tag, so the class simply became the new year's registration class.
            const schoolClass = await db
                .selectFrom('lwp_school_class')
                .where('id', '=', fixtures.classId)
                .select(['isGroupAcrossClasses', 'isRegistrationClass', 'convertedFromPreAdmissionPeriodIndex'])
                .executeTakeFirstOrThrow();

            expect(schoolClass.isGroupAcrossClasses).toBe(false);
            expect(schoolClass.isRegistrationClass).toBe(true);
            expect(schoolClass.convertedFromPreAdmissionPeriodIndex).toBeNull();

            await rt.expectRouting(fixtures.schoolId, true);
            await rt.interceptWondeSync(page, fixtures);

            await login(page, fixtures.leaderEmail, password);
            await page.waitForURL(/\/school/);
            await waitForLoading(page);
            await expect(page.getByTestId('school-overview-page')).toBeVisible();
            await acceptFeatureTooltipPrompt(page);

            await expect(page.getByText('No data for current academic year')).toBeVisible();
            await screenshot(page, testInfo, 'sfe-01-overview-sync-prompt');

            await page.getByRole('button', { name: 'Sync with Wonde' }).click();
            await waitForLoading(page);
            await screenshot(page, testInfo, 'sfe-02-overview-after-sync-click');

            // Everything auto-linked, so the review completed in one pass with nothing to do.
            const school = await db
                .selectFrom('lwp_school')
                .where('id', '=', fixtures.schoolId)
                .select('importStatus')
                .executeTakeFirstOrThrow();

            expect(school.importStatus).toBe(ImportStatus.COMPLETE);

            // The MIS class linked to the school's own reception class - no new class.
            const linkedClass = await db
                .selectFrom('imported_school_class')
                .where('id', '=', importedClass.id)
                .select('lwpSchoolClassId')
                .executeTakeFirstOrThrow();

            expect(linkedClass.lwpSchoolClassId).toBe(fixtures.classId);

            const classCount = await db
                .selectFrom('lwp_school_class')
                .where('schoolId', '=', fixtures.schoolId)
                .select(db.fn.countAll<string>().as('count'))
                .executeTakeFirstOrThrow();

            expect(Number(classCount.count)).toBe(1);

            // Every pupil linked to their existing record - no duplicates created.
            const unlinkedPupils = await db
                .selectFrom('lwp_pupil')
                .where('schoolId', '=', fixtures.schoolId)
                .where('importedStudentId', 'is', null)
                .select('id')
                .execute();

            expect(unlinkedPupils).toHaveLength(0);

            const pupilCount = await db
                .selectFrom('lwp_pupil')
                .where('schoolId', '=', fixtures.schoolId)
                .select(db.fn.countAll<string>().as('count'))
                .executeTakeFirstOrThrow();

            expect(Number(pupilCount.count)).toBe(fixtures.pupils.length);

            // The class carried its pupils through the year switch; the relink left them where they were.
            const classPupils = await db
                .selectFrom('lwp_class_pupil')
                .where('lwpSchoolClassId', '=', fixtures.classId)
                .select('lwpPupilId')
                .execute();

            expect(classPupils.map((row) => row.lwpPupilId).sort()).toEqual(fixtures.pupils.map((pupil) => pupil.id).sort());

            /* Same uncertain window as the multi-form journey, reached without the leader making
             * a single decision - the auto-link path must place pupils just as the manual one does. */
            await assertOverviewAfterReviewBeforeNextSync(page, fixtures, testInfo, 'sfe-03');

            await assertImportUiIsQuiet(page, fixtures, testInfo, 'sfe-04');
        } finally {
            await rt.cleanup(fixtures);
        }
    });

    /* The one-hour cooldown SchoolImportedDataSync puts on the sync button, keyed off
     * lastImportedAt - which the review stamps as it starts (DataImportService.importWondeSchoolData).
     * So for the hour after an import a school that lands back on the prompt is deliberately
     * held back from re-triggering it. The two journeys above never meet this, because they
     * seed a school that has never been imported; it is the state a real leader hits when the
     * legacy sync has not caught up yet, which is exactly when they are most likely to click. */
    test('a school back on the sync prompt within an hour of an import cannot re-trigger the pull', async ({ page }, testInfo) => {
        const fixtures = await rt.seedSchool({ tagged: false });

        try {
            await rt.rollOverSchool(fixtures);

            // An import ran moments ago and the school is back on the prompt.
            await db
                .updateTable('lwp_school')
                .set({ importStatus: ImportStatus.WRONG_ACADEMIC_YEAR, lastImportedAt: new Date() })
                .where('id', '=', fixtures.schoolId)
                .execute();

            await login(page, fixtures.leaderEmail, password);
            await page.waitForURL(/\/school/);
            await waitForLoading(page);
            await expect(page.getByTestId('school-overview-page')).toBeVisible();
            await acceptFeatureTooltipPrompt(page);

            await expect(page.getByText('No data for current academic year')).toBeVisible();
            await expect(page.getByRole('button', { name: 'Sync with Wonde' })).toBeDisabled();
            await expect(page.getByText('The latest data was checked for your school recently')).toBeVisible();
            await screenshot(page, testInfo, 'cooldown-01-overview-sync-held-back');

            // Older than the cooldown: the same school is free to sync again.
            await db
                .updateTable('lwp_school')
                .set({ lastImportedAt: new Date(Date.now() - 2 * 60 * 60 * 1000) })
                .where('id', '=', fixtures.schoolId)
                .execute();

            await page.reload();
            await waitForLoading(page);
            await expect(page.getByText('No data for current academic year')).toBeVisible();
            await expect(page.getByRole('button', { name: 'Sync with Wonde' })).toBeEnabled();
            await expect(page.getByText('The latest data was checked for your school recently')).toHaveCount(0);
            await screenshot(page, testInfo, 'cooldown-02-overview-sync-available');
        } finally {
            await rt.cleanup(fixtures);
        }
    });
    /* ---------------------------------------------------------------------------------------
     * Edge cases. These drive the review through the API rather than the browser: they are
     * about what the linking engine decides, not about what the leader sees, and the recorded
     * walkthroughs already cover the UI. Two of them pin defects; both are marked so they go
     * red the moment the defect is fixed, rather than quietly enshrining it.
     * ------------------------------------------------------------------------------------- */

    /* Take a rolled-over school as far as the class step without a browser: seed the MIS rows,
     * mark the data as imported, then let the review's own state machine run. */
    const driveReviewToClassStep = async (fixtures: Fixtures): Promise<void> => {
        await db
            .updateTable('lwp_school')
            .set({ importStatus: ImportStatus.DATA_IMPORTED, lastImportedAt: new Date() })
            .where('id', '=', fixtures.schoolId)
            .execute();

        await reimportCachedData(await adminAccessToken(), fixtures.importedSchoolId, fixtures.schoolId);
    };

    /* One MIS record per platform pupil, identical on identity, so every pupil auto-links and the
     * class step is reached with nothing owed on the pupils. */
    const seedExactStudentsFor = async (fixtures: Fixtures) =>
        await Promise.all(
            fixtures.pupils.map((pupil) =>
                rt.seedImportedStudent(fixtures, {
                    forename: pupil.firstname,
                    surname: pupil.lastname,
                    UPN: pupil.UPN,
                    dateOfBirth: new Date(pupil.dateOfBirth as unknown as string).toISOString().slice(0, 10)
                })
            )
        );

    const proposedClassLinks = async (importedClassId: string) =>
        await db
            .selectFrom('imported_school_data_proposed_link')
            .where('entityType', '=', 'CLASS')
            .where('importedEntityId', '=', importedClassId)
            .select(['platformEntityId', 'isHighConfidence'])
            .execute();

    /* A class the MIS renamed over the summer still holds the school's pupils, so the pupils
     * identify it even though the name no longer does. ClassLinkService computes exactly that
     * ("hasPupilsInCommon"), and marks it low confidence because the name disagrees. */
    test('a renamed MIS class is still proposed, matched by the pupils it holds', async () => {
        const fixtures = await rt.seedSchool({ tagged: false });

        try {
            const students = await seedExactStudentsFor(fixtures);
            const importedClass = await rt.utils.createImportedClass(fixtures.importedSchoolId, {
                id: `rtwe${Date.now().toString(36)}`,
                name: 'Reception 2026',
                importedFrom: 'WONDE',
                periodIndex: fixtures.newPeriodIndex
            });

            for (const student of students) await rt.utils.addStudentToImportedClass(importedClass.id, student.id);

            await rt.rollOverSchool(fixtures);
            await driveReviewToClassStep(fixtures);

            const links = await proposedClassLinks(importedClass.id);
            const toExistingClass = links.find((link) => link.platformEntityId === fixtures.classId);

            expect(toExistingClass, 'the class the school already has should be proposed').toBeDefined();
            // The name disagrees, so this is a suggestion for the leader to confirm, not a certainty.
            expect(toExistingClass?.isHighConfidence).toBe(false);
        } finally {
            await rt.cleanup(fixtures);
        }
    });

    /* The periodIndex guard in ClassLinkService: a Ready Teddy pre-admission class sits on a future
     * academic year, and must never be offered as the home for a class arriving for this one. */
    test('a next-year Ready Teddy class is never proposed for this year\'s MIS class', async () => {
        const fixtures = await rt.seedSchool({ tagged: false });

        try {
            const nextYear = await rt.utils.createClass(fixtures.schoolId, {
                name: 'Reception 2026',
                periodIndex: fixtures.newPeriodIndex + 1,
                isReadyTeddyEnabled: true,
                IsReadingLogsEnabled: false,
                isFullProgramme: false,
                isRegistrationClass: true,
                isGroupAcrossClasses: false,
                status: 'ACTIVE'
            });

            const students = await seedExactStudentsFor(fixtures);
            // Same name as the future class, so only the period guard can keep them apart.
            const importedClass = await rt.utils.createImportedClass(fixtures.importedSchoolId, {
                id: `rtwe${Date.now().toString(36)}`,
                name: 'Reception 2026',
                importedFrom: 'WONDE',
                periodIndex: fixtures.newPeriodIndex
            });

            for (const student of students) await rt.utils.addStudentToImportedClass(importedClass.id, student.id);

            await rt.rollOverSchool(fixtures);
            await driveReviewToClassStep(fixtures);

            const links = await proposedClassLinks(importedClass.id);

            expect(links.map((link) => link.platformEntityId)).not.toContain(nextYear.id);

            await db.deleteFrom('lwp_school_class').where('id', '=', nextYear.id).execute();
        } finally {
            await rt.cleanup(fixtures);
        }
    });
    /* Peyman's ask: a class arriving from the MIS should be offerable against any registration
     * class in the same year group, not only ones that match by name or share pupils. A leader can
     * tell which of their Year 3 classes it is; a name comparison cannot. */
    test('every registration class in the same year group is offered as a possible match', async () => {
        const fixtures = await rt.seedSchool({ tagged: false });
        const RECEPTION = '0';

        try {
            // The fixtures leave year groups unset, so both sides are given one explicitly.
            await db.updateTable('lwp_school_class').set({ yearGroup: RECEPTION }).where('id', '=', fixtures.classId).execute();

            /* A second registration class in the same year group, holding nobody. It shares no name
             * and no pupils with the arriving class, so the year group is the only thing that can
             * put it on the list. */
            const siblingForm = await rt.utils.createClass(fixtures.schoolId, {
                name: 'Reception Willow',
                periodIndex: fixtures.newPeriodIndex,
                yearGroup: RECEPTION,
                isReadyTeddyEnabled: false,
                IsReadingLogsEnabled: false,
                isFullProgramme: false,
                isRegistrationClass: true,
                isGroupAcrossClasses: false,
                status: 'ACTIVE'
            });

            const students = await seedExactStudentsFor(fixtures);
            const importedClass = await rt.utils.createImportedClass(fixtures.importedSchoolId, {
                id: `rtwe${Date.now().toString(36)}`,
                name: 'Reception 2026',
                importedFrom: 'WONDE',
                periodIndex: fixtures.newPeriodIndex,
                yearGroup: RECEPTION
            });

            for (const student of students) await rt.utils.addStudentToImportedClass(importedClass.id, student.id);

            await rt.rollOverSchool(fixtures);
            await driveReviewToClassStep(fixtures);

            const links = await proposedClassLinks(importedClass.id);
            const proposed = links.map((link) => link.platformEntityId);

            // The class holding the pupils, and the empty one in the same year group.
            expect(proposed).toContain(fixtures.classId);
            expect(proposed, 'a same-year-group class with nothing else in common should be offered').toContain(siblingForm.id);

            // Neither is a certainty: the arriving class shares its name with neither.
            const sibling = links.find((link) => link.platformEntityId === siblingForm.id);

            expect(sibling?.isHighConfidence).toBe(false);

            await db.deleteFrom('lwp_school_class').where('id', '=', siblingForm.id).execute();
        } finally {
            await rt.cleanup(fixtures);
        }
    });

    /* ---------------------------------------------------------------------------------------
     * Abandoned records are never offered as match candidates. A school holding two records for
     * the same child - one carrying the parents, one abandoned - must not be asked to choose
     * between two rows that look identical to it.
     *
     * "Abandoned" mirrors WondeService.reLinkingLwpWithWonde, which deletes a pupil it finds
     * orphaned - and decides that after dropping the school's IMPORTED parent links. So a pupil
     * whose only link is IMPORTED counts as abandoned here too: it is on its way out regardless.
     * Every other status keeps the pupil matchable, an INVITED parent above all, because a
     * pre-admission cohort waiting on its invitations sits in exactly that state.
     *
     * Which is why the filter is not lwp_view_pupil_status: that calls a pupil MISSING whenever
     * it has no ACTIVE parent, so it would drop that whole cohort and duplicate every child in
     * it. The tests below assert MISSING and matchable at the same time, to pin that apart.
     * ------------------------------------------------------------------------------------- */

    const proposedPupilLinks = async (importedPupilId: string) =>
        await db
            .selectFrom('imported_school_data_proposed_link')
            .where('entityType', '=', 'PUPIL')
            .where('importedEntityId', '=', importedPupilId)
            .select(['platformEntityId', 'isHighConfidence', 'status'])
            .execute();

    /* A platform pupil for the review to weigh. Its lwp_pupil_parent status is the only thing that
     * varies between candidates - null seeds no parent link at all. */
    const seedPlatformPupil = async (
        fixtures: Fixtures,
        identity: { firstname: string; lastname: string; dateOfBirth: string },
        parentStatus: PupilParentStatus | null
    ): Promise<Selectable<Schema.LwpPupil>> => {
        const pupil = await rt.utils.createPupil(fixtures.schoolId, {
            ...identity,
            UPN: generateUPN(),
            gender: 'MALE'
        });

        if (parentStatus) {
            const passwordDonor = await db.selectFrom('lwp_user').where('id', '=', '1').select('password').executeTakeFirstOrThrow();
            const parentFirstname = generateFirstName();
            const parentLastname = generateLastName();
            const parent = await rt.utils.createUser({
                firstname: parentFirstname,
                lastname: parentLastname,
                email: generateUserEmail(parentFirstname, parentLastname),
                type: 'PARENT',
                userStatus: 'ACTIVE',
                schoolId: fixtures.schoolId,
                password: passwordDonor.password
            });

            // cleanup() deletes the parents the fixtures track, so this one joins them.
            fixtures.parentIds.push(parent.id);
            await rt.utils.addParentToPupil(pupil.id, parent.id, false, parentStatus);
        }

        return pupil;
    };

    /* One MIS record and the platform records it should be weighed against, all sharing an identity
     * no fixture pupil has. Every UPN differs, so each candidate scores identically and nothing can
     * win on identity alone: the only thing separating them is their parent status. */
    const seedCandidates = async (
        fixtures: Fixtures,
        parentStatuses: Array<PupilParentStatus | null>
    ): Promise<{ importedStudent: Selectable<Schema.ImportedStudent>; pupilIds: string[] }> => {
        const identity = { firstname: generateFirstName(), lastname: generateLastName(), dateOfBirth: '2021-07-04' };
        const pupilIds: string[] = [];

        for (const parentStatus of parentStatuses) {
            pupilIds.push((await seedPlatformPupil(fixtures, identity, parentStatus)).id);
        }

        const importedStudent = await rt.seedImportedStudent(fixtures, {
            forename: identity.firstname,
            surname: identity.lastname,
            UPN: generateUPN(),
            dateOfBirth: identity.dateOfBirth
        });

        return { importedStudent, pupilIds };
    };

    test('an abandoned duplicate is not offered alongside the record the parents actually use', async () => {
        const fixtures = await rt.seedSchool({ tagged: false });

        try {
            await rt.rollOverSchool(fixtures);

            const { importedStudent, pupilIds } = await seedCandidates(fixtures, [PupilParentStatus.ACTIVE, null]);
            const [withActiveParent, abandoned] = pupilIds;

            await driveReviewToClassStep(fixtures);

            const proposed = (await proposedPupilLinks(importedStudent.id)).map((link) => String(link.platformEntityId));

            expect(proposed, 'the record carrying the parents should be offered').toContain(withActiveParent);
            expect(proposed, 'the abandoned record should not be offered as well').not.toContain(abandoned);
            // A single clean choice, rather than two rows the school cannot tell apart.
            expect(proposed).toHaveLength(1);
        } finally {
            await rt.cleanup(fixtures);
        }
    });

    /* A parent link that survives the relink's IMPORTED wipe keeps its pupil matchable, whatever
     * its status - so the school's existing record is matched rather than created a second time. */
    for (const status of [PupilParentStatus.INVITED, PupilParentStatus.ACTIVE, PupilParentStatus.REJECTED]) {
        test(`a pupil whose only parent link is ${status} is still offered`, async () => {
            const fixtures = await rt.seedSchool({ tagged: false });

            try {
                await rt.rollOverSchool(fixtures);

                const { importedStudent, pupilIds } = await seedCandidates(fixtures, [status]);

                /* INVITED and REJECTED both leave the pupil MISSING, since that view keys on
                 * ACTIVE alone. Asserted here so the two notions cannot be conflated again. */
                const [{ pupilStatus }] = await db
                    .selectFrom('lwp_view_pupil_status')
                    .where('pupilId', '=', pupilIds[0])
                    .select('pupilStatus')
                    .execute();

                expect(pupilStatus).toBe(status === PupilParentStatus.ACTIVE ? 'REGISTERED' : 'MISSING');

                await driveReviewToClassStep(fixtures);

                const proposed = (await proposedPupilLinks(importedStudent.id)).map((link) => String(link.platformEntityId));

                expect(proposed, `a ${status} parent link must keep the pupil matchable`).toEqual([pupilIds[0]]);
            } finally {
                await rt.cleanup(fixtures);
            }
        });
    }

    /* Nothing left to offer once the relink's IMPORTED wipe is accounted for, so the imported pupil
     * is created automatically - the leader is never shown a row whose only option is "create new".
     * Accepted: the abandoned records are the ones the relink deletes as orphaned. */
    for (const [label, statuses] of [
        ['no parent link at all', [null]],
        ['only an IMPORTED parent link', [PupilParentStatus.IMPORTED]]
    ] as Array<[string, Array<PupilParentStatus | null>]>) {
        test(`a pupil with ${label} is offered nothing, and so is created again automatically`, async () => {
            const fixtures = await rt.seedSchool({ tagged: false });

            try {
                await rt.rollOverSchool(fixtures);

                const { importedStudent, pupilIds } = await seedCandidates(fixtures, statuses);

                await driveReviewToClassStep(fixtures);

                /* The only link is the AUTO_SELECTED one recording the automatic create - no PENDING
                 * candidate ever asked the leader anything, and neither seeded record was chosen.
                 * The link's pupil id is not compared with the surviving pupil's: the relink that
                 * runs as the review completes deletes a parentless imported-linked pupil and
                 * recreates it under a new id, as it always has. */
                const links = await proposedPupilLinks(importedStudent.id);

                expect(links).toHaveLength(1);
                expect(links[0].status).toBe('AUTO_SELECTED');
                expect(pupilIds).not.toContain(String(links[0].platformEntityId));

                // A pupil exists for the imported student without the leader having done anything.
                await db
                    .selectFrom('lwp_pupil')
                    .where('importedStudentId', '=', importedStudent.id)
                    .select('id')
                    .executeTakeFirstOrThrow();
            } finally {
                await rt.cleanup(fixtures);
            }
        });
    }
});
