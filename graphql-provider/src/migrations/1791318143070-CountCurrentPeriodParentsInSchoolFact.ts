import { MigrationInterface, QueryRunner } from 'typeorm';

export class CountCurrentPeriodParentsInSchoolFact1791318143070 implements MigrationInterface {
    name = 'CountCurrentPeriodParentsInSchoolFact1791318143070';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Same as migration 1780444800000 except that constants takes only the latest period flagged current,
        // as the dashboard does, and parents_with_subjects reads only that period.
        await queryRunner.query(`
            CREATE OR REPLACE FUNCTION upsert_school_fact()
            RETURNS void AS $$
            BEGIN
                with constants AS (
                    SELECT
                        slp.index as time_key
                    FROM
                        static_lwp_period slp
                    WHERE
                        slp."isCurrentPeriod" = true
                    ORDER BY slp.index DESC
                    LIMIT 1
                ),
                school_subject as (
                    select
                        ls.id as "schoolId",
                        ls."isMoneySkillsAvailable" as "isMoneySkillsAvailable",
                        ls.region as "region",
                        ls."numOfFullProgrammeClassesAllowed" as "numOfFullProgrammeClassesAllowed",
                        ls."numOfTotalClassesAllowed" as "numOfTotalClassesAllowed",
                        ls."isReadyTeddyAvailable" as "isReadyTeddyAvailable",
                        sls.id as "subjectId",
                        sls.name as "subject",
                        sls."programmeType" as "programmeType",
                        c.time_key as "timeKey"
                    from lwp_school ls
                    join constants c on c.time_key = ls."curentPeriodIndex"
                    cross join (
                        select id, name, "programmeType" from static_lwp_subject
                        union all
                        select 0 as id, 'Reading', 'READING' as name
                    ) sls
                    where
                        not ls.inactive
                        and not ls."isTestSchool"
                ),
                -- isSignedUp: true if the school has at least one active registration class
                -- with the programme enabled for that subject, regardless of whether any
                -- topic has been released yet.
                sign_up_per_school as (
                    select
                        ss."schoolId",
                        ss."subjectId",
                        bool_or(
                            (ss."programmeType" = 'READING'        AND lsc."IsReadingLogsEnabled" = true)
                            OR (ss."programmeType" = 'READY_TEDDY'    AND lsc."isReadyTeddyEnabled" = true)
                            OR (ss."programmeType" = 'FULL_PROGRAMME' AND lsc."isFullProgramme" = true)
                            OR (ss."programmeType" = 'MONEY_SKILLS'   AND ss."isMoneySkillsAvailable" = true
                                AND (lsc."isFullProgramme" = true OR lsc."IsReadingLogsEnabled" = true))
                        ) AS "isSignedUp"
                    from school_subject ss
                    join lwp_school_class lsc on
                        lsc."schoolId" = ss."schoolId"
                        and lsc."periodIndex" >= ss."timeKey"
                        and lsc."isRegistrationClass" = true
                        and lsc.status = 'ACTIVE'
                    GROUP BY ss."schoolId", ss."subjectId"
                ),
                -- Active registration classes with at least one released topic per subject,
                -- including topics released on class groups. Used to count numberOfClasses.
                classes_with_subjects AS (
                    SELECT
                        ss."schoolId",
                        lsc.id AS "classId",
                        CASE WHEN slt."isReading" = true THEN 0 ELSE sls.id END AS "subjectId"
                    FROM school_subject ss
                    JOIN lwp_school_class lsc ON
                        lsc."schoolId" = ss."schoolId"
                        AND lsc."periodIndex" >= ss."timeKey"
                        AND lsc."isRegistrationClass" = true
                        AND lsc.status = 'ACTIVE'
                    LEFT JOIN lwp_school_class grp ON
                        grp."parentClassId" = lsc.id
                    JOIN lwp_class_topic lct ON lct."classId" IN (lsc.id, grp.id) AND lct.released = true
                    JOIN static_lwp_topic slt ON slt.id = lct."topicId"
                    LEFT JOIN static_lwp_topic_domain_year_group sltdyg ON slt."id" = sltdyg."topicId"
                    LEFT JOIN static_lwp_topic_domain sltd ON sltdyg."domainId" = sltd."id"
                    LEFT JOIN static_lwp_subject sls ON sltd."subjectId" = sls."id"
                ),
                -- Per subject count derived from base CTE
                class_counts_per_school AS (
                    SELECT
                        "schoolId",
                        "subjectId",
                        COUNT(DISTINCT "classId") AS "classCount"
                    FROM classes_with_subjects
                    GROUP BY "schoolId", "subjectId"
                ),
                -- "All" count per school derived from base CTE
                all_class_counts_per_school AS (
                    SELECT
                        "schoolId",
                        COUNT(DISTINCT "classId") AS "classCount"
                    FROM classes_with_subjects
                    GROUP BY "schoolId"
                ),
                topics_released_per_subject as (
                    select
                        ss."schoolId",
                        ss."subjectId",
                        bool_or(
                            CASE
                                WHEN ss."subjectId" = 0 THEN slt."isReading" = true
                                WHEN ss."subjectId" <> 0 THEN ss."subjectId" = sls.id
                            END
                        ) AS "isReleasedTopic"
                    from school_subject ss
                    join lwp_school_class lsc on
                        lsc."schoolId" = ss."schoolId"
                        and lsc."periodIndex" >= ss."timeKey"
                        and lsc.status = 'ACTIVE'
                    join lwp_class_topic lct on lct."classId" = lsc.id and lct.released = true
                    join static_lwp_topic slt on slt.id = lct."topicId"
                    left join static_lwp_topic_domain_year_group sltdyg on slt."id" = sltdyg."topicId"
                    left join static_lwp_topic_domain sltd on sltdyg."domainId" = sltd."id"
                    left join static_lwp_subject sls on sltd."subjectId" = sls."id"
                    GROUP BY ss."schoolId", ss."subjectId"
                ),
                -- Teachers per subject where they are assigned to a class with at least one released topic.
                -- Used to count numberOfTeachers.
                teachers_with_subjects AS (
                    SELECT DISTINCT
                        ss."schoolId",
                        teacher_user.id AS "teacherId",
                        CASE WHEN slt."isReading" = true THEN 0 ELSE sls.id END AS "subjectId"
                    FROM school_subject ss
                    JOIN lwp_school_class lsc ON
                        lsc."schoolId" = ss."schoolId"
                        AND lsc."periodIndex" >= ss."timeKey"
                    LEFT JOIN lwp_class_teacher class_teacher ON class_teacher."lwpSchoolClassId" = lsc.id
                    LEFT JOIN lwp_user teacher_user ON teacher_user.id = class_teacher."lwpUserId"
                        AND teacher_user.type = 'TEACHER'
                        AND teacher_user."isSchoolLeader" = false
                        AND teacher_user."userStatus" = 'ACTIVE'
                    JOIN lwp_class_topic lct ON lct."classId" = lsc.id AND lct.released = true
                    JOIN static_lwp_topic slt ON slt.id = lct."topicId"
                    LEFT JOIN static_lwp_topic_domain_year_group sltdyg ON slt."id" = sltdyg."topicId"
                    LEFT JOIN static_lwp_topic_domain sltd ON sltdyg."domainId" = sltd."id"
                    LEFT JOIN static_lwp_subject sls ON sltd."subjectId" = sls."id"
                ),
                -- Per subject teacher count
                teacher_counts_per_school AS (
                    SELECT
                        "schoolId",
                        "subjectId",
                        COUNT(DISTINCT "teacherId") AS "teacherCount"
                    FROM teachers_with_subjects
                    GROUP BY "schoolId", "subjectId"
                ),
                -- "All" teacher count per school
                all_teacher_counts_per_school AS (
                    SELECT
                        "schoolId",
                        COUNT(DISTINCT "teacherId") AS "teacherCount"
                    FROM teachers_with_subjects
                    GROUP BY "schoolId"
                ),
                -- Active school leaders counted per school, not per subject. The same count is applied
                -- to all subject rows for a school where at least one topic has been released for
                -- that subject in any of the school's classes.
                leader_counts_per_school AS (
                    SELECT
                        lu."schoolId",
                        COUNT(DISTINCT lu.id) AS "leaderCount"
                    FROM lwp_user lu
                    JOIN (SELECT DISTINCT "schoolId" FROM school_subject) ss
                        ON ss."schoolId" = lu."schoolId"
                    WHERE
                        lu."isSchoolLeader" = true
                        AND lu."userStatus" = 'ACTIVE'
                    GROUP BY lu."schoolId"
                ),
                -- Aggregate boolean flags at school level for "All" row
                all_flags_per_school AS (
                    SELECT
                        ss."schoolId",
                        ss.region,
                        ss."timeKey",
                        bool_or(
                            CASE
                                WHEN ss."programmeType" = 'READING'        THEN ss."numOfTotalClassesAllowed" > 0
                                WHEN ss."programmeType" = 'READY_TEDDY'    THEN ss."isReadyTeddyAvailable"
                                WHEN ss."programmeType" = 'FULL_PROGRAMME' THEN ss."numOfFullProgrammeClassesAllowed" > 0
                                WHEN ss."programmeType" = 'MONEY_SKILLS'   THEN ss."isMoneySkillsAvailable"
                            END
                        ) AS "isOffered",
                        bool_or(COALESCE(sups."isSignedUp", false))      AS "isSignedUp",
                        bool_or(COALESCE(trps."isReleasedTopic", false)) AS "isReleased"
                    FROM school_subject ss
                    LEFT JOIN sign_up_per_school sups
                        ON sups."schoolId" = ss."schoolId" AND sups."subjectId" = ss."subjectId"
                    LEFT JOIN topics_released_per_subject trps
                        ON trps."schoolId" = ss."schoolId" AND trps."subjectId" = ss."subjectId"
                    GROUP BY ss."schoolId", ss.region, ss."timeKey"
                ),
                -- Base CTE: single source of truth for parent/subject mapping.
                -- A parent is counted as active/registered only when their pupil has done
                -- something on the site for that subject in the current academic year: either watched at least one video
                -- (videosWatchedCount > 0) or the pupil has at least one parent feedback entry
                -- logged (parentFeedbackEntries > 0), regardless of which parent logged it.
                parents_with_subjects AS (
                    SELECT DISTINCT
                        apf."schoolId",
                        apf."subjectId",
                        lpp."parentId"
                    FROM analytics_pupil_fact apf
                    JOIN constants c ON c.time_key = apf."timeKey"
                    JOIN lwp_pupil_parent lpp ON lpp."pupilId" = apf."pupilId" AND lpp.status = 'ACTIVE'
                    JOIN lwp_user lu ON lu.id = lpp."parentId"
                        AND lu.type IN ('PARENT', 'TOPICACCESS', 'MAGICPARENT')
                    WHERE apf."parentFeedbackEntries" > 0 OR apf."videosWatchedCount" > 0
                ),
                -- Per subject registered parent count
                parent_counts_per_school AS (
                    SELECT "schoolId", "subjectId", COUNT(DISTINCT "parentId") AS "registeredParentsCount"
                    FROM parents_with_subjects
                    GROUP BY "schoolId", "subjectId"
                ),
                -- "All" registered parent count per school (deduplicated across subjects)
                all_parent_counts_per_school AS (
                    SELECT "schoolId", COUNT(DISTINCT "parentId") AS "registeredParentsCount"
                    FROM parents_with_subjects
                    GROUP BY "schoolId"
                )
                INSERT INTO analytics_school_fact (
                    "schoolId",
                    "subjectId",
                    "subject",
                    "programmeType",
                    "region",
                    "timeKey",
                    "isOffered",
                    "isSignedUp",
                    "numberOfClasses",
                    "isReleased",
                    "numberOfTeachers",
                    "numberOfSchoolLeaders",
                    "registeredParentsCount"
                )
                -- Original per-subject rows
                SELECT
                    ss."schoolId",
                    ss."subjectId",
                    ss.subject,
                    ss."programmeType",
                    ss.region,
                    ss."timeKey",
                    CASE
                        WHEN ss."programmeType" = 'READING'        THEN ss."numOfTotalClassesAllowed" > 0
                        WHEN ss."programmeType" = 'READY_TEDDY'    THEN ss."isReadyTeddyAvailable"
                        WHEN ss."programmeType" = 'FULL_PROGRAMME' THEN ss."numOfFullProgrammeClassesAllowed" > 0
                        WHEN ss."programmeType" = 'MONEY_SKILLS'   THEN ss."isMoneySkillsAvailable"
                    END AS "isOffered",
                    COALESCE(sups."isSignedUp", false)          AS "isSignedUp",
                    COALESCE(ccps."classCount", 0)              AS "numberOfClasses",
                    COALESCE(trps."isReleasedTopic", false)     AS "isReleased",
                    COALESCE(tcps."teacherCount", 0)            AS "numberOfTeachers",
                    -- leaders are not subject-specific, only count when isReleased is true for the subject
                    CASE WHEN COALESCE(trps."isReleasedTopic", false) = true
                        THEN COALESCE(lcps."leaderCount", 0)
                        ELSE 0
                    END                                         AS "numberOfSchoolLeaders",
                    COALESCE(pcps."registeredParentsCount", 0)  AS "registeredParentsCount"
                FROM school_subject ss
                LEFT JOIN sign_up_per_school sups
                    ON sups."schoolId" = ss."schoolId" AND sups."subjectId" = ss."subjectId"
                LEFT JOIN class_counts_per_school ccps
                    ON ccps."schoolId" = ss."schoolId" AND ccps."subjectId" = ss."subjectId"
                LEFT JOIN topics_released_per_subject trps
                    ON trps."schoolId" = ss."schoolId" AND trps."subjectId" = ss."subjectId"
                LEFT JOIN teacher_counts_per_school tcps
                    ON tcps."schoolId" = ss."schoolId" AND tcps."subjectId" = ss."subjectId"
                LEFT JOIN leader_counts_per_school lcps
                    ON lcps."schoolId" = ss."schoolId"
                LEFT JOIN parent_counts_per_school pcps
                    ON pcps."schoolId" = ss."schoolId" AND pcps."subjectId" = ss."subjectId"

                UNION ALL

                -- "All" row per school
                SELECT
                    afps."schoolId",
                    -1      AS "subjectId",
                    'All'   AS "subject",
                    'ALL'    AS "programmeType",
                    afps.region,
                    afps."timeKey",
                    afps."isOffered",
                    afps."isSignedUp",
                    COALESCE(acps."classCount", 0)      AS "numberOfClasses",
                    afps."isReleased",
                    COALESCE(atcps."teacherCount", 0)   AS "numberOfTeachers",
                    -- leaders for "All" row: only count when school has any released topic
                    CASE WHEN afps."isReleased" = true
                        THEN COALESCE(lcps."leaderCount", 0)
                        ELSE 0
                    END                                 AS "numberOfSchoolLeaders",
                    COALESCE(apcps."registeredParentsCount", 0) AS "registeredParentsCount"
                FROM all_flags_per_school afps
                LEFT JOIN all_class_counts_per_school acps
                    ON acps."schoolId" = afps."schoolId"
                LEFT JOIN all_teacher_counts_per_school atcps
                    ON atcps."schoolId" = afps."schoolId"
                LEFT JOIN leader_counts_per_school lcps
                    ON lcps."schoolId" = afps."schoolId"
                LEFT JOIN all_parent_counts_per_school apcps
                    ON apcps."schoolId" = afps."schoolId"
				ORDER BY "schoolId", "subjectId"
                ON CONFLICT ("schoolId", "subjectId", "timeKey")
                DO UPDATE SET
                    "subject"               = EXCLUDED."subject",
                    "programmeType"         = EXCLUDED."programmeType",
                    "region"                = EXCLUDED."region",
                    "numberOfClasses"       = EXCLUDED."numberOfClasses",
                    "isOffered"             = EXCLUDED."isOffered",
                    "isSignedUp"            = EXCLUDED."isSignedUp",
                    "isReleased"            = EXCLUDED."isReleased",
                    "numberOfTeachers"        = EXCLUDED."numberOfTeachers",
                    "numberOfSchoolLeaders"   = EXCLUDED."numberOfSchoolLeaders",
                    "registeredParentsCount"  = EXCLUDED."registeredParentsCount",
                    "updatedAt"               = CURRENT_TIMESTAMP;
            END;
            $$ LANGUAGE plpgsql;
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Restore the function from migration 1780444800000-AddAllSubjectAggregateToSchoolAnalyticsFact.
        await queryRunner.query(`
            CREATE OR REPLACE FUNCTION upsert_school_fact()
            RETURNS void AS $$
            BEGIN
                with constants AS (
                    SELECT
                        slp.index as time_key
                    FROM
                        static_lwp_period slp
                    WHERE
                        slp."isCurrentPeriod" = true
                ),
                school_subject as (
                    select
                        ls.id as "schoolId",
                        ls."isMoneySkillsAvailable" as "isMoneySkillsAvailable",
                        ls.region as "region",
                        ls."numOfFullProgrammeClassesAllowed" as "numOfFullProgrammeClassesAllowed",
                        ls."numOfTotalClassesAllowed" as "numOfTotalClassesAllowed",
                        ls."isReadyTeddyAvailable" as "isReadyTeddyAvailable",
                        sls.id as "subjectId",
                        sls.name as "subject",
                        sls."programmeType" as "programmeType",
                        c.time_key as "timeKey"
                    from lwp_school ls
                    join constants c on c.time_key = ls."curentPeriodIndex"
                    cross join (
                        select id, name, "programmeType" from static_lwp_subject
                        union all
                        select 0 as id, 'Reading', 'READING' as name
                    ) sls
                    where
                        not ls.inactive
                        and not ls."isTestSchool"
                ),
                -- isSignedUp: true if the school has at least one active registration class
                -- with the programme enabled for that subject, regardless of whether any
                -- topic has been released yet.
                sign_up_per_school as (
                    select
                        ss."schoolId",
                        ss."subjectId",
                        bool_or(
                            (ss."programmeType" = 'READING'        AND lsc."IsReadingLogsEnabled" = true)
                            OR (ss."programmeType" = 'READY_TEDDY'    AND lsc."isReadyTeddyEnabled" = true)
                            OR (ss."programmeType" = 'FULL_PROGRAMME' AND lsc."isFullProgramme" = true)
                            OR (ss."programmeType" = 'MONEY_SKILLS'   AND ss."isMoneySkillsAvailable" = true
                                AND (lsc."isFullProgramme" = true OR lsc."IsReadingLogsEnabled" = true))
                        ) AS "isSignedUp"
                    from school_subject ss
                    join lwp_school_class lsc on
                        lsc."schoolId" = ss."schoolId"
                        and lsc."periodIndex" >= ss."timeKey"
                        and lsc."isRegistrationClass" = true
                        and lsc.status = 'ACTIVE'
                    GROUP BY ss."schoolId", ss."subjectId"
                ),
                -- Active registration classes with at least one released topic per subject,
                -- including topics released on class groups. Used to count numberOfClasses.
                classes_with_subjects AS (
                    SELECT
                        ss."schoolId",
                        lsc.id AS "classId",
                        CASE WHEN slt."isReading" = true THEN 0 ELSE sls.id END AS "subjectId"
                    FROM school_subject ss
                    JOIN lwp_school_class lsc ON
                        lsc."schoolId" = ss."schoolId"
                        AND lsc."periodIndex" >= ss."timeKey"
                        AND lsc."isRegistrationClass" = true
                        AND lsc.status = 'ACTIVE'
                    LEFT JOIN lwp_school_class grp ON
                        grp."parentClassId" = lsc.id
                    JOIN lwp_class_topic lct ON lct."classId" IN (lsc.id, grp.id) AND lct.released = true
                    JOIN static_lwp_topic slt ON slt.id = lct."topicId"
                    LEFT JOIN static_lwp_topic_domain_year_group sltdyg ON slt."id" = sltdyg."topicId"
                    LEFT JOIN static_lwp_topic_domain sltd ON sltdyg."domainId" = sltd."id"
                    LEFT JOIN static_lwp_subject sls ON sltd."subjectId" = sls."id"
                ),
                -- Per subject count derived from base CTE
                class_counts_per_school AS (
                    SELECT
                        "schoolId",
                        "subjectId",
                        COUNT(DISTINCT "classId") AS "classCount"
                    FROM classes_with_subjects
                    GROUP BY "schoolId", "subjectId"
                ),
                -- "All" count per school derived from base CTE
                all_class_counts_per_school AS (
                    SELECT
                        "schoolId",
                        COUNT(DISTINCT "classId") AS "classCount"
                    FROM classes_with_subjects
                    GROUP BY "schoolId"
                ),
                topics_released_per_subject as (
                    select
                        ss."schoolId",
                        ss."subjectId",
                        bool_or(
                            CASE
                                WHEN ss."subjectId" = 0 THEN slt."isReading" = true
                                WHEN ss."subjectId" <> 0 THEN ss."subjectId" = sls.id
                            END
                        ) AS "isReleasedTopic"
                    from school_subject ss
                    join lwp_school_class lsc on
                        lsc."schoolId" = ss."schoolId"
                        and lsc."periodIndex" >= ss."timeKey"
                        and lsc.status = 'ACTIVE'
                    join lwp_class_topic lct on lct."classId" = lsc.id and lct.released = true
                    join static_lwp_topic slt on slt.id = lct."topicId"
                    left join static_lwp_topic_domain_year_group sltdyg on slt."id" = sltdyg."topicId"
                    left join static_lwp_topic_domain sltd on sltdyg."domainId" = sltd."id"
                    left join static_lwp_subject sls on sltd."subjectId" = sls."id"
                    GROUP BY ss."schoolId", ss."subjectId"
                ),
                -- Teachers per subject where they are assigned to a class with at least one released topic.
                -- Used to count numberOfTeachers.
                teachers_with_subjects AS (
                    SELECT DISTINCT
                        ss."schoolId",
                        teacher_user.id AS "teacherId",
                        CASE WHEN slt."isReading" = true THEN 0 ELSE sls.id END AS "subjectId"
                    FROM school_subject ss
                    JOIN lwp_school_class lsc ON
                        lsc."schoolId" = ss."schoolId"
                        AND lsc."periodIndex" >= ss."timeKey"
                    LEFT JOIN lwp_class_teacher class_teacher ON class_teacher."lwpSchoolClassId" = lsc.id
                    LEFT JOIN lwp_user teacher_user ON teacher_user.id = class_teacher."lwpUserId"
                        AND teacher_user.type = 'TEACHER'
                        AND teacher_user."isSchoolLeader" = false
                        AND teacher_user."userStatus" = 'ACTIVE'
                    JOIN lwp_class_topic lct ON lct."classId" = lsc.id AND lct.released = true
                    JOIN static_lwp_topic slt ON slt.id = lct."topicId"
                    LEFT JOIN static_lwp_topic_domain_year_group sltdyg ON slt."id" = sltdyg."topicId"
                    LEFT JOIN static_lwp_topic_domain sltd ON sltdyg."domainId" = sltd."id"
                    LEFT JOIN static_lwp_subject sls ON sltd."subjectId" = sls."id"
                ),
                -- Per subject teacher count
                teacher_counts_per_school AS (
                    SELECT
                        "schoolId",
                        "subjectId",
                        COUNT(DISTINCT "teacherId") AS "teacherCount"
                    FROM teachers_with_subjects
                    GROUP BY "schoolId", "subjectId"
                ),
                -- "All" teacher count per school
                all_teacher_counts_per_school AS (
                    SELECT
                        "schoolId",
                        COUNT(DISTINCT "teacherId") AS "teacherCount"
                    FROM teachers_with_subjects
                    GROUP BY "schoolId"
                ),
                -- Active school leaders counted per school, not per subject. The same count is applied
                -- to all subject rows for a school where at least one topic has been released for
                -- that subject in any of the school's classes.
                leader_counts_per_school AS (
                    SELECT
                        lu."schoolId",
                        COUNT(DISTINCT lu.id) AS "leaderCount"
                    FROM lwp_user lu
                    JOIN (SELECT DISTINCT "schoolId" FROM school_subject) ss
                        ON ss."schoolId" = lu."schoolId"
                    WHERE
                        lu."isSchoolLeader" = true
                        AND lu."userStatus" = 'ACTIVE'
                    GROUP BY lu."schoolId"
                ),
                -- Aggregate boolean flags at school level for "All" row
                all_flags_per_school AS (
                    SELECT
                        ss."schoolId",
                        ss.region,
                        ss."timeKey",
                        bool_or(
                            CASE
                                WHEN ss."programmeType" = 'READING'        THEN ss."numOfTotalClassesAllowed" > 0
                                WHEN ss."programmeType" = 'READY_TEDDY'    THEN ss."isReadyTeddyAvailable"
                                WHEN ss."programmeType" = 'FULL_PROGRAMME' THEN ss."numOfFullProgrammeClassesAllowed" > 0
                                WHEN ss."programmeType" = 'MONEY_SKILLS'   THEN ss."isMoneySkillsAvailable"
                            END
                        ) AS "isOffered",
                        bool_or(COALESCE(sups."isSignedUp", false))      AS "isSignedUp",
                        bool_or(COALESCE(trps."isReleasedTopic", false)) AS "isReleased"
                    FROM school_subject ss
                    LEFT JOIN sign_up_per_school sups
                        ON sups."schoolId" = ss."schoolId" AND sups."subjectId" = ss."subjectId"
                    LEFT JOIN topics_released_per_subject trps
                        ON trps."schoolId" = ss."schoolId" AND trps."subjectId" = ss."subjectId"
                    GROUP BY ss."schoolId", ss.region, ss."timeKey"
                ),
                -- Base CTE: single source of truth for parent/subject mapping.
                -- A parent is counted as active/registered only when their pupil has done
                -- something on the site for that subject: either watched at least one video
                -- (videosWatchedCount > 0) or the pupil has at least one parent feedback entry
                -- logged (parentFeedbackEntries > 0), regardless of which parent logged it.
                parents_with_subjects AS (
                    SELECT DISTINCT
                        apf."schoolId",
                        apf."subjectId",
                        lpp."parentId"
                    FROM analytics_pupil_fact apf
                    JOIN lwp_pupil_parent lpp ON lpp."pupilId" = apf."pupilId" AND lpp.status = 'ACTIVE'
                    JOIN lwp_user lu ON lu.id = lpp."parentId"
                        AND lu.type IN ('PARENT', 'TOPICACCESS', 'MAGICPARENT')
                    WHERE apf."parentFeedbackEntries" > 0 OR apf."videosWatchedCount" > 0
                ),
                -- Per subject registered parent count
                parent_counts_per_school AS (
                    SELECT "schoolId", "subjectId", COUNT(DISTINCT "parentId") AS "registeredParentsCount"
                    FROM parents_with_subjects
                    GROUP BY "schoolId", "subjectId"
                ),
                -- "All" registered parent count per school (deduplicated across subjects)
                all_parent_counts_per_school AS (
                    SELECT "schoolId", COUNT(DISTINCT "parentId") AS "registeredParentsCount"
                    FROM parents_with_subjects
                    GROUP BY "schoolId"
                )
                INSERT INTO analytics_school_fact (
                    "schoolId",
                    "subjectId",
                    "subject",
                    "programmeType",
                    "region",
                    "timeKey",
                    "isOffered",
                    "isSignedUp",
                    "numberOfClasses",
                    "isReleased",
                    "numberOfTeachers",
                    "numberOfSchoolLeaders",
                    "registeredParentsCount"
                )
                -- Original per-subject rows
                SELECT
                    ss."schoolId",
                    ss."subjectId",
                    ss.subject,
                    ss."programmeType",
                    ss.region,
                    ss."timeKey",
                    CASE
                        WHEN ss."programmeType" = 'READING'        THEN ss."numOfTotalClassesAllowed" > 0
                        WHEN ss."programmeType" = 'READY_TEDDY'    THEN ss."isReadyTeddyAvailable"
                        WHEN ss."programmeType" = 'FULL_PROGRAMME' THEN ss."numOfFullProgrammeClassesAllowed" > 0
                        WHEN ss."programmeType" = 'MONEY_SKILLS'   THEN ss."isMoneySkillsAvailable"
                    END AS "isOffered",
                    COALESCE(sups."isSignedUp", false)          AS "isSignedUp",
                    COALESCE(ccps."classCount", 0)              AS "numberOfClasses",
                    COALESCE(trps."isReleasedTopic", false)     AS "isReleased",
                    COALESCE(tcps."teacherCount", 0)            AS "numberOfTeachers",
                    -- leaders are not subject-specific, only count when isReleased is true for the subject
                    CASE WHEN COALESCE(trps."isReleasedTopic", false) = true
                        THEN COALESCE(lcps."leaderCount", 0)
                        ELSE 0
                    END                                         AS "numberOfSchoolLeaders",
                    COALESCE(pcps."registeredParentsCount", 0)  AS "registeredParentsCount"
                FROM school_subject ss
                LEFT JOIN sign_up_per_school sups
                    ON sups."schoolId" = ss."schoolId" AND sups."subjectId" = ss."subjectId"
                LEFT JOIN class_counts_per_school ccps
                    ON ccps."schoolId" = ss."schoolId" AND ccps."subjectId" = ss."subjectId"
                LEFT JOIN topics_released_per_subject trps
                    ON trps."schoolId" = ss."schoolId" AND trps."subjectId" = ss."subjectId"
                LEFT JOIN teacher_counts_per_school tcps
                    ON tcps."schoolId" = ss."schoolId" AND tcps."subjectId" = ss."subjectId"
                LEFT JOIN leader_counts_per_school lcps
                    ON lcps."schoolId" = ss."schoolId"
                LEFT JOIN parent_counts_per_school pcps
                    ON pcps."schoolId" = ss."schoolId" AND pcps."subjectId" = ss."subjectId"

                UNION ALL

                -- "All" row per school
                SELECT
                    afps."schoolId",
                    -1      AS "subjectId",
                    'All'   AS "subject",
                    'ALL'    AS "programmeType",
                    afps.region,
                    afps."timeKey",
                    afps."isOffered",
                    afps."isSignedUp",
                    COALESCE(acps."classCount", 0)      AS "numberOfClasses",
                    afps."isReleased",
                    COALESCE(atcps."teacherCount", 0)   AS "numberOfTeachers",
                    -- leaders for "All" row: only count when school has any released topic
                    CASE WHEN afps."isReleased" = true
                        THEN COALESCE(lcps."leaderCount", 0)
                        ELSE 0
                    END                                 AS "numberOfSchoolLeaders",
                    COALESCE(apcps."registeredParentsCount", 0) AS "registeredParentsCount"
                FROM all_flags_per_school afps
                LEFT JOIN all_class_counts_per_school acps
                    ON acps."schoolId" = afps."schoolId"
                LEFT JOIN all_teacher_counts_per_school atcps
                    ON atcps."schoolId" = afps."schoolId"
                LEFT JOIN leader_counts_per_school lcps
                    ON lcps."schoolId" = afps."schoolId"
                LEFT JOIN all_parent_counts_per_school apcps
                    ON apcps."schoolId" = afps."schoolId"
				ORDER BY "schoolId", "subjectId"
                ON CONFLICT ("schoolId", "subjectId", "timeKey")
                DO UPDATE SET
                    "subject"               = EXCLUDED."subject",
                    "programmeType"         = EXCLUDED."programmeType",
                    "region"                = EXCLUDED."region",
                    "numberOfClasses"       = EXCLUDED."numberOfClasses",
                    "isOffered"             = EXCLUDED."isOffered",
                    "isSignedUp"            = EXCLUDED."isSignedUp",
                    "isReleased"            = EXCLUDED."isReleased",
                    "numberOfTeachers"        = EXCLUDED."numberOfTeachers",
                    "numberOfSchoolLeaders"   = EXCLUDED."numberOfSchoolLeaders",
                    "registeredParentsCount"  = EXCLUDED."registeredParentsCount",
                    "updatedAt"               = CURRENT_TIMESTAMP;
            END;
            $$ LANGUAGE plpgsql;
        `);
    }
}
