import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds `lwp_user."lastMoneySkillsLaunchEmailSent"`, the timestamp recording when a user was sent the Money
 * Skills launch email. NULL means never sent. Stamped when the email is queued, so it goes out once per person;
 * see ClassTopicService#teacherMoneySkillsFirstTopicScheduled.
 *
 * IMPORTANT - lwp_user shape dependencies: `lwp_view_notifiable_parents` is `SELECT * FROM lwp_user`, whose
 * column list is frozen at creation time, and the notification crons cast rows from it back to lwp_user via
 * `ROW(view.*)::lwp_user`. Adding an lwp_user column makes that frozen view mismatch the type and the cast
 * fails ("cannot cast type record to lwp_user"), breaking every cron that reads
 * lwp_view_pupil_topics_for_notifications. So this migration drops those dependencies, adds the column, then
 * recreates them (re-freezing the view to lwp_user's new shape). The drop/recreate pair below is copied verbatim
 * from 1786953847216-AddLastWelcomeEmailSentToLwpUser.
 */
export class AddLastMoneySkillsLaunchEmailSentToLwpUser1789995225216 implements MigrationInterface {
    name = 'AddLastMoneySkillsLaunchEmailSentToLwpUser1789995225216';

    private async dropLwpUserViewDependencies(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DELETE FROM "typeorm_metadata" WHERE "type" = $1 AND "name" = $2 AND "schema" = $3`, [
            'VIEW',
            'lwp_view_pupil_topics_for_notifications',
            'public'
        ]);
        await queryRunner.query(`DROP VIEW "lwp_view_pupil_topics_for_notifications"`);
        await queryRunner.query(`DROP CAST (lwp_view_notifiable_parents AS lwp_user)`);
        await queryRunner.query(`DROP FUNCTION lwp_view_notifiable_parents_to_lwp_user`);
        await queryRunner.query(`DELETE FROM "typeorm_metadata" WHERE "type" = $1 AND "name" = $2 AND "schema" = $3`, [
            'VIEW',
            'lwp_view_notifiable_parents',
            'public'
        ]);
        await queryRunner.query(`DROP VIEW "lwp_view_notifiable_parents"`);
    }

    private async recreateLwpUserViewDependencies(queryRunner: QueryRunner): Promise<void> {
        // The SELECT * re-freezes to lwp_user's current columns, so the ROW(view.*)::lwp_user cast matches again.
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
        // Recreated at its current definition (from 1767686375791) so periodIndex / globalCurrentAcademicYear are preserved.
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
		join lwp_school_class lsc on lct."classId" = lsc.id
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
                'select\n\t\t(lu_parent.*)::lwp_user as "lwpUserParent",\n\t\tlsc."periodIndex" as "periodIndex",\n\t\tls.id as "schoolId",\n\t\tls."schoolName" as "schoolName",\n\t\tlpt.id as "pupilTopicId",\n\t\t(slt.*)::static_lwp_topic as "staticLwpTopic",\n\t\t(lp.*)::lwp_pupil as "lwpPupil",\n\t\tlvps."pupilStatus" as "lwpPupilStatus",\n\t\tlsc.name as "className",\n\t\tlsc.id as "classId",\n\t\tlct.id as "classTopicId",\n\t\tlu_teacher."nameForChildren" as "teacherName",\n\t\tlct."releaseDate" as "releaseDate",\n\t\tlpt."parentsNotified" as "parentsNotified",\n\t\tlpt."reminderSent" as "reminderSent",\n\t\tlpt."reminderSentFor2Days" as "reminderSentFor2Days",\n\t\tlct."dueDate" as "dueDate",\n\t\tlpt."readingTarget" as "readingTarget",\n\t\tlpp.status as "pupilParentStatus",\n\t\tlpp."lastInvitationEmailSent" as "pupilParentLastInvitation",\n\t\t(slt."isReading" = true) as "isReadingTopic",\n\t\tcase lu_parent."notificationPreference" when \'EMAILREMINDER\' then \'email\' when \'SMSREMINDER\' then \'phone\' else null end as "notifPreference",\n\t\tlpt."silverStars",\n\t\tlpt."earnedGoldStar",\n\t\t(\n\t\t\tselect sp."index"\n\t\t\tfrom static_lwp_period sp\n\t\t\twhere sp."isCurrentPeriod" = true\n\t\t\tlimit 1\n\t\t) as "globalCurrentAcademicYear"\n\tfrom\n\t\tlwp_pupil_topic lpt\n\t\tjoin lwp_class_topic lct on lpt."classTopicId" = lct.id\n\t\tjoin static_lwp_topic slt on lpt."topicId" = slt.id\n\t\tjoin lwp_school_class lsc on lct."classId" = lsc.id\n\t\tjoin lwp_pupil_parent lpp on lpt."pupilId" = lpp."pupilId"\n\t\tjoin lwp_pupil lp on lpt."pupilId" = lp.id\n\t\tjoin lwp_view_pupil_status lvps on lvps."pupilId" = lp.id\n\t\tjoin lwp_school ls on lp."schoolId" = ls.id\n\t\tjoin lwp_view_notifiable_parents lu_parent on lpp."parentId" = lu_parent.id\n\t\tjoin lwp_user lu_teacher on lsc."mainTeacherId" = lu_teacher.id\n\t\tjoin lwp_view_can_notify_school lvcns on ls.id = lvcns."schoolId"\n\twhere\n\t\tls.inactive = false\n\t\tand lpt."releaseDate" <= current_date -- don\'t ever notify for things where the release date is in future, even if they are mistakenly released early\n\t\tand lvcns."canNotify" = true'
            ]
        );
    }

    public async up(queryRunner: QueryRunner): Promise<void> {
        // 1. Drop the lwp_user shape-dependent views/cast/function.
        await this.dropLwpUserViewDependencies(queryRunner);

        // 2. Add the column. NULL everywhere means "never sent".
        await queryRunner.query(`ALTER TABLE "lwp_user" ADD "lastMoneySkillsLaunchEmailSent" TIMESTAMP`);

        // 3. Recreate the dependencies so the frozen view matches lwp_user's new shape.
        await this.recreateLwpUserViewDependencies(queryRunner);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await this.dropLwpUserViewDependencies(queryRunner);

        await queryRunner.query(`ALTER TABLE "lwp_user" DROP COLUMN "lastMoneySkillsLaunchEmailSent"`);

        await this.recreateLwpUserViewDependencies(queryRunner);
    }
}
