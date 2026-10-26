import { test, expect } from '@playwright/test';
import type { Schema } from '@lwp/postgres-client';
import { type Kysely } from 'kysely';
import { createDb } from './db';
import { createUtils } from './dbUtils';
import {
    generateSchoolName,
    generateFirstName,
    generateLastName,
    generateUserEmail,
    generateClassName,
    generateTopicName,
    readyTeddyDomainId,
    password,
    admin,
    readyTeddySubjectName
} from './constants';
import { adminOrTeacherSignOut, getInputBoxByName, login, openSideDrawer, waitForLoading } from './utils';
import { FeatureCode, FeatureStatus, UserStatus, UserType } from 'lwp-shared';

test.describe('Ready Teddy programme licence and class management', () => {
    let db: Kysely<Schema.DB>;
    let utils: ReturnType<typeof createUtils>;

    test.beforeAll(async () => {
        db = createDb();
        utils = createUtils(db);

        await db
            .updateTable('static_lwp_features')
            .set({ status: FeatureStatus.ALL_SCHOOLS })
            .where('code', '=', FeatureCode.READY_TEDDY)
            .execute();
    });

    test.afterAll(async () => {
        await db
            .updateTable('static_lwp_features')
            .set({ status: FeatureStatus.NO_SCHOOLS })
            .where('code', '=', FeatureCode.READY_TEDDY)
            .execute();

        await db.destroy();
    });

    test('Ready Teddy licence: admin visibility, school leader purchase, class creation, and class settings update', async ({ page }) => {
        const mySchoolName: string = `${generateSchoolName()} School`;
        const leaderFirstName: string = generateFirstName();
        const leaderlastName: string = generateLastName();
        const schoolEmail: string = generateUserEmail(leaderFirstName, leaderlastName);
        const schoolLeaderFullName = `${leaderFirstName} ${leaderlastName}`;
        const readyTeddyClassName: string = generateClassName();
        const normalClassName: string = generateClassName();
        const readyTeddyTopicName: string = generateTopicName();
        const numOfFullProgrammeClassesAllowed = 10;

        const user = await db.selectFrom('lwp_user').where('id', '=', '1').select(['id', 'password']).executeTakeFirstOrThrow();
        const currentPeriod = await db
            .selectFrom('static_lwp_period')
            .where('isCurrentPeriod', '=', true)
            .select('index')
            .executeTakeFirstOrThrow();
        const school = await utils.createSchool({
            schoolName: mySchoolName,
            curentPeriodIndex: currentPeriod.index,
            numOfFullProgrammeClassesAllowed,
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
            name: `${readyTeddyTopicName} one`,
            activityType: 'LEGACY',
            order: 2,
            topicId: staticTopic.id,
            logCreatedById: user.id,
            logUpdatedById: user.id
        });

        // Admin: Ready Teddy checkbox and licence alert reflect licence availability on future-year class creation.
        await login(page, admin, password);
        await page.waitForURL(/\/admin\/all-feeds/);
        await waitForLoading(page);
        await expect(page.getByTestId('common-drawer-list')).toBeVisible();
        await openSideDrawer(page);
        await page.goto(`admin/school/${school.id}/add-class?adminView=true`);
        await page.waitForURL(/\/admin\/school\/\d+\/add-class/);
        await waitForLoading(page);
        await getInputBoxByName(page, 'name').fill(readyTeddyClassName);
        await page.getByTestId('add-class-year-group-select').click();
        await page.getByRole('option', { name: 'Reception' }).click();
        await page.getByTestId('add-class-academic-year-select').click();
        await page.getByRole('option', { name: new RegExp(`^Sept ${currentPeriod.index + 1}`) }).click();
        await page.getByTestId('add-class-main-teacher-select').click();
        await page.getByRole('option', { name: schoolLeaderFullName }).click();
        await expect(getInputBoxByName(page, 'isReadyTeddy')).toBeHidden();
        await expect(page.locator('.programme-info-alert-text')).toContainText(
            'You cannot use the Ready Teddy programme in any more classes for the next academic year.'
        );

        await db.updateTable('lwp_school').set({ isReadyTeddyAvailable: true }).where('id', '=', school.id).execute();
        await page.reload();
        await page.waitForURL(/\/admin\/school\/\d+\/add-class/);
        await waitForLoading(page);
        await getInputBoxByName(page, 'name').fill(readyTeddyClassName);
        await page.getByTestId('add-class-year-group-select').click();
        await page.getByRole('option', { name: 'Reception' }).click();
        await page.getByTestId('add-class-academic-year-select').click();
        await page.getByRole('option', { name: new RegExp(`^Sept ${currentPeriod.index + 1}`) }).click();
        await page.getByTestId('add-class-main-teacher-select').click();
        await page.getByRole('option', { name: schoolLeaderFullName }).click();
        await expect(getInputBoxByName(page, 'isReadyTeddy')).toBeVisible();
        await expect(page.locator('.programme-info-alert-text')).toContainText(
            `You can use the Ready Teddy programme in this class for the next academic year.`
        );
        await adminOrTeacherSignOut(page);

        // School leader: purchases Ready Teddy licence via class licence modal and verifies Ready Teddy checkbox becomes available.
        await utils.addUserTooltipHistory(leader.id, 'topic-library-tooltip');
        await utils.addUserTooltipHistory(leader.id, 'school-reading-log-tooltip');
        await db.updateTable('lwp_school').set({ isReadyTeddyAvailable: false }).where('id', '=', school.id).execute();
        await login(page, schoolEmail, password);
        await page.waitForURL(/\/school/);
        await waitForLoading(page);
        await openSideDrawer(page);
        await waitForLoading(page);
        await page.getByTestId('registration-classes-accordion-expand-icon').first().click();
        await page.getByTestId('class-overview-add-class-button').click();
        await page.waitForURL(/\/school\/\d+\/add-class/);
        await waitForLoading(page);
        await getInputBoxByName(page, 'name').fill(readyTeddyClassName);
        await page.getByTestId('add-class-year-group-select').click();
        await page.getByRole('option', { name: 'Reception' }).click();
        await page.getByTestId('add-class-main-teacher-select').click();
        await page.getByRole('option', { name: schoolLeaderFullName }).click();
        await getInputBoxByName(page, 'isFullProgramme').click();
        await expect(getInputBoxByName(page, 'isReadyTeddy')).toBeHidden();
        await page.getByTestId('school-overview-tab').click();
        await page.waitForURL(/\/school/);
        await waitForLoading(page);
        await page.getByTestId('school-overview-purchase-class-licence-link').click();
        await waitForLoading(page);
        await getInputBoxByName(page, 'readyTeddyCount').fill('25');
        await getInputBoxByName(page, 'authorizationCheckbox').click();
        await page.getByTestId('dialog-primary-btn').getByText('Submit').click();
        await waitForLoading(page);
        await expect(page.locator('.MuiAlert-message').filter({ hasText: 'Class licence purchase successful!' })).toBeVisible();
        await page.goto(`/school/${school.id}/add-class`);
        await page.waitForURL(/\/school\/\d+\/add-class/);
        await waitForLoading(page);
        await getInputBoxByName(page, 'name').fill(readyTeddyClassName);
        await page.getByTestId('add-class-year-group-select').click();
        await page.getByRole('option', { name: 'Reception' }).click();
        await page.getByTestId('add-class-main-teacher-select').click();
        await page.getByRole('option', { name: schoolLeaderFullName }).click();
        await getInputBoxByName(page, 'isFullProgramme').click();
        await expect(getInputBoxByName(page, 'isReadyTeddy')).toBeVisible();
        await getInputBoxByName(page, 'isReadyTeddy').click();
        await page.getByTestId('add-class-submit-button').click();
        await waitForLoading(page);
        await page.waitForURL(/\/school/);
        await waitForLoading(page);

        // School leader: Ready Teddy subject appears in the class schedule after creating a Ready Teddy class.
        await page.locator('[data-test="active-registration-class-name"]', { hasText: readyTeddyClassName }).click();
        await page.waitForURL(/\/class/);
        await waitForLoading(page);
        await page.getByTestId('common-nav-schedule-tab').click();
        await waitForLoading(page);
        await page.getByTestId('class-schedule-year-group-multi-select').click();
        await page.getByRole('option', { name: 'All' }).click();
        await page.getByTestId('class-schedule-subject-multi-select').click();
        await expect(page.getByRole('option', { name: readyTeddySubjectName })).toBeVisible();
        await page.mouse.move(0, 0);
        await page.getByTestId('school-overview-tab').click();
        await page.waitForURL(/\/school/);
        await waitForLoading(page);

        // School leader: enables Ready Teddy on an existing full programme class via class settings.
        const schoolClass = await utils.createClass(school.id, {
            name: normalClassName,
            isRegistrationClass: true,
            isFullProgramme: true,
            mainTeacherId: leader.id,
            yearGroup: 0,
            periodIndex: currentPeriod.index,
            logCreatedById: user.id,
            logUpdatedById: user.id
        });
        await page.getByTestId('school-overview-tab').click();
        await page.waitForURL(/\/school/);
        await waitForLoading(page);
        await page.goto(`class/${schoolClass.id}/class-details`);
        await page.waitForURL(/\/class\/\d+\/class-details/);
        await waitForLoading(page);
        await getInputBoxByName(page, 'isReadyTeddy').click();
        await page.getByRole('button', { name: 'Save programme options' }).click();
        await page.getByTestId('dialog-primary-btn').getByText('Confirm').click();
        await expect(page.locator('.MuiAlert-message').filter({ hasText: 'Class program settings updated.' })).toBeVisible();
    });

    test('A Ready Teddy class with topics and activities can still turn on the reading log when no licences are left', async ({ page }) => {
        const leaderFirstName = generateFirstName();
        const leaderLastName = generateLastName();
        const schoolEmail = generateUserEmail(leaderFirstName, leaderLastName);

        const user = await db.selectFrom('lwp_user').where('id', '=', '1').select(['id', 'password']).executeTakeFirstOrThrow();
        const currentPeriod = await db
            .selectFrom('static_lwp_period')
            .where('isCurrentPeriod', '=', true)
            .select('index')
            .executeTakeFirstOrThrow();
        // Two licences, both used by the first two classes below. The Ready Teddy only class uses none.
        const school = await utils.createSchool({
            schoolName: `${generateSchoolName()} School`,
            curentPeriodIndex: currentPeriod.index,
            numOfFullProgrammeClassesAllowed: 2,
            numOfTotalClassesAllowed: 2,
            isReadyTeddyAvailable: true,
            enableAddClasses: true,
            logCreatedById: user.id,
            logUpdatedById: user.id
        });
        const leader = await utils.createUser({
            firstname: leaderFirstName,
            lastname: leaderLastName,
            email: schoolEmail,
            type: UserType.TEACHER,
            userStatus: UserStatus.ACTIVE,
            isSchoolLeader: true,
            schoolId: school.id,
            password: user.password,
            nameForChildren: `Mr ${leaderFirstName}`
        });
        const classFields = {
            isRegistrationClass: true,
            mainTeacherId: leader.id,
            yearGroup: 0,
            periodIndex: currentPeriod.index,
            status: 'ACTIVE' as const,
            logCreatedById: user.id,
            logUpdatedById: user.id
        };
        const readyTeddyTopicsClass = await utils.createClass(school.id, {
            ...classFields,
            name: generateClassName(),
            isFullProgramme: true,
            isReadyTeddyEnabled: true
        });
        await utils.createClass(school.id, { ...classFields, name: generateClassName(), isFullProgramme: true });
        const readyTeddyOnlyClass = await utils.createClass(school.id, {
            ...classFields,
            name: generateClassName(),
            isReadyTeddyEnabled: true
        });

        await utils.addUserTooltipHistory(leader.id, 'topic-library-tooltip');
        await utils.addUserTooltipHistory(leader.id, 'school-reading-log-tooltip');
        await login(page, schoolEmail, password);
        await page.waitForURL(/\/school/);
        await waitForLoading(page);

        // A Ready Teddy only class holds no licence, so with none left it cannot have the reading log.
        await page.goto(`class/${readyTeddyOnlyClass.id}/class-details`);
        await page.waitForURL(/\/class\/\d+\/class-details/);
        await waitForLoading(page);
        await expect(getInputBoxByName(page, 'isReadyTeddy')).toBeChecked();
        await expect(page.getByText('Digital reading log')).toBeHidden();

        // A Ready Teddy class with topics and activities already holds a licence, so it can.
        await page.goto(`class/${readyTeddyTopicsClass.id}/class-details`);
        await page.waitForURL(/\/class\/\d+\/class-details/);
        await waitForLoading(page);
        await expect(page.getByText('Digital reading log')).toBeVisible();
        await getInputBoxByName(page, 'isReadingLogsEnabled').click();
        await page.getByRole('button', { name: 'Save programme options' }).click();
        await expect(page.locator('.MuiAlert-message').filter({ hasText: 'Class program settings updated.' })).toBeVisible();

        const savedClass = await db
            .selectFrom('lwp_school_class')
            .where('id', '=', readyTeddyTopicsClass.id)
            .select(['IsReadingLogsEnabled', 'isFullProgramme', 'isReadyTeddyEnabled'])
            .executeTakeFirstOrThrow();
        expect(savedClass).toEqual({ IsReadingLogsEnabled: true, isFullProgramme: true, isReadyTeddyEnabled: true });

        await page.reload();
        await waitForLoading(page);
        await expect(getInputBoxByName(page, 'isReadingLogsEnabled')).toBeChecked();

        // Turning the reading log on did not use another licence. If it had, one more licence would still leave none free.
        await db.updateTable('lwp_school').set({ numOfTotalClassesAllowed: 3 }).where('id', '=', school.id).execute();
        await page.goto(`school/${school.id}/add-class`);
        await page.waitForURL(/\/school\/\d+\/add-class/);
        await waitForLoading(page);
        await expect(page.getByText('You cannot add any more classes.')).toBeHidden();
        await expect(getInputBoxByName(page, 'isReadingLogsEnabled')).toBeVisible();
    });
});
