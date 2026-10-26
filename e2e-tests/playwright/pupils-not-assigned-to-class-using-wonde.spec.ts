import { test, expect } from '@playwright/test';
import type { Schema } from '@lwp/postgres-client';
import { type Kysely } from 'kysely';
import { createDb } from './db';
import { createUtils } from './dbUtils';
import { acceptFeatureTooltipPrompt, getInputBoxByName, login, openSideDrawer, waitForLoading } from './utils';
import {
    generateClassName,
    generateFirstName,
    generateLastName,
    generateSchoolName,
    generateUPN,
    generateUserEmail,
    password
} from './constants';
import { UserStatus, UserType } from 'lwp-shared';

test.describe('Pupils not assigned to any class', () => {
    let db: Kysely<Schema.DB>;
    let utils: ReturnType<typeof createUtils>;

    test.beforeAll(async () => {
        db = createDb();
        utils = createUtils(db);
    });

    test.afterAll(async () => {
        await db.destroy();
    });

    test('Pupils not assigned to any class', async ({ page }) => {
        const leaderFirstName: string = generateFirstName();
        const leaderlastName: string = generateLastName();
        const schoolEmail: string = generateUserEmail(leaderFirstName, leaderlastName);
        const newClassName = generateClassName();

        await generateTopicData(db, utils, leaderFirstName, leaderlastName, schoolEmail);

        let pupilsNotInClassCount = '15'; // 5 in current year, 10 in next year (including 5 nursery pupils from current year)

        const schoolId = (await db.selectFrom('lwp_user').where('email', '=', schoolEmail).select('schoolId').executeTakeFirstOrThrow())
            ?.schoolId;
        expect(schoolId).toBeDefined();
        await db.updateTable('lwp_school').set({ isReadyTeddyAvailable: true }).where('id', '=', schoolId).execute();

        // Verify non-active pupils in the current and future academic year from the school overview
        await login(page, schoolEmail, password);
        await page.waitForURL(/\/school/);
        await waitForLoading(page);
        await acceptFeatureTooltipPrompt(page);
        await openSideDrawer(page);

        await expect(page.getByTestId('sidebar-pupils-not-in-class-btn').getByText(pupilsNotInClassCount)).toBeVisible();

        await page.getByTestId('sidebar-pupils-not-in-class-btn').click();

        // await page.getByTestId('registration-classes').getByText('Click here to view them').click();
        await waitForLoading(page);
        await page.locator('.main_sortable_table').waitFor({ state: 'visible' });
        const nurseryPupilsList = await page.locator('.MuiDataGrid-virtualScroller [data-field="pupilNameColumn"] > div').allTextContents();
        await waitForLoading(page);
        await page.getByTestId('next-academic-year-pupils-tab').click();
        await waitForLoading(page);
        for (const pupil of nurseryPupilsList) {
            await expect(page.locator(`[data-field="pupilNameColumn"]`).getByText(pupil)).toBeVisible();
        }

        // Add current year pupils to the class, verify their addition and verify the count of remaining pupils not assigned to a class in the school data tab
        await page.getByTestId('current-academic-year-pupils-tab').click();
        await waitForLoading(page);
        await page.locator('.main_sortable_table').waitFor({ state: 'visible' });
        let pupilsList = await page.locator('.MuiDataGrid-virtualScroller [data-field="pupilNameColumn"] > div').allTextContents();
        let pupilsToAdd = pupilsList;
        for (let i = 0; i < pupilsToAdd.length; i++) {
            await page
                .getByRole('row', { name: `Select row ${pupilsList[i]}` })
                .getByLabel('Select row')
                .check();
        }

        await page.getByRole('button', { name: 'Add pupils to class' }).click();
        await waitForLoading(page);
        getInputBoxByName(page, 'class').click();
        await expect(page.locator('.dialog-content-section option', { hasText: '+ Create a new class' })).toHaveCount(0);
        const className = await page.locator('#checkboxes-tags-demo-option-0 p').innerText(); // e.g. 'Class 1 (Year 1)'
        await page.locator('#checkboxes-tags-demo-option-0').click();
        await page.getByRole('button', { name: 'Add to class' }).click();
        await waitForLoading(page);

        await expect(page.getByTestId('current-academic-year-pupils-tab')).toBeVisible();

        await page.getByRole('link', { name: 'School overview' }).click();
        await waitForLoading(page);
        await page.getByTestId('registration-classes').getByText(className.split(' (')[0]).click(); // e.g. 'Class 1'
        await waitForLoading(page);
        for (let i = 0; i < pupilsToAdd.length; i++) {
            await expect(page.locator(`.pupil-name-status-container`).getByText(pupilsList[i])).toBeVisible();
        }

        // Create a new pre-registration class, assign pupils to it, and verify the count of pupils remaining unassigned to a class in the school data tab.
        await page.getByTestId('sidebar-pupils-not-in-class-btn').click();
        await waitForLoading(page);
        await page.getByTestId('next-academic-year-pupils-tab').click();
        await waitForLoading(page);

        await expect(page.getByTestId('not-ignored-pupils')).toBeVisible();

        await page.getByRole('columnheader', { name: 'Pupil name' }).click();

        pupilsList = await page
            .locator('[data-test="not-ignored-pupils"] .MuiDataGrid-virtualScroller [data-field="pupilNameColumn"] > div')
            .allTextContents();
        pupilsToAdd = pupilsList.slice(0, 4);
        const pupilsToIgnore = pupilsList.slice(4);
        for (let i = 0; i < pupilsToAdd.length; i++) {
            await page
                .getByRole('row', { name: `Select row ${pupilsToAdd[i]}` })
                .getByLabel('Select row')
                .check();
            await waitForLoading(page);
        }
        await page.getByRole('button', { name: 'Add pupils to class' }).click();
        await waitForLoading(page);
        getInputBoxByName(page, 'class').click();
        await page.locator('#checkboxes-tags-demo-option-0').click();
        getInputBoxByName(page, 'className').fill(newClassName);
        await page.getByTestId('select-year-group').click();
        await page.getByRole('option', { name: 'Reception' }).click();
        await page.getByRole('button', { name: 'Add to class' }).click();
        await waitForLoading(page);

        await expect(
            page.getByTestId('next-academic-year-pupils-tab').getByText(`${pupilsList.length - pupilsToAdd.length}`)
        ).toBeVisible();

        await page.locator('.dialog-content-section').waitFor({ state: 'hidden' });
        await page.getByTestId('not-ignored-pupils').getByRole('checkbox', { name: 'Select all rows' }).check();
        await page.getByRole('button', { name: 'close Remove from the list' }).click();
        await waitForLoading(page);
        await expect(page.getByTestId('next-academic-year-pupils-tab').locator('.MuiBadge-badge')).toBeHidden();

        await expect(page.getByTestId('sidebar-pupils-not-in-class-btn').locator('.MuiBadge-badge')).toBeHidden();

        await page.getByRole('button', { name: 'Pupils removed from the list' }).click();
        await waitForLoading(page);

        for (let i = 0; i < pupilsToIgnore.length; i++) {
            await expect(page.getByTestId(`ignored-pupils`).getByText(pupilsToIgnore[i])).toBeVisible();
        }

        await page.getByRole('link', { name: 'School overview' }).click();

        await expect(page.getByTestId('sidebar-pupils-not-in-class-btn')).toBeHidden();

        await page.getByTestId('next-academic-year-classes').getByText(newClassName).click();
        await waitForLoading(page);
        await page.locator('body').click({ position: { x: 0, y: 0 } });
        for (let i = 0; i < pupilsToAdd.length; i++) {
            await expect(page.getByTestId(`class-pupil-page-pupil-name`).getByText(pupilsToAdd[i])).toBeVisible();
        }

        // Activate newly created class for the future academic year
        await page.getByRole('link', { name: 'School overview' }).click();
        await page.waitForURL(/\/school/);
        await waitForLoading(page);
        await page.getByTestId('next-academic-year-classes').getByText(newClassName).click();
        await waitForLoading(page);
        await page.locator('body').click({ position: { x: 0, y: 0 } });
        await page.getByRole('link', { name: 'click here to activate now' }).click();
        await waitForLoading(page);
        await page.getByTestId('activate-main-teacher-select').click();
        await page.getByRole('option', { name: leaderFirstName }).click();
        const isReadyTeddyChecked = await getInputBoxByName(page, 'isReadyTeddy').isChecked();
        await expect(isReadyTeddyChecked).toBe(true);
        await page.getByRole('button', { name: 'Activate class' }).click();
        await page.waitForURL(/\/school/);
        await waitForLoading(page);
        await acceptFeatureTooltipPrompt(page);
        await page.getByTestId('next-academic-year-classes').getByRole('link', { name: newClassName }).click();
        await waitForLoading(page);
        await page.getByRole('heading', { name: newClassName }).click();
    });
});

const generateTopicData = async (
    db: Kysely<Schema.DB>,
    utils: ReturnType<typeof createUtils>,
    leaderFirstName: string,
    leaderLastName: string,
    schoolEmail: string
): Promise<void> => {
    const user = await db.selectFrom('lwp_user').where('id', '=', '1').select(['id', 'password']).executeTakeFirstOrThrow();
    const currentPeriod = await db
        .selectFrom('static_lwp_period')
        .where('isCurrentPeriod', '=', true)
        .select('index')
        .executeTakeFirstOrThrow();
    const school = await utils.createSchool({
        schoolName: generateSchoolName(),
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
        email: schoolEmail,
        type: UserType.TEACHER,
        userStatus: UserStatus.ACTIVE,
        isSchoolLeader: true,
        schoolId: school.id,
        password: user.password,
        nameForChildren: `Mr ${leaderFirstName}`
    });
    for (let i = 0; i < 4; i++) {
        await utils.createClass(school.id, {
            name: generateClassName(),
            isRegistrationClass: true,
            isFullProgramme: false,
            mainTeacherId: leader.id,
            yearGroup: 1,
            periodIndex: currentPeriod.index,
            IsReadingLogsEnabled: false,
            readingTarget: 1,
            status: 'IMPORTED',
            logCreatedById: user.id,
            logUpdatedById: user.id
        });
    }
    await utils.createClass(school.id, {
        name: generateClassName(),
        isRegistrationClass: true,
        isFullProgramme: false,
        mainTeacherId: leader.id,
        yearGroup: 1,
        periodIndex: currentPeriod.index + 1,
        IsReadingLogsEnabled: false,
        readingTarget: 1,
        status: 'IMPORTED',
        logCreatedById: user.id,
        logUpdatedById: user.id
    });
    const parent = await utils.createUser({
        firstname: generateFirstName(),
        lastname: generateLastName(),
        email: generateUserEmail(generateFirstName(), generateLastName()),
        type: UserType.PARENT,
        userStatus: UserStatus.ACTIVE,
        password: user.password
    });
    for (let i = 0; i < 5; i++) {
        const pupil = await utils.createPupil(school.id, {
            firstname: generateFirstName(),
            lastname: generateLastName(),
            dateOfBirth: new Date(),
            startedSchool: (currentPeriod.index + 1).toString(),
            isPremium: true,
            gender: 'MALE',
            UPN: generateUPN(),
            logCreatedById: user.id,
            logUpdatedById: user.id
        });
        await utils.addParentToPupil(pupil.id, parent.id, false);
    }
    for (let i = 0; i < 5; i++) {
        const pupil = await utils.createPupil(school.id, {
            firstname: generateFirstName(),
            lastname: generateLastName(),
            dateOfBirth: new Date(),
            startedSchool: (currentPeriod.index + 1).toString(),
            isPremium: true,
            gender: 'MALE',
            UPN: generateUPN(),
            isPreRegistration: true,
            logCreatedById: user.id,
            logUpdatedById: user.id
        });
        await utils.addParentToPupil(pupil.id, parent.id, false);
    }
};
