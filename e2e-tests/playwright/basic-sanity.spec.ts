import { expect, test } from '@playwright/test';
import type { Schema } from '@lwp/postgres-client';
import { type Kysely } from 'kysely';
import { createDb } from './db';
import { createUtils } from './dbUtils';
import { formatDate, getInputBoxByName, login, schoolSettingsPage, waitForLoading } from './utils';
import {
    admin,
    generateClassName,
    generateFirstName,
    generateLastName,
    generateSchoolName,
    generateTopicName,
    generateUPN,
    generateUserEmail,
    password,
    signupPassword
} from './constants';
import { DateTime } from 'luxon';
import { faker } from '@faker-js/faker/locale/en';
import { PupilParentStatus, UserStatus, UserType } from 'lwp-shared';

test.describe('Basic Sanity Tests', () => {
    let db: Kysely<Schema.DB>;
    let utils: ReturnType<typeof createUtils>;
    const today: Date = new Date();
    const todayDate: string = formatDate();
    const oneYearFromToday = new Date();
    oneYearFromToday.setFullYear(oneYearFromToday.getFullYear() + 1);

    test.beforeAll(async () => {
        db = createDb();
        utils = createUtils(db);
    });

    test.afterAll(async () => {
        await db.destroy();
    });

    test('Parent', { tag: '@sanity' }, async ({ page }) => {
        const mySchoolName: string = `${generateSchoolName()} School`;
        const leaderFirstName: string = generateFirstName();
        const leaderlastName: string = generateLastName();
        const schoolEmail: string = generateUserEmail(leaderFirstName, leaderlastName);
        const parentFirstName: string | null = generateFirstName();
        const parentLastName: string | null = generateLastName();
        const parentEmail: string = generateUserEmail(parentFirstName, parentLastName);
        const myClassName: string = generateClassName();
        const myTopicName: string = generateTopicName();
        const activity_one: string = `${myTopicName} one`;
        const pupilFirstName: string | null = generateFirstName();
        const pupilLastName: string | null = generateLastName();

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
            email: schoolEmail,
            type: UserType.TEACHER,
            userStatus: UserStatus.ACTIVE,
            isSchoolLeader: true,
            schoolId: school.id,
            password: user.password,
            nameForChildren: `Mr ${leaderFirstName}`
        });
        const schoolClass = await utils.createClass(school.id, {
            name: myClassName,
            isRegistrationClass: true,
            isFullProgramme: true,
            mainTeacherId: leader.id,
            yearGroup: 1,
            periodIndex: currentPeriod.index,
            IsReadingLogsEnabled: true,
            readingLaunchDate: todayDate,
            readingStartDay: today.getDay(),
            readingTarget: 1,
            logCreatedById: user.id,
            logUpdatedById: user.id
        });
        const staticTopic = await utils.createStaticTopic({
            isReading: false,
            teacherTopicName: myTopicName,
            parentTopicName: myTopicName,
            isPublished: true,
            video: '605069004',
            logCreatedById: user.id,
            logUpdatedById: user.id
        });
        await db
            .insertInto('static_lwp_topic_domain_year_group')
            .values({
                domainId: '2',
                topicId: staticTopic.id,
                yearGroupId: '1'
            })
            .executeTakeFirstOrThrow();
        const staticActivity = await utils.createStaticActivity({
            name: activity_one,
            activityType: 'LEGACY',
            order: 1,
            topicId: staticTopic.id,
            logCreatedById: user.id,
            logUpdatedById: user.id
        });
        const classTopic = await utils.createClassTopic(schoolClass.id, {
            topicId: staticTopic?.id,
            releaseDate: todayDate,
            released: true
        });
        const pupil = await utils.createPupil(school.id, {
            firstname: pupilFirstName,
            lastname: pupilLastName,
            dateOfBirth: new Date(),
            startedSchool: '2024',
            isPremium: true,
            gender: 'MALE',
            UPN: generateUPN(),
            logCreatedById: user.id,
            logUpdatedById: user.id
        });
        const parent = await utils.createUser({
            firstname: parentFirstName,
            lastname: parentLastName,
            email: parentEmail,
            type: UserType.PARENT,
            userStatus: UserStatus.ACTIVE,
            password: user.password
        });
        await utils.addParentToPupil(pupil.id, parent.id, false);
        await utils.addPupilToClass(pupil.id, schoolClass.id);
        const pupilTopic = await utils.createPupilTopic({
            releaseDate: todayDate,
            pupilId: pupil.id,
            classTopicId: classTopic.id,
            topicId: staticTopic.id,
            watchedVideo: false,
            periodIndex: currentPeriod.index,
            silverStars: 0,
            earnedGoldStar: false
        });
        await utils.createPupilActivity({
            pupilId: pupil.id,
            topicId: pupilTopic.id,
            activityId: staticActivity.id,
            earnedStar: false,
            mathscotActivityItemIds: JSON.stringify([88, 188, 224])
        });
        const staticReadingTopic = await db
            .selectFrom('static_lwp_topic')
            .where('isReading', '=', true)
            .select(['id'])
            .executeTakeFirstOrThrow();
        const readingClassTopic = await utils.createClassTopic(schoolClass.id, {
            topicId: staticReadingTopic?.id,
            releaseDate: todayDate,
            released: true,
            readingTarget: 1
        });
        await utils.createPupilTopic({
            releaseDate: todayDate,
            pupilId: pupil.id,
            classTopicId: readingClassTopic.id,
            topicId: staticReadingTopic.id,
            watchedVideo: false,
            periodIndex: currentPeriod.index,
            silverStars: 0,
            earnedGoldStar: false,
            readingTarget: 1
        });

        await login(page, parentEmail, password);
        await waitForLoading(page);
        await expect(page.getByTestId('child-reading-log-page')).toBeVisible();
        await page.getByTestId('topics-tab').click();
        await waitForLoading(page);
        await expect(page.getByTestId('child-topics-page')).toBeVisible();
        await page.getByTestId('awards-tab').click();
        await waitForLoading(page);
        await expect(page.getByTestId('child-awards-page')).toBeVisible();
        await page.getByTestId('books-tab').click();
        await waitForLoading(page);
        await expect(page.getByTestId('child-books-page')).toBeVisible();
        await page.getByTestId('history-tab').click();
        await waitForLoading(page);
        await expect(page.getByTestId('child-history-page')).toBeVisible();

        //Reading
        await page.getByTestId('recommended-pupil-topic').first().click();
        await waitForLoading(page);
        await page.getByTestId('reading-log-slider-day').first().click();
        try {
            await expect(page.getByTestId('reading-record-found-modal')).toBeVisible();
            await page.getByTestId('reading-record-found-modal-create-button').click();
        } catch (e) {
            // Do nothing (It's the first one)
        }
        await page.getByTestId('read-aloud-card').first().click();
        await page.getByTestId('school-book-card').first().click();
        await page.getByTestId('book-name-input').fill('Harry Potter');
        await page.getByTestId('comment-card').click();
        await page.getByTestId('comment-input').fill('Nice!');
        await page.getByTestId('share-permissions-checkbox').first().click();
        await page.getByTestId('submit-reading-log-button').click();
        await waitForLoading(page);
        await page.getByTestId('reading-history-card').first().filter({ hasText: 'Nice!' }).first().isVisible();

        //Feedback
        await page.getByTestId('recommended-pupil-topic').nth(1).click();
        await waitForLoading(page);
        await page.getByTestId('video-card').click();
        await page.getByTestId('unlock-activities-button').click();
        await waitForLoading(page);
        await page.getByTestId('child-activity-card').first().click();
        await waitForLoading(page);
        await page.getByTestId('parent-comment-card').fill('parent comment');
        await page.getByTestId('pupil-comment-card').fill('pupil comment');
        const updatePermisisonsLink = page.getByTestId('update-photo-permission-link');
        if (await updatePermisisonsLink.isVisible()) {
            await updatePermisisonsLink.click();
        }
        await getInputBoxByName(page, 'shareWithTeacher').check();
        await page.getByTestId('save-comments-button').click();
        await waitForLoading(page);
        await page.getByTestId('choose-mathscot-button').click();
        await page.getByTestId('mathscot-character-0').click();
        await page.getByTestId('mathscot-shirt-0').click();
        await page.getByTestId('mathscot-color-0').click();
        await page.getByTestId('create-mathscot-submit-button').click();
        await page.getByTestId('confirm-mathscot-button').click();
        await waitForLoading(page);
        await expect(page.locator('.MuiAlert-message').filter({ hasText: 'Mathscot created successfully!' })).toBeVisible();
        await expect(page.getByTestId('mathscot-looking-good-modal')).not.toBeVisible();
    });

    test('Parent (topic magic link)', { tag: '@sanity' }, async ({ page }) => {
        const mySchoolName: string = `${generateSchoolName()} School`;
        const leaderFirstName: string = generateFirstName();
        const leaderlastName: string = generateLastName();
        const schoolEmail: string = generateUserEmail(leaderFirstName, leaderlastName);
        const parentFirstName: string | null = generateFirstName();
        const parentLastName: string | null = generateLastName();
        const parentEmail: string = generateUserEmail(parentFirstName, parentLastName);
        const myClassName: string = generateClassName();
        const myTopicName: string = generateTopicName();
        const activity_one: string = `${myTopicName} one`;
        const pupilFirstName: string | null = generateFirstName();
        const pupilLastName: string | null = generateLastName();

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
            email: schoolEmail,
            type: UserType.TEACHER,
            userStatus: UserStatus.ACTIVE,
            isSchoolLeader: true,
            schoolId: school.id,
            password: user.password,
            nameForChildren: `Mr ${leaderFirstName}`
        });
        const schoolClass = await utils.createClass(school.id, {
            name: myClassName,
            isRegistrationClass: true,
            isFullProgramme: true,
            mainTeacherId: leader.id,
            yearGroup: 1,
            periodIndex: currentPeriod.index,
            IsReadingLogsEnabled: true,
            readingLaunchDate: todayDate,
            readingStartDay: today.getDay(),
            readingTarget: 1,
            logCreatedById: user.id,
            logUpdatedById: user.id
        });
        const staticTopic = await utils.createStaticTopic({
            isReading: false,
            teacherTopicName: myTopicName,
            parentTopicName: myTopicName,
            isPublished: true,
            video: '605069004',
            logCreatedById: user.id,
            logUpdatedById: user.id
        });
        await db
            .insertInto('static_lwp_topic_domain_year_group')
            .values({
                domainId: '2',
                topicId: staticTopic.id,
                yearGroupId: '1'
            })
            .executeTakeFirstOrThrow();
        const staticActivity = await utils.createStaticActivity({
            name: activity_one,
            activityType: 'LEGACY',
            order: 1,
            topicId: staticTopic.id,
            logCreatedById: user.id,
            logUpdatedById: user.id
        });
        const classTopic = await utils.createClassTopic(schoolClass.id, {
            topicId: staticTopic?.id,
            releaseDate: todayDate,
            released: true
        });
        const pupil = await utils.createPupil(school.id, {
            firstname: pupilFirstName,
            lastname: pupilLastName,
            dateOfBirth: new Date(),
            startedSchool: '2024',
            isPremium: true,
            gender: 'MALE',
            UPN: generateUPN(),
            logCreatedById: user.id,
            logUpdatedById: user.id
        });
        const parent = await utils.createUser({
            firstname: parentFirstName,
            lastname: parentLastName,
            email: parentEmail,
            type: UserType.PARENT,
            userStatus: UserStatus.ACTIVE,
            password: user.password
        });
        await utils.addParentToPupil(pupil.id, parent.id, false);
        await utils.addPupilToClass(pupil.id, schoolClass.id);
        const pupilTopic = await utils.createPupilTopic({
            releaseDate: todayDate,
            pupilId: pupil.id,
            classTopicId: classTopic.id,
            topicId: staticTopic.id,
            watchedVideo: false,
            periodIndex: currentPeriod.index,
            silverStars: 0,
            earnedGoldStar: false
        });
        await utils.createPupilActivity({
            pupilId: pupil.id,
            topicId: pupilTopic.id,
            activityId: staticActivity.id,
            earnedStar: false,
            mathscotActivityItemIds: JSON.stringify([88, 188, 224])
        });
        const staticReadingTopic = await db
            .selectFrom('static_lwp_topic')
            .where('isReading', '=', true)
            .select(['id'])
            .executeTakeFirstOrThrow();
        const readingClassTopic = await utils.createClassTopic(schoolClass.id, {
            topicId: staticReadingTopic?.id,
            releaseDate: todayDate,
            released: true,
            readingTarget: 1
        });
        const readingPupilTopic = await utils.createPupilTopic({
            releaseDate: todayDate,
            pupilId: pupil.id,
            classTopicId: readingClassTopic.id,
            topicId: staticReadingTopic.id,
            watchedVideo: false,
            periodIndex: currentPeriod.index,
            silverStars: 0,
            earnedGoldStar: false,
            readingTarget: 1
        });
        const magicLink = await utils.createMagicLink({
            url: Date.now().toString(),
            expiryTime: oneYearFromToday,
            lastRegeneratedAt: new Date(),
            type: 'READING',
            isUsed: false,
            pupilId: pupil.id,
            context: JSON.stringify({ pupilTopicId: readingPupilTopic.id }),
            userId: parent.id
        });

        await page.goto(`/magic/${magicLink.url}`);

        // Reading
        await page.getByTestId('recommended-pupil-topic').first().click();
        await waitForLoading(page);
        await page.getByTestId('reading-log-slider-day').first().click();
        try {
            await expect(page.getByTestId('reading-record-found-modal')).toBeVisible();
            await page.getByTestId('reading-record-found-modal-create-button').click();
        } catch (e) {
            // Do nothing (It's the first one)
        }
        await page.getByTestId('read-aloud-card').first().click();
        await page.getByTestId('school-book-card').first().click();
        await page.getByTestId('book-name-input').fill('Harry Potter');
        await page.getByTestId('comment-card').click();
        await page.getByTestId('comment-input').fill('Nice!');
        const updatePermisisonsLink = page.getByTestId('update-photo-permission-link');
        if (await updatePermisisonsLink.isVisible()) {
            await updatePermisisonsLink.click();
        }
        await getInputBoxByName(page, 'shareWithTeacher').check();
        await page.getByTestId('submit-reading-log-button').click();
        await waitForLoading(page);
        await page.getByTestId('reading-history-card').first().filter({ hasText: 'Nice!' }).first().isVisible();

        //Feedback
        await page.getByTestId('recommended-pupil-topic').nth(1).click();
        await page.waitForURL(/\/topic/);
        await waitForLoading(page);
        await page.getByTestId('video-card').click();
        await page.getByTestId('unlock-activities-button').click();
        await page.getByTestId('child-activity-card').first().click();
        await page.waitForURL(/\/activity/);
        await waitForLoading(page);
        await page.getByTestId('parent-comment-card').fill('parent comment');
        await page.getByTestId('pupil-comment-card').fill('pupil comment');
        if (await updatePermisisonsLink.isVisible()) {
            await updatePermisisonsLink.click();
        }
        await getInputBoxByName(page, 'shareWithTeacher').check();
        await page.getByTestId('save-comments-button').click();
        await waitForLoading(page);
        await page.getByTestId('choose-mathscot-button').click();
        await page.getByTestId('mathscot-character-0').click();
        await page.getByTestId('mathscot-shirt-0').click();
        await page.getByTestId('mathscot-color-0').click();
        await page.getByTestId('create-mathscot-submit-button').click();
        await page.getByTestId('confirm-mathscot-button').click();
        await waitForLoading(page);
        await expect(page.locator('.MuiAlert-message').filter({ hasText: 'Mathscot created successfully!' })).toBeVisible();
        await expect(page.getByTestId('mathscot-looking-good-modal')).not.toBeVisible();
    });

    test('Parent (newly invited)', { tag: '@sanity' }, async ({ page }) => {
        const mySchoolName: string = `${generateSchoolName()} School`;
        const leaderFirstName: string = generateFirstName();
        const leaderlastName: string = generateLastName();
        const schoolEmail: string = generateUserEmail(leaderFirstName, leaderlastName);
        const parentFirstName: string | null = generateFirstName();
        const parentLastName: string | null = generateLastName();
        const parentEmail: string = generateUserEmail(parentFirstName, parentLastName);
        const myClassName: string = generateClassName();
        const myTopicName: string = generateTopicName();
        const activity_one: string = `${myTopicName} one`;
        const pupilFirstName: string | null = generateFirstName();
        const pupilLastName: string | null = generateLastName();

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
            email: schoolEmail,
            type: UserType.TEACHER,
            userStatus: UserStatus.ACTIVE,
            isSchoolLeader: true,
            schoolId: school.id,
            password: user.password,
            nameForChildren: `Mr ${leaderFirstName}`
        });
        const schoolClass = await utils.createClass(school.id, {
            name: myClassName,
            isRegistrationClass: true,
            isFullProgramme: true,
            mainTeacherId: leader.id,
            yearGroup: 1,
            periodIndex: currentPeriod.index,
            IsReadingLogsEnabled: true,
            readingLaunchDate: todayDate,
            readingStartDay: today.getDay(),
            readingTarget: 1,
            logCreatedById: user.id,
            logUpdatedById: user.id
        });
        const staticTopic = await utils.createStaticTopic({
            isReading: false,
            teacherTopicName: myTopicName,
            parentTopicName: myTopicName,
            isPublished: true,
            video: '605069004',
            logCreatedById: user.id,
            logUpdatedById: user.id
        });
        await db
            .insertInto('static_lwp_topic_domain_year_group')
            .values({
                domainId: '2',
                topicId: staticTopic.id,
                yearGroupId: '1'
            })
            .executeTakeFirstOrThrow();
        const staticActivity = await utils.createStaticActivity({
            name: activity_one,
            activityType: 'LEGACY',
            order: 1,
            topicId: staticTopic.id,
            logCreatedById: user.id,
            logUpdatedById: user.id
        });
        const classTopic = await utils.createClassTopic(schoolClass.id, {
            topicId: staticTopic?.id,
            releaseDate: todayDate,
            released: true
        });
        const pupil = await utils.createPupil(school.id, {
            firstname: pupilFirstName,
            lastname: pupilLastName,
            dateOfBirth: new Date(),
            startedSchool: '2024',
            isPremium: true,
            gender: 'MALE',
            UPN: generateUPN(),
            logCreatedById: user.id,
            logUpdatedById: user.id
        });
        const parent = await utils.createUser({
            firstname: parentFirstName,
            lastname: parentLastName,
            email: parentEmail,
            type: UserType.PARENT,
            userStatus: UserStatus.INVITED
        });
        await utils.addParentToPupil(pupil.id, parent.id, true, PupilParentStatus.INVITED);
        await utils.addPupilToClass(pupil.id, schoolClass.id);
        const pupilTopic = await utils.createPupilTopic({
            releaseDate: todayDate,
            pupilId: pupil.id,
            classTopicId: classTopic.id,
            topicId: staticTopic.id,
            watchedVideo: false,
            periodIndex: currentPeriod.index,
            silverStars: 0,
            earnedGoldStar: false
        });
        await utils.createPupilActivity({
            pupilId: pupil.id,
            topicId: pupilTopic.id,
            activityId: staticActivity.id,
            earnedStar: false,
            mathscotActivityItemIds: JSON.stringify([88, 188, 224])
        });
        const staticReadingTopic = await db
            .selectFrom('static_lwp_topic')
            .where('isReading', '=', true)
            .select(['id'])
            .executeTakeFirstOrThrow();
        const readingClassTopic = await utils.createClassTopic(schoolClass.id, {
            topicId: staticReadingTopic?.id,
            releaseDate: todayDate,
            released: true,
            readingTarget: 1
        });
        const readingPupilTopic = await utils.createPupilTopic({
            releaseDate: todayDate,
            pupilId: pupil.id,
            classTopicId: readingClassTopic.id,
            topicId: staticReadingTopic.id,
            watchedVideo: false,
            periodIndex: currentPeriod.index,
            silverStars: 0,
            earnedGoldStar: false,
            readingTarget: 1
        });
        const magicLink = await utils.createMagicLink({
            url: Date.now().toString(),
            expiryTime: oneYearFromToday,
            lastRegeneratedAt: new Date(),
            type: 'READING',
            isUsed: false,
            pupilId: pupil.id,
            context: JSON.stringify({ pupilTopicId: readingPupilTopic.id }),
            userId: parent.id
        });

        // Test
        await page.goto(`/magic/${magicLink.url}`);

        // Interstitial
        await page.getByTestId('interstitial-next-btn').click();
        await page.getByTestId('interstitial-next-btn').click();
        await page.getByTestId('interstitial-terms-checkbox').click();
        await page.getByTestId('interstitial-next-btn').click();

        // Reading
        await page.getByTestId('recommended-pupil-topic').first().click();
        await waitForLoading(page);
        await page.getByTestId('reading-log-slider-day').first().click();
        try {
            await expect(page.getByTestId('reading-record-found-modal')).toBeVisible();
            await page.getByTestId('reading-record-found-modal-create-button').click();
        } catch (e) {
            // Do nothing (It's the first one)
        }
        await page.getByTestId('read-aloud-card').first().click();
        await page.getByTestId('school-book-card').first().click();
        await page.getByTestId('book-name-input').fill('Harry Potter');
        await page.getByTestId('comment-card').click();
        await page.getByTestId('comment-input').fill('Nice!');
        const updatePermisisonsLink = page.getByTestId('update-photo-permission-link');
        if (await updatePermisisonsLink.isVisible()) {
            await updatePermisisonsLink.click();
        }
        await getInputBoxByName(page, 'shareWithTeacher').check();
        await page.getByTestId('submit-reading-log-button').click();
        await waitForLoading(page);
        await page.getByTestId('reading-history-card').first().filter({ hasText: 'Nice!' }).first().isVisible();

        //Feedback
        await page.getByTestId('recommended-pupil-topic').nth(1).click();
        await page.waitForURL(/\/topic/);
        await waitForLoading(page);
        await page.getByTestId('video-card').click();
        await page.getByTestId('unlock-activities-button').click();
        await waitForLoading(page);
        await expect(page.getByTestId('unlock-activities-button')).not.toBeVisible();
        await page.getByTestId('child-activity-card').first().click();
        await page.waitForURL(/\/activity/);
        await waitForLoading(page);
        await page.getByTestId('parent-comment-card').fill('parent comment');
        await page.getByTestId('pupil-comment-card').fill('pupil comment');
        if (await updatePermisisonsLink.isVisible()) {
            await updatePermisisonsLink.click();
        }
        await getInputBoxByName(page, 'shareWithTeacher').check();
        await page.getByTestId('save-comments-button').click();
        await waitForLoading(page);
        await page.getByTestId('choose-mathscot-button').click();
        await page.getByTestId('mathscot-character-0').click();
        await page.getByTestId('mathscot-shirt-0').click();
        await page.getByTestId('mathscot-color-0').click();
        await page.getByTestId('create-mathscot-submit-button').click();
        await page.getByTestId('confirm-mathscot-button').click();
        await waitForLoading(page);
        await expect(page.locator('.MuiAlert-message').filter({ hasText: 'Mathscot created successfully!' })).toBeVisible();
        await expect(page.getByTestId('mathscot-looking-good-modal')).not.toBeVisible();

        // Register
        await page.getByTestId('parent-popover-list-menu-icon').click();
        await page.getByTestId('burger-menu-desktop').getByTestId('burger-menu-item-account-settings-btn').click();
        await page.getByTestId('login-or-signup-modal-primary-btn').click();
        await expect(page.getByTestId('check-your-email-or-phone')).toBeVisible();
        await page.waitForTimeout(2000); // Wait for email to be sent
        const parentMagicLink = await db
            .selectFrom('lwp_magic_link')
            .where('type', '=', 'INVITATION')
            .where('isUsed', '=', false)
            .where('userId', '=', parent.id)
            .where('expiryTime', '>', new Date())
            .select(['url'])
            .executeTakeFirst();
        expect(parentMagicLink?.url).toBeDefined();
        await page.goto(`/magic/${parentMagicLink?.url}`);
        await page.waitForURL(/\/signup/);
        await waitForLoading(page);
        await page.getByTestId('signup-continue-btn').click();
        await waitForLoading(page);
        await page.getByTestId('signup-password-input').fill(signupPassword);
        await page.getByTestId('signup-repeat-password-input').fill(signupPassword);
        await getInputBoxByName(page, 'policy').check();
        await page.getByTestId('signup-submit-btn').click();
        await page.waitForURL(/\/child\/\d+\/reading/);
        await waitForLoading(page);
    });

    test('Teacher', { tag: '@sanity' }, async ({ page }) => {
        const mySchoolName: string = `${generateSchoolName()} School`;
        const leaderFirstName: string = generateFirstName();
        const leaderlastName: string = generateLastName();
        const schoolEmail: string = generateUserEmail(leaderFirstName, leaderlastName);
        const teacherFirstName: string = generateFirstName();
        const teacherlastName: string = generateLastName();
        const teacherEmail: string = generateUserEmail(teacherFirstName, teacherlastName);
        const parentFirstName: string | null = generateFirstName();
        const parentLastName: string | null = generateLastName();
        const parentEmail: string = generateUserEmail(parentFirstName, parentLastName);
        const myClassName: string = generateClassName();
        const myTopicName: string = generateTopicName();
        const activity_one: string = `${myTopicName} one`;
        const pupilFirstName: string | null = generateFirstName();
        const pupilLastName: string | null = generateLastName();

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
            email: schoolEmail,
            type: UserType.TEACHER,
            userStatus: UserStatus.ACTIVE,
            isSchoolLeader: true,
            schoolId: school.id,
            password: user.password,
            nameForChildren: `Mr ${leaderFirstName}`
        });
        const teacher = await utils.createUser({
            firstname: teacherFirstName,
            lastname: teacherlastName,
            email: teacherEmail,
            type: UserType.TEACHER,
            userStatus: UserStatus.ACTIVE,
            isSchoolLeader: false,
            schoolId: school.id,
            password: user.password,
            nameForChildren: `Mr ${teacherlastName}`
        });
        const schoolClass = await utils.createClass(school.id, {
            name: myClassName,
            isRegistrationClass: true,
            isFullProgramme: true,
            mainTeacherId: leader.id,
            yearGroup: 1,
            periodIndex: currentPeriod.index,
            IsReadingLogsEnabled: true,
            readingLaunchDate: todayDate,
            readingStartDay: today.getDay(),
            readingTarget: 1,
            logCreatedById: user.id,
            logUpdatedById: user.id
        });
        await db.insertInto('lwp_class_teacher').values({ lwpUserId: teacher.id, lwpSchoolClassId: schoolClass.id }).execute();
        const staticTopic = await utils.createStaticTopic({
            isReading: false,
            teacherTopicName: myTopicName,
            parentTopicName: myTopicName,
            isPublished: true,
            video: '605069004',
            logCreatedById: user.id,
            logUpdatedById: user.id
        });
        await db
            .insertInto('static_lwp_topic_domain_year_group')
            .values({
                domainId: '2',
                topicId: staticTopic.id,
                yearGroupId: '1'
            })
            .executeTakeFirstOrThrow();
        const staticActivity = await utils.createStaticActivity({
            name: activity_one,
            activityType: 'LEGACY',
            order: 1,
            topicId: staticTopic.id,
            logCreatedById: user.id,
            logUpdatedById: user.id
        });
        const classTopic = await utils.createClassTopic(schoolClass.id, {
            topicId: staticTopic?.id,
            releaseDate: todayDate,
            released: true
        });
        const pupil = await utils.createPupil(school.id, {
            firstname: pupilFirstName,
            lastname: pupilLastName,
            dateOfBirth: new Date(),
            startedSchool: '2024',
            isPremium: true,
            gender: 'MALE',
            UPN: generateUPN(),
            logCreatedById: user.id,
            logUpdatedById: user.id
        });
        const parent = await utils.createUser({
            firstname: parentFirstName,
            lastname: parentLastName,
            email: parentEmail,
            type: UserType.PARENT,
            userStatus: UserStatus.INVITED
        });
        await utils.addParentToPupil(pupil.id, parent.id, false);
        await utils.addPupilToClass(pupil.id, schoolClass.id);
        const pupilTopic = await utils.createPupilTopic({
            releaseDate: todayDate,
            pupilId: pupil.id,
            classTopicId: classTopic.id,
            topicId: staticTopic.id,
            watchedVideo: false,
            periodIndex: currentPeriod.index,
            silverStars: 0,
            earnedGoldStar: false
        });
        await utils.createPupilActivity({
            pupilId: pupil.id,
            topicId: pupilTopic.id,
            activityId: staticActivity.id,
            earnedStar: false,
            mathscotActivityItemIds: JSON.stringify([88, 188, 224])
        });
        const staticReadingTopic = await db
            .selectFrom('static_lwp_topic')
            .where('isReading', '=', true)
            .select(['id'])
            .executeTakeFirstOrThrow();
        const readingClassTopic = await utils.createClassTopic(schoolClass.id, {
            topicId: staticReadingTopic?.id,
            releaseDate: todayDate,
            released: true,
            readingTarget: 1
        });
        await utils.createPupilTopic({
            releaseDate: todayDate,
            pupilId: pupil.id,
            classTopicId: readingClassTopic.id,
            topicId: staticReadingTopic.id,
            watchedVideo: false,
            periodIndex: currentPeriod.index,
            silverStars: 0,
            earnedGoldStar: false,
            readingTarget: 1
        });

        await login(page, teacherEmail, password);
        await page.waitForURL(/\/feed/);
        await waitForLoading(page);

        try {
            await expect(page.getByTestId('tooltip-update-button')).toHaveText('Next');
            await page.getByTestId('tooltip-update-button').click();
            await waitForLoading(page);
        } catch (e) {
            //Already pressed
        }

        try {
            await expect(page.getByTestId('tooltip-update-button')).toHaveText('Got it');
            await page.getByTestId('tooltip-update-button').click();
            await waitForLoading(page);
        } catch (e) {
            //Already pressed
        }

        // Click around all tabs for a class
        await page.getByTestId('side-drawer-arrow').click();
        await page.getByTestId('my-classes-common-drawer-list').first().click();

        // Week by week tab
        await page.waitForURL(/\/class\/\d+\/readingweek/);
        await waitForLoading(page);
        await expect(page.getByTestId('class-week-by-week-page')).toBeVisible();

        // Pupils tab
        await page.getByTestId('common-nav-pupils-tab').click();
        await page.waitForURL(/\/class\/\d+\/pupils/);
        await waitForLoading(page);
        await expect(page.getByTestId('class-register-page')).toBeVisible();

        // Schedule tab
        await page.getByTestId('common-nav-schedule-tab').click();
        await page.waitForURL(/\/class\/\d+\/schedule/);
        await waitForLoading(page);
        await expect(page.getByTestId('class-schedule-page')).toBeVisible();

        // Mathscots tab
        await page.getByTestId('common-nav-mathscots-tab').click();
        await page.waitForURL(/\/class\/\d+\/mathscots/);
        await waitForLoading(page);
        await expect(page.getByTestId('class-pupils-page')).toBeVisible();

        // Activity grid tab
        await page.getByTestId('common-nav-activity-grid-tab').click();
        await page.waitForURL(/\/class\/\d+\/activity-grid/);
        await waitForLoading(page);
        await expect(page.getByTestId('class-register-page')).toBeVisible();

        // Class groups tab
        await page.getByTestId('common-nav-class-groups-tab').click();
        await page.waitForURL(/\/class\/\d+\/class-groups/);
        await waitForLoading(page);
        await expect(page.getByTestId('class-groups-page')).toBeVisible();

        // Click around teacher view of a pupil
        await page.goto(`/pupil/${pupil.id}`);

        // Activities tab
        page.waitForURL(/\/pupil\/\d+/);
        await waitForLoading(page);
        await expect(page.getByTestId('activities-section')).toBeVisible();

        // Reading tab
        await page.getByTestId('pupil-details-reading-tab').click();
        await waitForLoading(page);
        await expect(page.getByTestId('reading-log-section')).toBeVisible();

        // Awards tab
        await page.getByTestId('pupil-details-awards-tab').click();
        await waitForLoading(page);
        await expect(page.getByTestId('pupil-trophies-section')).toBeVisible();

        // Details tab
        await page.getByTestId('pupil-details-details-tab').click();
        await waitForLoading(page);
        await expect(page.getByTestId('pupil-details-section')).toBeVisible();

        // Mathscot tab
        await page.getByTestId('pupil-details-mathscot-tab').click();
        await waitForLoading(page);
        await expect(page.getByTestId('edit-pupil-mathscot-section')).toBeVisible();
        await page.getByTestId('edit-child-action').click();
        await expect(page.getByTestId('edit-child-modal')).toBeVisible();
        await page.getByTestId('dialog-cancel-btn').click();
        await page.getByTestId('add-parent-action').click();
        await expect(page.getByTestId('add-parent-modal')).toBeVisible();
        await page.getByTestId('dialog-cancel-btn').click();

        // Record some reading
        await page.getByTestId('sidebar-log-reading-btn').click();
        await page.waitForURL(/\/school\/\d+\/log-reading/);
        await waitForLoading(page);
        await expect(page.getByTestId('log-reading-section')).toBeVisible();

        const bookName = `${faker.lorem.words(3)} ${faker.number.int()}`;
        await page.getByTestId('reading-group-form-pupils-select').click();
        await page.getByTestId('multi-select-main-options').first().click();
        await page.keyboard.press('Escape');
        await page.getByTestId('reading-group-form-book-title-input').pressSequentially(bookName);
        await page.getByTestId('reading-group-form-submit-btn').click();
        await waitForLoading(page);

        // Schedule a topic to start today
        await page.getByTestId('sidebar-set-a-topic-btn').click();
        await page.waitForURL(/\/school\/\d+\/topic-library/);
        await waitForLoading(page);
        await expect(page.getByTestId('topic-library-section')).toBeVisible();
        await page.getByTestId('topic-library-year-group-select').click();
        await page.getByText('Year 1').click();
        await page.getByTestId('topic-library-search-btn').click();
        await page.getByTestId('topic-summary-card-select-topic-btn').first().click();
        await page.getByTestId('schedule-topic-class-select').click();
        await page.getByTestId(`schedule-topic-class-option[${myClassName}]`).click();
        await page.getByTestId('schedule-topic-start-date-input').fill(DateTime.now().toFormat('dd/MM/yyyy'));
        await page.getByTestId('schedule-topic-submit-btn').click();
        await page.getByTestId('topic-library-year-group-select').click();
        await page.getByText('Year 1').click();
        await page.getByTestId('topic-library-search-btn').click();
        await waitForLoading(page);
        await page.getByTestId('topic-summary-card-select-topic-btn').nth(1).click();
        await page.getByTestId('schedule-topic-class-select').click();
        await page.getByTestId(`schedule-topic-class-option[${myClassName}]`).click();
        await page.getByTestId('schedule-topic-start-date-input').fill(DateTime.now().plus({ day: 5 }).toFormat('dd/MM/yyyy'));
        await page.getByTestId('schedule-topic-submit-btn').click();
        await waitForLoading(page);
        await page.getByTestId('my-classes-common-drawer-list').last().click();
        await page.waitForURL(/\/class\/\d+\/readingweek/);
        await waitForLoading(page);
        await page.getByTestId('common-nav-schedule-tab').click();
        await page.waitForURL(/\/class\/\d+\/schedule/);
        await waitForLoading(page);
        await expect(page.getByTestId('class-schedule-page')).toBeVisible();
        await expect(page.getByText(DateTime.now().toFormat('EEE dd MMM'), { exact: true }).first()).toBeVisible();
    });

    test('School leader', { tag: '@sanity' }, async ({ page }) => {
        const mySchoolName: string = `${generateSchoolName()} School`;
        const leaderFirstName: string = generateFirstName();
        const leaderlastName: string = generateLastName();
        const schoolEmail: string = generateUserEmail(leaderFirstName, leaderlastName);
        const myClassName: string = generateClassName();

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
            email: schoolEmail,
            type: UserType.TEACHER,
            userStatus: UserStatus.ACTIVE,
            isSchoolLeader: true,
            schoolId: school.id,
            password: user.password,
            nameForChildren: `Mr ${leaderFirstName}`
        });
        await utils.addUserTooltipHistory(leader.id, 'topic-library-tooltip');
        await utils.addUserTooltipHistory(leader.id, 'school-reading-log-tooltip');
        await utils.createClass(school.id, {
            name: myClassName,
            isRegistrationClass: true,
            isFullProgramme: true,
            mainTeacherId: leader.id,
            yearGroup: 1,
            periodIndex: currentPeriod.index,
            IsReadingLogsEnabled: true,
            readingLaunchDate: todayDate,
            readingStartDay: today.getDay(),
            readingTarget: 1,
            logCreatedById: user.id,
            logUpdatedById: user.id
        });

        await login(page, schoolEmail, password);
        await page.waitForURL(/\/school/);
        await waitForLoading(page);
        await expect(page.getByTestId('common-drawer-list')).toBeVisible();
        await expect(page.getByTestId('school-overview-page')).toBeVisible();
        await expect(page.getByTestId('classes-overview-tab-section')).toBeVisible();

        await page.getByTestId('school-settings').click();
        await waitForLoading(page);

        await schoolSettingsPage(page, 'school-settings-holiday-dates');

        await schoolSettingsPage(page, 'school-settings-configuration');

        await schoolSettingsPage(page, 'school-settings-teachers');
    });

    test('Admin', { tag: '@sanity' }, async ({ page }) => {
        await login(page, admin, password);
        await page.waitForURL(/\/admin\/all-feeds/);
        await waitForLoading(page);
        await expect(page.getByTestId('common-drawer-list')).toBeVisible();

        await page.getByTestId('all-activity-common-drawer-list').click();
        await page.waitForURL(/\/admin\/all-feeds/);
        await waitForLoading(page);
        await expect(page.getByTestId('all-feeds-page')).toBeVisible();

        await page.getByTestId('schools-common-drawer-list').click();
        await page.waitForURL(/\/schools\/active/);
        await waitForLoading(page);
        await expect(page.getByTestId('schools-page')).toBeVisible();

        await page.getByTestId('export-data-common-drawer-list').click();
        await page.waitForURL(/\/admin\/export-data/);
        await waitForLoading(page);
        await expect(page.getByTestId('export-data-page')).toBeVisible();

        await page.getByTestId('news-common-drawer-list').click();
        await page.waitForURL(/\/admin\/news/);
        await waitForLoading(page);
        await expect(page.getByTestId('news-page')).toBeVisible();

        await page.getByTestId('site-forms-common-drawer-list').click();
        await page.waitForURL(/\/admin\/site-forms/);
        await waitForLoading(page);
        await expect(page.getByTestId('site-forms-page')).toBeVisible();

        await page.getByTestId('trophy-certificates-common-drawer-list').click();
        await page.waitForURL(/\/admin\/trophy-certificates/);
        await waitForLoading(page);
        await expect(page.getByTestId('trophy-certificates-page')).toBeVisible();

        await page.getByTestId('topics-common-drawer-list').click();
        await page.waitForURL(/\/admin\/topics/);
        await waitForLoading(page);
        await expect(page.getByTestId('topics-page')).toBeVisible();

        await page.getByTestId('subjects-common-drawer-list').click();
        await page.waitForURL(/\/admin\/subjects/);
        await waitForLoading(page);
        await expect(page.getByTestId('subjects-page')).toBeVisible();

        await page.getByTestId('domains-common-drawer-list').click();
        await page.waitForURL(/\/admin\/domains/);
        await waitForLoading(page);
        await expect(page.getByTestId('domains-page')).toBeVisible();

        await page.getByTestId('activity-tabs-common-drawer-list').click();
        await page.waitForURL(/\/admin\/activity-modals/);
        await waitForLoading(page);
        await expect(page.getByTestId('activity-tabs-page')).toBeVisible();

        await page.getByTestId('tags-common-drawer-list').click();
        await page.waitForURL(/\/admin\/tags/);
        await waitForLoading(page);
        await expect(page.getByTestId('tags-page')).toBeVisible();

        await page.getByTestId('stickers-common-drawer-list').click();
        await page.waitForURL(/\/admin\/stickers/);
        await waitForLoading(page);
        await expect(page.getByTestId('stickers-page')).toBeVisible();

        await page.getByTestId('partnerships-common-drawer-list').click();
        await page.waitForURL(/\/admin\/partnerships/);
        await waitForLoading(page);
        await expect(page.getByTestId('partnerships-page')).toBeVisible();

        await page.getByTestId('email-templates-common-drawer-list').click();
        await page.waitForURL(/\/admin\/email-templates/);
        await waitForLoading(page);
        await expect(page.getByTestId('email-templates-page')).toBeVisible();

        await page.getByTestId('data-queries-common-drawer-list').click();
        await page.waitForURL(/\/admin\/data-queries/);
        await waitForLoading(page);
        await expect(page.getByTestId('data-queries-page')).toBeVisible();

        await page.getByTestId('faqs-common-drawer-list').click();
        await page.waitForURL(/\/admin\/faqs/);
        await waitForLoading(page);
        await expect(page.getByTestId('faqs-page')).toBeVisible();

        await page.getByTestId('public-documents-common-drawer-list').click();
        await page.waitForURL(/\/admin\/upload-file/);
        await waitForLoading(page);
        await expect(page.getByTestId('public-documents-page')).toBeVisible();

        await page.getByTestId('term-dates-common-drawer-list').click();
        await page.waitForURL(/\/admin\/terms/);
        await waitForLoading(page);
        await expect(page.getByTestId('term-dates-page')).toBeVisible();

        await page.getByTestId('academic-years-common-drawer-list').click();
        await page.waitForURL(/\/admin\/academic-years/);
        await waitForLoading(page);
        await expect(page.getByTestId('academic-years-page')).toBeVisible();

        await page.getByTestId('site-admins-common-drawer-list').click();
        await page.waitForURL(/\/admin\/admins/);
        await waitForLoading(page);
        await expect(page.getByTestId('site-admins-page')).toBeVisible();

        await page.getByTestId('year-groups-common-drawer-list').click();
        await page.waitForURL(/\/admin\/year-groups/);
        await waitForLoading(page);
        await expect(page.getByTestId('year-groups-page')).toBeVisible();

        await page.getByTestId('run-tasks-common-drawer-list').click();
        await page.waitForURL(/\/admin\/run-cron-jobs/);
        await waitForLoading(page);
        await expect(page.getByTestId('run-tasks-page')).toBeVisible();

        await page.getByTestId('bad-email-parameters-common-drawer-list').click();
        await page.waitForURL(/\/admin\/email-bad-params/);
        await waitForLoading(page);
        await expect(page.getByTestId('bad-email-parameters-page')).toBeVisible();

        await page.getByTestId('failed-emails-common-drawer-list').click();
        await page.waitForURL(/\/admin\/failed-emails/);
        await waitForLoading(page);
        await expect(page.getByTestId('failed-emails-page')).toBeVisible();

        await page.getByTestId('site-parameters-common-drawer-list').click();
        await page.waitForURL(/\/admin\/parameters/);
        await waitForLoading(page);
        await expect(page.getByTestId('site-parameters-page')).toBeVisible();

        await page.getByTestId('send-test-email-common-drawer-list').click();
        await page.waitForURL(/\/admin\/test-email/);
        await waitForLoading(page);
        await expect(page.getByTestId('send-test-email-page')).toBeVisible();
    });
});
