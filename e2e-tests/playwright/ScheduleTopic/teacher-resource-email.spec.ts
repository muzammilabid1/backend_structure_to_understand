import { test, expect, type Page } from '@playwright/test';
import type { Schema } from '@lwp/postgres-client';
import { type Kysely, sql } from 'kysely';
import { createDb } from '../db';
import { createUtils } from '../dbUtils';
import {
    admin,
    englishDomainId,
    generateClassName,
    generateFirstName,
    generateLastName,
    generateSchoolName,
    generateTopicName,
    generateUserEmail,
    password
} from '../constants';
import { formatDate, getInputBoxByName, login, openSideDrawer, runCronJob, waitForLoading } from '../utils';
import { UserStatus, UserType } from 'lwp-shared';

/**
 * The email a class's main teacher gets the week before a topic is released carries the topic's teacher
 * resource, so these tests follow that file from the admin topic pages to the link in the email. Which class
 * topics the job picks is covered against the database in class-topic-next-week-email.functional-test.ts;
 * the cases here are the ones only the running app can show.
 */
test.describe('Teacher resource and the topic released next week email', () => {
    let db: Kysely<Schema.DB>;
    let utils: ReturnType<typeof createUtils>;

    const createdTopicIds: string[] = [];
    let seededTemplateId: string | undefined;

    // The bytes only have to survive the round trip, so they need not be a real document.
    const slides = {
        name: 'assembly-slides.pptx',
        mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        buffer: Buffer.from(`assembly slides ${Date.now()}`)
    };
    const handout = {
        name: 'class-handout.docx',
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        buffer: Buffer.from(`class handout ${Date.now()}`)
    };
    const topicImage = {
        name: 'topic-image.png',
        mimeType: 'image/png',
        buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', 'base64')
    };

    const inDays = (days: number): string => {
        const date = new Date();
        date.setDate(date.getDate() + days);

        return formatDate(date, '-');
    };

    // By input name, the same on the create and edit pages; the topic image's really does carry the quotes.
    const topicImageUpload = (page: Page) =>
        page.locator('.image_upload_neated_container').filter({ has: page.locator(`input[name="'videoThumb'"]`) });
    const resourceUpload = (page: Page) =>
        page.locator('.image_upload_neated_container').filter({ has: page.locator('input[name="teacherResource"]') });

    const expectSnackbar = (page: Page, text: string) => expect(page.locator('.MuiAlert-message').filter({ hasText: text })).toBeVisible();

    /*
     * The button only points the browser at the file's URL, so the bytes are read from that URL rather than from
     * the browser's saved copy: on Windows, antivirus can hold that fresh file locked and reading it fails EPERM.
     */
    const downloadTeacherResource = async (page: Page): Promise<{ name: string; url: string; body: Buffer }> => {
        const [download] = await Promise.all([
            page.waitForEvent('download'),
            page.getByRole('button', { name: 'Download teacher resource' }).click()
        ]);
        const file = await page.request.get(download.url());
        expect(file.ok()).toBe(true);

        return { name: download.suggestedFilename(), url: download.url(), body: await file.body() };
    };

    const openTopic = async (page: Page, topicId: string) => {
        await page.goto(`/admin/topic/${topicId}`);
        await waitForLoading(page);
    };

    // Clearing the field and saving is what deletes the stored file, so it doubles as the clean-up.
    const removeTeacherResource = async (page: Page) => {
        await resourceUpload(page).locator('.clear-button').click();
        await page.getByRole('button', { name: 'Update details' }).click();
        await expectSnackbar(page, 'Change saved!');
    };

    const emailsFor = (emailTemplateType: string, classTopicId: string) =>
        db
            .selectFrom('lwp_notification')
            .where('emailTemplateType', '=', emailTemplateType)
            .where(sql`params ->> 'CLASSTOPICID'`, '=', classTopicId)
            .select('userId')
            .execute();

    const runCronJobFromAnyPage = async (page: Page, cronJob: string) => {
        await openSideDrawer(page);
        await runCronJob(page, cronJob);
    };

    test.beforeAll(async () => {
        db = createDb();
        utils = createUtils(db);
    });

    test.afterAll(async () => {
        if (createdTopicIds.length) {
            await db.deleteFrom('lwp_class_topic').where('topicId', 'in', createdTopicIds).execute();
            await db.deleteFrom('static_lwp_topic_domain_year_group').where('topicId', 'in', createdTopicIds).execute();
            await db.deleteFrom('static_lwp_topic').where('id', 'in', createdTopicIds).execute();
        }

        if (seededTemplateId) await db.deleteFrom('static_lwp_email_template').where('id', '=', seededTemplateId).execute();

        await db.destroy();
    });

    test('an admin attaches a teacher resource beside the topic image, downloads it and removes it', async ({ page, request }) => {
        const topicName = generateTopicName();

        await login(page, admin, password);
        await page.waitForURL(/\/admin\/all-feeds/);
        await openSideDrawer(page);
        await page.getByTestId('topics-common-drawer-list').click();
        await waitForLoading(page);
        await page.getByText('Add a topic').click();
        await waitForLoading(page);
        await getInputBoxByName(page, 'teacherTopicName').fill(topicName);
        await getInputBoxByName(page, 'domainAndYearGroupIds').click();
        await page.getByRole('option', { name: 'Year 1: Writting' }).click();
        await page.keyboard.press('Escape');
        await expect(page.getByText('This will be sent out to teachers the week before a topic is released.')).toBeVisible();

        // Both files in one save: the backend tells them apart by the resource's id, so neither may land in the other's place.
        await topicImageUpload(page).locator('input[type="file"]').setInputFiles(topicImage);
        await resourceUpload(page).locator('input[type="file"]').setInputFiles(handout);
        await page.getByRole('button', { name: 'Publish' }).click();
        await expectSnackbar(page, 'New topic created');

        const topic = await db
            .selectFrom('static_lwp_topic')
            .where('teacherTopicName', '=', topicName)
            .select(['id', 'teacherResource', 'videoThumb'])
            .executeTakeFirstOrThrow();
        createdTopicIds.push(topic.id);
        expect(topic.teacherResource).toMatch(/\.docx$/);
        expect(topic.videoThumb).toMatch(/\.png$/);

        await openTopic(page, topic.id);
        const resource = await downloadTeacherResource(page);
        expect(resource.name).toMatch(/\.docx$/);
        expect(resource.url).toContain(`/static/topic_teacher_resources/${topic.teacherResource}`);
        expect(resource.body.equals(handout.buffer)).toBe(true);

        const imageUrl = await topicImageUpload(page).locator('img.image-preview').getAttribute('src');
        expect(imageUrl).toContain(`/static/img/topic_icon/${topic.videoThumb}`);
        expect((await (await request.get(imageUrl!)).body()).equals(topicImage.buffer)).toBe(true);

        await topicImageUpload(page).locator('.clear-button').click();
        await removeTeacherResource(page);

        const cleared = await db
            .selectFrom('static_lwp_topic')
            .where('id', '=', topic.id)
            .select(['teacherResource', 'videoThumb'])
            .executeTakeFirstOrThrow();
        expect(cleared).toEqual({ teacherResource: null, videoThumb: null });
        expect((await request.get(resource.url)).ok()).toBe(false);
        expect((await request.get(imageUrl!)).ok()).toBe(false);

        await openTopic(page, topic.id);
        await expect(page.getByRole('button', { name: 'Download teacher resource' })).toHaveCount(0);
    });

    test('the main teacher is emailed a link to the resource once, in the week before the topic is released', async ({ page, request }) => {
        const schoolName = `${generateSchoolName()} School`;
        const className = generateClassName();
        const slidesTopicName = generateTopicName();
        const threeDaysAway = inDays(3);

        const user = await db.selectFrom('lwp_user').where('id', '=', '1').select(['id', 'password']).executeTakeFirstOrThrow();
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
            logCreatedById: user.id,
            logUpdatedById: user.id
        });
        const createTeacher = () => {
            const firstname = generateFirstName();
            const lastname = generateLastName();

            return utils.createUser({
                firstname,
                lastname,
                email: generateUserEmail(firstname, lastname),
                type: UserType.TEACHER,
                userStatus: UserStatus.ACTIVE,
                schoolId: school.id,
                password: user.password,
                nameForChildren: `Mx ${lastname}`
            });
        };
        const mainTeacher = await createTeacher();
        const otherTeacher = await createTeacher();
        const tomorrowTeacher = await createTeacher();
        const createClass = (name: string, mainTeacherId: string) =>
            utils.createClass(school.id, {
                name,
                isRegistrationClass: true,
                isFullProgramme: true,
                mainTeacherId,
                yearGroup: 1,
                periodIndex: currentPeriod.index,
                logCreatedById: user.id,
                logUpdatedById: user.id
            });
        const schoolClass = await createClass(className, mainTeacher.id);
        await utils.addClassTeacher(otherTeacher.id, schoolClass.id);
        const tomorrowClass = await createClass(generateClassName(), tomorrowTeacher.id);

        const createTopic = async (name: string, teacherResource: string | null) => {
            const topic = await utils.createStaticTopic({
                isReading: false,
                teacherTopicName: name,
                parentTopicName: name,
                isPublished: true,
                teacherResource,
                logCreatedById: user.id,
                logUpdatedById: user.id
            });
            createdTopicIds.push(topic.id);
            await db
                .insertInto('static_lwp_topic_domain_year_group')
                .values({ domainId: englishDomainId, topicId: topic.id, yearGroupId: '1' })
                .executeTakeFirstOrThrow();

            return topic;
        };
        // The slides topic gets its file through the admin page below; the later topic's file is never opened, so a name is enough.
        const slidesTopic = await createTopic(slidesTopicName, null);
        const noResourceTopic = await createTopic(generateTopicName(), null);
        const laterTopic = await createTopic(generateTopicName(), 'later-slides.pptx');

        /*
         * Each environment's template is written by hand, and a local database may have none. Without one the
         * preview has nothing to render, so seed a minimal one that links the file the way the real one must,
         * and use the environment's own when it has one. The preview renders the newest template older than
         * the email, so it has to exist before the job runs.
         */
        const existingTemplate = await db
            .selectFrom('static_lwp_email_template')
            .where('type', '=', 'sendTeacherTopicToBeReleasedNextWeek')
            .where('status', '=', 'CURRENT')
            .select('id')
            .executeTakeFirst();

        if (!existingTemplate) {
            const seeded = await db
                .insertInto('static_lwp_email_template')
                .values({
                    type: 'sendTeacherTopicToBeReleasedNextWeek',
                    status: 'CURRENT',
                    emailOption: 'HTML',
                    subject: '{{TOPICNAME}} is released next week',
                    wholeEmailContent:
                        '<a href="{{PUBLICFILES_BASEURL}}/static/topic_teacher_resources/{{TEACHERRESOURCE_FILENAME}}">Download the teacher resource</a>',
                    sendSms: false,
                    logCreatedById: user.id,
                    logUpdatedById: user.id
                })
                .returning('id')
                .executeTakeFirstOrThrow();
            seededTemplateId = seeded.id;
        }

        await login(page, admin, password);
        await page.waitForURL(/\/admin\/all-feeds/);
        await openTopic(page, slidesTopic.id);
        await expect(page.getByText('This will be sent out to teachers the week before a topic is released.')).toBeVisible();
        await resourceUpload(page).locator('input[type="file"]').setInputFiles(slides);
        await page.getByRole('button', { name: 'Update details' }).click();
        await expectSnackbar(page, 'Change saved!');

        await openTopic(page, slidesTopic.id);
        const uploaded = await downloadTeacherResource(page);
        expect(uploaded.name).toMatch(/\.pptx$/);
        expect(uploaded.body.equals(slides.buffer)).toBe(true);

        const { teacherResource } = await db
            .selectFrom('static_lwp_topic')
            .where('id', '=', slidesTopic.id)
            .select('teacherResource')
            .executeTakeFirstOrThrow();

        // The window is today to six days away, so seven days away is the first date it waits for.
        const thisWeek = await utils.createClassTopic(schoolClass.id, { topicId: slidesTopic.id, releaseDate: threeDaysAway });
        const noResource = await utils.createClassTopic(schoolClass.id, { topicId: noResourceTopic.id, releaseDate: threeDaysAway });
        const beyondTheWeek = await utils.createClassTopic(schoolClass.id, { topicId: laterTopic.id, releaseDate: inDays(7) });
        const tomorrow = await utils.createClassTopic(tomorrowClass.id, { topicId: slidesTopic.id, releaseDate: inDays(1) });

        await runCronJobFromAnyPage(page, 'teacherTopicsToBeReleasedNextWeek');

        expect(await emailsFor('sendTeacherTopicToBeReleasedNextWeek', thisWeek.id)).toEqual([{ userId: mainTeacher.id }]);
        expect(await emailsFor('sendTeacherTopicToBeReleasedNextWeek', noResource.id)).toEqual([]);
        expect(await emailsFor('sendTeacherTopicToBeReleasedNextWeek', beyondTheWeek.id)).toEqual([]);
        expect(await emailsFor('sendTeacherTopicToBeReleasedNextWeek', tomorrow.id)).toEqual([{ userId: tomorrowTeacher.id }]);
        const classTopicFlags = await db
            .selectFrom('lwp_class_topic')
            .where('id', 'in', [thisWeek.id, beyondTheWeek.id])
            .select(['id', 'weekBeforeTeacherNotified', 'teacherNotified'])
            .orderBy('id')
            .execute();
        expect(classTopicFlags).toEqual([
            { id: thisWeek.id, weekBeforeTeacherNotified: true, teacherNotified: false },
            { id: beyondTheWeek.id, weekBeforeTeacherNotified: false, teacherNotified: false }
        ]);

        // What an admin sees on the teacher's page, and where the link in the email leads.
        await page.goto(`/admin/teacher/${mainTeacher.id}`);
        await waitForLoading(page);
        await page.getByRole('tab', { name: 'Notifications' }).click();
        await waitForLoading(page);
        const detailsButton = page.getByTestId('sendTeacherTopicToBeReleasedNextWeek-user-notification-history-details-button');
        await detailsButton.click();
        const params = JSON.parse(await page.getByTestId('user-notification-history-params').inputValue());
        expect(params).toMatchObject({
            SCHOOL: schoolName,
            CLASS: className,
            TOPICNAME: slidesTopicName,
            RELEASEDATE: threeDaysAway,
            TEACHERRESOURCE_FILENAME: teacherResource,
            FIRSTNAME: mainTeacher.firstname
        });
        await page.getByTestId('dialog-cancel-btn').click();

        await page
            .getByRole('row')
            .filter({ has: detailsButton })
            .locator('span.material-icons', { hasText: /^preview$/ })
            .click();
        const resourceLink = page.frameLocator('iframe[title="Email preview"]').locator(`a[href*="${teacherResource}"]`);
        await expect(resourceLink).toBeVisible();
        const linkedFile = await request.get((await resourceLink.getAttribute('href'))!);
        expect(linkedFile.ok()).toBe(true);
        expect((await linkedFile.body()).equals(slides.buffer)).toBe(true);
        await page.keyboard.press('Escape');

        const otherTeacherEmails = await db
            .selectFrom('lwp_notification')
            .where('userId', '=', otherTeacher.id)
            .where('emailTemplateType', '=', 'sendTeacherTopicToBeReleasedNextWeek')
            .select('id')
            .execute();
        expect(otherTeacherEmails).toEqual([]);

        // The day-before email carries no resource, so a topic released tomorrow gets both, deliberately.
        await runCronJobFromAnyPage(page, 'teacherTopicsToBeReleasedTomorrow');
        expect(await emailsFor('sendTeacherTopicsToBeReleasedTomorrow', tomorrow.id)).toEqual([{ userId: tomorrowTeacher.id }]);
        expect(await emailsFor('sendTeacherTopicToBeReleasedNextWeek', tomorrow.id)).toEqual([{ userId: tomorrowTeacher.id }]);

        // A teacher rescheduling a topic updates this same row (ClassTopicService#updateClassTopic), so an email already sent stays sent.
        await db
            .updateTable('lwp_class_topic')
            .set({ releaseDate: inDays(6) })
            .where('id', '=', thisWeek.id)
            .execute();
        await runCronJobFromAnyPage(page, 'teacherTopicsToBeReleasedNextWeek');
        expect(await emailsFor('sendTeacherTopicToBeReleasedNextWeek', thisWeek.id)).toEqual([{ userId: mainTeacher.id }]);

        await openTopic(page, slidesTopic.id);
        await removeTeacherResource(page);
        expect((await request.get(uploaded.url)).ok()).toBe(false);
    });
});
