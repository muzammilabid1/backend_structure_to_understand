import type { Schema } from '@lwp/postgres-client';
import { type Insertable, type Kysely, type Selectable } from 'kysely';
import { PupilParentStatus, UserStatus, UserType } from 'lwp-shared';

export const NON_EXISTENT_PUPIL_ID = '0';

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export const createUtils = (db: Kysely<Schema.DB>) => ({
    addParentToPupil: async (pupilId: string, parentId: string): Promise<Selectable<Schema.LwpPupilParent>> =>
        db
            .insertInto('lwp_pupil_parent')
            .values({
                pupilId,
                parentId,
                status: PupilParentStatus.ACTIVE
            })
            .returningAll()
            .executeTakeFirstOrThrow(),

    addPupilToClass: async (pupilId: string, classId: string): Promise<void> => {
        await db
            .insertInto('lwp_class_pupil')
            .values({
                lwpPupilId: pupilId,
                lwpSchoolClassId: classId
            })
            .executeTakeFirstOrThrow();
    },

    createClass: (schoolId: string, fields: Insertable<Schema.LwpSchoolClass>): Promise<Selectable<Schema.LwpSchoolClass>> =>
        db
            .insertInto('lwp_school_class')
            .values({
                ...fields,
                schoolId
            })
            .returningAll()
            .executeTakeFirstOrThrow(),

    createClassTopic: async (classId: string, fields: Insertable<Schema.LwpClassTopic>): Promise<Selectable<Schema.LwpClassTopic>> =>
        db
            .insertInto('lwp_class_topic')
            .values({
                ...fields,
                classId
            })
            .returningAll()
            .executeTakeFirstOrThrow(),

    createFeedbackEntry: async (fields: Insertable<Schema.LwpPupilFeedback>): Promise<Selectable<Schema.LwpPupilFeedback>> =>
        db
            .insertInto('lwp_pupil_feedback')
            .values({
                ...fields
            })
            .returningAll()
            .executeTakeFirstOrThrow(),

    createParent: (fields: Insertable<Schema.LwpUser>): Promise<Selectable<Schema.LwpUser>> =>
        db
            .insertInto('lwp_user')
            .values({
                ...fields,
                type: UserType.PARENT,
                userStatus: UserStatus.ACTIVE
            })
            .returningAll()
            .executeTakeFirstOrThrow(),

    createPupil: (schoolId: string, fields: Insertable<Schema.LwpPupil>): Promise<Selectable<Schema.LwpPupil>> =>
        db
            .insertInto('lwp_pupil')
            .values({
                ...fields,
                schoolId
            })
            .returningAll()
            .executeTakeFirstOrThrow(),

    createPupilActivity: async (
        pupilId: string,
        fields: Insertable<Schema.LwpPupilActivity>
    ): Promise<Selectable<Schema.LwpPupilActivity>> =>
        db
            .insertInto('lwp_pupil_activity')
            .values({
                ...fields,
                pupilId
            })
            .returningAll()
            .executeTakeFirstOrThrow(),

    createPupilTopic: async (pupilId: string, fields: Insertable<Schema.LwpPupilTopic>): Promise<Selectable<Schema.LwpPupilTopic>> =>
        db
            .insertInto('lwp_pupil_topic')
            .values({
                ...fields,
                pupilId
            })
            .returningAll()
            .executeTakeFirstOrThrow(),

    createSchool: (fields: Insertable<Schema.LwpSchool>): Promise<Selectable<Schema.LwpSchool>> =>
        db.insertInto('lwp_school').values(fields).returningAll().executeTakeFirstOrThrow(),

    createStaticActivity: async (fields: Insertable<Schema.StaticLwpActivity>): Promise<Selectable<Schema.StaticLwpActivity>> =>
        db.insertInto('static_lwp_activity').values(fields).returningAll().executeTakeFirstOrThrow(),

    createStaticTopic: async (fields: Insertable<Schema.StaticLwpTopic>): Promise<Selectable<Schema.StaticLwpTopic>> =>
        db.insertInto('static_lwp_topic').values(fields).returningAll().executeTakeFirstOrThrow(),

    createUser: (fields: Insertable<Schema.LwpUser>): Promise<Selectable<Schema.LwpUser>> =>
        db
            .insertInto('lwp_user')
            .values({
                ...fields,
                type: UserType.ADMIN,
                userStatus: UserStatus.ACTIVE
            })
            .returningAll()
            .executeTakeFirstOrThrow(),

    deleteClass: async (classId: string): Promise<void> => {
        await db.deleteFrom('lwp_school_class').where('id', '=', classId).executeTakeFirstOrThrow();
    },

    deleteClassTopic: async (classTopicId: string): Promise<void> => {
        await db.deleteFrom('lwp_class_topic').where('id', '=', classTopicId).executeTakeFirstOrThrow();
    },

    deleteFeedbackEntry: async (feedbackEntryId: string): Promise<void> => {
        await db.deleteFrom('lwp_pupil_feedback').where('id', '=', feedbackEntryId).executeTakeFirstOrThrow();
    },

    deletePupil: async (pupilId: string): Promise<void> => {
        await db.deleteFrom('lwp_pupil').where('id', '=', pupilId).executeTakeFirstOrThrow();
    },

    deletePupilActivity: async (pupilActivityId: string): Promise<void> => {
        await db.deleteFrom('lwp_pupil_activity').where('id', '=', pupilActivityId).executeTakeFirstOrThrow();
    },

    deletePupilTopic: async (pupilTopicId: string): Promise<void> => {
        await db.deleteFrom('lwp_pupil_topic').where('id', '=', pupilTopicId).executeTakeFirstOrThrow();
    },

    deleteSchool: async (schoolId: string): Promise<void> => {
        await db.deleteFrom('lwp_school').where('id', '=', schoolId).executeTakeFirstOrThrow();
    },

    deleteStaticActivity: async (staticActivityId: string): Promise<void> => {
        await db.deleteFrom('static_lwp_activity').where('id', '=', staticActivityId).executeTakeFirstOrThrow();
    },

    deleteStaticTopic: async (staticTopicId: string): Promise<void> => {
        await db.deleteFrom('static_lwp_topic').where('id', '=', staticTopicId).executeTakeFirstOrThrow();
    },

    deleteUser: async (userId: string): Promise<void> => {
        await db.deleteFrom('lwp_user').where('id', '=', userId).executeTakeFirstOrThrow();
    },

    getPupil: (pupilId: string): Promise<Selectable<Schema.LwpPupil>> =>
        db.selectFrom('lwp_pupil').where('id', '=', pupilId).selectAll().executeTakeFirstOrThrow(),

    getPupilActivityIds: async (pupilId: string): Promise<Array<string>> => {
        const rows = await db.selectFrom('lwp_pupil_activity as lpa').where('lpa.pupilId', '=', pupilId).select('lpa.id').execute();

        return rows.map((row) => row.id);
    },

    getPupilClassIds: async (pupilId: string): Promise<Array<string>> => {
        const rows = await db
            .selectFrom('lwp_class_pupil as lcp')
            .where('lcp.lwpPupilId', '=', pupilId)
            .select('lcp.lwpSchoolClassId as id')
            .execute();

        return rows.map((row) => row.id);
    },

    getPupilFeedbackEntries: (pupilId: string): Promise<Array<Selectable<Schema.LwpPupilFeedback>>> =>
        db
            .selectFrom('lwp_pupil_feedback_history as lfph')
            .innerJoin('lwp_pupil_feedback as lpf', 'lpf.id', 'lfph.lwpPupilFeedbackId')
            .where('lfph.lwpPupilId', '=', pupilId)
            .selectAll('lpf')
            .execute(),

    getPupilParents: (pupilId: string): Promise<Array<Selectable<Schema.LwpUser>>> =>
        db
            .selectFrom('lwp_pupil_parent as lpp')
            .innerJoin('lwp_user as lu', 'lu.id', 'lpp.parentId')
            .where('lpp.pupilId', '=', pupilId)
            .selectAll('lu')
            .execute(),

    getPupilTopics: (pupilId: string): Promise<Array<Selectable<Schema.LwpPupilTopic>>> =>
        db.selectFrom('lwp_pupil_topic as lpt').where('lpt.pupilId', '=', pupilId).selectAll('lpt').execute(),

    getStaticReadingTopic: async (): Promise<Selectable<Schema.StaticLwpTopic>> =>
        db.selectFrom('static_lwp_topic').where('isReading', '=', true).selectAll().executeTakeFirstOrThrow(),

    linkPupilToFeedbackEntry: async (pupilId: string, feedbackId: string): Promise<void> => {
        await db
            .insertInto('lwp_pupil_feedback_history')
            .values({
                lwpPupilId: pupilId,
                lwpPupilFeedbackId: feedbackId
            })
            .executeTakeFirstOrThrow();
    },

    removeParentFromPupil: async (pupilId: string, parentId: string): Promise<void> => {
        await db.deleteFrom('lwp_pupil_parent').where('pupilId', '=', pupilId).where('parentId', '=', parentId).executeTakeFirstOrThrow();
    },

    removePupilFromClass: async (pupilId: string, classId: string): Promise<void> => {
        await db
            .deleteFrom('lwp_class_pupil')
            .where('lwpPupilId', '=', pupilId)
            .where('lwpSchoolClassId', '=', classId)
            .executeTakeFirstOrThrow();
    }
});
