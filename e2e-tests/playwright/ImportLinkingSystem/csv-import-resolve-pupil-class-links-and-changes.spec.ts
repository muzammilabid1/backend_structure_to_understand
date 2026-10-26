import { test, expect } from '@playwright/test';
import path from 'path';
import type { Schema } from '@lwp/postgres-client';
import { type Kysely } from 'kysely';
import { admin, generateFirstName, generateLastName, generateSchoolName, generateUserEmail, password } from '../constants';
import { acceptFeatureTooltipPrompt, adminOrTeacherSignOut, login, openSideDrawer, safeClick, waitForLoading } from '../utils';
import { createDb } from '../db';
import { createUtils } from '../dbUtils';
import { FeatureCode, FeatureStatus, UserStatus, UserType } from 'lwp-shared';
import { gryffindorPupils, hufflepuffPupils, ravenclawPupils, slytherinPupils } from './pupil_parent_info';

test.describe('CSV Import - Resolve Pupil & Class Links and Pupil Changes', () => {
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

    test('Uploads a CSV and resolves pupil links, class links, and pupil changes to complete import successfully', async ({ page }) => {
        const mySchoolName = `${generateSchoolName()} School`;
        const myClassName = 'Gryffindor';
        const myClass2Name = 'Slytherin';
        const myClass3Name = 'Ravenclaw';
        const myClass4Name = 'Hufflepuff';
        const myClass5Name = 'Hufflepuff B';
        const leaderFirstName: string = generateFirstName();
        const leaderlastName: string = generateLastName();
        const leaderEmail: string = generateUserEmail(leaderFirstName, leaderlastName);
        const harryPotter = {
            forename: 'Harry',
            surname: 'Potter',
            oldForename: 'Harold'
        };
        const hermioneGranger = {
            forename: 'Hermione',
            surname: 'Granger',
            oldLastName: 'Grangerson'
        };
        const ronWeasley = {
            forename: 'Ron',
            surname: 'Weasley',
            newDateOfBirth: new Date('02/03/09')
        };
        const dracoMalfoy = {
            forename: 'Draco',
            surname: 'Malfoy',
            newUPN: 'UPN004X'
        };
        const pansyParkinson = {
            forename: 'Pansy',
            surname: 'Parkinson',
            newForename: 'Pansie'
        };
        const blaiseZabini = {
            forename: 'Blaise',
            surname: 'Zabini',
            newLastname: 'Zabinison'
        };
        const susanBones = {
            forename: 'Susan',
            surname: 'Bones'
        };
        const justinFletchley = {
            forename: 'Justin',
            surname: 'Fletchley'
        };
        const zachariasSmith = {
            forename: 'Zacharias',
            surname: 'Smith'
        };
        const cedricDiggory = {
            forename: 'Cedric',
            surname: 'Diggory'
        };
        const hannahAbbott = {
            forename: 'Hannah',
            surname: 'Abbott'
        };
        const ernieMacmillan = {
            forename: 'Ernie',
            surname: 'Macmillan'
        };

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

        for (const student of gryffindorPupils) {
            const pupil = await utils.createPupil(school.id, {
                firstname: student.forename === harryPotter.forename ? harryPotter.oldForename : student.forename,
                lastname: student.forename === hermioneGranger.forename ? hermioneGranger.oldLastName : student.surname,
                dateOfBirth: student.forename === ronWeasley.forename ? new Date(ronWeasley.newDateOfBirth) : new Date(student.dateOfBirth),
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

        for (const student of slytherinPupils) {
            const pupil = await utils.createPupil(school.id, {
                firstname: student.forename === pansyParkinson.forename ? pansyParkinson.newForename : student.forename,
                lastname: student.forename === blaiseZabini.forename ? blaiseZabini.newLastname : student.surname,
                dateOfBirth: new Date(student.dateOfBirth),
                startedSchool: (currentPeriod.index - student.ncYear).toString(),
                isPremium: student.pupilPremiumStatus,
                gender: student.gender,
                schoolId: school.id,
                UPN: student.forename === dracoMalfoy.forename ? dracoMalfoy.newUPN : student.upn,
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

        const class3 = await utils.createClass(school.id, {
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
        classIds.push(class3.id);

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
        await expect(page.locator('.school-wonde-status')).toContainText('Linking pupils');
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
        await expect(page.getByTestId('link-pupils-page')).toBeVisible();
        await page.getByTestId(`imported-student-name-${harryPotter.forename}-${harryPotter.surname}`).click();
        await waitForLoading(page);
        await page.locator('.pupil-first-name').waitFor({ state: 'visible' });
        const harryPotterPupilDetails = gryffindorPupils.find(
            (student) => student.forename === harryPotter.forename && student.surname === harryPotter.surname
        );
        if (harryPotterPupilDetails) {
            await expect(page.locator('.pupil-first-name').getByText(`${harryPotterPupilDetails.forename}`)).toBeVisible();
            await expect(page.locator('.pupil-last-name').getByText(`${harryPotterPupilDetails.surname}`)).toBeVisible();
            await expect(page.locator('.pupil-class').getByText(`${myClassName}`)).toBeVisible();
            await expect(page.locator('.pupil-upn').getByText(`${harryPotterPupilDetails.upn}`)).toBeVisible();
            await expect(page.locator('.pupil-gender').getByText(`${harryPotterPupilDetails.gender}`)).toBeVisible();
            await expect(page.locator('.pupil-year-group').getByText(`${harryPotterPupilDetails.ncYear}`)).toBeVisible();
            await page.getByTestId('pupil-details-modal-close-button').click();
            await page.getByTestId(`imported-student-compare-icon-${harryPotter.forename}-${harryPotter.surname}`).click();
            await waitForLoading(page);
            await page.locator('.pupil-first-name').first().waitFor({ state: 'visible' });
            await expect(page.locator('.pupil-first-name').getByText(`${harryPotterPupilDetails.forename}`).first()).toBeVisible();
            await expect(page.locator('.pupil-last-name').getByText(`${harryPotterPupilDetails.surname}`).first()).toBeVisible();
            await expect(page.locator('.pupil-class').getByText(`${myClassName}`).first()).toBeVisible();
            await expect(page.locator('.pupil-upn').getByText(`${harryPotterPupilDetails.upn}`).first()).toBeVisible();
            await expect(page.locator('.pupil-gender').getByText(`${harryPotterPupilDetails.gender}`).first()).toBeVisible();
            await expect(page.locator('.pupil-year-group').getByText(`${harryPotterPupilDetails.ncYear}`).first()).toBeVisible();
            await expect(page.locator('.pupil-first-name').getByText(`${harryPotter.oldForename}`).last()).toBeVisible();
            await expect(page.locator('.pupil-last-name').getByText(`${harryPotterPupilDetails.surname}`).last()).toBeVisible();
            await expect(page.locator('.pupil-class').getByText(`${myClassName}`).last()).toBeVisible();
            await expect(page.locator('.pupil-upn').getByText(`${harryPotterPupilDetails.upn}`).last()).toBeVisible();
            await expect(page.locator('.pupil-gender').getByText(`${harryPotterPupilDetails.gender}`).last()).toBeVisible();
            await expect(page.locator('.pupil-year-group').getByText(`${harryPotterPupilDetails.ncYear}`).last()).toBeVisible();
            await page.getByTestId('compare-pupil-details-drawer-close-button').click();
        }
        await waitForLoading(page);
        await page.getByTestId(`platform-pupil-select-${cedricDiggory.forename}-${cedricDiggory.surname}`).click();
        await page.getByRole('option', { name: 'Ignore this pupil' }).click();
        await page.getByTestId(`platform-pupil-select-${hannahAbbott.forename}-${hannahAbbott.surname}`).click();
        await page.getByRole('option', { name: 'Ignore this pupil' }).click();
        await page.getByTestId(`platform-pupil-select-${ernieMacmillan.forename}-${ernieMacmillan.surname}`).click();
        await page.getByRole('option', { name: 'Ignore this pupil' }).click();
        await page.getByTestId(`platform-pupil-select-${susanBones.forename}-${susanBones.surname}`).click();
        await page.getByRole('option', { name: 'Ignore this pupil' }).click();
        await page.getByTestId(`platform-pupil-select-${zachariasSmith.forename}-${zachariasSmith.surname}`).click();
        await page.getByRole('option', { name: 'Ignore this pupil' }).click();
        await page.getByTestId(`platform-pupil-select-${justinFletchley.forename}-${justinFletchley.surname}`).click();
        await page.getByRole('option', { name: 'Ignore this pupil' }).click();
        await page.getByTestId('link-pupils-button').click();
        await waitForLoading(page);
        await expect(
            page.locator('.MuiAlert-message').filter({ hasText: 'External pupils linked successfully with LWP pupils' })
        ).toBeVisible();
        await waitForLoading(page);
        await expect(page.getByTestId('link-classes-page')).toBeVisible();
        await page.getByTestId(`imported-class-name-${myClass3Name}`).click();
        await waitForLoading(page);
        for (const student of ravenclawPupils) {
            await expect(page.getByTestId(`pupils-in-class-${student.forename}-${student.surname}`)).toBeVisible();
        }
        await page.getByTestId(`compare-details-drawer-close-button`).click();
        await page.getByTestId(`imported-class-name-${myClass4Name}`).click();
        for (const student of hufflepuffPupils) {
            await expect(page.getByTestId(`pupils-in-class-${student.forename}-${student.surname}`)).toBeVisible();
        }
        await page.getByTestId(`compare-details-drawer-close-button`).click();
        await page.getByTestId(`platform-class-select-${myClass3Name}`).click();
        await page.getByRole('option', { name: 'No existing class' }).click();
        await page.getByTestId(`platform-class-select-${myClass5Name}`).click();
        await page.getByRole('option', { name: 'Ignore this class' }).click();
        await page.getByTestId(`link-classes-button`).click();
        await waitForLoading(page);
        await expect(
            page.locator('.MuiAlert-message').filter({ hasText: 'External classes linked successfully with LWP classes' })
        ).toBeVisible();
        await waitForLoading(page);
        await expect(page.getByTestId('diffing-changes-page')).toBeVisible();
        await page.getByTestId('pupil-diffing-filter-first-name-btn').click();
        const haroldPotterAcceptAllBtnLocator = page.locator(
            `[data-test='accept-all-${harryPotter.oldForename}-${harryPotter.surname}-changes']`
        );
        await haroldPotterAcceptAllBtnLocator.waitFor({ state: 'visible' });
        await haroldPotterAcceptAllBtnLocator.click();
        await waitForLoading(page);
        await expect(
            page
                .locator('.MuiAlert-message')
                .filter({ hasText: `All changes for ${harryPotter.oldForename} ${harryPotter.surname} have been accepted.` })
        ).toBeVisible();
        await waitForLoading(page);
        await page.getByTestId('pupil-diffing-filter-first-name-btn').click();
        const pansyParkinsonRejectAllBtnLocator = page.locator(
            `[data-test='reject-all-${pansyParkinson.newForename}-${pansyParkinson.surname}-changes']`
        );
        await pansyParkinsonRejectAllBtnLocator.waitFor({ state: 'visible' });
        await pansyParkinsonRejectAllBtnLocator.click();
        await waitForLoading(page);
        await expect(
            page
                .locator('.MuiAlert-message')
                .filter({ hasText: `All changes for ${pansyParkinson.newForename} ${pansyParkinson.surname} have been rejected.` })
        ).toBeVisible();
        await waitForLoading(page);
        await page.getByTestId('pupil-diffing-filter-upn-btn').click();
        const acceptAllPupilChangesBtnLocator = page.locator(`[data-test='accept-all-pupil-changes']`);
        await acceptAllPupilChangesBtnLocator.waitFor({ state: 'visible' });
        await acceptAllPupilChangesBtnLocator.click();
        await waitForLoading(page);
        await expect(page.locator('.MuiAlert-message').filter({ hasText: `Accepted all pupils changes.` })).toBeVisible();
        await waitForLoading(page);
        await page.getByTestId('pupil-diffing-filter-date-of-birth-btn').click();
        const rejectAllPupilChangesBtnLocator = page.locator(`[data-test='reject-all-pupil-changes']`);
        await rejectAllPupilChangesBtnLocator.waitFor({ state: 'visible' });
        await rejectAllPupilChangesBtnLocator.click();
        await waitForLoading(page);
        await expect(page.locator('.MuiAlert-message').filter({ hasText: `Rejected all pupils changes.` })).toBeVisible();
        await waitForLoading(page);
        await page.getByTestId('pupil-diffing-filter-last-name-btn').click();
        const hermioneGrangerAcceptPupilChangesBtnLocator = page.locator(
            `[data-test='accept-last-name-change-for-${hermioneGranger.forename}-${hermioneGranger.oldLastName}']`
        );
        await hermioneGrangerAcceptPupilChangesBtnLocator.waitFor({ state: 'visible' });
        await hermioneGrangerAcceptPupilChangesBtnLocator.click();
        await waitForLoading(page);
        await expect(
            page.locator('.MuiAlert-message').filter({ hasText: `"Last name" change has been successfully updated.` })
        ).toBeVisible();
        await waitForLoading(page);
        const blaiseZabiniRejectPupilChangesBtnLocator = page.locator(
            `[data-test='reject-last-name-change-for-${blaiseZabini.forename}-${blaiseZabini.newLastname}']`
        );
        await blaiseZabiniRejectPupilChangesBtnLocator.waitFor({ state: 'visible' });
        await blaiseZabiniRejectPupilChangesBtnLocator.click();
        await waitForLoading(page);
        await expect(page.locator('.MuiAlert-message').filter({ hasText: `"Last name" change has been rejected.` })).toBeVisible();
        await waitForLoading(page);
        await acceptAllPupilChangesBtnLocator.waitFor({ state: 'visible' });
        await acceptAllPupilChangesBtnLocator.click();
        await waitForLoading(page);
        await expect(page.locator('.MuiAlert-message').filter({ hasText: `Accepted all pupils changes.` })).toBeVisible();
        await waitForLoading(page);
        await expect(page.getByTestId('no-pupil-change-to-review')).toContainText('No changes to review');
        await page.getByTestId('return-to-school-overview-btn-from-pupil-changes-page').click();
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
        await expect(
            page.getByTestId(`class-pupil-page-pupil-name`).getByText(`${dracoMalfoy.forename} ${dracoMalfoy.surname}`)
        ).toBeVisible();
        await expect(
            page.getByTestId(`class-pupil-page-pupil-name`).getByText(`${pansyParkinson.newForename} ${pansyParkinson.surname}`)
        ).toBeVisible();
        await expect(
            page.getByTestId(`class-pupil-page-pupil-name`).getByText(`${blaiseZabini.forename} ${blaiseZabini.newLastname}`)
        ).toBeVisible();
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
        await page.getByTestId('registration-classes').getByText(myClass4Name).click();
        await page.waitForURL(/\/class\/\d+\/pupils/);
        await waitForLoading(page);
        await page.mouse.move(0, 0);
        await expect(page.getByTestId(`class-pupil-page-pupil-name`)).toHaveCount(0);
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
