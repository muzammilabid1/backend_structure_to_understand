import { test, expect } from '@playwright/test';
import path from 'path';
import type { Schema } from '@lwp/postgres-client';
import { type Kysely } from 'kysely';
import {
    admin,
    generateClassName,
    generateFirstName,
    generateLastName,
    generateSchoolName,
    generateSentence,
    generateTopicName,
    generateUserEmail,
    password
} from '../constants';
import {
    acceptFeatureTooltipPrompt,
    acceptPupilInvitation,
    adminOrTeacherSignOut,
    formatDate,
    getInputBoxByName,
    login,
    openSideDrawer,
    parentSignOut,
    releaseTopicsUpToADate,
    safeClick,
    submitActivityFeedback,
    waitForLoading,
    watchVideoAndUnlockActivities
} from '../utils';
import { createDb } from '../db';
import { createUtils } from '../dbUtils';
import { FeatureCode, FeatureStatus, UserStatus, UserType } from 'lwp-shared';
import { AddActivityInput } from '../types';

test.describe('Pupil Class Switching - CSV Import ', () => {
    let db: Kysely<Schema.DB>;
    let utils: ReturnType<typeof createUtils>;

    let pupilId: string | null = null;
    let classId: string | null = null;
    let schoolId: string | null = null;
    let leaderId: string | null = null;
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

        await dataCleanup(utils, { schoolId, leaderId, classId, pupilId, parentIds });

        await db.destroy();
    });

    test('CSV import - Switch pupil class from teacher data changes page', async ({ page }) => {
        const mySchoolName = `${generateSchoolName()} School`;
        const myClassName = `${generateClassName()} Class`;
        const csvClassName = 'Honey Class';
        const leaderFirstName: string = generateFirstName();
        const leaderlastName: string = generateLastName();
        const leaderEmail: string = generateUserEmail(leaderFirstName, leaderlastName);
        const topicWillDelete = `${generateTopicName()} Topic`;
        const topicWithFeedback = `${generateTopicName()} Topic`;
        const activity_one: AddActivityInput = { activityName: `${topicWillDelete} one`, staticComponentName: 'GuessTheAnimal' };
        const activity_two: AddActivityInput = { activityName: `${topicWillDelete} two`, staticComponentName: 'ClapClap' };
        const feedback = {
            pupilComment: generateSentence(4),
            parentComment: generateSentence(4)
        };
        const pupilInfo = {
            firstname: 'Matilda',
            lastname: 'Wormwood',
            dateOfBirth: new Date('2013-01-09'),
            UPN: null,
            gender: 'Female',
            pupilPremiumStatus: false,
            ncYear: 1,
            parents: [
                {
                    firstname: 'Zinnia',
                    lastname: 'Wormwood',
                    email: 'zinnia.wormwood@example.com'
                },
                {
                    firstname: 'Harry',
                    lastname: 'Wormwood',
                    email: 'harry.wormwood@example.com'
                }
            ]
        };
        const parentEmail: string = pupilInfo.parents[1].email;

        const today = new Date();
        const user = await db.selectFrom('lwp_user').where('id', '=', '1').select(['id', 'password']).executeTakeFirstOrThrow();
        const topicInfos = await setupTopicsData([topicWithFeedback, topicWillDelete], db, utils, activity_one, activity_two, user.id);
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
            enableAddClasses: false,
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
        const schoolClass = await utils.createClass(school.id, {
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
        classId = schoolClass.id;
        const pupil = await utils.createPupil(school.id, {
            firstname: pupilInfo.firstname,
            lastname: pupilInfo.lastname,
            dateOfBirth: new Date(pupilInfo.dateOfBirth),
            startedSchool: (currentPeriod.index - pupilInfo.ncYear).toString(),
            isPremium: pupilInfo.pupilPremiumStatus,
            gender: pupilInfo.gender,
            schoolId: school.id,
            UPN: pupilInfo.UPN,
            logCreatedById: user.id,
            logUpdatedById: user.id
        });
        pupilId = pupil.id;
        for (const contact of pupilInfo.parents) {
            const parent = await utils.createUser({
                firstname: contact.firstname,
                lastname: contact.lastname,
                email: contact.email,
                type: UserType.PARENT,
                userStatus: UserStatus.ACTIVE,
                password: user.password
            });
            await utils.addParentToPupil(pupil.id, parent.id);
            parentIds.push(parent.id);
        }
        await utils.addPupilToClass(pupil.id, schoolClass.id);

        [topicWithFeedback, topicWillDelete].forEach(async (topicName) => {
            const staticTopic = topicInfos.find((topicInfo) => topicInfo.topicName === topicName);

            if (staticTopic?.id) {
                await utils.createClassTopic(schoolClass.id, {
                    topicId: staticTopic.id,
                    releaseDate: formatDate(today, '-')
                });
            }
        });

        await login(page, admin, password);
        await page.waitForURL(/\/admin\/all-feeds/);
        await waitForLoading(page);
        await expect(page.getByTestId('common-drawer-list')).toBeVisible();
        await openSideDrawer(page);
        await releaseTopicsUpToADate(page);
        await adminOrTeacherSignOut(page);
        await login(page, parentEmail, password);
        await page.waitForURL(/\/welcome/);
        await waitForLoading(page);
        await acceptPupilInvitation(page);
        await waitForLoading(page);
        await expect(page.getByTestId('child-topics-page')).toBeVisible();
        await acceptFeatureTooltipPrompt(page);
        await expect(page.locator('[data-test="child-card-footer-primary-content"]', { hasText: topicWillDelete }).first()).toBeVisible();
        await expect(page.locator('[data-test="child-card-footer-primary-content"]', { hasText: topicWithFeedback }).first()).toBeVisible();
        await waitForLoading(page);
        await page.locator('[data-test="child-card-footer-primary-content"]', { hasText: topicWithFeedback }).first().click();
        await page.waitForURL(/\/topic/);
        await waitForLoading(page);
        await watchVideoAndUnlockActivities(page);
        await page.locator('[data-test="child-activity-card"]').first().click();
        await page.waitForURL(/\/activity/);
        await waitForLoading(page);
        await submitActivityFeedback(page, feedback.pupilComment, feedback.parentComment);
        await parentSignOut(page);
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
        const filePath = path.resolve(__dirname, '../fixtures/test-data-for-pupil-class-switch-from-csv-import-test-case.csv');
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
        await expect(page.locator('.school-wonde-status')).toContainText('Linking classes');
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
        await expect(page.getByTestId('link-classes-page')).toBeVisible();
        await page.getByTestId(`link-classes-button`).click();
        await waitForLoading(page);
        await expect(
            page.locator('.MuiAlert-message').filter({ hasText: 'External classes linked successfully with LWP classes' })
        ).toBeVisible();
        await waitForLoading(page);
        await expect(page.getByTestId('diffing-changes-page')).toBeVisible();
        const acceptAllPupilChangesBtnLocator = page.locator(`[data-test='accept-all-pupil-changes']`);
        await acceptAllPupilChangesBtnLocator.waitFor({ state: 'visible' });
        await acceptAllPupilChangesBtnLocator.click();
        await waitForLoading(page);
        await expect(page.locator('.MuiAlert-message').filter({ hasText: `Accepted all pupils changes.` })).toBeVisible();
        await waitForLoading(page);
        await expect(page.getByTestId('no-pupil-change-to-review')).toContainText('No changes to review');
        await page.getByTestId('return-to-school-overview-btn-from-pupil-changes-page').click();
        await page.waitForURL(/\/school/);
        await waitForLoading(page);
        await page.getByTestId('inactive-registration-open-button').first().click();
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
         * This spec is about a pupil moving between classes, and only passes through activation on the way.
         * So it waits for activation to be over rather than for a destination, and then goes to the school
         * overview it wants. `topic-sequencing.spec.ts` is where the destination itself is asserted, against
         * sequences it builds and removes for the purpose.
         */
        await page.waitForURL((url) => !url.pathname.endsWith('/activate'));
        await waitForLoading(page);
        await acceptFeatureTooltipPrompt(page);
        await page.goto(`/school/${schoolId}`);
        await page.waitForURL(/\/school\//);
        await waitForLoading(page);
        await acceptFeatureTooltipPrompt(page);
        await waitForLoading(page);
        await page.getByTestId('registration-classes').getByText(myClassName).click();
        await page.waitForURL(/\/class\/\d+\/topic/);
        await waitForLoading(page);
        await page.mouse.move(0, 0);
        await expect(page.getByTestId(`class-pupil-page-pupil-name`)).toHaveCount(0);
        await page.getByRole('link', { name: 'School overview' }).click();
        await page.waitForURL(/\/school/);
        await waitForLoading(page);
        await page.getByTestId('registration-classes').getByText(csvClassName).click();
        await page.waitForURL(/\/class\/\d+\/pupils/);
        await waitForLoading(page);
        await page.mouse.move(0, 0);
        await expect(
            page.getByTestId(`class-pupil-page-pupil-name`).getByText(`${pupilInfo.firstname} ${pupilInfo.lastname}`)
        ).toBeVisible();
        await adminOrTeacherSignOut(page);
        await login(page, parentEmail, password);
        await page.waitForURL(/\/child\/\d+\/topics/);
        await waitForLoading(page);
        await expect(page.getByTestId('child-topics-page')).toBeVisible();
        await acceptFeatureTooltipPrompt(page);
        await expect(
            page.locator('[data-test="child-card-footer-primary-content"]', { hasText: topicWillDelete }).first()
        ).not.toBeVisible();
        await expect(page.locator('[data-test="child-card-footer-primary-content"]', { hasText: topicWithFeedback }).first()).toBeVisible();
        await parentSignOut(page);
    });
});

const setupTopicsData = async (
    topicNames: string[],
    db: Kysely<Schema.DB>,
    utils: ReturnType<typeof createUtils>,
    activity_one: AddActivityInput,
    activity_two: AddActivityInput,
    userId: string
): Promise<{ topicName: string; id: string }[]> => {
    const topicInfos: { topicName: string; id: string }[] = [];
    for (const topicName of topicNames) {
        const staticTopic = await utils.createStaticTopic({
            isReading: false,
            teacherTopicName: topicName,
            parentTopicName: topicName,
            isPublished: true,
            video: '605069004',
            logCreatedById: userId,
            logUpdatedById: userId
        });
        await db
            .insertInto('static_lwp_topic_domain_year_group')
            .values({
                domainId: '2',
                topicId: staticTopic.id,
                yearGroupId: '1'
            })
            .executeTakeFirstOrThrow();
        await utils.createStaticActivity({
            name: activity_one.activityName,
            activityType: 'LEGACY',
            order: 1,
            topicId: staticTopic.id,
            logCreatedById: userId,
            logUpdatedById: userId
        });
        await utils.createStaticActivity({
            name: activity_two.activityName,
            activityType: 'LEGACY',
            order: 2,
            topicId: staticTopic.id,
            logCreatedById: userId,
            logUpdatedById: userId
        });

        topicInfos.push({ topicName, id: staticTopic.id });
    }

    return topicInfos;
};

const dataCleanup = async (
    utils: ReturnType<typeof createUtils>,
    entityInfo: {
        schoolId?: string | null;
        leaderId?: string | null;
        classId: string | null;
        pupilId: string | null;
        parentIds: string[];
    }
) => {
    if (entityInfo.classId) {
        await utils.deleteClass(entityInfo.classId);
    }
    for (const parentId of entityInfo.parentIds) {
        await utils.deleteUser(parentId);
    }
    if (entityInfo.pupilId) {
        await utils.deletePupilCascade(entityInfo.pupilId);
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
