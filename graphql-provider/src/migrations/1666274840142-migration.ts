import {MigrationInterface, QueryRunner} from "typeorm";

export class migration1666274840142 implements MigrationInterface {
    name = 'migration1666274840142'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DELETE FROM "typeorm_metadata" WHERE "type" = $1 AND "name" = $2 AND "schema" = $3`, ["MATERIALIZED_VIEW","lwp_school_view","public"]);
        await queryRunner.query(`DROP MATERIALIZED VIEW "lwp_school_view"`);
        await queryRunner.query(`ALTER TABLE "lwp_pupil_trophy" DROP COLUMN "isEmailSentTeacher"`);
        await queryRunner.query(`ALTER TABLE "lwp_pupil_trophy" DROP COLUMN "isEmailSentPupil"`);
        await queryRunner.query(`ALTER TABLE "log_lwp_email_sms" DROP COLUMN "templateId"`);
        await queryRunner.query(`ALTER TABLE "log_lwp_email_sms" DROP COLUMN "content"`);
        await queryRunner.query(`ALTER TABLE "static_lwp_topic" DROP COLUMN "alternativeYear"`);
        await queryRunner.query(`ALTER TABLE "static_lwp_topic" DROP COLUMN "yearGroup"`);
        await queryRunner.query(`ALTER TABLE "lwp_class_topic" DROP COLUMN "mwpMathscotItems"`);
        await queryRunner.query(`ALTER TABLE "lwp_pupil_activity" DROP COLUMN "feedbackId"`);
        await queryRunner.query(`ALTER TABLE "lwp_pupil_activity" DROP COLUMN "accessedCount"`);
        await queryRunner.query(`ALTER TABLE "lwp_pupil_topic" DROP COLUMN "mwpMathscotItem"`);
        await queryRunner.query(`ALTER TABLE "lwp_pupil_feedback" DROP COLUMN "mwpMedia"`);
        await queryRunner.query(`ALTER TABLE "static_lwp_email_template" ADD "logEmailSmsId" bigint`);
        await queryRunner.query(`ALTER TABLE "static_lwp_email_template" ADD CONSTRAINT "UQ_fb19a6933e884b715b64ab79325" UNIQUE ("logEmailSmsId")`);
        await queryRunner.query(`ALTER TABLE "wonde_school" ADD "wondeIgnoredContacts" integer`);
        await queryRunner.query(`ALTER TABLE "lwp_school" ADD "isTestSchool" boolean NOT NULL DEFAULT false`);
        await queryRunner.query(`ALTER TABLE "lwp_school" ADD "urn" character varying`);
        await queryRunner.query(`ALTER TABLE "lwp_school" ADD CONSTRAINT "UQ_e99d671aedbb98d8b468ea39b2e" UNIQUE ("urn")`);
        await queryRunner.query(`ALTER TABLE "lwp_school" ADD "IsReadingLogsEnabled" boolean NOT NULL DEFAULT false`);
        await queryRunner.query(`ALTER TABLE "lwp_school" ADD "wondeUpdateStatusAt" TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE "lwp_pupil_activity" ADD "logFirstAccessed" TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE "lwp_pupil_activity" ADD "logLastAccessed" TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE "lwp_pupil_activity" ADD "logAccessedOnDesktop" integer NOT NULL DEFAULT '0'`);
        await queryRunner.query(`ALTER TABLE "lwp_pupil_activity" ADD "logAccessedOnMobile" integer NOT NULL DEFAULT '0'`);
        await queryRunner.query(`ALTER TABLE "lwp_pupil_topic" ADD "logAccessedOnDesktop" integer NOT NULL DEFAULT '0'`);
        await queryRunner.query(`ALTER TABLE "lwp_pupil_topic" ADD "logAccessedOnMobile" integer NOT NULL DEFAULT '0'`);
        await queryRunner.query(`ALTER TABLE "lwp_pupil_feedback" ADD "logSubmittedOnDesktop" integer NOT NULL DEFAULT '0'`);
        await queryRunner.query(`ALTER TABLE "lwp_pupil_feedback" ADD "logSubmittedOnMobile" integer NOT NULL DEFAULT '0'`);
        await queryRunner.query(`ALTER TABLE "static_lwp_interstitial" ADD "lastAction" character varying NOT NULL DEFAULT 'CREATED'`);
        await queryRunner.query(`ALTER TABLE "static_lwp_interstitial" ADD "lastActionAt" TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE "static_lwp_activity_steps" ADD "checklistImageData" character varying`);
        await queryRunner.query(`ALTER TABLE "static_lwp_email_template" ADD CONSTRAINT "FK_fb19a6933e884b715b64ab79325" FOREIGN KEY ("logEmailSmsId") REFERENCES "log_lwp_email_sms"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
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
        await queryRunner.query(`INSERT INTO "typeorm_metadata"("database", "schema", "table", "type", "name", "value") VALUES (DEFAULT, $1, DEFAULT, $2, $3, $4)`, ["public","MATERIALIZED_VIEW","lwp_school_view","select\n        s.\"schoolName\",\n        concat('https://explore.learningwithparents.com/school/', s.id::varchar),\n        s.\"misIntegration\",\n        count(distinct cl.id) as \"numClasses\",\n        (\n            select sum(sc.\"classSize\")\n            from lwp_school_class sc\n            where sc.\"schoolId\" = s.id\n            and sc.\"periodIndex\" = 2021\n        ) as \"sumOfClassSizes\",\n        count(distinct case when p.\"pupilStatus\" = 'ACTIVE' then p.id else null end) as \"activePupils\",\n        count(distinct case when p.\"pupilStatus\" = 'REGISTERED' then p.id else null end) as \"notRecentlyActivePupils\",\n        count(distinct case when p.\"pupilStatus\" = 'MISSING' then p.id else null end) as \"missingPupils\",\n        count(distinct case when pt.\"earnedStars\" >= 1 then p.id else null end) as \"pupilsWatchedAVideo\",\n        count(distinct case when pt.\"earnedStars\" >= 2 then p.id else null end) as \"pupilsCompletedAnActivity\",\n        count(distinct case when pt.\"earnedStars\" >= 1 and p.\"isPremium\" = true then p.id else null end) as \"pupilsWatchedAVideoPP\",\n        count(distinct case when pt.\"earnedStars\" >= 2 and p.\"isPremium\" = true then p.id else null end) as \"pupilsCompletedAnActivityPP\",\n        count(distinct case when pt.\"earnedStars\" >= 1 and p.\"isPremium\" = false then p.id else null end) as \"pupilsWatchedAVideoNonPP\",\n        count(distinct case when pt.\"earnedStars\" >= 2 and p.\"isPremium\" = false then p.id else null end) as \"pupilsCompletedAnActivityNonPP\",\n        count(distinct pt.id) as \"topicsSet\",\n        count(distinct case when pt.\"earnedStars\" = 1 then pt.id else null end) as \"topicsVideoWatched\",\n        count(distinct case when pt.\"earnedStars\" = 2 then pt.id else null end) as \"topicsOneActivityDone\",\n        count(distinct case when pt.\"earnedStars\" = 3 then pt.id else null end) as \"topicsCompleted\",\n        count(distinct case when p.\"isPremium\" = true then pt.id else null end) as \"topicsSetPP\",\n        count(distinct case when pt.\"earnedStars\" = 1 and p.\"isPremium\" = true then pt.id else null end) as \"topicsVideoWatchedPP\",\n        count(distinct case when pt.\"earnedStars\" = 2 and p.\"isPremium\" = true then pt.id else null end) as \"topicsOneActivityDonePP\",\n        count(distinct case when pt.\"earnedStars\" = 3 and p.\"isPremium\" = true then pt.id else null end) as \"topicsCompletedPP\",\n        count(distinct case when p.\"isPremium\" = false then pt.id else null end) as \"topicsSetNonPP\",\n        count(distinct case when pt.\"earnedStars\" = 1 and p.\"isPremium\" = false then pt.id else null end) as \"topicsVideoWatchedNonPP\",\n        count(distinct case when pt.\"earnedStars\" = 2 and p.\"isPremium\" = false then pt.id else null end) as \"topicsOneActivityDoneNonPP\",\n        count(distinct case when pt.\"earnedStars\" = 3 and p.\"isPremium\" = false then pt.id else null end) as \"topicsCompletedNonPP\",\n        count(distinct case when p.\"isPremium\" = true then p.id else null end) as \"premiumYes\",\n        count(distinct case when p.\"isPremium\" = false then p.id else null end) as \"premiumNo\",\n        count(distinct case when p.\"isPremium\" is null then p.id else null end) as \"premiumUnknown\",\n        AVG(rating) as \"averageRating\",\n        count(distinct case when cl.\"yearGroup\" = 55 and p.\"pupilStatus\" in ('ACTIVE', 'REGISTERED') then p.id else null end) as \"eyfsRegdPupils\",\n        count(distinct case when cl.\"yearGroup\" = 1 and p.\"pupilStatus\" in ('ACTIVE', 'REGISTERED') then p.id else null end) as \"y1RegdPupils\",\n        count(distinct case when cl.\"yearGroup\" = 2 and p.\"pupilStatus\" in ('ACTIVE', 'REGISTERED') then p.id else null end) as \"y2RegdPupils\",\n        count(distinct case when cl.\"yearGroup\" = 3 and p.\"pupilStatus\" in ('ACTIVE', 'REGISTERED') then p.id else null end) as \"y3RegdPupils\",\n        count(distinct case when cl.\"yearGroup\" = 4 and p.\"pupilStatus\" in ('ACTIVE', 'REGISTERED') then p.id else null end) as \"y4RegdPupils\",\n        count(distinct case when cl.\"yearGroup\" = 5 and p.\"pupilStatus\" in ('ACTIVE', 'REGISTERED') then p.id else null end) as \"y5RegdPupils\",\n        count(distinct case when cl.\"yearGroup\" = 6 and p.\"pupilStatus\" in ('ACTIVE', 'REGISTERED') then p.id else null end) as \"y6RegdPupils\",\n        (select sum(sc.\"classSize\") from lwp_school_class sc where sc.\"schoolId\" = s.id and sc.\"periodIndex\" = 2021 and sc.\"yearGroup\" = 55) as \"eyfsSumOfClassSizes\",\n        (select sum(sc.\"classSize\") from lwp_school_class sc where sc.\"schoolId\" = s.id and sc.\"periodIndex\" = 2021 and sc.\"yearGroup\" = 1) as \"y1SumOfClassSizes\",\n        (select sum(sc.\"classSize\") from lwp_school_class sc where sc.\"schoolId\" = s.id and sc.\"periodIndex\" = 2021 and sc.\"yearGroup\" = 2) as \"y2SumOfClassSizes\",\n        (select sum(sc.\"classSize\") from lwp_school_class sc where sc.\"schoolId\" = s.id and sc.\"periodIndex\" = 2021 and sc.\"yearGroup\" = 3) as \"y3SumOfClassSizes\",\n        (select sum(sc.\"classSize\") from lwp_school_class sc where sc.\"schoolId\" = s.id and sc.\"periodIndex\" = 2021 and sc.\"yearGroup\" = 4) as \"y4SumOfClassSizes\",\n        (select sum(sc.\"classSize\") from lwp_school_class sc where sc.\"schoolId\" = s.id and sc.\"periodIndex\" = 2021 and sc.\"yearGroup\" = 5) as \"y5SumOfClassSizes\",\n        (select sum(sc.\"classSize\") from lwp_school_class sc where sc.\"schoolId\" = s.id and sc.\"periodIndex\" = 2021 and sc.\"yearGroup\" = 6) as \"y6SumOfClassSizes\"\n        from lwp_school s\n        join lwp_school_class cl on cl.\"schoolId\" = s.id and cl.\"periodIndex\" = 2021\n        join lwp_class_pupil cp on cp.\"lwpSchoolClassId\" = cl.id\n        join lwp_pupil p on cp.\"lwpPupilId\" = p.id\n        join lwp_class_topic ct on ct.\"classId\" = cl.id\n        join lwp_pupil_topic pt on pt.\"classTopicId\" = ct.id and p.id = pt.\"pupilId\"\n        join lwp_pupil_activity pa on pa.\"topicId\" = pt.id\n        group by s.\"schoolName\", s.id"]);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DELETE FROM "typeorm_metadata" WHERE "type" = $1 AND "name" = $2 AND "schema" = $3`, ["MATERIALIZED_VIEW","lwp_school_view","public"]);
        await queryRunner.query(`DROP MATERIALIZED VIEW "lwp_school_view"`);
        await queryRunner.query(`ALTER TABLE "static_lwp_email_template" DROP CONSTRAINT "FK_fb19a6933e884b715b64ab79325"`);
        await queryRunner.query(`ALTER TABLE "static_lwp_activity_steps" DROP COLUMN "checklistImageData"`);
        await queryRunner.query(`ALTER TABLE "static_lwp_interstitial" DROP COLUMN "lastActionAt"`);
        await queryRunner.query(`ALTER TABLE "static_lwp_interstitial" DROP COLUMN "lastAction"`);
        await queryRunner.query(`ALTER TABLE "lwp_pupil_feedback" DROP COLUMN "logSubmittedOnMobile"`);
        await queryRunner.query(`ALTER TABLE "lwp_pupil_feedback" DROP COLUMN "logSubmittedOnDesktop"`);
        await queryRunner.query(`ALTER TABLE "lwp_pupil_topic" DROP COLUMN "logAccessedOnMobile"`);
        await queryRunner.query(`ALTER TABLE "lwp_pupil_topic" DROP COLUMN "logAccessedOnDesktop"`);
        await queryRunner.query(`ALTER TABLE "lwp_pupil_activity" DROP COLUMN "logAccessedOnMobile"`);
        await queryRunner.query(`ALTER TABLE "lwp_pupil_activity" DROP COLUMN "logAccessedOnDesktop"`);
        await queryRunner.query(`ALTER TABLE "lwp_pupil_activity" DROP COLUMN "logLastAccessed"`);
        await queryRunner.query(`ALTER TABLE "lwp_pupil_activity" DROP COLUMN "logFirstAccessed"`);
        await queryRunner.query(`ALTER TABLE "lwp_school" DROP COLUMN "wondeUpdateStatusAt"`);
        await queryRunner.query(`ALTER TABLE "lwp_school" DROP COLUMN "IsReadingLogsEnabled"`);
        await queryRunner.query(`ALTER TABLE "lwp_school" DROP CONSTRAINT "UQ_e99d671aedbb98d8b468ea39b2e"`);
        await queryRunner.query(`ALTER TABLE "lwp_school" DROP COLUMN "urn"`);
        await queryRunner.query(`ALTER TABLE "lwp_school" DROP COLUMN "isTestSchool"`);
        await queryRunner.query(`ALTER TABLE "wonde_school" DROP COLUMN "wondeIgnoredContacts"`);
        await queryRunner.query(`ALTER TABLE "static_lwp_email_template" DROP CONSTRAINT "UQ_fb19a6933e884b715b64ab79325"`);
        await queryRunner.query(`ALTER TABLE "static_lwp_email_template" DROP COLUMN "logEmailSmsId"`);
        await queryRunner.query(`ALTER TABLE "lwp_pupil_feedback" ADD "mwpMedia" character varying`);
        await queryRunner.query(`ALTER TABLE "lwp_pupil_topic" ADD "mwpMathscotItem" integer`);
        await queryRunner.query(`ALTER TABLE "lwp_pupil_activity" ADD "accessedCount" integer DEFAULT '0'`);
        await queryRunner.query(`ALTER TABLE "lwp_pupil_activity" ADD "feedbackId" bigint`);
        await queryRunner.query(`ALTER TABLE "lwp_class_topic" ADD "mwpMathscotItems" json`);
        await queryRunner.query(`ALTER TABLE "static_lwp_topic" ADD "yearGroup" bigint`);
        await queryRunner.query(`ALTER TABLE "static_lwp_topic" ADD "alternativeYear" bigint`);
        await queryRunner.query(`ALTER TABLE "log_lwp_email_sms" ADD "content" jsonb`);
        await queryRunner.query(`ALTER TABLE "log_lwp_email_sms" ADD "templateId" integer`);
        await queryRunner.query(`ALTER TABLE "lwp_pupil_trophy" ADD "isEmailSentPupil" boolean`);
        await queryRunner.query(`ALTER TABLE "lwp_pupil_trophy" ADD "isEmailSentTeacher" boolean`);
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
        group by s."schoolName", s.id`);
        await queryRunner.query(`INSERT INTO "typeorm_metadata"("database", "schema", "table", "type", "name", "value") VALUES (DEFAULT, $1, DEFAULT, $2, $3, $4)`, ["public","MATERIALIZED_VIEW","lwp_school_view","select\n        s.\"schoolName\",\n        concat('https://explore.learningwithparents.com/school/', s.id::varchar),\n        s.\"misIntegration\",\n        count(distinct cl.id) as \"numClasses\",\n        (\n            select sum(sc.\"classSize\")\n            from lwp_school_class sc\n            where sc.\"schoolId\" = s.id\n            and sc.\"periodIndex\" = 2021\n        ) as \"sumOfClassSizes\",\n        count(distinct case when p.\"pupilStatus\" = 'ACTIVE' then p.id else null end) as \"activePupils\",\n        count(distinct case when p.\"pupilStatus\" = 'REGISTERED' then p.id else null end) as \"notRecentlyActivePupils\",\n        count(distinct case when p.\"pupilStatus\" = 'MISSING' then p.id else null end) as \"missingPupils\",\n        count(distinct case when pt.\"earnedStars\" >= 1 then p.id else null end) as \"pupilsWatchedAVideo\",\n        count(distinct case when pt.\"earnedStars\" >= 2 then p.id else null end) as \"pupilsCompletedAnActivity\",\n        count(distinct case when pt.\"earnedStars\" >= 1 and p.\"isPremium\" = true then p.id else null end) as \"pupilsWatchedAVideoPP\",\n        count(distinct case when pt.\"earnedStars\" >= 2 and p.\"isPremium\" = true then p.id else null end) as \"pupilsCompletedAnActivityPP\",\n        count(distinct case when pt.\"earnedStars\" >= 1 and p.\"isPremium\" = false then p.id else null end) as \"pupilsWatchedAVideoNonPP\",\n        count(distinct case when pt.\"earnedStars\" >= 2 and p.\"isPremium\" = false then p.id else null end) as \"pupilsCompletedAnActivityNonPP\",\n        count(distinct pt.id) as \"topicsSet\",\n        count(distinct case when pt.\"earnedStars\" = 1 then pt.id else null end) as \"topicsVideoWatched\",\n        count(distinct case when pt.\"earnedStars\" = 2 then pt.id else null end) as \"topicsOneActivityDone\",\n        count(distinct case when pt.\"earnedStars\" = 3 then pt.id else null end) as \"topicsCompleted\",\n        count(distinct case when p.\"isPremium\" = true then pt.id else null end) as \"topicsSetPP\",\n        count(distinct case when pt.\"earnedStars\" = 1 and p.\"isPremium\" = true then pt.id else null end) as \"topicsVideoWatchedPP\",\n        count(distinct case when pt.\"earnedStars\" = 2 and p.\"isPremium\" = true then pt.id else null end) as \"topicsOneActivityDonePP\",\n        count(distinct case when pt.\"earnedStars\" = 3 and p.\"isPremium\" = true then pt.id else null end) as \"topicsCompletedPP\",\n        count(distinct case when p.\"isPremium\" = false then pt.id else null end) as \"topicsSetNonPP\",\n        count(distinct case when pt.\"earnedStars\" = 1 and p.\"isPremium\" = false then pt.id else null end) as \"topicsVideoWatchedNonPP\",\n        count(distinct case when pt.\"earnedStars\" = 2 and p.\"isPremium\" = false then pt.id else null end) as \"topicsOneActivityDoneNonPP\",\n        count(distinct case when pt.\"earnedStars\" = 3 and p.\"isPremium\" = false then pt.id else null end) as \"topicsCompletedNonPP\",\n        count(case when pa.\"accessedCount\" > 0 then 1 else null end) as \"activitiesAccessed\",\n        count(distinct case when p.\"isPremium\" = true then p.id else null end) as \"premiumYes\",\n        count(distinct case when p.\"isPremium\" = false then p.id else null end) as \"premiumNo\",\n        count(distinct case when p.\"isPremium\" is null then p.id else null end) as \"premiumUnknown\",\n        AVG(rating) as \"averageRating\",\n        count(distinct case when cl.\"yearGroup\" = 55 and p.\"pupilStatus\" in ('ACTIVE', 'REGISTERED') then p.id else null end) as \"eyfsRegdPupils\",\n        count(distinct case when cl.\"yearGroup\" = 1 and p.\"pupilStatus\" in ('ACTIVE', 'REGISTERED') then p.id else null end) as \"y1RegdPupils\",\n        count(distinct case when cl.\"yearGroup\" = 2 and p.\"pupilStatus\" in ('ACTIVE', 'REGISTERED') then p.id else null end) as \"y2RegdPupils\",\n        count(distinct case when cl.\"yearGroup\" = 3 and p.\"pupilStatus\" in ('ACTIVE', 'REGISTERED') then p.id else null end) as \"y3RegdPupils\",\n        count(distinct case when cl.\"yearGroup\" = 4 and p.\"pupilStatus\" in ('ACTIVE', 'REGISTERED') then p.id else null end) as \"y4RegdPupils\",\n        count(distinct case when cl.\"yearGroup\" = 5 and p.\"pupilStatus\" in ('ACTIVE', 'REGISTERED') then p.id else null end) as \"y5RegdPupils\",\n        count(distinct case when cl.\"yearGroup\" = 6 and p.\"pupilStatus\" in ('ACTIVE', 'REGISTERED') then p.id else null end) as \"y6RegdPupils\",\n        (select sum(sc.\"classSize\") from lwp_school_class sc where sc.\"schoolId\" = s.id and sc.\"periodIndex\" = 2021 and sc.\"yearGroup\" = 55) as \"eyfsSumOfClassSizes\",\n        (select sum(sc.\"classSize\") from lwp_school_class sc where sc.\"schoolId\" = s.id and sc.\"periodIndex\" = 2021 and sc.\"yearGroup\" = 1) as \"y1SumOfClassSizes\",\n        (select sum(sc.\"classSize\") from lwp_school_class sc where sc.\"schoolId\" = s.id and sc.\"periodIndex\" = 2021 and sc.\"yearGroup\" = 2) as \"y2SumOfClassSizes\",\n        (select sum(sc.\"classSize\") from lwp_school_class sc where sc.\"schoolId\" = s.id and sc.\"periodIndex\" = 2021 and sc.\"yearGroup\" = 3) as \"y3SumOfClassSizes\",\n        (select sum(sc.\"classSize\") from lwp_school_class sc where sc.\"schoolId\" = s.id and sc.\"periodIndex\" = 2021 and sc.\"yearGroup\" = 4) as \"y4SumOfClassSizes\",\n        (select sum(sc.\"classSize\") from lwp_school_class sc where sc.\"schoolId\" = s.id and sc.\"periodIndex\" = 2021 and sc.\"yearGroup\" = 5) as \"y5SumOfClassSizes\",\n        (select sum(sc.\"classSize\") from lwp_school_class sc where sc.\"schoolId\" = s.id and sc.\"periodIndex\" = 2021 and sc.\"yearGroup\" = 6) as \"y6SumOfClassSizes\"\n        from lwp_school s\n        join lwp_school_class cl on cl.\"schoolId\" = s.id and cl.\"periodIndex\" = 2021\n        join lwp_class_pupil cp on cp.\"lwpSchoolClassId\" = cl.id\n        join lwp_pupil p on cp.\"lwpPupilId\" = p.id\n        join lwp_class_topic ct on ct.\"classId\" = cl.id\n        join lwp_pupil_topic pt on pt.\"classTopicId\" = ct.id and p.id = pt.\"pupilId\"\n        join lwp_pupil_activity pa on pa.\"topicId\" = pt.id\n        group by s.\"schoolName\", s.id"]);
    }

}
