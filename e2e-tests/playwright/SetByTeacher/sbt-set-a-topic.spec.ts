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
    password
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
import { PupilParentStatus, UserStatus } from 'lwp-shared';

test.describe('Set a Topic quick action - Hello Teacher', () => {
    let db: Kysely<Schema.DB>;
    let utils: ReturnType<typeof createUtils>;

    test.beforeAll(async () => {
        db = createDb();
        utils = createUtils(db);
    });

    test.afterAll(async () => {
        await db.destroy();
    });

    test('Leader schedules HT topic to two classes via Set a Topic; both steps visible pre-release; only uploaded step shown post-release; both parents see topic', async ({
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
        const parentMessageText = `${mySchoolName} This is our classroom!`;

        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const dateTomorrowForUI = getDate(tomorrow);

        // ----------------------------------------------------------------
        // DB Setup: school with class1 (active, RT-enabled) + leader + parent1/pupil1
        // ----------------------------------------------------------------
        const {
            parent: parent1,
            pupil: pupil1,
            class: class1,
            school,
            leader
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

        if (!parent1 || !pupil1 || !class1)
            throw new Error('createSchoolAndDummyWondeData with active:true must return parent, pupil and class');

        // Find one of the other IMPORTED classes already created by createSchoolAndDummyWondeData
        const class2Candidate = await db
            .selectFrom('lwp_school_class')
            .where('schoolId', '=', school.id)
            .where('id', '!=', class1.id)
            .where('status', '=', 'IMPORTED')
            .select(['id', 'name'])
            .executeTakeFirstOrThrow();

        // Read class1's year group and period to replicate for class2
        const class1Details = await db
            .selectFrom('lwp_school_class')
            .where('id', '=', class1.id)
            .select(['yearGroup', 'periodIndex'])
            .executeTakeFirstOrThrow();

        // Activate class2 with Ready Teddy settings so it appears in the Set a Topic multiselect
        await db
            .updateTable('lwp_school_class')
            .set({
                status: 'ACTIVE',
                isReadyTeddyEnabled: true,
                isFullProgramme: true,
                yearGroup: class1Details.yearGroup,
                periodIndex: class1Details.periodIndex
            })
            .where('id', '=', class2Candidate.id)
            .execute();

        // Add the leader as a class teacher for class2 so it appears in "Your classes/groups"
        await utils.addClassTeacher(leader.id, class2Candidate.id);

        // Pick the first pupil already assigned to class2 (created as part of dummy Wonde data)
        const class2PupilLink = await db
            .selectFrom('lwp_class_pupil')
            .where('lwpSchoolClassId', '=', class2Candidate.id)
            .select(['lwpPupilId'])
            .executeTakeFirstOrThrow();

        // Each dummy pupil has 2 IMPORTED parent contacts; activate the first one
        const class2ParentLink = await db
            .selectFrom('lwp_pupil_parent')
            .where('pupilId', '=', class2PupilLink.lwpPupilId)
            .select(['parentId'])
            .executeTakeFirstOrThrow();

        const parent2 = await db
            .selectFrom('lwp_user')
            .where('id', '=', class2ParentLink.parentId)
            .select(['id', 'email'])
            .executeTakeFirstOrThrow();

        // Mark pupil2 as premium so topics are released to them
        await db.updateTable('lwp_pupil').set({ isPremium: true }).where('id', '=', class2PupilLink.lwpPupilId).execute();

        // Activate parent2 user account and their link to pupil2
        await db.updateTable('lwp_user').set({ userStatus: UserStatus.ACTIVE }).where('id', '=', parent2.id).execute();

        await db
            .updateTable('lwp_pupil_parent')
            .set({ status: PupilParentStatus.ACTIVE })
            .where('pupilId', '=', class2PupilLink.lwpPupilId)
            .where('parentId', '=', parent2.id)
            .execute();

        // ----------------------------------------------------------------
        // Admin: Create Ready Teddy topic with 2 SBT steps
        // ----------------------------------------------------------------
        await login(page, admin, password);
        await page.waitForURL(/\/admin/);
        await waitForLoading(page);

        await page.getByTestId('topics-common-drawer-list').click();
        await waitForLoading(page);
        await page.getByText('Add a topic').click();
        await waitForLoading(page);
        await getInputBoxByName(page, 'teacherTopicName').fill(topicName);
        await getInputBoxByName(page, 'domainAndYearGroupIds').click();
        await page.getByRole('option', { name: 'Year 1: Ready teddy' }).click();
        await page.getByRole('button', { name: 'Publish' }).click();
        await waitForLoading(page);
        await expect(page.locator('.MuiAlert-message').filter({ hasText: 'New topic created' })).toBeVisible();
        await waitForLoading(page);

        // Mark as no-video so parent activity unlocks without a video
        await safeClick(page.getByTestId('table-row-item').getByText(topicName));
        await waitForLoading(page);
        await page.getByLabel('No video content').check();
        await page.getByRole('button', { name: 'Update details' }).click();
        await waitForLoading(page);
        await expect(page.locator('.MuiAlert-message').filter({ hasText: 'Change saved!' })).toBeVisible();
        await waitForLoading(page);

        // Add activity with 2 SBT steps
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

        await safeClick(page.getByTestId('table-row-item').getByText(activityName));
        await page.waitForURL(/\/admin\/activity\/\d+/);
        await waitForLoading(page);

        // Add first SBT step
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

        await page.getByRole('button', { name: 'Update details' }).click();
        await waitForLoading(page);
        await expect(page.locator('.MuiAlert-message').filter({ hasText: 'Changes saved' })).toBeVisible();

        await adminOrTeacherSignOut(page);

        // Look up the static topic ID to navigate directly to the Set a Topic form
        const staticTopic = await db
            .selectFrom('static_lwp_topic')
            .where('teacherTopicName', '=', topicName)
            .select(['id'])
            .executeTakeFirstOrThrow();

        // ----------------------------------------------------------------
        // Leader: Schedule HT topic to both classes via the Set a Topic route
        // ----------------------------------------------------------------
        await login(page, leaderEmail, password);
        await page.waitForURL(/\/school/);
        await waitForLoading(page);

        // Navigate directly to the Set a Topic form (redirects for leaders to /school/:id/set-topic/:id)
        await page.goto(`/set-topic/${staticTopic.id}`);
        await page.waitForURL(/\/set-topic\//);
        await waitForLoading(page);

        // Fill the input to open and filter the dropdown to class1, then click its option
        await page.getByTestId('schedule-topic-class-select').locator('input').fill(class1.name!);
        await page.getByRole('option').filter({ hasText: class1.name! }).click();
        await waitForLoading(page);
        // After selection the input clears; fill for class2 and click its option
        await page.getByTestId('schedule-topic-class-select').locator('input').fill(class2Candidate.name!);
        await page.getByRole('option').filter({ hasText: class2Candidate.name! }).click();
        await waitForLoading(page);
        await page.keyboard.press('Escape');
        await waitForLoading(page);

        // Set start date to tomorrow
        await page.locator('input[name="startDate"]').fill(dateTomorrowForUI);

        // Expand the SBT accordion
        await expect(page.getByTestId('set-by-teacher-accordion')).toBeVisible();
        await page.getByTestId('set-by-teacher-accordion-summary').click();
        await waitForLoading(page);

        // Upload a photo for step 1 only; leave step 2 empty intentionally
        const filePath = path.resolve(__dirname, '../../cypress/fixtures/dp.jpg');
        const step1Card = page.getByTestId('set-by-teacher-upload-card').filter({ hasText: sbtHeading1 });
        await step1Card.locator('input[type="file"]').setInputFiles(filePath);
        await page.getByTestId('image-editor-save-btn').click();
        await waitForLoading(page);

        // Add a parent message for step 1 only
        await step1Card.locator('[data-test="set-by-teacher-parent-message-input"] textarea').first().fill(parentMessageText);

        // Submit scheduling to both classes
        await page.getByTestId('schedule-topic-submit-btn').click();
        await waitForLoading(page);
        await expect(page.locator('.MuiAlert-message').filter({ hasText: 'Topic successfully added.' })).toBeVisible();

        // ----------------------------------------------------------------
        // Pre-release: Verify both classes show both SBT steps (editable)
        // ----------------------------------------------------------------

        // Class1: both steps must be visible and editable before release
        await page.goto(`/class/${class1.id}`);
        await page.waitForURL(/\/class/);
        await waitForLoading(page);

        await page.getByTestId('common-nav-schedule-tab').click();
        await waitForLoading(page);

        await page.locator('tr', { hasText: topicName }).getByTestId('schedule-topic-actions-btn').click();
        await page.getByTestId('schedule-topic-action-edit').click();
        await waitForLoading(page);

        // 1. Pre-release: SBT accordion shows both upload cards
        await expect(page.getByTestId('set-by-teacher-accordion')).toBeVisible();
        await page.getByTestId('set-by-teacher-accordion-summary').click();
        await waitForLoading(page);
        await expect(page.getByTestId('set-by-teacher-upload-card').filter({ hasText: sbtHeading1 })).toBeVisible();
        await expect(page.getByTestId('set-by-teacher-upload-card').filter({ hasText: sbtHeading2 })).toBeVisible();

        await page.getByTestId('dialog-cancel-btn').click();

        // Class2: same pre-release check
        await page.goto(`/class/${class2Candidate.id}`);
        await page.waitForURL(/\/class/);
        await waitForLoading(page);

        await page.getByTestId('common-nav-schedule-tab').click();
        await waitForLoading(page);

        await page.locator('tr', { hasText: topicName }).getByTestId('schedule-topic-actions-btn').click();
        await page.getByTestId('schedule-topic-action-edit').click();
        await waitForLoading(page);

        // 2. Pre-release: class2 also shows both upload cards
        await expect(page.getByTestId('set-by-teacher-accordion')).toBeVisible();
        await page.getByTestId('set-by-teacher-accordion-summary').click();
        await waitForLoading(page);
        await expect(page.getByTestId('set-by-teacher-upload-card').filter({ hasText: sbtHeading1 })).toBeVisible();
        await expect(page.getByTestId('set-by-teacher-upload-card').filter({ hasText: sbtHeading2 })).toBeVisible();

        await page.getByTestId('dialog-cancel-btn').click();
        await adminOrTeacherSignOut(page);

        // ----------------------------------------------------------------
        // Release topics via admin
        // ----------------------------------------------------------------
        await login(page, admin, password);
        await page.waitForURL(/\/admin\/all-feeds/);
        await waitForLoading(page);
        await expect(page.getByTestId('common-drawer-list')).toBeVisible();
        await openSideDrawer(page);
        await releaseTopicsUpToADate(page, tomorrow);

        // Fetch pupil topic IDs for both pupils for parent-side verification
        const pupilTopic1 = await db
            .selectFrom('lwp_pupil_topic')
            .where('pupilId', '=', pupil1.id)
            .select(['id'])
            .executeTakeFirstOrThrow();

        const pupilTopic2 = await db
            .selectFrom('lwp_pupil_topic')
            .where('pupilId', '=', class2PupilLink.lwpPupilId)
            .select(['id'])
            .executeTakeFirstOrThrow();

        await adminOrTeacherSignOut(page);

        // ----------------------------------------------------------------
        // Post-release: Leader verifies schedule for both classes
        // Only step 1 (with uploaded photo) should be shown; step 2 must not appear
        // ----------------------------------------------------------------
        await login(page, leaderEmail, password);
        await page.waitForURL(/\/school/);
        await waitForLoading(page);

        // Class1: post-release check
        await page.goto(`/class/${class1.id}`);
        await page.waitForURL(/\/class/);
        await waitForLoading(page);

        await page.getByTestId('common-nav-schedule-tab').click();
        await waitForLoading(page);

        // 3. Topic row is visible in class1 schedule (confirming it was successfully added)
        await expect(page.locator('tr', { hasText: topicName })).toBeVisible();

        await page.locator('tr', { hasText: topicName }).getByTestId('schedule-topic-actions-btn').click();
        await page.getByTestId('schedule-topic-action-edit').click();
        await waitForLoading(page);

        // 4. Post-release: accordion shows only the step that had a photo (step 2 is hidden)
        await expect(page.getByTestId('set-by-teacher-accordion')).toBeVisible();
        await page.getByTestId('set-by-teacher-accordion-summary').click();
        await waitForLoading(page);
        await expect(page.getByTestId('set-by-teacher-upload-card').filter({ hasText: sbtHeading1 })).toBeVisible();
        await expect(page.getByTestId('set-by-teacher-upload-card').filter({ hasText: sbtHeading2 })).not.toBeVisible();

        await page.getByTestId('dialog-cancel-btn').click();

        // Class2: post-release check
        await page.goto(`/class/${class2Candidate.id}`);
        await page.waitForURL(/\/class/);
        await waitForLoading(page);

        await page.getByTestId('common-nav-schedule-tab').click();
        await waitForLoading(page);

        // 5. Topic row is visible in class2 schedule
        await expect(page.locator('tr', { hasText: topicName })).toBeVisible();

        await page.locator('tr', { hasText: topicName }).getByTestId('schedule-topic-actions-btn').click();
        await page.getByTestId('schedule-topic-action-edit').click();
        await waitForLoading(page);

        // 6. Post-release: class2 accordion also shows only step 1; step 2 hidden
        await expect(page.getByTestId('set-by-teacher-accordion')).toBeVisible();
        await page.getByTestId('set-by-teacher-accordion-summary').click();
        await waitForLoading(page);
        await expect(page.getByTestId('set-by-teacher-upload-card').filter({ hasText: sbtHeading1 })).toBeVisible();
        await expect(page.getByTestId('set-by-teacher-upload-card').filter({ hasText: sbtHeading2 })).not.toBeVisible();

        await page.getByTestId('dialog-cancel-btn').click();
        await adminOrTeacherSignOut(page);

        // ----------------------------------------------------------------
        // Parent 1: Topic is visible on their topic page (class1)
        // ----------------------------------------------------------------
        await login(page, parent1.email!, password);
        await waitForLoading(page);

        await page.goto(`/topic/${pupilTopic1.id}`);
        await page.waitForURL(/\/topic\/\d+/);
        await waitForLoading(page);

        // 7. Confirm the correct topic was released to this parent's pupil, then verify it's accessible
        await expect(page.getByTestId('mathscot-with-bubble-text-heading')).toContainText(topicName);
        await expect(page.getByTestId('unlock-activities-button')).toBeVisible();

        await parentSignOut(page);

        // ----------------------------------------------------------------
        // Parent 2: Topic is visible on their topic page (class2)
        // ----------------------------------------------------------------
        await login(page, parent2.email!, password);
        await waitForLoading(page);

        await page.goto(`/topic/${pupilTopic2.id}`);
        await page.waitForURL(/\/topic\/\d+/);
        await waitForLoading(page);

        // 8. Confirm the correct topic was released to class2's parent as well
        await expect(page.getByTestId('mathscot-with-bubble-text-heading')).toContainText(topicName);
        await expect(page.getByTestId('unlock-activities-button')).toBeVisible();

        await parentSignOut(page);
    });
});
