import { test, expect } from '@playwright/test';
import type { Schema } from '@lwp/postgres-client';
import { type Kysely } from 'kysely';
import { createDb } from './db';
import { createUtils } from './dbUtils';
import {
    generateFirstName,
    generateLastName,
    generateSchoolName,
    generateTopicName,
    generateUserEmail,
    password,
    readyTeddyDomainId,
    readyTeddySubjectName
} from './constants';
import {
    adminOrTeacherSignOut,
    createSchoolAndDummyWondeData,
    formatDate,
    getInputBoxByName,
    login,
    parentSignOut,
    waitForLoading
} from './utils';
import { FeatureCode, FeatureStatus, UserStatus } from 'lwp-shared';

test.describe('Scrapbook', () => {
    let db: Kysely<Schema.DB>;
    let utils: ReturnType<typeof createUtils>;

    test.beforeAll(async () => {
        db = createDb();
        utils = createUtils(db);

        await db
            .updateTable('static_lwp_features')
            .set({ status: FeatureStatus.ALL_SCHOOLS })
            .where('code', '=', FeatureCode.READY_TEDDY_SCRAPBOOK_PROMPT)
            .execute();
    });

    test.afterAll(async () => {
        await db
            .updateTable('static_lwp_features')
            .set({ status: FeatureStatus.NO_SCHOOLS })
            .where('code', '=', FeatureCode.READY_TEDDY_SCRAPBOOK_PROMPT)
            .execute();

        await db.destroy();
    });

    test('Parent views empty scrapbook, adds a comment entry, and sees it appear', async ({ page }) => {
        const mySchoolName = `${generateSchoolName()} School`;
        const leaderFirstName = generateFirstName();
        const leaderLastName = generateLastName();
        const leaderEmail = generateUserEmail(leaderFirstName, leaderLastName);
        const readyTeddyTopicName = generateTopicName();
        const latestReadyTeddyTopicName = generateTopicName();
        const today = new Date();
        const dateToday = formatDate(today, '-');
        const yesterday = new Date(today);
        yesterday.setDate(today.getDate() - 1);
        const dateYesterday = formatDate(yesterday, '-');

        const scrapbookComment = `${mySchoolName} We had a wonderful time exploring shapes together!`;
        const scrapbookPrompt = `${mySchoolName} Tell us about something your child enjoyed this week!`;
        const latestScrapbookPrompt = `${mySchoolName} Latest scrapbook prompt`;
        const teacherReply = `${mySchoolName} teacher reply to scrapbook comment`;

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
                    isFutureAcademicYear: false,
                    isParentFeedbackReplyFeatureEnabled: true
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
                classLicences: { IsReadingLogsEnabled: false, isFullProgramme: true, isReadyTeddyEnabled: true },
                addScrapbookTopic: { name: readyTeddyTopicName, releaseDate: dateYesterday, scrapbookPrompt }
            }
        );

        if (!parent || !pupil || !lwpClass)
            throw new Error('createSchoolAndDummyWondeData with active:true must return parent, pupil and class');

        // -------------------------------------------------------------------------
        // Teacher
        // -------------------------------------------------------------------------

        await login(page, leaderEmail, password);
        await page.waitForURL(/\/school/);
        await waitForLoading(page);
        await expect(page.getByTestId('school-overview-page')).toBeVisible();
        await page.locator('[data-test="active-registration-class-name"]', { hasText: lwpClass.name! }).click();
        await page.waitForURL(/\/class/);
        await waitForLoading(page);
        await page.mouse.move(0, 0);

        // 1. Feature flag ON: week-by-week page shows the scrapbook prompt
        await expect(page.getByTestId('class-week-by-week-page')).toBeVisible();
        await expect(page.locator('[data-test="week-by-week-scrapbook-prompt"]')).toContainText(scrapbookPrompt);

        // 2. Feature flag ON: schedule topic preview shows the scrapbook prompt
        await page.getByTestId('common-nav-schedule-tab').click();
        await waitForLoading(page);
        await page.getByTestId('class-schedule-subject-multi-select').click();
        await page.getByRole('option', { name: readyTeddySubjectName }).click();
        await getInputBoxByName(page, 'search').fill(readyTeddyTopicName);
        await page.getByTestId('class-schedule-topic-search-button').click();
        await waitForLoading(page);
        await page.getByRole('button', { name: `Select topic` }).click();
        await waitForLoading(page);
        await expect(page.locator('[data-test="scrapbook-prompt"]')).toContainText(scrapbookPrompt);
        await page.getByTestId('dialog-cancel-btn').click();

        // Toggle the feature flag OFF in the same session to confirm the UI responds immediately
        await db
            .updateTable('static_lwp_features')
            .set({ status: FeatureStatus.NO_SCHOOLS })
            .where('code', '=', FeatureCode.READY_TEDDY_SCRAPBOOK_PROMPT)
            .execute();

        // 3. Feature flag OFF: week-by-week page hides the scrapbook prompt
        await page.getByTestId('common-nav-week-by-week-tab').click();
        await waitForLoading(page);
        await page.mouse.move(0, 0);
        await expect(page.locator('[data-test="week-by-week-scrapbook-prompt"]')).not.toBeVisible();

        // 4. Feature flag OFF: schedule topic preview hides the scrapbook prompt
        await page.getByTestId('common-nav-schedule-tab').click();
        await waitForLoading(page);
        await page.getByTestId('class-schedule-subject-multi-select').click();
        await page.getByRole('option', { name: readyTeddySubjectName }).click();
        await getInputBoxByName(page, 'search').fill(readyTeddyTopicName);
        await page.getByTestId('class-schedule-topic-search-button').click();
        await waitForLoading(page);
        await page.getByRole('button', { name: `Select topic` }).click();
        await waitForLoading(page);
        await expect(page.locator('[data-test="scrapbook-prompt"]')).not.toBeVisible();
        await page.getByTestId('dialog-cancel-btn').click();
        await adminOrTeacherSignOut(page);

        // -------------------------------------------------------------------------
        // Parent
        // -------------------------------------------------------------------------

        await login(page, parent.email!, password);
        await waitForLoading(page);

        // 5. Feature flag OFF: scrapbook tab is not visible in the parent navigation
        await expect(page.getByTestId('scrapbook-tab')).not.toBeVisible();

        // Toggle the feature flag back ON in the same session to confirm the UI responds after reload
        await db
            .updateTable('static_lwp_features')
            .set({ status: FeatureStatus.ALL_SCHOOLS })
            .where('code', '=', FeatureCode.READY_TEDDY_SCRAPBOOK_PROMPT)
            .execute();
        await page.reload();
        await waitForLoading(page);

        // 6. Feature flag ON: scrapbook tab is visible in the parent navigation after reload
        await expect(page.getByTestId('scrapbook-tab')).toBeVisible();

        await page.goto(`/child/${pupil.id}/scrapbook`);
        await page.waitForURL(/\/child\/\d+\/scrapbook/);
        await waitForLoading(page);

        // 7. Scrapbook shows the empty state when the child has no entries yet
        await expect(page.getByTestId('child-scrapbook-page')).toBeVisible();
        await expect(page.getByTestId('scrapbook-empty-state').first()).toBeVisible();
        await expect(page.getByTestId('add-moment-button').first()).toBeVisible();

        // 8. Empty state "add moment" navigates to the entry page and shows the current topic's scrapbook prompt
        await page.getByTestId('add-moment-button').first().click();
        await page.waitForURL(/\/scrapbook\/.+/);
        await waitForLoading(page);
        await expect(page.locator('[data-test="speech-bubble-card-paragraph"]')).toContainText(scrapbookPrompt);

        // Create a newer topic and assign it to the class and pupil while the parent is still on the entry page,
        // to verify that returning to the scrapbook and clicking add moment picks up the latest topic's prompt
        const user = await db.selectFrom('lwp_user').where('id', '=', '1').select(['id', 'password']).executeTakeFirstOrThrow();
        const currentPeriod = await db
            .selectFrom('static_lwp_period')
            .where('isCurrentPeriod', '=', true)
            .select('index')
            .executeTakeFirstOrThrow();

        const staticTopic = await utils.createStaticTopic({
            isReading: false,
            teacherTopicName: latestReadyTeddyTopicName,
            parentTopicName: latestReadyTeddyTopicName,
            scrapbookPrompt: latestScrapbookPrompt,
            isPublished: true,
            video: '605069004',
            logCreatedById: user.id,
            logUpdatedById: user.id
        });

        const staticActivity = await utils.createStaticActivity({
            name: `${latestReadyTeddyTopicName} activity`,
            activityType: 'LEGACY',
            order: 1,
            topicId: staticTopic.id,
            logCreatedById: user.id,
            logUpdatedById: user.id
        });

        await db
            .insertInto('static_lwp_topic_domain_year_group')
            .values({ domainId: readyTeddyDomainId, topicId: staticTopic.id, yearGroupId: '1' })
            .executeTakeFirstOrThrow();

        const classTopic = await utils.createClassTopic(lwpClass.id, {
            topicId: staticTopic.id,
            releaseDate: dateToday,
            released: true
        });

        const pupilTopic = await utils.createPupilTopic({
            releaseDate: dateToday,
            pupilId: pupil.id,
            classTopicId: classTopic.id,
            topicId: staticTopic.id,
            watchedVideo: false,
            periodIndex: currentPeriod.index,
            silverStars: 0,
            earnedGoldStar: false
        });

        await utils.createPupilActivity({
            pupilId: pupil.id,
            topicId: pupilTopic.id,
            activityId: staticActivity.id,
            earnedStar: false,
            mathscotActivityItemIds: JSON.stringify([88, 188, 224])
        });

        await page.goto(`/child/${pupil.id}/scrapbook`);
        await page.waitForURL(/\/child\/\d+\/scrapbook/);
        await waitForLoading(page);

        // 9. "Add moment" shows the latest topic's prompt when a newer topic has been released
        await page.getByTestId('add-moment-button').first().click();
        await page.waitForURL(/\/scrapbook\/.+/);
        await waitForLoading(page);
        await expect(page.locator('[data-test="speech-bubble-card-paragraph"]')).toContainText(latestScrapbookPrompt);
        await expect(page.getByTestId('scrapbook-entry-page')).toBeVisible();

        // 10. Parent submits a text comment entry
        await page.getByTestId('scrapbook-comment-card').click();
        await page.getByTestId('scrapbook-comment-input').fill(scrapbookComment);
        await getInputBoxByName(page, 'shareWithTeacher').check();
        await page.getByTestId('scrapbook-entry-page-save-button').click();
        await waitForLoading(page);

        // 11. Success toast is shown, comment appears on the scrapbook page, and empty state is gone
        await expect(page.locator('.MuiAlert-message').filter({ hasText: 'Moment added to scrapbook' })).toBeVisible();
        await page.waitForURL(/\/child\/\d+\/scrapbook/);
        await waitForLoading(page);
        await expect(page.locator('[data-test="feedback-scrapbook-comment"]').first()).toContainText(scrapbookComment);
        await expect(page.getByTestId('child-scrapbook-page')).toBeVisible();
        await expect(page.getByTestId('scrapbook-empty-state')).not.toBeVisible();
        await expect(page.getByText('You added a scrapbook entry').first()).toBeVisible();
        await expect(page.getByTestId('scrapbook-add-moment-button').first()).toBeVisible();
        await parentSignOut(page);

        // -------------------------------------------------------------------------
        // Teacher (activity feed)
        // -------------------------------------------------------------------------

        await login(page, leaderEmail, password);
        await page.waitForURL(/\/school/);
        await waitForLoading(page);
        await expect(page.getByTestId('school-overview-page')).toBeVisible();
        await page.getByTestId('activity-feed-tab').click();
        await page.waitForURL(/\/school\/\d+\/feed/);
        await waitForLoading(page);

        // 12. Parent's scrapbook comment is visible in the teacher's activity feed
        await expect(page.locator('[data-test="feedback-scrapbook-comment"]').first()).toContainText(scrapbookComment);

        // 13. Teacher replies to the scrapbook comment
        await getInputBoxByName(page, 'comment').fill(teacherReply);
        await page.getByTestId('teacher-reply-send-button').click();
        await waitForLoading(page);
        await expect(page.locator('[data-test="feedback-reply"]').first()).toContainText(teacherReply);
        await adminOrTeacherSignOut(page);

        // -------------------------------------------------------------------------
        // Parent (history)
        // -------------------------------------------------------------------------

        await login(page, parent.email!, password);
        await waitForLoading(page);
        await page.goto(`/child/${pupil.id}/history`);
        await page.waitForURL(/\/child\/\d+\/history/);
        await waitForLoading(page);

        // 14. Teacher's reply is visible in the parent's history page
        await expect(page.locator('[data-test="feedback-reply"]').first()).toContainText(teacherReply);
        await parentSignOut(page);

        // -------------------------------------------------------------------------
        // Magic parent (unauthenticated access via magic link)
        // -------------------------------------------------------------------------

        const oneYearFromToday = new Date();
        oneYearFromToday.setFullYear(oneYearFromToday.getFullYear() + 1);
        const magicLink = await utils.createMagicLink({
            url: Date.now().toString(),
            expiryTime: oneYearFromToday,
            lastRegeneratedAt: new Date(),
            type: 'TOPICACCESS',
            isUsed: false,
            pupilId: pupil.id,
            context: JSON.stringify({ pupilTopicId: pupilTopic.id }),
            userId: parent.id
        });

        await page.goto(`/magic/${magicLink.url}`);
        await page.waitForURL(/\/topic/);
        await waitForLoading(page);
        await page.goto(`/child/${pupil.id}/history`);
        await page.waitForURL(/\/child\/\d+\/history/);
        await waitForLoading(page);

        // 15. Magic parent cannot see the scrapbook comment (restricted to authenticated parents only)
        await expect(page.locator('[data-test="feedback-scrapbook-comment"]', { hasText: scrapbookComment })).not.toBeVisible();

        // 16. Magic parent can see the teacher's reply but is prompted to log in for the full history
        await expect(page.locator('[data-test="feedback-reply"]').first()).toContainText(teacherReply);
        await expect(page.getByRole('heading', { name: 'Log in to view full history' })).toBeVisible();
    });
});
