import crypto from 'node:crypto';
import { expect } from '@playwright/test';
import { Locator, Page } from 'playwright-core';
import type { Schema } from '@lwp/postgres-client';
import { type Kysely, type Selectable } from 'kysely';
import { createUtils } from './dbUtils';
import path from 'path';
import { admin, englishDomainId, password, readyTeddyDomainId, signupPassword } from './constants';
import {
    AddClassGroupInput,
    AddTopicInput,
    CreatedTopicResult,
    CreateSchoolAndDummyWondeDataInput,
    CreateSchoolAndDummyWondeDataOptions,
    CreateSchoolAndDummyWondeDataResult,
    PlaywrightAssertionType
} from './types';
import { PupilParentStatus, UserStatus, UserType } from 'lwp-shared';

export async function login(page: Page, email: string, password: string): Promise<void> {
    await page.goto('/');
    await waitForLoading(page);
    await page.getByTestId('login-email-input').fill(email);
    await page.getByTestId('login-next-button').click();
    await page.getByTestId('login-password-input').fill(password);
    await page.getByTestId('login-submit-button').click();
    await waitForLoading(page);
}

export const openSideDrawer = async (page: Page) => {
    const drawerClose = page.locator('.side-drawer-close');

    if ((await drawerClose?.count()) > 0) {
        await page.locator('.side-drawer-arrow > .material-icons').click();
    }
};

export const adminOrTeacherSignOut = async (page: Page) => {
    await page.goto('/logout');
    await waitForLoading(page);
    await expect(page.locator('.common_status_container > .heading-one')).toContainText('Log in');
};

export const waitForTopicToAppearOnClassSchedulePage = async (page: Page, topicName: string) => {
    const topicHeading = page.locator('[data-test="topic-summary-card-topic-name"]', {
        hasText: topicName
    });
    const isTopicVisible = await topicHeading
        .waitFor({ state: 'visible', timeout: 5_000 })
        .then(() => true)
        .catch(() => false);
    if (!isTopicVisible) {
        const showMoreButton = page.getByRole('button', { name: 'Show more' });
        await showMoreButton.scrollIntoViewIfNeeded();
        await showMoreButton.click();
        await waitForTopicToAppearOnClassSchedulePage(page, topicName);
    }

    return;
};

export const addTopicFromAdminSide = async (page: Page, input: AddTopicInput) => {
    // Add Topic
    await page.getByTestId('topics-common-drawer-list').click();
    await waitForLoading(page);
    await page.getByText('Add a topic').click();
    await waitForLoading(page);
    await getInputBoxByName(page, 'teacherTopicName').fill(input.topicName);
    await getInputBoxByName(page, 'domainAndYearGroupIds').click();
    await page.getByRole('option', { name: input.topicDomainName }).click();
    await page.getByRole('button', { name: 'Publish' }).click();
    await waitForLoading(page);
    await expect(page.locator('.MuiAlert-message').filter({ hasText: 'New topic created' })).toBeVisible();
    await waitForLoading(page);
    const topicInList = page.getByTestId('table-row-item').getByText(input.topicName);
    await safeClick(topicInList);
    await waitForLoading(page);

    // Add Activity
    await page.getByText('Activities').click();
    await waitForLoading(page);
    for (const [index, activity] of input.activities?.entries()) {
        await page.getByText('Add an activity').click();
        await waitForLoading(page);
        await getInputBoxByName(page, 'name').fill(activity.activityName);
        await getInputBoxByName(page, 'welcomeMessage').fill('Welcome');
        await getInputBoxByName(page, 'order').fill(`${index + 1}`);
        await getInputBoxByName(page, 'details').fill(activity.staticComponentName);
        await page.getByRole('button', { name: 'Add activity' }).click();
        await waitForLoading(page);
        await expect(page.locator('.MuiAlert-message').filter({ hasText: 'New activity created' })).toBeVisible();
        await waitForLoading(page);
        await expect(page.getByTestId('table-row-item').getByText(activity.activityName)).toBeVisible();
    }
};

export const performActionAndWaitForGqlResponse = async (
    page: Page,
    operationName: string,
    action: () => Promise<unknown>
): Promise<void> => {
    const response = page.waitForResponse(
        (resp) => {
            const isGraphQL = resp.url().endsWith('/graphql') && resp.status() === 200;
            const post = resp.request().postData();
            const hasOpName = post?.includes(`"operationName":"${operationName}"`) ?? false;
            return isGraphQL && hasOpName;
        },
        { timeout: 60_000 }
    );

    await action();

    await response;
};

export const getDay = (date?: Date | null): string => {
    const d = date ?? new Date();
    const days = [
        'Sunday to Saturday',
        'Monday to Sunday',
        'Tuesday to Monday',
        'Wednesday to Tuesday',
        'Thursday to Wednesday',
        'Friday to Thursday',
        'Saturday to Friday'
    ];
    return days[d.getDay()];
};

export const getDate = (date = new Date()): string => {
    const day: string = String(date.getDate()).padStart(2, '0');
    const month: string = String(date.getMonth() + 1).padStart(2, '0');
    const year: number = date.getFullYear();
    return `${day}/${month}/${year}`;
};

export const getFutureDate = (daysAfter: number): string => {
    const today = new Date();
    const futureDate = new Date(today);

    futureDate.setDate(futureDate.getDate() + daysAfter);

    const dd = String(futureDate.getDate()).padStart(2, '0');
    const mm = String(futureDate.getMonth() + 1).padStart(2, '0');
    const yyyy = futureDate.getFullYear();

    return `${dd}/${mm}/${yyyy}`;
};

export const clickNextUntilGotIt = async (page: Page) => {
    const isTooltipVisible = await page
        .waitForSelector('[data-test="tooltip-update-button"]', { state: 'visible', timeout: 10000 })
        .then(() => true)
        .catch(() => false);

    if (!isTooltipVisible) return;

    const tooltipUpdateButtonText = await page.locator('[data-test="tooltip-update-button"]').innerText();

    if (tooltipUpdateButtonText === 'Got it') {
        await performActionAndWaitForGqlResponse(page, 'logTooltipAction', () => page.getByTestId('tooltip-update-button').click());
        return;
    }

    if (tooltipUpdateButtonText === 'Next') {
        await performActionAndWaitForGqlResponse(page, 'logTooltipAction', () => page.getByTestId('tooltip-update-button').click());
        await clickNextUntilGotIt(page);
        return;
    }

    return;
};

export const acceptFeatureTooltipPrompt = async (page: Page) => {
    const hasTooltip = await page
        .waitForSelector('.feedback_tooltip_text', { state: 'visible', timeout: 2000 })
        .then(() => true)
        .catch(() => false);

    if (hasTooltip) {
        await clickNextUntilGotIt(page);
    }
};

export const runCronJob = async (page: Page, dataValue = 'sendReleasedPupilTopicNotifications') => {
    await page.getByTestId('run-tasks-common-drawer-list').click();
    await page.waitForURL(/\/admin\/run-cron-jobs/);
    await waitForLoading(page);
    await expect(page.getByTestId('run-tasks-page')).toBeVisible();
    await page.getByTestId('cron-job-select-field').click();
    await page.locator(`[data-value="${dataValue}"]`).click();
    await page.getByRole('button', { name: 'Run Cron Job' }).click();
    await waitForLoading(page);
    await expect(page.locator('.MuiAlert-message').filter({ hasText: 'Success: ' })).toBeVisible();
    await waitForLoading(page);
};

export const sendReminderEmailFromAdminSide = async (page: Page, dataValue = 'sendTeacherReadingTopicEnd', date: string) => {
    await page.getByTestId('run-tasks-common-drawer-list').click();
    await page.waitForURL(/\/admin\/run-cron-jobs/);
    await waitForLoading(page);
    await expect(page.getByTestId('run-tasks-page')).toBeVisible();
    await page.getByTestId('admin-topic-reminders-select').click();
    await page.locator(`[data-value="${dataValue}"]`).click();
    await page.getByTestId('admin-topic-reminders-date-input').fill(date);
    await page.getByTestId('admin-topic-reminders-submit-button').click();
    await expect(page.locator('.MuiAlert-message').filter({ hasText: 'Success: ' })).toBeVisible();
};

export const releaseTopicsUpToADate = async (page: Page, date = new Date()) => {
    const dateString = getDate(date);
    await page.getByTestId('run-tasks-common-drawer-list').click();
    await page.waitForURL(/\/admin\/run-cron-jobs/);
    await waitForLoading(page);
    await expect(page.getByTestId('run-tasks-page')).toBeVisible();
    await getInputBoxByName(page, 'date').fill(dateString);
    await page.getByRole('button', { name: 'Release topics' }).click();
    await waitForLoading(page);
    await expect(page.locator('.MuiAlert-message').filter({ hasText: 'Pupil topics released successfully!' })).toBeVisible();
    await waitForLoading(page);
};

export const watchVideoAndUnlockActivities = async (page: Page, unlockActivity = true) => {
    try {
        const hasPlayIcon = await page
            .waitForSelector('[data-test="video-card-play-icon"]', { state: 'visible', timeout: 5000 })
            .then(() => true)
            .catch(() => false);

        if (hasPlayIcon) {
            const playIcon = page.getByTestId('video-card-play-icon');
            await playIcon.click();
        }

        if (unlockActivity) {
            const hasUnlockActivityButton = await page
                .waitForSelector('[data-test="unlock-activities-button"]', { state: 'visible', timeout: 5000 })
                .then(() => true)
                .catch(() => false);
            if (hasUnlockActivityButton) {
                const unlockBtn = page.getByTestId('unlock-activities-button');
                await unlockBtn.click();
                await waitForLoading(page);
            }
        }
    } finally {
        return;
    }
};

export const addClassGroup = async (
    page: Page,
    schoolClassName: string,
    groupName: string,
    teacherName: string,
    subjectName?: string,
    pupilName?: string
) => {
    await page.locator(`[data-test="common-nested-list-name"] span:has-text("${schoolClassName}")`).first().click();
    await page.waitForURL(/\/class/);
    await waitForLoading(page);
    await page.getByTestId('common-nav-class-groups-tab').click();
    await waitForLoading(page);
    await page.getByRole('button', { name: 'Create a group' }).click();
    await waitForLoading(page);
    await getInputBoxByName(page, 'groupName').fill(groupName);
    await page.getByTestId('class-group-main-teacher-select').click();
    await page.getByRole('option', { name: teacherName }).click();
    if (subjectName) {
        await page.getByTestId('class-group-subjects-select').click();
        await page.getByRole('option', { name: subjectName }).click();
    }
    if (pupilName) {
        await page.getByTestId('class-group-add-pupil-multi-select').click();
        await page.getByRole('option', { name: pupilName }).click();
    }
    await page.getByRole('button', { name: 'Create group' }).click();
    await waitForLoading(page);
    await safeAssertion(page.getByTestId('group-name').getByText(groupName), 'toBeVisible');
    await waitForLoading(page);
};

export const addClassFromAdminSide = async (
    page: Page,
    schoolName: string,
    schoolClassName: string,
    teacherName: string,
    classYearGroup = 'Year 1'
) => {
    await page.getByTestId('schools-common-drawer-list').click();
    await page.waitForURL(/\/schools\/active/);
    await waitForLoading(page);
    await expect(page.getByTestId('schools-page')).toBeVisible();
    await safeClick(page.locator('[data-testid="school-details-link"]', { hasText: schoolName }));
    await waitForLoading(page);
    await page.getByTestId('classes-school-overview-tab').click();
    await waitForLoading(page);
    await page.getByTestId('create-class-button').click();
    await waitForLoading(page);
    getInputBoxByName(page, 'name').fill(schoolClassName);
    await page.getByTestId('add-class-year-group-select').click();
    await page.getByRole('option', { name: classYearGroup }).click();
    await page.getByTestId('add-class-main-teacher-select').click();
    await page.getByRole('option', { name: teacherName }).click();
    await getInputBoxByName(page, 'isFullProgramme').check();
    await page.getByTestId('add-class-submit-button').click();
    await waitForLoading(page);
    await page.getByTestId('classes-school-overview-tab').click();
    await waitForLoading(page);
    await expect(page.getByRole('link', { name: schoolClassName })).toHaveCount(1);
    await waitForLoading(page);
};

export const submitActivityFeedback = async (page: Page, pupilComment: string, parentComment: string, addPhoto = false) => {
    await page.getByTestId('parent-comment-card').fill(parentComment);
    await page.getByTestId('pupil-comment-card').fill(pupilComment);
    if (addPhoto) {
        const filePath = path.resolve(__dirname, '../cypress/fixtures/dp.jpg');
        await page.locator('input[type="file"]').setInputFiles(filePath);
        await page.getByRole('button', { name: 'Save changes' }).click();
    }
    const updatePermisisonsLink = page.getByTestId('update-photo-permission-link');
    if (await updatePermisisonsLink.isVisible()) {
        await updatePermisisonsLink.click();
    }
    await getInputBoxByName(page, 'shareWithTeacher').check();
    await page.getByTestId('save-comments-button').click();
    await waitForLoading(page);
    await expect(page.locator('.MuiAlert-message').filter({ hasText: 'Comments have been saved' })).toBeVisible();
    await waitForLoading(page);
    await safeClick(page.locator('[data-test="expand-activity-feedback-icon"]').first());
    await safeAssertion(page.getByTestId('feedback-family-comment').getByText(parentComment), 'toBeVisible');
    await safeAssertion(page.getByTestId('feedback-pupil-comment').getByText(pupilComment), 'toBeVisible');
    await waitForLoading(page);
};

export const submitReadingFeedback = async (page: Page, bookName: string, comment: string) => {
    await page.getByRole('paragraph').filter({ hasText: 'Today' }).getByTestId('current-day-reading-log').click();
    await waitForLoading(page);
    const modal = page.getByTestId('reading-record-found-modal');
    if (await modal.isVisible()) {
        await modal.getByTestId('reading-record-found-modal-create-button').click();
        await waitForLoading(page);
    }
    await page.getByTestId('read-aloud-card').first().click();
    await page.getByTestId('school-book-card').first().click();
    await page.getByTestId('book-name-input').fill(bookName);
    await page.getByTestId('comment-card').click();
    await page.getByTestId('comment-input').fill(comment);
    await page.getByTestId('share-permissions-checkbox').first().click();
    await page.getByTestId('submit-reading-log-button').click();
    await waitForLoading(page);
    await expect(page.locator('.MuiAlert-message').filter({ hasText: 'Reading entry has been added' })).toBeVisible();
    await waitForLoading(page);
    await safeAssertion(page.getByTestId('reading-history-card').first().filter({ hasText: comment }), 'toBeVisible');
    await waitForLoading(page);
};

export const gotoTeacherDetailsPageFromAdminSide = async (page: Page, schoolName: string, teacherName: string) => {
    await page.getByTestId('schools-common-drawer-list').click();
    await page.waitForURL(/\/schools\/active/);
    await waitForLoading(page);
    await expect(page.getByTestId('schools-page')).toBeVisible();
    await safeClick(page.locator('[data-testid="school-details-link"]', { hasText: schoolName }));
    await waitForLoading(page);
    await page.getByTestId('staff-school-overview-tab').click();
    await waitForLoading(page);
    await page.locator('[data-test="school-staff-overview-teacher-name"]', { hasText: teacherName }).click();
    await page.waitForURL(/\/admin\/teacher\/\d+/);
    await waitForLoading(page);
};

export const signUpSchoolTeacher = async (page: Page, schoolName: string, teacherName: string) => {
    await gotoTeacherDetailsPageFromAdminSide(page, schoolName, teacherName);
    await page.getByRole('tab', { name: 'Notifications' }).click();
    await waitForLoading(page);
    await page.getByTestId('schoolLeaderInvitationEmail-user-notification-history-details-button').click();
    const userNotificationHistoryParams: string = await page.getByTestId('user-notification-history-params').inputValue();
    expect(userNotificationHistoryParams?.length).toBeGreaterThan(0);
    const teacherSignUpMagicId: string = JSON.parse(userNotificationHistoryParams)?.MAGICID;
    expect(teacherSignUpMagicId?.length).toBeGreaterThan(0);
    await page.goto(`/magic/${teacherSignUpMagicId}`);
    await waitForLoading(page);
    await page.waitForURL(/\/signup/);
    await waitForLoading(page);
    await page.getByTestId('signup-continue-btn').click();
    await waitForLoading(page);
    await page.getByTestId('signup-password-input').fill(signupPassword);
    await page.getByTestId('signup-repeat-password-input').fill(signupPassword);
    await getInputBoxByName(page, 'policy').check();
    await page.getByTestId('signup-submit-btn').click();
    await page.waitForURL(/\/school\/\d+/);
    await waitForLoading(page);
};

export const gotoParentDetailsPageFromAdminSide = async (
    page: Page,
    schoolName: string,
    className: string,
    pupilName: string,
    parentName: string
) => {
    await page.getByTestId('schools-common-drawer-list').click();
    await page.waitForURL(/\/schools\/active/);
    await waitForLoading(page);
    await expect(page.getByTestId('schools-page')).toBeVisible();
    await safeClick(page.locator('[data-testid="school-details-link"]', { hasText: schoolName }));
    await page.waitForURL(/\/admin\/school\/\d+/);
    await waitForLoading(page);
    await page.getByTestId('classes-school-overview-tab').click();
    await waitForLoading(page);
    await page.getByRole('link', { name: className }).click();
    await waitForLoading(page);
    await page.getByRole('tab', { name: 'Students' }).click();
    await waitForLoading(page);
    await page.getByRole('link', { name: pupilName }).click();
    await waitForLoading(page);
    await page.getByRole('tab', { name: 'Parents' }).click();
    await waitForLoading(page);
    await page.getByRole('link', { name: parentName }).click();
    await waitForLoading(page);
};

export const signUpParent = async (page: Page, schoolName: string, className: string, pupilName: string, parentName: string) => {
    await gotoParentDetailsPageFromAdminSide(page, schoolName, className, pupilName, parentName);
    await page.getByRole('button', { name: 'Re-Invite Parent' }).click();
    await waitForLoading(page);
    await expect(page.locator('.MuiAlert-message').filter({ hasText: `Invitation sent to` })).toBeVisible();
    await page.getByRole('tab', { name: 'Notifications' }).click();
    await waitForLoading(page);
    await page.getByTestId('userRequestedSignUpLink-user-notification-history-details-button').click();
    const userNotificationHistoryParams: string = await page.getByTestId('user-notification-history-params').inputValue();
    expect(userNotificationHistoryParams?.length).toBeGreaterThan(0);
    const parentSignUpMagicId: string = JSON.parse(userNotificationHistoryParams)?.MAGICID;
    expect(parentSignUpMagicId?.length).toBeGreaterThan(0);
    await page.goto(`/magic/${parentSignUpMagicId}`);
    await waitForLoading(page);
    await page.waitForURL(/\/signup/);
    await waitForLoading(page);
    await page.getByTestId('signup-continue-btn').click();
    await waitForLoading(page);
    await page.getByTestId('signup-password-input').fill(signupPassword);
    await page.getByTestId('signup-repeat-password-input').fill(signupPassword);
    await getInputBoxByName(page, 'policy').check();
    await page.getByTestId('signup-submit-btn').click();
    await page.waitForURL(/\/parent\/\d+/);
    await waitForLoading(page);
    await expect(page.getByTestId('parent-children-page')).toBeVisible();
};

export const switchToPupil = async (page: Page, pupilName: string, to?: string) => {
    await page.getByTestId('switch-child-tab').click();
    if (!to) {
        await page.locator('#simple-popover').getByText(pupilName).click();

        return;
    }

    await page.locator('#simple-popover').getByText(`${pupilName}’s ${to}`).click();
};

export const parentSignOut = async (page: Page) => {
    await page.goto('/logout');
    await waitForLoading(page);
    await expect(page.locator('.common_status_container > .heading-one')).toContainText('Log in');
};

export const addClassGroupFromLeaderSide = async (page: Page, input: AddClassGroupInput) => {
    const { className, groupName, teacherFullName, subjectName, setTopicsDifferentFromClass, pupilName } = input;
    await page.locator(`[data-test="common-nested-list-name"] span:has-text("${className}")`).first().click();
    await page.waitForURL(/\/class/);
    await waitForLoading(page);
    await page.getByTestId('common-nav-class-groups-tab').click();
    await waitForLoading(page);
    await page.getByRole('button', { name: 'Create a group' }).click();
    await waitForLoading(page);
    await getInputBoxByName(page, 'groupName').fill(groupName);
    await page.getByTestId('class-group-subjects-select').click();
    await page.getByRole('option', { name: subjectName }).click();
    await page
        .getByTestId(setTopicsDifferentFromClass ? 'set-topics-different-from-the-class' : 'set-topics-additional-to-the-class')
        .click();
    await page.getByTestId('class-group-add-pupil-multi-select').click();
    await page.getByRole('option', { name: pupilName }).click();
    await page.getByTestId('class-group-main-teacher-select').click();
    await page.getByRole('option', { name: teacherFullName }).click();
    await page.getByRole('button', { name: 'Create group' }).click();
    await waitForLoading(page);
    await expect(page.getByTestId('group-name').getByText(groupName)).toBeVisible();
};

export const addParentFromParentsCarerTable = async (page: Page, input: { firstname: string; lastname: string; emailOrPhone: string }) => {
    await page.getByTestId('parents-carer-table-add-parent-button').getByText('Add a parent').click();
    await waitForLoading(page);
    await expect(page.getByTestId('dialog-title-heading')).toContainText('Add a parent');
    await page.getByTestId('add-parent-firstname-input').fill(input.firstname);
    await page.getByTestId('add-parent-lastname-input').fill(input.lastname);
    await page.getByTestId('add-parent-email-or-phone-input').fill(input.emailOrPhone);
    await page.getByRole('button', { name: 'Add parent' }).click();
    await waitForLoading(page);
    await expect(page.locator('.MuiAlert-message').filter({ hasText: `An invite has been sent to ${input.emailOrPhone}` })).toBeVisible();
    await waitForLoading(page);
    await expect(page.locator('[data-test="parents-carer-parent-name"]', { hasText: `${input.firstname} ${input.lastname}` })).toHaveCount(
        1
    );
};

export const acceptPupilInvitation = async (page: Page, shouldAcceptInvitation = true) => {
    try {
        const interstitialNextBtnSelector = '[data-test="interstitial-next-btn"]';
        const isInterstitialBtnVisible = await page
            .waitForSelector(interstitialNextBtnSelector, { state: 'visible', timeout: 2000 })
            .then(() => true)
            .catch(() => false);

        if (isInterstitialBtnVisible) {
            const interstitialNextBtn = page.locator(interstitialNextBtnSelector);
            const buttonText = await interstitialNextBtn.innerText();

            if (buttonText === 'Get started' || buttonText === 'Let’s go') {
                if (!shouldAcceptInvitation) return;
                await getInputBoxByName(page, 'policy').check();
                await expect(getInputBoxByName(page, 'policy')).toBeChecked();
                await interstitialNextBtn.click();
                await waitForLoading(page);
                await expect(page.locator('.MuiAlert-message').filter({ hasText: 'Pupil invitation accepted!' })).toBeVisible();
                await waitForLoading(page);
                return;
            }

            if (buttonText === 'Next') {
                await interstitialNextBtn.click();
                await waitForLoading(page);
                await acceptPupilInvitation(page, shouldAcceptInvitation);
            }
        }
    } finally {
        return;
    }
};

export const getInputBoxByName = (page: Page, name: string) => page.locator(`input[name="${name}"]`);
export const getTextAreaBoxByName = (page: Page, name: string) => page.locator(`textarea[name="${name}"]`);

export const createSchoolClassFromSchoolSide = async (
    page: Page,
    className: string,
    yearGroup: string,
    teacher: string,
    { isReadingLogsEnabled = false, isFullProgramme = false, isReadyTeddy = false, readingStartDay = '' } = {}
) => {
    await getInputBoxByName(page, 'name').fill(className);
    await page.getByTestId('add-class-year-group-select').click();
    await page.getByRole('option', { name: yearGroup }).click();
    await page.getByTestId('add-class-main-teacher-select').click();
    await page.getByRole('option', { name: teacher }).click();
    if (isFullProgramme) await getInputBoxByName(page, 'isFullProgramme').check();
    if (isReadyTeddy) await getInputBoxByName(page, 'isReadyTeddy').check();
    if (isReadingLogsEnabled) {
        await getInputBoxByName(page, 'isReadingLogsEnabled').check();
        if (readingStartDay) {
            await page.getByTestId('reading-start-day-select').click();
            await page.getByRole('option', { name: readingStartDay }).click();
        }
    }
    await page.getByRole('button', { name: 'Create class' }).click();
    await waitForLoading(page);
    await expect(page.locator('.MuiAlert-message').filter({ hasText: 'A new class has been added' })).toBeVisible();
    await waitForLoading(page);
    await acceptFeatureTooltipPrompt(page);
    await openSideDrawer(page);
    await page.getByRole('link', { name: className }).click();
    await waitForLoading(page);
};

export const createPreAdmissionClassFromAdminSide = async (page: Page, schoolName: string, className: string, teacher: string) => {
    await login(page, admin, password);
    await waitForLoading(page);
    await page.waitForURL(/\/admin/);
    await waitForLoading(page);
    await openSideDrawer(page);

    await page.getByRole('link', { name: 'Schools' }).click();
    await waitForLoading(page);
    await safeClick(page.locator('[data-testid="school-details-link"]', { hasText: schoolName }));
    await page.waitForURL(/\/school/);
    await waitForLoading(page);
    await page.getByTestId('classes-school-overview-tab').click();
    await waitForLoading(page);
    await page.getByTestId('create-class-button').click();
    await waitForLoading(page);

    await getInputBoxByName(page, 'name').fill(className);
    await page.getByTestId('add-class-academic-year-select').click();
    await page.getByRole('option').last().click();

    await page.getByTestId('add-class-year-group-select').click();
    await page.getByRole('option', { name: 'Reception' }).click();
    await page.getByTestId('add-class-main-teacher-select').click();
    await page.getByRole('option', { name: teacher }).click();

    await expect(await getInputBoxByName(page, 'isFullProgramme')).toBeHidden();
    await expect(await getInputBoxByName(page, 'isReadingLogsEnabled')).toBeHidden();
    await expect(await getInputBoxByName(page, 'isReadyTeddy')).toBeChecked();

    await page.getByRole('button', { name: 'Create class' }).click();
    await waitForLoading(page);
    await page.getByTestId('classes-school-overview-tab').click();
    await waitForLoading(page);
    await expect(page.getByRole('link', { name: className })).toBeVisible();
    await adminOrTeacherSignOut(page);
};

export const addPupilByTeacher = async (
    page: Page,
    firstName: string,
    lastName: string,
    gender: string,
    yearGroup: string,
    parentFirstName: string,
    parentLastName: string,
    parentEmail: string
) => {
    await getInputBoxByName(page, 'firstName').fill(firstName);
    await getInputBoxByName(page, 'lastName').fill(lastName);
    await getInputBoxByName(page, 'dateOfBirth').fill(getDate());
    await getInputBoxByName(page, 'upn').fill(`LWP_TESTING_${Date.now()}`);
    await page.getByTestId('add-pupil-gender-select').click();
    await page.getByRole('option', { name: gender }).first().click();
    await page.getByTestId('add-pupil-year-group-select').click();
    await page.getByRole('option', { name: yearGroup }).click();
    await page.getByTestId('add-pupil-isPremium-select').click();
    await page.getByRole('option', { name: 'Yes' }).click();
    await page.getByRole('button', { name: 'Add first parent' }).click();
    await getInputBoxByName(page, 'parentFirstname').fill(parentFirstName);
    await getInputBoxByName(page, 'parentLastname').fill(parentLastName);
    await getInputBoxByName(page, 'email').fill(parentEmail);
    await page.getByRole('button', { name: 'Add parent' }).click();
    await expect(page.locator('.MuiAlert-message').filter({ hasText: 'Parent details have been added successfully.' })).toBeVisible();
    await page.getByRole('button', { name: 'Add pupil' }).click();
    await waitForLoading(page);
    await expect(page.locator('.MuiAlert-message').filter({ hasText: 'Pupil added.' })).toBeVisible();
    await waitForLoading(page);
    await safeAssertion(page.getByTestId('class-pupil-page-pupil-name').getByText(`${firstName} ${lastName}`), 'toBeVisible');
    await waitForLoading(page);
};

/**
 * Blocks test execution until all loading indicators have disappeared, or fails after a 10 minute timeout.
 *
 * This helper first watches for a button-specific spinner (`[data-test="lwp-button-loading"]`)
 * and only once that is gone does it watch for a more general overlay spinner
 * (`[data-test="common-loading"]`). Each check polls every ~300 ms, up to a maximum of 600 000 ms (10 min).
 *
 * @param page – The Playwright Page instance on which to wait for loading to finish.
 * @throws {Error} If either spinner remains visible beyond the total timeout window (10 minutes).
 */

export const waitForLoading = async (page: Page): Promise<void> => {
    const timeoutMs = 600_000; // 10 minutes
    const start = Date.now();

    while (Date.now() - start < timeoutMs) {
        const isButtonLoadingVisible = await page
            .locator('[data-test="lwp-button-loading"]')
            .first()
            .waitFor({ state: 'visible', timeout: 300 })
            .then(() => true)
            .catch(() => false);
        if (!isButtonLoadingVisible) {
            break; // ← exit loop, move on to common-loading
        }
    }

    while (Date.now() - start < timeoutMs) {
        const isLoadingVisible = await page
            .locator('[data-test="common-loading"]')
            .first()
            .waitFor({ state: 'visible', timeout: 300 })
            .then(() => true)
            .catch(() => false);
        if (!isLoadingVisible) {
            return; // Loading gone, continue test
        }
    }

    throw new Error('Loading indicator did not disappear within 10 minutes');
};

export async function safeClick(locator: Locator): Promise<void> {
    await locator.waitFor({ state: 'visible' });
    await locator.scrollIntoViewIfNeeded();

    try {
        await locator.click();
    } catch (e: any) {
        // if it's a pointer-intercept error, retry with force
        if (e.message.includes('intercepts pointer events')) {
            await locator.click({ force: true });
        } else {
            throw e;
        }
    }
}

export async function safeAssertion(locator: Locator, assertion: PlaywrightAssertionType): Promise<void> {
    await locator.waitFor({ state: 'visible' });
    await locator.scrollIntoViewIfNeeded();
    switch (assertion) {
        case 'toBeVisible':
            return expect(locator).toBeVisible();
        case 'toBeEnabled':
            return expect(locator).toBeEnabled();

        default:
            throw new Error(`Assertion "${assertion}" not supported`);
    }
}

export const turnOffMoneySkillsFromAdminSide = async (page: Page, schoolName: string) => {
    await login(page, admin, password);
    await page.waitForURL(/\/admin/);
    await waitForLoading(page);
    await openSideDrawer(page);
    await page.getByRole('link', { name: 'Schools' }).click();
    await waitForLoading(page);
    await page.getByText(schoolName).click();
    await page.waitForURL(/\/school/);
    await waitForLoading(page);
    await getInputBoxByName(page, 'isMoneySkillsAvailable').uncheck();
    await page.getByRole('button', { name: 'Update details' }).click();
    await waitForLoading(page);
    await expect(page.locator('.MuiAlert-message')).toHaveText('School has been successfully updated.');
    await waitForLoading(page);
    await adminOrTeacherSignOut(page);
};

export const schoolSettingsPage = async (page: Page, settingsId: string) => {
    await page.getByTestId('school-settings').click();
    await waitForLoading(page);
    await page.getByTestId(settingsId).click();
    waitForLoading(page);
};

export const formatDate = (date = new Date(), separator: string = '/'): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}${separator}${month}${separator}${day}`;
};

export const addPageAnnouncement = async (
    page: Page,
    title: string,
    message: string,
    userOptions: string[],
    priority: string,
    schoolTags?: string[]
) => {
    await page.getByTestId('add-page-announcement-button').click();
    await page.waitForURL(/\/admin\/announcements\/create/);
    await waitForLoading(page);
    await page.getByTestId('admin-announcement-form').waitFor({ state: 'visible' });
    await getInputBoxByName(page, 'title').fill(title);
    await page.locator('.MuiCardContent-root').locator('.editor-input').fill(message);
    for (const userOption of userOptions) {
        await page.getByTestId('add-page-announcement-user-options-multi-select').click();
        await page.getByRole('option', { name: userOption }).click();
    }
    if (schoolTags && schoolTags.length > 0) {
        for (const schoolTag of schoolTags) {
            await page.getByTestId('add-page-announcement-school-tags-multi-select').click();
            await page.getByRole('option', { name: schoolTag }).click();
        }
    }
    await getInputBoxByName(page, 'priority').fill(priority);
    await page.getByTestId('add-page-announcement-save-button').click();
    await waitForLoading(page);
    await page.waitForURL(/\/admin\/announcements/);
    await waitForLoading(page);
    await expect(page.getByTestId('page-announcements-page')).toBeVisible();
};

export const verifyPageAnnouncement = async (page: Page, message: string, markAsSeen = false) => {
    const locator = page.getByTestId('page-announcement-card-message').getByText(message);
    await expect(locator).toBeVisible();
    if (markAsSeen) {
        await performActionAndWaitForGqlResponse(page, 'seenPageAnnouncement', () =>
            page.getByTestId('page-announcement-card-close-button').click()
        );
        await locator.waitFor({ state: 'hidden' });
        await page.reload();
        await waitForLoading(page);
    }
};

export const expectPageAnnouncementState = async (page: Page, message: string, seen = false) => {
    const messageElement = page.locator('[data-test="page-announcement-card-drawer-message"]', { hasText: message });
    await expect(messageElement).toBeVisible();
    await expect(messageElement).toHaveClass(seen ? /announcementSeen/ : /announcementUnseen/);
};

export const generateId = (length = 6): number => {
    const timestamp = +new Date();

    const _getRandomInt = (min: number, max: number): number => {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    };

    const ts = timestamp.toString();
    const parts = ts.split('').reverse();
    let id = '';

    for (let i = 0; i < length; ++i) {
        const index = _getRandomInt(0, parts.length - 1);
        id += parts[index];
    }

    return Number(id);
};

/**
 * Creates a school with a full set of simulated Wonde-imported data for E2E tests.
 *
 * **Base data always created:**
 * - 1 school + 1 school leader (optionally a second teacher via `input.teacher`)
 * - 1 imported Wonde school linked to the LWP school
 * - 25 current-year pupils (indices 0–19 with nc_year=10; indices 20–24 with nc_year=-1,
 *   these last 5 have no class assignment and cannot be used as test subjects)
 * - 10 pre-admission pupils
 * - 7 imported classes:
 *   - Classes 0–3: current period, 5 current-year pupils each
 *   - Class 4:     current period, empty
 *   - Class 5:     next period, empty
 *   - Class 6:     next period, 5 pre-admission pupils
 * - Every pupil gets 2 Wonde contacts (Mr/Mrs) each linked to an `lwp_user` with
 *   `userStatus: IMPORTED` and `lwp_pupil_parent.status: IMPORTED`
 * - All classes are created with `status: 'IMPORTED'`
 *
 * **`options.active`** (requires `classLicences`):
 * Promotes the first pupil that has both a class and a parent into a testable active state:
 * - Sets parent `lwp_user.userStatus` → ACTIVE (enables login)
 * - Sets `lwp_pupil_parent.status` → ACTIVE
 * - Sets class `status` → ACTIVE and applies the provided `classLicences`
 * Returns `{ school, leader, teacher?, parent, pupil, class }` when active; otherwise `{ school, leader, teacher? }`.
 *
 * **`options.addScrapbookTopic`** (requires `active: true`):
 * Creates a Ready Teddy topic wired up for the scrapbook feature on the activated class/pupil:
 * - Creates a published static topic with a `scrapbookPrompt`
 * - Links it to `domainId` (defaults to the Ready Teddy domain '3', so `currentReadyTeddyTopicForScrapbook` resolves it)
 * - Creates a released `lwp_class_topic` and `lwp_pupil_topic` for today
 * - Returned on the result as `scrapbookTopic` (including the seeded `pupilActivityId`)
 *
 * **`options.addActivityTopic`** (requires `active: true`):
 * Creates a regular (non-reading) topic with one activity on the activated class/pupil:
 * - Creates a published static topic + static activity, linked to `domainId` (defaults to English '2'),
 *   so the caller controls which subject the topic belongs to
 * - Creates a released `lwp_class_topic`, `lwp_pupil_topic` and `lwp_pupil_activity` for today
 * - Returned on the result as `activityTopic` (including the seeded `pupilActivityId`)
 *
 * **`options.addReadingTopic`** (requires `active: true`):
 * Schedules the shared reading topic on the activated class/pupil:
 * - Reuses the existing `static_lwp_topic` where `isReading = true`
 * - Creates a released `lwp_class_topic` and `lwp_pupil_topic` for today with the given `readingTarget` (default 1)
 * - Returned on the result as `readingTopic`
 *
 * Each topic option also accepts a `feedback` object. When present, a single feedback of the matching
 * type (scrapbook / activity / reading) is created inside the function, authored by the activated parent
 * and linked to the seeded pupil (and, for activity, to the seeded `lwp_pupil_activity`). Only the
 * type-specific fields need to be supplied; `sharingAllowed` defaults to true so the entry is visible on
 * the admin activity feed. The feedback id is returned on the corresponding `*Topic.feedbackId`.
 *
 * Any combination of `addScrapbookTopic`, `addActivityTopic` and `addReadingTopic` can be passed; each
 * is handled independently so all three topic types (and their feedback) can be seeded in a single call.
 *
 * @param db - Kysely database instance
 * @param utils - DB utility helpers from `createUtils`
 * @param input - School and leader configuration
 * @param options - Optional activation and data-seeding flags
 */
export const createSchoolAndDummyWondeData = async (
    db: Kysely<Schema.DB>,
    utils: ReturnType<typeof createUtils>,
    input: CreateSchoolAndDummyWondeDataInput,
    options?: CreateSchoolAndDummyWondeDataOptions
): Promise<CreateSchoolAndDummyWondeDataResult> => {
    const user = await db.selectFrom('lwp_user').where('id', '=', '1').select(['id', 'password']).executeTakeFirstOrThrow();
    const currentPeriod = await db
        .selectFrom('static_lwp_period')
        .where('isCurrentPeriod', '=', true)
        .select('index')
        .executeTakeFirstOrThrow();

    const academicYear: number = input.school.isFutureAcademicYear ? currentPeriod.index + 1 : currentPeriod.index;

    const school = await utils.createSchool({
        schoolName: input.school.name,
        curentPeriodIndex: academicYear,
        numOfFullProgrammeClassesAllowed: input.school.numOfFullProgrammeClassesAllowed,
        numOfTotalClassesAllowed: input.school.numOfTotalClassesAllowed,
        enableAddClasses: input.school.enableAddClasses,
        isMoneySkillsAvailable: input.school.isMoneySkillsAvailable,
        isReadyTeddyAvailable: input.school.isReadyTeddyAvailable,
        isParentFeedbackReplyFeatureEnabled: input.school.isParentFeedbackReplyFeatureEnabled ?? null,
        isParentFeedbackStickerFeatureEnabled: input.school.isParentFeedbackStickerFeatureEnabled ?? null,
        logCreatedById: user.id,
        logUpdatedById: user.id
    });
    const leader = await utils.createUser({
        firstname: input.leader.firstname,
        lastname: input.leader.lastname,
        email: input.leader.email,
        type: UserType.TEACHER,
        userStatus: input.leader.userStatus,
        isSchoolLeader: true,
        schoolId: school.id,
        password: user.password,
        nameForChildren: `Mr ${input.leader.firstname}`
    });
    if (input.leader.addTooltip) {
        await utils.addUserTooltipHistory(leader.id, 'topic-library-tooltip');
        await utils.addUserTooltipHistory(leader.id, 'school-reading-log-tooltip');

        if (input.school.isParentFeedbackReplyFeatureEnabled) await utils.addUserTooltipHistory(leader.id, 'reply-on-feedback-tooltip');
        if (input.school.isParentFeedbackStickerFeatureEnabled)
            await utils.addUserTooltipHistory(leader.id, 'award-stickers-to-feedback-tooltip');
    }
    if (input.leader.skipMoneySkillsWelcome) await utils.addMoneySkillsWelcomeSeen(leader.id);
    let teacher: typeof leader | undefined;
    if (input.teacher) {
        const createdTeacher = await utils.createUser({
            firstname: input.teacher.firstname,
            lastname: input.teacher.lastname,
            email: input.teacher.email,
            type: UserType.TEACHER,
            userStatus: input.teacher.userStatus,
            isSchoolLeader: false,
            schoolId: school.id,
            password: user.password,
            nameForChildren: `Mr ${input.teacher.firstname}`
        });
        if (input.teacher.addTooltip) {
            await utils.addUserTooltipHistory(createdTeacher.id, 'topic-library-tooltip');
            await utils.addUserTooltipHistory(createdTeacher.id, 'school-reading-log-tooltip');

            if (input.school.isParentFeedbackReplyFeatureEnabled)
                await utils.addUserTooltipHistory(createdTeacher.id, 'reply-on-feedback-tooltip');
            if (input.school.isParentFeedbackStickerFeatureEnabled)
                await utils.addUserTooltipHistory(createdTeacher.id, 'award-stickers-to-feedback-tooltip');
        }
        teacher = createdTeacher;
    }
    const importedSchool = await utils.createImportedSchool({
        id: Date.now().toString(36) + crypto.randomBytes(2).toString('hex'),
        name: school.schoolName,
        urn: generateId(6),
        lwpSchoolId: school.id,
        importedFrom: 'WONDE',
        periodIndex: academicYear,
        postCode: null,
        importedIgnoredContacts: null,
        proposedSchoolId: null
    });

    await db
        .updateTable('lwp_school')
        .set({ importedSchoolId: importedSchool.id, misIntegration: crypto.randomBytes(3).toString('hex').slice(0, 5).toUpperCase() })
        .where('id', '=', school.id)
        .execute();

    type DummyStudent = { importedStudent: Selectable<Schema.ImportedStudent>; lwpPupil: Selectable<Schema.LwpPupil> };

    const createDummyStudent = async (isPreRegistration: boolean, importNcYear: number): Promise<DummyStudent> => {
        const studentId = Date.now().toString(36) + crypto.randomBytes(2).toString('hex');
        const importedStudent = await utils.createImportedStudent(importedSchool.id, {
            id: studentId,
            schoolId: importedSchool.id,
            mis_id: studentId,
            initials: '[Unknown]',
            forename: `Wonde ${studentId}`,
            surname: 'Student',
            importedFrom: 'WONDE',
            gender: 'MALE',
            UPN: studentId,
            isPremium: false,
            details: JSON.stringify(
                JSON.stringify({
                    fsm6: false,
                    premium_pupil_indicator: false,
                    premium_pupil_eligible: null,
                    premium_pupil_notes: '[Unknown]',
                    import_nc_year: importNcYear
                })
            ),
            isPreRegistration
        });

        const lwpPupil = await utils.createPupil(school.id, {
            firstname: importedStudent.forename ?? 'Wonde',
            lastname: importedStudent.surname ?? 'Student',
            importedStudentId: importedStudent.id,
            isPremium: importedStudent.isPremium,
            UPN: importedStudent.UPN,
            startedSchool: (academicYear - importNcYear).toString(),
            isPreRegistration: importedStudent.isPreRegistration,
            dateOfBirth: importedStudent.dateOfBirth,
            gender: importedStudent.gender,
            logCreatedById: user.id,
            logUpdatedById: user.id
        });

        await db.updateTable('imported_student').set({ lwpPupilId: lwpPupil.id }).where('id', '=', importedStudent.id).execute();

        // Create 2 contacts per student (Mr and Mrs parent), each linked to an lwp_user
        for (let k = 0; k < 2; k++) {
            const contact = await utils.createImportedContact(importedSchool.id, {
                id: Date.now().toString(36) + crypto.randomBytes(2).toString('hex'),
                schoolId: importedSchool.id,
                email: `dummyparent${studentId}${k}@example.com`,
                phoneNumber: null,
                forename: `Wonde ${studentId}${k}`,
                surname: 'Parent',
                title: k === 0 ? 'Mr' : 'Mrs',
                importedFrom: 'WONDE'
            });

            const lwpUser = await utils.createUser({
                firstname: contact.forename ?? 'Wonde',
                lastname: contact.surname ?? 'Parent',
                email: contact.email,
                type: UserType.PARENT,
                userStatus: UserStatus.IMPORTED,
                importedContactId: contact.id,
                password: user.password
            });

            await db.updateTable('imported_contact').set({ lwpUserId: lwpUser.id }).where('id', '=', contact.id).execute();

            await utils.createImportedStudentContact({
                schoolId: importedSchool.id,
                importedStudentId: importedStudent.id,
                importedContactId: contact.id,
                importedFrom: 'WONDE',
                pupil_report: false,
                parental_responsibility: true,
                correspondence: false,
                email_notification: null,
                sms_notification: null,
                mail_notification: null,
                push_notification: null,
                in_touch_communication: null,
                priority: k,
                relationship: k === 0 ? 'Father' : 'Mother'
            });

            await utils.addParentToPupil(lwpPupil.id, lwpUser.id, false, PupilParentStatus.IMPORTED);
        }

        return { importedStudent, lwpPupil };
    };

    // Create 25 current year imported students (0–19 normal, 20–24 nursery with nc_year -1)
    const currentYearStudents: DummyStudent[] = [];
    for (let i = 0; i < 25; i++) {
        currentYearStudents.push(await createDummyStudent(false, i >= 20 ? -1 : 10));
    }

    // Create 10 pre-admission imported students
    const preAdmissionStudents: DummyStudent[] = [];
    for (let i = 0; i < 10; i++) {
        preAdmissionStudents.push(await createDummyStudent(true, -1));
    }

    // Create 7 imported classes mirroring createDummyWondeSchoolData:
    // - Classes 0–3: current period, 5 current-year students each
    // - Class 4:     current period, no students (empty)
    // - Class 5:     next period,    no students (empty pre-admission)
    // - Class 6:     next period,    first 5 pre-admission students
    for (let i = 0; i < 7; i++) {
        const periodIndex = i > 4 ? academicYear + 1 : academicYear;
        const uniqueId = generateId(8);

        const importedClass = await utils.createImportedClass(importedSchool.id, {
            id: Date.now().toString(36) + crypto.randomBytes(2).toString('hex'),
            schoolId: importedSchool.id,
            name: `Wonde Class ${uniqueId}${i}`,
            code: `Wonde Class ${uniqueId}${i}`,
            nc_year: '8',
            importedFrom: 'WONDE',
            periodIndex
        });

        // Classes 4 and 5 are intentionally left empty — no LWP class is created for them
        if (i !== 4 && i !== 5) {
            const students = i > 4 ? preAdmissionStudents.slice(0, 5) : currentYearStudents.slice(i * 5, i * 5 + 5);

            const lwpClass = await utils.createClass(school.id, {
                name: importedClass.name ?? `Wonde Class ${uniqueId}${i}`,
                isRegistrationClass: true,
                status: 'IMPORTED',
                yearGroup: importedClass.nc_year,
                periodIndex: importedClass.periodIndex,
                importedSchoolClassId: importedClass.id,
                logCreatedById: user.id,
                logUpdatedById: user.id
            });

            await db
                .updateTable('imported_school_class')
                .set({ lwpSchoolClassId: lwpClass.id })
                .where('id', '=', importedClass.id)
                .execute();

            for (const { importedStudent, lwpPupil } of students) {
                await utils.addStudentToImportedClass(importedClass.id, importedStudent.id);
                await utils.addPupilToClass(lwpPupil.id, lwpClass.id);
            }
        }
    }

    if (options?.active) {
        // Find a pupil in this school that has both a class assignment and at least one parent
        const firstPupilRecord = await db
            .selectFrom('lwp_pupil')
            .innerJoin('lwp_class_pupil', 'lwp_class_pupil.lwpPupilId', 'lwp_pupil.id')
            .innerJoin('lwp_school_class', 'lwp_school_class.id', 'lwp_class_pupil.lwpSchoolClassId')
            .innerJoin('lwp_pupil_parent', 'lwp_pupil_parent.pupilId', 'lwp_pupil.id')
            .where('lwp_pupil.schoolId', '=', school.id)
            // Restrict to the school's own academic year. The imported-class loop above also seeds
            // NEXT-period pre-admission classes (i > 4), and without this filter an arbitrary one of
            // those can be picked and activated, leaving the class a year ahead of every feedback row
            // callers seed at the current period - which renders the feed and class lists empty.
            .where('lwp_school_class.periodIndex', '=', academicYear)
            // Ordering keeps the choice deterministic: Postgres returns unordered rows in whatever
            // order the plan produces, so this query was silently non-deterministic between runs.
            .orderBy('lwp_school_class.id')
            .orderBy('lwp_pupil.id')
            .select([
                'lwp_pupil.id as pupilId',
                'lwp_pupil.firstname',
                'lwp_pupil.lastname',
                'lwp_school_class.id as classId',
                'lwp_school_class.name as className',
                'lwp_pupil_parent.parentId'
            ])
            .executeTakeFirstOrThrow();

        const firstParent = await db
            .selectFrom('lwp_user')
            .where('id', '=', firstPupilRecord.parentId)
            .select(['id', 'email', 'firstname', 'lastname'])
            .executeTakeFirstOrThrow();

        await db.updateTable('lwp_user').set({ userStatus: UserStatus.ACTIVE }).where('id', '=', firstParent.id).execute();

        await db
            .updateTable('lwp_pupil_parent')
            .set({ status: PupilParentStatus.ACTIVE })
            .where('pupilId', '=', firstPupilRecord.pupilId)
            .where('parentId', '=', firstParent.id)
            .execute();

        const yearGroupId = '0';

        await utils.addClassTeacher(leader.id, firstPupilRecord.classId);
        await db
            .updateTable('lwp_school_class')
            .set({
                status: 'ACTIVE',
                isRegistrationClass: true,
                yearGroup: yearGroupId,
                isFullProgramme: options.classLicences?.isFullProgramme,
                IsReadingLogsEnabled: options.classLicences?.IsReadingLogsEnabled,
                isReadyTeddyEnabled: options.classLicences?.isReadyTeddyEnabled
            })
            .where('id', '=', firstPupilRecord.classId)
            .execute();

        let scrapbookTopic: CreatedTopicResult | undefined;
        let activityTopic: CreatedTopicResult | undefined;
        let readingTopic: CreatedTopicResult | undefined;

        if (options.addScrapbookTopic) {
            const adminUser = await db.selectFrom('lwp_user').where('id', '=', '1').select(['id']).executeTakeFirstOrThrow();

            const staticTopic = await utils.createStaticTopic({
                isReading: false,
                teacherTopicName: options.addScrapbookTopic.name,
                parentTopicName: options.addScrapbookTopic.name,
                scrapbookPrompt: options.addScrapbookTopic.scrapbookPrompt,
                isPublished: true,
                video: '605069004',
                logCreatedById: adminUser.id,
                logUpdatedById: adminUser.id
            });

            const staticActivity = await utils.createStaticActivity({
                name: `${options.addScrapbookTopic.name} activity`,
                activityType: 'LEGACY',
                order: 1,
                topicId: staticTopic.id,
                logCreatedById: user.id,
                logUpdatedById: user.id
            });

            await db
                .insertInto('static_lwp_topic_domain_year_group')
                .values({ domainId: options.addScrapbookTopic.domainId ?? readyTeddyDomainId, topicId: staticTopic.id, yearGroupId })
                .executeTakeFirstOrThrow();

            const classTopic = await utils.createClassTopic(firstPupilRecord.classId, {
                topicId: staticTopic.id,
                releaseDate: options.addScrapbookTopic.releaseDate,
                released: true
            });

            const pupilTopic = await utils.createPupilTopic({
                releaseDate: options.addScrapbookTopic.releaseDate,
                pupilId: firstPupilRecord.pupilId,
                classTopicId: classTopic.id,
                topicId: staticTopic.id,
                watchedVideo: false,
                periodIndex: currentPeriod.index,
                silverStars: 0,
                earnedGoldStar: false
            });

            const pupilActivity = await utils.createPupilActivity({
                pupilId: firstPupilRecord.pupilId,
                topicId: pupilTopic.id,
                activityId: staticActivity.id,
                earnedStar: false,
                mathscotActivityItemIds: JSON.stringify([88, 188, 224])
            });

            let feedbackId: string | undefined;
            if (options.addScrapbookTopic.feedback) {
                const fb = options.addScrapbookTopic.feedback;
                const feedback = await utils.createPupilFeedback(firstPupilRecord.pupilId, {
                    type: 'SCRAPBOOK',
                    userType: UserType.PARENT,
                    userId: firstParent.id,
                    periodIndex: currentPeriod.index,
                    sharingAllowed: fb.sharingAllowed ?? true,
                    comment: fb.comment ?? null,
                    scrapbookPrompt: fb.scrapbookPrompt ?? options.addScrapbookTopic.scrapbookPrompt,
                    ...(fb.logCreatedAt ? { logCreatedAt: fb.logCreatedAt } : {}),
                    ...(fb.logUpdatedAt ? { logUpdatedAt: fb.logUpdatedAt } : {})
                });
                feedbackId = feedback.id;
            }

            scrapbookTopic = {
                staticTopicId: staticTopic.id,
                classTopicId: classTopic.id,
                pupilTopicId: pupilTopic.id,
                pupilActivityId: pupilActivity.id,
                feedbackId
            };
        }

        if (options.addActivityTopic) {
            const staticTopic = await utils.createStaticTopic({
                isReading: false,
                teacherTopicName: options.addActivityTopic.name,
                parentTopicName: options.addActivityTopic.name,
                isPublished: true,
                video: '605069004',
                logCreatedById: user.id,
                logUpdatedById: user.id
            });

            const staticActivity = await utils.createStaticActivity({
                name: `${options.addActivityTopic.name} activity`,
                activityType: 'LEGACY',
                order: 1,
                topicId: staticTopic.id,
                logCreatedById: user.id,
                logUpdatedById: user.id
            });

            await db
                .insertInto('static_lwp_topic_domain_year_group')
                .values({ domainId: options.addActivityTopic.domainId ?? englishDomainId, topicId: staticTopic.id, yearGroupId })
                .executeTakeFirstOrThrow();

            const classTopic = await utils.createClassTopic(firstPupilRecord.classId, {
                topicId: staticTopic.id,
                releaseDate: options.addActivityTopic.releaseDate,
                released: true
            });

            const pupilTopic = await utils.createPupilTopic({
                releaseDate: options.addActivityTopic.releaseDate,
                pupilId: firstPupilRecord.pupilId,
                classTopicId: classTopic.id,
                topicId: staticTopic.id,
                watchedVideo: false,
                periodIndex: currentPeriod.index,
                silverStars: 0,
                earnedGoldStar: false
            });

            const pupilActivity = await utils.createPupilActivity({
                pupilId: firstPupilRecord.pupilId,
                topicId: pupilTopic.id,
                activityId: staticActivity.id,
                earnedStar: false,
                mathscotActivityItemIds: JSON.stringify([88, 188, 224])
            });

            let feedbackId: string | undefined;
            if (options.addActivityTopic.feedback) {
                const fb = options.addActivityTopic.feedback;
                const feedback = await utils.createPupilFeedback(firstPupilRecord.pupilId, {
                    type: 'ACTIVITY',
                    userType: UserType.PARENT,
                    userId: firstParent.id,
                    activityId: pupilActivity.id,
                    periodIndex: currentPeriod.index,
                    sharingAllowed: fb.sharingAllowed ?? true,
                    pupilComment: fb.pupilComment ?? null,
                    parentComment: fb.parentComment ?? null,
                    ...(fb.includeParentCommentInImpactReport !== undefined
                        ? { includeParentCommentInImpactReport: fb.includeParentCommentInImpactReport }
                        : {}),
                    ...(fb.includePupilCommentInImpactReport !== undefined
                        ? { includePupilCommentInImpactReport: fb.includePupilCommentInImpactReport }
                        : {}),
                    ...(fb.logCreatedAt ? { logCreatedAt: fb.logCreatedAt } : {}),
                    ...(fb.logUpdatedAt ? { logUpdatedAt: fb.logUpdatedAt } : {})
                });
                feedbackId = feedback.id;
            }

            activityTopic = {
                staticTopicId: staticTopic.id,
                classTopicId: classTopic.id,
                pupilTopicId: pupilTopic.id,
                pupilActivityId: pupilActivity.id,
                feedbackId
            };
        }

        if (options.addReadingTopic) {
            const readingTarget = options.addReadingTopic.readingTarget ?? 1;

            const staticReadingTopic = await db
                .selectFrom('static_lwp_topic')
                .where('isReading', '=', true)
                .select(['id'])
                .executeTakeFirstOrThrow();

            const classTopic = await utils.createClassTopic(firstPupilRecord.classId, {
                topicId: staticReadingTopic.id,
                releaseDate: options.addReadingTopic.releaseDate,
                released: true,
                readingTarget
            });

            const pupilTopic = await utils.createPupilTopic({
                releaseDate: options.addReadingTopic.releaseDate,
                pupilId: firstPupilRecord.pupilId,
                classTopicId: classTopic.id,
                topicId: staticReadingTopic.id,
                watchedVideo: false,
                periodIndex: currentPeriod.index,
                silverStars: 0,
                earnedGoldStar: false,
                readingTarget
            });

            let feedbackId: string | undefined;
            if (options.addReadingTopic.feedback) {
                const fb = options.addReadingTopic.feedback;
                const feedback = await utils.createPupilFeedback(firstPupilRecord.pupilId, {
                    type: 'READING',
                    userType: UserType.PARENT,
                    userId: firstParent.id,
                    userName: `${firstParent.firstname ?? ''} ${firstParent.lastname ?? ''}`.trim(),
                    periodIndex: currentPeriod.index,
                    sharingAllowed: fb.sharingAllowed ?? true,
                    readingType: fb.readingType ?? 'SCHOOL_BOOK',
                    includeInReadingTarget: fb.includeInReadingTarget ?? true,
                    isBookFinished: fb.isBookFinished ?? true,
                    comment: fb.comment ?? null,
                    bookName: fb.bookName ?? null,
                    ...(fb.includeReadingCommentInImpactReport !== undefined
                        ? { includeReadingCommentInImpactReport: fb.includeReadingCommentInImpactReport }
                        : {}),
                    ...(fb.bookReadAt ? { bookReadAt: fb.bookReadAt } : {}),
                    ...(fb.logCreatedAt ? { logCreatedAt: fb.logCreatedAt } : {}),
                    ...(fb.logUpdatedAt ? { logUpdatedAt: fb.logUpdatedAt } : {})
                });
                feedbackId = feedback.id;
            }

            readingTopic = {
                staticTopicId: staticReadingTopic.id,
                classTopicId: classTopic.id,
                pupilTopicId: pupilTopic.id,
                feedbackId
            };
        }

        return {
            school: { id: school.id },
            leader: { id: leader.id, firstname: leader.firstname, lastname: leader.lastname },
            teacher: teacher ? { id: teacher.id, firstname: teacher.firstname, lastname: teacher.lastname } : undefined,
            parent: { id: firstParent.id, email: firstParent.email, firstname: firstParent.firstname, lastname: firstParent.lastname },
            pupil: { id: firstPupilRecord.pupilId, firstname: firstPupilRecord.firstname, lastname: firstPupilRecord.lastname },
            class: { id: firstPupilRecord.classId, name: firstPupilRecord.className },
            activityTopic,
            readingTopic,
            scrapbookTopic
        };
    }

    return {
        school: { id: school.id },
        leader: { id: leader.id, firstname: leader.firstname, lastname: leader.lastname },
        teacher: teacher ? { id: teacher.id, firstname: teacher.firstname, lastname: teacher.lastname } : undefined
    };
};
