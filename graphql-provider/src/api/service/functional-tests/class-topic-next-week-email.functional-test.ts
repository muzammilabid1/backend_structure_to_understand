import { type INestApplication } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import moment from 'moment';
import { ClassTopicService } from 'src/api/service/class_topic.service';
import { BaseModule } from 'src/base.module';
import { Connection } from 'typeorm';

/**
 * Drives `teacherTopicsToBeReleasedNextWeek` against a real database, because the whole job is one SQL
 * statement: which class topics it picks is decided by joins and a where clause that a mock cannot check.
 *
 * Everything this suite asserts on, it creates: a school, an active main teacher, a class in the current
 * period and four topics - a Money Skills topic with slides, a Money Skills topic without slides, a
 * non-Money-Skills topic with slides and a reading topic with slides. It reads only reference data: one Money
 * Skills domain, one other domain and a year group.
 *
 * The job itself is not scoped to these rows, so a run also queues the email for any other matching class
 * topic already in the local database. The assertions only look at the rows seeded here.
 */
jest.setTimeout(180000);

describe('ClassTopicService#teacherTopicsToBeReleasedNextWeek against the database', () => {
    let app: INestApplication;
    let connection: Connection;
    let service: ClassTopicService;

    let schoolId: string;
    let teacherId: string;
    let classId: string;
    let slidesTopicId: string;
    let noSlidesTopicId: string;
    let otherSubjectTopicId: string;
    let readingTopicId: string;

    const tag = `NEXTWEEK-${Date.now()}`;

    const inDays = (days: number): string => moment().add(days, 'days').format('YYYY-MM-DD');

    const scheduleClassTopic = async (
        topicId: string,
        releaseDate: string,
        dueDate: string | null = null,
        released = false
    ): Promise<string> => {
        const [row] = await connection.query(
            `INSERT INTO lwp_class_topic ("releaseDate", "dueDate", "classId", "topicId", released)
             VALUES ($1, $2, $3, $4, $5) RETURNING id::text AS id`,
            [releaseDate, dueDate, classId, topicId, released]
        );

        return row.id;
    };

    const emailsFor = async (classTopicId: string): Promise<Record<string, unknown>[]> => {
        const rows = await connection.query(
            `SELECT params, "userId"::text AS "userId" FROM lwp_notification
             WHERE "emailTemplateType" = 'sendTeacherTopicToBeReleasedNextWeek' AND params->>'CLASSTOPICID' = $1`,
            [classTopicId]
        );

        return rows;
    };

    const flags = async (classTopicId: string): Promise<{ weekBeforeTeacherNotified: boolean; teacherNotified: boolean }> => {
        const [row] = await connection.query(`SELECT "weekBeforeTeacherNotified", "teacherNotified" FROM lwp_class_topic WHERE id = $1`, [
            classTopicId
        ]);

        return row;
    };

    const insertTopic = async (
        name: string,
        domainId: string,
        yearGroupId: string,
        teacherResource: string | null,
        isReading = false
    ): Promise<string> => {
        const [topic] = await connection.query(
            `INSERT INTO static_lwp_topic ("teacherTopicName", "parentTopicName", "isPublished", "isHidden", "teacherResource", "teacherPdf", "teacherEmailBody", "isReading")
             VALUES ($1, $2, true, false, $3, 'handouts.pdf', 'Hello {{ class }}', $4) RETURNING id::text AS id`,
            [`${tag} ${name}`, `${tag} ${name} (parent)`, teacherResource, isReading]
        );

        await connection.query(
            `INSERT INTO static_lwp_topic_domain_year_group ("topicId", "domainId", "yearGroupId") VALUES ($1, $2, $3)`,
            [topic.id, domainId, yearGroupId]
        );

        return topic.id;
    };

    beforeAll(async () => {
        app = await NestFactory.create(BaseModule);
        connection = app.get(Connection);
        service = app.get(ClassTopicService);

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

        const [school] = await connection.query(`INSERT INTO lwp_school ("schoolName") VALUES ($1) RETURNING id::text AS id`, [
            `${tag} School`
        ]);

        schoolId = school.id;

        const [teacher] = await connection.query(
            `INSERT INTO lwp_user (firstname, lastname, email, type, "userStatus", "schoolId", "nameForChildren")
             VALUES ('Tess', 'Teacher', $1, 'TEACHER', 'ACTIVE', $2, 'Miss T') RETURNING id::text AS id`,
            [`${tag.toLowerCase()}@example.com`, schoolId]
        );

        teacherId = teacher.id;

        const [schoolClass] = await connection.query(
            `INSERT INTO lwp_school_class (name, "schoolId", "yearGroup", "periodIndex", status, "isFullProgramme", "mainTeacherId")
             VALUES ($1, $2, $3, $4, 'ACTIVE', true, $5) RETURNING id::text AS id`,
            [`${tag} Class`, schoolId, reference.yearGroupId, reference.periodIndex, teacherId]
        );

        classId = schoolClass.id;

        slidesTopicId = await insertTopic('Money Skills with slides', reference.moneySkillsDomainId, reference.yearGroupId, 'slides.pptx');
        noSlidesTopicId = await insertTopic('Money Skills without slides', reference.moneySkillsDomainId, reference.yearGroupId, null);
        otherSubjectTopicId = await insertTopic('Other subject with slides', reference.otherDomainId, reference.yearGroupId, 'slides.pptx');
        readingTopicId = await insertTopic('Reading with slides', reference.otherDomainId, reference.yearGroupId, 'slides.pptx', true);
    });

    afterEach(async () => {
        await connection.query(`DELETE FROM lwp_notification WHERE "userId" = $1`, [teacherId]);
        await connection.query(`DELETE FROM lwp_class_topic WHERE "classId" = $1`, [classId]);
    });

    afterAll(async () => {
        const topicIds = [slidesTopicId, noSlidesTopicId, otherSubjectTopicId, readingTopicId].filter(Boolean);

        if (teacherId) await connection.query(`DELETE FROM lwp_notification WHERE "userId" = $1`, [teacherId]);
        if (classId) await connection.query(`DELETE FROM lwp_class_topic WHERE "classId" = $1`, [classId]);

        if (topicIds.length) {
            await connection.query(`DELETE FROM static_lwp_topic_domain_year_group WHERE "topicId" = ANY($1::bigint[])`, [topicIds]);
            await connection.query(`DELETE FROM static_lwp_topic WHERE id = ANY($1::bigint[])`, [topicIds]);
        }

        if (classId) await connection.query(`DELETE FROM lwp_school_class WHERE id = $1`, [classId]);
        if (teacherId) await connection.query(`DELETE FROM lwp_user WHERE id = $1`, [teacherId]);
        if (schoolId) await connection.query(`DELETE FROM lwp_school WHERE id = $1`, [schoolId]);

        await app?.close();
    });

    it('queues one email to the main teacher for a topic with slides released within the window', async () => {
        const classTopicId = await scheduleClassTopic(slidesTopicId, inDays(6), inDays(12));

        await service.teacherTopicsToBeReleasedNextWeek();

        const emails = await emailsFor(classTopicId);

        expect(emails).toHaveLength(1);
        expect(emails[0].userId).toBe(teacherId);
        expect(emails[0].params).toEqual(
            expect.objectContaining({
                SCHOOL: `${tag} School`,
                CLASS: `${tag} Class`,
                CLASSID: Number(classId),
                CLASSTOPICID: Number(classTopicId),
                TOPICNAME: `${tag} Money Skills with slides`,
                PARENTTOPICNAME: `${tag} Money Skills with slides (parent)`,
                TOPICMESSAGE: `Hello ${tag} Class`,
                TEACHERALIAS: 'Miss T',
                RELEASEDATE: inDays(6),
                DUEDATE: inDays(12),
                TEACHERRESOURCE_FILENAME: 'slides.pptx',
                TEACHERPDF_FILENAME: 'handouts.pdf'
            })
        );
    });

    it('sets its own flag and leaves the day-before email flag alone', async () => {
        const classTopicId = await scheduleClassTopic(slidesTopicId, inDays(3));

        await service.teacherTopicsToBeReleasedNextWeek();

        expect(await flags(classTopicId)).toEqual({ weekBeforeTeacherNotified: true, teacherNotified: false });
    });

    it('does not send the same email twice', async () => {
        const classTopicId = await scheduleClassTopic(slidesTopicId, inDays(5));

        await service.teacherTopicsToBeReleasedNextWeek();
        await service.teacherTopicsToBeReleasedNextWeek();

        expect(await emailsFor(classTopicId)).toHaveLength(1);
    });

    it('includes a topic released today that has not been released yet', async () => {
        const classTopicId = await scheduleClassTopic(slidesTopicId, inDays(0));

        await service.teacherTopicsToBeReleasedNextWeek();

        expect(await emailsFor(classTopicId)).toHaveLength(1);
    });

    // The day-before email also picks this one up, so the teacher gets both. That overlap is deliberate:
    // the day-before email carries no slides, so a lower bound here would leave short-notice topics without them.
    it('includes a topic releasing tomorrow, which the day-before email also covers', async () => {
        const classTopicId = await scheduleClassTopic(slidesTopicId, inDays(1));

        await service.teacherTopicsToBeReleasedNextWeek();

        expect(await emailsFor(classTopicId)).toHaveLength(1);
    });

    it('skips a topic that has already been released', async () => {
        const classTopicId = await scheduleClassTopic(slidesTopicId, inDays(-3), null, true);

        await service.teacherTopicsToBeReleasedNextWeek();

        expect(await emailsFor(classTopicId)).toHaveLength(0);
        expect((await flags(classTopicId)).weekBeforeTeacherNotified).toBe(false);
    });

    it('skips a released topic even when its date is still in the next week', async () => {
        const classTopicId = await scheduleClassTopic(slidesTopicId, inDays(2), null, true);

        await service.teacherTopicsToBeReleasedNextWeek();

        expect(await emailsFor(classTopicId)).toHaveLength(0);
    });

    // A school the release job skips (an inactive one) keeps its past topics unreleased, so the released
    // flag alone would let them through.
    it('skips a past topic that was never released', async () => {
        const classTopicId = await scheduleClassTopic(slidesTopicId, inDays(-3));

        await service.teacherTopicsToBeReleasedNextWeek();

        expect(await emailsFor(classTopicId)).toHaveLength(0);
    });

    // The window ends six days out, so a topic a full week away waits for tomorrow's run.
    it('waits for a topic released beyond the window', async () => {
        const classTopicId = await scheduleClassTopic(slidesTopicId, inDays(7));

        await service.teacherTopicsToBeReleasedNextWeek();

        expect(await emailsFor(classTopicId)).toHaveLength(0);
        expect((await flags(classTopicId)).weekBeforeTeacherNotified).toBe(false);
    });

    it('skips a Money Skills topic with no slides', async () => {
        const classTopicId = await scheduleClassTopic(noSlidesTopicId, inDays(2));

        await service.teacherTopicsToBeReleasedNextWeek();

        expect(await emailsFor(classTopicId)).toHaveLength(0);
    });

    it('sends for a topic with slides outside Money Skills', async () => {
        const classTopicId = await scheduleClassTopic(otherSubjectTopicId, inDays(2));

        await service.teacherTopicsToBeReleasedNextWeek();

        expect(await emailsFor(classTopicId)).toHaveLength(1);
    });

    it('skips a reading topic, which has its own teacher emails', async () => {
        const classTopicId = await scheduleClassTopic(readingTopicId, inDays(2));

        await service.teacherTopicsToBeReleasedNextWeek();

        expect(await emailsFor(classTopicId)).toHaveLength(0);
    });

    it('skips a class whose main teacher is not active', async () => {
        await connection.query(`UPDATE lwp_user SET "userStatus" = 'INACTIVE' WHERE id = $1`, [teacherId]);

        try {
            const classTopicId = await scheduleClassTopic(slidesTopicId, inDays(2));

            await service.teacherTopicsToBeReleasedNextWeek();

            expect(await emailsFor(classTopicId)).toHaveLength(0);
        } finally {
            await connection.query(`UPDATE lwp_user SET "userStatus" = 'ACTIVE' WHERE id = $1`, [teacherId]);
        }
    });
});
