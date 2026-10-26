import {MigrationInterface, QueryRunner} from "typeorm";

export class PupilStatusShouldIncludeLastTermWhenNotInATerm1704103696644 implements MigrationInterface {
    name = 'PupilStatusShouldIncludeLastTermWhenNotInATerm1704103696644'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DELETE FROM "typeorm_metadata" WHERE "type" = $1 AND "name" = $2 AND "schema" = $3`, ["VIEW","lwp_view_pupil_topics_for_notifications","public"]);
        await queryRunner.query(`DROP VIEW "lwp_view_pupil_topics_for_notifications"`);
        await queryRunner.query(`DELETE FROM "typeorm_metadata" WHERE "type" = $1 AND "name" = $2 AND "schema" = $3`, ["VIEW","lwp_view_pupil_status","public"]);
        await queryRunner.query(`DROP VIEW "lwp_view_pupil_status"`);
        await queryRunner.query(`CREATE INDEX "IDX_77215dbca0812b6d47fbd94aa5" ON "lwp_school_dates" ("startDate") `);
        await queryRunner.query(`CREATE VIEW "lwp_view_pupil_status" AS 
    SELECT
        lp.id AS "pupilId",
        CASE WHEN NOT (EXISTS (
                SELECT
                    1
                FROM
                    lwp_pupil_parent lpp
                WHERE
                    lpp."pupilId" = lp.id
                    AND lpp.status::text = 'ACTIVE'::text)) THEN
            'MISSING'::text
        ELSE
            CASE WHEN coalesce(terms.daterange @> lp."logLastActivityCompleted"::date, FALSE)
                OR (EXISTS (
                        SELECT
                            1
                        FROM
                            lwp_pupil_feedback lpf
                            JOIN lwp_pupil_feedback_history lpfh ON lpfh."lwpPupilFeedbackId" = lpf."id"
                        WHERE
                            lpfh."lwpPupilId" = lp.id
                            AND (lpf."userType"::text = ANY (ARRAY['PARENT'::character varying, 'TOPICACCESS'::character varying, 'MAGICPARENT'::character varying]::text[]))
                            AND coalesce(terms.daterange @> coalesce(lpf."bookReadAt", lpf."logCreatedAt")::date, FALSE))) THEN
                'ACTIVE'::text
            ELSE
                'REGISTERED'::text
            END
        END AS "pupilStatus"
    FROM
        lwp_pupil lp
        CROSS JOIN (
            SELECT
                daterange(lsd."startDate"::date, CURRENT_DATE) AS daterange
            FROM
                lwp_school_dates lsd
            WHERE
                lsd."startDate" <= CURRENT_DATE
            ORDER BY
                lsd."startDate" DESC
            LIMIT 1) AS terms
    `);
        await queryRunner.query(`INSERT INTO "typeorm_metadata"("database", "schema", "table", "type", "name", "value") VALUES (DEFAULT, $1, DEFAULT, $2, $3, $4)`, ["public","VIEW","lwp_view_pupil_status","SELECT\n        lp.id AS \"pupilId\",\n        CASE WHEN NOT (EXISTS (\n                SELECT\n                    1\n                FROM\n                    lwp_pupil_parent lpp\n                WHERE\n                    lpp.\"pupilId\" = lp.id\n                    AND lpp.status::text = 'ACTIVE'::text)) THEN\n            'MISSING'::text\n        ELSE\n            CASE WHEN coalesce(terms.daterange @> lp.\"logLastActivityCompleted\"::date, FALSE)\n                OR (EXISTS (\n                        SELECT\n                            1\n                        FROM\n                            lwp_pupil_feedback lpf\n                            JOIN lwp_pupil_feedback_history lpfh ON lpfh.\"lwpPupilFeedbackId\" = lpf.\"id\"\n                        WHERE\n                            lpfh.\"lwpPupilId\" = lp.id\n                            AND (lpf.\"userType\"::text = ANY (ARRAY['PARENT'::character varying, 'TOPICACCESS'::character varying, 'MAGICPARENT'::character varying]::text[]))\n                            AND coalesce(terms.daterange @> coalesce(lpf.\"bookReadAt\", lpf.\"logCreatedAt\")::date, FALSE))) THEN\n                'ACTIVE'::text\n            ELSE\n                'REGISTERED'::text\n            END\n        END AS \"pupilStatus\"\n    FROM\n        lwp_pupil lp\n        CROSS JOIN (\n            SELECT\n                daterange(lsd.\"startDate\"::date, CURRENT_DATE) AS daterange\n            FROM\n                lwp_school_dates lsd\n            WHERE\n                lsd.\"startDate\" <= CURRENT_DATE\n            ORDER BY\n                lsd.\"startDate\" DESC\n            LIMIT 1) AS terms"]);
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
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DELETE FROM "typeorm_metadata" WHERE "type" = $1 AND "name" = $2 AND "schema" = $3`, ["VIEW","lwp_view_pupil_topics_for_notifications","public"]);
        await queryRunner.query(`DROP VIEW "lwp_view_pupil_topics_for_notifications"`);
        await queryRunner.query(`DELETE FROM "typeorm_metadata" WHERE "type" = $1 AND "name" = $2 AND "schema" = $3`, ["VIEW","lwp_view_pupil_status","public"]);
        await queryRunner.query(`DROP VIEW "lwp_view_pupil_status"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_77215dbca0812b6d47fbd94aa5"`);
        await queryRunner.query(`CREATE VIEW "lwp_view_pupil_status" AS SELECT
            lp.id AS "pupilId",
            CASE WHEN NOT (EXISTS (
                    SELECT
                        1
                    FROM
                        lwp_pupil_parent lpp
                    WHERE
                        lpp."pupilId" = lp.id
                        AND lpp.status::text = 'ACTIVE'::text)) THEN
                'MISSING'::text
            ELSE
                CASE WHEN coalesce(terms.daterange @> lp."logLastActivityCompleted"::date, FALSE)
                    OR (EXISTS (
                            SELECT
                                1
                            FROM
                                lwp_pupil_feedback lpf
                            JOIN lwp_pupil_feedback_history lpfh ON lpfh."lwpPupilFeedbackId" = lpf."id"
                            WHERE
                                lpfh."lwpPupilId" = lp.id
                                AND (lpf."userType"::text = ANY (ARRAY['PARENT'::character varying, 'TOPICACCESS'::character varying, 'MAGICPARENT'::character varying]::text[]))
                                AND coalesce(terms.daterange @> coalesce(lpf."bookReadAt", lpf."logCreatedAt")::date, FALSE))) THEN
                    'ACTIVE'::text
                ELSE
                    'REGISTERED'::text
                END
            END AS "pupilStatus"
        FROM
            lwp_pupil lp
            LEFT JOIN (
                SELECT
                    daterange(lsd."startDate"::date, lsd."endDate"::date) AS daterange
                FROM
                    lwp_school_dates lsd) AS terms ON terms.daterange @> CURRENT_DATE`);
        await queryRunner.query(`INSERT INTO "typeorm_metadata"("database", "schema", "table", "type", "name", "value") VALUES (DEFAULT, $1, DEFAULT, $2, $3, $4)`, ["public","VIEW","lwp_view_pupil_status","SELECT\n            lp.id AS \"pupilId\",\n            CASE WHEN NOT (EXISTS (\n                    SELECT\n                        1\n                    FROM\n                        lwp_pupil_parent lpp\n                    WHERE\n                        lpp.\"pupilId\" = lp.id\n                        AND lpp.status::text = 'ACTIVE'::text)) THEN\n                'MISSING'::text\n            ELSE\n                CASE WHEN coalesce(terms.daterange @> lp.\"logLastActivityCompleted\"::date, FALSE)\n                    OR (EXISTS (\n                            SELECT\n                                1\n                            FROM\n                                lwp_pupil_feedback lpf\n                            JOIN lwp_pupil_feedback_history lpfh ON lpfh.\"lwpPupilFeedbackId\" = lpf.\"id\"\n                            WHERE\n                                lpfh.\"lwpPupilId\" = lp.id\n                                AND (lpf.\"userType\"::text = ANY (ARRAY['PARENT'::character varying, 'TOPICACCESS'::character varying, 'MAGICPARENT'::character varying]::text[]))\n                                AND coalesce(terms.daterange @> coalesce(lpf.\"bookReadAt\", lpf.\"logCreatedAt\")::date, FALSE))) THEN\n                    'ACTIVE'::text\n                ELSE\n                    'REGISTERED'::text\n                END\n            END AS \"pupilStatus\"\n        FROM\n            lwp_pupil lp\n            LEFT JOIN (\n                SELECT\n                    daterange(lsd.\"startDate\"::date, lsd.\"endDate\"::date) AS daterange\n                FROM\n                    lwp_school_dates lsd) AS terms ON terms.daterange @> CURRENT_DATE"]);
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
