import { type INestApplication } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import moment from 'moment';
import { ClassTopicService } from 'src/api/service/class_topic.service';
import { SchoolClassService } from 'src/api/service/school_class.service';
import { BaseModule } from 'src/base.module';
import { Connection } from 'typeorm';

/**
 * A school set inactive has stopped partnering with us, so none of its teachers should be emailed (LEA-6570).
 * Each scheduled teacher email is one SQL statement, so this drives them against a real database.
 *
 * Two schools are seeded side by side, identical but for the inactive flag: each has an active main teacher
 * who is also on the class's teacher list, a registration class in the current period with reading logs on,
 * and a holiday covering the coming reading week. The active school is the control: it shows the setup would
 * send, so the inactive school's silence is down to the flag.
 *
 * A job that stamps its topics still stamps them at the inactive school, so reactivating the school does not
 * send a backlog of old emails.
 *
 * The jobs are not scoped to these rows, so a run also queues emails for anything else matching in the local
 * database. The assertions only look at the rows seeded here.
 */
jest.setTimeout(180000);

type SeededSchool = { schoolId: string; teacherId: string; classId: string; holidayId: string };

describe('Teacher emails at an inactive school', () => {
    let app: INestApplication;
    let connection: Connection;
    let classTopicService: ClassTopicService;
    let schoolClassService: SchoolClassService;

    let active: SeededSchool;
    let inactive: SeededSchool;
    let topicId: string;
    let readingTopicId: string;
    let trophyId: string;

    const tag = `INACTIVE-${Date.now()}`;

    const inDays = (days: number): string => moment().add(days, 'days').format('YYYY-MM-DD');

    const seedSchool = async (name: string, isInactive: boolean, periodIndex: number, yearGroupId: string): Promise<SeededSchool> => {
        const [school] = await connection.query(
            `INSERT INTO lwp_school ("schoolName", inactive) VALUES ($1, $2) RETURNING id::text AS id`,
            [`${tag} ${name}`, isInactive]
        );

        const [teacher] = await connection.query(
            `INSERT INTO lwp_user (firstname, lastname, email, type, "userStatus", "schoolId", "nameForChildren")
             VALUES ('Tess', 'Teacher', $1, 'TEACHER', 'ACTIVE', $2, 'Miss T') RETURNING id::text AS id`,
            [`${tag.toLowerCase()}-${name.toLowerCase()}@example.com`, school.id]
        );

        // The reading week starts today, so the holiday below lands in the week createReadingTopics fills.
        const [schoolClass] = await connection.query(
            `INSERT INTO lwp_school_class
                (name, "schoolId", "yearGroup", "periodIndex", status, "isFullProgramme", "mainTeacherId", "isRegistrationClass", "IsReadingLogsEnabled", "readingStartDay")
             VALUES ($1, $2, $3, $4, 'ACTIVE', true, $5, true, true, $6) RETURNING id::text AS id`,
            [`${tag} ${name} Class`, school.id, yearGroupId, periodIndex, teacher.id, moment().day()]
        );

        await connection.query(`INSERT INTO lwp_class_teacher ("lwpUserId", "lwpSchoolClassId") VALUES ($1, $2)`, [
            teacher.id,
            schoolClass.id
        ]);

        const [holiday] = await connection.query(
            `INSERT INTO lwp_school_holiday ("holidayName", "startDate", "endDate", "periodIndex")
             VALUES ($1, $2, $3, $4) RETURNING id::text AS id`,
            [`${tag} ${name} Holiday`, inDays(0), inDays(14), periodIndex]
        );

        await connection.query(`INSERT INTO lwp_school_holidays ("lwpSchoolHolidayId", "lwpSchoolId") VALUES ($1, $2)`, [
            holiday.id,
            school.id
        ]);

        return { schoolId: school.id, teacherId: teacher.id, classId: schoolClass.id, holidayId: holiday.id };
    };

    const scheduleClassTopic = async (school: SeededSchool, scheduledTopicId: string, releaseDate: string): Promise<string> => {
        const [row] = await connection.query(
            `INSERT INTO lwp_class_topic ("releaseDate", "classId", "topicId", "readingTarget")
             VALUES ($1, $2, $3, 3) RETURNING id::text AS id`,
            [releaseDate, school.classId, scheduledTopicId]
        );

        return row.id;
    };

    const emailsTo = async (school: SeededSchool, emailTemplateType: string): Promise<unknown[]> =>
        connection.query(`SELECT id FROM lwp_notification WHERE "userId" = $1 AND "emailTemplateType" = $2`, [
            school.teacherId,
            emailTemplateType
        ]);

    const classTopicFlags = async (classTopicId: string): Promise<{ teacherNotified: boolean; weekBeforeTeacherNotified: boolean }> => {
        const [row] = await connection.query(`SELECT "teacherNotified", "weekBeforeTeacherNotified" FROM lwp_class_topic WHERE id = $1`, [
            classTopicId
        ]);

        return row;
    };

    const awardTrophy = async (school: SeededSchool): Promise<void> => {
        await connection.query(`INSERT INTO lwp_pupil_trophy ("trophyId", "schoolClassId") VALUES ($1, $2)`, [trophyId, school.classId]);
        await connection.query(`UPDATE lwp_school_class SET "trophyEmailsPending" = true WHERE id = $1`, [school.classId]);
    };

    beforeAll(async () => {
        app = await NestFactory.create(BaseModule);
        connection = app.get(Connection);
        classTopicService = app.get(ClassTopicService);
        schoolClassService = app.get(SchoolClassService);

        const [reference] = await connection.query(`
            SELECT
                (SELECT id::text FROM static_lwp_year_group ORDER BY id LIMIT 1) AS "yearGroupId",
                (SELECT index FROM static_lwp_period WHERE "isCurrentPeriod" = true LIMIT 1) AS "periodIndex",
                (SELECT id::text FROM static_lwp_topic WHERE "isReading" = true ORDER BY id LIMIT 1) AS "readingTopicId"
        `);

        if (!reference?.yearGroupId || reference?.periodIndex == null || !reference?.readingTopicId) {
            throw new Error('The database needs a year group, a current period and a reading topic');
        }

        readingTopicId = reference.readingTopicId;

        active = await seedSchool('Active', false, reference.periodIndex, reference.yearGroupId);
        inactive = await seedSchool('Inactive', true, reference.periodIndex, reference.yearGroupId);

        const [topic] = await connection.query(
            `INSERT INTO static_lwp_topic ("teacherTopicName", "parentTopicName", "isPublished", "isHidden", "teacherResource", "teacherPdf", "teacherEmailBody", "isReading")
             VALUES ($1, $2, true, false, 'slides.pptx', 'handouts.pdf', 'Hello {{ class }}', false) RETURNING id::text AS id`,
            [`${tag} Topic`, `${tag} Topic (parent)`]
        );

        topicId = topic.id;

        const [trophy] = await connection.query(
            `INSERT INTO static_lwp_trophy (title, "isActive", "isTeacherMail") VALUES ($1, true, true) RETURNING id::text AS id`,
            [`${tag} Trophy`]
        );

        trophyId = trophy.id;
    });

    afterEach(async () => {
        const schools = [active, inactive].filter(Boolean);

        await connection.query(`DELETE FROM lwp_notification WHERE "userId" = ANY($1::bigint[])`, [schools.map((s) => s.teacherId)]);
        await connection.query(`DELETE FROM lwp_class_topic WHERE "classId" = ANY($1::bigint[])`, [schools.map((s) => s.classId)]);
        await connection.query(`DELETE FROM lwp_pupil_trophy WHERE "schoolClassId" = ANY($1::bigint[])`, [schools.map((s) => s.classId)]);
    });

    afterAll(async () => {
        for (const school of [active, inactive].filter(Boolean)) {
            await connection.query(`DELETE FROM lwp_school_holidays WHERE "lwpSchoolId" = $1`, [school.schoolId]);
            await connection.query(`DELETE FROM lwp_school_holiday WHERE id = $1`, [school.holidayId]);
            await connection.query(`DELETE FROM lwp_class_teacher WHERE "lwpSchoolClassId" = $1`, [school.classId]);
            await connection.query(`DELETE FROM lwp_school_class WHERE id = $1`, [school.classId]);
            await connection.query(`DELETE FROM lwp_user WHERE id = $1`, [school.teacherId]);
            await connection.query(`DELETE FROM lwp_school WHERE id = $1`, [school.schoolId]);
        }

        if (topicId) await connection.query(`DELETE FROM static_lwp_topic WHERE id = $1`, [topicId]);
        if (trophyId) await connection.query(`DELETE FROM static_lwp_trophy WHERE id = $1`, [trophyId]);

        await app?.close();
    });

    describe('teacherTopicsToBeReleasedTomorrow', () => {
        it('emails the teacher at the active school', async () => {
            await scheduleClassTopic(active, topicId, inDays(1));

            await classTopicService.teacherTopicsToBeReleasedTomorrow();

            expect(await emailsTo(active, 'sendTeacherTopicsToBeReleasedTomorrow')).toHaveLength(1);
        });

        it('does not email the teacher at the inactive school, but marks the topic as notified', async () => {
            const classTopicId = await scheduleClassTopic(inactive, topicId, inDays(1));

            await classTopicService.teacherTopicsToBeReleasedTomorrow();

            expect(await emailsTo(inactive, 'sendTeacherTopicsToBeReleasedTomorrow')).toHaveLength(0);
            expect((await classTopicFlags(classTopicId)).teacherNotified).toBe(true);
        });
    });

    describe('teacherTopicsToBeReleasedNextWeek', () => {
        it('emails the teacher at the active school', async () => {
            await scheduleClassTopic(active, topicId, inDays(3));

            await classTopicService.teacherTopicsToBeReleasedNextWeek();

            expect(await emailsTo(active, 'sendTeacherTopicToBeReleasedNextWeek')).toHaveLength(1);
        });

        it('does not email the teacher at the inactive school, but marks the topic as notified', async () => {
            const classTopicId = await scheduleClassTopic(inactive, topicId, inDays(3));

            await classTopicService.teacherTopicsToBeReleasedNextWeek();

            expect(await emailsTo(inactive, 'sendTeacherTopicToBeReleasedNextWeek')).toHaveLength(0);
            expect((await classTopicFlags(classTopicId)).weekBeforeTeacherNotified).toBe(true);
        });
    });

    describe('sendTeacherReadingTopicEnd', () => {
        it('emails the teacher at the active school', async () => {
            await scheduleClassTopic(active, readingTopicId, inDays(-8));

            await classTopicService.sendTeacherReadingTopicEnd();

            expect(await emailsTo(active, 'sendTeacherReadingTopicEnd')).toHaveLength(1);
        });

        it('does not email the teacher at the inactive school, but marks the topic as notified', async () => {
            const classTopicId = await scheduleClassTopic(inactive, readingTopicId, inDays(-8));

            await classTopicService.sendTeacherReadingTopicEnd();

            expect(await emailsTo(inactive, 'sendTeacherReadingTopicEnd')).toHaveLength(0);
            expect((await classTopicFlags(classTopicId)).teacherNotified).toBe(true);
        });
    });

    describe('createReadingTopics holiday overlap email', () => {
        it('emails the teacher at the active school', async () => {
            await classTopicService.createReadingTopics();

            expect(await emailsTo(active, 'sendTeacherReadingTopicHolidayOverlap')).toHaveLength(1);
        });

        it('does not email the teacher at the inactive school', async () => {
            await classTopicService.createReadingTopics();

            expect(await emailsTo(inactive, 'sendTeacherReadingTopicHolidayOverlap')).toHaveLength(0);
        });
    });

    describe('sendTrophyMailToTeacher', () => {
        const trophyEmailsPending = async (school: SeededSchool): Promise<boolean> => {
            const [row] = await connection.query(`SELECT "trophyEmailsPending" FROM lwp_school_class WHERE id = $1`, [school.classId]);

            return row.trophyEmailsPending;
        };

        it('emails the teacher at the active school', async () => {
            await awardTrophy(active);

            await schoolClassService.sendTrophyMailToTeacher();

            expect(await emailsTo(active, 'sendTrophyMailToTeacher')).toHaveLength(1);
        });

        it('does not email the teacher at the inactive school, but clears the pending flag', async () => {
            await awardTrophy(inactive);

            await schoolClassService.sendTrophyMailToTeacher();

            expect(await emailsTo(inactive, 'sendTrophyMailToTeacher')).toHaveLength(0);
            expect(await trophyEmailsPending(inactive)).toBe(false);
        });
    });

    // Only run by hand, from the admin mutation, but it emails the same teachers one trophy at a time.
    describe('sendTrophyMailToSchoolLeader', () => {
        afterEach(async () => {
            await connection.query(`UPDATE lwp_school SET "lastTrophyLeaderEmailSent" = null WHERE id = ANY($1::bigint[])`, [
                [active.schoolId, inactive.schoolId]
            ]);
        });

        it('emails the teacher at the active school', async () => {
            await awardTrophy(active);

            await schoolClassService.sendTrophyMailToSchoolLeader();

            expect(await emailsTo(active, 'sendTrophyMailToTeacher')).toHaveLength(1);
        });

        it('does not email the teacher at the inactive school', async () => {
            await awardTrophy(inactive);

            await schoolClassService.sendTrophyMailToSchoolLeader();

            expect(await emailsTo(inactive, 'sendTrophyMailToTeacher')).toHaveLength(0);
        });
    });
});
