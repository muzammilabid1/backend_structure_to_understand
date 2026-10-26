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
    safeClick,
    submitReadingFeedback,
    waitForLoading
} from '../utils';
import { createDb } from '../db';
import { createUtils } from '../dbUtils';
import { UserStatus, UserType } from 'lwp-shared';

test.describe('Reading - Different day', () => {
    let db: Kysely<Schema.DB>;
    let utils: ReturnType<typeof createUtils>;

    test.beforeAll(async () => {
        db = createDb();
        utils = createUtils(db);
    });
    test.afterAll(async () => {
        await db.destroy();
    });

    test('Reading - Switch pupil class from teacher pupil details page', async ({ page }) => {
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
        const feedback = {
            readingComment: generateSentence(4),
            bookName: generateSentence()
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
        await page.getByTestId('pupil-name-on-week-by-week-reading-view').getByText(`${pupilFirstName} ${pupilLastName}`).click();
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
        await verifyNewPupilTopicsAfterClassSwitching(page, parentEmail);
    });

    test('Reading - Switch pupil class from admin pupil details page', async ({ page }) => {
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
        const feedback = {
            readingComment: generateSentence(4),
            bookName: generateSentence()
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
        await verifyNewPupilTopicsAfterClassSwitching(page, parentEmail);
    });

    test('Reading - Switch pupil class from class pupils page', async ({ page }) => {
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
        const feedback = {
            readingComment: generateSentence(4),
            bookName: generateSentence()
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
        await verifyNewPupilTopicsAfterClassSwitching(page, parentEmail);
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
    feedback: {
        readingComment: string;
        bookName: string;
    }
) => {
    const today = new Date();
    const oneWeekAgo = new Date(today);
    oneWeekAgo.setDate(today.getDate() - 7);

    const twoWeeksAgo = new Date(today);
    twoWeeksAgo.setDate(today.getDate() - 14);

    const readingTopicReleaseDates = [today, oneWeekAgo, twoWeeksAgo].map((date) => formatDate(date, '-'));

    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);

    const weekBeforeYesterday = new Date(today);
    weekBeforeYesterday.setDate(today.getDate() - 8);

    const twoWeeksBeforeYesterday = new Date(today);
    twoWeeksBeforeYesterday.setDate(today.getDate() - 15);

    const readingTopicReleaseDatesForClass2 = [yesterday, weekBeforeYesterday, twoWeeksBeforeYesterday].map((date) =>
        formatDate(date, '-')
    );

    const currentPeriod = await db
        .selectFrom('static_lwp_period')
        .where('isCurrentPeriod', '=', true)
        .select('index')
        .executeTakeFirstOrThrow();
    const user = await db.selectFrom('lwp_user').where('id', '=', '1').select(['id', 'password']).executeTakeFirstOrThrow();
    const staticReadingTopic = await db
        .selectFrom('static_lwp_topic')
        .where('isReading', '=', true)
        .select(['id'])
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
        isFullProgramme: false,
        IsReadingLogsEnabled: true,
        mainTeacherId: leader.id,
        yearGroup: 1,
        periodIndex: currentPeriod.index,
        readingStartDay: today.getDay(),
        readingTarget: 5,
        readingLaunchDate: today,
        logCreatedById: user.id,
        logUpdatedById: user.id
    });
    const class2 = await utils.createClass(school.id, {
        name: schoolInfo.myClass2Name,
        isRegistrationClass: true,
        isFullProgramme: false,
        IsReadingLogsEnabled: true,
        mainTeacherId: leader.id,
        yearGroup: 1,
        periodIndex: currentPeriod.index,
        readingStartDay: yesterday.getDay(),
        readingTarget: 5,
        readingLaunchDate: yesterday,
        logCreatedById: user.id,
        logUpdatedById: user.id
    });
    await utils.addPupilToClass(pupil1.id, class1.id);
    readingTopicReleaseDates.forEach(async (releaseDate) => {
        await utils.createClassTopic(class1.id, {
            topicId: staticReadingTopic.id,
            readingTarget: 5,
            releaseDate
        });
    });
    readingTopicReleaseDatesForClass2.forEach(async (releaseDate) => {
        await utils.createClassTopic(class2.id, {
            topicId: staticReadingTopic.id,
            readingTarget: 5,
            releaseDate
        });
    });

    await login(page, admin, password);
    await page.waitForURL(/\/admin\/all-feeds/);
    await waitForLoading(page);
    await expect(page.getByTestId('common-drawer-list')).toBeVisible();
    await openSideDrawer(page);
    await releaseTopicsUpToADate(page);
    await adminOrTeacherSignOut(page);
    await login(page, parentPupilInfo.parentEmail, password);
    await page.waitForURL(/\/welcome/);
    await waitForLoading(page);
    await acceptPupilInvitation(page);
    await waitForLoading(page);
    await submitReadingFeedback(page, feedback.bookName, feedback.readingComment);
    await page.getByTestId('weeks-tab').click();
    await page.waitForURL(/\/child\/\d+\/weeks/);
    await waitForLoading(page);
    await expect(page.getByTestId('child-weeks-page')).toBeVisible();
    for (const text of [
        'This week',
        'Last week',
        twoWeeksAgo.toLocaleDateString('en-GB', { weekday: 'long', day: '2-digit', month: 'long' })
    ]) {
        await expect(page.locator('p.date-text', { hasText: text }).first()).toBeVisible();
    }
    await parentSignOut(page);
};

const verifyNewPupilTopicsAfterClassSwitching = async (page: Page, parentEmail: string) => {
    const today = new Date();
    const isMonday = today.getDay() === 1;
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);

    const twoWeeksBeforeYesterday = new Date(today);
    twoWeeksBeforeYesterday.setDate(today.getDate() - 15);
    const oneWeeksBeforeYesterday = new Date(today);
    oneWeeksBeforeYesterday.setDate(today.getDate() - 8);

    const topicTexts = isMonday
        ? [
              'Last week',
              oneWeeksBeforeYesterday.toLocaleDateString('en-GB', { weekday: 'long', day: '2-digit', month: 'long' }),
              twoWeeksBeforeYesterday.toLocaleDateString('en-GB', { weekday: 'long', day: '2-digit', month: 'long' })
          ]
        : [
              'This week',
              'Last week',
              twoWeeksBeforeYesterday.toLocaleDateString('en-GB', { weekday: 'long', day: '2-digit', month: 'long' })
          ];

    await login(page, parentEmail, password);
    await page.waitForURL(/\/child\/\d+\/reading/);
    await waitForLoading(page);
    await expect(page.getByTestId('child-reading-log-page')).toBeVisible();
    await page.getByTestId('weeks-tab').click();
    await page.waitForURL(/\/child\/\d+\/weeks/);
    await waitForLoading(page);
    await expect(page.getByTestId('child-weeks-page')).toBeVisible();
    for (const text of topicTexts) {
        await expect(page.locator('p.date-text', { hasText: text }).first()).toBeVisible();
    }
    await parentSignOut(page);
};
