import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateLwpViewPupilTopicForNotification1767686375791 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DELETE FROM "typeorm_metadata" WHERE "type" = $1 AND "name" = $2 AND "schema" = $3`, [
            'VIEW',
            'lwp_view_pupil_topics_for_notifications',
            'public'
        ]);
        await queryRunner.query(`DROP VIEW "lwp_view_pupil_topics_for_notifications"`);
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

        await queryRunner.query(`ALTER TABLE "lwp_pupil_topic" DROP CONSTRAINT "FK_09f509bff362744f67f34915592"`);
        await queryRunner.query(`ALTER TABLE "lwp_pupil_topic" DROP COLUMN "classId"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "lwp_pupil_topic" ADD "classId" bigint`);
        await queryRunner.query(
            `ALTER TABLE "lwp_pupil_topic" ADD CONSTRAINT "FK_09f509bff362744f67f34915592" FOREIGN KEY ("classId") REFERENCES "lwp_school_class"("id") ON DELETE SET NULL ON UPDATE NO ACTION`
        );

        await queryRunner.query(`DELETE FROM "typeorm_metadata" WHERE "type" = $1 AND "name" = $2 AND "schema" = $3`, [
            'VIEW',
            'lwp_view_pupil_topics_for_notifications',
            'public'
        ]);
        await queryRunner.query(`DROP VIEW "lwp_view_pupil_topics_for_notifications"`);
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
		and lvcns."canNotify" = true`);

        await queryRunner.query(
            `INSERT INTO "typeorm_metadata"("database", "schema", "table", "type", "name", "value") VALUES (DEFAULT, $1, DEFAULT, $2, $3, $4)`,
            [
                'public',
                'VIEW',
                'lwp_view_pupil_topics_for_notifications',
                'select\n\t\t(lu_parent.*)::lwp_user as "lwpUserParent",\n\t\tlsc."periodIndex" as "periodIndex",\n\t\tls.id as "schoolId",\n\t\tls."schoolName" as "schoolName",\n\t\tlpt.id as "pupilTopicId",\n\t\t(slt.*)::static_lwp_topic as "staticLwpTopic",\n\t\t(lp.*)::lwp_pupil as "lwpPupil",\n\t\tlvps."pupilStatus" as "lwpPupilStatus",\n\t\tlsc.name as "className",\n\t\tlsc.id as "classId",\n\t\tlct.id as "classTopicId",\n\t\tlu_teacher."nameForChildren" as "teacherName",\n\t\tlct."releaseDate" as "releaseDate",\n\t\tlpt."parentsNotified" as "parentsNotified",\n\t\tlpt."reminderSent" as "reminderSent",\n\t\tlpt."reminderSentFor2Days" as "reminderSentFor2Days",\n\t\tlct."dueDate" as "dueDate",\n\t\tlpt."readingTarget" as "readingTarget",\n\t\tlpp.status as "pupilParentStatus",\n\t\tlpp."lastInvitationEmailSent" as "pupilParentLastInvitation",\n\t\t(slt."isReading" = true) as "isReadingTopic",\n\t\tcase lu_parent."notificationPreference" when \'EMAILREMINDER\' then \'email\' when \'SMSREMINDER\' then \'phone\' else null end as "notifPreference",\n\t\tlpt."silverStars",\n\t\tlpt."earnedGoldStar",\n\t\t(\n\t\t\tselect sp."index"\n\t\t\tfrom static_lwp_period sp\n\t\t\twhere sp."isCurrentPeriod" = true\n\t\t\tlimit 1\n\t\t) as "globalCurrentAcademicYear"\n\tfrom\n\t\tlwp_pupil_topic lpt\n\t\tjoin lwp_class_topic lct on lpt."classTopicId" = lct.id\n\t\tjoin static_lwp_topic slt on lpt."topicId" = slt.id\n\t\tjoin lwp_school_class lsc on lpt."classId" = lsc.id\n\t\tjoin lwp_pupil_parent lpp on lpt."pupilId" = lpp."pupilId"\n\t\tjoin lwp_pupil lp on lpt."pupilId" = lp.id\n\t\tjoin lwp_view_pupil_status lvps on lvps."pupilId" = lp.id\n\t\tjoin lwp_school ls on lp."schoolId" = ls.id\n\t\tjoin lwp_view_notifiable_parents lu_parent on lpp."parentId" = lu_parent.id\n\t\tjoin lwp_user lu_teacher on lsc."mainTeacherId" = lu_teacher.id\n\t\tjoin lwp_view_can_notify_school lvcns on ls.id = lvcns."schoolId"\n\twhere\n\t\tls.inactive = false\n\t\tand lpt."releaseDate" <= current_date -- don\'t ever notify for things where the release date is in future, even if they are mistakenly released early\n\t\tand lvcns."canNotify" = true'
            ]
        );
    }
}
