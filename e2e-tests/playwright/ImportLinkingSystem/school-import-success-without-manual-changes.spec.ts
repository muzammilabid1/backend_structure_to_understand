import { test, expect } from '@playwright/test';
import path from 'path';
import type { Schema } from '@lwp/postgres-client';
import { type Kysely } from 'kysely';
import { admin, generateFirstName, generateLastName, generateSchoolName, generateUserEmail, password } from '../constants';
import { acceptFeatureTooltipPrompt, adminOrTeacherSignOut, login, openSideDrawer, safeClick, waitForLoading } from '../utils';
import { createDb } from '../db';
import { createUtils } from '../dbUtils';
import { FeatureCode, FeatureStatus, UserStatus, UserType } from 'lwp-shared';
import { gryffindorPupils, hufflepuffBPupils, hufflepuffPupils, ravenclawPupils, slytherinPupils } from './pupil_parent_info';

test.describe('School Import : Successful Import Without Manual Changes', () => {
    let db: Kysely<Schema.DB>;
    let utils: ReturnType<typeof createUtils>;
    let schoolId: string | null = null;
    let leaderId: string | null = null;
    const classIds: string[] = [];
    const pupilIds: string[] = [];
    const parentIds: string[] = [];

    test.beforeAll(async () => {
        db = createDb();
        utils = createUtils(db);

        await db
            .updateTable('static_lwp_features')
            .set({ status: FeatureStatus.ALL_SCHOOLS })
            .where('code', '=', FeatureCode.DATA_IMPORT_REVIEW)
            .execute();
    });
    test.afterAll(async () => {
        await db
            .updateTable('static_lwp_features')
            .set({ status: FeatureStatus.NO_SCHOOLS })
            .where('code', '=', FeatureCode.DATA_IMPORT_REVIEW)
            .execute();

        await dataCleanup(utils, { schoolId, leaderId, classIds, pupilIds, parentIds });

        await db.destroy();
    });

    test('Should upload CSV in a school and complete import successfully without any manual changes', async ({ page }) => {
        const mySchoolName = `${generateSchoolName()} School`;
        const myClassName = 'Gryffindor';
        const myClass2Name = 'Slytherin';
        const myClass3Name = 'Ravenclaw';
        const myClass4Name = 'Hufflepuff';
        const myClass5Name = 'Hufflepuff B';
        const leaderFirstName: string = generateFirstName();
        const leaderlastName: string = generateLastName();
        const leaderEmail: string = generateUserEmail(leaderFirstName, leaderlastName);

        const currentPeriod = await db
            .selectFrom('static_lwp_period')
            .where('isCurrentPeriod', '=', true)
            .select('index')
            .executeTakeFirstOrThrow();
        const user = await db.selectFrom('lwp_user').where('id', '=', '1').select(['id', 'password']).executeTakeFirstOrThrow();
        const school = await utils.createSchool({
            schoolName: mySchoolName,
            curentPeriodIndex: currentPeriod.index,
            numOfFullProgrammeClassesAllowed: 10,
            numOfTotalClassesAllowed: 30,
            logCreatedById: user.id,
            logUpdatedById: user.id
        });
        schoolId = school.id;
        const leader = await utils.createUser({
            firstname: leaderFirstName,
            lastname: leaderlastName,
            email: leaderEmail,
            type: UserType.TEACHER,
            userStatus: UserStatus.ACTIVE,
            isSchoolLeader: true,
            schoolId: school.id,
            password: user.password,
            nameForChildren: `Mr ${leaderFirstName}`
        });
        leaderId = leader.id;
        const class1 = await utils.createClass(school.id, {
            name: myClassName,
            isRegistrationClass: true,
            isFullProgramme: true,
            IsReadingLogsEnabled: false,
            mainTeacherId: leader.id,
            yearGroup: 1,
            periodIndex: currentPeriod.index,
            logCreatedById: user.id,
            logUpdatedById: user.id
        });
        classIds.push(class1.id);
        const class2 = await utils.createClass(school.id, {
            name: myClass2Name,
            isRegistrationClass: true,
            isFullProgramme: true,
            IsReadingLogsEnabled: false,
            mainTeacherId: leader.id,
            yearGroup: 1,
            periodIndex: currentPeriod.index,
            logCreatedById: user.id,
            logUpdatedById: user.id
        });
        classIds.push(class2.id);
        const class3 = await utils.createClass(school.id, {
            name: myClass3Name,
            isRegistrationClass: true,
            isFullProgramme: true,
            IsReadingLogsEnabled: false,
            mainTeacherId: leader.id,
            yearGroup: 1,
            periodIndex: currentPeriod.index,
            logCreatedById: user.id,
            logUpdatedById: user.id
        });
        classIds.push(class3.id);
        const class4 = await utils.createClass(school.id, {
            name: myClass4Name,
            isRegistrationClass: true,
            isFullProgramme: true,
            IsReadingLogsEnabled: false,
            mainTeacherId: leader.id,
            yearGroup: 1,
            periodIndex: currentPeriod.index,
            logCreatedById: user.id,
            logUpdatedById: user.id
        });
        classIds.push(class4.id);
        const class5 = await utils.createClass(school.id, {
            name: myClass5Name,
            isRegistrationClass: true,
            isFullProgramme: true,
            IsReadingLogsEnabled: false,
            mainTeacherId: leader.id,
            yearGroup: 1,
            periodIndex: currentPeriod.index,
            logCreatedById: user.id,
            logUpdatedById: user.id
        });
        classIds.push(class4.id);

        for (const student of gryffindorPupils) {
            const pupil = await utils.createPupil(school.id, {
                firstname: student.forename,
                lastname: student.surname,
                dateOfBirth: new Date(student.dateOfBirth),
                startedSchool: (currentPeriod.index - student.ncYear).toString(),
                isPremium: student.pupilPremiumStatus,
                gender: student.gender,
                schoolId: school.id,
                UPN: student.upn,
                logCreatedById: user.id,
                logUpdatedById: user.id
            });
            pupilIds.push(pupil.id);

            for (const contact of student.parents) {
                const parent = await utils.createUser({
                    firstname: contact.forename,
                    lastname: contact.surname,
                    email: contact.email,
                    type: UserType.PARENT,
                    userStatus: UserStatus.ACTIVE,
                    password: user.password
                });
                await utils.addParentToPupil(pupil.id, parent.id, false);
                parentIds.push(parent.id);
            }
            await utils.addPupilToClass(pupil.id, class1.id);
        }
        for (const student of slytherinPupils) {
            const pupil = await utils.createPupil(school.id, {
                firstname: student.forename,
                lastname: student.surname,
                dateOfBirth: new Date(student.dateOfBirth),
                startedSchool: (currentPeriod.index - student.ncYear).toString(),
                isPremium: student.pupilPremiumStatus,
                gender: student.gender,
                schoolId: school.id,
                UPN: student.upn,
                logCreatedById: user.id,
                logUpdatedById: user.id
            });
            pupilIds.push(pupil.id);

            for (const contact of student.parents) {
                const parent = await utils.createUser({
                    firstname: contact.forename,
                    lastname: contact.surname,
                    email: contact.email,
                    type: UserType.PARENT,
                    userStatus: UserStatus.ACTIVE,
                    password: user.password
                });
                await utils.addParentToPupil(pupil.id, parent.id, false);
                parentIds.push(parent.id);
            }
            await utils.addPupilToClass(pupil.id, class2.id);
        }
        for (const student of ravenclawPupils) {
            const pupil = await utils.createPupil(school.id, {
                firstname: student.forename,
                lastname: student.surname,
                dateOfBirth: new Date(student.dateOfBirth),
                startedSchool: (currentPeriod.index - student.ncYear).toString(),
                isPremium: student.pupilPremiumStatus,
                gender: student.gender,
                schoolId: school.id,
                UPN: student.upn,
                logCreatedById: user.id,
                logUpdatedById: user.id
            });
            pupilIds.push(pupil.id);

            for (const contact of student.parents) {
                const parent = await utils.createUser({
                    firstname: contact.forename,
                    lastname: contact.surname,
                    email: contact.email,
                    type: UserType.PARENT,
                    userStatus: UserStatus.ACTIVE,
                    password: user.password
                });
                await utils.addParentToPupil(pupil.id, parent.id, false);
                parentIds.push(parent.id);
            }
            await utils.addPupilToClass(pupil.id, class3.id);
        }
        for (const student of hufflepuffPupils) {
            const pupil = await utils.createPupil(school.id, {
                firstname: student.forename,
                lastname: student.surname,
                dateOfBirth: new Date(student.dateOfBirth),
                startedSchool: (currentPeriod.index - student.ncYear).toString(),
                isPremium: student.pupilPremiumStatus,
                gender: student.gender,
                schoolId: school.id,
                UPN: student.upn,
                logCreatedById: user.id,
                logUpdatedById: user.id
            });
            pupilIds.push(pupil.id);

            for (const contact of student.parents) {
                const parent = await utils.createUser({
                    firstname: contact.forename,
                    lastname: contact.surname,
                    email: contact.email,
                    type: UserType.PARENT,
                    userStatus: UserStatus.ACTIVE,
                    password: user.password
                });
                await utils.addParentToPupil(pupil.id, parent.id, false);
                parentIds.push(parent.id);
            }
            await utils.addPupilToClass(pupil.id, class4.id);
        }
        for (const student of hufflepuffBPupils) {
            const pupil = await utils.createPupil(school.id, {
                firstname: student.forename,
                lastname: student.surname,
                dateOfBirth: new Date(student.dateOfBirth),
                startedSchool: (currentPeriod.index - student.ncYear).toString(),
                isPremium: student.pupilPremiumStatus,
                gender: student.gender,
                schoolId: school.id,
                UPN: student.upn,
                logCreatedById: user.id,
                logUpdatedById: user.id
            });
            pupilIds.push(pupil.id);

            for (const contact of student.parents) {
                const parent = await utils.createUser({
                    firstname: contact.forename,
                    lastname: contact.surname,
                    email: contact.email,
                    type: UserType.PARENT,
                    userStatus: UserStatus.ACTIVE,
                    password: user.password
                });
                await utils.addParentToPupil(pupil.id, parent.id, false);
                parentIds.push(parent.id);
            }
            await utils.addPupilToClass(pupil.id, class5.id);
        }

        await login(page, admin, password);
        await page.waitForURL(/\/admin/);
        await waitForLoading(page);
        await openSideDrawer(page);
        await page.getByRole('link', { name: 'Schools' }).click();
        await waitForLoading(page);
        await safeClick(page.locator('[data-testid="school-details-link"]', { hasText: mySchoolName }));
        await page.waitForURL(/\/school/);
        await waitForLoading(page);
        await page.getByText('CSV import', { exact: true }).click();
        const filePath = path.resolve(__dirname, '../fixtures/hogwarts-school-import.csv');
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
        await adminOrTeacherSignOut(page);
        await login(page, leaderEmail, password);
        await page.waitForURL(/\/school/);
        await waitForLoading(page);
        await expect(page.getByTestId('common-drawer-list')).toBeVisible();
        await openSideDrawer(page);
        await expect(page.getByTestId('school-overview-page')).toBeVisible();
        await acceptFeatureTooltipPrompt(page);
        await page.getByTestId('school-settings').click();
        await page.waitForURL(/\/school\/\d+\/settings/);
        await waitForLoading(page);
        await page.getByTestId('school-settings-data-changes').click();
        await page.waitForURL(/\/school\/\d+\/data-changes/);
        await waitForLoading(page);
        await expect(page.getByTestId('data-changes-last-import-title')).toContainText('No remaining changes');
        await expect(page.getByText('The last import succeeded')).toBeVisible();
        await page.getByRole('link', { name: 'School overview' }).click();
        await page.waitForURL(/\/school/);
        await waitForLoading(page);
        await page.getByTestId('registration-classes').getByText(myClassName).click();
        await page.waitForURL(/\/class\/\d+\/pupils/);
        await waitForLoading(page);
        await page.mouse.move(0, 0);
        for (const pupil of gryffindorPupils) {
            await expect(page.getByTestId(`class-pupil-page-pupil-name`).getByText(`${pupil.forename} ${pupil.surname}`)).toBeVisible();
        }
        await page.getByRole('link', { name: 'School overview' }).click();
        await page.waitForURL(/\/school/);
        await waitForLoading(page);
        await page.getByTestId('registration-classes').getByText(myClass2Name).click();
        await page.waitForURL(/\/class\/\d+\/pupils/);
        await waitForLoading(page);
        await page.mouse.move(0, 0);
        for (const pupil of slytherinPupils) {
            await expect(page.getByTestId(`class-pupil-page-pupil-name`).getByText(`${pupil.forename} ${pupil.surname}`)).toBeVisible();
        }
        await page.getByRole('link', { name: 'School overview' }).click();
        await page.waitForURL(/\/school/);
        await waitForLoading(page);
        await page.getByTestId('registration-classes').getByText(myClass3Name).click();
        await page.waitForURL(/\/class\/\d+\/pupils/);
        await waitForLoading(page);
        await page.mouse.move(0, 0);
        for (const pupil of ravenclawPupils) {
            await expect(page.getByTestId(`class-pupil-page-pupil-name`).getByText(`${pupil.forename} ${pupil.surname}`)).toBeVisible();
        }
        await page.getByRole('link', { name: 'School overview' }).click();
        await page.waitForURL(/\/school/);
        await waitForLoading(page);
        await page.getByTestId('registration-classes').getByText(myClass4Name, { exact: true }).click();
        await page.waitForURL(/\/class\/\d+\/pupils/);
        await waitForLoading(page);
        await page.mouse.move(0, 0);
        for (const pupil of hufflepuffPupils) {
            await expect(page.getByTestId(`class-pupil-page-pupil-name`).getByText(`${pupil.forename} ${pupil.surname}`)).toBeVisible();
        }
        await page.getByRole('link', { name: 'School overview' }).click();
        await page.waitForURL(/\/school/);
        await waitForLoading(page);
        await page.getByTestId('registration-classes').getByText(myClass5Name, { exact: true }).click();
        await page.waitForURL(/\/class\/\d+\/pupils/);
        await waitForLoading(page);
        await page.mouse.move(0, 0);
        for (const pupil of hufflepuffBPupils) {
            await expect(page.getByTestId(`class-pupil-page-pupil-name`).getByText(`${pupil.forename} ${pupil.surname}`)).toBeVisible();
        }
    });
});

const dataCleanup = async (
    utils: ReturnType<typeof createUtils>,
    entityInfo: {
        schoolId?: string | null;
        leaderId?: string | null;
        classIds: string[];
        pupilIds: string[];
        parentIds: string[];
    }
) => {
    for (const classId of entityInfo.classIds) {
        await utils.deleteClass(classId);
    }
    for (const parentId of entityInfo.parentIds) {
        await utils.deleteUser(parentId);
    }
    for (const pupilId of entityInfo.pupilIds) {
        await utils.deletePupil(pupilId);
    }
    if (entityInfo.leaderId) {
        await utils.deleteUser(entityInfo.leaderId);
    }
    if (entityInfo.schoolId) {
        await utils.deleteSchool(entityInfo.schoolId);
        await utils.deleteSchoolProposedLinks(entityInfo.schoolId);
        await utils.deleteSchoolProposedChanges(entityInfo.schoolId);
    }
};
