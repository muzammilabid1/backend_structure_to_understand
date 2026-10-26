import { test, expect } from '@playwright/test';
import type { Schema } from '@lwp/postgres-client';
import { type Kysely } from 'kysely';
import { createDb } from '../db';
import { createUtils } from '../dbUtils';
import { generateSchoolName, generateFirstName, generateLastName, generateUserEmail, password } from '../constants';
import { createSchoolAndDummyWondeData, getInputBoxByName, login, openSideDrawer, waitForLoading } from '../utils';
import { UserStatus } from 'lwp-shared';

test.describe('Class Licence - Upgrade', () => {
    let db: Kysely<Schema.DB>;
    let utils: ReturnType<typeof createUtils>;

    test.beforeAll(async () => {
        db = createDb();
        utils = createUtils(db);
    });

    test.afterAll(async () => {
        await db.destroy();
    });

    test('should successfully upgrade a full program class licence and update the class activation count', async ({ page }) => {
        const mySchoolName: string = `${generateSchoolName()} School`;
        const leaderFirstName: string = generateFirstName();
        const leaderlastName: string = generateLastName();
        const schoolEmail: string = generateUserEmail(leaderFirstName, leaderlastName);
        const numOfFullProgrammeClassesAllowed: number = 1;
        const numOfTotalClassesAllowed: number = 2;
        const purchaseClassLicenceInput = {
            upgradeExistingReadingClassCount: 1
        };

        await createSchoolAndDummyWondeData(db, utils, {
            school: {
                name: mySchoolName,
                numOfFullProgrammeClassesAllowed,
                numOfTotalClassesAllowed,
                enableAddClasses: false,
                isMoneySkillsAvailable: false,
                isReadyTeddyAvailable: false,
                isFutureAcademicYear: false
            },
            leader: {
                firstname: leaderFirstName,
                lastname: leaderlastName,
                email: schoolEmail,
                userStatus: UserStatus.ACTIVE,
                addTooltip: true
            }
        });

        await login(page, schoolEmail, password);
        await page.waitForURL(/\/school/);
        await waitForLoading(page);
        await openSideDrawer(page);
        await waitForLoading(page);
        await expect(page.locator('.school-overview-alert-text > .paragraph')).toContainText(
            `You can activate ${numOfTotalClassesAllowed} more classes for the current academic year, you can add topics and activities to ${numOfFullProgrammeClassesAllowed} class.`
        );
        await page.getByTestId('school-overview-purchase-class-licence-link').click();
        await waitForLoading(page);
        await getInputBoxByName(page, 'upgradeExistingReadingClassCount').fill(
            `${numOfTotalClassesAllowed - numOfFullProgrammeClassesAllowed + 1}`
        );
        await getInputBoxByName(page, 'authorizationCheckbox').click();
        await page.getByTestId('dialog-primary-btn').getByText('Submit').click();
        await expect(page.locator('.purchase-additional-class-price-field-error-text > .paragraph')).toContainText(
            `Upgraded classes count cannot be more than digital reading only class count.`
        );
        await getInputBoxByName(page, 'upgradeExistingReadingClassCount').fill(
            purchaseClassLicenceInput.upgradeExistingReadingClassCount.toString()
        );
        await page.getByTestId('dialog-primary-btn').getByText('Submit').click();
        await waitForLoading(page);
        await expect(page.locator('.MuiAlert-message').filter({ hasText: 'Class licence purchase successful!' })).toBeVisible();
        await waitForLoading(page);
        await expect(page.locator('.school-overview-alert-text > .paragraph')).toContainText(
            `You can activate ${numOfTotalClassesAllowed} more classes for the current academic year, you can add topics and activities to ${numOfFullProgrammeClassesAllowed + purchaseClassLicenceInput.upgradeExistingReadingClassCount} class`
        );
    });
});
