import { expect, test, type Page, type Request } from '@playwright/test';
import type { Schema } from '@lwp/postgres-client';
import { type Kysely } from 'kysely';
import { DateTime } from 'luxon';
import { SequenceAssignmentStatus, UserStatus, UserType } from 'lwp-shared';

import {
    admin,
    englishDomainId,
    englishSubjectName,
    generateFirstName,
    generateLastName,
    generateSchoolName,
    generateUserEmail,
    moneySkillsDomainId,
    moneySkillsSubjectId,
    moneySkillsSubjectName,
    password
} from './constants';
import { createDb } from './db';
import { createUtils } from './dbUtils';
import {
    acceptFeatureTooltipPrompt,
    adminOrTeacherSignOut,
    createSchoolAndDummyWondeData,
    formatDate,
    getInputBoxByName,
    login,
    openSideDrawer,
    releaseTopicsUpToADate,
    waitForLoading
} from './utils';

/**
 * E2E coverage for topic sequencing / auto-scheduling (LEA-6179, built across LEA-6422 to LEA-6427,
 * extended by LEA-6529 and LEA-6530, by LEA-6565 which gave Money Skills a page of its own, and by
 * LEA-6533 which added the Topic library entry point).
 *
 * An admin builds a reusable sequence of topics with a timing rule, and a school leader auto-schedules
 * one onto a class in a single action. There are two such pages, and the difference between them is the
 * whole shape of this spec.
 *
 * `/class/[class_id]/auto-schedule` is the generic one, offering everything the class is entitled to.
 * It has three ways in, all of them someone choosing to come: the class schedule page, the class's row
 * on the school overview, and the Topic library's own Auto-schedule button. It knows nothing about
 * activation, and its way out always reads "Cancel".
 *
 * The Topic library is the odd one, and scenarios 35 to 37 and 40 are about what makes it odd: it is
 * the only entry point with no class in scope, so it asks which class first, and it is the only one
 * aimed at teachers as much as leaders. Its list is scoped on the server, because a teacher may read
 * any class in their school but may only write to their own. The three roles are covered once each and
 * against the same fixture, so the same class tells them apart: 35 is the leader, 36 the teacher who
 * is offered only their own, and 37 the admin, who is in view-as-school-leader mode on a `/school/`
 * route and must be answered as the leader was.
 *
 * `/class/[class_id]/money-skills-auto-schedule` is reached only by activating a class, and offers
 * Money Skills alone. It has two steps held in the URL: an explainer saying what Money Skills is, then
 * the same form the generic page uses. Scenario 15 covers the explainer, 16 the step and the Back that
 * returns to it, and 29 the Dismiss that leaves.
 *
 * Where activation lands is three cases, and each is covered once:
 *   - the school has no Money Skills licence, so the leader goes to the school overview (scenario 33);
 *   - it has one and a Money Skills sequence exists for the class's year group, so the leader goes to
 *     the Money Skills page (scenarios 15, 29 and 31);
 *   - it has one but no sequence exists for that class's year group, so the leader goes to the school
 *     overview again, for the other reason (scenario 1).
 *
 * One school throughout, with its `isMoneySkillsAvailable` switched off and back on around scenario 33
 * alone, because the destination has to be proved for a school that lacks the licence and a second
 * school would prove it about different data.
 *
 * That the Money Skills page offers Money Skills alone cannot be shown on a reading-logs class, which
 * is withheld English by entitlement whether the programme filter works or not. Scenario 30 shows it on
 * a full programme class, which is offered English on the generic page and not on this one.
 *
 * The empty state is covered on both pages, from opposite ends of the run. Scenario 2 reaches the
 * generic one before any sequence exists anywhere, which is what a direct link or a bookmark produces,
 * and scenario 39 reaches it through the schedule page's own button after the class's sequences have
 * been deleted underneath it, which is the only way a leader gets there in normal use now that every
 * entry point is gated. Scenario 32 reaches the Money Skills page's by URL for a class no route leads
 * there. Neither page's "request failed" state is covered, deliberately: this suite has no way to fail
 * a query on demand, and asserting it would mean building one for a state a leader rarely sees.
 *
 * Everything runs in one test against one seeded fixture, because the scenarios genuinely depend on
 * each other: what the leader can assign depends on what the admin built, and the skip and warning
 * states only exist once the class already has some of the topics.
 *
 * Two classes are activated through the UI rather than seeded, because activation is itself an entry
 * point now. The Year 2 one proves the empty state, and the Reception one carries the rest of the run.
 *
 * Sequences are always created through the admin UI rather than seeded, deliberately: that UI is new in
 * this feature, so building the sequences is itself part of what is under test. Only the surrounding
 * fixture is seeded, which is the school, the leader, the class licences and the topics.
 *
 * Scenario order is chosen for data dependency, not for narrative. The past-dated recovery (scenario 27)
 * runs on topics the class does not yet have, because a topic the class already has is skipped before its
 * dates are ever checked, which would make that scenario pass for the wrong reason.
 *
 * The spec cleans up its own sequences before and after the run, because they are global static data. See
 * `removeSpecSequences`.
 *
 * Two conventions worth knowing when reading the assertions:
 * - Exact dates are asserted against the database rather than against rendered text, because the UI
 *   formats them with `showDate({ short: true })` (moment `ddd DD MMM`). Where the rendered window does
 *   matter, `shortDate` below reproduces that format.
 * - Reordering is driven with the up and down buttons rather than by dragging. They are not only the
 *   accessible fallback: they are the reliable path in automation, since the table uses
 *   react-beautiful-dnd under React 18 strict mode.
 */
test.describe('Topic sequencing', () => {
    let db: Kysely<Schema.DB>;
    let utils: ReturnType<typeof createUtils>;

    test.beforeAll(async () => {
        db = createDb();
        utils = createUtils(db);
        // Before as well as after, so a run that crashed part-way through cannot leave sequences that
        // change what this run sees.
        await removeSpecSequences(db);
    });

    test.afterAll(async () => {
        await removeSpecSequences(db);
        await db.destroy();
    });

    test('A leader activates classes and auto-schedules sequences an admin has built', async ({ page }) => {
        const seed = await seedTopicSequencingData(db, utils);
        const {
            tag,
            topics,
            school,
            leaderEmail,
            leaderName,
            nextYearClass,
            readingOnlyClass,
            fullProgrammeClass,
            classesToActivate,
            currentPeriod
        } = seed;

        // The academic year every sequence built through the form declares. Read from the database rather
        // than hardcoded, so the suite does not care what the years are called or when they run.
        const currentPeriodName = currentPeriod.shortName;

        const intervalSequenceName = `${tag} Interval set`;
        const fixedSequenceName = `${tag} Fixed set`;
        const pastSequenceName = `${tag} Past set`;
        const yearOneSequenceName = `${tag} Year one set`;
        const englishSequenceName = `${tag} English set`;

        const yearTwoClass = classesToActivate[0];
        const receptionClass = classesToActivate[1];
        const untouchedClass = classesToActivate[2];

        await login(page, leaderEmail, password);
        await acceptFeatureTooltipPrompt(page);

        // ---- Scenario 1: activating a class with no sequence for its year group goes to the overview ----
        // Activation is the moment a leader is most likely to set a class up for the year, so it normally
        // leads into Money Skills. Not when there is nothing to offer the class: the leader is sent to the
        // school overview instead rather than through a step that can only refuse them.
        //
        // This is the third of the three destination cases, and the one that cannot be decided from the
        // class alone. It is a current year registration class with reading logs in a school that has
        // Money Skills, so the school's licence and the class's own entitlement both hold. The only thing
        // it lacks is a Money Skills sequence for Year 2, because the admin builds none until scenario 6
        // and this spec never builds one for Year 2 at all. So the school overview here can only be
        // explained by that third condition, which is the whole point of asking the API.
        //
        // Scenario 33 reaches the same destination for the first reason, a school with no Money Skills
        // licence, and scenarios 15, 29 and 31 activate classes that do have a sequence and land on the
        // Money Skills page. Between them the redirect is pinned in every direction it has.
        //
        // Reading logs rather than full programme, which is what entitles a registration class to Money
        // Skills, and which also keeps English out of this class's reach for scenario 17.
        await activateClass(page, { classId: yearTwoClass.id, yearGroup: YEAR_TWO_YEAR_GROUP, mainTeacherName: leaderName });
        await page.waitForURL(new RegExp(`/school/${school.id}`));
        await waitForLoading(page);
        await expect(page.getByTestId('classes-overview-tab-section')).toBeVisible();

        // ---- Scenario 2: reached by its URL with nothing built anywhere, the page says so ---------------
        // The empty state is not dead code just because no entry point leads to it any more. This is what a
        // direct link or a bookmark produces, and scenario 39 covers the other way it is still reached: the
        // schedule page's button pressed after the class's sequences have gone.
        //
        // Year 2 is used for this rather than Reception because sequences are global static data rather than
        // school-scoped, so one left behind by an earlier run, or built by a real admin, would be offered to
        // any Reception class in any school. A year group this spec never builds a sequence for is stable by
        // construction.
        await page.goto(`/class/${yearTwoClass.id}/auto-schedule`);
        await waitForLoading(page);
        await expect(page.getByTestId('class-auto-schedule-page')).toBeVisible();
        await expect(page.getByTestId('auto-schedule-heading')).toBeVisible();
        await expect(page.getByTestId('auto-schedule-empty-state')).toContainText('There are no topic sequences available for this class');
        await expect(page.getByTestId('assign-sequence-select')).toHaveCount(0);

        await page.getByTestId('auto-schedule-empty-state-button').click();
        await page.waitForURL(new RegExp(`/class/${yearTwoClass.id}/pupils`));

        // The Money Skills page says the same for the same class, and says it instead of the explainer:
        // explaining a programme and then refusing to schedule it would be the worse of the two. Reached by
        // URL because activation never sends a class like this here, which is scenario 1.
        await page.goto(`/class/${yearTwoClass.id}/money-skills-auto-schedule`);
        await waitForLoading(page);
        await expect(page.getByTestId('class-money-skills-auto-schedule-page')).toBeVisible();
        await expect(page.getByTestId('money-skills-auto-schedule-empty-state')).toContainText(
            'There are no topic sequences available for this class'
        );
        await expect(page.getByTestId('money-skills-auto-schedule-intro')).toHaveCount(0);
        await expect(page.getByTestId('assign-sequence-select')).toHaveCount(0);

        await page.getByTestId('money-skills-auto-schedule-empty-state-button').click();
        await page.waitForURL(new RegExp(`/class/${yearTwoClass.id}/pupils`));

        // ---- Scenario 3: and its schedule page does not offer the action either -------------------------
        // The button is gated on the eligible list being non-empty, not just on the class type, so it must
        // be absent even for a class that is otherwise perfectly eligible. Asserting that the surrounding
        // "Add a topic" section is present is what makes the absence meaningful rather than vacuous.
        await page.goto(`/class/${yearTwoClass.id}/schedule`);
        await waitForLoading(page);
        await expect(page.getByTestId('class-schedule-page')).toBeVisible();
        // `.first()` because the phrase also appears elsewhere on this page, and a strict-mode match on
        // two elements would fail for the wrong reason.
        await expect(page.getByText('Add a topic', { exact: true }).first()).toBeVisible();
        await expect(page.getByTestId('assign-sequence-button')).toHaveCount(0);

        await adminOrTeacherSignOut(page);
        await login(page, admin, password);
        await page.waitForURL(/\/admin/);
        await waitForLoading(page);

        // ---- Scenario 4: the Sequences area is reachable from the admin nav and starts empty -------------
        // The empty state is asserted through a search for this run's unique tag rather than by subject and
        // year group alone, so a second run against the same database still starts from nothing.
        await openSideDrawer(page);
        await page.getByTestId('sequences-common-drawer-list').click();
        await page.waitForURL(/\/admin\/sequences/);
        await waitForLoading(page);
        await expect(page.getByTestId('admin-sequences-page')).toBeVisible();
        await filterSequences(page, { search: tag });
        await expect(page.getByTestId('sequences-empty-state')).toBeVisible();

        // ---- Scenario 5: the topic picker offers only topics a sequence may legitimately contain ---------
        // Ten Money Skills topics exist for Reception under this tag. Three must never be offered: one is
        // unpublished; one carries a SET_BY_TEACHER activity step, so it needs a photo from the teacher and
        // was kept out of sequences entirely by the team's decision on 2026-08-05; and one is a reading
        // topic, which belongs to the reading log and its own weekly cadence rather than to a dated
        // sequence. The reading topic sits in the Money Skills domain for Reception on purpose, so it would
        // be offered but for that rule.
        //
        // The count is asserted through a search rather than by browsing, because the picker caps browsing
        // at the five most recently added topics: an absent row while browsing would prove nothing.
        await page.getByTestId('create-sequence-button').click();
        await page.waitForURL(/\/admin\/sequences\/new/);
        await waitForLoading(page);
        await expect(page.getByTestId('create-sequence-page')).toBeVisible();

        // The picker only appears once the scope is set, since subject and year group decide which topics
        // are valid at all.
        await expect(page.getByTestId('topic-picker-scope-prompt')).toBeVisible();
        await page.getByTestId('sequence-name-input').fill(intervalSequenceName);
        await selectOption(page, 'sequence-subject-select', moneySkillsSubjectName);
        await selectOption(page, 'sequence-year-group-select', RECEPTION_YEAR_GROUP);
        await expect(page.getByTestId('sequence-topic-picker')).toBeVisible();

        await page.getByTestId('topic-picker-search').fill(tag);
        await expect(page.getByTestId('topic-picker-hint')).toHaveText('7 matches.');
        await expect(page.getByTestId(`topic-picker-topic-${topics.unpublished.id}`)).toHaveCount(0);
        await expect(page.getByTestId(`topic-picker-topic-${topics.needsPhoto.id}`)).toHaveCount(0);
        await expect(page.getByTestId(`topic-picker-topic-${topics.reading.id}`)).toHaveCount(0);

        /*
         * ---- Scenario 6: an interval sequence carries a cadence and no dates ---------------------------
         *
         * The split this scenario exists to pin down. The admin sets **how far apart** the topics run,
         * because Ready Teddy is designed to run weekly and that is a Learning with Parents decision
         * (LEA-6624). They set **no dates at all**, because when a class starts is the school's business
         * and the same sequence is used by different classes at different times (LEA-6594).
         *
         * So: a cadence field is present, and the anchor and per-topic date fields are absent. Both halves
         * are asserted, because a form that offered all of them or none of them would otherwise pass this
         * scenario unchanged.
         *
         * The academic year is a fixed-mode field too, so switching modes takes it away. Asserted on both
         * sides of the click rather than only after it, so this cannot pass on a form that never rendered
         * the field at all.
         */
        await expect(page.getByTestId('sequence-period-select')).toBeVisible();

        // In fixed mode the hint says where the dates actually live, which is on the topics. It used
        // to describe a sequence-level suggested start date that was never saved, and the field is now
        // gone, so this is the one thing on screen telling an admin where to put a date.
        await expect(page.getByTestId('sequence-timing-hint')).toContainText('You set the dates on each topic below');

        await page.getByTestId('timing-mode-interval').click();
        await expect(page.getByTestId('sequence-period-select')).toHaveCount(0);
        // The cadence is the one piece of timing an admin sets for an interval sequence, so it is
        // asserted present rather than merely used below.
        await expect(page.getByTestId('sequence-interval-days-input')).toBeVisible();

        // A regression guard rather than a statement about switching mode: LEA-6586 removed the
        // sequence-level start date from the form in **both** modes, so this asserts it has not come
        // back rather than that interval mode hides it.
        await expect(page.getByTestId('sequence-default-start-date')).toHaveCount(0);

        // The academic year vanishing needs explaining, or it reads as something still loading, and
        // so does being asked for a cadence but no dates at all. The hint is the only thing on
        // screen saying both are deliberate, and where the split between the cadence and the anchor
        // is spelled out.
        //
        // The second clause is the one LEA-6624 earns. It was asserted, then removed on the previous
        // branch because the assign page still let a teacher override the cadence and the claim would
        // have been a lie; the field has gone now, so the promise is true and worth pinning down.
        await expect(page.getByTestId('sequence-timing-hint')).toContainText('You set how far apart the topics run');
        await expect(page.getByTestId('sequence-timing-hint')).toContainText('the school cannot change it');

        await page.getByTestId('sequence-interval-days-input').fill(String(INTERVAL_SEQUENCE_DAYS));

        await addTopic(page, topics.coins);
        await addTopic(page, topics.saving);
        await addTopic(page, topics.spending);

        // No dates on any row, because there are none to show. The date columns belong to fixed mode.
        await expect(page.getByTestId(`sequence-item-window-${topics.coins.id}`)).toHaveCount(0);
        await expect(page.getByTestId(`sequence-item-window-${topics.saving.id}`)).toHaveCount(0);
        await expect(page.getByTestId(`sequence-item-window-${topics.spending.id}`)).toHaveCount(0);

        // The order is now the whole content of an interval sequence, so reordering is the only edit
        // there is. It used to hand each topic the dated window of the one it displaced.
        await page.getByTestId(`sequence-item-move-down-${topics.coins.id}`).click();

        await saveSequence(page, 'Sequence created successfully!');

        /*
         * Asserted against the database rather than the rendered table, matching how this suite treats
         * dates: the order is what an interval sequence stores, and the null dates are the whole point
         * of the change, neither of which the form can be trusted to report on itself.
         *
         * Coins was moved down, so it lands second.
         */
        const savedIntervalItems = await intervalSequenceItems(db, intervalSequenceName);

        expect(savedIntervalItems.map((item) => item.topicId)).toEqual([topics.saving.id, topics.coins.id, topics.spending.id]);
        expect(savedIntervalItems.every((item) => item.startDate === null && item.endDate === null)).toBe(true);

        // The cadence is stored on the sequence and dates nothing: the items above are null at both
        // ends. Read from the database for the same reason they are, since the form cannot be trusted
        // to report on itself.
        expect(await sequenceIntervalDays(db, intervalSequenceName)).toEqual(INTERVAL_SEQUENCE_DAYS);

        // The list reports the timing as its length rather than as the mode, which is the useful part, and
        // the topic count comes from a virtual field rather than from client-side counting.
        //
        // Asserted against the whole table rather than a single row: CommonDraggableTable renders its rows
        // as divs, not as table rows, so there is no row element to scope to without resorting to a class
        // selector. The tag filter leaves exactly one sequence on screen at this point, so containment in
        // the table says the same thing as containment in the row.
        await filterSequences(page, { search: tag });
        await expect(page.getByTestId('sequences-table')).toContainText(intervalSequenceName);
        await expect(page.getByTestId('sequences-table')).toContainText(`Every ${INTERVAL_SEQUENCE_DAYS} days`);
        await expect(page.getByTestId('sequences-table')).toContainText(moneySkillsSubjectName);
        await expect(page.getByTestId('sequences-table')).toContainText(RECEPTION_YEAR_GROUP);
        // The academic year column is empty for an interval sequence, which carries no dates and so
        // belongs to no year. Only this sequence is on screen, per the note above, so the absence is
        // this row's. The positive case is asserted in scenario 14, where the fixed sequence is
        // listed and does carry a year.
        await expect(page.getByTestId('sequences-table')).not.toContainText(currentPeriodName);

        // ---- Scenario 7: a fixed sequence carries typed dates, and its end date is optional ------------
        // Mirrors what a teacher gets when scheduling by hand, where the start date is required and the end
        // date may be left open. The suggested start date seeds only the first topic added, because a fixed
        // sequence has no duration from which to infer the next window.
        await page.goto('/admin/sequences/new');
        await waitForLoading(page);
        await page.getByTestId('sequence-name-input').fill(fixedSequenceName);
        await selectOption(page, 'sequence-subject-select', moneySkillsSubjectName);
        await selectOption(page, 'sequence-year-group-select', RECEPTION_YEAR_GROUP);
        await page.getByTestId('timing-mode-fixed').click();
        // Chosen after the mode, because the field only exists for a fixed sequence.
        await selectOption(page, 'sequence-period-select', currentPeriodName);

        // Saving is deliberately shared with the interval sequence, so the leader's preview later has both a
        // topic that was auto-scheduled before (skipped) and one scheduled by hand (warned about).
        await addTopic(page, topics.saving);
        await addTopic(page, topics.budgeting);
        await addTopic(page, topics.choices);

        // Every topic arrives undated, in both modes: a fixed sequence's dates belong to its topics
        // and there is no sequence-level date left to seed the first one from.
        await expect(page.getByTestId(`sequence-item-start-${topics.saving.id}`)).toHaveValue('');
        await setItemDates(page, topics.saving, { start: uiDate(20), end: uiDate(26) });
        await setItemDates(page, topics.budgeting, { start: uiDate(24), end: uiDate(30) });
        // Left open on purpose: a class topic created from this item must have no due date at all.
        await setItemDates(page, topics.choices, { start: uiDate(40) });

        // ---- Scenario 8: overlapping windows warn but never block ---------------------------------------
        // A teacher scheduling by hand may already overlap topics freely and a short handover overlap is
        // legitimate, so this is a warning. The message is anchored to the lower of the two topics, so it
        // sits on the row that runs into the one above it rather than being repeated on both.
        await expect(page.getByTestId(`sequence-item-warning-${topics.budgeting.id}`)).toBeVisible();
        await expect(page.getByTestId(`sequence-item-warning-${topics.budgeting.id}`)).toContainText('running at once');
        await expect(page.getByTestId('save-sequence-button')).toBeEnabled();

        // ---- Scenario 9: dates that disagree with the arranged order block saving ----------------------
        // The arranged order is authoritative but dates are never rewritten automatically, because these are
        // real dates on a real schedule and should only change when someone types them. So the form asks for
        // the dates to be corrected instead, and refuses to save until they are.
        await page.getByTestId(`sequence-item-move-up-${topics.choices.id}`).click();
        await expect(page.getByTestId(`sequence-item-error-${topics.choices.id}`)).toBeVisible();
        await expect(page.getByTestId('sequence-date-errors-summary')).toBeVisible();
        await expect(page.getByTestId('save-sequence-button')).toBeDisabled();

        // Putting it back restores agreement, which is the other half of the rule: nothing was rewritten
        // while it was wrong.
        await page.getByTestId(`sequence-item-move-down-${topics.choices.id}`).click();
        await expect(page.getByTestId('sequence-date-errors-summary')).toHaveCount(0);
        await saveSequence(page, 'Sequence created successfully!');

        // ---- Scenario 10: a sequence for another subject, to prove two later rules ----------------------
        // English is a full-programme subject, and this sequence exists to be withheld twice over.
        //
        // Scenario 17 proves entitlement with it: the class the leader auto-schedules onto has reading logs
        // rather than full programme, so English is out of its reach on subject, exactly as the Year 1 one
        // below is out of reach on year group.
        //
        // Scenario 30 proves the Money Skills page's own filter with it, on a class that is full programme
        // and so does have English within reach. That is the only way to tell a programme filter apart from
        // an entitlement rule, and it is why this sequence is Reception rather than any other year group.
        await page.goto('/admin/sequences/new');
        await waitForLoading(page);
        await page.getByTestId('sequence-name-input').fill(englishSequenceName);
        await selectOption(page, 'sequence-subject-select', englishSubjectName);
        await selectOption(page, 'sequence-year-group-select', RECEPTION_YEAR_GROUP);
        // No academic year: an interval sequence belongs to none, and the field is not rendered for it.
        await page.getByTestId('timing-mode-interval').click();
        // A cadence, which an interval sequence cannot be saved without: without one it could never be
        // assigned, and no school could supply one, so the form refuses it here.
        await page.getByTestId('sequence-interval-days-input').fill(String(INTERVAL_SEQUENCE_DAYS));
        await addTopic(page, topics.english);
        await saveSequence(page, 'Sequence created successfully!');

        // ---- Scenario 11: a sequence for another year group, to prove eligibility later -----------------
        // A sequence is scoped to one subject and one year group, and a class may only be offered one that
        // matches its own year group.
        await page.goto('/admin/sequences/new');
        await waitForLoading(page);
        await page.getByTestId('sequence-name-input').fill(yearOneSequenceName);
        await selectOption(page, 'sequence-subject-select', moneySkillsSubjectName);
        await selectOption(page, 'sequence-year-group-select', YEAR_ONE_YEAR_GROUP);
        // No academic year: an interval sequence belongs to none, and the field is not rendered for it.
        await page.getByTestId('timing-mode-interval').click();
        await page.getByTestId('sequence-interval-days-input').fill(String(INTERVAL_SEQUENCE_DAYS));
        await addTopic(page, topics.yearOne);
        await saveSequence(page, 'Sequence created successfully!');

        // ---- Scenario 12: a fixed sequence whose own dates have already passed --------------------------
        // The case the recovery path in scenario 27 exists for: a fixed sequence carries concrete dates, so
        // one built earlier in the year is past-dated by the time it is reused.
        //
        // Seeded rather than built through the form, which cannot produce this state and should not be able
        // to: the form offers only the current academic year and later, and every topic date must fall
        // inside the year chosen, so a past-dated sequence for a finished year is refused outright. A stale
        // sequence is data that already exists rather than something an admin creates today, so inserting
        // it directly is the honest model. It is also the only deterministic one: whether the form could
        // have made this would otherwise depend on how far into the academic year the suite happens to run,
        // and in the first weeks of a year it could not at all.
        const pastSequenceId = await seedFixedSequence(db, {
            name: pastSequenceName,
            subjectId: moneySkillsSubjectId,
            yearGroupId: RECEPTION_YEAR_GROUP_ID,
            periodIndex: currentPeriod.index,
            items: [
                { topicId: topics.autumnOne.id, startDate: dbDate(-30), endDate: dbDate(-24) },
                { topicId: topics.autumnTwo.id, startDate: dbDate(-23), endDate: dbDate(-17) }
            ]
        });

        // Still tagged to the current academic year, so it is offered rather than filtered out: the whole
        // point of scenario 27 is that a stale set is still the right set within the year it belongs to.
        expect(await sequenceIdByName(db, pastSequenceName)).toEqual(pastSequenceId);

        const intervalSequenceId = await sequenceIdByName(db, intervalSequenceName);
        const fixedSequenceId = await sequenceIdByName(db, fixedSequenceName);

        /*
         * ---- Scenario 13: editing an interval sequence offers its topics and its cadence ---------------
         *
         * This scenario used to change the interval and assert the whole sequence re-dated itself. There
         * are no dates to re-flow now (LEA-6594), so what it proves instead is that the cadence survives
         * a round trip through the edit screen. That is where a value loaded from the database is most
         * easily dropped, and a blank cadence field would read as "none set" and fail the next save.
         *
         * The two fields that did go are asserted absent on a form loaded from a saved sequence rather
         * than built fresh, which is the other way a stale field survives.
         */
        await page.goto(`/admin/sequences/${intervalSequenceId}`);
        await waitForLoading(page);
        await expect(page.getByTestId('edit-sequence-page')).toBeVisible();
        // The note only makes sense once there are assignments to affect, so it is edit-only.
        await expect(page.getByTestId('sequence-assignments-note')).toContainText(
            'does not change classes that have already been assigned'
        );

        await expect(page.getByTestId('sequence-period-select')).toHaveCount(0);
        await expect(page.getByTestId(`sequence-item-window-${topics.saving.id}`)).toHaveCount(0);

        // Loaded from the saved sequence rather than left blank.
        await expect(page.getByTestId('sequence-interval-days-input')).toHaveValue(String(INTERVAL_SEQUENCE_DAYS));

        /*
         * Reordered and then put back, so this proves the edit screen persists a move without changing
         * what the scenarios below inherit.
         *
         * The move matters because it is a different code path from scenario 6's: that one reorders
         * while creating, this one while updating. The restore matters because scenarios 18 to 20
         * preview this same sequence and read dates off it by position, so leaving it reordered would
         * shift every window they assert by one interval and fail three scenarios for a reason none
         * of them mentions.
         */
        await page.getByTestId(`sequence-item-move-up-${topics.coins.id}`).click();
        await saveSequence(page, 'Sequence updated successfully!');

        expect((await intervalSequenceItems(db, intervalSequenceName)).map((item) => item.topicId)).toEqual([
            topics.coins.id,
            topics.saving.id,
            topics.spending.id
        ]);

        // Back to how scenario 6 left it. Reopened first, because saving returns to the list.
        await page.goto(`/admin/sequences/${intervalSequenceId}`);
        await waitForLoading(page);
        await expect(page.getByTestId('edit-sequence-page')).toBeVisible();
        await page.getByTestId(`sequence-item-move-down-${topics.coins.id}`).click();
        await saveSequence(page, 'Sequence updated successfully!');

        expect((await intervalSequenceItems(db, intervalSequenceName)).map((item) => item.topicId)).toEqual([
            topics.saving.id,
            topics.coins.id,
            topics.spending.id
        ]);

        // ---- Scenario 14: the list filters narrow by subject, year group and name -----------------------
        // Filtering to Reception must exclude the Year 1 sequence, which is the same rule the assign
        // dropdown applies from the other end.
        await filterSequences(page, { search: tag, yearGroup: RECEPTION_YEAR_GROUP });
        await expect(page.getByTestId('sequences-table')).toContainText(intervalSequenceName);
        await expect(page.getByTestId('sequences-table')).toContainText(fixedSequenceName);
        await expect(page.getByTestId('sequences-table')).not.toContainText(yearOneSequenceName);
        // The other half of scenario 6's assertion: the fixed sequence is on screen here and does
        // carry an academic year, so the column has a value to show rather than being empty for
        // every sequence. Between the two, the column is proved to distinguish the modes.
        await expect(page.getByTestId('sequences-table')).toContainText(currentPeriodName);

        await filterSequences(page, { search: yearOneSequenceName });
        await expect(page.getByTestId('sequences-table')).toContainText(yearOneSequenceName);
        await expect(page.getByTestId('sequences-table')).not.toContainText(intervalSequenceName);

        await adminOrTeacherSignOut(page);
        await login(page, leaderEmail, password);
        await acceptFeatureTooltipPrompt(page);

        // ---- Scenario 15: activating a class that can be offered Money Skills explains it first ---------
        // Reception this time, so the Money Skills sequences the admin has just built apply to it, and again
        // with reading logs rather than full programme. All three of the destination conditions now hold,
        // so this is the second of the three cases: the leader lands on the Money Skills page.
        //
        // The explainer comes before the dates. For many leaders this is the first they have heard of the
        // programme, so the offer is explained before it is made rather than opening onto a table. The
        // mascot is asserted by the filename it asks for rather than by whether the image loaded, which
        // depends on a bucket rather than on this branch: the file is committed, and only a deployment's
        // image sync places it.
        await activateClass(page, { classId: receptionClass.id, yearGroup: RECEPTION_YEAR_GROUP, mainTeacherName: leaderName });
        await page.waitForURL(new RegExp(`/class/${receptionClass.id}/money-skills-auto-schedule`));
        await waitForLoading(page);
        await expect(page.getByTestId('class-money-skills-auto-schedule-page')).toBeVisible();
        await expect(page.getByTestId('money-skills-auto-schedule-intro')).toBeVisible();
        await expect(page.getByTestId('money-skills-auto-schedule-intro-heading')).toHaveText('Auto-schedule Money Skills');
        await expect(page.getByTestId('money-skills-auto-schedule-intro-body')).toContainText(
            'Money Skills activities are designed to give children the knowledge, skills and experiences'
        );
        await expect(page.locator('[data-test="money-skills-auto-schedule-intro"] img')).toHaveAttribute(
            'src',
            /two-koala-with-a-coin\.png$/
        );

        // The form is not on this step at all, so the explainer cannot be mistaken for a page that happens
        // to show a picker below the fold.
        await expect(page.getByTestId('assign-sequence-select')).toHaveCount(0);

        // Both ways on are offered, and neither has been taken yet.
        await expect(page.getByTestId('money-skills-auto-schedule-dismiss-button')).toBeVisible();
        await expect(page.getByTestId('money-skills-auto-schedule-continue-button')).toBeVisible();

        // ---- Scenario 16: the scheduler is the second step, and Back returns to the explainer -----------
        // The step is held in the URL rather than in component state, and this is the reason: Back has to
        // come back to the explainer, where component state would leave the page entirely. Asserted in both
        // directions, since a page that only went forwards would pass on the URL alone.
        await page.getByTestId('money-skills-auto-schedule-continue-button').click();
        await page.waitForURL(new RegExp(`/class/${receptionClass.id}/money-skills-auto-schedule\\?step=schedule`));
        await waitForLoading(page);
        await expect(page.getByTestId('money-skills-auto-schedule-heading')).toBeVisible();
        await expect(page.getByTestId('assign-sequence-select')).toBeVisible();
        await expect(page.getByTestId('money-skills-auto-schedule-intro')).toHaveCount(0);

        // A leader sent here by activating did not ask to come, so leaving is a likely choice and the page
        // says the offer stands rather than letting them go without knowing. Both are driven by the same
        // arrival, so they are asserted together; scenario 28 is the other half, where the generic page
        // offers neither to a leader who chose to be there.
        await expect(page.getByTestId('assign-sequence-cancel-button')).toHaveText('Skip for now');
        await expect(page.getByTestId('money-skills-auto-schedule-skip-note')).toContainText(
            'You can auto-schedule Money Skills for this class at any time from the class schedule page'
        );

        await page.goBack();
        await waitForLoading(page);
        await expect(page.getByTestId('money-skills-auto-schedule-intro')).toBeVisible();
        await expect(page.getByTestId('assign-sequence-select')).toHaveCount(0);

        /*
         * The rest of the run drives the form on the generic page instead. Not to avoid this one: the form
         * is the same component either way, and scenario 17 proves entitlement by English being withheld,
         * which a Money-Skills-only page withholds for its own reason and so could not prove at all.
         * Scenario 30 is where this page's filtering is shown, on a class that would otherwise see English.
         */
        await goToAutoSchedule(page, receptionClass.id);

        /**
         * Scheduled by hand once the class exists, so it carries no assignment. That is what tells the two
         * already-scheduled cases apart in scenario 23: this one is warned about and scheduled again, where
         * one an auto-schedule created is skipped.
         */
        const handScheduled = await utils.createClassTopic(receptionClass.id, {
            topicId: topics.budgeting.id,
            releaseDate: formatDate(DateTime.now().plus({ days: 3 }).toJSDate(), '-'),
            released: false
        });

        // ---- Scenario 17: the dropdown offers only what this class may be given -------------------------
        // Eligibility is the API's answer, not a guess in the page: the class must be entitled to the
        // sequence's subject and its year group must match. English is withheld because this class has
        // reading logs rather than full programme, and the Year 1 sequence on year group.
        await page.getByTestId('assign-sequence-select').click();
        await expect(page.getByRole('option', { name: intervalSequenceName })).toBeVisible();
        await expect(page.getByRole('option', { name: fixedSequenceName })).toBeVisible();
        await expect(page.getByRole('option', { name: pastSequenceName })).toBeVisible();
        await expect(page.getByRole('option', { name: englishSequenceName })).toHaveCount(0);
        await expect(page.getByRole('option', { name: yearOneSequenceName })).toHaveCount(0);

        /*
         * ---- Scenario 18: the sequence supplies the cadence, and the teacher only the start date -------
         *
         * The dates are generated from a start date and the sequence's cadence and must stay evenly
         * spaced, so there is no per-row date editing at all.
         *
         * **The cadence arrives from the sequence**, which is the assertion this scenario exists for: the
         * pace is a Learning with Parents decision, so a teacher never has to work out what Ready Teddy
         * should run at. The anchor is theirs and defaults to **tomorrow**.
         *
         * **There is no cadence field at all** (LEA-6624), and its absence is asserted rather than
         * assumed: a page that still rendered it would otherwise pass this scenario unchanged, since
         * everything below would work whether the box were there or not.
         *
         * The plan is on screen immediately, spaced by the sequence's own cadence, with nothing typed on
         * this page. That is worth asserting rather than merely allowing, because it is the whole point:
         * a teacher never has to know what Ready Teddy should run at.
         *
         * The default anchor is tomorrow while the floor is today, deliberately. The release cron matches
         * `releaseDate <= now` every ten minutes, so a topic dated today goes live before the teacher has
         * closed the tab.
         *
         * The interval hint went with the field it described, one ticket earlier.
         */
        await page.getByRole('option', { name: intervalSequenceName }).click();
        await expect(page.getByTestId('assign-sequence-start-date')).toHaveValue(uiDate(1));
        await expect(page.getByTestId('assign-sequence-interval-days')).toHaveCount(0);
        await expect(page.getByTestId('assign-sequence-interval-hint')).toHaveCount(0);

        // The plan is already there, anchored on tomorrow and spaced by the sequence's own cadence,
        // with nothing typed on this page at all.
        await expect(page.getByTestId('assign-sequence-summary')).toHaveText('3 topics will be added.');
        await expect(page.getByTestId('assign-sequence-callout')).toBeVisible();
        await expect(page.getByTestId(`sequence-preview-edit-${topics.saving.id}`)).toHaveCount(0);
        await expect(page.getByTestId(`sequence-preview-window-${topics.saving.id}`)).toHaveText(dateWindow(1, INTERVAL_SEQUENCE_DAYS));

        // ---- Scenario 19: the leader may move the start date, and the preview settles -------------------
        // The anchor is the only thing on this page a leader decides. The cadence used to be theirs too,
        // and this scenario used to change both; LEA-6624 left the anchor.
        //
        // The field fires on every keystroke, so the preview waits for the value to settle: a date typed a
        // character at a time passes through dates that parse but are nonsense.
        //
        // The whole set re-flows from the new anchor at the sequence's own pace, which is the other half
        // of what this asserts: moving the start date moves everything, and changes no spacing.
        //
        // The request count is the only automated guard against a bug found while building LEA-6426, where
        // overrides were sent to the preview, came back applied, were then judged redundant, and the preview
        // re-ran without them forever.
        let previewRequests = 0;
        const countPreviews = (request: Request) => {
            if (request.method() === 'POST' && (request.postData() || '').includes('previewSequenceForClass')) previewRequests += 1;
        };

        page.on('request', countPreviews);
        await page.getByTestId('assign-sequence-start-date').fill(uiDate(0));
        await expect(page.getByTestId(`sequence-preview-window-${topics.saving.id}`)).toHaveText(dateWindow(0, 6));
        await expect(page.getByTestId(`sequence-preview-window-${topics.coins.id}`)).toHaveText(dateWindow(7, 13));
        await expect(page.getByTestId(`sequence-preview-window-${topics.spending.id}`)).toHaveText(dateWindow(14, 20));
        await page.waitForTimeout(PREVIEW_SETTLE_CHECK_MS);
        page.off('request', countPreviews);
        expect(previewRequests).toBeLessThanOrEqual(MAX_PREVIEWS_PER_EDIT);

        // ---- Scenario 20: auto-scheduling creates the topics, and leaves for the pupils page ------------
        // Preview and assign return the same shape from the same code path, so what is created is what was
        // confirmed. The interval that was actually used is recorded on the assignment, because the sequence
        // is mutable and an admin editing it later does not touch existing assignments.
        await autoSchedule(page, '3 topics added to this class');
        await page.waitForURL(new RegExp(`/class/${receptionClass.id}/pupils`));

        // The cadence recorded on the assignment is the sequence's, copied at assignment time. That
        // copy is the point: an admin re-pacing the sequence later does not touch this row, so it stays
        // the only evidence of what this class was actually given.
        const intervalAssignment = await assignmentForSequence(db, receptionClass.id, intervalSequenceId);
        expect(intervalAssignment.intervalDays).toBe(INTERVAL_SEQUENCE_DAYS);
        expect(dbDateOf(intervalAssignment.startDate)).toBe(dbDate(0));

        const afterInterval = await classTopicsByTopicId(db, receptionClass.id);
        expect(dbDateOf(afterInterval[topics.saving.id][0].releaseDate)).toBe(dbDate(0));
        expect(dbDateOf(afterInterval[topics.saving.id][0].dueDate)).toBe(dbDate(6));
        expect(dbDateOf(afterInterval[topics.coins.id][0].releaseDate)).toBe(dbDate(7));
        expect(dbDateOf(afterInterval[topics.spending.id][0].releaseDate)).toBe(dbDate(14));

        // ---- Scenario 21: the schedule says where those topics came from --------------------------------
        // Auto-scheduled topics are otherwise indistinguishable from hand-scheduled ones, which is
        // deliberate: from here on they behave identically, and the label only says where they came from.
        await page.goto(`/class/${receptionClass.id}/schedule`);
        await waitForLoading(page);
        await showAllScheduledTopics(page);
        for (const topic of [topics.saving, topics.coins, topics.spending]) {
            await expect(page.getByTestId(`class-topic-auto-scheduled-${afterInterval[topic.id][0].id}`)).toBeVisible();
        }
        // The topic scheduled by hand above carries no such label.
        await expect(page.getByTestId(`class-topic-auto-scheduled-${handScheduled.id}`)).toHaveCount(0);

        // ---- Scenario 22: re-running the same sequence adds nothing -------------------------------------
        // A topic a previous auto-schedule created is skipped, so re-running cannot silently double every
        // topic in the set. With nothing left to add the action is refused outright.
        await goToAutoSchedule(page, receptionClass.id);
        await chooseSequence(page, intervalSequenceName);
        // Nothing is typed on this page. The cadence comes from the sequence, so a fresh page previews
        // as soon as a sequence is chosen, which is what makes the skip summary reachable here without
        // supplying anything first.
        await expect(page.getByTestId('assign-sequence-summary')).toHaveText('Nothing will be added. All 3 topics are being skipped.');
        for (const topic of [topics.saving, topics.coins, topics.spending]) {
            await expect(page.getByTestId(`sequence-preview-skip-tag-${topic.id}`)).toHaveText('Already scheduled');
            await expect(page.getByTestId(`sequence-preview-skip-reason-${topic.id}`)).toContainText('already has this topic');
        }
        await expect(page.getByTestId('assign-sequence-nothing-to-add')).toBeVisible();
        await expect(page.getByTestId('assign-sequence-submit-button')).toBeDisabled();

        // ---- Scenario 23: a fixed sequence drives no start date, and shows both awkward rows ------------
        // For a fixed sequence the template's dates are the class's dates, so a start-date picker would
        // imply it drives something it does not. Instead the whole set can be moved at once.
        //
        // This preview also carries the two states that only exist once a class has some of the topics: one
        // topic was created by the earlier auto-schedule, so it is skipped; one was scheduled by hand, so it
        // is warned about and still created, which gives the class a second copy on the sequence's dates.
        await chooseSequence(page, fixedSequenceName);
        await expect(page.getByTestId('assign-sequence-start-date')).toHaveCount(0);
        await expect(page.getByTestId('assign-sequence-interval-days')).toHaveCount(0);
        // A fixed sequence now shows **nothing** where an interval one shows its start date: no bulk
        // date panel (LEA-6625) and no line explaining the absence (LEA-6626). Asserted rather than
        // left implicit, because three tickets in a row have subtracted from this spot and the next
        // person to add something back should have to change a test to do it.
        //
        // The dates are not unreachable: every row below carries a pencil, covered by scenario 24.
        await expect(page.getByTestId('assign-sequence-shift')).toHaveCount(0);
        await expect(page.getByTestId('assign-sequence-fixed-dates-hint')).toHaveCount(0);
        await expect(page.getByTestId('assign-sequence-summary')).toHaveText('2 topics will be added, 1 skipped.');
        await expect(page.getByTestId(`sequence-preview-skip-tag-${topics.saving.id}`)).toHaveText('Already scheduled');
        await expect(page.getByTestId(`sequence-preview-already-scheduled-${topics.budgeting.id}`)).toContainText('will have it twice');
        // An open-ended item shows a single date, which is a real state rather than missing data.
        await expect(page.getByTestId(`sequence-preview-window-${topics.choices.id}`)).toHaveText(shortDate(40));

        // ---- Scenario 24: a leader may nudge one topic's dates, and cannot nudge them into the past -----
        // Nothing may be created already released, so a past date blocks the action rather than warning. The
        // skipped row offers no pencil at all, because it is not being created and so has no dates to adjust.
        await expect(page.getByTestId(`sequence-preview-edit-${topics.saving.id}`)).toHaveCount(0);
        await page.getByTestId(`sequence-preview-edit-${topics.choices.id}`).click();
        await page.getByTestId(`sequence-preview-start-${topics.choices.id}`).fill(uiDate(45));
        await expect(page.getByTestId(`sequence-preview-changed-${topics.choices.id}`)).toHaveText('Changed for this class');
        await expect(page.getByTestId(`sequence-preview-window-${topics.choices.id}`)).toHaveText(shortDate(45));

        await page.getByTestId(`sequence-preview-start-${topics.choices.id}`).fill(uiDate(-2));
        await expect(page.getByTestId(`sequence-preview-error-${topics.choices.id}`)).toContainText('in the past');
        await expect(page.getByTestId('assign-sequence-submit-button')).toBeDisabled();

        // ---- Scenario 25: re-dating is per row, and clears the block ------------------------------------
        // This used to move the whole set from one anchor. LEA-6625 removed that: the Curriculum team picks
        // these dates to fall clear of holidays, and shifting everything by one offset preserves the gaps
        // while dragging the set onto whatever the offset lands on.
        //
        // So the same end state is reached a topic at a time, which is what the team asked for. It also
        // proves the per-row editor is a way *out* of the blocked state scenario 24 left the form in, and
        // not merely a way into it.
        //
        // Budgeting takes both ends, because it carries a window and setting only its start would leave it
        // ending before it begins. Choices is open ended, so it takes a start and stays open.
        await page.getByTestId(`sequence-preview-start-${topics.choices.id}`).fill(uiDate(66));
        await expect(page.getByTestId(`sequence-preview-error-${topics.choices.id}`)).toHaveCount(0);

        await page.getByTestId(`sequence-preview-edit-${topics.budgeting.id}`).click();
        await page.getByTestId(`sequence-preview-start-${topics.budgeting.id}`).fill(uiDate(50));
        await page.getByTestId(`sequence-preview-end-${topics.budgeting.id}`).fill(uiDate(56));

        await expect(page.getByTestId(`sequence-preview-window-${topics.budgeting.id}`)).toHaveText(dateWindow(50, 56));
        await expect(page.getByTestId(`sequence-preview-window-${topics.choices.id}`)).toHaveText(shortDate(66));
        // The skipped topic was never editable, so it cannot have been caught up in any of this.
        await expect(page.getByTestId(`sequence-preview-edit-${topics.saving.id}`)).toHaveCount(0);

        // ---- Scenario 26: the second assignment creates only what it should -----------------------------
        // The class ends up with the hand-scheduled topic twice, on two different date ranges, which is the
        // accepted consequence of warning rather than skipping. The open-ended topic is created with no due
        // date at all, exactly as a hand-scheduled topic left open would be.
        await autoSchedule(page, '2 topics added to this class, 1 skipped');
        await page.waitForURL(new RegExp(`/class/${receptionClass.id}/pupils`));

        const afterFixed = await classTopicsByTopicId(db, receptionClass.id);
        expect(afterFixed[topics.budgeting.id]).toHaveLength(2);
        expect(afterFixed[topics.saving.id]).toHaveLength(1);

        const sequencedBudgeting = afterFixed[topics.budgeting.id].find((row) => row.classSequenceAssignmentId);
        const openEnded = afterFixed[topics.choices.id][0];
        expect(dbDateOf(sequencedBudgeting?.releaseDate)).toBe(dbDate(50));
        expect(dbDateOf(openEnded.releaseDate)).toBe(dbDate(66));
        expect(openEnded.dueDate).toBeNull();

        // ---- Scenario 27: a past-dated fixed sequence is refused, and can be recovered ------------------
        // The sequence is still offered, deliberately: a set dated last term is still the right set within
        // the same academic year, and the leader re-dates it here. The preview is refused because a fixed
        // sequence's own dates are the class's dates, and the error names every offending topic so they can
        // all be fixed in one pass. The template's rows stand in so there is something to fix them on, which
        // is the only route out of this state.
        //
        // ⚠️ **This is the scenario LEA-6625 costs the most**, and it is worth being honest about in a test
        // rather than only in a PR. Recovery used to be one action: set an anchor, press Move all dates.
        // It is now one edit per past-dated row, so a long stale sequence is real work. That was the
        // Curriculum team's call, and dropping the rows (LEA-6596) is the alternative for a set too stale
        // to be worth re-dating.
        await goToAutoSchedule(page, receptionClass.id);
        await chooseSequence(page, pastSequenceName);
        await expect(page.getByTestId('assign-sequence-preview-error')).toContainText('would be scheduled in the past');
        await expect(page.getByTestId('assign-sequence-preview-error')).toContainText(topics.autumnOne.name);
        await expect(page.getByTestId('assign-sequence-preview-error')).toContainText(topics.autumnTwo.name);
        await expect(page.getByTestId('assign-sequence-fallback-hint')).toBeVisible();
        await expect(page.getByTestId(`sequence-preview-window-${topics.autumnOne.id}`)).toHaveText(dateWindow(-30, -24));

        // Both rows are re-dated by hand, on the fallback rows the failed preview left standing. Each
        // window is set explicitly, so nothing is inferred: the assertion that the gap between the two
        // "survives the move" has gone with the move, because a teacher typing both dates is choosing the
        // gap rather than preserving it.
        await page.getByTestId(`sequence-preview-edit-${topics.autumnOne.id}`).click();
        await page.getByTestId(`sequence-preview-start-${topics.autumnOne.id}`).fill(uiDate(70));
        await page.getByTestId(`sequence-preview-end-${topics.autumnOne.id}`).fill(uiDate(76));

        await page.getByTestId(`sequence-preview-edit-${topics.autumnTwo.id}`).click();
        await page.getByTestId(`sequence-preview-start-${topics.autumnTwo.id}`).fill(uiDate(77));
        await page.getByTestId(`sequence-preview-end-${topics.autumnTwo.id}`).fill(uiDate(83));

        await expect(page.getByTestId(`sequence-preview-window-${topics.autumnOne.id}`)).toHaveText(dateWindow(70, 76));
        await expect(page.getByTestId(`sequence-preview-window-${topics.autumnTwo.id}`)).toHaveText(dateWindow(77, 83));
        await autoSchedule(page, '2 topics added to this class');

        const afterPast = await classTopicsByTopicId(db, receptionClass.id);
        expect(dbDateOf(afterPast[topics.autumnOne.id][0].releaseDate)).toBe(dbDate(70));
        expect(dbDateOf(afterPast[topics.autumnTwo.id][0].releaseDate)).toBe(dbDate(77));

        // ---- Scenario 28: the schedule page is one of the generic page's two ways in --------------------
        // The button navigates rather than opening anything, so one page serves both of its entry points.
        await page.goto(`/class/${receptionClass.id}/schedule`);
        await waitForLoading(page);
        await page.getByTestId('assign-sequence-button').click();
        await page.waitForURL(new RegExp(`/class/${receptionClass.id}/auto-schedule`));
        await waitForLoading(page);
        await expect(page.getByTestId('class-auto-schedule-page')).toBeVisible();
        // The generic page has no activation behaviour left at all: the way out always reads as a plain
        // cancel, and the note about coming back later is never shown here, whatever brought the leader.
        // This is the other half of scenario 16, and it is what would fail if that note were ever moved
        // back onto this page, where it would tell a leader arriving from the schedule page about the
        // schedule page they just left.
        await expect(page.getByTestId('assign-sequence-cancel-button')).toHaveText('Cancel');
        await expect(page.getByTestId('auto-schedule-skip-note')).toHaveCount(0);
        await expect(page.getByTestId('money-skills-auto-schedule-skip-note')).toHaveCount(0);

        // And the parameter that used to drive that wording is ignored, rather than still being read by a
        // page that no longer has anything to do with activation.
        await page.goto(`/class/${receptionClass.id}/auto-schedule?from=activation`);
        await waitForLoading(page);
        await expect(page.getByTestId('assign-sequence-cancel-button')).toHaveText('Cancel');
        await expect(page.getByTestId('auto-schedule-skip-note')).toHaveCount(0);

        // ---- Scenario 29: the explainer's Dismiss leaves for the class's pupils page --------------------
        // A second class landing on the Money Skills page, which is what makes the explainer's own way out
        // worth asserting: nothing is stored about a dismissal, so a leader activating class after class is
        // offered this every time, and Dismiss has to work as an ordinary way out rather than as a
        // suppression. Full programme this time, for scenario 30.
        await activateClass(page, {
            classId: fullProgrammeClass.id,
            yearGroup: RECEPTION_YEAR_GROUP,
            mainTeacherName: leaderName,
            isFullProgramme: true
        });
        await page.waitForURL(new RegExp(`/class/${fullProgrammeClass.id}/money-skills-auto-schedule`));
        await waitForLoading(page);
        await expect(page.getByTestId('money-skills-auto-schedule-intro')).toBeVisible();

        await page.getByTestId('money-skills-auto-schedule-dismiss-button').click();
        await page.waitForURL(new RegExp(`/class/${fullProgrammeClass.id}/pupils`));

        // ---- Scenario 30: the Money Skills page offers Money Skills and nothing else --------------------
        // The one assertion that needs a class entitled to more than Money Skills. The Reception class the
        // rest of the run uses has reading logs only, so English is withheld from it by entitlement and
        // would be withheld whether the programme filter worked or not: on that class this scenario would
        // pass for the wrong reason.
        //
        // This class is full programme, so English is within its reach. The two pages are asked the same
        // question about the same class one after the other, and the difference between the answers is the
        // filter itself.
        await page.goto(`/class/${fullProgrammeClass.id}/money-skills-auto-schedule?step=schedule`);
        await waitForLoading(page);
        await expect(page.getByTestId('assign-sequence-select')).toBeVisible();
        await page.getByTestId('assign-sequence-select').click();
        await expect(page.getByRole('option', { name: intervalSequenceName })).toBeVisible();
        await expect(page.getByRole('option', { name: fixedSequenceName })).toBeVisible();
        await expect(page.getByRole('option', { name: englishSequenceName })).toHaveCount(0);
        // Withheld on year group as well, so the filter narrows rather than replaces the rules already there.
        await expect(page.getByRole('option', { name: yearOneSequenceName })).toHaveCount(0);

        // The same class on the generic page is offered English, which is what proves the line above.
        await goToAutoSchedule(page, fullProgrammeClass.id);
        await page.getByTestId('assign-sequence-select').click();
        await expect(page.getByRole('option', { name: englishSequenceName })).toBeVisible();
        await expect(page.getByRole('option', { name: intervalSequenceName })).toBeVisible();

        // ---- Scenario 31: the school overview is the generic page's other way in -----------------------
        // The button is driven by canAutoScheduleMoneySkills, which asks three things of a class: that the
        // school has Money Skills and the class's own licence allows it, that a Money Skills sequence
        // exists for its year group, and that it is in the current academic year. That is the same field
        // the activation redirect now asks, so this scenario and scenario 1 pin one rule from two sides:
        // the Year 2 class that was sent to the school overview is the same one denied this button below.
        //
        // The button still opens the generic page rather than the Money Skills one. That is a decision
        // rather than an oversight: the Money Skills page belongs to activation, and a leader pressing this
        // asked for auto-scheduling rather than for an explanation of a programme.
        //
        // Deliberately not gated on the class already having a Money Skills topic: leaders are meant to use
        // this in the first term before any topic is set, so the untouched class below is offered it despite
        // never having been given one. Every class here is an active registration class this test activated
        // itself, so the difference between them is the rule rather than the page.
        await activateClass(page, { classId: untouchedClass.id, yearGroup: RECEPTION_YEAR_GROUP, mainTeacherName: leaderName });
        await page.waitForURL(new RegExp(`/class/${untouchedClass.id}/money-skills-auto-schedule`));

        await page.goto(`/school/${school.id}`);
        await waitForLoading(page);

        /*
         * Nothing is expanded first, deliberately. The button sits on the class's own row rather than
         * inside its accordion, so a leader sees it on arriving at the page. Asserting it while every
         * row is still collapsed is what holds that: if it ever moved back into the accordion these
         * three assertions would fail rather than quietly still passing.
         */
        await expect(page.getByTestId(`registration-class-row-${receptionClass.id}`)).toBeVisible();
        await expect(page.getByTestId(`class-auto-schedule-button-${receptionClass.id}`)).toBeVisible();

        // Activated and then left alone, so it has no topics of any kind. This is the journey the feature
        // exists for: a leader who skipped auto-scheduling at activation coming back to it here.
        await expect(page.getByTestId(`class-auto-schedule-button-${untouchedClass.id}`)).toBeVisible();

        // Withheld on year group alone: this class is entitled and in the current year, and the only thing
        // it lacks is a sequence, since this spec never builds one for Year 2. Its row is asserted present
        // so the absent button cannot be explained by the row itself having failed to render.
        await expect(page.getByTestId(`registration-class-row-${yearTwoClass.id}`)).toBeVisible();
        await expect(page.getByTestId(`class-auto-schedule-button-${yearTwoClass.id}`)).toHaveCount(0);

        // And it leads to the same page as the other two.
        await page.getByTestId(`class-auto-schedule-button-${receptionClass.id}`).click();
        await page.waitForURL(new RegExp(`/class/${receptionClass.id}/auto-schedule`));

        // ---- Scenario 32: a class outside the current academic year is not offered it at all ------------
        // Agreed with the team on 2026-08-17: a Ready Teddy class waiting for next September must never be
        // auto-scheduled, or its topics would release into a year nobody opens again. The class below is
        // identical to the Reception one in every way that matters except its academic year, so the year is
        // the only thing that can be withholding this.
        await page.goto(`/class/${nextYearClass.id}/schedule`);
        await waitForLoading(page);
        await expect(page.getByTestId('class-schedule-page')).toBeVisible();
        await expect(page.getByTestId('assign-sequence-button')).toHaveCount(0);

        await page.goto(`/class/${nextYearClass.id}/auto-schedule`);
        await waitForLoading(page);
        await expect(page.getByTestId('auto-schedule-empty-state')).toBeVisible();

        // And so does the Money Skills page, which is what makes this the academic year rather than the
        // programme: this class is Reception, and Reception is the year group every Money Skills sequence in
        // this run was built for. Scenario 2 covers the same state for a class whose year group has none.
        await page.goto(`/class/${nextYearClass.id}/money-skills-auto-schedule`);
        await waitForLoading(page);
        await expect(page.getByTestId('money-skills-auto-schedule-empty-state')).toBeVisible();
        await expect(page.getByTestId('money-skills-auto-schedule-intro')).toHaveCount(0);

        // ---- Scenario 33: activating in a school without Money Skills goes to the school overview -------
        // The first of the three destination cases, and the same destination as scenario 1 for a different
        // reason. There the school had the licence and the class's year group had no sequence; here the
        // school has no licence at all, so no class in it can be offered Money Skills whatever its own
        // shape and whatever sequences exist.
        //
        // The class is otherwise as eligible as it could be: current year, registration, reading logs, and
        // Money Skills sequences exist for Reception by now. So the licence is the only thing that can be
        // withholding this. With it gone the class is entitled to no sequenceable programme at all, since
        // reading topics are generated by the platform rather than scheduled by a teacher and no sequence
        // can be built from them.
        //
        // The licence is switched off around this scenario alone, and restored immediately below, because
        // everything else here assumes the school the fixture seeded. `activateClass` starts with a full
        // page load, so the activate page reads the changed flag rather than an Apollo cache warmed by the
        // scenarios above.
        await db.updateTable('lwp_school').set({ isMoneySkillsAvailable: false }).where('id', '=', school.id).execute();

        await activateClass(page, { classId: readingOnlyClass.id, yearGroup: RECEPTION_YEAR_GROUP, mainTeacherName: leaderName });
        await page.waitForURL(new RegExp(`/school/${school.id}`));
        await waitForLoading(page);
        await expect(page.getByTestId('classes-overview-tab-section')).toBeVisible();

        // And the class schedule page does not offer it either, so this is the rule rather than the route.
        await page.goto(`/class/${readingOnlyClass.id}/schedule`);
        await waitForLoading(page);
        await expect(page.getByTestId('class-schedule-page')).toBeVisible();
        await expect(page.getByTestId('assign-sequence-button')).toHaveCount(0);

        // Restored immediately, because everything below assumes the school this spec seeded.
        await db.updateTable('lwp_school').set({ isMoneySkillsAvailable: true }).where('id', '=', school.id).execute();

        // ---- Scenario 34: a sequenced topic releases to pupils, then locks ------------------------------
        // The proof that a sequenced topic behaves like a hand-scheduled one downstream: the release cron
        // knows nothing about sequences and works purely from the row contents, which is why the create path
        // is shared. Once released, its start date can no longer be edited, while a later one still can.
        const releasedClassTopicId = afterInterval[topics.saving.id][0].id;

        await adminOrTeacherSignOut(page);
        await login(page, admin, password);
        await page.waitForURL(/\/admin/);
        await waitForLoading(page);
        await openSideDrawer(page);
        await releaseTopicsUpToADate(page);

        // Asserted against this class's own pupils rather than the fixture's active one, who belongs to
        // the class the fixture activated for itself. The release reaches every pupil in the class it is
        // releasing to, whatever state their parents are in, so the two counts must agree.
        const pupilsInClass = await db
            .selectFrom('lwp_class_pupil')
            .where('lwpSchoolClassId', '=', receptionClass.id)
            .select(['lwpPupilId'])
            .execute();
        expect(pupilsInClass.length).toBeGreaterThan(0);

        const pupilTopics = await db
            .selectFrom('lwp_pupil_topic')
            .where('classTopicId', '=', releasedClassTopicId)
            .select(['id'])
            .execute();
        expect(pupilTopics).toHaveLength(pupilsInClass.length);

        await adminOrTeacherSignOut(page);
        await login(page, leaderEmail, password);
        await acceptFeatureTooltipPrompt(page);
        await page.goto(`/class/${receptionClass.id}/schedule`);
        await waitForLoading(page);
        await showAllScheduledTopics(page);

        await openTopicEdit(page, topics.saving.name);
        await expect(page.locator('input[name="startDate"]')).toBeDisabled();
        await page.getByTestId('dialog-cancel-btn').click();

        await openTopicEdit(page, topics.spending.name);
        await expect(page.locator('input[name="startDate"]')).toBeEnabled();
        await page.getByTestId('dialog-cancel-btn').click();

        /*
         * ---- Scenario 35: the Topic library is the feature's fourth way in ------------------------------
         *
         * The Set a topic page is where teachers already go to schedule a single topic, so it is where
         * scheduling a whole sequence belongs too. It is the only entry point with no class in scope, which
         * is the whole reason it needs a picker: the other three are opened from a class and go straight to
         * that class's page.
         *
         * The picker navigates rather than assigning, so everything past this point is the page scenario 28
         * already covers. What is asserted here is the choice: that the action is offered, that the classes
         * behind it are the ones that can actually take a sequence, and that choosing one arrives at that
         * class rather than at whichever class happened to be first.
         */
        await page.goto(`/school/${school.id}/topic-library`);
        await waitForLoading(page);

        // The row is always in the DOM, whether or not it has a button in it, so the filters below it do not
        // move when the availability query answers after the page has painted. Asserted here because a
        // conditional row would look identical in a passing test that never checks it.
        await expect(page.getByTestId('topic-library-auto-schedule-row')).toBeVisible();
        await page.getByTestId('topic-library-auto-schedule-button').click();
        await expect(page.getByTestId('auto-schedule-class-menu')).toBeVisible();

        // The Year 2 class is the control. It is an active current-year registration class in this school,
        // so it passes everything except the last condition: this spec never builds a Year 2 sequence, which
        // is the same fact scenario 1 uses to send it to the school overview. Its absence here is what shows
        // the list is filtered on availability rather than merely listing the school's classes.
        await expect(page.getByTestId(`auto-schedule-class-option-${receptionClass.id}`)).toBeVisible();
        await expect(page.getByTestId(`auto-schedule-class-option-${yearTwoClass.id}`)).toHaveCount(0);

        // The second control, kept out for a different reason. This one is Reception with reading logs, so a
        // sequence does exist for it and it fails only on the academic year: it sits in next year, which is
        // the same rule scenario 32 asserts on the page itself. Two classes excluded for two different
        // reasons is what shows the whole rule is applied here rather than one convenient half of it.
        await expect(page.getByTestId(`auto-schedule-class-option-${nextYearClass.id}`)).toHaveCount(0);

        // Said once, under the list, rather than as a disabled row per class the leader cannot use.
        await expect(page.getByTestId('auto-schedule-class-menu-note')).toContainText('ready-made sequence for their year group');

        await page.getByTestId(`auto-schedule-class-option-${receptionClass.id}`).click();
        await page.waitForURL(new RegExp(`/class/${receptionClass.id}/auto-schedule`));
        await waitForLoading(page);
        await expect(page.getByTestId('class-auto-schedule-page')).toBeVisible();

        /*
         * ---- Scenario 36: a teacher is offered their own classes and nobody else's ----------------------
         *
         * This is the first thing in the feature aimed at teachers rather than leaders, and the scoping is a
         * correctness rule rather than a courtesy. A teacher may read any class in their school but may only
         * write to the classes they are attached to, so a picker that listed the rest would preview happily
         * and then fail authorization at the moment of assigning.
         *
         * The teacher is attached to the Reception class alone. The full programme class is the control: the
         * leader is offered it two scenarios above, it is just as eligible here, and the only thing keeping
         * it off this list is who is asking.
         */
        const seedUser = await db.selectFrom('lwp_user').where('id', '=', '1').select(['id', 'password']).executeTakeFirstOrThrow();
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
            schoolId: school.id,
            password: seedUser.password,
            nameForChildren: `Mr ${teacherFirstName}`
        });

        await utils.addClassTeacher(teacher.id, receptionClass.id);

        await adminOrTeacherSignOut(page);
        await login(page, teacherEmail, password);
        await acceptFeatureTooltipPrompt(page);

        await page.goto(`/school/${school.id}/topic-library`);
        await waitForLoading(page);
        await page.getByTestId('topic-library-auto-schedule-button').click();
        await expect(page.getByTestId('auto-schedule-class-menu')).toBeVisible();

        await expect(page.getByTestId(`auto-schedule-class-option-${receptionClass.id}`)).toBeVisible();
        await expect(page.getByTestId(`auto-schedule-class-option-${fullProgrammeClass.id}`)).toHaveCount(0);

        // One list rather than two, because the split into "Your classes" and "Other classes" only earns its
        // headings when there is something on both sides of it, and for a teacher there never is.
        await expect(page.getByText('Other classes', { exact: true })).toHaveCount(0);

        // And the page it leads to accepts them, which is what proves the list was scoped to what a teacher
        // may actually write to rather than merely to what looks tidy.
        await page.getByTestId(`auto-schedule-class-option-${receptionClass.id}`).click();
        await page.waitForURL(new RegExp(`/class/${receptionClass.id}/auto-schedule`));
        await waitForLoading(page);
        await expect(page.getByTestId('assign-sequence-select')).toBeVisible();

        /*
         * ---- Scenario 37: an admin viewing a school gets the leader's list ------------------------------
         *
         * An admin on a `/school/...` route is in view-as-school-leader mode, which is a frontend routing
         * mode rather than a different token: the token still says ADMIN, and every gate between here and
         * the data admits an admin for its own reason. This asserts the result rather than any one of them,
         * because the chain is long enough that reading it is not proof.
         *
         * The full programme class is the discriminator. It is absent for the teacher immediately above and
         * present for the leader in scenario 35, so seeing it here is what places the admin on the leader's
         * side of that split rather than merely on a page that rendered.
         *
         * An admin teaches nothing, so every class comes back as somebody else's and the list is undivided.
         * That is correct rather than a gap: the split exists to help a leader find their own classes among
         * the rest, and an admin has none to find.
         */
        await adminOrTeacherSignOut(page);
        await login(page, admin, password);
        await acceptFeatureTooltipPrompt(page);

        await page.goto(`/school/${school.id}/topic-library`);
        await waitForLoading(page);
        await page.getByTestId('topic-library-auto-schedule-button').click();
        await expect(page.getByTestId('auto-schedule-class-menu')).toBeVisible();

        await expect(page.getByTestId(`auto-schedule-class-option-${receptionClass.id}`)).toBeVisible();
        await expect(page.getByTestId(`auto-schedule-class-option-${fullProgrammeClass.id}`)).toBeVisible();
        await expect(page.getByTestId(`auto-schedule-class-option-${yearTwoClass.id}`)).toHaveCount(0);
        await expect(page.getByText('Your classes', { exact: true })).toHaveCount(0);

        // ---- Scenario 38: deleting the sequence leaves every class topic alone --------------------------
        // A class topic points at its assignment, not at the sequence, and deleting a sequence only cascades
        // into its own items. So nothing a class already has is removed, released or not: the assignment
        // survives with its sequenceId nulled and its snapshotted name intact, and the labels still resolve.
        // Pupil work is never reachable from this action.
        const beforeDelete = await classTopicsByTopicId(db, receptionClass.id);
        const totalBefore = Object.values(beforeDelete).flat().length;

        await adminOrTeacherSignOut(page);
        await login(page, admin, password);
        await page.goto('/admin/sequences');
        await waitForLoading(page);
        await filterSequences(page, { search: tag });
        await page.getByTestId(`sequence-actions-${fixedSequenceId}`).click();
        await page.getByTestId(`sequence-action-delete-${fixedSequenceId}`).click();
        await page.getByTestId('dialog-primary-btn').click();
        await expect(page.locator('.MuiAlert-message').filter({ hasText: 'Sequence deleted successfully!' })).toBeVisible();
        // The other tagged sequences are still listed, so the table is still on screen to assert against.
        await expect(page.getByTestId('sequences-table')).not.toContainText(fixedSequenceName);

        const fixedAssignment = await db
            .selectFrom('lwp_class_sequence_assignment')
            .where('sequenceName', '=', fixedSequenceName)
            .select(['id', 'sequenceId', 'status'])
            .executeTakeFirstOrThrow();
        expect(fixedAssignment.sequenceId).toBeNull();
        expect(fixedAssignment.status).toBe('ASSIGNED');

        const afterDelete = await classTopicsByTopicId(db, receptionClass.id);
        expect(Object.values(afterDelete).flat()).toHaveLength(totalBefore);
        // The class topics created from the deleted sequence still point at their assignment, so they still
        // read as auto-scheduled on the schedule.
        expect(afterDelete[topics.choices.id][0].classSequenceAssignmentId).toBe(fixedAssignment.id);

        /*
         * ---- Scenario 39: the page still says so when the button that led there has gone stale -----------
         *
         * Every way into the auto-schedule page is now gated on the class having something to schedule, so
         * the empty state is only ever reached by a route that was right when it was drawn and wrong by the
         * time it was followed. That is not hypothetical: sequences are global static data, so an admin can
         * delete one while a leader is sitting on a schedule page that has already decided to offer the
         * button.
         *
         * This drives exactly that, in order rather than as a race. The button is confirmed on screen while
         * the class still has sequences, they are then removed, and the button is pressed without the
         * schedule page ever re-rendering. The page it opens asks again, gets nothing, and says so instead
         * of showing a picker with nothing in it.
         *
         * Last in the run because it takes the class's remaining sequences away. The fixed one went in
         * scenario 38; these two are the rest of what this Reception class is entitled to, since the English
         * one is a subject it cannot see and the Year 1 one is the wrong year group.
         */
        await adminOrTeacherSignOut(page);
        await login(page, leaderEmail, password);
        await acceptFeatureTooltipPrompt(page);

        await page.goto(`/class/${receptionClass.id}/schedule`);
        await waitForLoading(page);
        await expect(page.getByTestId('assign-sequence-button')).toBeVisible();

        // Straight to the database rather than through the admin UI, so the leader's page is left exactly
        // as it was rendered. Going through the UI would mean signing out and back in, which reloads it.
        await db.deleteFrom('static_lwp_topic_sequence').where('name', 'in', [intervalSequenceName, pastSequenceName]).execute();

        await page.getByTestId('assign-sequence-button').click();
        await page.waitForURL(new RegExp(`/class/${receptionClass.id}/auto-schedule`));
        await waitForLoading(page);

        // The page holds a cached list from the schedule page's own query, so it may show the picker for an
        // instant before the fresh answer replaces it. Both assertions wait, and the second is what proves
        // the picker is gone rather than merely late.
        await expect(page.getByTestId('auto-schedule-empty-state')).toContainText('There are no topic sequences available for this class');
        await expect(page.getByTestId('assign-sequence-select')).toHaveCount(0);

        // And the way out of the empty state still works from here.
        await page.getByTestId('auto-schedule-empty-state-button').click();
        await page.waitForURL(new RegExp(`/class/${receptionClass.id}/pupils`));

        // On a fresh load the schedule page no longer offers it at all, which is the gate rather than the
        // page. Asserting the surrounding section is present is what makes the absence meaningful.
        await page.goto(`/class/${receptionClass.id}/schedule`);
        await waitForLoading(page);
        await expect(page.getByText('Add a topic', { exact: true }).first()).toBeVisible();
        await expect(page.getByTestId('assign-sequence-button')).toHaveCount(0);

        /*
         * ---- Scenario 40: the Topic library withholds the action when nothing can take a sequence --------
         *
         * The counterpart to scenario 35, and the reason the picker can never open empty. Every entry point
         * in this feature withholds itself rather than offering a dead action, and this is the only one
         * whose answer is about the whole school rather than about one class.
         *
         * Last in the run because it takes the last two sequences away. The Reception class lost its own in
         * scenarios 38 and 39; these are the Year 1 one, which no class here is in the year group for, and the
         * English one, which the full programme class of scenario 32 is still entitled to. With both gone no
         * class in this school can be given anything, which is the only state in which the button should be
         * absent.
         *
         * The row itself stays, because it holds the space whether or not it has a button in it. Asserting
         * the row is present is what stops this passing on a page that failed to render at all.
         */
        await db.deleteFrom('static_lwp_topic_sequence').where('name', 'in', [yearOneSequenceName, englishSequenceName]).execute();

        await page.goto(`/school/${school.id}/topic-library`);
        await waitForLoading(page);
        await expect(page.getByTestId('topic-library-auto-schedule-row')).toBeVisible();
        await expect(page.getByTestId('topic-library-auto-schedule-button')).toHaveCount(0);

        await adminOrTeacherSignOut(page);
        await login(page, admin, password);

        /**
         * ---- Scenario 41: the academic year dropdown offers this year and later, never a finished one ----
         *
         * A sequence dated into a finished year could never be offered to a school, so the years an admin
         * may pick from start at the one their schools are currently teaching. Asserted by name from the
         * database, so the suite does not care what the years are called or when they run.
         */
        const periods = await db.selectFrom('static_lwp_period').select(['index', 'shortName']).orderBy('index', 'asc').execute();

        const previousPeriod = periods.filter((period) => period.index < currentPeriod.index).pop();
        const laterPeriod = periods.find((period) => period.index > currentPeriod.index);

        await page.goto('/admin/sequences/new');
        await waitForLoading(page);

        // The form opens in fixed mode, which is the only mode that has this field at all.
        await page.getByTestId('timing-mode-fixed').click();
        await page.getByTestId('sequence-period-select').click();

        await expect(page.getByRole('option', { name: currentPeriodName, exact: true })).toBeVisible();

        if (laterPeriod?.shortName) {
            await expect(page.getByRole('option', { name: laterPeriod.shortName, exact: true })).toBeVisible();
        }

        // The one that matters: a finished year is absent rather than merely disabled, so it cannot be
        // chosen at all.
        if (previousPeriod?.shortName) {
            await expect(page.getByRole('option', { name: previousPeriod.shortName, exact: true })).toHaveCount(0);
        }

        await page.keyboard.press('Escape');

        /**
         * ---- Scenario 42: a sequence already given to a class cannot have its academic year changed -----
         *
         * The year then describes class topics that already exist, so changing it would make the record
         * disagree with the data. Disabled rather than hidden, so an admin can still see which year the
         * sequence belongs to, with the reason beside it.
         *
         * Both sequences are seeded here rather than reused from earlier scenarios. The ones built through
         * the form above have since been deleted by scenarios 38 and 39, and depending on which of them
         * still happened to be assigned would make this pass or fail for reasons that have nothing to do
         * with the rule under test.
         */
        const assignedSequenceName = `${tag} Assigned set`;
        const unassignedSequenceName = `${tag} Unassigned set`;

        const assignedSequenceId = await seedFixedSequence(db, {
            name: assignedSequenceName,
            subjectId: moneySkillsSubjectId,
            yearGroupId: RECEPTION_YEAR_GROUP_ID,
            periodIndex: currentPeriod.index,
            items: [{ topicId: topics.autumnOne.id, startDate: dbDate(7), endDate: dbDate(13) }]
        });

        const unassignedSequenceId = await seedFixedSequence(db, {
            name: unassignedSequenceName,
            subjectId: moneySkillsSubjectId,
            yearGroupId: RECEPTION_YEAR_GROUP_ID,
            periodIndex: currentPeriod.index,
            items: [{ topicId: topics.autumnOne.id, startDate: dbDate(7), endDate: dbDate(13) }]
        });

        // Only the assignment row matters to the rule, not the class topics it would normally have
        // created, so this is the smallest thing that makes `hasAssignments` true.
        await db
            .insertInto('lwp_class_sequence_assignment')
            .values({
                classId: receptionClass.id,
                sequenceId: assignedSequenceId,
                sequenceName: assignedSequenceName,
                status: SequenceAssignmentStatus.ASSIGNED
            })
            .execute();

        await page.goto(`/admin/sequences/${assignedSequenceId}`);
        await waitForLoading(page);
        await expect(page.getByTestId('edit-sequence-page')).toBeVisible();
        await expect(page.getByTestId('sequence-period-select').locator('input')).toBeDisabled();
        await expect(page.getByTestId('sequence-period-select')).toContainText(currentPeriodName);
        await expect(page.getByText('This sequence has been scheduled for a class')).toBeVisible();

        // The control: identical in every way except that nothing has been assigned it.
        await page.goto(`/admin/sequences/${unassignedSequenceId}`);
        await waitForLoading(page);
        await expect(page.getByTestId('edit-sequence-page')).toBeVisible();
        await expect(page.getByTestId('sequence-period-select').locator('input')).not.toBeDisabled();
        await expect(page.getByText('This sequence has been scheduled for a class')).toHaveCount(0);

        /**
         * ---- Scenario 43: a sequence from a finished year is listed, last, and still locked ------------
         *
         * The reversal in LEA-6586. The list used to hide finished years, on the reasoning that one could
         * never be offered to a school so listing it would only invite an admin to edit something with no
         * effect. That was right about editing and exactly backwards once clearing them out became the
         * admin's job: the rows they most need to reach were the hidden ones.
         *
         * Listed, then, but last, and still locked when opened: showing the year it belongs to rather than
         * an empty select, which is the difference between "finished" and "never set".
         *
         * Skipped when the database has no year before the current one, since there is then nothing to
         * assert against rather than a failure.
         */
        // Declared out here so scenario 50 can delete this sequence, which is the case the whole
        // change exists for: an admin clearing out last year's sets.
        const staleSequenceName = `${tag} Finished year set`;
        let staleSequenceId: string | null = null;

        if (previousPeriod) {
            staleSequenceId = await seedFixedSequence(db, {
                name: staleSequenceName,
                subjectId: moneySkillsSubjectId,
                yearGroupId: RECEPTION_YEAR_GROUP_ID,
                periodIndex: previousPeriod.index,
                items: [{ topicId: topics.autumnOne.id, startDate: dbDate(-400), endDate: dbDate(-394) }]
            });

            await page.goto('/admin/sequences');
            await waitForLoading(page);
            await filterSequences(page, { search: tag });

            await expect(page.getByTestId('sequences-table')).toContainText(unassignedSequenceName);
            await expect(page.getByTestId('sequences-table')).toContainText(staleSequenceName);

            /*
             * And it sorts below the current year's, which is the whole point of the ranking: an admin
             * opens this page on the sequences they are working with, not on last year's.
             *
             * Compared by position in the rendered row order rather than by asserting an exact list, so
             * the assertion survives other sequences this run has left in the table.
             */
            const namesInOrder = await page
                .getByTestId('sequences-table')
                .getByTestId(/^sequence-open-/)
                .allTextContents();

            expect(namesInOrder.indexOf(staleSequenceName)).toBeGreaterThan(namesInOrder.indexOf(unassignedSequenceName));

            /*
             * And an interval sequence ranks with the current year rather than trailing the list: it
             * carries no academic year, but it is offered in every one of them, so it is exactly as
             * usable now as one built for this year.
             *
             * Seeded here rather than reusing the run's original interval sequence, which scenario 39
             * deleted from the database. Comparing against that one made this assertion vacuous:
             * indexOf returned -1 for a name that was not in the table, so the comparison held
             * whatever the ranking did.
             */
            const rankingControlName = `${tag} Ranking control set`;

            await seedIntervalSequence(db, {
                name: rankingControlName,
                subjectId: moneySkillsSubjectId,
                yearGroupId: RECEPTION_YEAR_GROUP_ID,
                topicIds: [topics.autumnTwo.id]
            });

            await page.reload();
            await waitForLoading(page);
            await filterSequences(page, { search: tag });

            const rankedNames = await page
                .getByTestId('sequences-table')
                .getByTestId(/^sequence-open-/)
                .allTextContents();

            // Present, so the comparison below is a real one rather than a comparison against -1.
            expect(rankedNames).toContain(rankingControlName);
            expect(rankedNames.indexOf(staleSequenceName)).toBeGreaterThan(rankedNames.indexOf(rankingControlName));

            // Clicking the name opens it, which until now only the row's overflow menu could do.
            await page.getByTestId(`sequence-open-${staleSequenceId}`).click();
            await page.waitForURL(new RegExp(`/admin/sequences/${staleSequenceId}$`));
            await waitForLoading(page);

            await expect(page.getByTestId('edit-sequence-page')).toBeVisible();
            await expect(page.getByTestId('sequence-period-select').locator('input')).toBeDisabled();
            await expect(page.getByTestId('sequence-period-select')).toContainText(previousPeriod.shortName ?? '');
            await expect(page.getByText('This academic year has finished')).toBeVisible();
        }

        /*
         * ---- Scenario 44: a teacher drops a past-dated topic, and the action unblocks ------------------
         *
         * The second way out of a past-dated fixed sequence, beside moving the dates forward, which is
         * scenario 27. It is March, the set has a January topic, and the teacher wants the rest of it.
         *
         * Driven on the **full programme class** rather than the Reception one the run has been using.
         * By this point that class has every Money Skills topic scheduled, so every row of any sequence
         * would come back skipped and a removal would prove nothing. This class was activated in
         * scenario 29 and dismissed, so nothing has ever been scheduled on it.
         *
         * A sequence of its own, with one past topic and one future one. Scenario 27's fixture is both
         * past-dated and already assigned, so it can neither be unblocked by dropping one row nor
         * reused without its skips getting in the way.
         */
        await adminOrTeacherSignOut(page);
        await login(page, leaderEmail, password);

        const mixedSequenceName = `${tag} Mixed set`;

        await seedFixedSequence(db, {
            name: mixedSequenceName,
            subjectId: moneySkillsSubjectId,
            yearGroupId: RECEPTION_YEAR_GROUP_ID,
            periodIndex: currentPeriod.index,
            items: [
                { topicId: topics.autumnOne.id, startDate: dbDate(-30), endDate: dbDate(-24) },
                { topicId: topics.spending.id, startDate: dbDate(30), endDate: dbDate(36) }
            ]
        });

        /*
         * One of the two topics is put on this class by hand first, so the row carries the
         * hand-scheduled warning. Scenario 45 needs that warning on screen to prove it goes away when
         * the row is dropped, which is the thing it is really about.
         *
         * By hand rather than by auto-scheduling: a topic an earlier auto-schedule created is skipped
         * instead, and a skipped row offers no remove control at all.
         */
        await utils.createClassTopic(fullProgrammeClass.id, {
            topicId: topics.spending.id,
            releaseDate: formatDate(DateTime.now().plus({ days: 4 }).toJSDate(), '-'),
            released: false
        });

        await goToAutoSchedule(page, fullProgrammeClass.id);
        await chooseSequence(page, mixedSequenceName);

        // Refused while the January topic is still in the plan, naming it, exactly as scenario 27's is.
        await expect(page.getByTestId('assign-sequence-preview-error')).toContainText('would be scheduled in the past');
        await expect(page.getByTestId('assign-sequence-preview-error')).toContainText(topics.autumnOne.name);
        await expect(page.getByTestId('assign-sequence-submit-button')).toBeDisabled();

        // Dropping it is enough on its own. Nothing about the remaining topic changes.
        await page.getByTestId(`sequence-preview-toggle-excluded-${topics.autumnOne.id}`).click();
        await expect(page.getByTestId('assign-sequence-preview-error')).toHaveCount(0);
        await expect(page.getByTestId('assign-sequence-summary')).toHaveText('1 topic will be added, 1 removed.');
        await expect(page.getByTestId('assign-sequence-submit-button')).toBeEnabled();

        /*
         * ---- Scenario 45: the dropped row stays on screen, and can be put back -------------------------
         *
         * It is struck through rather than removed from the table, so a teacher can see what they are
         * declining rather than only what they are keeping, and can undo it where they are. The tag is
         * what says why the row is struck through: the strike alone reads as a rendering fault as easily
         * as a choice.
         */
        await expect(page.getByTestId(`sequence-preview-row-${topics.autumnOne.id}`)).toBeVisible();
        await expect(page.getByTestId(`sequence-preview-removed-tag-${topics.autumnOne.id}`)).toHaveText('Removed');
        // No dates to change on a row that is not being created, so the pencil goes with it.
        await expect(page.getByTestId(`sequence-preview-edit-${topics.autumnOne.id}`)).toHaveCount(0);

        /*
         * The hand-scheduled warning goes with the row, and it is worth its own assertions because it
         * is the one thing on a dropped row that would otherwise still be arguing the opposite case.
         *
         * It says the class will end up with the topic twice, which is untrue once the teacher has
         * dropped the row: it is not being created at all. Asserted present first, so this cannot pass
         * on a page that never showed the warning to begin with.
         */
        await expect(page.getByTestId(`sequence-preview-already-scheduled-${topics.spending.id}`)).toContainText('will have it twice');

        await page.getByTestId(`sequence-preview-toggle-excluded-${topics.spending.id}`).click();
        await expect(page.getByTestId(`sequence-preview-already-scheduled-${topics.spending.id}`)).toHaveCount(0);

        // And it comes back with the row, since the second copy is on its way again.
        await page.getByTestId(`sequence-preview-toggle-excluded-${topics.spending.id}`).click();
        await expect(page.getByTestId(`sequence-preview-already-scheduled-${topics.spending.id}`)).toContainText('will have it twice');

        // Undo. The same control puts it back, so the row it acts on is never in doubt, and the refusal
        // returns: dropping a topic is a decision the teacher can reverse, not a way round the rule.
        await page.getByTestId(`sequence-preview-toggle-excluded-${topics.autumnOne.id}`).click();
        await expect(page.getByTestId(`sequence-preview-removed-tag-${topics.autumnOne.id}`)).toHaveCount(0);
        await expect(page.getByTestId('assign-sequence-preview-error')).toContainText(topics.autumnOne.name);
        await expect(page.getByTestId('assign-sequence-submit-button')).toBeDisabled();

        /*
         * ---- Scenario 46: dropping every topic leaves nothing to do, and says so ----------------------
         *
         * The state the page has to have an answer for, since the action would otherwise be offered for
         * a plan that creates nothing. It reads as the teacher's own doing rather than as the sequence
         * having nothing to give them, which is what the existing "all skipped" wording would have said.
         */
        await page.getByTestId(`sequence-preview-toggle-excluded-${topics.autumnOne.id}`).click();
        await page.getByTestId(`sequence-preview-toggle-excluded-${topics.spending.id}`).click();
        await expect(page.getByTestId('assign-sequence-summary')).toHaveText('Nothing will be added. All 2 topics have been removed.');
        await expect(page.getByTestId('assign-sequence-nothing-to-add')).toBeVisible();
        await expect(page.getByTestId('assign-sequence-submit-button')).toBeDisabled();

        /*
         * ---- Scenario 47: only the topics that survived are created -----------------------------------
         *
         * The whole point, and the only assertion that proves a dropped topic is not merely hidden. The
         * admin's sequence keeps both topics: assignment is a materialization, so "remove this row" means
         * "do not create this one" and never an edit to the template.
         */
        await page.getByTestId(`sequence-preview-toggle-excluded-${topics.spending.id}`).click();
        await autoSchedule(page, '1 topic added to this class');
        await page.waitForURL(new RegExp(`/class/${fullProgrammeClass.id}/pupils`));

        const afterRemoval = await classTopicsByTopicId(db, fullProgrammeClass.id);

        // Two copies of the surviving topic, and this is the warning coming true rather than a fault:
        // the one put there by hand above, and the one the sequence has just added on its own dates.
        expect(afterRemoval[topics.spending.id]).toHaveLength(2);
        // The dropped one was never created at all, which is the whole point.
        expect(afterRemoval[topics.autumnOne.id]).toBeUndefined();

        // The template is untouched: both topics are still in the sequence an admin built.
        const mixedItems = await intervalSequenceItems(db, mixedSequenceName);

        expect(mixedItems.map((item) => item.topicId)).toEqual([topics.autumnOne.id, topics.spending.id]);

        /*
         * ---- Scenario 48: dropping a topic out of the middle re-dates the rest of an interval set ------
         *
         * The one case where removing a row changes what the *other* rows say. A fixed sequence's topics
         * carry their own dates and stay put, which is scenario 44's set; an interval sequence's dates
         * are generated from a start date and a position, so a topic dropped out of the middle has to
         * hand its slot to the one below it.
         *
         * Otherwise the class gets a topic, an empty fortnight, then the next topic, and the first
         * topic's window ends a fortnight before the next one opens, against what the form promises.
         *
         * Three topics none of which this class has: it was given Spending above, and Saving, Coins and
         * Budgeting have only ever been scheduled on the Reception class.
         */
        const pacedSequenceName = `${tag} Paced set`;

        await seedIntervalSequence(db, {
            name: pacedSequenceName,
            subjectId: moneySkillsSubjectId,
            yearGroupId: RECEPTION_YEAR_GROUP_ID,
            topicIds: [topics.saving.id, topics.coins.id, topics.budgeting.id]
        });

        await goToAutoSchedule(page, fullProgrammeClass.id);
        await chooseSequence(page, pacedSequenceName);

        // Nothing typed: the fortnightly pace comes off the seeded sequence (LEA-6624).
        // Anchored on the default start date, which is tomorrow, so the set runs 1, 15, 29.
        await expect(page.getByTestId('assign-sequence-start-date')).toHaveValue(uiDate(1));
        await expect(page.getByTestId(`sequence-preview-window-${topics.saving.id}`)).toHaveText(dateWindow(1, 14));
        await expect(page.getByTestId(`sequence-preview-window-${topics.coins.id}`)).toHaveText(dateWindow(15, 28));
        await expect(page.getByTestId(`sequence-preview-window-${topics.budgeting.id}`)).toHaveText(dateWindow(29, 42));

        // Drop the middle one. Budgeting moves up a fortnight into the slot Coins has given up, and
        // Saving, which is above the gap, does not move at all.
        await page.getByTestId(`sequence-preview-toggle-excluded-${topics.coins.id}`).click();
        await expect(page.getByTestId('assign-sequence-summary')).toHaveText('2 topics will be added, 1 removed.');
        await expect(page.getByTestId(`sequence-preview-window-${topics.budgeting.id}`)).toHaveText(dateWindow(15, 28));
        await expect(page.getByTestId(`sequence-preview-window-${topics.saving.id}`)).toHaveText(dateWindow(1, 14));

        /*
         * And the dropped row shows no window rather than the dates it used to hold. Those dates now
         * belong to Budgeting, asserted a line above, so showing them here as well would put the same
         * fortnight on screen twice.
         */
        await expect(page.getByTestId(`sequence-preview-row-${topics.coins.id}`)).toBeVisible();
        await expect(page.getByTestId(`sequence-preview-removed-tag-${topics.coins.id}`)).toHaveText('Removed');
        await expect(page.getByTestId(`sequence-preview-window-${topics.coins.id}`)).toHaveText('Not being scheduled');

        // Undo, and the set goes back to what it was: Coins is dated again and Budgeting moves back down
        // to make room for it.
        await page.getByTestId(`sequence-preview-toggle-excluded-${topics.coins.id}`).click();
        await expect(page.getByTestId('assign-sequence-summary')).toHaveText('3 topics will be added.');
        await expect(page.getByTestId(`sequence-preview-window-${topics.coins.id}`)).toHaveText(dateWindow(15, 28));
        await expect(page.getByTestId(`sequence-preview-window-${topics.budgeting.id}`)).toHaveText(dateWindow(29, 42));
        await expect(page.getByTestId(`sequence-preview-window-${topics.saving.id}`)).toHaveText(dateWindow(1, 14));

        /*
         * Dropped again and assigned, because the preview is only a promise until the topics exist. The
         * dates the class actually gets are the closed-up ones, not the ones the sequence would have
         * produced with every topic in it.
         */
        await page.getByTestId(`sequence-preview-toggle-excluded-${topics.coins.id}`).click();
        await autoSchedule(page, '2 topics added to this class');
        await page.waitForURL(new RegExp(`/class/${fullProgrammeClass.id}/pupils`));

        const afterPaced = await classTopicsByTopicId(db, fullProgrammeClass.id);

        expect(dbDateOf(afterPaced[topics.saving.id][0].releaseDate)).toBe(dbDate(1));
        expect(dbDateOf(afterPaced[topics.saving.id][0].dueDate)).toBe(dbDate(14));
        // The proof, in the only place that finally counts: Budgeting is a fortnight after Saving rather
        // than a month after it, so the class has no empty stretch where Coins would have been.
        expect(dbDateOf(afterPaced[topics.budgeting.id][0].releaseDate)).toBe(dbDate(15));
        expect(dbDateOf(afterPaced[topics.budgeting.id][0].dueDate)).toBe(dbDate(28));
        expect(afterPaced[topics.coins.id]).toBeUndefined();

        // The admin's sequence still has all three, in order. Assigning is a materialization, and a
        // teacher dropping a row for their class never edits the template.
        const pacedItems = await intervalSequenceItems(db, pacedSequenceName);

        expect(pacedItems.map((item) => item.topicId)).toEqual([topics.saving.id, topics.coins.id, topics.budgeting.id]);

        /*
         * ---- Scenario 49: a skipped topic gives up its slot exactly as a dropped one does ------------
         *
         * A skip and a drop differ in who decided, not in what the class gets, so neither can hold a
         * position an interval sequence dates by. The row stays on screen, greyed out, tagged and
         * explained, but the days it would have taken go to the topic below it.
         *
         * Asserted on a skip at the top of the sequence, which is the case that made this worth
         * changing: the first topic the class actually gets has to land on the start date the teacher
         * chose, rather than a fortnight past it.
         *
         * Saving is the skipped one, created on this class by scenario 48's own assignment a moment
         * ago, so the precondition is this run's doing rather than seed data.
         */
        const openingSkipSequenceName = `${tag} Opening skip set`;

        await seedIntervalSequence(db, {
            name: openingSkipSequenceName,
            subjectId: moneySkillsSubjectId,
            yearGroupId: RECEPTION_YEAR_GROUP_ID,
            topicIds: [topics.saving.id, topics.choices.id, topics.autumnTwo.id]
        });

        await goToAutoSchedule(page, fullProgrammeClass.id);
        await chooseSequence(page, openingSkipSequenceName);

        // Again nothing typed, so the plan is on screen as soon as the sequence is chosen.
        await expect(page.getByTestId('assign-sequence-summary')).toHaveText('2 topics will be added, 1 skipped.');
        await expect(page.getByTestId(`sequence-preview-skip-tag-${topics.saving.id}`)).toHaveText('Already scheduled');
        await expect(page.getByTestId(`sequence-preview-skip-reason-${topics.saving.id}`)).toContainText('already has this topic');

        // The skipped row shows no window, for the same reason a dropped one does not: nothing will
        // ever exist on those dates, and they now belong to the topic underneath it.
        await expect(page.getByTestId(`sequence-preview-window-${topics.saving.id}`)).toHaveText('Not being scheduled');

        // Which is the whole point. Choices opens the set on the default start date of tomorrow rather
        // than a fortnight after it, and Autumn two follows one interval later.
        await expect(page.getByTestId(`sequence-preview-window-${topics.choices.id}`)).toHaveText(dateWindow(1, 14));
        await expect(page.getByTestId(`sequence-preview-window-${topics.autumnTwo.id}`)).toHaveText(dateWindow(15, 28));

        await autoSchedule(page, '2 topics added to this class');
        await page.waitForURL(new RegExp(`/class/${fullProgrammeClass.id}/pupils`));

        const afterOpeningSkip = await classTopicsByTopicId(db, fullProgrammeClass.id);

        expect(dbDateOf(afterOpeningSkip[topics.choices.id][0].releaseDate)).toBe(dbDate(1));
        expect(dbDateOf(afterOpeningSkip[topics.autumnTwo.id][0].releaseDate)).toBe(dbDate(15));
        // Still exactly one copy of the skipped topic: the one scenario 48 created, untouched.
        expect(afterOpeningSkip[topics.saving.id]).toHaveLength(1);

        /*
         * ---- Scenario 50: an admin clears out last year's sequence, and the classes keep their work ----
         *
         * The reason LEA-6586 exists. Next September someone has to be able to delete the sets built for
         * the year just gone, and be sure that deleting them takes nothing from the classes that used
         * them. Until now they could not even see those rows on the list.
         *
         * Scenario 38 already proves the mechanism on a current-year sequence. What is new here is that a
         * finished year's sequence is reachable at all, and that a class given one **last year** still has
         * everything it was given after the row is gone.
         *
         * The assignment and its class topic are seeded rather than created through the UI, because a
         * past-dated fixed sequence cannot be assigned: nothing may be scheduled in the past. Last year's
         * assignment is data that already exists, so seeding it is the honest model as well as the only
         * one available.
         */
        if (previousPeriod && staleSequenceId) {
            const [staleUser] = await db.selectFrom('lwp_user').select('id').limit(1).execute();

            const staleAssignment = await db
                .insertInto('lwp_class_sequence_assignment')
                .values({
                    classId: receptionClass.id,
                    sequenceId: staleSequenceId,
                    sequenceName: staleSequenceName,
                    status: 'ASSIGNED',
                    logCreatedById: staleUser.id
                })
                .returning('id')
                .executeTakeFirstOrThrow();

            const staleClassTopic = await db
                .insertInto('lwp_class_topic')
                .values({
                    classId: receptionClass.id,
                    topicId: topics.autumnTwo.id,
                    releaseDate: dbDate(-400),
                    dueDate: dbDate(-394),
                    released: true,
                    classSequenceAssignmentId: staleAssignment.id
                })
                .returning('id')
                .executeTakeFirstOrThrow();

            await adminOrTeacherSignOut(page);
            await login(page, admin, password);
            await page.goto('/admin/sequences');
            await waitForLoading(page);
            await filterSequences(page, { search: tag });

            // Reachable, which is the change. Before this it was filtered off the list by its year and
            // the delete action could not be got at from here at all.
            await expect(page.getByTestId('sequences-table')).toContainText(staleSequenceName);

            await page.getByTestId(`sequence-actions-${staleSequenceId}`).click();
            await page.getByTestId(`sequence-action-delete-${staleSequenceId}`).click();
            await page.getByTestId('dialog-primary-btn').click();
            await expect(page.locator('.MuiAlert-message').filter({ hasText: 'Sequence deleted successfully!' })).toBeVisible();
            await expect(page.getByTestId('sequences-table')).not.toContainText(staleSequenceName);

            // Gone from the database, not merely from the list.
            const staleRows = await db.selectFrom('static_lwp_topic_sequence').where('name', '=', staleSequenceName).select('id').execute();

            expect(staleRows).toHaveLength(0);

            /*
             * And the class is untouched. The assignment survives with its sequenceId nulled and the name
             * it snapshotted, so the schedule still says where the topic came from, and the released
             * topic is still there on the dates the class actually had it.
             */
            const survivingAssignment = await db
                .selectFrom('lwp_class_sequence_assignment')
                .where('id', '=', staleAssignment.id)
                .select(['sequenceId', 'sequenceName', 'status'])
                .executeTakeFirstOrThrow();

            expect(survivingAssignment.sequenceId).toBeNull();
            expect(survivingAssignment.sequenceName).toBe(staleSequenceName);
            expect(survivingAssignment.status).toBe('ASSIGNED');

            const survivingTopics = await classTopicsByTopicId(db, receptionClass.id);
            const lastYearsTopic = survivingTopics[topics.autumnTwo.id].find(
                (classTopic) => classTopic.classSequenceAssignmentId === staleAssignment.id
            );

            expect(lastYearsTopic).toBeDefined();
            expect(dbDateOf(lastYearsTopic.releaseDate)).toBe(dbDate(-400));
            expect(lastYearsTopic.released).toBe(true);

            /*
             * And the same thing from where it actually matters: the leader's own schedule.
             *
             * The database assertions above prove the rows survived. This proves the class still *has*
             * the topic as far as anyone using the product is concerned, which is the reassurance the
             * admin doing the deleting is really after. The two are not the same claim: a surviving row
             * the page had stopped rendering would pass every assertion above.
             *
             * The Auto-scheduled label is asserted rather than mere presence, because it is the part
             * that could plausibly have broken. It is gated on `classSequenceAssignment.id`, so it
             * renders only if the assignment survived the deletion of the sequence it pointed at. A
             * cascade that had taken the assignment with it would leave the topic on the page looking
             * hand-scheduled, and nothing else here would notice.
             *
             * Addressed by the seeded class topic's own id rather than by the topic name: this class
             * was also given Autumn two by scenario 27, so the name alone matches two rows.
             */
            await adminOrTeacherSignOut(page);
            await login(page, leaderEmail, password);

            await page.goto(`/class/${receptionClass.id}/schedule`);
            await waitForLoading(page);
            await showAllScheduledTopics(page);

            await expect(page.getByTestId(`class-topic-auto-scheduled-${staleClassTopic.id}`)).toBeVisible();
        }
    });
});

/**
 * Namespaces everything this spec creates, and is what the cleanup matches on.
 *
 * Deliberately distinctive rather than something like `Seq`, which would also match a sequence a person
 * had named "Sequence for Year 1" and delete their work.
 */
const SPEC_PREFIX = 'E2E-Seq-';

/**
 * Removes the sequences this spec has ever created.
 *
 * Needed because sequences are global static data rather than school-scoped: they are offered to every
 * entitled class in every school whose year group matches, so each run's leftovers would pile up in every
 * leader's dropdown and in the admin list indefinitely. Cleaning also keeps each run's assertions honest,
 * since what a dropdown offers is otherwise a function of how many times the suite has been run.
 *
 * Scoped to this spec's own prefix rather than emptying the table, so a sequence built by hand survives.
 * Deleting a sequence cascades its items and nulls the link on any assignment, and never touches a class
 * topic or any pupil data, which is the same behaviour scenario 38 asserts through the UI.
 *
 * The seeded schools, classes and topics are left behind, as every other spec in this suite leaves its
 * fixture. They are school-scoped or only reachable by searching the topic picker, so they do not leak
 * into anyone else's view the way a sequence does.
 */
const removeSpecSequences = async (db: Kysely<Schema.DB>): Promise<void> => {
    await db.deleteFrom('static_lwp_topic_sequence').where('name', 'like', `${SPEC_PREFIX}%`).execute();
};

/** Year group ids are stable seed data: '0' is Reception and '1' is Year 1. */
const RECEPTION_YEAR_GROUP = 'Reception';
const YEAR_ONE_YEAR_GROUP = 'Year 1';
const YEAR_TWO_YEAR_GROUP = 'Year 2';
const RECEPTION_YEAR_GROUP_ID = '0';
const YEAR_ONE_YEAR_GROUP_ID = '1';

/**
 * How long to keep watching for preview requests after a value has been typed. Comfortably longer than
 * the page's own settle delay, so a preview that never stops re-running has time to show itself.
 */
const PREVIEW_SETTLE_CHECK_MS = 2_500;

/**
 * The cadence the admin gives the interval sequence in scenario 6, and so the one the assign page is
 * seeded with from scenario 18 onwards.
 *
 * Seven, because that is what Ready Teddy runs at and the whole reason the cadence lives on the
 * sequence rather than on the class (LEA-6624).
 */
const INTERVAL_SEQUENCE_DAYS = 7;

/**
 * A start date and an interval are each typed as one `fill`, so a correctly behaving page asks for at
 * most a couple of previews. The bug this guards against produced an unbounded stream.
 */
const MAX_PREVIEWS_PER_EDIT = 4;

interface SeededTopic {
    id: string;
    name: string;
}

interface SeededClass {
    id: string;
    name: string;
}

/** dd/MM/yyyy, which is what every date field in the app reads and writes. */
const uiDate = (daysFromToday: number): string => DateTime.now().plus({ days: daysFromToday }).toFormat('dd/MM/yyyy');

/** yyyy-MM-dd, matching the DATE columns the assertions read back. */
const dbDate = (daysFromToday: number): string => DateTime.now().plus({ days: daysFromToday }).toFormat('yyyy-MM-dd');

/** Reproduces `showDate({ short: true })`, the moment format `ddd DD MMM` the app renders dates in. */
const shortDate = (daysFromToday: number): string => DateTime.now().plus({ days: daysFromToday }).toFormat('ccc dd LLL');

/** A closed window as both tables render it. Not named `window`, which would shadow the global. */
const dateWindow = (startDaysFromToday: number, endDaysFromToday: number): string =>
    `${shortDate(startDaysFromToday)} to ${shortDate(endDaysFromToday)}`;

/** DATE columns come back as a Date or a string depending on the driver, so compare on yyyy-MM-dd. */
const dbDateOf = (value: Date | string | null | undefined): string | null => {
    if (!value) return null;

    return DateTime.fromJSDate(new Date(value)).toFormat('yyyy-MM-dd');
};

/** Picks an option from one of the house MUI selects, which carry their dataTest on the select itself. */
const selectOption = async (page: Page, selectDataTest: string, optionName: string) => {
    await page.getByTestId(selectDataTest).click();
    await page.getByRole('option', { name: optionName }).click();
};

/**
 * Activates an imported class as a reading-log registration class, which is what entitles it to Money
 * Skills, and leaves it wherever activation sends it.
 *
 * The reading start day has to be chosen explicitly. Its select is the only control that sets a launch
 * date to match, and the form refuses to submit while the launch date falls on a different weekday to
 * the start day, which an imported class does not carry one of.
 *
 * `isFullProgramme` adds the topics and activities licence on top, which entitles the class to every
 * subject rather than to Money Skills alone. Only one class in this spec needs it, and only so that
 * withholding a non-Money-Skills sequence can be told apart from never having offered one: see
 * scenario 30. The checkbox is only rendered while the school has a full programme licence spare, which
 * the fixture allows ten of.
 */
const activateClass = async (
    page: Page,
    {
        classId,
        yearGroup,
        mainTeacherName,
        isFullProgramme = false
    }: { classId: string; yearGroup: string; mainTeacherName: string; isFullProgramme?: boolean }
) => {
    await page.goto(`/class/${classId}/activate`);
    await waitForLoading(page);

    await selectOption(page, 'yearGroup', yearGroup);
    await selectOption(page, 'activate-main-teacher-select', mainTeacherName);
    await getInputBoxByName(page, 'isReadingLogsEnabled').check();
    if (isFullProgramme) await getInputBoxByName(page, 'isFullProgramme').check();
    await selectOption(page, 'reading-start-day-select', 'Monday to Sunday');

    await page.getByRole('button', { name: 'Activate class' }).click();
    await expect(page.locator('.MuiAlert-message').filter({ hasText: 'Class activated successfully!' })).toBeVisible();
};

/**
 * Applies the admin list filters. They edit a draft and only take effect on Apply, which is how the
 * rest of the admin filters behave, and they live in the URL so they survive the trip to the form.
 *
 * Two things this has to be careful about. The panel opens itself whenever the URL carries filters, so
 * the toggle is only pressed when the panel is actually closed, or a second call would collapse it. And
 * every call resets first, so it is independent of whatever the previous call left in the URL rather
 * than silently inheriting a year group.
 */
const filterSequences = async (page: Page, { search, yearGroup }: { search?: string; yearGroup?: string }) => {
    if (!(await page.getByTestId('sequences-filter-search').isVisible())) {
        await page.getByTestId('sequences-filter-button').click();
    }

    await page.getByTestId('sequences-filter-reset').click();
    await waitForLoading(page);

    if (yearGroup) await selectOption(page, 'sequences-filter-year-group', yearGroup);
    if (search !== undefined) await page.getByTestId('sequences-filter-search').fill(search);
    await page.getByTestId('sequences-filter-apply').click();
    await waitForLoading(page);
};

/**
 * Adds one topic to the sequence being built.
 *
 * Always by search, never by browsing: the picker caps browsing at the five most recently added topics,
 * so a topic can be perfectly valid and still not be on screen.
 */
const addTopic = async (page: Page, topic: SeededTopic) => {
    await page.getByTestId('topic-picker-search').fill(topic.name);
    await page.getByTestId(`topic-picker-add-${topic.id}`).click();
    await expect(page.getByTestId(`sequence-item-row-${topic.id}`)).toBeVisible();
};

/**
 * Types a fixed item's dates and commits them.
 *
 * The list re-sorts by start date on blur rather than on keystroke, so rows do not jump around while a
 * date is still being typed. Blurring explicitly is therefore part of setting a date, not an extra.
 */
const setItemDates = async (page: Page, topic: SeededTopic, { start, end }: { start: string; end?: string }) => {
    await page.getByTestId(`sequence-item-start-${topic.id}`).fill(start);
    await page.getByTestId(`sequence-item-start-${topic.id}`).blur();
    if (end) {
        await page.getByTestId(`sequence-item-end-${topic.id}`).fill(end);
        await page.getByTestId(`sequence-item-end-${topic.id}`).blur();
    }
};

const saveSequence = async (page: Page, expectedMessage: string) => {
    await page.getByTestId('save-sequence-button').click();
    await expect(page.locator('.MuiAlert-message').filter({ hasText: expectedMessage })).toBeVisible();
    await page.waitForURL(/\/admin\/sequences$/);
    await waitForLoading(page);
};

/** Opens a class's auto-schedule page directly, which is where all three entry points lead. */
const goToAutoSchedule = async (page: Page, classId: string) => {
    await page.goto(`/class/${classId}/auto-schedule`);
    await waitForLoading(page);
    await expect(page.getByTestId('class-auto-schedule-page')).toBeVisible();
};

/** Chooses a sequence on the auto-schedule page. */
const chooseSequence = async (page: Page, sequenceName: string) => {
    await page.getByTestId('assign-sequence-select').click();
    await page.getByRole('option', { name: sequenceName }).click();
};

/**
 * Confirms the plan on screen. Every route out of this page goes to the class's pupils, so the caller
 * asserts where it landed rather than that anything closed.
 */
const autoSchedule = async (page: Page, expectedMessage: string) => {
    await page.getByTestId('assign-sequence-submit-button').click();
    await expect(page.locator('.MuiAlert-message').filter({ hasText: expectedMessage })).toBeVisible();
};

/** The schedule list shows six topics at a time, and this fixture ends up with more than that. */
const showAllScheduledTopics = async (page: Page) => {
    const showMore = page.getByRole('button', { name: 'Show more' });

    while ((await showMore.count()) > 0) {
        await showMore.click();
        await waitForLoading(page);
    }
};

/** Opens a scheduled topic's edit modal from its row on the class schedule. */
const openTopicEdit = async (page: Page, topicName: string) => {
    await page.locator('tr', { hasText: topicName }).getByTestId('schedule-topic-actions-btn').click();
    await page.getByTestId('schedule-topic-action-edit').click();
    await waitForLoading(page);
};

const sequenceIdByName = async (db: Kysely<Schema.DB>, name: string): Promise<string> =>
    (await db.selectFrom('static_lwp_topic_sequence').where('name', '=', name).select('id').executeTakeFirstOrThrow()).id.toString();

/**
 * A sequence's stored items in their saved order, with the dates as the database holds them.
 *
 * The order is what an interval sequence stores and the dates are what it no longer stores, so both
 * are read from the database rather than from the form that wrote them.
 */
const intervalSequenceItems = async (
    db: Kysely<Schema.DB>,
    name: string
): Promise<{ topicId: string; startDate: Date | null; endDate: Date | null }[]> => {
    const rows = await db
        .selectFrom('static_lwp_topic_sequence_item')
        .innerJoin('static_lwp_topic_sequence', 'static_lwp_topic_sequence.id', 'static_lwp_topic_sequence_item.sequenceId')
        .where('static_lwp_topic_sequence.name', '=', name)
        .orderBy('static_lwp_topic_sequence_item.order', 'asc')
        .select([
            'static_lwp_topic_sequence_item.topicId',
            'static_lwp_topic_sequence_item.startDate',
            'static_lwp_topic_sequence_item.endDate'
        ])
        .execute();

    return rows.map((row) => ({ topicId: row.topicId.toString(), startDate: row.startDate, endDate: row.endDate }));
};

/** The cadence an admin saved on a sequence, which is the only timing an interval one carries. */
const sequenceIntervalDays = async (db: Kysely<Schema.DB>, name: string): Promise<number | null> => {
    const row = await db.selectFrom('static_lwp_topic_sequence').where('name', '=', name).select('intervalDays').executeTakeFirstOrThrow();

    return row.intervalDays;
};

const assignmentForSequence = async (db: Kysely<Schema.DB>, classId: string, sequenceId: string) =>
    db
        .selectFrom('lwp_class_sequence_assignment')
        .where('classId', '=', classId)
        .where('sequenceId', '=', sequenceId)
        .select(['id', 'intervalDays', 'startDate', 'status'])
        .executeTakeFirstOrThrow();

/**
 * Every class topic the class has, grouped by topic id, so an assertion can say "this class has that
 * topic twice" as directly as the product does.
 */
const classTopicsByTopicId = async (db: Kysely<Schema.DB>, classId: string) => {
    const rows = await db
        .selectFrom('lwp_class_topic')
        .where('classId', '=', classId)
        .select(['id', 'topicId', 'releaseDate', 'dueDate', 'released', 'classSequenceAssignmentId'])
        .orderBy('releaseDate', 'asc')
        .execute();

    return rows.reduce<Record<string, typeof rows>>((grouped, row) => {
        const key = row.topicId.toString();

        return { ...grouped, [key]: [...(grouped[key] || []), row] };
    }, {});
};

/**
 * Seeds everything except the sequences and the two activated classes, which the test builds through the
 * UI because both are part of what is under test.
 *
 * The school comes from createSchoolAndDummyWondeData, and its imported classes are what the test
 * activates: two up front, and a third before the school overview scenario so that one class has been
 * activated and then left alone entirely. Money Skills entitlement is compound: the school flag plus, for
 * a registration class, reading logs being enabled, which is what the activation form sets.
 *
 * The class that fixture activates for itself is never used here. Which one it picks depends on which
 * pupil it happens to find first, so it can be the next academic year's class, and that one is not
 * rendered on the school overview at all.
 *
 * Eleven topics are created, all sharing a unique tag so the picker's search can address them as a set:
 *  - coins, saving, spending: the interval sequence
 *  - saving, budgeting, choices: the fixed sequence, which shares `saving` on purpose so the leader's
 *    preview has a topic a previous auto-schedule created and therefore skips
 *  - choices: left open-ended in the fixed sequence, so a class topic is created with no due date
 *  - budgeting: also scheduled by hand mid-test, so the same preview has a topic to warn about rather
 *    than skip
 *  - autumnOne, autumnTwo: the past-dated fixed sequence, kept out of every other sequence so they are
 *    still unscheduled when the recovery path runs
 *  - unpublished, needsPhoto and reading: must never be offered by the picker
 *  - english: a full-programme subject, for the sequence the reading-only class may not be given
 *  - yearOne: for the sequence withheld on year group
 */
const seedTopicSequencingData = async (db: Kysely<Schema.DB>, utils: ReturnType<typeof createUtils>) => {
    const tag = `${SPEC_PREFIX}${Date.now().toString(36)}`;
    const leaderFirstName = generateFirstName();
    const leaderLastName = generateLastName();
    // Kept and returned, because createSchoolAndDummyWondeData's result carries only the leader's id and
    // name. Its `parent` does include an email, which makes the asymmetry easy to trip over.
    const leaderEmail = generateUserEmail(leaderFirstName, leaderLastName);

    const user = await db.selectFrom('lwp_user').where('id', '=', '1').select(['id']).executeTakeFirstOrThrow();
    const currentPeriod = await db
        .selectFrom('static_lwp_period')
        .where('isCurrentPeriod', '=', true)
        .select(['index', 'shortName', 'startDate', 'endDate'])
        .executeTakeFirstOrThrow();

    const {
        school,
        leader,
        parent,
        pupil,
        class: fixtureClass
    } = await createSchoolAndDummyWondeData(
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
                addTooltip: true,
                // This spec is not about the welcome, and it returns to the school overview mid-run.
                skipMoneySkillsWelcome: true
            }
        },
        { active: true, classLicences: { IsReadingLogsEnabled: true, isFullProgramme: false, isReadyTeddyEnabled: false } }
    );

    if (!fixtureClass?.id || !pupil?.id || !parent?.email) {
        throw new Error('Expected an active Reception class with a parent and pupil to be seeded');
    }

    /**
     * Three of the five classes the test activates through the UI: one Year 2 with nothing available to
     * it, one Reception that carries the run, and one Reception left untouched afterwards. The other two
     * are seeded below, because the fixture leaves only these three imported in the current year.
     *
     * Restricted to the current academic year, because createSchoolAndDummyWondeData also creates a
     * next-year one, and because everything this spec does is current-year by rule. The class the fixture
     * activated for itself is excluded for free, since it is no longer IMPORTED, and it is deliberately
     * never used here: which class that is depends on which pupil the fixture happened to find first, so
     * it can be the next-year one, which the school overview does not render at all.
     */
    const importedClasses = await db
        .selectFrom('lwp_school_class')
        .where('schoolId', '=', school.id)
        .where('status', '=', 'IMPORTED')
        .where('periodIndex', '=', currentPeriod.index)
        .select(['id', 'name'])
        .orderBy('id', 'asc')
        .limit(3)
        .execute();

    if (importedClasses.length < 3) throw new Error('Expected at least three imported classes to activate');

    const classesToActivate: SeededClass[] = importedClasses.map((row) => ({ id: row.id.toString(), name: row.name ?? '' }));

    /**
     * Identical to the class the test auto-schedules onto in every way that matters except its academic
     * year, so scenario 32 can only be explained by the year. Seeded rather than activated through the
     * UI, because activating a next-year class needs a Ready Teddy licence this school does not have.
     */
    const nextYearClass = await utils.createClass(school.id, {
        name: `${tag} Next year class`,
        status: 'ACTIVE',
        isRegistrationClass: true,
        IsReadingLogsEnabled: true,
        yearGroup: RECEPTION_YEAR_GROUP_ID,
        periodIndex: currentPeriod.index + 1,
        mainTeacherId: leader.id,
        readingStartDay: new Date().getDay(),
        readingTarget: 5,
        readingLaunchDate: formatDate(new Date(), '-'),
        logCreatedById: user.id,
        logUpdatedById: user.id
    });

    /**
     * A fourth current year class for scenario 33, which activates it with the school's Money Skills
     * licence switched off. Seeded rather than taken from `classesToActivate`, because the fixture only
     * leaves three imported classes in the current year and all three are already spoken for.
     */
    const readingOnlyClass = await utils.createClass(school.id, {
        name: `${tag} Reading only class`,
        status: 'IMPORTED',
        isRegistrationClass: true,
        yearGroup: RECEPTION_YEAR_GROUP_ID,
        periodIndex: currentPeriod.index,
        mainTeacherId: leader.id,
        logCreatedById: user.id,
        logUpdatedById: user.id
    });

    /**
     * A fifth current year class, activated as full programme in scenario 29 so that scenario 30 has a
     * class entitled to more than Money Skills. Every other class here has reading logs alone, which is
     * withheld English by entitlement, so the Money-Skills-only filter would look like it worked on any of
     * them even if it did not.
     *
     * Seeded IMPORTED rather than active, because it is activated through the UI: where activation sends
     * it is part of what scenario 29 asserts. The licences themselves are chosen on the activate form
     * rather than here, which is why this row carries none.
     */
    const fullProgrammeClass = await utils.createClass(school.id, {
        name: `${tag} Full programme class`,
        status: 'IMPORTED',
        isRegistrationClass: true,
        yearGroup: RECEPTION_YEAR_GROUP_ID,
        periodIndex: currentPeriod.index,
        mainTeacherId: leader.id,
        logCreatedById: user.id,
        logUpdatedById: user.id
    });

    const createTopic = async (
        label: string,
        {
            domainId = moneySkillsDomainId,
            yearGroupId = RECEPTION_YEAR_GROUP_ID,
            isPublished = true,
            needsTeacherPhoto = false,
            isReading = false
        } = {}
    ): Promise<SeededTopic> => {
        const name = `${tag} ${label}`;

        const topic = await utils.createStaticTopic({
            isReading,
            teacherTopicName: name,
            parentTopicName: name,
            isPublished,
            video: '605069004',
            logCreatedById: user.id,
            logUpdatedById: user.id
        });

        // A topic is only schedulable for the year groups it is linked to through its domain, and the
        // domain is what ties it to a subject.
        await db
            .insertInto('static_lwp_topic_domain_year_group')
            .values({ domainId, topicId: topic.id, yearGroupId })
            .executeTakeFirstOrThrow();

        const activity = await utils.createStaticActivity({
            name: `${name} activity`,
            welcomeMessage: 'Welcome to this activity',
            activityType: 'LEGACY',
            order: 1,
            topicId: topic.id,
            logCreatedById: user.id,
            logUpdatedById: user.id
        });

        // A SET_BY_TEACHER step on a visible activity is what makes a topic need a photo from the teacher.
        // The rule counts steps on non-hidden activities only, which is why the activity above is not hidden.
        if (needsTeacherPhoto) {
            await utils.createActivityStep({ activityId: activity.id, stepType: 'SET_BY_TEACHER', order: 1 });
        }

        return { id: topic.id.toString(), name };
    };

    const topics = {
        coins: await createTopic('Coins'),
        saving: await createTopic('Saving'),
        spending: await createTopic('Spending'),
        budgeting: await createTopic('Budgeting'),
        choices: await createTopic('Choices'),
        autumnOne: await createTopic('Autumn one'),
        autumnTwo: await createTopic('Autumn two'),
        unpublished: await createTopic('Draft', { isPublished: false }),
        needsPhoto: await createTopic('Photo', { needsTeacherPhoto: true }),
        // In the Money Skills domain for Reception on purpose: it would be offered but for the reading rule.
        reading: await createTopic('Reading log', { isReading: true }),
        english: await createTopic('English one', { domainId: englishDomainId }),
        yearOne: await createTopic('Year one', { yearGroupId: YEAR_ONE_YEAR_GROUP_ID })
    };

    return {
        tag,
        school,
        leader,
        leaderEmail,
        leaderName: `${leaderFirstName} ${leaderLastName}`,
        parent,
        pupil,
        fixtureClass,
        classesToActivate,
        nextYearClass: { id: nextYearClass.id.toString(), name: nextYearClass.name ?? '' },
        readingOnlyClass: { id: readingOnlyClass.id.toString(), name: readingOnlyClass.name ?? '' },
        fullProgrammeClass: { id: fullProgrammeClass.id.toString(), name: fullProgrammeClass.name ?? '' },
        currentPeriod,
        topics
    };
};

/**
 * Inserts a sequence straight into the database, bypassing the admin form.
 *
 * Used for the one sequence the form cannot build: a stale one, whose dates are inside the current
 * academic year but already past. The form refuses that combination, because it will not offer a
 * finished academic year and every topic date must fall inside the year chosen. A stale sequence is
 * by definition data that already exists, built earlier in the year, so seeding it is the honest
 * model as well as the only deterministic one. Scenario 27 needs it to reach the recovery path at
 * all, and cannot rely on today being far enough into the year for the form to allow it.
 */
/**
 * The same, for an interval sequence: its topics and their order and nothing else.
 *
 * An interval sequence carries no academic year and no dates of any kind (LEA-6594, LEA-6595), so
 * there is nothing to seed but the ordering. Seeded rather than built through the admin form only
 * because the form is several screens away from where scenario 48 stands.
 */
/**
 * An interval sequence, inserted directly rather than built through the form.
 *
 * The cadence is **14**, deliberately different from `INTERVAL_SEQUENCE_DAYS`, so the scenarios that
 * use these fixtures prove the pace is read off whichever sequence was chosen rather than being a
 * constant the page happens to agree with.
 *
 * It has to be set at all now: the admin form refuses to save an interval sequence without one, and
 * since LEA-6624 a teacher cannot supply one at assignment time either, so a null here would make
 * the sequence unassignable and the scenarios below would fail on a missing interval.
 */
const SEEDED_INTERVAL_DAYS = 14;

const seedIntervalSequence = async (
    db: Kysely<Schema.DB>,
    { name, subjectId, yearGroupId, topicIds }: { name: string; subjectId: string; yearGroupId: string; topicIds: string[] }
): Promise<string> => {
    const sequence = await db
        .insertInto('static_lwp_topic_sequence')
        .values({ name, subjectId, yearGroupId, timingMode: 'INTERVAL', intervalDays: SEEDED_INTERVAL_DAYS })
        .returning('id')
        .executeTakeFirstOrThrow();

    const sequenceId = sequence.id.toString();

    await db
        .insertInto('static_lwp_topic_sequence_item')
        .values(topicIds.map((topicId, index) => ({ sequenceId, order: index + 1, topicId })))
        .execute();

    return sequenceId;
};

const seedFixedSequence = async (
    db: Kysely<Schema.DB>,
    {
        name,
        subjectId,
        yearGroupId,
        periodIndex,
        items
    }: {
        name: string;
        subjectId: string;
        yearGroupId: string;
        periodIndex: number;
        items: { topicId: string; startDate: string; endDate: string }[];
    }
): Promise<string> => {
    const sequence = await db
        .insertInto('static_lwp_topic_sequence')
        .values({ name, subjectId, yearGroupId, periodIndex, timingMode: 'FIXED' })
        .returning('id')
        .executeTakeFirstOrThrow();

    const sequenceId = sequence.id.toString();

    await db
        .insertInto('static_lwp_topic_sequence_item')
        .values(
            items.map((item, index) => ({
                sequenceId,
                order: index + 1,
                topicId: item.topicId,
                startDate: item.startDate,
                endDate: item.endDate
            }))
        )
        .execute();

    return sequenceId;
};
