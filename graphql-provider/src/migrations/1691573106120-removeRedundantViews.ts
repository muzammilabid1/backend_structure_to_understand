import { MigrationInterface, QueryRunner } from 'typeorm';

export class removeRedundantViews1691573106120 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP MATERIALIZED VIEW IF EXISTS lwp_school_view`); // this was never properly done in a migration, so we're doing it here.
        await queryRunner.query(`DROP VIEW IF EXISTS easter22schoolcounts`);
        await queryRunner.query(`DROP VIEW IF EXISTS eastereggsperts22`);
        await queryRunner.query(`DROP VIEW IF EXISTS easter22eggsperts;`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE MATERIALIZED VIEW IF NOT EXISTS public.lwp_school_view
        TABLESPACE pg_default
        AS SELECT s."schoolName",
            concat('https://explore.learningwithparents.com/school/', s.id::character varying) AS concat,
            s."misIntegration",
            count(DISTINCT cl.id) AS "numClasses",
            ( SELECT sum(sc."classSize") AS sum
                   FROM lwp_school_class sc
                  WHERE sc."schoolId" = s.id AND sc."periodIndex" = 2021) AS "sumOfClassSizes",
            count(DISTINCT
                CASE
                    WHEN p."pupilStatus"::text = 'ACTIVE'::text THEN p.id
                    ELSE NULL::bigint
                END) AS "activePupils",
            count(DISTINCT
                CASE
                    WHEN p."pupilStatus"::text = 'REGISTERED'::text THEN p.id
                    ELSE NULL::bigint
                END) AS "notRecentlyActivePupils",
            count(DISTINCT
                CASE
                    WHEN p."pupilStatus"::text = 'MISSING'::text THEN p.id
                    ELSE NULL::bigint
                END) AS "missingPupils",
            count(DISTINCT
                CASE
                    WHEN pt."earnedStars" >= 1 THEN p.id
                    ELSE NULL::bigint
                END) AS "pupilsWatchedAVideo",
            count(DISTINCT
                CASE
                    WHEN pt."earnedStars" >= 2 THEN p.id
                    ELSE NULL::bigint
                END) AS "pupilsCompletedAnActivity",
            count(DISTINCT
                CASE
                    WHEN pt."earnedStars" >= 1 AND p."isPremium" = true THEN p.id
                    ELSE NULL::bigint
                END) AS "pupilsWatchedAVideoPP",
            count(DISTINCT
                CASE
                    WHEN pt."earnedStars" >= 2 AND p."isPremium" = true THEN p.id
                    ELSE NULL::bigint
                END) AS "pupilsCompletedAnActivityPP",
            count(DISTINCT
                CASE
                    WHEN pt."earnedStars" >= 1 AND p."isPremium" = false THEN p.id
                    ELSE NULL::bigint
                END) AS "pupilsWatchedAVideoNonPP",
            count(DISTINCT
                CASE
                    WHEN pt."earnedStars" >= 2 AND p."isPremium" = false THEN p.id
                    ELSE NULL::bigint
                END) AS "pupilsCompletedAnActivityNonPP",
            count(DISTINCT pt.id) AS "topicsSet",
            count(DISTINCT
                CASE
                    WHEN pt."earnedStars" = 1 THEN pt.id
                    ELSE NULL::bigint
                END) AS "topicsVideoWatched",
            count(DISTINCT
                CASE
                    WHEN pt."earnedStars" = 2 THEN pt.id
                    ELSE NULL::bigint
                END) AS "topicsOneActivityDone",
            count(DISTINCT
                CASE
                    WHEN pt."earnedStars" = 3 THEN pt.id
                    ELSE NULL::bigint
                END) AS "topicsCompleted",
            count(DISTINCT
                CASE
                    WHEN p."isPremium" = true THEN pt.id
                    ELSE NULL::bigint
                END) AS "topicsSetPP",
            count(DISTINCT
                CASE
                    WHEN pt."earnedStars" = 1 AND p."isPremium" = true THEN pt.id
                    ELSE NULL::bigint
                END) AS "topicsVideoWatchedPP",
            count(DISTINCT
                CASE
                    WHEN pt."earnedStars" = 2 AND p."isPremium" = true THEN pt.id
                    ELSE NULL::bigint
                END) AS "topicsOneActivityDonePP",
            count(DISTINCT
                CASE
                    WHEN pt."earnedStars" = 3 AND p."isPremium" = true THEN pt.id
                    ELSE NULL::bigint
                END) AS "topicsCompletedPP",
            count(DISTINCT
                CASE
                    WHEN p."isPremium" = false THEN pt.id
                    ELSE NULL::bigint
                END) AS "topicsSetNonPP",
            count(DISTINCT
                CASE
                    WHEN pt."earnedStars" = 1 AND p."isPremium" = false THEN pt.id
                    ELSE NULL::bigint
                END) AS "topicsVideoWatchedNonPP",
            count(DISTINCT
                CASE
                    WHEN pt."earnedStars" = 2 AND p."isPremium" = false THEN pt.id
                    ELSE NULL::bigint
                END) AS "topicsOneActivityDoneNonPP",
            count(DISTINCT
                CASE
                    WHEN pt."earnedStars" = 3 AND p."isPremium" = false THEN pt.id
                    ELSE NULL::bigint
                END) AS "topicsCompletedNonPP",
            count(DISTINCT
                CASE
                    WHEN p."isPremium" = true THEN p.id
                    ELSE NULL::bigint
                END) AS "premiumYes",
            count(DISTINCT
                CASE
                    WHEN p."isPremium" = false THEN p.id
                    ELSE NULL::bigint
                END) AS "premiumNo",
            count(DISTINCT
                CASE
                    WHEN p."isPremium" IS NULL THEN p.id
                    ELSE NULL::bigint
                END) AS "premiumUnknown",
            avg(pa.rating) AS "averageRating",
            count(DISTINCT
                CASE
                    WHEN cl."yearGroup" = 55 AND (p."pupilStatus"::text = ANY (ARRAY['ACTIVE'::character varying, 'REGISTERED'::character varying]::text[])) THEN p.id
                    ELSE NULL::bigint
                END) AS "eyfsRegdPupils",
            count(DISTINCT
                CASE
                    WHEN cl."yearGroup" = 1 AND (p."pupilStatus"::text = ANY (ARRAY['ACTIVE'::character varying, 'REGISTERED'::character varying]::text[])) THEN p.id
                    ELSE NULL::bigint
                END) AS "y1RegdPupils",
            count(DISTINCT
                CASE
                    WHEN cl."yearGroup" = 2 AND (p."pupilStatus"::text = ANY (ARRAY['ACTIVE'::character varying, 'REGISTERED'::character varying]::text[])) THEN p.id
                    ELSE NULL::bigint
                END) AS "y2RegdPupils",
            count(DISTINCT
                CASE
                    WHEN cl."yearGroup" = 3 AND (p."pupilStatus"::text = ANY (ARRAY['ACTIVE'::character varying, 'REGISTERED'::character varying]::text[])) THEN p.id
                    ELSE NULL::bigint
                END) AS "y3RegdPupils",
            count(DISTINCT
                CASE
                    WHEN cl."yearGroup" = 4 AND (p."pupilStatus"::text = ANY (ARRAY['ACTIVE'::character varying, 'REGISTERED'::character varying]::text[])) THEN p.id
                    ELSE NULL::bigint
                END) AS "y4RegdPupils",
            count(DISTINCT
                CASE
                    WHEN cl."yearGroup" = 5 AND (p."pupilStatus"::text = ANY (ARRAY['ACTIVE'::character varying, 'REGISTERED'::character varying]::text[])) THEN p.id
                    ELSE NULL::bigint
                END) AS "y5RegdPupils",
            count(DISTINCT
                CASE
                    WHEN cl."yearGroup" = 6 AND (p."pupilStatus"::text = ANY (ARRAY['ACTIVE'::character varying, 'REGISTERED'::character varying]::text[])) THEN p.id
                    ELSE NULL::bigint
                END) AS "y6RegdPupils",
            ( SELECT sum(sc."classSize") AS sum
                   FROM lwp_school_class sc
                  WHERE sc."schoolId" = s.id AND sc."periodIndex" = 2021 AND sc."yearGroup" = 55) AS "eyfsSumOfClassSizes",
            ( SELECT sum(sc."classSize") AS sum
                   FROM lwp_school_class sc
                  WHERE sc."schoolId" = s.id AND sc."periodIndex" = 2021 AND sc."yearGroup" = 1) AS "y1SumOfClassSizes",
            ( SELECT sum(sc."classSize") AS sum
                   FROM lwp_school_class sc
                  WHERE sc."schoolId" = s.id AND sc."periodIndex" = 2021 AND sc."yearGroup" = 2) AS "y2SumOfClassSizes",
            ( SELECT sum(sc."classSize") AS sum
                   FROM lwp_school_class sc
                  WHERE sc."schoolId" = s.id AND sc."periodIndex" = 2021 AND sc."yearGroup" = 3) AS "y3SumOfClassSizes",
            ( SELECT sum(sc."classSize") AS sum
                   FROM lwp_school_class sc
                  WHERE sc."schoolId" = s.id AND sc."periodIndex" = 2021 AND sc."yearGroup" = 4) AS "y4SumOfClassSizes",
            ( SELECT sum(sc."classSize") AS sum
                   FROM lwp_school_class sc
                  WHERE sc."schoolId" = s.id AND sc."periodIndex" = 2021 AND sc."yearGroup" = 5) AS "y5SumOfClassSizes",
            ( SELECT sum(sc."classSize") AS sum
                   FROM lwp_school_class sc
                  WHERE sc."schoolId" = s.id AND sc."periodIndex" = 2021 AND sc."yearGroup" = 6) AS "y6SumOfClassSizes"
           FROM lwp_school s
             JOIN lwp_school_class cl ON cl."schoolId" = s.id AND cl."periodIndex" = 2021
             JOIN lwp_class_pupil cp ON cp."lwpSchoolClassId" = cl.id
             JOIN lwp_pupil p ON cp."lwpPupilId" = p.id
             JOIN lwp_class_topic ct ON ct."classId" = cl.id
             JOIN lwp_pupil_topic pt ON pt."classTopicId" = ct.id AND p.id = pt."pupilId"
             JOIN lwp_pupil_activity pa ON pa."topicId" = pt.id
          GROUP BY s."schoolName", s.id
        WITH DATA;`);

        await queryRunner.query(`CREATE OR REPLACE VIEW public.eastereggsperts22
        AS SELECT p.id AS pupilid,
            c.id AS classid,
            p."schoolId" AS schoolid
           FROM lwp_pupil p
             JOIN lwp_class_pupil cp ON p.id = cp."lwpPupilId"
             JOIN lwp_school_class c ON c.id = cp."lwpSchoolClassId" AND c."periodIndex" = 2021
             JOIN lwp_class_topic ct ON ct."classId" = c.id AND ct."releaseDate" >= '2021-09-01 00:00:00'::timestamp without time zone AND ct."releaseDate" <= '2021-12-31 00:00:00'::timestamp without time zone
             JOIN lwp_pupil_topic pt ON pt."classTopicId" = ct.id AND pt."pupilId" = p.id
          GROUP BY p.id, c.id
         HAVING min(
                CASE
                    WHEN pt."earnedStars" IS NULL THEN 0
                    ELSE pt."earnedStars"
                END) > 1;`);

        await queryRunner.query(`CREATE OR REPLACE VIEW public.easter22eggsperts
          AS SELECT p.id AS pupilid,
              c.id AS classid,
              p."schoolId" AS schoolid
             FROM lwp_pupil p
               JOIN lwp_class_pupil cp ON p.id = cp."lwpPupilId"
               JOIN lwp_school_class c ON c.id = cp."lwpSchoolClassId" AND c."periodIndex" = 2021
               JOIN lwp_class_topic ct ON ct."classId" = c.id AND ct."releaseDate" >= '2022-01-01 00:00:00'::timestamp without time zone AND ct."releaseDate" <= '2022-04-15 00:00:00'::timestamp without time zone
               JOIN lwp_pupil_topic pt ON pt."classTopicId" = ct.id AND pt."pupilId" = p.id
            GROUP BY p.id, c.id
           HAVING min(
                  CASE
                      WHEN pt."earnedStars" IS NULL THEN 0
                      ELSE pt."earnedStars"
                  END) > 1;`);

        await queryRunner.query(`CREATE OR REPLACE VIEW public.easter22schoolcounts
        AS SELECT s."schoolName" AS school,
            count(*) AS total_easter_eggsperts,
            sum(
                CASE
                    WHEN p."isPremium" = true THEN 1
                    ELSE 0
                END) AS pupil_premium,
            sum(
                CASE
                    WHEN p."isPremium" = false THEN 1
                    ELSE 0
                END) AS non_pupil_premium
            FROM lwp_school s
            JOIN lwp_pupil p ON p."schoolId" = s.id
            JOIN easter22eggsperts ON p.id = easter22eggsperts.pupilid
        GROUP BY s."schoolName";`);
    }
}
