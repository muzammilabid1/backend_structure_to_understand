import { test, expect } from '@playwright/test';
import type { Schema } from '@lwp/postgres-client';
import { type Kysely } from 'kysely';
import { createDb } from './db';
import path from 'path';
import { admin, password, generateSchoolName, generateFirstName, generateLastName, generateUserEmail, signupPassword } from './constants';
import { acceptFeatureTooltipPrompt, getInputBoxByName, login, openSideDrawer, safeClick, waitForLoading } from './utils';

test.describe('End-to-End Testing via CSV Import Data', () => {
    let db: Kysely<Schema.DB>;

    test.beforeAll(async () => {
        db = createDb();
    });

    test.afterAll(async () => {
        await db.destroy();
    });

    test('End-to-End Testing via CSV Import Data', async ({ page }) => {
        const fullProgrammedClassesAllowed: string = '10';
        const classesAllowed: string = '30';
        const mySchoolName: string = `${generateSchoolName()} School`;
        const leaderFirstName: string = generateFirstName();
        const leaderlastName: string = generateLastName();
        const schoolEmail: string = generateUserEmail(leaderFirstName, leaderlastName);
        const activeSchoolClassName: string = 'Ball Class';
        const currentYearSchoolClassName: string = 'Bones Class';
        const nextYearSchoolClassName: string = 'Beans Class';
        const currentYearPupilName: string = 'Child2 McAdultface';
        const nextYearPupilName: string = 'Childy McChildface';

        // Admin creates school and imports pupils via CSV to create new classes
        await login(page, admin, password);
        await page.waitForURL(/\/admin/);
        await openSideDrawer(page);
        await page.getByRole('link', { name: 'Schools' }).click();
        await waitForLoading(page);
        await page.getByTestId('add-school-button').click();
        await page.getByTestId('add-school-name-input').fill(mySchoolName);
        await page.getByTestId('add-school-leader-first-name-input').fill(leaderFirstName);
        await page.getByTestId('add-school-leader-last-name-input').fill(leaderlastName);
        await page.getByTestId('add-school-email-input').fill(schoolEmail);
        await page.getByTestId('add-school-alias-input').fill(`Mr ${leaderFirstName}`);
        await page.getByTestId('add-school-full-programme-classes-allowed-input').fill(fullProgrammedClassesAllowed);
        await page.getByTestId('add-school-total-classes-allowed-input').fill(classesAllowed);
        await page.getByTestId('add-school-submit-button').click();
        await waitForLoading(page);
        await expect(page.locator('.MuiAlert-message').filter({ hasText: 'New school created' })).toBeVisible();
        await safeClick(page.locator('[data-testid="school-details-link"]', { hasText: mySchoolName }));
        await waitForLoading(page);
        await getInputBoxByName(page, 'isReadyTeddyAvailable').click();
        await page.getByRole('button', { name: 'Update details' }).click();
        await waitForLoading(page);
        await expect(page.locator('.MuiAlert-message').filter({ hasText: 'School has been successfully updated.' })).toBeVisible();
        await page.getByTestId('classes-school-overview-tab').click();
        await waitForLoading(page);
        await expect(page.getByRole('link', { name: nextYearSchoolClassName })).toHaveCount(0);
        await page.getByTestId('details-school-overview-tab').click();
        await waitForLoading(page);
        await page.getByText('CSV import', { exact: true }).click();
        const filePath = path.resolve(__dirname, '../cypress/fixtures/Test CSV import.csv');
        await page.setInputFiles('input[type="file"][accept="text/csv"]', filePath);
        await page.getByRole('button', { name: 'Import CSV' }).click();
        await page.getByRole('button', { name: 'Match columns' }).click();
        await waitForLoading(page);
        await expect(page.locator('.MuiAlert-message').filter({ hasText: 'Promoted proposed school!' })).toBeVisible();
        await expect(page.locator('.school-wonde-status')).toContainText('Data imported');
        await page.reload();
        await waitForLoading(page);
        await page.getByRole('button', { name: 'Reimport cached data' }).click();
        await waitForLoading(page);
        await expect(page.locator('.school-wonde-status')).toContainText('Import complete');
        await page.getByTestId('classes-school-overview-tab').click();
        await waitForLoading(page);
        await expect(page.getByRole('link', { name: nextYearSchoolClassName })).toHaveCount(2);
        await page.getByTestId('details-school-overview-tab').click();
        await waitForLoading(page);
        await page.getByText('CSV import', { exact: true }).click();
        await page.setInputFiles('input[type="file"][accept="text/csv"]', filePath);
        await page.getByRole('button', { name: 'Import CSV' }).click();
        await page.getByRole('button', { name: 'Match columns' }).click();
        await waitForLoading(page);
        await expect(page.locator('.school-wonde-status')).toContainText('Data imported');
        await page.reload();
        await waitForLoading(page);
        await page.getByRole('button', { name: 'Reimport cached data' }).click();
        await waitForLoading(page);
        await expect(page.locator('.school-wonde-status')).toContainText('Import complete');
        await page.getByTestId('classes-school-overview-tab').click();
        await waitForLoading(page);
        await expect(page.getByRole('link', { name: nextYearSchoolClassName })).toHaveCount(2);

        // Signs up school leader using invitation magic link
        const schoolLeader = await db.selectFrom('lwp_user').where('email', '=', schoolEmail).select(['id']).executeTakeFirstOrThrow();
        const schoolLeaderMagicLink = await db
            .selectFrom('lwp_magic_link')
            .where('type', '=', 'INVITATION')
            .where('isUsed', '=', false)
            .where('userId', '=', schoolLeader.id)
            .where('expiryTime', '>', new Date())
            .select(['url'])
            .executeTakeFirst();
        expect(schoolLeaderMagicLink?.url).toBeDefined();
        await page.goto(`/magic/${schoolLeaderMagicLink?.url}`);
        await page.waitForURL(/\/signup/);
        await waitForLoading(page);
        await page.getByRole('button', { name: 'Continue to set password' }).click();
        await waitForLoading(page);
        await getInputBoxByName(page, 'password').fill(signupPassword);
        await getInputBoxByName(page, 'repeatPassword').fill(signupPassword);
        await getInputBoxByName(page, 'policy').check();
        await page.getByRole('button', { name: 'Create an account' }).click();
        await expect(page.locator('.MuiAlert-message').filter({ hasText: 'Your account is all set up!' })).toBeVisible();
        await page.waitForURL(/\/school/);
        await waitForLoading(page);
        await expect(page.getByTestId('common-drawer-list')).toBeVisible();
        await openSideDrawer(page);
        await expect(page.getByTestId('school-overview-page')).toBeVisible();
        await waitForLoading(page);
        await expect(page.getByTestId('classes-overview-tab-section')).toBeVisible();

        // Verifies that "Ball Class" is already active after school creation
        const activeClassSelector = page.locator('[data-test="active-registration-class-name"]', { hasText: activeSchoolClassName });
        await safeClick(activeClassSelector);
        await page.waitForURL(/\/class/);
        await waitForLoading(page);
        await page.mouse.move(0, 0);
        await expect(page.getByTestId('common-nav-pupils-tab')).toBeVisible();

        // Activates current year class, removes pupil, and checks unassigned list
        await page.getByRole('link', { name: 'School overview' }).click();
        await page.waitForURL(/\/school/);
        await waitForLoading(page);
        await page.locator('[data-test="inactive-registration-open-button"]').first().click();
        await waitForLoading(page);
        await page.getByRole('link', { name: 'click here to activate now' }).click();
        await waitForLoading(page);
        await page.getByTestId('yearGroup').click();
        await page.getByRole('option', { name: 'Year 1' }).click();
        await page.getByTestId('activate-main-teacher-select').click();
        await page.getByRole('option', { name: `${leaderFirstName} ${leaderlastName}` }).click();
        await getInputBoxByName(page, 'isFullProgramme').check();
        await page.getByRole('button', { name: 'Activate class' }).click();
        await waitForLoading(page);
        await expect(page.locator('.MuiAlert-message').filter({ hasText: 'Class activated successfully!' })).toBeVisible();

        /*
         * Where activation lands is deliberately not asserted here. A leader activating a class that can be
         * offered Money Skills auto-scheduling is sent to that page rather than to the school overview, and
         * whether it can turns on a Money Skills sequence existing for its year group: global static data
         * that no spec owns and any admin can add or remove. This class is Year 1 and full programme, so it
         * qualifies the moment such a sequence exists anywhere.
         *
         * This spec is about importing pupils, and only passes through activation on the way. So it waits
         * for activation to be over rather than for a destination, and then goes to the overview it wants.
         * `topic-sequencing.spec.ts` is where the destination itself is asserted, against sequences it
         * builds and removes for the purpose.
         */
        await page.waitForURL((url) => !url.pathname.endsWith('/activate'));
        await waitForLoading(page);
        await acceptFeatureTooltipPrompt(page);
        await page.getByRole('link', { name: 'School overview' }).click();
        await page.waitForURL(/\/school\//);
        await waitForLoading(page);
        await acceptFeatureTooltipPrompt(page);
        await page.getByRole('link', { name: currentYearSchoolClassName }).click();
        await page.waitForURL(/\/class/);
        await waitForLoading(page);
        await page.getByTestId('class-pupil-page-pupil-pop-over').first().click();
        await waitForLoading(page);
        await page.getByTestId('remove-pupil-from-class-list-item').click();
        await page.getByTestId('dialog-primary-btn').click();
        await waitForLoading(page);
        await expect(page.locator('.MuiAlert-message').filter({ hasText: 'pupil deleted!' })).toBeVisible();
        await openSideDrawer(page);
        await expect(page.getByTestId('sidebar-pupils-not-in-class-btn').getByText('1')).toBeVisible(); // as we removed 1 pupil from the class
        await page.getByTestId('sidebar-pupils-not-in-class-btn').click();
        await waitForLoading(page);
        await expect(page.getByTestId('current-academic-year-pupils-tab').getByText('1')).toBeVisible();

        await waitForLoading(page);
        await page.locator('.main_sortable_table').waitFor({ state: 'visible' });
        await expect(page.locator(`[data-field="pupilNameColumn"]`).getByText(currentYearPupilName)).toBeVisible();

        // Activates future year class, removes pupil, and checks next-year unassigned list
        await page.getByRole('link', { name: 'School overview' }).click();
        await page.waitForURL(/\/school/);
        await waitForLoading(page);
        await page.locator('[data-test="inactive-ready-teddy-open-button"]').first().click();
        await waitForLoading(page);
        await page.getByRole('link', { name: 'click here to activate now' }).click();
        await waitForLoading(page);
        await page.getByTestId('activate-main-teacher-select').click();
        await page.getByRole('option', { name: `${leaderFirstName} ${leaderlastName}` }).click();
        await page.getByRole('button', { name: 'Activate class' }).click();
        await waitForLoading(page);
        await expect(page.locator('.MuiAlert-message').filter({ hasText: 'Class activated successfully!' })).toBeVisible();
        await page.waitForURL(/\/school/);
        await waitForLoading(page);
        await page.getByRole('link', { name: nextYearSchoolClassName }).click();
        await page.waitForURL(/\/class/);
        await waitForLoading(page);
        await page.getByTestId('class-pupil-page-pupil-pop-over').first().click();
        await waitForLoading(page);
        await page.getByTestId('remove-pupil-from-class-list-item').click();
        await waitForLoading(page);
        await page.getByTestId('dialog-primary-btn').click();
        await waitForLoading(page);
        await expect(page.locator('.MuiAlert-message').filter({ hasText: 'pupil deleted!' })).toBeVisible();
        await openSideDrawer(page);
        await expect(page.getByTestId('sidebar-pupils-not-in-class-btn').getByText('2')).toBeVisible(); // as we already removed 1 pupil from the current year class and now removed 1 pupil from the next year class
        await page.getByTestId('sidebar-pupils-not-in-class-btn').click();
        await waitForLoading(page);

        await expect(page.getByTestId('next-academic-year-pupils-tab').getByText('1')).toBeVisible();

        await page.getByTestId('next-academic-year-pupils-tab').click();
        await waitForLoading(page);

        await waitForLoading(page);
        await page.waitForURL(/\/school\/\d+\/pupil-not-assigned\?type=next-year-pupils$/);
        await expect(page.locator(`[data-field="pupilNameColumn"]`).getByText(nextYearPupilName)).toBeVisible();
    });
});
