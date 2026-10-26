import { test, expect } from '@playwright/test';
import type { Schema } from '@lwp/postgres-client';
import { type Kysely } from 'kysely';
import { createDb } from './db';
import { createUtils } from './dbUtils';
import { createSchoolDataForTesting, getTokenFromLogin } from './graphql';
import {
    admin,
    password,
    generateSchoolName,
    generateFirstName,
    generateLastName,
    generateUserEmail,
    generateClassName,
    generateTopicName,
    schoolClassName,
    lwpSchoolName,
    englishDomainId,
    generateUPN,
    mathsSubjectId,
    mathsDomainId,
    moneySkillsSubjectId,
    moneySkillsDomainId
} from './constants';
import {
    acceptFeatureTooltipPrompt,
    adminOrTeacherSignOut,
    formatDate,
    getInputBoxByName,
    getTextAreaBoxByName,
    login,
    openSideDrawer,
    parentSignOut,
    safeAssertion,
    safeClick,
    waitForLoading
} from './utils';
import { UserStatus, UserType, InterstitialUserOption, InterstitialLastActionType } from 'lwp-shared';

test.describe('End-to-End Site Forms Workflow for School, Teacher, and Parent Users', () => {
    let db: Kysely<Schema.DB>;
    let utils: ReturnType<typeof createUtils>;

    test.beforeAll(async () => {
        db = createDb();
        utils = createUtils(db);
    });

    test.afterAll(async () => {
        await dataCleanUp(db);
        await db.destroy();
    });

    test('End-to-End Site Forms Workflow for School, Teacher, and Parent Users', async ({ page }) => {
        const mySchoolName: string = `${generateSchoolName()} School`;
        const myOldSchoolName: string = `${generateSchoolName()} School`;
        const newLeaderFirstName: string = generateFirstName();
        const newLeaderlastName: string = generateLastName();
        const newLeaderEmail: string = generateUserEmail(newLeaderFirstName, newLeaderlastName);
        const oldLeaderFirstName: string = generateFirstName();
        const oldLeaderlastName: string = generateLastName();
        const oldLeaderEmail: string = generateUserEmail(oldLeaderFirstName, oldLeaderlastName);
        const newParentFirstName: string = generateFirstName();
        const newParentLastName: string = generateLastName();
        const newParentEmail: string = generateUserEmail(newParentFirstName, newParentLastName);
        const oldParentFirstName: string = generateFirstName();
        const oldParentLastName: string = generateLastName();
        const oldParentEmail: string = generateUserEmail(oldParentFirstName, oldParentLastName);
        const newPupilFirstName: string = generateFirstName();
        const newPupilLastName: string = generateLastName();
        const oldPupilFirstName: string = generateFirstName();
        const oldPupilLastName: string = generateLastName();
        const myClassName: string = generateClassName();
        const myTopicName: string = generateTopicName();
        const anotherTopicName: string = generateTopicName();
        const myOldTopicName: string = generateTopicName();
        const activity_one: string = `${myTopicName} one`;
        const activity_two: string = `${myTopicName} two`;
        const myTopic2Name: string = generateTopicName();
        const today: Date = new Date();
        const todayDate: string = formatDate();
        const siteFormName: string = 'Test Form';
        const schoolTagName: string = `${generateTopicName()} Tag`; // initially includes only the newly created school, later will include LWP school
        const taggedFormName: string = `${schoolTagName} Form`;

        const user = await db.selectFrom('lwp_user').where('id', '=', '1').select(['id', 'password']).executeTakeFirstOrThrow();
        const currentPeriod = await db
            .selectFrom('static_lwp_period')
            .where('isCurrentPeriod', '=', true)
            .select('index')
            .executeTakeFirstOrThrow();
        const newSchool = await utils.createSchool({
            schoolName: mySchoolName,
            curentPeriodIndex: currentPeriod.index,
            numOfFullProgrammeClassesAllowed: 10,
            numOfTotalClassesAllowed: 30,
            enableAddClasses: true,
            logCreatedById: user.id,
            logUpdatedById: user.id
        });
        const oldSchool = await utils.createSchool({
            schoolName: myOldSchoolName,
            curentPeriodIndex: currentPeriod.index,
            numOfFullProgrammeClassesAllowed: 10,
            numOfTotalClassesAllowed: 30,
            enableAddClasses: true,
            logCreatedById: user.id,
            logUpdatedById: user.id
        });
        const newLeader = await utils.createUser({
            firstname: newLeaderFirstName,
            lastname: newLeaderlastName,
            email: newLeaderEmail,
            type: UserType.TEACHER,
            userStatus: UserStatus.ACTIVE,
            isSchoolLeader: true,
            schoolId: newSchool.id,
            password: user.password,
            nameForChildren: `Mr ${newLeaderFirstName}`
        });
        await utils.addUserTooltipHistory(newLeader.id, 'topic-library-tooltip');
        await utils.addUserTooltipHistory(newLeader.id, 'school-reading-log-tooltip');
        const oldLeader = await utils.createUser({
            firstname: oldLeaderFirstName,
            lastname: oldLeaderlastName,
            email: oldLeaderEmail,
            type: UserType.TEACHER,
            userStatus: UserStatus.ACTIVE,
            isSchoolLeader: true,
            schoolId: oldSchool.id,
            password: user.password,
            nameForChildren: `Mr ${oldLeaderFirstName}`
        });
        await utils.addUserTooltipHistory(oldLeader.id, 'topic-library-tooltip');
        await utils.addUserTooltipHistory(oldLeader.id, 'school-reading-log-tooltip');
        await db
            .insertInto('log_lwp_entity_status_change')
            .values({
                entityId: newLeader.id,
                entityType: 'lwp_user',
                newStatus: UserStatus.ACTIVE,
                previousStatus: UserStatus.INVITED,
                logCreatedAt: today
            })
            .execute();
        await db
            .insertInto('log_lwp_entity_status_change')
            .values({
                entityId: oldLeader.id,
                entityType: 'lwp_user',
                newStatus: UserStatus.ACTIVE,
                previousStatus: UserStatus.INVITED,
                logCreatedAt: new Date(new Date().setFullYear(2020))
            })
            .execute();
        const newSchoolClass = await utils.createClass(newSchool.id, {
            name: myClassName,
            isRegistrationClass: true,
            isFullProgramme: true,
            mainTeacherId: newLeader.id,
            yearGroup: 1,
            periodIndex: currentPeriod.index,
            readingTarget: 1,
            logCreatedById: user.id,
            logUpdatedById: user.id
        });
        await utils.addClassTeacher(newLeader.id, newSchoolClass.id);
        const oldSchoolClass = await utils.createClass(oldSchool.id, {
            name: myClassName,
            isRegistrationClass: true,
            isFullProgramme: true,
            mainTeacherId: oldLeader.id,
            yearGroup: 1,
            periodIndex: currentPeriod.index,
            readingTarget: 1,
            logCreatedById: user.id,
            logUpdatedById: user.id
        });
        await utils.addClassTeacher(oldLeader.id, oldSchoolClass.id);
        const newStaticTopic = await utils.createStaticTopic({
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
                domainId: englishDomainId,
                topicId: newStaticTopic.id,
                yearGroupId: '1'
            })
            .executeTakeFirstOrThrow();
        const newStaticActivity1 = await utils.createStaticActivity({
            name: activity_one,
            activityType: 'LEGACY',
            order: 1,
            topicId: newStaticTopic.id,
            logCreatedById: user.id,
            logUpdatedById: user.id
        });
        const newStaticActivity2 = await utils.createStaticActivity({
            name: activity_two,
            activityType: 'LEGACY',
            order: 2,
            topicId: newStaticTopic.id,
            logCreatedById: user.id,
            logUpdatedById: user.id
        });
        const oldStaticTopic = await utils.createStaticTopic({
            isReading: false,
            teacherTopicName: myOldTopicName,
            parentTopicName: myOldTopicName,
            isPublished: true,
            video: '605069004',
            logCreatedById: user.id,
            logUpdatedById: user.id
        });
        await db
            .insertInto('static_lwp_topic_domain_year_group')
            .values({
                domainId: englishDomainId,
                topicId: oldStaticTopic.id,
                yearGroupId: '1'
            })
            .executeTakeFirstOrThrow();
        const oldStaticActivity1 = await utils.createStaticActivity({
            name: activity_one,
            activityType: 'LEGACY',
            order: 1,
            topicId: oldStaticTopic.id,
            logCreatedById: user.id,
            logUpdatedById: user.id
        });
        const oldStaticActivity2 = await utils.createStaticActivity({
            name: activity_two,
            activityType: 'LEGACY',
            order: 2,
            topicId: oldStaticTopic.id,
            logCreatedById: user.id,
            logUpdatedById: user.id
        });
        const newClassTopic = await utils.createClassTopic(newSchoolClass.id, {
            topicId: newStaticTopic?.id,
            releaseDate: todayDate,
            released: true
        });
        const oldClassTopic = await utils.createClassTopic(oldSchoolClass.id, {
            topicId: newStaticTopic?.id,
            releaseDate: todayDate,
            released: true
        });
        const newParent = await utils.createUser({
            firstname: newParentFirstName,
            lastname: newParentLastName,
            email: newParentEmail,
            type: UserType.PARENT,
            userStatus: UserStatus.ACTIVE,
            password: user.password
        });
        const oldParent = await utils.createUser({
            firstname: oldParentFirstName,
            lastname: oldParentLastName,
            email: oldParentEmail,
            type: UserType.PARENT,
            userStatus: UserStatus.ACTIVE,
            password: user.password
        });
        await db
            .insertInto('log_lwp_entity_status_change')
            .values({
                entityId: newParent.id,
                entityType: 'lwp_user',
                newStatus: UserStatus.ACTIVE,
                previousStatus: UserStatus.INVITED,
                logCreatedAt: today
            })
            .execute();
        await db
            .insertInto('log_lwp_entity_status_change')
            .values({
                entityId: oldParent.id,
                entityType: 'lwp_user',
                newStatus: UserStatus.ACTIVE,
                previousStatus: UserStatus.INVITED,
                logCreatedAt: new Date(new Date().setFullYear(2020))
            })
            .execute();
        const newPupil = await utils.createPupil(newSchool.id, {
            firstname: newPupilFirstName,
            lastname: newPupilLastName,
            dateOfBirth: new Date(),
            startedSchool: '2024',
            isPremium: true,
            gender: 'MALE',
            UPN: generateUPN(),
            logCreatedById: user.id,
            logUpdatedById: user.id
        });
        await utils.addParentToPupil(newPupil.id, newParent.id, false);
        await utils.addPupilToClass(newPupil.id, newSchoolClass.id);
        const oldPupil = await utils.createPupil(oldSchool.id, {
            firstname: oldPupilFirstName,
            lastname: oldPupilLastName,
            dateOfBirth: new Date(),
            startedSchool: '2024',
            isPremium: false,
            gender: 'MALE',
            UPN: generateUPN(),
            logCreatedById: user.id,
            logUpdatedById: user.id
        });
        await utils.addParentToPupil(oldPupil.id, oldParent.id, false);
        await utils.addPupilToClass(oldPupil.id, oldSchoolClass.id);
        const newPupilTopic = await utils.createPupilTopic({
            releaseDate: todayDate,
            pupilId: newPupil.id,
            classTopicId: newClassTopic.id,
            topicId: newStaticTopic.id,
            watchedVideo: false,
            periodIndex: currentPeriod.index,
            silverStars: 0,
            earnedGoldStar: false
        });
        await utils.createPupilActivity({
            pupilId: newPupil.id,
            topicId: newPupilTopic.id,
            activityId: newStaticActivity1.id,
            earnedStar: true,
            mathscotActivityItemIds: JSON.stringify([88, 188, 224])
        });
        await utils.createPupilActivity({
            pupilId: newPupil.id,
            topicId: newPupilTopic.id,
            activityId: newStaticActivity2.id,
            earnedStar: false,
            mathscotActivityItemIds: JSON.stringify([88, 188, 224])
        });
        const oldPupilTopic = await utils.createPupilTopic({
            releaseDate: todayDate,
            pupilId: oldPupil.id,
            classTopicId: oldClassTopic.id,
            topicId: oldStaticTopic.id,
            watchedVideo: false,
            periodIndex: currentPeriod.index,
            silverStars: 0,
            earnedGoldStar: false
        });
        await utils.createPupilActivity({
            pupilId: oldPupil.id,
            topicId: oldPupilTopic.id,
            activityId: oldStaticActivity1.id,
            earnedStar: true,
            mathscotActivityItemIds: JSON.stringify([88, 188, 224])
        });
        await utils.createPupilActivity({
            pupilId: oldPupil.id,
            topicId: oldPupilTopic.id,
            activityId: oldStaticActivity2.id,
            earnedStar: false,
            mathscotActivityItemIds: JSON.stringify([88, 188, 224])
        });

        // Create a school tag for the new school
        const newSchoolTag = await utils.createSchoolTag(
            {
                name: schoolTagName,
                color: '#F28D00'
            },
            newSchool.id
        );

        // Schedules a new topic in a class
        const staticTopic = await utils.createStaticTopic({
            isReading: false,
            teacherTopicName: myTopic2Name,
            parentTopicName: myTopic2Name,
            isPublished: true,
            video: '605069004',
            logCreatedById: user.id,
            logUpdatedById: user.id
        });
        await db
            .insertInto('static_lwp_topic_domain_year_group')
            .values({
                domainId: mathsDomainId,
                topicId: staticTopic.id,
                yearGroupId: '1'
            })
            .executeTakeFirstOrThrow();
        const staticActivity1 = await utils.createStaticActivity({
            name: activity_one,
            activityType: 'LEGACY',
            order: 1,
            topicId: staticTopic.id,
            logCreatedById: user.id,
            logUpdatedById: user.id
        });
        const staticActivity2 = await utils.createStaticActivity({
            name: activity_two,
            activityType: 'LEGACY',
            order: 2,
            topicId: staticTopic.id,
            logCreatedById: user.id,
            logUpdatedById: user.id
        });
        const classTopic = await utils.createClassTopic(newSchoolClass.id, {
            topicId: staticTopic?.id,
            releaseDate: todayDate,
            released: true
        });
        const pupilTopic = await utils.createPupilTopic({
            releaseDate: todayDate,
            pupilId: newPupil.id,
            classTopicId: classTopic.id,
            topicId: staticTopic.id,
            watchedVideo: false,
            periodIndex: currentPeriod.index,
            silverStars: 0,
            earnedGoldStar: false
        });
        await utils.createPupilActivity({
            pupilId: newPupil.id,
            topicId: pupilTopic.id,
            activityId: staticActivity1.id,
            earnedStar: true,
            mathscotActivityItemIds: JSON.stringify([88, 188, 224])
        });
        await utils.createPupilActivity({
            pupilId: newPupil.id,
            topicId: pupilTopic.id,
            activityId: staticActivity2.id,
            earnedStar: false,
            mathscotActivityItemIds: JSON.stringify([88, 188, 224])
        });

        // Verifies that the topic is visible to new parents
        await login(page, oldParentEmail, password);
        await waitForLoading(page);
        await expect(page.getByTestId('child-topics-page')).toBeVisible();
        await expect(page.getByText(myTopicName)).toHaveCount(0);
        await waitForLoading(page);
        await parentSignOut(page);
        await login(page, newParentEmail, password);
        await waitForLoading(page);
        await expect(page.getByTestId('child-topics-page')).toBeVisible();
        await page.getByText(myTopic2Name).nth(0).click();
        await waitForLoading(page);
        await page.getByRole('heading', { name: myTopic2Name }).click();
        await waitForLoading(page);
        await expect(page.getByRole('heading', { name: myTopic2Name })).toBeVisible();
        await parentSignOut(page);

        // // Creates and releases a non-subject-based site form for all parents and teachers
        const siteForm = await utils.createSiteForm({
            name: siteFormName,
            heading: 'Form heading',
            text: 'Form text',
            typeformId: 'TO4FvWrm',
            averageTime: 1,
            userOptions: JSON.stringify([InterstitialUserOption.PARENT, InterstitialUserOption.TEACHER])
        });
        await login(page, admin, password);
        await page.waitForURL(/\/admin/);
        await waitForLoading(page);
        await openSideDrawer(page);
        await page.getByTestId('site-forms-common-drawer-list').click();
        await page.waitForURL(/\/admin\/site-forms/);
        await waitForLoading(page);
        await expect(page.getByTestId('site-forms-page')).toBeVisible();
        await page.getByTestId('release-interstitial-form').click();
        await expect(page.locator('.MuiAlert-message').filter({ hasText: 'Released successfully!' })).toBeVisible();
        await expect(page.getByTestId('table-row-item').getByText('RELEASED', { exact: true })).toBeVisible();
        await adminOrTeacherSignOut(page);

        // Confirms site form visibility for all parents and teachers after release
        await login(page, oldLeaderEmail, password);
        await page.waitForURL(/\/school/);
        await waitForLoading(page);
        await page.getByRole('button', { name: 'Not now' }).click();
        await expect(page.locator('[data-test="sidebar-site-form-btn"]', { hasText: siteFormName })).toHaveCount(1);
        await adminOrTeacherSignOut(page);
        await login(page, newLeaderEmail, password);
        await page.waitForURL(/\/school/);
        await waitForLoading(page);
        await page.getByRole('button', { name: 'Not now' }).click();
        await expect(page.locator('[data-test="sidebar-site-form-btn"]', { hasText: siteFormName })).toHaveCount(1);
        await adminOrTeacherSignOut(page);
        await login(page, oldParentEmail, password);
        await waitForLoading(page);
        await expect(page.getByTestId('child-topics-page')).toBeVisible();
        await expect(page.locator('[data-test="site-form-name-heading"]', { hasText: siteFormName })).toHaveCount(1);
        await parentSignOut(page);
        await login(page, newParentEmail, password);
        await waitForLoading(page);
        await expect(page.getByTestId('child-topics-page')).toBeVisible();
        await expect(page.locator('[data-test="site-form-name-heading"]', { hasText: siteFormName })).toHaveCount(1);
        await parentSignOut(page);

        // Updates site form to target only new parents and all teachers, then releases it
        await db.deleteFrom('lwp_user_interstitial').where('interstitialId', '=', siteForm.id).execute();
        await db
            .updateTable('static_lwp_interstitial')
            .set({
                userOptions: JSON.stringify([InterstitialUserOption.NEW_PARENT, InterstitialUserOption.TEACHER]),
                lastAction: InterstitialLastActionType.CLEARED
            })
            .where('id', '=', siteForm.id)
            .execute();
        await login(page, admin, password);
        await page.waitForURL(/\/admin/);
        await waitForLoading(page);
        await openSideDrawer(page);
        await page.getByTestId('site-forms-common-drawer-list').click();
        await page.waitForURL(/\/admin\/site-forms/);
        await waitForLoading(page);
        await expect(page.getByTestId('site-forms-page')).toBeVisible();
        await page.getByTestId('release-interstitial-form').click();
        await expect(page.locator('.MuiAlert-message').filter({ hasText: 'Released successfully!' })).toBeVisible();
        await expect(page.getByTestId('table-row-item').getByText('RELEASED', { exact: true })).toBeVisible();
        await adminOrTeacherSignOut(page);

        // Confirms site form is visible to new parents and all teachers but not to existing parents
        await login(page, oldLeaderEmail, password);
        await page.waitForURL(/\/school/);
        await waitForLoading(page);
        await page.getByRole('button', { name: 'Not now' }).click();
        await expect(page.locator('[data-test="sidebar-site-form-btn"]', { hasText: siteFormName })).toHaveCount(1);
        await adminOrTeacherSignOut(page);
        await login(page, newLeaderEmail, password);
        await page.waitForURL(/\/school/);
        await waitForLoading(page);
        await page.getByRole('button', { name: 'Not now' }).click();
        await expect(page.locator('[data-test="sidebar-site-form-btn"]', { hasText: siteFormName })).toHaveCount(1);
        await adminOrTeacherSignOut(page);
        await login(page, oldParentEmail, password);
        await waitForLoading(page);
        await expect(page.getByTestId('child-topics-page')).toBeVisible();
        await expect(page.locator('[data-test="site-form-name-heading"]', { hasText: siteFormName })).toHaveCount(0);
        await parentSignOut(page);
        await login(page, newParentEmail, password);
        await waitForLoading(page);
        await expect(page.getByTestId('child-topics-page')).toBeVisible();
        await expect(page.locator('[data-test="site-form-name-heading"]', { hasText: siteFormName })).toHaveCount(1);
        await parentSignOut(page);

        // Updates site form to target all parents and new teachers, then releases it
        await db.deleteFrom('lwp_user_interstitial').where('interstitialId', '=', siteForm.id).execute();
        await db
            .updateTable('static_lwp_interstitial')
            .set({
                userOptions: JSON.stringify([InterstitialUserOption.PARENT, InterstitialUserOption.NEW_TEACHER]),
                lastAction: InterstitialLastActionType.CLEARED
            })
            .where('id', '=', siteForm.id)
            .execute();
        await login(page, admin, password);
        await page.waitForURL(/\/admin/);
        await waitForLoading(page);
        await openSideDrawer(page);
        await page.getByTestId('site-forms-common-drawer-list').click();
        await page.waitForURL(/\/admin\/site-forms/);
        await waitForLoading(page);
        await expect(page.getByTestId('site-forms-page')).toBeVisible();
        await page.getByTestId('release-interstitial-form').click();
        await expect(page.locator('.MuiAlert-message').filter({ hasText: 'Released successfully!' })).toBeVisible();
        await expect(page.getByTestId('table-row-item').getByText('RELEASED', { exact: true })).toBeVisible();
        await adminOrTeacherSignOut(page);

        // Confirms site form is visible to all parents and new teachers but not to existing teachers
        await login(page, oldLeaderEmail, password);
        await page.waitForURL(/\/school/);
        await waitForLoading(page);
        await expect(page.locator('[data-test="sidebar-site-form-btn"]', { hasText: siteFormName })).toHaveCount(0);
        await adminOrTeacherSignOut(page);
        await login(page, newLeaderEmail, password);
        await page.waitForURL(/\/school/);
        await waitForLoading(page);
        await page.getByRole('button', { name: 'Not now' }).click();
        await expect(page.locator('[data-test="sidebar-site-form-btn"]', { hasText: siteFormName })).toHaveCount(1);
        await adminOrTeacherSignOut(page);
        await login(page, oldParentEmail, password);
        await waitForLoading(page);
        await expect(page.getByTestId('child-topics-page')).toBeVisible();
        await expect(page.locator('[data-test="site-form-name-heading"]', { hasText: siteFormName })).toHaveCount(1);
        await parentSignOut(page);
        await login(page, newParentEmail, password);
        await waitForLoading(page);
        await expect(page.getByTestId('child-topics-page')).toBeVisible();
        await expect(page.locator('[data-test="site-form-name-heading"]', { hasText: siteFormName })).toHaveCount(1);
        await parentSignOut(page);

        // Updates site form to target new parents and new teachers, then releases it
        await db.deleteFrom('lwp_user_interstitial').where('interstitialId', '=', siteForm.id).execute();
        await db
            .updateTable('static_lwp_interstitial')
            .set({
                userOptions: JSON.stringify([InterstitialUserOption.NEW_PARENT, InterstitialUserOption.NEW_TEACHER]),
                lastAction: InterstitialLastActionType.CLEARED
            })
            .where('id', '=', siteForm.id)
            .execute();
        await login(page, admin, password);
        await page.waitForURL(/\/admin/);
        await waitForLoading(page);
        await openSideDrawer(page);
        await page.getByTestId('site-forms-common-drawer-list').click();
        await page.waitForURL(/\/admin\/site-forms/);
        await waitForLoading(page);
        await expect(page.getByTestId('site-forms-page')).toBeVisible();
        await page.getByTestId('release-interstitial-form').click();
        await expect(page.locator('.MuiAlert-message').filter({ hasText: 'Released successfully!' })).toBeVisible();
        await expect(page.getByTestId('table-row-item').getByText('RELEASED', { exact: true })).toBeVisible();
        await adminOrTeacherSignOut(page);

        // Confirms site form is visible only to new parents and new teachers
        await login(page, oldLeaderEmail, password);
        await page.waitForURL(/\/school/);
        await waitForLoading(page);
        await expect(page.locator('[data-test="sidebar-site-form-btn"]', { hasText: siteFormName })).toHaveCount(0);
        await adminOrTeacherSignOut(page);
        await login(page, newLeaderEmail, password);
        await page.waitForURL(/\/school/);
        await waitForLoading(page);
        await page.getByRole('button', { name: 'Not now' }).click();
        await expect(page.locator('[data-test="sidebar-site-form-btn"]', { hasText: siteFormName })).toHaveCount(1);
        await adminOrTeacherSignOut(page);
        await login(page, oldParentEmail, password);
        await waitForLoading(page);
        await expect(page.getByTestId('child-topics-page')).toBeVisible();
        await expect(page.locator('[data-test="site-form-name-heading"]', { hasText: siteFormName })).toHaveCount(0);
        await parentSignOut(page);
        await login(page, newParentEmail, password);
        await waitForLoading(page);
        await expect(page.getByTestId('child-topics-page')).toBeVisible();
        await expect(page.locator('[data-test="site-form-name-heading"]', { hasText: siteFormName })).toHaveCount(1);
        await parentSignOut(page);

        // Update and releases the site form (linked to a subject) to all parents and teachers
        await db.deleteFrom('lwp_user_interstitial').where('interstitialId', '=', siteForm.id).execute();
        await db
            .updateTable('static_lwp_interstitial')
            .set({
                userOptions: JSON.stringify([InterstitialUserOption.PARENT, InterstitialUserOption.TEACHER]),
                lastAction: InterstitialLastActionType.CLEARED,
                subjectId: mathsSubjectId
            })
            .where('id', '=', siteForm.id)
            .execute();
        await login(page, admin, password);
        await page.waitForURL(/\/admin/);
        await waitForLoading(page);
        await openSideDrawer(page);
        await page.getByTestId('site-forms-common-drawer-list').click();
        await page.waitForURL(/\/admin\/site-forms/);
        await waitForLoading(page);
        await expect(page.getByTestId('site-forms-page')).toBeVisible();
        await page.getByTestId('release-interstitial-form').click();
        await expect(page.locator('.MuiAlert-message').filter({ hasText: 'Released successfully!' })).toBeVisible();
        await expect(page.getByTestId('table-row-item').getByText('RELEASED', { exact: true })).toBeVisible();
        await adminOrTeacherSignOut(page);

        // Confirms that the subject-based site form is only shown to parents and teachers whose pupils have the relevant subject topics
        await login(page, oldLeaderEmail, password);
        await page.waitForURL(/\/school/);
        await waitForLoading(page);
        await expect(page.locator('[data-test="sidebar-site-form-btn"]', { hasText: siteFormName })).toHaveCount(0);
        await adminOrTeacherSignOut(page);
        await login(page, newLeaderEmail, password);
        await page.waitForURL(/\/school/);
        await waitForLoading(page);
        await page.getByRole('button', { name: 'Not now' }).click();
        await expect(page.locator('[data-test="sidebar-site-form-btn"]', { hasText: siteFormName })).toHaveCount(1);
        await adminOrTeacherSignOut(page);
        await login(page, oldParentEmail, password);
        await waitForLoading(page);
        await expect(page.getByTestId('child-topics-page')).toBeVisible();
        await expect(page.locator('[data-test="site-form-name-heading"]', { hasText: siteFormName })).toHaveCount(0);
        await parentSignOut(page);
        await login(page, newParentEmail, password);
        await waitForLoading(page);
        await expect(page.getByTestId('child-topics-page')).toBeVisible();
        await expect(page.locator('[data-test="site-form-name-heading"]', { hasText: siteFormName })).toHaveCount(1);
        await parentSignOut(page);

        // // Schedules the same topic in an existing class to ensure visibility in previous structures
        const classTopic2 = await utils.createClassTopic(oldSchoolClass.id, {
            topicId: staticTopic?.id,
            releaseDate: todayDate,
            released: true
        });
        const pupilTopic2 = await utils.createPupilTopic({
            releaseDate: todayDate,
            pupilId: oldPupil.id,
            classTopicId: classTopic2.id,
            topicId: staticTopic.id,
            watchedVideo: false,
            periodIndex: currentPeriod.index,
            silverStars: 0,
            earnedGoldStar: false
        });
        await utils.createPupilActivity({
            pupilId: oldPupil.id,
            topicId: pupilTopic2.id,
            activityId: staticActivity1.id,
            earnedStar: true,
            mathscotActivityItemIds: JSON.stringify([88, 188, 224])
        });
        await utils.createPupilActivity({
            pupilId: oldPupil.id,
            topicId: pupilTopic2.id,
            activityId: staticActivity2.id,
            earnedStar: false,
            mathscotActivityItemIds: JSON.stringify([88, 188, 224])
        });

        // Verifies that the new topic is visible to both old and new parents after release
        await login(page, oldParentEmail, password);
        await waitForLoading(page);
        await expect(page.getByTestId('child-topics-page')).toBeVisible();
        await page.getByText(myTopic2Name).nth(0).click();
        await waitForLoading(page);
        await page.getByRole('heading', { name: myTopic2Name }).click();
        await expect(page.getByRole('heading', { name: myTopic2Name })).toBeVisible();
        await parentSignOut(page);
        await login(page, newParentEmail, password);
        await waitForLoading(page);
        await expect(page.getByTestId('child-topics-page')).toBeVisible();
        await page.getByText(myTopic2Name).nth(0).click();
        await waitForLoading(page);
        await page.getByRole('heading', { name: myTopic2Name }).click();
        await expect(page.getByRole('heading', { name: myTopic2Name })).toBeVisible();
        await parentSignOut(page);

        // Clear and re-releases the site form (linked to a subject) to all parents and teachers
        await db.deleteFrom('lwp_user_interstitial').where('interstitialId', '=', siteForm.id).execute();
        await db
            .updateTable('static_lwp_interstitial')
            .set({
                userOptions: JSON.stringify([InterstitialUserOption.PARENT, InterstitialUserOption.TEACHER]),
                lastAction: InterstitialLastActionType.CLEARED,
                subjectId: mathsSubjectId
            })
            .where('id', '=', siteForm.id)
            .execute();
        await login(page, admin, password);
        await page.waitForURL(/\/admin/);
        await waitForLoading(page);
        await openSideDrawer(page);
        await page.getByTestId('site-forms-common-drawer-list').click();
        await page.waitForURL(/\/admin\/site-forms/);
        await waitForLoading(page);
        await expect(page.getByTestId('site-forms-page')).toBeVisible();
        await page.getByTestId('release-interstitial-form').click();
        await expect(page.locator('.MuiAlert-message').filter({ hasText: 'Released successfully!' })).toBeVisible();
        await expect(page.getByTestId('table-row-item').getByText('RELEASED', { exact: true })).toBeVisible();
        await adminOrTeacherSignOut(page);

        // Confirms subject-based site form is visible only to new parents and new teachers
        await login(page, oldLeaderEmail, password);
        await page.waitForURL(/\/school/);
        await waitForLoading(page);
        await page.getByRole('button', { name: 'Not now' }).click();
        await expect(page.locator('[data-test="sidebar-site-form-btn"]', { hasText: siteFormName })).toHaveCount(1);
        await adminOrTeacherSignOut(page);
        await login(page, newLeaderEmail, password);
        await page.waitForURL(/\/school/);
        await waitForLoading(page);
        await page.getByRole('button', { name: 'Not now' }).click();
        await expect(page.locator('[data-test="sidebar-site-form-btn"]', { hasText: siteFormName })).toHaveCount(1);
        await adminOrTeacherSignOut(page);
        await login(page, oldParentEmail, password);
        await waitForLoading(page);
        await expect(page.getByTestId('child-topics-page')).toBeVisible();
        await expect(page.locator('[data-test="site-form-name-heading"]', { hasText: siteFormName })).toHaveCount(1);
        await parentSignOut(page);
        await login(page, newParentEmail, password);
        await waitForLoading(page);
        await expect(page.getByTestId('child-topics-page')).toBeVisible();
        await expect(page.locator('[data-test="site-form-name-heading"]', { hasText: siteFormName })).toHaveCount(1);
        await parentSignOut(page);

        // Update site form: add school tag and target all parents + all teachers, then release
        await db.deleteFrom('lwp_user_interstitial').where('interstitialId', '=', siteForm.id).execute();
        await db
            .updateTable('static_lwp_interstitial')
            .set({
                name: taggedFormName,
                userOptions: JSON.stringify([InterstitialUserOption.PARENT, InterstitialUserOption.TEACHER]),
                lastAction: InterstitialLastActionType.CLEARED,
                subjectId: null
            })
            .where('id', '=', siteForm.id)
            .execute();
        await db
            .insertInto('static_lwp_interstitial_school_tags')
            .values({ staticLwpInterstitialId: siteForm.id, staticLwpSchoolTagId: newSchoolTag.id })
            .execute();
        await login(page, admin, password);
        await page.waitForURL(/\/admin/);
        await waitForLoading(page);
        await openSideDrawer(page);
        await page.getByTestId('site-forms-common-drawer-list').click();
        await page.waitForURL(/\/admin\/site-forms/);
        await waitForLoading(page);
        await expect(page.getByTestId('site-forms-page')).toBeVisible();
        await page.getByTestId('release-interstitial-form').click();
        await expect(page.locator('.MuiAlert-message').filter({ hasText: 'Released successfully!' })).toBeVisible();
        await expect(page.getByTestId('table-row-item').getByText('RELEASED', { exact: true })).toBeVisible();
        await adminOrTeacherSignOut(page);

        // Check tag-only release: tagged school teachers and parents see the form; non-tagged schools do not
        // Teachers in the tagged school see the form
        await login(page, newLeaderEmail, password);
        await page.waitForURL(/\/school/);
        await waitForLoading(page);
        await page.getByRole('button', { name: 'Not now' }).click();
        await expect(page.locator('[data-test="sidebar-site-form-btn"]', { hasText: taggedFormName })).toHaveCount(1);
        await adminOrTeacherSignOut(page);

        // Parents in the tagged school see the form
        await login(page, newParentEmail, password);
        await waitForLoading(page);
        await expect(page.getByTestId('child-topics-page')).toBeVisible();
        await expect(page.locator('[data-test="site-form-name-heading"]', { hasText: taggedFormName })).toHaveCount(1);
        await parentSignOut(page);

        // Teachers in non-tagged schools do not see the form
        await login(page, oldLeaderEmail, password);
        await page.waitForURL(/\/school/);
        await waitForLoading(page);
        await expect(page.locator('[data-test="sidebar-site-form-btn"]', { hasText: taggedFormName })).toHaveCount(0);
        await adminOrTeacherSignOut(page);

        // Parents in non-tagged schools do not see the form
        await login(page, oldParentEmail, password);
        await waitForLoading(page);
        await expect(page.getByTestId('child-topics-page')).toBeVisible();
        await expect(page.locator('[data-test="site-form-name-heading"]', { hasText: taggedFormName })).toHaveCount(0);
        await parentSignOut(page);

        // // Edit the school tag to add the LWP school
        await db
            .insertInto('lwp_school_static_tags')
            .values({
                isProgramTag: false,
                tagId: newSchoolTag.id,
                schoolId: oldSchool.id
            })
            .returningAll()
            .executeTakeFirstOrThrow();

        // Update site form: target New Parents + New Teachers with the updated tag, then release
        await db.deleteFrom('lwp_user_interstitial').where('interstitialId', '=', siteForm.id).execute();
        await db
            .updateTable('static_lwp_interstitial')
            .set({
                name: taggedFormName,
                userOptions: JSON.stringify([InterstitialUserOption.NEW_PARENT, InterstitialUserOption.NEW_TEACHER]),
                lastAction: InterstitialLastActionType.CLEARED,
                subjectId: null
            })
            .where('id', '=', siteForm.id)
            .execute();
        await login(page, admin, password);
        await page.waitForURL(/\/admin/);
        await waitForLoading(page);
        await openSideDrawer(page);
        await page.getByTestId('site-forms-common-drawer-list').click();
        await page.waitForURL(/\/admin\/site-forms/);
        await waitForLoading(page);
        await expect(page.getByTestId('site-forms-page')).toBeVisible();
        await page.getByTestId('release-interstitial-form').click();
        await expect(page.locator('.MuiAlert-message').filter({ hasText: 'Released successfully!' })).toBeVisible();
        await expect(page.getByTestId('table-row-item').getByText('RELEASED', { exact: true })).toBeVisible();
        await adminOrTeacherSignOut(page);

        // Check tag-only + new users: only new parents/teachers in tagged schools see the form
        // New teacher in tagged schools see the form
        await login(page, newLeaderEmail, password);
        await page.waitForURL(/\/school/);
        await waitForLoading(page);
        await page.getByRole('button', { name: 'Not now' }).click();
        await expect(page.locator('[data-test="sidebar-site-form-btn"]', { hasText: taggedFormName })).toHaveCount(1);
        await adminOrTeacherSignOut(page);

        // New parent in tagged schools see the form
        await login(page, newParentEmail, password);
        await waitForLoading(page);
        await expect(page.getByTestId('child-topics-page')).toBeVisible();
        await expect(page.locator('[data-test="site-form-name-heading"]', { hasText: taggedFormName })).toHaveCount(1);
        await parentSignOut(page);

        // Existing teachers in tagged schools do not see the form
        await login(page, oldLeaderEmail, password);
        await page.waitForURL(/\/school/);
        await waitForLoading(page);
        await expect(page.locator('[data-test="sidebar-site-form-btn"]', { hasText: taggedFormName })).toHaveCount(0);
        await adminOrTeacherSignOut(page);

        // Existing parents in tagged schools do not see the form
        await login(page, oldParentEmail, password);
        await waitForLoading(page);
        await expect(page.getByTestId('child-topics-page')).toBeVisible();
        await expect(page.locator('[data-test="site-form-name-heading"]', { hasText: taggedFormName })).toHaveCount(0);
        await parentSignOut(page);

        // Create a new subject topic and release to old parents and teachers
        const anotherStaticTopic = await utils.createStaticTopic({
            isReading: false,
            teacherTopicName: anotherTopicName,
            parentTopicName: anotherTopicName,
            isPublished: true,
            video: '605069004',
            logCreatedById: user.id,
            logUpdatedById: user.id
        });
        await db
            .insertInto('static_lwp_topic_domain_year_group')
            .values({
                domainId: moneySkillsDomainId,
                topicId: anotherStaticTopic.id,
                yearGroupId: '1'
            })
            .executeTakeFirstOrThrow();
        const anotherStaticActivity1 = await utils.createStaticActivity({
            name: activity_one,
            activityType: 'LEGACY',
            order: 1,
            topicId: anotherStaticTopic.id,
            logCreatedById: user.id,
            logUpdatedById: user.id
        });
        const anotherStaticActivity2 = await utils.createStaticActivity({
            name: activity_two,
            activityType: 'LEGACY',
            order: 2,
            topicId: anotherStaticTopic.id,
            logCreatedById: user.id,
            logUpdatedById: user.id
        });
        const anotherClassTopic = await utils.createClassTopic(oldSchoolClass.id, {
            topicId: anotherStaticTopic?.id,
            releaseDate: todayDate,
            released: true
        });
        const anotherPupilTopic = await utils.createPupilTopic({
            releaseDate: todayDate,
            pupilId: oldPupil.id,
            classTopicId: anotherClassTopic.id,
            topicId: anotherStaticTopic.id,
            watchedVideo: false,
            periodIndex: currentPeriod.index,
            silverStars: 0,
            earnedGoldStar: false
        });
        await utils.createPupilActivity({
            pupilId: oldPupil.id,
            topicId: anotherPupilTopic.id,
            activityId: anotherStaticActivity1.id,
            earnedStar: false,
            mathscotActivityItemIds: JSON.stringify([88, 188, 224])
        });
        await utils.createPupilActivity({
            pupilId: oldPupil.id,
            topicId: anotherPupilTopic.id,
            activityId: anotherStaticActivity2.id,
            earnedStar: false,
            mathscotActivityItemIds: JSON.stringify([88, 188, 224])
        });

        // Update and releases the site form (linked to a subject) to all parents and teachers
        await db.deleteFrom('lwp_user_interstitial').where('interstitialId', '=', siteForm.id).execute();
        await db
            .updateTable('static_lwp_interstitial')
            .set({
                name: taggedFormName,
                userOptions: JSON.stringify([InterstitialUserOption.PARENT, InterstitialUserOption.TEACHER]),
                lastAction: InterstitialLastActionType.CLEARED,
                subjectId: moneySkillsSubjectId
            })
            .where('id', '=', siteForm.id)
            .execute();
        await login(page, admin, password);
        await page.waitForURL(/\/admin/);
        await waitForLoading(page);
        await openSideDrawer(page);
        await page.getByTestId('site-forms-common-drawer-list').click();
        await page.waitForURL(/\/admin\/site-forms/);
        await waitForLoading(page);
        await expect(page.getByTestId('site-forms-page')).toBeVisible();
        await page.getByTestId('release-interstitial-form').click();
        await expect(page.locator('.MuiAlert-message').filter({ hasText: 'Released successfully!' })).toBeVisible();
        await expect(page.getByTestId('table-row-item').getByText('RELEASED', { exact: true })).toBeVisible();
        await adminOrTeacherSignOut(page);

        // Check subject + tag release: only users in tagged schools with the subject see the form
        // LWP school has English scheduled, so its teachers see the form
        await login(page, oldLeaderEmail, password);
        await page.waitForURL(/\/school/);
        await waitForLoading(page);
        await page.getByRole('button', { name: 'Not now' }).click();
        await expect(page.locator('[data-test="sidebar-site-form-btn"]', { hasText: taggedFormName })).toHaveCount(1);
        await adminOrTeacherSignOut(page);

        // LWP parents see the subject-based form
        await login(page, oldParentEmail, password);
        await waitForLoading(page);
        await expect(page.getByTestId('child-topics-page')).toBeVisible();
        await expect(page.locator('[data-test="site-form-name-heading"]', { hasText: taggedFormName })).toHaveCount(1);
        await parentSignOut(page);

        // New school teachers do not see the form (no English topics scheduled there)
        await login(page, newLeaderEmail, password);
        await page.waitForURL(/\/school/);
        await waitForLoading(page);
        await expect(page.locator('[data-test="sidebar-site-form-btn"]', { hasText: taggedFormName })).toHaveCount(0);
        await adminOrTeacherSignOut(page);

        // New school parents do not see the form (no English topics have been assigned to their pupils)
        await login(page, newParentEmail, password);
        await waitForLoading(page);
        await expect(page.getByTestId('child-topics-page')).toBeVisible();
        await expect(page.locator('[data-test="site-form-name-heading"]', { hasText: taggedFormName })).toHaveCount(0);
        await parentSignOut(page);

        // Shows validation error when selecting 'New Parents' and 'New Teachers' with a subject in site form
        await db.deleteFrom('lwp_user_interstitial').where('interstitialId', '=', siteForm.id).execute();
        await db
            .updateTable('static_lwp_interstitial')
            .set({
                name: taggedFormName,
                userOptions: JSON.stringify([InterstitialUserOption.PARENT, InterstitialUserOption.TEACHER]),
                lastAction: InterstitialLastActionType.CLEARED,
                subjectId: moneySkillsSubjectId
            })
            .where('id', '=', siteForm.id)
            .execute();
        await login(page, admin, password);
        await page.waitForURL(/\/admin/);
        await waitForLoading(page);
        await openSideDrawer(page);
        await page.getByTestId('site-forms-common-drawer-list').click();
        await page.waitForURL(/\/admin\/site-forms/);
        await waitForLoading(page);
        await expect(page.getByTestId('site-forms-page')).toBeVisible();
        await page.getByTestId('edit-interstitial-form').click();
        await waitForLoading(page);
        await page.getByTestId('add-interstitial-form-user-options-multi-select').click();
        await page.getByRole('button', { name: 'Clear', exact: true }).last().click();
        await page.getByRole('option', { name: 'New Teachers', exact: true }).click();
        await page.getByTestId('add-interstitial-form-user-options-multi-select').click();
        await page.getByRole('option', { name: 'New Parents', exact: true }).click();
        await page.locator('[data-test="dialog-primary-btn"]').click();
        await waitForLoading(page);
        await expect(
            page.getByText(
                "'New Parents' and 'New Teachers' options are only allowed when no subject is selected. Please remove them to proceed."
            )
        ).toBeVisible();
    });
});

const dataCleanUp = async (db: Kysely<Schema.DB>): Promise<void> => {
    await db.deleteFrom('lwp_user_interstitial').execute();
    await db.deleteFrom('static_lwp_interstitial_school_tags').execute();
    await db.deleteFrom('static_lwp_interstitial').execute();
};
