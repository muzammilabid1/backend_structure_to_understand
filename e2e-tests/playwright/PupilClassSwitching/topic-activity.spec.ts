import { test, expect, Page } from '@playwright/test';
import type { Schema } from '@lwp/postgres-client';
import { type Kysely } from 'kysely';
import {
    admin,
    generateClassName,
    generateFirstName,
    generateLastName,
    generateSchoolName,
    generateSentence,
    generateTopicName,
    generateUserEmail,
    password
} from '../constants';
import {
    acceptFeatureTooltipPrompt,
    acceptPupilInvitation,
    adminOrTeacherSignOut,
    formatDate,
    login,
    openSideDrawer,
    parentSignOut,
    releaseTopicsUpToADate,
    safeAssertion,
    safeClick,
    submitActivityFeedback,
    waitForLoading,
    watchVideoAndUnlockActivities
} from '../utils';
import { AddActivityInput } from '../types';
import { createDb } from '../db';
import { createUtils } from '../dbUtils';
import { UserStatus, UserType } from 'lwp-shared';

test.describe('Topic Activity - Pupil Topics after class switching', () => {
    let db: Kysely<Schema.DB>;
    let utils: ReturnType<typeof createUtils>;

    test.beforeAll(async () => {
        db = createDb();
        utils = createUtils(db);
    });
    test.afterAll(async () => {
        await db.destroy();
    });

    test('Topic Activity - Switch pupil class from teacher pupil details page', async ({ page }) => {
        const mySchoolName = `${generateSchoolName()} School`;
        const myClassName = `${generateClassName()} Class`;
        const myClass2Name = `${generateClassName()} Class`;
        const leaderFirstName: string = generateFirstName();
        const leaderlastName: string = generateLastName();
        const leaderEmail: string = generateUserEmail(leaderFirstName, leaderlastName);
        const parentFirstName: string = generateFirstName();
        const parentLastName: string = generateLastName();
        const parentEmail: string = generateUserEmail(parentFirstName, parentLastName);
        const pupilFirstName = generateFirstName();
        const pupilLastName = generateLastName();
        const topicWillDelete = `${generateTopicName()} Topic`;
        const topicSameInBothClasses = `${generateTopicName()} Topic`;
        const topicDifferentFromOtherClass = `${generateTopicName()} Topic`;
        const topicOnlyForOtherClass = `${generateTopicName()} Topic`;
        const activity_one: AddActivityInput = { activityName: `${topicWillDelete} one`, staticComponentName: 'GuessTheAnimal' };
        const activity_two: AddActivityInput = { activityName: `${topicWillDelete} two`, staticComponentName: 'ClapClap' };
        const feedback = {
            pupilComment: generateSentence(4),
            parentComment: generateSentence(4)
        };

        await setupDataForPupilClassSwitching(
            page,
            db,
            utils,
            {
                mySchoolName,
                myClassName,
                myClass2Name,
                leaderFirstName,
                leaderlastName,
                leaderEmail
            },
            {
                parentFirstName,
                parentLastName,
                parentEmail,
                pupilFirstName,
                pupilLastName
            },
            {
                topicDifferentFromOtherClass,
                topicOnlyForOtherClass,
                topicSameInBothClasses,
                topicWillDelete
            },
            activity_one,
            activity_two,
            parentEmail,
            feedback
        );
        await login(page, leaderEmail, password);
        await page.waitForURL(/\/school/);
        await waitForLoading(page);
        await expect(page.getByTestId('school-overview-page')).toBeVisible();
        await openSideDrawer(page);
        await acceptFeatureTooltipPrompt(page);
        await page.locator('[data-test="active-registration-class-name"]', { hasText: myClassName }).click();
        await page.waitForURL(/\/class/);
        await waitForLoading(page);
        await page.getByTestId('week-by-week-expanded-view-pupil-name-list').getByText(`${pupilFirstName} ${pupilLastName}`).click();
        await waitForLoading(page);
        await page.getByTestId('pupil-details-details-tab').click();
        await waitForLoading(page);
        await page.getByTestId('add-or-change-pupil-class-button').click();
        await waitForLoading(page);
        await page.getByTestId('add-or-change-pupil-class-select').click();
        await page.getByRole('option', { name: myClass2Name }).click();
        await page.getByTestId('dialog-primary-btn').click();
        await expect(
            page.locator('.MuiAlert-message').filter({ hasText: `Pupil has been added to "${myClass2Name}" class` })
        ).toBeVisible();
        await adminOrTeacherSignOut(page);
        await verifyNewPupilTopicsAfterClassSwitching(
            page,
            parentEmail,
            {
                topicDifferentFromOtherClass,
                topicOnlyForOtherClass,
                topicSameInBothClasses,
                topicWillDelete
            },
            feedback
        );
    });

    test('Topic Activity - Switch pupil class from admin pupil details page', async ({ page }) => {
        const mySchoolName = `${generateSchoolName()} School`;
        const myClassName = `${generateClassName()} Class`;
        const myClass2Name = `${generateClassName()} Class`;
        const leaderFirstName: string = generateFirstName();
        const leaderlastName: string = generateLastName();
        const leaderEmail: string = generateUserEmail(leaderFirstName, leaderlastName);
        const parentFirstName: string = generateFirstName();
        const parentLastName: string = generateLastName();
        const parentEmail: string = generateUserEmail(parentFirstName, parentLastName);
        const pupilFirstName = generateFirstName();
        const pupilLastName = generateLastName();
        const topicWillDelete = `${generateTopicName()} Topic`;
        const topicSameInBothClasses = `${generateTopicName()} Topic`;
        const topicDifferentFromOtherClass = `${generateTopicName()} Topic`;
        const topicOnlyForOtherClass = `${generateTopicName()} Topic`;
        const activity_one: AddActivityInput = { activityName: `${topicWillDelete} one`, staticComponentName: 'GuessTheAnimal' };
        const activity_two: AddActivityInput = { activityName: `${topicWillDelete} two`, staticComponentName: 'ClapClap' };
        const feedback = {
            pupilComment: generateSentence(4),
            parentComment: generateSentence(4)
        };

        await setupDataForPupilClassSwitching(
            page,
            db,
            utils,
            {
                mySchoolName,
                myClassName,
                myClass2Name,
                leaderFirstName,
                leaderlastName,
                leaderEmail
            },
            {
                parentFirstName,
                parentLastName,
                parentEmail,
                pupilFirstName,
                pupilLastName
            },
            {
                topicDifferentFromOtherClass,
                topicOnlyForOtherClass,
                topicSameInBothClasses,
                topicWillDelete
            },
            activity_one,
            activity_two,
            parentEmail,
            feedback
        );

        await login(page, admin, password);
        await page.waitForURL(/\/admin\/all-feeds/);
        await expect(page.getByTestId('common-drawer-list')).toBeVisible();
        await openSideDrawer(page);
        await page.getByTestId('schools-common-drawer-list').click();
        await page.waitForURL(/\/schools\/active/);
        await waitForLoading(page);
        await expect(page.getByTestId('schools-page')).toBeVisible();
        await safeClick(page.locator('[data-testid="school-details-link"]', { hasText: mySchoolName }));
        await page.waitForURL(/\/admin\/school\/\d+/);
        await waitForLoading(page);
        await page.getByTestId('classes-school-overview-tab').click();
        await waitForLoading(page);
        await page.getByRole('link', { name: myClassName }).click();
        await waitForLoading(page);
        await page.getByRole('tab', { name: 'Students' }).click();
        await waitForLoading(page);
        await page.getByRole('link', { name: `${pupilFirstName} ${pupilLastName}` }).click();
        await waitForLoading(page);
        await page.getByTestId('add-or-change-pupil-class-button').click();
        await waitForLoading(page);
        await page.getByTestId('add-or-change-pupil-class-select').click();
        await page.getByRole('option', { name: myClass2Name }).click();
        await page.getByTestId('dialog-primary-btn').click();
        await expect(
            page.locator('.MuiAlert-message').filter({ hasText: `Pupil has been added to "${myClass2Name}" class` })
        ).toBeVisible();
        await adminOrTeacherSignOut(page);
        await verifyNewPupilTopicsAfterClassSwitching(
            page,
            parentEmail,
            {
                topicDifferentFromOtherClass,
                topicOnlyForOtherClass,
                topicSameInBothClasses,
                topicWillDelete
            },
            feedback
        );
    });

    test('Topic Activity - Switch pupil class from class pupils page', async ({ page }) => {
        const mySchoolName = `${generateSchoolName()} School`;
        const myClassName = `${generateClassName()} Class`;
        const myClass2Name = `${generateClassName()} Class`;
        const leaderFirstName: string = generateFirstName();
        const leaderlastName: string = generateLastName();
        const leaderEmail: string = generateUserEmail(leaderFirstName, leaderlastName);
        const parentFirstName: string = generateFirstName();
        const parentLastName: string = generateLastName();
        const parentEmail: string = generateUserEmail(parentFirstName, parentLastName);
        const pupilFirstName = generateFirstName();
        const pupilLastName = generateLastName();
        const topicWillDelete = `${generateTopicName()} Topic`;
        const topicSameInBothClasses = `${generateTopicName()} Topic`;
        const topicDifferentFromOtherClass = `${generateTopicName()} Topic`;
        const topicOnlyForOtherClass = `${generateTopicName()} Topic`;
        const activity_one: AddActivityInput = { activityName: `${topicWillDelete} one`, staticComponentName: 'GuessTheAnimal' };
        const activity_two: AddActivityInput = { activityName: `${topicWillDelete} two`, staticComponentName: 'ClapClap' };
        const feedback = {
            pupilComment: generateSentence(4),
            parentComment: generateSentence(4)
        };

        await setupDataForPupilClassSwitching(
            page,
            db,
            utils,
            {
                mySchoolName,
                myClassName,
                myClass2Name,
                leaderFirstName,
                leaderlastName,
                leaderEmail
            },
            {
                parentFirstName,
                parentLastName,
                parentEmail,
                pupilFirstName,
                pupilLastName
            },
            {
                topicDifferentFromOtherClass,
                topicOnlyForOtherClass,
                topicSameInBothClasses,
                topicWillDelete
            },
            activity_one,
            activity_two,
            parentEmail,
            feedback
        );

        await login(page, leaderEmail, password);
        await page.waitForURL(/\/school/);
        await waitForLoading(page);
        await expect(page.getByTestId('school-overview-page')).toBeVisible();
        await openSideDrawer(page);
        await acceptFeatureTooltipPrompt(page);
        await page.locator('[data-test="active-registration-class-name"]', { hasText: myClassName }).click();
        await page.waitForURL(/\/class/);
        await waitForLoading(page);
        await page.getByTestId('common-nav-pupils-tab').click();
        await waitForLoading(page);
        await page.getByTestId(`select-pupil-${pupilFirstName}-${pupilLastName}-checkbox-in-class-pupils-page`).click();
        await page.getByTestId('change-pupil-class-button').click();
        await waitForLoading(page);
        await page.getByTestId('add-or-change-pupil-class-select').click();
        await page.getByRole('option', { name: myClass2Name }).click();
        await page.getByTestId('dialog-primary-btn').click();
        await expect(
            page.locator('.MuiAlert-message').filter({ hasText: `Pupil has been added to "${myClass2Name}" class` })
        ).toBeVisible();
        await adminOrTeacherSignOut(page);
        await verifyNewPupilTopicsAfterClassSwitching(
            page,
            parentEmail,
            {
                topicDifferentFromOtherClass,
                topicOnlyForOtherClass,
                topicSameInBothClasses,
                topicWillDelete
            },
            feedback
        );
    });
});

const setupDataForPupilClassSwitching = async (
    page: Page,
    db: Kysely<Schema.DB>,
    utils: ReturnType<typeof createUtils>,
    schoolInfo: {
        mySchoolName: string;
        myClassName: string;
        myClass2Name: string;
        leaderFirstName: string;
        leaderlastName: string;
        leaderEmail: string;
    },
    parentPupilInfo: {
        parentFirstName: string;
        parentLastName: string;
        parentEmail: string;
        pupilFirstName: string;
        pupilLastName: string;
    },
    topicInfo: {
        topicSameInBothClasses: string;
        topicDifferentFromOtherClass: string;
        topicOnlyForOtherClass: string;
        topicWillDelete: string;
    },
    activity_one: AddActivityInput,
    activity_two: AddActivityInput,
    parentEmail: string,
    feedback: {
        pupilComment: string;
        parentComment: string;
    }
) => {
    const today = new Date();
    const user = await db.selectFrom('lwp_user').where('id', '=', '1').select(['id', 'password']).executeTakeFirstOrThrow();
    const topicInfos = await setupTopicsData(
        [
            topicInfo.topicSameInBothClasses,
            topicInfo.topicDifferentFromOtherClass,
            topicInfo.topicOnlyForOtherClass,
            topicInfo.topicWillDelete
        ],
        db,
        utils,
        activity_one,
        activity_two,
        user.id
    );
    const currentPeriod = await db
        .selectFrom('static_lwp_period')
        .where('isCurrentPeriod', '=', true)
        .select('index')
        .executeTakeFirstOrThrow();
    const school = await utils.createSchool({
        schoolName: schoolInfo.mySchoolName,
        curentPeriodIndex: currentPeriod.index,
        numOfFullProgrammeClassesAllowed: 10,
        numOfTotalClassesAllowed: 30,
        enableAddClasses: true,
        logCreatedById: user.id,
        logUpdatedById: user.id
    });
    const pupil1 = await utils.createPupil(school.id, {
        firstname: parentPupilInfo.pupilFirstName,
        lastname: parentPupilInfo.pupilLastName,
        dateOfBirth: new Date('2000-01-01'),
        startedSchool: (currentPeriod.index - 1).toString()
    });
    const parent = await utils.createUser({
        firstname: parentPupilInfo.parentFirstName,
        lastname: parentPupilInfo.parentLastName,
        email: parentPupilInfo.parentEmail,
        type: UserType.PARENT,
        userStatus: UserStatus.ACTIVE,
        password: user.password
    });
    const leader = await utils.createUser({
        firstname: schoolInfo.leaderFirstName,
        lastname: schoolInfo.leaderlastName,
        email: schoolInfo.leaderEmail,
        type: UserType.TEACHER,
        userStatus: UserStatus.ACTIVE,
        isSchoolLeader: true,
        schoolId: school.id,
        password: user.password,
        nameForChildren: `Mr ${schoolInfo.leaderFirstName}`
    });
    await utils.addParentToPupil(pupil1.id, parent.id);
    const class1 = await utils.createClass(school.id, {
        name: schoolInfo.myClassName,
        isRegistrationClass: true,
        isFullProgramme: true,
        IsReadingLogsEnabled: false,
        mainTeacherId: leader.id,
        yearGroup: 1,
        periodIndex: currentPeriod.index,
        logCreatedById: user.id,
        logUpdatedById: user.id
    });
    await utils.addPupilToClass(pupil1.id, class1.id);
    const class2 = await utils.createClass(school.id, {
        name: schoolInfo.myClass2Name,
        isRegistrationClass: true,
        isFullProgramme: true,
        IsReadingLogsEnabled: false,
        mainTeacherId: leader.id,
        yearGroup: 1,
        periodIndex: currentPeriod.index,
        logCreatedById: user.id,
        logUpdatedById: user.id
    });
    [topicInfo.topicSameInBothClasses, topicInfo.topicDifferentFromOtherClass, topicInfo.topicWillDelete].forEach(async (topicName) => {
        const staticTopic = topicInfos.find((topicInfo) => topicInfo.topicName === topicName);

        await utils.createClassTopic(class1.id, {
            topicId: staticTopic?.id,
            releaseDate: formatDate(today, '-')
        });
    });
    [topicInfo.topicSameInBothClasses, topicInfo.topicOnlyForOtherClass].forEach(async (topicName) => {
        const staticTopic = topicInfos.find((topicInfo) => topicInfo.topicName === topicName);

        await utils.createClassTopic(class2.id, {
            topicId: staticTopic?.id,
            releaseDate: formatDate(today, '-')
        });
    });

    await login(page, admin, password);
    await page.waitForURL(/\/admin\/all-feeds/);
    await waitForLoading(page);
    await expect(page.getByTestId('common-drawer-list')).toBeVisible();
    await openSideDrawer(page);
    await releaseTopicsUpToADate(page);
    await adminOrTeacherSignOut(page);
    await login(page, parentEmail, password);
    await page.waitForURL(/\/welcome/);
    await waitForLoading(page);
    await acceptPupilInvitation(page);
    await waitForLoading(page);
    await expect(page.getByTestId('child-topics-page')).toBeVisible();
    await acceptFeatureTooltipPrompt(page);
    await expect(
        page.locator('[data-test="child-card-footer-primary-content"]', { hasText: topicInfo.topicWillDelete }).first()
    ).toBeVisible();
    await expect(
        page.locator('[data-test="child-card-footer-primary-content"]', { hasText: topicInfo.topicSameInBothClasses }).first()
    ).toBeVisible();
    await expect(
        page.locator('[data-test="child-card-footer-primary-content"]', { hasText: topicInfo.topicDifferentFromOtherClass }).first()
    ).toBeVisible();
    await expect(
        page.locator('[data-test="child-card-footer-primary-content"]', { hasText: topicInfo.topicOnlyForOtherClass }).first()
    ).not.toBeVisible();
    await waitForLoading(page);
    await page.locator('[data-test="child-card-footer-primary-content"]', { hasText: topicInfo.topicSameInBothClasses }).first().click();
    await page.waitForURL(/\/topic/);
    await waitForLoading(page);
    await watchVideoAndUnlockActivities(page);
    await page.locator('[data-test="child-activity-card"]').first().click();
    await page.waitForURL(/\/activity/);
    await waitForLoading(page);
    await submitActivityFeedback(page, feedback.pupilComment, feedback.parentComment);
    await page.getByTestId('header-logo').click();
    await page.waitForURL(/\/child\/\d+\/topics/);
    await waitForLoading(page);
    await expect(page.getByTestId('child-topics-page')).toBeVisible();
    await page
        .locator('[data-test="child-card-footer-primary-content"]', { hasText: topicInfo.topicDifferentFromOtherClass })
        .first()
        .click();
    await page.waitForURL(/\/topic/);
    await waitForLoading(page);
    await watchVideoAndUnlockActivities(page);
    await page.locator('[data-test="child-activity-card"]').first().click();
    await page.waitForURL(/\/activity/);
    await waitForLoading(page);
    await submitActivityFeedback(page, feedback.pupilComment, feedback.parentComment);
    await parentSignOut(page);
};

const verifyNewPupilTopicsAfterClassSwitching = async (
    page: Page,
    parentEmail: string,
    topicInfo: {
        topicSameInBothClasses: string;
        topicDifferentFromOtherClass: string;
        topicOnlyForOtherClass: string;
        topicWillDelete: string;
    },
    feedback: {
        pupilComment: string;
        parentComment: string;
    }
) => {
    await login(page, parentEmail, password);
    await page.waitForURL(/\/child\/\d+\/topics/);
    await waitForLoading(page);
    await expect(page.getByTestId('child-topics-page')).toBeVisible();
    await acceptFeatureTooltipPrompt(page);
    await expect(
        page.locator('[data-test="child-card-footer-primary-content"]', { hasText: topicInfo.topicWillDelete }).first()
    ).not.toBeVisible();
    await expect(
        page.locator('[data-test="child-card-footer-primary-content"]', { hasText: topicInfo.topicSameInBothClasses }).first()
    ).toBeVisible();
    await expect(
        page.locator('[data-test="child-card-footer-primary-content"]', { hasText: topicInfo.topicDifferentFromOtherClass }).first()
    ).toBeVisible();
    await expect(
        page.locator('[data-test="child-card-footer-primary-content"]', { hasText: topicInfo.topicOnlyForOtherClass }).first()
    ).toBeVisible();
    await page.locator('[data-test="child-card-footer-primary-content"]', { hasText: topicInfo.topicSameInBothClasses }).first().click();
    await page.waitForURL(/\/topic/);
    await waitForLoading(page);
    await page.locator('[data-test="child-activity-card"]').first().click();
    await page.waitForURL(/\/activity/);
    await waitForLoading(page);
    await safeClick(page.locator('[data-test="expand-activity-feedback-icon"]').first());
    await safeAssertion(page.getByTestId('feedback-family-comment').getByText(feedback.parentComment), 'toBeVisible');
    await safeAssertion(page.getByTestId('feedback-pupil-comment').getByText(feedback.pupilComment), 'toBeVisible');
    await parentSignOut(page);
};

const setupTopicsData = async (
    topicNames: string[],
    db: Kysely<Schema.DB>,
    utils: ReturnType<typeof createUtils>,
    activity_one: AddActivityInput,
    activity_two: AddActivityInput,
    userId: string
): Promise<{ topicName: string; id: string }[]> => {
    const topicInfos: { topicName: string; id: string }[] = [];
    for (const topicName of topicNames) {
        const staticTopic = await utils.createStaticTopic({
            isReading: false,
            teacherTopicName: topicName,
            parentTopicName: topicName,
            isPublished: true,
            video: '605069004',
            logCreatedById: userId,
            logUpdatedById: userId
        });
        await db
            .insertInto('static_lwp_topic_domain_year_group')
            .values({
                domainId: '2',
                topicId: staticTopic.id,
                yearGroupId: '1'
            })
            .executeTakeFirstOrThrow();
        await utils.createStaticActivity({
            name: activity_one.activityName,
            activityType: 'LEGACY',
            order: 1,
            topicId: staticTopic.id,
            logCreatedById: userId,
            logUpdatedById: userId
        });
        await utils.createStaticActivity({
            name: activity_two.activityName,
            activityType: 'LEGACY',
            order: 2,
            topicId: staticTopic.id,
            logCreatedById: userId,
            logUpdatedById: userId
        });

        topicInfos.push({ topicName, id: staticTopic.id });
    }

    return topicInfos;
};
