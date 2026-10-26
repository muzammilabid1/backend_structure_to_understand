import {MigrationInterface, QueryRunner} from "typeorm";

export class migration1691667222399 implements MigrationInterface {
    name = 'migration1691667222399'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "lwp_pupil_topic" DROP COLUMN "earnedStars"`);
        await queryRunner.query(`ALTER TABLE "lwp_class_topic" DROP COLUMN "skipGroupPupils"`);
        await queryRunner.query(`ALTER TABLE "lwp_magic_link" DROP CONSTRAINT "PK_7a9b994adb6b97dce181701a00b"`);
        await queryRunner.query(`ALTER TABLE "lwp_magic_link" DROP COLUMN "id"`);
        await queryRunner.query(`ALTER TABLE "static_lwp_parameter" DROP CONSTRAINT "PK_ebdc0a7afe52576746be65dbee5"`);
        await queryRunner.query(`ALTER TABLE "static_lwp_parameter" DROP COLUMN "id"`);
        await queryRunner.query(`ALTER TABLE "lwp_pupil_topic" ADD "earnedGoldStar" boolean DEFAULT false`);
        await queryRunner.query(`ALTER TABLE "lwp_pupil_topic" ADD "silverStars" integer DEFAULT '0'`);
        await queryRunner.query(`ALTER TABLE "lwp_school_class" ADD "status" character varying NOT NULL DEFAULT 'ACTIVE'`);
        await queryRunner.query(`ALTER TABLE "lwp_school_class" ADD "isFullProgramme" boolean NOT NULL DEFAULT false`);
        await queryRunner.query(`UPDATE "lwp_school_class" SET "isFullProgramme" = true;`);
        await queryRunner.query(`ALTER TABLE "lwp_school_class" ADD "skipGroupPupils" boolean NOT NULL DEFAULT false`);
        await queryRunner.query(`ALTER TABLE "lwp_school_class" ADD "subjects" jsonb NOT NULL DEFAULT '[]'`);
        await queryRunner.query(`ALTER TABLE "lwp_school_class" ADD "parentClassId" bigint`);
        await queryRunner.query(`ALTER TABLE "lwp_school" ADD "numOfFullProgrammeClassesAllowed" integer NOT NULL DEFAULT '0'`);
        await queryRunner.query(`ALTER TABLE "lwp_school" ADD "numOfTotalClassesAllowed" integer NOT NULL DEFAULT '0'`);
        await queryRunner.query(`ALTER TABLE "lwp_pupil_feedback" ADD "readingType" character varying DEFAULT 'SOMETHING_ELSE'`);
        await queryRunner.query(`ALTER TABLE "lwp_notification" ALTER COLUMN "logCreatedAt" SET DEFAULT ('now'::text)::timestamp(6) with time zone`);
        await queryRunner.query(`ALTER TABLE "lwp_magic_link" ADD CONSTRAINT "PK_b8e05e799d438db279ed840c75f" PRIMARY KEY ("url")`);
        await queryRunner.query(`ALTER TABLE "static_lwp_parameter" ADD CONSTRAINT "PK_17dc37a2555d9180d6891f5cdf0" PRIMARY KEY ("key")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "lwp_pupil_activity_pupilid_idx" ON "lwp_pupil_activity" ("pupilId") `);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "lwp_pupil_activity_pupilid_activityid_topicid_idx" ON "lwp_pupil_activity" ("activityId", "pupilId", "topicId") `);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "lwp_pupil_topic_pupilid_idx" ON "lwp_pupil_topic" ("pupilId") `);
        await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS "lwp_pupil_topic_pupilid_classtopicid_idx" ON "lwp_pupil_topic" ("classTopicId", "pupilId") `);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "lwp_pupil_feedback_pupiltopic_idx" ON "lwp_pupil_feedback" ("pupilTopicId") `);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "lwp_pupil_feedback_pupilid_idx" ON "lwp_pupil_feedback" ("pupilId") `);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "lwp_pupil_feedback_activityid_idx" ON "lwp_pupil_feedback" ("activityId") `);
        await queryRunner.query(`ALTER TABLE "lwp_school_class" ADD CONSTRAINT "FK_7d4cfca9d87858f7ec57c262f1e" FOREIGN KEY ("parentClassId") REFERENCES "lwp_school_class"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`CREATE VIEW "lwp_view_class_next_mathscot_items" AS 
    with releasedTopics as (
        select
            "classId",
            "mathscotThemes",
            count(1) as "releasedTopics"
        from
            lwp_class_topic lct
        join lwp_school_class lsc on
            lct."classId" = lsc.id
        join static_lwp_year_group slyg on
            lsc."yearGroup" = slyg.id
        where
            released = true
        group by
            "classId",
            "mathscotThemes"
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
        await queryRunner.query(`INSERT INTO "typeorm_metadata"("database", "schema", "table", "type", "name", "value") VALUES (DEFAULT, $1, DEFAULT, $2, $3, $4)`, ["public","VIEW","lwp_view_class_next_mathscot_items","with releasedTopics as (\n        select\n            \"classId\",\n            \"mathscotThemes\",\n            count(1) as \"releasedTopics\"\n        from\n            lwp_class_topic lct\n        join lwp_school_class lsc on\n            lct.\"classId\" = lsc.id\n        join static_lwp_year_group slyg on\n            lsc.\"yearGroup\" = slyg.id\n        where\n            released = true\n        group by\n            \"classId\",\n            \"mathscotThemes\"\n    )\n    select\n        \"classId\",\n        case\n            when array_length(\n                array_remove(\n                    array_agg(slmi.id),\n                    null\n                ),\n                1\n            ) is not null then array_agg(\n                distinct slmi.id\n            )\n            else array_agg(\n                distinct rand.id\n            )\n        end as \"mathscotItems\"\n    from\n        releasedTopics rt\n    left join static_lwp_mathscot_item slmi on\n        slmi.\"sequenceOrder\" = \"releasedTopics\" + 1\n        and rt.\"mathscotThemes\" ? slmi.theme\n    left outer join (\n            select\n                id\n            from\n                static_lwp_mathscot_item\n            order by\n                RANDOM()\n            limit 3\n        ) rand on\n        1 = 1\n    group by\n        \"classId\""]);
        await queryRunner.query(`CREATE VIEW "lwp_view_can_notify_school" AS 
    select
	id as "schoolId",
	(
		current_time::TIME - TO_TIMESTAMP(
			case
				(
					extract(
						isodow
					from
						current_date
					) > 5
				)
				or (
					id != -1
					and exists
				(
						select
							1
						from
							lwp_school_holidays lshs
						join lwp_school_holiday lsh on
							lsh.id = lshs."lwpSchoolHolidayId"
						where
							lshs."lwpSchoolId" = ls.id
							and lsh."startDate" <= current_date
							and lsh."endDate" >= current_date
							and lsh."periodIndex" = ls."curentPeriodIndex"
					)
				)
				when true then (
					select
						coalesce(
							min(value),
							'10:00'
						)
					from
						static_lwp_parameter
					where
						key = 'WEEKEND_TOPIC_RELEASE_EMAIL'
				)
				else (
					select
						coalesce(
							min(value),
							'15:00'
						)
					from
						static_lwp_parameter
					where
						key = 'WEEKDAY_TOPIC_RELEASE_EMAIL'
				)
			end,
			'HH24:MI'
		)::TIME >= interval '0'
	) as "canNotify"
    from
        (
            select
                id,
                "curentPeriodIndex"
            from
                lwp_school
            -- -1 is the default if we aren't trying to get holiday dates included in our query.
            union all
                select
                    -1,
                    -1
        ) ls;
    `);
        await queryRunner.query(`INSERT INTO "typeorm_metadata"("database", "schema", "table", "type", "name", "value") VALUES (DEFAULT, $1, DEFAULT, $2, $3, $4)`, ["public","VIEW","lwp_view_can_notify_school","select\n\tid as \"schoolId\",\n\t(\n\t\tcurrent_time::TIME - TO_TIMESTAMP(\n\t\t\tcase\n\t\t\t\t(\n\t\t\t\t\textract(\n\t\t\t\t\t\tisodow\n\t\t\t\t\tfrom\n\t\t\t\t\t\tcurrent_date\n\t\t\t\t\t) > 5\n\t\t\t\t)\n\t\t\t\tor (\n\t\t\t\t\tid != -1\n\t\t\t\t\tand exists\n\t\t\t\t(\n\t\t\t\t\t\tselect\n\t\t\t\t\t\t\t1\n\t\t\t\t\t\tfrom\n\t\t\t\t\t\t\tlwp_school_holidays lshs\n\t\t\t\t\t\tjoin lwp_school_holiday lsh on\n\t\t\t\t\t\t\tlsh.id = lshs.\"lwpSchoolHolidayId\"\n\t\t\t\t\t\twhere\n\t\t\t\t\t\t\tlshs.\"lwpSchoolId\" = ls.id\n\t\t\t\t\t\t\tand lsh.\"startDate\" <= current_date\n\t\t\t\t\t\t\tand lsh.\"endDate\" >= current_date\n\t\t\t\t\t\t\tand lsh.\"periodIndex\" = ls.\"curentPeriodIndex\"\n\t\t\t\t\t)\n\t\t\t\t)\n\t\t\t\twhen true then (\n\t\t\t\t\tselect\n\t\t\t\t\t\tcoalesce(\n\t\t\t\t\t\t\tmin(value),\n\t\t\t\t\t\t\t'10:00'\n\t\t\t\t\t\t)\n\t\t\t\t\tfrom\n\t\t\t\t\t\tstatic_lwp_parameter\n\t\t\t\t\twhere\n\t\t\t\t\t\tkey = 'WEEKEND_TOPIC_RELEASE_EMAIL'\n\t\t\t\t)\n\t\t\t\telse (\n\t\t\t\t\tselect\n\t\t\t\t\t\tcoalesce(\n\t\t\t\t\t\t\tmin(value),\n\t\t\t\t\t\t\t'15:00'\n\t\t\t\t\t\t)\n\t\t\t\t\tfrom\n\t\t\t\t\t\tstatic_lwp_parameter\n\t\t\t\t\twhere\n\t\t\t\t\t\tkey = 'WEEKDAY_TOPIC_RELEASE_EMAIL'\n\t\t\t\t)\n\t\t\tend,\n\t\t\t'HH24:MI'\n\t\t)::TIME >= interval '0'\n\t) as \"canNotify\"\n    from\n        (\n            select\n                id,\n                \"curentPeriodIndex\"\n            from\n                lwp_school\n            -- -1 is the default if we aren't trying to get holiday dates included in our query.\n            union all\n                select\n                    -1,\n                    -1\n        ) ls;"]);
        await queryRunner.query(`CREATE VIEW "lwp_view_pupil_topics_for_notifications" AS 
	select
		(lu_parent.*)::lwp_user as "lwpUserParent",
		ls.id as "schoolId",
		ls."schoolName" as "schoolName",
		lpt.id as "pupilTopicId",
		(slt.*)::static_lwp_topic as "staticLwpTopic",
		(lp.*)::lwp_pupil as "lwpPupil",
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
		join lwp_school ls on lp."schoolId" = ls.id
		join lwp_user lu_parent on lpp."parentId" = lu_parent.id
		join lwp_user lu_teacher on lsc."mainTeacherId" = lu_teacher.id
		join lwp_view_can_notify_school lvcns on ls.id = lvcns."schoolId"
	where
		ls.inactive = false
		and lu_parent."deletedAt" is null
		and lp."deletedAt" is null
		and ls."deletedAt" is null
		and lvcns."canNotify" = true
    `);
        await queryRunner.query(`INSERT INTO "typeorm_metadata"("database", "schema", "table", "type", "name", "value") VALUES (DEFAULT, $1, DEFAULT, $2, $3, $4)`, ["public","VIEW","lwp_view_pupil_topics_for_notifications","select\n\t\t(lu_parent.*)::lwp_user as \"lwpUserParent\",\n\t\tls.id as \"schoolId\",\n\t\tls.\"schoolName\" as \"schoolName\",\n\t\tlpt.id as \"pupilTopicId\",\n\t\t(slt.*)::static_lwp_topic as \"staticLwpTopic\",\n\t\t(lp.*)::lwp_pupil as \"lwpPupil\",\n\t\tlsc.name as \"className\",\n\t\tlsc.id as \"classId\",\n\t\tlct.id as \"classTopicId\",\n\t\tlu_teacher.\"nameForChildren\" as \"teacherName\",\n\t\tlct.\"releaseDate\" as \"releaseDate\",\n\t\tlpt.\"parentsNotified\" as \"parentsNotified\",\n\t\tlpt.\"reminderSent\" as \"reminderSent\",\n\t\tlpt.\"reminderSentFor2Days\" as \"reminderSentFor2Days\",\n\t\tlct.\"dueDate\" as \"dueDate\",\n\t\tlpt.\"readingTarget\" as \"readingTarget\",\n\t\tlpp.status as \"pupilParentStatus\",\n\t\tlpp.\"lastInvitationEmailSent\" as \"pupilParentLastInvitation\",\n\t\t(slt.subject = 'READING') as \"isReadingTopic\",\n\t\tcase lu_parent.\"notificationPreference\" when 'EMAILREMINDER' then 'email' when 'SMSREMINDER' then 'phone' else null end as \"notifPreference\",\n\t\tlpt.\"silverStars\",\n\t\tlpt.\"earnedGoldStar\"\n\tfrom\n\t\tlwp_pupil_topic lpt\n\t\tjoin lwp_class_topic lct on lpt.\"classTopicId\" = lct.id\n\t\tjoin static_lwp_topic slt on lpt.\"topicId\" = slt.id\n\t\tjoin lwp_school_class lsc on lpt.\"classId\" = lsc.id\n\t\tjoin lwp_pupil_parent lpp on lpt.\"pupilId\" = lpp.\"pupilId\"\n\t\tjoin lwp_pupil lp on lpt.\"pupilId\" = lp.id\n\t\tjoin lwp_school ls on lp.\"schoolId\" = ls.id\n\t\tjoin lwp_user lu_parent on lpp.\"parentId\" = lu_parent.id\n\t\tjoin lwp_user lu_teacher on lsc.\"mainTeacherId\" = lu_teacher.id\n\t\tjoin lwp_view_can_notify_school lvcns on ls.id = lvcns.\"schoolId\"\n\twhere\n\t\tls.inactive = false\n\t\tand lu_parent.\"deletedAt\" is null\n\t\tand lp.\"deletedAt\" is null\n\t\tand ls.\"deletedAt\" is null\n\t\tand lvcns.\"canNotify\" = true"]);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DELETE FROM "typeorm_metadata" WHERE "type" = $1 AND "name" = $2 AND "schema" = $3`, ["VIEW","lwp_view_can_notify_school","public"]);
        await queryRunner.query(`DROP VIEW "lwp_view_can_notify_school"`);
        await queryRunner.query(`DELETE FROM "typeorm_metadata" WHERE "type" = $1 AND "name" = $2 AND "schema" = $3`, ["VIEW","lwp_view_pupil_topics_for_notifications","public"]);
        await queryRunner.query(`DROP VIEW "lwp_view_pupil_topics_for_notifications"`);
        await queryRunner.query(`DELETE FROM "typeorm_metadata" WHERE "type" = $1 AND "name" = $2 AND "schema" = $3`, ["VIEW","lwp_view_class_next_mathscot_items","public"]);
        await queryRunner.query(`DROP VIEW "lwp_view_class_next_mathscot_items"`);
        await queryRunner.query(`ALTER TABLE "lwp_school_class" DROP CONSTRAINT "FK_7d4cfca9d87858f7ec57c262f1e"`);
        await queryRunner.query(`DROP INDEX "public"."lwp_pupil_feedback_activityid_idx"`);
        await queryRunner.query(`DROP INDEX "public"."lwp_pupil_feedback_pupilid_idx"`);
        await queryRunner.query(`DROP INDEX "public"."lwp_pupil_feedback_pupiltopic_idx"`);
        await queryRunner.query(`DROP INDEX "public"."lwp_pupil_topic_pupilid_classtopicid_idx"`);
        await queryRunner.query(`DROP INDEX "public"."lwp_pupil_topic_pupilid_idx"`);
        await queryRunner.query(`DROP INDEX "public"."lwp_pupil_activity_pupilid_activityid_topicid_idx"`);
        await queryRunner.query(`DROP INDEX "public"."lwp_pupil_activity_pupilid_idx"`);
        await queryRunner.query(`ALTER TABLE "static_lwp_parameter" DROP CONSTRAINT "PK_17dc37a2555d9180d6891f5cdf0"`);
        await queryRunner.query(`ALTER TABLE "lwp_magic_link" DROP CONSTRAINT "PK_b8e05e799d438db279ed840c75f"`);
        await queryRunner.query(`ALTER TABLE "lwp_notification" ALTER COLUMN "logCreatedAt" SET DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "lwp_pupil_feedback" DROP COLUMN "readingType"`);
        await queryRunner.query(`ALTER TABLE "lwp_school" DROP COLUMN "numOfTotalClassesAllowed"`);
        await queryRunner.query(`ALTER TABLE "lwp_school" DROP COLUMN "numOfFullProgrammeClassesAllowed"`);
        await queryRunner.query(`ALTER TABLE "lwp_school_class" DROP COLUMN "parentClassId"`);
        await queryRunner.query(`ALTER TABLE "lwp_school_class" DROP COLUMN "subjects"`);
        await queryRunner.query(`ALTER TABLE "lwp_school_class" DROP COLUMN "skipGroupPupils"`);
        await queryRunner.query(`ALTER TABLE "lwp_school_class" DROP COLUMN "isFullProgramme"`);
        await queryRunner.query(`ALTER TABLE "lwp_school_class" DROP COLUMN "status"`);
        await queryRunner.query(`ALTER TABLE "lwp_pupil_topic" DROP COLUMN "silverStars"`);
        await queryRunner.query(`ALTER TABLE "lwp_pupil_topic" DROP COLUMN "earnedGoldStar"`);
        await queryRunner.query(`ALTER TABLE "static_lwp_parameter" ADD "id" BIGSERIAL NOT NULL`);
        await queryRunner.query(`ALTER TABLE "static_lwp_parameter" ADD CONSTRAINT "PK_ebdc0a7afe52576746be65dbee5" PRIMARY KEY ("id")`);
        await queryRunner.query(`ALTER TABLE "lwp_magic_link" ADD "id" BIGSERIAL NOT NULL`);
        await queryRunner.query(`ALTER TABLE "lwp_magic_link" ADD CONSTRAINT "PK_7a9b994adb6b97dce181701a00b" PRIMARY KEY ("id")`);
        await queryRunner.query(`ALTER TABLE "lwp_class_topic" ADD "skipGroupPupils" boolean NOT NULL DEFAULT false`);
        await queryRunner.query(`ALTER TABLE "lwp_pupil_topic" ADD "earnedStars" integer`);
    }

}
