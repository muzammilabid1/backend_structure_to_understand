import { test, expect, Page } from '@playwright/test';
import type { Schema } from '@lwp/postgres-client';
import { type Kysely } from 'kysely';
import { createDb } from './db';
import { createUtils } from './dbUtils';
import {
    admin,
    englishDomainId,
    generateFirstName,
    generateLastName,
    generateSchoolName,
    generateSentence,
    generateTopicName,
    generateUserEmail,
    password
} from './constants';
import {
    acceptFeatureTooltipPrompt,
    adminOrTeacherSignOut,
    createSchoolAndDummyWondeData,
    formatDate,
    getInputBoxByName,
    login,
    performActionAndWaitForGqlResponse,
    safeClick,
    submitActivityFeedback,
    waitForLoading,
    watchVideoAndUnlockActivities
} from './utils';
import { UserStatus } from 'lwp-shared';

test.describe('Pupil activity feedbacks and rationale', () => {
    let db: Kysely<Schema.DB>;
    let utils: ReturnType<typeof createUtils>;

    test.beforeAll(async () => {
        db = createDb();
        utils = createUtils(db);
    });

    test.afterAll(async () => {
        await db.destroy();
    });

    test('Admin sets an activity rationale, then the parent rates, comments, edits and re-views feedback', async ({ page }) => {
        const parentComment = `Family ${generateSentence(5)}`;
        const pupilComment = `Pupil ${generateSentence(5)}`;
        const editedParentComment = `Edited family ${generateSentence(5)}`;
        const editedPupilComment = `Edited pupil ${generateSentence(5)}`;
        const tooLongComment = 'a'.repeat(5001);
        const modalName = `Rationale modal ${generateSentence(3)}`;
        const modalContent = `This activity builds ${generateSentence(4)}`;

        const seed = await seedActivityPageData(db, utils, modalName, modalContent);

        await login(page, admin, password);
        await page.waitForURL(/\/admin/);
        await waitForLoading(page);

        // Scenario 1: an admin links a rationale modal to a legacy activity via the picker, and it persists.
        await page.goto(`/admin/activity/${seed.rationaleActivityId}`);
        await waitForLoading(page);
        await expect(page.getByTestId('rationale-modal-picker')).toBeVisible();
        // Type to filter the options (getModals returns every modal in the DB) before selecting.
        await page.getByTestId('rationale-modal-picker').getByRole('combobox').fill(modalName);
        await page.getByRole('option', { name: modalName }).click();
        await page.getByRole('button', { name: 'Update details' }).click();
        await waitForLoading(page);
        await expect(page.locator('.MuiAlert-message').filter({ hasText: 'Changes saved' })).toBeVisible();
        await page.reload();
        await waitForLoading(page);
        await expect(page.getByTestId('rationale-modal-picker').getByRole('combobox')).toHaveValue(modalName);

        // Scenario 2: the rationale picker is hidden for a static activity (legacy-gated).
        await page.goto(`/admin/activity/${seed.staticActivityId}`);
        await waitForLoading(page);
        await expect(page.getByTestId('rationale-modal-picker')).toHaveCount(0);

        // Scenario 3: the rationale link renders on the admin Preview tab and opens with its content.
        await page.goto(`/admin/activity/${seed.rationaleActivityId}`);
        await waitForLoading(page);
        await page.getByRole('tab', { name: 'Preview' }).click();
        await waitForLoading(page);
        await expect(page.getByTestId('activity-rationale-trigger')).toHaveText('Why are we doing this activity?');
        await page.getByTestId('activity-rationale-trigger').click();
        await expect(page.getByText(modalContent)).toBeVisible();

        // Scenario 4: the rationale link also renders on the Preview Activity page and opens with its content.
        await page.goto(`/previewactivity/${seed.rationaleActivityId}`);
        await waitForLoading(page);
        await expect(page.getByTestId('activity-rationale-trigger')).toBeVisible();
        await page.getByTestId('activity-rationale-trigger').click();
        await expect(page.getByText(modalContent)).toBeVisible();

        // Scenario 5: the rationale link also renders on the demo activity page and opens with its content.
        await page.goto(`/activitydemo/${seed.rationaleActivityId}`);
        await waitForLoading(page);
        await expect(page.getByTestId('activity-rationale-trigger')).toBeVisible();
        await page.getByTestId('activity-rationale-trigger').click();
        await expect(page.getByText(modalContent)).toBeVisible();

        // Scenario 6: a legacy activity without a rationale modal shows no link.
        await page.goto(`/admin/activity/${seed.noRationaleActivityId}`);
        await waitForLoading(page);
        await page.getByRole('tab', { name: 'Preview' }).click();
        await waitForLoading(page);
        await expect(page.getByTestId('activity-rationale-trigger')).toHaveCount(0);

        // Scenario 7: opening the rationale on the admin-preview, preview-activity and demo surfaces
        // must NOT have incremented the open count - only the real parent page counts.
        expect(await getModalOpenCount(db, seed.modalId)).toBe(0);

        await adminOrTeacherSignOut(page);

        await login(page, seed.parentEmail, password);
        await waitForLoading(page);
        await acceptFeatureTooltipPrompt(page);

        // Scenario 8: on first visit the activities are locked; watch the video to unlock, then open one.
        await page.goto(`/topic/${seed.pupilTopicId}`);
        await page.waitForURL(/\/topic\//);
        await waitForLoading(page);
        await expect(
            page.getByTestId('video-card-play-icon').or(page.getByTestId('unlock-activities-button')).first()
        ).toBeVisible();
        await watchVideoAndUnlockActivities(page);
        const activityCard = page.locator('[data-test="child-activity-card"]').first();
        await expect(activityCard).toBeVisible();
        await activityCard.click();
        await page.waitForURL(/\/activity\//);
        await waitForLoading(page);

        // Scenario 9: opening the rationale on the real parent page increments the open count to 1.
        // The modal is headed with the static link copy, never the modal's own admin-facing name (LEA-6514).
        await expect(page.getByTestId('activity-rationale-trigger')).toBeVisible();
        await performActionAndWaitForGqlResponse(page, 'updateOpenCount', () =>
            page.getByTestId('activity-rationale-trigger').click()
        );
        await expect(page.getByText(modalContent)).toBeVisible();
        await expect(page.getByRole('heading', { name: 'Why are we doing this activity?' })).toBeVisible();
        await expect(page.getByText(modalName)).toHaveCount(0);
        expect(await getModalOpenCount(db, seed.modalId)).toBe(1);
        await page.getByRole('button', { name: 'Back' }).click();
        await expect(page.getByText(modalContent)).toBeHidden();

        // Scenario 10: rating the activity persists across a reload.
        // MUI Rating is controlled: the radios are 1px visually-hidden inputs (clicking them does
        // not flip state), so click the visible star <label> associated with the "4 Stars" radio.
        // force bypasses the sticky header that overlaps the rating near the top of the page.
        const rating = page.getByTestId('activity-rating-star');
        const fourStarsId = await rating.getByRole('radio', { name: '4 Stars' }).getAttribute('id');
        await performActionAndWaitForGqlResponse(page, 'savePupilActivityRating', () =>
            rating.locator(`label[for="${fourStarsId}"]`).click({ force: true })
        );
        await page.reload();
        await waitForLoading(page);
        await expect(page.getByTestId('activity-rating-star').getByRole('radio', { name: '4 Stars' })).toBeChecked();

        // The comment form also requires the mandatory share-with-teacher permission; satisfy it first
        // so the empty submit reaches the "add a comment or photo" validation, not the permission one.
        const sharePermissionLink = page.getByTestId('update-photo-permission-link');
        if (await sharePermissionLink.isVisible()) await sharePermissionLink.click();
        await getInputBoxByName(page, 'shareWithTeacher').check();

        // Scenario 11: submitting with no comment and no photo is blocked.
        await page.getByTestId('save-comments-button').click();
        await expect(page.getByText('This field is required.').first()).toBeVisible();

        // Scenario 12: a comment longer than 5000 characters is blocked.
        await page.getByTestId('parent-comment-card').fill(tooLongComment);
        await page.getByTestId('save-comments-button').click();
        await expect(page.getByText('This comment should be shorter than 5000 characters.').first()).toBeVisible();
        await page.getByTestId('parent-comment-card').fill('');

        // Scenario 13: family + child comments with a photo submit and render in the activity feed.
        await submitActivityFeedback(page, pupilComment, parentComment, true);

        // Scenario 14: editing the feedback updates the text and shows the "Last edited" stamp.
        await page.getByTestId('edit-activity-feedback-icon').first().click();
        await waitForLoading(page);
        await page.getByTestId('edit-parent-comment-card').fill(editedParentComment);
        await page.getByTestId('edit-pupil-comment-card').fill(editedPupilComment);
        await page.getByTestId('dialog-primary-btn').click();
        await waitForLoading(page);
        await expect(page.locator('.MuiAlert-message').filter({ hasText: 'Comments have been saved' })).toBeVisible();
        await waitForLoading(page);
        await expandFeedbackAndAssert(page, editedParentComment, editedPupilComment);
        await expect(page.getByTestId('feedback-last-edited').first()).toContainText('Last edited on');

        // Scenario 15: the edited feedback persists when the activity is re-opened.
        await page.reload();
        await waitForLoading(page);
        await expandFeedbackAndAssert(page, editedParentComment, editedPupilComment);
    });
});

test.describe('Modal name for content developers', { tag: '@smoke' }, () => {
    let db: Kysely<Schema.DB>;
    let utils: ReturnType<typeof createUtils>;

    test.beforeAll(async () => {
        db = createDb();
        utils = createUtils(db);
    });

    test.afterAll(async () => {
        await db.destroy();
    });

    test('Admin sees, changes and clears the name on the Edit Modal page', async ({ page }) => {
        const modalName = `Title modal ${generateSentence(3)}`;
        const storedTitle = `Dev title ${generateSentence(3)}`;
        const changedTitle = `Changed dev title ${generateSentence(3)}`;
        const titleBox = getInputBoxByName(page, 'nameForContentDev');
        const user = await db.selectFrom('lwp_user').where('id', '=', '1').select(['id']).executeTakeFirstOrThrow();
        const modal = await utils.createStaticModal({
            name: modalName,
            nameForContentDev: storedTitle,
            logCreatedById: user.id,
            logUpdatedById: user.id
        });
        await utils.createActivityStep({ modalId: modal.id, stepType: 'TEXT_AND_IMAGE', text: generateSentence(4), order: 1 });
        const storedTitleInDb = async () =>
            (await db.selectFrom('static_lwp_modal').where('id', '=', modal.id).select('nameForContentDev').executeTakeFirstOrThrow())
                .nameForContentDev;
        const saveModal = () =>
            performActionAndWaitForGqlResponse(page, 'updateModal', () => page.getByRole('button', { name: 'Update modal' }).click());

        try {
            await login(page, admin, password);
            await page.waitForURL(/\/admin/);
            await waitForLoading(page);

            // Scenario 1: the stored name is shown in the box when the page opens.
            await page.goto(`/admin/activity-modals/${modal.id}`);
            await waitForLoading(page);
            await expect(titleBox).toHaveValue(storedTitle);

            // Scenario 2: saving without touching the name keeps it.
            await saveModal();
            await page.reload();
            await waitForLoading(page);
            await expect(titleBox).toHaveValue(storedTitle);
            expect(await storedTitleInDb()).toBe(storedTitle);

            // Scenario 3: a changed name is saved and shown after a reload.
            await titleBox.fill(changedTitle);
            await saveModal();
            await page.reload();
            await waitForLoading(page);
            await expect(titleBox).toHaveValue(changedTitle);
            expect(await storedTitleInDb()).toBe(changedTitle);

            // Scenario 4: the modals list shows the name, and re-opening the modal from it (no reload) shows it too.
            await page.getByText('Go back to modals').click();
            await page.waitForURL(/\/admin\/activity-modals$/);
            await waitForLoading(page);
            await expect(page.getByText(changedTitle)).toBeVisible();
            await page.locator(`a[href$="/activity-modals/${modal.id}"]`).first().click();
            await waitForLoading(page);
            await expect(titleBox).toHaveValue(changedTitle);

            // Scenario 5: emptying the box and saving clears the name (it falls back to the modal name in the list).
            await titleBox.fill('');
            await saveModal();
            await page.reload();
            await waitForLoading(page);
            await expect(titleBox).toHaveValue('');
            expect(await storedTitleInDb()).toBeNull();
            await page.getByText('Go back to modals').click();
            await page.waitForURL(/\/admin\/activity-modals$/);
            await waitForLoading(page);
            await expect(page.getByText(modalName)).toBeVisible();
        } finally {
            await db.deleteFrom('static_lwp_activity_steps').where('modalId', '=', modal.id).execute();
            await db.deleteFrom('static_lwp_modal').where('id', '=', modal.id).execute();
        }
    });
});

/** Reads the current openCount for a rationale modal straight from the DB. */
const getModalOpenCount = async (db: Kysely<Schema.DB>, modalId: string): Promise<number> => {
    const modal = await db.selectFrom('static_lwp_modal').where('id', '=', modalId).select('openCount').executeTakeFirstOrThrow();
    return Number(modal.openCount);
};

/**
 * The activity feed card is a collapsed accordion; expand it (if not already open) and assert the
 * family + pupil comments are shown.
 */
const expandFeedbackAndAssert = async (page: Page, parentComment: string, pupilComment: string) => {
    const familyComment = page.getByTestId('feedback-family-comment').first();
    const isAlreadyExpanded = await familyComment.isVisible().catch(() => false);
    if (!isAlreadyExpanded) {
        await safeClick(page.getByTestId('expand-activity-feedback-icon').first());
        await waitForLoading(page);
    }
    await expect(page.getByTestId('feedback-family-comment').first()).toContainText(parentComment);
    await expect(page.getByTestId('feedback-pupil-comment').first()).toContainText(pupilComment);
};

/**
 * Seeds an active school + parent/pupil/class with a topic (video) that has three activities:
 *  - one legacy activity released to the pupil (the parent works through this one; it also gets the
 *    rationale modal via the admin UI in the test),
 *  - a second legacy activity with no rationale (negative case for the rationale link),
 *  - a static activity (negative case for the legacy-gated picker),
 * plus a standalone rationale modal (one text step). The activity -> modal LINK is NOT seeded - it
 * is added through the admin UI in the test.
 */
const seedActivityPageData = async (
    db: Kysely<Schema.DB>,
    utils: ReturnType<typeof createUtils>,
    modalName: string,
    modalContent: string
) => {
    const today = new Date();
    const releaseDate = formatDate(today, '-');
    const user = await db.selectFrom('lwp_user').where('id', '=', '1').select(['id']).executeTakeFirstOrThrow();
    const currentPeriod = await db
        .selectFrom('static_lwp_period')
        .where('isCurrentPeriod', '=', true)
        .select('index')
        .executeTakeFirstOrThrow();

    const leaderFirstName = generateFirstName();
    const leaderLastName = generateLastName();

    const { parent, pupil, class: schoolClass } = await createSchoolAndDummyWondeData(
        db,
        utils,
        {
            school: {
                name: `${generateSchoolName()} School`,
                numOfFullProgrammeClassesAllowed: 10,
                numOfTotalClassesAllowed: 30,
                enableAddClasses: true,
                isMoneySkillsAvailable: false,
                isReadyTeddyAvailable: false,
                isFutureAcademicYear: false
            },
            leader: {
                firstname: leaderFirstName,
                lastname: leaderLastName,
                email: generateUserEmail(leaderFirstName, leaderLastName),
                userStatus: UserStatus.ACTIVE,
                addTooltip: true
            }
        },
        { active: true, classLicences: { IsReadingLogsEnabled: false, isFullProgramme: true, isReadyTeddyEnabled: false } }
    );

    if (!parent?.email || !pupil?.id || !schoolClass?.id) throw new Error('Expected an active parent, pupil and class to be seeded');

    // Standalone rationale modal with one recognisable text step (not linked to any activity yet).
    const modal = await utils.createStaticModal({ name: modalName, logCreatedById: user.id, logUpdatedById: user.id });
    await utils.createActivityStep({ modalId: modal.id, stepType: 'TEXT_AND_IMAGE', text: modalContent, order: 1 });

    // Topic (with a video for the lock/unlock step) + two legacy activities + one static activity.
    // isDemo=true so the same activity is reachable on the demo activity page (getDemoActivity gates
    // on it); it does not affect the pupil-side queries, which never filter on isDemo.
    const staticTopic = await utils.createStaticTopic({
        isReading: false,
        isDemo: true,
        teacherTopicName: `${generateTopicName()} Topic`,
        parentTopicName: `${generateTopicName()} Topic`,
        isPublished: true,
        video: '605069004',
        logCreatedById: user.id,
        logUpdatedById: user.id
    });
    await db
        .insertInto('static_lwp_topic_domain_year_group')
        .values({ domainId: englishDomainId, topicId: staticTopic.id, yearGroupId: '0' })
        .executeTakeFirstOrThrow();

    // welcomeMessage + a short (<=50 char) name are required by the admin activity form
    // (addActivityFromAdminValidation), which runs when the admin saves the rationale link.
    const rationaleActivity = await utils.createStaticActivity({
        name: `Legacy rationale ${generateLastName()}`,
        welcomeMessage: 'Welcome to this activity',
        activityType: 'LEGACY',
        order: 1,
        topicId: staticTopic.id,
        logCreatedById: user.id,
        logUpdatedById: user.id
    });
    const noRationaleActivity = await utils.createStaticActivity({
        name: `Legacy no rationale ${generateLastName()}`,
        welcomeMessage: 'Welcome to this activity',
        activityType: 'LEGACY',
        order: 2,
        topicId: staticTopic.id,
        logCreatedById: user.id,
        logUpdatedById: user.id
    });
    const staticActivity = await utils.createStaticActivity({
        name: `Static ${generateLastName()}`,
        welcomeMessage: 'Welcome to this activity',
        activityType: 'STATIC',
        order: 3,
        topicId: staticTopic.id,
        logCreatedById: user.id,
        logUpdatedById: user.id
    });

    // Release the topic to the seeded pupil and create a pupil activity for the first legacy activity
    // (watchedVideo=false so the parent exercises the first-visit lock/unlock gate).
    const classTopic = await utils.createClassTopic(schoolClass.id, { topicId: staticTopic.id, releaseDate, released: true });
    const pupilTopic = await utils.createPupilTopic({
        releaseDate,
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
        activityId: rationaleActivity.id,
        earnedStar: false,
        mathscotActivityItemIds: JSON.stringify([88, 188, 224])
    });

    return {
        parentEmail: parent.email,
        modalId: modal.id,
        pupilTopicId: pupilTopic.id,
        rationaleActivityId: rationaleActivity.id,
        noRationaleActivityId: noRationaleActivity.id,
        staticActivityId: staticActivity.id
    };
};
