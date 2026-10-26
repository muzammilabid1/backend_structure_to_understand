/**
 * This script generates a new schema, hackathon_data, which contains anonymised data
 * from pupil activities, topics and feedback, as well as static tables that relate to
 * those entities, preserving relationships. Runtime is approx 20 mins on staging.
 * n.b. this script does not run an export; you should export the hackathon_data schema's
 * contents afterwards, in whatever format you want the data to be exported in.
 */
DO $$
DECLARE
    this_table varchar;
    column_names varchar[];
    joined_column_names varchar;
    foreign_keys varchar;
    timestamp_conversions varchar;
    restrict_columns boolean;
    columns_to_drop varchar;
    tables_included regclass[] := ARRAY['lwp_pupil', 'lwp_pupil_activity', 'lwp_pupil_feedback', 'lwp_pupil_topic', 'static_lwp_activity', 'static_lwp_activity_steps', 'static_lwp_activity_tag', 'static_lwp_subject', 'static_lwp_topic', 'static_lwp_topic_domain', 'static_lwp_topic_domain_year_group'];
BEGIN
	DROP SCHEMA IF EXISTS hackathon_data CASCADE;
	CREATE SCHEMA hackathon_data;
    -- First, create the base tables and add the data
    FOREACH this_table IN ARRAY tables_included LOOP
        restrict_columns := TRUE;
        CASE this_table
        WHEN 'lwp_pupil_activity' THEN
            column_names := ARRAY['earnedStar', 'rating', 'id', 'pupilId', 'activityId', 'topicId', 'logFirstAccessed', 'logLastAccessed', 'logAccessedOnDesktop', 'logAccessedOnMobile'];
        WHEN 'lwp_pupil' THEN
            column_names := ARRAY['id', 'isPremium'];
        WHEN 'lwp_pupil_topic' THEN
            column_names := ARRAY['releaseDate', 'watchedVideo', 'logOpenedAt', 'logFirstStartedVideo', 'logFirstFinishedVideo', 'logLastStartedVideo', 'id', 'logCreatedAt', 'logUpdatedAt', 'reminderSent', 'topicId', 'pupilId', 'parentsNotified', 'reminderSentFor2Days', 'periodIndex', 'logAccessedOnDesktop', 'logAccessedOnMobile', 'logAccessedWithTopicLink', 'earnedGoldStar', 'silverStars'];
        WHEN 'lwp_pupil_feedback' THEN
            column_names := ARRAY['pupilComment', 'parentComment', 'sharingAllowed', 'comment', 'type', 'id', 'logCreatedAt', 'logUpdatedAt', 'activityId', 'logSubmittedOnDesktop', 'logSubmittedOnMobile', 'periodIndex'];
        ELSE
            restrict_columns := FALSE;
            SELECT
                array_agg(column_name) INTO column_names
            FROM
                information_schema.columns
            WHERE
                table_name = this_table
                AND table_schema = 'public'
                AND is_generated = 'NEVER';
        END CASE;
        EXECUTE ('create table hackathon_data.' || this_table || '(like public.' || this_table || ' including all);'); IF restrict_columns = TRUE THEN
                SELECT
                    string_agg(concat('DROP COLUMN IF EXISTS "', column_name, '" CASCADE'), ', ') INTO columns_to_drop
                FROM
                    information_schema.columns
                WHERE
                    table_schema = 'hackathon_data'
                    AND table_name = this_table
                    AND column_name != ALL (column_names); EXECUTE ('alter table hackathon_data.' || this_table || ' ' || columns_to_drop);
            END IF;
        SELECT
            string_agg(concat('"', unnest, '"'), ', ') INTO joined_column_names
        FROM
            unnest(column_names);
        EXECUTE ('insert into hackathon_data.' || this_table || ' ( ' || joined_column_names || ') select ' || joined_column_names || ' from public.' || this_table);
        SELECT
            string_agg(concat('ALTER COLUMN "', column_name, '" TYPE date USING "', column_name, '"::date'), ', ') INTO timestamp_conversions
        FROM
            information_schema.columns
        WHERE
            table_schema = 'hackathon_data'
            AND data_type LIKE 'timestamp%'
            AND table_name = this_table;
        IF timestamp_conversions <> '' THEN
            EXECUTE ('alter table hackathon_data.' || this_table || ' ' || timestamp_conversions);
        END IF;
    END LOOP;
        -- Now, re-iterate over the tables, and add foreign keys
        FOREACH this_table IN ARRAY tables_included LOOP
            SELECT
                string_agg(concat('ADD ', regexp_replace(regexp_replace(pg_get_constraintdef(oid), '(?<=\))(?: ON (?:UPDATE|DELETE) [^,]+)*(,|$)', ' ON UPDATE CASCADE ON DELETE CASCADE\1', 'g'), ' REFERENCES ', ' REFERENCES hackathon_data.')), ', ') INTO foreign_keys
            FROM
                pg_constraint
            WHERE
                contype = 'f'
				-- this currently refers to ?public rather than the right schema?
                AND conrelid = this_table::regclass
				-- and this likewise - TODO fix
                AND confrelid::regclass = ANY (tables_included);
            IF foreign_keys <> '' THEN
				raise notice '%', foreign_keys;
                EXECUTE ('alter table hackathon_data.' || this_table || ' ' || foreign_keys);
            END IF;
        END LOOP;
        -- Do bits for everything together
        CREATE TABLE hackathon_data.temp_pupil_comments AS (
            SELECT
                "pupilComment"
            FROM
                lwp_pupil_feedback lpf
                JOIN lwp_pupil_activity lpa ON lpa.id = lpf."activityId"
                JOIN lwp_pupil_topic lpt ON lpt.id = lpa."topicId"
                JOIN lwp_pupil lp ON lp.id = lpt."pupilId"
                JOIN lwp_school ls ON ls.id = lp."schoolId"
            WHERE
                ls."isTestSchool"
                AND lpf."pupilComment" != ''
            );
    CREATE TABLE hackathon_data.temp_parent_comments AS (
        SELECT
            "parentComment"
        FROM
            lwp_pupil_feedback lpf
            JOIN lwp_pupil_activity lpa ON lpa.id = lpf."activityId"
            JOIN lwp_pupil_topic lpt ON lpt.id = lpa."topicId"
            JOIN lwp_pupil lp ON lp.id = lpt."pupilId"
            JOIN lwp_school ls ON ls.id = lp."schoolId"
        WHERE
            ls."isTestSchool"
            AND lpf."parentComment" != ''
        );
    CREATE TABLE hackathon_data.temp_pupil_data AS (
        SELECT
            lp.id,
            max(lsc."yearGroup"
            ) AS "yearGroup"
        FROM
            hackathon_data.lwp_pupil lp
            JOIN public.lwp_class_pupil lcp ON lcp."lwpPupilId" = lp.id
            JOIN public.lwp_school_class lsc ON lsc.id = lcp."lwpSchoolClassId"
        WHERE
            lsc."isRegistrationClass"
        GROUP BY
            lp.id
        );
    CREATE TABLE hackathon_data.lwp_school_class AS (
        SELECT
            id::varchar AS "name",
            "yearGroup",
            TRUE AS "isRegistrationClass",
            (random( ) * 2147483648 ) ::int8 * 4294967296 + (random( ) * 4294967296 ) ::int8 AS "id"
        FROM
            hackathon_data.temp_pupil_data tpd
        );
    CREATE TABLE hackathon_data.lwp_class_pupil AS (
        SELECT
            name::bigint AS "lwpPupilId",
            id AS "lwpSchoolClassId"
        FROM
            hackathon_data.lwp_school_class lsc
        );
    UPDATE
        hackathon_data.lwp_school_class
    SET
        name = gen_random_uuid ()::varchar;
    UPDATE
        hackathon_data.lwp_pupil
    SET
        "isPremium" = CASE WHEN random() > 0.9 THEN
            NULL
        ELSE
            random() > 0.5
        END;
    WITH p_comments AS (
        SELECT
            lpf.id,
            tpc."pupilComment",
            tpc2."parentComment"
        FROM
            hackathon_data.lwp_pupil_feedback lpf
            JOIN (
                SELECT
                    *,
                    row_number() OVER (ORDER BY random())
                FROM hackathon_data.temp_pupil_comments) tpc ON lpf.id % (
            SELECT
                count(1)
            FROM hackathon_data.temp_pupil_comments) = tpc.row_number
        JOIN (
        SELECT
            *,
            row_number() OVER (ORDER BY random())
        FROM hackathon_data.temp_parent_comments) tpc2 ON lpf.id % (
    SELECT
        count(1)
    FROM hackathon_data.temp_parent_comments) = tpc2.row_number)
	UPDATE
	    hackathon_data.lwp_pupil_feedback lpf
	SET
	    "pupilComment" = p_comments."pupilComment",
	    "parentComment" = p_comments."parentComment"
	FROM
	    p_comments
	WHERE
	    lpf.id = p_comments.id;
    -- Now back to individual tables for the ID cascades
    FOREACH this_table IN ARRAY ARRAY['lwp_pupil', 'lwp_pupil_activity', 'lwp_pupil_feedback', 'lwp_pupil_topic'] LOOP
        EXECUTE ('UPDATE hackathon_data.' || this_table || ' SET id = (random() * 2147483648) ::int8 * 4294967296 + (random() * 4294967296) ::int8;');
    END LOOP;
	DROP TABLE hackathon_data.temp_pupil_comments;
	DROP TABLE hackathon_data.temp_pupil_data;
	DROP TABLE hackathon_data.temp_parent_comments;
END
$$;