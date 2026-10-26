import { test, expect, devices, type Page } from '@playwright/test';
import type { Schema } from '@lwp/postgres-client';
import { type Kysely } from 'kysely';
import { createDb } from './db';
import { createUtils } from './dbUtils';
import path from 'path';
import {
    password,
    generateSchoolName,
    generateFirstName,
    generateLastName,
    generateUserEmail,
    generateClassName,
    generateTopicName,
    generateSentence,
    generateUPN
} from './constants';
import { formatDate, getInputBoxByName, getTextAreaBoxByName, login, waitForLoading } from './utils';
import { UserStatus, UserType } from 'lwp-shared';

test.use({
    launchOptions: {
        args: [
            '--use-fake-ui-for-media-stream', // auto‐accept mic prompts
            '--use-fake-device-for-media-stream' // provide a fake audio input
        ]
    },
    contextOptions: {
        permissions: ['microphone'] // grant mic permission
    }
});

test.describe('Feedback Media Workflow', { tag: '@smoke' }, () => {
    let db: Kysely<Schema.DB>;
    let utils: ReturnType<typeof createUtils>;

    test.beforeAll(async () => {
        db = createDb();
        utils = createUtils(db);
    });

    test.afterAll(async () => {
        await db.destroy();
    });

    test('Feedback Media Workflow', async ({ page }) => {
        const mySchoolName: string = `${generateSchoolName()} School`;
        const leaderFirstName: string = generateFirstName();
        const leaderlastName: string = generateLastName();
        const schoolEmail: string = generateUserEmail(leaderFirstName, leaderlastName);
        const parentFirstName: string = generateFirstName();
        const parentLastName: string = generateLastName();
        const parentEmail: string = generateUserEmail(parentFirstName, parentLastName);
        const myClassName: string = generateClassName();
        const myTopicName: string = generateTopicName();
        const activity_one: string = `${myTopicName} one`;
        const activity_two: string = `${myTopicName} two`;
        const pupilFirstName: string = generateFirstName();
        const pupilLastName: string = generateLastName();
        const feedbackInput = {
            readingLogBookName: generateSentence(),
            readingLogComment: generateSentence(4),
            activityParentComment: generateSentence(4),
            activityPupilComment: generateSentence(4)
        };
        let addMoreCommentsButton: boolean = false;
        const today = new Date();
        const todayDate = formatDate();

        // Creates a new school and associated data using the admin API
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
        const staticActivity1 = await utils.createStaticActivity({
            name: activity_one,
            activityType: 'LEGACY',
            order: 1,
            topicId: staticTopic.id,
            logCreatedById: user.id,
            logUpdatedById: user.id
        });
        const staticActivity2 = await utils.createStaticActivity({
            name: activity_two,
            activityType: 'LEGACY',
            order: 2,
            topicId: staticTopic.id,
            logCreatedById: user.id,
            logUpdatedById: user.id
        });
        const classTopic1 = await utils.createClassTopic(schoolClass.id, {
            topicId: staticTopic?.id,
            releaseDate: todayDate,
            released: true
        });
        const pupil1 = await utils.createPupil(school.id, {
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
        await utils.addParentToPupil(pupil1.id, parent.id, false);
        await utils.addPupilToClass(pupil1.id, schoolClass.id);
        const pupilTopic1 = await utils.createPupilTopic({
            releaseDate: todayDate,
            pupilId: pupil1.id,
            classTopicId: classTopic1.id,
            topicId: staticTopic.id,
            watchedVideo: false,
            periodIndex: currentPeriod.index,
            silverStars: 0,
            earnedGoldStar: false
        });
        await utils.createPupilActivity({
            pupilId: pupil1.id,
            topicId: pupilTopic1.id,
            activityId: staticActivity1.id,
            earnedStar: false,
            mathscotActivityItemIds: JSON.stringify([88, 188, 224])
        });
        await utils.createPupilActivity({
            pupilId: pupil1.id,
            topicId: pupilTopic1.id,
            activityId: staticActivity2.id,
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
            pupilId: pupil1.id,
            classTopicId: readingClassTopic.id,
            topicId: staticReadingTopic.id,
            watchedVideo: false,
            periodIndex: currentPeriod.index,
            silverStars: 0,
            earnedGoldStar: false,
            readingTarget: 1
        });

        // Submit reading log with recorded audio
        await login(page, parentEmail, password);
        await page.waitForURL(/\/child\/\d+\/reading/);
        await waitForLoading(page);
        await page.getByTestId('reading-log-slider-day').first().click();
        await waitForLoading(page);
        const modal = page.getByTestId('reading-record-found-modal');
        if (await modal.isVisible()) {
            await modal.getByTestId('reading-record-found-modal-create-button').click();
        }
        await onScreen(page, 'read-aloud-card').click();
        await onScreen(page, 'school-book-card').click();
        await onScreen(page, 'book-name-input').fill(feedbackInput.readingLogBookName);
        await page.getByTestId('comment-card').click();
        await page.getByTestId('comment-input').fill(feedbackInput.readingLogComment);
        await page.getByTestId('audio-card').click();
        await page.getByRole('button', { name: 'Record audio' }).click();
        await page.waitForTimeout(3000);
        await page.getByRole('button', { name: 'Stop recording' }).click();
        await waitForLoading(page);
        await onScreen(page, 'share-permissions-checkbox').click();
        await onScreen(page, 'submit-reading-log-button').click();
        await waitForLoading(page);
        await expect(page.locator('.MuiAlert-message').filter({ hasText: 'Reading entry has been added' })).toBeVisible();
        await expect(page.getByTestId('reading-history-card').first().filter({ hasText: feedbackInput.readingLogComment })).toBeVisible();
        await expect(page.getByTestId('audio-player-preview').first()).toBeVisible();

        // Submit activity feedback with photo upload
        await page.getByTestId('topics-tab').click();
        await page.waitForURL(/\/child\/\d+\/topics/);
        await waitForLoading(page);
        await expect(page.getByTestId('child-topics-page')).toBeVisible();
        await page.getByText(myTopicName).first().click();
        await page.waitForURL(/\/topic/);
        await waitForLoading(page);
        await expect(page.getByRole('heading', { name: myTopicName })).toBeVisible();
        await page.getByTestId('video-card-play-icon').first().click();
        await page.getByRole('button', { name: 'Unlock activities' }).click();
        await waitForLoading(page);
        await page.getByText(activity_one).first().click();
        await page.waitForURL(/\/activity/);
        await waitForLoading(page);
        const addCommentButton = page.getByRole('button', { name: 'Add comments/photos' });
        if (await addCommentButton.isVisible()) {
            addMoreCommentsButton = true;
            addCommentButton.click();
        }
        await getTextAreaBoxByName(page, 'parentComment').fill(feedbackInput.activityParentComment);
        await getTextAreaBoxByName(page, 'pupilComment').fill(feedbackInput.activityPupilComment);
        const filePath = path.resolve(__dirname, '../cypress/fixtures/dp.jpg');
        // The uploader also carries a camera and a gallery input for touch devices, so this has to
        // name the drag-and-drop one rather than matching every file input on the page.
        await page.locator('.dropzone-container input[type="file"]').setInputFiles(filePath);
        await page.getByRole('button', { name: 'Save changes' }).click();
        await waitForLoading(page);
        const updatePermisisonsLink = page.getByTestId('update-photo-permission-link');
        if (await updatePermisisonsLink.isVisible()) {
            await updatePermisisonsLink.click();
        }
        await getInputBoxByName(page, 'shareWithTeacher').check();
        await page.getByRole('button', { name: addMoreCommentsButton ? 'Save' : 'Save comments' }).click();
        await waitForLoading(page);
        await expect(page.locator('.MuiAlert-message').filter({ hasText: 'Comments have been saved' })).toBeVisible();
        await page.getByTestId('expand-activity-feedback-icon').first().click();
        await expect(page.getByTestId('common-render-image-container')).toBeVisible();
        await expect(page.getByTestId('feedback-family-comment').filter({ hasText: feedbackInput.activityParentComment })).toBeVisible();
        await expect(page.getByTestId('feedback-pupil-comment').filter({ hasText: feedbackInput.activityPupilComment })).toBeVisible();
    });
});

/**
 * Builds just enough of a school for a parent to open a reading log: no topics or activities, which
 * the photo-source tests below do not need.
 */
const createParentWithAReadingLog = async (db: Kysely<Schema.DB>, utils: ReturnType<typeof createUtils>) => {
    const today = new Date();
    const todayDate = formatDate();
    const leaderFirstName = generateFirstName();
    const leaderLastName = generateLastName();
    const parentFirstName = generateFirstName();
    const parentLastName = generateLastName();
    const parentEmail = generateUserEmail(parentFirstName, parentLastName);
    const leaderEmail = generateUserEmail(leaderFirstName, leaderLastName);

    const user = await db.selectFrom('lwp_user').where('id', '=', '1').select(['id', 'password']).executeTakeFirstOrThrow();
    const currentPeriod = await db
        .selectFrom('static_lwp_period')
        .where('isCurrentPeriod', '=', true)
        .select('index')
        .executeTakeFirstOrThrow();
    const school = await utils.createSchool({
        schoolName: `${generateSchoolName()} School`,
        curentPeriodIndex: currentPeriod.index,
        numOfFullProgrammeClassesAllowed: 10,
        numOfTotalClassesAllowed: 30,
        enableAddClasses: true,
        logCreatedById: user.id,
        logUpdatedById: user.id
    });
    const leader = await utils.createUser({
        firstname: leaderFirstName,
        lastname: leaderLastName,
        email: leaderEmail,
        type: UserType.TEACHER,
        userStatus: UserStatus.ACTIVE,
        isSchoolLeader: true,
        schoolId: school.id,
        password: user.password,
        nameForChildren: `Mr ${leaderFirstName}`
    });
    const schoolClass = await utils.createClass(school.id, {
        name: generateClassName(),
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
    const pupil = await utils.createPupil(school.id, {
        firstname: generateFirstName(),
        lastname: generateLastName(),
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

    const staticReadingTopic = await db
        .selectFrom('static_lwp_topic')
        .where('isReading', '=', true)
        .select(['id'])
        .executeTakeFirstOrThrow();
    const readingClassTopic = await utils.createClassTopic(schoolClass.id, {
        topicId: staticReadingTopic.id,
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

    return { parentEmail, school, schoolClass, pupil, currentPeriod, user, todayDate, leaderEmail };
};

/**
 * Adds a normal (non-reading) topic with one activity, which is what the scrapbook and the activity
 * feedback card need. Returns the ids those pages are addressed by.
 */
const addATopic = async (
    db: Kysely<Schema.DB>,
    utils: ReturnType<typeof createUtils>,
    base: Awaited<ReturnType<typeof createParentWithAReadingLog>>
) => {
    const topicName = generateTopicName();
    const activityName = `${topicName} one`;
    const staticTopic = await utils.createStaticTopic({
        isReading: false,
        teacherTopicName: topicName,
        parentTopicName: topicName,
        isPublished: true,
        video: '605069004',
        // Without a prompt the topic is not scrapbook-eligible and /scrapbook/<id> bounces home.
        scrapbookPrompt: 'What did you enjoy most?',
        logCreatedById: base.user.id,
        logUpdatedById: base.user.id
    });

    await db
        .insertInto('static_lwp_topic_domain_year_group')
        .values({ domainId: '2', topicId: staticTopic.id, yearGroupId: '1' })
        .executeTakeFirstOrThrow();

    const staticActivity = await utils.createStaticActivity({
        name: activityName,
        activityType: 'LEGACY',
        order: 1,
        topicId: staticTopic.id,
        logCreatedById: base.user.id,
        logUpdatedById: base.user.id
    });
    const classTopic = await utils.createClassTopic(base.schoolClass.id, {
        topicId: staticTopic.id,
        releaseDate: base.todayDate,
        released: true
    });
    const pupilTopic = await utils.createPupilTopic({
        releaseDate: base.todayDate,
        pupilId: base.pupil.id,
        classTopicId: classTopic.id,
        topicId: staticTopic.id,
        watchedVideo: true,
        periodIndex: base.currentPeriod.index,
        silverStars: 0,
        earnedGoldStar: false
    });

    await utils.createPupilActivity({
        pupilId: base.pupil.id,
        topicId: pupilTopic.id,
        activityId: staticActivity.id,
        earnedStar: false,
        mathscotActivityItemIds: JSON.stringify([88, 188, 224])
    });

    return { topicName, activityName, pupilTopicId: pupilTopic.id, staticTopicId: staticTopic.id };
};

/**
 * The reading log renders more than one copy of several controls and hides all but the one that
 * suits the viewport, so matching on the test id alone picks a hidden copy on a phone.
 */
const onScreen = (page: Page, testId: string) => page.locator(`[data-test="${testId}"]:visible`).first();

/** Signs in and gets as far as a part-filled reading log with the photo field open. */
const openReadingLogWithPhotoField = async (page: Page, parentEmail: string) => {
    await login(page, parentEmail, password);
    // A parent lands on their child's home page, and only sometimes on the reading tab, so go there
    // by hand rather than waiting on a redirect that may not come.
    await page.waitForURL(/\/child\/\d+/);

    const childPath = /\/child\/\d+/.exec(new URL(page.url()).pathname)?.[0];

    expect(childPath, 'expected to land on a child page after signing in').toBeTruthy();

    await page.goto(`${childPath}/reading`);
    await waitForLoading(page);
    // The day slider keeps days off-screen either side of the ones on show, and a narrow viewport
    // shows fewer of them, so pick one that is actually on screen rather than the first in the DOM.
    await onScreen(page, 'reading-log-slider-day').click();
    await waitForLoading(page);

    const modal = page.getByTestId('reading-record-found-modal');

    if (await modal.isVisible()) {
        await modal.getByTestId('reading-record-found-modal-create-button').click();
    }

    await onScreen(page, 'read-aloud-card').click();
    await onScreen(page, 'school-book-card').click();
    await onScreen(page, 'book-name-input').fill(generateSentence());
    await onScreen(page, 'photo-card').click();
};

// Everything that makes a Pixel 7 a phone, minus defaultBrowserType, which Playwright will not
// accept inside a describe group. hasTouch is the part that matters: it makes `pointer: coarse`
// match, which is what the uploader keys the source choice off.
const touchDevice = {
    viewport: devices['Pixel 7'].viewport,
    userAgent: devices['Pixel 7'].userAgent,
    deviceScaleFactor: devices['Pixel 7'].deviceScaleFactor,
    isMobile: devices['Pixel 7'].isMobile,
    hasTouch: devices['Pixel 7'].hasTouch
};

test.describe('Choosing a photo source on a touch device', () => {
    test.use(touchDevice);

    let db: Kysely<Schema.DB>;
    let utils: ReturnType<typeof createUtils>;
    let parentEmail: string;

    test.beforeAll(async () => {
        db = createDb();
        utils = createUtils(db);
        ({ parentEmail } = await createParentWithAReadingLog(db, utils));
    });

    test.afterAll(async () => {
        await db.destroy();
    });

    test('one tap on the photo card offers a camera and a gallery option', async ({ page }) => {
        await openReadingLogWithPhotoField(page, parentEmail);

        await expect(onScreen(page, 'upload-file-take-photo')).toBeVisible();
        await expect(onScreen(page, 'upload-file-choose-photo')).toBeVisible();
    });

    test('the camera option asks the device for the camera', async ({ page }) => {
        await openReadingLogWithPhotoField(page, parentEmail);

        const [chooser] = await Promise.all([page.waitForEvent('filechooser'), onScreen(page, 'upload-file-take-photo').click()]);
        const input = chooser.element();

        expect(await input.getAttribute('data-test')).toBe('upload-file-camera-input');
        expect(await input.getAttribute('capture')).toBe('environment');
    });

    test('the gallery option asks for an existing image and nothing else', async ({ page }) => {
        await openReadingLogWithPhotoField(page, parentEmail);

        const [chooser] = await Promise.all([page.waitForEvent('filechooser'), onScreen(page, 'upload-file-choose-photo').click()]);
        const input = chooser.element();

        expect(await input.getAttribute('data-test')).toBe('upload-file-gallery-input');
        expect(await input.getAttribute('capture')).toBeNull();

        // Every accepted type stays an image, so a parent still cannot pick a document.
        for (const type of ((await input.getAttribute('accept')) ?? '').split(',')) {
            expect(type.startsWith('image/') || type.startsWith('.')).toBe(true);
        }
    });

    test('a chosen photo is cropped, saved and kept on the reading log', async ({ page }) => {
        await openReadingLogWithPhotoField(page, parentEmail);

        const [chooser] = await Promise.all([page.waitForEvent('filechooser'), onScreen(page, 'upload-file-choose-photo').click()]);

        await chooser.setFiles(path.resolve(__dirname, '../cypress/fixtures/dp.jpg'));
        await onScreen(page, 'image-editor-save-btn').click();
        await waitForLoading(page);
        await expect(page.getByTestId('upload-file-image-preview')).toBeVisible();

        await onScreen(page, 'share-permissions-checkbox').click();
        await onScreen(page, 'submit-reading-log-button').click();
        await waitForLoading(page);

        await expect(page.locator('.MuiAlert-message').filter({ hasText: 'Reading entry has been added' })).toBeVisible();
    });

    test('a chosen photo can be removed again', async ({ page }) => {
        await openReadingLogWithPhotoField(page, parentEmail);

        const [chooser] = await Promise.all([page.waitForEvent('filechooser'), onScreen(page, 'upload-file-choose-photo').click()]);

        await chooser.setFiles(path.resolve(__dirname, '../cypress/fixtures/dp.jpg'));
        await onScreen(page, 'image-editor-save-btn').click();
        await waitForLoading(page);
        await expect(page.getByTestId('upload-file-image-preview')).toBeVisible();

        await page.locator('[aria-label="Remove"]:visible').last().click();

        await expect(page.getByTestId('upload-file-image-preview')).toHaveCount(0);
    });
});

// No test.use here: the chromium project is already Desktop Chrome, which has no touch.
test.describe('Photo upload on a pointer device', () => {
    let db: Kysely<Schema.DB>;
    let utils: ReturnType<typeof createUtils>;
    let parentEmail: string;

    test.beforeAll(async () => {
        db = createDb();
        utils = createUtils(db);
        ({ parentEmail } = await createParentWithAReadingLog(db, utils));
    });

    test.afterAll(async () => {
        await db.destroy();
    });

    test('keeps the single upload button and offers no source choice', async ({ page }) => {
        await openReadingLogWithPhotoField(page, parentEmail);

        await expect(page.getByRole('button', { name: 'Upload a photo' })).toBeVisible();
        await expect(onScreen(page, 'upload-file-take-photo')).toHaveCount(0);
        await expect(onScreen(page, 'upload-file-choose-photo')).toHaveCount(0);
    });

    test('still uploads through the drag-and-drop input', async ({ page }) => {
        await openReadingLogWithPhotoField(page, parentEmail);

        await page.locator('.dropzone-container input[type="file"]').setInputFiles(path.resolve(__dirname, '../cypress/fixtures/dp.jpg'));
        await onScreen(page, 'image-editor-save-btn').click();
        await waitForLoading(page);

        await expect(page.getByTestId('upload-file-image-preview')).toBeVisible();
    });
});

test.describe('The photo source choice on the other screens that use the uploader', () => {
    test.use(touchDevice);

    let db: Kysely<Schema.DB>;
    let utils: ReturnType<typeof createUtils>;
    let base: Awaited<ReturnType<typeof createParentWithAReadingLog>>;
    let topic: Awaited<ReturnType<typeof addATopic>>;

    test.beforeAll(async () => {
        db = createDb();
        utils = createUtils(db);
        base = await createParentWithAReadingLog(db, utils);
        topic = await addATopic(db, utils, base);
    });

    test.afterAll(async () => {
        await db.destroy();
    });

    test('sticker creation offers the choice even though it has no upload button', async ({ page }) => {
        // This screen passes children to the uploader instead of the usual button, so the whole
        // drop area is the trigger - a different branch from every other caller.
        await login(page, base.leaderEmail, password);
        await page.goto(`/school/${base.school.id}/settings/stickers/create-sticker`);
        await waitForLoading(page);

        expect(page.url(), 'expected to stay on the create-sticker page').toContain('create-sticker');

        // The page opens on a "Create" tab; the uploader lives behind "Upload".
        await page.getByRole('tab', { name: 'Upload' }).click();
        await expect(page.locator('.image_upload_neated_container')).toHaveCount(1);

        await page.locator('.dropzone-container:visible').first().click();

        await expect(onScreen(page, 'upload-file-take-photo')).toBeVisible();
        await expect(onScreen(page, 'upload-file-choose-photo')).toBeVisible();
    });
});
