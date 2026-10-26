/* LEA-6643: the pupil linking screen tells the leader what they would be linking into.
 *
 * When the review cannot decide a pupil link for itself, the leader picks a platform pupil for the
 * MIS record. Two things about the candidate matter for that decision and used to be invisible:
 *
 *   - whether the platform pupil is already in use: the status the teacher's pupil list shows,
 *     parents linked (and how many are active), feedback left (activities, reading logs,
 *     scrapbook) and when they were last active. Linking an MIS record into a pupil a family is
 *     already using is a very different act from linking it into an empty record;
 *   - whether the platform pupil was linked to this very MIS record before. A Wonde resync can
 *     drop the link (LEA-6714); when the review then offers the same pupil back, the leader
 *     should be told it is the one the record used to point at, not asked to guess.
 *
 * This journey seeds one pupil of each kind and walks the two places the information appears:
 * the candidate dropdown (a "Previously linked" marker) and the comparison drawer (a "Platform
 * activity" block, a Status column in the parent table, and a previously-linked tag).
 *
 * It is also recordable: RECORD_WALKTHROUGH=1 adds video, slow motion and captions (see
 * recording.ts). The assertions run either way.
 */
import type { Schema } from '@lwp/postgres-client';
import { expect, type Page, test } from '@playwright/test';
import { type Kysely } from 'kysely';
import { PupilParentStatus } from 'lwp-shared';

import { generateFirstName, generateLastName, generateUPN, generateUserEmail, password } from '../constants';
import { createDb } from '../db';
import { acceptFeatureTooltipPrompt, login, waitForLoading } from '../utils';
import { caption, installCaptionLayer, recordingOptions, screenshot } from './recording';
import { createReadyTeddyFixtures, type Fixtures } from './readyTeddyWondeFixtures';

test.use(recordingOptions());

const db: Kysely<Schema.DB> = createDb();
const rt = createReadyTeddyFixtures(db);

const daysAgo = (days: number): Date => new Date(Date.now() - days * 24 * 60 * 60 * 1000);

test.describe('Pupil linking comparison preview', () => {
    test.afterAll(async () => {
        await db.destroy();
    });

    /* The overview, then the sync, then the review's first screen. Same as every ImportLinkingSystem
     * journey: the Wonde pull is faked, the MIS rows are already seeded. */
    const openLinkPupils = async (page: Page, fixtures: Fixtures): Promise<void> => {
        await rt.rollOverSchool(fixtures);
        await rt.interceptWondeSync(page, fixtures);
        await installCaptionLayer(page);

        await login(page, fixtures.leaderEmail, password);
        await page.waitForURL(/\/school/);
        await waitForLoading(page);
        await expect(page.getByTestId('school-overview-page')).toBeVisible();
        await acceptFeatureTooltipPrompt(page);

        await caption(page, 'A new academic year. The MIS holds this year’s pupils, so the leader syncs with Wonde.');
        await page.getByRole('button', { name: 'Sync with Wonde' }).click();
        await waitForLoading(page);
        await page.reload();
        await waitForLoading(page);

        await expect(page.getByText('Data imported - please check to continue')).toBeVisible();
        await caption(page, 'Two MIS records could not be linked automatically, so the leader is asked to check them.');
        await page.getByRole('button', { name: 'Check imported data' }).click();
        await page.waitForURL(/\/school\/\d+\/data-changes/);
        await waitForLoading(page);
        await expect(page.getByTestId('link-pupils-page')).toBeVisible();
    };

    const openDropdown = async (page: Page, student: { forename: string; surname: string }) => {
        await page.getByTestId(`platform-pupil-select-${student.forename}-${student.surname}`).click();

        const options = page.getByRole('option');

        await expect(options.first()).toBeVisible();

        return options;
    };

    const openCompareDrawer = async (page: Page, student: { forename: string; surname: string }) => {
        await page.getByTestId(`imported-student-compare-icon-${student.forename}-${student.surname}`).click();
        await waitForLoading(page);

        const drawer = page.locator('.compare-details-drawer');

        await expect(drawer.locator('.pupil-first-name').first()).toBeVisible();

        return drawer;
    };

    const closeCompareDrawer = async (page: Page): Promise<void> => {
        await page.getByTestId('compare-pupil-details-drawer-close-button').click();
        await expect(page.locator('.compare-details-drawer')).toHaveCount(0);
    };

    test('the leader can see whether a candidate pupil is already in use and whether it was linked to this MIS record before', async ({
        page
    }, testInfo) => {
        const fixtures = await rt.seedSchool({ tagged: false });
        const [usedPupil, quietPupil] = fixtures.pupils;
        const feedbackIds: string[] = [];

        try {
            /* A real year group on the fixture class, so the candidate's class reads "Reception - ..."
             * in the dropdown the way it does for a real school. */
            const reception = await db
                .selectFrom('static_lwp_year_group')
                .where('year', '=', 'Reception')
                .select('id')
                .executeTakeFirstOrThrow();

            await db.updateTable('lwp_school_class').set({ yearGroup: reception.id }).where('id', '=', fixtures.classId).execute();

            const importedClass = await rt.utils.createImportedClass(fixtures.importedSchoolId, {
                id: `rtwp${Date.now().toString(36)}`,
                name: 'Reception Willow',
                importedFrom: 'WONDE',
                periodIndex: fixtures.newPeriodIndex
            });

            /* The pupil already in use: the fixture's active parent plus a second, still-invited one,
             * and three pieces of feedback - an activity, a reading log and a scrapbook entry - the
             * latest three days ago. A deleted entry's tombstone is also left, and must not count; nor
             * must a teacher's comment or a parent the school rejected. */
            const invitedFirstname = generateFirstName();
            const invitedLastname = generateLastName();
            const invitedParent = await rt.utils.createUser({
                firstname: invitedFirstname,
                lastname: invitedLastname,
                email: generateUserEmail(invitedFirstname, invitedLastname),
                type: 'PARENT',
                userStatus: 'INVITED',
                schoolId: fixtures.schoolId
            });

            fixtures.parentIds.push(invitedParent.id);
            await rt.utils.addParentToPupil(usedPupil.id, invitedParent.id, false, PupilParentStatus.INVITED);

            const rejectedFirstname = generateFirstName();
            const rejectedLastname = generateLastName();
            const rejectedParent = await rt.utils.createUser({
                firstname: rejectedFirstname,
                lastname: rejectedLastname,
                email: generateUserEmail(rejectedFirstname, rejectedLastname),
                type: 'PARENT',
                userStatus: 'ACTIVE',
                schoolId: fixtures.schoolId
            });

            fixtures.parentIds.push(rejectedParent.id);
            await rt.utils.addParentToPupil(usedPupil.id, rejectedParent.id, false, PupilParentStatus.REJECTED);

            const leaveFeedback = async (fields: Parameters<typeof rt.utils.createPupilFeedback>[1]): Promise<string> => {
                // an original entry needs an author (CHK_lpf_logcreatedby_or_user_required_for_original)
                const feedback = await rt.utils.createPupilFeedback(usedPupil.id, {
                    userType: 'PARENT',
                    userId: fixtures.parentIds[0],
                    ...fields
                });

                feedbackIds.push(feedback.id);

                return feedback.id;
            };

            const firstFeedbackId = await leaveFeedback({ type: 'ACTIVITY', logCreatedAt: daysAgo(33) });

            await leaveFeedback({
                type: 'READING',
                bookName: 'The Gruffalo',
                readingType: 'HOME',
                bookReadAt: daysAgo(12),
                logCreatedAt: daysAgo(12)
            });
            await leaveFeedback({ type: 'SCRAPBOOK', logCreatedAt: daysAgo(3) });
            // the copy a delete leaves behind, pointing at the row it replaced
            await leaveFeedback({ type: 'ACTIVITY', logCreatedAt: daysAgo(1), originalFeedbackId: firstFeedbackId });
            // a teacher's comment is not the family using the platform
            await leaveFeedback({ type: 'ACTIVITY', userType: 'TEACHER', logCreatedAt: daysAgo(1) });

            /* The MIS record this pupil was linked to on an earlier import. The MIS has since changed
             * the pupil's name and corrected the date of birth, so the review cannot carry the link
             * forward on its own and the leader is asked - with the standing link still stamped on the
             * platform pupil, exactly as a dropped Wonde link leaves it. */
            const renamedStudent = await rt.seedImportedStudent(fixtures, {
                forename: generateFirstName(),
                surname: generateLastName(),
                UPN: usedPupil.UPN,
                dateOfBirth: '2022-03-11'
            });

            await db.updateTable('lwp_pupil').set({ importedStudentId: renamedStudent.id }).where('id', '=', usedPupil.id).execute();

            /* The quiet pupil: one active parent from the fixture, nothing else. Its MIS record shares
             * the name but not the UPN or date of birth, so it too needs the leader. */
            const quietStudent = await rt.seedImportedStudent(fixtures, {
                forename: quietPupil.firstname,
                surname: quietPupil.lastname,
                UPN: generateUPN(),
                dateOfBirth: '2022-01-01'
            });

            for (const student of [renamedStudent, quietStudent]) {
                await rt.utils.addStudentToImportedClass(importedClass.id, student.id);
            }

            await openLinkPupils(page, fixtures);
            await screenshot(page, testInfo, '01-link-pupils');

            // --- The pupil already in use, previously linked to this MIS record -------------------

            await caption(
                page,
                `${renamedStudent.forename} ${renamedStudent.surname} is new to the MIS by name, but the platform pupil offered is the one this record used to be linked to.`
            );

            const usedOptions = await openDropdown(page, renamedStudent);
            const usedCandidate = usedOptions.filter({ hasText: `${usedPupil.firstname} ${usedPupil.lastname}` });

            await expect(usedCandidate).toHaveCount(1);
            await expect(usedCandidate.locator('.select-item-sub-text')).toContainText('Previously linked');
            await expect(usedCandidate.locator('.select-item-sub-text')).toContainText('Reception');
            await caption(page, 'The dropdown says so: "Previously linked", next to the pupil’s current class.');
            await screenshot(page, testInfo, '02-dropdown-previously-linked');
            await page.keyboard.press('Escape');

            await caption(page, 'Comparing the two records shows what the platform already holds for this pupil.');

            const usedDrawer = await openCompareDrawer(page, renamedStudent);

            await expect(usedDrawer.locator('[data-test$="previously-linked-tag"]')).toBeVisible();
            await expect(usedDrawer.locator('.pupil-status')).toHaveText('Active this term');
            await expect(usedDrawer.locator('.pupil-linked-parents')).toHaveText('2 (1 active)');
            await expect(usedDrawer.locator('.pupil-feedback-count')).toHaveText('3');
            await expect(usedDrawer.locator('.pupil-last-active')).not.toHaveText('Never');
            await expect(usedDrawer.locator('.pupil-last-active')).not.toHaveText('-');

            const statuses = usedDrawer.locator('.parent-link-status');

            await expect(statuses).toHaveCount(3);
            await expect(statuses.filter({ hasText: 'ACTIVE' })).toHaveCount(1);
            await expect(statuses.filter({ hasText: 'INVITED' })).toHaveCount(1);
            await expect(statuses.filter({ hasText: 'REJECTED' })).toHaveCount(1);

            await caption(
                page,
                'Active this term: two parents linked, one of them active, and three pieces of feedback left. The tag confirms this is the pupil the MIS record pointed at before.'
            );
            await screenshot(page, testInfo, '03-drawer-in-use-previously-linked');
            await usedDrawer.locator('.parent-list-table').scrollIntoViewIfNeeded();
            await caption(
                page,
                'Each parent shows their status, so an invitation still pending - or a parent the school rejected - is visible at a glance.'
            );
            await screenshot(page, testInfo, '04-drawer-parent-status');
            await closeCompareDrawer(page);

            // --- The quiet pupil: never linked to this record, barely used ------------------------

            await caption(
                page,
                `${quietStudent.forename} ${quietStudent.surname} matches a platform pupil by name only. That pupil has not been linked to this record before.`
            );

            const quietOptions = await openDropdown(page, quietStudent);
            const quietCandidate = quietOptions.filter({ hasText: `${quietPupil.firstname} ${quietPupil.lastname}` });

            await expect(quietCandidate).toHaveCount(1);
            await expect(quietCandidate.locator('.select-item-sub-text')).not.toContainText('Previously linked');
            await screenshot(page, testInfo, '05-dropdown-not-previously-linked');
            await page.keyboard.press('Escape');

            const quietDrawer = await openCompareDrawer(page, quietStudent);

            await expect(quietDrawer.locator('[data-test$="previously-linked-tag"]')).toHaveCount(0);
            await expect(quietDrawer.locator('.pupil-status')).toHaveText('Accessed the site');
            await expect(quietDrawer.locator('.pupil-linked-parents')).toHaveText('1 (1 active)');
            await expect(quietDrawer.locator('.pupil-feedback-count')).toHaveText('0');
            await expect(quietDrawer.locator('.pupil-last-active')).toHaveText('Never');
            await expect(quietDrawer.locator('.parent-link-status')).toHaveCount(1);

            await caption(page, 'No tag, one parent, no feedback yet: linking here merges into a record nobody has started using.');
            await screenshot(page, testInfo, '06-drawer-quiet-pupil');
            await closeCompareDrawer(page);

            await caption(page, 'The leader now knows what each link would merge into before saving anything.');
        } finally {
            // Feedback is outside the fixture cleanup's remit.
            await db.deleteFrom('lwp_pupil_feedback_history').where('lwpPupilId', '=', usedPupil.id).execute();
            if (feedbackIds.length > 0) await db.deleteFrom('lwp_pupil_feedback').where('id', 'in', feedbackIds).execute();
            await rt.cleanup(fixtures);
        }
    });
});
