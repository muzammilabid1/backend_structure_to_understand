import { MigrationInterface, QueryRunner } from 'typeorm';

export class RemoveDeletedAtColumnsPart21739965431244 implements MigrationInterface {
    name = 'RemoveDeletedAtColumnsPart21739965431244';

    DELETABLE_TABLES = [
        'static_lwp_interstitial',
        'lwp_user_interstitial',
        'lwp_pupil_parent',
        'lwp_school_holiday',
        'static_lwp_program',
        'lwp_demo_activity_feedback',
        'lwp_pupil_topic',
        'lwp_pupil_activity',
        'static_lwp_activity_tag',
        'static_lwp_activity',
        'static_lwp_activity_steps',
        'static_lwp_topic_tag',
        'static_lwp_subject',
        'static_lwp_topic_domain',
        'static_lwp_topic',
        'static_lwp_school_tag',
        'lwp_school',
        'lwp_user_associated_login',
        'lwp_user',
        'lwp_feedback_reply',
        'lwp_pupil_feedback_media',
        'lwp_pupil_feedback',
        'lwp_pupil_tag',
        'lwp_pupil',
        'lwp_school_class',
        'lwp_class_topic',
        'static_lwp_email_template'
    ];

    public async up(queryRunner: QueryRunner): Promise<void> {
        for (const tblName of this.DELETABLE_TABLES) {
            await queryRunner.query(`ALTER TABLE ${tblName} DISABLE ROW LEVEL SECURITY, NO FORCE ROW LEVEL SECURITY;`);
        }

        await queryRunner.query(
            `CREATE UNIQUE INDEX "idx_unique_user_interstitial" ON "lwp_user_interstitial" ("userId", "interstitialId") `
        );
        await queryRunner.query(`CREATE UNIQUE INDEX "idx_schoolTag" ON "static_lwp_program" ("schoolTagId") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "idx_unique_order_topic" ON "static_lwp_activity" ("order", "topicId") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_4586e2df1b9603ef59f69870bb" ON "lwp_user_associated_login" ("accountId") `);
        await queryRunner.query(`CREATE INDEX "lwp_pupil_feedback_type_id" ON "lwp_pupil_feedback" ("type", "id") `);

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

        await queryRunner.query(`CREATE VIEW "lwp_view_reading_log_to_reading_topic" AS
        SELECT lpf.id AS "pupilFeedbackId",
        lpt.id AS "pupilTopicId"
        FROM lwp_pupil_feedback lpf
        JOIN static_lwp_topic slt ON slt."isReading" = true
        JOIN lwp_pupil_feedback_history lpfh ON lpfh."lwpPupilFeedbackId" = lpf.id
        JOIN lwp_pupil_topic lpt ON lpt."pupilId" = lpfh."lwpPupilId" AND daterange(lpt."releaseDate", (lpt."releaseDate" + '7 days'::interval)::date) @> COALESCE(lpf."bookReadAt"::timestamp without time zone, lpf."logCreatedAt")::date AND lpt."topicId" = slt.id
        WHERE lpf.type::text = 'READING'::text;
    `);
        await queryRunner.query(
            `INSERT INTO "typeorm_metadata"("database", "schema", "table", "type", "name", "value") VALUES (DEFAULT, $1, DEFAULT, $2, $3, $4)`,
            [
                'public',
                'VIEW',
                'lwp_view_reading_log_to_reading_topic',
                'SELECT lpf.id AS "pupilFeedbackId",\n        lpt.id AS "pupilTopicId"\n        FROM lwp_pupil_feedback lpf\n        JOIN static_lwp_topic slt ON slt."isReading" = true\n        JOIN lwp_pupil_feedback_history lpfh ON lpfh."lwpPupilFeedbackId" = lpf.id\n        JOIN lwp_pupil_topic lpt ON lpt."pupilId" = lpfh."lwpPupilId" AND daterange(lpt."releaseDate", (lpt."releaseDate" + \'7 days\'::interval)::date) @> COALESCE(lpf."bookReadAt"::timestamp without time zone, lpf."logCreatedAt")::date AND lpt."topicId" = slt.id\n        WHERE lpf.type::text = \'READING\'::text;'
            ]
        );
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
		(slt."isReading" = true) as "isReadingTopic",
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
		and lpt."releaseDate" <= current_date -- don't ever notify for things where the release date is in future, even if they are mistakenly released early
		and lvcns."canNotify" = true
    `);
        await queryRunner.query(
            `INSERT INTO "typeorm_metadata"("database", "schema", "table", "type", "name", "value") VALUES (DEFAULT, $1, DEFAULT, $2, $3, $4)`,
            [
                'public',
                'VIEW',
                'lwp_view_pupil_topics_for_notifications',
                'select\n\t\t(lu_parent.*)::lwp_user as "lwpUserParent",\n\t\tls.id as "schoolId",\n\t\tls."schoolName" as "schoolName",\n\t\tlpt.id as "pupilTopicId",\n\t\t(slt.*)::static_lwp_topic as "staticLwpTopic",\n\t\t(lp.*)::lwp_pupil as "lwpPupil",\n\t\tlvps."pupilStatus" as "lwpPupilStatus",\n\t\tlsc.name as "className",\n\t\tlsc.id as "classId",\n\t\tlct.id as "classTopicId",\n\t\tlu_teacher."nameForChildren" as "teacherName",\n\t\tlct."releaseDate" as "releaseDate",\n\t\tlpt."parentsNotified" as "parentsNotified",\n\t\tlpt."reminderSent" as "reminderSent",\n\t\tlpt."reminderSentFor2Days" as "reminderSentFor2Days",\n\t\tlct."dueDate" as "dueDate",\n\t\tlpt."readingTarget" as "readingTarget",\n\t\tlpp.status as "pupilParentStatus",\n\t\tlpp."lastInvitationEmailSent" as "pupilParentLastInvitation",\n\t\t(slt."isReading" = true) as "isReadingTopic",\n\t\tcase lu_parent."notificationPreference" when \'EMAILREMINDER\' then \'email\' when \'SMSREMINDER\' then \'phone\' else null end as "notifPreference",\n\t\tlpt."silverStars",\n\t\tlpt."earnedGoldStar"\n\tfrom\n\t\tlwp_pupil_topic lpt\n\t\tjoin lwp_class_topic lct on lpt."classTopicId" = lct.id\n\t\tjoin static_lwp_topic slt on lpt."topicId" = slt.id\n\t\tjoin lwp_school_class lsc on lpt."classId" = lsc.id\n\t\tjoin lwp_pupil_parent lpp on lpt."pupilId" = lpp."pupilId"\n\t\tjoin lwp_pupil lp on lpt."pupilId" = lp.id\n\t\tjoin lwp_view_pupil_status lvps on lvps."pupilId" = lp.id\n\t\tjoin lwp_school ls on lp."schoolId" = ls.id\n\t\tjoin lwp_view_notifiable_parents lu_parent on lpp."parentId" = lu_parent.id\n\t\tjoin lwp_user lu_teacher on lsc."mainTeacherId" = lu_teacher.id\n\t\tjoin lwp_view_can_notify_school lvcns on ls.id = lvcns."schoolId"\n\twhere\n\t\tls.inactive = false\n\t\tand lpt."releaseDate" <= current_date -- don\'t ever notify for things where the release date is in future, even if they are mistakenly released early\n\t\tand lvcns."canNotify" = true'
            ]
        );

        await queryRunner.query(`DROP FUNCTION isCurrentlyDeleted;`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        const hasZeus = await queryRunner.query(`SELECT 1 from pg_roles where rolname='zeus'`);

        for (const tblName of this.DELETABLE_TABLES) {
            await queryRunner.query(`
                alter table ${tblName} enable row level security, force row level security;
                drop policy if exists zeus_perms on ${tblName};
                create policy zeus_perms on ${tblName} to ${hasZeus.length > 0 ? 'zeus' : 'postgres'} using (true);
                drop policy if exists lwpUser_perms on ${tblName};
                create policy lwpUser_perms on ${tblName} to "lwpUser" using (NOT isCurrentlyDeleted('${tblName}', "id")) with check (true);
                drop policy if exists lwpAdminUser_perms on ${tblName};
                create policy lwpAdminUser_perms on ${tblName} to "lwpAdminUser" using (true);
            `);
        }
    }
}
