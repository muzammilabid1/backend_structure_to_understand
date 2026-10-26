import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateViewAndRemoveStaticSubjectsColumnFromSchoolClassAndStaticTopic1727751527375 implements MigrationInterface {
    name = 'UpdateViewAndRemoveStaticSubjectsColumnFromSchoolClassAndStaticTopic1727751527375';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DELETE FROM "typeorm_metadata" WHERE "type" = $1 AND "name" = $2 AND "schema" = $3`, [
            'VIEW',
            'lwp_view_pupil_topics_for_notifications',
            'public'
        ]);
        await queryRunner.query(`DROP VIEW "lwp_view_pupil_topics_for_notifications"`);
        await queryRunner.query(`DELETE FROM "typeorm_metadata" WHERE "type" = $1 AND "name" = $2 AND "schema" = $3`, [
            'VIEW',
            'lwp_view_reading_log_to_reading_topic',
            'public'
        ]);
        await queryRunner.query(`DROP VIEW "lwp_view_reading_log_to_reading_topic"`);
        await queryRunner.query(`DELETE FROM "typeorm_metadata" WHERE "type" = $1 AND "name" = $2 AND "schema" = $3`, [
            'VIEW',
            'lwp_view_class_next_mathscot_items',
            'public'
        ]);
        await queryRunner.query(`DROP VIEW "lwp_view_class_next_mathscot_items"`);
        await queryRunner.query(`ALTER TABLE "static_lwp_topic" DROP COLUMN "subject"`);
        await queryRunner.query(`ALTER TABLE "lwp_school_class" DROP COLUMN "legacySubjects"`);
        await queryRunner.query(`CREATE VIEW "lwp_view_reading_log_to_reading_topic" AS               
        SELECT lpf.id AS "pupilFeedbackId",
        lpt.id AS "pupilTopicId"
        FROM lwp_pupil_feedback lpf
        JOIN static_lwp_topic slt ON slt."isReading" = true
        JOIN lwp_pupil_feedback_history lpfh ON lpfh."lwpPupilFeedbackId" = lpf.id
        JOIN lwp_pupil_topic lpt ON lpt."pupilId" = lpfh."lwpPupilId" AND daterange(lpt."releaseDate", (lpt."releaseDate" + '7 days'::interval)::date) @> COALESCE(lpf."bookReadAt"::timestamp without time zone, lpf."logCreatedAt")::date AND lpt."topicId" = slt.id
        WHERE lpf.type::text = 'READING'::text AND lpf."deletedAt" IS NULL;
    `);
        await queryRunner.query(
            `INSERT INTO "typeorm_metadata"("database", "schema", "table", "type", "name", "value") VALUES (DEFAULT, $1, DEFAULT, $2, $3, $4)`,
            [
                'public',
                'VIEW',
                'lwp_view_reading_log_to_reading_topic',
                'SELECT lpf.id AS "pupilFeedbackId",\n        lpt.id AS "pupilTopicId"\n        FROM lwp_pupil_feedback lpf\n        JOIN static_lwp_topic slt ON slt."isReading" = true\n        JOIN lwp_pupil_feedback_history lpfh ON lpfh."lwpPupilFeedbackId" = lpf.id\n        JOIN lwp_pupil_topic lpt ON lpt."pupilId" = lpfh."lwpPupilId" AND daterange(lpt."releaseDate", (lpt."releaseDate" + \'7 days\'::interval)::date) @> COALESCE(lpf."bookReadAt"::timestamp without time zone, lpf."logCreatedAt")::date AND lpt."topicId" = slt.id\n        WHERE lpf.type::text = \'READING\'::text AND lpf."deletedAt" IS NULL;'
            ]
        );
        await queryRunner.query(`CREATE VIEW "lwp_view_class_next_mathscot_items" AS 
    with releasedTopics as (
        select
            lsc.id as "classId",
            slyg."mathscotThemes",
            count(1) filter (where lct.id is not null
                and lct.released = true) as "releasedTopics"
        from
            lwp_school_class lsc
            left join static_lwp_topic slt on slt."isReading" = true
            left join lwp_class_topic lct on lsc.id = lct."classId"
                and lct."topicId" != slt.id
            join static_lwp_year_group slyg on lsc."yearGroup" = slyg.id
        group by
            lsc.id,
            slyg."mathscotThemes"
    )
    select
        "classId",
        case
            when array_length(
                array_remove(
                    array_agg(slmi.id),
                    null
                ),
                1
            ) is not null then array_agg(
                distinct slmi.id
            )
            else array_agg(
                distinct rand.id
            )
        end as "mathscotItems"
    from
        releasedTopics rt
    left join static_lwp_mathscot_item slmi on
        slmi."sequenceOrder" = "releasedTopics" + 1
        and rt."mathscotThemes" ? slmi.theme
    left outer join (
            select
                id
            from
                static_lwp_mathscot_item
            order by
                RANDOM()
            limit 3
        ) rand on
        1 = 1
    group by
        "classId"
`);
        await queryRunner.query(
            `INSERT INTO "typeorm_metadata"("database", "schema", "table", "type", "name", "value") VALUES (DEFAULT, $1, DEFAULT, $2, $3, $4)`,
            [
                'public',
                'VIEW',
                'lwp_view_class_next_mathscot_items',
                'with releasedTopics as (\n        select\n            lsc.id as "classId",\n            slyg."mathscotThemes",\n            count(1) filter (where lct.id is not null\n                and lct.released = true) as "releasedTopics"\n        from\n            lwp_school_class lsc\n            left join static_lwp_topic slt on slt."isReading" = true\n            left join lwp_class_topic lct on lsc.id = lct."classId"\n                and lct."topicId" != slt.id\n            join static_lwp_year_group slyg on lsc."yearGroup" = slyg.id\n        group by\n            lsc.id,\n            slyg."mathscotThemes"\n    )\n    select\n        "classId",\n        case\n            when array_length(\n                array_remove(\n                    array_agg(slmi.id),\n                    null\n                ),\n                1\n            ) is not null then array_agg(\n                distinct slmi.id\n            )\n            else array_agg(\n                distinct rand.id\n            )\n        end as "mathscotItems"\n    from\n        releasedTopics rt\n    left join static_lwp_mathscot_item slmi on\n        slmi."sequenceOrder" = "releasedTopics" + 1\n        and rt."mathscotThemes" ? slmi.theme\n    left outer join (\n            select\n                id\n            from\n                static_lwp_mathscot_item\n            order by\n                RANDOM()\n            limit 3\n        ) rand on\n        1 = 1\n    group by\n        "classId"'
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
                'select\n\t\t(lu_parent.*)::lwp_user as "lwpUserParent",\n\t\tls.id as "schoolId",\n\t\tls."schoolName" as "schoolName",\n\t\tlpt.id as "pupilTopicId",\n\t\t(slt.*)::static_lwp_topic as "staticLwpTopic",\n\t\t(lp.*)::lwp_pupil as "lwpPupil",\n\t\tlvps."pupilStatus" as "lwpPupilStatus",\n\t\tlsc.name as "className",\n\t\tlsc.id as "classId",\n\t\tlct.id as "classTopicId",\n\t\tlu_teacher."nameForChildren" as "teacherName",\n\t\tlct."releaseDate" as "releaseDate",\n\t\tlpt."parentsNotified" as "parentsNotified",\n\t\tlpt."reminderSent" as "reminderSent",\n\t\tlpt."reminderSentFor2Days" as "reminderSentFor2Days",\n\t\tlct."dueDate" as "dueDate",\n\t\tlpt."readingTarget" as "readingTarget",\n\t\tlpp.status as "pupilParentStatus",\n\t\tlpp."lastInvitationEmailSent" as "pupilParentLastInvitation",\n\t\t(slt."isReading" = true) as "isReadingTopic",\n\t\tcase lu_parent."notificationPreference" when \'EMAILREMINDER\' then \'email\' when \'SMSREMINDER\' then \'phone\' else null end as "notifPreference",\n\t\tlpt."silverStars",\n\t\tlpt."earnedGoldStar"\n\tfrom\n\t\tlwp_pupil_topic lpt\n\t\tjoin lwp_class_topic lct on lpt."classTopicId" = lct.id\n\t\tjoin static_lwp_topic slt on lpt."topicId" = slt.id\n\t\tjoin lwp_school_class lsc on lpt."classId" = lsc.id\n\t\tjoin lwp_pupil_parent lpp on lpt."pupilId" = lpp."pupilId"\n\t\tjoin lwp_pupil lp on lpt."pupilId" = lp.id\n\t\tjoin lwp_view_pupil_status lvps on lvps."pupilId" = lp.id\n\t\tjoin lwp_school ls on lp."schoolId" = ls.id\n\t\tjoin lwp_view_notifiable_parents lu_parent on lpp."parentId" = lu_parent.id\n\t\tjoin lwp_user lu_teacher on lsc."mainTeacherId" = lu_teacher.id\n\t\tjoin lwp_view_can_notify_school lvcns on ls.id = lvcns."schoolId"\n\twhere\n\t\tls.inactive = false\n\t\tand lpt."releaseDate" <= current_date -- don\'t ever notify for things where the release date is in future, even if they are mistakenly released early\n\t\tand lu_parent."deletedAt" is null\n\t\tand lp."deletedAt" is null\n\t\tand ls."deletedAt" is null\n\t\tand lvcns."canNotify" = true'
            ]
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DELETE FROM "typeorm_metadata" WHERE "type" = $1 AND "name" = $2 AND "schema" = $3`, [
            'VIEW',
            'lwp_view_pupil_topics_for_notifications',
            'public'
        ]);
        await queryRunner.query(`DROP VIEW "lwp_view_pupil_topics_for_notifications"`);
        await queryRunner.query(`DELETE FROM "typeorm_metadata" WHERE "type" = $1 AND "name" = $2 AND "schema" = $3`, [
            'VIEW',
            'lwp_view_class_next_mathscot_items',
            'public'
        ]);
        await queryRunner.query(`DROP VIEW "lwp_view_class_next_mathscot_items"`);
        await queryRunner.query(`DELETE FROM "typeorm_metadata" WHERE "type" = $1 AND "name" = $2 AND "schema" = $3`, [
            'VIEW',
            'lwp_view_reading_log_to_reading_topic',
            'public'
        ]);
        await queryRunner.query(`DROP VIEW "lwp_view_reading_log_to_reading_topic"`);
        await queryRunner.query(`ALTER TABLE "lwp_school_class" ADD "legacySubjects" jsonb NOT NULL DEFAULT '[]'`);
        await queryRunner.query(`ALTER TABLE "static_lwp_topic" ADD "subject" character varying`);
        await queryRunner.query(`CREATE VIEW "lwp_view_class_next_mathscot_items" AS with releasedTopics as (
        select
            lsc.id as "classId",
            slyg."mathscotThemes",
            count(1) filter (where lct.id is not null
                and lct.released = true) as "releasedTopics"
        from
            lwp_school_class lsc
            left join static_lwp_topic slt on slt.subject = 'READING'
            left join lwp_class_topic lct on lsc.id = lct."classId"
                and lct."topicId" != slt.id
            join static_lwp_year_group slyg on lsc."yearGroup" = slyg.id
        group by
            lsc.id,
            slyg."mathscotThemes"
    )
    select
        "classId",
        case
            when array_length(
                array_remove(
                    array_agg(slmi.id),
                    null
                ),
                1
            ) is not null then array_agg(
                distinct slmi.id
            )
            else array_agg(
                distinct rand.id
            )
        end as "mathscotItems"
    from
        releasedTopics rt
    left join static_lwp_mathscot_item slmi on
        slmi."sequenceOrder" = "releasedTopics" + 1
        and rt."mathscotThemes" ? slmi.theme
    left outer join (
            select
                id
            from
                static_lwp_mathscot_item
            order by
                RANDOM()
            limit 3
        ) rand on
        1 = 1
    group by
        "classId"`);
        await queryRunner.query(
            `INSERT INTO "typeorm_metadata"("database", "schema", "table", "type", "name", "value") VALUES (DEFAULT, $1, DEFAULT, $2, $3, $4)`,
            [
                'public',
                'VIEW',
                'lwp_view_class_next_mathscot_items',
                'with releasedTopics as (\n        select\n            lsc.id as "classId",\n            slyg."mathscotThemes",\n            count(1) filter (where lct.id is not null\n                and lct.released = true) as "releasedTopics"\n        from\n            lwp_school_class lsc\n            left join static_lwp_topic slt on slt.subject = \'READING\'\n            left join lwp_class_topic lct on lsc.id = lct."classId"\n                and lct."topicId" != slt.id\n            join static_lwp_year_group slyg on lsc."yearGroup" = slyg.id\n        group by\n            lsc.id,\n            slyg."mathscotThemes"\n    )\n    select\n        "classId",\n        case\n            when array_length(\n                array_remove(\n                    array_agg(slmi.id),\n                    null\n                ),\n                1\n            ) is not null then array_agg(\n                distinct slmi.id\n            )\n            else array_agg(\n                distinct rand.id\n            )\n        end as "mathscotItems"\n    from\n        releasedTopics rt\n    left join static_lwp_mathscot_item slmi on\n        slmi."sequenceOrder" = "releasedTopics" + 1\n        and rt."mathscotThemes" ? slmi.theme\n    left outer join (\n            select\n                id\n            from\n                static_lwp_mathscot_item\n            order by\n                RANDOM()\n            limit 3\n        ) rand on\n        1 = 1\n    group by\n        "classId"'
            ]
        );
        await queryRunner.query(`CREATE VIEW "lwp_view_reading_log_to_reading_topic" AS SELECT lpf.id AS "pupilFeedbackId",
        lpt.id AS "pupilTopicId"
        FROM lwp_pupil_feedback lpf
        JOIN static_lwp_topic slt ON slt.subject::text = 'READING'::text
        JOIN lwp_pupil_feedback_history lpfh ON lpfh."lwpPupilFeedbackId" = lpf.id
        JOIN lwp_pupil_topic lpt ON lpt."pupilId" = lpfh."lwpPupilId" AND daterange(lpt."releaseDate", (lpt."releaseDate" + '7 days'::interval)::date) @> COALESCE(lpf."bookReadAt"::timestamp without time zone, lpf."logCreatedAt")::date AND lpt."topicId" = slt.id
        WHERE lpf.type::text = 'READING'::text AND lpf."deletedAt" IS NULL;`);
        await queryRunner.query(
            `INSERT INTO "typeorm_metadata"("database", "schema", "table", "type", "name", "value") VALUES (DEFAULT, $1, DEFAULT, $2, $3, $4)`,
            [
                'public',
                'VIEW',
                'lwp_view_reading_log_to_reading_topic',
                'SELECT lpf.id AS "pupilFeedbackId",\n        lpt.id AS "pupilTopicId"\n        FROM lwp_pupil_feedback lpf\n        JOIN static_lwp_topic slt ON slt.subject::text = \'READING\'::text\n        JOIN lwp_pupil_feedback_history lpfh ON lpfh."lwpPupilFeedbackId" = lpf.id\n        JOIN lwp_pupil_topic lpt ON lpt."pupilId" = lpfh."lwpPupilId" AND daterange(lpt."releaseDate", (lpt."releaseDate" + \'7 days\'::interval)::date) @> COALESCE(lpf."bookReadAt"::timestamp without time zone, lpf."logCreatedAt")::date AND lpt."topicId" = slt.id\n        WHERE lpf.type::text = \'READING\'::text AND lpf."deletedAt" IS NULL;'
            ]
        );
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
		and lpt."releaseDate" <= current_date -- don't ever notify for things where the release date is in future, even if they are mistakenly released early
		and lu_parent."deletedAt" is null
		and lp."deletedAt" is null
		and ls."deletedAt" is null
		and lvcns."canNotify" = true`);
        await queryRunner.query(
            `INSERT INTO "typeorm_metadata"("database", "schema", "table", "type", "name", "value") VALUES (DEFAULT, $1, DEFAULT, $2, $3, $4)`,
            [
                'public',
                'VIEW',
                'lwp_view_pupil_topics_for_notifications',
                'select\n\t\t(lu_parent.*)::lwp_user as "lwpUserParent",\n\t\tls.id as "schoolId",\n\t\tls."schoolName" as "schoolName",\n\t\tlpt.id as "pupilTopicId",\n\t\t(slt.*)::static_lwp_topic as "staticLwpTopic",\n\t\t(lp.*)::lwp_pupil as "lwpPupil",\n\t\tlvps."pupilStatus" as "lwpPupilStatus",\n\t\tlsc.name as "className",\n\t\tlsc.id as "classId",\n\t\tlct.id as "classTopicId",\n\t\tlu_teacher."nameForChildren" as "teacherName",\n\t\tlct."releaseDate" as "releaseDate",\n\t\tlpt."parentsNotified" as "parentsNotified",\n\t\tlpt."reminderSent" as "reminderSent",\n\t\tlpt."reminderSentFor2Days" as "reminderSentFor2Days",\n\t\tlct."dueDate" as "dueDate",\n\t\tlpt."readingTarget" as "readingTarget",\n\t\tlpp.status as "pupilParentStatus",\n\t\tlpp."lastInvitationEmailSent" as "pupilParentLastInvitation",\n\t\t(slt.subject = \'READING\') as "isReadingTopic",\n\t\tcase lu_parent."notificationPreference" when \'EMAILREMINDER\' then \'email\' when \'SMSREMINDER\' then \'phone\' else null end as "notifPreference",\n\t\tlpt."silverStars",\n\t\tlpt."earnedGoldStar"\n\tfrom\n\t\tlwp_pupil_topic lpt\n\t\tjoin lwp_class_topic lct on lpt."classTopicId" = lct.id\n\t\tjoin static_lwp_topic slt on lpt."topicId" = slt.id\n\t\tjoin lwp_school_class lsc on lpt."classId" = lsc.id\n\t\tjoin lwp_pupil_parent lpp on lpt."pupilId" = lpp."pupilId"\n\t\tjoin lwp_pupil lp on lpt."pupilId" = lp.id\n\t\tjoin lwp_view_pupil_status lvps on lvps."pupilId" = lp.id\n\t\tjoin lwp_school ls on lp."schoolId" = ls.id\n\t\tjoin lwp_view_notifiable_parents lu_parent on lpp."parentId" = lu_parent.id\n\t\tjoin lwp_user lu_teacher on lsc."mainTeacherId" = lu_teacher.id\n\t\tjoin lwp_view_can_notify_school lvcns on ls.id = lvcns."schoolId"\n\twhere\n\t\tls.inactive = false\n\t\tand lpt."releaseDate" <= current_date -- don\'t ever notify for things where the release date is in future, even if they are mistakenly released early\n\t\tand lu_parent."deletedAt" is null\n\t\tand lp."deletedAt" is null\n\t\tand ls."deletedAt" is null\n\t\tand lvcns."canNotify" = true'
            ]
        );
    }
}
