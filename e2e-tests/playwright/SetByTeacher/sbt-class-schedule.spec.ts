import { test, expect } from '@playwright/test';
import type { Schema } from '@lwp/postgres-client';
import { type Kysely } from 'kysely';
import path from 'path';
import { createDb } from '../db';
import { createUtils } from '../dbUtils';
import {
    admin,
    generateFirstName,
    generateLastName,
    generateSchoolName,
    generateTopicName,
    generateUserEmail,
    password,
    readyTeddySubjectName
} from '../constants';
import {
    adminOrTeacherSignOut,
    createSchoolAndDummyWondeData,
    getDate,
    getInputBoxByName,
    login,
    openSideDrawer,
    parentSignOut,
    releaseTopicsUpToADate,
    safeClick,
    waitForLoading
} from '../utils';
import { UserStatus } from 'lwp-shared';

test.describe('Set By Teacher', () => {
    let db: Kysely<Schema.DB>;
    let utils: ReturnType<typeof createUtils>;

    test.beforeAll(async () => {
        db = createDb();
        utils = createUtils(db);
    });

    test.afterAll(async () => {
        await db.destroy();
    });

    test('Admin creates Ready Teddy topic with 2 SBT steps; teacher schedules with 1 photo, then replaces it; verifies pre/post-release behaviour and parent view', async ({
        page
    }) => {
        // --- Test data ---
        const mySchoolName = `${generateSchoolName()} School`;
        const leaderFirstName = generateFirstName();
        const leaderLastName = generateLastName();
        const leaderEmail = generateUserEmail(leaderFirstName, leaderLastName);
        const topicName = generateTopicName();
        const activityName = `${topicName} Activity`;
        const sbtHeading1 = `${mySchoolName} Classroom`;
        const sbtSubHeading1 = `${mySchoolName} Upload a photo of your classroom`;
        const sbtHeading2 = `${mySchoolName} About you`;
        const sbtSubHeading2 = `${mySchoolName} Upload a photo of yourself`;
        const parentMessageText = `${mySchoolName} This is our classroom where we do all our learning!`;
        const updatedParentMessageText = `${mySchoolName} Updated from week-by-week: this is where we learn!`;
        const hiddenActivityName = `${topicName} Hidden Activity`;
        const hiddenSbtHeading1 = `${mySchoolName} Hidden Classroom`;
        const hiddenSbtHeading2 = `${mySchoolName} Hidden About you`;

        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const dateTomorrowForUI = getDate(tomorrow);

        // Create school with future academic year class + Ready Teddy licence
        const {
            parent,
            pupil,
            class: lwpClass
        } = await createSchoolAndDummyWondeData(
            db,
            utils,
            {
                school: {
                    name: mySchoolName,
                    numOfFullProgrammeClassesAllowed: 10,
                    numOfTotalClassesAllowed: 30,
                    enableAddClasses: true,
                    isMoneySkillsAvailable: false,
                    isReadyTeddyAvailable: true,
                    isFutureAcademicYear: true,
                    isParentFeedbackReplyFeatureEnabled: false
                },
                leader: {
                    firstname: leaderFirstName,
                    lastname: leaderLastName,
                    email: leaderEmail,
                    userStatus: UserStatus.ACTIVE,
                    addTooltip: true
                }
            },
            {
                active: true,
                classLicences: {
                    IsReadingLogsEnabled: false,
                    isFullProgramme: true,
                    isReadyTeddyEnabled: true
                }
            }
        );

        if (!parent || !pupil || !lwpClass)
            throw new Error('createSchoolAndDummyWondeData with active:true must return parent, pupil and class');

        const mediaForClass = () =>
            db
                .selectFrom('lwp_set_by_teacher_step_media as media')
                .innerJoin('lwp_class_topic as classTopic', 'classTopic.id', 'media.classTopicId')
                .where('classTopic.classId', '=', lwpClass.id)
                .select(['media.stepId', 'media.filename'])
                .execute();

        // ----------------------------------------------------------------
        // Admin: Create Ready Teddy topic for Reception, add activity with 2 SBT steps
        // ----------------------------------------------------------------
        await login(page, admin, password);
        await page.waitForURL(/\/admin/);
        await waitForLoading(page);

        // Create topic
        await page.getByTestId('topics-common-drawer-list').click();
        await waitForLoading(page);
        await page.getByText('Add a topic').click();
        await waitForLoading(page);
        await getInputBoxByName(page, 'teacherTopicName').fill(topicName);
        await getInputBoxByName(page, 'domainAndYearGroupIds').click();
        // Select the Ready Teddy + Reception year group option
        await page.getByRole('option', { name: 'Year 1: Ready teddy' }).click();
        await page.getByRole('button', { name: 'Publish' }).click();
        await waitForLoading(page);
        await expect(page.locator('.MuiAlert-message').filter({ hasText: 'New topic created' })).toBeVisible();
        await waitForLoading(page);

        // Navigate to topic details and mark it as no-video (LEA-6094)
        await safeClick(page.getByTestId('table-row-item').getByText(topicName));
        await waitForLoading(page);
        await page.getByLabel('No video content').check();
        // Video ID field should be hidden once noVideo is checked
        await expect(page.getByLabel('Video ID')).not.toBeVisible();
        await page.getByRole('button', { name: 'Update details' }).click();
        await waitForLoading(page);
        await expect(page.locator('.MuiAlert-message').filter({ hasText: 'Change saved!' })).toBeVisible();
        await waitForLoading(page);

        // Navigate to activities tab to add SBT steps
        await page.getByText('Activities').click();
        await waitForLoading(page);
        await page.getByText('Add an activity').click();
        await waitForLoading(page);
        await getInputBoxByName(page, 'name').fill(activityName);
        await getInputBoxByName(page, 'welcomeMessage').fill('Welcome to this activity');
        await getInputBoxByName(page, 'order').fill('1');
        await page.getByTestId('activity-type-select').click();
        await page.getByRole('option', { name: 'Legacy' }).click();
        await page.getByRole('button', { name: 'Add activity' }).click();
        await waitForLoading(page);
        await expect(page.locator('.MuiAlert-message').filter({ hasText: 'New activity created' })).toBeVisible();
        await waitForLoading(page);

        // Navigate to the activity details page to add SBT steps
        await safeClick(page.getByTestId('table-row-item').getByText(activityName));
        await page.waitForURL(/\/admin\/activity\/\d+/);
        await waitForLoading(page);
        const activityId = page.url().match(/\/admin\/activity\/(\d+)/)?.[1];
        expect(activityId).toBeTruthy();

        // Add first SBT step via the "+" add-step button
        await page.getByTestId('add-step-btn').first().click();
        await expect(page.getByTestId('add-activity-step-dropdown')).toBeVisible();
        await page.getByTestId('add-activity-step-dropdown').locator('[role="combobox"]').click();
        await page.getByRole('option', { name: 'SET BY TEACHER' }).click();
        await page.getByTestId('add-step-type-btn').click();
        await waitForLoading(page);
        await getInputBoxByName(page, 'steps.0.setByTeacherData.heading').fill(sbtHeading1);
        await getInputBoxByName(page, 'steps.0.setByTeacherData.subHeading').fill(sbtSubHeading1);

        // Add second SBT step
        await page.getByTestId('add-step-btn').last().click();
        await expect(page.getByTestId('add-activity-step-dropdown')).toBeVisible();
        await page.getByTestId('add-activity-step-dropdown').locator('[role="combobox"]').click();
        await page.getByRole('option', { name: 'SET BY TEACHER' }).click();
        await page.getByTestId('add-step-type-btn').click();
        await waitForLoading(page);
        await getInputBoxByName(page, 'steps.1.setByTeacherData.heading').fill(sbtHeading2);
        await getInputBoxByName(page, 'steps.1.setByTeacherData.subHeading').fill(sbtSubHeading2);

        // 1. Before release: add-step and remove-step controls are enabled
        await expect(page.getByTestId('add-step-btn').first()).toBeEnabled();
        await expect(page.getByTestId('activity-step-remove-btn').first()).toBeEnabled();

        // Save the activity with both SBT steps
        await page.getByRole('button', { name: 'Update details' }).click();
        await waitForLoading(page);
        await expect(page.locator('.MuiAlert-message').filter({ hasText: 'Changes saved' })).toBeVisible();

        // ----------------------------------------------------------------
        // Admin: Add a second activity with SBT steps and hide it (LEA-6141)
        // ----------------------------------------------------------------

        await page.getByRole('button', { name: 'Go back to topic' }).click();
        await waitForLoading(page);
        await page.getByText('Activities').click();
        await waitForLoading(page);

        await page.getByText('Add an activity').click();
        await waitForLoading(page);
        await getInputBoxByName(page, 'name').fill(hiddenActivityName);
        await getInputBoxByName(page, 'welcomeMessage').fill('Welcome to this hidden activity');
        await getInputBoxByName(page, 'order').fill('2');
        await page.getByTestId('activity-type-select').click();
        await page.getByRole('option', { name: 'Legacy' }).click();
        await page.getByRole('button', { name: 'Add activity' }).click();
        await waitForLoading(page);
        await expect(page.locator('.MuiAlert-message').filter({ hasText: 'New activity created' })).toBeVisible();
        await waitForLoading(page);

        await safeClick(page.getByTestId('table-row-item').getByText(hiddenActivityName));
        await page.waitForURL(/\/admin\/activity\/\d+/);

        await waitForLoading(page);

        await page.getByTestId('add-step-btn').first().click();
        await expect(page.getByTestId('add-activity-step-dropdown')).toBeVisible();
        await page.getByTestId('add-activity-step-dropdown').locator('[role="combobox"]').click();
        await page.getByRole('option', { name: 'SET BY TEACHER' }).click();
        await page.getByTestId('add-step-type-btn').click();
        await waitForLoading(page);
        await getInputBoxByName(page, 'steps.0.setByTeacherData.heading').fill(hiddenSbtHeading1);
        await getInputBoxByName(page, 'steps.0.setByTeacherData.subHeading').fill(`${mySchoolName} Hidden step 1 sub`);

        await page.getByTestId('add-step-btn').last().click();
        await expect(page.getByTestId('add-activity-step-dropdown')).toBeVisible();
        await page.getByTestId('add-activity-step-dropdown').locator('[role="combobox"]').click();
        await page.getByRole('option', { name: 'SET BY TEACHER' }).click();
        await page.getByTestId('add-step-type-btn').click();
        await waitForLoading(page);
        await getInputBoxByName(page, 'steps.1.setByTeacherData.heading').fill(hiddenSbtHeading2);
        await getInputBoxByName(page, 'steps.1.setByTeacherData.subHeading').fill(`${mySchoolName} Hidden step 2 sub`);

        await page.getByRole('button', { name: 'Update details' }).click();
        await waitForLoading(page);
        await expect(page.locator('.MuiAlert-message').filter({ hasText: 'Changes saved' })).toBeVisible();
        await waitForLoading(page);

        await page.getByTestId('hide-activity-checkbox').check();
        await page.getByRole('button', { name: 'Update details' }).click();
        await waitForLoading(page);
        await expect(page.locator('.MuiAlert-message').filter({ hasText: 'Changes saved' })).toBeVisible();

        await adminOrTeacherSignOut(page);

        // ----------------------------------------------------------------
        // School leader: Schedule topic and upload a photo for step 1 only
        // ----------------------------------------------------------------
        await login(page, leaderEmail, password);
        await page.waitForURL(/\/school/);
        await waitForLoading(page);

        await page.locator('[data-test="active-registration-class-name"]', { hasText: lwpClass.name! }).click();
        await page.waitForURL(/\/class/);
        await waitForLoading(page);

        // Find topic on the schedule tab
        await page.getByTestId('common-nav-schedule-tab').click();
        await waitForLoading(page);
        await page.getByTestId('class-schedule-year-group-multi-select').click();
        await page.getByRole('option', { name: 'Year 1' }).click();
        await page.getByTestId('class-schedule-subject-multi-select').click();
        await page.getByRole('option', { name: readyTeddySubjectName }).click();
        await getInputBoxByName(page, 'search').fill(topicName);
        await page.getByTestId('class-schedule-topic-search-button').click();
        await waitForLoading(page);

        // Open the schedule modal
        await page.getByRole('button', { name: 'Select topic' }).click();
        await waitForLoading(page);

        // Set start date (today — minDate constraint prevents past dates in the picker)
        await page.locator('input[name="startDate"]').fill(dateTomorrowForUI);

        // 2. The SBT "Add more details" accordion must be visible for SBT topics
        await expect(page.getByTestId('set-by-teacher-accordion')).toBeVisible();

        // Expand the accordion to reveal the per-step upload cards
        await page.getByTestId('set-by-teacher-accordion-summary').click();
        await waitForLoading(page);

        // 3. Both SBT step upload cards are visible before scheduling
        await expect(page.getByTestId('set-by-teacher-upload-card').filter({ hasText: sbtHeading1 })).toBeVisible();
        await expect(page.getByTestId('set-by-teacher-upload-card').filter({ hasText: sbtHeading2 })).toBeVisible();
        // Hidden activity steps must never appear (LEA-6141)
        await expect(page.getByTestId('set-by-teacher-upload-card').filter({ hasText: hiddenSbtHeading1 })).not.toBeVisible();
        await expect(page.getByTestId('set-by-teacher-upload-card').filter({ hasText: hiddenSbtHeading2 })).not.toBeVisible();

        // Upload a photo for step 1 only — step 2 intentionally left empty
        const filePath = path.resolve(__dirname, '../../cypress/fixtures/dp.jpg');
        const step1Card = page.getByTestId('set-by-teacher-upload-card').filter({ hasText: sbtHeading1 });
        await step1Card.locator('input[type="file"]').setInputFiles(filePath);
        await page.getByTestId('image-editor-save-btn').click();
        await waitForLoading(page);

        // Add a parent message for step 1 (photo required — step has a photo so this is valid)
        await step1Card.locator('[data-test="set-by-teacher-parent-message-input"] textarea').first().fill(parentMessageText);

        // Submit scheduling (add topic to class)
        await page.getByTestId('dialog-primary-btn').click();
        await waitForLoading(page);
        await expect(page.locator('.MuiAlert-message').filter({ hasText: 'New topic created' })).toBeVisible();

        // 3a. One media row, for step 1 only, under the photo's final name
        const [scheduledPhoto, ...otherScheduledMedia] = await mediaForClass();
        expect(otherScheduledMedia).toHaveLength(0);
        expect(scheduledPhoto.filename).toMatch(/^\d{13}_/);

        // ----------------------------------------------------------------
        // Pre-release: Update modal still shows both SBT steps (step 2 editable)
        // ----------------------------------------------------------------

        // Open the edit modal from the schedule table row (still on the schedule tab)
        const topicRow = page.locator('tr', { hasText: topicName });
        await topicRow.getByTestId('schedule-topic-actions-btn').click();
        await page.getByTestId('schedule-topic-action-edit').click();
        await waitForLoading(page);

        // 4. Before release: accordion still shows both upload cards
        await expect(page.getByTestId('set-by-teacher-accordion')).toBeVisible();
        await page.getByTestId('set-by-teacher-accordion-summary').click();
        await waitForLoading(page);
        await expect(page.getByTestId('set-by-teacher-upload-card').filter({ hasText: sbtHeading1 })).toBeVisible();
        await expect(page.getByTestId('set-by-teacher-upload-card').filter({ hasText: sbtHeading2 })).toBeVisible();
        // Hidden activity steps must never appear (LEA-6141)
        await expect(page.getByTestId('set-by-teacher-upload-card').filter({ hasText: hiddenSbtHeading1 })).not.toBeVisible();
        await expect(page.getByTestId('set-by-teacher-upload-card').filter({ hasText: hiddenSbtHeading2 })).not.toBeVisible();

        // 4a. Validation: typing a parent message on a step with no photo should block submission
        const step2Card = page.getByTestId('set-by-teacher-upload-card').filter({ hasText: sbtHeading2 });
        await step2Card.locator('[data-test="set-by-teacher-parent-message-input"] textarea').first().fill('Message with no photo');
        await page.getByTestId('dialog-primary-btn').click();
        await expect(page.getByText('A message can only be added to a step that has a photo')).toBeVisible();
        // Clear the invalid message so the modal can be cancelled cleanly
        await step2Card.locator('[data-test="set-by-teacher-parent-message-input"] textarea').first().fill('');

        await page.getByTestId('dialog-cancel-btn').click();

        // ----------------------------------------------------------------
        // Pre-release: Teacher can also update SBT details from week-by-week
        // ----------------------------------------------------------------

        await page.goto(`/class/${lwpClass.id}/topic`);
        await page.waitForURL(/\/class\/.*\/topic/);
        await waitForLoading(page);
        await expect(page.getByTestId('week-by-week-topic-name')).toContainText(topicName);

        // 5. Open the edit modal from the week-by-week topic menu
        await page.getByTestId('week-by-week-edit-topic-btn').click();
        await waitForLoading(page);

        // 6. SBT accordion is visible in the week-by-week edit modal
        await expect(page.getByTestId('set-by-teacher-accordion')).toBeVisible();
        await page.getByTestId('set-by-teacher-accordion-summary').click();
        await waitForLoading(page);

        // 7. Both steps are shown (pre-release); step 1 already has its photo from scheduling
        await expect(page.getByTestId('set-by-teacher-upload-card').filter({ hasText: sbtHeading1 })).toBeVisible();
        await expect(page.getByTestId('set-by-teacher-upload-card').filter({ hasText: sbtHeading2 })).toBeVisible();
        // Hidden activity steps must never appear (LEA-6141)
        await expect(page.getByTestId('set-by-teacher-upload-card').filter({ hasText: hiddenSbtHeading1 })).not.toBeVisible();
        await expect(page.getByTestId('set-by-teacher-upload-card').filter({ hasText: hiddenSbtHeading2 })).not.toBeVisible();
        const step1CardWbw = page.getByTestId('set-by-teacher-upload-card').filter({ hasText: sbtHeading1 });
        await expect(step1CardWbw.locator('img')).toBeVisible();
        await expect(step1CardWbw.locator('[data-test="set-by-teacher-parent-message-input"] textarea').first()).toHaveValue(
            parentMessageText
        );

        // 7a. Validation (week-by-week path): entering a parent message on step 2 (no photo) must block save
        const step2CardWbw = page.getByTestId('set-by-teacher-upload-card').filter({ hasText: sbtHeading2 });
        await step2CardWbw.locator('[data-test="set-by-teacher-parent-message-input"] textarea').first().fill('Message with no photo');
        await page.getByTestId('dialog-primary-btn').click();
        await expect(page.getByText('A message can only be added to a step that has a photo')).toBeVisible();
        await step2CardWbw.locator('[data-test="set-by-teacher-parent-message-input"] textarea').first().fill('');

        // 8. Replace step 1's photo, update its parent message, and save from the week-by-week edit modal
        const originalPhotoUrl = (await step1CardWbw.locator('img').getAttribute('src'))!;
        expect(originalPhotoUrl).toContain(scheduledPhoto.filename);
        expect((await page.request.get(originalPhotoUrl)).status()).toBe(200);

        await step1CardWbw.locator('input[type="file"]').setInputFiles(path.resolve(__dirname, '../../cypress/fixtures/image1.jpg'));
        await page.getByTestId('image-editor-save-btn').click();
        await waitForLoading(page);
        await step1CardWbw.locator('[data-test="set-by-teacher-parent-message-input"] textarea').first().fill(updatedParentMessageText);
        await page.getByTestId('dialog-primary-btn').click();
        await waitForLoading(page);
        await expect(page.locator('.MuiAlert-message').filter({ hasText: 'Changes saved' })).toBeVisible();

        // 8a. The same row now points at the replacement, which is in storage, and the original is gone
        const [replacedPhoto, ...otherReplacedMedia] = await mediaForClass();
        expect(otherReplacedMedia).toHaveLength(0);
        expect(replacedPhoto.stepId).toBe(scheduledPhoto.stepId);
        expect(replacedPhoto.filename).toMatch(/^\d{13}_/);
        expect(replacedPhoto.filename).not.toBe(scheduledPhoto.filename);
        expect((await page.request.get(originalPhotoUrl.replace(scheduledPhoto.filename, replacedPhoto.filename))).status()).toBe(200);
        expect((await page.request.get(originalPhotoUrl)).status()).toBe(404);

        await adminOrTeacherSignOut(page);

        // ----------------------------------------------------------------
        // Release topics via admin cron job, then fetch created pupil records
        // ----------------------------------------------------------------

        await login(page, admin, password);
        await page.waitForURL(/\/admin\/all-feeds/);
        await waitForLoading(page);
        await expect(page.getByTestId('common-drawer-list')).toBeVisible();
        await openSideDrawer(page);
        await releaseTopicsUpToADate(page, tomorrow);

        const pupilTopic = await db.selectFrom('lwp_pupil_topic').where('pupilId', '=', pupil.id).select(['id']).executeTakeFirstOrThrow();

        const pupilActivity = await db
            .selectFrom('lwp_pupil_activity')
            .where('topicId', '=', pupilTopic.id)
            .select(['id'])
            .executeTakeFirstOrThrow();

        // ----------------------------------------------------------------
        // Admin: SBT step editing is locked once the topic has been released
        // ----------------------------------------------------------------

        await page.goto(`/admin/activity/${activityId}`);
        await page.waitForURL(new RegExp(`/admin/activity/${activityId}`));
        await waitForLoading(page);

        // 9. After release: add-step and remove-step controls are disabled
        await expect(page.getByTestId('add-step-btn').first()).toBeDisabled();
        await expect(page.getByTestId('activity-step-remove-btn').first()).toBeDisabled();

        await adminOrTeacherSignOut(page);

        // ----------------------------------------------------------------
        // Post-release: Leader sees only step 1 (with photo) in update modal
        // ----------------------------------------------------------------
        await login(page, leaderEmail, password);
        await page.waitForURL(/\/school/);
        await waitForLoading(page);

        await page.locator('[data-test="active-registration-class-name"]', { hasText: lwpClass.name! }).click();
        await page.waitForURL(/\/class/);
        await waitForLoading(page);

        await page.getByTestId('common-nav-schedule-tab').click();
        await waitForLoading(page);

        await topicRow.getByTestId('schedule-topic-actions-btn').click();
        await page.getByTestId('schedule-topic-action-edit').click();
        await waitForLoading(page);

        // 9b. After release: accordion shows only the step that had a photo uploaded
        await expect(page.getByTestId('set-by-teacher-accordion')).toBeVisible();
        await page.getByTestId('set-by-teacher-accordion-summary').click();
        await waitForLoading(page);
        await expect(page.getByTestId('set-by-teacher-upload-card').filter({ hasText: sbtHeading1 })).toBeVisible();
        await expect(page.getByTestId('set-by-teacher-upload-card').filter({ hasText: sbtHeading2 })).not.toBeVisible();

        await page.getByTestId('dialog-cancel-btn').click();
        await adminOrTeacherSignOut(page);

        // ----------------------------------------------------------------
        // Parent: Topic has no video; activity shows only the step with a photo
        // ----------------------------------------------------------------
        await login(page, parent.email!, password);
        await waitForLoading(page);

        // Navigate to the topic page
        await page.goto(`/topic/${pupilTopic.id}`);
        await page.waitForURL(/\/topic\/\d+/);
        await waitForLoading(page);

        // 10. Video section is hidden because the topic is marked noVideo (LEA-6094)
        await expect(page.getByTestId('topic-video-container')).not.toBeVisible();

        // 11. Activity cards container uses the SBT/noVideo variant (LEA-6094)
        await expect(page.getByTestId('topic-activity-cards-sbt')).toBeVisible();

        // LEA-6118: noVideo topics auto-mark watchedVideo on load (no video to watch),
        // which surfaces the "Unlock activities" button. Parent must click it to remove
        // the blur and access activities.
        await expect(page.getByTestId('unlock-activities-button')).toBeVisible();
        await page.getByTestId('unlock-activities-button').click();
        await waitForLoading(page);

        // 12. After unlocking, activity cards are accessible (blur removed)
        await expect(page.getByTestId('unlock-activities-button')).not.toBeVisible();
        await expect(page.locator('[data-test="child-activity-card"]').first()).toBeVisible();

        // Navigate to the activity page
        await page.goto(`/activity/${pupilActivity.id}`);
        await page.waitForURL(/\/activity\/\d+/);
        await waitForLoading(page);

        // 13. Step 1 (with uploaded photo) renders its preview with the configured heading, showing the replacement
        const step1Preview = page.getByTestId('set-by-teacher-step-preview').filter({ hasText: sbtHeading1 });
        await expect(step1Preview).toBeVisible();
        await expect(step1Preview.locator('img').first()).toHaveAttribute(
            'src',
            new RegExp(replacedPhoto.filename.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
        );

        // 13a. The parent message updated via week-by-week is visible (not the original scheduling message)
        await expect(page.getByTestId('set-by-teacher-parent-message').filter({ hasText: updatedParentMessageText })).toBeVisible();

        // 14. Step 2 (no photo uploaded, topic released) is NOT shown to the parent
        await expect(page.getByTestId('set-by-teacher-step-preview').filter({ hasText: sbtHeading2 })).not.toBeVisible();

        await parentSignOut(page);
    });
});
