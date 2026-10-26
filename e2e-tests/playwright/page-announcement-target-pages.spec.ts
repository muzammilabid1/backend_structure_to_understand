import { expect, Page, test } from '@playwright/test';
import type { Schema } from '@lwp/postgres-client';
import { type Kysely } from 'kysely';
import { PageAnnouncementStatus, PageAnnouncementUserOption, UserStatus, UserType } from 'lwp-shared';
import { createDb } from './db';
import { createUtils } from './dbUtils';
import {
    admin,
    generateClassName,
    generateFirstName,
    generateLastName,
    generateSchoolName,
    generateSentence,
    generateUPN,
    generateUserEmail,
    password
} from './constants';
import { acceptFeatureTooltipPrompt, adminOrTeacherSignOut, login, parentSignOut, waitForLoading } from './utils';

/**
 * For each user type, one announcement is aimed at three pages, and an untargeted "control" announcement
 * is aimed at every page. On the three pages the targeted one is the banner (it has the higher priority)
 * and the bell counts both. On two other pages the control banner proves the banner loaded, the targeted
 * one is absent, and the bell counts only the control.
 */
test.describe('Page announcements aimed at specific pages', () => {
    let db: Kysely<Schema.DB>;
    let utils: ReturnType<typeof createUtils>;
    let ids: { schoolId: string; classId: string; pupilId: string; teacherId: string };
    const leaderEmail = generateUserEmail(generateFirstName(), generateLastName());
    const teacherEmail = generateUserEmail(generateFirstName(), generateLastName());
    const parentEmail = generateUserEmail(generateFirstName(), generateLastName());

    const resetAnnouncements = async () => {
        await db.deleteFrom('lwp_page_announcement_school_tags').execute();
        await db.deleteFrom('lwp_user_page_announcement').execute();
        await db.deleteFrom('static_lwp_page_announcement').execute();
    };

    /** Creates the targeted and control announcements for one user option, and returns their messages. */
    const createAnnouncements = async (userOption: PageAnnouncementUserOption, targetPages: string[]) => {
        await resetAnnouncements();

        const targeted = `Targeted: ${generateSentence(4)}`;
        const control = `Every page: ${generateSentence(4)}`;

        await utils.createPageAnnouncement({
            userOptions: JSON.stringify([userOption]),
            targetPages: JSON.stringify(targetPages),
            status: PageAnnouncementStatus.ACTIVE,
            title: targeted,
            message: targeted,
            priority: 1
        });
        await utils.createPageAnnouncement({
            userOptions: JSON.stringify([userOption]),
            status: PageAnnouncementStatus.ACTIVE,
            title: control,
            message: control,
            priority: 2
        });

        return { targeted, control };
    };

    const expectBanner = async (page: Page, url: string, shownMessage: string, hiddenMessage: string | null, bellCount: string) => {
        await page.goto(url);
        await waitForLoading(page);

        const banner = page.getByTestId('page-announcement-card-message');

        await expect(banner.getByText(shownMessage), `"${shownMessage}" should be the banner on ${url}`).toBeVisible();
        if (hiddenMessage) await expect(banner.getByText(hiddenMessage), `"${hiddenMessage}" should not show on ${url}`).toBeHidden();
        await expect(page.getByTestId('notification-badge').first(), `bell count on ${url}`).toHaveText(bellCount);
    };

    /** The targeted announcement shows on every target page, and only the control shows on the other pages. */
    const expectOnlyOnTargetPages = async (
        page: Page,
        messages: { targeted: string; control: string },
        targetUrls: string[],
        otherUrls: string[]
    ) => {
        for (const url of targetUrls) await expectBanner(page, url, messages.targeted, null, '2');
        for (const url of otherUrls) await expectBanner(page, url, messages.control, messages.targeted, '1');
    };

    test.beforeAll(async () => {
        db = createDb();
        utils = createUtils(db);

        const user = await db.selectFrom('lwp_user').where('id', '=', '1').select(['id', 'password']).executeTakeFirstOrThrow();
        const currentPeriod = await db
            .selectFrom('static_lwp_period')
            .where('isCurrentPeriod', '=', true)
            .select('index')
            .executeTakeFirstOrThrow();
        const school = await utils.createSchool({
            schoolName: `${generateSchoolName()} School`,
            curentPeriodIndex: currentPeriod.index,
            numOfFullProgrammeClassesAllowed: 10,
            numOfTotalClassesAllowed: 30,
            enableAddClasses: true,
            logCreatedById: user.id,
            logUpdatedById: user.id
        });
        const createStaff = (email: string, isSchoolLeader: boolean) =>
            utils.createUser({
                firstname: generateFirstName(),
                lastname: generateLastName(),
                email,
                type: UserType.TEACHER,
                userStatus: UserStatus.ACTIVE,
                isSchoolLeader,
                schoolId: school.id,
                password: user.password,
                nameForChildren: `Mr ${generateLastName()}`
            });
        const leader = await createStaff(leaderEmail, true);
        const teacher = await createStaff(teacherEmail, false);
        const parent = await utils.createUser({
            firstname: generateFirstName(),
            lastname: generateLastName(),
            email: parentEmail,
            type: UserType.PARENT,
            userStatus: UserStatus.ACTIVE,
            password: user.password
        });
        const schoolClass = await utils.createClass(school.id, {
            name: `${generateClassName()} Class`,
            isRegistrationClass: true,
            isFullProgramme: true,
            mainTeacherId: leader.id,
            yearGroup: 1,
            periodIndex: currentPeriod.index,
            readingTarget: 1,
            logCreatedById: user.id,
            logUpdatedById: user.id
        });
        const pupil = await utils.createPupil(school.id, {
            firstname: generateFirstName(),
            lastname: generateLastName(),
            dateOfBirth: new Date(),
            startedSchool: '2024',
            isPremium: true,
            gender: 'MALE',
            UPN: generateUPN(),
            logCreatedById: user.id,
            logUpdatedById: user.id
        });
        await utils.addParentToPupil(pupil.id, parent.id, false);
        await utils.addPupilToClass(pupil.id, schoolClass.id);
        await utils.addClassTeacher(teacher.id, schoolClass.id);
        for (const staff of [leader, teacher]) {
            await utils.addUserTooltipHistory(staff.id, 'topic-library-tooltip');
            await utils.addUserTooltipHistory(staff.id, 'school-reading-log-tooltip');
        }

        ids = { schoolId: school.id, classId: schoolClass.id, pupilId: pupil.id, teacherId: teacher.id };
    });

    test.afterAll(async () => {
        await resetAnnouncements();
        await db.destroy();
    });

    test('Logged out: shows on the login screen, FAQs and impact report, not on sign-up or forgot password', async ({ page }) => {
        const messages = await createAnnouncements(PageAnnouncementUserOption.ALL_USERS, ['/__login', '/faqs', '/impact-report/[token]']);

        await expectOnlyOnTargetPages(
            page,
            messages,
            // A protected page shows the login screen to a logged-out user
            [`/school/${ids.schoolId}/feed`, '/faqs', '/impact-report/not-a-real-token'],
            ['/signup', '/forgot-password']
        );
    });

    test('School leader: shows on the school overview, feed and settings, not on reports or a class page', async ({ page }) => {
        const messages = await createAnnouncements(PageAnnouncementUserOption.SCHOOL_LEADER, [
            '/school/[school_id]',
            '/school/[school_id]/feed',
            '/school/[school_id]/settings'
        ]);

        await login(page, leaderEmail, password);
        await page.waitForURL(/\/school/);
        await acceptFeatureTooltipPrompt(page);
        await expectOnlyOnTargetPages(
            page,
            messages,
            [`/school/${ids.schoolId}`, `/school/${ids.schoolId}/feed`, `/school/${ids.schoolId}/settings`],
            [`/school/${ids.schoolId}/reports`, `/class/${ids.classId}/pupils`]
        );
        await adminOrTeacherSignOut(page);
    });

    test('Teacher: shows on the teacher feed, class pupils and topic library, not on the schedule or account', async ({ page }) => {
        const messages = await createAnnouncements(PageAnnouncementUserOption.TEACHER, [
            '/feed/[user_id]',
            '/class/[class_id]/pupils',
            '/school/[school_id]/topic-library'
        ]);

        await login(page, teacherEmail, password);
        await page.waitForURL(/\/feed/);
        await acceptFeatureTooltipPrompt(page);
        await expectOnlyOnTargetPages(
            page,
            messages,
            [`/feed/${ids.teacherId}`, `/class/${ids.classId}/pupils`, `/school/${ids.schoolId}/topic-library`],
            [`/class/${ids.classId}/schedule`, '/account']
        );
        await adminOrTeacherSignOut(page);
    });

    test('A school leader announcement on the school activity feed reaches the leader, never a teacher', async ({ page }) => {
        // The leader-only one is created as the targeted one; the control is aimed at every teacher, leaders included
        await resetAnnouncements();
        const leaderFeedOnly = `Leader feed only: ${generateSentence(4)}`;
        const everyTeacher = `Every teacher: ${generateSentence(4)}`;

        await utils.createPageAnnouncement({
            userOptions: JSON.stringify([PageAnnouncementUserOption.SCHOOL_LEADER]),
            targetPages: JSON.stringify(['/school/[school_id]/feed']),
            status: PageAnnouncementStatus.ACTIVE,
            title: leaderFeedOnly,
            message: leaderFeedOnly,
            priority: 1
        });
        await utils.createPageAnnouncement({
            userOptions: JSON.stringify([PageAnnouncementUserOption.TEACHER]),
            status: PageAnnouncementStatus.ACTIVE,
            title: everyTeacher,
            message: everyTeacher,
            priority: 2
        });

        // The leader sees it on the school activity feed
        await login(page, leaderEmail, password);
        await page.waitForURL(/\/school/);
        await acceptFeatureTooltipPrompt(page);
        await expectBanner(page, `/school/${ids.schoolId}/feed`, leaderFeedOnly, null, '2');
        await adminOrTeacherSignOut(page);

        // A teacher's activity feed is a different page, and the announcement isn't for teachers anyway
        await login(page, teacherEmail, password);
        await page.waitForURL(/\/feed/);
        await acceptFeatureTooltipPrompt(page);
        await expectBanner(page, `/feed/${ids.teacherId}`, everyTeacher, leaderFeedOnly, '1');
        await expectBanner(page, `/class/${ids.classId}/pupils`, everyTeacher, leaderFeedOnly, '1');
        await page.getByTestId('notification-badge').first().click();
        await expect(page.getByTestId('announcement-drawer-item').filter({ hasText: everyTeacher })).toBeVisible();
        await expect(page.getByTestId('announcement-drawer-item').filter({ hasText: leaderFeedOnly })).toHaveCount(0);
        await page.getByTestId('all-announcements-drawer-close-button').click();
        await adminOrTeacherSignOut(page);
    });

    test('The bell lists an announcement on a page it is not aimed at, without naming pages', async ({ page }) => {
        await resetAnnouncements();
        const message = `Parents and teachers, one page each: ${generateSentence(4)}`;

        await utils.createPageAnnouncement({
            userOptions: JSON.stringify([PageAnnouncementUserOption.PARENT, PageAnnouncementUserOption.TEACHER]),
            targetPages: JSON.stringify(['/feed/[user_id]', '/child/[child_id]/history']),
            status: PageAnnouncementStatus.ACTIVE,
            title: message,
            message,
            priority: 1
        });

        // Neither page is one the announcement is aimed at, so there is no banner, but the bell still lists it
        const expectInBell = async (url: string) => {
            await page.goto(url);
            await waitForLoading(page);

            await expect(page.getByTestId('page-announcement-card-message').getByText(message)).toBeHidden();
            await page.getByTestId('notification-badge').first().click();

            const item = page.getByTestId('announcement-drawer-item').filter({ hasText: message });

            await expect(item).toBeVisible();
            await expect(item.getByTestId('announcement-drawer-target-pages')).toHaveCount(0);
            await page.getByTestId('all-announcements-drawer-close-button').click();
        };

        await login(page, parentEmail, password);
        await expectInBell('/settings');
        await parentSignOut(page);

        await login(page, teacherEmail, password);
        await page.waitForURL(/\/feed/);
        await acceptFeatureTooltipPrompt(page);
        await expectInBell(`/class/${ids.classId}/pupils`);
        await adminOrTeacherSignOut(page);
    });

    test("Parent: shows on the child's history and trophies and the parent settings, not on the child's settings or the parent FAQs", async ({
        page
    }) => {
        const messages = await createAnnouncements(PageAnnouncementUserOption.PARENT, [
            '/child/[child_id]/history',
            '/child/[child_id]/trophies',
            '/settings'
        ]);

        await login(page, parentEmail, password);
        await expectOnlyOnTargetPages(
            page,
            messages,
            [`/child/${ids.pupilId}/history`, `/child/${ids.pupilId}/trophies`, '/settings'],
            [`/child/${ids.pupilId}/settings`, '/parent-faqs']
        );
        await parentSignOut(page);
    });

    test('Admin: shows on the chosen admin pages, never to a teacher, and an admin never gets a teacher announcement', async ({ page }) => {
        const messages = await createAnnouncements(PageAnnouncementUserOption.ADMIN, ['/admin/announcements', '/admin/all-feeds']);
        const everyTeacher = `Every teacher: ${generateSentence(4)}`;

        await utils.createPageAnnouncement({
            userOptions: JSON.stringify([PageAnnouncementUserOption.TEACHER]),
            status: PageAnnouncementStatus.ACTIVE,
            title: everyTeacher,
            message: everyTeacher,
            priority: 3
        });

        // The bell counts would be one higher on every page if the teacher announcement reached the admin
        await login(page, admin, password);
        await page.waitForURL(/\/admin/);
        await expectOnlyOnTargetPages(page, messages, ['/admin/announcements', '/admin/all-feeds'], ['/admin/topics', '/faqs']);
        await page.getByTestId('notification-badge').first().click();
        await expect(page.getByTestId('announcement-drawer-item').filter({ hasText: messages.control })).toBeVisible();
        await expect(page.getByTestId('announcement-drawer-item').filter({ hasText: everyTeacher })).toHaveCount(0);
        await page.getByTestId('all-announcements-drawer-close-button').click();
        await adminOrTeacherSignOut(page);

        // The admin control is aimed at every page, so only its user type keeps it from a teacher
        await login(page, teacherEmail, password);
        await page.waitForURL(/\/feed/);
        await acceptFeatureTooltipPrompt(page);
        await expectBanner(page, `/feed/${ids.teacherId}`, everyTeacher, messages.control, '1');
        await adminOrTeacherSignOut(page);
    });

    test('Admin: gets "All users" announcements, the list shows user types and a page count that names the pages on hover, and Admin offers admin pages', async ({
        page
    }) => {
        await resetAnnouncements();

        const aimed = `Aimed: ${generateSentence(4)}`;
        const everywhere = `Everywhere: ${generateSentence(4)}`;

        await utils.createPageAnnouncement({
            userOptions: JSON.stringify([PageAnnouncementUserOption.PARENT, PageAnnouncementUserOption.TEACHER]),
            targetPages: JSON.stringify(['/settings', '/faqs']),
            status: PageAnnouncementStatus.ACTIVE,
            title: aimed,
            message: aimed,
            priority: 1
        });
        await utils.createPageAnnouncement({
            userOptions: JSON.stringify([PageAnnouncementUserOption.ALL_USERS]),
            status: PageAnnouncementStatus.ACTIVE,
            title: everywhere,
            message: everywhere,
            priority: 2
        });

        await login(page, admin, password);
        await page.waitForURL(/\/admin/);
        await page.goto('/admin/announcements');
        await waitForLoading(page);

        // "All users" reaches admins too; the one for parents and teachers does not
        await expect(page.getByTestId('page-announcement-card-message').getByText(everywhere)).toBeVisible();
        await expect(page.getByTestId('notification-badge').first()).toHaveText('1');

        const aimedRow = page.getByRole('row').filter({ hasText: aimed });
        const pageCount = aimedRow.getByTestId('announcement-target-page-count');

        await expect(aimedRow.getByTestId('Parent-announcement-user-type')).toBeVisible();
        await expect(aimedRow.getByTestId('Teacher-announcement-user-type')).toBeVisible();
        await expect(pageCount).toHaveText('2 pages');
        await expect(page.getByTestId('Parent: Settings-announcement-target-page'), 'page names stay hidden until hover').toBeHidden();

        await pageCount.hover();
        await expect(page.getByRole('heading', { name: 'Parent pages' })).toBeVisible();
        await expect(page.getByTestId('Parent: Settings-announcement-target-page')).toBeVisible();
        await expect(page.getByRole('heading', { name: 'Pages for everyone' })).toBeVisible();
        await expect(page.getByTestId('FAQs-announcement-target-page')).toBeVisible();

        // An open hover box hides the rest of the page from role queries
        await page.mouse.move(0, 0);
        await expect(page.getByRole('row').filter({ hasText: everywhere }).getByText('All pages')).toBeVisible();

        await page.getByTestId('add-page-announcement-button').click();
        await page.waitForURL(/\/admin\/announcements\/create/);
        await page.getByTestId('add-page-announcement-user-options-multi-select').click();
        await expect(page.getByRole('option', { name: 'Parent' })).toBeVisible();
        await page.getByRole('option', { name: 'Admin' }).click();
        await page.keyboard.press('Escape');

        // Admin offers admin pages and pages for everyone, never parent or teacher pages
        await page.getByTestId('add-page-announcement-target-pages-multi-select').click();
        const pageOptions = page.getByTestId('add-page-announcement-target-page-option');
        await expect(pageOptions.filter({ hasText: /^Admin: Announcements/ })).toBeVisible();
        await expect(pageOptions.filter({ hasText: /^FAQs/ })).toBeVisible();
        await expect(pageOptions.filter({ hasText: /^Parent: Settings/ })).toHaveCount(0);
        await expect(pageOptions.filter({ hasText: /^Teacher: Account/ })).toHaveCount(0);
        await page.keyboard.press('Escape');
        await adminOrTeacherSignOut(page);
    });
});
