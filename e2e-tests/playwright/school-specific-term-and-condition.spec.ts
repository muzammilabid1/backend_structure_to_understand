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
    acceptPupilInvitation,
    adminOrTeacherSignOut,
    formatDate,
    getInputBoxByName,
    getTextAreaBoxByName,
    login,
    openSideDrawer,
    waitForLoading,
    watchVideoAndUnlockActivities
} from './utils';
import { PupilParentStatus, UserStatus, UserType } from 'lwp-shared';

test.describe('School Terms & Policy Configuration Flow', () => {
    let db: Kysely<Schema.DB>;
    let utils: ReturnType<typeof createUtils>;

    test.beforeAll(async () => {
        db = createDb();
        utils = createUtils(db);
    });

    test.afterAll(async () => {
        await db.destroy();
    });

    test('School Terms & Policy Configuration Flow', async ({ page }) => {
        const mySchoolName: string = `${generateSchoolName()} School`;
        const leaderFirstName: string = generateFirstName();
        const leaderlastName: string = generateLastName();
        const schoolEmail: string = generateUserEmail(leaderFirstName, leaderlastName);
        const parentFirstName: string | null = generateFirstName();
        const parentLastName: string | null = generateLastName();
        const parentEmail: string = generateUserEmail(parentFirstName, parentLastName);
        const myClassName: string = generateClassName();
        const myTopicName: string = generateTopicName();
        const activity_one: string = `${myTopicName} one`;
        const activity_two: string = `${myTopicName} two`;
        const pupil1FirstName: string | null = generateFirstName();
        const pupil1LastName: string | null = generateLastName();
        const pupil2FirstName: string = generateFirstName();
        const pupil2LastName: string = generateLastName();
        const terms_and_conditions = `${mySchoolName} Terms and Condition`;
        const privacy_and_policy = `${mySchoolName} privacy policy`;
        const organisations = `Test ${mySchoolName}`;
        const today: Date = new Date();
        const todayDate: string = formatDate();

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
            organisations,
            termsAndConditions: `<p class="editor-paragraph" dir="ltr"><span style="white-space: pre-wrap;">${terms_and_conditions}</span></p>`,
            privacyPolicy: `<p class="editor-paragraph" dir="ltr"><span style="white-space: pre-wrap;">${privacy_and_policy}</span></p>`,
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
            readingLaunchDate: todayDate,
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
        const classTopic1 = await utils.createClassTopic(schoolClass.id, {
            topicId: staticTopic?.id,
            releaseDate: todayDate,
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
        await utils.addParentToPupil(pupil1.id, parent.id, true, PupilParentStatus.INVITED);
        await utils.addPupilToClass(pupil1.id, schoolClass.id);
        const pupilTopic1 = await utils.createPupilTopic({
            releaseDate: todayDate,
            pupilId: pupil1.id,
            classTopicId: classTopic1.id,
            topicId: staticTopic.id,
            watchedVideo: true,
            periodIndex: currentPeriod.index,
            silverStars: 1,
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
        await utils.addParentToPupil(pupil2.id, parent.id, true, PupilParentStatus.INVITED);
        await utils.addPupilToClass(pupil2.id, schoolClass.id);
        const pupilTopic2 = await utils.createPupilTopic({
            releaseDate: todayDate,
            pupilId: pupil2.id,
            classTopicId: classTopic1.id,
            topicId: staticTopic.id,
            watchedVideo: true,
            periodIndex: currentPeriod.index,
            silverStars: 1,
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

        // Admin can configure Terms, Privacy Policy & Organisations
        await login(page, admin, password);
        await page.waitForURL(/\/admin/);
        await openSideDrawer(page);
        await page.getByTestId('site-parameters-common-drawer-list').click();
        await page.waitForURL(/\/admin\/parameters/);
        await expect(page.getByTestId('site-parameters-page')).toBeVisible();
        await getTextAreaBoxByName(page, 'mandatory').fill('My organisation is {{{ORGANISATIONS}}} ');
        await page.getByTestId('comment-photo-permissions-save-button').click();
        await waitForLoading(page);
        await expect(page.locator('.MuiAlert-message').filter({ hasText: 'Update parameter successfully' })).toBeVisible();
        await adminOrTeacherSignOut(page);

        // School specific terms & condition, privacy policy and organisations for New School
        await login(page, parentEmail, password);
        await page.waitForURL(/\/parent/);
        await waitForLoading(page);
        await expect(page.getByTestId('parent-children-page')).toBeVisible();
        await page.locator(`[data-test="invited-child-card-${pupil1FirstName}"]`).locator('.invited-child-button').click();
        await page.waitForURL(/\/welcome/);
        await waitForLoading(page);
        await acceptPupilInvitation(page, false);
        await page.locator('u:has-text("terms and conditions")').click();
        await expect(page.locator('.MuiDialogContent-root p', { hasText: terms_and_conditions })).toHaveCount(1);
        await page.keyboard.press('Escape');
        await page.locator('u:has-text("privacy policy")').click();
        await expect(page.locator('.MuiDialogContent-root p', { hasText: privacy_and_policy })).toHaveCount(1);
        await page.keyboard.press('Escape');
        await getInputBoxByName(page, 'policy').check();
        await expect(getInputBoxByName(page, 'policy')).toBeChecked();
        await page.getByRole('button', { name: 'Get started' }).click();
        await waitForLoading(page);
        await expect(page.locator('.MuiAlert-message').filter({ hasText: 'Pupil invitation accepted!' })).toBeVisible();
        await page.waitForURL(/\/child\/\d+\/reading/);
        await waitForLoading(page);
        await expect(page.getByTestId('child-reading-log-page')).toBeVisible();
        await acceptFeatureTooltipPrompt(page);
        await expect(page.getByTestId('child-reading-log-page')).toBeVisible();
        await acceptFeatureTooltipPrompt(page);
        await waitForLoading(page);
        await page.waitForSelector('[data-test="topics-tab"]', { state: 'visible' });
        await page.getByTestId('topics-tab').click();
        await page.waitForURL(/\/child\/\d+\/topics/);
        await waitForLoading(page);
        await expect(page.getByTestId('child-topics-page')).toBeVisible();
        await page.getByText(myTopicName).first().click();
        await page.waitForURL(/\/topic/);
        await waitForLoading(page);
        await expect(page.getByRole('heading', { name: myTopicName })).toBeVisible();
        await watchVideoAndUnlockActivities(page);
        await page.getByText(activity_one).first().click();
        await page.waitForURL(/\/activity/);
        await waitForLoading(page);
        let updatePermisisonsLink = page.getByTestId('update-photo-permission-link');
        if (await updatePermisisonsLink.isVisible()) {
            await updatePermisisonsLink.click();
        }
        await expect(page.locator('[data-test="pupil-activity-feedback-share-with-teacher-checkbox-label"]')).toContainText(organisations);
        await db
            .updateTable('lwp_school')
            .set({ termsAndConditions: null, privacyPolicy: null, organisations: 'Learning with Parents' })
            .where('id', '=', school.id)
            .execute();
        await page.getByTestId('header-logo').click();
        await page.waitForURL(/\/parent/);
        await waitForLoading(page);

        // School specific terms & condition, privacy policy and organisations for Existing School
        await expect(page.getByTestId('parent-children-page')).toBeVisible();
        await page.locator(`[data-test="invited-child-card-${pupil2FirstName}"]`).locator('.invited-child-button').click();
        await page.waitForURL(/\/welcome/);
        await waitForLoading(page);
        await acceptPupilInvitation(page, false);
        await page.locator('u:has-text("terms and conditions")').click();
        await expect(page.locator('.MuiDialogContent-root p', { hasText: terms_and_conditions })).toHaveCount(0);
        await page.keyboard.press('Escape');
        await page.locator('u:has-text("privacy policy")').click();
        await expect(page.locator('.MuiDialogContent-root p', { hasText: privacy_and_policy })).toHaveCount(0);
        await page.keyboard.press('Escape');
        await getInputBoxByName(page, 'policy').check();
        await expect(getInputBoxByName(page, 'policy')).toBeChecked();
        await page.getByRole('button', { name: 'Get started' }).click();
        await waitForLoading(page);
        await expect(page.locator('.MuiAlert-message').filter({ hasText: 'Pupil invitation accepted!' })).toBeVisible();
        await page.waitForURL(/\/child\/\d+\/reading/);
        await waitForLoading(page);
        await acceptFeatureTooltipPrompt(page);
        await waitForLoading(page);
        await page.getByTestId('topics-tab').click();
        await page.waitForURL(/\/child\/\d+\/topics/);
        await waitForLoading(page);
        await expect(page.getByTestId('child-topics-page')).toBeVisible();
        await page.getByText(myTopicName).first().click();
        await page.waitForURL(/\/topic/);
        await waitForLoading(page);
        await expect(page.getByRole('heading', { name: myTopicName })).toBeVisible();
        await watchVideoAndUnlockActivities(page);
        await page.getByText(activity_one).first().click();
        await page.waitForURL(/\/activity/);
        await waitForLoading(page);
        updatePermisisonsLink = page.getByTestId('update-photo-permission-link');
        if (await updatePermisisonsLink.isVisible()) {
            await updatePermisisonsLink.click();
        }
        await expect(page.locator('[data-test="pupil-activity-feedback-share-with-teacher-checkbox-label"]')).not.toContainText(
            organisations
        );
    });
});
