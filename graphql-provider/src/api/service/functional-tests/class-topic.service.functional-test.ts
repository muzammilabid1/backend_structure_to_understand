import { type INestApplication } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import moment from 'moment';
import { CLASS_TOPIC_SAVE_FAILED, ClassTopicService } from 'src/api/service/class_topic.service';
import { BaseModule } from 'src/base.module';
import { Connection } from 'typeorm';

import { AddTopicToClassesInput } from '../../model';

/**
 * Drives `addTopicToClasses` against a real database, because the invariant this ticket buys cannot be
 * proved with a mocked transaction: a failure on any class must leave *no* class topic committed for
 * any of them. Every class used to commit separately, so a failure part way through left the teacher
 * looking at an error over a partially applied change.
 *
 * **Everything this suite needs, it creates.** It seeds its own school, its own three classes, its own
 * published topic and its own user, and removes all of them afterwards. It deliberately does not go
 * looking for a class or topic that happens to suit it, because a test that reads live data is a test
 * whose result depends on what else has run, and both failure modes of that were seen while writing it:
 * leftovers from a Playwright run changing the counts, and the same class being picked twice.
 *
 * The only pre-existing rows it relies on are reference data that the schema is seeded with and no test
 * creates: one subject-bearing topic domain and one year group.
 */
jest.setTimeout(180000);

/** One app for the whole file: a second one in the same file cannot open its own "default" connection. */
let app: INestApplication;
let connection: Connection;
let service: ClassTopicService;

beforeAll(async () => {
    app = await NestFactory.create(BaseModule);
    connection = app.get(Connection);
    service = app.get(ClassTopicService);
});

afterAll(async () => {
    await app?.close();
});

describe('ClassTopicService#addTopicToClasses against the database', () => {
    /** Everything seeded here, so teardown can be exact rather than pattern-matched. */
    let schoolId: string;
    let classIds: string[];
    let topicId: string;
    let subjectId: string;
    let userId: string;

    /** Recognisable in the database if a run ever dies before its teardown. */
    const tag = `LEA6460-${Date.now()}`;

    const inDays = (days: number): Date => new Date(moment().add(days, 'days').format('YYYY-MM-DD'));

    const input = (classId: string[]): AddTopicToClassesInput =>
        ({
            topicId,
            classId,
            // Comfortably in the future, so the release cron cannot pick these up mid-run.
            releaseDate: inDays(30),
            dueDate: null,
            teacherMessage: `${tag} functional test`,
            createdBy: userId
        }) as unknown as AddTopicToClassesInput;

    const countClassTopics = async (): Promise<number> => {
        const [row] = await connection.query(`SELECT count(*)::int AS count FROM lwp_class_topic WHERE "topicId" = $1`, [topicId]);

        return row.count;
    };

    const subjectLinkedClassIds = async (): Promise<string[]> => {
        const rows = await connection.query(
            `SELECT "lwpSchoolClassId"::text AS id FROM lwp_class_subjects
             WHERE "lwpSchoolClassId" = ANY($1::bigint[]) AND "staticLwpSubjectId" = $2
             ORDER BY 1`,
            [classIds, subjectId]
        );

        return rows.map((row: { id: string }) => row.id);
    };

    beforeAll(async () => {
        // Reference data: a domain that belongs to a subject, and a year group. Both are part of the
        // schema seed and are read only here.
        const [reference] = await connection.query(`
            SELECT d.id::text AS "domainId", d."subjectId"::text AS "subjectId",
                   (SELECT id::text FROM static_lwp_year_group ORDER BY id LIMIT 1) AS "yearGroupId"
            FROM static_lwp_topic_domain d
            WHERE d."subjectId" IS NOT NULL
            ORDER BY d.id
            LIMIT 1
        `);

        if (!reference?.yearGroupId) throw new Error('The database needs at least one year group and one subject-bearing topic domain');

        subjectId = reference.subjectId;

        const [school] = await connection.query(`INSERT INTO lwp_school ("schoolName") VALUES ($1) RETURNING id::text AS id`, [
            `${tag} School`
        ]);

        schoolId = school.id;

        const [user] = await connection.query(
            `INSERT INTO lwp_user (firstname, lastname, type, "userStatus", "schoolId")
             VALUES ($1, 'Teacher', 'TEACHER', 'ACTIVE', $2) RETURNING id::text AS id`,
            [tag, schoolId]
        );

        userId = user.id;

        const [period] = await connection.query(`SELECT index FROM static_lwp_period WHERE "isCurrentPeriod" = true LIMIT 1`);

        /*
         * Three registration classes in the one school, all in the topic's year group. Registration
         * classes because the subject auto-add only runs for those, and that is the side effect this
         * ticket moved inside the transaction.
         */
        const created = await connection.query(
            `INSERT INTO lwp_school_class (name, "schoolId", "yearGroup", "periodIndex", status, "isRegistrationClass", "isFullProgramme")
             SELECT $1 || ' Class ' || n, $2, $3, $4, 'ACTIVE', true, true
             FROM generate_series(1, 3) AS n
             RETURNING id::text AS id`,
            [tag, schoolId, reference.yearGroupId, period?.index ?? null]
        );

        classIds = created.map((row: { id: string }) => row.id);

        const [topic] = await connection.query(
            `INSERT INTO static_lwp_topic ("teacherTopicName", "parentTopicName", "isPublished", "isHidden")
             VALUES ($1, $1, true, false) RETURNING id::text AS id`,
            [`${tag} Topic`]
        );

        topicId = topic.id;

        await connection.query(
            `INSERT INTO static_lwp_topic_domain_year_group ("topicId", "domainId", "yearGroupId") VALUES ($1, $2, $3)`,
            [topicId, reference.domainId, reference.yearGroupId]
        );
    });

    afterEach(async () => {
        jest.restoreAllMocks();

        await connection.query(`DELETE FROM lwp_class_topic WHERE "topicId" = $1`, [topicId]);
        await connection.query(`DELETE FROM lwp_class_subjects WHERE "lwpSchoolClassId" = ANY($1::bigint[])`, [classIds]);
    });

    afterAll(async () => {
        // Reverse order of creation, so no foreign key is left dangling.
        if (topicId) {
            await connection.query(`DELETE FROM lwp_class_topic WHERE "topicId" = $1`, [topicId]);
            await connection.query(`DELETE FROM static_lwp_topic_domain_year_group WHERE "topicId" = $1`, [topicId]);
        }

        if (classIds?.length) {
            await connection.query(`DELETE FROM lwp_class_subjects WHERE "lwpSchoolClassId" = ANY($1::bigint[])`, [classIds]);
            await connection.query(`DELETE FROM lwp_school_class WHERE id = ANY($1::bigint[])`, [classIds]);
        }

        if (topicId) await connection.query(`DELETE FROM static_lwp_topic WHERE id = $1`, [topicId]);
        if (userId) await connection.query(`DELETE FROM lwp_user WHERE id = $1`, [userId]);
        if (schoolId) await connection.query(`DELETE FROM lwp_school WHERE id = $1`, [schoolId]);
    });

    it('creates a class topic for every class', async () => {
        await service.addTopicToClasses(input(classIds), [], userId);

        expect(await countClassTopics()).toBe(3);
    });

    it('links the topic subject to every registration class', async () => {
        await service.addTopicToClasses(input(classIds), [], userId);

        expect(await subjectLinkedClassIds()).toEqual([...classIds].sort());
    });

    it('creates one row when the same class is listed twice', async () => {
        await service.addTopicToClasses(input([classIds[0], classIds[0]]), [], userId);

        expect(await countClassTopics()).toBe(1);
    });

    /**
     * The reason this file exists. The first two classes are written for real and the third fails, so
     * only a genuine rollback can leave the count at zero. Before this ticket it would have been two.
     */
    it('creates nothing at all when the third class fails', async () => {
        const persist = service.persistClassTopic.bind(service);

        let calls = 0;

        jest.spyOn(service, 'persistClassTopic').mockImplementation((context, request) => {
            calls += 1;

            if (calls === 3) return Promise.reject(new Error('deliberate failure on the third class'));

            return persist(context, request);
        });

        // The teacher is told in words; the real reason goes to New Relic, not to the browser.
        await expect(service.addTopicToClasses(input(classIds), [], userId)).rejects.toThrow(CLASS_TOPIC_SAVE_FAILED);

        expect(calls).toBe(3);
        expect(await countClassTopics()).toBe(0);
    });

    it('rolls back the subject link along with the rows', async () => {
        jest.spyOn(service, 'persistClassTopic').mockImplementation(() =>
            Promise.reject(new Error('deliberate failure on the first class'))
        );

        await expect(service.addTopicToClasses(input(classIds), [], userId)).rejects.toThrow();

        expect(await subjectLinkedClassIds()).toEqual([]);
        expect(await countClassTopics()).toBe(0);
    });

    it('leaves nothing behind when a class in the list does not exist', async () => {
        await expect(service.addTopicToClasses(input([...classIds, '0']), [], userId)).rejects.toThrow('Class does not exist');

        expect(await countClassTopics()).toBe(0);
    });
});

/**
 * Drives `teacherMoneySkillsFirstTopicScheduled` against a real database, because the whole job is one SQL statement:
 * which topic counts as first, who is emailed and who gets stamped are all decided by joins.
 *
 * It seeds one school with an active leader, an invited leader and two classes: one whose main teacher is an
 * ordinary teacher, one whose main teacher is the leader. It also seeds two Money Skills topics and one topic
 * from another subject. The job is not scoped to these rows, so a run also emails anyone else in the local
 * database who is owed this email; the assertions only look at the users seeded here.
 */
describe('ClassTopicService#teacherMoneySkillsFirstTopicScheduled against the database', () => {
    let schoolId: string;
    let leaderId: string;
    let invitedLeaderId: string;
    let teacherId: string;
    let otherTeacherId: string;
    let classId: string;
    let otherClassId: string;
    let moneySkillsTopicId: string;
    let otherMoneySkillsTopicId: string;
    let otherSubjectTopicId: string;

    const tag = `FIRSTMONEYSKILLS-${Date.now()}`;

    const inDays = (days: number): string => moment().add(days, 'days').format('YYYY-MM-DD');

    const userIds = (): string[] => [leaderId, invitedLeaderId, teacherId, otherTeacherId].filter(Boolean);

    const run = (): Promise<boolean> => service.teacherMoneySkillsFirstTopicScheduled();

    const schedule = async (topicId: string, onClassId: string, releaseInDays: number): Promise<string> => {
        const [row] = await connection.query(
            `INSERT INTO lwp_class_topic ("releaseDate", "classId", "topicId") VALUES ($1, $2, $3) RETURNING id::text AS id`,
            [inDays(releaseInDays), onClassId, topicId]
        );

        return row.id;
    };

    const emails = async (): Promise<{ userId: string; params: Record<string, unknown> }[]> =>
        connection.query(
            `SELECT "userId"::text AS "userId", params FROM lwp_notification
             WHERE "emailTemplateType" = 'sendTeacherMoneySkillsFirstTopicScheduled' AND "userId" = ANY($1::bigint[])
             ORDER BY id`,
            [userIds()]
        );

    const emailedUserIds = async (): Promise<string[]> => (await emails()).map((email) => email.userId).sort();

    const emailTo = async (userId: string): Promise<Record<string, unknown>> =>
        (await emails()).find((email) => email.userId === userId)?.params;

    /** Who the job considers already sent to, of the users seeded here. */
    const stampedUserIds = async (): Promise<string[]> => {
        const rows = await connection.query(
            `SELECT id::text AS id FROM lwp_user
             WHERE id = ANY($1::bigint[]) AND "lastMoneySkillsLaunchEmailSent" IS NOT NULL
             ORDER BY id`,
            [userIds()]
        );

        return rows.map((row: { id: string }) => row.id).sort();
    };

    const setStatus = (userId: string, userStatus: string): Promise<unknown> =>
        connection.query(`UPDATE lwp_user SET "userStatus" = $1 WHERE id = $2`, [userStatus, userId]);

    const insertUser = async (name: string, userStatus: string, isSchoolLeader: boolean): Promise<string> => {
        const [user] = await connection.query(
            `INSERT INTO lwp_user (firstname, lastname, email, type, "userStatus", "schoolId", "nameForChildren", "isSchoolLeader")
             VALUES ($1, 'Test', $2, 'TEACHER', $3, $4, $1, $5) RETURNING id::text AS id`,
            [name, `${tag.toLowerCase()}-${name.toLowerCase()}@example.com`, userStatus, schoolId, isSchoolLeader]
        );

        return user.id;
    };

    beforeAll(async () => {
        const [reference] = await connection.query(`
            SELECT
                (SELECT d.id::text FROM static_lwp_topic_domain d JOIN static_lwp_subject s ON s.id = d."subjectId"
                 WHERE s."programmeType" = 'MONEY_SKILLS' ORDER BY d.id LIMIT 1) AS "moneySkillsDomainId",
                (SELECT d.id::text FROM static_lwp_topic_domain d JOIN static_lwp_subject s ON s.id = d."subjectId"
                 WHERE s."programmeType" <> 'MONEY_SKILLS' ORDER BY d.id LIMIT 1) AS "otherDomainId",
                (SELECT id::text FROM static_lwp_year_group ORDER BY id LIMIT 1) AS "yearGroupId",
                (SELECT index FROM static_lwp_period WHERE "isCurrentPeriod" = true LIMIT 1) AS "periodIndex"
        `);

        if (!reference?.moneySkillsDomainId || !reference?.otherDomainId || !reference?.yearGroupId) {
            throw new Error('The database needs a Money Skills domain, another subject domain and a year group');
        }

        const [school] = await connection.query(
            `INSERT INTO lwp_school ("schoolName", "curentPeriodIndex") VALUES ($1, $2) RETURNING id::text AS id`,
            [`${tag} School`, reference.periodIndex]
        );

        schoolId = school.id;

        leaderId = await insertUser('Leader', 'ACTIVE', true);
        invitedLeaderId = await insertUser('Invited', 'INVITED', true);
        teacherId = await insertUser('Teacher', 'ACTIVE', false);
        otherTeacherId = await insertUser('Other', 'ACTIVE', false);

        const insertClass = async (name: string, mainTeacherId: string): Promise<string> => {
            const [schoolClass] = await connection.query(
                `INSERT INTO lwp_school_class (name, "schoolId", "yearGroup", "periodIndex", status, "isRegistrationClass", "isFullProgramme", "mainTeacherId")
                 VALUES ($1, $2, $3, $4, 'ACTIVE', true, true, $5) RETURNING id::text AS id`,
                [`${tag} ${name}`, schoolId, reference.yearGroupId, reference.periodIndex, mainTeacherId]
            );

            return schoolClass.id;
        };

        classId = await insertClass('Class', teacherId);
        otherClassId = await insertClass('Other Class', otherTeacherId);

        const insertTopic = async (name: string, domainId: string): Promise<string> => {
            const [topic] = await connection.query(
                `INSERT INTO static_lwp_topic ("teacherTopicName", "parentTopicName", "isPublished", "isHidden", "teacherResource", "teacherPdf", "isTeacherPdfRequired")
                 VALUES ($1, $1, true, false, 'resource.pptx', 'handouts.pdf', true) RETURNING id::text AS id`,
                [`${tag} ${name}`]
            );

            await connection.query(
                `INSERT INTO static_lwp_topic_domain_year_group ("topicId", "domainId", "yearGroupId") VALUES ($1, $2, $3)`,
                [topic.id, domainId, reference.yearGroupId]
            );

            return topic.id;
        };

        moneySkillsTopicId = await insertTopic('Money Skills', reference.moneySkillsDomainId);
        otherMoneySkillsTopicId = await insertTopic('Other Money Skills', reference.moneySkillsDomainId);
        otherSubjectTopicId = await insertTopic('Other Subject', reference.otherDomainId);
    });

    afterEach(async () => {
        await connection.query(`DELETE FROM lwp_notification WHERE "userId" = ANY($1::bigint[])`, [userIds()]);
        await connection.query(`DELETE FROM lwp_class_topic WHERE "classId" = ANY($1::bigint[])`, [[classId, otherClassId]]);
        await connection.query(
            `UPDATE lwp_user SET "lastMoneySkillsLaunchEmailSent" = NULL, "userStatus" = CASE WHEN id = $2 THEN 'INVITED' ELSE 'ACTIVE' END
             WHERE id = ANY($1::bigint[])`,
            [userIds(), invitedLeaderId]
        );
        await connection.query(`UPDATE lwp_school_class SET "mainTeacherId" = $1 WHERE id = $2`, [teacherId, classId]);
    });

    afterAll(async () => {
        const topicIds = [moneySkillsTopicId, otherMoneySkillsTopicId, otherSubjectTopicId].filter(Boolean);
        const classIds = [classId, otherClassId].filter(Boolean);

        if (userIds().length) await connection.query(`DELETE FROM lwp_notification WHERE "userId" = ANY($1::bigint[])`, [userIds()]);

        if (classIds.length) {
            await connection.query(`DELETE FROM lwp_class_topic WHERE "classId" = ANY($1::bigint[])`, [classIds]);
            await connection.query(`DELETE FROM lwp_school_class WHERE id = ANY($1::bigint[])`, [classIds]);
        }

        if (topicIds.length) {
            await connection.query(`DELETE FROM static_lwp_topic_domain_year_group WHERE "topicId" = ANY($1::bigint[])`, [topicIds]);
            await connection.query(`DELETE FROM static_lwp_topic WHERE id = ANY($1::bigint[])`, [topicIds]);
        }

        if (userIds().length) await connection.query(`DELETE FROM lwp_user WHERE id = ANY($1::bigint[])`, [userIds()]);
        if (schoolId) await connection.query(`DELETE FROM lwp_school WHERE id = $1`, [schoolId]);
    });

    it("emails the school's active leaders and the class's main teacher for the school's first Money Skills topic", async () => {
        const classTopicId = await schedule(moneySkillsTopicId, classId, 30);

        await run();

        expect(await emailedUserIds()).toEqual([leaderId, teacherId].sort());
        expect(await emailTo(leaderId)).toEqual(
            expect.objectContaining({ CLASSTOPICID: Number(classTopicId), ISSCHOOLLEADER: true, ISMAINTEACHER: false })
        );
        expect(await emailTo(teacherId)).toEqual(
            expect.objectContaining({
                SCHOOL: `${tag} School`,
                CLASS: `${tag} Class`,
                CLASSID: Number(classId),
                CLASSTOPICID: Number(classTopicId),
                TOPICNAME: `${tag} Money Skills`,
                PARENTTOPICNAME: `${tag} Money Skills`,
                TEACHERALIAS: 'Teacher',
                RELEASEDATE: inDays(30),
                TEACHERRESOURCE_FILENAME: 'resource.pptx',
                TEACHERPDF_FILENAME: 'handouts.pdf',
                TEACHERPDF_REQUIRED: true,
                ISSCHOOLLEADER: false,
                ISMAINTEACHER: true
            })
        );
        expect(await stampedUserIds()).toEqual([leaderId, teacherId].sort());
    });

    it("emails only the class's main teacher when a later class gets its first Money Skills topic", async () => {
        await schedule(moneySkillsTopicId, classId, 30);
        await run();
        await connection.query(`DELETE FROM lwp_notification WHERE "userId" = ANY($1::bigint[])`, [userIds()]);

        const laterClassTopicId = await schedule(otherMoneySkillsTopicId, otherClassId, 20);

        await run();

        expect(await emailedUserIds()).toEqual([otherTeacherId]);
        expect(await emailTo(otherTeacherId)).toEqual(
            expect.objectContaining({
                CLASS: `${tag} Other Class`,
                CLASSTOPICID: Number(laterClassTopicId),
                ISSCHOOLLEADER: false,
                ISMAINTEACHER: true
            })
        );
    });

    it('tells the leaders about the first created topic and each teacher about their own class when both come in one run', async () => {
        const firstClassTopicId = await schedule(moneySkillsTopicId, classId, 30);
        // Created second but released sooner. "First" means created first, so the leaders are not told about it.
        const otherClassTopicId = await schedule(otherMoneySkillsTopicId, otherClassId, 20);

        await run();

        expect(await emailedUserIds()).toEqual([leaderId, teacherId, otherTeacherId].sort());
        expect((await emailTo(leaderId)).CLASSTOPICID).toBe(Number(firstClassTopicId));
        expect((await emailTo(teacherId)).CLASSTOPICID).toBe(Number(firstClassTopicId));
        expect((await emailTo(otherTeacherId)).CLASSTOPICID).toBe(Number(otherClassTopicId));
    });

    // The rule that made the marker per person rather than per class.
    it('emails a teacher of two classes once, about the class whose topic was created first', async () => {
        await connection.query(`UPDATE lwp_school_class SET "mainTeacherId" = $1 WHERE id = $2`, [teacherId, otherClassId]);

        try {
            const firstClassTopicId = await schedule(moneySkillsTopicId, classId, 30);

            await schedule(otherMoneySkillsTopicId, otherClassId, 20);

            await run();

            const sentToTeacher = (await emails()).filter((email) => email.userId === teacherId);

            expect(sentToTeacher).toHaveLength(1);
            expect(sentToTeacher[0].params).toEqual(expect.objectContaining({ CLASSTOPICID: Number(firstClassTopicId) }));

            // And nothing more once their second class comes round again.
            await run();

            expect((await emails()).filter((email) => email.userId === teacherId)).toHaveLength(1);
        } finally {
            await connection.query(`UPDATE lwp_school_class SET "mainTeacherId" = $1 WHERE id = $2`, [otherTeacherId, otherClassId]);
        }
    });

    it('sends nothing more when a class that has been emailed gets another Money Skills topic', async () => {
        await schedule(moneySkillsTopicId, classId, 30);
        await run();

        await schedule(otherMoneySkillsTopicId, classId, 40);
        await run();

        expect(await emails()).toHaveLength(2);
    });

    /*
     * Schools that scheduled Money Skills before this email existed were told by hand, and the release must not
     * email them again. Their topics were scheduled weeks ago, so the two-day window is what keeps them out.
     */
    it('sends nothing for a topic scheduled before the last two days', async () => {
        const classTopicId = await schedule(moneySkillsTopicId, classId, 30);

        await connection.query(`UPDATE lwp_class_topic SET "logCreatedAt" = now() - interval '3 days' WHERE id = $1`, [classTopicId]);

        await run();

        expect(await emails()).toHaveLength(0);
        expect(await stampedUserIds()).toEqual([]);
    });

    it('ignores a Money Skills topic whose release date has passed', async () => {
        await schedule(moneySkillsTopicId, classId, -3);

        await run();

        expect(await emails()).toHaveLength(0);
        expect(await stampedUserIds()).toEqual([]);
    });

    it('ignores a Money Skills topic released today', async () => {
        const classTopicId = await schedule(moneySkillsTopicId, classId, 0);

        await connection.query(`UPDATE lwp_class_topic SET released = true WHERE id = $1`, [classTopicId]);

        await run();

        expect(await emails()).toHaveLength(0);
        expect(await stampedUserIds()).toEqual([]);
    });

    // A class that has already run Money Skills launched without this email, so it stays out.
    it('sends nothing for a class that has already run a Money Skills topic, even with another still to come', async () => {
        await schedule(moneySkillsTopicId, classId, -3);
        await schedule(otherMoneySkillsTopicId, classId, 30);

        await run();

        expect(await emails()).toHaveLength(0);
        expect(await stampedUserIds()).toEqual([]);
    });

    it("emails a new class's main teacher at a school that has run Money Skills, but not its leaders", async () => {
        await schedule(moneySkillsTopicId, classId, -3);
        const newClassTopicId = await schedule(otherMoneySkillsTopicId, otherClassId, 30);

        await run();

        expect(await emailedUserIds()).toEqual([otherTeacherId]);
        expect(await emailTo(otherTeacherId)).toEqual(
            expect.objectContaining({ CLASSTOPICID: Number(newClassTopicId), ISSCHOOLLEADER: false, ISMAINTEACHER: true })
        );
    });

    // The subject is reached through one row per domain and year group, so a topic offered to several year
    // groups is matched more than once. Nobody should hear about it twice.
    it('emails once for a topic offered to more than one year group', async () => {
        const [otherYearGroup] = await connection.query(
            `SELECT yg.id::text AS id FROM static_lwp_year_group yg
             WHERE yg.id <> (SELECT "yearGroupId" FROM static_lwp_topic_domain_year_group WHERE "topicId" = $1 LIMIT 1)
             ORDER BY yg.id LIMIT 1`,
            [moneySkillsTopicId]
        );

        await connection.query(
            `INSERT INTO static_lwp_topic_domain_year_group ("topicId", "domainId", "yearGroupId")
             SELECT "topicId", "domainId", $2 FROM static_lwp_topic_domain_year_group WHERE "topicId" = $1 LIMIT 1`,
            [moneySkillsTopicId, otherYearGroup.id]
        );

        try {
            await schedule(moneySkillsTopicId, classId, 30);

            await run();

            expect(await emails()).toHaveLength(2);
            expect(await emailedUserIds()).toEqual([leaderId, teacherId].sort());
        } finally {
            await connection.query(`DELETE FROM static_lwp_topic_domain_year_group WHERE "topicId" = $1 AND "yearGroupId" = $2`, [
                moneySkillsTopicId,
                otherYearGroup.id
            ]);
        }
    });

    it('ignores topics from other subjects', async () => {
        await schedule(otherSubjectTopicId, classId, 30);

        await run();

        expect(await emails()).toHaveLength(0);
        expect(await stampedUserIds()).toEqual([]);
    });

    it('sends a leader who is the main teacher of the first class one email, with both flags set', async () => {
        await connection.query(`UPDATE lwp_school_class SET "mainTeacherId" = $1 WHERE id = $2`, [leaderId, classId]);

        try {
            await schedule(moneySkillsTopicId, classId, 30);

            await run();

            const sent = await emails();

            expect(sent).toHaveLength(1);
            expect(sent[0].userId).toBe(leaderId);
            expect(sent[0].params).toEqual(expect.objectContaining({ ISSCHOOLLEADER: true, ISMAINTEACHER: true }));
        } finally {
            await connection.query(`UPDATE lwp_school_class SET "mainTeacherId" = $1 WHERE id = $2`, [teacherId, classId]);
        }
    });

    it('emails the leaders but holds a teacher back until they can be emailed', async () => {
        await setStatus(teacherId, 'INVITED');

        try {
            await schedule(moneySkillsTopicId, classId, 30);

            await run();

            expect(await emailedUserIds()).toEqual([leaderId]);
            expect(await stampedUserIds()).toEqual([leaderId]);

            await setStatus(teacherId, 'ACTIVE');

            await run();

            expect(await emailedUserIds()).toEqual([leaderId, teacherId].sort());
            expect(await stampedUserIds()).toEqual([leaderId, teacherId].sort());
        } finally {
            await setStatus(teacherId, 'ACTIVE');
        }
    });

    it('emails the main teacher but holds a leader back until they can be emailed', async () => {
        await setStatus(leaderId, 'INVITED');

        try {
            await schedule(moneySkillsTopicId, classId, 30);

            await run();

            expect(await emailedUserIds()).toEqual([teacherId]);
            expect(await stampedUserIds()).toEqual([teacherId]);
        } finally {
            await setStatus(leaderId, 'ACTIVE');
        }
    });
});

/**
 * Drives `deleteClassTopics` against a real database. The rule worth proving here is not that a delete
 * deletes, but that a selection holding one topic the caller may not touch removes *nothing*: the
 * schedule page sends a set of ids, and a partial removal would leave a leader unable to tell which of
 * their chosen topics actually went.
 *
 * Seeds everything it uses and removes it afterwards, for the same reasons as the suite above.
 */
describe('ClassTopicService#deleteClassTopics against the database', () => {
    let schoolId: string;
    let classId: string;
    let topicId: string;
    let readingTopicId: string;
    let userId: string;

    let unreleasedIds: string[];
    let releasedId: string;
    let readingId: string;

    const tag = `bulk-remove-${Date.now()}`;

    const createClassTopic = async (topic: string, released: boolean): Promise<string> => {
        const [row] = await connection.query(
            `INSERT INTO lwp_class_topic ("classId", "topicId", "releaseDate", released)
             VALUES ($1, $2, CURRENT_DATE + 30, $3) RETURNING id::text AS id`,
            [classId, topic, released]
        );

        return row.id;
    };

    /*
     * Setting `deletedById` does not leave a flagged row behind. Every table carrying that column has
     * a `delete_on_deleted_by_set` trigger that deletes the row as soon as the column goes from NULL
     * to not-NULL, and a `delete_auditing` trigger that copies it into `deleted_item` on the way out.
     * So the row leaves the table, and who removed it survives in the audit copy.
     */
    const remainingIds = async (): Promise<string[]> => {
        const rows = await connection.query(`SELECT id::text AS id FROM lwp_class_topic WHERE "classId" = $1 ORDER BY id`, [classId]);

        return rows.map((row: { id: string }) => row.id);
    };

    const auditedRemovals = async (): Promise<{ id: string; deletedById: string }[]> =>
        connection.query(
            `SELECT record->>'id' AS id, record->>'deletedById' AS "deletedById"
             FROM deleted_item WHERE source = 'lwp_class_topic' AND record->>'classId' = $1`,
            [classId]
        );

    beforeAll(async () => {
        const [yearGroup] = await connection.query(`SELECT id::text AS id FROM static_lwp_year_group ORDER BY id LIMIT 1`);

        if (!yearGroup) throw new Error('The database needs at least one year group');

        const [school] = await connection.query(`INSERT INTO lwp_school ("schoolName") VALUES ($1) RETURNING id::text AS id`, [
            `${tag} School`
        ]);

        schoolId = school.id;

        const [user] = await connection.query(
            `INSERT INTO lwp_user (firstname, lastname, type, "userStatus", "schoolId")
             VALUES ($1, 'Teacher', 'TEACHER', 'ACTIVE', $2) RETURNING id::text AS id`,
            [tag, schoolId]
        );

        userId = user.id;

        const [period] = await connection.query(`SELECT index FROM static_lwp_period WHERE "isCurrentPeriod" = true LIMIT 1`);

        const [schoolClass] = await connection.query(
            `INSERT INTO lwp_school_class (name, "schoolId", "yearGroup", "periodIndex", status, "isRegistrationClass", "isFullProgramme")
             VALUES ($1, $2, $3, $4, 'ACTIVE', true, true) RETURNING id::text AS id`,
            [`${tag} Class`, schoolId, yearGroup.id, period?.index ?? null]
        );

        classId = schoolClass.id;

        const [topic] = await connection.query(
            `INSERT INTO static_lwp_topic ("teacherTopicName", "parentTopicName", "isPublished", "isHidden", "isReading")
             VALUES ($1, $1, true, false, false) RETURNING id::text AS id`,
            [`${tag} Topic`]
        );

        topicId = topic.id;

        const [readingTopic] = await connection.query(
            `INSERT INTO static_lwp_topic ("teacherTopicName", "parentTopicName", "isPublished", "isHidden", "isReading")
             VALUES ($1, $1, true, false, true) RETURNING id::text AS id`,
            [`${tag} Reading`]
        );

        readingTopicId = readingTopic.id;
    });

    beforeEach(async () => {
        unreleasedIds = [await createClassTopic(topicId, false), await createClassTopic(topicId, false)];
        releasedId = await createClassTopic(topicId, true);
        readingId = await createClassTopic(readingTopicId, false);
    });

    afterEach(async () => {
        await connection.query(`DELETE FROM lwp_class_topic WHERE "classId" = $1`, [classId]);
        // That delete audits itself, so the audit table has to be cleared too or each test would see
        // the previous test's removals.
        await connection.query(`DELETE FROM deleted_item WHERE source = 'lwp_class_topic' AND record->>'classId' = $1`, [classId]);
    });

    afterAll(async () => {
        if (classId) {
            await connection.query(`DELETE FROM lwp_class_topic WHERE "classId" = $1`, [classId]);
            await connection.query(`DELETE FROM deleted_item WHERE source = 'lwp_class_topic' AND record->>'classId' = $1`, [classId]);
            await connection.query(`DELETE FROM lwp_class_subjects WHERE "lwpSchoolClassId" = $1`, [classId]);
            await connection.query(`DELETE FROM lwp_school_class WHERE id = $1`, [classId]);
        }

        if (topicId) await connection.query(`DELETE FROM static_lwp_topic WHERE id = $1`, [topicId]);
        if (readingTopicId) await connection.query(`DELETE FROM static_lwp_topic WHERE id = $1`, [readingTopicId]);
        if (userId) await connection.query(`DELETE FROM lwp_user WHERE id = $1`, [userId]);
        if (schoolId) await connection.query(`DELETE FROM lwp_school WHERE id = $1`, [schoolId]);
    });

    it('removes every selected topic and leaves the rest of the schedule alone', async () => {
        await service.deleteClassTopics(unreleasedIds, userId);

        expect(new Set(await remainingIds())).toEqual(new Set([releasedId, readingId]));
    });

    /*
     * Worth asserting rather than assuming: going through `deletedById` instead of a plain DELETE is
     * the only thing that puts the remover's id in the audit copy. A direct delete still audits the
     * row, but with `deletedById` null, so nobody can tell afterwards who took the topic away.
     */
    it('records who removed them in the audit trail', async () => {
        await service.deleteClassTopics(unreleasedIds, userId);

        const audited = await auditedRemovals();

        expect(audited).toEqual(expect.arrayContaining(unreleasedIds.map((id) => ({ id, deletedById: userId }))));
        expect(audited).toHaveLength(unreleasedIds.length);
    });

    it('removes nothing when the selection contains a released topic', async () => {
        await expect(service.deleteClassTopics([...unreleasedIds, releasedId], userId)).rejects.toThrow('already released');

        expect(new Set(await remainingIds())).toEqual(new Set([...unreleasedIds, releasedId, readingId]));
    });

    it('removes nothing when the selection contains a reading week', async () => {
        await expect(service.deleteClassTopics([...unreleasedIds, readingId], userId)).rejects.toThrow('Reading weeks cannot be removed');

        expect(new Set(await remainingIds())).toEqual(new Set([...unreleasedIds, releasedId, readingId]));
    });
});
