import { test, expect } from '@playwright/test';
import type { Schema } from '@lwp/postgres-client';
import { type Kysely } from 'kysely';
import { createDb } from '../db';
import { createUtils } from '../dbUtils';
import {
    admin,
    englishDomainId,
    generateClassName,
    generateFirstName,
    generateLastName,
    generateSchoolName,
    generateTopicName,
    generateUPN,
    generateUserEmail,
    password
} from '../constants';
import {
    acceptFeatureTooltipPrompt,
    acceptPupilInvitation,
    addClassFromAdminSide,
    addPupilByTeacher,
    addTopicFromAdminSide,
    adminOrTeacherSignOut,
    formatDate,
    getDate,
    getFutureDate,
    getInputBoxByName,
    getTextAreaBoxByName,
    gotoParentDetailsPageFromAdminSide,
    gotoTeacherDetailsPageFromAdminSide,
    login,
    openSideDrawer,
    parentSignOut,
    releaseTopicsUpToADate,
    runCronJob,
    safeClick,
    sendReminderEmailFromAdminSide,
    signUpParent,
    signUpSchoolTeacher,
    waitForLoading
} from '../utils';
import { AddActivityInput } from '../types';
import { UserStatus, UserType } from 'lwp-shared';

test.describe('End-to-End: Topic Scheduling and Notification Flow', () => {
    let db: Kysely<Schema.DB>;
    let utils: ReturnType<typeof createUtils>;

    test.beforeAll(async () => {
        db = createDb();
        utils = createUtils(db);
    });

    test.afterAll(async () => {
        await db.destroy();
    });

    test('Should create a school, add class and topic, enroll users, schedule topic, and validate all notifications', async ({ page }) => {
        const mySchoolName: string = `${generateSchoolName()} School`;
        const leaderFirstName: string = generateFirstName();
        const leaderlastName: string = generateLastName();
        const leaderEmail: string = generateUserEmail(leaderFirstName, leaderlastName);
        const parentFirstName: string = generateFirstName();
        const parentLastName: string = generateLastName();
        const parentEmail: string = generateUserEmail(parentFirstName, parentLastName);
        const myClassName: string = generateClassName();
        const pupilFirstName: string = generateFirstName();
        const pupilLastName: string = generateLastName();
        const topicName: string = generateTopicName();
        const activity_one: AddActivityInput = { activityName: `${topicName} one`, staticComponentName: 'GuessTheAnimal' };
        const todayDate = formatDate();
        const dateAfter7Days = getFutureDate(7);

        const user = await db.selectFrom('lwp_user').where('id', '=', '1').select(['id', 'password']).executeTakeFirstOrThrow();
        const currentPeriod = await db
            .selectFrom('static_lwp_period')
            .where('isCurrentPeriod', '=', true)
            .select('index')
            .executeTakeFirstOrThrow();
        const school = await utils.createSchool({
            schoolName: mySchoolName,
            curentPeriodIndex: currentPeriod.index,
            numOfFullProgrammeClassesAllowed: 10,
            numOfTotalClassesAllowed: 30,
            enableAddClasses: true,
            logCreatedById: user.id,
            logUpdatedById: user.id
        });
        const leader = await utils.createUser({
            firstname: leaderFirstName,
            lastname: leaderlastName,
            email: leaderEmail,
            type: UserType.TEACHER,
            userStatus: UserStatus.ACTIVE,
            isSchoolLeader: true,
            schoolId: school.id,
            password: user.password,
            nameForChildren: `Mr ${leaderFirstName}`
        });
        const schoolClass = await utils.createClass(school.id, {
            name: myClassName,
            isRegistrationClass: true,
            isFullProgramme: true,
            mainTeacherId: leader.id,
            yearGroup: 1,
            periodIndex: currentPeriod.index,
            logCreatedById: user.id,
            logUpdatedById: user.id
        });
        const staticTopic = await utils.createStaticTopic({
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
            .values({
                domainId: englishDomainId,
                topicId: staticTopic.id,
                yearGroupId: '1'
            })
            .executeTakeFirstOrThrow();
        const staticActivity1 = await utils.createStaticActivity({
            name: activity_one.activityName,
            activityType: 'LEGACY',
            order: 1,
            topicId: staticTopic.id,
            logCreatedById: user.id,
            logUpdatedById: user.id
        });
        const classTopic1 = await utils.createClassTopic(schoolClass.id, {
            topicId: staticTopic?.id,
            releaseDate: todayDate,
            released: true
        });
        const pupil1 = await utils.createPupil(school.id, {
            firstname: pupilFirstName,
            lastname: pupilLastName,
            dateOfBirth: new Date(),
            startedSchool: '2024',
            isPremium: true,
            gender: 'MALE',
            UPN: generateUPN(),
            logCreatedById: user.id,
            logUpdatedById: user.id
        });
        const parent = await utils.createUser({
            firstname: parentFirstName,
            lastname: parentLastName,
            email: parentEmail,
            type: UserType.PARENT,
            userStatus: UserStatus.ACTIVE,
            password: user.password
        });
        await utils.addParentToPupil(pupil1.id, parent.id, false);
        await utils.addPupilToClass(pupil1.id, schoolClass.id);
        const pupilTopic1 = await utils.createPupilTopic({
            releaseDate: todayDate,
            pupilId: pupil1.id,
            classTopicId: classTopic1.id,
            topicId: staticTopic.id,
            watchedVideo: false,
            periodIndex: currentPeriod.index,
            silverStars: 0,
            earnedGoldStar: false
        });
        await utils.createPupilActivity({
            pupilId: pupil1.id,
            topicId: pupilTopic1.id,
            activityId: staticActivity1.id,
            earnedStar: false,
            mathscotActivityItemIds: JSON.stringify([88, 188, 224])
        });

        await login(page, admin, password);
        await page.waitForURL(/\/admin\/all-feeds/);
        await expect(page.getByTestId('common-drawer-list')).toBeVisible();
        await openSideDrawer(page);
        await runCronJob(page, 'teacherTopicsToBeReleasedTomorrow');
        await gotoTeacherDetailsPageFromAdminSide(page, mySchoolName, `${leaderFirstName} ${leaderlastName}`);
        await page.getByRole('tab', { name: 'Notifications' }).click();
        await waitForLoading(page);
        await page.getByTestId('sendTeacherTopicsToBeReleasedTomorrow-user-notification-history-details-button').first().click();
        const notificationParamsValue = await page.locator('textarea[name="params"]').inputValue();
        const notificationParameters = JSON.parse(notificationParamsValue);
        expect(notificationParameters).toMatchObject({
            SCHOOL: mySchoolName,
            CLASS: myClassName,
            FIRSTNAME: leaderFirstName,
            LASTNAME: leaderlastName,
            TOPICNAME: topicName
        });
        await page.getByTestId('dialog-cancel-btn').click();
        await expect(page.getByTestId('common-drawer-list')).toBeVisible();
        await openSideDrawer(page);
        await sendReminderEmailFromAdminSide(page, 'sendMailForTopicReminderAfter7Days', dateAfter7Days);
        await gotoParentDetailsPageFromAdminSide(
            page,
            mySchoolName,
            myClassName,
            `${pupilFirstName} ${pupilLastName}`,
            `${parentFirstName} ${parentLastName}`
        );
        await page.getByRole('tab', { name: 'Notifications' }).click();
        await waitForLoading(page);
        await page.getByTestId('sendMailForTopicReminderAfter7Days-user-notification-history-details-button').first().click();
        const notification2ParamsValue = await page.locator('textarea[name="params"]').inputValue();
        const notification2Parameters = JSON.parse(notification2ParamsValue);
        expect(notification2Parameters).toMatchObject({
            SCHOOL: mySchoolName,
            CLASS: myClassName,
            FIRSTNAME: parentFirstName,
            LASTNAME: parentLastName,
            TOPICNAME: topicName
        });
    });
});

/**
 * Bulk removal on the class schedule page. The point of these is the two rows that must survive: a
 * released topic holds work families may already have done, and a reading week is not a scheduled
 * topic at all. Both keep a checkbox so the column stays aligned, but a dead one.
 */
test.describe('Removing several scheduled topics at once', () => {
    let db: Kysely<Schema.DB>;
    let utils: ReturnType<typeof createUtils>;

    test.beforeAll(async () => {
        db = createDb();
        utils = createUtils(db);
    });

    test.afterAll(async () => {
        await db.destroy();
    });

    test('removes the ticked topics and leaves the released one and the reading week behind', async ({ page }) => {
        const leaderFirstName: string = generateFirstName();
        const leaderLastName: string = generateLastName();
        const leaderEmail: string = generateUserEmail(leaderFirstName, leaderLastName);
        const topicName: string = generateTopicName();
        const readingTopicName: string = generateTopicName();

        const user = await db.selectFrom('lwp_user').where('id', '=', '1').select(['id', 'password']).executeTakeFirstOrThrow();
        const currentPeriod = await db
            .selectFrom('static_lwp_period')
            .where('isCurrentPeriod', '=', true)
            .select('index')
            .executeTakeFirstOrThrow();

        const school = await utils.createSchool({
            schoolName: `${generateSchoolName()} School`,
            curentPeriodIndex: currentPeriod.index,
            numOfFullProgrammeClassesAllowed: 10,
            numOfTotalClassesAllowed: 30,
            enableAddClasses: true,
            logCreatedById: user.id,
            logUpdatedById: user.id
        });

        const leader = await utils.createUser({
            firstname: leaderFirstName,
            lastname: leaderLastName,
            email: leaderEmail,
            type: UserType.TEACHER,
            userStatus: UserStatus.ACTIVE,
            isSchoolLeader: true,
            schoolId: school.id,
            password: user.password,
            nameForChildren: `Mr ${leaderFirstName}`
        });

        const schoolClass = await utils.createClass(school.id, {
            name: generateClassName(),
            isRegistrationClass: true,
            isFullProgramme: true,
            mainTeacherId: leader.id,
            yearGroup: 1,
            periodIndex: currentPeriod.index,
            logCreatedById: user.id,
            logUpdatedById: user.id
        });

        const staticTopic = await utils.createStaticTopic({
            isReading: false,
            teacherTopicName: topicName,
            parentTopicName: topicName,
            isPublished: true,
            logCreatedById: user.id,
            logUpdatedById: user.id
        });

        // Without a subject-bearing domain the topic never passes the page's subject filter.
        await db
            .insertInto('static_lwp_topic_domain_year_group')
            .values({ domainId: englishDomainId, topicId: staticTopic.id, yearGroupId: '1' })
            .executeTakeFirstOrThrow();

        const readingTopic = await utils.createStaticTopic({
            isReading: true,
            teacherTopicName: readingTopicName,
            parentTopicName: readingTopicName,
            isPublished: true,
            logCreatedById: user.id,
            logUpdatedById: user.id
        });

        /*
         * `formatDate` for rows written straight to the database, not `getFutureDate`: that one
         * returns DD/MM/YYYY for typing into a date field, and Postgres reads the day as a month.
         * Anything past the 12th of a month is rejected outright, and anything before it is silently
         * stored as the wrong date.
         */
        const inDays = (days: number): string => {
            const date = new Date();

            date.setDate(date.getDate() + days);

            return formatDate(date);
        };

        const firstToRemove = await utils.createClassTopic(schoolClass.id, {
            topicId: staticTopic.id,
            releaseDate: inDays(7),
            released: false
        });
        const secondToRemove = await utils.createClassTopic(schoolClass.id, {
            topicId: staticTopic.id,
            releaseDate: inDays(14),
            released: false
        });
        const alreadyReleased = await utils.createClassTopic(schoolClass.id, {
            topicId: staticTopic.id,
            releaseDate: formatDate(),
            released: true
        });
        const readingWeek = await utils.createClassTopic(schoolClass.id, {
            topicId: readingTopic.id,
            releaseDate: inDays(21),
            released: false
        });

        // Short enough that the four rows push the action bar below the fold when it is not pinned.
        await page.setViewportSize({ width: 1280, height: 500 });
        await login(page, leaderEmail, password);
        await page.goto(`/class/${schoolClass.id}/schedule`);
        await waitForLoading(page);
        // A first-time leader gets the feature walkthrough, whose overlay swallows every click.
        await acceptFeatureTooltipPrompt(page);

        const checkboxFor = (classTopicId: string) =>
            page.locator(`[data-test="select-topic-${classTopicId}-checkbox-in-class-schedule-page"]`);

        // The rule this whole feature turns on, asserted before anything is removed.
        await expect(checkboxFor(alreadyReleased.id)).toBeDisabled();
        await expect(checkboxFor(readingWeek.id)).toBeDisabled();
        await expect(checkboxFor(firstToRemove.id)).toBeEnabled();

        await checkboxFor(firstToRemove.id).click();
        await checkboxFor(secondToRemove.id).click();

        // Pinned to the bottom of the window, so a long schedule never hides it behind a scroll.
        // Clicking the lower checkbox scrolled the page down, so go back to the top first.
        await page.evaluate(() => window.scrollTo(0, 0));
        await expect(page.locator('[data-test="remove-selected-topics-button"]')).toBeInViewport({ ratio: 1 });

        await safeClick(page.locator('[data-test="remove-selected-topics-button"]'));
        // The heading carries no count, matching the pupils page; the count is in the body.
        await expect(page.locator('[data-test="dialog-title-heading"]')).toContainText('Remove topics from this class?');
        await expect(page.locator('[data-test="dialog-content"]')).toContainText('remove 2 topics');
        await safeClick(page.locator('[data-test="dialog-primary-btn"]'));
        await waitForLoading(page);

        await expect(checkboxFor(firstToRemove.id)).toHaveCount(0);
        await expect(checkboxFor(secondToRemove.id)).toHaveCount(0);
        await expect(checkboxFor(alreadyReleased.id)).toHaveCount(1);
        await expect(checkboxFor(readingWeek.id)).toHaveCount(1);

        /*
         * Removal here means setting `deletedById`, and the database turns that into a real delete: a
         * `delete_on_deleted_by_set` trigger drops the row and `delete_auditing` keeps a copy in
         * `deleted_item`. So the removed topics leave this table altogether.
         */
        const remaining = await db.selectFrom('lwp_class_topic').where('classId', '=', schoolClass.id).select('id').execute();

        expect(new Set(remaining.map((row) => row.id))).toEqual(new Set([alreadyReleased.id, readingWeek.id]));
    });
});

/*
 * The "Filter by subject" pop-up above the scheduled topics. A teacher ticks and unticks several
 * subjects in a row, so it has to stay open until they click away.
 */
test.describe('Filtering scheduled topics by subject', () => {
    let db: Kysely<Schema.DB>;
    let utils: ReturnType<typeof createUtils>;

    test.beforeAll(async () => {
        db = createDb();
        utils = createUtils(db);
    });

    test.afterAll(async () => {
        await db.destroy();
    });

    test('keeps the pop-up open while several subjects are unticked, and closes it on a click away', async ({ page }) => {
        const leaderFirstName: string = generateFirstName();
        const leaderLastName: string = generateLastName();
        const leaderEmail: string = generateUserEmail(leaderFirstName, leaderLastName);
        const topicName: string = generateTopicName();
        const readingTopicName: string = generateTopicName();

        const user = await db.selectFrom('lwp_user').where('id', '=', '1').select(['id', 'password']).executeTakeFirstOrThrow();
        const currentPeriod = await db
            .selectFrom('static_lwp_period')
            .where('isCurrentPeriod', '=', true)
            .select('index')
            .executeTakeFirstOrThrow();

        const school = await utils.createSchool({
            schoolName: `${generateSchoolName()} School`,
            curentPeriodIndex: currentPeriod.index,
            numOfFullProgrammeClassesAllowed: 10,
            numOfTotalClassesAllowed: 30,
            enableAddClasses: true,
            logCreatedById: user.id,
            logUpdatedById: user.id
        });

        const leader = await utils.createUser({
            firstname: leaderFirstName,
            lastname: leaderLastName,
            email: leaderEmail,
            type: UserType.TEACHER,
            userStatus: UserStatus.ACTIVE,
            isSchoolLeader: true,
            schoolId: school.id,
            password: user.password,
            nameForChildren: `Mr ${leaderFirstName}`
        });

        const schoolClass = await utils.createClass(school.id, {
            name: generateClassName(),
            isRegistrationClass: true,
            isFullProgramme: true,
            mainTeacherId: leader.id,
            yearGroup: 1,
            periodIndex: currentPeriod.index,
            logCreatedById: user.id,
            logUpdatedById: user.id
        });

        const staticTopic = await utils.createStaticTopic({
            isReading: false,
            teacherTopicName: topicName,
            parentTopicName: topicName,
            isPublished: true,
            logCreatedById: user.id,
            logUpdatedById: user.id
        });

        await db
            .insertInto('static_lwp_topic_domain_year_group')
            .values({ domainId: englishDomainId, topicId: staticTopic.id, yearGroupId: '1' })
            .executeTakeFirstOrThrow();

        const readingTopic = await utils.createStaticTopic({
            isReading: true,
            teacherTopicName: readingTopicName,
            parentTopicName: readingTopicName,
            isPublished: true,
            logCreatedById: user.id,
            logUpdatedById: user.id
        });

        const nextWeek = new Date();

        nextWeek.setDate(nextWeek.getDate() + 7);

        // The filter lists English because of the first row and Reading because of the second.
        await utils.createClassTopic(schoolClass.id, { topicId: staticTopic.id, releaseDate: formatDate(nextWeek), released: false });
        await utils.createClassTopic(schoolClass.id, { topicId: readingTopic.id, releaseDate: formatDate(nextWeek), released: false });

        await login(page, leaderEmail, password);
        await page.goto(`/class/${schoolClass.id}/schedule`);
        await waitForLoading(page);
        // A first-time leader gets the feature walkthrough, whose overlay swallows every click.
        await acceptFeatureTooltipPrompt(page);

        const english = page.getByRole('checkbox', { name: 'English' });
        const reading = page.getByRole('checkbox', { name: 'Reading' });

        await safeClick(page.getByText('Filter by subject'));
        await expect(english).toBeChecked();
        await expect(reading).toBeChecked();

        // Each click is made without reopening the pop-up, which is the whole point.
        await reading.click();
        await expect(reading).not.toBeChecked();
        await english.click();
        await expect(english).not.toBeChecked();

        // Clicking anywhere else on the page closes it.
        await page.mouse.click(1, 1);
        await expect(english).toHaveCount(0);
        await expect(reading).toHaveCount(0);
    });
});
