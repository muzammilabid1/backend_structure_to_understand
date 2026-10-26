import {MigrationInterface, QueryRunner} from "typeorm";

export class migration1660636532033 implements MigrationInterface {
    name = 'migration1660636532033'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DELETE FROM "typeorm_metadata" WHERE "type" = $1 AND "name" = $2 AND "schema" = $3`, ["MATERIALIZED_VIEW","lwp_school_view","public"]);
        await queryRunner.query(`DROP MATERIALIZED VIEW "lwp_school_view"`);
        await queryRunner.query(`ALTER TABLE "lwp_pupil_activity" DROP CONSTRAINT "FK_32d5b83f35542fc93f79f4ab197"`);
        await queryRunner.query(`ALTER TABLE "static_lwp_period" DROP CONSTRAINT "FK_142bb485c4507a790ebcdfd38aa"`);
        await queryRunner.query(`ALTER TABLE "static_lwp_period" DROP CONSTRAINT "FK_76ebbcc2bd77860732d59e7fec6"`);
        await queryRunner.query(`ALTER TABLE "lwp_teacher_liked_pupil_activity" DROP CONSTRAINT "FK_f1395a07e546f37a63793655a6e"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_f1395a07e546f37a63793655a6"`);
        await queryRunner.query(`ALTER TABLE "lwp_teacher_liked_pupil_activity" RENAME COLUMN "lwpPupilActivityFeedbackId" TO "lwpPupilFeedbackId"`);
        await queryRunner.query(`ALTER TABLE "lwp_teacher_liked_pupil_activity" RENAME CONSTRAINT "PK_24b4f7ee1e1304a476e45237e39" TO "PK_bef124e336176eef46c6c036d0e"`);
        await queryRunner.query(`CREATE TABLE "lwp_pupil_feedback_media" ("filename" character varying, "type" character varying, "id" BIGSERIAL NOT NULL, "deletedAt" TIMESTAMP, "logCreatedAt" TIMESTAMP DEFAULT ('now'::text)::timestamp(6) with time zone, "logUpdatedAt" TIMESTAMP NOT NULL DEFAULT ('now'::text)::timestamp(6) with time zone, "feedbackId" bigint, "deletedById" bigint, "logCreatedById" bigint, "logUpdatedById" bigint, CONSTRAINT "PK_3b67cd3f7d5424d46c9c1f6e20e" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "lwp_pupil_feedback" ("pupilComment" character varying, "parentComment" character varying, "description" character varying, "isMaths" boolean, "isEnglish" boolean, "sharingAllowed" boolean, "otherSubject" character varying, "comment" character varying, "rating" integer, "pageNumber" character varying, "bookName" character varying, "userType" character varying, "userId" integer, "userName" character varying, "isBookFinished" boolean, "bookReadAt" TIMESTAMP, "mwpMedia" character varying, "type" character varying, "id" BIGSERIAL NOT NULL, "deletedAt" TIMESTAMP, "logCreatedAt" TIMESTAMP DEFAULT ('now'::text)::timestamp(6) with time zone, "logUpdatedAt" TIMESTAMP NOT NULL DEFAULT ('now'::text)::timestamp(6) with time zone, "activityId" bigint, "pupilId" bigint, "pupilTopicId" bigint, "deletedById" bigint, "logCreatedById" bigint, "logUpdatedById" bigint, CONSTRAINT "REL_fdcac1133fcd423b4c0be913e9" UNIQUE ("activityId"), CONSTRAINT "PK_97e7de171961da67c7e9d4e0627" PRIMARY KEY ("id"))`);
	await queryRunner.query(`SELECT setval('lwp_pupil_feedback_id_seq', COALESCE((SELECT MAX(id)+1 FROM lwp_pupil_activity_feedback), 1), false)`);
	await queryRunner.query(`INSERT INTO lwp_pupil_feedback ("pupilComment", "parentComment", "description", "isMaths", "isEnglish", "sharingAllowed", "otherSubject", "id", "pupilId", "rating", "logCreatedAt", "logUpdatedAt", "logCreatedById", "logUpdatedById", "deletedAt", "deletedById", "mwpMedia", "type", "activityId") SELECT f."pupilComment", f."parentComment", f."description", f."isMaths", f."isEnglish", f."sharingAllowed", f."otherSubject", f."id", f."pupilId", f."photoRating", f."logCreatedAt", f."logUpdatedAt", f."logCreatedById", f."logUpdatedById", f."deletedAt", f."deletedById", f."mwpMedia", 'ACTIVITY', a.id FROM lwp_pupil_activity_feedback f LEFT JOIN lwp_pupil_activity a ON a."feedbackId" = f.id`);
	await queryRunner.query(`INSERT INTO lwp_pupil_feedback_media ("filename", "type", "deletedAt", "logCreatedAt", "logUpdatedAt", "feedbackId", "deletedById", "logCreatedById", "logUpdatedById") SELECT "photo", 'PHOTO', "deletedAt", "logCreatedAt", "logUpdatedAt", id, "deletedById", "logCreatedById", "logUpdatedById" FROM lwp_pupil_activity_feedback WHERE "photo" IS NOT null`);
        await queryRunner.query(`ALTER TABLE "static_lwp_year_group" ADD "shortName" character varying`);
        await queryRunner.query(`ALTER TABLE "lwp_school_class" ADD "isRegistrationClass" boolean NOT NULL DEFAULT false`);
        await queryRunner.query(`ALTER TABLE "lwp_school_class" ADD "isLocked" boolean NOT NULL DEFAULT false`);
        await queryRunner.query(`ALTER TABLE "static_lwp_period" ADD "characters" jsonb DEFAULT '[]'`);
        await queryRunner.query(`ALTER TABLE "static_lwp_period" ADD "colours" jsonb DEFAULT '[]'`);
        await queryRunner.query(`ALTER TABLE "lwp_pupil" ADD "isNewMathscotMessageShown" boolean NOT NULL DEFAULT true`);
        await queryRunner.query(`ALTER TABLE "lwp_school_class" ALTER COLUMN "classSize" SET DEFAULT '0'`);
        await queryRunner.query(`ALTER TABLE "static_lwp_interstitial" ALTER COLUMN "text" DROP NOT NULL`);
        await queryRunner.query(`CREATE INDEX "IDX_e10e3ceb583c0bcd8ba4082baf" ON "lwp_teacher_liked_pupil_activity" ("lwpPupilFeedbackId") `);
        await queryRunner.query(`ALTER TABLE "lwp_pupil_feedback_media" ADD CONSTRAINT "FK_a1515e99b330ec6552c4aa7cc3a" FOREIGN KEY ("feedbackId") REFERENCES "lwp_pupil_feedback"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "lwp_pupil_feedback_media" ADD CONSTRAINT "FK_9b0ec8cb04d577fd6e4384d499c" FOREIGN KEY ("deletedById") REFERENCES "lwp_user"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "lwp_pupil_feedback_media" ADD CONSTRAINT "FK_6efdd2affbf620737afee371524" FOREIGN KEY ("logCreatedById") REFERENCES "lwp_user"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "lwp_pupil_feedback_media" ADD CONSTRAINT "FK_8d7e47c56aefa9eec9df3172510" FOREIGN KEY ("logUpdatedById") REFERENCES "lwp_user"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "static_lwp_period" ADD CONSTRAINT "FK_142bb485c4507a790ebcdfd38aa" FOREIGN KEY ("nextPeriodIndex") REFERENCES "static_lwp_period"("index") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "static_lwp_period" ADD CONSTRAINT "FK_76ebbcc2bd77860732d59e7fec6" FOREIGN KEY ("previousPeriodIndex") REFERENCES "static_lwp_period"("index") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "lwp_pupil_feedback" ADD CONSTRAINT "FK_fdcac1133fcd423b4c0be913e91" FOREIGN KEY ("activityId") REFERENCES "lwp_pupil_activity"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "lwp_pupil_feedback" ADD CONSTRAINT "FK_c475d96d96eb60331cf9efaf1c2" FOREIGN KEY ("pupilId") REFERENCES "lwp_pupil"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "lwp_pupil_feedback" ADD CONSTRAINT "FK_d55637bc53c616bda78519944b6" FOREIGN KEY ("pupilTopicId") REFERENCES "lwp_pupil_topic"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "lwp_pupil_feedback" ADD CONSTRAINT "FK_526a6f719fe468910d8d4644a35" FOREIGN KEY ("deletedById") REFERENCES "lwp_user"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "lwp_pupil_feedback" ADD CONSTRAINT "FK_d9f63cf96aa629f7dd0f4047aff" FOREIGN KEY ("logCreatedById") REFERENCES "lwp_user"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "lwp_pupil_feedback" ADD CONSTRAINT "FK_33b5f81d807493605398f372e58" FOREIGN KEY ("logUpdatedById") REFERENCES "lwp_user"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "lwp_teacher_liked_pupil_activity" ADD CONSTRAINT "FK_e10e3ceb583c0bcd8ba4082bafc" FOREIGN KEY ("lwpPupilFeedbackId") REFERENCES "lwp_pupil_feedback"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`CREATE MATERIALIZED VIEW "lwp_school_view" AS 
        select
        s."schoolName",
        concat('https://explore.learningwithparents.com/school/', s.id::varchar),
        s."misIntegration",
        count(distinct cl.id) as "numClasses",
        (
            select sum(sc."classSize")
            from lwp_school_class sc
            where sc."schoolId" = s.id
            and sc."periodIndex" = 2021
        ) as "sumOfClassSizes",
        count(distinct case when p."pupilStatus" = 'ACTIVE' then p.id else null end) as "activePupils",
        count(distinct case when p."pupilStatus" = 'REGISTERED' then p.id else null end) as "notRecentlyActivePupils",
        count(distinct case when p."pupilStatus" = 'MISSING' then p.id else null end) as "missingPupils",
        count(distinct case when pt."earnedStars" >= 1 then p.id else null end) as "pupilsWatchedAVideo",
        count(distinct case when pt."earnedStars" >= 2 then p.id else null end) as "pupilsCompletedAnActivity",
        count(distinct case when pt."earnedStars" >= 1 and p."isPremium" = true then p.id else null end) as "pupilsWatchedAVideoPP",
        count(distinct case when pt."earnedStars" >= 2 and p."isPremium" = true then p.id else null end) as "pupilsCompletedAnActivityPP",
        count(distinct case when pt."earnedStars" >= 1 and p."isPremium" = false then p.id else null end) as "pupilsWatchedAVideoNonPP",
        count(distinct case when pt."earnedStars" >= 2 and p."isPremium" = false then p.id else null end) as "pupilsCompletedAnActivityNonPP",
        count(distinct pt.id) as "topicsSet",
        count(distinct case when pt."earnedStars" = 1 then pt.id else null end) as "topicsVideoWatched",
        count(distinct case when pt."earnedStars" = 2 then pt.id else null end) as "topicsOneActivityDone",
        count(distinct case when pt."earnedStars" = 3 then pt.id else null end) as "topicsCompleted",
        count(distinct case when p."isPremium" = true then pt.id else null end) as "topicsSetPP",
        count(distinct case when pt."earnedStars" = 1 and p."isPremium" = true then pt.id else null end) as "topicsVideoWatchedPP",
        count(distinct case when pt."earnedStars" = 2 and p."isPremium" = true then pt.id else null end) as "topicsOneActivityDonePP",
        count(distinct case when pt."earnedStars" = 3 and p."isPremium" = true then pt.id else null end) as "topicsCompletedPP",
        count(distinct case when p."isPremium" = false then pt.id else null end) as "topicsSetNonPP",
        count(distinct case when pt."earnedStars" = 1 and p."isPremium" = false then pt.id else null end) as "topicsVideoWatchedNonPP",
        count(distinct case when pt."earnedStars" = 2 and p."isPremium" = false then pt.id else null end) as "topicsOneActivityDoneNonPP",
        count(distinct case when pt."earnedStars" = 3 and p."isPremium" = false then pt.id else null end) as "topicsCompletedNonPP",
        count(case when pa."accessedCount" > 0 then 1 else null end) as "activitiesAccessed",
        count(distinct case when p."isPremium" = true then p.id else null end) as "premiumYes",
        count(distinct case when p."isPremium" = false then p.id else null end) as "premiumNo",
        count(distinct case when p."isPremium" is null then p.id else null end) as "premiumUnknown",
        AVG(rating) as "averageRating",
        count(distinct case when cl."yearGroup" = 55 and p."pupilStatus" in ('ACTIVE', 'REGISTERED') then p.id else null end) as "eyfsRegdPupils",
        count(distinct case when cl."yearGroup" = 1 and p."pupilStatus" in ('ACTIVE', 'REGISTERED') then p.id else null end) as "y1RegdPupils",
        count(distinct case when cl."yearGroup" = 2 and p."pupilStatus" in ('ACTIVE', 'REGISTERED') then p.id else null end) as "y2RegdPupils",
        count(distinct case when cl."yearGroup" = 3 and p."pupilStatus" in ('ACTIVE', 'REGISTERED') then p.id else null end) as "y3RegdPupils",
        count(distinct case when cl."yearGroup" = 4 and p."pupilStatus" in ('ACTIVE', 'REGISTERED') then p.id else null end) as "y4RegdPupils",
        count(distinct case when cl."yearGroup" = 5 and p."pupilStatus" in ('ACTIVE', 'REGISTERED') then p.id else null end) as "y5RegdPupils",
        count(distinct case when cl."yearGroup" = 6 and p."pupilStatus" in ('ACTIVE', 'REGISTERED') then p.id else null end) as "y6RegdPupils",
        (select sum(sc."classSize") from lwp_school_class sc where sc."schoolId" = s.id and sc."periodIndex" = 2021 and sc."yearGroup" = 55) as "eyfsSumOfClassSizes",
        (select sum(sc."classSize") from lwp_school_class sc where sc."schoolId" = s.id and sc."periodIndex" = 2021 and sc."yearGroup" = 1) as "y1SumOfClassSizes",
        (select sum(sc."classSize") from lwp_school_class sc where sc."schoolId" = s.id and sc."periodIndex" = 2021 and sc."yearGroup" = 2) as "y2SumOfClassSizes",
        (select sum(sc."classSize") from lwp_school_class sc where sc."schoolId" = s.id and sc."periodIndex" = 2021 and sc."yearGroup" = 3) as "y3SumOfClassSizes",
        (select sum(sc."classSize") from lwp_school_class sc where sc."schoolId" = s.id and sc."periodIndex" = 2021 and sc."yearGroup" = 4) as "y4SumOfClassSizes",
        (select sum(sc."classSize") from lwp_school_class sc where sc."schoolId" = s.id and sc."periodIndex" = 2021 and sc."yearGroup" = 5) as "y5SumOfClassSizes",
        (select sum(sc."classSize") from lwp_school_class sc where sc."schoolId" = s.id and sc."periodIndex" = 2021 and sc."yearGroup" = 6) as "y6SumOfClassSizes"
        from lwp_school s
        join lwp_school_class cl on cl."schoolId" = s.id and cl."periodIndex" = 2021
        join lwp_class_pupil cp on cp."lwpSchoolClassId" = cl.id
        join lwp_pupil p on cp."lwpPupilId" = p.id
        join lwp_class_topic ct on ct."classId" = cl.id
        join lwp_pupil_topic pt on pt."classTopicId" = ct.id and p.id = pt."pupilId"
        join lwp_pupil_activity pa on pa."topicId" = pt.id
        group by s."schoolName", s.id
    `);
        await queryRunner.query(`INSERT INTO "typeorm_metadata"("database", "schema", "table", "type", "name", "value") VALUES (DEFAULT, $1, DEFAULT, $2, $3, $4)`, ["public","MATERIALIZED_VIEW","lwp_school_view","select\n        s.\"schoolName\",\n        concat('https://explore.learningwithparents.com/school/', s.id::varchar),\n        s.\"misIntegration\",\n        count(distinct cl.id) as \"numClasses\",\n        (\n            select sum(sc.\"classSize\")\n            from lwp_school_class sc\n            where sc.\"schoolId\" = s.id\n            and sc.\"periodIndex\" = 2021\n        ) as \"sumOfClassSizes\",\n        count(distinct case when p.\"pupilStatus\" = 'ACTIVE' then p.id else null end) as \"activePupils\",\n        count(distinct case when p.\"pupilStatus\" = 'REGISTERED' then p.id else null end) as \"notRecentlyActivePupils\",\n        count(distinct case when p.\"pupilStatus\" = 'MISSING' then p.id else null end) as \"missingPupils\",\n        count(distinct case when pt.\"earnedStars\" >= 1 then p.id else null end) as \"pupilsWatchedAVideo\",\n        count(distinct case when pt.\"earnedStars\" >= 2 then p.id else null end) as \"pupilsCompletedAnActivity\",\n        count(distinct case when pt.\"earnedStars\" >= 1 and p.\"isPremium\" = true then p.id else null end) as \"pupilsWatchedAVideoPP\",\n        count(distinct case when pt.\"earnedStars\" >= 2 and p.\"isPremium\" = true then p.id else null end) as \"pupilsCompletedAnActivityPP\",\n        count(distinct case when pt.\"earnedStars\" >= 1 and p.\"isPremium\" = false then p.id else null end) as \"pupilsWatchedAVideoNonPP\",\n        count(distinct case when pt.\"earnedStars\" >= 2 and p.\"isPremium\" = false then p.id else null end) as \"pupilsCompletedAnActivityNonPP\",\n        count(distinct pt.id) as \"topicsSet\",\n        count(distinct case when pt.\"earnedStars\" = 1 then pt.id else null end) as \"topicsVideoWatched\",\n        count(distinct case when pt.\"earnedStars\" = 2 then pt.id else null end) as \"topicsOneActivityDone\",\n        count(distinct case when pt.\"earnedStars\" = 3 then pt.id else null end) as \"topicsCompleted\",\n        count(distinct case when p.\"isPremium\" = true then pt.id else null end) as \"topicsSetPP\",\n        count(distinct case when pt.\"earnedStars\" = 1 and p.\"isPremium\" = true then pt.id else null end) as \"topicsVideoWatchedPP\",\n        count(distinct case when pt.\"earnedStars\" = 2 and p.\"isPremium\" = true then pt.id else null end) as \"topicsOneActivityDonePP\",\n        count(distinct case when pt.\"earnedStars\" = 3 and p.\"isPremium\" = true then pt.id else null end) as \"topicsCompletedPP\",\n        count(distinct case when p.\"isPremium\" = false then pt.id else null end) as \"topicsSetNonPP\",\n        count(distinct case when pt.\"earnedStars\" = 1 and p.\"isPremium\" = false then pt.id else null end) as \"topicsVideoWatchedNonPP\",\n        count(distinct case when pt.\"earnedStars\" = 2 and p.\"isPremium\" = false then pt.id else null end) as \"topicsOneActivityDoneNonPP\",\n        count(distinct case when pt.\"earnedStars\" = 3 and p.\"isPremium\" = false then pt.id else null end) as \"topicsCompletedNonPP\",\n        count(case when pa.\"accessedCount\" > 0 then 1 else null end) as \"activitiesAccessed\",\n        count(distinct case when p.\"isPremium\" = true then p.id else null end) as \"premiumYes\",\n        count(distinct case when p.\"isPremium\" = false then p.id else null end) as \"premiumNo\",\n        count(distinct case when p.\"isPremium\" is null then p.id else null end) as \"premiumUnknown\",\n        AVG(rating) as \"averageRating\",\n        count(distinct case when cl.\"yearGroup\" = 55 and p.\"pupilStatus\" in ('ACTIVE', 'REGISTERED') then p.id else null end) as \"eyfsRegdPupils\",\n        count(distinct case when cl.\"yearGroup\" = 1 and p.\"pupilStatus\" in ('ACTIVE', 'REGISTERED') then p.id else null end) as \"y1RegdPupils\",\n        count(distinct case when cl.\"yearGroup\" = 2 and p.\"pupilStatus\" in ('ACTIVE', 'REGISTERED') then p.id else null end) as \"y2RegdPupils\",\n        count(distinct case when cl.\"yearGroup\" = 3 and p.\"pupilStatus\" in ('ACTIVE', 'REGISTERED') then p.id else null end) as \"y3RegdPupils\",\n        count(distinct case when cl.\"yearGroup\" = 4 and p.\"pupilStatus\" in ('ACTIVE', 'REGISTERED') then p.id else null end) as \"y4RegdPupils\",\n        count(distinct case when cl.\"yearGroup\" = 5 and p.\"pupilStatus\" in ('ACTIVE', 'REGISTERED') then p.id else null end) as \"y5RegdPupils\",\n        count(distinct case when cl.\"yearGroup\" = 6 and p.\"pupilStatus\" in ('ACTIVE', 'REGISTERED') then p.id else null end) as \"y6RegdPupils\",\n        (select sum(sc.\"classSize\") from lwp_school_class sc where sc.\"schoolId\" = s.id and sc.\"periodIndex\" = 2021 and sc.\"yearGroup\" = 55) as \"eyfsSumOfClassSizes\",\n        (select sum(sc.\"classSize\") from lwp_school_class sc where sc.\"schoolId\" = s.id and sc.\"periodIndex\" = 2021 and sc.\"yearGroup\" = 1) as \"y1SumOfClassSizes\",\n        (select sum(sc.\"classSize\") from lwp_school_class sc where sc.\"schoolId\" = s.id and sc.\"periodIndex\" = 2021 and sc.\"yearGroup\" = 2) as \"y2SumOfClassSizes\",\n        (select sum(sc.\"classSize\") from lwp_school_class sc where sc.\"schoolId\" = s.id and sc.\"periodIndex\" = 2021 and sc.\"yearGroup\" = 3) as \"y3SumOfClassSizes\",\n        (select sum(sc.\"classSize\") from lwp_school_class sc where sc.\"schoolId\" = s.id and sc.\"periodIndex\" = 2021 and sc.\"yearGroup\" = 4) as \"y4SumOfClassSizes\",\n        (select sum(sc.\"classSize\") from lwp_school_class sc where sc.\"schoolId\" = s.id and sc.\"periodIndex\" = 2021 and sc.\"yearGroup\" = 5) as \"y5SumOfClassSizes\",\n        (select sum(sc.\"classSize\") from lwp_school_class sc where sc.\"schoolId\" = s.id and sc.\"periodIndex\" = 2021 and sc.\"yearGroup\" = 6) as \"y6SumOfClassSizes\"\n        from lwp_school s\n        join lwp_school_class cl on cl.\"schoolId\" = s.id and cl.\"periodIndex\" = 2021\n        join lwp_class_pupil cp on cp.\"lwpSchoolClassId\" = cl.id\n        join lwp_pupil p on cp.\"lwpPupilId\" = p.id\n        join lwp_class_topic ct on ct.\"classId\" = cl.id\n        join lwp_pupil_topic pt on pt.\"classTopicId\" = ct.id and p.id = pt.\"pupilId\"\n        join lwp_pupil_activity pa on pa.\"topicId\" = pt.id\n        group by s.\"schoolName\", s.id"]);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DELETE FROM "typeorm_metadata" WHERE "type" = $1 AND "name" = $2 AND "schema" = $3`, ["MATERIALIZED_VIEW","lwp_school_view","public"]);
        await queryRunner.query(`DROP MATERIALIZED VIEW "lwp_school_view"`);
        await queryRunner.query(`ALTER TABLE "lwp_teacher_liked_pupil_activity" DROP CONSTRAINT "FK_e10e3ceb583c0bcd8ba4082bafc"`);
        await queryRunner.query(`ALTER TABLE "lwp_pupil_feedback" DROP CONSTRAINT "FK_33b5f81d807493605398f372e58"`);
        await queryRunner.query(`ALTER TABLE "lwp_pupil_feedback" DROP CONSTRAINT "FK_d9f63cf96aa629f7dd0f4047aff"`);
        await queryRunner.query(`ALTER TABLE "lwp_pupil_feedback" DROP CONSTRAINT "FK_526a6f719fe468910d8d4644a35"`);
        await queryRunner.query(`ALTER TABLE "lwp_pupil_feedback" DROP CONSTRAINT "FK_d55637bc53c616bda78519944b6"`);
        await queryRunner.query(`ALTER TABLE "lwp_pupil_feedback" DROP CONSTRAINT "FK_c475d96d96eb60331cf9efaf1c2"`);
        await queryRunner.query(`ALTER TABLE "lwp_pupil_feedback" DROP CONSTRAINT "FK_fdcac1133fcd423b4c0be913e91"`);
        await queryRunner.query(`ALTER TABLE "static_lwp_period" DROP CONSTRAINT "FK_76ebbcc2bd77860732d59e7fec6"`);
        await queryRunner.query(`ALTER TABLE "static_lwp_period" DROP CONSTRAINT "FK_142bb485c4507a790ebcdfd38aa"`);
        await queryRunner.query(`ALTER TABLE "lwp_pupil_feedback_media" DROP CONSTRAINT "FK_8d7e47c56aefa9eec9df3172510"`);
        await queryRunner.query(`ALTER TABLE "lwp_pupil_feedback_media" DROP CONSTRAINT "FK_6efdd2affbf620737afee371524"`);
        await queryRunner.query(`ALTER TABLE "lwp_pupil_feedback_media" DROP CONSTRAINT "FK_9b0ec8cb04d577fd6e4384d499c"`);
        await queryRunner.query(`ALTER TABLE "lwp_pupil_feedback_media" DROP CONSTRAINT "FK_a1515e99b330ec6552c4aa7cc3a"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_e10e3ceb583c0bcd8ba4082baf"`);
        await queryRunner.query(`ALTER TABLE "static_lwp_interstitial" ALTER COLUMN "text" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "lwp_school_class" ALTER COLUMN "classSize" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "lwp_pupil" DROP COLUMN "isNewMathscotMessageShown"`);
        await queryRunner.query(`ALTER TABLE "static_lwp_period" DROP COLUMN "colours"`);
        await queryRunner.query(`ALTER TABLE "static_lwp_period" DROP COLUMN "characters"`);
        await queryRunner.query(`ALTER TABLE "lwp_school_class" DROP COLUMN "isLocked"`);
        await queryRunner.query(`ALTER TABLE "lwp_school_class" DROP COLUMN "isRegistrationClass"`);
        await queryRunner.query(`ALTER TABLE "static_lwp_year_group" DROP COLUMN "shortName"`);
        await queryRunner.query(`ALTER TABLE "log_lwp_email_sms" ADD "content" jsonb`);
        await queryRunner.query(`ALTER TABLE "log_lwp_email_sms" ADD "templateId" integer`);
        await queryRunner.query(`ALTER TABLE "lwp_pupil_activity" ADD "feedbackId" bigint`);
        await queryRunner.query(`ALTER TABLE "lwp_pupil_trophy" ADD "isEmailSentPupil" boolean`);
        await queryRunner.query(`ALTER TABLE "lwp_pupil_trophy" ADD "isEmailSentTeacher" boolean`);
        await queryRunner.query(`DROP TABLE "lwp_pupil_feedback"`);
        await queryRunner.query(`DROP TABLE "lwp_pupil_feedback_media"`);
        await queryRunner.query(`ALTER TABLE "lwp_teacher_liked_pupil_activity" RENAME CONSTRAINT "PK_bef124e336176eef46c6c036d0e" TO "PK_24b4f7ee1e1304a476e45237e39"`);
        await queryRunner.query(`ALTER TABLE "lwp_teacher_liked_pupil_activity" RENAME COLUMN "lwpPupilFeedbackId" TO "lwpPupilActivityFeedbackId"`);
        await queryRunner.query(`CREATE INDEX "IDX_f1395a07e546f37a63793655a6" ON "lwp_teacher_liked_pupil_activity" ("lwpPupilActivityFeedbackId") `);
        await queryRunner.query(`ALTER TABLE "lwp_teacher_liked_pupil_activity" ADD CONSTRAINT "FK_f1395a07e546f37a63793655a6e" FOREIGN KEY ("lwpPupilActivityFeedbackId") REFERENCES "lwp_pupil_activity_feedback"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "static_lwp_period" ADD CONSTRAINT "FK_76ebbcc2bd77860732d59e7fec6" FOREIGN KEY ("previousPeriodIndex") REFERENCES "static_lwp_period"("index") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "static_lwp_period" ADD CONSTRAINT "FK_142bb485c4507a790ebcdfd38aa" FOREIGN KEY ("nextPeriodIndex") REFERENCES "static_lwp_period"("index") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "lwp_pupil_activity" ADD CONSTRAINT "FK_32d5b83f35542fc93f79f4ab197" FOREIGN KEY ("feedbackId") REFERENCES "lwp_pupil_activity_feedback"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`CREATE MATERIALIZED VIEW "lwp_school_view" AS select
        s."schoolName",
        concat('https://explore.learningwithparents.com/school/', s.id::varchar),
        s."misIntegration",
        count(distinct cl.id) as "numClasses",
        (
            select sum(sc."classSize")
            from lwp_school_class sc
            where sc."schoolId" = s.id
            and sc."periodIndex" = 2021
        ) as "sumOfClassSizes",
        count(distinct case when p."pupilStatus" = 'ACTIVE' then p.id else null end) as "activePupils",
        count(distinct case when p."pupilStatus" = 'REGISTERED' then p.id else null end) as "notRecentlyActivePupils",
        count(distinct case when p."pupilStatus" = 'MISSING' then p.id else null end) as "missingPupils",
        count(distinct case when pt."earnedStars" >= 1 then p.id else null end) as "pupilsWatchedAVideo",
        count(distinct case when pt."earnedStars" >= 2 then p.id else null end) as "pupilsCompletedAnActivity",
        count(distinct case when pt."earnedStars" >= 1 and p."isPremium" = true then p.id else null end) as "pupilsWatchedAVideoPP",
        count(distinct case when pt."earnedStars" >= 2 and p."isPremium" = true then p.id else null end) as "pupilsCompletedAnActivityPP",
        count(distinct case when pt."earnedStars" >= 1 and p."isPremium" = false then p.id else null end) as "pupilsWatchedAVideoNonPP",
        count(distinct case when pt."earnedStars" >= 2 and p."isPremium" = false then p.id else null end) as "pupilsCompletedAnActivityNonPP",
        count(distinct pt.id) as "topicsSet",
        count(distinct case when pt."earnedStars" = 1 then pt.id else null end) as "topicsVideoWatched",
        count(distinct case when pt."earnedStars" = 2 then pt.id else null end) as "topicsOneActivityDone",
        count(distinct case when pt."earnedStars" = 3 then pt.id else null end) as "topicsCompleted",
        count(distinct case when p."isPremium" = true then pt.id else null end) as "topicsSetPP",
        count(distinct case when pt."earnedStars" = 1 and p."isPremium" = true then pt.id else null end) as "topicsVideoWatchedPP",
        count(distinct case when pt."earnedStars" = 2 and p."isPremium" = true then pt.id else null end) as "topicsOneActivityDonePP",
        count(distinct case when pt."earnedStars" = 3 and p."isPremium" = true then pt.id else null end) as "topicsCompletedPP",
        count(distinct case when p."isPremium" = false then pt.id else null end) as "topicsSetNonPP",
        count(distinct case when pt."earnedStars" = 1 and p."isPremium" = false then pt.id else null end) as "topicsVideoWatchedNonPP",
        count(distinct case when pt."earnedStars" = 2 and p."isPremium" = false then pt.id else null end) as "topicsOneActivityDoneNonPP",
        count(distinct case when pt."earnedStars" = 3 and p."isPremium" = false then pt.id else null end) as "topicsCompletedNonPP",
        count(case when pa."accessedCount" > 0 then 1 else null end) as "activitiesAccessed",
        count(case when paf.id is not null then 1 else null end) as "activityFeedEntries",
        count(case when paf."parentComment" is not null then 1 else null end) as "familyComments",
        count(case when paf."pupilComment" is not null then 1 else null end) as "childComments",
        count(case when paf.photo is not null then 1 else null end) as photos,
        count(distinct case when p."isPremium" = true then p.id else null end) as "premiumYes",
        count(distinct case when p."isPremium" = false then p.id else null end) as "premiumNo",
        count(distinct case when p."isPremium" is null then p.id else null end) as "premiumUnknown",
        AVG(rating) as "averageRating",
        count(case when cl."yearGroup" = 55 and paf.id is not null then 1 else null end) as "eyfsCommentsAndPhotos",
        count(case when cl."yearGroup" = 1 and paf.id is not null then 1 else null end) as "y1CommentsAndPhotos",
        count(case when cl."yearGroup" = 2 and paf.id is not null then 1 else null end) as "y2CommentsAndPhotos",
        count(case when cl."yearGroup" = 3 and paf.id is not null then 1 else null end) as "y3CommentsAndPhotos",
        count(case when cl."yearGroup" = 4 and paf.id is not null then 1 else null end) as "y4CommentsAndPhotos",
        count(case when cl."yearGroup" = 5 and paf.id is not null then 1 else null end) as "y5CommentsAndPhotos",
        count(case when cl."yearGroup" = 6 and paf.id is not null then 1 else null end) as "y6CommentsAndPhotos",
        count(distinct case when cl."yearGroup" = 55 and p."pupilStatus" in ('ACTIVE', 'REGISTERED') then p.id else null end) as "eyfsRegdPupils",
        count(distinct case when cl."yearGroup" = 1 and p."pupilStatus" in ('ACTIVE', 'REGISTERED') then p.id else null end) as "y1RegdPupils",
        count(distinct case when cl."yearGroup" = 2 and p."pupilStatus" in ('ACTIVE', 'REGISTERED') then p.id else null end) as "y2RegdPupils",
        count(distinct case when cl."yearGroup" = 3 and p."pupilStatus" in ('ACTIVE', 'REGISTERED') then p.id else null end) as "y3RegdPupils",
        count(distinct case when cl."yearGroup" = 4 and p."pupilStatus" in ('ACTIVE', 'REGISTERED') then p.id else null end) as "y4RegdPupils",
        count(distinct case when cl."yearGroup" = 5 and p."pupilStatus" in ('ACTIVE', 'REGISTERED') then p.id else null end) as "y5RegdPupils",
        count(distinct case when cl."yearGroup" = 6 and p."pupilStatus" in ('ACTIVE', 'REGISTERED') then p.id else null end) as "y6RegdPupils",
        (select sum(sc."classSize") from lwp_school_class sc where sc."schoolId" = s.id and sc."periodIndex" = 2021 and sc."yearGroup" = 55) as "eyfsSumOfClassSizes",
        (select sum(sc."classSize") from lwp_school_class sc where sc."schoolId" = s.id and sc."periodIndex" = 2021 and sc."yearGroup" = 1) as "y1SumOfClassSizes",
        (select sum(sc."classSize") from lwp_school_class sc where sc."schoolId" = s.id and sc."periodIndex" = 2021 and sc."yearGroup" = 2) as "y2SumOfClassSizes",
        (select sum(sc."classSize") from lwp_school_class sc where sc."schoolId" = s.id and sc."periodIndex" = 2021 and sc."yearGroup" = 3) as "y3SumOfClassSizes",
        (select sum(sc."classSize") from lwp_school_class sc where sc."schoolId" = s.id and sc."periodIndex" = 2021 and sc."yearGroup" = 4) as "y4SumOfClassSizes",
        (select sum(sc."classSize") from lwp_school_class sc where sc."schoolId" = s.id and sc."periodIndex" = 2021 and sc."yearGroup" = 5) as "y5SumOfClassSizes",
        (select sum(sc."classSize") from lwp_school_class sc where sc."schoolId" = s.id and sc."periodIndex" = 2021 and sc."yearGroup" = 6) as "y6SumOfClassSizes"
        from lwp_school s
        join lwp_school_class cl on cl."schoolId" = s.id and cl."periodIndex" = 2021
        join lwp_class_pupil cp on cp."lwpSchoolClassId" = cl.id
        join lwp_pupil p on cp."lwpPupilId" = p.id
        join lwp_class_topic ct on ct."classId" = cl.id
        join lwp_pupil_topic pt on pt."classTopicId" = ct.id and p.id = pt."pupilId"
        join lwp_pupil_activity pa on pa."topicId" = pt.id
        left join lwp_pupil_activity_feedback paf on pa."feedbackId" = paf.id
        group by s."schoolName", s.id`);
        await queryRunner.query(`INSERT INTO "typeorm_metadata"("database", "schema", "table", "type", "name", "value") VALUES (DEFAULT, $1, DEFAULT, $2, $3, $4)`, ["public","MATERIALIZED_VIEW","lwp_school_view","select\n        s.\"schoolName\",\n        concat('https://explore.learningwithparents.com/school/', s.id::varchar),\n        s.\"misIntegration\",\n        count(distinct cl.id) as \"numClasses\",\n        (\n            select sum(sc.\"classSize\")\n            from lwp_school_class sc\n            where sc.\"schoolId\" = s.id\n            and sc.\"periodIndex\" = 2021\n        ) as \"sumOfClassSizes\",\n        count(distinct case when p.\"pupilStatus\" = 'ACTIVE' then p.id else null end) as \"activePupils\",\n        count(distinct case when p.\"pupilStatus\" = 'REGISTERED' then p.id else null end) as \"notRecentlyActivePupils\",\n        count(distinct case when p.\"pupilStatus\" = 'MISSING' then p.id else null end) as \"missingPupils\",\n        count(distinct case when pt.\"earnedStars\" >= 1 then p.id else null end) as \"pupilsWatchedAVideo\",\n        count(distinct case when pt.\"earnedStars\" >= 2 then p.id else null end) as \"pupilsCompletedAnActivity\",\n        count(distinct case when pt.\"earnedStars\" >= 1 and p.\"isPremium\" = true then p.id else null end) as \"pupilsWatchedAVideoPP\",\n        count(distinct case when pt.\"earnedStars\" >= 2 and p.\"isPremium\" = true then p.id else null end) as \"pupilsCompletedAnActivityPP\",\n        count(distinct case when pt.\"earnedStars\" >= 1 and p.\"isPremium\" = false then p.id else null end) as \"pupilsWatchedAVideoNonPP\",\n        count(distinct case when pt.\"earnedStars\" >= 2 and p.\"isPremium\" = false then p.id else null end) as \"pupilsCompletedAnActivityNonPP\",\n        count(distinct pt.id) as \"topicsSet\",\n        count(distinct case when pt.\"earnedStars\" = 1 then pt.id else null end) as \"topicsVideoWatched\",\n        count(distinct case when pt.\"earnedStars\" = 2 then pt.id else null end) as \"topicsOneActivityDone\",\n        count(distinct case when pt.\"earnedStars\" = 3 then pt.id else null end) as \"topicsCompleted\",\n        count(distinct case when p.\"isPremium\" = true then pt.id else null end) as \"topicsSetPP\",\n        count(distinct case when pt.\"earnedStars\" = 1 and p.\"isPremium\" = true then pt.id else null end) as \"topicsVideoWatchedPP\",\n        count(distinct case when pt.\"earnedStars\" = 2 and p.\"isPremium\" = true then pt.id else null end) as \"topicsOneActivityDonePP\",\n        count(distinct case when pt.\"earnedStars\" = 3 and p.\"isPremium\" = true then pt.id else null end) as \"topicsCompletedPP\",\n        count(distinct case when p.\"isPremium\" = false then pt.id else null end) as \"topicsSetNonPP\",\n        count(distinct case when pt.\"earnedStars\" = 1 and p.\"isPremium\" = false then pt.id else null end) as \"topicsVideoWatchedNonPP\",\n        count(distinct case when pt.\"earnedStars\" = 2 and p.\"isPremium\" = false then pt.id else null end) as \"topicsOneActivityDoneNonPP\",\n        count(distinct case when pt.\"earnedStars\" = 3 and p.\"isPremium\" = false then pt.id else null end) as \"topicsCompletedNonPP\",\n        count(case when pa.\"accessedCount\" > 0 then 1 else null end) as \"activitiesAccessed\",\n        count(case when paf.id is not null then 1 else null end) as \"activityFeedEntries\",\n        count(case when paf.\"parentComment\" is not null then 1 else null end) as \"familyComments\",\n        count(case when paf.\"pupilComment\" is not null then 1 else null end) as \"childComments\",\n        count(case when paf.photo is not null then 1 else null end) as photos,\n        count(distinct case when p.\"isPremium\" = true then p.id else null end) as \"premiumYes\",\n        count(distinct case when p.\"isPremium\" = false then p.id else null end) as \"premiumNo\",\n        count(distinct case when p.\"isPremium\" is null then p.id else null end) as \"premiumUnknown\",\n        AVG(rating) as \"averageRating\",\n        count(case when cl.\"yearGroup\" = 55 and paf.id is not null then 1 else null end) as \"eyfsCommentsAndPhotos\",\n        count(case when cl.\"yearGroup\" = 1 and paf.id is not null then 1 else null end) as \"y1CommentsAndPhotos\",\n        count(case when cl.\"yearGroup\" = 2 and paf.id is not null then 1 else null end) as \"y2CommentsAndPhotos\",\n        count(case when cl.\"yearGroup\" = 3 and paf.id is not null then 1 else null end) as \"y3CommentsAndPhotos\",\n        count(case when cl.\"yearGroup\" = 4 and paf.id is not null then 1 else null end) as \"y4CommentsAndPhotos\",\n        count(case when cl.\"yearGroup\" = 5 and paf.id is not null then 1 else null end) as \"y5CommentsAndPhotos\",\n        count(case when cl.\"yearGroup\" = 6 and paf.id is not null then 1 else null end) as \"y6CommentsAndPhotos\",\n        count(distinct case when cl.\"yearGroup\" = 55 and p.\"pupilStatus\" in ('ACTIVE', 'REGISTERED') then p.id else null end) as \"eyfsRegdPupils\",\n        count(distinct case when cl.\"yearGroup\" = 1 and p.\"pupilStatus\" in ('ACTIVE', 'REGISTERED') then p.id else null end) as \"y1RegdPupils\",\n        count(distinct case when cl.\"yearGroup\" = 2 and p.\"pupilStatus\" in ('ACTIVE', 'REGISTERED') then p.id else null end) as \"y2RegdPupils\",\n        count(distinct case when cl.\"yearGroup\" = 3 and p.\"pupilStatus\" in ('ACTIVE', 'REGISTERED') then p.id else null end) as \"y3RegdPupils\",\n        count(distinct case when cl.\"yearGroup\" = 4 and p.\"pupilStatus\" in ('ACTIVE', 'REGISTERED') then p.id else null end) as \"y4RegdPupils\",\n        count(distinct case when cl.\"yearGroup\" = 5 and p.\"pupilStatus\" in ('ACTIVE', 'REGISTERED') then p.id else null end) as \"y5RegdPupils\",\n        count(distinct case when cl.\"yearGroup\" = 6 and p.\"pupilStatus\" in ('ACTIVE', 'REGISTERED') then p.id else null end) as \"y6RegdPupils\",\n        (select sum(sc.\"classSize\") from lwp_school_class sc where sc.\"schoolId\" = s.id and sc.\"periodIndex\" = 2021 and sc.\"yearGroup\" = 55) as \"eyfsSumOfClassSizes\",\n        (select sum(sc.\"classSize\") from lwp_school_class sc where sc.\"schoolId\" = s.id and sc.\"periodIndex\" = 2021 and sc.\"yearGroup\" = 1) as \"y1SumOfClassSizes\",\n        (select sum(sc.\"classSize\") from lwp_school_class sc where sc.\"schoolId\" = s.id and sc.\"periodIndex\" = 2021 and sc.\"yearGroup\" = 2) as \"y2SumOfClassSizes\",\n        (select sum(sc.\"classSize\") from lwp_school_class sc where sc.\"schoolId\" = s.id and sc.\"periodIndex\" = 2021 and sc.\"yearGroup\" = 3) as \"y3SumOfClassSizes\",\n        (select sum(sc.\"classSize\") from lwp_school_class sc where sc.\"schoolId\" = s.id and sc.\"periodIndex\" = 2021 and sc.\"yearGroup\" = 4) as \"y4SumOfClassSizes\",\n        (select sum(sc.\"classSize\") from lwp_school_class sc where sc.\"schoolId\" = s.id and sc.\"periodIndex\" = 2021 and sc.\"yearGroup\" = 5) as \"y5SumOfClassSizes\",\n        (select sum(sc.\"classSize\") from lwp_school_class sc where sc.\"schoolId\" = s.id and sc.\"periodIndex\" = 2021 and sc.\"yearGroup\" = 6) as \"y6SumOfClassSizes\"\n        from lwp_school s\n        join lwp_school_class cl on cl.\"schoolId\" = s.id and cl.\"periodIndex\" = 2021\n        join lwp_class_pupil cp on cp.\"lwpSchoolClassId\" = cl.id\n        join lwp_pupil p on cp.\"lwpPupilId\" = p.id\n        join lwp_class_topic ct on ct.\"classId\" = cl.id\n        join lwp_pupil_topic pt on pt.\"classTopicId\" = ct.id and p.id = pt.\"pupilId\"\n        join lwp_pupil_activity pa on pa.\"topicId\" = pt.id\n        left join lwp_pupil_activity_feedback paf on pa.\"feedbackId\" = paf.id\n        group by s.\"schoolName\", s.id"]);
    }

}
