import type { Schema } from '@lwp/postgres-client';
import { type Insertable, type Kysely, type Selectable, type Updateable } from 'kysely';
import { PupilParentStatus, UserStatus, UserType } from 'lwp-shared';

export const createUtils = (db: Kysely<Schema.DB>) => ({
    addParentToPupil: async (
        pupilId: string,
        parentId: string,
        showInterstitial = true,
        status = PupilParentStatus.ACTIVE
    ): Promise<Selectable<Schema.LwpPupilParent>> =>
        db
            .insertInto('lwp_pupil_parent')
            .values({
                pupilId,
                parentId,
                status,
                showInterstitial,
                interstitialContext: showInterstitial
                    ? JSON.stringify({
                          isTopicsSectionShown: false,
                          isReadingSectionShown: false
                      })
                    : JSON.stringify({
                          isTopicsSectionShown: true,
                          isReadingSectionShown: true
                      })
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

    addClassSubject: async (subjectId: string, classId: string): Promise<void> => {
        await db
            .insertInto('lwp_class_subjects')
            .values({
                staticLwpSubjectId: subjectId,
                lwpSchoolClassId: classId
            })
            .executeTakeFirstOrThrow();
    },

    addClassTeacher: async (teacherId: string, classId: string): Promise<void> => {
        await db
            .insertInto('lwp_class_teacher')
            .values({
                lwpUserId: teacherId,
                lwpSchoolClassId: classId
            })
            .onConflict((oc) => oc.doNothing())
            .execute();
    },

    /** As if the leader had already closed the one-time Money Skills welcome modal. */
    addMoneySkillsWelcomeSeen: async (userId: string): Promise<void> => {
        await db.updateTable('lwp_user').set({ lastMoneySkillsAutoScheduleWelcomeSeen: new Date() }).where('id', '=', userId).execute();
    },
    addUserTooltipHistory: async (userId: string, targetId: string): Promise<void> => {
        const tooltip = await db
            .selectFrom('static_lwp_feature_tooltip')
            .where('targetId', '=', targetId)
            .select(['id'])
            .executeTakeFirstOrThrow();

        await db
            .insertInto('lwp_user_tooltip_history')
            .values({
                userId: userId,
                featureTooltipId: tooltip.id
            })
            .executeTakeFirstOrThrow();
    },

    createStaticActivity: async (fields: Insertable<Schema.StaticLwpActivity>): Promise<Selectable<Schema.StaticLwpActivity>> =>
        db.insertInto('static_lwp_activity').values(fields).returningAll().executeTakeFirstOrThrow(),

    createStaticModal: async (fields: Insertable<Schema.StaticLwpModal>): Promise<Selectable<Schema.StaticLwpModal>> =>
        db.insertInto('static_lwp_modal').values(fields).returningAll().executeTakeFirstOrThrow(),

    createActivityStep: async (fields: Insertable<Schema.StaticLwpActivitySteps>): Promise<Selectable<Schema.StaticLwpActivitySteps>> =>
        db.insertInto('static_lwp_activity_steps').values(fields).returningAll().executeTakeFirstOrThrow(),

    createSiteForm: async (fields: Insertable<Schema.StaticLwpInterstitial>): Promise<Selectable<Schema.StaticLwpInterstitial>> =>
        db.insertInto('static_lwp_interstitial').values(fields).returningAll().executeTakeFirstOrThrow(),

    createStaticTopic: async (fields: Insertable<Schema.StaticLwpTopic>): Promise<Selectable<Schema.StaticLwpTopic>> =>
        db.insertInto('static_lwp_topic').values(fields).returningAll().executeTakeFirstOrThrow(),

    createClass: async (schoolId: string, fields: Insertable<Schema.LwpSchoolClass>): Promise<Selectable<Schema.LwpSchoolClass>> => {
        const schoolClass = await db
            .insertInto('lwp_school_class')
            .values({
                ...fields,
                schoolId
            })
            .returningAll()
            .executeTakeFirstOrThrow();

        if (fields?.mainTeacherId) {
            await db
                .insertInto('lwp_class_teacher')
                .values({
                    lwpUserId: fields.mainTeacherId,
                    lwpSchoolClassId: schoolClass.id
                })
                .executeTakeFirstOrThrow();
        }

        return schoolClass;
    },

    createImportedClass: async (
        schoolId: string,
        fields: Insertable<Schema.ImportedSchoolClass>
    ): Promise<Selectable<Schema.ImportedSchoolClass>> => {
        const schoolClass = await db
            .insertInto('imported_school_class')
            .values({
                ...fields,
                schoolId
            })
            .returningAll()
            .executeTakeFirstOrThrow();

        return schoolClass;
    },

    createImportedStudent: (
        schoolId: string,
        fields: Insertable<Schema.ImportedStudent>
    ): Promise<Selectable<Schema.ImportedStudent>> =>
        db
            .insertInto('imported_student')
            .values({ ...fields, schoolId })
            .returningAll()
            .executeTakeFirstOrThrow(),

    createImportedContact: (
        schoolId: string,
        fields: Insertable<Schema.ImportedContact>
    ): Promise<Selectable<Schema.ImportedContact>> =>
        db
            .insertInto('imported_contact')
            .values({ ...fields, schoolId })
            .returningAll()
            .executeTakeFirstOrThrow(),

    createImportedStudentContact: (fields: Insertable<Schema.ImportedStudentContact>): Promise<Selectable<Schema.ImportedStudentContact>> =>
        db.insertInto('imported_student_contact').values(fields).returningAll().executeTakeFirstOrThrow(),

    addStudentToImportedClass: (importedSchoolClassId: string, importedStudentId: string): Promise<void> =>
        db
            .insertInto('imported_school_class_student')
            .values({ importedSchoolClassId, importedStudentId })
            .execute()
            .then(() => undefined),

    createPageAnnouncement: async (
        fields: Insertable<Schema.StaticLwpPageAnnouncement>,
        schoolTagId?: string
    ): Promise<Selectable<Schema.StaticLwpPageAnnouncement>> => {
        const pageAnnouncement = await db
            .insertInto('static_lwp_page_announcement')
            .values({
                ...fields
            })
            .returningAll()
            .executeTakeFirstOrThrow();

        if (schoolTagId) {
            await db
                .insertInto('lwp_page_announcement_school_tags')
                .values({
                    staticLwpPageAnnouncementId: pageAnnouncement.id,
                    staticLwpSchoolTagId: schoolTagId
                })
                .returningAll()
                .executeTakeFirstOrThrow();
        }

        return pageAnnouncement;
    },

    createClassTopic: async (classId: string, fields: Insertable<Schema.LwpClassTopic>): Promise<Selectable<Schema.LwpClassTopic>> =>
        db
            .insertInto('lwp_class_topic')
            .values({
                ...fields,
                classId
            })
            .returningAll()
            .executeTakeFirstOrThrow(),

    createPupilTopic: async (fields: Insertable<Schema.LwpPupilTopic>): Promise<Selectable<Schema.LwpPupilTopic>> =>
        db
            .insertInto('lwp_pupil_topic')
            .values({
                ...fields
            })
            .returningAll()
            .executeTakeFirstOrThrow(),

    createMagicLink: async (fields: Insertable<Schema.LwpMagicLink>): Promise<Selectable<Schema.LwpMagicLink>> =>
        db
            .insertInto('lwp_magic_link')
            .values({
                ...fields
            })
            .returningAll()
            .executeTakeFirstOrThrow(),

    createPupilActivity: async (fields: Insertable<Schema.LwpPupilActivity>): Promise<Selectable<Schema.LwpPupilActivity>> =>
        db
            .insertInto('lwp_pupil_activity')
            .values({
                ...fields
            })
            .returningAll()
            .executeTakeFirstOrThrow(),

    createPupilFeedback: async (
        pupilId: string,
        fields: Insertable<Schema.LwpPupilFeedback>
    ): Promise<Selectable<Schema.LwpPupilFeedback>> => {
        const feedback = await db
            .insertInto('lwp_pupil_feedback')
            .values({ ...fields })
            .returningAll()
            .executeTakeFirstOrThrow();

        await db
            .insertInto('lwp_pupil_feedback_history')
            .values({
                lwpPupilId: pupilId,
                lwpPupilFeedbackId: feedback.id
            })
            .returningAll()
            .executeTakeFirstOrThrow();

        return feedback;
    },

    createTerm: (fields: Insertable<Schema.LwpSchoolDates>): Promise<Selectable<Schema.LwpSchoolDates>> =>
        db
            .insertInto('lwp_school_dates')
            .values({
                ...fields
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

    createSchool: (fields: Insertable<Schema.LwpSchool>): Promise<Selectable<Schema.LwpSchool>> =>
        db.insertInto('lwp_school').values(fields).returningAll().executeTakeFirstOrThrow(),

    createImportedSchool: (fields: Insertable<Schema.ImportedSchool>): Promise<Selectable<Schema.ImportedSchool>> =>
        db.insertInto('imported_school').values(fields).returningAll().executeTakeFirstOrThrow(),

    createUser: (fields: Insertable<Schema.LwpUser>): Promise<Selectable<Schema.LwpUser>> =>
        db
            .insertInto('lwp_user')
            .values({
                ...fields
            })
            .returningAll()
            .executeTakeFirstOrThrow(),

    removeParentFromPupil: async (pupilId: string, parentId: string): Promise<void> => {
        await db.deleteFrom('lwp_pupil_parent').where('pupilId', '=', pupilId).where('parentId', '=', parentId).executeTakeFirstOrThrow();
    },

    removePupilFromClass: async (pupilId: string, classId: string): Promise<void> => {
        await db
            .deleteFrom('lwp_class_pupil')
            .where('lwpPupilId', '=', pupilId)
            .where('lwpSchoolClassId', '=', classId)
            .executeTakeFirstOrThrow();
    },

    createSchoolTag: async (
        fields: Insertable<Schema.StaticLwpSchoolTag>,
        schoolId?: string
    ): Promise<Selectable<Schema.StaticLwpSchoolTag>> => {
        const schoolTag = await db
            .insertInto('static_lwp_school_tag')
            .values({ ...fields })
            .returningAll()
            .executeTakeFirstOrThrow();

        if (schoolId) {
            await db
                .insertInto('lwp_school_static_tags')
                .values({
                    isProgramTag: false,
                    tagId: schoolTag.id,
                    schoolId: schoolId
                })
                .returningAll()
                .executeTakeFirstOrThrow();
        }

        return schoolTag;
    },

    deleteClass: async (classId: string): Promise<void> => {
        await db.deleteFrom('lwp_school_class').where('id', '=', classId).executeTakeFirstOrThrow();
    },

    deleteUser: async (userId: string): Promise<void> => {
        await db.deleteFrom('lwp_user').where('id', '=', userId).executeTakeFirstOrThrow();
    },

    deletePupil: async (pupilId: string): Promise<void> => {
        await db.deleteFrom('lwp_pupil').where('id', '=', pupilId).executeTakeFirstOrThrow();
    },

    deleteSchool: async (schoolId: string): Promise<void> => {
        await db.deleteFrom('lwp_school').where('id', '=', schoolId).executeTakeFirstOrThrow();
    },

    deleteSchoolProposedLinks: async (schoolId: string): Promise<void> => {
        await db.deleteFrom('imported_school_data_proposed_link').where('platformSchoolId', '=', schoolId).executeTakeFirstOrThrow();
    },

    deleteSchoolProposedChanges: async (schoolId: string): Promise<void> => {
        await db.deleteFrom('imported_school_data_proposed_change').where('platformSchoolId', '=', schoolId).executeTakeFirstOrThrow();
    },

    deletePupilCascade: async (pupilId: string): Promise<void> => {
        await db.transaction().execute(async (trx) => {
            const pupilFeedbackIds = (
                await trx.selectFrom('lwp_pupil_feedback_history').select('lwpPupilFeedbackId').where('lwpPupilId', '=', pupilId).execute()
            ).map((row) => row.lwpPupilFeedbackId);

            if (pupilFeedbackIds.length > 0) {
                await trx.deleteFrom('lwp_feedback_reply').where('feedbackId', 'in', pupilFeedbackIds).executeTakeFirstOrThrow();
                await trx.deleteFrom('lwp_pupil_feedback_media').where('feedbackId', 'in', pupilFeedbackIds).executeTakeFirstOrThrow();
                await trx.deleteFrom('lwp_pupil_feedback_edit_log').where('feedbackId', 'in', pupilFeedbackIds).executeTakeFirstOrThrow();
                await trx
                    .deleteFrom('lwp_pupil_feedback_history')
                    .where('lwpPupilFeedbackId', 'in', pupilFeedbackIds)
                    .executeTakeFirstOrThrow();
                await trx.deleteFrom('lwp_pupil_feedback').where('id', 'in', pupilFeedbackIds).executeTakeFirstOrThrow();
            }

            await trx.deleteFrom('lwp_pupil_activity').where('pupilId', '=', pupilId).executeTakeFirstOrThrow();
            await trx.deleteFrom('lwp_pupil_topic').where('pupilId', '=', pupilId).executeTakeFirstOrThrow();
            await trx.deleteFrom('lwp_pupil_parent').where('pupilId', '=', pupilId).executeTakeFirstOrThrow();
            await trx.deleteFrom('lwp_pupil_trophy').where('pupilId', '=', pupilId).executeTakeFirstOrThrow();
            await trx.deleteFrom('lwp_pupil_mathscot').where('pupilId', '=', pupilId).executeTakeFirstOrThrow();
            await trx.deleteFrom('lwp_pupil').where('id', '=', pupilId).executeTakeFirstOrThrow();
        });
    }
});
