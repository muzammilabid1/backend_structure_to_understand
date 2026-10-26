import { expect, test } from '@playwright/test';
import type { Schema } from '@lwp/postgres-client';
import { type Kysely } from 'kysely';
import { createDb } from './db';
import { createUtils } from './dbUtils';
import {
    password,
    generateSchoolName,
    generateFirstName,
    generateLastName,
    generateUserEmail,
    generateClassName,
    generateUPN,
    generateTopicName,
    moneySkillsDomainId,
    englishDomainId,
    readyTeddyDomainId,
    moneySkillsSubjectName,
    mathsSubjectName,
    englishSubjectName,
    readyTeddySubjectName
} from './constants';
import { adminOrTeacherSignOut, formatDate, getInputBoxByName, login, openSideDrawer, switchToPupil, waitForLoading } from './utils';
import { UserStatus, UserType } from 'lwp-shared';

test.describe('End-to-End Workflow for Groups Across Classes', () => {
    let db: Kysely<Schema.DB>;
    let utils: ReturnType<typeof createUtils>;

    test.beforeAll(async () => {
        db = createDb();
        utils = createUtils(db);
    });

    test.afterAll(async () => {
        await db.destroy();
    });

    test('Should create, update and manage groups across classes with correct navigation, pupil visibility, reading targets, activity grid and schedule behaviour', async ({
        page
    }) => {
        const mySchoolName: string = `${generateSchoolName()} School`;
        const leaderFirstName: string = generateFirstName();
        const leaderlastName: string = generateLastName();
        const leaderFullName = `${leaderFirstName} ${leaderlastName}`;
        const schoolEmail: string = generateUserEmail(leaderFirstName, leaderlastName);
        const teacherFirstname: string = generateFirstName();
        const teacherLastname: string = generateLastName();
        const teacherEmail: string = generateUserEmail(teacherFirstname, teacherLastname);
        const parentFirstname: string = generateFirstName();
        const parentLastname: string = generateLastName();
        const parentEmail: string = generateUserEmail(parentFirstname, parentLastname);
        const moneySkillsTopicName: string = `MS: ${generateTopicName()}`;
        const fullProgrammeTopicName: string = `FP: ${generateTopicName()}`;
        const readyTeddyTopicName: string = `RT: ${generateTopicName()}`;
        const moneySkillsClassName: string = `MS: ${generateClassName()}`;
        const readyTeddyClassName: string = `RT: ${generateClassName()}`;
        const fullProgrammedClassName: string = `FP: ${generateClassName()}`;
        const readingClassName: string = `Reading: ${generateClassName()}`;
        const readingClass2Name: string = `Reading 2: ${generateClassName()}`;
        const fullProgrammePupilFirstName: string = generateFirstName();
        const fullProgrammePupilLastName: string = generateLastName();
        const readyTeddyPupilFirstName: string = generateFirstName();
        const readyTeddyPupilLastName: string = generateLastName();
        const readingPupilFirstName: string = generateFirstName();
        const readingPupilLastName: string = generateLastName();
        const readingPupil2FirstName: string = generateFirstName();
        const readingPupil2LastName: string = generateLastName();
        const moneySkillsPupilFirstName: string = generateFirstName();
        const moneySkillsPupilLastName: string = generateLastName();
        const groupAcrossClassesName = `GAC 1: ${mySchoolName}`;
        const updatedGroupAcrossClassesName = `GAC 1.1: ${mySchoolName}`;
        const groupAcrossClasses2Name = `GAC 2: ${mySchoolName}`;
        const groupAcrossClasses3Name = `GAC 3: ${mySchoolName}`;
        const today = new Date();
        const oneWeekAgo = new Date(today);
        oneWeekAgo.setDate(today.getDate() - 7);
        const twoWeeksAgo = new Date(today);
        twoWeeksAgo.setDate(today.getDate() - 14);
        const dateToday = formatDate(today, '-');

        const user = await db.selectFrom('lwp_user').where('id', '=', '1').select(['id', 'password']).executeTakeFirstOrThrow();
        const currentPeriod = await db
            .selectFrom('static_lwp_period')
            .where('isCurrentPeriod', '=', true)
            .select('index')
            .executeTakeFirstOrThrow();

        const parent = await utils.createUser({
            firstname: parentFirstname,
            lastname: parentLastname,
            email: parentEmail,
            type: UserType.PARENT,
            userStatus: UserStatus.ACTIVE,
            password: user.password
        });
        const school = await utils.createSchool({
            schoolName: mySchoolName,
            curentPeriodIndex: currentPeriod.index,
            numOfFullProgrammeClassesAllowed: 10,
            numOfTotalClassesAllowed: 30,
            enableAddClasses: true,
            isMoneySkillsAvailable: true,
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
        const moneySkillsClass = await utils.createClass(school.id, {
            name: moneySkillsClassName,
            isRegistrationClass: true,
            isFullProgramme: true,
            mainTeacherId: leader.id,
            yearGroup: 1,
            periodIndex: currentPeriod.index,
            readingTarget: 1,
            logCreatedById: user.id,
            logUpdatedById: user.id
        });

        const moneySkillsClassPupil = await utils.createPupil(school.id, {
            firstname: moneySkillsPupilFirstName,
            lastname: moneySkillsPupilLastName,
            dateOfBirth: new Date(),
            startedSchool: '2024',
            isPremium: true,
            gender: 'MALE',
            UPN: generateUPN(),
            logCreatedById: user.id,
            logUpdatedById: user.id
        });
        await utils.addParentToPupil(moneySkillsClassPupil.id, parent.id, false);
        await utils.addPupilToClass(moneySkillsClassPupil.id, moneySkillsClass.id);
        await generateTopicData(
            db,
            utils,
            moneySkillsTopicName,
            moneySkillsDomainId,
            moneySkillsClassPupil.id,
            moneySkillsClass.id,
            currentPeriod.index,
            user.id
        );

        const fullProgrammedClass = await utils.createClass(school.id, {
            name: fullProgrammedClassName,
            isRegistrationClass: true,
            isFullProgramme: true,
            mainTeacherId: leader.id,
            yearGroup: 1,
            periodIndex: currentPeriod.index,
            readingTarget: 1,
            logCreatedById: user.id,
            logUpdatedById: user.id
        });
        const fullProgrammeClassPupil = await utils.createPupil(school.id, {
            firstname: fullProgrammePupilFirstName,
            lastname: fullProgrammePupilLastName,
            dateOfBirth: new Date(),
            startedSchool: '2024',
            isPremium: true,
            gender: 'MALE',
            UPN: generateUPN(),
            logCreatedById: user.id,
            logUpdatedById: user.id
        });
        await utils.addParentToPupil(fullProgrammeClassPupil.id, parent.id, false);
        await utils.addPupilToClass(fullProgrammeClassPupil.id, fullProgrammedClass.id);
        await utils.addClassTeacher(teacher.id, fullProgrammedClass.id);
        await generateTopicData(
            db,
            utils,
            fullProgrammeTopicName,
            englishDomainId,
            fullProgrammeClassPupil.id,
            fullProgrammedClass.id,
            currentPeriod.index,
            user.id
        );

        const readyTeddyClass = await utils.createClass(school.id, {
            name: readyTeddyClassName,
            isRegistrationClass: true,
            isFullProgramme: false,
            mainTeacherId: leader.id,
            yearGroup: 0,
            periodIndex: currentPeriod.index + 1,
            IsReadingLogsEnabled: false,
            isReadyTeddyEnabled: true,
            readingStartDay: today.getDay(),
            readingTarget: 1,
            logCreatedById: user.id,
            logUpdatedById: user.id
        });
        const readyTeddyClassPupil = await utils.createPupil(school.id, {
            firstname: readyTeddyPupilFirstName,
            lastname: readyTeddyPupilLastName,
            dateOfBirth: new Date(),
            startedSchool: '2024',
            isPremium: true,
            gender: 'MALE',
            UPN: generateUPN(),
            logCreatedById: user.id,
            logUpdatedById: user.id
        });
        await utils.addParentToPupil(readyTeddyClassPupil.id, parent.id, false);
        await utils.addPupilToClass(readyTeddyClassPupil.id, readyTeddyClass.id);
        await generateTopicData(
            db,
            utils,
            readyTeddyTopicName,
            readyTeddyDomainId,
            readyTeddyClassPupil.id,
            readyTeddyClass.id,
            currentPeriod.index + 1,
            user.id
        );

        const readingClass = await utils.createClass(school.id, {
            name: readingClassName,
            isRegistrationClass: true,
            isFullProgramme: false,
            mainTeacherId: leader.id,
            yearGroup: 1,
            periodIndex: currentPeriod.index,
            IsReadingLogsEnabled: true,
            readingStartDay: today.getDay(),
            readingLaunchDate: dateToday,
            readingTarget: 5,
            logCreatedById: user.id,
            logUpdatedById: user.id
        });
        const readingClassPupil = await utils.createPupil(school.id, {
            firstname: readingPupilFirstName,
            lastname: readingPupilLastName,
            dateOfBirth: new Date(),
            startedSchool: '2024',
            isPremium: true,
            gender: 'MALE',
            UPN: generateUPN(),
            logCreatedById: user.id,
            logUpdatedById: user.id
        });
        await utils.addParentToPupil(readingClassPupil.id, parent.id, false);
        await utils.addPupilToClass(readingClassPupil.id, readingClass.id);
        await utils.addClassTeacher(teacher.id, readingClass.id);
        await generateReadingTopicData(db, utils, readingClassPupil.id, readingClass.id, currentPeriod.index, 5);

        const readingClass2 = await utils.createClass(school.id, {
            name: readingClass2Name,
            isRegistrationClass: true,
            isFullProgramme: false,
            mainTeacherId: leader.id,
            yearGroup: 1,
            periodIndex: currentPeriod.index,
            IsReadingLogsEnabled: true,
            readingStartDay: today.getDay(),
            readingLaunchDate: dateToday,
            readingTarget: 5,
            logCreatedById: user.id,
            logUpdatedById: user.id
        });
        const readingClassPupil2 = await utils.createPupil(school.id, {
            firstname: readingPupil2FirstName,
            lastname: readingPupil2LastName,
            dateOfBirth: new Date(),
            startedSchool: '2024',
            isPremium: true,
            gender: 'MALE',
            UPN: generateUPN(),
            logCreatedById: user.id,
            logUpdatedById: user.id
        });
        await utils.addParentToPupil(readingClassPupil2.id, parent.id, false);
        await utils.addPupilToClass(readingClassPupil2.id, readingClass2.id);
        const { oneWeekAgoReadingClassTopicId } = await generateReadingTopicData(
            db,
            utils,
            readingClassPupil2.id,
            readingClass2.id,
            currentPeriod.index,
            5
        );

        await utils.addUserTooltipHistory(parent.id, 'child-switch-tooltip');
        await utils.addUserTooltipHistory(leader.id, 'topic-library-tooltip');
        await utils.addUserTooltipHistory(leader.id, 'school-reading-log-tooltip');

        // 1. Create a group across classes without pupils and verify correct navigation tabs visibility
        await login(page, schoolEmail, password);
        await page.waitForURL(/\/school/);
        await waitForLoading(page);
        await openSideDrawer(page);
        await waitForLoading(page);
        await page.getByTestId('group-across-classes-accordion-expand-icon').click();
        await page.getByTestId('group-across-classes-add-button').click();
        await waitForLoading(page);
        await page.waitForURL(/\/school\/\d+\/add-group/);
        await waitForLoading(page);
        await getInputBoxByName(page, 'groupName').fill(groupAcrossClassesName);
        await page.getByTestId('group-across-classes-yearGroup-select').click();
        await page.getByRole('option', { name: 'Year 1' }).click();
        await page.getByTestId('group-across-classes-main-teacher-select').click();
        await page.getByRole('option', { name: leaderFullName }).click();
        await page.getByTestId('group-across-classes-create-button').click();
        await waitForLoading(page);
        await page.waitForURL(/\/school/);
        await waitForLoading(page);
        await page.locator('[data-test="group-across-classes-name"]', { hasText: groupAcrossClassesName }).click();
        await page.waitForURL(/\/class/);
        await waitForLoading(page);
        await expect(page.getByTestId('common-nav-week-by-week-tab')).not.toBeVisible();
        await expect(page.getByTestId('common-nav-pupils-tab')).toBeVisible();
        await expect(page.getByTestId('common-nav-schedule-tab')).toBeVisible();
        await expect(page.getByTestId('common-nav-mathscots-tab')).not.toBeVisible();
        await expect(page.getByTestId('common-nav-activity-grid-tab')).toBeVisible();
        await expect(page.getByTestId('common-nav-class-groups-tab')).not.toBeVisible();
        await page.mouse.move(0, 0);

        // 2. Update group name and verify the updated name appears on the school overview page
        await page.getByRole('button', { name: 'Group settings' }).click();
        await page.waitForURL(/\/class-details/);
        await waitForLoading(page);
        await getInputBoxByName(page, 'groupName').fill(updatedGroupAcrossClassesName);
        await page.getByRole('button', { name: 'Update' }).click();
        await waitForLoading(page);
        await expect(page.locator('.MuiAlert-message').filter({ hasText: 'Settings Updated' })).toBeVisible();
        await page.getByTestId('school-overview-tab').click();
        await page.waitForURL(/\/school/);
        await waitForLoading(page);
        await expect(page.locator('[data-test="group-across-classes-name"]', { hasText: updatedGroupAcrossClassesName })).toBeVisible();

        // 3. Create a group with a reading pupil and verify the week-by-week reading tab is visible
        await page.getByTestId('class-overview-add-group-button').click();
        await waitForLoading(page);
        await page.waitForURL(/\/school\/\d+\/add-group/);
        await waitForLoading(page);
        await getInputBoxByName(page, 'groupName').fill(groupAcrossClasses2Name);
        await page.getByTestId('group-across-classes-yearGroup-select').click();
        await page.getByRole('option', { name: 'Year 1' }).click();
        await page.getByTestId('group-across-classes-main-teacher-select').click();
        await page.getByRole('option', { name: leaderFullName }).click();
        await getInputBoxByName(page, 'group-across-classes-pupils-search-input').fill(`${readingPupilFirstName} ${readingPupilLastName}`);
        await page.locator('.MuiAutocomplete-option', { hasText: `${readingPupilFirstName} ${readingPupilLastName}` }).click();
        await page.getByTestId('group-across-classes-create-button').click();
        await waitForLoading(page);
        await page.waitForURL(/\/school/);
        await waitForLoading(page);
        await page.locator('[data-test="group-across-classes-name"]', { hasText: groupAcrossClasses2Name }).click();
        await page.waitForURL(/\/class/);
        await waitForLoading(page);
        await expect(page.getByTestId('common-nav-week-by-week-tab')).toBeVisible();
        await expect(page.getByTestId('common-nav-pupils-tab')).toBeVisible();
        await expect(page.getByTestId('common-nav-schedule-tab')).toBeVisible();
        await expect(page.getByTestId('common-nav-activity-grid-tab')).toBeVisible();
        await page.mouse.move(0, 0);
        await expect(page.getByTestId('reading-button')).toBeVisible();

        // 4. Schedule a money skills topic in the group and verify the topics tab appears on week-by-week page
        const groupAcrossClass2 = await db
            .selectFrom('lwp_school_class')
            .where('name', '=', groupAcrossClasses2Name)
            .select('id')
            .executeTakeFirstOrThrow();
        expect(groupAcrossClass2.id).toBeDefined();
        await generateTopicData(
            db,
            utils,
            `MS: ${generateTopicName()}`,
            moneySkillsDomainId,
            readingClassPupil.id,
            groupAcrossClass2.id,
            currentPeriod.index,
            user.id
        );
        await page.reload();
        await waitForLoading(page);
        await expect(page.getByTestId('topics-button')).toBeVisible();

        // 5. Update reading target for one week ago topic and verify only eligible pupils appear on the week-by-week reading view per week
        await utils.addPupilToClass(readingClassPupil2.id, groupAcrossClass2.id);
        await page.reload();
        await waitForLoading(page);
        await expect(page.locator('[data-test="week-by-week-reading-topic-release-date"]')).toContainText(
            formatDateToString(today, 'dddd DD MMM')
        );
        await expect(
            page
                .locator('[data-test="pupil-name-on-week-by-week-reading-view"]')
                .filter({ hasText: `${readingPupilFirstName} ${readingPupilLastName}` })
        ).toBeVisible();
        await expect(
            page
                .locator('[data-test="pupil-name-on-week-by-week-reading-view"]')
                .filter({ hasText: `${readingPupil2FirstName} ${readingPupil2LastName}` })
        ).toBeVisible();
        await page.getByTestId('week-by-week-reading-topic-previous-button').click();
        await waitForLoading(page);
        await expect(page.locator('[data-test="week-by-week-reading-topic-release-date"]')).toContainText(
            formatDateToString(oneWeekAgo, 'dddd DD MMM')
        );
        await expect(
            page
                .locator('[data-test="pupil-name-on-week-by-week-reading-view"]')
                .filter({ hasText: `${readingPupilFirstName} ${readingPupilLastName}` })
        ).toBeVisible();
        await expect(
            page
                .locator('[data-test="pupil-name-on-week-by-week-reading-view"]')
                .filter({ hasText: `${readingPupil2FirstName} ${readingPupil2LastName}` })
        ).toBeVisible();
        await page.getByTestId('week-by-week-reading-topic-previous-button').click();
        await waitForLoading(page);
        await expect(page.locator('[data-test="week-by-week-reading-topic-release-date"]')).toContainText(
            formatDateToString(twoWeeksAgo, 'dddd DD MMM')
        );
        await expect(
            page
                .locator('[data-test="pupil-name-on-week-by-week-reading-view"]')
                .filter({ hasText: `${readingPupilFirstName} ${readingPupilLastName}` })
        ).toBeVisible();
        await expect(
            page
                .locator('[data-test="pupil-name-on-week-by-week-reading-view"]')
                .filter({ hasText: `${readingPupil2FirstName} ${readingPupil2LastName}` })
        ).toBeVisible();
        await page.mouse.move(0, 0);
        await page.getByTestId('school-overview-tab').click();
        await page.waitForURL(/\/school/);
        await waitForLoading(page);

        await db.updateTable('lwp_class_topic').set('readingTarget', 3).where('id', '=', oneWeekAgoReadingClassTopicId).execute();
        await db.updateTable('lwp_pupil_topic').set('readingTarget', 3).where('classTopicId', '=', oneWeekAgoReadingClassTopicId).execute();

        await page.locator(`[data-test="common-nested-list-name"] span:has-text("${groupAcrossClasses2Name}")`).first().click();
        await waitForLoading(page);
        await expect(page.locator('[data-test="week-by-week-reading-topic-release-date"]')).toContainText(
            formatDateToString(today, 'dddd DD MMM')
        );
        await expect(
            page
                .locator('[data-test="pupil-name-on-week-by-week-reading-view"]')
                .filter({ hasText: `${readingPupilFirstName} ${readingPupilLastName}` })
        ).toBeVisible();
        await expect(
            page
                .locator('[data-test="pupil-name-on-week-by-week-reading-view"]')
                .filter({ hasText: `${readingPupil2FirstName} ${readingPupil2LastName}` })
        ).toBeVisible();
        await page.getByTestId('week-by-week-reading-topic-previous-button').click();
        await waitForLoading(page);
        await expect(page.locator('[data-test="week-by-week-reading-topic-release-date"]')).toContainText(
            formatDateToString(oneWeekAgo, 'dddd DD MMM')
        );
        await expect(page.locator('[data-test="pupil-name-on-week-by-week-reading-view"]')).toHaveCount(1);
        await page.getByTestId('week-by-week-reading-topic-previous-button').click();
        await waitForLoading(page);
        await expect(page.locator('[data-test="week-by-week-reading-topic-release-date"]')).toContainText(
            formatDateToString(oneWeekAgo, 'dddd DD MMM')
        );
        await expect(page.locator('[data-test="pupil-name-on-week-by-week-reading-view"]')).toHaveCount(1);
        await page.getByTestId('week-by-week-reading-topic-previous-button').click();
        await waitForLoading(page);
        await expect(page.locator('[data-test="week-by-week-reading-topic-release-date"]')).toContainText(
            formatDateToString(twoWeeksAgo, 'dddd DD MMM')
        );
        await expect(
            page
                .locator('[data-test="pupil-name-on-week-by-week-reading-view"]')
                .filter({ hasText: `${readingPupilFirstName} ${readingPupilLastName}` })
        ).toBeVisible();
        await expect(
            page
                .locator('[data-test="pupil-name-on-week-by-week-reading-view"]')
                .filter({ hasText: `${readingPupil2FirstName} ${readingPupil2LastName}` })
        ).toBeVisible();
        await page.mouse.move(0, 0);

        // 6. Verify activity grid shows correct topic release date counts before and after reading target update
        await page.getByTestId('common-nav-activity-grid-tab').click();
        await waitForLoading(page);
        await expect(
            page.locator('[data-test="activity-grid-topic-release-date"]').filter({ hasText: formatDateToString(today, 'ddd DD MMM') })
        ).toHaveCount(1);
        await expect(
            page.locator('[data-test="activity-grid-topic-release-date"]').filter({ hasText: formatDateToString(oneWeekAgo, 'ddd DD MMM') })
        ).toHaveCount(2);
        await expect(
            page
                .locator('[data-test="activity-grid-topic-release-date"]')
                .filter({ hasText: formatDateToString(twoWeeksAgo, 'ddd DD MMM') })
        ).toHaveCount(1);
        await db.updateTable('lwp_class_topic').set('readingTarget', 5).where('id', '=', oneWeekAgoReadingClassTopicId).execute();
        await db.updateTable('lwp_pupil_topic').set('readingTarget', 5).where('classTopicId', '=', oneWeekAgoReadingClassTopicId).execute();
        await page.reload();
        await waitForLoading(page);
        await expect(
            page.locator('[data-test="activity-grid-topic-release-date"]').filter({ hasText: formatDateToString(today, 'ddd DD MMM') })
        ).toHaveCount(1);
        await expect(
            page.locator('[data-test="activity-grid-topic-release-date"]').filter({ hasText: formatDateToString(oneWeekAgo, 'ddd DD MMM') })
        ).toHaveCount(1);
        await expect(
            page
                .locator('[data-test="activity-grid-topic-release-date"]')
                .filter({ hasText: formatDateToString(twoWeeksAgo, 'ddd DD MMM') })
        ).toHaveCount(1);

        // 7. Verify schedule page subject filter options are correct when group contains only reading pupils
        await page.getByTestId('common-nav-schedule-tab').click();
        await waitForLoading(page);
        await page.getByTestId('class-schedule-year-group-multi-select').click();
        await page.getByRole('option', { name: 'All' }).click();
        await page.getByTestId('class-schedule-subject-multi-select').click();
        await expect(page.getByRole('option')).toHaveCount(2);
        await expect(page.getByRole('option', { name: moneySkillsSubjectName })).toBeVisible();
        await expect(page.getByRole('option', { name: 'All' })).toBeVisible();
        await page.mouse.move(0, 0);
        await page.getByTestId('school-overview-tab').click();
        await page.waitForURL(/\/school/);
        await waitForLoading(page);

        // 8. Create a group with mixed pupils (reading, full programme, ready teddy) and verify all subjects appear in the schedule subject filter
        await page.getByTestId('class-overview-add-group-button').click();
        await waitForLoading(page);
        await page.waitForURL(/\/school\/\d+\/add-group/);
        await waitForLoading(page);
        await getInputBoxByName(page, 'groupName').fill(groupAcrossClasses3Name);
        await page.getByTestId('group-across-classes-yearGroup-select').click();
        await page.getByRole('option', { name: 'Year 1' }).click();
        await page.getByTestId('group-across-classes-main-teacher-select').click();
        await page.getByRole('option', { name: leaderFullName }).click();
        await getInputBoxByName(page, 'group-across-classes-pupils-search-input').fill(`${readingPupilFirstName} ${readingPupilLastName}`);
        await page.locator('.MuiAutocomplete-option', { hasText: `${readingPupilFirstName} ${readingPupilLastName}` }).click();
        await getInputBoxByName(page, 'group-across-classes-pupils-search-input').fill(
            `${fullProgrammePupilFirstName} ${fullProgrammePupilLastName}`
        );
        await page.locator('.MuiAutocomplete-option', { hasText: `${fullProgrammePupilFirstName} ${fullProgrammePupilLastName}` }).click();
        await getInputBoxByName(page, 'group-across-classes-pupils-search-input').fill(
            `${readyTeddyPupilFirstName} ${readyTeddyPupilLastName}`
        );
        await page.locator('.MuiAutocomplete-option', { hasText: `${readyTeddyPupilFirstName} ${readyTeddyPupilLastName}` }).click();
        await page.getByTestId('group-across-classes-create-button').click();
        await waitForLoading(page);
        await page.waitForURL(/\/school/);
        await waitForLoading(page);
        await page.locator('[data-test="group-across-classes-name"]', { hasText: groupAcrossClasses3Name }).click();
        await page.waitForURL(/\/class/);
        await waitForLoading(page);
        await page.getByTestId('common-nav-schedule-tab').click();
        await waitForLoading(page);
        await page.getByTestId('class-schedule-year-group-multi-select').click();
        await page.getByRole('option', { name: 'All' }).click();
        await page.getByTestId('class-schedule-subject-multi-select').click();
        await expect(page.getByRole('option')).toHaveCount(5);
        await expect(page.getByRole('option', { name: moneySkillsSubjectName })).toBeVisible();
        await expect(page.getByRole('option', { name: mathsSubjectName })).toBeVisible();
        await expect(page.getByRole('option', { name: englishSubjectName })).toBeVisible();
        await expect(page.getByRole('option', { name: readyTeddySubjectName })).toBeVisible();
        await expect(page.getByRole('option', { name: 'All' })).toBeVisible();
        await page.mouse.move(0, 0);

        // 9. Verify the add-to-group dropdown only shows all available groups for a school leader when adding a pupil to a group
        await page.getByRole('listitem').filter({ hasText: fullProgrammedClassName }).click();
        await page.waitForURL(/\/class/);
        await waitForLoading(page);
        await page.getByTestId('common-nav-pupils-tab').click();
        await waitForLoading(page);
        await page
            .getByTestId(`select-pupil-${fullProgrammePupilFirstName}-${fullProgrammePupilLastName}-checkbox-in-class-pupils-page`)
            .click();
        await page.getByTestId('add-pupil-to-group-button').click();
        await waitForLoading(page);
        await page.getByTestId('add-pupil-to-group-select').click();
        await expect(page.getByRole('option')).toHaveCount(3);
        await expect(page.getByRole('option', { name: updatedGroupAcrossClassesName })).toBeVisible();
        await expect(page.getByRole('option', { name: groupAcrossClasses2Name })).toBeVisible();
        await expect(page.getByRole('option', { name: groupAcrossClasses3Name })).toBeVisible();
        await page.getByRole('option', { name: groupAcrossClasses3Name }).click();
        await page.getByTestId('dialog-cancel-btn').click();
        await adminOrTeacherSignOut(page);

        // 10. Verify a teacher can only see groups they are assigned to when adding a pupil to a group
        await utils.addClassTeacher(teacher.id, groupAcrossClass2.id);
        await utils.addUserTooltipHistory(teacher.id, 'topic-library-tooltip');
        await utils.addUserTooltipHistory(teacher.id, 'school-reading-log-tooltip');
        await login(page, teacherEmail, password);
        await page.waitForURL(/\/feed/);
        await waitForLoading(page);
        await page.getByRole('listitem').filter({ hasText: fullProgrammedClassName }).click();
        await page.waitForURL(/\/class/);
        await waitForLoading(page);
        await page.getByTestId('common-nav-pupils-tab').click();
        await waitForLoading(page);
        await page
            .getByTestId(`select-pupil-${fullProgrammePupilFirstName}-${fullProgrammePupilLastName}-checkbox-in-class-pupils-page`)
            .click();
        await page.getByTestId('add-pupil-to-group-button').click();
        await waitForLoading(page);
        await page.getByTestId('add-pupil-to-group-select').click();
        await expect(page.getByRole('option')).toHaveCount(1);
        await expect(page.getByRole('option', { name: groupAcrossClasses2Name })).toBeVisible();
        await page.keyboard.press('Escape');
        await adminOrTeacherSignOut(page);

        // 11. Delete a group across classes and verify it no longer appears on the school overview
        await login(page, schoolEmail, password);
        await page.waitForURL(/\/school/);
        await waitForLoading(page);
        await page.locator('[data-test="group-across-classes-name"]', { hasText: updatedGroupAcrossClassesName }).click();
        await page.waitForURL(/\/class/);
        await waitForLoading(page);
        await page.mouse.move(0, 0);
        await page.getByRole('button', { name: 'Group settings' }).click();
        await page.waitForURL(/\/class-details/);
        await waitForLoading(page);
        await page.getByRole('button', { name: 'Delete group' }).click();
        await page.getByTestId('dialog-primary-btn').click();
        await waitForLoading(page);
        await page.waitForURL(/\/school/);
        await waitForLoading(page);
        await expect(page.locator('[data-test="group-across-classes-name"]', { hasText: updatedGroupAcrossClassesName })).not.toBeVisible();

        // 12. Verify a parent's tabs follow each pupil's own registration class, not the group's licence
        // (LEA-5764). GAC 3 was created through the form in step 8 holding both the reading pupil and the
        // topics-and-activities pupil, so the app recomputed its licence to the union of the two. That
        // union describes the group, not either pupil in it: reading topics are only ever generated for
        // registration classes, so the topics-and-activities pupil can never have a reading week, and a
        // Reading log tab for them would be empty and unusable.
        await adminOrTeacherSignOut(page);
        await login(page, parentEmail, password);
        await page.waitForURL(/\/parent/);
        await waitForLoading(page);
        await expect(page.getByTestId('parent-children-page')).toBeVisible();

        await page.locator('[data-test="child-card-footer-primary-content"]', { hasText: fullProgrammePupilFirstName }).click();
        await page.waitForURL(/\/child\/\d+\/topics/);
        await waitForLoading(page);
        await expect(page.getByTestId('child-topics-page')).toBeVisible();
        await expect(page.getByTestId('topics-tab')).toBeVisible();
        await expect(page.getByTestId('reading-log-tab')).toBeHidden();

        // Their groupmate keeps reading from their own class, and still has topics of their own from the
        // Money Skills topic set on GAC 2 in step 4. This is the half the fix must not take away.
        await switchToPupil(page, readingPupilFirstName);
        await waitForLoading(page);
        await expect(page.getByTestId('reading-log-tab')).toBeVisible();
        await expect(page.getByTestId('topics-tab')).toBeVisible();
    });
});

const generateTopicData = async (
    db: Kysely<Schema.DB>,
    utils: ReturnType<typeof createUtils>,
    topicName: string,
    domainId: string,
    pupilId: string,
    classId: string,
    periodIndex: number,
    userId: string
): Promise<{ staticTopicId: string; classTopicId: string; pupilTopicId: string }> => {
    const today = new Date();
    const todayDate: string = formatDate(today, '-');
    const activity_one = { activityName: `${topicName} one` };
    const activity_two = { activityName: `${topicName} two` };

    const staticTopic = await utils.createStaticTopic({
        isReading: false,
        teacherTopicName: topicName,
        parentTopicName: topicName,
        isPublished: true,
        video: '605069004',
        logCreatedById: userId,
        logUpdatedById: userId
    });
    await db
        .insertInto('static_lwp_topic_domain_year_group')
        .values({
            domainId,
            topicId: staticTopic.id,
            yearGroupId: '1'
        })
        .executeTakeFirstOrThrow();
    const staticActivity1 = await utils.createStaticActivity({
        name: activity_one.activityName,
        activityType: 'LEGACY',
        order: 1,
        topicId: staticTopic.id,
        logCreatedById: userId,
        logUpdatedById: userId
    });
    const staticActivity2 = await utils.createStaticActivity({
        name: activity_two.activityName,
        activityType: 'LEGACY',
        order: 2,
        topicId: staticTopic.id,
        logCreatedById: userId,
        logUpdatedById: userId
    });
    const classTopic = await utils.createClassTopic(classId, {
        topicId: staticTopic?.id,
        releaseDate: todayDate,
        released: true
    });
    const pupilTopic = await utils.createPupilTopic({
        releaseDate: todayDate,
        pupilId: pupilId,
        classTopicId: classTopic.id,
        topicId: staticTopic.id,
        periodIndex,
        watchedVideo: false,
        silverStars: 0,
        earnedGoldStar: false
    });
    await utils.createPupilActivity({
        pupilId: pupilId,
        topicId: pupilTopic.id,
        activityId: staticActivity1.id,
        earnedStar: false,
        mathscotActivityItemIds: JSON.stringify([88, 188, 224])
    });
    await utils.createPupilActivity({
        pupilId: pupilId,
        topicId: pupilTopic.id,
        activityId: staticActivity2.id,
        earnedStar: false,
        mathscotActivityItemIds: JSON.stringify([88, 188, 224])
    });

    return {
        staticTopicId: staticTopic.id,
        classTopicId: classTopic.id,
        pupilTopicId: pupilTopic.id
    };
};

const generateReadingTopicData = async (
    db: Kysely<Schema.DB>,
    utils: ReturnType<typeof createUtils>,
    pupilId: string,
    classId: string,
    periodIndex: number,
    readingTarget: number
): Promise<{ todayReadingClassTopicId: string; oneWeekAgoReadingClassTopicId: string; twoWeeksAgoReadingClassTopicId: string }> => {
    const today = new Date();
    const oneWeekAgo = new Date(today);
    oneWeekAgo.setDate(today.getDate() - 7);

    const twoWeeksAgo = new Date(today);
    twoWeeksAgo.setDate(today.getDate() - 14);

    const todaysDate = formatDate(today, '-');
    const onWeekAgoDate = formatDate(oneWeekAgo, '-');
    const twoWeeksAgoDate = formatDate(twoWeeksAgo, '-');

    const staticReadingTopic = await db
        .selectFrom('static_lwp_topic')
        .where('isReading', '=', true)
        .select(['id'])
        .executeTakeFirstOrThrow();
    const twoWeekAgoReadingClassTopic = await utils.createClassTopic(classId, {
        topicId: staticReadingTopic?.id,
        releaseDate: twoWeeksAgoDate,
        released: true,
        readingTarget
    });
    await utils.createPupilTopic({
        releaseDate: twoWeeksAgoDate,
        pupilId: pupilId,
        classTopicId: twoWeekAgoReadingClassTopic.id,
        topicId: staticReadingTopic.id,
        watchedVideo: false,
        periodIndex,
        silverStars: 0,
        earnedGoldStar: false,
        readingTarget
    });
    const oneWeekAgoReadingClassTopic = await utils.createClassTopic(classId, {
        topicId: staticReadingTopic?.id,
        releaseDate: onWeekAgoDate,
        released: true,
        readingTarget
    });
    await utils.createPupilTopic({
        releaseDate: onWeekAgoDate,
        pupilId: pupilId,
        classTopicId: oneWeekAgoReadingClassTopic.id,
        topicId: staticReadingTopic.id,
        watchedVideo: false,
        periodIndex,
        silverStars: 0,
        earnedGoldStar: false,
        readingTarget
    });
    const todayReadingClassTopic = await utils.createClassTopic(classId, {
        topicId: staticReadingTopic?.id,
        releaseDate: todaysDate,
        released: true,
        readingTarget
    });
    await utils.createPupilTopic({
        releaseDate: todaysDate,
        pupilId: pupilId,
        classTopicId: todayReadingClassTopic.id,
        topicId: staticReadingTopic.id,
        watchedVideo: false,
        periodIndex,
        silverStars: 0,
        earnedGoldStar: false,
        readingTarget
    });

    return {
        todayReadingClassTopicId: todayReadingClassTopic.id,
        oneWeekAgoReadingClassTopicId: oneWeekAgoReadingClassTopic.id,
        twoWeeksAgoReadingClassTopicId: twoWeekAgoReadingClassTopic.id
    };
};

const formatDateToString = (date: Date, format: 'dddd DD MMM' | 'ddd DD MMM'): string => {
    const fullDays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const shortDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    const dayName = format === 'dddd DD MMM' ? fullDays[date.getDay()] : shortDays[date.getDay()];
    const dayNumber = String(date.getDate()).padStart(2, '0');
    const monthName = months[date.getMonth()];

    return `${dayName} ${dayNumber} ${monthName}`;
};
