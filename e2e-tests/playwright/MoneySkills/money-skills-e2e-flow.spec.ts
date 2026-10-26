import { test, expect } from '@playwright/test';
import type { Schema } from '@lwp/postgres-client';
import { type Kysely, sql } from 'kysely';
import { createDb } from '../db';
import { createUtils } from '../dbUtils';
import {
    admin,
    password,
    generateSchoolName,
    generateFirstName,
    generateLastName,
    generateUserEmail,
    generateClassName,
    generateTopicName,
    teacherSupportEmail,
    moneySkillsDomainId,
    schoolLeader,
    moneySkillsSubjectName,
    generateUPN
} from '../constants';
import {
    acceptFeatureTooltipPrompt,
    adminOrTeacherSignOut,
    formatDate,
    getInputBoxByName,
    login,
    openSideDrawer,
    safeClick,
    schoolSettingsPage,
    waitForLoading
} from '../utils';
import { UserStatus, UserType } from 'lwp-shared';

test.describe('End-to-End Workflow for Money Skills', () => {
    let db: Kysely<Schema.DB>;
    let utils: ReturnType<typeof createUtils>;

    test.beforeAll(async () => {
        db = createDb();
        utils = createUtils(db);
    });

    test.afterAll(async () => {
        await db.destroy();
    });

    test('Money Skills', async ({ page }) => {
        const mySchoolName: string = `${generateSchoolName()} School`;
        const leaderFirstName: string = generateFirstName();
        const leaderlastName: string = generateLastName();
        const leaderFullName: string = `${leaderFirstName} ${leaderlastName}`;
        const teacherFirstname: string = generateFirstName();
        const teacherLastname: string = generateLastName();
        const teacherFullName: string = `${teacherFirstname} ${teacherLastname}`;
        const teacherEmail: string = generateUserEmail(teacherFirstname, teacherLastname);
        const schoolLeaderEmail: string = generateUserEmail(leaderFirstName, leaderlastName);
        const parentFirstname: string = generateFirstName();
        const parentLastname: string = generateLastName();
        const parentEmail: string = generateUserEmail(parentFirstname, parentLastname);
        const pupil1FirstName: string = generateFirstName();
        const pupil1LastName: string = generateLastName();
        const pupil2FirstName: string = generateFirstName();
        const pupil2LastName: string = generateLastName();
        const myClassName: string = generateClassName();
        const moneySkillsTopicName: string = generateTopicName();
        const readingAndMoneySkillsClassName: string = generateClassName();
        const preAdmissionClass: string = generateClassName();
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
            isMoneySkillsAvailable: false,
            isReadyTeddyAvailable: true,
            logCreatedById: user.id,
            logUpdatedById: user.id
        });
        const leader = await utils.createUser({
            firstname: leaderFirstName,
            lastname: leaderlastName,
            email: schoolLeaderEmail,
            type: UserType.TEACHER,
            userStatus: UserStatus.ACTIVE,
            isSchoolLeader: true,
            schoolId: school.id,
            password: user.password,
            nameForChildren: `Mr ${leaderFirstName}`
        });
        await utils.addUserTooltipHistory(leader.id, 'topic-library-tooltip');
        await utils.addUserTooltipHistory(leader.id, 'school-reading-log-tooltip');

        const schoolClass = await utils.createClass(school.id, {
            name: myClassName,
            isRegistrationClass: true,
            isFullProgramme: true,
            mainTeacherId: leader.id,
            yearGroup: 1,
            periodIndex: currentPeriod.index,
            IsReadingLogsEnabled: true,
            readingStartDay: today.getDay(),
            readingTarget: 5,
            readingLaunchDate: todayDate,
            logCreatedById: user.id,
            logUpdatedById: user.id
        });
        const teacher = await utils.createUser({
            firstname: teacherFirstname,
            lastname: teacherLastname,
            email: teacherEmail,
            type: UserType.TEACHER,
            userStatus: UserStatus.ACTIVE,
            isSchoolLeader: false,
            schoolId: school.id,
            password: user.password,
            nameForChildren: `Mr ${teacherFirstname}`
        });
        await db.insertInto('lwp_class_teacher').values({ lwpUserId: teacher.id, lwpSchoolClassId: schoolClass.id }).execute();

        // Add Money Skills topic
        const staticTopic = await utils.createStaticTopic({
            isReading: false,
            teacherTopicName: moneySkillsTopicName,
            parentTopicName: moneySkillsTopicName,
            isPublished: true,
            video: '605069004',
            logCreatedById: user.id,
            logUpdatedById: user.id
        });
        await db
            .insertInto('static_lwp_topic_domain_year_group')
            .values({
                domainId: moneySkillsDomainId,
                topicId: staticTopic.id,
                yearGroupId: '1'
            })
            .executeTakeFirstOrThrow();
        const staticActivity1 = await utils.createStaticActivity({
            name: `${moneySkillsTopicName} one`,
            activityType: 'LEGACY',
            order: 1,
            topicId: staticTopic.id,
            logCreatedById: user.id,
            logUpdatedById: user.id
        });

        // Verify Money Skills is unchecked and disabled for teacher when not enabled at school level
        await login(page, teacherEmail, password);
        await acceptFeatureTooltipPrompt(page);
        await openSideDrawer(page);
        await page.getByRole('listitem').filter({ hasText: myClassName }).click();
        await page.waitForURL(/\/class/);
        await waitForLoading(page);
        await page.getByRole('button', { name: 'Class settings' }).click();
        await page.waitForURL(/\/class-details/);
        await waitForLoading(page);
        await expect(getInputBoxByName(page, 'isMoneySkillsAvailable')).not.toBeChecked();
        await page.getByTestId('money-skills-tooltip-icon').click();
        await waitForLoading(page);
        await expect(
            page.getByText('The Money Skills programme can be activated for the whole school by a school leader at no additional cost.')
        ).toBeVisible();
        await expect(page.getByTestId('activate-money-skills-link')).toBeHidden();
        await adminOrTeacherSignOut(page);

        // Enable Money Skills in school from purchase class licence modal and verify Money Skills is enable
        await login(page, schoolLeaderEmail, password);
        await page.waitForURL(/\/school/);
        await waitForLoading(page);
        await page.getByText('Purchase additional class licences').click();
        await waitForLoading(page);
        await expect(
            page.getByText(
                'The Money Skills programme can be activated for all classes using the digital reading log or Maths and English at no extra cost'
            )
        ).toBeVisible();
        await page.getByRole('button', { name: 'Activate Money Skills' }).click();
        await waitForLoading(page);
        await expect(page.locator('.MuiAlert-message').filter({ hasText: 'Money Skills programme activated' })).toBeVisible();
        await expect(page.getByText('The Money Skills programme is available in all classes at no extra cost.')).toBeVisible();
        await page.getByRole('button', { name: 'Cancel' }).click();
        await waitForLoading(page);
        const notification = await db
            .selectFrom('lwp_notification')
            .select(['params'])
            .where(sql`params ->> 'EMAIL'`, '=', schoolLeaderEmail)
            .executeTakeFirstOrThrow();
        const emailParams = JSON.parse(JSON.stringify(notification.params));
        expect(emailParams).toMatchObject({
            SCHOOLNAME: mySchoolName,
            EMAIL: schoolLeaderEmail,
            TEACHERALIAS: `Mr ${leaderFirstName}`,
            FIRSTNAME: leaderFirstName,
            LASTNAME: leaderlastName
        });

        // // Enable Money Skills from class settings page and verify Money Skills is enable
        await db.updateTable('lwp_school').set({ isMoneySkillsAvailable: false }).where('id', '=', school.id).execute();
        await page.getByTestId('school-overview-tab').click();
        await page.waitForURL(/\/school/);
        await waitForLoading(page);
        await page.getByRole('link', { name: myClassName }).click();
        await page.waitForURL(/\/class/);
        await waitForLoading(page);
        await page.mouse.move(0, 0);
        await page.getByRole('button', { name: 'Class settings' }).click();
        await page.waitForURL(/\/class-details/);
        await waitForLoading(page);
        await expect(getInputBoxByName(page, 'isMoneySkillsAvailable')).not.toBeChecked();
        await expect(page.getByTestId('money-skills-tooltip-icon')).toBeHidden();
        await page.getByTestId('activate-money-skills-link').click();
        await waitForLoading(page);
        await expect(page.getByRole('heading', { name: 'Money Skills programme' })).toBeVisible();
        await page.getByRole('button', { name: 'Activate for the whole school' }).click();
        await waitForLoading(page);
        await expect(
            page.locator('.MuiAlert-message').filter({ hasText: 'Money Skills programme activated for the whole school' })
        ).toBeVisible();
        await expect(getInputBoxByName(page, 'isMoneySkillsAvailable')).toBeChecked();

        // Enable Money Skills in school from class creation page and verify Money Skills is enable
        await db.updateTable('lwp_school').set({ isMoneySkillsAvailable: false }).where('id', '=', school.id).execute();
        await page.getByTestId('school-overview-tab').click();
        await page.waitForURL(/\/school/);
        await waitForLoading(page);
        await page.getByRole('listitem', { name: 'Add a class' }).click();
        await page.waitForURL(/\/add-class/);
        await waitForLoading(page);
        await getInputBoxByName(page, 'isReadingLogsEnabled').check();
        await expect(getInputBoxByName(page, 'isMoneySkillsAvailable')).not.toBeChecked();
        await page.getByTestId('activate-money-skills-link').click();
        await waitForLoading(page);
        await expect(page.getByRole('heading', { name: 'Money Skills programme' })).toBeVisible();
        await page.getByRole('button', { name: 'Activate for the whole school' }).click();
        await waitForLoading(page);
        await expect(
            page.locator('.MuiAlert-message').filter({ hasText: 'Money Skills programme activated for the whole school' })
        ).toBeVisible();
        await expect(getInputBoxByName(page, 'isMoneySkillsAvailable')).toBeChecked();
        const readingAndMoneySkillsClass = await utils.createClass(school.id, {
            name: readingAndMoneySkillsClassName,
            isRegistrationClass: true,
            isFullProgramme: false,
            mainTeacherId: leader.id,
            yearGroup: 1,
            periodIndex: currentPeriod.index,
            IsReadingLogsEnabled: true,
            readingStartDay: today.getDay(),
            readingTarget: 5,
            readingLaunchDate: todayDate,
            logCreatedById: user.id,
            logUpdatedById: user.id
        });
        await page.getByTestId('school-overview-tab').click();
        await page.waitForURL(/\/school/);
        await waitForLoading(page);
        await page.getByRole('link', { name: readingAndMoneySkillsClassName }).click();
        await waitForLoading(page);
        await page.locator('body').click({ position: { x: 0, y: 0 } });
        await page.getByRole('button', { name: 'Class settings' }).click();
        await page.waitForURL(/\/class-details/);
        await waitForLoading(page);
        await expect(getInputBoxByName(page, 'isMoneySkillsAvailable')).toBeChecked();
        await adminOrTeacherSignOut(page);

        // Verify Money Skills checkbox is hidden for pre-admission classes in creation and settings
        await login(page, admin, password);
        await page.waitForURL(/\/admin/);
        await waitForLoading(page);
        await openSideDrawer(page);
        await page.getByRole('link', { name: 'Schools' }).click();
        await waitForLoading(page);
        await safeClick(page.locator('[data-testid="school-details-link"]', { hasText: mySchoolName }));
        await waitForLoading(page);
        await page.getByTestId('classes-school-overview-tab').click();
        await waitForLoading(page);
        await page.getByTestId('create-class-button').click();
        await waitForLoading(page);
        await getInputBoxByName(page, 'name').fill(preAdmissionClass);
        await page.getByTestId('add-class-year-group-select').click();
        await page.getByRole('option', { name: 'Reception' }).click();
        await page.getByTestId('add-class-academic-year-select').click();
        await page.getByRole('option').last().click();
        await page.getByTestId('add-class-main-teacher-select').click();
        await page.getByRole('option', { name: leaderFullName }).click();
        await expect(getInputBoxByName(page, 'isMoneySkillsAvailable')).toBeHidden();
        await page.getByRole('button', { name: 'Create class' }).click();
        await waitForLoading(page);
        await expect(page.getByText(mySchoolName).first()).toBeVisible();
        await adminOrTeacherSignOut(page);
        await login(page, schoolLeaderEmail, password);
        await page.waitForURL(/\/school/);
        await waitForLoading(page);
        await page.getByRole('link', { name: preAdmissionClass }).click();
        await page.waitForURL(/\/class/);
        await waitForLoading(page);
        await page.getByRole('button', { name: 'Class settings' }).click();
        await page.waitForURL(/\/class-details/);
        await waitForLoading(page);
        await expect(getInputBoxByName(page, 'isMoneySkillsAvailable')).toBeHidden();

        // Verify Money Skills topics are hidden when not enabled at the school level
        await db.updateTable('lwp_school').set({ isMoneySkillsAvailable: false }).where('id', '=', school.id).execute();
        await page.getByTestId('school-overview-tab').click();
        await page.waitForURL(/\/school/);
        await waitForLoading(page);
        await openSideDrawer(page);
        await page.getByTestId('sidebar-set-a-topic-btn').click();
        await page.waitForURL(/\/school\/\d+\/topic-library/);
        await waitForLoading(page);
        await page.getByTestId('topic-library-year-group-select').click();
        await page.getByRole('option', { name: 'All' }).click();
        await page.getByTestId('topic-library-subjects-select').click();

        // Money Skills subject should not be visible when not enabled at school level
        await expect(page.getByText(moneySkillsSubjectName)).toBeHidden();
        await page.getByTestId('school-overview-tab').click();
        await page.waitForURL(/\/school/);
        await waitForLoading(page);
        await page.getByRole('link', { name: myClassName }).click();
        await page.waitForURL(/\/class/);
        await waitForLoading(page);
        await page.getByTestId('common-nav-schedule-tab').click();
        await waitForLoading(page);
        await page.getByTestId('class-schedule-year-group-multi-select').click();
        await page.getByRole('option', { name: 'All' }).click();
        await page.getByTestId('class-schedule-subject-multi-select').click();

        // Money Skills subject should not be visible in class schedule when not enabled at school level
        await expect(page.getByRole('option', { name: moneySkillsSubjectName })).toBeHidden();

        // Enable Money Skills in school from School settings page and verify Money Skills is enable
        await db.updateTable('lwp_school').set({ isMoneySkillsAvailable: false }).where('id', '=', school.id).execute();
        await page.getByTestId('school-overview-tab').click();
        await page.waitForURL(/\/school/);
        await waitForLoading(page);
        await schoolSettingsPage(page, 'school-settings-configuration');
        await expect(
            page.getByText(
                'Activate our Money Skills programme to set topics in any class with the Reading Log or Maths and English programme enabled.'
            )
        ).toBeVisible();
        await page.getByRole('button', { name: 'Activate Money Skills' }).click();
        await waitForLoading(page);
        await expect(page.locator('.MuiAlert-message').filter({ hasText: 'Money Skills programme activated' })).toBeVisible();
        await expect(
            page.getByText('Money Skills topics are available in all classes with the Reading Log or Maths and English programme enabled')
        ).toBeVisible();
        await expect(page.getByRole('button', { name: 'Activate Money Skills' })).toBeHidden();

        // Verify Money Skills topics appear only in full programme or reading classes and are hidden in pre-admission classes when enabled at school level
        await page.getByTestId('school-overview-tab').click();
        await page.waitForURL(/\/school/);
        await waitForLoading(page);
        await page.getByTestId('sidebar-set-a-topic-btn').click();
        await waitForLoading(page);
        await page.getByTestId('topic-library-year-group-select').click();
        await page.getByRole('option', { name: 'All' }).click();
        await page.getByTestId('topic-library-subjects-select').click();
        await page.getByRole('option', { name: moneySkillsSubjectName }).click();
        await page.getByTestId('topic-library-domain-select').click();
        await page.getByRole('option', { name: moneySkillsSubjectName }).click();
        await page.getByRole('button', { name: 'Search' }).click();
        await waitForLoading(page);

        // Verify that Money Skills topic is available in the topic library when enabled at school level
        await expect(page.getByTestId('topic-summary-card-topic-name').getByText(moneySkillsTopicName)).toBeVisible();
        await page.getByTestId('school-overview-tab').click();
        await page.waitForURL(/\/school/);
        await waitForLoading(page);
        await page.getByRole('link', { name: myClassName }).click();
        await page.waitForURL(/\/class/);
        await waitForLoading(page);
        await page.getByTestId('common-nav-schedule-tab').click();
        await waitForLoading(page);
        await page.getByTestId('class-schedule-year-group-multi-select').click();
        await page.getByRole('option', { name: 'All' }).click();
        await page.getByTestId('class-schedule-subject-multi-select').click();
        await page.getByRole('option', { name: moneySkillsSubjectName }).click();
        await page.getByTestId('class-schedule-domain-multi-select').click();
        await page.getByRole('option', { name: moneySkillsSubjectName }).click();
        await page.getByTestId('class-schedule-topic-search-button').click();
        await waitForLoading(page);

        // Verify that Money Skills topics are available in the class schedule page for full programme or reading classes
        await expect(page.getByTestId('topic-summary-card-topic-name').getByText(moneySkillsTopicName)).toBeVisible();
        await openSideDrawer(page);
        await page.getByTestId('school-overview-tab').click();
        await page.waitForURL(/\/school/);
        await waitForLoading(page);
        await page.getByRole('link', { name: preAdmissionClass }).click();
        await page.waitForURL(/\/class/);
        await waitForLoading(page);
        await page.getByTestId('common-nav-schedule-tab').click();
        await waitForLoading(page);
        await page.getByTestId('class-schedule-year-group-multi-select').click();
        await page.getByRole('option', { name: 'All' }).click();
        await page.getByTestId('class-schedule-subject-multi-select').click();

        // Verify that Money Skills subject is not available in the class schedule page for pre-admission classes
        await expect(page.getByRole('option', { name: moneySkillsSubjectName })).toBeHidden();
        await adminOrTeacherSignOut(page);

        // Add pupil in reading class and verify topic tab is not visible on parent side when Money Skills is enabled at school level and no topics are assigned in the class
        const parent = await utils.createUser({
            firstname: parentFirstname,
            lastname: parentLastname,
            email: parentEmail,
            type: UserType.PARENT,
            userStatus: UserStatus.ACTIVE,
            password: user.password
        });
        const pupil2 = await utils.createPupil(school.id, {
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
        await utils.addParentToPupil(pupil2.id, parent.id, false);
        await utils.addPupilToClass(pupil2.id, readingAndMoneySkillsClass.id);
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
        await utils.addParentToPupil(pupil1.id, parent.id, false);
        await utils.addPupilToClass(pupil1.id, schoolClass.id);
        await utils.addUserTooltipHistory(parent.id, 'child-switch-tooltip');

        await login(page, parentEmail, password);
        await page.waitForURL(/\/parent/);
        await waitForLoading(page);
        await page.getByText(pupil2FirstName).click();
        await waitForLoading(page);
        await expect(page.getByTestId('topics-tab')).toBeHidden();

        const classTopic1 = await utils.createClassTopic(schoolClass.id, {
            topicId: staticTopic?.id,
            releaseDate: todayDate,
            released: true
        });
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
        const classTopic2 = await utils.createClassTopic(readingAndMoneySkillsClass.id, {
            topicId: staticTopic?.id,
            releaseDate: todayDate,
            released: true
        });
        const pupilTopic2 = await utils.createPupilTopic({
            releaseDate: todayDate,
            pupilId: pupil2.id,
            classTopicId: classTopic2.id,
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

        await page.getByTestId('header-logo').click();
        await page.waitForURL(/\/parent/);
        await waitForLoading(page);
        await page.getByText(pupil1FirstName).click();
        await waitForLoading(page);
        await page.getByTestId('topics-tab').click();
        await waitForLoading(page);
        await expect(page.getByText(moneySkillsTopicName).first()).toBeVisible();
        await page.getByTestId('switch-child-tab').click();
        await page.locator('#simple-popover').getByText(pupil2FirstName).click();
        await waitForLoading(page);
        await page.getByTestId('topics-tab').click();
        await waitForLoading(page);
        await expect(page.getByText('Finish activities to earn clothes, accessories, and awards.')).toBeVisible();
        await expect(page.getByText(moneySkillsTopicName).first()).toBeVisible();
    });
});
