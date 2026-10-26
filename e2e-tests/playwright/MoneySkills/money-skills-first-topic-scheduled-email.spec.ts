import { test, expect, type Browser, type Page } from '@playwright/test';
import type { Schema } from '@lwp/postgres-client';
import { type Kysely, type Selectable, sql } from 'kysely';
import { createDb } from '../db';
import { createUtils } from '../dbUtils';
import {
    admin,
    password,
    generateSchoolName,
    generateFirstName,
    generateLastName,
    generateUserEmail,
    generateClassName,
    generateTopicName,
    moneySkillsDomainId,
    moneySkillsSubjectId
} from '../constants';
import {
    acceptFeatureTooltipPrompt,
    formatDate,
    getDate,
    getInputBoxByName,
    login,
    openSideDrawer,
    releaseTopicsUpToADate,
    runCronJob,
    waitForLoading
} from '../utils';
import { UserStatus, UserType } from 'lwp-shared';

// The job reads saved class topics, so each screen a leader can schedule from is covered.
test.describe('Money Skills launch email to school leaders and class teachers', () => {
    let db: Kysely<Schema.DB>;
    let utils: ReturnType<typeof createUtils>;

    const emailType = 'sendTeacherMoneySkillsFirstTopicScheduled';
    const leaderCopy = 'Your school has scheduled its first Money Skills topic.';
    const teacherCopy = 'Your class has scheduled its first Money Skills topic.';

    const createdTopicIds: string[] = [];
    const createdSequenceIds: string[] = [];
    let seededTemplateId: string | undefined;

    const inDays = (days: number): Date => {
        const date = new Date();
        date.setDate(date.getDate() + days);

        return date;
    };

    const expectSnackbar = (page: Page, text: string) => expect(page.locator('.MuiAlert-message').filter({ hasText: text })).toBeVisible();

    const emailsTo = (userIds: string[]) =>
        db
            .selectFrom('lwp_notification')
            .where('emailTemplateType', '=', emailType)
            .where('userId', 'in', userIds)
            .select(['userId', 'params'])
            .execute();

    const launchStamps = async (userIds: string[]): Promise<Record<string, string | null>> => {
        const rows = await db.selectFrom('lwp_user').where('id', 'in', userIds).select(['id', 'lastMoneySkillsLaunchEmailSent']).execute();

        return Object.fromEntries(rows.map((row) => [row.id, row.lastMoneySkillsLaunchEmailSent?.toString() ?? null]));
    };

    // A separate page for the admin keeps the leader signed in on the other.
    const adminPage = async (browser: Browser): Promise<Page> => {
        const page = await browser.newPage();
        await login(page, admin, password);
        await page.waitForURL(/\/admin\/all-feeds/);

        return page;
    };

    const runLaunchEmailJob = async (page: Page) => {
        await openSideDrawer(page);
        await runCronJob(page, 'teacherMoneySkillsFirstTopicScheduled');
    };

    const createTopic = async (userId: string) => {
        const name = `MS: ${generateTopicName()} ${Date.now()}`;
        const topic = await utils.createStaticTopic({
            isReading: false,
            teacherTopicName: name,
            parentTopicName: name,
            isPublished: true,
            logCreatedById: userId,
            logUpdatedById: userId
        });
        createdTopicIds.push(topic.id);
        await db
            .insertInto('static_lwp_topic_domain_year_group')
            .values({ domainId: moneySkillsDomainId, topicId: topic.id, yearGroupId: '1' })
            .executeTakeFirstOrThrow();

        return topic;
    };

    const createSchool = async (classNames: string[]) => {
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
            isMoneySkillsAvailable: true,
            logCreatedById: user.id,
            logUpdatedById: user.id
        });
        const createTeacher = (isSchoolLeader: boolean) => {
            const firstname = generateFirstName();
            const lastname = generateLastName();

            return utils.createUser({
                firstname,
                lastname,
                email: generateUserEmail(firstname, lastname),
                type: UserType.TEACHER,
                userStatus: UserStatus.ACTIVE,
                isSchoolLeader,
                schoolId: school.id,
                password: user.password,
                nameForChildren: `Mx ${lastname}`
            });
        };
        const leaders = [await createTeacher(true), await createTeacher(true)];
        const classes: (Selectable<Schema.LwpSchoolClass> & { mainTeacher: Selectable<Schema.LwpUser> })[] = [];

        for (const name of classNames) {
            const mainTeacher = await createTeacher(false);
            const schoolClass = await utils.createClass(school.id, {
                name,
                isRegistrationClass: true,
                isFullProgramme: true,
                mainTeacherId: mainTeacher.id,
                yearGroup: 1,
                periodIndex: currentPeriod.index,
                logCreatedById: user.id,
                logUpdatedById: user.id
            });
            classes.push({ ...schoolClass, mainTeacher });
        }

        return { user, school, leaders, classes };
    };

    const scheduleOnClassPage = async (page: Page, classId: string, topicName: string, releaseDate: Date) => {
        await page.goto(`/class/${classId}/schedule`);
        await waitForLoading(page);
        await getInputBoxByName(page, 'search').fill(topicName);
        await page.getByTestId('class-schedule-topic-search-button').click();
        await waitForLoading(page);
        await page.getByRole('button', { name: 'Select topic' }).click();
        await waitForLoading(page);
        await getInputBoxByName(page, 'startDate').fill(getDate(releaseDate));
        await page.getByRole('button', { name: 'Add topic' }).click();
        await expectSnackbar(page, 'New topic created');
    };

    test.beforeAll(async () => {
        db = createDb();
        utils = createUtils(db);

        // A fresh database has no template for this email. Seed one before any email is sent, so the preview uses it.
        const existingTemplate = await db
            .selectFrom('static_lwp_email_template')
            .where('type', '=', emailType)
            .where('status', '=', 'CURRENT')
            .select('id')
            .executeTakeFirst();

        if (!existingTemplate) {
            const seeded = await db
                .insertInto('static_lwp_email_template')
                .values({
                    type: emailType,
                    status: 'CURRENT',
                    emailOption: 'HTML',
                    subject: 'Money Skills is scheduled',
                    wholeEmailContent: `{{#if ISSCHOOLLEADER}}<p>${leaderCopy}</p>{{/if}}{{#if ISMAINTEACHER}}<p>${teacherCopy}</p>{{/if}}<p>{{TOPICNAME}} for {{CLASS}}</p>`,
                    sendSms: false,
                    logCreatedById: '1',
                    logUpdatedById: '1'
                })
                .returning('id')
                .executeTakeFirstOrThrow();
            seededTemplateId = seeded.id;
        }
    });

    test.afterAll(async () => {
        if (createdSequenceIds.length) {
            await db.deleteFrom('lwp_class_sequence_assignment').where('sequenceId', 'in', createdSequenceIds).execute();
            await db.deleteFrom('static_lwp_topic_sequence_item').where('sequenceId', 'in', createdSequenceIds).execute();
            await db.deleteFrom('static_lwp_topic_sequence').where('id', 'in', createdSequenceIds).execute();
        }

        if (createdTopicIds.length) {
            await db.deleteFrom('lwp_pupil_topic').where('topicId', 'in', createdTopicIds).execute();
            await db.deleteFrom('lwp_class_topic').where('topicId', 'in', createdTopicIds).execute();
            await db.deleteFrom('static_lwp_topic_domain_year_group').where('topicId', 'in', createdTopicIds).execute();
            await db.deleteFrom('static_lwp_topic').where('id', 'in', createdTopicIds).execute();
        }

        if (seededTemplateId) await db.deleteFrom('static_lwp_email_template').where('id', '=', seededTemplateId).execute();

        await db.destroy();
    });

    test('Leaders hear once when the school starts Money Skills, and each class teacher when their class does', async ({
        page,
        browser
    }) => {
        const classAName: string = generateClassName();
        const classBName: string = generateClassName();
        const classCName: string = generateClassName();
        const classDName: string = generateClassName();
        const { user, leaders, classes } = await createSchool([classAName, classBName, classCName, classDName]);
        const [classA, classB, classC, classD] = classes;
        const [leader, otherLeader] = leaders;
        const everyone = [...leaders.map((l) => l.id), ...classes.map((c) => c.mainTeacher.id)];

        const handTopic = await createTopic(user.id);
        const sequenceTopics = [await createTopic(user.id), await createTopic(user.id)];
        const sequenceName = `MS sequence ${Date.now()}`;
        const sequence = await db
            .insertInto('static_lwp_topic_sequence')
            .values({ name: sequenceName, subjectId: moneySkillsSubjectId, yearGroupId: '1', timingMode: 'INTERVAL', intervalDays: 14 })
            .returning('id')
            .executeTakeFirstOrThrow();
        createdSequenceIds.push(sequence.id.toString());
        await db
            .insertInto('static_lwp_topic_sequence_item')
            .values(sequenceTopics.map((topic, index) => ({ sequenceId: sequence.id.toString(), order: index + 1, topicId: topic.id })))
            .execute();

        const adminTab = await adminPage(browser);
        await login(page, leader.email!, password);
        await page.waitForURL(/\/school/);
        await waitForLoading(page);
        await acceptFeatureTooltipPrompt(page);

        // 1. By hand in one class: the school's first Money Skills topic
        const releaseDate = inDays(10);
        await scheduleOnClassPage(page, classA.id, handTopic.teacherTopicName!, releaseDate);
        await expect(
            db
                .selectFrom('lwp_class_topic')
                .where('classId', '=', classA.id)
                .where('topicId', '=', handTopic.id)
                .select('id')
                .executeTakeFirst()
        ).resolves.toBeDefined();

        await runLaunchEmailJob(adminTab);

        const firstRun = await emailsTo(everyone);
        expect(firstRun.map((email) => email.userId).sort()).toEqual([leader.id, otherLeader.id, classA.mainTeacher.id].sort());
        const paramsFor = (userId: string) => firstRun.find((email) => email.userId === userId)!.params;
        for (const leaderId of [leader.id, otherLeader.id]) {
            expect(paramsFor(leaderId)).toMatchObject({ ISSCHOOLLEADER: true, ISMAINTEACHER: false, CLASS: classAName });
        }
        expect(paramsFor(classA.mainTeacher.id)).toMatchObject({
            ISSCHOOLLEADER: false,
            ISMAINTEACHER: true,
            CLASS: classAName,
            TOPICNAME: handTopic.teacherTopicName,
            RELEASEDATE: formatDate(releaseDate, '-')
        });

        // 2. The preview shows each audience its own wording
        const previewFor = async (userId: string) => {
            await adminTab.goto(`/admin/teacher/${userId}`);
            await waitForLoading(adminTab);
            await adminTab.getByRole('tab', { name: 'Notifications' }).click();
            await waitForLoading(adminTab);
            const detailsButton = adminTab.getByTestId(`${emailType}-user-notification-history-details-button`);
            await adminTab
                .getByRole('row')
                .filter({ has: detailsButton })
                .locator('span.material-icons', { hasText: /^preview$/ })
                .click();
            const preview = adminTab.frameLocator('iframe[title="Email preview"]').locator('body');
            await expect(preview).toContainText(`${handTopic.teacherTopicName} for ${classAName}`);
            const text = await preview.innerText();
            await adminTab.keyboard.press('Escape');

            return text;
        };
        const leaderPreview = await previewFor(leader.id);
        expect(leaderPreview).toContain(leaderCopy);
        expect(leaderPreview).not.toContain(teacherCopy);
        const teacherPreview = await previewFor(classA.mainTeacher.id);
        expect(teacherPreview).toContain(teacherCopy);
        expect(teacherPreview).not.toContain(leaderCopy);

        // 3. Running the job again sends nothing and leaves the stamps alone
        const stampsAfterFirstRun = await launchStamps(everyone);
        await runLaunchEmailJob(adminTab);
        expect(await emailsTo(everyone)).toHaveLength(3);
        expect(await launchStamps(everyone)).toEqual(stampsAfterFirstRun);

        // 4. Several classes at once through Set a topic: each teacher hears about their own class
        await page.goto(`/set-topic/${handTopic.id}`);
        await page.waitForURL(/\/set-topic\//);
        await waitForLoading(page);
        for (const className of [classBName, classCName]) {
            await page.getByTestId('schedule-topic-class-select').locator('input').fill(className);
            await page.getByRole('option').filter({ hasText: className }).click();
            await waitForLoading(page);
        }
        await page.keyboard.press('Escape');
        await page.locator('input[name="startDate"]').fill(getDate(releaseDate));
        await page.getByTestId('schedule-topic-submit-btn').click();
        await expectSnackbar(page, 'Topic successfully added.');

        await runLaunchEmailJob(adminTab);

        const afterSetATopic = await emailsTo(everyone);
        expect(afterSetATopic.map((email) => email.userId).sort()).toEqual(
            [leader.id, otherLeader.id, classA.mainTeacher.id, classB.mainTeacher.id, classC.mainTeacher.id].sort()
        );
        for (const schoolClass of [classB, classC]) {
            expect(afterSetATopic.find((email) => email.userId === schoolClass.mainTeacher.id)!.params).toMatchObject({
                ISSCHOOLLEADER: false,
                ISMAINTEACHER: true,
                CLASS: schoolClass.name
            });
        }

        // 5. Auto-scheduling a Money Skills sequence
        await page.goto(`/class/${classD.id}/auto-schedule`);
        await waitForLoading(page);
        await page.getByTestId('assign-sequence-select').click();
        await page.getByRole('option', { name: sequenceName }).click();
        await waitForLoading(page);
        await page.getByTestId('assign-sequence-submit-button').click();
        await expectSnackbar(page, '2 topics added to this class');

        await runLaunchEmailJob(adminTab);

        const afterAutoSchedule = await emailsTo(everyone);
        expect(afterAutoSchedule.map((email) => email.userId).sort()).toEqual(everyone.slice().sort());
        expect(afterAutoSchedule.find((email) => email.userId === classD.mainTeacher.id)!.params).toMatchObject({
            ISMAINTEACHER: true,
            CLASS: classDName,
            TOPICNAME: sequenceTopics[0].teacherTopicName
        });

        await adminTab.close();
    });

    // The release job runs first, so only the released flag stops a topic released today from being emailed about.
    test('Nobody is emailed about a topic that the release job has already released today', async ({ page, browser }) => {
        const className: string = generateClassName();
        const { user, leaders, classes } = await createSchool([className]);
        const [schoolClass] = classes;
        const everyone = [...leaders.map((l) => l.id), schoolClass.mainTeacher.id];
        const topic = await createTopic(user.id);

        const adminTab = await adminPage(browser);
        await login(page, leaders[0].email!, password);
        await page.waitForURL(/\/school/);
        await waitForLoading(page);
        await acceptFeatureTooltipPrompt(page);
        await scheduleOnClassPage(page, schoolClass.id, topic.teacherTopicName!, new Date());

        await openSideDrawer(adminTab);
        await releaseTopicsUpToADate(adminTab);
        const classTopic = await db
            .selectFrom('lwp_class_topic')
            .where('classId', '=', schoolClass.id)
            .where('topicId', '=', topic.id)
            .select(['released', sql<string>`"releaseDate"::text`.as('releaseDate')])
            .executeTakeFirstOrThrow();
        expect(classTopic).toEqual({ released: true, releaseDate: formatDate(new Date(), '-') });

        await runLaunchEmailJob(adminTab);

        expect(await emailsTo(everyone)).toEqual([]);
        expect(Object.values(await launchStamps(everyone))).toEqual([null, null, null]);

        await adminTab.close();
    });
});
