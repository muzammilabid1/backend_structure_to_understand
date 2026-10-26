import { test, expect } from '@playwright/test';
import type { Schema } from '@lwp/postgres-client';
import { type Kysely } from 'kysely';
import { createDb } from './db';
import { createUtils } from './dbUtils';
import { admin, generateFirstName, generateLastName, generateSchoolName, generateUserEmail, password } from './constants';
import {
    adminOrTeacherSignOut,
    createSchoolAndDummyWondeData,
    getDate,
    getInputBoxByName,
    getTextAreaBoxByName,
    login,
    openSideDrawer,
    parentSignOut,
    releaseTopicsUpToADate,
    waitForLoading
} from './utils';
import { PupilParentStatus, UserStatus } from 'lwp-shared';

/**
 * The topic library, converted from cypress/e2e/TopicLibrary/topic_library.cy.js, which this replaces.
 *
 * One test with numbered scenarios, matching the house pattern. The Cypress version was three tests
 * that shared state, so the third could not run on its own; the school, classes, teacher and pupils are
 * seeded with direct database calls here instead of being clicked through the admin UI.
 *
 * Scenario 6 onwards is the `addTopicToClasses` mutation, which schedules one topic to several classes
 * in a single action. Every class used to be committed in its own transaction and they now share one,
 * so the added scenarios assert against the database what the Cypress version only saw rendered: that
 * every class really got the topic on the same dates, and that each registration class gained the
 * topic's subject, which is the side effect that moved inside that transaction.
 */
test.describe('Topic library', () => {
    let db: Kysely<Schema.DB>;
    let utils: ReturnType<typeof createUtils>;

    test.beforeAll(async () => {
        db = createDb();
        utils = createUtils(db);
    });

    test.afterAll(async () => {
        await db.destroy();
    });

    test('Set a topic is gated on a full programme class, and one topic can be scheduled to several classes at once', async ({ page }) => {
        const mySchoolName = `${generateSchoolName()} School`;
        const leaderFirstName = generateFirstName();
        const leaderLastName = generateLastName();
        const leaderEmail = generateUserEmail(leaderFirstName, leaderLastName);
        const teacherFirstName = generateFirstName();
        const teacherLastName = generateLastName();
        const teacherEmail = generateUserEmail(teacherFirstName, teacherLastName);
        const messageForParents = `${mySchoolName} We have been doing this at school, have a go together!`;

        const tomorrow = new Date();

        tomorrow.setDate(tomorrow.getDate() + 1);

        const dateTomorrowForUI = getDate(tomorrow);

        // ----------------------------------------------------------------
        // Fixture: a school with a leader, a teacher, and three classes.
        // class1 starts without full programme so scenario 1 has something to assert.
        // ----------------------------------------------------------------
        const {
            class: class1,
            school,
            leader,
            teacher,
            parent: parent1,
            pupil: pupil1
        } = await createSchoolAndDummyWondeData(
            db,
            utils,
            {
                school: {
                    name: mySchoolName,
                    numOfFullProgrammeClassesAllowed: 10,
                    numOfTotalClassesAllowed: 30,
                    enableAddClasses: true,
                    isMoneySkillsAvailable: false,
                    isReadyTeddyAvailable: false,
                    isFutureAcademicYear: true,
                    isParentFeedbackReplyFeatureEnabled: false
                },
                leader: {
                    firstname: leaderFirstName,
                    lastname: leaderLastName,
                    email: leaderEmail,
                    userStatus: UserStatus.ACTIVE,
                    addTooltip: true
                },
                teacher: {
                    firstname: teacherFirstName,
                    lastname: teacherLastName,
                    email: teacherEmail,
                    userStatus: UserStatus.ACTIVE,
                    addTooltip: true
                }
            },
            {
                active: true,
                classLicences: {
                    IsReadingLogsEnabled: false,
                    isFullProgramme: false,
                    isReadyTeddyEnabled: false
                }
            }
        );

        if (!class1 || !teacher || !parent1 || !pupil1)
            throw new Error('createSchoolAndDummyWondeData must return a class, a teacher, a parent and a pupil');

        /*
         * A real published full programme topic, with the year group and subject it belongs to. Taken
         * from the database rather than created, because the library filters on year group and subject
         * and the classes have to be aligned to whatever this topic actually is.
         */
        const libraryTopic = await db
            .selectFrom('static_lwp_topic')
            .innerJoin('static_lwp_topic_domain_year_group', 'static_lwp_topic_domain_year_group.topicId', 'static_lwp_topic.id')
            .innerJoin('static_lwp_topic_domain', 'static_lwp_topic_domain.id', 'static_lwp_topic_domain_year_group.domainId')
            .innerJoin('static_lwp_subject', 'static_lwp_subject.id', 'static_lwp_topic_domain.subjectId')
            .innerJoin('static_lwp_year_group', 'static_lwp_year_group.id', 'static_lwp_topic_domain_year_group.yearGroupId')
            .where('static_lwp_subject.programmeType', '=', 'FULL_PROGRAMME')
            .where('static_lwp_topic.isPublished', '=', true)
            .where('static_lwp_topic.isHidden', '=', false)
            .select([
                'static_lwp_topic.id as topicId',
                'static_lwp_topic.teacherTopicName as topicName',
                'static_lwp_subject.id as subjectId',
                'static_lwp_year_group.id as yearGroupId',
                'static_lwp_year_group.year as yearGroupName'
            ])
            .orderBy('static_lwp_topic.id')
            .executeTakeFirstOrThrow();

        const class1Details = await db
            .selectFrom('lwp_school_class')
            .where('id', '=', class1.id)
            .select(['periodIndex'])
            .executeTakeFirstOrThrow();

        /*
         * Two more of the imported classes the fixture created. They are found now but activated only
         * after the visibility scenarios below, because the rule that gates Set a topic looks at every
         * ACTIVE class in the school: activating a full programme class here would make scenario 1 see
         * the nav item it is asserting the absence of. See isTopicLibraryVisible in CommonDrawer.
         */
        const extraClasses = await db
            .selectFrom('lwp_school_class')
            .where('schoolId', '=', school.id)
            .where('id', '!=', class1.id)
            .where('status', '=', 'IMPORTED')
            // Restrict to class1's academic year. The fixture also seeds a next-period pre-admission
            // class, which the school overview does not render, so picking it here would break the
            // activation scenarios below. Ordering keeps the pick deterministic between runs.
            .where('periodIndex', '=', class1Details.periodIndex)
            .select(['id', 'name'])
            .orderBy('id', 'asc')
            .limit(2)
            .execute();

        if (extraClasses.length < 2) throw new Error('The fixture must provide at least two further imported classes');

        // Released topics only reach a premium pupil, so the parent scenario at the end has something.
        await db.updateTable('lwp_pupil').set({ isPremium: true }).where('id', '=', pupil1.id).execute();

        await db
            .updateTable('lwp_pupil_parent')
            .set({ status: PupilParentStatus.ACTIVE })
            .where('pupilId', '=', pupil1.id)
            .where('parentId', '=', parent1.id)
            .execute();

        const allClasses = [{ id: class1.id, name: class1.name! }, ...extraClasses.map((c) => ({ id: c.id, name: c.name! }))];
        const classIds = allClasses.map((schoolClass) => schoolClass.id);

        // ----------------------------------------------------------------
        // 1. A leader with no full programme class does not see Set a topic
        // ----------------------------------------------------------------
        await login(page, leaderEmail, password);
        await page.waitForURL(/\/school/);
        await waitForLoading(page);
        await openSideDrawer(page);

        await expect(page.getByTestId('sidebar-set-a-topic-btn')).toBeHidden();

        // ----------------------------------------------------------------
        // 2. Turning full programme on for a class reveals it
        // ----------------------------------------------------------------
        await page.goto(`/class/${class1.id}/class-details`);
        await page.waitForURL(/\/class-details/);
        await waitForLoading(page);

        await getInputBoxByName(page, 'isFullProgramme').check();
        await page.getByRole('button', { name: 'Save programme options' }).click();
        await page.getByRole('button', { name: 'Confirm' }).click();
        await waitForLoading(page);
        await expect(page.locator('.MuiAlert-message').filter({ hasText: 'Class program settings updated.' })).toBeVisible();

        await page.goto(`/school/${school.id}`);
        await waitForLoading(page);
        await openSideDrawer(page);

        await expect(page.getByTestId('sidebar-set-a-topic-btn')).toBeVisible();

        await adminOrTeacherSignOut(page);

        // ----------------------------------------------------------------
        // 3. A teacher who is not in any class does not see Set a topic
        // ----------------------------------------------------------------
        await login(page, teacherEmail, password);
        await waitForLoading(page);
        await openSideDrawer(page);

        await expect(page.getByTestId('sidebar-set-a-topic-btn')).toBeHidden();

        await adminOrTeacherSignOut(page);

        // ----------------------------------------------------------------
        // 4. Adding that teacher to the full programme class reveals it for them too
        // ----------------------------------------------------------------
        await utils.addClassTeacher(teacher.id, class1.id);

        await login(page, teacherEmail, password);
        await waitForLoading(page);
        await openSideDrawer(page);

        await expect(page.getByTestId('sidebar-set-a-topic-btn')).toBeVisible();

        await adminOrTeacherSignOut(page);

        /*
         * Only now are the other two classes brought up, into the topic's year group so all three are
         * offered together, and as registration classes because the subject auto-add only runs for
         * those and it is the part of the write that moved inside the transaction. Held back until here
         * so the visibility scenarios above saw a school with nothing schedulable in it.
         */
        for (const extraClass of extraClasses) {
            await db
                .updateTable('lwp_school_class')
                .set({
                    status: 'ACTIVE',
                    isFullProgramme: true,
                    isRegistrationClass: true,
                    yearGroup: libraryTopic.yearGroupId,
                    periodIndex: class1Details.periodIndex
                })
                .where('id', '=', extraClass.id)
                .execute();

            await utils.addClassTeacher(leader.id, extraClass.id);
        }

        await db
            .updateTable('lwp_school_class')
            .set({ isRegistrationClass: true, yearGroup: libraryTopic.yearGroupId })
            .where('id', '=', class1.id)
            .execute();

        // ----------------------------------------------------------------
        // 5. The leader finds the topic in the library and selects it
        // ----------------------------------------------------------------
        await login(page, leaderEmail, password);
        await page.waitForURL(/\/school/);
        await waitForLoading(page);
        await openSideDrawer(page);

        await page.getByTestId('sidebar-set-a-topic-btn').click();
        await waitForLoading(page);
        await expect(page.getByTestId('topic-library-section')).toBeVisible();

        await page.getByTestId('topic-library-year-group-select').locator('input').fill(libraryTopic.yearGroupName!);
        await page.getByRole('option').filter({ hasText: libraryTopic.yearGroupName! }).first().click();
        await page.keyboard.press('Escape');
        await waitForLoading(page);

        await getInputBoxByName(page, 'search').fill(libraryTopic.topicName!);
        await page.getByTestId('topic-library-search-btn').click();
        await waitForLoading(page);

        const topicCard = page.getByTestId('topic-summary-card-topic-name').filter({ hasText: libraryTopic.topicName! }).first();

        await expect(topicCard).toBeVisible();

        await page.getByTestId('topic-summary-card-select-topic-btn').first().click();
        await page.waitForURL(/\/set-topic\//);
        await waitForLoading(page);

        // ----------------------------------------------------------------
        // 6. All three classes are scheduled in one submit
        // ----------------------------------------------------------------
        for (const schoolClass of allClasses) {
            await page.getByTestId('schedule-topic-class-select').locator('input').fill(schoolClass.name);
            await page.getByRole('option').filter({ hasText: schoolClass.name }).click();
            await waitForLoading(page);
        }

        await page.keyboard.press('Escape');
        await waitForLoading(page);

        await getInputBoxByName(page, 'startDate').fill(dateTomorrowForUI);
        await getTextAreaBoxByName(page, 'topicMessage').fill(messageForParents);

        await page.getByTestId('schedule-topic-submit-btn').click();
        await waitForLoading(page);

        // One message for the whole set, not one per class
        await expect(page.locator('.MuiAlert-message').filter({ hasText: 'Topic successfully added.' })).toBeVisible();

        // ----------------------------------------------------------------
        // 7. Every class shows the topic on its schedule
        // ----------------------------------------------------------------
        for (const schoolClass of allClasses) {
            await page.goto(`/class/${schoolClass.id}`);
            await page.waitForURL(/\/class/);
            await waitForLoading(page);

            await page.getByTestId('common-nav-schedule-tab').click();
            await waitForLoading(page);

            await expect(page.locator('tr', { hasText: libraryTopic.topicName! }).first()).toBeVisible();
        }

        // ----------------------------------------------------------------
        // 8. The database holds one row per class, all on the same dates
        //    Asserted here rather than against rendered text, so the assertion does not depend on how
        //    the schedule formats a date, and so a partial write cannot pass unnoticed.
        // ----------------------------------------------------------------
        const classTopics = await db
            .selectFrom('lwp_class_topic')
            .where('classId', 'in', classIds)
            .where('topicId', '=', libraryTopic.topicId)
            .select(['classId', 'releaseDate', 'dueDate', 'teacherMessage'])
            .execute();

        expect(classTopics).toHaveLength(3);
        expect(new Set(classTopics.map((classTopic) => classTopic.classId))).toEqual(new Set(classIds));

        const releaseDates = new Set(classTopics.map((classTopic) => new Date(classTopic.releaseDate).toDateString()));

        expect(releaseDates.size).toBe(1);
        expect([...releaseDates][0]).toBe(tomorrow.toDateString());
        expect(classTopics.every((classTopic) => classTopic.dueDate === null)).toBe(true);
        expect(classTopics.every((classTopic) => classTopic.teacherMessage === messageForParents)).toBe(true);

        // ----------------------------------------------------------------
        // 9. Every registration class gained the topic's subject
        //    This link is written inside the same transaction as the rows now, so it is there for all
        //    three classes or for none of them.
        // ----------------------------------------------------------------
        const subjectLinks = await db
            .selectFrom('lwp_class_subjects')
            .where('lwpSchoolClassId', 'in', classIds)
            .where('staticLwpSubjectId', '=', libraryTopic.subjectId)
            .select(['lwpSchoolClassId as classId'])
            .execute();

        expect(new Set(subjectLinks.map((link) => link.classId))).toEqual(new Set(classIds));

        await adminOrTeacherSignOut(page);

        // ----------------------------------------------------------------
        // 10. Once released, the parent sees the topic with the leader's message
        // ----------------------------------------------------------------
        await login(page, admin, password);
        await page.waitForURL(/\/admin/);
        await waitForLoading(page);
        await openSideDrawer(page);
        await releaseTopicsUpToADate(page, tomorrow);
        await adminOrTeacherSignOut(page);

        const pupilTopic = await db
            .selectFrom('lwp_pupil_topic')
            .innerJoin('lwp_class_topic', 'lwp_class_topic.id', 'lwp_pupil_topic.classTopicId')
            .where('lwp_pupil_topic.pupilId', '=', pupil1.id)
            .where('lwp_class_topic.topicId', '=', libraryTopic.topicId)
            .select(['lwp_pupil_topic.id as id'])
            .executeTakeFirstOrThrow();

        await login(page, parent1.email!, password);
        await waitForLoading(page);

        await page.goto(`/topic/${pupilTopic.id}`);
        await page.waitForURL(/\/topic\/\d+/);
        await waitForLoading(page);

        await expect(page.getByTestId('mathscot-with-bubble-text-heading')).toContainText(libraryTopic.topicName!);

        await parentSignOut(page);
    });
});
