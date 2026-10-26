import {MigrationInterface, QueryRunner} from "typeorm";

export class migration1656094275876 implements MigrationInterface {
    name = 'migration1656094275876'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "static_lwp_admin_query" ("name" character varying NOT NULL, "sqlQuery" character varying NOT NULL, "order" integer NOT NULL, "csvFileLocation" character varying, "lastCsvGenerated" TIMESTAMP, "id" BIGSERIAL NOT NULL, "logCreatedAt" TIMESTAMP DEFAULT ('now'::text)::timestamp(6) with time zone, "logUpdatedAt" TIMESTAMP NOT NULL DEFAULT ('now'::text)::timestamp(6) with time zone, "logCreatedById" bigint, "logUpdatedById" bigint, CONSTRAINT "PK_c220f8def2bf479a2edc756a985" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "lwp_school" ADD "enableSchoolCode" boolean NOT NULL DEFAULT false`);
        await queryRunner.query(`ALTER TABLE "lwp_school" ADD "inactive" boolean NOT NULL DEFAULT false`);
        await queryRunner.query(`ALTER TABLE "lwp_school" ADD "signUpCode" character varying`);
        await queryRunner.query(`ALTER TABLE "lwp_school" ADD "logo" character varying`);
        await queryRunner.query(`ALTER TABLE "lwp_school" ADD "buttonColor" character varying`);
        await queryRunner.query(`ALTER TABLE "lwp_school" ADD "buttonTextColor" character varying`);
        await queryRunner.query(`ALTER TABLE "lwp_pupil_topic" ADD "readingTarget" integer`);
        await queryRunner.query(`ALTER TABLE "lwp_class_topic" ADD "readingTarget" integer`);
        await queryRunner.query(`ALTER TABLE "lwp_school_class" ADD "readingTarget" integer NOT NULL DEFAULT '5'`);
        await queryRunner.query(`ALTER TABLE "static_lwp_admin_query" ADD CONSTRAINT "FK_0a85cd33702c81d9d6dfeda6bfb" FOREIGN KEY ("logCreatedById") REFERENCES "lwp_user"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "static_lwp_admin_query" ADD CONSTRAINT "FK_941cf21b1baa1009ca8700369c8" FOREIGN KEY ("logUpdatedById") REFERENCES "lwp_user"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
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
        group by s."schoolName", s.id
    `);
        await queryRunner.query(`INSERT INTO "typeorm_metadata"("database", "schema", "table", "type", "name", "value") VALUES (DEFAULT, $1, DEFAULT, $2, $3, $4)`, ["public","MATERIALIZED_VIEW","lwp_school_view","select\n        s.\"schoolName\",\n        concat('https://explore.learningwithparents.com/school/', s.id::varchar),\n        s.\"misIntegration\",\n        count(distinct cl.id) as \"numClasses\",\n        (\n            select sum(sc.\"classSize\")\n            from lwp_school_class sc\n            where sc.\"schoolId\" = s.id\n            and sc.\"periodIndex\" = 2021\n        ) as \"sumOfClassSizes\",\n        count(distinct case when p.\"pupilStatus\" = 'ACTIVE' then p.id else null end) as \"activePupils\",\n        count(distinct case when p.\"pupilStatus\" = 'REGISTERED' then p.id else null end) as \"notRecentlyActivePupils\",\n        count(distinct case when p.\"pupilStatus\" = 'MISSING' then p.id else null end) as \"missingPupils\",\n        count(distinct case when pt.\"earnedStars\" >= 1 then p.id else null end) as \"pupilsWatchedAVideo\",\n        count(distinct case when pt.\"earnedStars\" >= 2 then p.id else null end) as \"pupilsCompletedAnActivity\",\n        count(distinct case when pt.\"earnedStars\" >= 1 and p.\"isPremium\" = true then p.id else null end) as \"pupilsWatchedAVideoPP\",\n        count(distinct case when pt.\"earnedStars\" >= 2 and p.\"isPremium\" = true then p.id else null end) as \"pupilsCompletedAnActivityPP\",\n        count(distinct case when pt.\"earnedStars\" >= 1 and p.\"isPremium\" = false then p.id else null end) as \"pupilsWatchedAVideoNonPP\",\n        count(distinct case when pt.\"earnedStars\" >= 2 and p.\"isPremium\" = false then p.id else null end) as \"pupilsCompletedAnActivityNonPP\",\n        count(distinct pt.id) as \"topicsSet\",\n        count(distinct case when pt.\"earnedStars\" = 1 then pt.id else null end) as \"topicsVideoWatched\",\n        count(distinct case when pt.\"earnedStars\" = 2 then pt.id else null end) as \"topicsOneActivityDone\",\n        count(distinct case when pt.\"earnedStars\" = 3 then pt.id else null end) as \"topicsCompleted\",\n        count(distinct case when p.\"isPremium\" = true then pt.id else null end) as \"topicsSetPP\",\n        count(distinct case when pt.\"earnedStars\" = 1 and p.\"isPremium\" = true then pt.id else null end) as \"topicsVideoWatchedPP\",\n        count(distinct case when pt.\"earnedStars\" = 2 and p.\"isPremium\" = true then pt.id else null end) as \"topicsOneActivityDonePP\",\n        count(distinct case when pt.\"earnedStars\" = 3 and p.\"isPremium\" = true then pt.id else null end) as \"topicsCompletedPP\",\n        count(distinct case when p.\"isPremium\" = false then pt.id else null end) as \"topicsSetNonPP\",\n        count(distinct case when pt.\"earnedStars\" = 1 and p.\"isPremium\" = false then pt.id else null end) as \"topicsVideoWatchedNonPP\",\n        count(distinct case when pt.\"earnedStars\" = 2 and p.\"isPremium\" = false then pt.id else null end) as \"topicsOneActivityDoneNonPP\",\n        count(distinct case when pt.\"earnedStars\" = 3 and p.\"isPremium\" = false then pt.id else null end) as \"topicsCompletedNonPP\",\n        count(case when pa.\"accessedCount\" > 0 then 1 else null end) as \"activitiesAccessed\",\n        count(case when paf.id is not null then 1 else null end) as \"activityFeedEntries\",\n        count(case when paf.\"parentComment\" is not null then 1 else null end) as \"familyComments\",\n        count(case when paf.\"pupilComment\" is not null then 1 else null end) as \"childComments\",\n        count(case when paf.photo is not null then 1 else null end) as photos,\n        count(distinct case when p.\"isPremium\" = true then p.id else null end) as \"premiumYes\",\n        count(distinct case when p.\"isPremium\" = false then p.id else null end) as \"premiumNo\",\n        count(distinct case when p.\"isPremium\" is null then p.id else null end) as \"premiumUnknown\",\n        AVG(rating) as \"averageRating\",\n        count(case when cl.\"yearGroup\" = 55 and paf.id is not null then 1 else null end) as \"eyfsCommentsAndPhotos\",\n        count(case when cl.\"yearGroup\" = 1 and paf.id is not null then 1 else null end) as \"y1CommentsAndPhotos\",\n        count(case when cl.\"yearGroup\" = 2 and paf.id is not null then 1 else null end) as \"y2CommentsAndPhotos\",\n        count(case when cl.\"yearGroup\" = 3 and paf.id is not null then 1 else null end) as \"y3CommentsAndPhotos\",\n        count(case when cl.\"yearGroup\" = 4 and paf.id is not null then 1 else null end) as \"y4CommentsAndPhotos\",\n        count(case when cl.\"yearGroup\" = 5 and paf.id is not null then 1 else null end) as \"y5CommentsAndPhotos\",\n        count(case when cl.\"yearGroup\" = 6 and paf.id is not null then 1 else null end) as \"y6CommentsAndPhotos\",\n        count(distinct case when cl.\"yearGroup\" = 55 and p.\"pupilStatus\" in ('ACTIVE', 'REGISTERED') then p.id else null end) as \"eyfsRegdPupils\",\n        count(distinct case when cl.\"yearGroup\" = 1 and p.\"pupilStatus\" in ('ACTIVE', 'REGISTERED') then p.id else null end) as \"y1RegdPupils\",\n        count(distinct case when cl.\"yearGroup\" = 2 and p.\"pupilStatus\" in ('ACTIVE', 'REGISTERED') then p.id else null end) as \"y2RegdPupils\",\n        count(distinct case when cl.\"yearGroup\" = 3 and p.\"pupilStatus\" in ('ACTIVE', 'REGISTERED') then p.id else null end) as \"y3RegdPupils\",\n        count(distinct case when cl.\"yearGroup\" = 4 and p.\"pupilStatus\" in ('ACTIVE', 'REGISTERED') then p.id else null end) as \"y4RegdPupils\",\n        count(distinct case when cl.\"yearGroup\" = 5 and p.\"pupilStatus\" in ('ACTIVE', 'REGISTERED') then p.id else null end) as \"y5RegdPupils\",\n        count(distinct case when cl.\"yearGroup\" = 6 and p.\"pupilStatus\" in ('ACTIVE', 'REGISTERED') then p.id else null end) as \"y6RegdPupils\",\n        (select sum(sc.\"classSize\") from lwp_school_class sc where sc.\"schoolId\" = s.id and sc.\"periodIndex\" = 2021 and sc.\"yearGroup\" = 55) as \"eyfsSumOfClassSizes\",\n        (select sum(sc.\"classSize\") from lwp_school_class sc where sc.\"schoolId\" = s.id and sc.\"periodIndex\" = 2021 and sc.\"yearGroup\" = 1) as \"y1SumOfClassSizes\",\n        (select sum(sc.\"classSize\") from lwp_school_class sc where sc.\"schoolId\" = s.id and sc.\"periodIndex\" = 2021 and sc.\"yearGroup\" = 2) as \"y2SumOfClassSizes\",\n        (select sum(sc.\"classSize\") from lwp_school_class sc where sc.\"schoolId\" = s.id and sc.\"periodIndex\" = 2021 and sc.\"yearGroup\" = 3) as \"y3SumOfClassSizes\",\n        (select sum(sc.\"classSize\") from lwp_school_class sc where sc.\"schoolId\" = s.id and sc.\"periodIndex\" = 2021 and sc.\"yearGroup\" = 4) as \"y4SumOfClassSizes\",\n        (select sum(sc.\"classSize\") from lwp_school_class sc where sc.\"schoolId\" = s.id and sc.\"periodIndex\" = 2021 and sc.\"yearGroup\" = 5) as \"y5SumOfClassSizes\",\n        (select sum(sc.\"classSize\") from lwp_school_class sc where sc.\"schoolId\" = s.id and sc.\"periodIndex\" = 2021 and sc.\"yearGroup\" = 6) as \"y6SumOfClassSizes\"\n        from lwp_school s\n        join lwp_school_class cl on cl.\"schoolId\" = s.id and cl.\"periodIndex\" = 2021\n        join lwp_class_pupil cp on cp.\"lwpSchoolClassId\" = cl.id\n        join lwp_pupil p on cp.\"lwpPupilId\" = p.id\n        join lwp_class_topic ct on ct.\"classId\" = cl.id\n        join lwp_pupil_topic pt on pt.\"classTopicId\" = ct.id and p.id = pt.\"pupilId\"\n        join lwp_pupil_activity pa on pa.\"topicId\" = pt.id\n        left join lwp_pupil_activity_feedback paf on pa.\"feedbackId\" = paf.id\n        group by s.\"schoolName\", s.id"]);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DELETE FROM "typeorm_metadata" WHERE "type" = $1 AND "name" = $2 AND "schema" = $3`, ["MATERIALIZED_VIEW","lwp_school_view","public"]);
        await queryRunner.query(`DROP MATERIALIZED VIEW "lwp_school_view"`);
        await queryRunner.query(`ALTER TABLE "static_lwp_admin_query" DROP CONSTRAINT "FK_941cf21b1baa1009ca8700369c8"`);
        await queryRunner.query(`ALTER TABLE "static_lwp_admin_query" DROP CONSTRAINT "FK_0a85cd33702c81d9d6dfeda6bfb"`);
        await queryRunner.query(`ALTER TABLE "lwp_school_class" DROP COLUMN "readingTarget"`);
        await queryRunner.query(`ALTER TABLE "lwp_class_topic" DROP COLUMN "readingTarget"`);
        await queryRunner.query(`ALTER TABLE "lwp_pupil_topic" DROP COLUMN "readingTarget"`);
        await queryRunner.query(`ALTER TABLE "lwp_school" DROP COLUMN "buttonTextColor"`);
        await queryRunner.query(`ALTER TABLE "lwp_school" DROP COLUMN "buttonColor"`);
        await queryRunner.query(`ALTER TABLE "lwp_school" DROP COLUMN "logo"`);
        await queryRunner.query(`ALTER TABLE "lwp_school" DROP COLUMN "signUpCode"`);
        await queryRunner.query(`ALTER TABLE "lwp_school" DROP COLUMN "inactive"`);
        await queryRunner.query(`ALTER TABLE "lwp_school" DROP COLUMN "enableSchoolCode"`);
        await queryRunner.query(`DROP TABLE "static_lwp_admin_query"`);
    }

}
