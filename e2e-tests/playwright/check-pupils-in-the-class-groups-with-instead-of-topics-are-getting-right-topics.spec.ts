import { test, expect } from '@playwright/test';
import type { Schema } from '@lwp/postgres-client';
import { type Kysely } from 'kysely';
import { createDb } from './db';
import { createUtils } from './dbUtils';
import {
    admin,
    englishDomainId,
    englishSubjectId,
    generateClassName,
    generateFirstName,
    generateLastName,
    generateSchoolName,
    generateTopicName,
    generateUPN,
    generateUserEmail,
    mathsDomainId,
    password
} from './constants';
import { adminOrTeacherSignOut, formatDate, login, openSideDrawer, releaseTopicsUpToADate, waitForLoading } from './utils';
import { UserStatus, UserType } from 'lwp-shared';

test.describe('Check pupils in the class groups are getting right topics', () => {
    let db: Kysely<Schema.DB>;
    let utils: ReturnType<typeof createUtils>;

    test.beforeAll(async () => {
        db = createDb();
        utils = createUtils(db);
    });

    test.afterAll(async () => {
        await db.destroy();
    });

    test('Check pupils in the class groups are getting right topics', async ({ page }) => {
        const mySchoolName: string = `${generateSchoolName()} School`;
        const leaderFirstName: string = generateFirstName();
        const leaderlastName: string = generateLastName();
        const leaderEmail: string = generateUserEmail(leaderFirstName, leaderlastName);
        const parentFirstname: string = generateFirstName();
        const parentLastname: string = generateLastName();
        const parentEmail: string = generateUserEmail(parentFirstname, parentLastname);
        const myClassName: string = generateClassName();
        const classPupilFirstName: string = generateFirstName();
        const classPupilLastName: string = generateLastName();
        const groupPupilFirstName: string = generateFirstName();
        const groupPupilLastName: string = generateLastName();
        const classGroupName: string = `${myClassName} Group`;
        const classTopicName: string = `Class ${generateTopicName()}`;
        const groupTopicName: string = `Group ${generateTopicName()}`;
        const mathsTopicName: string = `Maths ${generateTopicName()}`;
        const dateToday = formatDate();

        const user = await db.selectFrom('lwp_user').where('id', '=', '1').select(['id', 'password']).executeTakeFirstOrThrow();
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
            enableAddClasses: true,
            logCreatedById: user.id,
            logUpdatedById: user.id
        });
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
        await utils.addUserTooltipHistory(leader.id, 'topic-library-tooltip');
        await utils.addUserTooltipHistory(leader.id, 'school-reading-log-tooltip');
        const schoolClass = await utils.createClass(school.id, {
            name: myClassName,
            isRegistrationClass: true,
            isFullProgramme: true,
            mainTeacherId: leader.id,
            yearGroup: 1,
            periodIndex: currentPeriod.index,
            IsReadingLogsEnabled: false,
            isReadyTeddyEnabled: false,
            readingTarget: 1,
            logCreatedById: user.id,
            logUpdatedById: user.id
        });
        const mathsTopicId = await generateTopicData(db, utils, mathsTopicName, mathsDomainId, user.id);
        const classTopicId = await generateTopicData(db, utils, classTopicName, englishDomainId, user.id);
        await utils.createClassTopic(schoolClass.id, {
            topicId: mathsTopicId,
            releaseDate: dateToday,
            released: false
        });
        await utils.createClassTopic(schoolClass.id, {
            topicId: classTopicId,
            releaseDate: dateToday,
            released: false
        });
        const schoolClassGroup = await utils.createClass(school.id, {
            name: classGroupName,
            isRegistrationClass: false,
            isFullProgramme: false,
            mainTeacherId: leader.id,
            yearGroup: 1,
            periodIndex: currentPeriod.index,
            IsReadingLogsEnabled: false,
            isReadyTeddyEnabled: false,
            readingTarget: 1,
            skipGroupPupils: true,
            parentClassId: schoolClass.id,
            logCreatedById: user.id,
            logUpdatedById: user.id
        });
        await utils.addClassSubject(englishSubjectId, schoolClassGroup.id);
        const groupTopicId = await generateTopicData(db, utils, groupTopicName, englishDomainId, user.id);
        await utils.createClassTopic(schoolClassGroup.id, {
            topicId: groupTopicId,
            releaseDate: dateToday,
            released: false
        });
        const parent = await utils.createUser({
            firstname: parentFirstname,
            lastname: parentLastname,
            email: parentEmail,
            type: UserType.PARENT,
            userStatus: UserStatus.ACTIVE,
            password: user.password
        });
        await utils.addUserTooltipHistory(parent.id, 'child-switch-tooltip');
        const classPupil = await utils.createPupil(school.id, {
            firstname: classPupilFirstName,
            lastname: classPupilLastName,
            dateOfBirth: new Date(),
            startedSchool: '2024',
            isPremium: true,
            gender: 'MALE',
            UPN: generateUPN(),
            logCreatedById: user.id,
            logUpdatedById: user.id
        });
        await utils.addParentToPupil(classPupil.id, parent.id, false);
        await utils.addPupilToClass(classPupil.id, schoolClass.id);
        const groupPupil = await utils.createPupil(school.id, {
            firstname: groupPupilFirstName,
            lastname: groupPupilLastName,
            dateOfBirth: new Date(),
            startedSchool: '2024',
            isPremium: true,
            gender: 'MALE',
            UPN: generateUPN(),
            logCreatedById: user.id,
            logUpdatedById: user.id
        });
        await utils.addParentToPupil(groupPupil.id, parent.id, false);
        await utils.addPupilToClass(groupPupil.id, schoolClass.id);
        await utils.addPupilToClass(groupPupil.id, schoolClassGroup.id);

        await login(page, admin, password);
        await page.waitForURL(/\/admin\/all-feeds/);
        await waitForLoading(page);
        await expect(page.getByTestId('common-drawer-list')).toBeVisible();
        await openSideDrawer(page);
        await releaseTopicsUpToADate(page);
        await adminOrTeacherSignOut(page);
        await login(page, parentEmail, password);
        await page.waitForURL(/\/parent/);
        await waitForLoading(page);
        await expect(page.getByTestId('parent-children-page')).toBeVisible();
        await page.locator('[data-test="child-card-footer-primary-content"]', { hasText: classPupilFirstName }).click();
        await page.waitForURL(/\/child\/\d+\/topics/);
        await waitForLoading(page);
        await expect(page.getByTestId('child-topics-page')).toBeVisible();
        await expect(page.locator('[data-test="child-card-footer-primary-content"]', { hasText: mathsTopicName }).first()).toBeVisible();
        await expect(page.locator('[data-test="child-card-footer-primary-content"]', { hasText: classTopicName }).first()).toBeVisible();
        await expect(
            page.locator('[data-test="child-card-footer-primary-content"]', { hasText: groupTopicName }).first()
        ).not.toBeVisible();
        await page.getByTestId('header-logo').click();
        await page.waitForURL(/\/parent/);
        await waitForLoading(page);
        await expect(page.getByTestId('parent-children-page')).toBeVisible();
        await page.locator('[data-test="child-card-footer-primary-content"]', { hasText: groupPupilFirstName }).click();
        await page.waitForURL(/\/child\/\d+\/topics/);
        await waitForLoading(page);
        await expect(page.getByTestId('child-topics-page')).toBeVisible();
        await expect(page.locator('[data-test="child-card-footer-primary-content"]', { hasText: mathsTopicName }).first()).toBeVisible();
        await expect(
            page.locator('[data-test="child-card-footer-primary-content"]', { hasText: classTopicName }).first()
        ).not.toBeVisible();
        await expect(page.locator('[data-test="child-card-footer-primary-content"]', { hasText: groupTopicName }).first()).toBeVisible();
    });
});

const generateTopicData = async (
    db: Kysely<Schema.DB>,
    utils: ReturnType<typeof createUtils>,
    topicName: string,
    domainId: string,
    userId: string
): Promise<string> => {
    const activity_one = { activityName: `${topicName} one` };
    const activity_two = { activityName: `${topicName} two` };

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
            domainId,
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

    return staticTopic.id;
};
