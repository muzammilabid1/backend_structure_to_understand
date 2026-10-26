import { test, expect } from '@playwright/test';
import type { Schema } from '@lwp/postgres-client';
import { type Kysely } from 'kysely';
import { createDb } from '../db';
import { createUtils } from '../dbUtils';
import { generateFirstName, generateLastName, generateSchoolName, generateUserEmail, password } from '../constants';
import { addParentFromParentsCarerTable, createSchoolAndDummyWondeData, login, waitForLoading } from '../utils';
import { UserStatus, UserType } from 'lwp-shared';

test.describe('Invite parents as teacher (pupil details parents/carer table)', () => {
    let db: Kysely<Schema.DB>;
    let utils: ReturnType<typeof createUtils>;

    test.beforeAll(async () => {
        db = createDb();
        utils = createUtils(db);
    });

    test.afterAll(async () => {
        await db.destroy();
    });

    // A single test runs every scenario against one pupil to avoid re-running the slow
    // createSchoolAndDummyWondeData setup (and re-logging in) per scenario.
    test('Invite parents from the parents/carer table', async ({ page }) => {
        const schoolName = `${generateSchoolName()} School`;
        const leaderFirstName = generateFirstName();
        const leaderLastName = generateLastName();
        const schoolEmail = generateUserEmail(leaderFirstName, leaderLastName);

        const ts = Date.now();

        // New parents to invite by entering details directly
        const emailParentFirstName = generateFirstName();
        const emailParentLastName = generateLastName();
        const emailParentEmail = `parent.${ts}@example.com`;

        const phoneParentFirstName = generateFirstName();
        const phoneParentLastName = generateLastName();
        const phoneParentPhone = `+447700900${String(ts % 1000).padStart(3, '0')}`;

        // Parents that already exist in the system (linked by matching email / phone)
        const existingEmailParentFirstName = generateFirstName();
        const existingEmailParentLastName = generateLastName();
        const existingParentEmail = `existing.parent.${ts}@example.com`;

        const existingPhoneParentFirstName = generateFirstName();
        const existingPhoneParentLastName = generateLastName();
        const existingParentPhone = `+447700901${String(ts % 1000).padStart(3, '0')}`;

        // Seed the school with an active class and an existing pupil (pupils always have parents).
        const result = await createSchoolAndDummyWondeData(
            db,
            utils,
            {
                school: {
                    name: schoolName,
                    numOfFullProgrammeClassesAllowed: 10,
                    numOfTotalClassesAllowed: 30,
                    enableAddClasses: true,
                    isMoneySkillsAvailable: false,
                    isReadyTeddyAvailable: false,
                    isFutureAcademicYear: false
                },
                leader: {
                    firstname: leaderFirstName,
                    lastname: leaderLastName,
                    email: schoolEmail,
                    userStatus: UserStatus.ACTIVE,
                    addTooltip: true
                }
            },
            {
                active: true,
                classLicences: {
                    isFullProgramme: true,
                    IsReadingLogsEnabled: false,
                    isReadyTeddyEnabled: false
                }
            }
        );

        const className = result.class!.name as string;
        const pupilFirstName = result.pupil!.firstname as string;
        const pupilLastName = result.pupil!.lastname as string;

        // Pre-create the two parents that already exist in the system (not linked to this pupil)
        await utils.createUser({
            firstname: existingEmailParentFirstName,
            lastname: existingEmailParentLastName,
            email: existingParentEmail,
            type: UserType.PARENT,
            userStatus: UserStatus.INVITED
        });
        await utils.createUser({
            firstname: existingPhoneParentFirstName,
            lastname: existingPhoneParentLastName,
            email: null,
            phoneNumber: existingParentPhone,
            type: UserType.PARENT,
            userStatus: UserStatus.INVITED
        });

        // Log in as the teacher and navigate to the pupil's Details tab (where the parents/carer table lives)
        await login(page, schoolEmail, password);
        await page.waitForURL(/\/school/);
        await waitForLoading(page);
        await page.getByRole('link', { name: className }).click();
        await page.waitForURL(/\/class/);
        await waitForLoading(page);
        await page.getByTestId('common-nav-pupils-tab').click();
        await waitForLoading(page);
        await page.getByTestId('class-pupil-page-pupil-name').getByText(`${pupilFirstName} ${pupilLastName}`).click();
        await page.waitForURL(/\/pupil\//);
        await waitForLoading(page);
        await page.getByTestId('pupil-details-details-tab').click();
        await waitForLoading(page);

        // Scenario 1: invite a parent with an email only (single contact renders in the shared slot)
        await addParentFromParentsCarerTable(page, {
            firstname: emailParentFirstName,
            lastname: emailParentLastName,
            emailOrPhone: emailParentEmail
        });
        await expect(page.getByTestId('parents-carer-parent-contact-details').getByText(emailParentEmail)).toBeVisible();

        // Scenario 2: invite a parent with a phone number only
        await addParentFromParentsCarerTable(page, {
            firstname: phoneParentFirstName,
            lastname: phoneParentLastName,
            emailOrPhone: phoneParentPhone
        });
        await expect(page.getByTestId('parents-carer-parent-contact-details').getByText(phoneParentPhone)).toBeVisible();

        // Scenario 3: invite a parent who already exists in the system, matched by email (links, no error)
        await addParentFromParentsCarerTable(page, {
            firstname: existingEmailParentFirstName,
            lastname: existingEmailParentLastName,
            emailOrPhone: existingParentEmail
        });
        await expect(page.getByTestId('parents-carer-parent-contact-details').getByText(existingParentEmail)).toBeVisible();

        // Scenario 4: invite a parent who already exists in the system, matched by phone (links, no error)
        await addParentFromParentsCarerTable(page, {
            firstname: existingPhoneParentFirstName,
            lastname: existingPhoneParentLastName,
            emailOrPhone: existingParentPhone
        });
        await expect(page.getByTestId('parents-carer-parent-contact-details').getByText(existingParentPhone)).toBeVisible();

        // Scenario 5: inviting the same parent again to this pupil is rejected
        await page.getByTestId('parents-carer-table-add-parent-button').getByText('Add a parent').click();
        await waitForLoading(page);
        await expect(page.getByTestId('dialog-title-heading')).toContainText('Add a parent');
        await page.getByTestId('add-parent-firstname-input').fill(emailParentFirstName);
        await page.getByTestId('add-parent-lastname-input').fill(emailParentLastName);
        await page.getByTestId('add-parent-email-or-phone-input').fill(emailParentEmail);
        await page.getByRole('button', { name: 'Add parent' }).click();
        await waitForLoading(page);
        // Errors render in the error dialog (not a snackbar); scope by the message as the Add Parent modal stays open
        await expect(
            page.getByTestId('dialog-content').filter({ hasText: `is already listed as one of ${pupilFirstName}` })
        ).toBeVisible();

        // The duplicated parent still appears exactly once in the table
        await expect(
            page.locator('[data-test="parents-carer-parent-name"]', { hasText: `${emailParentFirstName} ${emailParentLastName}` })
        ).toHaveCount(1);
    });
});
