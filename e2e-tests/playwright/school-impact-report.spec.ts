import { test, expect } from '@playwright/test';
import type { Schema } from '@lwp/postgres-client';
import { type Kysely } from 'kysely';
import { createDb } from './db';
import { createUtils } from './dbUtils';
import {
    admin,
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
    formatDate,
    getInputBoxByName,
    getTextAreaBoxByName,
    login,
    openSideDrawer,
    safeClick,
    waitForLoading
} from './utils';
import { UserStatus, UserType } from 'lwp-shared';
import { AddActivityInput } from './types';

test.describe('School Impact Report End-to-End', () => {
    let db: Kysely<Schema.DB>;
    let utils: ReturnType<typeof createUtils>;

    test.beforeAll(async () => {
        db = createDb();
        utils = createUtils(db);
    });

    test.afterAll(async () => {
        await dataCleanup(db);

        await db.destroy();
    });

    test('School Impact Report End-to-End', async ({ page }) => {
        const mySchoolName = `${generateSchoolName()} School`;
        const myClassName = `${generateClassName()} Class`;
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
        const activity_one: AddActivityInput = { activityName: `${myTopicName} one`, staticComponentName: 'GuessTheAnimal' };
        const activity_two: AddActivityInput = { activityName: `${myTopicName} two`, staticComponentName: 'ClapClap' };
        const readingFeedback = `Reading comment ${Date.now()}`;
        const parentFeedback = `Parent comment ${Date.now()}`;
        const updatedParentFeedback = `Updated parent comment ${Date.now()}`;
        const pupilFeedback = `Pupil comment ${Date.now()}`;
        const topicAndActivitiesSpmNote = `topic and activities spm note ${Date.now()}`;
        const readingSpmNote = `reading spm note ${Date.now()}`;
        const v2SpmNote = `version 2 spm note ${Date.now()}`;
        const now = new Date();
        const lastMonthFirstDay = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const previousTermYear = lastMonthFirstDay.getFullYear();
        const previousMonthName = lastMonthFirstDay.toLocaleString('default', { month: 'long' });
        const lastMonthTermName = `${previousMonthName} ${previousTermYear}`;
        const thisMonthTermName = `${now.toLocaleString('default', { month: 'long' })} ${now.getFullYear()}`;
        const highChartsRectTimeout = 10000;
        const today = new Date();
        const dateToday = formatDate(today, '-');
        const lastWeekdayOfLastMonth = getLastWeekdayOfLastMonth();
        const lastMonthLastDay = new Date(today.getFullYear(), today.getMonth(), 0);
        const thisMonthFirstDay = new Date(today.getFullYear(), today.getMonth(), 1);
        const lastMonthFirstDate = formatDate(lastMonthFirstDay, '-');
        const lastMonthLastDate = formatDate(lastMonthLastDay, '-');
        const thisMonthFirstDate = formatDate(thisMonthFirstDay, '-');

        // Generate data for v1 school impact repoprt
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
        const schoolClass = await utils.createClass(school.id, {
            name: myClassName,
            isRegistrationClass: true,
            isFullProgramme: true,
            mainTeacherId: leader.id,
            yearGroup: 1,
            periodIndex: currentPeriod.index,
            IsReadingLogsEnabled: true,
            readingLaunchDate: lastWeekdayOfLastMonth,
            readingStartDay: today.getDay(),
            readingTarget: 1,
            logCreatedById: user.id,
            logUpdatedById: user.id
        });
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
        const classTopic1 = await utils.createClassTopic(schoolClass.id, {
            topicId: staticTopic?.id,
            releaseDate: lastWeekdayOfLastMonth,
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
            releaseDate: lastWeekdayOfLastMonth,
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
            earnedStar: false,
            mathscotActivityItemIds: JSON.stringify([88, 188, 224])
        });
        const pupil1ActivityFeedback = await utils.createPupilFeedback(pupil1.id, {
            pupilComment: pupilFeedback,
            parentComment: parentFeedback,
            userType: UserType.PARENT,
            userId: parent.id,
            type: 'ACTIVITY',
            includeParentCommentInImpactReport: true,
            includePupilCommentInImpactReport: true,
            activityId: pupilActivity1.id,
            periodIndex: currentPeriod.index,
            logCreatedAt: lastWeekdayOfLastMonth,
            logUpdatedAt: lastWeekdayOfLastMonth
        });
        const pupil2 = await utils.createPupil(school.id, {
            firstname: pupil2FirstName,
            lastname: pupil2LastName,
            dateOfBirth: new Date(),
            startedSchool: '2024',
            isPremium: false,
            gender: 'MALE',
            UPN: generateUPN(),
            logCreatedById: user.id,
            logUpdatedById: user.id
        });

        await utils.addParentToPupil(pupil2.id, parent.id, false);
        await utils.addPupilToClass(pupil2.id, schoolClass.id);
        const pupilTopic2 = await utils.createPupilTopic({
            releaseDate: lastWeekdayOfLastMonth,
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
            releaseDate: lastWeekdayOfLastMonth,
            released: true,
            readingTarget: 1
        });
        await utils.createPupilTopic({
            releaseDate: lastWeekdayOfLastMonth,
            pupilId: pupil1.id,
            classTopicId: readingClassTopic.id,
            topicId: staticReadingTopic.id,
            watchedVideo: false,
            periodIndex: currentPeriod.index,
            silverStars: 0,
            earnedGoldStar: true,
            readingTarget: 1
        });
        await utils.createPupilTopic({
            releaseDate: lastWeekdayOfLastMonth,
            pupilId: pupil2.id,
            classTopicId: readingClassTopic.id,
            topicId: staticReadingTopic.id,
            watchedVideo: false,
            periodIndex: currentPeriod.index,
            silverStars: 0,
            earnedGoldStar: false,
            readingTarget: 1
        });
        const pupil1ReadingFeedback = await utils.createPupilFeedback(pupil1.id, {
            comment: readingFeedback,
            bookName: 'book 1',
            readingType: 'SCHOOL_BOOK',
            userType: UserType.PARENT,
            userId: parent.id,
            includeInReadingTarget: true,
            includeReadingCommentInImpactReport: true,
            bookReadAt: lastWeekdayOfLastMonth,
            isBookFinished: true,
            userName: `${parentFirstName} ${parentLastName}`,
            type: 'READING',
            logCreatedAt: lastWeekdayOfLastMonth,
            logUpdatedAt: lastWeekdayOfLastMonth,
            periodIndex: currentPeriod.index
        });

        const lastMonthTerm = await utils.createTerm({
            termName: lastMonthTermName,
            startDate: lastMonthFirstDate,
            endDate: lastMonthLastDate,
            periodIndex: currentPeriod.index,
            logCreatedById: user.id,
            logUpdatedById: user.id
        });

        const version1TopicImpactReport = await db
            .insertInto('lwp_school_impact_report')
            .values({
                isPublished: true,
                launchDate: lastWeekdayOfLastMonth,
                activeFamiliesPercentage: 50,
                activePremiumFamiliesPercentage: 50,
                activeFamiliesPercentageAllSchools: 20,
                activePremiumFamiliesPercentageAllSchools: 50,
                numberOfWeeks: 0,
                weeklyReadingTarget: null,
                numberOfClasses: 1,
                reportType: 'TOPIC_ACTIVITY',
                yearGroupCoverage: 'Preschool',
                spmNote: topicAndActivitiesSpmNote,
                spmNextStepsProgram: null,
                periodIndex: currentPeriod.index,
                schoolId: school.id,
                logCreatedById: user.id,
                logUpdatedById: user.id,
                termId: lastMonthTerm.id,
                version: 'VERSION_1'
            })
            .returningAll()
            .executeTakeFirstOrThrow();

        await db
            .insertInto('lwp_school_impact_report_graphs')
            .values({
                premiumPupilsCount: 1,
                pupilsCount: 2,
                engagementByYearGroup: JSON.stringify([
                    {
                        name: 'Preschool',
                        allPupilsCount: 2,
                        premiumPupilCount: 1,
                        activeFamiliesPercentage: 50,
                        activePremiumFamiliesPercentage: 50
                    }
                ]),
                engagementByClass: JSON.stringify([
                    {
                        name: schoolClass?.name,
                        allPupilsCount: 2,
                        premiumPupilCount: 1,
                        activeFamiliesPercentage: 50,
                        activePremiumFamiliesPercentage: 50
                    }
                ]),
                avgCompletionRateByYearGroup: null,
                avgCompletionRateByClass: null,
                avgTopicSetByYearGroup: JSON.stringify([
                    {
                        name: 'Preschool',
                        allPupilsCount: 2,
                        activeFamiliesPercentage: 1
                    }
                ]),
                avgTopicSetByClass: JSON.stringify([
                    {
                        name: schoolClass?.name,
                        allPupilsCount: 2,
                        activeFamiliesPercentage: 1
                    }
                ]),
                buildingEngagement: JSON.stringify([
                    {
                        name: '0',
                        activeFamiliesPercentage: 100,
                        activePremiumFamiliesPercentage: 100
                    },
                    {
                        name: '1',
                        activeFamiliesPercentage: 50,
                        activePremiumFamiliesPercentage: 50
                    },
                    {
                        name: '2',
                        activeFamiliesPercentage: 0,
                        activePremiumFamiliesPercentage: 0
                    },
                    {
                        name: '3',
                        activeFamiliesPercentage: 0,
                        activePremiumFamiliesPercentage: 0
                    },
                    {
                        name: '4',
                        activeFamiliesPercentage: 0,
                        activePremiumFamiliesPercentage: 0
                    },
                    {
                        name: '5',
                        activeFamiliesPercentage: 0,
                        activePremiumFamiliesPercentage: 0
                    }
                ]),
                impactReportId: version1TopicImpactReport.id,
                subjectId: null
            })
            .returningAll()
            .executeTakeFirstOrThrow();

        await db
            .insertInto('lwp_school_impact_report_feedback')
            .values({
                content: parentFeedback,
                contentType: 'PARENT_COMMENT',
                pupilFirstName: pupil1FirstName,
                className: schoolClass.name,
                includedInImpactReport: false,
                classYearGroup: 'Preschool',
                impactReportId: version1TopicImpactReport.id,
                pupilFeedbackId: pupil1ActivityFeedback.id
            })
            .returningAll()
            .executeTakeFirstOrThrow();

        await db
            .insertInto('lwp_school_impact_report_feedback')
            .values({
                content: pupilFeedback,
                contentType: 'PUPIL_COMMENT',
                pupilFirstName: pupil1FirstName,
                className: schoolClass.name,
                includedInImpactReport: false,
                classYearGroup: 'Preschool',
                impactReportId: version1TopicImpactReport.id,
                pupilFeedbackId: pupil1ActivityFeedback.id
            })
            .returningAll()
            .executeTakeFirstOrThrow();

        const version1ReadingImpactReport = await db
            .insertInto('lwp_school_impact_report')
            .values({
                isPublished: true,
                launchDate: lastWeekdayOfLastMonth,
                activeFamiliesPercentage: 50,
                activePremiumFamiliesPercentage: 50,
                activeFamiliesPercentageAllSchools: 20,
                activePremiumFamiliesPercentageAllSchools: 50,
                numberOfWeeks: 0,
                weeklyReadingTarget: 5,
                numberOfClasses: 1,
                reportType: 'READING',
                yearGroupCoverage: 'Preschool',
                spmNote: readingSpmNote,
                spmNextStepsProgram: null,
                periodIndex: currentPeriod.index,
                schoolId: school.id,
                logCreatedById: user.id,
                logUpdatedById: user.id,
                termId: lastMonthTerm.id,
                version: 'VERSION_1'
            })
            .returningAll()
            .executeTakeFirstOrThrow();

        await db
            .insertInto('lwp_school_impact_report_graphs')
            .values({
                premiumPupilsCount: 1,
                pupilsCount: 2,
                engagementByYearGroup: JSON.stringify([
                    {
                        name: 'Preschool',
                        allPupilsCount: 2,
                        premiumPupilCount: 1,
                        activeFamiliesPercentage: 50,
                        activePremiumFamiliesPercentage: 50
                    }
                ]),
                engagementByClass: JSON.stringify([
                    {
                        name: schoolClass?.name,
                        allPupilsCount: 2,
                        premiumPupilCount: 1,
                        activeFamiliesPercentage: 50,
                        activePremiumFamiliesPercentage: 50
                    }
                ]),
                avgCompletionRateByYearGroup: JSON.stringify([
                    {
                        name: 'Preschool',
                        allPupilsCount: 2,
                        premiumPupilCount: 1,
                        activeFamiliesPercentage: 50,
                        activePremiumFamiliesPercentage: 50
                    }
                ]),
                avgCompletionRateByClass: JSON.stringify([
                    {
                        name: schoolClass?.name,
                        allPupilsCount: 2,
                        premiumPupilCount: 1,
                        activeFamiliesPercentage: 50,
                        activePremiumFamiliesPercentage: 50
                    }
                ]),
                avgTopicSetByYearGroup: null,
                avgTopicSetByClass: null,
                buildingEngagement: JSON.stringify([
                    {
                        name: '0',
                        activeFamiliesPercentage: 100,
                        activePremiumFamiliesPercentage: 100
                    },
                    {
                        name: '1',
                        activeFamiliesPercentage: 50,
                        activePremiumFamiliesPercentage: 50
                    },
                    {
                        name: '2',
                        activeFamiliesPercentage: 0,
                        activePremiumFamiliesPercentage: 0
                    },
                    {
                        name: '3',
                        activeFamiliesPercentage: 0,
                        activePremiumFamiliesPercentage: 0
                    },
                    {
                        name: '4',
                        activeFamiliesPercentage: 0,
                        activePremiumFamiliesPercentage: 0
                    },
                    {
                        name: '5',
                        activeFamiliesPercentage: 0,
                        activePremiumFamiliesPercentage: 0
                    }
                ]),
                impactReportId: version1ReadingImpactReport.id,
                subjectId: null
            })
            .returningAll()
            .executeTakeFirstOrThrow();

        await db
            .insertInto('lwp_school_impact_report_feedback')
            .values({
                content: readingFeedback,
                contentType: 'READING_COMMENT',
                pupilFirstName: pupil1FirstName,
                className: schoolClass.name,
                includedInImpactReport: false,
                classYearGroup: 'Preschool',
                impactReportId: version1ReadingImpactReport.id,
                pupilFeedbackId: pupil1ReadingFeedback.id
            })
            .returningAll()
            .executeTakeFirstOrThrow();

        // Verify version 1 impact report from school impact report page
        await login(page, schoolEmail, password);
        await page.waitForURL(/\/school/);
        await waitForLoading(page);
        await acceptFeatureTooltipPrompt(page);
        await waitForLoading(page);
        await openSideDrawer(page);
        await waitForLoading(page);
        await page.getByTestId('sidebar-school-analytics-and-reports-btn').click();
        await waitForLoading(page);
        let tooltip = page.locator('.highcharts-tooltip');
        let firstChart = page.locator('.highcharts-container').first();
        await waitForLoading(page);
        await expect(page.locator('[data-test=spm-note]')).toHaveText(topicAndActivitiesSpmNote);
        await expect(page.locator('.highcharts-container')).toHaveCount(5);
        await firstChart.waitFor({ state: 'visible', timeout: highChartsRectTimeout });
        await expect(firstChart.locator('.highcharts-series.highcharts-series-0 rect')).toHaveCount(1);
        await firstChart.locator('.highcharts-series-0 rect').nth(0).scrollIntoViewIfNeeded();
        await firstChart.locator('.highcharts-series-0 rect').nth(0).hover();
        await expect(tooltip).toBeVisible();
        await expect(tooltip).toContainText('50%');
        await firstChart.locator('.highcharts-series-0 rect').nth(1).scrollIntoViewIfNeeded();
        await firstChart.locator('.highcharts-series-0 rect').nth(1).hover();
        await expect(tooltip).toBeVisible();
        await expect(tooltip).toContainText('0%');
        await expect(page.locator('[data-test=PARENT_COMMENT-content]')).toHaveText(`"${parentFeedback}"`);
        await expect(page.locator('[data-test=PUPIL_COMMENT-content]')).toHaveText(`"${pupilFeedback}"`);
        await page.getByRole('button', { name: 'Reading' }).click();
        await waitForLoading(page);
        await expect(page.locator('[data-test=spm-note]')).toHaveText(readingSpmNote);
        await expect(page.locator('.highcharts-container')).toHaveCount(5);
        await firstChart.waitFor({ state: 'visible', timeout: highChartsRectTimeout });
        await expect(firstChart.locator('.highcharts-series.highcharts-series-0 rect')).toHaveCount(1);
        await firstChart.locator('.highcharts-series-0 rect').nth(0).scrollIntoViewIfNeeded();
        await firstChart.locator('.highcharts-series-0 rect').nth(0).hover();
        await expect(tooltip).toBeVisible();
        await expect(tooltip).toContainText('50%');
        await firstChart.locator('.highcharts-series-0 rect').nth(1).scrollIntoViewIfNeeded();
        await firstChart.locator('.highcharts-series-0 rect').nth(1).hover();
        await expect(tooltip).toBeVisible();
        await expect(tooltip).toContainText('0%');
        await expect(page.locator('[data-test=READING_COMMENT-content]')).toHaveText(`"${readingFeedback}"`);
        await page.getByTestId('school-overview-tab').click();
        await page.waitForURL(/\/school/);
        await waitForLoading(page);
        await adminOrTeacherSignOut(page);

        // Generate data for v2 school impact report
        await utils.createTerm({
            termName: thisMonthTermName,
            startDate: thisMonthFirstDate,
            endDate: dateToday,
            periodIndex: currentPeriod.index,
            logCreatedById: user.id,
            logUpdatedById: user.id
        });
        await generateDataForThisTerm(db, utils, ['1', '4'], schoolClass.id, pupil1.id, pupil2.id, parent.id, user.id);

        // Generate and publish v2 school impact report without feedbacks
        await login(page, admin, password);
        await page.waitForURL(/\/admin\/all-feeds/);
        await waitForLoading(page);
        await expect(page.getByTestId('common-drawer-list')).toBeVisible();
        await openSideDrawer(page);
        await page.getByTestId('schools-common-drawer-list').click();
        await page.waitForURL(/\/schools\/active/);
        await waitForLoading(page);
        await expect(page.getByTestId('schools-page')).toBeVisible();
        await safeClick(page.locator('[data-testid="school-details-link"]', { hasText: mySchoolName }));
        await waitForLoading(page);
        await page.waitForSelector('[data-test="impact-school-overview-tab"]', { state: 'visible' });
        await page.getByTestId('impact-school-overview-tab').click();
        await waitForLoading(page);
        await page.getByRole('button', { name: 'Generate report' }).click();
        await waitForLoading(page);
        await expect(page.locator('.MuiAlert-message').filter({ hasText: 'Report generated successfully' })).toBeVisible();
        await waitForLoading(page);
        await page.getByRole('button', { name: 'Publish' }).click();
        await waitForLoading(page);
        await expect(page.locator('.MuiAlert-message').filter({ hasText: 'Report published successfully' })).toBeVisible();
        await waitForLoading(page);
        await adminOrTeacherSignOut(page);
        await login(page, schoolEmail, password);
        await page.waitForURL(/\/school/);
        await waitForLoading(page);
        await acceptFeatureTooltipPrompt(page);
        await page.getByTestId('sidebar-school-analytics-and-reports-btn').click();
        await waitForLoading(page);
        await expect(page.locator('.highcharts-container')).toHaveCount(15);
        const secondChart = page.locator('.highcharts-container').nth(1);
        await secondChart.waitFor({ state: 'visible', timeout: highChartsRectTimeout });
        await expect(secondChart.locator('.highcharts-series.highcharts-series-0 rect')).toHaveCount(1);
        await secondChart.locator('.highcharts-series-0 rect').nth(0).scrollIntoViewIfNeeded();
        await secondChart.locator('.highcharts-series-0 rect').nth(0).hover();
        await expect(tooltip).toBeVisible();
        await expect(tooltip).toContainText('0%');
        await expect(page.getByTestId('PARENT_COMMENT-content')).not.toBeVisible();
        await expect(page.getByTestId('PUPIL_COMMENT-content')).not.toBeVisible();
        await adminOrTeacherSignOut(page);

        // Include feedbacks in school impact report and generate and use magic link to verify
        await login(page, admin, password);
        await page.waitForURL(/\/admin\/all-feeds/);
        await waitForLoading(page);
        await expect(page.getByTestId('all-feeds-page')).toBeVisible();
        await page.getByTestId('filter-button').click();
        await waitForLoading(page);
        await page.getByTestId('sharing-permission-select').click();
        await page.getByRole('option', { name: 'All' }).click({ force: true });
        await page.getByTestId('subject-multi-select').click();
        await waitForLoading(page);
        await page.getByRole('option', { name: 'Maths' }).click({ force: true });
        await page.getByTestId('schools-multi-select').click();
        await waitForLoading(page);
        await page.getByRole('option', { name: mySchoolName }).click({ force: true });
        await page.getByRole('button', { name: 'Apply' }).click({ force: true });
        await waitForLoading(page);
        await page.locator(`input[name="include-pupil-comment-checkbox"]`).waitFor({ state: 'visible', timeout: 60_000 });
        const includePupilCommentCheckbox = getInputBoxByName(page, 'include-pupil-comment-checkbox');
        await includePupilCommentCheckbox.scrollIntoViewIfNeeded();
        await includePupilCommentCheckbox.check();
        const includeParentCommentCheckbox = getInputBoxByName(page, 'include-parent-comment-checkbox');
        await includeParentCommentCheckbox.scrollIntoViewIfNeeded();
        await includeParentCommentCheckbox.check();
        await page.getByTestId('schools-common-drawer-list').click();
        await page.waitForURL(/\/schools\/active/);
        await waitForLoading(page);
        await expect(page.getByTestId('schools-page')).toBeVisible();
        await safeClick(page.locator('[data-testid="school-details-link"]', { hasText: mySchoolName }));
        await waitForLoading(page);
        await page.waitForSelector('[data-test="impact-school-overview-tab"]', { state: 'visible' });
        await page.getByTestId('impact-school-overview-tab').click();
        await waitForLoading(page);
        await page.getByRole('button', { name: 'Generate report' }).click();
        await waitForLoading(page);
        await expect(page.locator('.MuiAlert-message').filter({ hasText: 'Report generated successfully' })).toBeVisible();
        await waitForLoading(page);
        await page.getByRole('button', { name: 'Publish' }).click();
        await waitForLoading(page);
        await expect(page.locator('.MuiAlert-message').filter({ hasText: 'Report published successfully' })).toBeVisible();
        await waitForLoading(page);
        getTextAreaBoxByName(page, 'spmNote').fill(v2SpmNote);
        await page.getByRole('button', { name: 'Save' }).click();
        await waitForLoading(page);
        await expect(page.locator('.MuiAlert-message').filter({ hasText: 'Note updated successfully' })).toBeVisible();
        await waitForLoading(page);
        await page.getByRole('button', { name: 'Generate magic link' }).click();
        await waitForLoading(page);
        await page.waitForSelector('[data-test="school-impact-report-magic-link"]', { state: 'visible' });
        let v2ImpactReportMagicLinkToken = await page.locator('[data-test=school-impact-report-magic-link]').innerText();
        await page.getByRole('button', { name: 'Finish' }).click();
        await waitForLoading(page);
        await adminOrTeacherSignOut(page);
        await page.goto(v2ImpactReportMagicLinkToken.trim());
        await waitForLoading(page);
        await expect(page.locator('[data-test=spm-note]')).toHaveText(v2SpmNote);
        await expect(page.locator('[data-test=PUPIL_COMMENT-content]')).toHaveText(`"Pupil Comment Maths"`);
        await expect(page.locator('[data-test=PARENT_COMMENT-content]')).toHaveText(`"Parent Comment Maths"`);

        // Go to school impact report as a school leader and verify
        await login(page, schoolEmail, password);
        await page.waitForURL(/\/school/);
        await waitForLoading(page);
        await page.getByTestId('sidebar-school-analytics-and-reports-btn').click();
        await waitForLoading(page);
        await expect(page.locator('[data-test=spm-note]')).toHaveText(v2SpmNote);
        await expect(page.locator('.highcharts-container')).toHaveCount(15);
        await secondChart.waitFor({ state: 'visible', timeout: highChartsRectTimeout });
        await expect(secondChart.locator('.highcharts-series.highcharts-series-0 rect')).toHaveCount(1);
        await secondChart.locator('.highcharts-series-0 rect').nth(0).scrollIntoViewIfNeeded();
        await secondChart.locator('.highcharts-series-0 rect').nth(0).hover();
        await expect(tooltip).toBeVisible();
        await expect(tooltip).toContainText('50%');
        await secondChart.locator('.highcharts-series-0 rect').nth(1).scrollIntoViewIfNeeded();
        await secondChart.locator('.highcharts-series-0 rect').nth(1).hover();
        await expect(tooltip).toBeVisible();
        await expect(tooltip).toContainText('0%');
        await expect(page.locator('[data-test=PUPIL_COMMENT-content]')).toHaveText(`"Pupil Comment Maths"`);
        await expect(page.locator('[data-test=PARENT_COMMENT-content]')).toHaveText(`"Parent Comment Maths"`);
        await adminOrTeacherSignOut(page);

        // Update a comment from school impact report
        await login(page, admin, password);
        await page.waitForURL(/\/admin\/all-feeds/);
        await waitForLoading(page);
        await expect(page.getByTestId('common-drawer-list')).toBeVisible();
        await openSideDrawer(page);
        await page.getByTestId('schools-common-drawer-list').click();
        await page.waitForURL(/\/schools\/active/);
        await waitForLoading(page);
        await expect(page.getByTestId('schools-page')).toBeVisible();
        await safeClick(page.locator('[data-testid="school-details-link"]', { hasText: mySchoolName }));
        await waitForLoading(page);
        await page.waitForSelector('[data-test="impact-school-overview-tab"]', { state: 'visible' });
        await page.getByTestId('impact-school-overview-tab').click();
        await waitForLoading(page);
        await page.getByRole('button', { name: 'Preview' }).click();
        await waitForLoading(page);
        await safeClick(page.locator('[data-test="comment-edit-icon"]').first());
        getTextAreaBoxByName(page, 'content').fill(updatedParentFeedback);
        await page.getByRole('button', { name: 'Update' }).click();
        await waitForLoading(page);
        await expect(page.locator('.MuiAlert-message').filter({ hasText: 'Parent comment updated successfully' })).toBeVisible();
        await waitForLoading(page);
        await page.getByTestId('dialog-cancel-btn').click();
        await waitForLoading(page);
        await adminOrTeacherSignOut(page);
        await login(page, schoolEmail, password);
        await page.waitForURL(/\/school/);
        await waitForLoading(page);
        await page.getByTestId('sidebar-school-analytics-and-reports-btn').click();
        await waitForLoading(page);
        await expect(page.locator('[data-test=PARENT_COMMENT-content]')).toHaveText(`"${updatedParentFeedback}"`);
        await adminOrTeacherSignOut(page);

        // Delete a comment from school impact report
        await login(page, admin, password);
        await page.waitForURL(/\/admin\/all-feeds/);
        await waitForLoading(page);
        await expect(page.getByTestId('common-drawer-list')).toBeVisible();
        await openSideDrawer(page);
        await page.getByTestId('schools-common-drawer-list').click();
        await page.waitForURL(/\/schools\/active/);
        await waitForLoading(page);
        await expect(page.getByTestId('schools-page')).toBeVisible();
        await safeClick(page.locator('[data-testid="school-details-link"]', { hasText: mySchoolName }));
        await waitForLoading(page);
        await page.waitForSelector('[data-test="impact-school-overview-tab"]', { state: 'visible' });
        await page.getByTestId('impact-school-overview-tab').click();
        await waitForLoading(page);
        await page.getByRole('button', { name: 'Preview' }).click();
        await waitForLoading(page);
        await safeClick(
            page
                .locator('.content-card', {
                    has: page.getByTestId('PARENT_COMMENT-content').filter({ hasText: updatedParentFeedback }).first()
                })
                .getByTestId('comment-delete-icon')
        );
        await page.getByTestId('dialog-primary-btn').getByText('Delete').click();
        await waitForLoading(page);
        await expect(page.locator('.MuiAlert-message').filter({ hasText: 'Feedback deleted.' })).toBeVisible();
        await waitForLoading(page);
        await page.getByTestId('dialog-cancel-btn').click();
        await waitForLoading(page);
        await adminOrTeacherSignOut(page);
        await login(page, schoolEmail, password);
        await page.waitForURL(/\/school/);
        await waitForLoading(page);
        await page.getByTestId('sidebar-school-analytics-and-reports-btn').click();
        await waitForLoading(page);
        await expect(page.getByTestId('PARENT_COMMENT-content').filter({ hasText: updatedParentFeedback })).not.toBeVisible();
        await expect(page.getByTestId('engagementByYearGroup-heading')).toHaveCount(4);
        await adminOrTeacherSignOut(page);

        // Delete a graph from school impact report
        await login(page, admin, password);
        await page.waitForURL(/\/admin\/all-feeds/);
        await waitForLoading(page);
        await expect(page.getByTestId('common-drawer-list')).toBeVisible();
        await openSideDrawer(page);
        await page.getByTestId('schools-common-drawer-list').click();
        await page.waitForURL(/\/schools\/active/);
        await waitForLoading(page);
        await expect(page.getByTestId('schools-page')).toBeVisible();
        await safeClick(page.locator('[data-testid="school-details-link"]', { hasText: mySchoolName }));
        await waitForLoading(page);
        await page.waitForSelector('[data-test="impact-school-overview-tab"]', { state: 'visible' });
        await page.getByTestId('impact-school-overview-tab').click();
        await waitForLoading(page);
        await page.getByRole('button', { name: 'Preview' }).click();
        await waitForLoading(page);
        await page.getByTestId('engagementByYearGroup-delete-button').getByText('Delete').first().click();
        await waitForLoading(page);
        await page.getByTestId('dialog-primary-btn').getByText('Delete').click();
        await waitForLoading(page);
        await expect(
            page.locator('.MuiAlert-message').filter({ hasText: 'Weekly target met (by year group) deleted successfully' })
        ).toBeVisible();
        await page.getByTestId('dialog-cancel-btn').click();
        await waitForLoading(page);
        await adminOrTeacherSignOut(page);
        await login(page, schoolEmail, password);
        await page.waitForURL(/\/school/);
        await waitForLoading(page);
        await page.getByTestId('sidebar-school-analytics-and-reports-btn').click();
        await waitForLoading(page);
        await expect(page.getByTestId('engagementByYearGroup-heading')).toHaveCount(3);
        await adminOrTeacherSignOut(page);

        // Check expired magic link behaviour with authenticated and unauthenticated user
        await login(page, admin, password);
        await page.waitForURL(/\/admin\/all-feeds/);
        await waitForLoading(page);
        await expect(page.getByTestId('common-drawer-list')).toBeVisible();
        await openSideDrawer(page);
        await page.getByTestId('schools-common-drawer-list').click();
        await page.waitForURL(/\/schools\/active/);
        await waitForLoading(page);
        await expect(page.getByTestId('schools-page')).toBeVisible();
        await safeClick(page.locator('[data-testid="school-details-link"]', { hasText: mySchoolName }));
        await waitForLoading(page);
        await page.waitForSelector('[data-test="impact-school-overview-tab"]', { state: 'visible' });
        await page.getByTestId('impact-school-overview-tab').click();
        await waitForLoading(page);
        await page.getByRole('button', { name: 'Generate magic link' }).click();
        await waitForLoading(page);
        await page.waitForSelector('[data-test="school-impact-report-magic-link"]', { state: 'visible' });
        v2ImpactReportMagicLinkToken = await page.locator('[data-test=school-impact-report-magic-link]').innerText();
        await page.getByRole('button', { name: 'Finish' }).click();
        await waitForLoading(page);
        await adminOrTeacherSignOut(page);
        const v2ImpapctReportMagicLinkUrl = v2ImpactReportMagicLinkToken.trim().split('/').pop();
        expect(v2ImpapctReportMagicLinkUrl).toBeDefined();
        if (!v2ImpapctReportMagicLinkUrl) return;
        await db.updateTable('lwp_magic_link').set({ expiryTime: dateToday }).where('url', '=', v2ImpapctReportMagicLinkUrl).execute();
        await page.goto(v2ImpactReportMagicLinkToken.trim());
        await waitForLoading(page);
        await expect(page.locator('.heading-one')).toContainText('This link has expired');
        await page.locator('.expired-school-impact-report-paragraph-link').getByText('log in').click();
        await page.getByTestId('login-email-input').fill(schoolEmail);
        await page.getByTestId('login-next-button').click();
        await page.getByTestId('login-password-input').fill(password);
        await page.getByTestId('login-submit-button').click();
        await waitForLoading(page);
        await page.waitForURL(/\/school/);
        await waitForLoading(page);
        await expect(page.getByRole('heading', { name: 'School impact report' })).toBeVisible();
        await page.goto(v2ImpactReportMagicLinkToken.trim());
        await page.getByRole('button', { name: 'Go to school impact report page' }).click();
        await waitForLoading(page);
        await expect(page.getByRole('heading', { name: 'School impact report' })).toBeVisible();
        await adminOrTeacherSignOut(page);

        // You can only generate recently ended term report
        await login(page, admin, password);
        await page.waitForURL(/\/admin\/all-feeds/);
        await waitForLoading(page);
        await expect(page.getByTestId('common-drawer-list')).toBeVisible();
        await openSideDrawer(page);
        await page.getByTestId('schools-common-drawer-list').click();
        await page.waitForURL(/\/schools\/active/);
        await waitForLoading(page);
        await expect(page.getByTestId('schools-page')).toBeVisible();
        await safeClick(page.locator('[data-testid="school-details-link"]', { hasText: mySchoolName }));
        await waitForLoading(page);
        await page.waitForSelector('[data-test="impact-school-overview-tab"]', { state: 'visible' });
        await page.getByTestId('impact-school-overview-tab').click();
        await waitForLoading(page);
        const generateReportButton = page.getByRole('button', { name: 'Generate report' });
        await expect(generateReportButton).toBeVisible();
        await expect(generateReportButton).not.toBeDisabled();
        await page.getByTestId('impact-report-term-select').click();
        await page.getByRole('option', { name: lastMonthTerm.termName }).click();
        await waitForLoading(page);
        await page.getByTestId('topic-and-activities-option').click();
        await waitForLoading(page);
        await expect(generateReportButton).toBeVisible();
        await expect(generateReportButton).toBeDisabled();

        // Admin can delete a school impact report for a specific term
        await page.getByTestId('schools-common-drawer-list').click();
        await page.waitForURL(/\/schools\/active/);
        await waitForLoading(page);
        await expect(page.getByTestId('schools-page')).toBeVisible();
        await safeClick(page.locator('[data-testid="school-details-link"]', { hasText: mySchoolName }));
        await waitForLoading(page);
        await page.waitForSelector('[data-test="impact-school-overview-tab"]', { state: 'visible' });
        await page.getByTestId('impact-school-overview-tab').click();
        await waitForLoading(page);
        const deleteReportButton = page.getByRole('button', { name: 'Delete report' });
        await expect(deleteReportButton).toBeVisible();
        await deleteReportButton.click();
        await waitForLoading(page);
        await page.getByTestId('dialog-primary-btn').click();
        await waitForLoading(page);
        await expect(page.locator('.MuiAlert-message').filter({ hasText: 'Report deleted successfully' })).toBeVisible();
        await waitForLoading(page);
        await expect(deleteReportButton).not.toBeVisible();
    });
});

const dataCleanup = async (db: Kysely<Schema.DB>): Promise<void> => {
    await db.deleteFrom('lwp_school_impact_report_feedback').execute();
    await db.deleteFrom('lwp_school_impact_report_graphs').execute();
    await db.deleteFrom('lwp_school_impact_report').execute();
    await db.deleteFrom('lwp_school_dates').where('periodIndex', 'is not', null).execute();
};

const getLastWeekdayOfLastMonth = (): string => {
    const today: Date = new Date();
    const targetDay: number = today.getDay(); // 0 (Sun) .. 6 (Sat)

    // Last day of the previous month
    const lastMonthLastDay: Date = new Date(today.getFullYear(), today.getMonth(), 0);

    // Move backwards until the weekday matches today
    while (lastMonthLastDay.getDay() !== targetDay) {
        lastMonthLastDay.setDate(lastMonthLastDay.getDate() - 1);
    }

    return formatDate(lastMonthLastDay, '-');
};

const generateDataForThisTerm = async (
    db: Kysely<Schema.DB>,
    utils: ReturnType<typeof createUtils>,
    domainIds: string[],
    schoolClassId: string,
    pupil1Id: string,
    pupil2Id: string,
    parentId: string,
    logCreatedById: string
): Promise<void> => {
    for (const domainId of domainIds) {
        const myTopicName = generateTopicName();
        const activity_one: AddActivityInput = { activityName: `${myTopicName} one`, staticComponentName: 'GuessTheAnimal' };
        const activity_two: AddActivityInput = { activityName: `${myTopicName} two`, staticComponentName: 'ClapClap' };
        const today = new Date();
        const dateToday = formatDate(today, '-');
        const pupilComment = domainId === '1' ? 'Pupil Comment Maths' : 'Pupil Comment Money skills';
        const parentComment = domainId === '1' ? 'Parent Comment Maths' : 'Parent Comment Money skills';

        const currentPeriod = await db
            .selectFrom('static_lwp_period')
            .where('isCurrentPeriod', '=', true)
            .select('index')
            .executeTakeFirstOrThrow();
        const staticTopic = await utils.createStaticTopic({
            isReading: false,
            teacherTopicName: myTopicName,
            parentTopicName: myTopicName,
            isPublished: true,
            video: '605069004',
            logCreatedById: logCreatedById,
            logUpdatedById: logCreatedById
        });
        await db
            .insertInto('static_lwp_topic_domain_year_group')
            .values({
                domainId: domainId,
                topicId: staticTopic.id,
                yearGroupId: '1'
            })
            .executeTakeFirstOrThrow();
        const staticActivity1 = await utils.createStaticActivity({
            name: activity_one.activityName,
            activityType: 'LEGACY',
            order: 1,
            topicId: staticTopic.id,
            logCreatedById: logCreatedById,
            logUpdatedById: logCreatedById
        });
        const staticActivity2 = await utils.createStaticActivity({
            name: activity_two.activityName,
            activityType: 'LEGACY',
            order: 2,
            topicId: staticTopic.id,
            logCreatedById: logCreatedById,
            logUpdatedById: logCreatedById
        });
        const classTopic1 = await utils.createClassTopic(schoolClassId, {
            topicId: staticTopic?.id,
            releaseDate: dateToday,
            released: true
        });
        const pupilTopic1 = await utils.createPupilTopic({
            releaseDate: dateToday,
            pupilId: pupil1Id,
            classTopicId: classTopic1.id,
            topicId: staticTopic.id,
            watchedVideo: true,
            periodIndex: currentPeriod.index,
            silverStars: 1,
            earnedGoldStar: true
        });
        const pupilActivity1 = await utils.createPupilActivity({
            pupilId: pupil1Id,
            topicId: pupilTopic1.id,
            activityId: staticActivity1.id,
            earnedStar: true,
            mathscotActivityItemIds: JSON.stringify([88, 188, 224])
        });
        await utils.createPupilActivity({
            pupilId: pupil1Id,
            topicId: pupilTopic1.id,
            activityId: staticActivity2.id,
            earnedStar: false,
            mathscotActivityItemIds: JSON.stringify([88, 188, 224])
        });
        await utils.createPupilFeedback(pupil1Id, {
            pupilComment,
            parentComment,
            userType: UserType.PARENT,
            userId: parentId,
            type: 'ACTIVITY',
            activityId: pupilActivity1.id,
            periodIndex: currentPeriod.index,
            logCreatedAt: dateToday,
            logUpdatedAt: dateToday
        });
        const pupilTopic2 = await utils.createPupilTopic({
            releaseDate: dateToday,
            pupilId: pupil2Id,
            classTopicId: classTopic1.id,
            topicId: staticTopic.id,
            watchedVideo: false,
            periodIndex: currentPeriod.index,
            silverStars: 0,
            earnedGoldStar: false
        });
        await utils.createPupilActivity({
            pupilId: pupil2Id,
            topicId: pupilTopic2.id,
            activityId: staticActivity1.id,
            earnedStar: false,
            mathscotActivityItemIds: JSON.stringify([88, 188, 224])
        });
        await utils.createPupilActivity({
            pupilId: pupil2Id,
            topicId: pupilTopic2.id,
            activityId: staticActivity2.id,
            earnedStar: false,
            mathscotActivityItemIds: JSON.stringify([88, 188, 224])
        });
    }
};
