import { MigrationInterface, QueryRunner } from 'typeorm';

export class RemoveAbTestGroupColumnFromUserTable1711342920765 implements MigrationInterface {
    name = 'RemoveAbTestGroupColumnFromUserTable1711342920765';

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
        // Make changes to relevant tables
        await queryRunner.query(`ALTER TABLE "lwp_user" DROP COLUMN "abTestGroup"`);
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
        await queryRunner.query(
            `INSERT INTO "typeorm_metadata"("database", "schema", "table", "type", "name", "value") VALUES (DEFAULT, $1, DEFAULT, $2, $3, $4)`,
            [
                'public',
                'VIEW',
                'lwp_view_pupil_topics_for_notifications',
                'select\n\t\t(lu_parent.*)::lwp_user as "lwpUserParent",\n\t\tls.id as "schoolId",\n\t\tls."schoolName" as "schoolName",\n\t\tlpt.id as "pupilTopicId",\n\t\t(slt.*)::static_lwp_topic as "staticLwpTopic",\n\t\t(lp.*)::lwp_pupil as "lwpPupil",\n\t\tlvps."pupilStatus" as "lwpPupilStatus",\n\t\tlsc.name as "className",\n\t\tlsc.id as "classId",\n\t\tlct.id as "classTopicId",\n\t\tlu_teacher."nameForChildren" as "teacherName",\n\t\tlct."releaseDate" as "releaseDate",\n\t\tlpt."parentsNotified" as "parentsNotified",\n\t\tlpt."reminderSent" as "reminderSent",\n\t\tlpt."reminderSentFor2Days" as "reminderSentFor2Days",\n\t\tlct."dueDate" as "dueDate",\n\t\tlpt."readingTarget" as "readingTarget",\n\t\tlpp.status as "pupilParentStatus",\n\t\tlpp."lastInvitationEmailSent" as "pupilParentLastInvitation",\n\t\t(slt.subject = \'READING\') as "isReadingTopic",\n\t\tcase lu_parent."notificationPreference" when \'EMAILREMINDER\' then \'email\' when \'SMSREMINDER\' then \'phone\' else null end as "notifPreference",\n\t\tlpt."silverStars",\n\t\tlpt."earnedGoldStar"\n\tfrom\n\t\tlwp_pupil_topic lpt\n\t\tjoin lwp_class_topic lct on lpt."classTopicId" = lct.id\n\t\tjoin static_lwp_topic slt on lpt."topicId" = slt.id\n\t\tjoin lwp_school_class lsc on lpt."classId" = lsc.id\n\t\tjoin lwp_pupil_parent lpp on lpt."pupilId" = lpp."pupilId"\n\t\tjoin lwp_pupil lp on lpt."pupilId" = lp.id\n\t\tjoin lwp_view_pupil_status lvps on lvps."pupilId" = lp.id\n\t\tjoin lwp_school ls on lp."schoolId" = ls.id\n\t\tjoin lwp_view_notifiable_parents lu_parent on lpp."parentId" = lu_parent.id\n\t\tjoin lwp_user lu_teacher on lsc."mainTeacherId" = lu_teacher.id\n\t\tjoin lwp_view_can_notify_school lvcns on ls.id = lvcns."schoolId"\n\twhere\n\t\tls.inactive = false\n\t\tand lu_parent."deletedAt" is null\n\t\tand lp."deletedAt" is null\n\t\tand ls."deletedAt" is null\n\t\tand lvcns."canNotify" = true'
            ]
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "lwp_user" ADD "abTestGroup" character varying`);
    }
}
