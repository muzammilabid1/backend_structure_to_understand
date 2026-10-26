import { test, expect } from '@playwright/test';
import type { Schema } from '@lwp/postgres-client';
import { type Kysely } from 'kysely';
import { createDb } from './db';
import { createUtils } from './dbUtils';
import {
    password,
    generateSchoolName,
    generateFirstName,
    generateLastName,
    generateUserEmail,
    generateClassName,
    readyTeddyDomainId,
    generateTopicName
} from './constants';
import { formatDate, getInputBoxByName, login, openSideDrawer, waitForLoading } from './utils';
import { UserStatus, UserType } from 'lwp-shared';

test.describe('Create class groups in different programme classes', () => {
    let db: Kysely<Schema.DB>;
    let utils: ReturnType<typeof createUtils>;

    test.beforeAll(async () => {
        db = createDb();
        utils = createUtils(db);
    });

    test.afterAll(async () => {
        await db.destroy();
    });

    test('Create class groups in different programme classes', async ({ page }) => {
        const mySchoolName: string = `${generateSchoolName()} School`;
        const leaderFirstName: string = generateFirstName();
        const leaderlastName: string = generateLastName();
        const leaderFullName: string = `${leaderFirstName} ${leaderlastName}`;
        const schoolEmail: string = generateUserEmail(leaderFirstName, leaderlastName);
        const readyTeddySubjectName: string = `Ready Teddy`;
        const readyTeddyClassName: string = `RT: ${generateClassName()}`;
        const fullProgrammedClassName: string = `FP: ${generateClassName()}`;
        const readingClassName: string = `RL: ${generateClassName()}`;
        const allProgramClassName: string = `AP: ${generateClassName()}`;
        const readyTeddyTopicName: string = generateTopicName();
        const today = new Date();
        const dateToday = formatDate();

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
            logUpdatedById: user.id,
            isReadyTeddyAvailable: true
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
        const staticTopic = await utils.createStaticTopic({
            isReading: false,
            teacherTopicName: readyTeddyTopicName,
            parentTopicName: readyTeddyTopicName,
            isPublished: true,
            video: '605069004',
            logCreatedById: user.id,
            logUpdatedById: user.id
        });
        await db
            .insertInto('static_lwp_topic_domain_year_group')
            .values({
                domainId: readyTeddyDomainId,
                topicId: staticTopic.id,
                yearGroupId: '0'
            })
            .executeTakeFirstOrThrow();
        await utils.createStaticActivity({
            name: `${readyTeddyTopicName} one`,
            activityType: 'LEGACY',
            order: 1,
            topicId: staticTopic.id,
            logCreatedById: user.id,
            logUpdatedById: user.id
        });
        await utils.createStaticActivity({
            name: `${readyTeddyTopicName} two`,
            activityType: 'LEGACY',
            order: 2,
            topicId: staticTopic.id,
            logCreatedById: user.id,
            logUpdatedById: user.id
        });
        await utils.addUserTooltipHistory(leader.id, 'topic-library-tooltip');
        await utils.addUserTooltipHistory(leader.id, 'school-reading-log-tooltip');
        await utils.createClass(school.id, {
            name: readingClassName,
            isRegistrationClass: true,
            isFullProgramme: false,
            mainTeacherId: leader.id,
            yearGroup: 1,
            periodIndex: currentPeriod.index,
            IsReadingLogsEnabled: true,
            readingLaunchDate: dateToday,
            readingStartDay: today.getDay(),
            readingTarget: 1,
            logCreatedById: user.id,
            logUpdatedById: user.id
        });
        await utils.createClass(school.id, {
            name: fullProgrammedClassName,
            isRegistrationClass: true,
            isFullProgramme: true,
            mainTeacherId: leader.id,
            yearGroup: 1,
            periodIndex: currentPeriod.index,
            readingTarget: 1,
            logCreatedById: user.id,
            logUpdatedById: user.id
        });
        await utils.createClass(school.id, {
            name: readyTeddyClassName,
            isRegistrationClass: true,
            isFullProgramme: false,
            mainTeacherId: leader.id,
            yearGroup: 1,
            periodIndex: currentPeriod.index + 1,
            IsReadingLogsEnabled: false,
            isReadyTeddyEnabled: true,
            readingTarget: 1,
            logCreatedById: user.id,
            logUpdatedById: user.id
        });
        await utils.createClass(school.id, {
            name: allProgramClassName,
            isRegistrationClass: true,
            isFullProgramme: true,
            mainTeacherId: leader.id,
            yearGroup: 1,
            periodIndex: currentPeriod.index,
            isReadyTeddyEnabled: true,
            readingTarget: 1,
            logCreatedById: user.id,
            logUpdatedById: user.id
        });

        // Create reading class group
        const readingGroup = `${readingClassName} Group`;
        await login(page, schoolEmail, password);
        await page.waitForURL(/\/school/);
        await waitForLoading(page);
        await openSideDrawer(page);
        await waitForLoading(page);
        await page.getByRole('link', { name: readingClassName }).click();
        await page.waitForURL(/\/class/);
        await waitForLoading(page);
        await page.getByTestId('common-nav-class-groups-tab').click();
        await waitForLoading(page);
        await page.getByRole('button', { name: 'Create a group' }).click();
        await waitForLoading(page);
        await getInputBoxByName(page, 'groupName').fill(readingGroup);
        await page.getByTestId('class-group-main-teacher-select').click();
        await page.getByRole('option', { name: leaderFullName }).click();
        // For reading classes, the subject selection should be hidden
        await expect(page.getByTestId('class-group-subjects-select')).toBeHidden();
        await page.getByRole('button', { name: 'Create group' }).click();
        await waitForLoading(page);
        await expect(page.getByTestId('group-name').getByText(readingGroup)).toBeVisible();
        await waitForLoading(page);

        // Create full programme class group
        const fullProgramGroup = `${fullProgrammedClassName} Group`;
        await page.getByTestId('school-overview-tab').click();
        await page.waitForURL(/\/school/);
        await waitForLoading(page);
        await page.getByRole('link', { name: fullProgrammedClassName }).click();
        await page.waitForURL(/\/class/);
        await waitForLoading(page);
        await page.getByTestId('common-nav-class-groups-tab').click();
        await waitForLoading(page);
        await page.getByRole('button', { name: 'Create a group' }).click();
        await waitForLoading(page);
        await getInputBoxByName(page, 'groupName').fill(fullProgramGroup);
        await page.getByTestId('class-group-main-teacher-select').click();
        await page.getByRole('option', { name: leaderFullName }).click();
        await page.getByTestId('class-group-subjects-select').click();
        await expect(page.getByRole('option', { name: readyTeddySubjectName })).toBeHidden(); // For full programme, the ready teddy subject should not be visible.
        await page.getByRole('option', { name: 'English' }).click(); // full programme subject visible
        await page.getByRole('button', { name: 'Create group' }).click();
        await waitForLoading(page);
        await expect(page.getByTestId('group-name').getByText(fullProgramGroup)).toBeVisible();
        await waitForLoading(page);

        // Create ready teddy class group
        await page.getByTestId('school-overview-tab').click();
        await page.waitForURL(/\/school/);
        await waitForLoading(page);
        await page.getByRole('link', { name: readyTeddyClassName }).click();
        await page.waitForURL(/\/class/);
        await waitForLoading(page);

        const readyTeddyGroup = `${readyTeddyClassName} Group`;
        await page.getByTestId('common-nav-class-groups-tab').click();
        await waitForLoading(page);
        await page.getByRole('button', { name: 'Create a group' }).click();
        await waitForLoading(page);
        await getInputBoxByName(page, 'groupName').fill(readyTeddyGroup);
        await page.getByTestId('class-group-main-teacher-select').click();
        await page.getByRole('option', { name: leaderFullName }).click();
        await page.getByTestId('class-group-subjects-select').click();
        await expect(page.getByRole('option', { name: 'English' })).toBeHidden(); // For ready teddy, the full programme subjects should not be visible.
        await page.getByRole('option', { name: readyTeddySubjectName }).click(); // Ready teddy subject visible
        await page.getByRole('button', { name: 'Create group' }).click();
        await waitForLoading(page);
        await expect(page.getByTestId('group-name').getByText(readyTeddyGroup)).toBeVisible();
        await waitForLoading(page);

        // Create full programme and ready teddy class group
        const allProgramGroup = `${allProgramClassName} Group`;
        await page.getByTestId('school-overview-tab').click();
        await page.waitForURL(/\/school/);
        await waitForLoading(page);
        await page.getByRole('link', { name: allProgramClassName }).click();
        await page.waitForURL(/\/class/);
        await waitForLoading(page);
        await page.getByTestId('common-nav-class-groups-tab').click();
        await waitForLoading(page);
        await page.getByRole('button', { name: 'Create a group' }).click();
        await waitForLoading(page);
        await getInputBoxByName(page, 'groupName').fill(allProgramGroup);
        await page.getByTestId('class-group-main-teacher-select').click();
        await page.getByRole('option', { name: leaderFullName }).click();
        await page.getByTestId('class-group-subjects-select').click();
        await page.getByRole('option', { name: 'English' }).click(); // Full programme subject is visible
        await page.getByTestId('class-group-subjects-select').click();
        await page.getByRole('option', { name: readyTeddySubjectName }).click(); // Ready teddy subject is visible
        await page.getByRole('button', { name: 'Create group' }).click();
        await waitForLoading(page);
        await expect(page.getByTestId('group-name').getByText(allProgramGroup)).toBeVisible();
    });
});
