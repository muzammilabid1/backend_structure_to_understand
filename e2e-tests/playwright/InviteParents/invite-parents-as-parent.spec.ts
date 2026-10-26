import { test, expect, type Page } from '@playwright/test';
import type { Schema } from '@lwp/postgres-client';
import { type Kysely } from 'kysely';
import { createDb } from '../db';
import { createUtils } from '../dbUtils';
import {
    generateClassName,
    generateFirstName,
    generateLastName,
    generateSchoolName,
    generateUPN,
    generateUserEmail,
    password
} from '../constants';
import { login, waitForLoading } from '../utils';
import { UserStatus, UserType } from 'lwp-shared';

test.describe('Invite parents as parent (child settings page parents/carer table)', () => {
    let db: Kysely<Schema.DB>;
    let utils: ReturnType<typeof createUtils>;

    test.beforeAll(async () => {
        db = createDb();
        utils = createUtils(db);
    });

    test.afterAll(async () => {
        await db.destroy();
    });

    // The parent view of the parents/carer table shows only the parent firstname + a status badge
    // (no contact-details column), so we assert the success snackbar and the firstname row.
    const inviteParent = async (page: Page, input: { firstname: string; lastname: string; emailOrPhone: string }) => {
        await page.getByTestId('parents-carer-table-add-parent-button').getByText('Add a parent').click();
        await waitForLoading(page);
        await expect(page.getByTestId('dialog-title-heading')).toContainText('Add a parent');
        await page.getByTestId('add-parent-firstname-input').fill(input.firstname);
        await page.getByTestId('add-parent-lastname-input').fill(input.lastname);
        await page.getByTestId('add-parent-email-or-phone-input').fill(input.emailOrPhone);
        await page.getByRole('button', { name: 'Add parent' }).click();
        await waitForLoading(page);
        await expect(
            page.locator('.MuiAlert-message').filter({ hasText: `An invite has been sent to ${input.emailOrPhone}` })
        ).toBeVisible();
        await waitForLoading(page);
        await expect(page.getByTestId('parents-carer-parent-name').getByText(input.firstname, { exact: true })).toBeVisible();
    };

    test('Invite parents from the child settings page', async ({ page }) => {
        const schoolName = `${generateSchoolName()} School`;
        const leaderFirstName = generateFirstName();
        const leaderLastName = generateLastName();
        const schoolEmail = generateUserEmail(leaderFirstName, leaderLastName);
        const className = generateClassName();

        // The logged-in parent (linked to the pupil) who will invite the others
        const inviterFirstName = generateFirstName();
        const inviterLastName = generateLastName();
        const inviterEmail = generateUserEmail(inviterFirstName, inviterLastName);

        const pupilFirstName = generateFirstName();
        const pupilLastName = generateLastName();

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

        const adminUser = await db.selectFrom('lwp_user').where('id', '=', '1').select(['id', 'password']).executeTakeFirstOrThrow();
        const currentPeriod = await db
            .selectFrom('static_lwp_period')
            .where('isCurrentPeriod', '=', true)
            .select('index')
            .executeTakeFirstOrThrow();

        const school = await utils.createSchool({
            schoolName,
            curentPeriodIndex: currentPeriod.index,
            numOfFullProgrammeClassesAllowed: 10,
            numOfTotalClassesAllowed: 30,
            enableAddClasses: true,
            logCreatedById: adminUser.id,
            logUpdatedById: adminUser.id
        });
        const leader = await utils.createUser({
            firstname: leaderFirstName,
            lastname: leaderLastName,
            email: schoolEmail,
            type: UserType.TEACHER,
            userStatus: UserStatus.ACTIVE,
            isSchoolLeader: true,
            schoolId: school.id,
            password: adminUser.password,
            nameForChildren: `Mr ${leaderFirstName}`
        });
        const schoolClass = await utils.createClass(school.id, {
            name: className,
            isRegistrationClass: true,
            isFullProgramme: true,
            mainTeacherId: leader.id,
            yearGroup: 1,
            periodIndex: currentPeriod.index,
            logCreatedById: adminUser.id,
            logUpdatedById: adminUser.id
        });
        const inviter = await utils.createUser({
            firstname: inviterFirstName,
            lastname: inviterLastName,
            email: inviterEmail,
            type: UserType.PARENT,
            userStatus: UserStatus.ACTIVE,
            password: adminUser.password
        });
        const pupil = await utils.createPupil(school.id, {
            firstname: pupilFirstName,
            lastname: pupilLastName,
            dateOfBirth: new Date(),
            startedSchool: '2024',
            isPremium: false,
            gender: 'MALE',
            UPN: generateUPN(),
            logCreatedById: adminUser.id,
            logUpdatedById: adminUser.id
        });
        await utils.addParentToPupil(pupil.id, inviter.id, false);
        await utils.addPupilToClass(pupil.id, schoolClass.id);

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

        // Log in as the parent and open the child settings page (where the parents/carer table lives)
        await login(page, inviterEmail, password);
        await waitForLoading(page);
        await page.goto(`/child/${pupil.id}/settings`);
        await page.waitForURL(/\/settings/);
        await waitForLoading(page);
        await expect(page.getByTestId('child-settings-page-heading')).toBeVisible();

        // Scenario 1: invite a parent with an email only
        await inviteParent(page, {
            firstname: emailParentFirstName,
            lastname: emailParentLastName,
            emailOrPhone: emailParentEmail
        });

        // Scenario 2: invite a parent with a phone number only
        await inviteParent(page, {
            firstname: phoneParentFirstName,
            lastname: phoneParentLastName,
            emailOrPhone: phoneParentPhone
        });

        // Scenario 3: invite a parent who already exists in the system, matched by email (links, no error)
        await inviteParent(page, {
            firstname: existingEmailParentFirstName,
            lastname: existingEmailParentLastName,
            emailOrPhone: existingParentEmail
        });

        // Scenario 4: invite a parent who already exists in the system, matched by phone (links, no error)
        await inviteParent(page, {
            firstname: existingPhoneParentFirstName,
            lastname: existingPhoneParentLastName,
            emailOrPhone: existingParentPhone
        });

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
        await expect(page.getByTestId('dialog-content').filter({ hasText: `is already listed as one of ${pupilFirstName}` })).toBeVisible();

        // The duplicated parent still appears exactly once in the table
        await expect(page.getByTestId('parents-carer-parent-name').getByText(emailParentFirstName, { exact: true })).toHaveCount(1);
    });
});
