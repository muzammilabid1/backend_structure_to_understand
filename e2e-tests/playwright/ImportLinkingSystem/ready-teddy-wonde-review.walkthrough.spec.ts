/* Recorded walkthroughs of the Ready Teddy year switch and the Wonde import review - the full
 * experience a school leader has, from the year rolling over to the review being finished. The
 * school stays on the review for its later syncs too, so that finish is not a handover back to
 * the regular one.
 *
 * These are recordings, not regression tests. The assertions exist so a broken journey fails
 * loudly instead of quietly producing a misleading video; the coverage lives in
 * ready-teddy-wonde-review.spec.ts, which deliberately steps out to the overview mid-review.
 * This file never does, so the linking sequence plays back as one smooth run.
 *
 * Every journey seeds the same mix of pupils, because that mix is what a leader actually meets:
 * two who match the platform exactly and link themselves, one whose MIS record disagrees on
 * identity, and one who is new to the school. The new pupil has no candidate at all, so the
 * review creates their record automatically rather than showing a row whose only option would
 * be "create new" - the leader is left with exactly one decision.
 *
 * Ignoring a pupil or a class is not offered either: both options are withheld in the UI, because
 * the legacy relink recreates the record afterwards and this change deliberately does not touch
 * that code. The journeys assert the options are absent, so re-offering one without fixing the
 * relink fails here.
 *
 * Three journeys, covering the shapes a real school arrives in:
 *   multi-form           - tagged school. Its pre-admission cohort converts into a group across
 *                          classes at the switch, and the MIS holds SEVERAL classes for the new
 *                          year, each of which lands as a new registration class.
 *   single-form, matched - untagged school whose MIS class still has the name the platform
 *                          holds, so the class links itself and only the pupils need deciding.
 *   single-form, renamed - the same school, but the MIS class has been renamed over the summer,
 *                          so the leader confirms by hand that it is the class already there.
 *
 * The two single-form journeys are the same school and the same pupils, differing only in the
 * MIS class name - that one difference is what separates an auto-linked class from one the
 * leader has to confirm, which is the thing worth seeing side by side.
 *
 * Skipped unless RECORD_WALKTHROUGH=1, so CI never pays for them. Knobs:
 *   RECORD_WALKTHROUGH=1     required, else the whole file is skipped
 *   WALKTHROUGH_CAPTIONS=1   overlay explanatory captions into the recording
 *   PLAYWRIGHT_SLOWMO        ms between actions (default 500, for a watchable pace)
 *   CAPTION_HOLD_MS          how long a caption sits on screen before the journey moves on
 */
import type { Schema } from '@lwp/postgres-client';
import { expect, type Page, test, type TestInfo } from '@playwright/test';
import { type Kysely, type Selectable } from 'kysely';
import { ImportStatus } from 'lwp-shared';

import { generateFirstName, generateLastName, generateUPN, password } from '../constants';
import { createDb } from '../db';
import { acceptFeatureTooltipPrompt, login, waitForLoading } from '../utils';
import { createReadyTeddyFixtures, type Fixtures } from './readyTeddyWondeFixtures';

const RECORDING = process.env.RECORD_WALKTHROUGH === '1';
const CAPTIONS = process.env.WALKTHROUGH_CAPTIONS === '1';
const CAPTION_HOLD_MS = Number(process.env.CAPTION_HOLD_MS ?? 2600);

test.use({
    video: { mode: 'on', size: { width: 1280, height: 720 } },
    viewport: { width: 1280, height: 720 },
    launchOptions: { slowMo: Number(process.env.PLAYWRIGHT_SLOWMO ?? 500) },
    /* Without this an action on a locator that never appears waits out the whole test timeout;
     * a recording that has gone wrong should say so in seconds. */
    actionTimeout: 20_000
});

const db: Kysely<Schema.DB> = createDb();
const rt = createReadyTeddyFixtures(db);

test.describe('Ready Teddy Wonde review walkthrough', () => {
    test.skip(!RECORDING, 'Recording only: set RECORD_WALKTHROUGH=1 to produce screenshots and video.');

    test.afterAll(async () => {
        await db.destroy();
    });

    const CAPTION_ELEMENT_ID = '__lwp_walkthrough_caption__';
    const CAPTION_STORAGE_KEY = '__lwp_walkthrough_caption_text__';

    /* The caption bar is injected into the page itself, so it is recorded by Playwright's video
     * without any re-encoding afterwards. addInitScript re-runs on every document, and the text
     * is kept in localStorage, so the caption survives the reloads and route changes the journey
     * makes rather than vanishing at the first navigation.
     *
     * Caption wording deliberately avoids any phrase the specs assert on (for example "No data
     * for current academic year") - the bar is real DOM, so a collision would make getByText
     * ambiguous. */
    const installCaptionLayer = async (page: Page): Promise<void> => {
        if (!CAPTIONS) return;

        await page.addInitScript(
            ({ elementId, storageKey }) => {
                const paint = (): void => {
                    if (!document.body) return;

                    let bar = document.getElementById(elementId);

                    if (!bar) {
                        bar = document.createElement('div');
                        bar.id = elementId;
                        bar.style.cssText = [
                            'position:fixed',
                            'left:0',
                            'right:0',
                            'bottom:0',
                            'z-index:2147483647',
                            'padding:18px 28px',
                            'background:rgba(12,20,31,0.92)',
                            'color:#fff',
                            'font:600 19px/1.45 system-ui,-apple-system,Segoe UI,Roboto,sans-serif',
                            'text-align:center',
                            'pointer-events:none',
                            'white-space:pre-wrap'
                        ].join(';');
                        document.body.appendChild(bar);
                    }

                    let text = '';

                    try {
                        text = window.localStorage.getItem(storageKey) ?? '';
                    } catch {
                        text = '';
                    }

                    if (bar.textContent !== text) bar.textContent = text;
                    bar.style.display = text ? 'block' : 'none';
                };

                // The app re-renders and navigates client-side, so re-attach rather than assume.
                window.setInterval(paint, 200);
                document.addEventListener('DOMContentLoaded', paint);
            },
            { elementId: CAPTION_ELEMENT_ID, storageKey: CAPTION_STORAGE_KEY }
        );
    };

    /* Show a caption and hold it long enough to read. With captions off this is a no-op, so the
     * captioned and uncaptioned variants walk the same journey apart from the holds. */
    const caption = async (page: Page, text: string): Promise<void> => {
        if (!CAPTIONS) return;

        await page.evaluate(
            ({ text: value, elementId, storageKey }) => {
                try {
                    window.localStorage.setItem(storageKey, value);
                } catch {
                    /* private mode or storage disabled: the bar just stays empty */
                }

                const bar = document.getElementById(elementId);

                if (bar) {
                    bar.textContent = value;
                    bar.style.display = value ? 'block' : 'none';
                }
            },
            { text, elementId: CAPTION_ELEMENT_ID, storageKey: CAPTION_STORAGE_KEY }
        );

        await page.waitForTimeout(CAPTION_HOLD_MS);
    };

    const screenshot = async (page: Page, testInfo: TestInfo, name: string): Promise<void> => {
        await page.screenshot({ path: testInfo.outputPath(`${name}.png`), fullPage: true });
    };

    type PupilMix = {
        exactStudent: Selectable<Schema.ImportedStudent>;
        secondExactStudent: Selectable<Schema.ImportedStudent>;
        partialStudent: Selectable<Schema.ImportedStudent>;
        newStudent: Selectable<Schema.ImportedStudent>;
        partialPupil: Fixtures['pupils'][number];
    };

    /* The mix every journey uses: two MIS records identical to the platform's pupils (these link
     * themselves), one that shares a name but disagrees on identity, and one the school has never
     * held. Two auto-linked, two decisions - enough to show both halves of the pupil step. */
    const seedPupilMix = async (fixtures: Fixtures): Promise<PupilMix> => {
        const [exactPupil, secondExactPupil, partialPupil] = fixtures.pupils;
        const asDate = (value: unknown): string => new Date(value as string).toISOString().slice(0, 10);

        return {
            exactStudent: await rt.seedImportedStudent(fixtures, {
                forename: exactPupil.firstname,
                surname: exactPupil.lastname,
                UPN: exactPupil.UPN,
                dateOfBirth: asDate(exactPupil.dateOfBirth)
            }),
            secondExactStudent: await rt.seedImportedStudent(fixtures, {
                forename: secondExactPupil.firstname,
                surname: secondExactPupil.lastname,
                UPN: secondExactPupil.UPN,
                dateOfBirth: asDate(secondExactPupil.dateOfBirth)
            }),
            // Same name, different UPN: the MIS and the platform disagree, so the leader decides.
            partialStudent: await rt.seedImportedStudent(fixtures, {
                forename: partialPupil.firstname,
                surname: partialPupil.lastname,
                UPN: generateUPN(),
                dateOfBirth: '2022-01-01'
            }),
            // Joined over the summer, so the platform has never held them.
            newStudent: await rt.seedImportedStudent(fixtures, {
                forename: generateFirstName(),
                surname: generateLastName(),
                UPN: generateUPN(),
                dateOfBirth: '2022-02-02'
            }),
            partialPupil
        };
    };

    /* Log the leader in and land on the overview, with the sync prompt the rollover left behind. */
    const openAsLeader = async (page: Page, fixtures: Fixtures): Promise<void> => {
        await installCaptionLayer(page);
        await login(page, fixtures.leaderEmail, password);
        await page.waitForURL(/\/school/);
        await waitForLoading(page);
        await expect(page.getByTestId('school-overview-page')).toBeVisible();
        await acceptFeatureTooltipPrompt(page);
    };

    /* Year switch through to the review's first screen: the leader syncs, the school is routed to
     * the review, and they open it. Identical for every journey. */
    const syncAndOpenReview = async (page: Page, fixtures: Fixtures, testInfo: TestInfo, prefix: string): Promise<void> => {
        await caption(page, 'The new year has no MIS data yet, so the leader is prompted to sync with Wonde.');
        await screenshot(page, testInfo, `${prefix}-02-overview-sync-prompt`);

        await page.getByRole('button', { name: 'Sync with Wonde' }).click();
        await waitForLoading(page);
        await caption(page, 'The pull runs, and the school is handed to the review rather than the regular sync.');
        await page.reload();
        await waitForLoading(page);
        await screenshot(page, testInfo, `${prefix}-03-overview-data-imported`);

        await caption(page, 'The leader is asked to check the imported data before the launch can continue.');
        await page.getByRole('button', { name: 'Check imported data' }).click();
        await page.waitForURL(/\/school\/\d+\/data-changes/);
        await waitForLoading(page);
        await expect(page.getByTestId('link-pupils-page')).toBeVisible();
    };

    /* Closing shot for a journey that finished without the leader reaching the data-changes page,
     * so there is no "No remaining changes" heading to assert on. */
    const finishReviewFromOverview = async (
        page: Page,
        fixtures: Fixtures,
        testInfo: TestInfo,
        prefix: string,
        closingCaption: string
    ): Promise<void> => {
        const school = await db
            .selectFrom('lwp_school')
            .where('id', '=', fixtures.schoolId)
            .select('importStatus')
            .executeTakeFirstOrThrow();

        expect(school.importStatus).toBe(ImportStatus.COMPLETE);

        await page.goto(`/school/${fixtures.schoolId}`);
        await waitForLoading(page);
        await expect(page.getByTestId('school-overview-page')).toBeVisible();
        await caption(page, closingCaption);
        await screenshot(page, testInfo, `${prefix}-09-overview-review-done-sync-pending`);
    };

    /* The pupil step: two rows already matched, the new pupil already created, one decision left. */
    const resolvePupilStep = async (page: Page, mix: PupilMix, testInfo: TestInfo, prefix: string): Promise<void> => {
        await caption(
            page,
            'STEP 1 - PUPILS\nTwo pupils matched the platform exactly and have linked themselves, and the genuinely\nnew pupil was created automatically. One decision is left: the pupil whose MIS record\ndisagrees on identity.'
        );
        await screenshot(page, testInfo, `${prefix}-04-link-pupils`);

        /* The new pupil has no candidate, so the review created their record at sync time rather
         * than showing a row whose only option would have been "create new". */
        await expect(page.getByTestId(`platform-pupil-select-${mix.newStudent.forename}-${mix.newStudent.surname}`)).toHaveCount(0);

        await page.getByTestId(`platform-pupil-select-${mix.partialStudent.forename}-${mix.partialStudent.surname}`).click();
        /* Ignoring a pupil is withheld while the legacy relink would recreate the record anyway, so
         * the leader is never offered a choice that does not hold. */
        await expect(page.getByRole('option', { name: 'Ignore this pupil' })).toHaveCount(0);
        await page.getByRole('option', { name: `${mix.partialPupil.firstname} ${mix.partialPupil.lastname}` }).first().click();
        await caption(page, 'The disputed match is pointed at the pupil the school already holds, so no duplicate is made.');
        await screenshot(page, testInfo, `${prefix}-05-link-pupils-resolved`);

        await page.getByTestId('link-pupils-button').click();
        await waitForLoading(page);
        await expect(
            page.locator('.MuiAlert-message').filter({ hasText: 'External pupils linked successfully with LWP pupils' })
        ).toBeVisible();
        await waitForLoading(page);
    };

    const finishReview = async (page: Page, fixtures: Fixtures, testInfo: TestInfo, prefix: string, closingCaption: string): Promise<void> => {
        await expect(page.getByTestId('data-changes-last-import-title')).toContainText('No remaining changes');
        await caption(page, 'The review is finished, and the school is handed back to the regular nightly sync.');
        await screenshot(page, testInfo, `${prefix}-08-review-complete`);

        const school = await db
            .selectFrom('lwp_school')
            .where('id', '=', fixtures.schoolId)
            .select('importStatus')
            .executeTakeFirstOrThrow();

        expect(school.importStatus).toBe(ImportStatus.COMPLETE);

        await page.goto(`/school/${fixtures.schoolId}`);
        await waitForLoading(page);
        await expect(page.getByTestId('school-overview-page')).toBeVisible();
        await caption(page, closingCaption);
        await screenshot(page, testInfo, `${prefix}-09-overview-review-done-sync-pending`);
    };

    test('multi-form entry: cohort becomes a group across classes and several MIS classes arrive as new registration classes', async ({
        page
    }, testInfo) => {
        const fixtures = await rt.seedSchool({ tagged: true });
        const prefix = 'mfe';

        try {
            const mix = await seedPupilMix(fixtures);

            /* A multi-form-entry school's new year arrives as several classes, not one. Both are
             * new to the platform, so both become new registration classes alongside the group. */
            const misClassNames = ['Reception Maple', 'Reception Oak'];
            const importedClasses = [];

            for (const [index, name] of misClassNames.entries()) {
                importedClasses.push(
                    await rt.utils.createImportedClass(fixtures.importedSchoolId, {
                        id: `rtwc${Date.now().toString(36)}${index}`,
                        name,
                        importedFrom: 'WONDE',
                        periodIndex: fixtures.newPeriodIndex
                    })
                );
            }

            // Split the intake across the two forms, as a real two-form entry is.
            await rt.utils.addStudentToImportedClass(importedClasses[0].id, mix.exactStudent.id);
            await rt.utils.addStudentToImportedClass(importedClasses[0].id, mix.partialStudent.id);
            await rt.utils.addStudentToImportedClass(importedClasses[1].id, mix.secondExactStudent.id);
            await rt.utils.addStudentToImportedClass(importedClasses[1].id, mix.newStudent.id);

            await rt.rollOverSchool(fixtures);
            await rt.interceptWondeSync(page, fixtures);

            await openAsLeader(page, fixtures);
            await caption(
                page,
                'MULTI-FORM ENTRY SCHOOL\nThe academic year has just rolled over. This school is tagged for conversion, so its\npre-admission Ready Teddy cohort has become a group across classes.'
            );
            await screenshot(page, testInfo, `${prefix}-01-overview-after-year-switch`);

            await syncAndOpenReview(page, fixtures, testInfo, prefix);
            await resolvePupilStep(page, mix, testInfo, prefix);

            /* No class step at all. Both forms are new to the platform with no candidate to link to -
             * the converted Ready Teddy group is deliberately not offered - so the review created
             * both registration classes automatically instead of asking. */
            await expect(page.getByTestId('link-classes-page')).toHaveCount(0);
            await caption(
                page,
                'There is no class step. Both forms are new to the platform, so the review created them\nas registration classes automatically - the converted group is left alone alongside them.'
            );

            await finishReview(
                page,
                fixtures,
                testInfo,
                prefix,
                'That nightly sync will not run for hours. Everything the leader needs is already here:\nboth new registration classes, the converted group, and every pupil placed in a class.'
            );

            // Both forms landed as registration classes, and the group was left alone.
            const created = await db
                .selectFrom('lwp_school_class')
                .where('schoolId', '=', fixtures.schoolId)
                .where('name', 'in', misClassNames)
                .select(['name', 'isRegistrationClass'])
                .execute();

            expect(created).toHaveLength(2);
            expect(created.every((row) => row.isRegistrationClass)).toBe(true);

            const group = await db
                .selectFrom('lwp_school_class')
                .where('id', '=', fixtures.classId)
                .select(['isGroupAcrossClasses', 'importedSchoolClassId'])
                .executeTakeFirstOrThrow();

            expect(group.isGroupAcrossClasses).toBe(true);
            expect(group.importedSchoolClassId).toBeNull();
        } finally {
            await rt.cleanup(fixtures);
        }
    });

    /* Both single-form journeys seed the same school and the same pupils. The only difference is
     * whether the MIS still calls the class what the platform calls it - and that one difference
     * turns out to change the journey completely, which is why they are separate tests. */
    const seedSingleFormSchool = async (page: Page, misClassName: string | null) => {
        const fixtures = await rt.seedSchool({ tagged: false });
        const mix = await seedPupilMix(fixtures);

        const importedClass = await rt.utils.createImportedClass(fixtures.importedSchoolId, {
            id: `rtwc${Date.now().toString(36)}`,
            name: misClassName ?? fixtures.className,
            importedFrom: 'WONDE',
            periodIndex: fixtures.newPeriodIndex
        });

        for (const student of [mix.exactStudent, mix.secondExactStudent, mix.partialStudent, mix.newStudent]) {
            await rt.utils.addStudentToImportedClass(importedClass.id, student.id);
        }

        await rt.rollOverSchool(fixtures);
        await rt.interceptWondeSync(page, fixtures);

        return { fixtures, mix, importedClass };
    };

    test('single-form entry, class name unchanged: the class links itself, so the leader only ever sees the pupil step', async ({
        page
    }, testInfo) => {
        const prefix = 'sfe-matched';
        const { fixtures, mix, importedClass } = await seedSingleFormSchool(page, null);

        try {
            await openAsLeader(page, fixtures);
            await caption(
                page,
                'SINGLE-FORM ENTRY - CLASS NAME UNCHANGED\nThe year has rolled over. This school is not tagged for conversion, so its one class\nsimply became this year\u2019s registration class.'
            );
            await screenshot(page, testInfo, `${prefix}-01-overview-after-year-switch`);

            await syncAndOpenReview(page, fixtures, testInfo, prefix);
            await resolvePupilStep(page, mix, testInfo, prefix);

            /* No class step at all. The MIS class still carries the platform's name, so the import
             * matched it on sight and the review ran out of things to ask. */
            await expect(page.getByTestId('link-classes-page')).toHaveCount(0);
            await caption(
                page,
                'There is no class step. The MIS still calls the class what the platform calls it,\nso the import matched it on sight - the pupils were the only thing to decide.'
            );

            await finishReview(
                page,
                fixtures,
                testInfo,
                prefix,
                'One registration class, as before, now holding the pupils the MIS knows about.\nThe class itself needed no decision at all.'
            );

            // Matched to the class the school already had, and no second class was created.
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
        } finally {
            await rt.cleanup(fixtures);
        }
    });

    /* The same school with the class renamed in the MIS over the summer. The name no longer
     * identifies the class, but the pupils in it still do, so ClassLinkService proposes the class
     * the school already has and marks it low confidence for the leader to confirm. This is the
     * manual-confirmation counterpart to the auto-linked journey above. */
    test('single-form entry, class renamed in the MIS: the leader confirms it is the class already there', async ({
        page
    }, testInfo) => {
        const prefix = 'sfe-renamed';
        const misClassName = 'Reception 2026';
        const { fixtures, mix, importedClass } = await seedSingleFormSchool(page, misClassName);

        try {
            await openAsLeader(page, fixtures);
            await caption(
                page,
                'SINGLE-FORM ENTRY - CLASS RENAMED IN THE MIS\nSame school, same pupils. The only change: over the summer the class was renamed in\nthe MIS, from its platform name to \u201cReception 2026\u201d.'
            );
            await screenshot(page, testInfo, `${prefix}-01-overview-after-year-switch`);

            await syncAndOpenReview(page, fixtures, testInfo, prefix);
            await resolvePupilStep(page, mix, testInfo, prefix);

            await expect(page.getByTestId('link-classes-page')).toBeVisible();
            await caption(
                page,
                'STEP 2 - CLASSES\nThe rename means the name no longer matches, so the leader is asked about the class.'
            );
            await screenshot(page, testInfo, `${prefix}-06-link-classes`);

            await page.getByTestId(`platform-class-select-${misClassName}`).click();

            /* Withheld for the same reason as the pupil option: the legacy relink would recreate an
             * ignored class anyway. */
            await expect(page.getByRole('option', { name: 'Ignore this class' })).toHaveCount(0);

            /* The pupils still identify the class even though the name does not, so the school's own
             * registration class is offered as a low-confidence suggestion to confirm. */
            await expect(page.getByRole('option', { name: fixtures.className })).toBeVisible();
            await caption(
                page,
                `The class the school already has is suggested \u2014 matched by the pupils it holds\nrather than by its name, for the leader to confirm.`
            );
            await screenshot(page, testInfo, `${prefix}-07-link-classes-existing-class-suggested`);

            await page.getByRole('option', { name: fixtures.className }).first().click();
            await page.getByTestId('link-classes-button').click();
            await waitForLoading(page);
            await expect(
                page.locator('.MuiAlert-message').filter({ hasText: 'External classes linked successfully with LWP classes' })
            ).toBeVisible();
            await waitForLoading(page);

            await finishReview(
                page,
                fixtures,
                testInfo,
                prefix,
                'Still one registration class. The renamed MIS class was matched to the one the school\nalready had, so a rename no longer costs it a duplicate.'
            );

            // Matched to the original class, and no second class was created by the rename.
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
        } finally {
            await rt.cleanup(fixtures);
        }
    });
    /* ---------------------------------------------------------------------------------------
     * The remaining happy paths. Between them these cover every action the review can take on
     * a row - LINK, CREATE and IGNORE, for both pupils and classes - and the case where it is
     * asked for none of them.
     * ------------------------------------------------------------------------------------- */

    /* Every MIS record identical to a platform pupil, so all of them link on identity. */
    const seedExactStudents = async (fixtures: Fixtures) => {
        const asDate = (value: unknown): string => new Date(value as string).toISOString().slice(0, 10);

        return await Promise.all(
            fixtures.pupils.map((pupil) =>
                rt.seedImportedStudent(fixtures, {
                    forename: pupil.firstname,
                    surname: pupil.lastname,
                    UPN: pupil.UPN,
                    dateOfBirth: asDate(pupil.dateOfBirth)
                })
            )
        );
    };

    test('happy path, nothing to review: the MIS agrees with the platform, so one click finishes it', async ({ page }, testInfo) => {
        const prefix = 'zero';
        const fixtures = await rt.seedSchool({ tagged: false });

        try {
            const students = await seedExactStudents(fixtures);
            const importedClass = await rt.utils.createImportedClass(fixtures.importedSchoolId, {
                id: `rtwc${Date.now().toString(36)}`,
                name: fixtures.className,
                importedFrom: 'WONDE',
                periodIndex: fixtures.newPeriodIndex
            });

            for (const student of students) await rt.utils.addStudentToImportedClass(importedClass.id, student.id);

            await rt.rollOverSchool(fixtures);
            await rt.interceptWondeSync(page, fixtures);

            await openAsLeader(page, fixtures);
            await caption(
                page,
                'NOTHING TO REVIEW\nThe steady state: the MIS holds the same class and the same pupils the platform does.\nThis is what most years should look like.'
            );
            await screenshot(page, testInfo, `${prefix}-01-overview-after-year-switch`);

            await caption(page, 'The leader is prompted to sync, exactly as in every other journey.');
            await screenshot(page, testInfo, `${prefix}-02-overview-sync-prompt`);

            await page.getByRole('button', { name: 'Sync with Wonde' }).click();
            await waitForLoading(page);

            // Everything matched, so the review completed without ever showing the leader a step.
            await expect(page.getByTestId('school-overview-page')).toBeVisible();
            await expect(page.locator('.school-imported-data-sync')).toHaveCount(0);
            await caption(
                page,
                'Done. Every pupil and the class matched, so the review finished on the click itself -\nthe leader is never taken to a review screen at all.'
            );
            await screenshot(page, testInfo, `${prefix}-03-overview-complete-in-one-click`);

            await finishReviewFromOverview(
                page,
                fixtures,
                testInfo,
                prefix,
                'One registration class holding the same pupils, and the school already back on the\nregular nightly sync. No decisions were asked for.'
            );
        } finally {
            await rt.cleanup(fixtures);
        }
    });

    /* The school grows a second form. Pupils all match and the new form has no candidate - its only
     * possible outcome was "create new" - so the review creates it automatically and the whole
     * import finishes on the sync click, without the leader ever seeing a step. */
    test('happy path, a new class arrives: pupils all match and the new form is created automatically', async ({
        page
    }, testInfo) => {
        const prefix = 'newclass';
        const fixtures = await rt.seedSchool({ tagged: false });
        const newFormName = 'Reception Oak';

        try {
            const students = await seedExactStudents(fixtures);

            // The class the school already has, still under its own name, so it links itself.
            const existingForm = await rt.utils.createImportedClass(fixtures.importedSchoolId, {
                id: `rtwc${Date.now().toString(36)}a`,
                name: fixtures.className,
                importedFrom: 'WONDE',
                periodIndex: fixtures.newPeriodIndex
            });
            // A second form, new to the platform.
            const newForm = await rt.utils.createImportedClass(fixtures.importedSchoolId, {
                id: `rtwc${Date.now().toString(36)}b`,
                name: newFormName,
                importedFrom: 'WONDE',
                periodIndex: fixtures.newPeriodIndex
            });

            await rt.utils.addStudentToImportedClass(existingForm.id, students[0].id);
            await rt.utils.addStudentToImportedClass(existingForm.id, students[1].id);
            await rt.utils.addStudentToImportedClass(newForm.id, students[2].id);

            await rt.rollOverSchool(fixtures);
            await rt.interceptWondeSync(page, fixtures);

            await openAsLeader(page, fixtures);
            await caption(
                page,
                'A SECOND FORM ARRIVES\nEvery pupil in the MIS matches a pupil the platform already holds, so none of them\nneed deciding. The MIS has split them across two forms, one of them brand new.'
            );
            await screenshot(page, testInfo, `${prefix}-01-overview-after-year-switch`);

            await caption(page, 'The leader is prompted to sync, exactly as in every other journey.');
            await screenshot(page, testInfo, `${prefix}-02-overview-sync-prompt`);

            await page.getByRole('button', { name: 'Sync with Wonde' }).click();
            await waitForLoading(page);

            /* Every pupil matched, the existing form matched itself, and the new form - with no
             * candidate to offer - was created automatically. Nothing was ever asked. */
            await expect(page.getByTestId('school-overview-page')).toBeVisible();
            await expect(page.locator('.school-imported-data-sync')).toHaveCount(0);
            await caption(
                page,
                `Done on the click itself. The new form, ${newFormName}, had no possible match, so the\nreview created it as a registration class rather than asking the leader to say the obvious.`
            );
            await screenshot(page, testInfo, `${prefix}-03-overview-complete-in-one-click`);

            await finishReviewFromOverview(
                page,
                fixtures,
                testInfo,
                prefix,
                'Two registration classes now - the one the school had, and the new form from the MIS.\nNeither the pupils nor the classes needed a single decision.'
            );

            // The second class exists, is a registration class, and records the automatic create.
            const createdForm = await db
                .selectFrom('lwp_school_class')
                .where('schoolId', '=', fixtures.schoolId)
                .where('name', '=', newFormName)
                .select(['id', 'isRegistrationClass', 'importedSchoolClassId'])
                .executeTakeFirstOrThrow();

            expect(createdForm.isRegistrationClass).toBe(true);
            expect(createdForm.importedSchoolClassId).toBe(newForm.id);

            const newFormLinks = await db
                .selectFrom('imported_school_data_proposed_link')
                .where('entityType', '=', 'CLASS')
                .where('importedEntityId', '=', newForm.id)
                .where('status', '=', 'AUTO_SELECTED')
                .select('platformEntityId')
                .execute();

            expect(newFormLinks.map((link) => String(link.platformEntityId))).toEqual([String(createdForm.id)]);

            const classCount = await db
                .selectFrom('lwp_school_class')
                .where('schoolId', '=', fixtures.schoolId)
                .select(db.fn.countAll<string>().as('count'))
                .executeTakeFirstOrThrow();

            expect(Number(classCount.count)).toBe(2);
        } finally {
            await rt.cleanup(fixtures);
        }
    });
});
