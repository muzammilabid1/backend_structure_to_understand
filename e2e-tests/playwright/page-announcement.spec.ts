import { expect, test } from '@playwright/test';
import type { Schema } from '@lwp/postgres-client';
import { type Kysely } from 'kysely';
import { createDb } from './db';
import { createUtils } from './dbUtils';
import {
    generateClassName,
    generateFirstName,
    generateLastName,
    generateSchoolName,
    generateSentence,
    generateUPN,
    generateUserEmail,
    password
} from './constants';
import {
    acceptFeatureTooltipPrompt,
    adminOrTeacherSignOut,
    verifyPageAnnouncement,
    expectPageAnnouncementState,
    login,
    openSideDrawer,
    parentSignOut,
    waitForLoading
} from './utils';
import { PageAnnouncementStatus, PageAnnouncementUserOption, UserStatus, UserType } from 'lwp-shared';

test.describe('Page Announcement Management', () => {
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

    test('Page announcement End-to-End', async ({ page }) => {
        const mySchoolName = `${generateSchoolName()} School`;
        const myClassName = `${generateClassName()} Class`;
        const leaderFirstName: string = generateFirstName();
        const leaderlastName: string = generateLastName();
        const leaderEmail: string = generateUserEmail(leaderFirstName, leaderlastName);
        const parentFirstName: string = generateFirstName();
        const parentLastName: string = generateLastName();
        const parentEmail: string = generateUserEmail(parentFirstName, parentLastName);
        const pupilFirstName = generateFirstName();
        const pupilLastName = generateLastName();
        const mySchool2Name = `${generateSchoolName()} School`;
        const myClass2Name = `${generateClassName()} Class`;
        const leader2FirstName: string = generateFirstName();
        const leader2lastName: string = generateLastName();
        const leader2Email: string = generateUserEmail(leader2FirstName, leader2lastName);
        const parent2FirstName: string = generateFirstName();
        const parent2LastName: string = generateLastName();
        const parent2Email: string = generateUserEmail(parent2FirstName, parent2LastName);
        const pupil2FirstName = generateFirstName();
        const pupil2LastName = generateLastName();
        const teacherFirstName: string = generateFirstName();
        const teacherLastName: string = generateLastName();
        const teacherEmail: string = generateUserEmail(teacherFirstName, teacherLastName);
        const teacher2FirstName: string = generateFirstName();
        const teacher2LastName: string = generateLastName();
        const teacher2Email: string = generateUserEmail(teacher2FirstName, teacher2LastName);
        const schoolTagName = `${mySchoolName} Tag`;
        const schoolTag2Name = `${mySchool2Name} Tag`;

        const pageAnnouncementData = {
            allUsers: {
                title: `All users: ${generateSentence(4)}`,
                message: `All users: ${generateSentence(4)}`,
                oldMessage: `Old all users: ${generateSentence(4)}`,
                priority: 1
            },
            allParents: {
                title: `All parents: ${generateSentence(4)}`,
                message: `All parents: ${generateSentence(4)}`,
                priority: 2
            },
            allTeachers: {
                title: `All teachers: ${generateSentence(4)}`,
                message: `All teachers: ${generateSentence(4)}`,
                priority: 3
            },
            allLeaders: {
                title: `All leaders: ${generateSentence(4)}`,
                message: `All leaders: ${generateSentence(4)}`,
                priority: 8
            },
            allSchool1Parents: {
                title: `${mySchoolName} parents: ${generateSentence(4)}`,
                message: `${mySchoolName} parents: ${generateSentence(4)}`,
                priority: 4
            },
            allSchool2Parents: {
                title: `${mySchool2Name} parents: ${generateSentence(4)}`,
                message: `${mySchool2Name} parents: ${generateSentence(4)}`,
                priority: 5
            },

            allSchool1Teachers: {
                title: `${mySchoolName} teachers: ${generateSentence(4)}`,
                message: `${mySchoolName} teachers: ${generateSentence(4)}`,
                priority: 6
            },
            allSchool2Teachers: {
                title: `${mySchool2Name} teachers: ${generateSentence(4)}`,
                message: `${mySchool2Name} teachers: ${generateSentence(4)}`,
                priority: 7
            },
            allSchool1Leaders: {
                title: `${mySchoolName} leaders: ${generateSentence(4)}`,
                message: `${mySchoolName} leaders: ${generateSentence(4)}`,
                priority: 9
            },
            allSchool2Leaders: {
                title: `${mySchool2Name} leaders: ${generateSentence(4)}`,
                message: `${mySchool2Name} leaders: ${generateSentence(4)}`,
                priority: 10
            }
        };

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
            logUpdatedById: user.id
        });
        const leader = await utils.createUser({
            firstname: leaderFirstName,
            lastname: leaderlastName,
            email: leaderEmail,
            type: UserType.TEACHER,
            userStatus: UserStatus.ACTIVE,
            isSchoolLeader: true,
            schoolId: school.id,
            password: user.password,
            nameForChildren: `Mr ${leaderFirstName}`
        });
        const parent = await utils.createUser({
            firstname: parentFirstName,
            lastname: parentLastName,
            email: parentEmail,
            type: UserType.PARENT,
            userStatus: UserStatus.ACTIVE,
            password: user.password
        });
        const schoolClass = await utils.createClass(school.id, {
            name: myClassName,
            isRegistrationClass: true,
            isFullProgramme: true,
            mainTeacherId: leader.id,
            yearGroup: 1,
            periodIndex: currentPeriod.index,
            readingTarget: 1,
            logCreatedById: user.id,
            logUpdatedById: user.id
        });
        const pupil1 = await utils.createPupil(school.id, {
            firstname: pupilFirstName,
            lastname: pupilLastName,
            dateOfBirth: new Date(),
            startedSchool: '2024',
            isPremium: true,
            gender: 'MALE',
            UPN: generateUPN(),
            logCreatedById: user.id,
            logUpdatedById: user.id
        });
        await utils.addParentToPupil(pupil1.id, parent.id, false);
        await utils.addPupilToClass(pupil1.id, schoolClass.id);
        const teacher = await utils.createUser({
            firstname: teacherFirstName,
            lastname: teacherLastName,
            email: teacherEmail,
            type: UserType.TEACHER,
            userStatus: UserStatus.ACTIVE,
            isSchoolLeader: false,
            schoolId: school.id,
            password: user.password,
            nameForChildren: `Mr ${teacherFirstName}`
        });
        await utils.addClassTeacher(teacher.id, schoolClass.id);
        const school2 = await utils.createSchool({
            schoolName: mySchool2Name,
            curentPeriodIndex: currentPeriod.index,
            numOfFullProgrammeClassesAllowed: 10,
            numOfTotalClassesAllowed: 30,
            enableAddClasses: true,
            logCreatedById: user.id,
            logUpdatedById: user.id
        });
        const leader2 = await utils.createUser({
            firstname: leader2FirstName,
            lastname: leader2lastName,
            email: leader2Email,
            type: UserType.TEACHER,
            userStatus: UserStatus.ACTIVE,
            isSchoolLeader: true,
            schoolId: school2.id,
            password: user.password,
            nameForChildren: `Mr ${leader2FirstName}`
        });
        const parent2 = await utils.createUser({
            firstname: parent2FirstName,
            lastname: parent2LastName,
            email: parent2Email,
            type: UserType.PARENT,
            userStatus: UserStatus.ACTIVE,
            password: user.password
        });
        const schoolClass2 = await utils.createClass(school2.id, {
            name: myClass2Name,
            isRegistrationClass: true,
            isFullProgramme: true,
            mainTeacherId: leader2.id,
            yearGroup: 1,
            periodIndex: currentPeriod.index,
            readingTarget: 1,
            logCreatedById: user.id,
            logUpdatedById: user.id
        });
        const pupil2 = await utils.createPupil(school2.id, {
            firstname: pupil2FirstName,
            lastname: pupil2LastName,
            dateOfBirth: new Date(),
            startedSchool: '2024',
            isPremium: true,
            gender: 'MALE',
            UPN: generateUPN(),
            logCreatedById: user.id,
            logUpdatedById: user.id
        });
        await utils.addParentToPupil(pupil2.id, parent2.id, false);
        await utils.addPupilToClass(pupil2.id, schoolClass2.id);
        const teacher2 = await utils.createUser({
            firstname: teacher2FirstName,
            lastname: teacher2LastName,
            email: teacher2Email,
            type: UserType.TEACHER,
            userStatus: UserStatus.ACTIVE,
            isSchoolLeader: false,
            schoolId: school2.id,
            password: user.password,
            nameForChildren: `Mr ${teacher2FirstName}`
        });
        await utils.addClassTeacher(teacher2.id, schoolClass2.id);

        await utils.addUserTooltipHistory(leader.id, 'topic-library-tooltip');
        await utils.addUserTooltipHistory(leader.id, 'school-reading-log-tooltip');
        await utils.addUserTooltipHistory(leader2.id, 'topic-library-tooltip');
        await utils.addUserTooltipHistory(leader2.id, 'school-reading-log-tooltip');
        await utils.addUserTooltipHistory(teacher.id, 'topic-library-tooltip');
        await utils.addUserTooltipHistory(teacher.id, 'school-reading-log-tooltip');
        await utils.addUserTooltipHistory(teacher2.id, 'topic-library-tooltip');
        await utils.addUserTooltipHistory(teacher2.id, 'school-reading-log-tooltip');

        // Create a page announcement for all users and verify it appears correctly
        const allUsersPageAnnouncement = await utils.createPageAnnouncement({
            userOptions: JSON.stringify([PageAnnouncementUserOption.ALL_USERS]),
            status: PageAnnouncementStatus.ACTIVE,
            title: pageAnnouncementData.allUsers.title,
            message: `<p class="editor-paragraph" dir="ltr"><span style="white-space: pre-wrap;">${pageAnnouncementData.allUsers.oldMessage}</span></p>`,
            priority: pageAnnouncementData.allUsers.priority
        });
        await page.goto('/');
        await waitForLoading(page);
        await verifyPageAnnouncement(page, pageAnnouncementData.allUsers.oldMessage);

        // Update the page announcement and verify it appears correctly
        await db
            .updateTable('static_lwp_page_announcement')
            .set({ message: pageAnnouncementData.allUsers.message })
            .where('id', '=', allUsersPageAnnouncement.id)
            .execute();
        await page.reload();
        await waitForLoading(page);
        await verifyPageAnnouncement(page, pageAnnouncementData.allUsers.message);
        await login(page, leaderEmail, password);
        await page.waitForURL(/\/school/);
        await waitForLoading(page);
        await openSideDrawer(page);
        await page.getByTestId('notification-badge').click();
        await expectPageAnnouncementState(page, pageAnnouncementData.allUsers.message, false);
        await page.getByTestId('all-announcements-drawer-close-button').click();
        await verifyPageAnnouncement(page, pageAnnouncementData.allUsers.message, true);
        await page.getByTestId('notification-badge').click();
        await expectPageAnnouncementState(page, pageAnnouncementData.allUsers.message, true);
        await page.getByTestId('all-announcements-drawer-close-button').click();
        await adminOrTeacherSignOut(page);
        await login(page, parentEmail, password);
        await waitForLoading(page);
        await page.getByTestId('notification-badge').first().click();
        await expectPageAnnouncementState(page, pageAnnouncementData.allUsers.message, false);
        await page.getByTestId('all-announcements-drawer-close-button').click();
        await verifyPageAnnouncement(page, pageAnnouncementData.allUsers.message, true);
        await page.getByTestId('notification-badge').first().click();
        await expectPageAnnouncementState(page, pageAnnouncementData.allUsers.message, true);
        await page.getByTestId('all-announcements-drawer-close-button').click();
        await parentSignOut(page);

        // Role targeting: create teacher-only, parent-only and school-leader-only announcements
        await utils.createPageAnnouncement({
            userOptions: JSON.stringify([PageAnnouncementUserOption.TEACHER]),
            status: PageAnnouncementStatus.ACTIVE,
            title: pageAnnouncementData.allTeachers.title,
            message: `<p class="editor-paragraph" dir="ltr"><span style="white-space: pre-wrap;">${pageAnnouncementData.allTeachers.message}</span></p>`,
            priority: pageAnnouncementData.allTeachers.priority
        });
        await utils.createPageAnnouncement({
            userOptions: JSON.stringify([PageAnnouncementUserOption.PARENT]),
            status: PageAnnouncementStatus.ACTIVE,
            title: pageAnnouncementData.allParents.title,
            message: `<p class="editor-paragraph" dir="ltr"><span style="white-space: pre-wrap;">${pageAnnouncementData.allParents.message}</span></p>`,
            priority: pageAnnouncementData.allParents.priority
        });
        await utils.createPageAnnouncement({
            userOptions: JSON.stringify([PageAnnouncementUserOption.SCHOOL_LEADER]),
            status: PageAnnouncementStatus.ACTIVE,
            title: pageAnnouncementData.allLeaders.title,
            message: `<p class="editor-paragraph" dir="ltr"><span style="white-space: pre-wrap;">${pageAnnouncementData.allLeaders.message}</span></p>`,
            priority: pageAnnouncementData.allLeaders.priority
        });

        // The parent should only see the parent-only announcement
        await login(page, parentEmail, password);
        await waitForLoading(page);
        await verifyPageAnnouncement(page, pageAnnouncementData.allParents.message, true);
        await parentSignOut(page);

        // The school leader should see the school-leader-only announcement as well as the teacher
        // announcement (the TEACHER option targets all teachers, including leaders).
        await login(page, leaderEmail, password);
        await page.waitForURL(/\/school/);
        await waitForLoading(page);
        await acceptFeatureTooltipPrompt(page);
        await openSideDrawer(page);
        await verifyPageAnnouncement(page, pageAnnouncementData.allTeachers.message, true);
        await verifyPageAnnouncement(page, pageAnnouncementData.allLeaders.message, true);
        await adminOrTeacherSignOut(page);

        // The regular teacher should see the teacher-only announcement but never the school-leader-only one
        await login(page, teacherEmail, password);
        await page.waitForURL(/\/feed/);
        await waitForLoading(page);
        await acceptFeatureTooltipPrompt(page);
        await verifyPageAnnouncement(page, pageAnnouncementData.allUsers.message, true);
        await verifyPageAnnouncement(page, pageAnnouncementData.allTeachers.message, true);
        await page.getByTestId('notification-badge').first().click();
        await expect(
            page.locator('[data-test="page-announcement-card-drawer-message"]', { hasText: pageAnnouncementData.allLeaders.message })
        ).toBeHidden();
        await page.getByTestId('all-announcements-drawer-close-button').click();
        await adminOrTeacherSignOut(page);

        // Create a school-tags-based page announcement for specific schools and their parents and teachers and verify visibility
        const schoolTag1 = await utils.createSchoolTag(
            {
                name: schoolTagName,
                color: '#F28D00'
            },
            school.id
        );
        const schoolTag2 = await utils.createSchoolTag(
            {
                name: schoolTag2Name,
                color: '#F28D00'
            },
            school2.id
        );
        await utils.createPageAnnouncement(
            {
                userOptions: JSON.stringify([PageAnnouncementUserOption.TEACHER]),
                status: PageAnnouncementStatus.ACTIVE,
                title: pageAnnouncementData.allSchool1Teachers.title,
                message: `<p class="editor-paragraph" dir="ltr"><span style="white-space: pre-wrap;">${pageAnnouncementData.allSchool1Teachers.message}</span></p>`,
                priority: pageAnnouncementData.allSchool1Teachers.priority
            },
            schoolTag1.id
        );
        await utils.createPageAnnouncement(
            {
                userOptions: JSON.stringify([PageAnnouncementUserOption.PARENT]),
                status: PageAnnouncementStatus.ACTIVE,
                title: pageAnnouncementData.allSchool1Parents.title,
                message: `<p class="editor-paragraph" dir="ltr"><span style="white-space: pre-wrap;">${pageAnnouncementData.allSchool1Parents.message}</span></p>`,
                priority: pageAnnouncementData.allSchool1Parents.priority
            },
            schoolTag1.id
        );
        await utils.createPageAnnouncement(
            {
                userOptions: JSON.stringify([PageAnnouncementUserOption.TEACHER]),
                status: PageAnnouncementStatus.ACTIVE,
                title: pageAnnouncementData.allSchool2Teachers.title,
                message: `<p class="editor-paragraph" dir="ltr"><span style="white-space: pre-wrap;">${pageAnnouncementData.allSchool2Teachers.message}</span></p>`,
                priority: pageAnnouncementData.allSchool2Teachers.priority
            },
            schoolTag2.id
        );
        await utils.createPageAnnouncement(
            {
                userOptions: JSON.stringify([PageAnnouncementUserOption.PARENT]),
                status: PageAnnouncementStatus.ACTIVE,
                title: pageAnnouncementData.allSchool2Parents.title,
                message: `<p class="editor-paragraph" dir="ltr"><span style="white-space: pre-wrap;">${pageAnnouncementData.allSchool2Parents.message}</span></p>`,
                priority: pageAnnouncementData.allSchool2Parents.priority
            },
            schoolTag2.id
        );
        await utils.createPageAnnouncement(
            {
                userOptions: JSON.stringify([PageAnnouncementUserOption.SCHOOL_LEADER]),
                status: PageAnnouncementStatus.ACTIVE,
                title: pageAnnouncementData.allSchool1Leaders.title,
                message: `<p class="editor-paragraph" dir="ltr"><span style="white-space: pre-wrap;">${pageAnnouncementData.allSchool1Leaders.message}</span></p>`,
                priority: pageAnnouncementData.allSchool1Leaders.priority
            },
            schoolTag1.id
        );
        await utils.createPageAnnouncement(
            {
                userOptions: JSON.stringify([PageAnnouncementUserOption.SCHOOL_LEADER]),
                status: PageAnnouncementStatus.ACTIVE,
                title: pageAnnouncementData.allSchool2Leaders.title,
                message: `<p class="editor-paragraph" dir="ltr"><span style="white-space: pre-wrap;">${pageAnnouncementData.allSchool2Leaders.message}</span></p>`,
                priority: pageAnnouncementData.allSchool2Leaders.priority
            },
            schoolTag2.id
        );
        await adminOrTeacherSignOut(page);

        // Comprehensive visibility matrix: for each user, confirm the announcements drawer contains every
        // announcement meant for them (role + school-tag combinations) and none of the announcements meant
        // for others. The banner checks above already exercise the unseen-announcement (banner) query path.
        const assertAnnouncementVisibility = async (visibleMessages: string[], hiddenMessages: string[]) => {
            for (const message of visibleMessages) {
                await expect(page.locator('[data-test="page-announcement-card-drawer-message"]', { hasText: message })).toBeVisible();
            }
            for (const message of hiddenMessages) {
                await expect(page.locator('[data-test="page-announcement-card-drawer-message"]', { hasText: message })).toBeHidden();
            }
        };
        const openAnnouncementsDrawer = async (onSchoolDashboard: boolean) => {
            if (onSchoolDashboard) await openSideDrawer(page);
            await page.getByTestId('notification-badge').first().click();
        };

        // School 1 leader: all-users, all-teachers, all-leaders, school-1 teachers, school-1 leaders
        await login(page, leaderEmail, password);
        await page.waitForURL(/\/school/);
        await waitForLoading(page);
        await acceptFeatureTooltipPrompt(page);
        await verifyPageAnnouncement(page, pageAnnouncementData.allSchool1Teachers.message, true);
        await verifyPageAnnouncement(page, pageAnnouncementData.allSchool1Leaders.message, true);
        await openAnnouncementsDrawer(true);
        await assertAnnouncementVisibility(
            [
                pageAnnouncementData.allUsers.message,
                pageAnnouncementData.allTeachers.message,
                pageAnnouncementData.allLeaders.message,
                pageAnnouncementData.allSchool1Teachers.message,
                pageAnnouncementData.allSchool1Leaders.message
            ],
            [
                pageAnnouncementData.allParents.message,
                pageAnnouncementData.allSchool1Parents.message,
                pageAnnouncementData.allSchool2Parents.message,
                pageAnnouncementData.allSchool2Teachers.message,
                pageAnnouncementData.allSchool2Leaders.message
            ]
        );
        await page.getByTestId('all-announcements-drawer-close-button').click();
        await adminOrTeacherSignOut(page);

        // School 1 teacher: all-users, all-teachers, school-1 teachers
        await login(page, teacherEmail, password);
        await page.waitForURL(/\/feed/);
        await waitForLoading(page);
        await acceptFeatureTooltipPrompt(page);
        await verifyPageAnnouncement(page, pageAnnouncementData.allSchool1Teachers.message, true);
        await openAnnouncementsDrawer(false);
        await assertAnnouncementVisibility(
            [pageAnnouncementData.allUsers.message, pageAnnouncementData.allTeachers.message, pageAnnouncementData.allSchool1Teachers.message],
            [
                pageAnnouncementData.allParents.message,
                pageAnnouncementData.allLeaders.message,
                pageAnnouncementData.allSchool1Parents.message,
                pageAnnouncementData.allSchool2Parents.message,
                pageAnnouncementData.allSchool2Teachers.message,
                pageAnnouncementData.allSchool1Leaders.message,
                pageAnnouncementData.allSchool2Leaders.message
            ]
        );
        await page.getByTestId('all-announcements-drawer-close-button').click();
        await adminOrTeacherSignOut(page);

        // School 1 parent: all-users, all-parents, school-1 parents
        await login(page, parentEmail, password);
        await waitForLoading(page);
        await verifyPageAnnouncement(page, pageAnnouncementData.allSchool1Parents.message, true);
        await openAnnouncementsDrawer(false);
        await assertAnnouncementVisibility(
            [pageAnnouncementData.allUsers.message, pageAnnouncementData.allParents.message, pageAnnouncementData.allSchool1Parents.message],
            [
                pageAnnouncementData.allTeachers.message,
                pageAnnouncementData.allLeaders.message,
                pageAnnouncementData.allSchool2Parents.message,
                pageAnnouncementData.allSchool1Teachers.message,
                pageAnnouncementData.allSchool2Teachers.message,
                pageAnnouncementData.allSchool1Leaders.message,
                pageAnnouncementData.allSchool2Leaders.message
            ]
        );
        await page.getByTestId('all-announcements-drawer-close-button').click();
        await parentSignOut(page);

        // School 2 leader: all-users, all-teachers, all-leaders, school-2 teachers, school-2 leaders
        await login(page, leader2Email, password);
        await page.waitForURL(/\/school/);
        await waitForLoading(page);
        await acceptFeatureTooltipPrompt(page);
        await verifyPageAnnouncement(page, pageAnnouncementData.allUsers.message, true);
        await verifyPageAnnouncement(page, pageAnnouncementData.allTeachers.message, true);
        await verifyPageAnnouncement(page, pageAnnouncementData.allSchool2Teachers.message, true);
        await verifyPageAnnouncement(page, pageAnnouncementData.allLeaders.message, true);
        await verifyPageAnnouncement(page, pageAnnouncementData.allSchool2Leaders.message, true);
        await openAnnouncementsDrawer(true);
        await assertAnnouncementVisibility(
            [
                pageAnnouncementData.allUsers.message,
                pageAnnouncementData.allTeachers.message,
                pageAnnouncementData.allLeaders.message,
                pageAnnouncementData.allSchool2Teachers.message,
                pageAnnouncementData.allSchool2Leaders.message
            ],
            [
                pageAnnouncementData.allParents.message,
                pageAnnouncementData.allSchool1Parents.message,
                pageAnnouncementData.allSchool2Parents.message,
                pageAnnouncementData.allSchool1Teachers.message,
                pageAnnouncementData.allSchool1Leaders.message
            ]
        );
        await page.getByTestId('all-announcements-drawer-close-button').click();
        await adminOrTeacherSignOut(page);

        // School 2 teacher: all-users, all-teachers, school-2 teachers
        await login(page, teacher2Email, password);
        await page.waitForURL(/\/feed/);
        await waitForLoading(page);
        await acceptFeatureTooltipPrompt(page);
        await verifyPageAnnouncement(page, pageAnnouncementData.allUsers.message, true);
        await verifyPageAnnouncement(page, pageAnnouncementData.allTeachers.message, true);
        await verifyPageAnnouncement(page, pageAnnouncementData.allSchool2Teachers.message, true);
        await openAnnouncementsDrawer(false);
        await assertAnnouncementVisibility(
            [pageAnnouncementData.allUsers.message, pageAnnouncementData.allTeachers.message, pageAnnouncementData.allSchool2Teachers.message],
            [
                pageAnnouncementData.allParents.message,
                pageAnnouncementData.allLeaders.message,
                pageAnnouncementData.allSchool1Parents.message,
                pageAnnouncementData.allSchool2Parents.message,
                pageAnnouncementData.allSchool1Teachers.message,
                pageAnnouncementData.allSchool1Leaders.message,
                pageAnnouncementData.allSchool2Leaders.message
            ]
        );
        await page.getByTestId('all-announcements-drawer-close-button').click();
        await adminOrTeacherSignOut(page);

        // School 2 parent: all-users, all-parents, school-2 parents
        await login(page, parent2Email, password);
        await waitForLoading(page);
        await verifyPageAnnouncement(page, pageAnnouncementData.allUsers.message, true);
        await verifyPageAnnouncement(page, pageAnnouncementData.allParents.message, true);
        await verifyPageAnnouncement(page, pageAnnouncementData.allSchool2Parents.message, true);
        await openAnnouncementsDrawer(false);
        await assertAnnouncementVisibility(
            [pageAnnouncementData.allUsers.message, pageAnnouncementData.allParents.message, pageAnnouncementData.allSchool2Parents.message],
            [
                pageAnnouncementData.allTeachers.message,
                pageAnnouncementData.allLeaders.message,
                pageAnnouncementData.allSchool1Parents.message,
                pageAnnouncementData.allSchool1Teachers.message,
                pageAnnouncementData.allSchool2Teachers.message,
                pageAnnouncementData.allSchool1Leaders.message,
                pageAnnouncementData.allSchool2Leaders.message
            ]
        );
        await page.getByTestId('all-announcements-drawer-close-button').click();
        await parentSignOut(page);
    });

    test('Page-specific announcement shows only on its page', async ({ page }) => {
        // The banner shows one announcement at a time, so start without the ones the test above left unseen
        await dataCleanUp(db);

        const leaderFirstName = generateFirstName();
        const leaderLastName = generateLastName();
        const leaderEmail = generateUserEmail(leaderFirstName, leaderLastName);
        const everyPageMessage = `Every page: ${generateSentence(4)}`;
        const feedOnlyMessage = `Feed only: ${generateSentence(4)}`;

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
        const leader = await utils.createUser({
            firstname: leaderFirstName,
            lastname: leaderLastName,
            email: leaderEmail,
            type: UserType.TEACHER,
            userStatus: UserStatus.ACTIVE,
            isSchoolLeader: true,
            schoolId: school.id,
            password: user.password,
            nameForChildren: `Mr ${leaderFirstName}`
        });
        await utils.createClass(school.id, {
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
        await utils.addUserTooltipHistory(leader.id, 'topic-library-tooltip');
        await utils.addUserTooltipHistory(leader.id, 'school-reading-log-tooltip');

        // The feed-only announcement has the higher priority, so it would be the banner everywhere if pages were ignored
        await utils.createPageAnnouncement({
            userOptions: JSON.stringify([PageAnnouncementUserOption.SCHOOL_LEADER]),
            targetPages: JSON.stringify(['/school/[school_id]/feed']),
            status: PageAnnouncementStatus.ACTIVE,
            title: feedOnlyMessage,
            message: feedOnlyMessage,
            priority: 1
        });
        await utils.createPageAnnouncement({
            userOptions: JSON.stringify([PageAnnouncementUserOption.TEACHER]),
            status: PageAnnouncementStatus.ACTIVE,
            title: everyPageMessage,
            message: everyPageMessage,
            priority: 2
        });

        const banner = page.getByTestId('page-announcement-card-message');
        const bell = page.getByTestId('notification-badge').first();

        // On the school overview: the untargeted announcement is the banner (so the list has loaded), and the bell counts only it
        await login(page, leaderEmail, password);
        await page.waitForURL(/\/school/);
        await page.goto(`/school/${school.id}`);
        await waitForLoading(page);
        await acceptFeatureTooltipPrompt(page);
        await openSideDrawer(page);
        await expect(banner.getByText(everyPageMessage)).toBeVisible();
        await expect(banner.getByText(feedOnlyMessage)).toBeHidden();
        await expect(bell).toHaveText('1');

        // On the feed: the feed-only announcement is the banner and the bell counts both; clearing it leaves the untargeted one
        await page.goto(`/school/${school.id}/feed`);
        await waitForLoading(page);
        await expect(bell).toHaveText('2');
        await verifyPageAnnouncement(page, feedOnlyMessage, true);
        await expect(banner.getByText(everyPageMessage)).toBeVisible();
        await expect(bell).toHaveText('1');

        // Back on the overview, the untargeted one is still there, and clearing it clears the bell
        await page.goto(`/school/${school.id}`);
        await waitForLoading(page);
        await verifyPageAnnouncement(page, everyPageMessage, true);
        await expect(banner).toBeHidden();
        await expect(bell).toHaveText('');

        await adminOrTeacherSignOut(page);
    });

    test('An announcement never reaches the drawer of someone who could never see it', async ({ page }) => {
        await dataCleanUp(db);

        const emails = {
            leader: generateUserEmail(generateFirstName(), generateLastName()),
            teacher: generateUserEmail(generateFirstName(), generateLastName()),
            parent: generateUserEmail(generateFirstName(), generateLastName())
        };
        const messages = {
            // Parent and Teacher chosen, but only a teacher page: teachers only
            parentAndTeacherOnTeacherFeed: `Parents and teachers, teacher feed: ${generateSentence(4)}`,
            // Teachers on the teacher feed: school leaders are always redirected from it
            teachersOnTeacherFeed: `Teachers, teacher feed: ${generateSentence(4)}`,
            // Everyone on the school feed: school leaders only, never parents or the login screen
            everyoneOnSchoolFeed: `Everyone, school feed: ${generateSentence(4)}`,
            // Everyone, every page: in every drawer, which proves each drawer has loaded
            everyoneEverywhere: `Everyone, every page: ${generateSentence(4)}`
        };

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
        const leader = await createStaff(emails.leader, true);
        const teacher = await createStaff(emails.teacher, false);
        const parent = await utils.createUser({
            firstname: generateFirstName(),
            lastname: generateLastName(),
            email: emails.parent,
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

        const createAnnouncement = (message: string, userOptions: PageAnnouncementUserOption[], targetPages: string[], priority: number) =>
            utils.createPageAnnouncement({
                userOptions: JSON.stringify(userOptions),
                targetPages: JSON.stringify(targetPages),
                status: PageAnnouncementStatus.ACTIVE,
                title: message,
                message,
                priority
            });
        const { ALL_USERS, PARENT, TEACHER } = PageAnnouncementUserOption;

        await createAnnouncement(messages.parentAndTeacherOnTeacherFeed, [PARENT, TEACHER], ['/feed/[user_id]'], 1);
        await createAnnouncement(messages.teachersOnTeacherFeed, [TEACHER], ['/feed/[user_id]'], 2);
        await createAnnouncement(messages.everyoneOnSchoolFeed, [ALL_USERS], ['/school/[school_id]/feed'], 3);
        await createAnnouncement(messages.everyoneEverywhere, [ALL_USERS], [], 4);

        /** Opens the drawer and checks exactly which of the test's announcements are in it. */
        const expectDrawerToList = async (expected: string[]) => {
            await page.getByTestId('notification-badge').first().click();
            const items = page.locator('[data-test="page-announcement-card-drawer-message"]');

            await expect(items.filter({ hasText: messages.everyoneEverywhere })).toBeVisible();
            for (const message of Object.values(messages)) {
                await expect(
                    items.filter({ hasText: message }),
                    `drawer ${expected.includes(message) ? 'lists' : 'leaves out'} "${message}"`
                ).toHaveCount(expected.includes(message) ? 1 : 0);
            }
            await page.getByTestId('all-announcements-drawer-close-button').click();
        };

        // Logged out, on the login screen
        await page.goto(`/school/${school.id}/feed`);
        await waitForLoading(page);
        await expectDrawerToList([messages.everyoneEverywhere]);

        // Parent
        await login(page, emails.parent, password);
        await page.goto('/settings');
        await waitForLoading(page);
        await expectDrawerToList([messages.everyoneEverywhere]);
        await parentSignOut(page);

        // Teacher
        await login(page, emails.teacher, password);
        await page.waitForURL(/\/feed/);
        await acceptFeatureTooltipPrompt(page);
        await expectDrawerToList([messages.parentAndTeacherOnTeacherFeed, messages.teachersOnTeacherFeed, messages.everyoneEverywhere]);
        await adminOrTeacherSignOut(page);

        // School leader
        await login(page, emails.leader, password);
        await page.waitForURL(/\/school/);
        await acceptFeatureTooltipPrompt(page);
        await openSideDrawer(page);
        await expectDrawerToList([messages.everyoneOnSchoolFeed, messages.everyoneEverywhere]);
        await adminOrTeacherSignOut(page);
    });

    test('School tags and pages both narrow an announcement: only the tagged school, only on its page', async ({ page }) => {
        await dataCleanUp(db);

        const user = await db.selectFrom('lwp_user').where('id', '=', '1').select(['id', 'password']).executeTakeFirstOrThrow();
        const currentPeriod = await db
            .selectFrom('static_lwp_period')
            .where('isCurrentPeriod', '=', true)
            .select('index')
            .executeTakeFirstOrThrow();

        /** A school with a leader and a class, optionally tagged. */
        const createSchoolWithLeader = async (tagName?: string) => {
            const school = await utils.createSchool({
                schoolName: `${generateSchoolName()} School`,
                curentPeriodIndex: currentPeriod.index,
                numOfFullProgrammeClassesAllowed: 10,
                numOfTotalClassesAllowed: 30,
                enableAddClasses: true,
                logCreatedById: user.id,
                logUpdatedById: user.id
            });
            const email = generateUserEmail(generateFirstName(), generateLastName());
            const leader = await utils.createUser({
                firstname: generateFirstName(),
                lastname: generateLastName(),
                email,
                type: UserType.TEACHER,
                userStatus: UserStatus.ACTIVE,
                isSchoolLeader: true,
                schoolId: school.id,
                password: user.password,
                nameForChildren: `Mr ${generateLastName()}`
            });
            await utils.createClass(school.id, {
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
            await utils.addUserTooltipHistory(leader.id, 'topic-library-tooltip');
            await utils.addUserTooltipHistory(leader.id, 'school-reading-log-tooltip');
            const tag = tagName ? await utils.createSchoolTag({ name: tagName, color: '#F28D00' }, school.id) : null;

            return { schoolId: school.id, email, tagId: tag?.id };
        };

        const tagged = await createSchoolWithLeader(`Tagged ${generateSchoolName()}`);
        const otherTag = await createSchoolWithLeader(`Other ${generateSchoolName()}`);
        const untagged = await createSchoolWithLeader();

        const messages = {
            taggedFeedOnly: `Tagged school leaders, school feed: ${generateSentence(4)}`,
            taggedEveryPage: `Tagged school leaders, every page: ${generateSentence(4)}`,
            everyLeader: `Every school leader, every page: ${generateSentence(4)}`
        };
        const leaderAnnouncement = (message: string, priority: number, targetPages: string[], schoolTagId?: string) =>
            utils.createPageAnnouncement(
                {
                    userOptions: JSON.stringify([PageAnnouncementUserOption.SCHOOL_LEADER]),
                    targetPages: JSON.stringify(targetPages),
                    status: PageAnnouncementStatus.ACTIVE,
                    title: message,
                    message,
                    priority
                },
                schoolTagId
            );

        await leaderAnnouncement(messages.taggedFeedOnly, 1, ['/school/[school_id]/feed'], tagged.tagId);
        // Tags without pages work as they always have
        await leaderAnnouncement(messages.taggedEveryPage, 2, [], tagged.tagId);
        // Shown to every leader on every page, so its banner proves the list has loaded
        await leaderAnnouncement(messages.everyLeader, 3, []);

        const banner = page.getByTestId('page-announcement-card-message');
        const bell = page.getByTestId('notification-badge').first();
        const expectDrawerToList = async (expected: string[]) => {
            await bell.click();
            const items = page.locator('[data-test="page-announcement-card-drawer-message"]');

            await expect(items.filter({ hasText: messages.everyLeader })).toBeVisible();
            for (const message of Object.values(messages)) {
                await expect(
                    items.filter({ hasText: message }),
                    `drawer ${expected.includes(message) ? 'lists' : 'leaves out'} "${message}"`
                ).toHaveCount(expected.includes(message) ? 1 : 0);
            }
            await page.getByTestId('all-announcements-drawer-close-button').click();
        };
        const loginAsLeader = async (email: string) => {
            await login(page, email, password);
            await page.waitForURL(/\/school/);
            await acceptFeatureTooltipPrompt(page);
        };

        // The tagged school's leader: the feed-only one on the feed, the tagged one everywhere
        await loginAsLeader(tagged.email);
        await page.goto(`/school/${tagged.schoolId}/feed`);
        await waitForLoading(page);
        await openSideDrawer(page);
        await expect(banner.getByText(messages.taggedFeedOnly)).toBeVisible();
        await expect(bell).toHaveText('3');
        await page.goto(`/school/${tagged.schoolId}`);
        await waitForLoading(page);
        await expect(banner.getByText(messages.taggedEveryPage)).toBeVisible();
        await expect(banner.getByText(messages.taggedFeedOnly)).toBeHidden();
        await expect(bell).toHaveText('2');
        await expectDrawerToList(Object.values(messages));
        await adminOrTeacherSignOut(page);

        // A school with a different tag, and a school with no tags: neither tagged announcement, even on the feed
        for (const other of [otherTag, untagged]) {
            await loginAsLeader(other.email);
            await page.goto(`/school/${other.schoolId}/feed`);
            await waitForLoading(page);
            await openSideDrawer(page);
            await expect(banner.getByText(messages.everyLeader)).toBeVisible();
            await expect(banner.getByText(messages.taggedFeedOnly)).toBeHidden();
            await expect(bell).toHaveText('1');
            await expectDrawerToList([messages.everyLeader]);
            await adminOrTeacherSignOut(page);
        }
    });

    test('Page-specific announcements follow the same page rules for every user type, logged in or out', async ({ page }) => {
        await dataCleanUp(db);

        const leaderFirstName = generateFirstName();
        const leaderLastName = generateLastName();
        const leaderEmail = generateUserEmail(leaderFirstName, leaderLastName);
        const teacherFirstName = generateFirstName();
        const teacherLastName = generateLastName();
        const teacherEmail = generateUserEmail(teacherFirstName, teacherLastName);
        const parentFirstName = generateFirstName();
        const parentLastName = generateLastName();
        const parentEmail = generateUserEmail(parentFirstName, parentLastName);
        const messages = {
            loginScreen: `Login screen only: ${generateSentence(4)}`,
            schoolFeedForEveryone: `School feed for everyone: ${generateSentence(4)}`,
            childHistory: `Child history only: ${generateSentence(4)}`,
            schoolOverview: `School overview only: ${generateSentence(4)}`,
            teacherFeed: `Teacher feed only: ${generateSentence(4)}`,
            everyPage: `Every page for everyone: ${generateSentence(4)}`
        };

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
        const leader = await utils.createUser({
            firstname: leaderFirstName,
            lastname: leaderLastName,
            email: leaderEmail,
            type: UserType.TEACHER,
            userStatus: UserStatus.ACTIVE,
            isSchoolLeader: true,
            schoolId: school.id,
            password: user.password,
            nameForChildren: `Mr ${leaderFirstName}`
        });
        const teacher = await utils.createUser({
            firstname: teacherFirstName,
            lastname: teacherLastName,
            email: teacherEmail,
            type: UserType.TEACHER,
            userStatus: UserStatus.ACTIVE,
            isSchoolLeader: false,
            schoolId: school.id,
            password: user.password,
            nameForChildren: `Mr ${teacherFirstName}`
        });
        const parent = await utils.createUser({
            firstname: parentFirstName,
            lastname: parentLastName,
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
        for (const staffId of [leader.id, teacher.id]) {
            await utils.addUserTooltipHistory(staffId, 'topic-library-tooltip');
            await utils.addUserTooltipHistory(staffId, 'school-reading-log-tooltip');
        }

        const createTargetedAnnouncement = (message: string, userOption: PageAnnouncementUserOption, route: string, priority: number) =>
            utils.createPageAnnouncement({
                userOptions: JSON.stringify([userOption]),
                targetPages: JSON.stringify([route]),
                status: PageAnnouncementStatus.ACTIVE,
                title: message,
                message,
                priority
            });

        // The feed announcement outranks the login-screen one, so it would be the login screen's banner if pages were ignored there
        await createTargetedAnnouncement(
            messages.schoolFeedForEveryone,
            PageAnnouncementUserOption.ALL_USERS,
            '/school/[school_id]/feed',
            1
        );
        await createTargetedAnnouncement(messages.loginScreen, PageAnnouncementUserOption.ALL_USERS, '/__login', 2);
        await createTargetedAnnouncement(messages.childHistory, PageAnnouncementUserOption.PARENT, '/child/[child_id]/history', 3);
        await createTargetedAnnouncement(messages.schoolOverview, PageAnnouncementUserOption.SCHOOL_LEADER, '/school/[school_id]', 4);
        await createTargetedAnnouncement(messages.teacherFeed, PageAnnouncementUserOption.TEACHER, '/feed/[user_id]', 5);
        // Shown everywhere to everyone, last: where a targeted one must not show, this banner proves the list has loaded
        await utils.createPageAnnouncement({
            userOptions: JSON.stringify([PageAnnouncementUserOption.ALL_USERS]),
            status: PageAnnouncementStatus.ACTIVE,
            title: messages.everyPage,
            message: messages.everyPage,
            priority: 99
        });

        const banner = page.getByTestId('page-announcement-card-message');
        const bell = page.getByTestId('notification-badge').first();

        // Logged out: the login screen in front of the school feed shows the login-screen announcement, not the feed one
        await page.goto(`/school/${school.id}/feed`);
        await waitForLoading(page);
        await expect(banner.getByText(messages.loginScreen)).toBeVisible();
        await expect(banner.getByText(messages.schoolFeedForEveryone)).toBeHidden();
        await expect(bell).toHaveText('2');

        // Parent: the child-history announcement only counts and shows on the child's history page
        await login(page, parentEmail, password);
        await waitForLoading(page);
        await page.goto('/settings');
        await waitForLoading(page);
        await expect(banner.getByText(messages.everyPage)).toBeVisible();
        await expect(bell).toHaveText('1');
        await page.goto(`/child/${pupil.id}/history`);
        await waitForLoading(page);
        await expect(bell).toHaveText('2');
        await verifyPageAnnouncement(page, messages.childHistory, true);
        await expect(banner.getByText(messages.everyPage)).toBeVisible();
        await expect(bell).toHaveText('1');
        await parentSignOut(page);

        // School leader: the overview announcement shows on the school overview and not on a class page
        await login(page, leaderEmail, password);
        await page.waitForURL(/\/school/);
        await page.goto(`/class/${schoolClass.id}/pupils`);
        await waitForLoading(page);
        await acceptFeatureTooltipPrompt(page);
        await expect(banner.getByText(messages.everyPage)).toBeVisible();
        await expect(banner.getByText(messages.schoolOverview)).toBeHidden();
        await expect(bell).toHaveText('1');
        await page.goto(`/school/${school.id}`);
        await waitForLoading(page);
        await openSideDrawer(page);
        await expect(bell).toHaveText('2');
        await verifyPageAnnouncement(page, messages.schoolOverview, true);
        await adminOrTeacherSignOut(page);

        // Teacher: the feed announcement shows on the teacher feed, and the drawer lists it, without naming pages, from anywhere
        await login(page, teacherEmail, password);
        await page.waitForURL(/\/feed/);
        await page.goto(`/feed/${teacher.id}`);
        await waitForLoading(page);
        await acceptFeatureTooltipPrompt(page);
        await expect(banner.getByText(messages.teacherFeed)).toBeVisible();
        await expect(bell).toHaveText('2');
        await page.goto(`/class/${schoolClass.id}/pupils`);
        await waitForLoading(page);
        await expect(banner.getByText(messages.everyPage)).toBeVisible();
        await expect(banner.getByText(messages.teacherFeed)).toBeHidden();
        await expect(bell).toHaveText('1');
        await bell.click();
        const drawerItems = page.getByTestId('announcement-drawer-item');
        await expect(drawerItems.filter({ hasText: messages.teacherFeed })).toBeVisible();
        await expect(drawerItems.getByTestId('announcement-drawer-target-pages')).toHaveCount(0);
        // Logged-in users never see the login screen, so an announcement aimed only at it is not in their drawer
        await expect(drawerItems.filter({ hasText: messages.everyPage })).toBeVisible();
        await expect(drawerItems.filter({ hasText: messages.loginScreen })).toHaveCount(0);
        await page.getByTestId('all-announcements-drawer-close-button').click();
        await adminOrTeacherSignOut(page);
    });
});

const dataCleanUp = async (db: Kysely<Schema.DB>): Promise<void> => {
    await db.deleteFrom('lwp_page_announcement_school_tags').execute();
    await db.deleteFrom('lwp_user_page_announcement').execute();
    await db.deleteFrom('static_lwp_page_announcement').execute();
};
