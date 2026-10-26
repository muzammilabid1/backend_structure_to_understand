import { test, expect } from '@playwright/test';
import type { Schema } from '@lwp/postgres-client';
import { type Kysely, type Selectable } from 'kysely';
import { createDb } from './db';
import { createUtils } from './dbUtils';
import {
    admin,
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
import { formatDate, login, openSideDrawer, runCronJob } from './utils';
import { UserStatus, UserType } from 'lwp-shared';

/**
 * The parent activity emails carry the recipient school's tags, the class's year group and the topic's
 * subject so that templates can vary their content per test arm — see LEA-6459 and LEA-6551. All three
 * are read by the bulk SQL that the scheduled release job runs, so this covers that path rather than
 * the one-off sends.
 */
test.describe('School tag, year group and subject in released topic emails', () => {
    let db: Kysely<Schema.DB>;
    let utils: ReturnType<typeof createUtils>;

    const tagName = `term1-rationale-emails-${Date.now()}`;
    const yearGroupId = '3';
    const todayDate = formatDate();

    // Both parents are notified by the same cron run, so the tagged and untagged cases share it.
    let taggedParent: Selectable<Schema.LwpUser>;
    let untaggedParent: Selectable<Schema.LwpUser>;
    let yearGroupName: string;
    let subjectName: string;

    const createSchoolWithNotifiableParent = async (
        adminUser: { id: string; password: string },
        currentPeriodIndex: number,
        options: { tagged: boolean }
    ): Promise<Selectable<Schema.LwpUser>> => {
        const leaderFirstName = generateFirstName();
        const leaderLastName = generateLastName();
        const parentFirstName = generateFirstName();
        const parentLastName = generateLastName();

        const school = await utils.createSchool({
            schoolName: `${generateSchoolName()} School`,
            curentPeriodIndex: currentPeriodIndex,
            numOfFullProgrammeClassesAllowed: 10,
            numOfTotalClassesAllowed: 30,
            enableAddClasses: true,
            logCreatedById: adminUser.id,
            logUpdatedById: adminUser.id
        });

        if (options.tagged) {
            await utils.createSchoolTag({ name: tagName, color: '#F28D00' }, school.id);
        }

        const leader = await utils.createUser({
            firstname: leaderFirstName,
            lastname: leaderLastName,
            email: generateUserEmail(leaderFirstName, leaderLastName),
            type: UserType.TEACHER,
            userStatus: UserStatus.ACTIVE,
            isSchoolLeader: true,
            schoolId: school.id,
            password: adminUser.password,
            nameForChildren: `Mr ${leaderFirstName}`
        });
        const schoolClass = await utils.createClass(school.id, {
            name: generateClassName(),
            isRegistrationClass: true,
            isFullProgramme: true,
            mainTeacherId: leader.id,
            yearGroup: yearGroupId,
            periodIndex: currentPeriodIndex,
            logCreatedById: adminUser.id,
            logUpdatedById: adminUser.id
        });
        const staticTopic = await utils.createStaticTopic({
            isReading: false,
            teacherTopicName: generateTopicName(),
            parentTopicName: generateTopicName(),
            isPublished: true,
            logCreatedById: adminUser.id,
            logUpdatedById: adminUser.id
        });
        // The subject comes from the topic's domain, so the topic has to sit in one
        await db
            .insertInto('static_lwp_topic_domain_year_group')
            .values({ domainId: mathsDomainId, topicId: staticTopic.id, yearGroupId })
            .executeTakeFirstOrThrow();
        const classTopic = await utils.createClassTopic(schoolClass.id, {
            topicId: staticTopic.id,
            releaseDate: todayDate,
            released: true
        });
        const pupil = await utils.createPupil(school.id, {
            firstname: generateFirstName(),
            lastname: generateLastName(),
            dateOfBirth: new Date(),
            startedSchool: '2024',
            isPremium: true,
            gender: 'MALE',
            UPN: generateUPN(),
            logCreatedById: adminUser.id,
            logUpdatedById: adminUser.id
        });
        const parent = await utils.createUser({
            firstname: parentFirstName,
            lastname: parentLastName,
            email: generateUserEmail(parentFirstName, parentLastName),
            type: UserType.PARENT,
            userStatus: UserStatus.ACTIVE,
            password: adminUser.password
        });

        await utils.addParentToPupil(pupil.id, parent.id, false);
        await utils.addPupilToClass(pupil.id, schoolClass.id);
        await utils.createPupilTopic({
            releaseDate: todayDate,
            pupilId: pupil.id,
            classTopicId: classTopic.id,
            topicId: staticTopic.id,
            watchedVideo: false,
            periodIndex: currentPeriodIndex,
            silverStars: 0,
            earnedGoldStar: false,
            parentsNotified: false
        });

        return parent;
    };

    const getReleasedTopicEmailParams = async (parentId: string): Promise<Record<string, unknown>> => {
        const notification = await db
            .selectFrom('lwp_notification')
            .select(['params'])
            .where('emailTemplateType', '=', 'sendPupilTopics')
            .where('userId', '=', parentId)
            .executeTakeFirstOrThrow();

        return JSON.parse(JSON.stringify(notification.params));
    };

    test.beforeAll(async () => {
        db = createDb();
        utils = createUtils(db);

        const adminUser = await db.selectFrom('lwp_user').where('id', '=', '1').select(['id', 'password']).executeTakeFirstOrThrow();
        const currentPeriod = await db
            .selectFrom('static_lwp_period')
            .where('isCurrentPeriod', '=', true)
            .select('index')
            .executeTakeFirstOrThrow();
        const yearGroup = await db
            .selectFrom('static_lwp_year_group')
            .where('id', '=', yearGroupId)
            .select('year')
            .executeTakeFirstOrThrow();

        const subject = await db
            .selectFrom('static_lwp_topic_domain')
            .innerJoin('static_lwp_subject', 'static_lwp_subject.id', 'static_lwp_topic_domain.subjectId')
            .where('static_lwp_topic_domain.id', '=', mathsDomainId)
            .select('static_lwp_subject.name')
            .executeTakeFirstOrThrow();

        yearGroupName = yearGroup.year;
        subjectName = subject.name;
        taggedParent = await createSchoolWithNotifiableParent(adminUser, currentPeriod.index, { tagged: true });
        untaggedParent = await createSchoolWithNotifiableParent(adminUser, currentPeriod.index, { tagged: false });
    });

    test.afterAll(async () => {
        await db.destroy();
    });

    test('sends the school tags, the year group and the subject with the released topic email', async ({ page }) => {
        await login(page, admin, password);
        await page.waitForURL(/\/admin\/all-feeds/);
        await expect(page.getByTestId('common-drawer-list')).toBeVisible();
        await openSideDrawer(page);
        await runCronJob(page, 'sendReleasedPupilTopicNotifications');

        const taggedParams = await getReleasedTopicEmailParams(taggedParent.id);

        expect(taggedParams).toMatchObject({
            SCHOOLTAGS: [tagName],
            YEARGROUP: yearGroupName,
            SUBJECTNAME: subjectName
        });

        // A school without the tag gets an empty tag list, so templates fall back to the control copy
        const untaggedParams = await getReleasedTopicEmailParams(untaggedParent.id);

        expect(untaggedParams).toMatchObject({
            SCHOOLTAGS: [],
            YEARGROUP: yearGroupName,
            SUBJECTNAME: subjectName
        });
    });
});
