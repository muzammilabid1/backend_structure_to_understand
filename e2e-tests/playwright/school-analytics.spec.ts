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
    acceptFeatureTooltipPrompt,
    adminOrTeacherSignOut,
    clickNextUntilGotIt,
    formatDate,
    getDate,
    login,
    openSideDrawer,
    waitForLoading
} from './utils';
import { UserStatus, UserType } from 'lwp-shared';
import { AddActivityInput } from './types';

test.describe('Generate school analytics', () => {
    const highChartsRectSelector = '.highcharts-container .highcharts-series.highcharts-series-0 rect';
    const highChartsRectTimeout = 10000;

    let db: Kysely<Schema.DB>;
    let utils: ReturnType<typeof createUtils>;

    test.beforeAll(async () => {
        db = createDb();
        utils = createUtils(db);
    });

    test.afterAll(async () => {
        await db.destroy();
    });

    test('Generate school analytics', async ({ page }) => {
        const mySchoolName: string = `${generateSchoolName()} School`;
        const leaderFirstName: string = generateFirstName();
        const leaderlastName: string = generateLastName();
        const schoolEmail: string = generateUserEmail(leaderFirstName, leaderlastName);
        const parentFirstname: string = generateFirstName();
        const parentLastname: string = generateLastName();
        const parentEmail: string = generateUserEmail(parentFirstname, parentLastname);
        const myClassName: string = generateClassName();
        const pupil1FirstName: string = generateFirstName();
        const pupil1LastName: string = generateLastName();
        const pupil2FirstName: string = generateFirstName();
        const pupil2LastName: string = generateLastName();
        const myTopicName = `${generateTopicName()} Topic`;
        const activity_one: AddActivityInput = { activityName: `${myTopicName} one`, staticComponentName: 'GuessTheAnimal' };
        const activity_two: AddActivityInput = { activityName: `${myTopicName} two`, staticComponentName: 'ClapClap' };
        const tooltipText = 'See live data about your school’s engagement';
        const today = new Date();
        const dateToday = formatDate(today, '-');

        // Add school and there should be no data on school analytics page
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
            email: schoolEmail,
            type: UserType.TEACHER,
            userStatus: UserStatus.ACTIVE,
            isSchoolLeader: true,
            schoolId: school.id,
            password: user.password,
            nameForChildren: `Mr ${leaderFirstName}`
        });

        await login(page, schoolEmail, password);
        await page.waitForURL(/\/school/);
        await waitForLoading(page);
        await openSideDrawer(page);
        await page.getByTestId('sidebar-school-analytics-and-reports-btn').click();
        await waitForLoading(page);
        await page.getByTestId('school-live-data').click();
        await waitForLoading(page);
        await expect(page.getByTestId('no-analytics-data')).toHaveText(
            'There are no active reading classes or full programme classes for this school in the current academic year.'
        );
        await page.getByTestId('school-overview-tab').click();
        await page.waitForURL(/\/school/);
        await waitForLoading(page);

        // Add school class in school and school analytics page will have topics graph cards but every card will have no data
        const class1 = await utils.createClass(school.id, {
            name: myClassName,
            isRegistrationClass: true,
            isFullProgramme: true,
            IsReadingLogsEnabled: false,
            mainTeacherId: leader.id,
            yearGroup: 1,
            periodIndex: currentPeriod.index,
            logCreatedById: user.id,
            logUpdatedById: user.id
        });

        await page.reload();
        await page.waitForURL(/\/school/);
        await waitForLoading(page);
        await acceptFeatureTooltipPrompt(page);
        await page.getByTestId('sidebar-school-analytics-and-reports-btn').click();
        await waitForLoading(page);
        await page.getByTestId('school-live-data').click();
        await waitForLoading(page);
        await page.getByTestId('t-otc').click();
        await waitForLoading(page);
        await expect(page.getByTestId('no-analytics-data')).toHaveText(
            'There is no data available for this metric. Please check back later.'
        );
        await page.getByTestId('go-back-to-school-analytics-page-icon').click();
        await waitForLoading(page);
        await page.getByTestId('t-ts').click();
        await waitForLoading(page);
        await expect(page.getByTestId('no-analytics-data')).toHaveText(
            'There is no data available for this metric. Please check back later.'
        );
        await page.getByTestId('go-back-to-school-analytics-page-icon').click();
        await waitForLoading(page);
        await page.getByTestId('t-atcr').click();
        await waitForLoading(page);
        await expect(page.getByTestId('no-analytics-data')).toHaveText(
            'There is no data available for this metric. Please check back later.'
        );
        await page.getByTestId('go-back-to-school-analytics-page-icon').click();
        await waitForLoading(page);
        await page.getByTestId('t-be').click();
        await waitForLoading(page);
        await expect(page.getByTestId('no-analytics-data')).toHaveText(
            'There is no data available for this metric. Please check back later.'
        );
        await page.getByTestId('go-back-to-school-analytics-page-icon').click();
        await waitForLoading(page);
        await page.getByTestId('school-overview-tab').click();
        await page.waitForURL(/\/school/);
        await waitForLoading(page);

        // Schedule a topic and get a gold star in topic
        const staticTopic = await utils.createStaticTopic({
            isReading: false,
            teacherTopicName: myTopicName,
            parentTopicName: myTopicName,
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
            name: activity_one.activityName,
            activityType: 'LEGACY',
            order: 1,
            topicId: staticTopic.id,
            logCreatedById: user.id,
            logUpdatedById: user.id
        });
        const staticActivity2 = await utils.createStaticActivity({
            name: activity_two.activityName,
            activityType: 'LEGACY',
            order: 2,
            topicId: staticTopic.id,
            logCreatedById: user.id,
            logUpdatedById: user.id
        });
        const classTopic1 = await utils.createClassTopic(class1.id, {
            topicId: staticTopic?.id,
            releaseDate: dateToday,
            released: true
        });
        const pupil1 = await utils.createPupil(school.id, {
            firstname: pupil1FirstName,
            lastname: pupil1LastName,
            dateOfBirth: new Date(),
            startedSchool: '2024',
            isPremium: true,
            gender: 'MALE',
            UPN: generateUPN(),
            logCreatedById: user.id,
            logUpdatedById: user.id
        });
        const parent = await utils.createUser({
            firstname: parentFirstname,
            lastname: parentLastname,
            email: parentEmail,
            type: UserType.PARENT,
            userStatus: UserStatus.ACTIVE,
            password: user.password
        });
        await utils.addParentToPupil(pupil1.id, parent.id, false);
        await utils.addPupilToClass(pupil1.id, class1.id);
        const pupilTopic1 = await utils.createPupilTopic({
            releaseDate: dateToday,
            pupilId: pupil1.id,
            classTopicId: classTopic1.id,
            topicId: staticTopic.id,
            watchedVideo: true,
            periodIndex: currentPeriod.index,
            silverStars: 1,
            earnedGoldStar: true
        });
        const pupilActivity1 = await utils.createPupilActivity({
            pupilId: pupil1.id,
            topicId: pupilTopic1.id,
            activityId: staticActivity1.id,
            earnedStar: true,
            mathscotActivityItemIds: JSON.stringify([88, 188, 224])
        });
        await utils.createPupilActivity({
            pupilId: pupil1.id,
            topicId: pupilTopic1.id,
            activityId: staticActivity2.id,
            earnedStar: true,
            mathscotActivityItemIds: JSON.stringify([88, 188, 224])
        });
        await utils.createPupilFeedback(pupil1.id, {
            pupilComment: 'pupil comment',
            parentComment: 'parent comment',
            userType: UserType.PARENT,
            userId: parent.id,
            type: 'ACTIVITY',
            activityId: pupilActivity1.id,
            periodIndex: currentPeriod.index
        });

        // Verify graph data from school analytics page
        await page.getByTestId('sidebar-school-analytics-and-reports-btn').click();
        await waitForLoading(page);
        await page.getByTestId('school-live-data').click();
        await waitForLoading(page);
        let tooltip = page.locator('.highcharts-tooltip');
        let highChartsRect = page.locator(highChartsRectSelector);
        let firstHighChartsGraph = highChartsRect.first();
        await page.getByTestId('t-otc').click();
        await waitForLoading(page);
        await firstHighChartsGraph.waitFor({ state: 'visible', timeout: highChartsRectTimeout });
        await expect(highChartsRect).toHaveCount(1);
        await firstHighChartsGraph.scrollIntoViewIfNeeded();
        await firstHighChartsGraph.hover({ force: true });
        await expect(tooltip).toBeVisible();
        await expect(tooltip).toContainText('100%');
        await page.getByTestId('year-group-button').click();
        await waitForLoading(page);
        await firstHighChartsGraph.waitFor({ state: 'visible', timeout: highChartsRectTimeout });
        await firstHighChartsGraph.scrollIntoViewIfNeeded();
        await firstHighChartsGraph.hover({ force: true });
        await expect(tooltip).toBeVisible();
        await expect(tooltip).toContainText('100%');
        await page.getByTestId('class-button').click();
        await waitForLoading(page);
        await firstHighChartsGraph.waitFor({ state: 'visible', timeout: highChartsRectTimeout });
        await firstHighChartsGraph.scrollIntoViewIfNeeded();
        await firstHighChartsGraph.hover({ force: true });
        await expect(tooltip).toBeVisible();
        await expect(tooltip).toContainText('100%');
        await page.getByTestId('go-back-to-school-analytics-page-icon').click();
        await waitForLoading(page);
        await page.getByTestId('t-ts').click();
        await waitForLoading(page);
        await firstHighChartsGraph.waitFor({ state: 'visible', timeout: highChartsRectTimeout });
        await expect(highChartsRect).toHaveCount(1);
        await firstHighChartsGraph.scrollIntoViewIfNeeded();
        await firstHighChartsGraph.hover({ force: true });
        await expect(tooltip).toBeVisible();
        await expect(tooltip).toContainText('1');
        await page.getByTestId('year-group-button').click();
        await waitForLoading(page);
        await firstHighChartsGraph.waitFor({ state: 'visible', timeout: highChartsRectTimeout });
        await firstHighChartsGraph.scrollIntoViewIfNeeded();
        await firstHighChartsGraph.hover({ force: true });
        await expect(tooltip).toBeVisible();
        await expect(tooltip).toContainText('1');
        await page.getByTestId('class-button').click();
        await waitForLoading(page);
        await firstHighChartsGraph.waitFor({ state: 'visible', timeout: highChartsRectTimeout });
        await firstHighChartsGraph.scrollIntoViewIfNeeded();
        await firstHighChartsGraph.hover({ force: true });
        await expect(tooltip).toBeVisible();
        await expect(tooltip).toContainText('1');
        await page.getByTestId('go-back-to-school-analytics-page-icon').click();
        await waitForLoading(page);
        await page.getByTestId('t-atcr').click();
        await waitForLoading(page);
        await firstHighChartsGraph.waitFor({ state: 'visible', timeout: highChartsRectTimeout });
        await expect(highChartsRect).toHaveCount(1);
        await firstHighChartsGraph.scrollIntoViewIfNeeded();
        await firstHighChartsGraph.hover({ force: true });
        await expect(tooltip).toBeVisible();
        await expect(tooltip).toContainText('100%');
        await page.getByTestId('year-group-button').click();
        await waitForLoading(page);
        await firstHighChartsGraph.waitFor({ state: 'visible', timeout: highChartsRectTimeout });
        await firstHighChartsGraph.scrollIntoViewIfNeeded();
        await firstHighChartsGraph.hover({ force: true });
        await expect(tooltip).toBeVisible();
        await expect(tooltip).toContainText('100%');
        await page.getByTestId('class-button').click();
        await waitForLoading(page);
        await firstHighChartsGraph.waitFor({ state: 'visible', timeout: highChartsRectTimeout });
        await firstHighChartsGraph.scrollIntoViewIfNeeded();
        await firstHighChartsGraph.hover({ force: true });
        await expect(tooltip).toBeVisible();
        await expect(tooltip).toContainText('100%');
        await page.getByTestId('go-back-to-school-analytics-page-icon').click();
        await waitForLoading(page);
        await page.getByTestId('school-overview-tab').click();
        await page.waitForURL(/\/school/);
        await waitForLoading(page);

        // Add another pupil in class and verify updated topics graph data from school analytics page
        const pupil2 = await utils.createPupil(school.id, {
            firstname: pupil2FirstName,
            lastname: pupil2LastName,
            dateOfBirth: new Date(),
            startedSchool: '2024',
            isPremium: true,
            gender: 'MALE',
            UPN: generateUPN(),
            logCreatedById: user.id,
            logUpdatedById: user.id
        });

        await utils.addParentToPupil(pupil2.id, parent.id, false);
        await utils.addPupilToClass(pupil2.id, class1.id);
        const pupilTopic2 = await utils.createPupilTopic({
            releaseDate: dateToday,
            pupilId: pupil2.id,
            classTopicId: classTopic1.id,
            topicId: staticTopic.id,
            watchedVideo: false,
            periodIndex: currentPeriod.index,
            silverStars: 0,
            earnedGoldStar: false
        });
        await utils.createPupilActivity({
            pupilId: pupil2.id,
            topicId: pupilTopic2.id,
            activityId: staticActivity1.id,
            earnedStar: true,
            mathscotActivityItemIds: JSON.stringify([88, 188, 224])
        });
        await utils.createPupilActivity({
            pupilId: pupil2.id,
            topicId: pupilTopic2.id,
            activityId: staticActivity2.id,
            earnedStar: true,
            mathscotActivityItemIds: JSON.stringify([88, 188, 224])
        });
        await page.getByTestId('sidebar-school-analytics-and-reports-btn').click();
        await waitForLoading(page);
        await page.getByTestId('school-live-data').click();
        await waitForLoading(page);
        tooltip = page.locator('.highcharts-tooltip');
        highChartsRect = page.locator(highChartsRectSelector);
        firstHighChartsGraph = highChartsRect.first();
        await page.getByTestId('t-otc').click();
        await waitForLoading(page);
        await firstHighChartsGraph.waitFor({ state: 'visible', timeout: highChartsRectTimeout });
        await expect(highChartsRect).toHaveCount(1);
        await firstHighChartsGraph.scrollIntoViewIfNeeded();
        await firstHighChartsGraph.hover({ force: true });
        await expect(tooltip).toBeVisible();
        await expect(tooltip).toContainText('50%');
        await page.getByTestId('year-group-button').click();
        await waitForLoading(page);
        await firstHighChartsGraph.waitFor({ state: 'visible', timeout: highChartsRectTimeout });
        await firstHighChartsGraph.scrollIntoViewIfNeeded();
        await firstHighChartsGraph.hover({ force: true });
        await expect(tooltip).toBeVisible();
        await expect(tooltip).toContainText('50%');
        await page.getByTestId('class-button').click();
        await waitForLoading(page);
        await firstHighChartsGraph.waitFor({ state: 'visible', timeout: highChartsRectTimeout });
        await firstHighChartsGraph.scrollIntoViewIfNeeded();
        await firstHighChartsGraph.hover({ force: true });
        await expect(tooltip).toBeVisible();
        await expect(tooltip).toContainText('50%');
        await page.getByTestId('go-back-to-school-analytics-page-icon').click();
        await waitForLoading(page);
        await page.getByTestId('t-ts').click();
        await waitForLoading(page);
        await firstHighChartsGraph.waitFor({ state: 'visible', timeout: highChartsRectTimeout });
        await expect(highChartsRect).toHaveCount(1);
        await firstHighChartsGraph.scrollIntoViewIfNeeded();
        await firstHighChartsGraph.hover({ force: true });
        await expect(tooltip).toBeVisible();
        await expect(tooltip).toContainText('2');
        await page.getByTestId('year-group-button').click();
        await waitForLoading(page);
        await firstHighChartsGraph.waitFor({ state: 'visible', timeout: highChartsRectTimeout });
        await firstHighChartsGraph.scrollIntoViewIfNeeded();
        await firstHighChartsGraph.hover({ force: true });
        await expect(tooltip).toBeVisible();
        await expect(tooltip).toContainText('2');
        await page.getByTestId('class-button').click();
        await waitForLoading(page);
        await firstHighChartsGraph.waitFor({ state: 'visible', timeout: highChartsRectTimeout });
        await firstHighChartsGraph.scrollIntoViewIfNeeded();
        await firstHighChartsGraph.hover({ force: true });
        await expect(tooltip).toBeVisible();
        await expect(tooltip).toContainText('2');
        await page.getByTestId('go-back-to-school-analytics-page-icon').click();
        await waitForLoading(page);
        await page.getByTestId('t-atcr').click();
        await waitForLoading(page);
        await firstHighChartsGraph.waitFor({ state: 'visible', timeout: highChartsRectTimeout });
        await expect(highChartsRect).toHaveCount(1);
        await firstHighChartsGraph.scrollIntoViewIfNeeded();
        await firstHighChartsGraph.hover({ force: true });
        await expect(tooltip).toBeVisible();
        await expect(tooltip).toContainText('50%');
        await page.getByTestId('year-group-button').click();
        await waitForLoading(page);
        await firstHighChartsGraph.waitFor({ state: 'visible', timeout: highChartsRectTimeout });
        await firstHighChartsGraph.scrollIntoViewIfNeeded();
        await firstHighChartsGraph.hover({ force: true });
        await expect(tooltip).toBeVisible();
        await expect(tooltip).toContainText('50%');
        await page.getByTestId('class-button').click();
        await waitForLoading(page);
        await firstHighChartsGraph.waitFor({ state: 'visible', timeout: highChartsRectTimeout });
        await firstHighChartsGraph.scrollIntoViewIfNeeded();
        await firstHighChartsGraph.hover({ force: true });
        await expect(tooltip).toBeVisible();
        await expect(tooltip).toContainText('50%');
        await page.getByTestId('go-back-to-school-analytics-page-icon').click();
        await waitForLoading(page);
        await page.getByTestId('school-overview-tab').click();
        await page.waitForURL(/\/school/);
        await waitForLoading(page);

        // Enable reading in school class and reading graph cards will appear on school analytics page with no data
        await db
            .updateTable('lwp_school_class')
            .set({ IsReadingLogsEnabled: true, readingLaunchDate: dateToday, readingStartDay: today.getDay(), readingTarget: 1 })
            .where('id', '=', class1.id)
            .execute();
        await page.reload();
        await page.waitForURL(/\/school/);
        await waitForLoading(page);
        await clickNextUntilGotIt(page);
        await page.getByTestId('sidebar-school-analytics-and-reports-btn').click();
        await waitForLoading(page);
        await page.getByTestId('school-live-data').click();
        await waitForLoading(page);
        await page.getByTestId('r-owrtm').click();
        await waitForLoading(page);
        await expect(page.getByTestId('no-analytics-data')).toHaveText(
            'There is no data available for this metric. Please check back later.'
        );
        await page.getByTestId('go-back-to-school-analytics-page-icon').click();
        await waitForLoading(page);
        await page.getByTestId('r-arcr').click();
        await waitForLoading(page);
        await expect(page.getByTestId('no-analytics-data')).toHaveText(
            'There is no data available for this metric. Please check back later.'
        );
        await page.getByTestId('go-back-to-school-analytics-page-icon').click();
        await waitForLoading(page);
        await page.getByTestId('r-be').click();
        await waitForLoading(page);
        await expect(page.getByTestId('no-analytics-data')).toHaveText(
            'There is no data available for this metric. Please check back later.'
        );
        await page.getByTestId('go-back-to-school-analytics-page-icon').click();
        await waitForLoading(page);
        await page.getByTestId('school-overview-tab').click();
        await page.waitForURL(/\/school/);
        await waitForLoading(page);

        // Release pupil reading topics and verify reading graph data from school analytics page
        const staticReadingTopic = await db
            .selectFrom('static_lwp_topic')
            .where('isReading', '=', true)
            .select(['id'])
            .executeTakeFirstOrThrow();
        const readingClassTopic = await utils.createClassTopic(class1.id, {
            topicId: staticReadingTopic?.id,
            releaseDate: dateToday,
            released: true,
            readingTarget: 1
        });
        const readingPupilTopic = await utils.createPupilTopic({
            releaseDate: dateToday,
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
            releaseDate: dateToday,
            pupilId: pupil2.id,
            classTopicId: readingClassTopic.id,
            topicId: staticReadingTopic.id,
            watchedVideo: false,
            periodIndex: currentPeriod.index,
            silverStars: 0,
            earnedGoldStar: false,
            readingTarget: 1
        });
        await page.getByTestId('sidebar-school-analytics-and-reports-btn').click();
        await waitForLoading(page);
        await page.getByTestId('school-live-data').click();
        await waitForLoading(page);
        tooltip = page.locator('.highcharts-tooltip');
        highChartsRect = page.locator(highChartsRectSelector);
        firstHighChartsGraph = highChartsRect.first();
        await page.getByTestId('r-owrtm').click();
        await waitForLoading(page);
        await firstHighChartsGraph.waitFor({ state: 'visible', timeout: highChartsRectTimeout });
        await expect(highChartsRect).toHaveCount(1);
        await firstHighChartsGraph.scrollIntoViewIfNeeded();
        await firstHighChartsGraph.hover({ force: true });
        await expect(tooltip).toBeVisible();
        await expect(tooltip).toContainText('0%');
        await page.getByTestId('year-group-button').click();
        await waitForLoading(page);
        await firstHighChartsGraph.waitFor({ state: 'visible', timeout: highChartsRectTimeout });
        await firstHighChartsGraph.scrollIntoViewIfNeeded();
        await firstHighChartsGraph.hover({ force: true });
        await expect(tooltip).toBeVisible();
        await expect(tooltip).toContainText('0%');
        await page.getByTestId('class-button').click();
        await waitForLoading(page);
        await firstHighChartsGraph.waitFor({ state: 'visible', timeout: highChartsRectTimeout });
        await firstHighChartsGraph.scrollIntoViewIfNeeded();
        await firstHighChartsGraph.hover({ force: true });
        await expect(tooltip).toBeVisible();
        await expect(tooltip).toContainText('0%');
        await page.getByTestId('go-back-to-school-analytics-page-icon').click();
        await waitForLoading(page);
        await page.getByTestId('r-arcr').click();
        await waitForLoading(page);
        await firstHighChartsGraph.waitFor({ state: 'visible', timeout: highChartsRectTimeout });
        await expect(highChartsRect).toHaveCount(1);
        await firstHighChartsGraph.scrollIntoViewIfNeeded();
        await firstHighChartsGraph.hover({ force: true });
        await expect(tooltip).toBeVisible();
        await expect(tooltip).toContainText('0%');
        await page.getByTestId('year-group-button').click();
        await waitForLoading(page);
        await firstHighChartsGraph.waitFor({ state: 'visible', timeout: highChartsRectTimeout });
        await firstHighChartsGraph.scrollIntoViewIfNeeded();
        await firstHighChartsGraph.hover({ force: true });
        await expect(tooltip).toBeVisible();
        await expect(tooltip).toContainText('0%');
        await page.getByTestId('class-button').click();
        await waitForLoading(page);
        await firstHighChartsGraph.waitFor({ state: 'visible', timeout: highChartsRectTimeout });
        await firstHighChartsGraph.scrollIntoViewIfNeeded();
        await firstHighChartsGraph.hover({ force: true });
        await expect(tooltip).toBeVisible();
        await expect(tooltip).toContainText('0%');
        await page.getByTestId('go-back-to-school-analytics-page-icon').click();
        await waitForLoading(page);
        await page.getByTestId('school-overview-tab').click();
        await page.waitForURL(/\/school/);
        await waitForLoading(page);

        // Get a gold star in reading topic and verify updated reading graph data from school analytics page
        await utils.createPupilFeedback(pupil1.id, {
            comment: 'reading comment',
            bookName: 'book 1',
            readingType: 'SCHOOL_BOOK',
            userType: UserType.PARENT,
            userId: parent.id,
            includeInReadingTarget: true,
            bookReadAt: formatDate(new Date(), '-'),
            isBookFinished: true,
            userName: `${parentFirstname} ${parentLastname}`,
            type: 'READING',
            periodIndex: currentPeriod.index
        });
        await db.updateTable('lwp_pupil_topic').set({ earnedGoldStar: true }).where('id', '=', readingPupilTopic.id).execute();
        await page.getByTestId('sidebar-school-analytics-and-reports-btn').click();
        await waitForLoading(page);
        await page.getByTestId('school-live-data').click();
        await waitForLoading(page);
        tooltip = page.locator('.highcharts-tooltip');
        highChartsRect = page.locator(highChartsRectSelector);
        firstHighChartsGraph = highChartsRect.first();
        await page.getByTestId('r-owrtm').click();
        await waitForLoading(page);
        await firstHighChartsGraph.waitFor({ state: 'visible', timeout: highChartsRectTimeout });
        await expect(highChartsRect).toHaveCount(1);
        await firstHighChartsGraph.scrollIntoViewIfNeeded();
        await firstHighChartsGraph.hover({ force: true });
        await expect(tooltip).toBeVisible();
        await expect(tooltip).toContainText('50%');
        await page.getByTestId('year-group-button').click();
        await waitForLoading(page);
        await firstHighChartsGraph.waitFor({ state: 'visible', timeout: highChartsRectTimeout });
        await firstHighChartsGraph.scrollIntoViewIfNeeded();
        await firstHighChartsGraph.hover({ force: true });
        await expect(tooltip).toBeVisible();
        await expect(tooltip).toContainText('50%');
        await page.getByTestId('class-button').click();
        await waitForLoading(page);
        await firstHighChartsGraph.waitFor({ state: 'visible', timeout: highChartsRectTimeout });
        await firstHighChartsGraph.scrollIntoViewIfNeeded();
        await firstHighChartsGraph.hover({ force: true });
        await expect(tooltip).toBeVisible();
        await expect(tooltip).toContainText('50%');
        await page.getByTestId('go-back-to-school-analytics-page-icon').click();
        await waitForLoading(page);
        await page.getByTestId('r-arcr').click();
        await waitForLoading(page);
        await firstHighChartsGraph.waitFor({ state: 'visible', timeout: highChartsRectTimeout });
        await expect(highChartsRect).toHaveCount(1);
        await firstHighChartsGraph.scrollIntoViewIfNeeded();
        await firstHighChartsGraph.hover({ force: true });
        await expect(tooltip).toBeVisible();
        await expect(tooltip).toContainText('50%');
        await page.getByTestId('year-group-button').click();
        await waitForLoading(page);
        await firstHighChartsGraph.waitFor({ state: 'visible', timeout: highChartsRectTimeout });
        await firstHighChartsGraph.scrollIntoViewIfNeeded();
        await firstHighChartsGraph.hover({ force: true });
        await expect(tooltip).toBeVisible();
        await expect(tooltip).toContainText('50%');
        await page.getByTestId('class-button').click();
        await waitForLoading(page);
        await firstHighChartsGraph.waitFor({ state: 'visible', timeout: highChartsRectTimeout });
        await firstHighChartsGraph.scrollIntoViewIfNeeded();
        await firstHighChartsGraph.hover({ force: true });
        await expect(tooltip).toBeVisible();
        await expect(tooltip).toContainText('50%');
        await page.getByTestId('go-back-to-school-analytics-page-icon').click();
        await waitForLoading(page);
        await adminOrTeacherSignOut(page);
    });

    test('Verify school analytics data when school class has no topics but group of that school class does', async ({ page }) => {
        const mySchoolName: string = `${generateSchoolName()} School`;
        const leaderFirstName: string = generateFirstName();
        const leaderlastName: string = generateLastName();
        const schoolEmail: string = generateUserEmail(leaderFirstName, leaderlastName);
        const parentFirstname: string = generateFirstName();
        const parentLastname: string = generateLastName();
        const parentEmail: string = generateUserEmail(parentFirstname, parentLastname);
        const myClassName: string = generateClassName();
        const myClassGroupName: string = generateClassName();
        const pupil1FirstName: string = generateFirstName();
        const pupil1LastName: string = generateLastName();
        const myTopicName = `${generateTopicName()} Topic`;
        const activity_one: AddActivityInput = { activityName: `${myTopicName} one`, staticComponentName: 'GuessTheAnimal' };
        const activity_two: AddActivityInput = { activityName: `${myTopicName} two`, staticComponentName: 'ClapClap' };
        const today = new Date();
        const dateToday = formatDate(today, '-');

        // Add school and there should be no data on school analytics page
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
            email: schoolEmail,
            type: UserType.TEACHER,
            userStatus: UserStatus.ACTIVE,
            isSchoolLeader: true,
            schoolId: school.id,
            password: user.password,
            nameForChildren: `Mr ${leaderFirstName}`
        });
        const class1 = await utils.createClass(school.id, {
            name: myClassName,
            isRegistrationClass: true,
            isFullProgramme: true,
            IsReadingLogsEnabled: false,
            mainTeacherId: leader.id,
            yearGroup: 1,
            periodIndex: currentPeriod.index,
            logCreatedById: user.id,
            logUpdatedById: user.id
        });

        await login(page, schoolEmail, password);
        await page.waitForURL(/\/school/);
        await waitForLoading(page);
        await openSideDrawer(page);
        await expect(page.getByTestId('school-overview-page')).toBeVisible();
        await acceptFeatureTooltipPrompt(page);
        await page.getByTestId('sidebar-school-analytics-and-reports-btn').click();
        await waitForLoading(page);
        await page.getByTestId('school-live-data').click();
        await waitForLoading(page);
        await page.getByTestId('t-otc').click();
        await waitForLoading(page);
        await expect(page.getByTestId('no-analytics-data')).toHaveText(
            'There is no data available for this metric. Please check back later.'
        );
        await page.getByTestId('go-back-to-school-analytics-page-icon').click();
        await waitForLoading(page);
        await page.getByTestId('t-ts').click();
        await waitForLoading(page);
        await expect(page.getByTestId('no-analytics-data')).toHaveText(
            'There is no data available for this metric. Please check back later.'
        );
        await page.getByTestId('go-back-to-school-analytics-page-icon').click();
        await waitForLoading(page);
        await page.getByTestId('t-atcr').click();
        await waitForLoading(page);
        await expect(page.getByTestId('no-analytics-data')).toHaveText(
            'There is no data available for this metric. Please check back later.'
        );
        await page.getByTestId('go-back-to-school-analytics-page-icon').click();
        await waitForLoading(page);
        await page.getByTestId('t-be').click();
        await waitForLoading(page);
        await expect(page.getByTestId('no-analytics-data')).toHaveText(
            'There is no data available for this metric. Please check back later.'
        );
        await page.getByTestId('go-back-to-school-analytics-page-icon').click();
        await waitForLoading(page);
        await openSideDrawer(page);
        const pupil1 = await utils.createPupil(school.id, {
            firstname: pupil1FirstName,
            lastname: pupil1LastName,
            dateOfBirth: new Date(),
            startedSchool: '2024',
            isPremium: true,
            gender: 'MALE',
            UPN: generateUPN(),
            logCreatedById: user.id,
            logUpdatedById: user.id
        });
        const parent = await utils.createUser({
            firstname: parentFirstname,
            lastname: parentLastname,
            email: parentEmail,
            type: UserType.PARENT,
            userStatus: UserStatus.ACTIVE,
            password: user.password
        });
        await utils.addParentToPupil(pupil1.id, parent.id, false);
        await utils.addPupilToClass(pupil1.id, class1.id);
        const classGroup = await utils.createClass(school.id, {
            name: myClassGroupName,
            isRegistrationClass: false,
            isFullProgramme: false,
            IsReadingLogsEnabled: false,
            mainTeacherId: leader.id,
            yearGroup: 1,
            periodIndex: currentPeriod.index,
            isReadyTeddyEnabled: false,
            skipGroupPupils: true,
            parentClassId: class1.id,
            logCreatedById: user.id,
            logUpdatedById: user.id
        });
        await utils.addPupilToClass(pupil1.id, classGroup.id);
        const staticTopic = await utils.createStaticTopic({
            isReading: false,
            teacherTopicName: myTopicName,
            parentTopicName: myTopicName,
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
            name: activity_one.activityName,
            activityType: 'LEGACY',
            order: 1,
            topicId: staticTopic.id,
            logCreatedById: user.id,
            logUpdatedById: user.id
        });
        const staticActivity2 = await utils.createStaticActivity({
            name: activity_two.activityName,
            activityType: 'LEGACY',
            order: 2,
            topicId: staticTopic.id,
            logCreatedById: user.id,
            logUpdatedById: user.id
        });
        const classTopic1 = await utils.createClassTopic(classGroup.id, {
            topicId: staticTopic?.id,
            releaseDate: dateToday,
            released: true
        });
        const pupilTopic1 = await utils.createPupilTopic({
            releaseDate: dateToday,
            pupilId: pupil1.id,
            classTopicId: classTopic1.id,
            topicId: staticTopic.id,
            watchedVideo: true,
            periodIndex: currentPeriod.index,
            silverStars: 1,
            earnedGoldStar: true
        });
        const pupilActivity1 = await utils.createPupilActivity({
            pupilId: pupil1.id,
            topicId: pupilTopic1.id,
            activityId: staticActivity1.id,
            earnedStar: true,
            mathscotActivityItemIds: JSON.stringify([88, 188, 224])
        });
        await utils.createPupilActivity({
            pupilId: pupil1.id,
            topicId: pupilTopic1.id,
            activityId: staticActivity2.id,
            earnedStar: true,
            mathscotActivityItemIds: JSON.stringify([88, 188, 224])
        });
        await page.reload();
        await page.getByTestId('school-live-data').click();
        await waitForLoading(page);
        const tooltip = page.locator('.highcharts-tooltip');
        const highChartsRect = page.locator(highChartsRectSelector);
        let firstHighChartsGraph = highChartsRect.first();
        await page.getByTestId('t-otc').click();
        await waitForLoading(page);
        await firstHighChartsGraph.waitFor({ state: 'visible', timeout: highChartsRectTimeout });
        await expect(highChartsRect).toHaveCount(1);
        await firstHighChartsGraph.scrollIntoViewIfNeeded();
        await firstHighChartsGraph.hover({ force: true });
        await expect(tooltip).toBeVisible();
        await expect(tooltip).toContainText('0%');
        await page.getByTestId('year-group-button').click();
        await waitForLoading(page);
        await firstHighChartsGraph.waitFor({ state: 'visible', timeout: highChartsRectTimeout });
        await firstHighChartsGraph.scrollIntoViewIfNeeded();
        await firstHighChartsGraph.hover({ force: true });
        await expect(tooltip).toBeVisible();
        await expect(tooltip).toContainText('0%');
        await page.getByTestId('class-button').click();
        await waitForLoading(page);
        await firstHighChartsGraph.waitFor({ state: 'visible', timeout: highChartsRectTimeout });
        await firstHighChartsGraph.scrollIntoViewIfNeeded();
        await firstHighChartsGraph.hover({ force: true });
        await expect(tooltip).toBeVisible();
        await expect(tooltip).toContainText('0%');
        await page.getByTestId('go-back-to-school-analytics-page-icon').click();
        await waitForLoading(page);
        await page.getByTestId('t-ts').click();
        await waitForLoading(page);
        await firstHighChartsGraph.waitFor({ state: 'visible', timeout: highChartsRectTimeout });
        await expect(highChartsRect).toHaveCount(1);
        await firstHighChartsGraph.scrollIntoViewIfNeeded();
        await firstHighChartsGraph.hover({ force: true });
        await expect(tooltip).toBeVisible();
        await expect(tooltip).toContainText('1');
        await page.getByTestId('year-group-button').click();
        await waitForLoading(page);
        await firstHighChartsGraph.waitFor({ state: 'visible', timeout: highChartsRectTimeout });
        await firstHighChartsGraph.scrollIntoViewIfNeeded();
        await firstHighChartsGraph.hover({ force: true });
        await expect(tooltip).toBeVisible();
        await expect(tooltip).toContainText('1');
        await page.getByTestId('class-button').click();
        await waitForLoading(page);
        await firstHighChartsGraph.waitFor({ state: 'visible', timeout: highChartsRectTimeout });
        await firstHighChartsGraph.scrollIntoViewIfNeeded();
        await firstHighChartsGraph.hover({ force: true });
        await expect(tooltip).toBeVisible();
        await expect(tooltip).toContainText('1');
        await page.getByTestId('go-back-to-school-analytics-page-icon').click();
        await waitForLoading(page);
        await page.getByTestId('t-atcr').click();
        await waitForLoading(page);
        await firstHighChartsGraph.waitFor({ state: 'visible', timeout: highChartsRectTimeout });
        await expect(highChartsRect).toHaveCount(1);
        await firstHighChartsGraph.scrollIntoViewIfNeeded();
        await firstHighChartsGraph.hover({ force: true });
        await expect(tooltip).toBeVisible();
        await expect(tooltip).toContainText('0%');
        await page.getByTestId('year-group-button').click();
        await waitForLoading(page);
        await firstHighChartsGraph.waitFor({ state: 'visible', timeout: highChartsRectTimeout });
        await firstHighChartsGraph.scrollIntoViewIfNeeded();
        await firstHighChartsGraph.hover({ force: true });
        await expect(tooltip).toBeVisible();
        await expect(tooltip).toContainText('0%');
        await page.getByTestId('class-button').click();
        await waitForLoading(page);
        await firstHighChartsGraph.waitFor({ state: 'visible', timeout: highChartsRectTimeout });
        await firstHighChartsGraph.scrollIntoViewIfNeeded();
        await firstHighChartsGraph.hover({ force: true });
        await expect(tooltip).toBeVisible();
        await expect(tooltip).toContainText('0%');
        await page.getByTestId('go-back-to-school-analytics-page-icon').click();
        await waitForLoading(page);
        await utils.createPupilFeedback(pupil1.id, {
            pupilComment: 'pupil comment',
            parentComment: 'parent comment',
            userType: UserType.PARENT,
            userId: parent.id,
            type: 'ACTIVITY',
            activityId: pupilActivity1.id,
            periodIndex: currentPeriod.index
        });
        await page.reload();
        await page.getByTestId('school-live-data').click();
        await waitForLoading(page);
        await page.getByTestId('t-otc').click();
        await waitForLoading(page);
        await firstHighChartsGraph.waitFor({ state: 'visible', timeout: highChartsRectTimeout });
        await expect(highChartsRect).toHaveCount(1);
        await firstHighChartsGraph.scrollIntoViewIfNeeded();
        await firstHighChartsGraph.hover({ force: true });
        await expect(tooltip).toBeVisible();
        await expect(tooltip).toContainText('100%');
        await page.getByTestId('year-group-button').click();
        await waitForLoading(page);
        await firstHighChartsGraph.waitFor({ state: 'visible', timeout: highChartsRectTimeout });
        await firstHighChartsGraph.scrollIntoViewIfNeeded();
        await firstHighChartsGraph.hover({ force: true });
        await expect(tooltip).toBeVisible();
        await expect(tooltip).toContainText('100%');
        await page.getByTestId('class-button').click();
        await waitForLoading(page);
        await firstHighChartsGraph.waitFor({ state: 'visible', timeout: highChartsRectTimeout });
        await firstHighChartsGraph.scrollIntoViewIfNeeded();
        await firstHighChartsGraph.hover({ force: true });
        await expect(tooltip).toBeVisible();
        await expect(tooltip).toContainText('100%');
        await page.getByTestId('go-back-to-school-analytics-page-icon').click();
        await waitForLoading(page);
        await page.getByTestId('t-ts').click();
        await waitForLoading(page);
        await firstHighChartsGraph.waitFor({ state: 'visible', timeout: highChartsRectTimeout });
        await expect(highChartsRect).toHaveCount(1);
        await firstHighChartsGraph.scrollIntoViewIfNeeded();
        await firstHighChartsGraph.hover({ force: true });
        await expect(tooltip).toBeVisible();
        await expect(tooltip).toContainText('1');
        await page.getByTestId('year-group-button').click();
        await waitForLoading(page);
        await firstHighChartsGraph.waitFor({ state: 'visible', timeout: highChartsRectTimeout });
        await firstHighChartsGraph.scrollIntoViewIfNeeded();
        await firstHighChartsGraph.hover({ force: true });
        await expect(tooltip).toBeVisible();
        await expect(tooltip).toContainText('1');
        await page.getByTestId('class-button').click();
        await waitForLoading(page);
        await firstHighChartsGraph.waitFor({ state: 'visible', timeout: highChartsRectTimeout });
        await firstHighChartsGraph.scrollIntoViewIfNeeded();
        await firstHighChartsGraph.hover({ force: true });
        await expect(tooltip).toBeVisible();
        await expect(tooltip).toContainText('1');
        await page.getByTestId('go-back-to-school-analytics-page-icon').click();
        await waitForLoading(page);
        await page.getByTestId('t-atcr').click();
        await waitForLoading(page);
        await firstHighChartsGraph.waitFor({ state: 'visible', timeout: highChartsRectTimeout });
        await expect(highChartsRect).toHaveCount(1);
        await firstHighChartsGraph.scrollIntoViewIfNeeded();
        await firstHighChartsGraph.hover({ force: true });
        await expect(tooltip).toBeVisible();
        await expect(tooltip).toContainText('100%');
        await page.getByTestId('year-group-button').click();
        await waitForLoading(page);
        await firstHighChartsGraph.waitFor({ state: 'visible', timeout: highChartsRectTimeout });
        await firstHighChartsGraph.scrollIntoViewIfNeeded();
        await firstHighChartsGraph.hover({ force: true });
        await expect(tooltip).toBeVisible();
        await expect(tooltip).toContainText('100%');
        await page.getByTestId('class-button').click();
        await waitForLoading(page);
        await firstHighChartsGraph.waitFor({ state: 'visible', timeout: highChartsRectTimeout });
        await firstHighChartsGraph.scrollIntoViewIfNeeded();
        await firstHighChartsGraph.hover({ force: true });
        await expect(tooltip).toBeVisible();
        await expect(tooltip).toContainText('100%');
    });
});
