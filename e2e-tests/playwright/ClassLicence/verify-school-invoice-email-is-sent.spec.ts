import { test, expect } from '@playwright/test';
import type { Schema } from '@lwp/postgres-client';
import { type Kysely, sql } from 'kysely';
import { createDb } from './../db';
import { createUtils } from './../dbUtils';
import { generateSchoolName, generateFirstName, generateLastName, generateUserEmail, password } from './../constants';
import { createSchoolAndDummyWondeData, getInputBoxByName, login, openSideDrawer, waitForLoading } from './../utils';
import { FeatureCode, FeatureStatus, UserStatus } from 'lwp-shared';

test.describe('Class Licence - Verify School Invoice Email Is Sent', () => {
    let db: Kysely<Schema.DB>;
    let utils: ReturnType<typeof createUtils>;

    test.beforeAll(async () => {
        db = createDb();
        utils = createUtils(db);

        await db
            .updateTable('static_lwp_features')
            .set({ status: FeatureStatus.ALL_SCHOOLS })
            .where('code', '=', FeatureCode.READY_TEDDY)
            .execute();
    });

    test.afterAll(async () => {
        await db
            .updateTable('static_lwp_features')
            .set({ status: FeatureStatus.NO_SCHOOLS })
            .where('code', '=', FeatureCode.READY_TEDDY)
            .execute();

        await db.destroy();
    });

    test('should verify school invoice email is sent after purchasing a class licence', async ({ page }) => {
        const mySchoolName: string = `${generateSchoolName()} School`;
        const leaderFirstName: string = generateFirstName();
        const leaderlastName: string = generateLastName();
        const schoolEmail: string = generateUserEmail(leaderFirstName, leaderlastName);
        const numOfFullProgrammeClassesAllowed: number = 1;
        const numOfTotalClassesAllowed: number = 1;
        const purchaseClassLicenceInput = {
            fullProgrammeCount: 1,
            readingLogCount: 0,
            upgradeExistingReadingClassCount: 0,
            readyTeddyClassCount: 1
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
            `You can activate ${numOfTotalClassesAllowed} more class for the current academic year, you can add topics and activities to ${numOfFullProgrammeClassesAllowed} class.`
        );
        await page.getByTestId('school-overview-purchase-class-licence-link').click();
        await waitForLoading(page);
        await getInputBoxByName(page, 'fullProgrammeCount').fill(purchaseClassLicenceInput.fullProgrammeCount.toString());
        await getInputBoxByName(page, 'readyTeddyCount').fill(purchaseClassLicenceInput.readyTeddyClassCount.toString());
        await getInputBoxByName(page, 'authorizationCheckbox').click();
        await page.getByTestId('dialog-primary-btn').getByText('Submit').click();
        await waitForLoading(page);
        await expect(page.locator('.MuiAlert-message').filter({ hasText: 'Class licence purchase successful!' })).toBeVisible();
        const notification = await db
            .selectFrom('lwp_notification')
            .select(['params'])
            .where('emailTemplateType', '=', 'invoiceOfSchoolClassLicenceToSchool')
            .where(sql`params ->> 'EMAIL'`, '=', schoolEmail)
            .executeTakeFirstOrThrow();
        const emailParams = JSON.parse(JSON.stringify(notification.params));
        expect(emailParams).toMatchObject({
            FIRSTNAME: leaderFirstName,
            LASTNAME: leaderlastName,
            USEREMAIL: schoolEmail,
            USERALIAS: `Mr ${leaderFirstName}`,
            SCHOOLNAME: mySchoolName,
            ADDITIONALFULLPROGRAMMECLASSCOUNT: purchaseClassLicenceInput.fullProgrammeCount,
            ADDITIONALREADINGONLYCLASSCOUNT: purchaseClassLicenceInput.readingLogCount,
            ADDITIONALUPGRADECLASSCOUNT: purchaseClassLicenceInput.upgradeExistingReadingClassCount,
            ADDITIONALREADYTEDDYCLASSCOUNT: purchaseClassLicenceInput.readyTeddyClassCount
        });
    });
});
