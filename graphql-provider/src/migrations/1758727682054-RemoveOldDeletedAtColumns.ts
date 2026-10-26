import { MigrationInterface, QueryRunner } from "typeorm";

export class RemoveOldDeletedAtColumns1758727682054 implements MigrationInterface {
    name = 'RemoveOldDeletedAtColumns1758727682054'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Drop dependencies of all fields of lwp_user
        await queryRunner.query(`DELETE FROM "typeorm_metadata" WHERE "type" = $1 AND "name" = $2 AND "schema" = $3`, [
            'VIEW',
            'lwp_view_pupil_topics_for_notifications',
            'public'
        ]);
        await queryRunner.query(`DROP VIEW "lwp_view_pupil_topics_for_notifications"`);
        await queryRunner.query(`
                    DROP CAST (lwp_view_notifiable_parents AS lwp_user);
                    DROP FUNCTION lwp_view_notifiable_parents_to_lwp_user;
                `);
        await queryRunner.query(`DELETE FROM "typeorm_metadata" WHERE "type" = $1 AND "name" = $2 AND "schema" = $3`, [
            'VIEW',
            'lwp_view_notifiable_parents',
            'public'
        ]);
        await queryRunner.query(`DROP VIEW "lwp_view_notifiable_parents"`);

        await queryRunner.query(`DROP INDEX "public"."idx_accountId_where_not_deleted"`);
        await queryRunner.query(`ALTER TABLE "imported_school_data_proposed_link" DROP CONSTRAINT "UQ_imported_platform_entity"`);
        await queryRunner.query(`ALTER TABLE "lwp_school_holiday" DROP COLUMN "deletedAt"`);
        await queryRunner.query(`ALTER TABLE "static_lwp_program" DROP COLUMN "deletedAt"`);
        await queryRunner.query(`ALTER TABLE "lwp_demo_activity_feedback" DROP COLUMN "deletedAt"`);
        await queryRunner.query(`ALTER TABLE "lwp_pupil_tag" DROP COLUMN "deletedAt"`);
        await queryRunner.query(`ALTER TABLE "lwp_pupil_parent" DROP COLUMN "deletedAt"`);
        await queryRunner.query(`ALTER TABLE "lwp_pupil" DROP COLUMN "deletedAt"`);
        await queryRunner.query(`ALTER TABLE "lwp_pupil_activity" DROP COLUMN "deletedAt"`);
        await queryRunner.query(`ALTER TABLE "static_lwp_activity_tag" DROP COLUMN "deletedAt"`);
        await queryRunner.query(`ALTER TABLE "static_lwp_activity" DROP COLUMN "deletedAt"`);
        await queryRunner.query(`ALTER TABLE "static_lwp_activity_steps" DROP COLUMN "deletedAt"`);
        await queryRunner.query(`ALTER TABLE "static_lwp_topic_tag" DROP COLUMN "deletedAt"`);
        await queryRunner.query(`ALTER TABLE "lwp_user_interstitial" DROP COLUMN "deletedAt"`);
        await queryRunner.query(`ALTER TABLE "static_lwp_interstitial" DROP COLUMN "deletedAt"`);
        await queryRunner.query(`ALTER TABLE "static_lwp_subject" DROP COLUMN "deletedAt"`);
        await queryRunner.query(`ALTER TABLE "static_lwp_topic_domain" DROP COLUMN "deletedAt"`);
        await queryRunner.query(`ALTER TABLE "static_lwp_topic" DROP COLUMN "deletedAt"`);
        await queryRunner.query(`ALTER TABLE "static_lwp_school_tag" DROP COLUMN "deletedAt"`);
        await queryRunner.query(`ALTER TABLE "lwp_school" DROP COLUMN "deletedAt"`);
        await queryRunner.query(`ALTER TABLE "lwp_school" DROP COLUMN "wondeUpdateStatusAt"`);
        await queryRunner.query(`ALTER TABLE "lwp_feedback_reply" DROP COLUMN "deletedAt"`);
        await queryRunner.query(`ALTER TABLE "lwp_pupil_feedback_media" DROP COLUMN "deletedAt"`);
        await queryRunner.query(`ALTER TABLE "lwp_pupil_feedback" DROP COLUMN "deletedAt"`);
        await queryRunner.query(`ALTER TABLE "lwp_pupil_topic" DROP COLUMN "deletedAt"`);
        await queryRunner.query(`ALTER TABLE "lwp_class_topic" DROP COLUMN "deletedAt"`);
        await queryRunner.query(`ALTER TABLE "lwp_school_class" DROP COLUMN "deletedAt"`);
        await queryRunner.query(`ALTER TABLE "lwp_user_associated_login" DROP COLUMN "deletedAt"`);
        await queryRunner.query(`ALTER TABLE "lwp_user" DROP COLUMN "deletedAt"`);
        await queryRunner.query(`ALTER TABLE "static_lwp_email_template" DROP COLUMN "deletedAt"`);

        // Recreate the dependencies
        await queryRunner.query(`CREATE VIEW "lwp_view_notifiable_parents" AS
                    select * from lwp_user where "type" = 'PARENT' and "userStatus" = any('{INVITED,ACTIVE,ACCOUNTLESS}')
                `);
        await queryRunner.query(
            `INSERT INTO "typeorm_metadata"("database", "schema", "table", "type", "name", "value") VALUES (DEFAULT, $1, DEFAULT, $2, $3, $4)`,
            [
                'public',
                'VIEW',
                'lwp_view_notifiable_parents',
                'select * from lwp_user where "type" = \'PARENT\' and "userStatus" = any(\'{INVITED,ACTIVE,ACCOUNTLESS}\')'
            ]
        );
        await queryRunner.query(`
                    CREATE FUNCTION lwp_view_notifiable_parents_to_lwp_user (VIEW lwp_view_notifiable_parents)
                        RETURNS lwp_user AS $$
                        SELECT
                            (ROW (view.*)::lwp_user) $$
                            LANGUAGE SQL
                            IMMUTABLE;

                    CREATE CAST (lwp_view_notifiable_parents AS lwp_user)
                        with function lwp_view_notifiable_parents_to_lwp_user as implicit;
                `);

        await queryRunner.query(`CREATE VIEW "lwp_view_pupil_topics_for_notifications" AS
	select
		(lu_parent.*)::lwp_user as "lwpUserParent",
		lsc."periodIndex" as "periodIndex",
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
		(slt."isReading" = true) as "isReadingTopic",
		case lu_parent."notificationPreference" when 'EMAILREMINDER' then 'email' when 'SMSREMINDER' then 'phone' else null end as "notifPreference",
		lpt."silverStars",
		lpt."earnedGoldStar",
		(
			select sp."index"
			from static_lwp_period sp
			where sp."isCurrentPeriod" = true
			limit 1
		) as "globalCurrentAcademicYear"
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
		and lpt."releaseDate" <= current_date -- don't ever notify for things where the release date is in future, even if they are mistakenly released early
		and lvcns."canNotify" = true
    `);
        await queryRunner.query(`INSERT INTO "typeorm_metadata"("database", "schema", "table", "type", "name", "value") VALUES (DEFAULT, $1, DEFAULT, $2, $3, $4)`, ["public", "VIEW", "lwp_view_pupil_topics_for_notifications", "select\n\t\t(lu_parent.*)::lwp_user as \"lwpUserParent\",\n\t\tlsc.\"periodIndex\" as \"periodIndex\",\n\t\tls.id as \"schoolId\",\n\t\tls.\"schoolName\" as \"schoolName\",\n\t\tlpt.id as \"pupilTopicId\",\n\t\t(slt.*)::static_lwp_topic as \"staticLwpTopic\",\n\t\t(lp.*)::lwp_pupil as \"lwpPupil\",\n\t\tlvps.\"pupilStatus\" as \"lwpPupilStatus\",\n\t\tlsc.name as \"className\",\n\t\tlsc.id as \"classId\",\n\t\tlct.id as \"classTopicId\",\n\t\tlu_teacher.\"nameForChildren\" as \"teacherName\",\n\t\tlct.\"releaseDate\" as \"releaseDate\",\n\t\tlpt.\"parentsNotified\" as \"parentsNotified\",\n\t\tlpt.\"reminderSent\" as \"reminderSent\",\n\t\tlpt.\"reminderSentFor2Days\" as \"reminderSentFor2Days\",\n\t\tlct.\"dueDate\" as \"dueDate\",\n\t\tlpt.\"readingTarget\" as \"readingTarget\",\n\t\tlpp.status as \"pupilParentStatus\",\n\t\tlpp.\"lastInvitationEmailSent\" as \"pupilParentLastInvitation\",\n\t\t(slt.\"isReading\" = true) as \"isReadingTopic\",\n\t\tcase lu_parent.\"notificationPreference\" when 'EMAILREMINDER' then 'email' when 'SMSREMINDER' then 'phone' else null end as \"notifPreference\",\n\t\tlpt.\"silverStars\",\n\t\tlpt.\"earnedGoldStar\",\n\t\t(\n\t\t\tselect sp.\"index\"\n\t\t\tfrom static_lwp_period sp\n\t\t\twhere sp.\"isCurrentPeriod\" = true\n\t\t\tlimit 1\n\t\t) as \"globalCurrentAcademicYear\"\n\tfrom\n\t\tlwp_pupil_topic lpt\n\t\tjoin lwp_class_topic lct on lpt.\"classTopicId\" = lct.id\n\t\tjoin static_lwp_topic slt on lpt.\"topicId\" = slt.id\n\t\tjoin lwp_school_class lsc on lpt.\"classId\" = lsc.id\n\t\tjoin lwp_pupil_parent lpp on lpt.\"pupilId\" = lpp.\"pupilId\"\n\t\tjoin lwp_pupil lp on lpt.\"pupilId\" = lp.id\n\t\tjoin lwp_view_pupil_status lvps on lvps.\"pupilId\" = lp.id\n\t\tjoin lwp_school ls on lp.\"schoolId\" = ls.id\n\t\tjoin lwp_view_notifiable_parents lu_parent on lpp.\"parentId\" = lu_parent.id\n\t\tjoin lwp_user lu_teacher on lsc.\"mainTeacherId\" = lu_teacher.id\n\t\tjoin lwp_view_can_notify_school lvcns on ls.id = lvcns.\"schoolId\"\n\twhere\n\t\tls.inactive = false\n\t\tand lpt.\"releaseDate\" <= current_date -- don't ever notify for things where the release date is in future, even if they are mistakenly released early\n\t\tand lvcns.\"canNotify\" = true"]);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Drop dependencies of all fields of lwp_user
        await queryRunner.query(`DELETE FROM "typeorm_metadata" WHERE "type" = $1 AND "name" = $2 AND "schema" = $3`, [
            'VIEW',
            'lwp_view_pupil_topics_for_notifications',
            'public'
        ]);
        await queryRunner.query(`DROP VIEW "lwp_view_pupil_topics_for_notifications"`);
        await queryRunner.query(`
                    DROP CAST (lwp_view_notifiable_parents AS lwp_user);
                    DROP FUNCTION lwp_view_notifiable_parents_to_lwp_user;
                `);
        await queryRunner.query(`DELETE FROM "typeorm_metadata" WHERE "type" = $1 AND "name" = $2 AND "schema" = $3`, [
            'VIEW',
            'lwp_view_notifiable_parents',
            'public'
        ]);
        await queryRunner.query(`DROP VIEW "lwp_view_notifiable_parents"`);


        await queryRunner.query(`ALTER TABLE "static_lwp_email_template" ADD "deletedAt" TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE "lwp_user" ADD "deletedAt" TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE "lwp_user_associated_login" ADD "deletedAt" TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE "lwp_school_class" ADD "deletedAt" TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE "lwp_class_topic" ADD "deletedAt" TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE "lwp_pupil_topic" ADD "deletedAt" TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE "lwp_pupil_feedback" ADD "deletedAt" TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE "lwp_pupil_feedback_media" ADD "deletedAt" TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE "lwp_feedback_reply" ADD "deletedAt" TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE "lwp_school" ADD "wondeUpdateStatusAt" TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE "lwp_school" ADD "deletedAt" TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE "static_lwp_school_tag" ADD "deletedAt" TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE "static_lwp_topic" ADD "deletedAt" TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE "static_lwp_topic_domain" ADD "deletedAt" TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE "static_lwp_subject" ADD "deletedAt" TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE "static_lwp_interstitial" ADD "deletedAt" TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE "lwp_user_interstitial" ADD "deletedAt" TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE "static_lwp_topic_tag" ADD "deletedAt" TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE "static_lwp_activity_steps" ADD "deletedAt" TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE "static_lwp_activity" ADD "deletedAt" TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE "static_lwp_activity_tag" ADD "deletedAt" TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE "lwp_pupil_activity" ADD "deletedAt" TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE "lwp_pupil" ADD "deletedAt" TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE "lwp_pupil_parent" ADD "deletedAt" TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE "lwp_pupil_tag" ADD "deletedAt" TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE "lwp_demo_activity_feedback" ADD "deletedAt" TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE "static_lwp_program" ADD "deletedAt" TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE "lwp_school_holiday" ADD "deletedAt" TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE "imported_school_data_proposed_link" ADD CONSTRAINT "UQ_imported_platform_entity" UNIQUE ("importedEntityId", "platformEntityId")`);
        await queryRunner.query(`CREATE UNIQUE INDEX "idx_accountId_where_not_deleted" ON "lwp_user_associated_login" ("accountId") WHERE ("deletedAt" IS NULL)`);

        // Recreate the dependencies with no changes to how they initially were
        await queryRunner.query(`CREATE VIEW "lwp_view_notifiable_parents" AS
                    select * from lwp_user where "type" = 'PARENT' and "userStatus" = any('{INVITED,ACTIVE,ACCOUNTLESS}')
                `);
        await queryRunner.query(
            `INSERT INTO "typeorm_metadata"("database", "schema", "table", "type", "name", "value") VALUES (DEFAULT, $1, DEFAULT, $2, $3, $4)`,
            [
                'public',
                'VIEW',
                'lwp_view_notifiable_parents',
                'select * from lwp_user where "type" = \'PARENT\' and "userStatus" = any(\'{INVITED,ACTIVE,ACCOUNTLESS}\')'
            ]
        );
        await queryRunner.query(`
                    CREATE FUNCTION lwp_view_notifiable_parents_to_lwp_user (VIEW lwp_view_notifiable_parents)
                        RETURNS lwp_user AS $$
                        SELECT
                            (ROW (view.*)::lwp_user) $$
                            LANGUAGE SQL
                            IMMUTABLE;

                    CREATE CAST (lwp_view_notifiable_parents AS lwp_user)
                        with function lwp_view_notifiable_parents_to_lwp_user as implicit;
                `);
        await queryRunner.query(`CREATE VIEW "lwp_view_pupil_topics_for_notifications" AS
	select
		(lu_parent.*)::lwp_user as "lwpUserParent",
		lsc."periodIndex" as "periodIndex",
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
		(slt."isReading" = true) as "isReadingTopic",
		case lu_parent."notificationPreference" when 'EMAILREMINDER' then 'email' when 'SMSREMINDER' then 'phone' else null end as "notifPreference",
		lpt."silverStars",
		lpt."earnedGoldStar",
		(
			select sp."index"
			from static_lwp_period sp
			where sp."isCurrentPeriod" = true
			limit 1
		) as "globalCurrentAcademicYear"
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
		and lpt."releaseDate" <= current_date -- don't ever notify for things where the release date is in future, even if they are mistakenly released early
		and lvcns."canNotify" = true
    `);
        await queryRunner.query(`INSERT INTO "typeorm_metadata"("database", "schema", "table", "type", "name", "value") VALUES (DEFAULT, $1, DEFAULT, $2, $3, $4)`, ["public", "VIEW", "lwp_view_pupil_topics_for_notifications", "select\n\t\t(lu_parent.*)::lwp_user as \"lwpUserParent\",\n\t\tlsc.\"periodIndex\" as \"periodIndex\",\n\t\tls.id as \"schoolId\",\n\t\tls.\"schoolName\" as \"schoolName\",\n\t\tlpt.id as \"pupilTopicId\",\n\t\t(slt.*)::static_lwp_topic as \"staticLwpTopic\",\n\t\t(lp.*)::lwp_pupil as \"lwpPupil\",\n\t\tlvps.\"pupilStatus\" as \"lwpPupilStatus\",\n\t\tlsc.name as \"className\",\n\t\tlsc.id as \"classId\",\n\t\tlct.id as \"classTopicId\",\n\t\tlu_teacher.\"nameForChildren\" as \"teacherName\",\n\t\tlct.\"releaseDate\" as \"releaseDate\",\n\t\tlpt.\"parentsNotified\" as \"parentsNotified\",\n\t\tlpt.\"reminderSent\" as \"reminderSent\",\n\t\tlpt.\"reminderSentFor2Days\" as \"reminderSentFor2Days\",\n\t\tlct.\"dueDate\" as \"dueDate\",\n\t\tlpt.\"readingTarget\" as \"readingTarget\",\n\t\tlpp.status as \"pupilParentStatus\",\n\t\tlpp.\"lastInvitationEmailSent\" as \"pupilParentLastInvitation\",\n\t\t(slt.\"isReading\" = true) as \"isReadingTopic\",\n\t\tcase lu_parent.\"notificationPreference\" when 'EMAILREMINDER' then 'email' when 'SMSREMINDER' then 'phone' else null end as \"notifPreference\",\n\t\tlpt.\"silverStars\",\n\t\tlpt.\"earnedGoldStar\",\n\t\t(\n\t\t\tselect sp.\"index\"\n\t\t\tfrom static_lwp_period sp\n\t\t\twhere sp.\"isCurrentPeriod\" = true\n\t\t\tlimit 1\n\t\t) as \"globalCurrentAcademicYear\"\n\tfrom\n\t\tlwp_pupil_topic lpt\n\t\tjoin lwp_class_topic lct on lpt.\"classTopicId\" = lct.id\n\t\tjoin static_lwp_topic slt on lpt.\"topicId\" = slt.id\n\t\tjoin lwp_school_class lsc on lpt.\"classId\" = lsc.id\n\t\tjoin lwp_pupil_parent lpp on lpt.\"pupilId\" = lpp.\"pupilId\"\n\t\tjoin lwp_pupil lp on lpt.\"pupilId\" = lp.id\n\t\tjoin lwp_view_pupil_status lvps on lvps.\"pupilId\" = lp.id\n\t\tjoin lwp_school ls on lp.\"schoolId\" = ls.id\n\t\tjoin lwp_view_notifiable_parents lu_parent on lpp.\"parentId\" = lu_parent.id\n\t\tjoin lwp_user lu_teacher on lsc.\"mainTeacherId\" = lu_teacher.id\n\t\tjoin lwp_view_can_notify_school lvcns on ls.id = lvcns.\"schoolId\"\n\twhere\n\t\tls.inactive = false\n\t\tand lpt.\"releaseDate\" <= current_date -- don't ever notify for things where the release date is in future, even if they are mistakenly released early\n\t\tand lvcns.\"canNotify\" = true"]);
    }

}
