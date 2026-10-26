/**
 * This has the same complexity as the Reading towards target each week query.
 * A more detailed explanation is within that file.
 */

BEGIN READ WRITE;
DO
LANGUAGE plpgsql
$$ DECLARE v_sqlstring VARCHAR = '';

BEGIN
    CREATE TEMPORARY TABLE source_pivot_data AS
    SELECT
        "Pupil name",
        "Year group",
        "Class name",
        "releaseDate",
        max(val) AS val
    FROM (
        SELECT
            concat(lp.firstname, ' ', lp.lastname) AS "Pupil name",
            slyg."year" AS "Year group",
            lsc."name" AS "Class name",
            (lpf."bookReadAt"::date - (((7 + extract(isodow FROM lpf."bookReadAt"::date) - lsc."readingStartDay")::numeric % 7) * interval '1 day'))::date AS "releaseDate",
            count(DISTINCT lpf.id) AS val
        FROM
            lwp_pupil_feedback lpf
            JOIN lwp_pupil_feedback_history lpfh ON lpfh."lwpPupilFeedbackId" = lpf.id
            JOIN lwp_pupil lp ON lp.id = lpfh."lwpPupilId"
            JOIN lwp_school ls ON ls.id = lp."schoolId"
            JOIN lwp_class_pupil lcp ON lcp."lwpPupilId" = lp.id
            JOIN lwp_school_class lsc ON lsc.id = lcp."lwpSchoolClassId"
                AND lsc."isRegistrationClass"
                AND lsc."periodIndex" = coalesce(current_setting('lwp.period_index', TRUE)::int, ls."curentPeriodIndex")
            JOIN static_lwp_year_group slyg ON slyg.id = lsc."yearGroup"
        WHERE
            lpf."userType" NOT IN ('TEACHER', 'ADMIN')
            AND lpf."type" = 'READING'
            AND lpf."periodIndex" = lsc."periodIndex"
            AND ls.id = current_setting('lwp.school_id')::bigint
        GROUP BY
            lp.id,
            lsc.id,
            slyg.id,
            "releaseDate"
        UNION ALL
        SELECT
            concat(lp.firstname, ' ', lp.lastname) AS "Pupil name",
            slyg."year" AS "Year group",
            lsc."name" AS "Class name",
            lpt."releaseDate",
            0
        FROM
            lwp_pupil_topic lpt
            JOIN lwp_pupil lp ON lp.id = lpt."pupilId"
            JOIN lwp_school ls ON ls.id = lp."schoolId"
            JOIN lwp_class_pupil lcp ON lcp."lwpPupilId" = lp.id
            JOIN lwp_school_class lsc ON lsc.id = lcp."lwpSchoolClassId"
                AND lsc."isRegistrationClass"
                AND lsc."periodIndex" = coalesce(current_setting('lwp.period_index', TRUE)::int, ls."curentPeriodIndex")
            JOIN static_lwp_year_group slyg ON slyg.id = lsc."yearGroup"
        WHERE
            lpt."readingTarget" IS NOT NULL
            AND lpt."periodIndex" = lsc."periodIndex"
            AND ls.id = current_setting('lwp.school_id')::bigint)
    GROUP BY
        1,
        2,
        3,
        4
    ;

    v_sqlstring := concat('CREATE TEMPORARY TABLE tmpTblTyp AS SELECT ', (
            SELECT
                string_agg(concat('NULL::varchar AS "', "releaseDate", '"')::text, ' ,' ORDER BY "releaseDate" DESC)::text FROM ( SELECT DISTINCT
                    "releaseDate"
                FROM source_pivot_data) iQ), ' LIMIT 0 ');

    -- RAISE NOTICE '%', v_sqlstring ;
    EXECUTE (v_sqlstring);


    CREATE TEMP TABLE tmpMoToJson AS
    SELECT
        "Pupil name",
        "Year group",
        "Class name",
        json_populate_recordset(NULL::tmpTblTyp, /** use temp table as a record type!! **/ json_build_array("releaseDates")) jprs
        /** builds row-type column that can be expanded with (jprs).*   
        **/
    FROM (
        SELECT
            "Pupil name",
            "Year group",
            "Class name",
            -- accum data into JSON array
            json_object_agg("releaseDate", val) AS "releaseDates"
        FROM
            source_pivot_data
        GROUP BY
            "Pupil name",
            "Year group",
            "Class name"
        ORDER BY
            "Year group", "Class name", "Pupil name") a;
END $$;

SELECT
    "Pupil name",
    "Year group",
    "Class name",
    (ROW ((jprs).*)::tmpTblTyp).*
FROM
    tmpMoToJson;
