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
    generateUPN
} from './constants';
import { formatDate, login, waitForLoading } from './utils';
import { UserStatus, UserType } from 'lwp-shared';

test.describe('Verify award page for pupils accross different class types', () => {
    let db: Kysely<Schema.DB>;
    let utils: ReturnType<typeof createUtils>;

    test.beforeAll(async () => {
        db = createDb();
        utils = createUtils(db);
    });

    test.afterAll(async () => {
        await db.destroy();
    });

    test('Verify award page for pupils accross different class types', async ({ page }) => {
        const mySchoolName: string = `${generateSchoolName()} School`;
        const leaderFirstName: string = generateFirstName();
        const leaderlastName: string = generateLastName();
        const schoolEmail: string = generateUserEmail(leaderFirstName, leaderlastName);
        const parentFirstname: string = generateFirstName();
        const parentLastname: string = generateLastName();
        const parentEmail: string = generateUserEmail(parentFirstname, parentLastname);
        const myClassName: string = generateClassName();
        const readyTeddyClassName: string = generateClassName();
        const fullProgrammedClassName: string = generateClassName();
        const readingClassName: string = generateClassName();
        // This pupil is added to the reading and full programme class
        const pupil1FirstName: string = generateFirstName();
        const pupil1LastName: string = generateLastName();
        // This pupil is added to the full program only class
        const pupil2FirstName: string = generateFirstName();
        const pupil2LastName: string = generateLastName();
        // This pupil is added to the ready teddy only class
        const pupil3FirstName: string = generateFirstName();
        const pupil3LastName: string = generateLastName();
        // This pupil is added to the reading only class
        const pupil4FirstName: string = generateFirstName();
        const pupil4LastName: string = generateLastName();
        const today = new Date();
        const dateToday = formatDate(today, '-');

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
            isReadyTeddyEnabled: false,
            readingLaunchDate: dateToday,
            readingStartDay: today.getDay(),
            readingTarget: 1,
            logCreatedById: user.id,
            logUpdatedById: user.id
        });
        const parent = await utils.createUser({
            firstname: parentFirstname,
            lastname: parentLastname,
            email: parentEmail,
            type: UserType.PARENT,
            userStatus: UserStatus.ACTIVE,
            password: user.password
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
        await utils.addParentToPupil(pupil1.id, parent.id, false);
        await utils.addPupilToClass(pupil1.id, schoolClass.id);

        // Create full-programme class and add pupil to it
        const fullProgrammedClass = await utils.createClass(school.id, {
            name: fullProgrammedClassName,
            isRegistrationClass: true,
            isFullProgramme: true,
            mainTeacherId: leader.id,
            yearGroup: 1,
            periodIndex: currentPeriod.index,
            IsReadingLogsEnabled: false,
            isReadyTeddyEnabled: false,
            readingStartDay: today.getDay(),
            readingTarget: 1,
            logCreatedById: user.id,
            logUpdatedById: user.id
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
        await utils.addPupilToClass(pupil2.id, fullProgrammedClass.id);

        // Create Pre Admission class (Ready teddy) and add pupil to it
        const readyTeddyClass = await utils.createClass(school.id, {
            name: readyTeddyClassName,
            isRegistrationClass: true,
            isFullProgramme: false,
            mainTeacherId: leader.id,
            yearGroup: 1,
            periodIndex: currentPeriod.index + 1,
            IsReadingLogsEnabled: false,
            isReadyTeddyEnabled: true,
            readingStartDay: today.getDay(),
            readingTarget: 1,
            logCreatedById: user.id,
            logUpdatedById: user.id
        });
        const pupil3 = await utils.createPupil(school.id, {
            firstname: pupil3FirstName,
            lastname: pupil3LastName,
            dateOfBirth: new Date(),
            startedSchool: '2024',
            isPremium: true,
            gender: 'MALE',
            UPN: generateUPN(),
            logCreatedById: user.id,
            logUpdatedById: user.id
        });
        await utils.addParentToPupil(pupil3.id, parent.id, false);
        await utils.addPupilToClass(pupil3.id, readyTeddyClass.id);

        // Create reading only class and add pupil to it
        const readingClass = await utils.createClass(school.id, {
            name: readingClassName,
            isRegistrationClass: true,
            isFullProgramme: false,
            mainTeacherId: leader.id,
            yearGroup: 1,
            periodIndex: currentPeriod.index + 1,
            IsReadingLogsEnabled: true,
            isReadyTeddyEnabled: false,
            readingStartDay: today.getDay(),
            readingLaunchDate: dateToday,
            readingTarget: 1,
            logCreatedById: user.id,
            logUpdatedById: user.id
        });
        const pupil4 = await utils.createPupil(school.id, {
            firstname: pupil4FirstName,
            lastname: pupil4LastName,
            dateOfBirth: new Date(),
            startedSchool: '2024',
            isPremium: true,
            gender: 'MALE',
            UPN: generateUPN(),
            logCreatedById: user.id,
            logUpdatedById: user.id
        });
        await utils.addParentToPupil(pupil4.id, parent.id, false);
        await utils.addPupilToClass(pupil4.id, readingClass.id);
        await utils.addUserTooltipHistory(parent.id, 'child-switch-tooltip');

        // Verify award page for pupils in reading and full programme class
        await login(page, parentEmail, password);
        await page.waitForURL(/\/parent/);
        await waitForLoading(page);
        await page.getByText(pupil1FirstName).click();
        await waitForLoading(page);
        await page.getByTestId('awards-tab').click();
        await waitForLoading(page);
        await page.waitForURL(/\/trophies/);
        await waitForLoading(page);
        await expect(page.getByTestId('child-awards-page-no-mathscot-text')).toBeHidden();
        await page.getByTestId('child-awards-page-info-text').locator('span:visible').click();
        await waitForLoading(page);
        await expect(page.getByTestId('child-awards-page-info-text')).toHaveText(
            'Log your reading or complete activities to collect stars! \n\n Earn a gold star by completing your first activity in a topic or hitting your weekly reading goal, and a silver star for watching the topic video and completing any additional activities, and each day you log your reading.'
        );

        // Verify award page for full programme only pupil class
        await page.getByTestId('header-logo').click();
        await page.waitForURL(/\/parent/);
        await waitForLoading(page);
        await expect(page.getByTestId('parent-children-page')).toBeVisible();
        await page.getByText(pupil2FirstName).click();
        await waitForLoading(page);
        await page.getByTestId('awards-tab').click();
        await waitForLoading(page);
        await page.waitForURL(/\/trophies/);
        await waitForLoading(page);
        await expect(
            page
                .getByTestId('child-awards-page-no-mathscot-text')
                .getByText("You don't currently have a mathscot. Complete your first activity to pick your mathscot.")
        ).toBeVisible();
        await page.getByTestId('child-awards-page-info-text').locator('span:visible').click();
        await waitForLoading(page);
        await expect(page.getByTestId('child-awards-page-info-text')).toHaveText(
            'Complete activities to earn stars and unlock new items! \n\n You get a gold star for completing your first activity in a topic, and a silver star for watching the topic video and any additional activities you complete.'
        );

        // Verify award page for ready teddy only pupil class
        await page.getByTestId('header-logo').click();
        await page.waitForURL(/\/parent/);
        await waitForLoading(page);
        await expect(page.getByTestId('parent-children-page')).toBeVisible();
        await page.getByText(pupil3FirstName).click();
        await waitForLoading(page);
        await page.getByTestId('awards-tab').click();
        await waitForLoading(page);
        await page.waitForURL(/\/trophies/);
        await waitForLoading(page);
        await expect(page.getByTestId('child-awards-page-no-mathscot-text')).toBeHidden();
        await page.getByTestId('child-awards-page-info-text').locator('span:visible').click();
        await waitForLoading(page);
        await expect(page.getByTestId('child-awards-page-info-text')).toHaveText(
            'Complete activities to earn stars! \n\n You get a gold star for completing your first activity in a topic, and a silver star for watching the topic video and any additional activities you complete.'
        );

        // Verify award page for reading only pupil class
        await page.getByTestId('header-logo').click();
        await page.waitForURL(/\/parent/);
        await waitForLoading(page);
        await expect(page.getByTestId('parent-children-page')).toBeVisible();
        await page.getByText(pupil4FirstName).click();
        await waitForLoading(page);
        await page.getByTestId('awards-tab').click();
        await waitForLoading(page);
        await page.waitForURL(/\/trophies/);
        await waitForLoading(page);
        await expect(page.getByTestId('child-awards-page-no-mathscot-text')).toBeHidden();
        await page.getByTestId('child-awards-page-info-text').locator('span:visible').click();
        await waitForLoading(page);
        await expect(page.getByTestId('child-awards-page-info-text')).toHaveText(
            'Log your reading to earn stars! \n\n You get a silver star every day that you log your reading, and a gold star for reaching your target for the week.'
        );
    });
});
