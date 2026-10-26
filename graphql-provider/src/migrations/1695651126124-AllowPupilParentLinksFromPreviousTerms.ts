import {MigrationInterface, QueryRunner} from "typeorm";

export class AllowPupilParentLinksFromPreviousTerms1695651126124 implements MigrationInterface {
    name = 'AllowPupilParentLinksFromPreviousTerms1695651126124'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DELETE FROM "typeorm_metadata" WHERE "type" = $1 AND "name" = $2 AND "schema" = $3`, ["VIEW","lwp_view_pupil_topics_for_notifications","public"]);
        await queryRunner.query(`DROP VIEW "lwp_view_pupil_topics_for_notifications"`);
        await queryRunner.query(`DELETE FROM "typeorm_metadata" WHERE "type" = $1 AND "name" = $2 AND "schema" = $3`, ["VIEW","lwp_view_pupil_status","public"]);
        await queryRunner.query(`DROP VIEW "lwp_view_pupil_status"`);
        await queryRunner.query(`CREATE VIEW "lwp_view_pupil_status" AS 
	WITH terms AS (
        SELECT
            daterange(lsd."startDate"::date, lsd."endDate"::date) AS daterange
        FROM
            lwp_school_dates lsd
    )
    SELECT
        lp.id AS "pupilId",
        CASE WHEN lpp.id IS NULL THEN
            'MISSING'
        ELSE
            CASE WHEN lpa.id IS NOT NULL
                OR lpt.id IS NOT NULL THEN
                'ACTIVE'
            ELSE
                'REGISTERED'
            END
        END AS "pupilStatus"
    FROM
        lwp_pupil lp
        LEFT JOIN terms ON terms.daterange @> CURRENT_DATE
        LEFT JOIN lwp_pupil_parent lpp ON lpp."pupilId" = lp.id
            AND lpp.status = 'ACTIVE'
        LEFT JOIN lwp_pupil_activity lpa ON lpa."pupilId" = lp.id
            AND lpa."earnedStar" = TRUE
            AND COALESCE(terms.daterange @> lpa."logUpdatedAt"::date, false)
        LEFT JOIN lwp_pupil_topic lpt ON lpt."pupilId" = lp.id
            AND (lpt."silverStars" > 0
                OR lpt."earnedGoldStar"
                OR lpt."watchedVideo")
            AND COALESCE(terms.daterange @> lpt."logUpdatedAt"::date, false);
    `);
        await queryRunner.query(`INSERT INTO "typeorm_metadata"("database", "schema", "table", "type", "name", "value") VALUES (DEFAULT, $1, DEFAULT, $2, $3, $4)`, ["public","VIEW","lwp_view_pupil_status","WITH terms AS (\n        SELECT\n            daterange(lsd.\"startDate\"::date, lsd.\"endDate\"::date) AS daterange\n        FROM\n            lwp_school_dates lsd\n    )\n    SELECT\n        lp.id AS \"pupilId\",\n        CASE WHEN lpp.id IS NULL THEN\n            'MISSING'\n        ELSE\n            CASE WHEN lpa.id IS NOT NULL\n                OR lpt.id IS NOT NULL THEN\n                'ACTIVE'\n            ELSE\n                'REGISTERED'\n            END\n        END AS \"pupilStatus\"\n    FROM\n        lwp_pupil lp\n        LEFT JOIN terms ON terms.daterange @> CURRENT_DATE\n        LEFT JOIN lwp_pupil_parent lpp ON lpp.\"pupilId\" = lp.id\n            AND lpp.status = 'ACTIVE'\n        LEFT JOIN lwp_pupil_activity lpa ON lpa.\"pupilId\" = lp.id\n            AND lpa.\"earnedStar\" = TRUE\n            AND COALESCE(terms.daterange @> lpa.\"logUpdatedAt\"::date, false)\n        LEFT JOIN lwp_pupil_topic lpt ON lpt.\"pupilId\" = lp.id\n            AND (lpt.\"silverStars\" > 0\n                OR lpt.\"earnedGoldStar\"\n                OR lpt.\"watchedVideo\")\n            AND COALESCE(terms.daterange @> lpt.\"logUpdatedAt\"::date, false);"]);
        await queryRunner.query(`CREATE VIEW "lwp_view_pupil_topics_for_notifications" AS 
	select
		(lu_parent.*)::lwp_user as "lwpUserParent",
		ls.id as "schoolId",
		ls."schoolName" as "schoolName",
		lpt.id as "pupilTopicId",
		(slt.*)::static_lwp_topic as "staticLwpTopic",
		(lp.*)::lwp_pupil as "lwpPupil",
		lvps."pupilStatus" as "lwpPupilStatus",
		lsc.name as "className",
		lsc.id as "classId",
		lct.id as "classTopicId",
		lu_teacher."nameForChildren" as "teacherName",
		lct."releaseDate" as "releaseDate",
		lpt."parentsNotified" as "parentsNotified",
		lpt."reminderSent" as "reminderSent",
		lpt."reminderSentFor2Days" as "reminderSentFor2Days",
		lct."dueDate" as "dueDate",
		lpt."readingTarget" as "readingTarget",
		lpp.status as "pupilParentStatus",
		lpp."lastInvitationEmailSent" as "pupilParentLastInvitation",
		(slt.subject = 'READING') as "isReadingTopic",
		case lu_parent."notificationPreference" when 'EMAILREMINDER' then 'email' when 'SMSREMINDER' then 'phone' else null end as "notifPreference",
		lpt."silverStars",
		lpt."earnedGoldStar"
	from
		lwp_pupil_topic lpt
		join lwp_class_topic lct on lpt."classTopicId" = lct.id
		join static_lwp_topic slt on lpt."topicId" = slt.id
		join lwp_school_class lsc on lpt."classId" = lsc.id
		join lwp_pupil_parent lpp on lpt."pupilId" = lpp."pupilId"
		join lwp_pupil lp on lpt."pupilId" = lp.id
		join lwp_view_pupil_status lvps on lvps."pupilId" = lp.id
		join lwp_school ls on lp."schoolId" = ls.id
		join lwp_view_notifiable_parents lu_parent on lpp."parentId" = lu_parent.id
		join lwp_user lu_teacher on lsc."mainTeacherId" = lu_teacher.id
		join lwp_view_can_notify_school lvcns on ls.id = lvcns."schoolId"
	where
		ls.inactive = false
		and lu_parent."deletedAt" is null
		and lp."deletedAt" is null
		and ls."deletedAt" is null
		and lvcns."canNotify" = true
    `);
        await queryRunner.query(`INSERT INTO "typeorm_metadata"("database", "schema", "table", "type", "name", "value") VALUES (DEFAULT, $1, DEFAULT, $2, $3, $4)`, ["public","VIEW","lwp_view_pupil_topics_for_notifications","select\n\t\t(lu_parent.*)::lwp_user as \"lwpUserParent\",\n\t\tls.id as \"schoolId\",\n\t\tls.\"schoolName\" as \"schoolName\",\n\t\tlpt.id as \"pupilTopicId\",\n\t\t(slt.*)::static_lwp_topic as \"staticLwpTopic\",\n\t\t(lp.*)::lwp_pupil as \"lwpPupil\",\n\t\tlvps.\"pupilStatus\" as \"lwpPupilStatus\",\n\t\tlsc.name as \"className\",\n\t\tlsc.id as \"classId\",\n\t\tlct.id as \"classTopicId\",\n\t\tlu_teacher.\"nameForChildren\" as \"teacherName\",\n\t\tlct.\"releaseDate\" as \"releaseDate\",\n\t\tlpt.\"parentsNotified\" as \"parentsNotified\",\n\t\tlpt.\"reminderSent\" as \"reminderSent\",\n\t\tlpt.\"reminderSentFor2Days\" as \"reminderSentFor2Days\",\n\t\tlct.\"dueDate\" as \"dueDate\",\n\t\tlpt.\"readingTarget\" as \"readingTarget\",\n\t\tlpp.status as \"pupilParentStatus\",\n\t\tlpp.\"lastInvitationEmailSent\" as \"pupilParentLastInvitation\",\n\t\t(slt.subject = 'READING') as \"isReadingTopic\",\n\t\tcase lu_parent.\"notificationPreference\" when 'EMAILREMINDER' then 'email' when 'SMSREMINDER' then 'phone' else null end as \"notifPreference\",\n\t\tlpt.\"silverStars\",\n\t\tlpt.\"earnedGoldStar\"\n\tfrom\n\t\tlwp_pupil_topic lpt\n\t\tjoin lwp_class_topic lct on lpt.\"classTopicId\" = lct.id\n\t\tjoin static_lwp_topic slt on lpt.\"topicId\" = slt.id\n\t\tjoin lwp_school_class lsc on lpt.\"classId\" = lsc.id\n\t\tjoin lwp_pupil_parent lpp on lpt.\"pupilId\" = lpp.\"pupilId\"\n\t\tjoin lwp_pupil lp on lpt.\"pupilId\" = lp.id\n\t\tjoin lwp_view_pupil_status lvps on lvps.\"pupilId\" = lp.id\n\t\tjoin lwp_school ls on lp.\"schoolId\" = ls.id\n\t\tjoin lwp_view_notifiable_parents lu_parent on lpp.\"parentId\" = lu_parent.id\n\t\tjoin lwp_user lu_teacher on lsc.\"mainTeacherId\" = lu_teacher.id\n\t\tjoin lwp_view_can_notify_school lvcns on ls.id = lvcns.\"schoolId\"\n\twhere\n\t\tls.inactive = false\n\t\tand lu_parent.\"deletedAt\" is null\n\t\tand lp.\"deletedAt\" is null\n\t\tand ls.\"deletedAt\" is null\n\t\tand lvcns.\"canNotify\" = true"]);
        await queryRunner.query(`
        grant select, insert, update, delete on "lwp_view_pupil_status" to "lwpUser";
        grant select, insert, update, delete on "lwp_view_pupil_status" to "lwpAdminUser";
        grant select, insert, update, delete on "lwp_view_pupil_topics_for_notifications" to "lwpUser";
        grant select, insert, update, delete on "lwp_view_pupil_topics_for_notifications" to "lwpAdminUser";
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DELETE FROM "typeorm_metadata" WHERE "type" = $1 AND "name" = $2 AND "schema" = $3`, ["VIEW","lwp_view_pupil_topics_for_notifications","public"]);
        await queryRunner.query(`DROP VIEW "lwp_view_pupil_topics_for_notifications"`);
        await queryRunner.query(`DELETE FROM "typeorm_metadata" WHERE "type" = $1 AND "name" = $2 AND "schema" = $3`, ["VIEW","lwp_view_pupil_status","public"]);
        await queryRunner.query(`DROP VIEW "lwp_view_pupil_status"`);
        await queryRunner.query(`CREATE VIEW "lwp_view_pupil_status" AS WITH terms AS (
        SELECT
            daterange(lsd."startDate"::date, lsd."endDate"::date) AS daterange
        FROM
            lwp_school_dates lsd
    )
    SELECT
        lp.id AS "pupilId",
        CASE WHEN lpp.id IS NULL THEN
            'MISSING'
        ELSE
            CASE WHEN lpa.id IS NOT NULL
                OR lpt.id IS NOT NULL THEN
                'ACTIVE'
            ELSE
                'REGISTERED'
            END
        END AS "pupilStatus"
    FROM
        lwp_pupil lp
        JOIN terms ON terms.daterange @> CURRENT_DATE
        LEFT JOIN lwp_pupil_parent lpp ON lpp."pupilId" = lp.id
            AND lpp.status = 'ACTIVE'
            AND terms.daterange @> lpp."logUpdatedAt"::date
        LEFT JOIN lwp_pupil_activity lpa ON lpa."pupilId" = lp.id
            AND lpa."earnedStar" = TRUE
            AND terms.daterange @> lpa."logUpdatedAt"::date
        LEFT JOIN lwp_pupil_topic lpt ON lpt."pupilId" = lp.id
            AND (lpt."silverStars" > 0
                OR lpt."earnedGoldStar"
                OR lpt."watchedVideo")
            AND terms.daterange @> lpt."logUpdatedAt"::date;`);
        await queryRunner.query(`INSERT INTO "typeorm_metadata"("database", "schema", "table", "type", "name", "value") VALUES (DEFAULT, $1, DEFAULT, $2, $3, $4)`, ["public","VIEW","lwp_view_pupil_status","WITH terms AS (\n        SELECT\n            daterange(lsd.\"startDate\"::date, lsd.\"endDate\"::date) AS daterange\n        FROM\n            lwp_school_dates lsd\n    )\n    SELECT\n        lp.id AS \"pupilId\",\n        CASE WHEN lpp.id IS NULL THEN\n            'MISSING'\n        ELSE\n            CASE WHEN lpa.id IS NOT NULL\n                OR lpt.id IS NOT NULL THEN\n                'ACTIVE'\n            ELSE\n                'REGISTERED'\n            END\n        END AS \"pupilStatus\"\n    FROM\n        lwp_pupil lp\n        JOIN terms ON terms.daterange @> CURRENT_DATE\n        LEFT JOIN lwp_pupil_parent lpp ON lpp.\"pupilId\" = lp.id\n            AND lpp.status = 'ACTIVE'\n            AND terms.daterange @> lpp.\"logUpdatedAt\"::date\n        LEFT JOIN lwp_pupil_activity lpa ON lpa.\"pupilId\" = lp.id\n            AND lpa.\"earnedStar\" = TRUE\n            AND terms.daterange @> lpa.\"logUpdatedAt\"::date\n        LEFT JOIN lwp_pupil_topic lpt ON lpt.\"pupilId\" = lp.id\n            AND (lpt.\"silverStars\" > 0\n                OR lpt.\"earnedGoldStar\"\n                OR lpt.\"watchedVideo\")\n            AND terms.daterange @> lpt.\"logUpdatedAt\"::date;"]);
        await queryRunner.query(`CREATE VIEW "lwp_view_pupil_topics_for_notifications" AS select
		(lu_parent.*)::lwp_user as "lwpUserParent",
		ls.id as "schoolId",
		ls."schoolName" as "schoolName",
		lpt.id as "pupilTopicId",
		(slt.*)::static_lwp_topic as "staticLwpTopic",
		(lp.*)::lwp_pupil as "lwpPupil",
		lvps."pupilStatus" as "lwpPupilStatus",
		lsc.name as "className",
		lsc.id as "classId",
		lct.id as "classTopicId",
		lu_teacher."nameForChildren" as "teacherName",
		lct."releaseDate" as "releaseDate",
		lpt."parentsNotified" as "parentsNotified",
		lpt."reminderSent" as "reminderSent",
		lpt."reminderSentFor2Days" as "reminderSentFor2Days",
		lct."dueDate" as "dueDate",
		lpt."readingTarget" as "readingTarget",
		lpp.status as "pupilParentStatus",
		lpp."lastInvitationEmailSent" as "pupilParentLastInvitation",
		(slt.subject = 'READING') as "isReadingTopic",
		case lu_parent."notificationPreference" when 'EMAILREMINDER' then 'email' when 'SMSREMINDER' then 'phone' else null end as "notifPreference",
		lpt."silverStars",
		lpt."earnedGoldStar"
	from
		lwp_pupil_topic lpt
		join lwp_class_topic lct on lpt."classTopicId" = lct.id
		join static_lwp_topic slt on lpt."topicId" = slt.id
		join lwp_school_class lsc on lpt."classId" = lsc.id
		join lwp_pupil_parent lpp on lpt."pupilId" = lpp."pupilId"
		join lwp_pupil lp on lpt."pupilId" = lp.id
		join lwp_view_pupil_status lvps on lvps."pupilId" = lp.id
		join lwp_school ls on lp."schoolId" = ls.id
		join lwp_view_notifiable_parents lu_parent on lpp."parentId" = lu_parent.id
		join lwp_user lu_teacher on lsc."mainTeacherId" = lu_teacher.id
		join lwp_view_can_notify_school lvcns on ls.id = lvcns."schoolId"
	where
		ls.inactive = false
		and lu_parent."deletedAt" is null
		and lp."deletedAt" is null
		and ls."deletedAt" is null
		and lvcns."canNotify" = true`);
        await queryRunner.query(`INSERT INTO "typeorm_metadata"("database", "schema", "table", "type", "name", "value") VALUES (DEFAULT, $1, DEFAULT, $2, $3, $4)`, ["public","VIEW","lwp_view_pupil_topics_for_notifications","select\n\t\t(lu_parent.*)::lwp_user as \"lwpUserParent\",\n\t\tls.id as \"schoolId\",\n\t\tls.\"schoolName\" as \"schoolName\",\n\t\tlpt.id as \"pupilTopicId\",\n\t\t(slt.*)::static_lwp_topic as \"staticLwpTopic\",\n\t\t(lp.*)::lwp_pupil as \"lwpPupil\",\n\t\tlvps.\"pupilStatus\" as \"lwpPupilStatus\",\n\t\tlsc.name as \"className\",\n\t\tlsc.id as \"classId\",\n\t\tlct.id as \"classTopicId\",\n\t\tlu_teacher.\"nameForChildren\" as \"teacherName\",\n\t\tlct.\"releaseDate\" as \"releaseDate\",\n\t\tlpt.\"parentsNotified\" as \"parentsNotified\",\n\t\tlpt.\"reminderSent\" as \"reminderSent\",\n\t\tlpt.\"reminderSentFor2Days\" as \"reminderSentFor2Days\",\n\t\tlct.\"dueDate\" as \"dueDate\",\n\t\tlpt.\"readingTarget\" as \"readingTarget\",\n\t\tlpp.status as \"pupilParentStatus\",\n\t\tlpp.\"lastInvitationEmailSent\" as \"pupilParentLastInvitation\",\n\t\t(slt.subject = 'READING') as \"isReadingTopic\",\n\t\tcase lu_parent.\"notificationPreference\" when 'EMAILREMINDER' then 'email' when 'SMSREMINDER' then 'phone' else null end as \"notifPreference\",\n\t\tlpt.\"silverStars\",\n\t\tlpt.\"earnedGoldStar\"\n\tfrom\n\t\tlwp_pupil_topic lpt\n\t\tjoin lwp_class_topic lct on lpt.\"classTopicId\" = lct.id\n\t\tjoin static_lwp_topic slt on lpt.\"topicId\" = slt.id\n\t\tjoin lwp_school_class lsc on lpt.\"classId\" = lsc.id\n\t\tjoin lwp_pupil_parent lpp on lpt.\"pupilId\" = lpp.\"pupilId\"\n\t\tjoin lwp_pupil lp on lpt.\"pupilId\" = lp.id\n\t\tjoin lwp_view_pupil_status lvps on lvps.\"pupilId\" = lp.id\n\t\tjoin lwp_school ls on lp.\"schoolId\" = ls.id\n\t\tjoin lwp_view_notifiable_parents lu_parent on lpp.\"parentId\" = lu_parent.id\n\t\tjoin lwp_user lu_teacher on lsc.\"mainTeacherId\" = lu_teacher.id\n\t\tjoin lwp_view_can_notify_school lvcns on ls.id = lvcns.\"schoolId\"\n\twhere\n\t\tls.inactive = false\n\t\tand lu_parent.\"deletedAt\" is null\n\t\tand lp.\"deletedAt\" is null\n\t\tand ls.\"deletedAt\" is null\n\t\tand lvcns.\"canNotify\" = true"]);
    }

}
