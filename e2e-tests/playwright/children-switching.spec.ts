import { test, expect } from '@playwright/test';
import type { Schema } from '@lwp/postgres-client';
import { type Kysely } from 'kysely';
import { createDb } from './db';
import { createUtils } from './dbUtils';
import {
    generateClassName,
    generateFirstName,
    generateLastName,
    generateSchoolName,
    generateTopicName,
    generateUPN,
    generateUserEmail,
    password
} from './constants';
import {
    acceptPupilInvitation,
    formatDate,
    login,
    performActionAndWaitForGqlResponse,
    switchToPupil,
    waitForLoading,
    watchVideoAndUnlockActivities
} from './utils';
import { PupilParentStatus, UserStatus, UserType } from 'lwp-shared';

test.describe('Children Switching', () => {
    let db: Kysely<Schema.DB>;
    let utils: ReturnType<typeof createUtils>;

    test.beforeAll(async () => {
        db = createDb();
        utils = createUtils(db);
    });

    test.afterAll(async () => {
        await db.destroy();
    });

    test('Children Switching', async ({ page }) => {
        const mySchoolName = `${generateSchoolName()} School`;
        const myClassName = `${generateClassName()} Class`;
        const readingClassName = `Reading ${generateClassName()} Class`;
        const topicClassName = `Topic ${generateClassName()} Class`;
        const myTopicName = `${generateTopicName()} Topic`;
        const leaderFirstName: string = generateFirstName();
        const leaderlastName: string = generateLastName();
        const schoolEmail: string = generateUserEmail(leaderFirstName, leaderlastName);
        const parentFirstName: string = generateFirstName();
        const parentLastName: string = generateLastName();
        const parentEmail: string = generateUserEmail(parentFirstName, parentLastName);
        const pupil1FirstName = generateFirstName();
        const pupil1LastName = generateLastName();
        const pupil2FirstName = generateFirstName();
        const pupil2LastName = generateLastName();
        const pupil3FirstName = generateFirstName();
        const pupil3LastName = generateLastName();
        const pupil4FirstName = generateFirstName();
        const pupil4LastName = generateLastName();
        const activity_one: string = `${myTopicName} one`;
        const activity_two: string = `${myTopicName} two`;

        await generateData(
            db,
            utils,
            mySchoolName,
            {
                leaderFirstName,
                leaderlastName,
                schoolEmail
            },
            {
                myClassName,
                readingClassName,
                topicClassName
            },
            {
                pupil1FirstName,
                pupil1LastName,
                pupil2FirstName,
                pupil2LastName,
                pupil3FirstName,
                pupil3LastName,
                pupil4FirstName,
                pupil4LastName
            },
            {
                parentFirstName,
                parentLastName,
                parentEmail
            },
            {
                myTopicName,
                activityOneName: activity_one,
                activityTwoName: activity_two
            }
        );

        await login(page, parentEmail, password);
        await page.waitForURL(/\/parent/);
        await waitForLoading(page);
        await expect(page.getByTestId('parent-children-page')).toBeVisible();
        await page.locator('[data-test="child-card-footer-primary-content"]', { hasText: pupil1FirstName }).click();
        await page.waitForURL(/\/child\/\d+\/reading/);
        await waitForLoading(page);
        await expect(page.getByTestId('child-reading-log-page')).toBeVisible();
        await expect(page.getByTestId('feature-tooltip-text')).not.toBeVisible();
        await page.getByTestId('switch-child-tab').click();
        await expect(page.locator('[data-test="child-switch-pupil-name"]', { hasText: pupil2FirstName })).not.toBeVisible();
        await page.keyboard.press('Escape');

        await page.getByTestId('header-logo').click();
        await page.waitForURL(/\/parent/);
        await waitForLoading(page);
        await expect(page.getByTestId('parent-children-page')).toBeVisible();
        await page.locator(`[data-test="invited-child-card-${pupil2FirstName}"]`).locator('.invited-child-button').click();
        await page.waitForURL(/\/welcome/);
        await waitForLoading(page);
        await acceptPupilInvitation(page);
        await page.waitForURL(/\/child\/\d+\/reading/);
        await waitForLoading(page);
        await expect(page.getByTestId('child-reading-log-page')).toBeVisible();
        await expect(page.getByTestId('feature-tooltip-text')).toBeVisible();
        await expect(page.getByTestId('feature-tooltip-text')).toHaveText('Use the menu to switch between your children!');
        await performActionAndWaitForGqlResponse(page, 'logTooltipAction', () => page.getByTestId('tooltip-update-button').click());
        await waitForLoading(page);
        await page.getByTestId('header-logo').click();
        await page.waitForURL(/\/parent/);
        await waitForLoading(page);
        await expect(page.getByTestId('parent-children-page')).toBeVisible();

        await page.locator('[data-test="child-card-footer-primary-content"]', { hasText: pupil1FirstName }).click();
        await page.waitForURL(/\/child\/\d+\/reading/);
        await waitForLoading(page);
        await expect(page.getByTestId('child-reading-log-page')).toBeVisible();
        await expect(page.getByRole('heading', { name: `Welcome ${pupil1FirstName}!` })).toBeVisible();
        await switchToPupil(page, pupil2FirstName);
        await expect(page.getByTestId('child-reading-log-page')).toBeVisible();
        await expect(page.getByRole('heading', { name: `Welcome ${pupil2FirstName}!` })).toBeVisible();
        await page.getByTestId('header-logo').click();
        await page.waitForURL(/\/parent/);
        await waitForLoading(page);
        await expect(page.getByTestId('parent-children-page')).toBeVisible();

        await page.locator('[data-test="child-card-footer-primary-content"]', { hasText: pupil1FirstName }).click();
        await page.waitForURL(/\/child\/\d+\/reading/);
        await waitForLoading(page);
        await expect(page.getByTestId('child-reading-log-page')).toBeVisible();
        await page.getByTestId('topics-tab').click();
        await page.waitForURL(/\/child\/\d+\/topics/);
        await waitForLoading(page);
        await expect(page.getByTestId('child-topics-page')).toBeVisible();
        await expect(page.getByRole('heading', { name: `Welcome ${pupil1FirstName}!` })).toBeVisible();
        await switchToPupil(page, pupil2FirstName);
        await page.waitForURL(/\/child\/\d+\/topics/);
        await waitForLoading(page);
        await expect(page.getByTestId('child-topics-page')).toBeVisible();
        await expect(page.getByRole('heading', { name: `Welcome ${pupil2FirstName}!` })).toBeVisible();
        await page.getByTestId('header-logo').click();
        await page.waitForURL(/\/parent/);
        await waitForLoading(page);
        await expect(page.getByTestId('parent-children-page')).toBeVisible();

        await page.locator('[data-test="child-card-footer-primary-content"]', { hasText: pupil1FirstName }).click();
        await page.waitForURL(/\/child\/\d+\/reading/);
        await waitForLoading(page);
        await expect(page.getByTestId('child-reading-log-page')).toBeVisible();
        await page.getByTestId('topics-tab').click();
        await page.waitForURL(/\/child\/\d+\/topics/);
        await waitForLoading(page);
        await expect(page.getByTestId('child-topics-page')).toBeVisible();
        await page.locator('[data-test="child-card-footer-primary-content"]', { hasText: myTopicName }).first().click();
        await page.waitForURL(/\/topic\/\d+/);
        await waitForLoading(page);
        await expect(page.getByTestId('mathscot-with-bubble-text-heading')).toHaveText(myTopicName);
        await expect(page.getByTestId('mathscot-with-bubble-text-paragraph')).toHaveText(
            `${pupil1FirstName} has been given this topic to try at home. Watch the video then do the activities to earn stars.`
        );
        await switchToPupil(page, pupil2FirstName);
        await page.waitForURL(/\/topic\/\d+/);
        await waitForLoading(page);
        await expect(page.getByTestId('mathscot-with-bubble-text-heading')).toHaveText(myTopicName);
        await expect(page.getByTestId('mathscot-with-bubble-text-paragraph')).toHaveText(
            `${pupil2FirstName} has been given this topic to try at home. Watch the video then do the activities to earn stars.`
        );
        await page.getByTestId('header-logo').click();
        await page.waitForURL(/\/parent/);
        await waitForLoading(page);
        await expect(page.getByTestId('parent-children-page')).toBeVisible();

        await page.locator('[data-test="child-card-footer-primary-content"]', { hasText: pupil1FirstName }).click();
        await page.waitForURL(/\/child\/\d+\/reading/);
        await waitForLoading(page);
        await expect(page.getByTestId('child-reading-log-page')).toBeVisible();
        await page.getByTestId('topics-tab').click();
        await page.waitForURL(/\/child\/\d+\/topics/);
        await waitForLoading(page);
        await expect(page.getByTestId('child-topics-page')).toBeVisible();
        await page.locator('[data-test="child-card-footer-primary-content"]', { hasText: myTopicName }).first().click();
        await page.waitForURL(/\/topic\/\d+/);
        await waitForLoading(page);
        await watchVideoAndUnlockActivities(page);
        await page.locator('[data-test="child-card-footer-primary-content"]', { hasText: activity_one }).click();
        await page.waitForURL(/\/activity/);
        await waitForLoading(page);
        await switchToPupil(page, pupil2FirstName);
        await page.waitForURL(/\/topic\/\d+/);
        await waitForLoading(page);
        await expect(page.getByTestId('mathscot-with-bubble-text-heading')).toHaveText(myTopicName);
        await expect(page.getByTestId('mathscot-with-bubble-text-paragraph')).toHaveText(
            `${pupil2FirstName} has been given this topic to try at home. Watch the video then do the activities to earn stars.`
        );
        await page.getByTestId('header-logo').click();
        await page.waitForURL(/\/parent/);
        await waitForLoading(page);
        await expect(page.getByTestId('parent-children-page')).toBeVisible();

        await page.locator('[data-test="child-card-footer-primary-content"]', { hasText: pupil1FirstName }).click();
        await page.waitForURL(/\/child\/\d+\/reading/);
        await waitForLoading(page);
        await expect(page.getByTestId('child-reading-log-page')).toBeVisible();
        await page.getByTestId('topics-tab').click();
        await page.waitForURL(/\/child\/\d+\/topics/);
        await waitForLoading(page);
        await expect(page.getByTestId('child-topics-page')).toBeVisible();
        await page.locator('[data-test="child-card-footer-primary-content"]', { hasText: myTopicName }).first().click();
        await page.waitForURL(/\/topic\/\d+/);
        await waitForLoading(page);
        await page.locator('[data-test="child-card-footer-primary-content"]', { hasText: activity_one }).click();
        await page.waitForURL(/\/activity/);
        await waitForLoading(page);
        await expect(page.getByRole('list').getByText(activity_one)).toBeVisible();
        await switchToPupil(page, pupil2FirstName);
        await page.waitForURL(/\/topic\/\d+/);
        await waitForLoading(page);
        await watchVideoAndUnlockActivities(page);
        await page.locator('[data-test="child-card-footer-primary-content"]', { hasText: activity_one }).click();
        await page.waitForURL(/\/activity/);
        await waitForLoading(page);
        await expect(page.getByRole('list').getByText(activity_one)).toBeVisible();
        await page.getByTestId('header-logo').click();
        await page.waitForURL(/\/parent/);
        await waitForLoading(page);
        await expect(page.getByTestId('parent-children-page')).toBeVisible();

        await page.locator('[data-test="child-card-footer-primary-content"]', { hasText: pupil1FirstName }).click();
        await page.waitForURL(/\/child\/\d+\/reading/);
        await waitForLoading(page);
        await expect(page.getByTestId('child-reading-log-page')).toBeVisible();
        await switchToPupil(page, pupil1FirstName, 'details');
        await page.waitForURL(/\/child\/\d+\/settings/);
        await waitForLoading(page);
        await expect(page.getByTestId('child-settings-page-heading')).toHaveText(`${pupil1FirstName}’s details`);
        await switchToPupil(page, pupil2FirstName);
        await page.waitForURL(/\/child\/\d+\/settings/);
        await waitForLoading(page);
        await expect(page.getByTestId('child-settings-page-heading')).toHaveText(`${pupil2FirstName}’s details`);
        await page.getByTestId('header-logo').click();
        await page.waitForURL(/\/parent/);
        await waitForLoading(page);
        await expect(page.getByTestId('parent-children-page')).toBeVisible();

        await page.getByTestId('header-logo').click();
        await page.waitForURL(/\/parent/);
        await waitForLoading(page);
        await expect(page.getByTestId('parent-children-page')).toBeVisible();
        await page.locator(`[data-test="invited-child-card-${pupil3FirstName}"]`).locator('.invited-child-button').click();
        await page.waitForURL(/\/welcome/);
        await waitForLoading(page);
        await acceptPupilInvitation(page);
        await page.waitForURL(/\/child\/\d+\/reading/);
        await waitForLoading(page);
        await expect(page.getByTestId('child-reading-log-page')).toBeVisible();
        await page.getByTestId('header-logo').click();
        await page.waitForURL(/\/parent/);
        await waitForLoading(page);
        await expect(page.getByTestId('parent-children-page')).toBeVisible();
        await page.locator('[data-test="child-card-footer-primary-content"]', { hasText: pupil1FirstName }).click();
        await page.waitForURL(/\/child\/\d+\/reading/);
        await waitForLoading(page);
        await expect(page.getByTestId('child-reading-log-page')).toBeVisible();
        await page.getByTestId('topics-tab').click();
        await page.waitForURL(/\/child\/\d+\/topics/);
        await waitForLoading(page);
        await expect(page.getByTestId('child-topics-page')).toBeVisible();
        await page.locator('[data-test="child-card-footer-primary-content"]', { hasText: myTopicName }).first().click();
        await page.waitForURL(/\/topic\/\d+/);
        await waitForLoading(page);
        await switchToPupil(page, pupil3FirstName);
        await page.waitForURL(/\/child\/\d+\/reading/);
        await waitForLoading(page);
        await expect(page.getByTestId('child-reading-log-page')).toBeVisible();
        await expect(page.getByRole('heading', { name: `Welcome ${pupil3FirstName}!` })).toBeVisible();

        await page.getByTestId('header-logo').click();
        await page.waitForURL(/\/parent/);
        await waitForLoading(page);
        await expect(page.getByTestId('parent-children-page')).toBeVisible();
        await page.locator(`[data-test="invited-child-card-${pupil4FirstName}"]`).locator('.invited-child-button').click();
        await page.waitForURL(/\/welcome/);
        await waitForLoading(page);
        await acceptPupilInvitation(page);
        await page.waitForURL(/\/child\/\d+\/topics/);
        await waitForLoading(page);
        await expect(page.getByTestId('child-topics-page')).toBeVisible();
        await page.getByTestId('header-logo').click();
        await page.waitForURL(/\/parent/);
        await waitForLoading(page);
        await expect(page.getByTestId('parent-children-page')).toBeVisible();
        await page.locator('[data-test="child-card-footer-primary-content"]', { hasText: pupil1FirstName }).click();
        await page.waitForURL(/\/child\/\d+\/reading/);
        await waitForLoading(page);
        await expect(page.getByTestId('child-reading-log-page')).toBeVisible();
        await switchToPupil(page, pupil4FirstName);
        await page.waitForURL(/\/child\/\d+\/topics/);
        await waitForLoading(page);
        await expect(page.getByTestId('child-topics-page')).toBeVisible();
        await expect(page.getByRole('heading', { name: `Welcome ${pupil4FirstName}!` })).toBeVisible();
    });
});

const generateData = async (
    db: Kysely<Schema.DB>,
    utils: ReturnType<typeof createUtils>,
    mySchoolName: string,
    leaderInfo: {
        leaderFirstName: string;
        leaderlastName: string;
        schoolEmail: string;
    },
    schoolClassInfo: {
        myClassName: string;
        readingClassName: string;
        topicClassName: string;
    },
    pupilInfo: {
        pupil1FirstName: string;
        pupil1LastName: string;
        pupil2FirstName: string;
        pupil2LastName: string;
        pupil3FirstName: string;
        pupil3LastName: string;
        pupil4FirstName: string;
        pupil4LastName: string;
    },
    parentInfo: {
        parentFirstName: string;
        parentLastName: string;
        parentEmail: string;
    },
    topicInfo: {
        myTopicName: string;
        activityOneName: string;
        activityTwoName: string;
    }
): Promise<void> => {
    const today: Date = new Date();
    const todayDate: string = formatDate(today, '-');

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
        firstname: leaderInfo.leaderFirstName,
        lastname: leaderInfo.leaderlastName,
        email: leaderInfo.schoolEmail,
        type: UserType.TEACHER,
        userStatus: UserStatus.ACTIVE,
        isSchoolLeader: true,
        schoolId: school.id,
        password: user.password,
        nameForChildren: `Mr ${leaderInfo.leaderFirstName}`
    });
    const schoolClass = await utils.createClass(school.id, {
        name: schoolClassInfo.myClassName,
        isRegistrationClass: true,
        isFullProgramme: true,
        mainTeacherId: leader.id,
        yearGroup: 1,
        periodIndex: currentPeriod.index,
        IsReadingLogsEnabled: true,
        readingLaunchDate: todayDate,
        readingStartDay: today.getDay(),
        readingTarget: 1,
        logCreatedById: user.id,
        logUpdatedById: user.id
    });
    const staticTopic = await utils.createStaticTopic({
        isReading: false,
        teacherTopicName: topicInfo.myTopicName,
        parentTopicName: topicInfo.myTopicName,
        isPublished: true,
        video: '605069004',
        logCreatedById: user.id,
        logUpdatedById: user.id
    });
    await db
        .insertInto('static_lwp_topic_domain_year_group')
        .values({
            domainId: '2',
            topicId: staticTopic.id,
            yearGroupId: '1'
        })
        .executeTakeFirstOrThrow();
    const staticActivity1 = await utils.createStaticActivity({
        name: topicInfo.activityOneName,
        activityType: 'LEGACY',
        order: 1,
        topicId: staticTopic.id,
        logCreatedById: user.id,
        logUpdatedById: user.id
    });
    const staticActivity2 = await utils.createStaticActivity({
        name: topicInfo.activityTwoName,
        activityType: 'LEGACY',
        order: 2,
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
        firstname: pupilInfo.pupil1FirstName,
        lastname: pupilInfo.pupil1LastName,
        dateOfBirth: new Date(),
        startedSchool: '2024',
        isPremium: true,
        gender: 'MALE',
        UPN: generateUPN(),
        logCreatedById: user.id,
        logUpdatedById: user.id
    });
    const parent = await utils.createUser({
        firstname: parentInfo.parentFirstName,
        lastname: parentInfo.parentLastName,
        email: parentInfo.parentEmail,
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
        periodIndex: currentPeriod.index,
        watchedVideo: false,
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
    await utils.createPupilActivity({
        pupilId: pupil1.id,
        topicId: pupilTopic1.id,
        activityId: staticActivity2.id,
        earnedStar: false,
        mathscotActivityItemIds: JSON.stringify([88, 188, 224])
    });

    const pupil2 = await utils.createPupil(school.id, {
        firstname: pupilInfo.pupil2FirstName,
        lastname: pupilInfo.pupil2LastName,
        dateOfBirth: new Date(),
        startedSchool: '2024',
        isPremium: false,
        gender: 'MALE',
        UPN: generateUPN(),
        logCreatedById: user.id,
        logUpdatedById: user.id
    });

    await utils.addParentToPupil(pupil2.id, parent.id, true, PupilParentStatus.INVITED);
    await utils.addPupilToClass(pupil2.id, schoolClass.id);
    const pupilTopic2 = await utils.createPupilTopic({
        releaseDate: todayDate,
        pupilId: pupil2.id,
        classTopicId: classTopic1.id,
        topicId: staticTopic.id,
        periodIndex: currentPeriod.index,
        watchedVideo: false,
        silverStars: 0,
        earnedGoldStar: false
    });
    await utils.createPupilActivity({
        pupilId: pupil2.id,
        topicId: pupilTopic2.id,
        activityId: staticActivity1.id,
        earnedStar: false,
        mathscotActivityItemIds: JSON.stringify([88, 188, 224])
    });
    await utils.createPupilActivity({
        pupilId: pupil2.id,
        topicId: pupilTopic2.id,
        activityId: staticActivity2.id,
        earnedStar: false,
        mathscotActivityItemIds: JSON.stringify([88, 188, 224])
    });
    const staticReadingTopic = await db
        .selectFrom('static_lwp_topic')
        .where('isReading', '=', true)
        .select(['id'])
        .executeTakeFirstOrThrow();
    const readingClassTopic = await utils.createClassTopic(schoolClass.id, {
        topicId: staticReadingTopic?.id,
        releaseDate: todayDate,
        released: true,
        readingTarget: 1
    });
    await utils.createPupilTopic({
        releaseDate: todayDate,
        pupilId: pupil1.id,
        classTopicId: readingClassTopic.id,
        topicId: staticReadingTopic.id,
        watchedVideo: false,
        periodIndex: currentPeriod.index,
        silverStars: 0,
        earnedGoldStar: false,
        readingTarget: 1
    });
    await utils.createPupilTopic({
        releaseDate: todayDate,
        pupilId: pupil2.id,
        classTopicId: readingClassTopic.id,
        topicId: staticReadingTopic.id,
        watchedVideo: false,
        periodIndex: currentPeriod.index,
        silverStars: 0,
        earnedGoldStar: false,
        readingTarget: 1
    });
    const readingClass = await utils.createClass(school.id, {
        name: schoolClassInfo.readingClassName,
        isRegistrationClass: true,
        isFullProgramme: true,
        mainTeacherId: leader.id,
        yearGroup: 1,
        periodIndex: currentPeriod.index,
        IsReadingLogsEnabled: true,
        readingLaunchDate: todayDate,
        readingStartDay: today.getDay(),
        readingTarget: 1,
        logCreatedById: user.id,
        logUpdatedById: user.id
    });
    const readingClassTopic2 = await utils.createClassTopic(readingClass.id, {
        topicId: staticReadingTopic?.id,
        releaseDate: todayDate,
        released: true,
        readingTarget: 1
    });
    const pupil3 = await utils.createPupil(school.id, {
        firstname: pupilInfo.pupil3FirstName,
        lastname: pupilInfo.pupil3LastName,
        dateOfBirth: new Date(),
        startedSchool: '2024',
        isPremium: false,
        gender: 'MALE',
        UPN: generateUPN(),
        logCreatedById: user.id,
        logUpdatedById: user.id
    });

    await utils.addParentToPupil(pupil3.id, parent.id, true, PupilParentStatus.INVITED);
    await utils.addPupilToClass(pupil3.id, readingClass.id);
    await utils.createPupilTopic({
        releaseDate: todayDate,
        pupilId: pupil3.id,
        classTopicId: readingClassTopic2.id,
        topicId: staticReadingTopic.id,
        watchedVideo: false,
        periodIndex: currentPeriod.index,
        silverStars: 0,
        earnedGoldStar: false,
        readingTarget: 1
    });
    const topicClass = await utils.createClass(school.id, {
        name: schoolClassInfo.topicClassName,
        isRegistrationClass: true,
        isFullProgramme: true,
        mainTeacherId: leader.id,
        yearGroup: 1,
        periodIndex: currentPeriod.index,
        IsReadingLogsEnabled: false,
        readingTarget: 1,
        logCreatedById: user.id,
        logUpdatedById: user.id
    });
    const classTopic2 = await utils.createClassTopic(topicClass.id, {
        topicId: staticTopic?.id,
        releaseDate: todayDate,
        released: true
    });
    const pupil4 = await utils.createPupil(school.id, {
        firstname: pupilInfo.pupil4FirstName,
        lastname: pupilInfo.pupil4LastName,
        dateOfBirth: new Date(),
        startedSchool: '2024',
        isPremium: false,
        gender: 'MALE',
        UPN: generateUPN(),
        logCreatedById: user.id,
        logUpdatedById: user.id
    });

    await utils.addParentToPupil(pupil4.id, parent.id, true, PupilParentStatus.INVITED);
    await utils.addPupilToClass(pupil4.id, topicClass.id);
    const pupilTopic3 = await utils.createPupilTopic({
        releaseDate: todayDate,
        pupilId: pupil4.id,
        classTopicId: classTopic2.id,
        topicId: staticTopic.id,
        periodIndex: currentPeriod.index,
        watchedVideo: false,
        silverStars: 0,
        earnedGoldStar: false
    });
    await utils.createPupilActivity({
        pupilId: pupil4.id,
        topicId: pupilTopic3.id,
        activityId: staticActivity1.id,
        earnedStar: false,
        mathscotActivityItemIds: JSON.stringify([88, 188, 224])
    });
    await utils.createPupilActivity({
        pupilId: pupil4.id,
        topicId: pupilTopic3.id,
        activityId: staticActivity2.id,
        earnedStar: false,
        mathscotActivityItemIds: JSON.stringify([88, 188, 224])
    });
};
