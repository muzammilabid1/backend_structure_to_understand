import { test, expect } from '@playwright/test';
import type { Schema } from '@lwp/postgres-client';
import { type Kysely } from 'kysely';
import { createDb } from './db';
import { createUtils } from './dbUtils';
import {
    generateFirstName,
    generateLastName,
    generateSchoolName,
    generateUserEmail,
    password
} from './constants';
import {
    createSchoolAndDummyWondeData,
    getDate,
    getInputBoxByName,
    login,
    safeClick,
    waitForLoading
} from './utils';
import { UserStatus, UserType } from 'lwp-shared';

test.describe('Add Pupil', () => {
    let db: Kysely<Schema.DB>;
    let utils: ReturnType<typeof createUtils>;

    test.beforeAll(async () => {
        db = createDb();
        utils = createUtils(db);
    });

    test.afterAll(async () => {
        await db.destroy();
    });

    test('Add pupil - email-only parent, add, edit, and remove second parent before submission', async ({ page }) => {
        const mySchoolName = `${generateSchoolName()} School`;
        const leaderFirstName = generateFirstName();
        const leaderLastName = generateLastName();
        const schoolEmail = generateUserEmail(leaderFirstName, leaderLastName);

        const pupil2FirstName = generateFirstName();
        const pupil2LastName = generateLastName();

        const ts = Date.now();
        const parentFirstName = generateFirstName();
        const parentLastName = generateLastName();
        const parentEmailForInvitation = `parent.${ts}@example.com`;

        const parent2FirstName = generateFirstName();
        const parent2LastName = generateLastName();
        const parent2EmailForInvitation = `parent2.${ts}@example.com`;
        const parent2PhoneNumberForInvitation = `+447700900${String(ts % 1000).padStart(3, '0')}`;

        const updatedParent2FirstName = `Updated${parent2FirstName}`;
        const updatedParent2LastName = `Updated${parent2LastName}`;
        const updatedParent2EmailForInvitation = `updated.parent2.${ts}@example.com`;
        const updatedParent2PhoneNumberForInvitation = `+447700900${String((ts + 111) % 1000).padStart(3, '0')}`;

        // Create school with active registration class via Wonde data setup
        const result = await createSchoolAndDummyWondeData(
            db,
            utils,
            {
                school: {
                    name: mySchoolName,
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

        const myClassName = result.class!.name as string;

        // Login and navigate to class
        await login(page, schoolEmail, password);
        await page.waitForURL(/\/school/);
        await waitForLoading(page);
        await page.getByRole('link', { name: myClassName }).click();
        await page.waitForURL(/\/class/);
        await waitForLoading(page);

        // Navigate to pupils tab and open add pupil form
        await page.getByTestId('common-nav-pupils-tab').click();
        await waitForLoading(page);
        await safeClick(page.locator('.MuiCardContent-root').getByText('Add pupils'));
        await waitForLoading(page);
        await page.getByTestId('create-pupil-link').click();
        await waitForLoading(page);

        // Fill pupil details
        await getInputBoxByName(page, 'firstName').fill(pupil2FirstName);
        await getInputBoxByName(page, 'lastName').fill(pupil2LastName);
        await getInputBoxByName(page, 'dateOfBirth').fill(getDate());
        await getInputBoxByName(page, 'upn').fill(`LWP_TESTING_${Date.now()}`);
        await page.getByTestId('add-pupil-gender-select').click();
        await page.getByRole('option', { name: 'Male' }).first().click();
        await page.getByTestId('add-pupil-year-group-select').click();
        await page.getByRole('option', { name: 'Year 1' }).click();
        await page.getByTestId('add-pupil-isPremium-select').click();
        await page.getByRole('option', { name: 'No', exact: true }).click();

        // Add first parent
        await page.getByTestId('add-first-parent-for-pupil-button').click();
        await getInputBoxByName(page, 'parentFirstname').fill(parentFirstName);
        await getInputBoxByName(page, 'parentLastname').fill(parentLastName);
        await getInputBoxByName(page, 'email').fill(parentEmailForInvitation);
        await page.getByTestId('add-parent-for-a-pupil-button').click();
        await expect(page.locator('.MuiAlert-message').filter({ hasText: 'Parent details have been added successfully.' })).toBeVisible();

        // Add second parent
        await page.getByTestId('add-more-parents-for-pupil-button').click();
        await getInputBoxByName(page, 'parentFirstname').fill(parent2FirstName);
        await getInputBoxByName(page, 'parentLastname').fill(parent2LastName);
        await getInputBoxByName(page, 'email').fill(parent2EmailForInvitation);
        await getInputBoxByName(page, 'phoneNumber').fill(parent2PhoneNumberForInvitation);
        await page.getByTestId('add-parent-for-a-pupil-button').click();
        await expect(page.locator('.MuiAlert-message').filter({ hasText: 'Parent details have been added successfully.' })).toBeVisible();

        // Verify second parent details appear in the table
        await expect(page.getByTestId('parent-firstname').last()).toContainText(parent2FirstName);
        await expect(page.getByTestId('parent-lastname').last()).toContainText(parent2LastName);
        await expect(page.getByTestId('parent-email').last()).toContainText(parent2EmailForInvitation);
        await expect(page.getByTestId('parent-phoneNumber').last()).toContainText(parent2PhoneNumberForInvitation);

        // Edit second parent
        await page.getByTestId('edit-parent-button').last().click();
        await getInputBoxByName(page, 'parentFirstname').fill(updatedParent2FirstName);
        await getInputBoxByName(page, 'parentLastname').fill(updatedParent2LastName);
        await getInputBoxByName(page, 'email').fill(updatedParent2EmailForInvitation);
        await getInputBoxByName(page, 'phoneNumber').fill(updatedParent2PhoneNumberForInvitation);
        await page.getByTestId('update-parent-for-a-pupil-button').click();
        await expect(page.locator('.MuiAlert-message').filter({ hasText: 'Parent details have been updated successfully.' })).toBeVisible();

        // Verify updated details
        await expect(page.getByTestId('parent-firstname').last()).toContainText(updatedParent2FirstName);
        await expect(page.getByTestId('parent-lastname').last()).toContainText(updatedParent2LastName);
        await expect(page.getByTestId('parent-email').last()).toContainText(updatedParent2EmailForInvitation);
        await expect(page.getByTestId('parent-phoneNumber').last()).toContainText(updatedParent2PhoneNumberForInvitation);

        // Remove second parent
        await page.getByTestId('remove-parent-button').last().click();
        await expect(page.getByTestId('dialog-content')).toContainText(
            'Are you sure you want to remove this parent from this pupil?'
        );
        await page.getByTestId('dialog-primary-btn').click();

        // Verify second parent removed - only first parent row remains
        await expect(page.getByTestId('parent-firstname')).toHaveCount(1);
        await expect(page.getByTestId('parent-lastname')).toHaveCount(1);
        await expect(page.getByTestId('parent-email')).toHaveCount(1);
        await expect(page.getByTestId('parent-phoneNumber')).toHaveCount(1);
        await expect(page.locator('.MuiAlert-message').filter({ hasText: 'Parent has been removed successfully.' })).toBeVisible();

        // Submit pupil and verify in class table
        await page.getByTestId('add-pupil-button').click();
        await waitForLoading(page);
        await expect(page.locator('.MuiAlert-message').filter({ hasText: 'Pupil added.' })).toBeVisible();
        await waitForLoading(page);
        await expect(page.getByTestId('class-pupil-page-pupil-name').getByText(`${pupil2FirstName} ${pupil2LastName}`)).toBeVisible();

        // Navigate to pupil details page and verify parent on Details tab
        await page.getByTestId('class-pupil-page-pupil-name').getByText(`${pupil2FirstName} ${pupil2LastName}`).click();
        await page.waitForURL(/\/pupil\//);
        await waitForLoading(page);
        await page.getByTestId('pupil-details-details-tab').click();
        await waitForLoading(page);
        await expect(
            page.getByTestId('parents-carer-parent-name').getByText(`${parentFirstName} ${parentLastName}`)
        ).toBeVisible();
        await expect(
            page.getByTestId('parents-carer-parent-contact-details').getByText(parentEmailForInvitation)
        ).toBeVisible();
    });

    test('Add pupil - parent with phone number only', async ({ page }) => {
        const mySchoolName = `${generateSchoolName()} School`;
        const leaderFirstName = generateFirstName();
        const leaderLastName = generateLastName();
        const schoolEmail = generateUserEmail(leaderFirstName, leaderLastName);

        const pupilFirstName = generateFirstName();
        const pupilLastName = generateLastName();

        const ts = Date.now();
        const parentFirstName = generateFirstName();
        const parentLastName = generateLastName();
        const parentPhoneNumber = `+447700900${String(ts % 1000).padStart(3, '0')}`;

        const result = await createSchoolAndDummyWondeData(
            db,
            utils,
            {
                school: {
                    name: mySchoolName,
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

        const myClassName = result.class!.name as string;

        await login(page, schoolEmail, password);
        await page.waitForURL(/\/school/);
        await waitForLoading(page);
        await page.getByRole('link', { name: myClassName }).click();
        await page.waitForURL(/\/class/);
        await waitForLoading(page);

        await page.getByTestId('common-nav-pupils-tab').click();
        await waitForLoading(page);
        await safeClick(page.locator('.MuiCardContent-root').getByText('Add pupils'));
        await waitForLoading(page);
        await page.getByTestId('create-pupil-link').click();
        await waitForLoading(page);

        await getInputBoxByName(page, 'firstName').fill(pupilFirstName);
        await getInputBoxByName(page, 'lastName').fill(pupilLastName);
        await getInputBoxByName(page, 'dateOfBirth').fill(getDate());
        await getInputBoxByName(page, 'upn').fill(`LWP_TESTING_${Date.now()}`);
        await page.getByTestId('add-pupil-gender-select').click();
        await page.getByRole('option', { name: 'Male' }).first().click();
        await page.getByTestId('add-pupil-year-group-select').click();
        await page.getByRole('option', { name: 'Year 1' }).click();
        await page.getByTestId('add-pupil-isPremium-select').click();
        await page.getByRole('option', { name: 'No', exact: true }).click();

        // Add parent with phone number only
        await page.getByTestId('add-first-parent-for-pupil-button').click();
        await getInputBoxByName(page, 'parentFirstname').fill(parentFirstName);
        await getInputBoxByName(page, 'parentLastname').fill(parentLastName);
        await getInputBoxByName(page, 'phoneNumber').fill(parentPhoneNumber);
        await page.getByTestId('add-parent-for-a-pupil-button').click();
        await expect(page.locator('.MuiAlert-message').filter({ hasText: 'Parent details have been added successfully.' })).toBeVisible();

        await page.getByTestId('add-pupil-button').click();
        await waitForLoading(page);
        await expect(page.locator('.MuiAlert-message').filter({ hasText: 'Pupil added.' })).toBeVisible();
        await waitForLoading(page);

        await page.getByTestId('class-pupil-page-pupil-name').getByText(`${pupilFirstName} ${pupilLastName}`).click();
        await page.waitForURL(/\/pupil\//);
        await waitForLoading(page);
        await page.getByTestId('pupil-details-details-tab').click();
        await waitForLoading(page);

        await expect(
            page.getByTestId('parents-carer-parent-name').getByText(`${parentFirstName} ${parentLastName}`)
        ).toBeVisible();
        // Phone-only parent uses the shared contact-details slot
        await expect(
            page.getByTestId('parents-carer-parent-contact-details').getByText(parentPhoneNumber)
        ).toBeVisible();
    });

    test('Add pupil - parent with email and phone number', async ({ page }) => {
        const mySchoolName = `${generateSchoolName()} School`;
        const leaderFirstName = generateFirstName();
        const leaderLastName = generateLastName();
        const schoolEmail = generateUserEmail(leaderFirstName, leaderLastName);

        const pupilFirstName = generateFirstName();
        const pupilLastName = generateLastName();

        const ts = Date.now();
        const parentFirstName = generateFirstName();
        const parentLastName = generateLastName();
        const parentEmail = `parent.${ts}@example.com`;
        const parentPhoneNumber = `+447700900${String(ts % 1000).padStart(3, '0')}`;

        const result = await createSchoolAndDummyWondeData(
            db,
            utils,
            {
                school: {
                    name: mySchoolName,
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

        const myClassName = result.class!.name as string;

        await login(page, schoolEmail, password);
        await page.waitForURL(/\/school/);
        await waitForLoading(page);
        await page.getByRole('link', { name: myClassName }).click();
        await page.waitForURL(/\/class/);
        await waitForLoading(page);

        await page.getByTestId('common-nav-pupils-tab').click();
        await waitForLoading(page);
        await safeClick(page.locator('.MuiCardContent-root').getByText('Add pupils'));
        await waitForLoading(page);
        await page.getByTestId('create-pupil-link').click();
        await waitForLoading(page);

        await getInputBoxByName(page, 'firstName').fill(pupilFirstName);
        await getInputBoxByName(page, 'lastName').fill(pupilLastName);
        await getInputBoxByName(page, 'dateOfBirth').fill(getDate());
        await getInputBoxByName(page, 'upn').fill(`LWP_TESTING_${Date.now()}`);
        await page.getByTestId('add-pupil-gender-select').click();
        await page.getByRole('option', { name: 'Male' }).first().click();
        await page.getByTestId('add-pupil-year-group-select').click();
        await page.getByRole('option', { name: 'Year 1' }).click();
        await page.getByTestId('add-pupil-isPremium-select').click();
        await page.getByRole('option', { name: 'No', exact: true }).click();

        // Add parent with both email and phone
        await page.getByTestId('add-first-parent-for-pupil-button').click();
        await getInputBoxByName(page, 'parentFirstname').fill(parentFirstName);
        await getInputBoxByName(page, 'parentLastname').fill(parentLastName);
        await getInputBoxByName(page, 'email').fill(parentEmail);
        await getInputBoxByName(page, 'phoneNumber').fill(parentPhoneNumber);
        await page.getByTestId('add-parent-for-a-pupil-button').click();
        await expect(page.locator('.MuiAlert-message').filter({ hasText: 'Parent details have been added successfully.' })).toBeVisible();

        await page.getByTestId('add-pupil-button').click();
        await waitForLoading(page);
        await expect(page.locator('.MuiAlert-message').filter({ hasText: 'Pupil added.' })).toBeVisible();
        await waitForLoading(page);

        await page.getByTestId('class-pupil-page-pupil-name').getByText(`${pupilFirstName} ${pupilLastName}`).click();
        await page.waitForURL(/\/pupil\//);
        await waitForLoading(page);
        await page.getByTestId('pupil-details-details-tab').click();
        await waitForLoading(page);

        await expect(
            page.getByTestId('parents-carer-parent-name').getByText(`${parentFirstName} ${parentLastName}`)
        ).toBeVisible();
        // When both email and phone exist they render in separate elements
        await expect(page.getByTestId('parents-carer-parent-email').getByText(parentEmail)).toBeVisible();
        await expect(page.getByTestId('parents-carer-parent-phone').getByText(parentPhoneNumber)).toBeVisible();
    });

    test('Add pupil - parent already exists with same email and phone, no error (case 1)', async ({ page }) => {
        const mySchoolName = `${generateSchoolName()} School`;
        const leaderFirstName = generateFirstName();
        const leaderLastName = generateLastName();
        const schoolEmail = generateUserEmail(leaderFirstName, leaderLastName);

        const pupilFirstName = generateFirstName();
        const pupilLastName = generateLastName();

        const ts = Date.now();
        const existingParentFirstName = generateFirstName();
        const existingParentLastName = generateLastName();
        const existingParentEmail = `existing.parent.${ts}@example.com`;
        const existingParentPhone = `+447700900${String(ts % 1000).padStart(3, '0')}`;

        const result = await createSchoolAndDummyWondeData(
            db,
            utils,
            {
                school: {
                    name: mySchoolName,
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

        const myClassName = result.class!.name as string;

        await utils.createUser({
            firstname: existingParentFirstName,
            lastname: existingParentLastName,
            email: existingParentEmail,
            phoneNumber: existingParentPhone,
            type: UserType.PARENT,
            userStatus: UserStatus.INVITED
        });

        await login(page, schoolEmail, password);
        await page.waitForURL(/\/school/);
        await waitForLoading(page);
        await page.getByRole('link', { name: myClassName }).click();
        await page.waitForURL(/\/class/);
        await waitForLoading(page);

        await page.getByTestId('common-nav-pupils-tab').click();
        await waitForLoading(page);
        await safeClick(page.locator('.MuiCardContent-root').getByText('Add pupils'));
        await waitForLoading(page);
        await page.getByTestId('create-pupil-link').click();
        await waitForLoading(page);

        await getInputBoxByName(page, 'firstName').fill(pupilFirstName);
        await getInputBoxByName(page, 'lastName').fill(pupilLastName);
        await getInputBoxByName(page, 'dateOfBirth').fill(getDate());
        await getInputBoxByName(page, 'upn').fill(`LWP_TESTING_${Date.now()}`);
        await page.getByTestId('add-pupil-gender-select').click();
        await page.getByRole('option', { name: 'Male' }).first().click();
        await page.getByTestId('add-pupil-year-group-select').click();
        await page.getByRole('option', { name: 'Year 1' }).click();
        await page.getByTestId('add-pupil-isPremium-select').click();
        await page.getByRole('option', { name: 'No', exact: true }).click();

        await page.getByTestId('add-first-parent-for-pupil-button').click();
        await getInputBoxByName(page, 'parentFirstname').fill(existingParentFirstName);
        await getInputBoxByName(page, 'parentLastname').fill(existingParentLastName);
        await getInputBoxByName(page, 'email').fill(existingParentEmail);
        await getInputBoxByName(page, 'phoneNumber').fill(existingParentPhone);
        await page.getByTestId('add-parent-for-a-pupil-button').click();
        await expect(page.locator('.MuiAlert-message').filter({ hasText: 'Parent details have been added successfully.' })).toBeVisible();

        await page.getByTestId('add-pupil-button').click();
        await waitForLoading(page);
        await expect(page.locator('.MuiAlert-message').filter({ hasText: 'Pupil added.' })).toBeVisible();
        await waitForLoading(page);
        await expect(page.getByTestId('class-pupil-page-pupil-name').getByText(`${pupilFirstName} ${pupilLastName}`)).toBeVisible();

        await page.getByTestId('class-pupil-page-pupil-name').getByText(`${pupilFirstName} ${pupilLastName}`).click();
        await page.waitForURL(/\/pupil\//);
        await waitForLoading(page);
        await page.getByTestId('pupil-details-details-tab').click();
        await waitForLoading(page);
        await expect(
            page.getByTestId('parents-carer-parent-name').getByText(`${existingParentFirstName} ${existingParentLastName}`)
        ).toBeVisible();
        await expect(page.getByTestId('parents-carer-parent-email').getByText(existingParentEmail)).toBeVisible();
        await expect(page.getByTestId('parents-carer-parent-phone').getByText(existingParentPhone)).toBeVisible();
    });

    test('Add pupil - parent already exists with different email and same phone, shows error (case 2)', async ({ page }) => {
        const mySchoolName = `${generateSchoolName()} School`;
        const leaderFirstName = generateFirstName();
        const leaderLastName = generateLastName();
        const schoolEmail = generateUserEmail(leaderFirstName, leaderLastName);

        const pupilFirstName = generateFirstName();
        const pupilLastName = generateLastName();

        const ts = Date.now();
        const existingParentEmail = `existing.parent.${ts}@example.com`;
        const conflictingPhone = `+447700900${String(ts % 1000).padStart(3, '0')}`;
        const differentEmail = `different.parent.${ts}@example.com`;

        const result = await createSchoolAndDummyWondeData(
            db,
            utils,
            {
                school: {
                    name: mySchoolName,
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

        const myClassName = result.class!.name as string;

        await utils.createUser({
            firstname: generateFirstName(),
            lastname: generateLastName(),
            email: existingParentEmail,
            phoneNumber: conflictingPhone,
            type: UserType.PARENT,
            userStatus: UserStatus.INVITED
        });

        await login(page, schoolEmail, password);
        await page.waitForURL(/\/school/);
        await waitForLoading(page);
        await page.getByRole('link', { name: myClassName }).click();
        await page.waitForURL(/\/class/);
        await waitForLoading(page);

        await page.getByTestId('common-nav-pupils-tab').click();
        await waitForLoading(page);
        await safeClick(page.locator('.MuiCardContent-root').getByText('Add pupils'));
        await waitForLoading(page);
        await page.getByTestId('create-pupil-link').click();
        await waitForLoading(page);

        await getInputBoxByName(page, 'firstName').fill(pupilFirstName);
        await getInputBoxByName(page, 'lastName').fill(pupilLastName);
        await getInputBoxByName(page, 'dateOfBirth').fill(getDate());
        await getInputBoxByName(page, 'upn').fill(`LWP_TESTING_${Date.now()}`);
        await page.getByTestId('add-pupil-gender-select').click();
        await page.getByRole('option', { name: 'Male' }).first().click();
        await page.getByTestId('add-pupil-year-group-select').click();
        await page.getByRole('option', { name: 'Year 1' }).click();
        await page.getByTestId('add-pupil-isPremium-select').click();
        await page.getByRole('option', { name: 'No', exact: true }).click();

        await page.getByTestId('add-first-parent-for-pupil-button').click();
        await getInputBoxByName(page, 'parentFirstname').fill(generateFirstName());
        await getInputBoxByName(page, 'parentLastname').fill(generateLastName());
        await getInputBoxByName(page, 'email').fill(differentEmail);
        await getInputBoxByName(page, 'phoneNumber').fill(conflictingPhone);
        await page.getByTestId('add-parent-for-a-pupil-button').click();
        await expect(page.locator('.MuiAlert-message').filter({ hasText: 'Parent details have been added successfully.' })).toBeVisible();

        await page.getByTestId('add-pupil-button').click();
        await waitForLoading(page);
        await expect(page.getByTestId('dialog-content')).toContainText('Phone number is already in use.');
    });

    test('Add pupil - parent already exists with phone only, re-added with email and same phone, no error (case 3)', async ({ page }) => {
        const mySchoolName = `${generateSchoolName()} School`;
        const leaderFirstName = generateFirstName();
        const leaderLastName = generateLastName();
        const schoolEmail = generateUserEmail(leaderFirstName, leaderLastName);

        const pupilFirstName = generateFirstName();
        const pupilLastName = generateLastName();

        const ts = Date.now();
        const existingParentFirstName = generateFirstName();
        const existingParentLastName = generateLastName();
        const existingParentPhone = `+447700900${String(ts % 1000).padStart(3, '0')}`;
        const newEmail = `new.email.${ts}@example.com`;

        const result = await createSchoolAndDummyWondeData(
            db,
            utils,
            {
                school: {
                    name: mySchoolName,
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

        const myClassName = result.class!.name as string;

        await utils.createUser({
            firstname: existingParentFirstName,
            lastname: existingParentLastName,
            email: null,
            phoneNumber: existingParentPhone,
            type: UserType.PARENT,
            userStatus: UserStatus.INVITED
        });

        await login(page, schoolEmail, password);
        await page.waitForURL(/\/school/);
        await waitForLoading(page);
        await page.getByRole('link', { name: myClassName }).click();
        await page.waitForURL(/\/class/);
        await waitForLoading(page);

        await page.getByTestId('common-nav-pupils-tab').click();
        await waitForLoading(page);
        await safeClick(page.locator('.MuiCardContent-root').getByText('Add pupils'));
        await waitForLoading(page);
        await page.getByTestId('create-pupil-link').click();
        await waitForLoading(page);

        await getInputBoxByName(page, 'firstName').fill(pupilFirstName);
        await getInputBoxByName(page, 'lastName').fill(pupilLastName);
        await getInputBoxByName(page, 'dateOfBirth').fill(getDate());
        await getInputBoxByName(page, 'upn').fill(`LWP_TESTING_${Date.now()}`);
        await page.getByTestId('add-pupil-gender-select').click();
        await page.getByRole('option', { name: 'Male' }).first().click();
        await page.getByTestId('add-pupil-year-group-select').click();
        await page.getByRole('option', { name: 'Year 1' }).click();
        await page.getByTestId('add-pupil-isPremium-select').click();
        await page.getByRole('option', { name: 'No', exact: true }).click();

        await page.getByTestId('add-first-parent-for-pupil-button').click();
        await getInputBoxByName(page, 'parentFirstname').fill(existingParentFirstName);
        await getInputBoxByName(page, 'parentLastname').fill(existingParentLastName);
        await getInputBoxByName(page, 'email').fill(newEmail);
        await getInputBoxByName(page, 'phoneNumber').fill(existingParentPhone);
        await page.getByTestId('add-parent-for-a-pupil-button').click();
        await expect(page.locator('.MuiAlert-message').filter({ hasText: 'Parent details have been added successfully.' })).toBeVisible();

        await page.getByTestId('add-pupil-button').click();
        await waitForLoading(page);
        await expect(page.locator('.MuiAlert-message').filter({ hasText: 'Pupil added.' })).toBeVisible();
        await waitForLoading(page);
        await expect(page.getByTestId('class-pupil-page-pupil-name').getByText(`${pupilFirstName} ${pupilLastName}`)).toBeVisible();

        await page.getByTestId('class-pupil-page-pupil-name').getByText(`${pupilFirstName} ${pupilLastName}`).click();
        await page.waitForURL(/\/pupil\//);
        await waitForLoading(page);
        await page.getByTestId('pupil-details-details-tab').click();
        await waitForLoading(page);
        await expect(
            page.getByTestId('parents-carer-parent-name').getByText(`${existingParentFirstName} ${existingParentLastName}`)
        ).toBeVisible();
        await expect(
            page.getByTestId('parents-carer-parent-contact-details').getByText(existingParentPhone)
        ).toBeVisible();
    });

    test('Add pupil - parent already exists with same email and different phone, no error, original phone retained (known gap)', async ({ page }) => {
        const mySchoolName = `${generateSchoolName()} School`;
        const leaderFirstName = generateFirstName();
        const leaderLastName = generateLastName();
        const schoolEmail = generateUserEmail(leaderFirstName, leaderLastName);

        const pupilFirstName = generateFirstName();
        const pupilLastName = generateLastName();

        const ts = Date.now();
        const existingParentFirstName = generateFirstName();
        const existingParentLastName = generateLastName();
        const existingParentEmail = `existing.parent.${ts}@example.com`;
        const existingParentPhone = `+447700900${String(ts % 1000).padStart(3, '0')}`;
        const differentPhone = `+447700901${String(ts % 1000).padStart(3, '0')}`;

        const result = await createSchoolAndDummyWondeData(
            db,
            utils,
            {
                school: {
                    name: mySchoolName,
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

        const myClassName = result.class!.name as string;

        await utils.createUser({
            firstname: existingParentFirstName,
            lastname: existingParentLastName,
            email: existingParentEmail,
            phoneNumber: existingParentPhone,
            type: UserType.PARENT,
            userStatus: UserStatus.INVITED
        });

        await login(page, schoolEmail, password);
        await page.waitForURL(/\/school/);
        await waitForLoading(page);
        await page.getByRole('link', { name: myClassName }).click();
        await page.waitForURL(/\/class/);
        await waitForLoading(page);

        await page.getByTestId('common-nav-pupils-tab').click();
        await waitForLoading(page);
        await safeClick(page.locator('.MuiCardContent-root').getByText('Add pupils'));
        await waitForLoading(page);
        await page.getByTestId('create-pupil-link').click();
        await waitForLoading(page);

        await getInputBoxByName(page, 'firstName').fill(pupilFirstName);
        await getInputBoxByName(page, 'lastName').fill(pupilLastName);
        await getInputBoxByName(page, 'dateOfBirth').fill(getDate());
        await getInputBoxByName(page, 'upn').fill(`LWP_TESTING_${Date.now()}`);
        await page.getByTestId('add-pupil-gender-select').click();
        await page.getByRole('option', { name: 'Male' }).first().click();
        await page.getByTestId('add-pupil-year-group-select').click();
        await page.getByRole('option', { name: 'Year 1' }).click();
        await page.getByTestId('add-pupil-isPremium-select').click();
        await page.getByRole('option', { name: 'No', exact: true }).click();

        await page.getByTestId('add-first-parent-for-pupil-button').click();
        await getInputBoxByName(page, 'parentFirstname').fill(existingParentFirstName);
        await getInputBoxByName(page, 'parentLastname').fill(existingParentLastName);
        await getInputBoxByName(page, 'email').fill(existingParentEmail);
        await getInputBoxByName(page, 'phoneNumber').fill(differentPhone);
        await page.getByTestId('add-parent-for-a-pupil-button').click();
        await expect(page.locator('.MuiAlert-message').filter({ hasText: 'Parent details have been added successfully.' })).toBeVisible();

        await page.getByTestId('add-pupil-button').click();
        await waitForLoading(page);
        await expect(page.locator('.MuiAlert-message').filter({ hasText: 'Pupil added.' })).toBeVisible();
        await waitForLoading(page);
        await expect(page.getByTestId('class-pupil-page-pupil-name').getByText(`${pupilFirstName} ${pupilLastName}`)).toBeVisible();

        await page.getByTestId('class-pupil-page-pupil-name').getByText(`${pupilFirstName} ${pupilLastName}`).click();
        await page.waitForURL(/\/pupil\//);
        await waitForLoading(page);
        await page.getByTestId('pupil-details-details-tab').click();
        await waitForLoading(page);
        await expect(
            page.getByTestId('parents-carer-parent-name').getByText(`${existingParentFirstName} ${existingParentLastName}`)
        ).toBeVisible();
        await expect(page.getByTestId('parents-carer-parent-email').getByText(existingParentEmail)).toBeVisible();
        // The original phone is retained - differentPhone entered in the form is discarded
        await expect(page.getByTestId('parents-carer-parent-phone').getByText(existingParentPhone)).toBeVisible();
    });
});
