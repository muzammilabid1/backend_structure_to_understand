import { expect, test, type Page } from '@playwright/test';
import type { Schema } from '@lwp/postgres-client';
import { type Kysely } from 'kysely';
import { UserStatus, UserType } from 'lwp-shared';

import {
    admin,
    generateFirstName,
    generateLastName,
    generateSchoolName,
    generateUserEmail,
    moneySkillsDomainId,
    moneySkillsSubjectId,
    moneySkillsSubjectName,
    password,
    readyTeddySubjectId
} from './constants';
import { createDb } from './db';
import { createUtils } from './dbUtils';
import {
    getTokenFromLogin,
    getWholeSchoolAutoSchedulePrompts,
    markMoneySkillsWelcomeSeen,
    removeWholeSchoolSequenceAssignment
} from './graphql';
import {
    acceptFeatureTooltipPrompt,
    adminOrTeacherSignOut,
    createSchoolAndDummyWondeData,
    login,
    openSideDrawer,
    waitForLoading
} from './utils';

/**
 * E2E coverage for whole-school auto-scheduling (LEA-6504), built slice by slice from LEA-6694.
 *
 * An admin builds a **whole-school sequence**: one existing class sequence per year group, for one
 * subject and one academic year. Publishing it offers it to every entitled school on the member
 * sequences' own dates, and a school leader then schedules every class in their school in one action.
 *
 * **Covered: the feature end to end.** The header (LEA-6694), one class sequence per year group
 * (LEA-6695), publishing with its readiness checks (LEA-6696), what a school is then shown
 * (LEA-6697), the one action that schedules every class in it (LEA-6698), and the Auto schedule tab
 * on Set a topic that makes it reachable.
 *
 * The scheduling scenario asserts **against the database** rather than against rendered text, the way
 * `topic-sequencing.spec.ts` asserts its dates. What matters is that rows exist for every class on the
 * right dates; a screen that says so proves only that the screen says so.
 *
 * **The leader scenarios run in the same test as the admin ones, deliberately.** What the leader is
 * shown is what the admin published moments earlier, through the real publish button, so the two
 * halves are joined by the feature rather than by a fixture asserting they agree.
 *
 * **Saving and publishing check different things, and the scenarios are split along that line.**
 * Saving refuses what is wrong, meaning a member that could never legally be one, and accepts a
 * partially covered sequence without complaint. Publishing refuses what is not ready, which is only
 * the case of no members at all, and merely warns about the gaps.
 *
 * A new spec rather than an extension of `topic-sequencing.spec.ts`, which is one test with numbered
 * scenarios and is already at 50 on the class-level stack. Adding to it would mean every slice in this
 * feature renumbers it, and that numbering has already collided once between branches.
 *
 * ## The fixture seeds more than this slice needs, deliberately
 *
 * Two Reception classes and one Year 1 class. Both shapes are load-bearing and were seeded by
 * LEA-6694 before anything read them:
 *   - **two classes in one year group**, so "one member serves many classes" is actually exercised.
 *     LEA-6697 asserts that Reception's row reads 2, and LEA-6698's fan-out would otherwise pass
 *     without testing anything;
 *   - **a year group with no member**, which Year 1 is because the spec gives a member to Reception
 *     only. That is LEA-6697's skip path.
 *
 * The fixture also moves the school into the year this spec builds in, which the leader scenarios
 * depend on entirely. See `seedWholeSchoolData` for why that is not `isFutureAcademicYear`.
 *
 * ## Cleanup, and why it is not by name
 *
 * A whole-school sequence is global static data, like the class sequences it will hold: left behind, it
 * would be offered to every entitled school. It also has no name to prefix, deliberately, because
 * subject plus academic year identifies it. So cleanup is scoped to that pair instead, and the pair is
 * chosen to be one no real admin would be using: see `specPeriodIndex`.
 */
test.describe('Whole-school auto-scheduling', () => {
    let db: Kysely<Schema.DB>;
    let utils: ReturnType<typeof createUtils>;
    /** Set by the fixture, so the run can clean up after itself without re-deriving the year. */
    let specPeriodIndexForCleanup: number | null = null;

    test.beforeAll(async () => {
        db = createDb();
        utils = createUtils(db);
    });

    test.afterAll(async () => {
        // Everything this spec creates is global static data, so leaving it behind would change what
        // the next run, and every real admin, is offered. The fixture cleans up before the run too,
        // because a crashed earlier run cannot clean up after itself.
        if (specPeriodIndexForCleanup !== null) await removeSpecWholeSchoolSequences(db, specPeriodIndexForCleanup);

        await db.destroy();
    });

    test('An admin creates a draft whole-school sequence', async ({ page }) => {
        const seed = await seedWholeSchoolData(db, utils);
        const { specPeriodName, currentPeriodName } = seed;

        specPeriodIndexForCleanup = seed.specPeriodIndex;

        await login(page, admin, password);
        await page.waitForURL(/\/admin/);
        await waitForLoading(page);

        // ---- Scenario 1: the Sequences area now has two tabs, and the class list is untouched ----------
        // The existing list gets a label for the first time. Asserting it still renders its own table is
        // what makes adding the tab strip a change to navigation rather than to the page under it.
        await openSideDrawer(page);
        await page.getByTestId('sequences-common-drawer-list').click();
        await page.waitForURL(/\/admin\/sequences/);
        await waitForLoading(page);
        await expect(page.getByTestId('admin-sequences-page')).toBeVisible();
        await expect(page.getByTestId('sequences-tab-class')).toBeVisible();
        await expect(page.getByTestId('sequences-tab-whole-school')).toBeVisible();

        // ---- Scenario 2: the whole-school tab has its own URL and starts empty -------------------------
        // Its own URL is the reason it is a link rather than local state: it can be bookmarked, reloaded,
        // and returned to from the create screen, which scenario 3 relies on.
        await page.getByTestId('sequences-tab-whole-school').click();
        await page.waitForURL(/\/admin\/sequences\/whole-school/);
        await waitForLoading(page);
        await expect(page.getByTestId('admin-whole-school-sequences-page')).toBeVisible();

        /*
         * The spec's own subject and year is absent, rather than the list being empty.
         *
         * The empty state is deliberately not asserted here. This list shows every whole-school
         * sequence there is, so it only renders on a database that has none at all, and nothing this
         * spec does can guarantee that: a real admin's row, or one left by another suite, is enough.
         * Asserting it made this scenario fail for something that was not the feature's fault.
         */
        const existing = await db
            .selectFrom('static_lwp_whole_school_sequence')
            .where('subjectId', '=', moneySkillsSubjectId)
            .where('periodIndex', '=', seed.specPeriodIndex)
            .select(['id'])
            .execute();

        expect(existing).toHaveLength(0);

        // ---- Scenario 3: an admin creates one, and it is listed as a draft -----------------------------
        // Subject and academic year and nothing else: there is no name field, and its absence is asserted
        // rather than assumed, because adding one later would be a schema decision rather than a UI one.
        await page.getByTestId('create-whole-school-sequence-button').click();
        await page.waitForURL(/\/admin\/sequences\/whole-school\/new/);
        await waitForLoading(page);
        await expect(page.getByTestId('create-whole-school-sequence-page')).toBeVisible();
        await expect(page.getByTestId('whole-school-sequence-name-input')).toHaveCount(0);

        /*
         * The form arrives already filled in. Money Skills is the only programme offered whole-school
         * for now, so its select states that rather than asking, and the academic year defaults to the
         * current one because that is what an admin is building for almost every time.
         *
         * The subject is asserted **locked**, not merely selected. It is the one control an admin
         * cannot correct if it is wrong, so a regression that quietly re-enabled it while the backend
         * still refuses other programmes would be a dead end rather than a visible error.
         */
        await expect(page.getByTestId('whole-school-sequence-subject-select')).toContainText(moneySkillsSubjectName);
        await expect(page.locator('[data-test="whole-school-sequence-subject-select"] [role="combobox"]')).toHaveAttribute(
            'aria-disabled',
            'true'
        );
        await expect(page.getByTestId('whole-school-sequence-period-select')).toContainText(currentPeriodName);

        // The year is a default rather than a decision, so it can still be changed. This spec builds in
        // a future year deliberately; see `seedWholeSchoolData` for why it will not touch the current one.
        await selectOption(page, 'whole-school-sequence-period-select', specPeriodName);
        await page.getByTestId('save-whole-school-sequence-button').click();

        await page.waitForURL(/\/admin\/sequences\/whole-school$/);
        await waitForLoading(page);

        const row = await db
            .selectFrom('static_lwp_whole_school_sequence')
            .where('subjectId', '=', moneySkillsSubjectId)
            .where('periodIndex', '=', seed.specPeriodIndex)
            .select(['id', 'status'])
            .executeTakeFirstOrThrow();

        // Draft asserted against the database as well as on screen. The status is what slice 3's Publish
        // will move, and a row created as PUBLISHED would be offered to every school the moment the
        // leader-facing half lands, which no rendered label would catch.
        expect(row.status).toEqual('DRAFT');

        const listRow = page.getByTestId(`whole-school-sequence-open-${row.id}`);

        await expect(listRow).toContainText(moneySkillsSubjectName);
        await expect(page.getByTestId('whole-school-sequences-table')).toContainText(specPeriodName);
        await expect(page.getByTestId('whole-school-sequences-table')).toContainText('Draft');

        // ---- Scenario 4: reopening it shows what was saved ---------------------------------------------
        // The academic year matters most here: the form offers the current year and later, so a row on any
        // other year would come back with its select blanked and be silently moved on the next save.
        await listRow.click();
        await page.waitForURL(new RegExp(`/admin/sequences/whole-school/${row.id}`));
        await waitForLoading(page);
        await expect(page.getByTestId('edit-whole-school-sequence-page')).toBeVisible();
        await expect(page.getByTestId('whole-school-sequence-subject-select')).toContainText(moneySkillsSubjectName);
        await expect(page.getByTestId('whole-school-sequence-period-select')).toContainText(specPeriodName);

        // ---- Scenario 4b: every year group is a row, and the picker offers only what may be saved ------
        // The three seeded decoys are the point: an interval sequence carries no dates so it has nothing
        // to show a leader, one from another academic year would let last year's content into this year,
        // and the `Unknown` year group is what the Wonde import assigns to a class it could not map.
        await expect(page.getByTestId('whole-school-sequence-members-table')).toBeVisible();
        await expect(page.getByTestId(`whole-school-member-row-${RECEPTION_YEAR_GROUP_ID}`)).toBeVisible();
        await expect(page.getByTestId(`whole-school-member-row-${YEAR_ONE_YEAR_GROUP_ID}`)).toBeVisible();
        await expect(page.getByTestId(`whole-school-member-row-${seed.unknownYearGroupId}`)).toHaveCount(0);

        await page.getByTestId(`whole-school-member-select-${RECEPTION_YEAR_GROUP_ID}`).click();
        await expect(page.getByRole('option', { name: seed.receptionSequenceName })).toBeVisible();
        await expect(page.getByRole('option', { name: seed.intervalSequenceName })).toHaveCount(0);
        await expect(page.getByRole('option', { name: seed.otherYearSequenceName })).toHaveCount(0);

        // ---- Scenario 4c: a sequence is chosen for one year group, and its own dates are shown ---------
        // The Dates column is read-only and comes from the sequence's own topics. A whole-school sequence
        // holds no dates at all, so there is deliberately nothing to edit here or anywhere in the flow.
        await page.getByRole('option', { name: seed.receptionSequenceName }).click();
        await expect(page.getByTestId(`whole-school-member-dates-${RECEPTION_YEAR_GROUP_ID}`)).not.toContainText('-');

        // Year 1 is deliberately left empty. A partially covered whole-school sequence is valid and must
        // save: content for one year group is often not ready, and refusing would hold up the others.
        await page.getByTestId('save-whole-school-sequence-button').click();
        await page.waitForURL(/\/admin\/sequences\/whole-school$/);
        await waitForLoading(page);

        const members = await db
            .selectFrom('static_lwp_whole_school_sequence_member')
            .where('wholeSchoolSequenceId', '=', row.id)
            .select(['sequenceId', 'yearGroupId'])
            .execute();

        expect(members).toHaveLength(1);
        expect(String(members[0].sequenceId)).toEqual(seed.receptionSequenceId);
        /*
         * The year group is asserted against the database rather than the screen, because the client
         * never sends it: the API reads it off the sequence. A wrong value here would be a row whose own
         * two columns contradict each other, which no rendered label would show.
         */
        expect(String(members[0].yearGroupId)).toEqual(RECEPTION_YEAR_GROUP_ID);

        // ---- Scenario 4d: reopening shows the member, and clearing it saves as empty ------------------
        await page.getByTestId(`whole-school-sequence-open-${row.id}`).click();
        await page.waitForURL(new RegExp(`/admin/sequences/whole-school/${row.id}`));
        await waitForLoading(page);
        await expect(page.getByTestId(`whole-school-member-select-${RECEPTION_YEAR_GROUP_ID}`)).toContainText(seed.receptionSequenceName);

        await selectOption(page, `whole-school-member-select-${RECEPTION_YEAR_GROUP_ID}`, 'No sequence');
        await page.getByTestId('save-whole-school-sequence-button').click();
        await page.waitForURL(/\/admin\/sequences\/whole-school$/);
        await waitForLoading(page);

        // Clearing every member is a real state, not the same as saying nothing about them, so the row
        // must genuinely have none left rather than keeping the one it had.
        const clearedMembers = await db
            .selectFrom('static_lwp_whole_school_sequence_member')
            .where('wholeSchoolSequenceId', '=', row.id)
            .select(['id'])
            .execute();

        expect(clearedMembers).toHaveLength(0);

        // ---- Scenario 4e: publishing one with no members at all is refused ----------------------------
        // The row was just cleared, so this is the empty case exactly as an admin would reach it: it
        // would offer every entitled school nothing, which is the one readiness rule that blocks.
        await page.getByTestId(`whole-school-sequence-open-${row.id}`).click();
        await page.waitForURL(new RegExp(`/admin/sequences/whole-school/${row.id}`));
        await waitForLoading(page);
        await expect(page.getByTestId('whole-school-sequence-status')).toContainText('Draft');

        await page.getByTestId('publish-whole-school-sequence-button').click();
        await expect(page.getByTestId('dialog-content')).toContainText('Give at least one year group a topic sequence before publishing');

        // Refused means refused: still a draft in the database, not merely on screen.
        const stillDraft = await db
            .selectFrom('static_lwp_whole_school_sequence')
            .where('id', '=', row.id)
            .select(['status'])
            .executeTakeFirstOrThrow();

        expect(stillDraft.status).toEqual('DRAFT');

        /*
         * Reloaded rather than carrying on from here, because an error `callSnackbar` renders as a
         * **modal dialog** rather than as an alert, and a modal blocks every click underneath it. The
         * next scenario would otherwise wait out the full test timeout on a select it can never
         * reach. Scenario 6 gets away with the same dialog only because its next step is a navigation.
         */
        await page.reload();
        await waitForLoading(page);

        // ---- Scenario 4f: publishing a partial one succeeds, and names the gaps -----------------------
        /*
         * The heart of this slice. Only Reception gets a sequence, so Year 1 is a genuine gap, and the
         * publication must go through anyway: content for one year group is often not ready and
         * blocking on it would hold up every other year group. A class in an uncovered year group is
         * skipped later with a reason rather than refused.
         *
         * The warning naming the year group is the whole value of the message. "Something is missing"
         * would leave an admin opening every row to find out what.
         */
        await selectOption(page, `whole-school-member-select-${RECEPTION_YEAR_GROUP_ID}`, seed.receptionSequenceName);
        await page.getByTestId('publish-whole-school-sequence-button').click();

        await expect(page.locator('.MuiAlert-message').filter({ hasText: 'Published' })).toContainText(YEAR_ONE_YEAR_GROUP);
        await page.waitForURL(/\/admin\/sequences\/whole-school$/);
        await waitForLoading(page);

        const published = await db
            .selectFrom('static_lwp_whole_school_sequence')
            .where('id', '=', row.id)
            .select(['status'])
            .executeTakeFirstOrThrow();

        expect(published.status).toEqual('PUBLISHED');
        await expect(page.getByTestId('whole-school-sequences-table')).toContainText('Published');

        // ---- Scenario 5: the leader sees exactly what their school would be given (LEA-6697) ------------
        /*
         * The first leader-facing scenario, and it runs here rather than in a test of its own so that
         * what the leader sees is what the admin just published, through the real publish action. The
         * page is read-only: the button that acts on this plan arrives in LEA-6698.
         *
         * Reached through the Auto schedule tab, which scenario 12 covers on the way in.
         */
        await adminOrTeacherSignOut(page);
        await login(page, seed.leaderEmail, password);
        await waitForLoading(page);

        // ---- Scenario 14: a leader is welcomed once a year, on the school overview --------------------
        /*
         * A Money Skills whole-school sequence is now published for the school's year, its classes can
         * take Money Skills and it is not scheduled, so the banner's prompt includes Money Skills and this
         * leader, new on every run, is shown the welcome on the same answer. Nothing is recorded until they
         * react to it: being shown it is not the same as having seen it.
         */
        const leaderUser = await db.selectFrom('lwp_user').where('email', '=', seed.leaderEmail).select(['id']).executeTakeFirstOrThrow();
        const welcomeSeen = async () =>
            (await db.selectFrom('lwp_user').where('id', '=', leaderUser.id).select(['lastMoneySkillsAutoScheduleWelcomeSeen']).executeTakeFirstOrThrow())
                .lastMoneySkillsAutoScheduleWelcomeSeen;
        const welcomeModal = page.getByTestId('money-skills-welcome-modal');

        expect(await openSchoolOverview(page, String(seed.school.id))).toContain(String(moneySkillsSubjectId));
        await expect(welcomeModal).toBeVisible();
        await expect(page.getByTestId('money-skills-welcome-heading')).toHaveText('Our fully funded Financial literacy programme: Money Skills');
        await expect(page.getByTestId('money-skills-welcome-text')).toContainText('free to all our partner schools');
        await expect(page.getByTestId('money-skills-welcome-how-to')).toContainText('let us set the whole school up');
        expect(await welcomeSeen()).toBeNull();

        // ---- Scenario 14b: Dismiss records it, and it is not shown again this year ----------------------
        await page.getByTestId('money-skills-welcome-dismiss').click();
        await expect(welcomeModal).toHaveCount(0);
        await expect.poll(async () => (await welcomeSeen()) !== null).toBe(true);

        // The prompt still offers Money Skills, so only the recorded date keeps the modal away. The page is
        // left to settle first, so an absent modal is not one that had yet to load.
        expect(await openSchoolOverview(page, String(seed.school.id))).toContain(String(moneySkillsSubjectId));
        await page.waitForLoadState('networkidle');
        await expect(welcomeModal).toHaveCount(0);

        // ---- Scenario 14c: Auto-schedule records it too, and opens the Money Skills page --------------
        // The date is cleared so the same leader is shown it again, this time for the other button.
        await db.updateTable('lwp_user').set({ lastMoneySkillsAutoScheduleWelcomeSeen: null }).where('id', '=', leaderUser.id).execute();

        await openSchoolOverview(page, String(seed.school.id));
        await page.getByTestId('money-skills-welcome-auto-schedule').click();
        await page.waitForURL(new RegExp(`/school/${seed.school.id}/auto-schedule/${moneySkillsSubjectId}$`));
        await expect.poll(async () => (await welcomeSeen()) !== null).toBe(true);

        // ---- Scenario 13: the school overview prompts a leader who has not scheduled -------------------
        /*
         * Entitled, published for the school's year and not yet scheduled: all three hold, so the
         * prompt shows. There is deliberately no dismiss control, although the design draws one.
         */
        expect(await openSchoolOverview(page, String(seed.school.id))).toContain(String(moneySkillsSubjectId));

        const overviewPrompt = page.getByTestId(`school-overview-auto-schedule-prompt-${moneySkillsSubjectId}`);

        await expect(overviewPrompt).toContainText(`Auto-schedule ${moneySkillsSubjectName} topics for your classes`);
        await expect(overviewPrompt.getByRole('button')).toHaveCount(1);

        // ---- Scenario 13b: pressing it reaches that subject's whole-school page ------------------------
        await page.getByTestId(`school-overview-auto-schedule-prompt-button-${moneySkillsSubjectId}`).click();
        await page.waitForURL(new RegExp(`/school/${seed.school.id}/auto-schedule/${moneySkillsSubjectId}$`));
        await waitForLoading(page);
        await expect(page.getByTestId('whole-school-auto-schedule-page')).toBeVisible();

        // ---- Scenario 12: a leader finds the page from Set a topic, without a URL -----------------------
        /*
         * The Topic library gains the tabs, and the class-level Auto-schedule it already had stays on
         * it and still works: its picker opens on this school's classes.
         */
        await page.goto(`/school/${seed.school.id}/topic-library`);
        await waitForLoading(page);

        await expect(page.getByTestId('set-a-topic-heading')).toBeVisible();

        await page.getByTestId('topic-library-auto-schedule-button').click();
        await expect(page.getByTestId(`auto-schedule-class-option-${seed.receptionClassA.id}`)).toBeVisible();
        await page.keyboard.press('Escape');

        await page.getByTestId('set-a-topic-tab-auto-schedule').click();
        await page.waitForURL(new RegExp(`/school/${seed.school.id}/auto-schedule$`));
        await waitForLoading(page);

        await expect(page.getByTestId('set-a-topic-auto-schedule-none-scheduled')).toBeVisible();
        await expect(page.getByTestId(`set-a-topic-auto-schedule-banner-button-${moneySkillsSubjectId}`)).toBeEnabled();

        // ---- Scenario 12b: a programme the school is entitled to but cannot schedule is not shown ------
        /*
         * One class is given Ready Teddy for this check only. Nothing can be published for it yet, so it
         * gets no banner at all, not even a coming-soon one, while Money Skills still has its own.
         */
        await db.updateTable('lwp_school_class').set({ isReadyTeddyEnabled: true }).where('id', '=', seed.yearOneClass.id).execute();

        await page.reload();
        await waitForLoading(page);

        await expect(page.getByTestId(`set-a-topic-auto-schedule-banner-button-${moneySkillsSubjectId}`)).toBeEnabled();
        await expect(page.getByTestId(`set-a-topic-auto-schedule-banner-${readyTeddySubjectId}`)).toHaveCount(0);

        await db.updateTable('lwp_school_class').set({ isReadyTeddyEnabled: false }).where('id', '=', seed.yearOneClass.id).execute();

        // ---- Scenario 12c: the banner leads to that subject's whole-school page ------------------------
        await page.getByTestId(`set-a-topic-auto-schedule-banner-button-${moneySkillsSubjectId}`).click();
        await page.waitForURL(new RegExp(`/school/${seed.school.id}/auto-schedule/${moneySkillsSubjectId}`));
        await waitForLoading(page);

        await expect(page.getByTestId('whole-school-auto-schedule-page')).toBeVisible();
        await expect(page.getByTestId('whole-school-auto-schedule-heading')).toContainText(moneySkillsSubjectName);

        /*
         * Reception is covered, and its row carries the count that matters: **two** classes from one
         * member. One member serving many classes is the whole mechanism of the feature, and a row
         * reading 1 would pass a weaker assertion while proving nothing.
         */
        await expect(page.getByTestId(`whole-school-preview-sequence-${RECEPTION_YEAR_GROUP_ID}`)).toContainText(
            seed.receptionSequenceName
        );
        await expect(page.getByTestId(`whole-school-preview-class-count-${RECEPTION_YEAR_GROUP_ID}`)).toHaveText('2');
        await expect(page.getByTestId(`whole-school-preview-dates-${RECEPTION_YEAR_GROUP_ID}`)).not.toHaveText('Not being scheduled');
        await expect(page.getByTestId(`whole-school-preview-skip-tag-${RECEPTION_YEAR_GROUP_ID}`)).toHaveCount(0);

        /*
         * Year 1 has a class and no member, so it is shown as skipped **with its reason** rather than
         * left out. A leader who cannot see the gap cannot ask about it, and the class counts would
         * stop adding up to their school.
         */
        await expect(page.getByTestId(`whole-school-preview-skip-tag-${YEAR_ONE_YEAR_GROUP_ID}`)).toContainText('No topics yet');
        await expect(page.getByTestId(`whole-school-preview-skip-reason-${YEAR_ONE_YEAR_GROUP_ID}`)).toContainText(
            'no topics for this year group yet'
        );
        await expect(page.getByTestId(`whole-school-preview-class-count-${YEAR_ONE_YEAR_GROUP_ID}`)).toHaveText('1');

        // The callout has to reconcile with the table, or the leader is being asked to trust two
        // different accounts of the same plan.
        await expect(page.getByTestId('whole-school-auto-schedule-summary')).toContainText('across 2 classes');
        await expect(page.getByTestId('whole-school-auto-schedule-summary')).toContainText('1 class will not be given anything');
        await expect(page.getByTestId('whole-school-auto-schedule-callout')).toBeVisible();

        // ---- Scenario 5b: looking at the plan writes nothing ------------------------------------------
        // LEA-6697's acceptance criterion, and still true now the button below exists: reading the plan
        // must not be what schedules the school.
        const assignmentsAfterPreview = await db
            .selectFrom('lwp_class_sequence_assignment')
            .where('classId', 'in', [seed.receptionClassA.id, seed.receptionClassB.id, seed.yearOneClass.id])
            .select(['id'])
            .execute();

        expect(assignmentsAfterPreview).toHaveLength(0);

        // ---- Scenario 5c: the run is confirmed first, and backing out writes nothing -------------------
        /*
         * The page offers no way to undo a run, so this dialog is the only place a leader can stop
         * one. Backing out has to leave the plan exactly as it was and write nothing at all, which is
         * asserted against the database rather than against the dialog closing.
         */
        await page.getByTestId('whole-school-auto-schedule-submit-button').click();
        await expect(page.getByTestId('dialog-title-heading')).toContainText(`Auto-schedule ${moneySkillsSubjectName}?`);
        await expect(page.getByTestId('dialog-content')).toContainText('cannot be undone from here');
        await page.getByTestId('dialog-cancel-btn').click();
        await expect(page.getByTestId('whole-school-preview-table')).toBeVisible();

        const assignmentsAfterBackingOut = await db
            .selectFrom('lwp_class_sequence_assignment')
            .where('classId', 'in', [seed.receptionClassA.id, seed.receptionClassB.id, seed.yearOneClass.id])
            .select(['id'])
            .execute();

        expect(assignmentsAfterBackingOut).toHaveLength(0);

        // ---- Scenario 5d: Cancel asks first, and leaves without scheduling ----------------------------
        // "Back to editing" has to return the leader to the plan rather than navigating, or a mis-click
        // on a page with no save costs them the whole thing they came to read.
        await page.getByTestId('whole-school-auto-schedule-cancel-button').click();
        await expect(page.getByTestId('dialog-title-heading')).toContainText('Cancel Auto-schedule?');
        await page.getByTestId('dialog-cancel-btn').click();
        await expect(page.getByTestId('whole-school-preview-table')).toBeVisible();

        await page.getByTestId('whole-school-auto-schedule-cancel-button').click();
        await page.getByTestId('dialog-primary-btn').click();
        await page.waitForURL(new RegExp(`/school/${seed.school.id}/topic-library`));

        // ---- Scenario 5e: one press schedules the whole school (LEA-6698) -----------------------------
        /*
         * The demo sentence of the feature, and the first thing on this page that writes anything.
         *
         * Asserted **against the database** rather than against rendered text, the way
         * `topic-sequencing.spec.ts` asserts its dates. What is under test is that rows exist for every
         * class on the right dates, and a screen that says so proves only that the screen says so.
         */
        await page.goto(`/school/${seed.school.id}/auto-schedule/${moneySkillsSubjectId}`);
        await waitForLoading(page);
        await scheduleWholeSchool(page);

        await expect(page.locator('.MuiAlert-message').filter({ hasText: 'added across' })).toBeVisible();
        await page.waitForURL(new RegExp(`/school/${seed.school.id}/topic-library`));

        const run = await db
            .selectFrom('lwp_whole_school_sequence_assignment')
            .where('schoolId', '=', seed.school.id)
            .select(['id', 'status', 'subjectId', 'periodIndex'])
            .execute();

        expect(run).toHaveLength(1);
        expect(run[0].status).toEqual('ASSIGNED');

        /*
         * Both Reception classes, from the one member, and **not** the Year 1 class, whose year group
         * the admin left uncovered. One member serving many classes is the whole mechanism; a run that
         * scheduled only the first class would satisfy a weaker assertion than this one.
         */
        const classAssignments = await db
            .selectFrom('lwp_class_sequence_assignment')
            .where('wholeSchoolAssignmentId', '=', run[0].id)
            .select(['id', 'classId'])
            .execute();

        expect(classAssignments.map((row) => String(row.classId)).sort()).toEqual(
            [String(seed.receptionClassA.id), String(seed.receptionClassB.id)].sort()
        );

        const scheduledTopics = await db
            .selectFrom('lwp_class_topic')
            .where(
                'classSequenceAssignmentId',
                'in',
                classAssignments.map((row) => row.id)
            )
            .select(['classId', 'topicId', 'releaseDate'])
            .execute();

        // One topic in the member sequence, one per class, and both on the same day: the school works
        // on the same theme at the same time, which is the promise the whole feature makes.
        expect(scheduledTopics).toHaveLength(2);
        expect(new Set(scheduledTopics.map((row) => String(row.releaseDate))).size).toEqual(1);

        const yearOneTopics = await db.selectFrom('lwp_class_topic').where('classId', '=', seed.yearOneClass.id).select(['id']).execute();

        // The uncovered year group was skipped, not quietly given something.
        expect(yearOneTopics).toHaveLength(0);

        // ---- Scenario 13c: once the school has scheduled, the prompt is gone ---------------------------
        // In the same run as scenario 13, so it is the query that changed its answer, not the fixture.
        expect(await openSchoolOverview(page, String(seed.school.id))).not.toContain(String(moneySkillsSubjectId));
        await expect(page.getByTestId(`school-overview-auto-schedule-prompt-${moneySkillsSubjectId}`)).toHaveCount(0);

        /*
         * Back to the admin, for the rest of the admin scenarios.
         *
         * The list has to be navigated to explicitly. Logging in lands on `/admin`, whereas before the
         * leader scenarios above existed the admin was still standing on the whole-school list where
         * publishing left them, and the next scenario's Create button is only on that page.
         */
        await adminOrTeacherSignOut(page);
        await login(page, admin, password);
        await page.waitForURL(/\/admin/);
        await page.goto('/admin/sequences/whole-school');
        await waitForLoading(page);

        // ---- Scenario 6: a second one for the same subject and year is refused, in words ----------------
        // The unique key would stop it regardless. What is under test is that the admin reads a sentence
        // rather than a constraint violation, and that they are left on the form with their input intact.
        await page.getByTestId('create-whole-school-sequence-button').click();
        await page.waitForURL(/\/admin\/sequences\/whole-school\/new/);
        await waitForLoading(page);

        // Subject is already Money Skills and locked, so only the year needs setting back to the one
        // that is taken.
        await selectOption(page, 'whole-school-sequence-period-select', specPeriodName);
        await page.getByTestId('save-whole-school-sequence-button').click();

        // An error callSnackbar renders as dialog content rather than as an alert message, unlike the
        // success, info and warning variants.
        await expect(page.getByTestId('dialog-content')).toContainText(
            'There is already a whole-school sequence for that subject and academic year'
        );
        await expect(page).toHaveURL(/\/admin\/sequences\/whole-school\/new/);

        const rowCount = await db
            .selectFrom('static_lwp_whole_school_sequence')
            .where('subjectId', '=', moneySkillsSubjectId)
            .where('periodIndex', '=', seed.specPeriodIndex)
            .select(({ fn }) => fn.countAll().as('count'))
            .executeTakeFirstOrThrow();

        expect(Number(rowCount.count)).toEqual(1);

        // ---- Scenario 7: deleting it frees that subject and year again ---------------------------------
        // The pair is the identity of a whole-school sequence, so a delete that did not release it would
        // make one mistake permanent until the next September.
        await page.goto('/admin/sequences/whole-school');
        await waitForLoading(page);
        await page.getByTestId(`whole-school-sequence-actions-${row.id}`).click();
        await page.getByTestId(`whole-school-sequence-action-delete-${row.id}`).click();
        await page.getByTestId('dialog-primary-btn').click();
        await expect(page.locator('.MuiAlert-message').filter({ hasText: 'Whole-school sequence deleted successfully!' })).toBeVisible();
        // The row is gone from the list. Not the empty state, for the same reason as scenario 2: this
        // list holds every whole-school sequence there is, and another may legitimately exist.
        await expect(page.getByTestId(`whole-school-sequence-open-${row.id}`)).toHaveCount(0);

        const remaining = await db
            .selectFrom('static_lwp_whole_school_sequence')
            .where('subjectId', '=', moneySkillsSubjectId)
            .where('periodIndex', '=', seed.specPeriodIndex)
            .select(['id'])
            .execute();

        expect(remaining).toHaveLength(0);

        // ---- Scenario 8: past-dated topics are skipped, and the page says so ---------------------------
        /*
         * The case a school arriving mid-year actually meets. Before this slice a single released
         * topic refused the entire school, and nobody there could do anything about it, because
         * nothing on the leader's page is editable.
         *
         * Run last because it needs the school unscheduled again. Scenario 5e left an ASSIGNED run,
         * and the partial unique index on (school, subject, period) refuses a second one; its class
         * topics would also make every Reception topic an ALREADY_SCHEDULED skip, which is a
         * different reason for an empty plan and would hide the one under test. Removing all three
         * is the same cleanup the removal slice will do properly, and the same one the functional
         * deleting the sequence reaches none of them, because wholeSchoolSequenceId is SET NULL.
         */
        await removeSchoolWholeSchoolRuns(db, seed.school.id);

        /*
         * Published straight into the database rather than through the admin form. The form is under
         * test in scenarios 3 to 4f and repeating it here would add a minute to the run to arrive at
         * the same row. What this scenario is about begins on the leader's page.
         */
        const pastDatedWholeSchool = await db
            .insertInto('static_lwp_whole_school_sequence')
            .values({
                subjectId: moneySkillsSubjectId,
                periodIndex: seed.specPeriodIndex,
                status: 'PUBLISHED',
                logCreatedById: '1',
                logUpdatedById: '1'
            })
            .returning('id')
            .executeTakeFirstOrThrow();

        await db
            .insertInto('static_lwp_whole_school_sequence_member')
            .values({
                wholeSchoolSequenceId: pastDatedWholeSchool.id,
                sequenceId: seed.partlyPastSequenceId,
                yearGroupId: RECEPTION_YEAR_GROUP_ID,
                logCreatedById: '1',
                logUpdatedById: '1'
            })
            .execute();

        await adminOrTeacherSignOut(page);
        await login(page, seed.leaderEmail, password);
        await waitForLoading(page);

        await page.goto(`/school/${seed.school.id}/auto-schedule/${moneySkillsSubjectId}`);
        await waitForLoading(page);

        /*
         * Still being scheduled, not skipped: two topics, one gone, one to come. The row says how
         * many went and why, in its own line rather than in a tooltip, because a leader who cannot
         * see it cannot ask about it.
         */
        await expect(page.getByTestId(`whole-school-preview-topics-skipped-${RECEPTION_YEAR_GROUP_ID}`)).toContainText(
            '1 topic skipped, its date has passed.'
        );
        await expect(page.getByTestId(`whole-school-preview-skip-tag-${RECEPTION_YEAR_GROUP_ID}`)).toHaveCount(0);

        // The callout carries the same figure, so a leader adding up the column lands on it.
        await expect(page.getByTestId('whole-school-auto-schedule-summary')).toContainText('1 topic is not being scheduled');

        /*
         * The span the page shows is the **effective** one. The released topic was dated a fortnight
         * ago, so a row still offering that date would be promising something this school is not
         * being given.
         */
        const renderedDates = await page.getByTestId(`whole-school-preview-dates-${RECEPTION_YEAR_GROUP_ID}`).innerText();

        expect(renderedDates).not.toEqual('Not being scheduled');

        await scheduleWholeSchool(page);
        await expect(page.locator('.MuiAlert-message').filter({ hasText: 'added across' })).toBeVisible();
        await page.waitForURL(new RegExp(`/school/${seed.school.id}/topic-library`));

        /*
         * **The assertion the whole slice exists for**, and the reason it is against the database.
         * A page saying a topic was skipped and a row that was never written are different claims,
         * and only the second one is what the school gets. Every Reception class holds the topic
         * still to come, and none holds the one that has gone.
         */
        const pastDatedRunTopics = await db
            .selectFrom('lwp_class_topic')
            .innerJoin('lwp_class_sequence_assignment as a', 'a.id', 'lwp_class_topic.classSequenceAssignmentId')
            .where('a.wholeSchoolAssignmentId', 'is not', null)
            .where('a.classId', 'in', [seed.receptionClassA.id, seed.receptionClassB.id])
            .select(['a.classId', 'lwp_class_topic.topicId'])
            .execute();

        expect(pastDatedRunTopics).toHaveLength(2);
        expect(pastDatedRunTopics.every((row) => String(row.topicId) === seed.futureTopicId)).toBe(true);
        expect(pastDatedRunTopics.some((row) => String(row.topicId) === seed.pastTopicId)).toBe(false);
        expect([...new Set(pastDatedRunTopics.map((row) => String(row.classId)))].sort()).toEqual(
            [String(seed.receptionClassA.id), String(seed.receptionClassB.id)].sort()
        );

        // ---- Scenario 8b: a member entirely in the past offers nothing to press --------------------
        /*
         * The remaining edge, and the one that would otherwise hand a leader a button that errors.
         * Its row still renders, saying why, because a year group disappearing would leave the class
         * counts not adding up to their school.
         */
        await removeSchoolWholeSchoolRuns(db, seed.school.id);

        await db
            .updateTable('static_lwp_whole_school_sequence_member')
            .set({ sequenceId: seed.allPastSequenceId })
            .where('wholeSchoolSequenceId', '=', pastDatedWholeSchool.id)
            .execute();

        await page.goto(`/school/${seed.school.id}/auto-schedule/${moneySkillsSubjectId}`);
        await waitForLoading(page);

        /*
         * The **empty state**, not a table of skipped rows. Reception is the only member here, so
         * once its topics have gone there is nothing left for this school at all, and the page says
         * so rather than drawing a plan that would create nothing. That is the ticket's own rule,
         * and the same one assignSequenceToClass already applies at class level.
         *
         * The row-level rendering of an all-past member needs a second member still carrying
         * something, and is covered by the service's unit tests: it is a shape of the answer rather
         * than something the browser does differently.
         */
        await expect(page.getByTestId('whole-school-auto-schedule-empty-state')).toBeVisible();
        await expect(page.getByTestId('whole-school-preview-table')).toHaveCount(0);

        // Nothing to press, because pressing it would create nothing and then say so with an error.
        await expect(page.getByTestId('whole-school-auto-schedule-submit-button')).toHaveCount(0);

        // And the page reached that state without writing anything on the way to it.
        const runsAfterAllPast = await db
            .selectFrom('lwp_whole_school_sequence_assignment')
            .where('schoolId', '=', seed.school.id)
            .select(['id'])
            .execute();

        expect(runsAfterAllPast).toHaveLength(0);

        // ---- Scenario 9: the count is what the school gets, not topics times classes -----------------
        /*
         * The activity count used to be an upper bound. It ignored topics a class already held, so a
         * school coming back to a sequence was told it would receive work it already had, and a
         * school whose classes were all full was offered a button that created nothing and errored.
         *
         * Asserted here rather than only in unit tests because the number on the page is the thing
         * the leader acts on, and because the arithmetic that produced it lives in three places: the
         * server's per-class subtraction, the row, and the sentence above the table.
         */
        await db
            .updateTable('static_lwp_whole_school_sequence_member')
            .set({ sequenceId: seed.partlyPastSequenceId })
            .where('wholeSchoolSequenceId', '=', pastDatedWholeSchool.id)
            .execute();

        await page.goto(`/school/${seed.school.id}/auto-schedule/${moneySkillsSubjectId}`);
        await waitForLoading(page);

        await scheduleWholeSchool(page);
        await expect(page.locator('.MuiAlert-message').filter({ hasText: 'added across' })).toBeVisible();
        await page.waitForURL(new RegExp(`/school/${seed.school.id}/topic-library`));

        /*
         * One class keeps what it was given and the other has it taken away, so the two differ. This
         * is the shape a single multiplication can never describe: same year group, same member,
         * different answers.
         */
        await db
            .deleteFrom('lwp_class_topic')
            .where(
                'classSequenceAssignmentId',
                'in',
                db.selectFrom('lwp_class_sequence_assignment').where('classId', '=', seed.receptionClassA.id).select('id')
            )
            .execute();

        // Freed so the school may run again; the class topics are untouched by it.
        await db.deleteFrom('lwp_whole_school_sequence_assignment').where('schoolId', '=', seed.school.id).execute();

        await page.goto(`/school/${seed.school.id}/auto-schedule/${moneySkillsSubjectId}`);
        await waitForLoading(page);

        /*
         * One class, not two. Reception has two classes and one usable topic left, and the class
         * that still holds it is not counted.
         */
        await expect(page.getByTestId('whole-school-auto-schedule-summary')).toContainText('across 1 class');

        await scheduleWholeSchool(page);
        await expect(page.locator('.MuiAlert-message').filter({ hasText: 'added across' })).toBeVisible();
        await page.waitForURL(new RegExp(`/school/${seed.school.id}/topic-library`));

        /*
         * The count promised and the rows written are the same number, which is the whole claim.
         * Only the emptied class receives anything.
         */
        const secondRunTopics = await db
            .selectFrom('lwp_class_topic')
            .innerJoin('lwp_class_sequence_assignment as a', 'a.id', 'lwp_class_topic.classSequenceAssignmentId')
            .where('a.wholeSchoolAssignmentId', 'is not', null)
            .where('a.classId', 'in', [seed.receptionClassA.id, seed.receptionClassB.id, seed.yearOneClass.id])
            .select(['a.classId'])
            .execute();

        expect([...new Set(secondRunTopics.map((row) => String(row.classId)))]).toEqual([String(seed.receptionClassA.id)]);

        // ---- Scenario 9b: a school that already has everything is offered nothing -------------------
        /*
         * The defect the exact count removes. Before it, this page showed a button that built an
         * empty plan for every class and then refused, which is the same shape as the past-dated
         * case and just as unactionable for a leader.
         */
        await db.deleteFrom('lwp_whole_school_sequence_assignment').where('schoolId', '=', seed.school.id).execute();

        await page.goto(`/school/${seed.school.id}/auto-schedule/${moneySkillsSubjectId}`);
        await waitForLoading(page);

        await expect(page.getByTestId('whole-school-auto-schedule-empty-state')).toBeVisible();
        await expect(page.getByTestId('whole-school-auto-schedule-submit-button')).toHaveCount(0);

        // ---- Scenario 10: a school that has scheduled sees what it was given, not an action --------
        /*
         * Before this, a school that had just succeeded fell through to the empty state and was told
         * "there is nothing to auto-schedule yet", because the exact count correctly reported nothing
         * left to create once its classes held everything. That sentence sent a leader off to
         * schedule every class by hand moments after they had scheduled the whole school.
         *
         * Put back to a member with something still to give, and cleared of the previous scenarios'
         * rows, so this starts from a school that can actually be scheduled.
         */
        await db
            .deleteFrom('lwp_class_topic')
            .where('classId', 'in', [seed.receptionClassA.id, seed.receptionClassB.id])
            .execute();
        await db
            .deleteFrom('lwp_class_sequence_assignment')
            .where('classId', 'in', [seed.receptionClassA.id, seed.receptionClassB.id])
            .execute();
        await db.deleteFrom('lwp_whole_school_sequence_assignment').where('schoolId', '=', seed.school.id).execute();

        await db
            .updateTable('static_lwp_whole_school_sequence_member')
            .set({ sequenceId: seed.receptionSequenceId })
            .where('wholeSchoolSequenceId', '=', pastDatedWholeSchool.id)
            .execute();

        await page.goto(`/school/${seed.school.id}/auto-schedule/${moneySkillsSubjectId}`);
        await waitForLoading(page);
        await scheduleWholeSchool(page);

        await expect(page.locator('.MuiAlert-message').filter({ hasText: 'added across' })).toBeVisible();
        await page.waitForURL(new RegExp(`/school/${seed.school.id}/topic-library`));

        // Coming back to the same page is what a leader does, and what slice 8's summary row will do.
        await page.goto(`/school/${seed.school.id}/auto-schedule/${moneySkillsSubjectId}`);
        await waitForLoading(page);

        /*
         * The same table, and no button. Not the empty state, which is the defect this closes, and
         * not an action, because the school has already had its year.
         */
        await expect(page.getByTestId('whole-school-auto-schedule-scheduled-summary')).toBeVisible();
        await expect(page.getByTestId('whole-school-preview-table')).toBeVisible();
        await expect(page.getByTestId('whole-school-auto-schedule-submit-button')).toHaveCount(0);
        await expect(page.getByTestId('whole-school-auto-schedule-empty-state')).toHaveCount(0);

        // The record states what the school actually holds, counted from the rows the run created.
        await expect(page.getByTestId('whole-school-auto-schedule-scheduled-summary')).toContainText('across 2 classes');

        // ---- Scenario 10a: a year group whose dates have gone is greyed and badged Completed --------
        /*
         * Nothing is finished yet. The row was scheduled moments ago on its member's own future
         * dates, so the badge must be absent here or its appearance below proves nothing.
         */
        await expect(page.getByTestId(`whole-school-preview-completed-${RECEPTION_YEAR_GROUP_ID}`)).toHaveCount(0);

        /*
         * Then time passes, which is the only way to reach this state: the run's own topics move
         * into the past, exactly as they would for a leader coming back in December to a September
         * topic. The record reads its dates from the class topics, so these are the dates the page
         * will draw.
         */
        await db
            .updateTable('lwp_class_topic')
            .set({ releaseDate: daysFromToday(-30), dueDate: daysFromToday(-10) })
            .where('classId', 'in', [seed.receptionClassA.id, seed.receptionClassB.id])
            .execute();

        await page.goto(`/school/${seed.school.id}/auto-schedule/${moneySkillsSubjectId}`);
        await waitForLoading(page);

        await expect(page.getByTestId(`whole-school-preview-completed-${RECEPTION_YEAR_GROUP_ID}`)).toContainText('Completed');

        // Asserted as the class rather than a colour, so a theme change cannot silently pass this.
        await expect(page.getByTestId(`whole-school-preview-row-${RECEPTION_YEAR_GROUP_ID}`)).toHaveClass(/sequence-preview-row-completed/);

        /*
         * A finished year group is not a skipped one. Greying both the same way would tell a leader
         * their school never received something it has already worked through.
         */
        await expect(page.getByTestId(`whole-school-preview-row-${RECEPTION_YEAR_GROUP_ID}`)).not.toHaveClass(
            /sequence-preview-row-skipped/
        );

        // And still the record rather than an offer: what has happened must not read as what will.
        await expect(page.getByTestId('whole-school-auto-schedule-submit-button')).toHaveCount(0);

        // ---- Scenario 12d: on the tab, a scheduled programme is a summary row rather than a banner -------
        await page.goto(`/school/${seed.school.id}/auto-schedule`);
        await waitForLoading(page);

        const scheduledRow = page.getByTestId(`set-a-topic-auto-schedule-scheduled-row-${moneySkillsSubjectId}`);

        // Reception only, because the member covers Reception and Year 1 has none.
        await expect(scheduledRow).toContainText('Reception');
        await expect(scheduledRow).not.toContainText(YEAR_ONE_YEAR_GROUP);
        await expect(scheduledRow).not.toContainText('No dates yet');
        await expect(page.getByTestId(`set-a-topic-auto-schedule-banner-${moneySkillsSubjectId}`)).toHaveCount(0);
        await expect(page.getByTestId('set-a-topic-auto-schedule-none-scheduled')).toHaveCount(0);

        // Review leads to the same page in its already-scheduled state.
        await page.getByTestId(`set-a-topic-auto-schedule-review-${moneySkillsSubjectId}`).click();
        await page.waitForURL(new RegExp(`/school/${seed.school.id}/auto-schedule/${moneySkillsSubjectId}`));
        await waitForLoading(page);
        await expect(page.getByTestId('whole-school-auto-schedule-scheduled-summary')).toBeVisible();

        // ---- Scenario 10b: removing frees the school to schedule that year again ---------------------
        /*
         * Through the real mutation, as the leader, rather than by deleting the row: what is under
         * test is that removal frees the year, and a database delete would prove only that an absent
         * row is absent. There is no Remove button on the page yet, so the API is the only route.
         */
        const liveRun = await db
            .selectFrom('lwp_whole_school_sequence_assignment')
            .where('schoolId', '=', seed.school.id)
            .where('status', '=', 'ASSIGNED')
            .select(['id'])
            .executeTakeFirstOrThrow();

        /*
         * One topic is marked as having gone out to families before the removal, which is the rule
         * the whole mutation exists to protect: a child who has done the work must not lose it.
         */
        const topicToKeep = await db
            .selectFrom('lwp_class_topic')
            .innerJoin('lwp_class_sequence_assignment as a', 'a.id', 'lwp_class_topic.classSequenceAssignmentId')
            .where('a.wholeSchoolAssignmentId', '=', liveRun.id)
            .select(['lwp_class_topic.id'])
            .executeTakeFirstOrThrow();

        await db.updateTable('lwp_class_topic').set({ released: true }).where('id', '=', topicToKeep.id).execute();

        const { accessToken: leaderToken } = await getTokenFromLogin(seed.leaderEmail, password);

        await removeWholeSchoolSequenceAssignment(leaderToken, String(seed.school.id), String(liveRun.id));

        // The released topic is still there. Everything else the run created has gone.
        const keptAfterRemoval = await db.selectFrom('lwp_class_topic').where('id', '=', topicToKeep.id).select(['id']).execute();

        expect(keptAfterRemoval).toHaveLength(1);

        const removedRun = await db
            .selectFrom('lwp_whole_school_sequence_assignment')
            .where('id', '=', liveRun.id)
            .select(['status'])
            .executeTakeFirstOrThrow();

        // Marked rather than deleted: the retained topic still points at what created it.
        expect(removedRun.status).toEqual('REMOVED');

        /*
         * And the page offers the action again, which is the point of removal. The class that kept a
         * released topic still holds it, so only the other one has anything to receive.
         */
        await page.goto(`/school/${seed.school.id}/auto-schedule/${moneySkillsSubjectId}`);
        await waitForLoading(page);

        await expect(page.getByTestId('whole-school-auto-schedule-submit-button')).toBeVisible();
        await expect(page.getByTestId('whole-school-auto-schedule-scheduled-summary')).toHaveCount(0);

        // And on the tab the summary row gives way to the banner again.
        await page.goto(`/school/${seed.school.id}/auto-schedule`);
        await waitForLoading(page);
        await expect(page.getByTestId(`set-a-topic-auto-schedule-banner-button-${moneySkillsSubjectId}`)).toBeEnabled();
        await expect(page.getByTestId(`set-a-topic-auto-schedule-scheduled-row-${moneySkillsSubjectId}`)).toHaveCount(0);

        // ---- Scenario 13d: and the school overview prompts again, having stored nothing to undo -------
        expect(await openSchoolOverview(page, String(seed.school.id))).toContain(String(moneySkillsSubjectId));
        await expect(page.getByTestId(`school-overview-auto-schedule-prompt-${moneySkillsSubjectId}`)).toBeVisible();

        // ---- Scenario 12e: a teacher gets no tab, and keeps the class-level Auto-schedule ---------------
        /*
         * The regression this feature is most likely to cause. One component serves teachers and
         * leaders alike, and the tab leads to a leader page a teacher would be refused. Entered through
         * `/topic-library`, the teacher's own route, which forwards to the school's.
         *
         * The teacher is on Reception A alone, so the picker offering it is what proves the class-level
         * button still works for them rather than merely still renders.
         */
        const seedUser = await db.selectFrom('lwp_user').where('id', '=', '1').select(['password']).executeTakeFirstOrThrow();
        const teacherFirstName = generateFirstName();
        const teacherLastName = generateLastName();
        const teacherEmail = generateUserEmail(teacherFirstName, teacherLastName);
        const teacher = await utils.createUser({
            firstname: teacherFirstName,
            lastname: teacherLastName,
            email: teacherEmail,
            type: UserType.TEACHER,
            userStatus: UserStatus.ACTIVE,
            isSchoolLeader: false,
            schoolId: seed.school.id,
            password: seedUser.password,
            nameForChildren: `Mr ${teacherFirstName}`
        });

        await utils.addClassTeacher(teacher.id, seed.receptionClassA.id);

        await adminOrTeacherSignOut(page);
        await login(page, teacherEmail, password);
        await acceptFeatureTooltipPrompt(page);

        await page.goto('/topic-library');
        await page.waitForURL(new RegExp(`/school/${seed.school.id}/topic-library`));
        await waitForLoading(page);

        await expect(page.getByTestId('topic-library-section')).toBeVisible();
        await expect(page.getByTestId('set-a-topic-header')).toHaveCount(0);
        await expect(page.getByTestId('set-a-topic-tab-auto-schedule')).toHaveCount(0);

        await page.getByTestId('topic-library-auto-schedule-button').click();
        await expect(page.getByTestId(`auto-schedule-class-option-${seed.receptionClassA.id}`)).toBeVisible();
        await page.keyboard.press('Escape');

        // ---- Scenario 13e: a teacher is not prompted, even by asking the API directly -----------------
        /*
         * The school is prompting its leader at this point (scenario 13d), so a refusal here is about
         * who is asking. The overview page is already leaders-only; this proves the query is too.
         */
        const { accessToken: teacherToken } = await getTokenFromLogin(teacherEmail, password);

        await expect(getWholeSchoolAutoSchedulePrompts(teacherToken, String(seed.school.id))).rejects.toThrow();

        // ---- Scenario 14d: nor can a teacher mark the welcome seen ------------------------------------
        await expect(markMoneySkillsWelcomeSeen(teacherToken, String(seed.school.id))).rejects.toThrow();

        // ---- Scenario 11: an admin cannot change one a school has scheduled --------------------------
        /*
         * The lock. Its subject, academic year and year groups describe what schools were actually
         * given, so editing them would make the record disagree with topics already in front of
         * children. Still locked after the removal above, because a removal keeps released topics.
         */
        await adminOrTeacherSignOut(page);
        await login(page, admin, password);
        await page.waitForURL(/\/admin/);

        await page.goto(`/admin/sequences/whole-school/${pastDatedWholeSchool.id}`);
        await waitForLoading(page);

        // Told why, rather than left to discover that nothing takes.
        await expect(page.getByTestId('whole-school-sequence-locked-note')).toBeVisible();

        /*
         * MUI renders a disabled select as an element with `aria-disabled`, not the `disabled`
         * attribute, so the state is read from the role rather than from the input.
         */
        await expect(page.getByTestId('whole-school-sequence-period-select').locator('[aria-disabled="true"]')).toBeVisible();
        await expect(
            page.getByTestId(`whole-school-member-select-${RECEPTION_YEAR_GROUP_ID}`).locator('[aria-disabled="true"]')
        ).toBeVisible();

        /*
         * **And neither save is offered.** There is nothing left for them to save, because the three
         * fields above are the whole of this form.
         *
         * Asserted because the disabled fields alone did not settle it: with the buttons still there,
         * pressing "Save and re-publish" reported success and wrote nothing, which reads as the lock
         * not being real. Found by clicking through, not by a test.
         */
        await expect(page.getByTestId('publish-whole-school-sequence-button')).toHaveCount(0);
        await expect(page.getByTestId('save-whole-school-sequence-button')).toHaveCount(0);

        // Cancel stays, or a locked sequence would be a page with no way out but the browser's back.
        await expect(page.getByTestId('cancel-whole-school-sequence-button')).toBeVisible();

        // ---- Scenario 12f: an admin viewing the school sees what a leader sees -------------------------
        /*
         * An admin passes every gate on the way by a different route from a leader: the page type
         * admits any admin, the tab is shown for an admin token, and the API's LeaderOnly admits admins
         * outright. So the result is asserted rather than any one of them.
         */
        await page.goto(`/school/${seed.school.id}/topic-library`);
        await waitForLoading(page);
        await acceptFeatureTooltipPrompt(page);

        await expect(page.getByTestId('topic-library-auto-schedule-row')).toBeVisible();
        await page.getByTestId('set-a-topic-tab-auto-schedule').click();
        await page.waitForURL(new RegExp(`/school/${seed.school.id}/auto-schedule$`));
        await waitForLoading(page);

        await expect(page.getByTestId('set-a-topic-auto-schedule-none-scheduled')).toBeVisible();
        await expect(page.getByTestId(`set-a-topic-auto-schedule-banner-button-${moneySkillsSubjectId}`)).toBeEnabled();

        // ---- Scenario 14e: an admin viewing the school is not welcomed, and uses up nothing ----------
        /*
         * The welcome is to the leader themselves, so an admin is never shown it, although the banner's
         * prompt still offers Money Skills. The page is left to settle before the absence is asserted.
         */
        await openSchoolOverview(page, String(seed.school.id));
        await page.waitForLoadState('networkidle');
        await expect(page.getByTestId('money-skills-welcome-modal')).toHaveCount(0);

        const adminUser = await db.selectFrom('lwp_user').where('email', '=', admin).select(['id']).executeTakeFirstOrThrow();
        const adminWelcome = await db
            .selectFrom('lwp_user')
            .where('id', '=', adminUser.id)
            .select(['lastMoneySkillsAutoScheduleWelcomeSeen'])
            .executeTakeFirstOrThrow();

        expect(adminWelcome.lastMoneySkillsAutoScheduleWelcomeSeen).toBeNull();
    });
});

const SPEC_PREFIX = 'E2E-WSS-';

/** Year group ids are stable seed data: '0' is Reception and '1' is Year 1. */
const RECEPTION_YEAR_GROUP_ID = '0';
const YEAR_ONE_YEAR_GROUP_ID = '1';
/** The label, not the id: the publish warning names year groups the way an admin reads them. */
const YEAR_ONE_YEAR_GROUP = 'Year 1';

/**
 * Opens the school overview and returns the subjects its prompt query answered with.
 *
 * Waits for that answer rather than for the page. The prompt loads on its own after the page does,
 * so asserting it absent any earlier would pass before the query had said anything at all.
 */
const openSchoolOverview = async (page: Page, schoolId: string): Promise<string[]> => {
    const promptsResponse = page.waitForResponse((response) => response.request().postData()?.includes('wholeSchoolAutoSchedulePrompts') ?? false);

    await page.goto(`/school/${schoolId}`);

    const { data } = await (await promptsResponse).json();

    await expect(page.getByTestId('school-overview-page')).toBeVisible();

    return data.wholeSchoolAutoSchedulePrompts.map((prompt: { subjectId: string }) => String(prompt.subjectId));
};

/**
 * Midnight, a given number of days either side of today. Module scope because the fixture dates its
 * sequences with it and the scenarios date the topics a run created with it, and the two have to
 * agree on what "in the past" means.
 */
const daysFromToday = (days: number): Date => {
    const date = new Date();

    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() + days);

    return date;
};

/**
 * Presses Auto-schedule and confirms it, which is the only way to start a run from the page.
 *
 * Shared by every scenario that schedules, so the confirmation is stated once. A scenario that
 * cares about the dialog itself asserts on it directly rather than through here.
 */
const scheduleWholeSchool = async (page: Page) => {
    await page.getByTestId('whole-school-auto-schedule-submit-button').click();
    await expect(page.locator('.whole-school-auto-schedule-confirm-modal')).toBeVisible();
    await page.getByTestId('dialog-primary-btn').click();
};

const selectOption = async (page: Page, selectDataTest: string, optionName: string) => {
    await page.getByTestId(selectDataTest).click();
    await page.getByRole('option', { name: optionName }).click();
};

/**
 * The school, the leader and the classes the later slices schedule, plus the academic year this spec
 * builds in.
 *
 * **The year is deliberately not the current one.** A whole-school sequence has no name to scope
 * cleanup by, so the spec can only clean up by subject and academic year, and doing that on the current
 * year would delete the Money Skills sequence a content admin is building for real, on a shared
 * database, without either of them knowing. The furthest future year the form offers belongs to nobody
 * yet. If only the current year exists, that is a seed data problem and is refused by name below rather
 * than worked around, because working around it means deleting someone's work.
 */
const seedWholeSchoolData = async (db: Kysely<Schema.DB>, utils: ReturnType<typeof createUtils>) => {
    const tag = `${SPEC_PREFIX}${Date.now().toString(36)}`;
    const leaderFirstName = generateFirstName();
    const leaderLastName = generateLastName();
    const leaderEmail = generateUserEmail(leaderFirstName, leaderLastName);

    const user = await db.selectFrom('lwp_user').where('id', '=', '1').select(['id']).executeTakeFirstOrThrow();
    const currentPeriod = await db
        .selectFrom('static_lwp_period')
        .where('isCurrentPeriod', '=', true)
        .select(['index', 'shortName'])
        .executeTakeFirstOrThrow();

    const futurePeriods = await db
        .selectFrom('static_lwp_period')
        .where('index', '>', currentPeriod.index)
        .select(['index', 'shortName', 'startDate'])
        .orderBy('index', 'desc')
        .limit(1)
        .execute();

    if (!futurePeriods.length) {
        throw new Error(
            'No academic year after the current one. This spec will not build in the current year, because it can ' +
                "only clean up by subject and year and would delete a real admin's Money Skills sequence. Seed a " +
                'future year in static_lwp_period.'
        );
    }

    const specPeriodIndex = futurePeriods[0].index;
    const specPeriodName = futurePeriods[0].shortName ?? '';

    // Before as well as after, so a run that crashed part-way through cannot leave a row holding the
    // subject and year this run needs: the unique key would then fail the first scenario rather than the
    // one that is actually about duplicates.
    await removeSpecWholeSchoolSequences(db, specPeriodIndex);

    const { school, leader } = await createSchoolAndDummyWondeData(
        db,
        utils,
        {
            school: {
                name: `${generateSchoolName()} School`,
                numOfFullProgrammeClassesAllowed: 10,
                numOfTotalClassesAllowed: 30,
                enableAddClasses: true,
                isMoneySkillsAvailable: true,
                isReadyTeddyAvailable: false,
                isFutureAcademicYear: false
            },
            leader: {
                firstname: leaderFirstName,
                lastname: leaderLastName,
                email: leaderEmail,
                userStatus: UserStatus.ACTIVE,
                addTooltip: true
            }
        },
        { active: true, classLicences: { IsReadingLogsEnabled: true, isFullProgramme: false, isReadyTeddyEnabled: false } }
    );

    /*
     * The spec school is moved into the year this spec builds in.
     *
     * A school is only ever offered the whole-school sequence for **its own** current academic year,
     * and this spec deliberately builds in a future one so its cleanup cannot delete a real admin's
     * Money Skills sequence. Leaving the school in the current year would mean the leader's page
     * correctly found nothing, and LEA-6697's scenarios would be asserting an empty screen.
     *
     * `isFutureAcademicYear` cannot do this: it moves a school on by exactly one year, and the year
     * above is the **last** one in the table rather than the next one, for the cleanup reason above.
     *
     * A side effect worth knowing: the dummy Wonde classes were created in the platform's current
     * year, so they now sit in a finished year from this school's point of view and the class sweep
     * ignores them. That is what keeps the class counts below equal to the classes seeded here.
     */
    await db.updateTable('lwp_school').set({ curentPeriodIndex: specPeriodIndex }).where('id', '=', school.id).execute();

    /**
     * Two active Reception classes and one Year 1.
     *
     * Reception gets two because a whole-school sequence holds one member per year group, so a year group
     * with a single class could not tell "scheduled every class" apart from "scheduled one class". Year 1
     * gets one and never gets a member, which is the skipped case.
     *
     * Seeded rather than activated through the UI, unlike the class-level spec: activation is an entry
     * point into class-level scheduling and is covered there, and nothing in this feature is reached
     * through it.
     */
    const classDefaults = {
        status: 'ACTIVE' as const,
        isRegistrationClass: true,
        IsReadingLogsEnabled: true,
        // The school's own year, which is this spec's year rather than the platform's current one.
        // The sweep requires equality with the school's period, so a class left in the current year
        // would be treated as one from a finished year and never scheduled.
        periodIndex: specPeriodIndex,
        mainTeacherId: leader.id,
        logCreatedById: user.id,
        logUpdatedById: user.id
    };

    const receptionClassA = await utils.createClass(school.id, {
        ...classDefaults,
        name: `${tag} Reception A`,
        yearGroup: RECEPTION_YEAR_GROUP_ID
    });

    const receptionClassB = await utils.createClass(school.id, {
        ...classDefaults,
        name: `${tag} Reception B`,
        yearGroup: RECEPTION_YEAR_GROUP_ID
    });

    const yearOneClass = await utils.createClass(school.id, {
        ...classDefaults,
        name: `${tag} Year 1`,
        yearGroup: YEAR_ONE_YEAR_GROUP_ID
    });

    /*
     * The class sequences the picker chooses between, seeded rather than built through the admin UI.
     *
     * That UI is under test in `topic-sequencing.spec.ts`, and here a sequence is input rather than
     * subject: building three of them through the form would add minutes to the run and would fail
     * this spec for a defect in a different feature.
     *
     * Three, because the picker's filtering is only meaningful against things it must refuse:
     * a fixed sequence in the right year, an interval one, and a fixed one from another year.
     */
    /*
     * The topics every sequence holds, created rather than looked up: `setup.sql` seeds no Money Skills
     * topic for Reception, so a lookup only passed on a database where one had been added by hand or left
     * behind by another spec. Built the way `topic-sequencing.spec.ts` builds its own. The domain link is
     * what makes each schedulable for Reception in Money Skills, and the visible activity is what gives
     * the leader's page something to schedule: it shows nothing while there are no activities to create.
     *
     * Two, not one. The past-dated scenarios need a sequence whose first topic has been released
     * has not, and a single topic cannot express "some of it has gone and the rest has not".
     */
    const createReceptionTopic = async (label: string) => {
        const topicName = `${tag} ${label}`;
        const created = await utils.createStaticTopic({
            isReading: false,
            teacherTopicName: topicName,
            parentTopicName: topicName,
            isPublished: true,
            video: '605069004',
            logCreatedById: user.id,
            logUpdatedById: user.id
        });

        await db
            .insertInto('static_lwp_topic_domain_year_group')
            .values({ domainId: moneySkillsDomainId, topicId: created.id, yearGroupId: RECEPTION_YEAR_GROUP_ID })
            .executeTakeFirstOrThrow();

        await utils.createStaticActivity({
            name: `${topicName} activity`,
            welcomeMessage: 'Welcome to this activity',
            activityType: 'LEGACY',
            order: 1,
            topicId: created.id,
            logCreatedById: user.id,
            logUpdatedById: user.id
        });

        return created;
    };

    const topic = await createReceptionTopic('Topic');
    const secondTopic = await createReceptionTopic('Second topic');

    if (!futurePeriods[0].startDate) {
        throw new Error('The academic year this spec builds in has no start date, so a fixed sequence cannot be dated inside it');
    }

    // Dated inside the year the sequence declares, which the API enforces. A week in, so the span the
    // Dates column renders is unambiguous.
    const itemStart = new Date(futurePeriods[0].startDate);

    itemStart.setDate(itemStart.getDate() + 7);

    const createSequence = async (label: string, timingMode: string, periodIndexForSequence: number | null): Promise<string> => {
        const sequence = await db
            .insertInto('static_lwp_topic_sequence')
            .values({
                name: `${tag} ${label}`,
                subjectId: moneySkillsSubjectId,
                yearGroupId: RECEPTION_YEAR_GROUP_ID,
                periodIndex: periodIndexForSequence,
                timingMode,
                // The cadence belongs to an interval sequence and is refused on a fixed one.
                intervalDays: timingMode === 'INTERVAL' ? 7 : null,
                logCreatedById: user.id,
                logUpdatedById: user.id
            })
            .returning('id')
            .executeTakeFirstOrThrow();

        await db
            .insertInto('static_lwp_topic_sequence_item')
            .values({
                sequenceId: sequence.id,
                topicId: topic.id,
                order: 1,
                // An interval sequence carries no dates at all; a fixed one carries them on its items.
                startDate: timingMode === 'INTERVAL' ? null : itemStart,
                endDate: null,
                logCreatedById: user.id,
                logUpdatedById: user.id
            })
            .execute();

        return String(sequence.id);
    };

    /**
     * A fixed Reception sequence with the dates given, rather than the single future-dated item
     * above.
     *
     * Inserted straight into the database like its neighbour, which is also what lets a date sit
     * before today: the API refuses an item outside the sequence's academic year, and this spec
     * builds in a future one so that its cleanup cannot reach a real admin's sequence. Nothing on
     * the path under test re-checks that, because what decides a skip is the date against today,
     * never the date against the period.
     */
    const createDatedSequence = async (label: string, itemDates: Date[]): Promise<string> => {
        const sequence = await db
            .insertInto('static_lwp_topic_sequence')
            .values({
                name: `${tag} ${label}`,
                subjectId: moneySkillsSubjectId,
                yearGroupId: RECEPTION_YEAR_GROUP_ID,
                periodIndex: specPeriodIndex,
                timingMode: 'FIXED',
                intervalDays: null,
                logCreatedById: user.id,
                logUpdatedById: user.id
            })
            .returning('id')
            .executeTakeFirstOrThrow();

        await db
            .insertInto('static_lwp_topic_sequence_item')
            .values(
                itemDates.map((startDate, index) => ({
                    sequenceId: sequence.id,
                    topicId: index === 0 ? topic.id : secondTopic.id,
                    order: index + 1,
                    startDate,
                    endDate: null,
                    logCreatedById: user.id,
                    logUpdatedById: user.id
                }))
            )
            .execute();

        return String(sequence.id);
    };

    const receptionSequenceName = `${tag} Reception fixed`;
    const intervalSequenceName = `${tag} Reception interval`;
    const otherYearSequenceName = `${tag} Reception other year`;

    const receptionSequenceId = await createSequence('Reception fixed', 'FIXED', specPeriodIndex);

    await createSequence('Reception interval', 'INTERVAL', null);
    await createSequence('Reception other year', 'FIXED', currentPeriod.index);

    // One with its first topic already released, one with both gone.
    const partlyPastSequenceName = `${tag} Reception partly past`;
    const allPastSequenceName = `${tag} Reception all past`;

    const partlyPastSequenceId = await createDatedSequence('Reception partly past', [daysFromToday(-14), daysFromToday(21)]);
    const allPastSequenceId = await createDatedSequence('Reception all past', [daysFromToday(-30), daysFromToday(-14)]);

    /*
     * The year group the Wonde import assigns to a class it could not map. Looked up rather than
     * hardcoded so the spec asserts its absence by identity, and skipped if this database has none.
     */
    const [unknownYearGroup] = await db.selectFrom('static_lwp_year_group').where('year', '=', 'Unknown').select(['id']).limit(1).execute();

    return {
        tag,
        school,
        leader,
        leaderEmail,
        receptionClassA,
        receptionClassB,
        yearOneClass,
        specPeriodIndex,
        specPeriodName,
        currentPeriodName: currentPeriod.shortName ?? '',
        receptionSequenceId,
        receptionSequenceName,
        partlyPastSequenceId,
        partlyPastSequenceName,
        allPastSequenceId,
        allPastSequenceName,
        pastTopicId: String(topic.id),
        futureTopicId: String(secondTopic.id),
        intervalSequenceName,
        otherYearSequenceName,
        // Null on a database with no Unknown year group, which the scenario's absence assertion
        // passes on anyway: nothing can render a row for an id that does not exist.
        unknownYearGroupId: unknownYearGroup ? String(unknownYearGroup.id) : 'no-unknown-year-group'
    };
};

/**
 * Clears one school's whole-school runs, with the class assignments and class topics each created,
 * so the school may be scheduled again.
 *
 * **Scoped to that school through its runs.** Filtering on `wholeSchoolAssignmentId is not null`
 * alone reaches every school's runs, which deleted another school's scheduled topics on a shared
 * local database.
 */
const removeSchoolWholeSchoolRuns = async (db: Kysely<Schema.DB>, schoolId: string): Promise<void> => {
    const runIds = db.selectFrom('lwp_whole_school_sequence_assignment').where('schoolId', '=', schoolId).select('id');
    const classAssignmentIds = db.selectFrom('lwp_class_sequence_assignment').where('wholeSchoolAssignmentId', 'in', runIds).select('id');

    await db.deleteFrom('lwp_class_topic').where('classSequenceAssignmentId', 'in', classAssignmentIds).execute();
    await db.deleteFrom('lwp_class_sequence_assignment').where('wholeSchoolAssignmentId', 'in', runIds).execute();
    await db.deleteFrom('lwp_whole_school_sequence_assignment').where('schoolId', '=', schoolId).execute();
};

/**
 * Removes whole-school sequences for the subject and academic year this spec uses.
 *
 * Scoped by that pair rather than by a name prefix, because a whole-school sequence has no name: subject
 * plus academic year is its identity. That is only safe because the year is a future one nobody is
 * working in yet; see `seedWholeSchoolData`.
 *
 * The seeded school and classes are left behind, as every other spec in this suite leaves its fixture.
 * They are school-scoped, so they do not leak into anyone else's view the way a sequence does.
 */
const removeSpecWholeSchoolSequences = async (db: Kysely<Schema.DB>, periodIndex: number): Promise<void> => {
    /*
     * What a run created first, then the whole-school sequence, then the class sequences this spec
     * seeded. Deepest first, because every step is referenced by the one above it.
     *
     * **The run's own rows have to go explicitly.** Scheduling a school (LEA-6698) creates a
     * `lwp_whole_school_sequence_assignment`, one `lwp_class_sequence_assignment` per class and a
     * class topic per topic per class, and none of them is reached by deleting the whole-school
     * sequence: that link is SET NULL precisely so the record of having run outlives what was run.
     * Without these three lines every run of this spec left real class topics on real classes.
     *
     * **Scoped to this spec's own academic year, and resolved id by id rather than by a blanket
     * "everything with a run on it".** The blanket version is one line shorter and would delete real
     * class topics from a real school the day someone points this spec at a database where a school
     * has genuinely scheduled. The spec builds in a year no real school is in, so the year is the
     * safe boundary.
     */
    const runs = await db
        .selectFrom('lwp_whole_school_sequence_assignment')
        .where('periodIndex', '=', periodIndex)
        .select(['id'])
        .execute();

    if (runs.length) {
        const runIds = runs.map((run) => run.id);

        const assignments = await db
            .selectFrom('lwp_class_sequence_assignment')
            .where('wholeSchoolAssignmentId', 'in', runIds)
            .select(['id'])
            .execute();

        if (assignments.length) {
            const assignmentIds = assignments.map((assignment) => assignment.id);

            await db.deleteFrom('lwp_class_topic').where('classSequenceAssignmentId', 'in', assignmentIds).execute();
            await db.deleteFrom('lwp_class_sequence_assignment').where('id', 'in', assignmentIds).execute();
        }

        await db.deleteFrom('lwp_whole_school_sequence_assignment').where('id', 'in', runIds).execute();
    }

    /*
     * Then the whole-school sequence, then the class sequences.
     *
     * Order matters: a member's link to its sequence is RESTRICT, so a sequence cannot be deleted
     * while a year group still receives it. Members themselves need no line here, because they
     * cascade with their parent.
     *
     * The class sequences are scoped by this spec's own name prefix, the way `topic-sequencing.spec.ts`
     * scopes its `E2E-Seq-` ones. They are global static data: left behind they would pile up in every
     * entitled school's dropdown, and in the picker this spec asserts the contents of.
     */
    await db
        .deleteFrom('static_lwp_whole_school_sequence')
        .where('subjectId', '=', moneySkillsSubjectId)
        .where('periodIndex', '=', periodIndex)
        .execute();

    await db.deleteFrom('static_lwp_topic_sequence').where('name', 'like', `${SPEC_PREFIX}%`).execute();

    /*
     * Then the topics this spec created, now that no sequence item holds them. Their activities go
     * first because that link is SET NULL rather than CASCADE, so they would otherwise stay behind with
     * no topic; the domain link cascades with the topic. Published static data like the sequences, so
     * left behind they would be offered to every school teaching Money Skills in Reception.
     *
     * Any class topic still on them goes before that, because it blocks the delete. The run-scoped
     * lines above cannot reach every one: the count scenarios delete a run so the school may run
     * again, which unlinks its assignments, and so its class topics, from any run. These topics exist
     * only for this spec, so a class topic on one can only be the spec's own.
     */
    const specTopicIds = db.selectFrom('static_lwp_topic').where('teacherTopicName', 'like', `${SPEC_PREFIX}%`).select('id');

    await db.deleteFrom('lwp_class_topic').where('topicId', 'in', specTopicIds).execute();
    await db.deleteFrom('static_lwp_activity').where('topicId', 'in', specTopicIds).execute();
    await db.deleteFrom('static_lwp_topic').where('id', 'in', specTopicIds).execute();
};
