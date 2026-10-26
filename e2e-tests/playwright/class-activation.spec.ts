import { expect, test, type Page } from '@playwright/test';
import type { Schema } from '@lwp/postgres-client';
import { type Kysely } from 'kysely';
import { UserStatus } from 'lwp-shared';

import { generateFirstName, generateLastName, generateSchoolName, generateUserEmail, password } from './constants';
import { createDb } from './db';
import { createUtils } from './dbUtils';
import { acceptFeatureTooltipPrompt, createSchoolAndDummyWondeData, getInputBoxByName, login, waitForLoading } from './utils';

/**
 * Class activation, converted from the five Cypress specs in cypress/e2e/ClassActivation, which this
 * replaces:
 *
 *  - activate_class_from_class_register_page.cy.js
 *  - activate_class_until_limit_exceed.cy.js
 *  - can_schedule_classtopic_in_fullprogramme_class_only.cy.js
 *  - ready_teddy_class_activation.cy.js
 *  - update_class_to_fullprogramme_class_until_limit_exceed.cy.js
 *
 * All five shared one helper, `activateClass` in cypress/shared/pages/addClass.js, which ended by
 * asserting the school overview had rendered the activated class. LEA-6529 sends a current academic
 * year class to its auto-schedule page instead, so that assertion timed out in all five. Where a class
 * lands is asserted directly here, in scenarios 1, 3, 6 and 11, so the change that broke them is now
 * the thing under test rather than an incidental step. All three outcomes are covered: a class that
 * qualifies goes to auto-schedule, one that never could goes to the school overview, and so does a
 * class in the next academic year.
 *
 * Everything is driven and asserted through the UI. The database is used only to build the fixture and
 * to look up the ids and names of the imported classes the test then clicks on: no assertion reads it.
 * That is deliberate, because what these five specs are for is the behaviour a school leader sees.
 *
 * One test against one school, because the licence scenarios genuinely depend on each other. The school
 * gets two full programme licences and five in total, and the run spends them in order: scenario 1
 * activates a full programme class, scenario 4 upgrades a second class to full programme, and from
 * scenario 5 onwards every "no licences left" state is simply what the earlier scenarios left behind.
 * See `getAllowedClassesInfo` in school_class.service.ts for how the remaining counts are worked out;
 * the short version is that it counts active registration classes from the current year onwards, and a
 * Ready Teddy only class consumes neither kind of licence.
 *
 * Three ordering constraints are load bearing:
 *
 * 1. Scenario 8 asserts that a reading only class has no Add a topic section. That section appears as
 *    soon as a class has full programme or Ready Teddy, per `addTopicIsVisible` in
 *    class/[class_id]/schedule.tsx, so it has to run before scenario 10 switches Ready Teddy on for that
 *    same class.
 * 2. The school is seeded with `isMoneySkillsAvailable: false` for the same reason: Money Skills on its
 *    own reveals that section for every registration class.
 * 3. Scenario 5 needs both full programme licences already spent, so it comes after scenario 4.
 *
 * Two things worth knowing when reading the activation helper:
 *  - A reading start day has to be chosen whenever reading logs are switched on. Its select is the only
 *    control that moves the launch date onto a matching weekday, and `activateClassValidation` refuses
 *    to submit while the two disagree. With reading logs off the defaults already agree, since
 *    `readingStartDay` defaults to 1 and the launch date the form computes is the next Monday.
 *  - The year group of a pre-admission class cannot be chosen: the select is disabled and the page fills
 *    in Reception. Scenario 11 asserts that rather than working around it.
 */
test.describe('Class activation', () => {
    let db: Kysely<Schema.DB>;
    let utils: ReturnType<typeof createUtils>;

    test.beforeAll(async () => {
        db = createDb();
        utils = createUtils(db);
    });

    test.afterAll(async () => {
        await db.destroy();
    });

    test('A leader activates classes, spends the programme licences, and turns Ready Teddy on afterwards', async ({ page }) => {
        const { school, leaderEmail, leaderName, fullProgrammeClass, upgradedClass, readingOnlyClass, preAdmissionClass } =
            await seedClassActivationData(db, utils);

        await login(page, leaderEmail, password);
        await page.waitForURL(/\/school/);
        await waitForLoading(page);
        await acceptFeatureTooltipPrompt(page);

        // ---- Scenario 1: the way in from the class register page ------------------------------------
        // The journey the first Cypress spec was named after: an inactive class on the school overview,
        // the register page it opens, and the link on that page offering to activate. Year 1 rather than
        // Reception, so that the Ready Teddy assertion below is about the year group and nothing else.
        await openActivatePageFromOverview(page, {
            schoolId: school.id,
            section: REGISTRATION_CLASSES,
            classNameDataTest: 'inactive-registration-class-name',
            schoolClass: fullProgrammeClass
        });

        await fillActivationForm(page, {
            yearGroup: YEAR_ONE,
            mainTeacherName: leaderName,
            readingLogs: false,
            fullProgramme: true
        });

        /*
         * Ready Teddy is offered for Reception only. Asserted with full programme already ticked and the
         * school holding a Ready Teddy licence, so the year group is the only reason it is not on screen.
         * Nothing else in either suite covers that rule.
         *
         * The year group is asserted first, because an empty one would hide the checkbox too and this
         * would then be passing for a reason it is not testing.
         */
        await expect(page.getByTestId('yearGroup')).toContainText(YEAR_ONE);
        await expect(getInputBoxByName(page, 'isReadyTeddy')).toHaveCount(0);

        await submitActivation(page);

        /*
         * Back to the school overview, because this school has no Money Skills licence.
         *
         * This assertion has moved twice and the history is worth keeping, because the obvious fix is
         * the wrong one. LEA-6529 first sent an activated class straight into auto-scheduling, which is
         * what broke all five of the Cypress specs this suite replaced. LEA-6560 then gated that on a
         * sequence actually existing for the class, and LEA-6565 moved the destination again, to
         * `/class/{id}/money-skills-auto-schedule`.
         *
         * `canAutoScheduleMoneySkills` requires the school to hold the licence, so with
         * `isMoneySkillsAvailable: false` seeded at line 47 this class can never be offered the
         * Money Skills page, whatever sequences happen to exist. That makes the school overview the
         * deterministic answer here, which is what this scenario needs: sequences are global static
         * data that no spec owns, so an assertion resting on one existing would pass or fail on
         * whatever else had run.
         *
         * Do not "fix" this by seeding a Money Skills sequence. The fixture turns the licence off
         * deliberately, for the reasons its own header gives.
         */
        await page.waitForURL(new RegExp(`/school/${school.id}`));
        await waitForLoading(page);

        // ---- Scenario 2: the class is now an active class on the school overview --------------------
        // What the shared Cypress helper checked at the end of every one of the five specs.
        await page.goto(`/school/${school.id}`);
        await waitForLoading(page);
        await acceptFeatureTooltipPrompt(page);

        await expect(activeClassRow(page, fullProgrammeClass.name)).toBeVisible();
        await expect(inactiveClassRow(page, fullProgrammeClass.name)).toHaveCount(0);

        // ---- Scenario 3: a reading only class goes back to the school overview instead ---------------
        // Reception from here on, because the Ready Teddy scenarios at the end need it.
        //
        // Reading logs and nothing else, in a school without Money Skills, is the one shape that can
        // never be given a sequence: reading topics are generated by the platform, so this class is
        // entitled to no programme a sequence could be built from. Activation sends it back to the
        // overview rather than to a page that could only refuse it. Scenario 1 is the same journey for
        // a class that does qualify.
        await openActivatePageFromOverview(page, {
            schoolId: school.id,
            section: REGISTRATION_CLASSES,
            classNameDataTest: 'inactive-registration-class-name',
            schoolClass: upgradedClass
        });

        await activateClass(page, {
            yearGroup: RECEPTION,
            mainTeacherName: leaderName,
            readingLogs: true,
            fullProgramme: false
        });

        await page.waitForURL(new RegExp(`/school/${school.id}`));
        await waitForLoading(page);

        // ---- Scenario 4: that class is upgraded to full programme in its settings -------------------
        // This spends the second and last full programme licence, which is what every scenario from 5
        // onwards depends on.
        await openClassSettings(page, upgradedClass.id);

        await expect(getInputBoxByName(page, 'isFullProgramme')).not.toBeChecked();
        await saveProgrammeOptions(page, async () => {
            await getInputBoxByName(page, 'isFullProgramme').check();
        });

        // Reloaded rather than trusting the form it was just typed into, so this is the saved state.
        await page.reload();
        await waitForLoading(page);
        await expect(getInputBoxByName(page, 'isFullProgramme')).toBeChecked();

        // ---- Scenario 5: with both licences spent, the activate page says so ------------------------
        await openActivatePageFromOverview(page, {
            schoolId: school.id,
            section: REGISTRATION_CLASSES,
            classNameDataTest: 'inactive-registration-class-name',
            schoolClass: readingOnlyClass
        });

        await expect(page.getByTestId('programme-info-alert-text')).toContainText(
            'You cannot enable the full programme in any more classes.'
        );
        await expect(getInputBoxByName(page, 'isFullProgramme')).toHaveCount(0);

        // ---- Scenario 6: it can still be activated for reading --------------------------------------
        // And lands on the school overview for the same reason as scenario 3.
        await activateClass(page, {
            yearGroup: RECEPTION,
            mainTeacherName: leaderName,
            readingLogs: true,
            fullProgramme: false
        });

        await page.waitForURL(new RegExp(`/school/${school.id}`));
        await waitForLoading(page);

        // ---- Scenario 7: and its settings do not offer full programme either ------------------------
        await openClassSettings(page, readingOnlyClass.id);

        await expect(getInputBoxByName(page, 'isFullProgramme')).toHaveCount(0);

        // ---- Scenario 8: topics can be added to a full programme class only -------------------------
        // Must run before scenario 10, which gives the reading only class a Ready Teddy licence and so
        // would reveal the section this asserts the absence of.
        await openScheduleTab(page, fullProgrammeClass.id);
        await expect(page.getByTestId('class-schedule-topic-search-button')).toBeVisible();

        await openScheduleTab(page, readingOnlyClass.id);
        await expect(page.getByTestId('class-schedule-topic-search-button')).toHaveCount(0);

        // ---- Scenario 9: Ready Teddy is switched on for the full programme class --------------------
        await openClassSettings(page, upgradedClass.id);

        await expect(getInputBoxByName(page, 'isReadyTeddy')).not.toBeChecked();
        await saveProgrammeOptions(page, async () => {
            await getInputBoxByName(page, 'isReadyTeddy').check();
        });

        await page.reload();
        await waitForLoading(page);
        await expect(getInputBoxByName(page, 'isReadyTeddy')).toBeChecked();

        // ---- Scenario 10: and for the reading only class --------------------------------------------
        // The reading only route is the one the existing Ready Teddy spec does not cover.
        await openClassSettings(page, readingOnlyClass.id);

        await expect(getInputBoxByName(page, 'isReadyTeddy')).not.toBeChecked();
        await saveProgrammeOptions(page, async () => {
            await getInputBoxByName(page, 'isReadyTeddy').check();
        });

        await page.reload();
        await waitForLoading(page);
        await expect(getInputBoxByName(page, 'isReadyTeddy')).toBeChecked();

        // ---- Scenario 11: a next academic year class activates as a Ready Teddy class ---------------
        // The other side of the LEA-6529 branch. Auto-scheduling is for the year the school is teaching
        // now, so a class waiting for next September goes back to the school overview instead.
        await openActivatePageFromOverview(page, {
            schoolId: school.id,
            section: NEXT_ACADEMIC_YEAR_CLASSES,
            classNameDataTest: 'inactive-ready-teddy-class-name',
            schoolClass: preAdmissionClass
        });

        // Reception is filled in and cannot be changed, and Ready Teddy is the only programme on offer.
        // Both are what makes this a pre-admission class rather than a choice the leader makes.
        await expect(page.getByTestId('yearGroup')).toContainText(RECEPTION);
        await expect(getInputBoxByName(page, 'isReadyTeddy')).toBeChecked();
        await expect(getInputBoxByName(page, 'isReadyTeddy')).toBeDisabled();
        await expect(getInputBoxByName(page, 'isFullProgramme')).toHaveCount(0);
        await expect(getInputBoxByName(page, 'isReadingLogsEnabled')).toHaveCount(0);

        await selectOption(page, 'activate-main-teacher-select', leaderName);
        await submitActivation(page);

        await page.waitForURL(new RegExp(`/school/${school.id}`));
        await waitForLoading(page);
        await acceptFeatureTooltipPrompt(page);

        // ---- Scenario 12: it lands in the next academic year section, still a Ready Teddy class -----
        await expect(
            page
                .getByTestId(NEXT_ACADEMIC_YEAR_CLASSES)
                .getByTestId('active-ready-teddy-class-name')
                .filter({ hasText: exactText(preAdmissionClass.name) })
        ).toBeVisible();

        await openClassSettings(page, preAdmissionClass.id);

        await expect(getInputBoxByName(page, 'isReadyTeddy')).toBeChecked();
    });
});

/** Year group names as the activate page lists them. */
const RECEPTION = 'Reception';
const YEAR_ONE = 'Year 1';

/** The two school overview sections this spec activates classes from. */
const REGISTRATION_CLASSES = 'registration-classes';
const NEXT_ACADEMIC_YEAR_CLASSES = 'next-academic-year-classes';

/**
 * Two full programme licences and five in total. The run spends both full programme licences, one at
 * activation and one by upgrading a class afterwards, so every later scenario meets a school with none
 * left. Five in total is comfortably more than the four classes activated here, because none of these
 * five specs is about the total limit.
 */
const FULL_PROGRAMME_LICENCES = 2;
const TOTAL_LICENCES = 5;

interface SeededClass {
    id: string;
    name: string;
}

/**
 * Anchored, so a class name cannot match another that merely starts with it. The fixture names classes
 * from a generated id and two of them can share a prefix.
 */
const exactText = (value: string): RegExp => new RegExp(`^\\s*${value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`);

/** Picks an option from one of the house MUI selects, which carry their dataTest on the select itself. */
const selectOption = async (page: Page, selectDataTest: string, optionName: string) => {
    await page.getByTestId(selectDataTest).click();
    await page.getByRole('option', { name: optionName, exact: true }).click();
};

const activeClassRow = (page: Page, className: string) =>
    page
        .getByTestId(REGISTRATION_CLASSES)
        .getByTestId('active-registration-class-name')
        .filter({ hasText: exactText(className) });

const inactiveClassRow = (page: Page, className: string) =>
    page
        .getByTestId(REGISTRATION_CLASSES)
        .getByTestId('inactive-registration-class-name')
        .filter({ hasText: exactText(className) });

/**
 * Walks the way a leader actually reaches the activate page: the class row on the school overview, the
 * class page it opens, and the link on that page offering to activate.
 *
 * The row sends the browser to the class's `readingweek` route, which redirects an inactive class on to
 * `pupils` in `getServerSideProps`, so that is where this waits. Both pages render TeacherClassWrapper,
 * which is what carries the activate link.
 *
 * The class id is checked on both hops rather than assumed, so clicking the wrong row fails here with
 * the URL in the message instead of somewhere further down the run.
 */
const openActivatePageFromOverview = async (
    page: Page,
    {
        schoolId,
        section,
        classNameDataTest,
        schoolClass
    }: { schoolId: string; section: string; classNameDataTest: string; schoolClass: SeededClass }
) => {
    await page.goto(`/school/${schoolId}`);
    await waitForLoading(page);
    await acceptFeatureTooltipPrompt(page);

    await page
        .getByTestId(section)
        .getByTestId(classNameDataTest)
        .filter({ hasText: exactText(schoolClass.name) })
        .click();

    await page.waitForURL(new RegExp(`/class/${schoolClass.id}/pupils`));
    await waitForLoading(page);
    await expect(page.getByTestId('class-register-page')).toBeVisible();

    await page.getByTestId('class-register-activate-link').click();
    await page.waitForURL(new RegExp(`/class/${schoolClass.id}/activate`));
    await waitForLoading(page);
};

/**
 * Fills the activation form without submitting, so a scenario can assert what the form offers before
 * committing to it.
 *
 * The reading start day is not optional when reading logs are on: its select is the only control that
 * moves the launch date onto the matching weekday, and the form will not submit while they disagree.
 */
const fillActivationForm = async (
    page: Page,
    {
        yearGroup,
        mainTeacherName,
        readingLogs,
        fullProgramme
    }: { yearGroup?: string; mainTeacherName: string; readingLogs: boolean; fullProgramme: boolean }
) => {
    if (yearGroup) await selectOption(page, 'yearGroup', yearGroup);
    await selectOption(page, 'activate-main-teacher-select', mainTeacherName);

    if (readingLogs) {
        await getInputBoxByName(page, 'isReadingLogsEnabled').check();
        await selectOption(page, 'reading-start-day-select', 'Monday to Sunday');
    }

    if (fullProgramme) await getInputBoxByName(page, 'isFullProgramme').check();
};

/** Submits the activation form and leaves the page wherever activation sends it. */
const submitActivation = async (page: Page) => {
    await page.getByRole('button', { name: 'Activate class' }).click();
    await expect(page.locator('.MuiAlert-message').filter({ hasText: 'Class activated successfully!' })).toBeVisible();
};

const activateClass = async (
    page: Page,
    options: { yearGroup?: string; mainTeacherName: string; readingLogs: boolean; fullProgramme: boolean }
) => {
    await fillActivationForm(page, options);
    await submitActivation(page);
};

/**
 * Opens a class's settings page. Reached by URL rather than through the Class settings button in the
 * class header, which carries no dataTest, as topic-library and reddy-teddy both do.
 */
const openClassSettings = async (page: Page, classId: string) => {
    await page.goto(`/class/${classId}/class-details`);
    await page.waitForURL(new RegExp(`/class/${classId}/class-details`));
    await waitForLoading(page);
    await expect(page.getByTestId('class-details-page')).toBeVisible();
};

/**
 * Changes the programme options on a class settings page and commits them.
 *
 * Every change made here is one the page asks the leader to confirm, because it either takes a full
 * programme licence or turns Ready Teddy on. See the Save handler in ClassDetailsSetting.
 */
const saveProgrammeOptions = async (page: Page, change: () => Promise<void>) => {
    await change();

    await page.getByRole('button', { name: 'Save programme options' }).click();
    await page.getByTestId('dialog-primary-btn').getByText('Confirm').click();
    await expect(page.locator('.MuiAlert-message').filter({ hasText: 'Class program settings updated.' })).toBeVisible();
    await waitForLoading(page);
};

/**
 * Opens a class and moves to its Schedule tab the way a teacher would.
 *
 * Entered at `pupils` rather than `readingweek`, because a class with no topics scheduled yet is
 * redirected off `readingweek` in `getServerSideProps`, and every class here is in exactly that state.
 */
const openScheduleTab = async (page: Page, classId: string) => {
    await page.goto(`/class/${classId}/pupils`);
    await page.waitForURL(new RegExp(`/class/${classId}/pupils`));
    await waitForLoading(page);

    await page.getByTestId('common-nav-schedule-tab').click();
    await page.waitForURL(new RegExp(`/class/${classId}/schedule`));
    await waitForLoading(page);
    await expect(page.getByTestId('class-schedule-page')).toBeVisible();
};

/**
 * A school with a leader and nothing activated yet.
 *
 * `options.active` is deliberately not passed: it would activate one of the imported classes and spend
 * a licence, which is the one thing this fixture cannot afford. The imported classes are looked up
 * afterwards so the test can click them by name and check where each click landed by id.
 *
 * `isMoneySkillsAvailable` is false and two scenarios depend on it. Money Skills on its own reveals the
 * Add a topic section for every registration class, which is what scenario 8 asserts is absent, and it
 * is also what would earn a reading only class the auto-schedule page that scenarios 3 and 6 assert it
 * is kept away from. Switching it on would quietly invert both. `isReadyTeddyAvailable` is true
 * from the start, which is what the Cypress spec used to switch on by hand through the admin school
 * details page, and is also what makes the next academic year section appear on the school overview.
 */
const seedClassActivationData = async (db: Kysely<Schema.DB>, utils: ReturnType<typeof createUtils>) => {
    const leaderFirstName = generateFirstName();
    const leaderLastName = generateLastName();
    // Kept, because createSchoolAndDummyWondeData returns the leader's id and name but not their email.
    const leaderEmail = generateUserEmail(leaderFirstName, leaderLastName);

    const currentPeriod = await db
        .selectFrom('static_lwp_period')
        .where('isCurrentPeriod', '=', true)
        .select('index')
        .executeTakeFirstOrThrow();

    const { school } = await createSchoolAndDummyWondeData(db, utils, {
        school: {
            name: `${generateSchoolName()} School`,
            numOfFullProgrammeClassesAllowed: FULL_PROGRAMME_LICENCES,
            numOfTotalClassesAllowed: TOTAL_LICENCES,
            enableAddClasses: true,
            isMoneySkillsAvailable: false,
            isReadyTeddyAvailable: true,
            isFutureAcademicYear: false
        },
        leader: {
            firstname: leaderFirstName,
            lastname: leaderLastName,
            email: leaderEmail,
            userStatus: UserStatus.ACTIVE,
            addTooltip: true
        }
    });

    const currentYearClasses = await db
        .selectFrom('lwp_school_class')
        .where('schoolId', '=', school.id)
        .where('status', '=', 'IMPORTED')
        .where('periodIndex', '=', currentPeriod.index)
        .select(['id', 'name'])
        .orderBy('id', 'asc')
        .limit(3)
        .execute();

    if (currentYearClasses.length < 3) throw new Error('Expected at least three imported classes in the current academic year');

    const nextYearClass = await db
        .selectFrom('lwp_school_class')
        .where('schoolId', '=', school.id)
        .where('status', '=', 'IMPORTED')
        .where('periodIndex', '=', currentPeriod.index + 1)
        .select(['id', 'name'])
        .orderBy('id', 'asc')
        .executeTakeFirst();

    if (!nextYearClass) throw new Error('Expected an imported class in the next academic year');

    const toSeededClass = (row: { id: string; name: string | null }): SeededClass => ({
        id: row.id.toString(),
        name: row.name ?? ''
    });

    return {
        school,
        leaderEmail,
        leaderName: `${leaderFirstName} ${leaderLastName}`,
        /** Activated as a Year 1 full programme class in scenario 1, spending the first licence. */
        fullProgrammeClass: toSeededClass(currentYearClasses[0]),
        /** Activated for reading, then upgraded to full programme in scenario 4, spending the second. */
        upgradedClass: toSeededClass(currentYearClasses[1]),
        /** Meets a school with no full programme licences left, and stays a reading class. */
        readingOnlyClass: toSeededClass(currentYearClasses[2]),
        /** Next academic year, so it activates as a Ready Teddy class and goes back to the overview. */
        preAdmissionClass: toSeededClass(nextYearClass)
    };
};
