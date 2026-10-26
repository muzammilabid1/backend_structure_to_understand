import { type INestApplication } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ClassTopicDeleteOptions } from 'src/api/model';
import { ClassTopicService } from 'src/api/service/class_topic.service';
import { PupilTopicService } from 'src/api/service/pupil_topic.service';
import { UserType } from 'src/auth/types/UserType';
import { BaseModule } from 'src/base.module';
import { Connection } from 'typeorm';

jest.setTimeout(180000);

let app: INestApplication;
let connection: Connection;
let classTopicService: ClassTopicService;
let pupilTopicService: PupilTopicService;

beforeAll(async () => {
    app = await NestFactory.create(BaseModule);
    connection = app.get(Connection);
    classTopicService = app.get(ClassTopicService);
    pupilTopicService = app.get(PupilTopicService);
});

afterAll(async () => {
    await app?.close();
});

describe('bulk class topic deletion', () => {
    const tag = `DELCT-${Date.now()}`;
    const PUPILS = 4;

    let schoolId: string;
    let adminId: string;
    let parentId: string;
    let classId: string;
    let topicId: string;
    let staticActivityIds: string[];
    let pupilIds: string[];

    let classTopicId: string;
    let pupilTopicIds: string[];
    let pupilActivityIds: string[];
    let feedbackIds: string[];
    const auditIds: string[] = [];

    const ids = async (sql: string, params: unknown[]): Promise<string[]> =>
        (await connection.query(sql, params)).map((row: { id: string }) => row.id);

    const remaining = async (): Promise<{ classTopic: number; pupilTopics: number; activities: number }> => {
        const [row] = await connection.query(
            `SELECT (SELECT count(*)::int FROM lwp_class_topic WHERE id = $1) AS "classTopic",
                    (SELECT count(*)::int FROM lwp_pupil_topic WHERE id = ANY($2::bigint[])) AS "pupilTopics",
                    (SELECT count(*)::int FROM lwp_pupil_activity WHERE id = ANY($3::bigint[])) AS activities`,
            [classTopicId, pupilTopicIds, pupilActivityIds]
        );

        return row;
    };

    beforeAll(async () => {
        [schoolId] = await ids(`INSERT INTO lwp_school ("schoolName") VALUES ($1) RETURNING id::text AS id`, [`${tag} School`]);
        [adminId] = await ids(
            `INSERT INTO lwp_user (firstname, lastname, type, "userStatus") VALUES ($1, 'Admin', 'ADMIN', 'ACTIVE') RETURNING id::text AS id`,
            [tag]
        );
        [parentId] = await ids(
            `INSERT INTO lwp_user (firstname, lastname, type, "userStatus") VALUES ($1, 'Parent', 'PARENT', 'ACTIVE') RETURNING id::text AS id`,
            [tag]
        );
        [classId] = await ids(
            `INSERT INTO lwp_school_class (name, "schoolId", "isRegistrationClass") VALUES ($1, $2, true) RETURNING id::text AS id`,
            [`${tag} Class`, schoolId]
        );
        [topicId] = await ids(
            `INSERT INTO static_lwp_topic ("teacherTopicName", "parentTopicName", "isReading") VALUES ($1, $1, false) RETURNING id::text AS id`,
            [`${tag} Topic`]
        );
        staticActivityIds = await ids(
            `INSERT INTO static_lwp_activity (name, "activityType", "topicId")
             SELECT $1 || ' Activity ' || n, 'LEGACY', $2 FROM generate_series(1, 4) AS n RETURNING id::text AS id`,
            [tag, topicId]
        );
        pupilIds = await ids(
            `INSERT INTO lwp_pupil (firstname, lastname, "schoolId")
             SELECT $1, 'Pupil ' || n, $2 FROM generate_series(1, $3::int) AS n RETURNING id::text AS id`,
            [tag, schoolId, PUPILS]
        );
    });

    beforeEach(async () => {
        feedbackIds = [];
        [classTopicId] = await ids(
            `INSERT INTO lwp_class_topic ("classId", "topicId", "releaseDate", released) VALUES ($1, $2, '2000-01-01', true) RETURNING id::text AS id`,
            [classId, topicId]
        );
        pupilTopicIds = await ids(
            `INSERT INTO lwp_pupil_topic ("pupilId", "topicId", "classTopicId", "releaseDate")
             SELECT p, $2, $3, '2000-01-01' FROM unnest($1::bigint[]) AS p RETURNING id::text AS id`,
            [pupilIds, topicId, classTopicId]
        );
        pupilActivityIds = await ids(
            `INSERT INTO lwp_pupil_activity ("pupilId", "topicId", "activityId")
             SELECT pt."pupilId", pt.id, a FROM lwp_pupil_topic pt, unnest($2::bigint[]) AS a
             WHERE pt.id = ANY($1::bigint[]) RETURNING id::text AS id`,
            [pupilTopicIds, staticActivityIds]
        );
        auditIds.push(classTopicId, ...pupilTopicIds, ...pupilActivityIds);
    });

    afterEach(async () => {
        if (feedbackIds.length) await connection.query(`DELETE FROM lwp_pupil_feedback WHERE id = ANY($1::bigint[])`, [feedbackIds]);
        await connection.query(`DELETE FROM lwp_pupil_topic WHERE "pupilId" = ANY($1::bigint[])`, [pupilIds]);
        await connection.query(`DELETE FROM lwp_class_topic WHERE "classId" = $1`, [classId]);
    });

    afterAll(async () => {
        if (pupilIds?.length) await connection.query(`DELETE FROM lwp_pupil WHERE id = ANY($1::bigint[])`, [pupilIds]);
        if (staticActivityIds?.length)
            await connection.query(`DELETE FROM static_lwp_activity WHERE id = ANY($1::bigint[])`, [staticActivityIds]);
        if (topicId) await connection.query(`DELETE FROM static_lwp_topic WHERE id = $1`, [topicId]);
        if (classId) await connection.query(`DELETE FROM lwp_school_class WHERE id = $1`, [classId]);
        await connection.query(`DELETE FROM lwp_user WHERE id = ANY($1::bigint[])`, [[adminId, parentId].filter(Boolean)]);
        if (schoolId) await connection.query(`DELETE FROM lwp_school WHERE id = $1`, [schoolId]);
        await connection.query(
            `DELETE FROM deleted_item WHERE source IN ('lwp_class_topic', 'lwp_pupil_topic', 'lwp_pupil_activity', 'lwp_pupil_feedback', 'lwp_pupil', 'static_lwp_activity', 'static_lwp_topic', 'lwp_school_class', 'lwp_user', 'lwp_school')
             AND "recordId"::text = ANY($1::text[])`,
            [[...auditIds, ...pupilIds, ...staticActivityIds, topicId, classId, adminId, parentId, schoolId].filter(Boolean)]
        );
    });

    it('ALL_PUPIL_TOPICS deletes the class topic, every pupil topic and every activity', async () => {
        const res = await classTopicService.deleteClassTopic(
            classTopicId,
            ClassTopicDeleteOptions.ALL_PUPIL_TOPICS,
            adminId,
            UserType.ADMIN
        );

        expect(res.status).toBe('ok');
        expect(await remaining()).toEqual({ classTopic: 0, pupilTopics: 0, activities: 0 });

        const [audit] = await connection.query(
            `SELECT count(*)::int AS count FROM deleted_item
             WHERE source = 'lwp_pupil_activity' AND "recordId"::text = ANY($1::text[]) AND record->>'deletedById' = $2`,
            [pupilActivityIds, adminId]
        );

        expect(audit.count).toBe(pupilActivityIds.length);
    });

    it('PUPIL_TOPICS_WITH_NO_FEEDBACK keeps gold-star pupil topics and their activities', async () => {
        await connection.query(`UPDATE lwp_pupil_topic SET "earnedGoldStar" = true WHERE id = $1`, [pupilTopicIds[0]]);

        await classTopicService.deleteClassTopic(
            classTopicId,
            ClassTopicDeleteOptions.PUPIL_TOPICS_WITH_NO_FEEDBACK,
            adminId,
            UserType.ADMIN
        );

        expect(await remaining()).toEqual({ classTopic: 0, pupilTopics: 1, activities: staticActivityIds.length });
        expect(await ids(`SELECT id::text AS id FROM lwp_pupil_topic WHERE id = ANY($1::bigint[])`, [pupilTopicIds])).toEqual([
            pupilTopicIds[0]
        ]);
    });

    it('rolls everything back when the last pupil has a completed activity', async () => {
        const lastActivityIds = await ids(`SELECT id::text AS id FROM lwp_pupil_activity WHERE "topicId" = $1`, [
            pupilTopicIds[PUPILS - 1]
        ]);

        feedbackIds = await ids(
            `INSERT INTO lwp_pupil_feedback ("logCreatedById", "userType", type, "activityId") VALUES ($1, 'PARENT', 'ACTIVITY', $2) RETURNING id::text AS id`,
            [parentId, lastActivityIds[0]]
        );

        await expect(
            classTopicService.deleteClassTopic(classTopicId, ClassTopicDeleteOptions.ALL_PUPIL_TOPICS, adminId, UserType.ADMIN)
        ).rejects.toThrow('This activity cannot be deleted because a pupil has completed it.');

        expect(await remaining()).toEqual({ classTopic: 1, pupilTopics: PUPILS, activities: PUPILS * staticActivityIds.length });
    });

    it('still refuses a released class topic for a teacher', async () => {
        await expect(classTopicService.deleteClassTopic(classTopicId, null, adminId, UserType.TEACHER)).rejects.toThrow(
            'This class topic is already released'
        );

        expect(await remaining()).toEqual({ classTopic: 1, pupilTopics: PUPILS, activities: PUPILS * staticActivityIds.length });
    });

    it('deletePupilTopics still deletes one pupil topic and its activities', async () => {
        const res = await pupilTopicService.deletePupilTopics([pupilTopicIds[0]], adminId);

        expect(res.status).toBe('ok');
        expect(await remaining()).toEqual({
            classTopic: 1,
            pupilTopics: PUPILS - 1,
            activities: (PUPILS - 1) * staticActivityIds.length
        });
    });

    it('deletePupilTopics still throws for an unknown id', async () => {
        await expect(pupilTopicService.deletePupilTopics(['0'], adminId)).rejects.toThrow('Pupil Topic does not exist');
    });

    it('deletes pupil topics that have no activities, as reading topics do', async () => {
        await connection.query(`DELETE FROM lwp_pupil_activity WHERE id = ANY($1::bigint[])`, [pupilActivityIds]);

        await classTopicService.deleteClassTopic(classTopicId, ClassTopicDeleteOptions.ALL_PUPIL_TOPICS, adminId, UserType.ADMIN);

        expect(await remaining()).toEqual({ classTopic: 0, pupilTopics: 0, activities: 0 });
    });

    it('lets an admin delete a class topic with no pupil topics', async () => {
        await connection.query(`DELETE FROM lwp_pupil_topic WHERE id = ANY($1::bigint[])`, [pupilTopicIds]);
        await connection.query(`UPDATE lwp_class_topic SET released = false WHERE id = $1`, [classTopicId]);

        await classTopicService.deleteClassTopic(classTopicId, ClassTopicDeleteOptions.ALL_PUPIL_TOPICS, adminId, UserType.ADMIN);

        expect(await remaining()).toEqual({ classTopic: 0, pupilTopics: 0, activities: 0 });
    });
});
