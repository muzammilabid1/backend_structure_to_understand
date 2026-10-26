--
-- PostgreSQL database dump
--

\restrict dyRKogcbaf6mBorKgOYkiwxPiF801jG63QXseXhSKLpaJ0TvPBHmMhqtJmvzHPz

-- Dumped from database version 16.13 (Debian 16.13-1.pgdg13+1)
-- Dumped by pg_dump version 16.15 (Ubuntu 16.15-1.pgdg22.04+2)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: pg_cron; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;


--
-- Name: EXTENSION pg_cron; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION pg_cron IS 'Job scheduler for PostgreSQL';


--
-- Name: partman; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA partman;


--
-- Name: partman_templates; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA partman_templates;


--
-- Name: citext; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS citext WITH SCHEMA public;


--
-- Name: EXTENSION citext; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION citext IS 'data type for case-insensitive character strings';


--
-- Name: fuzzystrmatch; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS fuzzystrmatch WITH SCHEMA public;


--
-- Name: EXTENSION fuzzystrmatch; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION fuzzystrmatch IS 'determine similarities and distance between strings';


--
-- Name: pg_partman; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pg_partman WITH SCHEMA partman;


--
-- Name: EXTENSION pg_partman; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION pg_partman IS 'Extension to manage partitioned tables by time or ID';


--
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;


--
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';


--
-- Name: tablefunc; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS tablefunc WITH SCHEMA public;


--
-- Name: EXTENSION tablefunc; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION tablefunc IS 'functions that manipulate whole tables, including crosstab';


--
-- Name: lwp_notification_event_history_status_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.lwp_notification_event_history_status_enum AS ENUM (
    'WAITING',
    'SENT',
    'QUEUED',
    'DELIVERED',
    'OPENED',
    'CLICKED',
    'REJECTED',
    'FAILED'
);


--
-- Name: user_invite_mode_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.user_invite_mode_enum AS ENUM (
    'SEND_NOW',
    'SEND_LATER',
    'DO_NOT_SEND'
);


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: lwp_user; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lwp_user (
    firstname character varying NOT NULL,
    lastname character varying NOT NULL,
    email public.citext,
    password character varying,
    type character varying NOT NULL,
    "userStatus" character varying NOT NULL,
    "lastLogin" timestamp without time zone,
    "isGoogleAccount" boolean DEFAULT false NOT NULL,
    "welcomeMailSent" boolean DEFAULT false NOT NULL,
    "nameForChildren" character varying,
    "isSchoolLeader" boolean DEFAULT false,
    "sharingAllowed" boolean,
    "phoneNumber" character varying,
    id bigint NOT NULL,
    "logCreatedAt" timestamp without time zone DEFAULT ('now'::text)::timestamp(6) with time zone,
    "logUpdatedAt" timestamp without time zone DEFAULT ('now'::text)::timestamp(6) with time zone NOT NULL,
    "schoolId" bigint,
    "logCreatedById" bigint,
    "logUpdatedById" bigint,
    "isEmailVerified" boolean DEFAULT false,
    "isPhoneVerified" boolean DEFAULT false,
    "lastInvitationEmailSent" timestamp without time zone,
    "emailVerificationCode" character varying,
    "phoneVerificationCode" character varying,
    "mwpHashedPass" character varying,
    "initialPass" character varying,
    "notificationPreference" character varying DEFAULT 'BOTH'::character varying NOT NULL,
    "importedContactId" character varying,
    "deletedEmail" character varying,
    "deletedPhoneNumber" character varying,
    "deletedUserStatus" character varying,
    "deletedById" bigint,
    "watchedIntroVideo" boolean DEFAULT false NOT NULL,
    "microsoftAuth" boolean,
    "badLoginAttempts" integer DEFAULT 0 NOT NULL,
    "unlockAccountTime" timestamp without time zone,
    "adminRestrictions" jsonb,
    "lastAccess" timestamp without time zone,
    "inviteMode" public.user_invite_mode_enum DEFAULT 'SEND_NOW'::public.user_invite_mode_enum NOT NULL,
    "lastWelcomeEmailSent" timestamp without time zone,
    "lastMoneySkillsLaunchEmailSent" timestamp without time zone,
    "lastMoneySkillsAutoScheduleWelcomeSeen" timestamp without time zone,
    CONSTRAINT email_valid CHECK (((email)::text ~* '^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$'::text)),
    CONSTRAINT phone_valid CHECK ((("phoneNumber")::text ~ '^((0|(\+|00)44)7\d{9}|(\+|00)([1-35-9]\d|4[01-35-9])\d{4,13})$'::text))
);


--
-- Name: lwp_view_notifiable_parents; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.lwp_view_notifiable_parents WITH (security_invoker='true') AS
 SELECT firstname,
    lastname,
    email,
    password,
    type,
    "userStatus",
    "lastLogin",
    "isGoogleAccount",
    "welcomeMailSent",
    "nameForChildren",
    "isSchoolLeader",
    "sharingAllowed",
    "phoneNumber",
    id,
    "logCreatedAt",
    "logUpdatedAt",
    "schoolId",
    "logCreatedById",
    "logUpdatedById",
    "isEmailVerified",
    "isPhoneVerified",
    "lastInvitationEmailSent",
    "emailVerificationCode",
    "phoneVerificationCode",
    "mwpHashedPass",
    "initialPass",
    "notificationPreference",
    "importedContactId",
    "deletedEmail",
    "deletedPhoneNumber",
    "deletedUserStatus",
    "deletedById",
    "watchedIntroVideo",
    "microsoftAuth",
    "badLoginAttempts",
    "unlockAccountTime",
    "adminRestrictions",
    "lastAccess",
    "inviteMode",
    "lastWelcomeEmailSent",
    "lastMoneySkillsLaunchEmailSent",
    "lastMoneySkillsAutoScheduleWelcomeSeen"
   FROM public.lwp_user
  WHERE (((type)::text = 'PARENT'::text) AND (("userStatus")::text = ANY ('{INVITED,ACTIVE,ACCOUNTLESS}'::text[])));


--
-- Name: lwp_view_notifiable_parents_to_lwp_user(public.lwp_view_notifiable_parents); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.lwp_view_notifiable_parents_to_lwp_user(view public.lwp_view_notifiable_parents) RETURNS public.lwp_user
    LANGUAGE sql IMMUTABLE
    AS $$
                        SELECT
                            (ROW (view.*)::lwp_user) $$;


--
-- Name: CAST (public.lwp_view_notifiable_parents AS public.lwp_user); Type: CAST; Schema: -; Owner: -
--

CREATE CAST (public.lwp_view_notifiable_parents AS public.lwp_user) WITH FUNCTION public.lwp_view_notifiable_parents_to_lwp_user(public.lwp_view_notifiable_parents) AS IMPLICIT;


--
-- Name: calculate_percentage(integer, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.calculate_percentage(total_count integer, matched_count integer) RETURNS numeric
    LANGUAGE sql IMMUTABLE LEAKPROOF PARALLEL SAFE
    AS $$
                SELECT CASE 
                    WHEN total_count = 0 THEN 0 
                    ELSE ROUND((matched_count * 100.0 / total_count)) 
                END;
            $$;


--
-- Name: check_lwp_pupil_parent_user_is_a_parent(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.check_lwp_pupil_parent_user_is_a_parent() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
        DECLARE
            isParent boolean;
        BEGIN
            SELECT
                type = 'PARENT' INTO isParent
            FROM
                lwp_user
            WHERE
                id = NEW."parentId";
            
            IF NOT isParent THEN
                RAISE EXCEPTION 'parent of an lwp_pupil_parent must be a parent user';
            END IF;
        
            RETURN NEW;
        END;
        $$;


--
-- Name: clean_up_and_insert_pupil_fact(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.clean_up_and_insert_pupil_fact() RETURNS void
    LANGUAGE plpgsql
    AS $$
            BEGIN
                DELETE FROM analytics_pupil_fact
                WHERE "timeKey" = (
                    SELECT index FROM static_lwp_period slp
                    WHERE slp."isCurrentPeriod" = true
                );

                PERFORM upsert_pupil_fact();
            END;
            $$;


--
-- Name: do_create_delete_auditing_triggers(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.do_create_delete_auditing_triggers() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
            DECLARE
                table_row record;
            BEGIN
                FOR table_row IN
                        SELECT
                            x.table_name
                        FROM
                            information_schema.tables x
                            LEFT JOIN information_schema.triggers t ON t.event_object_table = x.table_name
                                AND t.event_object_catalog = x.table_catalog
                                AND t.event_object_schema = x.table_schema
                                AND t.trigger_name = 'delete_auditing'
                        WHERE
                            t.trigger_name IS NULL
                            AND (
                                x.table_name ^@ 'static_lwp_'
                                OR x.table_name ^@ 'lwp_'
                            )
                            AND x.table_type <> 'VIEW'
                            AND x.table_schema = TG_TABLE_SCHEMA
                    LOOP
                        EXECUTE format('CREATE TRIGGER delete_auditing '
                                    'BEFORE DELETE ON %I '
                                    'FOR EACH ROW '
                                    'EXECUTE FUNCTION do_delete_auditing ();', table_row.table_name);
                    END LOOP;
                RETURN NULL;
            END;
            $$;


--
-- Name: do_create_deleted_by_deletion_triggers(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.do_create_deleted_by_deletion_triggers() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
            DECLARE
                table_row record;
            BEGIN
                FOR table_row IN
                        SELECT
                            c.table_name
                        FROM
                            information_schema.columns c
                            JOIN information_schema.tables x ON c.table_name = x.table_name
                                AND c.table_catalog = x.table_catalog
                                AND c.table_schema = x.table_schema
                            LEFT JOIN information_schema.triggers t ON t.event_object_table = c.table_name
                                AND t.trigger_name = 'delete_on_deleted_by_set'
                        WHERE
                            c.column_name = 'deletedById'
                            AND t.trigger_name IS NULL
                            AND NOT c.table_name ^@ 'backup_'
                            AND x.table_type <> 'VIEW'
                            AND x.table_schema = current_schema
                    LOOP
                        EXECUTE format('CREATE TRIGGER delete_on_deleted_by_set '
                                    'AFTER UPDATE ON %I '
                                    'FOR EACH ROW '
                                    'WHEN (OLD."deletedById" IS NULL AND NEW."deletedById" IS NOT NULL) '
                                    'EXECUTE FUNCTION do_delete_on_deleted_by_set ();', table_row.table_name);
                    END LOOP;
                RETURN NULL;
            END;
            $$;


--
-- Name: do_delete_auditing(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.do_delete_auditing() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
            BEGIN
                INSERT INTO deleted_item (source, record) VALUES (TG_TABLE_NAME, to_jsonb(OLD.*));
                RETURN OLD;
            END;
            $$;


--
-- Name: do_delete_on_deleted_by_set(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.do_delete_on_deleted_by_set() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $_$
            BEGIN
                EXECUTE format('DELETE FROM %I source_table WHERE (source_table.*) = $1;', TG_TABLE_NAME) USING NEW;
                RETURN NULL;
            END;
            $_$;


--
-- Name: do_set_deleted_school_id_for_pupil(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.do_set_deleted_school_id_for_pupil() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
            BEGIN
                NEW."deletedSchoolId" := OLD."schoolId";
                RETURN NEW;
            END
            $$;


--
-- Name: lwp_notification; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lwp_notification (
    recipient character varying,
    "userId" bigint,
    "notificationType" character varying NOT NULL,
    "emailTemplateType" character varying DEFAULT 'deprecatedTemplate'::character varying NOT NULL,
    params jsonb,
    "badParams" jsonb DEFAULT '[]'::jsonb,
    context jsonb,
    id bigint NOT NULL,
    "logCreatedAt" timestamp without time zone DEFAULT ('now'::text)::timestamp(6) with time zone,
    "logUpdatedAt" timestamp without time zone DEFAULT ('now'::text)::timestamp(6) with time zone NOT NULL,
    "logCreatedById" bigint,
    "logUpdatedById" bigint,
    "userType" character varying,
    "apiId" character varying,
    status public.lwp_notification_event_history_status_enum DEFAULT 'WAITING'::public.lwp_notification_event_history_status_enum NOT NULL
);


--
-- Name: gen_notif_data(public.lwp_user, character varying, character varying, boolean, jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.gen_notif_data(recipient public.lwp_user, preferrednotificationtype character varying, emailtemplatetype character varying, isbulkprocess boolean, params jsonb) RETURNS public.lwp_notification
    LANGUAGE plpgsql IMMUTABLE
    AS $$
                declare
                    notifType varchar(5) := 'EMAIL';
                    globals jsonb;
                begin
                    if (preferredNotificationType = 'phone' and (recipient)."phoneNumber" is not null) or (recipient)."email" is null then
                        notifType := 'SMS';
                    end if;
                    globals := jsonb_build_object('FIRSTNAME', (recipient).firstname, 'LASTNAME', (recipient).lastname, 'USERSTATUS', (recipient)."userStatus");
                    return jsonb_populate_record(null::lwp_notification, jsonb_build_object('logCreatedAt', now(), 'logUpdatedAt', now(), 'recipient', case notifType
                            when 'SMS' then
                                (recipient)."phoneNumber"
                            else
                                (recipient)."email"
                            end, 'userId', (recipient).id, 'userType', (recipient).type, 'notificationType', notifType, 'emailTemplateType', emailTemplateType, 'params', params || globals, 'context', json_build_object('isBulkProcess', isBulkProcess, 'pupilId', params -> 'PUPILID', 'mailData', jsonb_build_object('to', (recipient).email, 'toName', concat((recipient).firstname, ' ', (recipient).lastname), 'params', params)), 'status', 'WAITING'));
                end;
                $$;


--
-- Name: gen_notif_data(public.lwp_user, bigint, character varying, character varying, boolean, jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.gen_notif_data(recipient public.lwp_user, schoolid bigint, preferrednotificationtype character varying, emailtemplatetype character varying, isbulkprocess boolean, params jsonb) RETURNS public.lwp_notification
    LANGUAGE plpgsql IMMUTABLE
    AS $$
    declare
        notifType varchar(5) := 'EMAIL';
       	globals jsonb;
    begin
        if (preferredNotificationType = 'phone' and (recipient)."phoneNumber" is not null) or (recipient)."email" is null then
            notifType := 'SMS';
        end if;
       	globals := jsonb_build_object('FIRSTNAME', (recipient).firstname, 'LASTNAME', (recipient).lastname, 'USERSTATUS', (recipient)."userStatus");
        return jsonb_populate_record(null::lwp_notification, jsonb_build_object('logCreatedAt', now(), 'logUpdatedAt', now(), 'recipient', case notifType
                when 'SMS' then
                    (recipient)."phoneNumber"
                else
                    (recipient)."email"
                end, 'schoolId', schoolId, 'userId', (recipient).id, 'userType', (recipient).type, 'notificationType', notifType, 'emailTemplateType', emailTemplateType, 'params', params || globals, 'context', json_build_object('isBulkProcess', isBulkProcess, 'pupilId', params -> 'PUPILID', 'mailData', jsonb_build_object('to', (recipient).email, 'toName', concat((recipient).firstname, ' ', (recipient).lastname), 'params', params))));
    end;
    $$;


--
-- Name: insert_lwp_notification_event_history(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.insert_lwp_notification_event_history() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
            BEGIN
                INSERT INTO lwp_notification_event_history (status, "notificationId")
                VALUES ('WAITING', NEW.id);
                
                RETURN NEW;
            END;
            $$;


--
-- Name: lwp_bigenough(bigint); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.lwp_bigenough(bigint) RETURNS double precision
    LANGUAGE sql IMMUTABLE
    AS $_$select case when $1 >= 3 then $1::float else null end$_$;


--
-- Name: lwp_id_gen(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.lwp_id_gen() RETURNS bigint
    LANGUAGE plpgsql
    AS $$
        DECLARE
            our_epoch BIGINT := 1609459200;
            seq_id BIGINT;
            now_secs BIGINT;
        BEGIN
            SELECT nextval('lwp_global_seq') INTO seq_id;
            SELECT FLOOR(EXTRACT(EPOCH FROM clock_timestamp())) INTO now_secs;
            return ((now_secs - our_epoch) + (seq_id << 4) + FLOOR(RANDOM() * 16));
        END;
        $$;


--
-- Name: lwp_log_entity_status_change(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.lwp_log_entity_status_change() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $_$
            BEGIN
                EXECUTE FORMAT('INSERT INTO log_lwp_entity_status_change SELECT $1.id, $2.%1$I, $1.%1$I, $3', TG_ARGV[0])
                USING OLD, NEW, TG_TABLE_NAME;
            
                RETURN NEW;
            END;
            $_$;


--
-- Name: lwp_normalise_name_case(character varying); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.lwp_normalise_name_case(character varying) RETURNS character varying
    LANGUAGE sql IMMUTABLE STRICT LEAKPROOF
    AS $_$
            SELECT CASE WHEN $1 ~ '^([^A-Z]+|[^a-z]+)$' THEN
                initcap ($1)
            ELSE
                $1
            END
        $_$;


--
-- Name: lwp_pupil_feedback_history_fill_in_period_index_for_feedbacks_a(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.lwp_pupil_feedback_history_fill_in_period_index_for_feedbacks_a() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
        declare
        feedback   lwp_pupil_feedback;
        begin
            SELECT * FROM lwp_pupil_feedback lpf
            WHERE
                lpf.id = NEW."lwpPupilFeedbackId"
                AND lpf."periodIndex" IS NULL
            INTO feedback;

            if FOUND then
                UPDATE lwp_pupil_feedback lpf
                SET "periodIndex" = (
                    SELECT ls."curentPeriodIndex"
                    FROM lwp_school ls
                    JOIN lwp_pupil lp
                        ON lp.id = NEW."lwpPupilId"
                    WHERE
                        ls.id = lp."schoolId"
                )
                WHERE lpf.id = NEW."lwpPupilFeedbackId";
            end if;
            
            return NEW;
        end;
        $$;


--
-- Name: lwp_setup_magic_link_times_if_unset(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.lwp_setup_magic_link_times_if_unset() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
            declare
                timeoutInterval interval;
            begin
                timeoutInterval := (((
                    select
                        coalesce(min(value), '{"RESETPASSWORD":1,"INVITATION":24, "REJECT_INVITATION": 24, "TOPICACCESS": 1008, "TROPHY": 1008, "READING": 1008, "DEMOTOPIC": 2160, "SCHOOL_IMPACT_REPORT": 1008}')::jsonb
                    from static_lwp_parameter
                    where
                        key = 'MAGIC_LINK_TIMEOUT')->>(new."type"))::integer * interval '1 hour');
                new."expiryTime" = current_timestamp + timeoutInterval;
                new."lastRegeneratedAt" = now();
                return new;
            end;
            $$;


--
-- Name: nanoid(integer, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.nanoid(size integer DEFAULT 21, alphabet text DEFAULT '_-0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'::text) RETURNS text
    LANGUAGE plpgsql
    AS $$
       DECLARE
           idBuilder      text := '';
           counter        int  := 0;
           bytes          bytea;
           alphabetIndex  int;
           alphabetArray  text[];
           alphabetLength int;
           mask           int;
           step           int;
       BEGIN
           alphabetArray := regexp_split_to_array(alphabet, '');
           alphabetLength := array_length(alphabetArray, 1);
           mask := (2 << cast(floor(log(alphabetLength - 1) / log(2)) as int)) - 1;
           step := cast(ceil(1.6 * mask * size / alphabetLength) AS int);
       
           while true
               loop
                   bytes := gen_random_bytes(step);
                   while counter < step
                       loop
                           alphabetIndex := (get_byte(bytes, counter) & mask) + 1;
                           if alphabetIndex <= alphabetLength then
                               idBuilder := idBuilder || alphabetArray[alphabetIndex];
                               if length(idBuilder) = size then
                                   return idBuilder;
                               end if;
                           end if;
                           counter := counter + 1;
                       end loop;
       
                   counter := 0;
               end loop;
       END
       $$;


--
-- Name: normalise_school_year(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.normalise_school_year(year_string text) RETURNS integer
    LANGUAGE plpgsql IMMUTABLE
    AS $$
            DECLARE
                cleaned text;
                matched text;
            BEGIN
                IF year_string IS NULL THEN
                    RETURN NULL;
                END IF;

                cleaned := regexp_replace(lower(year_string), '[^a-z0-9-]', '', 'g');

                IF cleaned LIKE 'r%' THEN
                    RETURN 0; -- Reception
                END IF;

                IF cleaned IN ('n', 'n1', 'e1') THEN
                    RETURN -2; -- Nursery (two years below Reception)
                END IF;

                IF cleaned IN ('nursery', 'n2', 'e2') THEN
                    RETURN -1; -- Nursery (one year below Reception)
                END IF;

                matched := substring(cleaned from '-?[0-9]+');

                IF matched IS NOT NULL THEN
                    RETURN matched::int; -- numeric year (0 = Reception)
                END IF;

                RETURN NULL; -- unresolvable: X, Unknown, [Unknown], blank, etc.
            END;
            $$;


--
-- Name: refresh_spm_dashboard_views(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.refresh_spm_dashboard_views() RETURNS void
    LANGUAGE plpgsql
    AS $$
            DECLARE
                view_name text;
                is_populated boolean;
            BEGIN
                PERFORM set_config('statement_timeout', '600000', true);

                FOREACH view_name IN ARRAY ARRAY['lwp_view_spm_school_metrics', 'lwp_view_spm_school_class_reading_targets'] LOOP
                    SELECT c.relispopulated INTO is_populated
                    FROM pg_class c
                    JOIN pg_namespace n ON n.oid = c.relnamespace
                    WHERE n.nspname = 'public' AND c.relname = view_name;

                    IF is_populated THEN
                        EXECUTE format('REFRESH MATERIALIZED VIEW CONCURRENTLY public.%I', view_name);
                    ELSE
                        EXECUTE format('REFRESH MATERIALIZED VIEW public.%I', view_name);
                    END IF;
                END LOOP;
            END;
            $$;


--
-- Name: set_is_program_tag(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_is_program_tag() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
            BEGIN
               IF TG_TABLE_NAME = 'lwp_school_static_tags' THEN
                -- For lwp_school_static_tags updates, set isProgramTag based on existence in static_lwp_program
                NEW."isProgramTag" := EXISTS (
                    SELECT 1 
                    FROM static_lwp_program slp 
                    WHERE slp."schoolTagId" = NEW."tagId"
                );
                
            ELSIF TG_TABLE_NAME = 'static_lwp_program' THEN
                -- For static_lwp_program updates, update the related lwp_school_static_tags record
                UPDATE lwp_school_static_tags
                SET "isProgramTag" = FALSE
                WHERE "tagId" = OLD."schoolTagId";
                    
                IF NEW."schoolTagId" IS NOT NULL THEN
                    UPDATE lwp_school_static_tags
                    SET "isProgramTag" = EXISTS (
                        SELECT 1 
                        FROM static_lwp_program slp 
                        WHERE slp."schoolTagId" = NEW."schoolTagId"
                    )
                    WHERE "tagId" = NEW."schoolTagId";
                END IF;
            END IF;

        
                RETURN NEW;
            END;
            $$;


--
-- Name: set_security_invoker_for_views(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_security_invoker_for_views() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
                BEGIN
                    EXECUTE 'ALTER VIEW ' || NEW.name || ' SET (security_invoker = true);';
                    RETURN NULL;
                END;
            $$;


--
-- Name: update_class_counts_from_lwp_class_pupil(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_class_counts_from_lwp_class_pupil() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
        begin
            -- TODO eventually deprecate the flag on the table and do all of this in-trigger
            if tg_op != 'INSERT' then
                update
                    lwp_school_class
                set
                    "isStatsNeedUpdate" = true
                where
                    id = old."lwpSchoolClassId";
            end if;

            if tg_op = 'DELETE' then
                return old;
            else
                update
                    lwp_school_class
                set
                    "isStatsNeedUpdate" = true
                where
                    id = new."lwpSchoolClassId";
            end if;
            
            return new;
        end;

        $$;


--
-- Name: update_lwp_notification_from_event_history(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_lwp_notification_from_event_history() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
            BEGIN
                WITH max_notif_status AS (
                    SELECT MAX(status) AS status, "notificationId"
                    FROM lwp_notification_event_history
                    WHERE "notificationId" = COALESCE(NEW."notificationId", OLD."notificationId")
                    GROUP BY "notificationId"
                )
                UPDATE lwp_notification ln2
                SET status = mns.status
                FROM max_notif_status mns
                WHERE ln2.id = mns."notificationId";

                RETURN NULL;
            END;
            $$;


--
-- Name: upsert_pupil_fact(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.upsert_pupil_fact() RETURNS void
    LANGUAGE plpgsql
    AS $$
            BEGIN
                INSERT INTO analytics_pupil_fact (
                    "pupilId",
                    "schoolId",
                    "timeKey",
                    "timeGrain",
                    "subjectId",
                    "isActive",
                    "activitiesSetCount",
                    "activitiesCompletedCount",
                    "activitiesAccessedCount",
                    "topicsSetCount",
                    "topicsCompletedCount",
                    "readingTarget",
                    "videosWatchedCount",
                    "parentCommentsLeftCount",
                    "pupilCommentsLeftCount",
                    "teacherCommentsLeftCount",
                    "parentPhotosUploadedCount",
                    "teacherPhotosUploadedCount",
                    "parentAudioClipsUploadedCount",
                    "teacherAudioClipsUploadedCount",
                    "starRatingsCount",
                    "sumStarRatings",
                    "oneStarRatingsCount",
                    "twoStarRatingsCount",
                    "threeStarRatingsCount",
                    "fourStarRatingsCount",
                    "fiveStarRatingsCount",
                    "parentFeedbackEntries",
                    "teacherFeedbackEntries",
                    "subject",
                    "isPupilPremium",
                    "gender",
                    "ethnicityCode",
                    "sen",
                    "englishAsAdditionalLanguage",
                    "classYearGroup",
                    "activeParentsCount"
                )
                WITH
                -- Constants for academic year
                constants AS (
                    SELECT
                        slp.index as time_key
                    FROM
                        static_lwp_period slp
                    WHERE
                        slp."isCurrentPeriod" = true
                ),

                -- Base student-subject CTE (filtered by pupils with topic activity in the academic year)
                student_subject_base AS (
                    SELECT DISTINCT
                        lp.id as student_id,
                        lp."schoolId" as school_id,
                        COALESCE(lp."isPremium", false) as is_pupil_premium,
                        lp.gender,
                        CASE
                            WHEN ws.sen_status IS NULL THEN NULL
                            WHEN ws.sen_status IN ('N', 'N,', '') THEN false
                            ELSE true
                        END as has_sen,
                        ws.ethnicity_code,
                        ws.english_as_additional_language_status,
                        COALESCE(sltd."subjectId", 0) as subject_id,
                        COALESCE(sls.name,
                            CASE
                                WHEN slt."isReading" = true and sls.id is null  THEN 'Reading'
                                WHEN slt."isReading" = false AND sltd."subjectId" IS NULL THEN 'Other'
                                ELSE 'Unknown'
                            END
                        ) as subject_name,
                        lpt.id as pupil_topic_id,
                        lpt."releaseDate",
                        lpt."readingTarget",
                        lpt."watchedVideo",
                        lpt."earnedGoldStar",
                        slt.id as topic_id,
                        sla.id as static_activity_id
                    FROM lwp_pupil lp
                    JOIN lwp_school ls ON ls.id = lp."schoolId" AND NOT ls."isTestSchool" AND NOT ls.inactive
                    JOIN constants c on c.time_key = ls."curentPeriodIndex"
                    LEFT JOIN imported_student ws ON ws.id = lp."importedStudentId"
                    JOIN lwp_pupil_topic lpt ON lpt."pupilId" = lp.id AND lpt."periodIndex" >= c.time_key
                    JOIN static_lwp_topic slt ON slt.id = lpt."topicId"
                    LEFT JOIN static_lwp_topic_domain_year_group sltdyg ON sltdyg."topicId" = slt.id
                    LEFT JOIN static_lwp_topic_domain sltd ON sltd.id = sltdyg."domainId"
                    LEFT JOIN static_lwp_subject sls ON sls.id = sltd."subjectId"
                    LEFT JOIN static_lwp_activity sla ON sla."topicId" = slt.id
                ),

                -- Completed activities aggregation
                completed_activities_by_subject AS (
                    SELECT
                        ssb.student_id,
                        ssb.subject_id,
                        COUNT(DISTINCT lpa.id) as activities_completed_count
                    FROM student_subject_base ssb
                    JOIN lwp_pupil_activity lpa ON lpa."activityId" = ssb.static_activity_id
                        AND lpa."topicId" = ssb.pupil_topic_id
                    where lpa."earnedStar" = true
                    GROUP BY ssb.student_id, ssb.subject_id
                ),

                -- Star ratings aggregation
                star_ratings_by_subject AS (
                    SELECT
                        ssb.student_id,
                        ssb.subject_id,
                        COUNT(lpa.rating) as total_star_ratings_given,
                        COALESCE(SUM(lpa.rating), 0) as sum_star_ratings,
                        COUNT(lpa.rating) FILTER (WHERE lpa.rating = 1) as one_star_ratings,
                        COUNT(lpa.rating) FILTER (WHERE lpa.rating = 2) as two_star_ratings,
                        COUNT(lpa.rating) FILTER (WHERE lpa.rating = 3) as three_star_ratings,
                        COUNT(lpa.rating) FILTER (WHERE lpa.rating = 4) as four_star_ratings,
                        COUNT(lpa.rating) FILTER (WHERE lpa.rating = 5) as five_star_ratings
                    FROM student_subject_base ssb
                    JOIN lwp_pupil_activity lpa ON lpa."activityId" = ssb.static_activity_id
                        AND lpa."topicId" = ssb.pupil_topic_id
                    WHERE
                        lpa.rating IS NOT NULL
                        AND lpa."earnedStar" = true
                    GROUP BY ssb.student_id, ssb.subject_id
                ),
				student_subjects AS (
				    SELECT DISTINCT student_id, subject_id
				    FROM student_subject_base
				),
                -- Feedback metrics aggregation
                feedback_metrics_by_subject AS (
                    SELECT
                        ss.student_id,
                        ss.subject_id,
                        COUNT(DISTINCT lpf.id) FILTER (WHERE lpf."userType" = 'PARENT'
                            AND (lpf."pupilComment" IS NOT NULL OR lpf."parentComment" IS NOT NULL OR lpf."comment" IS NOT NULL)
                        ) as comments_left_by_parents_count,
                        COUNT(DISTINCT lpf.id) FILTER (WHERE lpf."userType" = 'PUPIL'
                            AND (lpf."pupilComment" IS NOT NULL OR lpf."parentComment" IS NOT NULL OR lpf."comment" IS NOT NULL)
                        ) as comments_left_by_pupils_count,
                        COUNT(DISTINCT lpf.id) FILTER (WHERE lpf."userType" = 'TEACHER' AND lpf."comment" IS NOT NULL
                        ) as comments_left_by_teachers_count,
                        COUNT(DISTINCT lpfm.id) FILTER (WHERE lpfm."type" = 'PHOTO' AND lpf."userType" = 'PARENT') as photos_uploaded_by_parents_count,
                        COUNT(DISTINCT lpfm.id) FILTER (WHERE lpfm."type" = 'PHOTO' AND lpf."userType" = 'TEACHER') as photos_uploaded_by_teachers_count,
                        COUNT(DISTINCT lpfm.id) FILTER (WHERE lpfm."type" = 'AUDIO' AND lpf."userType" = 'PARENT') as audio_clips_uploaded_by_parents_count,
                        COUNT(DISTINCT lpfm.id) FILTER (WHERE lpfm."type" = 'AUDIO' AND lpf."userType" = 'TEACHER') as audio_clips_uploaded_by_teachers_count,
                        COUNT(DISTINCT lpf.id) FILTER (WHERE lpf."userType" = 'PARENT') as parent_feedback_entries,
                        COUNT(DISTINCT lpf.id) FILTER (WHERE lpf."userType" = 'TEACHER') as teacher_feedback_entries
                    FROM student_subjects ss
                    LEFT JOIN lwp_pupil_feedback_history lpfh ON lpfh."lwpPupilId" = ss.student_id
                    LEFT JOIN lwp_pupil_feedback lpf ON lpf.id = lpfh."lwpPupilFeedbackId" and lpf."originalFeedbackId" IS NULL
                    LEFT JOIN lwp_pupil_feedback_media lpfm ON lpfm."feedbackId" = lpf.id
                    LEFT JOIN lwp_pupil_activity lpa ON lpf."activityId" = lpa.id
                    LEFT JOIN lwp_pupil_topic lpt_feedback ON lpa."topicId" = lpt_feedback.id
                    LEFT JOIN static_lwp_topic slt_feedback ON slt_feedback.id = lpt_feedback."topicId"
                    LEFT JOIN static_lwp_topic_domain_year_group sltdyg_feedback ON sltdyg_feedback."topicId" = slt_feedback.id
                    LEFT JOIN static_lwp_topic_domain sltd_feedback ON sltd_feedback.id = sltdyg_feedback."domainId"
                    CROSS JOIN constants c
                    WHERE lpf."periodIndex" >= c.time_key
                        AND (sltd_feedback."subjectId" = ss.subject_id OR sltd_feedback."subjectId" IS NULL)
                    GROUP BY ss.student_id, ss.subject_id
                ),

                -- Resolve each pupil to a single class year group (their current-period class).
                pupil_class_year_group AS (
                    SELECT DISTINCT ON (lcp."lwpPupilId")
                        lcp."lwpPupilId" as student_id,
                        slyg.year as class_year_group
                    FROM student_subjects sb
                    JOIN lwp_class_pupil lcp ON lcp."lwpPupilId" = sb.student_id
                    JOIN lwp_school_class lsc ON lsc.id = lcp."lwpSchoolClassId"
                    JOIN static_lwp_year_group slyg ON slyg.id = lsc."yearGroup"
                    CROSS JOIN constants c
                    WHERE lsc."periodIndex" >= c.time_key
                        AND lsc.status = 'ACTIVE'
                    ORDER BY lcp."lwpPupilId", lsc.id
                ),

                -- Active parents aggregation
                active_parents_by_student AS (
                    SELECT
                        ssb.student_id,
                        COUNT(DISTINCT lpp."parentId") FILTER (WHERE
                            lpp.status = 'ACTIVE'
                            AND lu."userStatus" IN ('ACTIVE', 'ACCOUNTLESS')
                        ) as active_parents_count
                    FROM student_subject_base ssb
                    LEFT JOIN lwp_pupil_parent lpp ON lpp."pupilId" = ssb.student_id
                    LEFT JOIN lwp_user lu ON lu.id = lpp."parentId" AND lu.type = 'PARENT'
                    GROUP BY ssb.student_id
                ),

                -- Main yearly metrics aggregation
                yearly_metrics AS (
                    SELECT
                        c.time_key,
                        ssb.student_id,
                        ssb.school_id,
                        ssb.subject_id,
                        ssb.subject_name,
                        ssb.is_pupil_premium,
                        ssb.gender,
                        ssb.ethnicity_code,
                        ssb.has_sen,
                        ssb.english_as_additional_language_status,
                        pcyg.class_year_group,

                        -- Direct aggregations from base CTE
                        COUNT(DISTINCT ssb.static_activity_id) as activities_set_count,
                        COUNT(DISTINCT ssb.pupil_topic_id) as topics_set_count,
                        COUNT(DISTINCT ssb.pupil_topic_id) FILTER (WHERE ssb."watchedVideo" = true) as videos_watched_count,

                        -- Activity access and completion
                        COUNT(DISTINCT lpa.id) FILTER (WHERE lpa."earnedStar" = true or lpa."logAccessedOnMobile" <> 0 or lpa."logAccessedOnDesktop" <> 0) as activities_accessed_count,
                        COUNT(DISTINCT ssb.pupil_topic_id) FILTER (WHERE ssb."earnedGoldStar") as topics_completed_count,

                        -- Reading target sum
                        COALESCE(SUM(ssb."readingTarget"), 0) as reading_target_sum
                    FROM student_subject_base ssb
                    CROSS JOIN constants c
                    LEFT JOIN pupil_class_year_group pcyg ON pcyg.student_id = ssb.student_id
                    LEFT JOIN lwp_pupil_activity lpa ON lpa."activityId" = ssb.static_activity_id
                        AND lpa."topicId" = ssb.pupil_topic_id
                    GROUP BY c.time_key, ssb.student_id, ssb.school_id, ssb.subject_id, ssb.subject_name,
                            ssb.is_pupil_premium, ssb.gender, ssb.ethnicity_code, ssb.has_sen, ssb.english_as_additional_language_status,
                            pcyg.class_year_group
                )

                -- Final SELECT with all analytics metrics
                SELECT
                    ym.student_id as "pupilId",
                    ym.school_id as "schoolId",
                    ym.time_key as "timeKey",
                    -- Time grain (always yearly for this extraction)
                    'yearly' as "timeGrain",
                    ym.subject_id as "subjectId",
                    (ym.activities_set_count > 0 OR ym.activities_accessed_count > 0) as "isActive",
                    -- Activity metrics
                    ym.activities_set_count as "activitiesSetCount",
                    COALESCE(cabs.activities_completed_count, 0) as "activitiesCompletedCount",
                    ym.activities_accessed_count as "activitiesAccessedCount",
                    ym.topics_set_count as "topicsSetCount",
                    ym.topics_completed_count as "topicsCompletedCount",
                    ym.reading_target_sum as "readingTarget",
                    ym.videos_watched_count as "videosWatchedCount",
                    -- Feedback metrics
                    COALESCE(fmbs.comments_left_by_parents_count, 0) as "parentCommentsLeftCount",
                    COALESCE(fmbs.comments_left_by_pupils_count, 0) as "pupilCommentsLeftCount",
                    COALESCE(fmbs.comments_left_by_teachers_count, 0) as "teacherCommentsLeftCount",
                    COALESCE(fmbs.photos_uploaded_by_parents_count, 0) as "parentPhotosUploadedCount",
                    COALESCE(fmbs.photos_uploaded_by_teachers_count, 0) as "teacherPhotosUploadedCount",
                    COALESCE(fmbs.audio_clips_uploaded_by_parents_count, 0) as "parentAudioClipsUploadedCount",
                    COALESCE(fmbs.audio_clips_uploaded_by_teachers_count, 0) as "teacherAudioClipsUploadedCount",
                    -- Star ratings
                    COALESCE(srbs.total_star_ratings_given, 0) as "starRatingsCount",
                    COALESCE(srbs.sum_star_ratings, 0) as "sumStarRatings",
                    COALESCE(srbs.one_star_ratings, 0) as "oneStarRatingsCount",
                    COALESCE(srbs.two_star_ratings, 0) as "twoStarRatingsCount",
                    COALESCE(srbs.three_star_ratings, 0) as "threeStarRatingsCount",
                    COALESCE(srbs.four_star_ratings, 0) as "fourStarRatingsCount",
                    COALESCE(srbs.five_star_ratings, 0) as "fiveStarRatingsCount",
                    -- Feedback entries
                    COALESCE(fmbs.parent_feedback_entries, 0) as "parentFeedbackEntries",
                    COALESCE(fmbs.teacher_feedback_entries, 0) as "teacherFeedbackEntries",
                    ym.subject_name as "subject",
                    ym.is_pupil_premium as "isPupilPremium",
                    ym.gender,
                    ym.ethnicity_code as "ethnicityCode",
                    ym.has_sen as "sen",
                    ym.english_as_additional_language_status as "englishAsAdditionalLanguage",
                    ym.class_year_group as "classYearGroup",

                    -- Active parents
                    COALESCE(apbs.active_parents_count, 0) as "activeParentsCount"

                FROM yearly_metrics ym
                LEFT JOIN completed_activities_by_subject cabs ON cabs.student_id = ym.student_id AND cabs.subject_id = ym.subject_id
                LEFT JOIN star_ratings_by_subject srbs ON srbs.student_id = ym.student_id AND srbs.subject_id = ym.subject_id
                LEFT JOIN feedback_metrics_by_subject fmbs ON fmbs.student_id = ym.student_id AND fmbs.subject_id = ym.subject_id
                LEFT JOIN active_parents_by_student apbs ON apbs.student_id = ym.student_id
                ON CONFLICT ("pupilId", "schoolId", "timeKey", "timeGrain", "subjectId")
                DO UPDATE SET
                    "isActive" = EXCLUDED."isActive",
                    "activitiesSetCount" = EXCLUDED."activitiesSetCount",
                    "activitiesCompletedCount" = EXCLUDED."activitiesCompletedCount",
                    "activitiesAccessedCount" = EXCLUDED."activitiesAccessedCount",
                    "topicsSetCount" = EXCLUDED."topicsSetCount",
                    "topicsCompletedCount" = EXCLUDED."topicsCompletedCount",
                    "readingTarget" = EXCLUDED."readingTarget",
                    "videosWatchedCount" = EXCLUDED."videosWatchedCount",
                    "parentCommentsLeftCount" = EXCLUDED."parentCommentsLeftCount",
                    "pupilCommentsLeftCount" = EXCLUDED."pupilCommentsLeftCount",
                    "teacherCommentsLeftCount" = EXCLUDED."teacherCommentsLeftCount",
                    "parentPhotosUploadedCount" = EXCLUDED."parentPhotosUploadedCount",
                    "teacherPhotosUploadedCount" = EXCLUDED."teacherPhotosUploadedCount",
                    "parentAudioClipsUploadedCount" = EXCLUDED."parentAudioClipsUploadedCount",
                    "teacherAudioClipsUploadedCount" = EXCLUDED."teacherAudioClipsUploadedCount",
                    "starRatingsCount" = EXCLUDED."starRatingsCount",
                    "sumStarRatings" = EXCLUDED."sumStarRatings",
                    "oneStarRatingsCount" = EXCLUDED."oneStarRatingsCount",
                    "twoStarRatingsCount" = EXCLUDED."twoStarRatingsCount",
                    "threeStarRatingsCount" = EXCLUDED."threeStarRatingsCount",
                    "fourStarRatingsCount" = EXCLUDED."fourStarRatingsCount",
                    "fiveStarRatingsCount" = EXCLUDED."fiveStarRatingsCount",
                    "parentFeedbackEntries" = EXCLUDED."parentFeedbackEntries",
                    "teacherFeedbackEntries" = EXCLUDED."teacherFeedbackEntries",
                    "subject" = EXCLUDED."subject",
                    "isPupilPremium" = EXCLUDED."isPupilPremium",
                    "gender" = EXCLUDED."gender",
                    "ethnicityCode" = EXCLUDED."ethnicityCode",
                    "sen" = EXCLUDED."sen",
                    "englishAsAdditionalLanguage" = EXCLUDED."englishAsAdditionalLanguage",
                    "classYearGroup" = EXCLUDED."classYearGroup",
                    "activeParentsCount" = EXCLUDED."activeParentsCount",
                    "updatedAt" = CURRENT_TIMESTAMP;
            END;
            $$;


--
-- Name: upsert_school_fact(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.upsert_school_fact() RETURNS void
    LANGUAGE plpgsql
    AS $$
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
            $$;


--
-- Name: deleted_item_partition_template; Type: TABLE; Schema: partman_templates; Owner: -
--

CREATE TABLE partman_templates.deleted_item_partition_template (
    id bigint NOT NULL,
    "deletedAt" timestamp without time zone NOT NULL,
    "recordId" text,
    source character varying NOT NULL,
    record jsonb NOT NULL
);


--
-- Name: analytics_content_fact; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.analytics_content_fact (
    id bigint NOT NULL,
    "timeKey" integer NOT NULL,
    "timeGrain" character varying(20) NOT NULL,
    "activityId" bigint,
    "topicId" bigint,
    "segmentId" bigint NOT NULL,
    subject character varying(100),
    "subjectIds" bigint[],
    domains character varying(100)[],
    "domainIds" bigint[],
    "yearGroups" character varying(50)[],
    "yearGroupIds" bigint[],
    "activityName" character varying(255),
    "activityOrder" integer,
    "topicName" character varying(255),
    "parentTopicName" character varying(255),
    "totalAssignmentsCount" integer DEFAULT 0,
    "completedAssignmentsCount" integer DEFAULT 0,
    "accessedAssignmentsCount" integer DEFAULT 0,
    "oneStarRatingsCount" integer DEFAULT 0,
    "twoStarRatingsCount" integer DEFAULT 0,
    "threeStarRatingsCount" integer DEFAULT 0,
    "fourStarRatingsCount" integer DEFAULT 0,
    "fiveStarRatingsCount" integer DEFAULT 0,
    "ratingsCount" integer DEFAULT 0,
    "totalRatingsSum" integer DEFAULT 0,
    "countParentComments" integer DEFAULT 0,
    "countTeacherComments" integer DEFAULT 0,
    "countPupilComments" integer DEFAULT 0,
    "photosUploadedCount" integer DEFAULT 0,
    "audioClipsUploadedCount" integer DEFAULT 0,
    "uniqueStudentsAssigned" integer DEFAULT 0,
    "uniqueStudentsCompleted" integer DEFAULT 0,
    "updatedAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "analytics_content_fact_timeGrain_check" CHECK ((("timeGrain")::text = ANY ((ARRAY['weekly'::character varying, 'monthly'::character varying, 'yearly'::character varying])::text[])))
);


--
-- Name: analytics_content_fact_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.analytics_content_fact_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: analytics_content_fact_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.analytics_content_fact_id_seq OWNED BY public.analytics_content_fact.id;


--
-- Name: analytics_pupil_dim; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.analytics_pupil_dim (
    "segmentId" bigint NOT NULL,
    "segmentType" character varying(50) NOT NULL,
    "segmentValue" character varying(100) NOT NULL,
    "segmentDescription" character varying(255),
    "createdAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: analytics_pupil_dim_segmentId_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."analytics_pupil_dim_segmentId_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: analytics_pupil_dim_segmentId_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."analytics_pupil_dim_segmentId_seq" OWNED BY public.analytics_pupil_dim."segmentId";


--
-- Name: analytics_pupil_fact; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.analytics_pupil_fact (
    id bigint NOT NULL,
    "pupilId" bigint,
    "schoolId" bigint,
    "timeKey" integer NOT NULL,
    "timeGrain" character varying(20) NOT NULL,
    "subjectId" bigint,
    "isActive" boolean,
    "activitiesSetCount" integer DEFAULT 0,
    "activitiesCompletedCount" integer DEFAULT 0,
    "activitiesAccessedCount" integer DEFAULT 0,
    "topicsSetCount" integer DEFAULT 0,
    "topicsCompletedCount" integer DEFAULT 0,
    "readingTarget" integer DEFAULT 0,
    "videosWatchedCount" integer DEFAULT 0,
    "parentCommentsLeftCount" integer DEFAULT 0,
    "pupilCommentsLeftCount" integer DEFAULT 0,
    "teacherCommentsLeftCount" integer DEFAULT 0,
    "parentPhotosUploadedCount" integer DEFAULT 0,
    "teacherPhotosUploadedCount" integer DEFAULT 0,
    "parentAudioClipsUploadedCount" integer DEFAULT 0,
    "teacherAudioClipsUploadedCount" integer DEFAULT 0,
    "starRatingsCount" integer DEFAULT 0,
    "sumStarRatings" integer DEFAULT 0,
    "oneStarRatingsCount" integer DEFAULT 0,
    "twoStarRatingsCount" integer DEFAULT 0,
    "threeStarRatingsCount" integer DEFAULT 0,
    "fourStarRatingsCount" integer DEFAULT 0,
    "fiveStarRatingsCount" integer DEFAULT 0,
    "parentFeedbackEntries" integer DEFAULT 0,
    "teacherFeedbackEntries" integer DEFAULT 0,
    subject character varying,
    "isPupilPremium" boolean,
    gender character varying,
    "ethnicityCode" character varying,
    sen boolean,
    "englishAsAdditionalLanguage" character varying,
    "activeParentsCount" integer DEFAULT 0,
    "updatedAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "classYearGroup" character varying,
    CONSTRAINT "analytics_pupil_fact_timeGrain_check" CHECK ((("timeGrain")::text = ANY ((ARRAY['weekly'::character varying, 'monthly'::character varying, 'yearly'::character varying])::text[])))
);


--
-- Name: analytics_pupil_fact_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.analytics_pupil_fact_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: analytics_pupil_fact_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.analytics_pupil_fact_id_seq OWNED BY public.analytics_pupil_fact.id;


--
-- Name: analytics_school_fact; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.analytics_school_fact (
    "schoolId" bigint NOT NULL,
    "subjectId" bigint NOT NULL,
    "timeKey" integer NOT NULL,
    region character varying(255),
    subject character varying(255) NOT NULL,
    "numberOfClasses" integer DEFAULT 0 NOT NULL,
    "isSignedUp" boolean DEFAULT false NOT NULL,
    "isOffered" boolean DEFAULT false NOT NULL,
    "isReleased" boolean DEFAULT false NOT NULL,
    "updatedAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "numberOfTeachers" integer DEFAULT 0 NOT NULL,
    "numberOfSchoolLeaders" integer DEFAULT 0 NOT NULL,
    "programmeType" character varying(255),
    "registeredParentsCount" integer DEFAULT 0 NOT NULL
);


--
-- Name: analytics_school_groups_dim; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.analytics_school_groups_dim (
    "groupId" bigint NOT NULL,
    "groupType" character varying NOT NULL,
    "groupName" character varying NOT NULL,
    description character varying,
    "createdAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "analytics_school_groups_dim_groupType_check" CHECK ((("groupType")::text = ANY ((ARRAY['region'::character varying, 'local_authority'::character varying, 'trust'::character varying, 'custom'::character varying])::text[])))
);


--
-- Name: analytics_school_groups_dim_groupId_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."analytics_school_groups_dim_groupId_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: analytics_school_groups_dim_groupId_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."analytics_school_groups_dim_groupId_seq" OWNED BY public.analytics_school_groups_dim."groupId";


--
-- Name: analytics_schools_in_groups_dim; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.analytics_schools_in_groups_dim (
    id bigint NOT NULL,
    "groupId" bigint NOT NULL,
    "schoolId" bigint NOT NULL,
    region character varying,
    "localAuthority" character varying,
    "addedAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: analytics_schools_in_groups_dim_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.analytics_schools_in_groups_dim_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: analytics_schools_in_groups_dim_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.analytics_schools_in_groups_dim_id_seq OWNED BY public.analytics_schools_in_groups_dim.id;


--
-- Name: analytics_time_dim; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.analytics_time_dim (
    "timeKey" integer NOT NULL,
    "timeGrain" character varying(20) NOT NULL,
    "academicYear" integer,
    "academicTerm" character varying,
    "calendarYear" integer,
    "calendarMonth" integer,
    "weekNumber" integer,
    "periodStartDate" date,
    "periodEndDate" date,
    "termWeekNumber" integer,
    "periodDescription" character varying,
    "createdAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "analytics_time_dim_timeGrain_check" CHECK ((("timeGrain")::text = ANY ((ARRAY['weekly'::character varying, 'monthly'::character varying, 'yearly'::character varying])::text[])))
);


--
-- Name: backup_20230906_lwp_user_status_corrections; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.backup_20230906_lwp_user_status_corrections (
    user_id bigint NOT NULL,
    old_status character varying(25)
);


--
-- Name: backup_20251218_can_be_deleted_20260618_lwp_8716_remove_class_a; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.backup_20251218_can_be_deleted_20260618_lwp_8716_remove_class_a (
    pupil_topic_id bigint NOT NULL,
    class_id bigint,
    class_topic_id bigint,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: backup_2026_10-20_lwp_school_class_classsize; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."backup_2026_10-20_lwp_school_class_classsize" (
    id bigint,
    "classSize" integer
);


--
-- Name: backup_2026_10-20_static_lwp_email_template; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."backup_2026_10-20_static_lwp_email_template" (
    subject character varying,
    "senderEmail" character varying,
    "senderName" character varying,
    type character varying,
    id bigint,
    "logCreatedAt" timestamp without time zone,
    "logUpdatedAt" timestamp without time zone,
    "logCreatedById" bigint,
    "logUpdatedById" bigint,
    "lwpNotificationId" bigint,
    "previewLine" character varying,
    "deletedAt" timestamp without time zone,
    "deletedById" bigint
);


--
-- Name: deleted_item; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.deleted_item (
    id bigint NOT NULL,
    "deletedAt" timestamp without time zone DEFAULT ('now'::text)::timestamp(6) with time zone NOT NULL,
    "recordId" text GENERATED ALWAYS AS ((record ->> 'id'::text)) STORED,
    source character varying NOT NULL,
    record jsonb NOT NULL
)
PARTITION BY RANGE ("deletedAt");


--
-- Name: deleted_item_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.deleted_item_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: deleted_item_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.deleted_item_id_seq OWNED BY public.deleted_item.id;


--
-- Name: backup_deleted_item; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.backup_deleted_item (
    id bigint DEFAULT nextval('public.deleted_item_id_seq'::regclass) NOT NULL,
    "deletedAt" timestamp without time zone DEFAULT ('now'::text)::timestamp(6) with time zone,
    source character varying NOT NULL,
    record jsonb NOT NULL,
    "recordId" character varying GENERATED ALWAYS AS ((record ->> 'id'::text)) STORED
);


--
-- Name: backup_emailTemplate_schoolId_emailContent_smsContent; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."backup_emailTemplate_schoolId_emailContent_smsContent" (
    "emailTemplateType" character varying,
    "emailContent" character varying,
    "smsContent" character varying,
    "schoolId" bigint
);


--
-- Name: backup_lwp_deleted_users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.backup_lwp_deleted_users (
    id bigint,
    email character varying,
    "phoneNumber" character varying,
    status text
);


--
-- Name: backup_staticLwpTopicIds_domainIds; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."backup_staticLwpTopicIds_domainIds" (
    "staticLwpTopicId" bigint,
    "staticLwpTopicDomainId" bigint
);


--
-- Name: backup_user_seen_child_switch_tooltip; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.backup_user_seen_child_switch_tooltip (
    id bigint
);


--
-- Name: deleted_item_default; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.deleted_item_default (
    id bigint DEFAULT nextval('public.deleted_item_id_seq'::regclass) NOT NULL,
    "deletedAt" timestamp without time zone DEFAULT ('now'::text)::timestamp(6) with time zone NOT NULL,
    "recordId" text GENERATED ALWAYS AS ((record ->> 'id'::text)) STORED,
    source character varying NOT NULL,
    record jsonb NOT NULL
);


--
-- Name: deleted_item_id_seq1; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.deleted_item_id_seq1
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: deleted_item_id_seq1; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.deleted_item_id_seq1 OWNED BY public.deleted_item.id;


--
-- Name: deleted_item_p202608; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.deleted_item_p202608 (
    id bigint DEFAULT nextval('public.deleted_item_id_seq'::regclass) NOT NULL,
    "deletedAt" timestamp without time zone DEFAULT ('now'::text)::timestamp(6) with time zone NOT NULL,
    "recordId" text GENERATED ALWAYS AS ((record ->> 'id'::text)) STORED,
    source character varying NOT NULL,
    record jsonb NOT NULL
);


--
-- Name: deleted_item_p202609; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.deleted_item_p202609 (
    id bigint DEFAULT nextval('public.deleted_item_id_seq'::regclass) NOT NULL,
    "deletedAt" timestamp without time zone DEFAULT ('now'::text)::timestamp(6) with time zone NOT NULL,
    "recordId" text GENERATED ALWAYS AS ((record ->> 'id'::text)) STORED,
    source character varying NOT NULL,
    record jsonb NOT NULL
);


--
-- Name: deleted_item_p202610; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.deleted_item_p202610 (
    id bigint DEFAULT nextval('public.deleted_item_id_seq'::regclass) NOT NULL,
    "deletedAt" timestamp without time zone DEFAULT ('now'::text)::timestamp(6) with time zone NOT NULL,
    "recordId" text GENERATED ALWAYS AS ((record ->> 'id'::text)) STORED,
    source character varying NOT NULL,
    record jsonb NOT NULL
);


--
-- Name: deleted_item_p202611; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.deleted_item_p202611 (
    id bigint DEFAULT nextval('public.deleted_item_id_seq'::regclass) NOT NULL,
    "deletedAt" timestamp without time zone DEFAULT ('now'::text)::timestamp(6) with time zone NOT NULL,
    "recordId" text GENERATED ALWAYS AS ((record ->> 'id'::text)) STORED,
    source character varying NOT NULL,
    record jsonb NOT NULL
);


--
-- Name: deleted_item_p202612; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.deleted_item_p202612 (
    id bigint DEFAULT nextval('public.deleted_item_id_seq'::regclass) NOT NULL,
    "deletedAt" timestamp without time zone DEFAULT ('now'::text)::timestamp(6) with time zone NOT NULL,
    "recordId" text GENERATED ALWAYS AS ((record ->> 'id'::text)) STORED,
    source character varying NOT NULL,
    record jsonb NOT NULL
);


--
-- Name: imported_contact; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.imported_contact (
    id character varying NOT NULL,
    email character varying,
    "phoneNumber" character varying,
    forename character varying,
    surname character varying,
    initials character varying,
    legal_surname character varying,
    legal_forename character varying,
    title character varying,
    gender character varying,
    "lwpUserId" bigint,
    "logCreatedAt" timestamp without time zone DEFAULT ('now'::text)::timestamp(6) with time zone,
    "logUpdatedAt" timestamp without time zone DEFAULT ('now'::text)::timestamp(6) with time zone NOT NULL,
    "schoolId" character varying NOT NULL,
    "importedFrom" character varying DEFAULT 'WONDE'::character varying NOT NULL
);


--
-- Name: imported_school; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.imported_school (
    id character varying NOT NULL,
    name character varying,
    urn integer,
    "lwpSchoolId" bigint,
    "logCreatedAt" timestamp without time zone DEFAULT ('now'::text)::timestamp(6) with time zone,
    "logUpdatedAt" timestamp without time zone DEFAULT ('now'::text)::timestamp(6) with time zone NOT NULL,
    "periodIndex" integer,
    "importedIgnoredContacts" integer,
    "importedFrom" character varying DEFAULT 'WONDE'::character varying NOT NULL,
    "proposedSchoolId" bigint,
    "postCode" character varying
);


--
-- Name: imported_school_class; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.imported_school_class (
    id character varying NOT NULL,
    name character varying,
    code character varying,
    "schoolId" character varying NOT NULL,
    "yearGroup" bigint,
    "lwpSchoolClassId" bigint,
    "logCreatedAt" timestamp without time zone DEFAULT ('now'::text)::timestamp(6) with time zone,
    "logUpdatedAt" timestamp without time zone DEFAULT ('now'::text)::timestamp(6) with time zone NOT NULL,
    nc_year character varying,
    "periodIndex" integer,
    "importedFrom" character varying DEFAULT 'WONDE'::character varying NOT NULL,
    "linkedClassShouldBeActive" boolean DEFAULT false NOT NULL
);


--
-- Name: imported_school_class_student; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.imported_school_class_student (
    "importedSchoolClassId" character varying NOT NULL,
    "importedStudentId" character varying NOT NULL
);


--
-- Name: imported_school_data_proposed_change; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.imported_school_data_proposed_change (
    id bigint NOT NULL,
    "platformSchoolId" character varying NOT NULL,
    status character varying NOT NULL,
    "entityType" character varying NOT NULL,
    operation character varying NOT NULL,
    "platformEntityId" bigint,
    "fieldName" character varying,
    "proposedValue" jsonb,
    "rejectedImportedAt" timestamp without time zone
);


--
-- Name: imported_school_data_proposed_change_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.imported_school_data_proposed_change_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: imported_school_data_proposed_change_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.imported_school_data_proposed_change_id_seq OWNED BY public.imported_school_data_proposed_change.id;


--
-- Name: imported_school_data_proposed_link; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.imported_school_data_proposed_link (
    id bigint NOT NULL,
    "platformSchoolId" character varying NOT NULL,
    status character varying NOT NULL,
    "entityType" character varying NOT NULL,
    "importedEntityId" character varying NOT NULL,
    "platformEntityId" bigint NOT NULL,
    "isHighConfidence" boolean NOT NULL,
    "matchCriteria" integer DEFAULT 0 NOT NULL
);


--
-- Name: imported_school_data_proposed_link_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.imported_school_data_proposed_link_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: imported_school_data_proposed_link_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.imported_school_data_proposed_link_id_seq OWNED BY public.imported_school_data_proposed_link.id;


--
-- Name: imported_student; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.imported_student (
    id character varying NOT NULL,
    mis_id character varying,
    forename character varying,
    surname character varying,
    initials character varying,
    details jsonb,
    "UPN" character varying,
    gender character varying,
    "isPremium" boolean,
    "lwpPupilId" bigint,
    "logCreatedAt" timestamp without time zone DEFAULT ('now'::text)::timestamp(6) with time zone,
    "logUpdatedAt" timestamp without time zone DEFAULT ('now'::text)::timestamp(6) with time zone NOT NULL,
    "schoolId" character varying NOT NULL,
    "importedFrom" character varying DEFAULT 'WONDE'::character varying NOT NULL,
    ethnicity character varying,
    ethnicity_code character varying,
    english_as_additional_language boolean,
    english_as_additional_language_status character varying,
    sen_status character varying,
    "dateOfBirth" date,
    "isPreRegistration" boolean DEFAULT false
);


--
-- Name: imported_student_contact; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.imported_student_contact (
    bill_payer boolean,
    lives_with_pupil boolean,
    email_bills boolean,
    copy_bills boolean,
    court_order boolean,
    pupil_report boolean,
    parental_responsibility boolean,
    correspondence boolean,
    email_notification boolean,
    sms_notification boolean,
    mail_notification boolean,
    push_notification boolean,
    in_touch_communication boolean,
    priority integer,
    relationship character varying,
    id bigint NOT NULL,
    "logCreatedAt" timestamp without time zone DEFAULT ('now'::text)::timestamp(6) with time zone,
    "logUpdatedAt" timestamp without time zone DEFAULT ('now'::text)::timestamp(6) with time zone NOT NULL,
    "importedStudentId" character varying,
    "importedContactId" character varying,
    "schoolId" character varying NOT NULL,
    "importedFrom" character varying DEFAULT 'WONDE'::character varying NOT NULL
);


--
-- Name: imported_student_contact_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.imported_student_contact_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: imported_student_contact_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.imported_student_contact_id_seq OWNED BY public.imported_student_contact.id;


--
-- Name: log_lwp_access; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.log_lwp_access (
    "mutationOrQueryName" character varying,
    "userId" bigint,
    page character varying,
    info jsonb,
    id bigint NOT NULL,
    "logCreatedAt" timestamp without time zone DEFAULT ('now'::text)::timestamp(6) with time zone
);


--
-- Name: log_lwp_access_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.log_lwp_access_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: log_lwp_access_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.log_lwp_access_id_seq OWNED BY public.log_lwp_access.id;


--
-- Name: log_lwp_contact; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.log_lwp_contact (
    question character varying NOT NULL,
    "sentEmail" boolean DEFAULT false NOT NULL,
    id bigint NOT NULL,
    "logCreatedAt" timestamp without time zone DEFAULT ('now'::text)::timestamp(6) with time zone,
    "logUpdatedAt" timestamp without time zone DEFAULT ('now'::text)::timestamp(6) with time zone NOT NULL,
    "logCreatedById" bigint,
    "logUpdatedById" bigint
);


--
-- Name: log_lwp_contact_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.log_lwp_contact_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: log_lwp_contact_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.log_lwp_contact_id_seq OWNED BY public.log_lwp_contact.id;


--
-- Name: log_lwp_email_sms; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.log_lwp_email_sms (
    recipient character varying,
    id bigint NOT NULL,
    "logCreatedAt" timestamp without time zone DEFAULT ('now'::text)::timestamp(6) with time zone,
    "messageType" character varying,
    params jsonb,
    "badParams" jsonb DEFAULT '[]'::jsonb,
    error jsonb
);


--
-- Name: log_lwp_email_sms_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.log_lwp_email_sms_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: log_lwp_email_sms_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.log_lwp_email_sms_id_seq OWNED BY public.log_lwp_email_sms.id;


--
-- Name: log_lwp_entity_status_change; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.log_lwp_entity_status_change (
    "entityId" bigint,
    "newStatus" character varying,
    "previousStatus" character varying,
    "entityType" character varying NOT NULL,
    id bigint NOT NULL,
    "logCreatedAt" timestamp without time zone DEFAULT ('now'::text)::timestamp(6) with time zone
);


--
-- Name: log_lwp_entity_status_change_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.log_lwp_entity_status_change_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: log_lwp_entity_status_change_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.log_lwp_entity_status_change_id_seq OWNED BY public.log_lwp_entity_status_change.id;


--
-- Name: log_lwp_login; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.log_lwp_login (
    browser character varying,
    "ipAddress" character varying,
    "userEmail" character varying,
    "userPhoneNumber" character varying,
    result character varying DEFAULT 'ERROR'::character varying NOT NULL,
    id bigint NOT NULL,
    "logCreatedAt" timestamp without time zone DEFAULT ('now'::text)::timestamp(6) with time zone,
    "logUpdatedAt" timestamp without time zone DEFAULT ('now'::text)::timestamp(6) with time zone NOT NULL,
    "userAgent" character varying,
    "userType" character varying,
    "loginType" character varying
);


--
-- Name: log_lwp_login_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.log_lwp_login_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: log_lwp_login_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.log_lwp_login_id_seq OWNED BY public.log_lwp_login.id;


--
-- Name: log_lwp_parent_sticker_notification; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.log_lwp_parent_sticker_notification (
    id bigint NOT NULL,
    "logCreatedAt" timestamp without time zone DEFAULT ('now'::text)::timestamp(6) with time zone,
    "stickerId" bigint,
    "userId" bigint,
    "feedbackId" bigint
);


--
-- Name: log_lwp_parent_sticker_notification_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.log_lwp_parent_sticker_notification_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: log_lwp_parent_sticker_notification_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.log_lwp_parent_sticker_notification_id_seq OWNED BY public.log_lwp_parent_sticker_notification.id;


--
-- Name: log_lwp_pupil_class_change; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.log_lwp_pupil_class_change (
    id bigint NOT NULL,
    "pupilId" bigint NOT NULL,
    "classId" bigint NOT NULL,
    action character varying NOT NULL,
    status character varying NOT NULL,
    "logCreatedById" bigint,
    "logCreatedAt" timestamp without time zone DEFAULT ('now'::text)::timestamp(6) with time zone NOT NULL
);


--
-- Name: log_lwp_pupil_class_change_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.log_lwp_pupil_class_change_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: log_lwp_pupil_class_change_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.log_lwp_pupil_class_change_id_seq OWNED BY public.log_lwp_pupil_class_change.id;


--
-- Name: log_parent_activity; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.log_parent_activity (
    action character varying NOT NULL,
    id bigint NOT NULL,
    "logCreatedAt" timestamp without time zone DEFAULT ('now'::text)::timestamp(6) with time zone,
    "logUpdatedAt" timestamp without time zone DEFAULT ('now'::text)::timestamp(6) with time zone NOT NULL,
    "logCreatedById" bigint,
    "logUpdatedById" bigint
);


--
-- Name: log_parent_activity_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.log_parent_activity_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: log_parent_activity_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.log_parent_activity_id_seq OWNED BY public.log_parent_activity.id;


--
-- Name: log_parent_pupil_action; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.log_parent_pupil_action (
    "actionId" integer,
    "userId" bigint,
    "parentId" bigint,
    "pupilId" bigint,
    param1 bigint,
    param2 bigint,
    param3 integer,
    "time" timestamp without time zone DEFAULT ('now'::text)::timestamp(6) with time zone,
    id bigint NOT NULL
);


--
-- Name: log_parent_pupil_action_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.log_parent_pupil_action_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: log_parent_pupil_action_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.log_parent_pupil_action_id_seq OWNED BY public.log_parent_pupil_action.id;


--
-- Name: log_parent_topic; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.log_parent_topic (
    action character varying NOT NULL,
    id bigint NOT NULL,
    "logCreatedAt" timestamp without time zone DEFAULT ('now'::text)::timestamp(6) with time zone,
    "logUpdatedAt" timestamp without time zone DEFAULT ('now'::text)::timestamp(6) with time zone NOT NULL,
    "logCreatedById" bigint,
    "logUpdatedById" bigint
);


--
-- Name: log_parent_topic_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.log_parent_topic_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: log_parent_topic_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.log_parent_topic_id_seq OWNED BY public.log_parent_topic.id;


--
-- Name: log_pupil_merge_operation; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.log_pupil_merge_operation (
    id bigint NOT NULL,
    "logCreatedAt" timestamp without time zone DEFAULT ('now'::text)::timestamp(6) with time zone NOT NULL,
    "userId" bigint NOT NULL,
    "schoolId" bigint NOT NULL,
    "sourcePupilId" bigint NOT NULL,
    "destinationPupilId" bigint NOT NULL,
    "reassignedPupilFeedbackIds" bigint[] NOT NULL,
    "redundantPupilFeedbackIds" bigint[] NOT NULL,
    "reassignedReadingPupilTopicIds" bigint[] NOT NULL,
    "reassignedActivityPupilTopicIds" bigint[] NOT NULL,
    "reassignedActivityPupilActivityIds" bigint[] NOT NULL,
    "detachedParentIds" bigint[] NOT NULL,
    "detachedClassIds" bigint[] NOT NULL,
    "sourcePupilRemovedFromSchool" boolean NOT NULL
);


--
-- Name: log_pupil_merge_operation_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.log_pupil_merge_operation_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: log_pupil_merge_operation_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.log_pupil_merge_operation_id_seq OWNED BY public.log_pupil_merge_operation.id;


--
-- Name: log_school_class_license; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.log_school_class_license (
    id bigint NOT NULL,
    "operationType" character varying,
    "fullProgrammeClassCount" integer DEFAULT 0,
    "totalClassCount" integer DEFAULT 0,
    "requestedFullProgrammeClassCount" integer DEFAULT 0,
    "requestedReadingOnlyClassCount" integer DEFAULT 0,
    "requestedUpgradeClassCount" integer DEFAULT 0,
    "fullProgrammeClassPrice" integer DEFAULT 0,
    "readingOnlyClassPrice" integer DEFAULT 0,
    "totalPrice" integer DEFAULT 0,
    "schoolPeriod" character varying,
    "logCreatedAt" timestamp without time zone DEFAULT ('now'::text)::timestamp(6) with time zone,
    "logUpdatedAt" timestamp without time zone DEFAULT ('now'::text)::timestamp(6) with time zone NOT NULL,
    "schoolId" bigint,
    "logCreatedById" bigint,
    "logUpdatedById" bigint,
    "readyTeddyClassCount" integer DEFAULT 0,
    "requestedReadyTeddyClassCount" integer DEFAULT 0,
    "readyTeddyClassPrice" integer DEFAULT 0
);


--
-- Name: log_school_class_license_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.log_school_class_license_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: log_school_class_license_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.log_school_class_license_id_seq OWNED BY public.log_school_class_license.id;


--
-- Name: log_static_lwp_email_template_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.log_static_lwp_email_template_history (
    type character varying NOT NULL,
    subject character varying NOT NULL,
    "senderEmail" character varying NOT NULL,
    "senderName" character varying NOT NULL,
    email character varying,
    sms character varying,
    "schoolId" bigint,
    id bigint NOT NULL,
    "logCreatedAt" timestamp without time zone DEFAULT ('now'::text)::timestamp(6) with time zone
);


--
-- Name: log_static_lwp_email_template_history_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.log_static_lwp_email_template_history_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: log_static_lwp_email_template_history_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.log_static_lwp_email_template_history_id_seq OWNED BY public.log_static_lwp_email_template_history.id;


--
-- Name: lwp_activity_tags; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lwp_activity_tags (
    "staticLwpActivityId" bigint NOT NULL,
    "staticLwpActivityTagId" bigint NOT NULL
);


--
-- Name: lwp_admin_sticker_school_status; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lwp_admin_sticker_school_status (
    id bigint NOT NULL,
    "isActive" boolean NOT NULL,
    "logCreatedAt" timestamp without time zone DEFAULT ('now'::text)::timestamp(6) with time zone,
    "logUpdatedAt" timestamp without time zone DEFAULT ('now'::text)::timestamp(6) with time zone NOT NULL,
    "stickerId" bigint,
    "schoolId" bigint,
    "logCreatedById" bigint,
    "logUpdatedById" bigint
);


--
-- Name: lwp_admin_sticker_school_status_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.lwp_admin_sticker_school_status_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: lwp_admin_sticker_school_status_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.lwp_admin_sticker_school_status_id_seq OWNED BY public.lwp_admin_sticker_school_status.id;


--
-- Name: lwp_blog_post; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lwp_blog_post (
    title character varying NOT NULL,
    "shortDescription" character varying NOT NULL,
    "longHtml" character varying NOT NULL,
    "authorName" character varying,
    "authorImage" character varying,
    id bigint NOT NULL,
    "logCreatedAt" timestamp without time zone DEFAULT ('now'::text)::timestamp(6) with time zone,
    "logUpdatedAt" timestamp without time zone DEFAULT ('now'::text)::timestamp(6) with time zone NOT NULL,
    "logCreatedById" bigint,
    "logUpdatedById" bigint
);


--
-- Name: lwp_blog_post_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.lwp_blog_post_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: lwp_blog_post_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.lwp_blog_post_id_seq OWNED BY public.lwp_blog_post.id;


--
-- Name: lwp_class_pupil; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lwp_class_pupil (
    "lwpPupilId" bigint NOT NULL,
    "lwpSchoolClassId" bigint NOT NULL
);


--
-- Name: lwp_class_sequence_assignment; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lwp_class_sequence_assignment (
    "sequenceName" character varying,
    "startDate" date,
    "intervalDays" integer,
    status character varying DEFAULT 'ASSIGNED'::character varying NOT NULL,
    id bigint NOT NULL,
    "logCreatedAt" timestamp without time zone DEFAULT ('now'::text)::timestamp(6) with time zone,
    "logUpdatedAt" timestamp without time zone DEFAULT ('now'::text)::timestamp(6) with time zone NOT NULL,
    "classId" bigint NOT NULL,
    "sequenceId" bigint,
    "logCreatedById" bigint,
    "logUpdatedById" bigint,
    "wholeSchoolAssignmentId" bigint
);


--
-- Name: lwp_class_sequence_assignment_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.lwp_class_sequence_assignment_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: lwp_class_sequence_assignment_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.lwp_class_sequence_assignment_id_seq OWNED BY public.lwp_class_sequence_assignment.id;


--
-- Name: lwp_class_subjects; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lwp_class_subjects (
    "staticLwpSubjectId" bigint NOT NULL,
    "lwpSchoolClassId" bigint NOT NULL
);


--
-- Name: lwp_class_teacher; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lwp_class_teacher (
    "lwpUserId" bigint NOT NULL,
    "lwpSchoolClassId" bigint NOT NULL
);


--
-- Name: lwp_class_topic; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lwp_class_topic (
    "releaseDate" date NOT NULL,
    "dueDate" date,
    "teacherMessage" character varying,
    released boolean DEFAULT false NOT NULL,
    "teacherNotified" boolean DEFAULT false NOT NULL,
    id bigint NOT NULL,
    "logCreatedAt" timestamp without time zone DEFAULT ('now'::text)::timestamp(6) with time zone,
    "logUpdatedAt" timestamp without time zone DEFAULT ('now'::text)::timestamp(6) with time zone NOT NULL,
    "topicId" bigint,
    "classId" bigint,
    "logCreatedById" bigint,
    "logUpdatedById" bigint,
    "mwpOrder" integer,
    "readingNote" character varying,
    "deletedById" bigint,
    "readingTarget" integer,
    "scrapbookPrompt" character varying,
    "classSequenceAssignmentId" bigint,
    "weekBeforeTeacherNotified" boolean DEFAULT false NOT NULL
);


--
-- Name: lwp_class_topic_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.lwp_class_topic_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: lwp_class_topic_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.lwp_class_topic_id_seq OWNED BY public.lwp_class_topic.id;


--
-- Name: lwp_demo_activity_feedback; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lwp_demo_activity_feedback (
    "pupilComment" character varying,
    photo character varying,
    "parentComment" character varying,
    browser character varying,
    "ipAddress" character varying,
    rating integer,
    "photoRating" integer,
    "sharingAllowed" boolean,
    id bigint NOT NULL,
    "logCreatedAt" timestamp without time zone DEFAULT ('now'::text)::timestamp(6) with time zone,
    "logUpdatedAt" timestamp without time zone DEFAULT ('now'::text)::timestamp(6) with time zone NOT NULL,
    "activityId" bigint,
    "deletedById" bigint
);


--
-- Name: lwp_demo_activity_feedback_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.lwp_demo_activity_feedback_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: lwp_demo_activity_feedback_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.lwp_demo_activity_feedback_id_seq OWNED BY public.lwp_demo_activity_feedback.id;


--
-- Name: lwp_domain_year_groups; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lwp_domain_year_groups (
    "staticLwpTopicDomainId" bigint NOT NULL,
    "staticLwpYearGroupId" bigint NOT NULL
);


--
-- Name: static_lwp_email_template; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.static_lwp_email_template (
    "sendEmail" boolean DEFAULT true NOT NULL,
    "emailOption" character varying DEFAULT 'LAYOUT'::character varying NOT NULL,
    heading character varying,
    "bodyText" character varying,
    "linkText" character varying,
    link character varying,
    "wholeEmailContent" character varying,
    "multipleSection" boolean DEFAULT false NOT NULL,
    "multipleSectionContent" character varying,
    "sendSms" boolean DEFAULT false NOT NULL,
    "smsContent" character varying,
    "sendPhoneNotification" boolean DEFAULT false NOT NULL,
    "notificationTitle" character varying,
    "notificationDescription" character varying,
    "notificationUrl" character varying,
    "scheduleSmsOption" character varying DEFAULT 'NOW'::character varying NOT NULL,
    "scheduleSmsDateTime" timestamp without time zone,
    status character varying NOT NULL,
    id bigint NOT NULL,
    "logCreatedAt" timestamp without time zone DEFAULT ('now'::text)::timestamp(6) with time zone,
    "logUpdatedAt" timestamp without time zone DEFAULT ('now'::text)::timestamp(6) with time zone NOT NULL,
    "logCreatedById" bigint,
    "logUpdatedById" bigint,
    "defaultMessageLayout" character varying,
    subject character varying DEFAULT 'Learning With Parents'::character varying NOT NULL,
    "senderEmail" character varying DEFAULT 'hello@learningwithparents.com'::character varying NOT NULL,
    "senderName" character varying DEFAULT 'Learning With Parents'::character varying NOT NULL,
    "previewLine" character varying,
    type character varying,
    "lwpNotificationId" bigint,
    "deletedById" bigint
);


--
-- Name: lwp_email_template_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.lwp_email_template_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: lwp_email_template_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.lwp_email_template_id_seq OWNED BY public.static_lwp_email_template.id;


--
-- Name: lwp_features_school_tags; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lwp_features_school_tags (
    "staticLwpFeaturesId" bigint NOT NULL,
    "staticLwpSchoolTagId" bigint NOT NULL
);


--
-- Name: lwp_feedback_reply; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lwp_feedback_reply (
    id bigint NOT NULL,
    reply character varying,
    "parentNotified" boolean DEFAULT false NOT NULL,
    "logCreatedAt" timestamp without time zone DEFAULT ('now'::text)::timestamp(6) with time zone,
    "logUpdatedAt" timestamp without time zone DEFAULT ('now'::text)::timestamp(6) with time zone NOT NULL,
    "feedbackId" bigint,
    "logCreatedById" bigint,
    "logUpdatedById" bigint,
    "deletedById" bigint,
    "stickerId" bigint,
    "originalFeedbackReplyDeletedAt" timestamp without time zone,
    "originalFeedbackReplyId" bigint,
    type character varying
);


--
-- Name: lwp_feedback_reply_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.lwp_feedback_reply_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: lwp_feedback_reply_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.lwp_feedback_reply_id_seq OWNED BY public.lwp_feedback_reply.id;


--
-- Name: lwp_magic_link; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lwp_magic_link (
    url character varying DEFAULT public.nanoid() NOT NULL,
    "expiryTime" timestamp without time zone NOT NULL,
    "lastRegeneratedAt" timestamp without time zone,
    type character varying NOT NULL,
    "isUsed" boolean DEFAULT false NOT NULL,
    "pupilId" bigint,
    context jsonb,
    "logCreatedAt" timestamp without time zone DEFAULT ('now'::text)::timestamp(6) with time zone,
    "logUpdatedAt" timestamp without time zone DEFAULT ('now'::text)::timestamp(6) with time zone NOT NULL,
    "userId" bigint
);


--
-- Name: lwp_notification_event_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lwp_notification_event_history (
    id bigint NOT NULL,
    status public.lwp_notification_event_history_status_enum DEFAULT 'WAITING'::public.lwp_notification_event_history_status_enum,
    "logCreatedAt" timestamp without time zone DEFAULT ('now'::text)::timestamp(6) with time zone,
    "logUpdatedAt" timestamp without time zone DEFAULT ('now'::text)::timestamp(6) with time zone NOT NULL,
    "notificationId" bigint,
    error jsonb
);


--
-- Name: lwp_notification_event_history_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.lwp_notification_event_history_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: lwp_notification_event_history_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.lwp_notification_event_history_id_seq OWNED BY public.lwp_notification_event_history.id;


--
-- Name: lwp_notification_id_seq1; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.lwp_notification ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.lwp_notification_id_seq1
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: lwp_page_announcement_school_tags; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lwp_page_announcement_school_tags (
    "staticLwpPageAnnouncementId" bigint NOT NULL,
    "staticLwpSchoolTagId" bigint NOT NULL
);


--
-- Name: lwp_parent_pupil; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lwp_parent_pupil (
    "lwpPupilId" bigint NOT NULL,
    "lwpUserId" bigint NOT NULL
);


--
-- Name: lwp_parent_pupil_imported; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lwp_parent_pupil_imported (
    "lwpPupilId" bigint NOT NULL,
    "lwpUserId" bigint NOT NULL
);


--
-- Name: lwp_parent_pupil_invited; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lwp_parent_pupil_invited (
    "lwpPupilId" bigint NOT NULL,
    "lwpUserId" bigint NOT NULL
);


--
-- Name: lwp_pupil; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lwp_pupil (
    firstname character varying NOT NULL,
    lastname character varying NOT NULL,
    photo character varying,
    "mathscotItems" jsonb DEFAULT '[]'::jsonb,
    "isPremium" boolean,
    id bigint NOT NULL,
    "logCreatedAt" timestamp without time zone DEFAULT ('now'::text)::timestamp(6) with time zone,
    "logUpdatedAt" timestamp without time zone DEFAULT ('now'::text)::timestamp(6) with time zone NOT NULL,
    "logCreatedById" bigint,
    "logUpdatedById" bigint,
    "logLastActivityCompleted" timestamp without time zone,
    "lastCertificateSent" timestamp without time zone,
    "importedStudentId" character varying,
    "schoolId" bigint,
    "startedSchool" character varying,
    "lastCertificateDownloaded" timestamp without time zone,
    "UPN" character varying,
    "deletedById" bigint,
    "deletedSchoolId" bigint,
    "dateOfBirth" date,
    gender character varying,
    "isPreRegistration" boolean DEFAULT false,
    "isIgnoredForFutureYearClasses" boolean DEFAULT false
);


--
-- Name: lwp_pupil_activity; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lwp_pupil_activity (
    "mathscotActivityItemIds" jsonb,
    "earnedStar" boolean,
    rating integer,
    id bigint NOT NULL,
    "logCreatedAt" timestamp without time zone DEFAULT ('now'::text)::timestamp(6) with time zone,
    "logUpdatedAt" timestamp without time zone DEFAULT ('now'::text)::timestamp(6) with time zone NOT NULL,
    "pupilId" bigint NOT NULL,
    "activityId" bigint,
    "topicId" bigint,
    "logCreatedById" bigint,
    "logUpdatedById" bigint,
    context jsonb,
    "deletedById" bigint,
    "logFirstAccessed" timestamp without time zone,
    "logLastAccessed" timestamp without time zone,
    "logAccessedOnDesktop" integer DEFAULT 0 NOT NULL,
    "logAccessedOnMobile" integer DEFAULT 0 NOT NULL
);


--
-- Name: lwp_pupil_activity_feedback; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lwp_pupil_activity_feedback (
    "pupilComment" character varying,
    photo character varying,
    "parentComment" character varying,
    description character varying,
    "isMaths" boolean,
    "isEnglish" boolean,
    "sharingAllowed" boolean,
    "otherSubject" character varying,
    id bigint NOT NULL,
    "logCreatedAt" timestamp without time zone DEFAULT ('now'::text)::timestamp(6) with time zone,
    "logUpdatedAt" timestamp without time zone DEFAULT ('now'::text)::timestamp(6) with time zone NOT NULL,
    "pupilId" bigint,
    "logCreatedById" bigint,
    "logUpdatedById" bigint,
    "photoRating" integer,
    "mwpMedia" character varying,
    "deletedAt" timestamp without time zone,
    "deletedById" bigint
);


--
-- Name: lwp_pupil_activity_feedback_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.lwp_pupil_activity_feedback_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: lwp_pupil_activity_feedback_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.lwp_pupil_activity_feedback_id_seq OWNED BY public.lwp_pupil_activity_feedback.id;


--
-- Name: lwp_pupil_activity_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.lwp_pupil_activity_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: lwp_pupil_activity_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.lwp_pupil_activity_id_seq OWNED BY public.lwp_pupil_activity.id;


--
-- Name: lwp_pupil_feedback; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lwp_pupil_feedback (
    "pupilComment" character varying,
    "parentComment" character varying,
    description character varying,
    "sharingAllowed" boolean,
    comment character varying,
    rating integer,
    "pageNumber" character varying,
    "bookName" character varying,
    "userType" character varying,
    "userId" bigint,
    "userName" character varying,
    "isBookFinished" boolean,
    "bookReadAt" date,
    type character varying DEFAULT 'ACTIVITY'::character varying NOT NULL,
    id bigint NOT NULL,
    "logCreatedAt" timestamp without time zone DEFAULT ('now'::text)::timestamp(6) with time zone,
    "logUpdatedAt" timestamp without time zone DEFAULT ('now'::text)::timestamp(6) with time zone NOT NULL,
    "activityId" bigint,
    "deletedById" bigint,
    "logCreatedById" bigint,
    "logUpdatedById" bigint,
    "logSubmittedOnDesktop" integer DEFAULT 0 NOT NULL,
    "logSubmittedOnMobile" integer DEFAULT 0 NOT NULL,
    "notifyParent" boolean DEFAULT false NOT NULL,
    "privateNote" character varying,
    "readingType" character varying,
    "deletedUserCreatedBy" bigint,
    "deletedUserUpdatedBy" bigint,
    "includeInReadingTarget" boolean DEFAULT false NOT NULL,
    "logOnReadingAsGroupTab" boolean DEFAULT false NOT NULL,
    "periodIndex" integer,
    "tickedById" bigint,
    "normalisedBookName" character varying GENERATED ALWAYS AS (TRIM(BOTH FROM lower(("bookName")::text))) STORED,
    "includePhotoInImpactReport" boolean DEFAULT false NOT NULL,
    "includeParentCommentInImpactReport" boolean DEFAULT false NOT NULL,
    "includePupilCommentInImpactReport" boolean DEFAULT false NOT NULL,
    "includeReadingCommentInImpactReport" boolean DEFAULT false NOT NULL,
    "entryDeletedAt" timestamp without time zone,
    "originalFeedbackId" bigint,
    "tickedAt" timestamp without time zone,
    "reasonToDelete" character varying,
    "scrapbookPrompt" character varying,
    "readingMode" character varying,
    CONSTRAINT "CHK_lpf_bookname_required_for_original_reading" CHECK ((("originalFeedbackId" IS NOT NULL) OR ((type)::text <> 'READING'::text) OR (("bookName" IS NOT NULL) AND (TRIM(BOTH FROM "bookName") <> ''::text)))),
    CONSTRAINT "CHK_lpf_logcreatedby_or_user_required_for_original" CHECK ((("logCreatedById" IS NOT NULL) OR ("userId" IS NOT NULL) OR ("originalFeedbackId" IS NOT NULL))),
    CONSTRAINT "CHK_lpf_readingtype_required_for_original_reading" CHECK ((("originalFeedbackId" IS NOT NULL) OR ((type)::text <> 'READING'::text) OR ("readingType" IS NOT NULL))),
    CONSTRAINT "CHK_lpf_usertype_required_for_original" CHECK ((("originalFeedbackId" IS NOT NULL) OR ("userType" IS NOT NULL)))
);


--
-- Name: lwp_pupil_feedback_edit_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lwp_pupil_feedback_edit_log (
    id bigint NOT NULL,
    "logCreatedAt" timestamp without time zone DEFAULT ('now'::text)::timestamp(6) with time zone,
    "feedbackId" bigint,
    "logCreatedById" bigint
);


--
-- Name: lwp_pupil_feedback_edit_log_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.lwp_pupil_feedback_edit_log_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: lwp_pupil_feedback_edit_log_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.lwp_pupil_feedback_edit_log_id_seq OWNED BY public.lwp_pupil_feedback_edit_log.id;


--
-- Name: lwp_pupil_feedback_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lwp_pupil_feedback_history (
    "lwpPupilId" bigint NOT NULL,
    "lwpPupilFeedbackId" bigint NOT NULL
);


--
-- Name: lwp_pupil_feedback_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.lwp_pupil_feedback_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: lwp_pupil_feedback_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.lwp_pupil_feedback_id_seq OWNED BY public.lwp_pupil_feedback.id;


--
-- Name: lwp_pupil_feedback_media; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lwp_pupil_feedback_media (
    filename character varying,
    type character varying,
    id bigint NOT NULL,
    "logCreatedAt" timestamp without time zone DEFAULT ('now'::text)::timestamp(6) with time zone,
    "logUpdatedAt" timestamp without time zone DEFAULT ('now'::text)::timestamp(6) with time zone NOT NULL,
    "feedbackId" bigint,
    "deletedById" bigint,
    "logCreatedById" bigint,
    "logUpdatedById" bigint
);


--
-- Name: lwp_pupil_feedback_media_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.lwp_pupil_feedback_media_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: lwp_pupil_feedback_media_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.lwp_pupil_feedback_media_id_seq OWNED BY public.lwp_pupil_feedback_media.id;


--
-- Name: lwp_pupil_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.lwp_pupil_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: lwp_pupil_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.lwp_pupil_id_seq OWNED BY public.lwp_pupil.id;


--
-- Name: lwp_pupil_mathscot; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lwp_pupil_mathscot (
    "character" character varying DEFAULT 'MONKEY'::character varying NOT NULL,
    colour character varying DEFAULT 'NATURAL'::character varying NOT NULL,
    items jsonb,
    id bigint NOT NULL,
    "logCreatedAt" timestamp without time zone DEFAULT ('now'::text)::timestamp(6) with time zone,
    "logUpdatedAt" timestamp without time zone DEFAULT ('now'::text)::timestamp(6) with time zone NOT NULL,
    "periodIndex" integer,
    "pupilId" bigint,
    "logCreatedById" bigint,
    "logUpdatedById" bigint
);


--
-- Name: lwp_pupil_mathscot_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.lwp_pupil_mathscot_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: lwp_pupil_mathscot_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.lwp_pupil_mathscot_id_seq OWNED BY public.lwp_pupil_mathscot.id;


--
-- Name: lwp_pupil_parent; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lwp_pupil_parent (
    "pupilId" bigint NOT NULL,
    "parentId" bigint NOT NULL,
    status character varying NOT NULL,
    "importedStudentContactID" bigint,
    "lastInvitationEmailSent" timestamp without time zone,
    id bigint NOT NULL,
    "logCreatedAt" timestamp without time zone DEFAULT ('now'::text)::timestamp(6) with time zone,
    "logUpdatedAt" timestamp without time zone DEFAULT ('now'::text)::timestamp(6) with time zone NOT NULL,
    "invitedById" bigint,
    "deletedById" bigint,
    "logCreatedById" bigint,
    "logUpdatedById" bigint,
    "showInterstitial" boolean DEFAULT true NOT NULL,
    "interstitialContext" jsonb DEFAULT '{"isTopicsSectionShown": false, "isReadingSectionShown": false}'::jsonb NOT NULL
);


--
-- Name: lwp_pupil_parent_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.lwp_pupil_parent_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: lwp_pupil_parent_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.lwp_pupil_parent_id_seq OWNED BY public.lwp_pupil_parent.id;


--
-- Name: lwp_pupil_tag; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lwp_pupil_tag (
    id bigint NOT NULL,
    name character varying NOT NULL,
    color character varying NOT NULL,
    "logCreatedAt" timestamp without time zone DEFAULT ('now'::text)::timestamp(6) with time zone,
    "logUpdatedAt" timestamp without time zone DEFAULT ('now'::text)::timestamp(6) with time zone NOT NULL,
    "schoolId" bigint,
    "deletedById" bigint,
    "logCreatedById" bigint,
    "logUpdatedById" bigint
);


--
-- Name: lwp_pupil_tag_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.lwp_pupil_tag_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: lwp_pupil_tag_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.lwp_pupil_tag_id_seq OWNED BY public.lwp_pupil_tag.id;


--
-- Name: lwp_pupil_tag_pupil; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lwp_pupil_tag_pupil (
    "lwpPupilTagId" bigint NOT NULL,
    "lwpPupilId" bigint NOT NULL
);


--
-- Name: lwp_pupil_topic; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lwp_pupil_topic (
    "releaseDate" date NOT NULL,
    "watchedVideo" boolean,
    "logOpenedAt" timestamp without time zone,
    "logFirstStartedVideo" timestamp without time zone,
    "logFirstFinishedVideo" timestamp without time zone,
    "logLastStartedVideo" timestamp without time zone,
    id bigint NOT NULL,
    "logCreatedAt" timestamp without time zone DEFAULT ('now'::text)::timestamp(6) with time zone,
    "logUpdatedAt" timestamp without time zone DEFAULT ('now'::text)::timestamp(6) with time zone NOT NULL,
    "reminderSent" boolean DEFAULT false NOT NULL,
    "topicId" bigint,
    "pupilId" bigint NOT NULL,
    "classTopicId" bigint,
    "logCreatedById" bigint,
    "logUpdatedById" bigint,
    "parentsNotified" boolean DEFAULT false NOT NULL,
    "reminderSentFor2Days" boolean DEFAULT false NOT NULL,
    "periodIndex" integer,
    "deletedById" bigint,
    "readingTarget" integer,
    "logAccessedOnDesktop" integer DEFAULT 0 NOT NULL,
    "logAccessedOnMobile" integer DEFAULT 0 NOT NULL,
    "logAccessedWithTopicLink" integer DEFAULT 0 NOT NULL,
    "earnedGoldStar" boolean DEFAULT false,
    "silverStars" integer DEFAULT 0
);


--
-- Name: lwp_pupil_topic_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.lwp_pupil_topic_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: lwp_pupil_topic_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.lwp_pupil_topic_id_seq OWNED BY public.lwp_pupil_topic.id;


--
-- Name: lwp_pupil_topic_sbt_step_media; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lwp_pupil_topic_sbt_step_media (
    "lwpSetByTeacherStepMediaId" bigint NOT NULL,
    "lwpPupilTopicId" bigint NOT NULL
);


--
-- Name: lwp_pupil_trophy; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lwp_pupil_trophy (
    id bigint NOT NULL,
    "logCreatedAt" timestamp without time zone DEFAULT ('now'::text)::timestamp(6) with time zone,
    "logUpdatedAt" timestamp without time zone DEFAULT ('now'::text)::timestamp(6) with time zone NOT NULL,
    "trophyId" bigint,
    "pupilId" bigint,
    "logCreatedById" bigint,
    "logUpdatedById" bigint,
    "schoolClassId" bigint,
    "lastCertificateEmailSent" timestamp without time zone,
    "lastCertificateDownloaded" timestamp without time zone
);


--
-- Name: lwp_pupil_trophy_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.lwp_pupil_trophy_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: lwp_pupil_trophy_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.lwp_pupil_trophy_id_seq OWNED BY public.lwp_pupil_trophy.id;


--
-- Name: lwp_reading_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lwp_reading_log (
    comment character varying,
    "pageNumber" character varying,
    photo character varying,
    audio character varying,
    "bookName" character varying NOT NULL,
    "userType" character varying,
    "userId" integer,
    "userName" character varying,
    "isBookFinished" boolean NOT NULL,
    "bookReadAt" timestamp without time zone NOT NULL,
    id bigint NOT NULL,
    "logCreatedAt" timestamp without time zone DEFAULT ('now'::text)::timestamp(6) with time zone,
    "logUpdatedAt" timestamp without time zone DEFAULT ('now'::text)::timestamp(6) with time zone NOT NULL,
    "pupilTopicId" bigint,
    "logCreatedById" bigint,
    "logUpdatedById" bigint
);


--
-- Name: lwp_reading_log_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.lwp_reading_log_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: lwp_reading_log_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.lwp_reading_log_id_seq OWNED BY public.lwp_reading_log.id;


--
-- Name: lwp_school; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lwp_school (
    "schoolName" character varying NOT NULL,
    "setTopicPermission" boolean DEFAULT false NOT NULL,
    id bigint NOT NULL,
    "logCreatedAt" timestamp without time zone DEFAULT ('now'::text)::timestamp(6) with time zone,
    "logUpdatedAt" timestamp without time zone DEFAULT ('now'::text)::timestamp(6) with time zone NOT NULL,
    "logCreatedById" bigint,
    "logUpdatedById" bigint,
    "commentsAndPhotos" integer DEFAULT 0 NOT NULL,
    "misIntegration" character varying,
    "importedSchoolId" character varying,
    "isWondeDataSyncedWithLwp" boolean DEFAULT false,
    "curentPeriodIndex" integer,
    "lastTrophyLeaderEmailSent" timestamp without time zone,
    "deletedById" bigint,
    inactive boolean DEFAULT false NOT NULL,
    logo character varying,
    "skipAutoWondeImport" boolean DEFAULT false NOT NULL,
    "isTestSchool" boolean DEFAULT false NOT NULL,
    urn character varying,
    "lastImportedAt" timestamp without time zone,
    "socialLoginPermissions" jsonb DEFAULT '{"email": true, "google": false, "microsoft": false}'::jsonb,
    "numOfFullProgrammeClassesAllowed" integer DEFAULT 0 NOT NULL,
    "numOfTotalClassesAllowed" integer DEFAULT 0 NOT NULL,
    "enableAddClasses" boolean DEFAULT false NOT NULL,
    organisations character varying DEFAULT 'Learning with Parents'::character varying NOT NULL,
    "termsAndConditions" character varying,
    "privacyPolicy" character varying,
    "enableBookNameOnlyReadingLog" boolean DEFAULT false NOT NULL,
    "isDownloadSchoolData" boolean DEFAULT false,
    "tenantDomain" character varying,
    "msTenantIssuer" character varying,
    "parentFeedbackTickFeatureEnabledAt" date,
    "isParentFeedbackReplyFeatureEnabled" boolean DEFAULT false,
    "isParentFeedbackStickerFeatureEnabled" boolean DEFAULT false,
    "isMoneySkillsAvailable" boolean DEFAULT false,
    "importStatus" character varying,
    "ignoreAcademicYearCheckDuringImport" boolean DEFAULT false NOT NULL,
    "hasCurrentAcademicYearWondeData" boolean DEFAULT false NOT NULL,
    region character varying,
    "isReadyTeddyAvailable" boolean DEFAULT false NOT NULL
);


--
-- Name: lwp_school_class; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lwp_school_class (
    name character varying NOT NULL,
    id bigint NOT NULL,
    "logCreatedAt" timestamp without time zone DEFAULT ('now'::text)::timestamp(6) with time zone,
    "logUpdatedAt" timestamp without time zone DEFAULT ('now'::text)::timestamp(6) with time zone NOT NULL,
    "isTeacherNotifiedLaunched" boolean DEFAULT false NOT NULL,
    "isTeacherNotifiedRegistrationTargetMet" boolean DEFAULT false NOT NULL,
    "isTeacherNotifiedAllRegistered" boolean DEFAULT false NOT NULL,
    "mainTeacherId" bigint,
    "schoolId" bigint,
    "logCreatedById" bigint,
    "logUpdatedById" bigint,
    "yearGroup" bigint,
    "missingCount" integer DEFAULT 0 NOT NULL,
    "registerCount" integer DEFAULT 0 NOT NULL,
    "activeCount" integer DEFAULT 0 NOT NULL,
    "isStatsNeedUpdate" boolean DEFAULT false NOT NULL,
    "trophyEmailsPending" boolean DEFAULT false NOT NULL,
    "importedSchoolClassId" character varying,
    "IsReadingLogsEnabled" boolean DEFAULT false NOT NULL,
    "periodIndex" integer,
    "feedCount" integer DEFAULT 0 NOT NULL,
    "premiumCount" integer DEFAULT 0 NOT NULL,
    "lastTrophyTeacherEmailSent" timestamp without time zone,
    "deletedById" bigint,
    "readingTarget" integer DEFAULT 3 NOT NULL,
    "isRegistrationClass" boolean DEFAULT false NOT NULL,
    "isLocked" boolean DEFAULT false NOT NULL,
    "readingStartDay" integer DEFAULT 1 NOT NULL,
    "readingLaunchDate" timestamp without time zone,
    status character varying DEFAULT 'ACTIVE'::character varying NOT NULL,
    "isFullProgramme" boolean DEFAULT false NOT NULL,
    "skipGroupPupils" boolean DEFAULT false NOT NULL,
    "parentClassId" bigint,
    "isReadyTeddyEnabled" boolean DEFAULT false NOT NULL,
    "isGroupAcrossClasses" boolean DEFAULT false NOT NULL,
    "convertedFromPreAdmissionPeriodIndex" integer
);


--
-- Name: lwp_school_class_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.lwp_school_class_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: lwp_school_class_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.lwp_school_class_id_seq OWNED BY public.lwp_school_class.id;


--
-- Name: lwp_school_dates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lwp_school_dates (
    "termName" character varying NOT NULL,
    "startDate" timestamp without time zone NOT NULL,
    "endDate" timestamp without time zone NOT NULL,
    id bigint NOT NULL,
    "logCreatedAt" timestamp without time zone DEFAULT ('now'::text)::timestamp(6) with time zone,
    "logUpdatedAt" timestamp without time zone DEFAULT ('now'::text)::timestamp(6) with time zone NOT NULL,
    "logCreatedById" bigint,
    "logUpdatedById" bigint,
    "periodIndex" integer
);


--
-- Name: lwp_school_dates_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.lwp_school_dates_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: lwp_school_dates_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.lwp_school_dates_id_seq OWNED BY public.lwp_school_dates.id;


--
-- Name: lwp_school_holiday; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lwp_school_holiday (
    "holidayName" character varying NOT NULL,
    "startDate" timestamp without time zone NOT NULL,
    "endDate" timestamp without time zone NOT NULL,
    released boolean DEFAULT false NOT NULL,
    id bigint NOT NULL,
    "logCreatedAt" timestamp without time zone DEFAULT ('now'::text)::timestamp(6) with time zone,
    "logUpdatedAt" timestamp without time zone DEFAULT ('now'::text)::timestamp(6) with time zone NOT NULL,
    "periodIndex" integer,
    "deletedById" bigint,
    "logCreatedById" bigint,
    "logUpdatedById" bigint
);


--
-- Name: lwp_school_holiday_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.lwp_school_holiday_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: lwp_school_holiday_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.lwp_school_holiday_id_seq OWNED BY public.lwp_school_holiday.id;


--
-- Name: lwp_school_holidays; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lwp_school_holidays (
    "lwpSchoolHolidayId" bigint NOT NULL,
    "lwpSchoolId" bigint NOT NULL
);


--
-- Name: lwp_school_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.lwp_school_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: lwp_school_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.lwp_school_id_seq OWNED BY public.lwp_school.id;


--
-- Name: lwp_school_impact_report; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lwp_school_impact_report (
    id bigint NOT NULL,
    "isPublished" boolean DEFAULT false NOT NULL,
    "launchDate" date,
    "activeFamiliesPercentage" integer,
    "activePremiumFamiliesPercentage" integer,
    "activeFamiliesPercentageAllSchools" integer,
    "activePremiumFamiliesPercentageAllSchools" integer,
    "numberOfWeeks" integer,
    "weeklyReadingTarget" integer,
    "numberOfClasses" integer,
    "reportType" character varying,
    "yearGroupCoverage" character varying,
    "spmNote" character varying,
    "spmNextStepsProgram" character varying,
    "logCreatedAt" timestamp without time zone DEFAULT ('now'::text)::timestamp(6) with time zone,
    "logUpdatedAt" timestamp without time zone DEFAULT ('now'::text)::timestamp(6) with time zone NOT NULL,
    "periodIndex" integer,
    "schoolId" bigint,
    "logCreatedById" bigint,
    "logUpdatedById" bigint,
    "termId" bigint,
    version character varying DEFAULT 'VERSION_1'::character varying NOT NULL,
    "showNationalDataAverage" boolean DEFAULT true NOT NULL
);


--
-- Name: lwp_school_impact_report_feedback; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lwp_school_impact_report_feedback (
    content character varying NOT NULL,
    "contentType" character varying NOT NULL,
    "pupilFirstName" character varying NOT NULL,
    "className" character varying NOT NULL,
    "includedInImpactReport" boolean DEFAULT false NOT NULL,
    "classYearGroup" character varying NOT NULL,
    id bigint NOT NULL,
    "logCreatedAt" timestamp without time zone DEFAULT ('now'::text)::timestamp(6) with time zone,
    "logUpdatedAt" timestamp without time zone DEFAULT ('now'::text)::timestamp(6) with time zone NOT NULL,
    "impactReportId" bigint,
    "pupilFeedbackId" bigint,
    "logCreatedById" bigint,
    "logUpdatedById" bigint
);


--
-- Name: lwp_school_impact_report_feedback_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.lwp_school_impact_report_feedback_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: lwp_school_impact_report_feedback_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.lwp_school_impact_report_feedback_id_seq OWNED BY public.lwp_school_impact_report_feedback.id;


--
-- Name: lwp_school_impact_report_graphs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lwp_school_impact_report_graphs (
    id bigint NOT NULL,
    "premiumPupilsCount" integer,
    "pupilsCount" integer,
    "engagementByYearGroup" jsonb,
    "engagementByClass" jsonb,
    "avgCompletionRateByYearGroup" jsonb,
    "avgCompletionRateByClass" jsonb,
    "avgTopicSetByYearGroup" jsonb,
    "avgTopicSetByClass" jsonb,
    "buildingEngagement" jsonb,
    "impactReportId" bigint,
    "subjectId" bigint
);


--
-- Name: lwp_school_impact_report_graphs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.lwp_school_impact_report_graphs_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: lwp_school_impact_report_graphs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.lwp_school_impact_report_graphs_id_seq OWNED BY public.lwp_school_impact_report_graphs.id;


--
-- Name: lwp_school_impact_report_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.lwp_school_impact_report_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: lwp_school_impact_report_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.lwp_school_impact_report_id_seq OWNED BY public.lwp_school_impact_report.id;


--
-- Name: lwp_school_static_tags; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lwp_school_static_tags (
    id bigint NOT NULL,
    "isProgramTag" boolean DEFAULT false NOT NULL,
    "logCreatedAt" timestamp without time zone DEFAULT ('now'::text)::timestamp(6) with time zone,
    "logUpdatedAt" timestamp without time zone DEFAULT ('now'::text)::timestamp(6) with time zone NOT NULL,
    "tagId" bigint,
    "schoolId" bigint,
    "logCreatedById" bigint,
    "logUpdatedById" bigint
);


--
-- Name: lwp_school_static_tags_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.lwp_school_static_tags_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: lwp_school_static_tags_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.lwp_school_static_tags_id_seq OWNED BY public.lwp_school_static_tags.id;


--
-- Name: lwp_set_by_teacher_step_media; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lwp_set_by_teacher_step_media (
    filename character varying NOT NULL,
    id bigint NOT NULL,
    "logCreatedAt" timestamp without time zone DEFAULT ('now'::text)::timestamp(6) with time zone,
    "logUpdatedAt" timestamp without time zone DEFAULT ('now'::text)::timestamp(6) with time zone NOT NULL,
    "stepId" bigint NOT NULL,
    "classTopicId" bigint,
    "deletedById" bigint,
    "logCreatedById" bigint,
    "logUpdatedById" bigint,
    "parentMessage" character varying
);


--
-- Name: lwp_set_by_teacher_step_media_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.lwp_set_by_teacher_step_media_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: lwp_set_by_teacher_step_media_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.lwp_set_by_teacher_step_media_id_seq OWNED BY public.lwp_set_by_teacher_step_media.id;


--
-- Name: lwp_sticker; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lwp_sticker (
    id bigint NOT NULL,
    alt character varying NOT NULL,
    "fileName" character varying NOT NULL,
    "isActive" boolean DEFAULT false NOT NULL,
    "logCreatedAt" timestamp without time zone DEFAULT ('now'::text)::timestamp(6) with time zone,
    "logUpdatedAt" timestamp without time zone DEFAULT ('now'::text)::timestamp(6) with time zone NOT NULL,
    "logCreatedById" bigint,
    "logUpdatedById" bigint,
    label character varying,
    "textColor" character varying,
    "borderColor" character varying,
    "characterId" bigint,
    "itemId" bigint,
    "schoolId" bigint
);


--
-- Name: lwp_sticker_character_item; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lwp_sticker_character_item (
    id bigint NOT NULL,
    alt character varying NOT NULL,
    "fileName" character varying NOT NULL,
    "isActive" boolean DEFAULT false NOT NULL,
    type character varying NOT NULL,
    "logCreatedAt" timestamp without time zone DEFAULT ('now'::text)::timestamp(6) with time zone,
    "logUpdatedAt" timestamp without time zone DEFAULT ('now'::text)::timestamp(6) with time zone NOT NULL,
    "logCreatedById" bigint,
    "logUpdatedById" bigint
);


--
-- Name: lwp_sticker_character_item_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.lwp_sticker_character_item_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: lwp_sticker_character_item_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.lwp_sticker_character_item_id_seq OWNED BY public.lwp_sticker_character_item.id;


--
-- Name: lwp_sticker_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.lwp_sticker_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: lwp_sticker_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.lwp_sticker_id_seq OWNED BY public.lwp_sticker.id;


--
-- Name: lwp_teacher_liked_pupil_activity; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lwp_teacher_liked_pupil_activity (
    "lwpUserId" bigint NOT NULL,
    "lwpPupilFeedbackId" bigint NOT NULL
);


--
-- Name: lwp_token; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lwp_token (
    id integer NOT NULL,
    "userId" integer NOT NULL,
    "refreshToken" character varying NOT NULL,
    "expiresAt" timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: lwp_token_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.lwp_token_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: lwp_token_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.lwp_token_id_seq OWNED BY public.lwp_token.id;


--
-- Name: lwp_topic_school_tags; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lwp_topic_school_tags (
    "staticLwpSchoolTagId" bigint NOT NULL,
    "staticLwpTopicId" bigint NOT NULL
);


--
-- Name: lwp_topic_tags; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lwp_topic_tags (
    "staticLwpTopicId" bigint NOT NULL,
    "staticLwpTopicTagId" bigint NOT NULL
);


--
-- Name: lwp_topic_year_groups; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lwp_topic_year_groups (
    "staticLwpTopicId" bigint NOT NULL,
    "staticLwpYearGroupId" bigint NOT NULL
);


--
-- Name: lwp_trophy_subjects; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lwp_trophy_subjects (
    "staticLwpTrophyId" bigint NOT NULL,
    "staticLwpSubjectId" bigint NOT NULL
);


--
-- Name: lwp_user_associated_login; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lwp_user_associated_login (
    "accountId" character varying NOT NULL,
    firstname character varying,
    lastname character varying,
    email character varying,
    picture character varying,
    phone character varying,
    "accountType" character varying DEFAULT 'MICROSOFT'::character varying NOT NULL,
    id bigint NOT NULL,
    "logCreatedAt" timestamp without time zone DEFAULT ('now'::text)::timestamp(6) with time zone,
    "logUpdatedAt" timestamp without time zone DEFAULT ('now'::text)::timestamp(6) with time zone NOT NULL,
    "userId" bigint,
    "logCreatedById" bigint,
    "logUpdatedById" bigint,
    "deletedById" bigint
);


--
-- Name: lwp_user_associated_login_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.lwp_user_associated_login_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: lwp_user_associated_login_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.lwp_user_associated_login_id_seq OWNED BY public.lwp_user_associated_login.id;


--
-- Name: lwp_user_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.lwp_user_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: lwp_user_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.lwp_user_id_seq OWNED BY public.lwp_user.id;


--
-- Name: lwp_user_interstitial; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lwp_user_interstitial (
    completed boolean DEFAULT false NOT NULL,
    "optedOut" boolean DEFAULT false NOT NULL,
    id bigint NOT NULL,
    "logCreatedAt" timestamp without time zone DEFAULT ('now'::text)::timestamp(6) with time zone,
    "logUpdatedAt" timestamp without time zone DEFAULT ('now'::text)::timestamp(6) with time zone NOT NULL,
    "userId" bigint,
    "interstitialId" bigint,
    "deletedById" bigint,
    "logCreatedById" bigint,
    "logUpdatedById" bigint
);


--
-- Name: lwp_user_interstitial_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.lwp_user_interstitial_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: lwp_user_interstitial_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.lwp_user_interstitial_id_seq OWNED BY public.lwp_user_interstitial.id;


--
-- Name: lwp_user_page_announcement; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lwp_user_page_announcement (
    "seenAt" timestamp without time zone DEFAULT ('now'::text)::timestamp(6) with time zone NOT NULL,
    id bigint NOT NULL,
    "logCreatedAt" timestamp without time zone DEFAULT ('now'::text)::timestamp(6) with time zone NOT NULL,
    "logUpdatedAt" timestamp without time zone DEFAULT ('now'::text)::timestamp(6) with time zone NOT NULL,
    "userId" bigint,
    "pageAnnouncementId" bigint,
    "logCreatedById" bigint,
    "logUpdatedById" bigint
);


--
-- Name: lwp_user_page_announcement_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.lwp_user_page_announcement_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: lwp_user_page_announcement_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.lwp_user_page_announcement_id_seq OWNED BY public.lwp_user_page_announcement.id;


--
-- Name: lwp_user_session; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lwp_user_session (
    "userId" bigint NOT NULL,
    ip character varying NOT NULL,
    "userAgent" character varying NOT NULL,
    "sessionLength" integer NOT NULL,
    "refreshToken" character varying,
    id bigint NOT NULL,
    "logCreatedAt" timestamp without time zone DEFAULT ('now'::text)::timestamp(6) with time zone,
    "logUpdatedAt" timestamp without time zone DEFAULT ('now'::text)::timestamp(6) with time zone NOT NULL,
    "authMethod" character varying NOT NULL,
    "previousRefreshToken" character varying
);


--
-- Name: lwp_user_session_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.lwp_user_session_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: lwp_user_session_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.lwp_user_session_id_seq OWNED BY public.lwp_user_session.id;


--
-- Name: lwp_user_tooltip_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lwp_user_tooltip_history (
    id bigint NOT NULL,
    "logCreatedAt" timestamp without time zone DEFAULT ('now'::text)::timestamp(6) with time zone,
    "logUpdatedAt" timestamp without time zone DEFAULT ('now'::text)::timestamp(6) with time zone NOT NULL,
    "userId" bigint,
    "logCreatedById" bigint,
    "logUpdatedById" bigint,
    "featureTooltipId" bigint
);


--
-- Name: lwp_user_tooltip_history_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.lwp_user_tooltip_history_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: lwp_user_tooltip_history_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.lwp_user_tooltip_history_id_seq OWNED BY public.lwp_user_tooltip_history.id;


--
-- Name: static_lwp_parameter; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.static_lwp_parameter (
    key character varying NOT NULL,
    value character varying NOT NULL,
    "logCreatedAt" timestamp without time zone DEFAULT ('now'::text)::timestamp(6) with time zone,
    "logUpdatedAt" timestamp without time zone DEFAULT ('now'::text)::timestamp(6) with time zone NOT NULL,
    "logCreatedById" bigint,
    "logUpdatedById" bigint
);


--
-- Name: lwp_view_can_notify_school; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.lwp_view_can_notify_school WITH (security_invoker='true') AS
 SELECT id AS "schoolId",
    (((CURRENT_TIME)::time without time zone - (to_timestamp(
        CASE ((EXTRACT(isodow FROM CURRENT_DATE) > (5)::numeric) OR ((id <> '-1'::integer) AND (EXISTS ( SELECT 1
               FROM (public.lwp_school_holidays lshs
                 JOIN public.lwp_school_holiday lsh ON ((lsh.id = lshs."lwpSchoolHolidayId")))
              WHERE ((lshs."lwpSchoolId" = ls.id) AND (lsh."startDate" <= CURRENT_DATE) AND (lsh."endDate" >= CURRENT_DATE) AND (lsh."periodIndex" = ls."curentPeriodIndex"))))))
            WHEN true THEN ( SELECT COALESCE(min((static_lwp_parameter.value)::text), '10:00'::text) AS "coalesce"
               FROM public.static_lwp_parameter
              WHERE ((static_lwp_parameter.key)::text = 'WEEKEND_TOPIC_RELEASE_EMAILS'::text))
            ELSE ( SELECT COALESCE(min((static_lwp_parameter.value)::text), '15:00'::text) AS "coalesce"
               FROM public.static_lwp_parameter
              WHERE ((static_lwp_parameter.key)::text = 'WEEKDAY_TOPIC_RELEASE_EMAILS'::text))
        END, 'HH24:MI'::text))::time without time zone) >= '00:00:00'::interval) AS "canNotify"
   FROM ( SELECT lwp_school.id,
            lwp_school."curentPeriodIndex"
           FROM public.lwp_school
        UNION ALL
         SELECT '-1'::integer,
            '-1'::integer) ls;


--
-- Name: static_lwp_mathscot_item; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.static_lwp_mathscot_item (
    id bigint NOT NULL,
    name character varying,
    theme character varying,
    category character varying,
    "zIndex" character varying,
    "imagePath" character varying,
    "imageIconPath" character varying,
    "sequenceOrder" integer,
    "conflictingCategories" jsonb,
    "mwpTheme" integer
);


--
-- Name: static_lwp_topic; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.static_lwp_topic (
    "teacherTopicName" character varying,
    video character varying,
    "videoThumb" character varying,
    "teacherDescription" character varying,
    year character varying,
    "printablesFile" character varying,
    "parentTopicName" character varying,
    "teacherEmailBody" character varying,
    id bigint NOT NULL,
    "logCreatedAt" timestamp without time zone DEFAULT ('now'::text)::timestamp(6) with time zone,
    "logUpdatedAt" timestamp without time zone DEFAULT ('now'::text)::timestamp(6) with time zone NOT NULL,
    "logCreatedById" bigint,
    "logUpdatedById" bigint,
    "isDemo" boolean DEFAULT false,
    "isHidden" boolean DEFAULT false,
    "teacherPdf" character varying,
    "isTeacherPdfRequired" boolean DEFAULT false NOT NULL,
    "deletedById" bigint,
    "isPublished" boolean DEFAULT true NOT NULL,
    "isReading" boolean DEFAULT false NOT NULL,
    "scrapbookPrompt" character varying,
    "noVideo" boolean DEFAULT false NOT NULL,
    "teacherResource" character varying
);


--
-- Name: static_lwp_year_group; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.static_lwp_year_group (
    year character varying NOT NULL,
    id bigint NOT NULL,
    "logCreatedAt" timestamp without time zone DEFAULT ('now'::text)::timestamp(6) with time zone,
    "logUpdatedAt" timestamp without time zone DEFAULT ('now'::text)::timestamp(6) with time zone NOT NULL,
    "logCreatedById" bigint,
    "logUpdatedById" bigint,
    "mathscotThemes" jsonb DEFAULT '[]'::jsonb,
    "shortName" character varying,
    "hiddenFromLists" boolean DEFAULT false NOT NULL
);


--
-- Name: lwp_view_class_next_mathscot_items; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.lwp_view_class_next_mathscot_items WITH (security_invoker='true') AS
 WITH releasedtopics AS (
         SELECT lsc.id AS "classId",
            slyg."mathscotThemes",
            count(1) FILTER (WHERE ((lct.id IS NOT NULL) AND (lct.released = true))) AS "releasedTopics"
           FROM (((public.lwp_school_class lsc
             LEFT JOIN public.static_lwp_topic slt ON ((slt."isReading" = true)))
             LEFT JOIN public.lwp_class_topic lct ON (((lsc.id = lct."classId") AND (lct."topicId" <> slt.id))))
             JOIN public.static_lwp_year_group slyg ON ((lsc."yearGroup" = slyg.id)))
          GROUP BY lsc.id, slyg."mathscotThemes"
        )
 SELECT rt."classId",
        CASE
            WHEN (array_length(array_remove(array_agg(slmi.id), NULL::bigint), 1) IS NOT NULL) THEN array_agg(DISTINCT slmi.id)
            ELSE array_agg(DISTINCT rand.id)
        END AS "mathscotItems"
   FROM ((releasedtopics rt
     LEFT JOIN public.static_lwp_mathscot_item slmi ON (((slmi."sequenceOrder" = (rt."releasedTopics" + 1)) AND (rt."mathscotThemes" ? (slmi.theme)::text))))
     LEFT JOIN ( SELECT static_lwp_mathscot_item.id
           FROM public.static_lwp_mathscot_item
          ORDER BY (random())
         LIMIT 3) rand ON ((1 = 1)))
  GROUP BY rt."classId";


--
-- Name: lwp_view_parent_pupil_action_stats; Type: MATERIALIZED VIEW; Schema: public; Owner: -
--

CREATE MATERIALIZED VIEW public.lwp_view_parent_pupil_action_stats AS
 SELECT "actionId",
    "userId",
    "parentId",
    "pupilId",
    param1,
    param2,
    param3,
    "time",
    id
   FROM public.log_parent_pupil_action
  WITH NO DATA;


--
-- Name: lwp_view_pupil_status; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.lwp_view_pupil_status WITH (security_invoker='true') AS
 SELECT lp.id AS "pupilId",
        CASE
            WHEN (NOT (EXISTS ( SELECT 1
               FROM public.lwp_pupil_parent lpp
              WHERE ((lpp."pupilId" = lp.id) AND ((lpp.status)::text = 'ACTIVE'::text))))) THEN 'MISSING'::text
            ELSE
            CASE
                WHEN (COALESCE((terms.daterange @> (lp."logLastActivityCompleted")::date), false) OR (EXISTS ( SELECT 1
                   FROM (public.lwp_pupil_feedback lpf
                     JOIN public.lwp_pupil_feedback_history lpfh ON ((lpfh."lwpPupilFeedbackId" = lpf.id)))
                  WHERE ((lpfh."lwpPupilId" = lp.id) AND ((lpf."userType")::text = ANY (ARRAY[('PARENT'::character varying)::text, ('TOPICACCESS'::character varying)::text, ('MAGICPARENT'::character varying)::text])) AND COALESCE((terms.daterange @> (COALESCE((lpf."bookReadAt")::timestamp without time zone, lpf."logCreatedAt"))::date), false))))) THEN 'ACTIVE'::text
                ELSE 'REGISTERED'::text
            END
        END AS "pupilStatus"
   FROM (public.lwp_pupil lp
     LEFT JOIN ( SELECT daterange((lsd."startDate")::date, CURRENT_DATE) AS daterange
           FROM public.lwp_school_dates lsd
          WHERE (lsd."startDate" <= CURRENT_DATE)
          ORDER BY lsd."startDate" DESC
         LIMIT 1) terms ON ((1 = 1)));


--
-- Name: static_lwp_period; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.static_lwp_period (
    index integer NOT NULL,
    "shortName" character varying NOT NULL,
    "longName" character varying NOT NULL,
    "isCurrentPeriod" boolean NOT NULL,
    "isPreviousPeriod" boolean NOT NULL,
    "logCreatedAt" timestamp without time zone DEFAULT ('now'::text)::timestamp(6) with time zone,
    "logUpdatedAt" timestamp without time zone DEFAULT ('now'::text)::timestamp(6) with time zone NOT NULL,
    "nextPeriodIndex" integer,
    "previousPeriodIndex" integer,
    "logCreatedById" bigint,
    "logUpdatedById" bigint,
    characters jsonb DEFAULT '[]'::jsonb,
    colours jsonb DEFAULT '[]'::jsonb,
    "startDate" date,
    "endDate" date
);


--
-- Name: lwp_view_pupil_topics_for_notifications; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.lwp_view_pupil_topics_for_notifications WITH (security_invoker='true') AS
 SELECT (lu_parent.*)::public.lwp_user AS "lwpUserParent",
    lsc."periodIndex",
    ls.id AS "schoolId",
    ls."schoolName",
    lpt.id AS "pupilTopicId",
    slt.*::public.static_lwp_topic AS "staticLwpTopic",
    lp.*::public.lwp_pupil AS "lwpPupil",
    lvps."pupilStatus" AS "lwpPupilStatus",
    lsc.name AS "className",
    lsc.id AS "classId",
    lct.id AS "classTopicId",
    lu_teacher."nameForChildren" AS "teacherName",
    lct."releaseDate",
    lpt."parentsNotified",
    lpt."reminderSent",
    lpt."reminderSentFor2Days",
    lct."dueDate",
    lpt."readingTarget",
    lpp.status AS "pupilParentStatus",
    lpp."lastInvitationEmailSent" AS "pupilParentLastInvitation",
    (slt."isReading" = true) AS "isReadingTopic",
        CASE lu_parent."notificationPreference"
            WHEN 'EMAILREMINDER'::text THEN 'email'::text
            WHEN 'SMSREMINDER'::text THEN 'phone'::text
            ELSE NULL::text
        END AS "notifPreference",
    lpt."silverStars",
    lpt."earnedGoldStar",
    ( SELECT sp.index
           FROM public.static_lwp_period sp
          WHERE (sp."isCurrentPeriod" = true)
         LIMIT 1) AS "globalCurrentAcademicYear"
   FROM ((((((((((public.lwp_pupil_topic lpt
     JOIN public.lwp_class_topic lct ON ((lpt."classTopicId" = lct.id)))
     JOIN public.static_lwp_topic slt ON ((lpt."topicId" = slt.id)))
     JOIN public.lwp_school_class lsc ON ((lct."classId" = lsc.id)))
     JOIN public.lwp_pupil_parent lpp ON ((lpt."pupilId" = lpp."pupilId")))
     JOIN public.lwp_pupil lp ON ((lpt."pupilId" = lp.id)))
     JOIN public.lwp_view_pupil_status lvps ON ((lvps."pupilId" = lp.id)))
     JOIN public.lwp_school ls ON ((lp."schoolId" = ls.id)))
     JOIN public.lwp_view_notifiable_parents lu_parent ON ((lpp."parentId" = lu_parent.id)))
     JOIN public.lwp_user lu_teacher ON ((lsc."mainTeacherId" = lu_teacher.id)))
     JOIN public.lwp_view_can_notify_school lvcns ON ((ls.id = lvcns."schoolId")))
  WHERE ((ls.inactive = false) AND (lpt."releaseDate" <= CURRENT_DATE) AND (lvcns."canNotify" = true));


--
-- Name: lwp_view_reading_log_to_reading_topic; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.lwp_view_reading_log_to_reading_topic WITH (security_invoker='true') AS
 SELECT lpf.id AS "pupilFeedbackId",
    lpt.id AS "pupilTopicId"
   FROM (((public.lwp_pupil_feedback lpf
     JOIN public.static_lwp_topic slt ON ((slt."isReading" = true)))
     JOIN public.lwp_pupil_feedback_history lpfh ON ((lpfh."lwpPupilFeedbackId" = lpf.id)))
     JOIN public.lwp_pupil_topic lpt ON (((lpt."pupilId" = lpfh."lwpPupilId") AND (daterange(lpt."releaseDate", ((lpt."releaseDate" + '7 days'::interval))::date) @> (COALESCE((lpf."bookReadAt")::timestamp without time zone, lpf."logCreatedAt"))::date) AND (lpt."topicId" = slt.id))))
  WHERE ((lpf.type)::text = 'READING'::text);


--
-- Name: lwp_view_spm_school_class_reading_targets; Type: MATERIALIZED VIEW; Schema: public; Owner: -
--

CREATE MATERIALIZED VIEW public.lwp_view_spm_school_class_reading_targets AS
 SELECT lsc."schoolId",
    lsc.id AS "classId",
    lsc.name AS "className",
    (public.calculate_percentage((count(DISTINCT lp.id))::integer, (count(DISTINCT lp.id) FILTER (WHERE (lpt."earnedGoldStar" = true)))::integer))::integer AS "activePercent",
    now() AS "refreshedAt"
   FROM (((((((public.lwp_school ls
     JOIN public.lwp_school_class lsc ON (((lsc."schoolId" = ls.id) AND (lsc."periodIndex" = ls."curentPeriodIndex") AND (lsc."isRegistrationClass" = true) AND ((lsc.status)::text = 'ACTIVE'::text) AND (lsc."IsReadingLogsEnabled" = true))))
     JOIN public.lwp_class_pupil lcp ON ((lcp."lwpSchoolClassId" = lsc.id)))
     JOIN public.lwp_pupil lp ON ((lp.id = lcp."lwpPupilId")))
     JOIN public.lwp_pupil_parent lpp ON (((lpp."pupilId" = lp.id) AND ((lpp.status)::text = ANY ((ARRAY['INVITED'::character varying, 'ACTIVE'::character varying])::text[])))))
     JOIN public.lwp_pupil_topic lpt ON (((lpt."pupilId" = lp.id) AND (lpt."periodIndex" = ls."curentPeriodIndex") AND (lpt."readingTarget" > 0))))
     JOIN public.lwp_class_topic lct ON (((lct.id = lpt."classTopicId") AND (lct.released = true) AND (lct."readingTarget" > 0))))
     JOIN public.static_lwp_topic slt ON (((slt.id = lct."topicId") AND (slt."isReading" = true))))
  WHERE ((NOT ls.inactive) AND (NOT ls."isTestSchool"))
  GROUP BY lsc."schoolId", lsc.id, lsc.name
  WITH NO DATA;


--
-- Name: static_lwp_subject; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.static_lwp_subject (
    id bigint NOT NULL,
    name character varying NOT NULL,
    "logCreatedAt" timestamp without time zone DEFAULT ('now'::text)::timestamp(6) with time zone,
    "logUpdatedAt" timestamp without time zone DEFAULT ('now'::text)::timestamp(6) with time zone NOT NULL,
    "deletedById" bigint,
    "logCreatedById" bigint,
    "logUpdatedById" bigint,
    "programmeType" character varying DEFAULT 'FULL_PROGRAMME'::character varying NOT NULL
);


--
-- Name: static_lwp_topic_domain; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.static_lwp_topic_domain (
    title character varying NOT NULL,
    id bigint NOT NULL,
    "logCreatedAt" timestamp without time zone DEFAULT ('now'::text)::timestamp(6) with time zone,
    "logUpdatedAt" timestamp without time zone DEFAULT ('now'::text)::timestamp(6) with time zone NOT NULL,
    "logCreatedById" bigint,
    "logUpdatedById" bigint,
    "deletedById" bigint,
    "subjectId" bigint
);


--
-- Name: static_lwp_topic_domain_year_group; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.static_lwp_topic_domain_year_group (
    id bigint NOT NULL,
    "logCreatedAt" timestamp without time zone DEFAULT ('now'::text)::timestamp(6) with time zone,
    "logUpdatedAt" timestamp without time zone DEFAULT ('now'::text)::timestamp(6) with time zone NOT NULL,
    "topicId" bigint,
    "domainId" bigint,
    "yearGroupId" bigint,
    "logCreatedById" bigint,
    "logUpdatedById" bigint
);


--
-- Name: lwp_view_spm_school_metrics; Type: MATERIALIZED VIEW; Schema: public; Owner: -
--

CREATE MATERIALIZED VIEW public.lwp_view_spm_school_metrics AS
 WITH live_school AS (
         SELECT ls.id AS "schoolId",
            ls."curentPeriodIndex" AS "periodIndex"
           FROM public.lwp_school ls
          WHERE ((NOT ls.inactive) AND (NOT ls."isTestSchool"))
        ), current_class AS (
         SELECT s_1."schoolId",
            s_1."periodIndex",
            lsc.id AS "classId",
            lsc."IsReadingLogsEnabled" AS "isReadingLogsEnabled",
            lsc."readingTarget"
           FROM (live_school s_1
             JOIN public.lwp_school_class lsc ON (((lsc."schoolId" = s_1."schoolId") AND (lsc."periodIndex" = s_1."periodIndex"))))
          WHERE ((lsc."isRegistrationClass" = true) AND ((lsc.status)::text = 'ACTIVE'::text))
        ), reading_log_class AS (
         SELECT current_class."schoolId",
            current_class."periodIndex",
            current_class."classId",
            current_class."isReadingLogsEnabled",
            current_class."readingTarget"
           FROM current_class
          WHERE (current_class."isReadingLogsEnabled" = true)
        ), previous_reading_log_class AS (
         SELECT s_1."schoolId",
            (s_1."periodIndex" - 1) AS "periodIndex",
            lsc.id AS "classId"
           FROM (live_school s_1
             JOIN public.lwp_school_class lsc ON (((lsc."schoolId" = s_1."schoolId") AND (lsc."periodIndex" = (s_1."periodIndex" - 1)))))
          WHERE ((lsc."isRegistrationClass" = true) AND ((lsc.status)::text = 'ACTIVE'::text) AND (lsc."IsReadingLogsEnabled" = true))
        ), activated_class_count AS (
         SELECT current_class."schoolId",
            (count(current_class."classId"))::integer AS "activatedClassCount"
           FROM current_class
          GROUP BY current_class."schoolId"
        ), unconfirmed_parent AS (
         SELECT DISTINCT p."schoolId"
           FROM ((live_school s_1
             JOIN public.lwp_pupil p ON ((p."schoolId" = s_1."schoolId")))
             JOIN public.lwp_pupil_parent pp_1 ON ((pp_1."pupilId" = p.id)))
          WHERE ((pp_1.status)::text = 'IMPORTED'::text)
        ), reading_log_parent_feedback AS (
         SELECT DISTINCT lp."schoolId",
            lpf.id AS "feedbackId",
            lpf."logCreatedAt"
           FROM (((live_school s_1
             JOIN public.lwp_pupil lp ON ((lp."schoolId" = s_1."schoolId")))
             JOIN public.lwp_pupil_feedback_history lpfh ON ((lpfh."lwpPupilId" = lp.id)))
             JOIN public.lwp_pupil_feedback lpf ON ((lpf.id = lpfh."lwpPupilFeedbackId")))
          WHERE (((lpf."userType")::text = 'PARENT'::text) AND ((lpf.type)::text = 'READING'::text) AND (lpf."originalFeedbackId" IS NULL) AND (lpf."periodIndex" = s_1."periodIndex"))
        ), reading_log_launch AS (
         SELECT ranked."schoolId",
            ranked."logCreatedAt" AS "launchDate"
           FROM ( SELECT reading_log_parent_feedback."schoolId",
                    reading_log_parent_feedback."logCreatedAt",
                    row_number() OVER (PARTITION BY reading_log_parent_feedback."schoolId" ORDER BY reading_log_parent_feedback."logCreatedAt") AS rn
                   FROM reading_log_parent_feedback) ranked
          WHERE (ranked.rn = 3)
        ), activity_launch AS (
         SELECT ranked."schoolId",
            ranked."programmeType",
            ranked."logCreatedAt" AS "launchDate"
           FROM ( SELECT lsc."schoolId",
                    lsub."programmeType",
                    lpf."logCreatedAt",
                    row_number() OVER (PARTITION BY lsc."schoolId", lsub."programmeType" ORDER BY lpf."logCreatedAt") AS rn
                   FROM ((((((((live_school s_1
                     JOIN public.lwp_school_class lsc ON ((lsc."schoolId" = s_1."schoolId")))
                     JOIN public.lwp_class_topic lct ON ((lct."classId" = lsc.id)))
                     JOIN public.lwp_pupil_topic lpt ON ((lpt."classTopicId" = lct.id)))
                     JOIN public.lwp_pupil_activity lpa ON ((lpa."topicId" = lpt.id)))
                     JOIN public.lwp_pupil_feedback lpf ON ((lpf."activityId" = lpa.id)))
                     JOIN public.static_lwp_topic_domain_year_group ldyg ON ((ldyg."topicId" = lpt."topicId")))
                     JOIN public.static_lwp_topic_domain ld ON ((ld.id = ldyg."domainId")))
                     JOIN public.static_lwp_subject lsub ON ((lsub.id = ld."subjectId")))
                  WHERE (((lpf."userType")::text = 'PARENT'::text) AND ((lpf.type)::text = 'ACTIVITY'::text) AND (lpf."originalFeedbackId" IS NULL) AND ((((lsub."programmeType")::text = 'READY_TEDDY'::text) AND (lpf."periodIndex" >= s_1."periodIndex")) OR (((lsub."programmeType")::text <> 'READY_TEDDY'::text) AND (lpf."periodIndex" = s_1."periodIndex"))) AND ((lsub."programmeType")::text = ANY ((ARRAY['FULL_PROGRAMME'::character varying, 'MONEY_SKILLS'::character varying, 'READY_TEDDY'::character varying])::text[])))) ranked
          WHERE (ranked.rn = 3)
        ), reading_log_current_term AS (
         SELECT c."schoolId",
            (public.calculate_percentage((count(DISTINCT lp.id))::integer, (count(DISTINCT lp.id) FILTER (WHERE (lpt."earnedGoldStar" = true)))::integer))::integer AS "activePercent"
           FROM ((((((reading_log_class c
             JOIN public.lwp_class_pupil lcp ON ((lcp."lwpSchoolClassId" = c."classId")))
             JOIN public.lwp_pupil lp ON ((lp.id = lcp."lwpPupilId")))
             JOIN public.lwp_pupil_parent lpp ON (((lpp."pupilId" = lp.id) AND ((lpp.status)::text = ANY ((ARRAY['INVITED'::character varying, 'ACTIVE'::character varying])::text[])))))
             JOIN public.lwp_pupil_topic lpt ON (((lpt."pupilId" = lp.id) AND (lpt."periodIndex" = c."periodIndex") AND (lpt."readingTarget" > 0))))
             JOIN public.lwp_class_topic lct ON (((lct.id = lpt."classTopicId") AND (lct.released = true) AND (lct."readingTarget" > 0))))
             JOIN public.static_lwp_topic slt ON (((slt.id = lct."topicId") AND (slt."isReading" = true))))
          GROUP BY c."schoolId"
        ), reading_log_current_term_comment AS (
         SELECT c."schoolId",
            (public.calculate_percentage((count(DISTINCT lp.id))::integer, (count(DISTINCT lp.id) FILTER (WHERE (lpf.id IS NOT NULL)))::integer))::integer AS "activePercent"
           FROM (((((reading_log_class c
             JOIN public.lwp_class_pupil lcp ON ((lcp."lwpSchoolClassId" = c."classId")))
             JOIN public.lwp_pupil lp ON ((lp.id = lcp."lwpPupilId")))
             JOIN public.lwp_pupil_parent lpp ON (((lpp."pupilId" = lp.id) AND ((lpp.status)::text = ANY ((ARRAY['INVITED'::character varying, 'ACTIVE'::character varying])::text[])))))
             LEFT JOIN public.lwp_pupil_feedback_history lpfh ON ((lpfh."lwpPupilId" = lp.id)))
             LEFT JOIN public.lwp_pupil_feedback lpf ON (((lpf.id = lpfh."lwpPupilFeedbackId") AND ((lpf.type)::text = 'READING'::text) AND (lpf."periodIndex" = c."periodIndex") AND (lpf.comment IS NOT NULL))))
          GROUP BY c."schoolId"
        ), reading_log_previous_term_comment AS (
         SELECT c."schoolId",
            (public.calculate_percentage((count(DISTINCT lp.id))::integer, (count(DISTINCT lp.id) FILTER (WHERE (lpf.id IS NOT NULL)))::integer))::integer AS "activePercent"
           FROM (((((previous_reading_log_class c
             JOIN public.lwp_class_pupil lcp ON ((lcp."lwpSchoolClassId" = c."classId")))
             JOIN public.lwp_pupil lp ON ((lp.id = lcp."lwpPupilId")))
             JOIN public.lwp_pupil_parent lpp ON (((lpp."pupilId" = lp.id) AND ((lpp.status)::text = ANY ((ARRAY['INVITED'::character varying, 'ACTIVE'::character varying])::text[])))))
             LEFT JOIN public.lwp_pupil_feedback_history lpfh ON ((lpfh."lwpPupilId" = lp.id)))
             LEFT JOIN public.lwp_pupil_feedback lpf ON (((lpf.id = lpfh."lwpPupilFeedbackId") AND ((lpf.type)::text = 'READING'::text) AND (lpf."periodIndex" = c."periodIndex") AND (lpf.comment IS NOT NULL))))
          GROUP BY c."schoolId"
        ), teacher_feedback_in_use AS (
         SELECT c."schoolId",
            (count(DISTINCT lpf.id) > 0) AS "isInUse"
           FROM (((((reading_log_class c
             JOIN public.lwp_class_pupil lcp ON ((lcp."lwpSchoolClassId" = c."classId")))
             JOIN public.lwp_pupil lp ON ((lp.id = lcp."lwpPupilId")))
             JOIN public.lwp_pupil_parent lpp ON (((lpp."pupilId" = lp.id) AND ((lpp.status)::text = ANY ((ARRAY['INVITED'::character varying, 'ACTIVE'::character varying])::text[])))))
             LEFT JOIN public.lwp_pupil_feedback_history lpfh ON ((lpfh."lwpPupilId" = lp.id)))
             LEFT JOIN public.lwp_pupil_feedback lpf ON (((lpf.id = lpfh."lwpPupilFeedbackId") AND ((lpf.type)::text = 'READING'::text) AND (lpf."periodIndex" = c."periodIndex") AND ((lpf."userType")::text = 'TEACHER'::text))))
          GROUP BY c."schoolId"
        ), teacher_feedback_count AS (
         SELECT c."schoolId",
            (count(DISTINCT lpf.id))::integer AS "teacherFeedbackCount"
           FROM ((((reading_log_class c
             JOIN public.lwp_class_pupil lcp ON ((lcp."lwpSchoolClassId" = c."classId")))
             JOIN public.lwp_pupil lp ON ((lp.id = lcp."lwpPupilId")))
             LEFT JOIN public.lwp_pupil_feedback_history lpfh ON ((lpfh."lwpPupilId" = lp.id)))
             LEFT JOIN public.lwp_pupil_feedback lpf ON (((lpf.id = lpfh."lwpPupilFeedbackId") AND ((lpf.type)::text = 'READING'::text) AND (lpf."periodIndex" = c."periodIndex") AND ((lpf."userType")::text = 'TEACHER'::text))))
          GROUP BY c."schoolId"
        ), school_reading_target AS (
         SELECT reading_log_class."schoolId",
            mode() WITHIN GROUP (ORDER BY reading_log_class."readingTarget") AS "readingTarget"
           FROM reading_log_class
          GROUP BY reading_log_class."schoolId"
        ), topics_current_term AS (
         SELECT c."schoolId",
            (public.calculate_percentage((count(DISTINCT lp.id))::integer, (count(DISTINCT lp.id) FILTER (WHERE ((lpt."earnedGoldStar" = true) OR (lpt."silverStars" > 0) OR (lpt."watchedVideo" = true))))::integer))::integer AS "activePercent"
           FROM (((((current_class c
             JOIN public.lwp_class_pupil lcp ON ((lcp."lwpSchoolClassId" = c."classId")))
             JOIN public.lwp_pupil lp ON ((lp.id = lcp."lwpPupilId")))
             JOIN public.lwp_pupil_topic lpt ON (((lpt."pupilId" = lp.id) AND (lpt."periodIndex" = c."periodIndex"))))
             JOIN public.lwp_class_topic lct ON (((lct.id = lpt."classTopicId") AND (lct.released = true))))
             JOIN public.static_lwp_topic slt ON (((slt.id = lct."topicId") AND (slt."isReading" = false))))
          GROUP BY c."schoolId"
        ), activities_current_term AS (
         SELECT c."schoolId",
            (public.calculate_percentage((count(DISTINCT lp.id))::integer, (count(DISTINCT lp.id) FILTER (WHERE ((lpa."earnedStar" = true) OR (lpa."logFirstAccessed" IS NOT NULL))))::integer))::integer AS "activePercent"
           FROM ((((((current_class c
             JOIN public.lwp_class_pupil lcp ON ((lcp."lwpSchoolClassId" = c."classId")))
             JOIN public.lwp_pupil lp ON ((lp.id = lcp."lwpPupilId")))
             JOIN public.lwp_pupil_topic lpt ON (((lpt."pupilId" = lp.id) AND (lpt."periodIndex" = c."periodIndex"))))
             JOIN public.lwp_class_topic lct ON (((lct.id = lpt."classTopicId") AND (lct.released = true))))
             JOIN public.static_lwp_topic slt ON (((slt.id = lct."topicId") AND (slt."isReading" = false))))
             JOIN public.lwp_pupil_activity lpa ON ((lpa."topicId" = lpt.id)))
          GROUP BY c."schoolId"
        ), pupil_premium AS (
         SELECT c."schoolId",
            (public.calculate_percentage((count(DISTINCT lp.id))::integer, (count(DISTINCT lp.id) FILTER (WHERE (lp."isPremium" = true)))::integer))::integer AS "premiumPercent"
           FROM ((current_class c
             JOIN public.lwp_class_pupil lcp ON ((lcp."lwpSchoolClassId" = c."classId")))
             JOIN public.lwp_pupil lp ON ((lp.id = lcp."lwpPupilId")))
          GROUP BY c."schoolId"
        ), topics_set_count AS (
         SELECT c."schoolId",
            (count(DISTINCT lct.id))::integer AS "topicsSetCount"
           FROM ((current_class c
             JOIN public.lwp_class_topic lct ON (((lct."classId" = c."classId") AND (lct.released = true))))
             JOIN public.static_lwp_topic slt ON (((slt.id = lct."topicId") AND (slt."isReading" = false))))
          GROUP BY c."schoolId"
        ), class_with_no_active_teacher AS (
         SELECT c."schoolId",
            c."classId"
           FROM ((current_class c
             JOIN public.lwp_class_teacher lct ON ((lct."lwpSchoolClassId" = c."classId")))
             LEFT JOIN public.lwp_user lu ON ((lu.id = lct."lwpUserId")))
          GROUP BY c."schoolId", c."classId"
         HAVING (count(lu.id) FILTER (WHERE ((lu."lastAccess" IS NULL) OR (lu."lastAccess" >= (now() - '14 days'::interval)))) = 0)
        ), no_active_teacher_count AS (
         SELECT class_with_no_active_teacher."schoolId",
            (count(class_with_no_active_teacher."classId"))::integer AS "classesWithNoActiveTeacherCount"
           FROM class_with_no_active_teacher
          GROUP BY class_with_no_active_teacher."schoolId"
        ), reading_log_totals AS (
         SELECT s_1."schoolId",
            (count(DISTINCT lpf.id) FILTER (WHERE ((lpf."userType")::text <> 'TEACHER'::text)))::integer AS "atHomeCount",
            (count(DISTINCT lpf.id) FILTER (WHERE ((lpf."userType")::text = 'TEACHER'::text)))::integer AS "atSchoolCount"
           FROM (((live_school s_1
             JOIN public.lwp_pupil lp ON ((lp."schoolId" = s_1."schoolId")))
             JOIN public.lwp_pupil_feedback_history lpfh ON ((lpfh."lwpPupilId" = lp.id)))
             JOIN public.lwp_pupil_feedback lpf ON ((lpf.id = lpfh."lwpPupilFeedbackId")))
          WHERE (((lpf.type)::text = 'READING'::text) AND (lpf."originalFeedbackId" IS NULL) AND (lpf."periodIndex" = s_1."periodIndex"))
          GROUP BY s_1."schoolId"
        )
 SELECT s."schoolId",
    COALESCE(acc."activatedClassCount", 0) AS "activatedClassCount",
    (up."schoolId" IS NOT NULL) AS "hasUnconfirmedParentDetails",
    rll."launchDate" AS "readingLogLaunchDate",
    me."launchDate" AS "mathsEnglishLaunchDate",
    ms."launchDate" AS "moneySkillsLaunchDate",
    rt."launchDate" AS "readyTeddyLaunchDate",
    rlct."activePercent" AS "readingLogCurrentTermActivePercent",
    rlcc."activePercent" AS "readingLogCurrentTermCommentActivePercent",
    rlpc."activePercent" AS "readingLogPreviousTermCommentActivePercent",
    tfu."isInUse" AS "teacherFeedbackInUse",
    srt."readingTarget" AS "schoolReadingTarget",
    tct."activePercent" AS "topicsCurrentTermActivePercent",
    act."activePercent" AS "activitiesCurrentTermActivePercent",
    pp."premiumPercent" AS "pupilPremiumPercent",
    tfc."teacherFeedbackCount",
    tsc."topicsSetCount",
    COALESCE(rlt."atHomeCount", 0) AS "readingLogAtHomeCount",
    COALESCE(rlt."atSchoolCount", 0) AS "readingLogAtSchoolCount",
    COALESCE(nat."classesWithNoActiveTeacherCount", 0) AS "classesWithNoActiveTeacherCount",
    now() AS "refreshedAt"
   FROM ((((((((((((((((((live_school s
     LEFT JOIN activated_class_count acc ON ((acc."schoolId" = s."schoolId")))
     LEFT JOIN unconfirmed_parent up ON ((up."schoolId" = s."schoolId")))
     LEFT JOIN reading_log_launch rll ON ((rll."schoolId" = s."schoolId")))
     LEFT JOIN activity_launch me ON (((me."schoolId" = s."schoolId") AND ((me."programmeType")::text = 'FULL_PROGRAMME'::text))))
     LEFT JOIN activity_launch ms ON (((ms."schoolId" = s."schoolId") AND ((ms."programmeType")::text = 'MONEY_SKILLS'::text))))
     LEFT JOIN activity_launch rt ON (((rt."schoolId" = s."schoolId") AND ((rt."programmeType")::text = 'READY_TEDDY'::text))))
     LEFT JOIN reading_log_current_term rlct ON ((rlct."schoolId" = s."schoolId")))
     LEFT JOIN reading_log_current_term_comment rlcc ON ((rlcc."schoolId" = s."schoolId")))
     LEFT JOIN reading_log_previous_term_comment rlpc ON ((rlpc."schoolId" = s."schoolId")))
     LEFT JOIN teacher_feedback_in_use tfu ON ((tfu."schoolId" = s."schoolId")))
     LEFT JOIN teacher_feedback_count tfc ON ((tfc."schoolId" = s."schoolId")))
     LEFT JOIN school_reading_target srt ON ((srt."schoolId" = s."schoolId")))
     LEFT JOIN topics_current_term tct ON ((tct."schoolId" = s."schoolId")))
     LEFT JOIN activities_current_term act ON ((act."schoolId" = s."schoolId")))
     LEFT JOIN pupil_premium pp ON ((pp."schoolId" = s."schoolId")))
     LEFT JOIN topics_set_count tsc ON ((tsc."schoolId" = s."schoolId")))
     LEFT JOIN reading_log_totals rlt ON ((rlt."schoolId" = s."schoolId")))
     LEFT JOIN no_active_teacher_count nat ON ((nat."schoolId" = s."schoolId")))
  WITH NO DATA;


--
-- Name: lwp_whole_school_sequence_assignment; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lwp_whole_school_sequence_assignment (
    status character varying DEFAULT 'ASSIGNED'::character varying NOT NULL,
    id bigint NOT NULL,
    "logCreatedAt" timestamp without time zone DEFAULT ('now'::text)::timestamp(6) with time zone,
    "logUpdatedAt" timestamp without time zone DEFAULT ('now'::text)::timestamp(6) with time zone NOT NULL,
    "schoolId" bigint NOT NULL,
    "wholeSchoolSequenceId" bigint,
    "subjectId" bigint NOT NULL,
    "periodIndex" integer NOT NULL,
    "logCreatedById" bigint,
    "logUpdatedById" bigint
);


--
-- Name: lwp_whole_school_sequence_assignment_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.lwp_whole_school_sequence_assignment_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: lwp_whole_school_sequence_assignment_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.lwp_whole_school_sequence_assignment_id_seq OWNED BY public.lwp_whole_school_sequence_assignment.id;


--
-- Name: migrations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.migrations (
    id integer NOT NULL,
    "timestamp" bigint NOT NULL,
    name character varying NOT NULL
);


--
-- Name: migrations_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.migrations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: migrations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.migrations_id_seq OWNED BY public.migrations.id;


--
-- Name: static_lwp_activity; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.static_lwp_activity (
    name character varying NOT NULL,
    "starValue" integer,
    "activityType" character varying NOT NULL,
    "order" integer,
    "welcomeMessage" character varying,
    "cardImage" character varying,
    id bigint NOT NULL,
    "logCreatedAt" timestamp without time zone DEFAULT ('now'::text)::timestamp(6) with time zone,
    "logUpdatedAt" timestamp without time zone DEFAULT ('now'::text)::timestamp(6) with time zone NOT NULL,
    "topicId" bigint,
    "logCreatedById" bigint,
    "logUpdatedById" bigint,
    details jsonb,
    "isHidden" boolean DEFAULT false NOT NULL,
    resources jsonb,
    "hidePhotoUpload" boolean DEFAULT false NOT NULL,
    "deletedById" bigint,
    "rationaleModalId" bigint
);


--
-- Name: static_lwp_activity_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.static_lwp_activity_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: static_lwp_activity_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.static_lwp_activity_id_seq OWNED BY public.static_lwp_activity.id;


--
-- Name: static_lwp_activity_steps; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.static_lwp_activity_steps (
    id bigint NOT NULL,
    "order" integer,
    "stepType" character varying NOT NULL,
    text character varying,
    "imageUrl" character varying,
    "downloadName" character varying,
    "downloadUrl" character varying,
    "linkName" character varying,
    "linkUrl" character varying,
    properties jsonb,
    "activityId" bigint,
    "fontSize" integer,
    "fontType" character varying,
    "textCarouselData" character varying,
    "tableData" character varying,
    "selectedModalId" bigint,
    "modalId" bigint,
    "editorState" character varying,
    "fileName" character varying,
    "btnType" character varying,
    "timerData" character varying,
    "imageCarouselData" character varying,
    dimensions character varying,
    "clickableAlphabetData" character varying,
    "includeSeconds" boolean,
    "audioUrl" character varying,
    "tabsData" character varying,
    "editAsHtml" boolean DEFAULT false NOT NULL,
    "checklistImageData" character varying,
    "accordionData" jsonb,
    "checkListTextData" jsonb,
    "deletedById" bigint,
    "carouselData" jsonb,
    "linkOpenCount" integer DEFAULT 0 NOT NULL,
    "setByTeacherData" jsonb,
    "visibilityRules" jsonb
);


--
-- Name: static_lwp_activity_steps_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.static_lwp_activity_steps_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: static_lwp_activity_steps_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.static_lwp_activity_steps_id_seq OWNED BY public.static_lwp_activity_steps.id;


--
-- Name: static_lwp_activity_tag; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.static_lwp_activity_tag (
    id bigint NOT NULL,
    name character varying NOT NULL,
    color character varying NOT NULL,
    "logCreatedAt" timestamp without time zone DEFAULT ('now'::text)::timestamp(6) with time zone,
    "logUpdatedAt" timestamp without time zone DEFAULT ('now'::text)::timestamp(6) with time zone NOT NULL,
    "deletedById" bigint,
    "logCreatedById" bigint,
    "logUpdatedById" bigint
);


--
-- Name: static_lwp_activity_tag_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.static_lwp_activity_tag_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: static_lwp_activity_tag_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.static_lwp_activity_tag_id_seq OWNED BY public.static_lwp_activity_tag.id;


--
-- Name: static_lwp_admin_query; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.static_lwp_admin_query (
    name character varying NOT NULL,
    "sqlQuery" character varying NOT NULL,
    "order" integer NOT NULL,
    "csvFileLocation" character varying,
    "lastCsvGenerated" timestamp without time zone,
    id bigint NOT NULL,
    "logCreatedAt" timestamp without time zone DEFAULT ('now'::text)::timestamp(6) with time zone,
    "logUpdatedAt" timestamp without time zone DEFAULT ('now'::text)::timestamp(6) with time zone NOT NULL,
    "logCreatedById" bigint,
    "logUpdatedById" bigint
);


--
-- Name: static_lwp_admin_query_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.static_lwp_admin_query_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: static_lwp_admin_query_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.static_lwp_admin_query_id_seq OWNED BY public.static_lwp_admin_query.id;


--
-- Name: static_lwp_contact; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.static_lwp_contact (
    question character varying NOT NULL,
    "sentEmail" boolean DEFAULT false NOT NULL,
    id bigint NOT NULL,
    "logCreatedAt" timestamp without time zone DEFAULT CURRENT_TIMESTAMP(6),
    "logUpdatedAt" timestamp without time zone DEFAULT CURRENT_TIMESTAMP(6) NOT NULL,
    "logCreatedById" bigint,
    "logUpdatedById" bigint
);


--
-- Name: static_lwp_contact_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.static_lwp_contact_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: static_lwp_contact_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.static_lwp_contact_id_seq OWNED BY public.static_lwp_contact.id;


--
-- Name: static_lwp_data_query; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.static_lwp_data_query (
    name character varying NOT NULL,
    type character varying NOT NULL,
    category character varying,
    status character varying NOT NULL,
    description character varying,
    query character varying NOT NULL,
    "order" integer NOT NULL,
    "csvFileLocation" character varying,
    "lastCsvGenerated" timestamp without time zone,
    id bigint NOT NULL,
    "logCreatedAt" timestamp without time zone DEFAULT ('now'::text)::timestamp(6) with time zone,
    "logUpdatedAt" timestamp without time zone DEFAULT ('now'::text)::timestamp(6) with time zone NOT NULL,
    "logCreatedById" bigint,
    "logUpdatedById" bigint,
    "isAvailableForPreviousYear" boolean DEFAULT false NOT NULL
);


--
-- Name: static_lwp_data_query_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.static_lwp_data_query_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: static_lwp_data_query_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.static_lwp_data_query_id_seq OWNED BY public.static_lwp_data_query.id;


--
-- Name: static_lwp_email_template_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.static_lwp_email_template_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: static_lwp_email_template_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.static_lwp_email_template_id_seq OWNED BY public.static_lwp_email_template.id;


--
-- Name: static_lwp_faq; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.static_lwp_faq (
    question character varying NOT NULL,
    answer character varying NOT NULL,
    "forParent" boolean DEFAULT false NOT NULL,
    "forTeacher" boolean DEFAULT false NOT NULL,
    "forSchoolLeader" boolean DEFAULT false NOT NULL,
    id bigint NOT NULL,
    "logCreatedAt" timestamp without time zone DEFAULT ('now'::text)::timestamp(6) with time zone,
    "logUpdatedAt" timestamp without time zone DEFAULT ('now'::text)::timestamp(6) with time zone NOT NULL,
    "logCreatedById" bigint,
    "logUpdatedById" bigint,
    "editAsHtml" boolean DEFAULT false NOT NULL,
    "forBeforeLogin" boolean DEFAULT false NOT NULL
);


--
-- Name: static_lwp_faq_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.static_lwp_faq_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: static_lwp_faq_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.static_lwp_faq_id_seq OWNED BY public.static_lwp_faq.id;


--
-- Name: static_lwp_feature_tooltip; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.static_lwp_feature_tooltip (
    name character varying NOT NULL,
    "targetId" character varying NOT NULL,
    "order" integer NOT NULL,
    "userTypes" jsonb DEFAULT '[]'::jsonb NOT NULL,
    status character varying NOT NULL,
    message character varying NOT NULL,
    "imageUrl" character varying,
    id bigint NOT NULL,
    "logCreatedAt" timestamp without time zone DEFAULT ('now'::text)::timestamp(6) with time zone,
    "logUpdatedAt" timestamp without time zone DEFAULT ('now'::text)::timestamp(6) with time zone NOT NULL,
    "logCreatedById" bigint,
    "logUpdatedById" bigint,
    "deletedById" bigint
);


--
-- Name: static_lwp_feature_tooltip_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.static_lwp_feature_tooltip_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: static_lwp_feature_tooltip_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.static_lwp_feature_tooltip_id_seq OWNED BY public.static_lwp_feature_tooltip.id;


--
-- Name: static_lwp_features; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.static_lwp_features (
    name character varying NOT NULL,
    description character varying,
    status character varying NOT NULL,
    code character varying NOT NULL,
    id bigint NOT NULL,
    "logCreatedAt" timestamp without time zone DEFAULT ('now'::text)::timestamp(6) with time zone,
    "logUpdatedAt" timestamp without time zone DEFAULT ('now'::text)::timestamp(6) with time zone NOT NULL,
    "logCreatedById" bigint,
    "logUpdatedById" bigint,
    "includeSchoolsWithTags" boolean DEFAULT true NOT NULL
);


--
-- Name: static_lwp_features_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.static_lwp_features_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: static_lwp_features_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.static_lwp_features_id_seq OWNED BY public.static_lwp_features.id;


--
-- Name: static_lwp_files; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.static_lwp_files (
    filename character varying,
    id bigint NOT NULL,
    "logCreatedAt" timestamp without time zone DEFAULT ('now'::text)::timestamp(6) with time zone,
    "logUpdatedAt" timestamp without time zone DEFAULT ('now'::text)::timestamp(6) with time zone NOT NULL,
    "logCreatedById" bigint,
    "logUpdatedById" bigint,
    download boolean DEFAULT true NOT NULL
);


--
-- Name: static_lwp_files_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.static_lwp_files_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: static_lwp_files_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.static_lwp_files_id_seq OWNED BY public.static_lwp_files.id;


--
-- Name: static_lwp_interstitial; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.static_lwp_interstitial (
    type character varying DEFAULT 'FORM'::character varying NOT NULL,
    heading character varying NOT NULL,
    text character varying,
    "typeformId" character varying NOT NULL,
    "userOptions" jsonb DEFAULT '[]'::jsonb NOT NULL,
    id bigint NOT NULL,
    "logCreatedAt" timestamp without time zone DEFAULT ('now'::text)::timestamp(6) with time zone,
    "logUpdatedAt" timestamp without time zone DEFAULT ('now'::text)::timestamp(6) with time zone NOT NULL,
    "logCreatedById" bigint,
    "logUpdatedById" bigint,
    "lastAction" character varying DEFAULT 'CREATED'::character varying NOT NULL,
    "lastActionAt" timestamp without time zone,
    name character varying,
    "averageTime" integer DEFAULT 0 NOT NULL,
    context jsonb,
    "deletedById" bigint,
    "showQuestion" boolean DEFAULT true NOT NULL,
    "subjectId" bigint
);


--
-- Name: static_lwp_interstitial_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.static_lwp_interstitial_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: static_lwp_interstitial_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.static_lwp_interstitial_id_seq OWNED BY public.static_lwp_interstitial.id;


--
-- Name: static_lwp_interstitial_school_tags; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.static_lwp_interstitial_school_tags (
    "staticLwpInterstitialId" bigint NOT NULL,
    "staticLwpSchoolTagId" bigint NOT NULL
);


--
-- Name: static_lwp_logo; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.static_lwp_logo (
    image character varying NOT NULL,
    alt character varying NOT NULL,
    section character varying NOT NULL,
    id bigint NOT NULL,
    "logCreatedAt" timestamp without time zone DEFAULT ('now'::text)::timestamp(6) with time zone,
    "logUpdatedAt" timestamp without time zone DEFAULT ('now'::text)::timestamp(6) with time zone NOT NULL,
    "logCreatedById" bigint,
    "logUpdatedById" bigint
);


--
-- Name: static_lwp_logo_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.static_lwp_logo_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: static_lwp_logo_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.static_lwp_logo_id_seq OWNED BY public.static_lwp_logo.id;


--
-- Name: static_lwp_mathscot_item_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.static_lwp_mathscot_item_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: static_lwp_mathscot_item_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.static_lwp_mathscot_item_id_seq OWNED BY public.static_lwp_mathscot_item.id;


--
-- Name: static_lwp_modal; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.static_lwp_modal (
    name character varying NOT NULL,
    id bigint NOT NULL,
    "logCreatedAt" timestamp without time zone DEFAULT ('now'::text)::timestamp(6) with time zone,
    "logUpdatedAt" timestamp without time zone DEFAULT ('now'::text)::timestamp(6) with time zone NOT NULL,
    "logCreatedById" bigint,
    "logUpdatedById" bigint,
    "nameForContentDev" character varying,
    "openCount" integer DEFAULT 0 NOT NULL
);


--
-- Name: static_lwp_modal_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.static_lwp_modal_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: static_lwp_modal_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.static_lwp_modal_id_seq OWNED BY public.static_lwp_modal.id;


--
-- Name: static_lwp_news; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.static_lwp_news (
    title character varying NOT NULL,
    description character varying NOT NULL,
    "forTeacher" boolean DEFAULT false NOT NULL,
    "forSchoolLeader" boolean DEFAULT false NOT NULL,
    id bigint NOT NULL,
    "logCreatedAt" timestamp without time zone DEFAULT ('now'::text)::timestamp(6) with time zone,
    "logUpdatedAt" timestamp without time zone DEFAULT ('now'::text)::timestamp(6) with time zone NOT NULL,
    "logCreatedById" bigint,
    "logUpdatedById" bigint,
    "editAsHtml" boolean DEFAULT false NOT NULL
);


--
-- Name: static_lwp_news_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.static_lwp_news_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: static_lwp_news_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.static_lwp_news_id_seq OWNED BY public.static_lwp_news.id;


--
-- Name: static_lwp_page_announcement; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.static_lwp_page_announcement (
    "userOptions" jsonb NOT NULL,
    status character varying NOT NULL,
    title character varying NOT NULL,
    message character varying NOT NULL,
    "imageUrl" character varying,
    "includeImage" boolean DEFAULT false NOT NULL,
    id bigint NOT NULL,
    "logCreatedAt" timestamp without time zone DEFAULT ('now'::text)::timestamp(6) with time zone NOT NULL,
    "logUpdatedAt" timestamp without time zone DEFAULT ('now'::text)::timestamp(6) with time zone NOT NULL,
    "logCreatedById" bigint,
    "logUpdatedById" bigint,
    "imageType" character varying,
    priority integer DEFAULT 1 NOT NULL,
    "targetPages" jsonb DEFAULT '[]'::jsonb NOT NULL
);


--
-- Name: static_lwp_page_announcement_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.static_lwp_page_announcement_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: static_lwp_page_announcement_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.static_lwp_page_announcement_id_seq OWNED BY public.static_lwp_page_announcement.id;


--
-- Name: static_lwp_program; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.static_lwp_program (
    id bigint NOT NULL,
    name character varying NOT NULL,
    "logoFileName" character varying,
    "characterFileName" character varying,
    "logCreatedAt" timestamp without time zone DEFAULT ('now'::text)::timestamp(6) with time zone,
    "logUpdatedAt" timestamp without time zone DEFAULT ('now'::text)::timestamp(6) with time zone NOT NULL,
    "schoolTagId" bigint,
    "deletedById" bigint,
    "logCreatedById" bigint,
    "logUpdatedById" bigint
);


--
-- Name: static_lwp_program_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.static_lwp_program_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: static_lwp_program_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.static_lwp_program_id_seq OWNED BY public.static_lwp_program.id;


--
-- Name: static_lwp_resource; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.static_lwp_resource (
    title character varying NOT NULL,
    description character varying NOT NULL,
    file character varying NOT NULL,
    "leaderOnly" boolean DEFAULT false NOT NULL,
    id bigint NOT NULL,
    "logCreatedAt" timestamp without time zone DEFAULT ('now'::text)::timestamp(6) with time zone,
    "logUpdatedAt" timestamp without time zone DEFAULT ('now'::text)::timestamp(6) with time zone NOT NULL,
    "logCreatedById" bigint,
    "logUpdatedById" bigint,
    download boolean DEFAULT false NOT NULL
);


--
-- Name: static_lwp_resource_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.static_lwp_resource_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: static_lwp_resource_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.static_lwp_resource_id_seq OWNED BY public.static_lwp_resource.id;


--
-- Name: static_lwp_school_tag; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.static_lwp_school_tag (
    id bigint NOT NULL,
    name character varying NOT NULL,
    color character varying NOT NULL,
    "logCreatedAt" timestamp without time zone DEFAULT ('now'::text)::timestamp(6) with time zone,
    "logUpdatedAt" timestamp without time zone DEFAULT ('now'::text)::timestamp(6) with time zone NOT NULL,
    "deletedById" bigint,
    "logCreatedById" bigint,
    "logUpdatedById" bigint
);


--
-- Name: static_lwp_school_tag_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.static_lwp_school_tag_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: static_lwp_school_tag_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.static_lwp_school_tag_id_seq OWNED BY public.static_lwp_school_tag.id;


--
-- Name: static_lwp_staff; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.static_lwp_staff (
    "fullName" character varying NOT NULL,
    "jobTitle" character varying NOT NULL,
    "order" integer NOT NULL,
    "isTrustee" boolean NOT NULL,
    photo character varying,
    description character varying,
    id bigint NOT NULL,
    "logCreatedAt" timestamp without time zone DEFAULT ('now'::text)::timestamp(6) with time zone,
    "logUpdatedAt" timestamp without time zone DEFAULT ('now'::text)::timestamp(6) with time zone NOT NULL,
    "logCreatedById" bigint,
    "logUpdatedById" bigint
);


--
-- Name: static_lwp_staff_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.static_lwp_staff_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: static_lwp_staff_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.static_lwp_staff_id_seq OWNED BY public.static_lwp_staff.id;


--
-- Name: static_lwp_subject_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.static_lwp_subject_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: static_lwp_subject_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.static_lwp_subject_id_seq OWNED BY public.static_lwp_subject.id;


--
-- Name: static_lwp_topic_domain_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.static_lwp_topic_domain_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: static_lwp_topic_domain_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.static_lwp_topic_domain_id_seq OWNED BY public.static_lwp_topic_domain.id;


--
-- Name: static_lwp_topic_domain_year_group_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.static_lwp_topic_domain_year_group_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: static_lwp_topic_domain_year_group_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.static_lwp_topic_domain_year_group_id_seq OWNED BY public.static_lwp_topic_domain_year_group.id;


--
-- Name: static_lwp_topic_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.static_lwp_topic_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: static_lwp_topic_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.static_lwp_topic_id_seq OWNED BY public.static_lwp_topic.id;


--
-- Name: static_lwp_topic_sequence; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.static_lwp_topic_sequence (
    name character varying NOT NULL,
    "timingMode" character varying NOT NULL,
    "intervalDays" integer,
    id bigint NOT NULL,
    "logCreatedAt" timestamp without time zone DEFAULT ('now'::text)::timestamp(6) with time zone,
    "logUpdatedAt" timestamp without time zone DEFAULT ('now'::text)::timestamp(6) with time zone NOT NULL,
    "subjectId" bigint NOT NULL,
    "yearGroupId" bigint NOT NULL,
    "logCreatedById" bigint,
    "logUpdatedById" bigint,
    "periodIndex" integer
);


--
-- Name: static_lwp_topic_sequence_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.static_lwp_topic_sequence_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: static_lwp_topic_sequence_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.static_lwp_topic_sequence_id_seq OWNED BY public.static_lwp_topic_sequence.id;


--
-- Name: static_lwp_topic_sequence_item; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.static_lwp_topic_sequence_item (
    "order" integer NOT NULL,
    "startDate" date,
    "endDate" date,
    id bigint NOT NULL,
    "logCreatedAt" timestamp without time zone DEFAULT ('now'::text)::timestamp(6) with time zone,
    "logUpdatedAt" timestamp without time zone DEFAULT ('now'::text)::timestamp(6) with time zone NOT NULL,
    "sequenceId" bigint NOT NULL,
    "topicId" bigint NOT NULL,
    "logCreatedById" bigint,
    "logUpdatedById" bigint
);


--
-- Name: static_lwp_topic_sequence_item_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.static_lwp_topic_sequence_item_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: static_lwp_topic_sequence_item_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.static_lwp_topic_sequence_item_id_seq OWNED BY public.static_lwp_topic_sequence_item.id;


--
-- Name: static_lwp_topic_tag; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.static_lwp_topic_tag (
    id bigint NOT NULL,
    name character varying NOT NULL,
    color character varying NOT NULL,
    "logCreatedAt" timestamp without time zone DEFAULT ('now'::text)::timestamp(6) with time zone,
    "logUpdatedAt" timestamp without time zone DEFAULT ('now'::text)::timestamp(6) with time zone NOT NULL,
    "deletedById" bigint,
    "logCreatedById" bigint,
    "logUpdatedById" bigint
);


--
-- Name: static_lwp_topic_tag_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.static_lwp_topic_tag_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: static_lwp_topic_tag_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.static_lwp_topic_tag_id_seq OWNED BY public.static_lwp_topic_tag.id;


--
-- Name: static_lwp_trophy; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.static_lwp_trophy (
    logo character varying,
    "order" integer,
    title character varying,
    certificate jsonb,
    id bigint NOT NULL,
    "logCreatedAt" timestamp without time zone DEFAULT ('now'::text)::timestamp(6) with time zone,
    "logUpdatedAt" timestamp without time zone DEFAULT ('now'::text)::timestamp(6) with time zone NOT NULL,
    "logCreatedById" bigint,
    "logUpdatedById" bigint,
    "certificatePdf" character varying,
    "startDate" timestamp without time zone DEFAULT now() NOT NULL,
    "endDate" timestamp without time zone DEFAULT now() NOT NULL,
    "isActive" boolean DEFAULT false NOT NULL,
    "isPupilMail" boolean DEFAULT false NOT NULL,
    "isTeacherMail" boolean DEFAULT false NOT NULL
);


--
-- Name: static_lwp_trophy_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.static_lwp_trophy_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: static_lwp_trophy_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.static_lwp_trophy_id_seq OWNED BY public.static_lwp_trophy.id;


--
-- Name: static_lwp_video_tutorial; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.static_lwp_video_tutorial (
    title character varying,
    video character varying,
    "videoThumb" character varying,
    id bigint NOT NULL,
    "logCreatedAt" timestamp without time zone DEFAULT ('now'::text)::timestamp(6) with time zone,
    "logUpdatedAt" timestamp without time zone DEFAULT ('now'::text)::timestamp(6) with time zone NOT NULL,
    "logCreatedById" bigint,
    "logUpdatedById" bigint
);


--
-- Name: static_lwp_video_tutorial_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.static_lwp_video_tutorial_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: static_lwp_video_tutorial_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.static_lwp_video_tutorial_id_seq OWNED BY public.static_lwp_video_tutorial.id;


--
-- Name: static_lwp_whole_school_sequence; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.static_lwp_whole_school_sequence (
    status character varying DEFAULT 'DRAFT'::character varying NOT NULL,
    id bigint NOT NULL,
    "logCreatedAt" timestamp without time zone DEFAULT ('now'::text)::timestamp(6) with time zone,
    "logUpdatedAt" timestamp without time zone DEFAULT ('now'::text)::timestamp(6) with time zone NOT NULL,
    "subjectId" bigint NOT NULL,
    "periodIndex" integer NOT NULL,
    "logCreatedById" bigint,
    "logUpdatedById" bigint
);


--
-- Name: static_lwp_whole_school_sequence_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.static_lwp_whole_school_sequence_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: static_lwp_whole_school_sequence_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.static_lwp_whole_school_sequence_id_seq OWNED BY public.static_lwp_whole_school_sequence.id;


--
-- Name: static_lwp_whole_school_sequence_member; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.static_lwp_whole_school_sequence_member (
    id bigint NOT NULL,
    "logCreatedAt" timestamp without time zone DEFAULT ('now'::text)::timestamp(6) with time zone,
    "logUpdatedAt" timestamp without time zone DEFAULT ('now'::text)::timestamp(6) with time zone NOT NULL,
    "wholeSchoolSequenceId" bigint NOT NULL,
    "sequenceId" bigint NOT NULL,
    "yearGroupId" bigint NOT NULL,
    "logCreatedById" bigint,
    "logUpdatedById" bigint
);


--
-- Name: static_lwp_whole_school_sequence_member_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.static_lwp_whole_school_sequence_member_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: static_lwp_whole_school_sequence_member_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.static_lwp_whole_school_sequence_member_id_seq OWNED BY public.static_lwp_whole_school_sequence_member.id;


--
-- Name: typeorm_metadata; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.typeorm_metadata (
    type character varying NOT NULL,
    database character varying,
    schema character varying,
    "table" character varying,
    name character varying,
    value text
);


--
-- Name: wonde_contact_student; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.wonde_contact_student (
    "wondeContactId" character varying NOT NULL,
    "wondeStudentId" character varying NOT NULL
);


--
-- Name: wonde_parent_pupil; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.wonde_parent_pupil (
    "wondeUserId" character varying NOT NULL,
    "wondePupilId" character varying NOT NULL
);


--
-- Name: wonde_pupil; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.wonde_pupil (
    id character varying NOT NULL,
    mis_id character varying,
    forename character varying NOT NULL,
    surname character varying,
    initials character varying,
    "FSM" character varying,
    "UPN" character varying,
    legal_surname character varying,
    legal_forename character varying,
    gender character varying,
    "isPremium" boolean,
    "lwpPupilId" bigint
);


--
-- Name: wonde_school_class_user; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.wonde_school_class_user (
    "wondeSchoolClassId" character varying NOT NULL,
    "wondePupilId" character varying NOT NULL
);


--
-- Name: wonde_user; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.wonde_user (
    id character varying NOT NULL,
    email character varying,
    "phoneNumber" character varying,
    forename character varying NOT NULL,
    surname character varying,
    initials character varying,
    legal_surname character varying,
    legal_forename character varying,
    gender character varying,
    type character varying NOT NULL,
    "lwpUserId" bigint
);


--
-- Name: deleted_item_default; Type: TABLE ATTACH; Schema: public; Owner: -
--

ALTER TABLE ONLY public.deleted_item ATTACH PARTITION public.deleted_item_default DEFAULT;


--
-- Name: deleted_item_p202608; Type: TABLE ATTACH; Schema: public; Owner: -
--

ALTER TABLE ONLY public.deleted_item ATTACH PARTITION public.deleted_item_p202608 FOR VALUES FROM ('2026-08-01 00:00:00') TO ('2026-09-01 00:00:00');


--
-- Name: deleted_item_p202609; Type: TABLE ATTACH; Schema: public; Owner: -
--

ALTER TABLE ONLY public.deleted_item ATTACH PARTITION public.deleted_item_p202609 FOR VALUES FROM ('2026-09-01 00:00:00') TO ('2026-10-01 00:00:00');


--
-- Name: deleted_item_p202610; Type: TABLE ATTACH; Schema: public; Owner: -
--

ALTER TABLE ONLY public.deleted_item ATTACH PARTITION public.deleted_item_p202610 FOR VALUES FROM ('2026-10-01 00:00:00') TO ('2026-11-01 00:00:00');


--
-- Name: deleted_item_p202611; Type: TABLE ATTACH; Schema: public; Owner: -
--

ALTER TABLE ONLY public.deleted_item ATTACH PARTITION public.deleted_item_p202611 FOR VALUES FROM ('2026-11-01 00:00:00') TO ('2026-12-01 00:00:00');


--
-- Name: deleted_item_p202612; Type: TABLE ATTACH; Schema: public; Owner: -
--

ALTER TABLE ONLY public.deleted_item ATTACH PARTITION public.deleted_item_p202612 FOR VALUES FROM ('2026-12-01 00:00:00') TO ('2027-01-01 00:00:00');


--
-- Name: analytics_content_fact id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.analytics_content_fact ALTER COLUMN id SET DEFAULT nextval('public.analytics_content_fact_id_seq'::regclass);


--
-- Name: analytics_pupil_dim segmentId; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.analytics_pupil_dim ALTER COLUMN "segmentId" SET DEFAULT nextval('public."analytics_pupil_dim_segmentId_seq"'::regclass);


--
-- Name: analytics_pupil_fact id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.analytics_pupil_fact ALTER COLUMN id SET DEFAULT nextval('public.analytics_pupil_fact_id_seq'::regclass);


--
-- Name: analytics_school_groups_dim groupId; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.analytics_school_groups_dim ALTER COLUMN "groupId" SET DEFAULT nextval('public."analytics_school_groups_dim_groupId_seq"'::regclass);


--
-- Name: analytics_schools_in_groups_dim id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.analytics_schools_in_groups_dim ALTER COLUMN id SET DEFAULT nextval('public.analytics_schools_in_groups_dim_id_seq'::regclass);


--
-- Name: deleted_item id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.deleted_item ALTER COLUMN id SET DEFAULT nextval('public.deleted_item_id_seq'::regclass);


--
-- Name: imported_school_data_proposed_change id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.imported_school_data_proposed_change ALTER COLUMN id SET DEFAULT nextval('public.imported_school_data_proposed_change_id_seq'::regclass);


--
-- Name: imported_school_data_proposed_link id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.imported_school_data_proposed_link ALTER COLUMN id SET DEFAULT nextval('public.imported_school_data_proposed_link_id_seq'::regclass);


--
-- Name: imported_student_contact id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.imported_student_contact ALTER COLUMN id SET DEFAULT nextval('public.imported_student_contact_id_seq'::regclass);


--
-- Name: log_lwp_access id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.log_lwp_access ALTER COLUMN id SET DEFAULT nextval('public.log_lwp_access_id_seq'::regclass);


--
-- Name: log_lwp_contact id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.log_lwp_contact ALTER COLUMN id SET DEFAULT nextval('public.log_lwp_contact_id_seq'::regclass);


--
-- Name: log_lwp_email_sms id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.log_lwp_email_sms ALTER COLUMN id SET DEFAULT nextval('public.log_lwp_email_sms_id_seq'::regclass);


--
-- Name: log_lwp_entity_status_change id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.log_lwp_entity_status_change ALTER COLUMN id SET DEFAULT nextval('public.log_lwp_entity_status_change_id_seq'::regclass);


--
-- Name: log_lwp_login id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.log_lwp_login ALTER COLUMN id SET DEFAULT nextval('public.log_lwp_login_id_seq'::regclass);


--
-- Name: log_lwp_parent_sticker_notification id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.log_lwp_parent_sticker_notification ALTER COLUMN id SET DEFAULT nextval('public.log_lwp_parent_sticker_notification_id_seq'::regclass);


--
-- Name: log_lwp_pupil_class_change id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.log_lwp_pupil_class_change ALTER COLUMN id SET DEFAULT nextval('public.log_lwp_pupil_class_change_id_seq'::regclass);


--
-- Name: log_parent_activity id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.log_parent_activity ALTER COLUMN id SET DEFAULT nextval('public.log_parent_activity_id_seq'::regclass);


--
-- Name: log_parent_pupil_action id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.log_parent_pupil_action ALTER COLUMN id SET DEFAULT nextval('public.log_parent_pupil_action_id_seq'::regclass);


--
-- Name: log_parent_topic id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.log_parent_topic ALTER COLUMN id SET DEFAULT nextval('public.log_parent_topic_id_seq'::regclass);


--
-- Name: log_pupil_merge_operation id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.log_pupil_merge_operation ALTER COLUMN id SET DEFAULT nextval('public.log_pupil_merge_operation_id_seq'::regclass);


--
-- Name: log_school_class_license id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.log_school_class_license ALTER COLUMN id SET DEFAULT nextval('public.log_school_class_license_id_seq'::regclass);


--
-- Name: log_static_lwp_email_template_history id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.log_static_lwp_email_template_history ALTER COLUMN id SET DEFAULT nextval('public.log_static_lwp_email_template_history_id_seq'::regclass);


--
-- Name: lwp_admin_sticker_school_status id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lwp_admin_sticker_school_status ALTER COLUMN id SET DEFAULT nextval('public.lwp_admin_sticker_school_status_id_seq'::regclass);


--
-- Name: lwp_blog_post id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lwp_blog_post ALTER COLUMN id SET DEFAULT nextval('public.lwp_blog_post_id_seq'::regclass);


--
-- Name: lwp_class_sequence_assignment id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lwp_class_sequence_assignment ALTER COLUMN id SET DEFAULT nextval('public.lwp_class_sequence_assignment_id_seq'::regclass);


--
-- Name: lwp_class_topic id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lwp_class_topic ALTER COLUMN id SET DEFAULT nextval('public.lwp_class_topic_id_seq'::regclass);


--
-- Name: lwp_demo_activity_feedback id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lwp_demo_activity_feedback ALTER COLUMN id SET DEFAULT nextval('public.lwp_demo_activity_feedback_id_seq'::regclass);


--
-- Name: lwp_feedback_reply id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lwp_feedback_reply ALTER COLUMN id SET DEFAULT nextval('public.lwp_feedback_reply_id_seq'::regclass);


--
-- Name: lwp_notification_event_history id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lwp_notification_event_history ALTER COLUMN id SET DEFAULT nextval('public.lwp_notification_event_history_id_seq'::regclass);


--
-- Name: lwp_pupil id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lwp_pupil ALTER COLUMN id SET DEFAULT nextval('public.lwp_pupil_id_seq'::regclass);


--
-- Name: lwp_pupil_activity id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lwp_pupil_activity ALTER COLUMN id SET DEFAULT nextval('public.lwp_pupil_activity_id_seq'::regclass);


--
-- Name: lwp_pupil_activity_feedback id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lwp_pupil_activity_feedback ALTER COLUMN id SET DEFAULT nextval('public.lwp_pupil_activity_feedback_id_seq'::regclass);


--
-- Name: lwp_pupil_feedback id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lwp_pupil_feedback ALTER COLUMN id SET DEFAULT nextval('public.lwp_pupil_feedback_id_seq'::regclass);


--
-- Name: lwp_pupil_feedback_edit_log id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lwp_pupil_feedback_edit_log ALTER COLUMN id SET DEFAULT nextval('public.lwp_pupil_feedback_edit_log_id_seq'::regclass);


--
-- Name: lwp_pupil_feedback_media id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lwp_pupil_feedback_media ALTER COLUMN id SET DEFAULT nextval('public.lwp_pupil_feedback_media_id_seq'::regclass);


--
-- Name: lwp_pupil_mathscot id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lwp_pupil_mathscot ALTER COLUMN id SET DEFAULT nextval('public.lwp_pupil_mathscot_id_seq'::regclass);


--
-- Name: lwp_pupil_parent id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lwp_pupil_parent ALTER COLUMN id SET DEFAULT nextval('public.lwp_pupil_parent_id_seq'::regclass);


--
-- Name: lwp_pupil_tag id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lwp_pupil_tag ALTER COLUMN id SET DEFAULT nextval('public.lwp_pupil_tag_id_seq'::regclass);


--
-- Name: lwp_pupil_topic id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lwp_pupil_topic ALTER COLUMN id SET DEFAULT nextval('public.lwp_pupil_topic_id_seq'::regclass);


--
-- Name: lwp_pupil_trophy id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lwp_pupil_trophy ALTER COLUMN id SET DEFAULT nextval('public.lwp_pupil_trophy_id_seq'::regclass);


--
-- Name: lwp_reading_log id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lwp_reading_log ALTER COLUMN id SET DEFAULT nextval('public.lwp_reading_log_id_seq'::regclass);


--
-- Name: lwp_school id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lwp_school ALTER COLUMN id SET DEFAULT nextval('public.lwp_school_id_seq'::regclass);


--
-- Name: lwp_school_class id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lwp_school_class ALTER COLUMN id SET DEFAULT nextval('public.lwp_school_class_id_seq'::regclass);


--
-- Name: lwp_school_dates id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lwp_school_dates ALTER COLUMN id SET DEFAULT nextval('public.lwp_school_dates_id_seq'::regclass);


--
-- Name: lwp_school_holiday id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lwp_school_holiday ALTER COLUMN id SET DEFAULT nextval('public.lwp_school_holiday_id_seq'::regclass);


--
-- Name: lwp_school_impact_report id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lwp_school_impact_report ALTER COLUMN id SET DEFAULT nextval('public.lwp_school_impact_report_id_seq'::regclass);


--
-- Name: lwp_school_impact_report_feedback id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lwp_school_impact_report_feedback ALTER COLUMN id SET DEFAULT nextval('public.lwp_school_impact_report_feedback_id_seq'::regclass);


--
-- Name: lwp_school_impact_report_graphs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lwp_school_impact_report_graphs ALTER COLUMN id SET DEFAULT nextval('public.lwp_school_impact_report_graphs_id_seq'::regclass);


--
-- Name: lwp_school_static_tags id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lwp_school_static_tags ALTER COLUMN id SET DEFAULT nextval('public.lwp_school_static_tags_id_seq'::regclass);


--
-- Name: lwp_set_by_teacher_step_media id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lwp_set_by_teacher_step_media ALTER COLUMN id SET DEFAULT nextval('public.lwp_set_by_teacher_step_media_id_seq'::regclass);


--
-- Name: lwp_sticker id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lwp_sticker ALTER COLUMN id SET DEFAULT nextval('public.lwp_sticker_id_seq'::regclass);


--
-- Name: lwp_sticker_character_item id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lwp_sticker_character_item ALTER COLUMN id SET DEFAULT nextval('public.lwp_sticker_character_item_id_seq'::regclass);


--
-- Name: lwp_token id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lwp_token ALTER COLUMN id SET DEFAULT nextval('public.lwp_token_id_seq'::regclass);


--
-- Name: lwp_user id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lwp_user ALTER COLUMN id SET DEFAULT nextval('public.lwp_user_id_seq'::regclass);


--
-- Name: lwp_user_associated_login id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lwp_user_associated_login ALTER COLUMN id SET DEFAULT nextval('public.lwp_user_associated_login_id_seq'::regclass);


--
-- Name: lwp_user_interstitial id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lwp_user_interstitial ALTER COLUMN id SET DEFAULT nextval('public.lwp_user_interstitial_id_seq'::regclass);


--
-- Name: lwp_user_page_announcement id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lwp_user_page_announcement ALTER COLUMN id SET DEFAULT nextval('public.lwp_user_page_announcement_id_seq'::regclass);


--
-- Name: lwp_user_session id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lwp_user_session ALTER COLUMN id SET DEFAULT nextval('public.lwp_user_session_id_seq'::regclass);


--
-- Name: lwp_user_tooltip_history id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lwp_user_tooltip_history ALTER COLUMN id SET DEFAULT nextval('public.lwp_user_tooltip_history_id_seq'::regclass);


--
-- Name: lwp_whole_school_sequence_assignment id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lwp_whole_school_sequence_assignment ALTER COLUMN id SET DEFAULT nextval('public.lwp_whole_school_sequence_assignment_id_seq'::regclass);


--
-- Name: migrations id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.migrations ALTER COLUMN id SET DEFAULT nextval('public.migrations_id_seq'::regclass);


--
-- Name: static_lwp_activity id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.static_lwp_activity ALTER COLUMN id SET DEFAULT nextval('public.static_lwp_activity_id_seq'::regclass);


--
-- Name: static_lwp_activity_steps id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.static_lwp_activity_steps ALTER COLUMN id SET DEFAULT nextval('public.static_lwp_activity_steps_id_seq'::regclass);


--
-- Name: static_lwp_activity_tag id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.static_lwp_activity_tag ALTER COLUMN id SET DEFAULT nextval('public.static_lwp_activity_tag_id_seq'::regclass);


--
-- Name: static_lwp_admin_query id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.static_lwp_admin_query ALTER COLUMN id SET DEFAULT nextval('public.static_lwp_admin_query_id_seq'::regclass);


--
-- Name: static_lwp_contact id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.static_lwp_contact ALTER COLUMN id SET DEFAULT nextval('public.static_lwp_contact_id_seq'::regclass);


--
-- Name: static_lwp_data_query id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.static_lwp_data_query ALTER COLUMN id SET DEFAULT nextval('public.static_lwp_data_query_id_seq'::regclass);


--
-- Name: static_lwp_email_template id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.static_lwp_email_template ALTER COLUMN id SET DEFAULT nextval('public.static_lwp_email_template_id_seq'::regclass);


--
-- Name: static_lwp_faq id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.static_lwp_faq ALTER COLUMN id SET DEFAULT nextval('public.static_lwp_faq_id_seq'::regclass);


--
-- Name: static_lwp_feature_tooltip id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.static_lwp_feature_tooltip ALTER COLUMN id SET DEFAULT nextval('public.static_lwp_feature_tooltip_id_seq'::regclass);


--
-- Name: static_lwp_features id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.static_lwp_features ALTER COLUMN id SET DEFAULT nextval('public.static_lwp_features_id_seq'::regclass);


--
-- Name: static_lwp_files id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.static_lwp_files ALTER COLUMN id SET DEFAULT nextval('public.static_lwp_files_id_seq'::regclass);


--
-- Name: static_lwp_interstitial id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.static_lwp_interstitial ALTER COLUMN id SET DEFAULT nextval('public.static_lwp_interstitial_id_seq'::regclass);


--
-- Name: static_lwp_logo id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.static_lwp_logo ALTER COLUMN id SET DEFAULT nextval('public.static_lwp_logo_id_seq'::regclass);


--
-- Name: static_lwp_mathscot_item id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.static_lwp_mathscot_item ALTER COLUMN id SET DEFAULT nextval('public.static_lwp_mathscot_item_id_seq'::regclass);


--
-- Name: static_lwp_modal id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.static_lwp_modal ALTER COLUMN id SET DEFAULT nextval('public.static_lwp_modal_id_seq'::regclass);


--
-- Name: static_lwp_news id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.static_lwp_news ALTER COLUMN id SET DEFAULT nextval('public.static_lwp_news_id_seq'::regclass);


--
-- Name: static_lwp_page_announcement id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.static_lwp_page_announcement ALTER COLUMN id SET DEFAULT nextval('public.static_lwp_page_announcement_id_seq'::regclass);


--
-- Name: static_lwp_program id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.static_lwp_program ALTER COLUMN id SET DEFAULT nextval('public.static_lwp_program_id_seq'::regclass);


--
-- Name: static_lwp_resource id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.static_lwp_resource ALTER COLUMN id SET DEFAULT nextval('public.static_lwp_resource_id_seq'::regclass);


--
-- Name: static_lwp_school_tag id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.static_lwp_school_tag ALTER COLUMN id SET DEFAULT nextval('public.static_lwp_school_tag_id_seq'::regclass);


--
-- Name: static_lwp_staff id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.static_lwp_staff ALTER COLUMN id SET DEFAULT nextval('public.static_lwp_staff_id_seq'::regclass);


--
-- Name: static_lwp_subject id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.static_lwp_subject ALTER COLUMN id SET DEFAULT nextval('public.static_lwp_subject_id_seq'::regclass);


--
-- Name: static_lwp_topic id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.static_lwp_topic ALTER COLUMN id SET DEFAULT nextval('public.static_lwp_topic_id_seq'::regclass);


--
-- Name: static_lwp_topic_domain id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.static_lwp_topic_domain ALTER COLUMN id SET DEFAULT nextval('public.static_lwp_topic_domain_id_seq'::regclass);


--
-- Name: static_lwp_topic_domain_year_group id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.static_lwp_topic_domain_year_group ALTER COLUMN id SET DEFAULT nextval('public.static_lwp_topic_domain_year_group_id_seq'::regclass);


--
-- Name: static_lwp_topic_sequence id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.static_lwp_topic_sequence ALTER COLUMN id SET DEFAULT nextval('public.static_lwp_topic_sequence_id_seq'::regclass);


--
-- Name: static_lwp_topic_sequence_item id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.static_lwp_topic_sequence_item ALTER COLUMN id SET DEFAULT nextval('public.static_lwp_topic_sequence_item_id_seq'::regclass);


--
-- Name: static_lwp_topic_tag id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.static_lwp_topic_tag ALTER COLUMN id SET DEFAULT nextval('public.static_lwp_topic_tag_id_seq'::regclass);


--
-- Name: static_lwp_trophy id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.static_lwp_trophy ALTER COLUMN id SET DEFAULT nextval('public.static_lwp_trophy_id_seq'::regclass);


--
-- Name: static_lwp_video_tutorial id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.static_lwp_video_tutorial ALTER COLUMN id SET DEFAULT nextval('public.static_lwp_video_tutorial_id_seq'::regclass);


--
-- Name: static_lwp_whole_school_sequence id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.static_lwp_whole_school_sequence ALTER COLUMN id SET DEFAULT nextval('public.static_lwp_whole_school_sequence_id_seq'::regclass);


--
-- Name: static_lwp_whole_school_sequence_member id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.static_lwp_whole_school_sequence_member ALTER COLUMN id SET DEFAULT nextval('public.static_lwp_whole_school_sequence_member_id_seq'::regclass);


--
-- Name: deleted_item_partition_template deleted_item_partition_template_pkey; Type: CONSTRAINT; Schema: partman_templates; Owner: -
--

ALTER TABLE ONLY partman_templates.deleted_item_partition_template
    ADD CONSTRAINT deleted_item_partition_template_pkey PRIMARY KEY (id);


--
-- Name: lwp_pupil_feedback_history PK_02ffa06fafa919c78285481a6ba; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lwp_pupil_feedback_history
    ADD CONSTRAINT "PK_02ffa06fafa919c78285481a6ba" PRIMARY KEY ("lwpPupilId", "lwpPupilFeedbackId");


--
-- Name: lwp_school_impact_report_graphs PK_03e32ae6e68a453c374d73610df; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lwp_school_impact_report_graphs
    ADD CONSTRAINT "PK_03e32ae6e68a453c374d73610df" PRIMARY KEY (id);


--
-- Name: lwp_notification PK_05f00c35dc60d7a6b77d93b9d01; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lwp_notification
    ADD CONSTRAINT "PK_05f00c35dc60d7a6b77d93b9d01" PRIMARY KEY (id);


--
-- Name: log_lwp_login PK_06f0e8b20e173de1dacaf9650d9; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.log_lwp_login
    ADD CONSTRAINT "PK_06f0e8b20e173de1dacaf9650d9" PRIMARY KEY (id);


--
-- Name: lwp_pupil PK_08068a53f7aba109052e9c473d0; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lwp_pupil
    ADD CONSTRAINT "PK_08068a53f7aba109052e9c473d0" PRIMARY KEY (id);


--
-- Name: wonde_contact_student PK_0908639654d4acb18ce6db8d5fc; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wonde_contact_student
    ADD CONSTRAINT "PK_0908639654d4acb18ce6db8d5fc" PRIMARY KEY ("wondeContactId", "wondeStudentId");


--
-- Name: static_lwp_activity_tag PK_0a9a219cf8dbd8a37e280bb9dd2; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.static_lwp_activity_tag
    ADD CONSTRAINT "PK_0a9a219cf8dbd8a37e280bb9dd2" PRIMARY KEY (id);


--
-- Name: static_lwp_contact PK_0bc5707b2361dfd9be68cdcc16e; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.static_lwp_contact
    ADD CONSTRAINT "PK_0bc5707b2361dfd9be68cdcc16e" PRIMARY KEY (id);


--
-- Name: static_lwp_news PK_0bc594558e81ee8d4c2366af76e; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.static_lwp_news
    ADD CONSTRAINT "PK_0bc594558e81ee8d4c2366af76e" PRIMARY KEY (id);


--
-- Name: static_lwp_topic_sequence_item PK_0e95c37ecd7377e4ec1ea4fa23d; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.static_lwp_topic_sequence_item
    ADD CONSTRAINT "PK_0e95c37ecd7377e4ec1ea4fa23d" PRIMARY KEY (id);


--
-- Name: lwp_class_pupil PK_12a579c3aadc6108d9b0181488c; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lwp_class_pupil
    ADD CONSTRAINT "PK_12a579c3aadc6108d9b0181488c" PRIMARY KEY ("lwpPupilId", "lwpSchoolClassId");


--
-- Name: log_lwp_pupil_class_change PK_145c731c95420f433832d7550f3; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.log_lwp_pupil_class_change
    ADD CONSTRAINT "PK_145c731c95420f433832d7550f3" PRIMARY KEY (id);


--
-- Name: static_lwp_parameter PK_17dc37a2555d9180d6891f5cdf0; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.static_lwp_parameter
    ADD CONSTRAINT "PK_17dc37a2555d9180d6891f5cdf0" PRIMARY KEY (key);


--
-- Name: static_lwp_trophy PK_1862e001e1f16699fef1ebaaab2; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.static_lwp_trophy
    ADD CONSTRAINT "PK_1862e001e1f16699fef1ebaaab2" PRIMARY KEY (id);


--
-- Name: lwp_pupil_tag_pupil PK_18d2a64bfdcc34d62b7d6899c03; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lwp_pupil_tag_pupil
    ADD CONSTRAINT "PK_18d2a64bfdcc34d62b7d6899c03" PRIMARY KEY ("lwpPupilTagId", "lwpPupilId");


--
-- Name: lwp_parent_pupil_imported PK_1cfc86552a5c1029695a13977fb; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lwp_parent_pupil_imported
    ADD CONSTRAINT "PK_1cfc86552a5c1029695a13977fb" PRIMARY KEY ("lwpPupilId", "lwpUserId");


--
-- Name: wonde_user PK_1e73c0a3da2bb91f4ba9820ab7e; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wonde_user
    ADD CONSTRAINT "PK_1e73c0a3da2bb91f4ba9820ab7e" PRIMARY KEY (id);


--
-- Name: imported_school_class_student PK_1ee858873872508c676dd1bfc93; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.imported_school_class_student
    ADD CONSTRAINT "PK_1ee858873872508c676dd1bfc93" PRIMARY KEY ("importedSchoolClassId", "importedStudentId");


--
-- Name: lwp_sticker PK_225717c3eb45bda327f3ccc4397; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lwp_sticker
    ADD CONSTRAINT "PK_225717c3eb45bda327f3ccc4397" PRIMARY KEY (id);


--
-- Name: imported_contact PK_2270cbcf68db500cb6e0a3cf412; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.imported_contact
    ADD CONSTRAINT "PK_2270cbcf68db500cb6e0a3cf412" PRIMARY KEY (id);


--
-- Name: lwp_blog_post PK_235624828340ea2a83ba21fa36c; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lwp_blog_post
    ADD CONSTRAINT "PK_235624828340ea2a83ba21fa36c" PRIMARY KEY (id);


--
-- Name: lwp_pupil_parent PK_27b58f9b25e29d6473ce6206887; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lwp_pupil_parent
    ADD CONSTRAINT "PK_27b58f9b25e29d6473ce6206887" PRIMARY KEY (id);


--
-- Name: log_parent_pupil_action PK_2b8ff03d4d91ab8d6c123651401; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.log_parent_pupil_action
    ADD CONSTRAINT "PK_2b8ff03d4d91ab8d6c123651401" PRIMARY KEY (id);


--
-- Name: lwp_topic_tags PK_2c13c7cd7af1321ff654235cf27; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lwp_topic_tags
    ADD CONSTRAINT "PK_2c13c7cd7af1321ff654235cf27" PRIMARY KEY ("staticLwpTopicId", "staticLwpTopicTagId");


--
-- Name: log_parent_topic PK_2d27785c6ecc2c7be6a86934363; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.log_parent_topic
    ADD CONSTRAINT "PK_2d27785c6ecc2c7be6a86934363" PRIMARY KEY (id);


--
-- Name: lwp_trophy_subjects PK_2e6e01bd49be31dd93f758d8358; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lwp_trophy_subjects
    ADD CONSTRAINT "PK_2e6e01bd49be31dd93f758d8358" PRIMARY KEY ("staticLwpTrophyId", "staticLwpSubjectId");


--
-- Name: lwp_whole_school_sequence_assignment PK_2f51ec45e885929c65c0d37cbf2; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lwp_whole_school_sequence_assignment
    ADD CONSTRAINT "PK_2f51ec45e885929c65c0d37cbf2" PRIMARY KEY (id);


--
-- Name: lwp_parent_pupil_invited PK_310fab40d20c8d0b21897282688; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lwp_parent_pupil_invited
    ADD CONSTRAINT "PK_310fab40d20c8d0b21897282688" PRIMARY KEY ("lwpPupilId", "lwpUserId");


--
-- Name: static_lwp_video_tutorial PK_34d1e0dca1083f4fb317f7a6271; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.static_lwp_video_tutorial
    ADD CONSTRAINT "PK_34d1e0dca1083f4fb317f7a6271" PRIMARY KEY (id);


--
-- Name: lwp_pupil_trophy PK_361504eda799444d1e18a5b0d95; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lwp_pupil_trophy
    ADD CONSTRAINT "PK_361504eda799444d1e18a5b0d95" PRIMARY KEY (id);


--
-- Name: lwp_pupil_feedback_media PK_3b67cd3f7d5424d46c9c1f6e20e; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lwp_pupil_feedback_media
    ADD CONSTRAINT "PK_3b67cd3f7d5424d46c9c1f6e20e" PRIMARY KEY (id);


--
-- Name: lwp_school_holidays PK_4415fa4b8f02c714880e2c10865; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lwp_school_holidays
    ADD CONSTRAINT "PK_4415fa4b8f02c714880e2c10865" PRIMARY KEY ("lwpSchoolHolidayId", "lwpSchoolId");


--
-- Name: static_lwp_topic_domain_year_group PK_4552b5d85ddd3f57a74b5bef086; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.static_lwp_topic_domain_year_group
    ADD CONSTRAINT "PK_4552b5d85ddd3f57a74b5bef086" PRIMARY KEY (id);


--
-- Name: lwp_pupil_activity PK_48352b555d5f6ecd6864e01317e; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lwp_pupil_activity
    ADD CONSTRAINT "PK_48352b555d5f6ecd6864e01317e" PRIMARY KEY (id);


--
-- Name: lwp_school_holiday PK_4e5b323f5c7d1be8bd60ff2724f; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lwp_school_holiday
    ADD CONSTRAINT "PK_4e5b323f5c7d1be8bd60ff2724f" PRIMARY KEY (id);


--
-- Name: lwp_token PK_505d8fae19f33650a5010c0301f; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lwp_token
    ADD CONSTRAINT "PK_505d8fae19f33650a5010c0301f" PRIMARY KEY (id);


--
-- Name: static_lwp_feature_tooltip PK_5486288cce1a5a28b3a451bc4e6; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.static_lwp_feature_tooltip
    ADD CONSTRAINT "PK_5486288cce1a5a28b3a451bc4e6" PRIMARY KEY (id);


--
-- Name: lwp_school_impact_report_feedback PK_56c8372abb20688a65ed7cc49fd; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lwp_school_impact_report_feedback
    ADD CONSTRAINT "PK_56c8372abb20688a65ed7cc49fd" PRIMARY KEY (id);


--
-- Name: static_lwp_whole_school_sequence_member PK_57ee71fcf4a9ad25d1c4ca2346e; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.static_lwp_whole_school_sequence_member
    ADD CONSTRAINT "PK_57ee71fcf4a9ad25d1c4ca2346e" PRIMARY KEY (id);


--
-- Name: lwp_pupil_topic_sbt_step_media PK_58f087798fcb240365c6bda9998; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lwp_pupil_topic_sbt_step_media
    ADD CONSTRAINT "PK_58f087798fcb240365c6bda9998" PRIMARY KEY ("lwpSetByTeacherStepMediaId", "lwpPupilTopicId");


--
-- Name: lwp_sticker_character_item PK_5ef3a4ce7da548102255a142396; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lwp_sticker_character_item
    ADD CONSTRAINT "PK_5ef3a4ce7da548102255a142396" PRIMARY KEY (id);


--
-- Name: static_lwp_topic_domain PK_60286b794294ba15bf5dd2000f7; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.static_lwp_topic_domain
    ADD CONSTRAINT "PK_60286b794294ba15bf5dd2000f7" PRIMARY KEY (id);


--
-- Name: wonde_pupil PK_62ee4ffd665f6c20e5d2916821b; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wonde_pupil
    ADD CONSTRAINT "PK_62ee4ffd665f6c20e5d2916821b" PRIMARY KEY (id);


--
-- Name: lwp_set_by_teacher_step_media PK_68a239d749b16158c48d68e02a9; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lwp_set_by_teacher_step_media
    ADD CONSTRAINT "PK_68a239d749b16158c48d68e02a9" PRIMARY KEY (id);


--
-- Name: lwp_class_subjects PK_6c80eaf1fc6d7488a7ffde1e643; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lwp_class_subjects
    ADD CONSTRAINT "PK_6c80eaf1fc6d7488a7ffde1e643" PRIMARY KEY ("staticLwpSubjectId", "lwpSchoolClassId");


--
-- Name: lwp_user PK_6e1eb69a2d7ccef082c59bbdd80; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lwp_user
    ADD CONSTRAINT "PK_6e1eb69a2d7ccef082c59bbdd80" PRIMARY KEY (id);


--
-- Name: log_lwp_parent_sticker_notification PK_71b7d7359becf715949971f45cc; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.log_lwp_parent_sticker_notification
    ADD CONSTRAINT "PK_71b7d7359becf715949971f45cc" PRIMARY KEY (id);


--
-- Name: log_school_class_license PK_75c25473482ba48ac0c02206e48; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.log_school_class_license
    ADD CONSTRAINT "PK_75c25473482ba48ac0c02206e48" PRIMARY KEY (id);


--
-- Name: lwp_page_announcement_school_tags PK_761cdcf9b607a1b110145248514; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lwp_page_announcement_school_tags
    ADD CONSTRAINT "PK_761cdcf9b607a1b110145248514" PRIMARY KEY ("staticLwpPageAnnouncementId", "staticLwpSchoolTagId");


--
-- Name: lwp_class_sequence_assignment PK_7b5cac90d63a61381a20e398a1c; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lwp_class_sequence_assignment
    ADD CONSTRAINT "PK_7b5cac90d63a61381a20e398a1c" PRIMARY KEY (id);


--
-- Name: lwp_admin_sticker_school_status PK_81b11d857f275d6676ea181d859; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lwp_admin_sticker_school_status
    ADD CONSTRAINT "PK_81b11d857f275d6676ea181d859" PRIMARY KEY (id);


--
-- Name: imported_school PK_81b578df737c4fd8da9009f7588; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.imported_school
    ADD CONSTRAINT "PK_81b578df737c4fd8da9009f7588" PRIMARY KEY (id);


--
-- Name: log_lwp_email_sms PK_83ef14807022f9e35c848ada947; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.log_lwp_email_sms
    ADD CONSTRAINT "PK_83ef14807022f9e35c848ada947" PRIMARY KEY (id);


--
-- Name: static_lwp_activity PK_86e57b14754143f8efaec80732c; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.static_lwp_activity
    ADD CONSTRAINT "PK_86e57b14754143f8efaec80732c" PRIMARY KEY (id);


--
-- Name: lwp_user_session PK_872e28a3d312aac3b20f8ee1d24; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lwp_user_session
    ADD CONSTRAINT "PK_872e28a3d312aac3b20f8ee1d24" PRIMARY KEY (id);


--
-- Name: static_lwp_whole_school_sequence PK_88ba20e0276e151825683c201c7; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.static_lwp_whole_school_sequence
    ADD CONSTRAINT "PK_88ba20e0276e151825683c201c7" PRIMARY KEY (id);


--
-- Name: lwp_demo_activity_feedback PK_8ab93744c314954cab26b3197f2; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lwp_demo_activity_feedback
    ADD CONSTRAINT "PK_8ab93744c314954cab26b3197f2" PRIMARY KEY (id);


--
-- Name: migrations PK_8c82d7f526340ab734260ea46be; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.migrations
    ADD CONSTRAINT "PK_8c82d7f526340ab734260ea46be" PRIMARY KEY (id);


--
-- Name: lwp_user_associated_login PK_8e540e98c6e5cc1e1b1e53c8acc; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lwp_user_associated_login
    ADD CONSTRAINT "PK_8e540e98c6e5cc1e1b1e53c8acc" PRIMARY KEY (id);


--
-- Name: log_lwp_entity_status_change PK_8f0a4882178d343278751b226ff; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.log_lwp_entity_status_change
    ADD CONSTRAINT "PK_8f0a4882178d343278751b226ff" PRIMARY KEY (id);


--
-- Name: static_lwp_topic_sequence PK_91dcaee411cf61b23e6b7b7d3b4; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.static_lwp_topic_sequence
    ADD CONSTRAINT "PK_91dcaee411cf61b23e6b7b7d3b4" PRIMARY KEY (id);


--
-- Name: lwp_pupil_feedback PK_97e7de171961da67c7e9d4e0627; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lwp_pupil_feedback
    ADD CONSTRAINT "PK_97e7de171961da67c7e9d4e0627" PRIMARY KEY (id);


--
-- Name: lwp_pupil_tag PK_a0941e34b566e4290f15e4eb2d8; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lwp_pupil_tag
    ADD CONSTRAINT "PK_a0941e34b566e4290f15e4eb2d8" PRIMARY KEY (id);


--
-- Name: static_lwp_topic PK_a3e94ceb80ebe93529298700208; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.static_lwp_topic
    ADD CONSTRAINT "PK_a3e94ceb80ebe93529298700208" PRIMARY KEY (id);


--
-- Name: lwp_school_dates PK_a447dd0dba19697c5c0cbda69c7; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lwp_school_dates
    ADD CONSTRAINT "PK_a447dd0dba19697c5c0cbda69c7" PRIMARY KEY (id);


--
-- Name: static_lwp_program PK_a6c17717b01e39ea8d05509452d; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.static_lwp_program
    ADD CONSTRAINT "PK_a6c17717b01e39ea8d05509452d" PRIMARY KEY (id);


--
-- Name: lwp_class_topic PK_a9ecc9d176015be6dae4adf4015; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lwp_class_topic
    ADD CONSTRAINT "PK_a9ecc9d176015be6dae4adf4015" PRIMARY KEY (id);


--
-- Name: static_lwp_data_query PK_ac50439d624b11bfe4a80c74ac2; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.static_lwp_data_query
    ADD CONSTRAINT "PK_ac50439d624b11bfe4a80c74ac2" PRIMARY KEY (id);


--
-- Name: imported_school_data_proposed_change PK_ac55005e87f79024c18e19b2582; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.imported_school_data_proposed_change
    ADD CONSTRAINT "PK_ac55005e87f79024c18e19b2582" PRIMARY KEY (id);


--
-- Name: lwp_activity_tags PK_aeefca6f5e805143674af8c165d; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lwp_activity_tags
    ADD CONSTRAINT "PK_aeefca6f5e805143674af8c165d" PRIMARY KEY ("staticLwpActivityId", "staticLwpActivityTagId");


--
-- Name: static_lwp_features PK_aefee1aae734c186728e14964c7; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.static_lwp_features
    ADD CONSTRAINT "PK_aefee1aae734c186728e14964c7" PRIMARY KEY (id);


--
-- Name: static_lwp_subject PK_b0604e1efc51e462ada715d1bdb; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.static_lwp_subject
    ADD CONSTRAINT "PK_b0604e1efc51e462ada715d1bdb" PRIMARY KEY (id);


--
-- Name: lwp_domain_year_groups PK_b17a9b4ab21d2cd085d09b56360; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lwp_domain_year_groups
    ADD CONSTRAINT "PK_b17a9b4ab21d2cd085d09b56360" PRIMARY KEY ("staticLwpTopicDomainId", "staticLwpYearGroupId");


--
-- Name: lwp_school_class PK_b3133c0c27ebb8ab50eb0fa7e93; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lwp_school_class
    ADD CONSTRAINT "PK_b3133c0c27ebb8ab50eb0fa7e93" PRIMARY KEY (id);


--
-- Name: static_lwp_topic_tag PK_b4186ec85f2ca72f184ba70cd06; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.static_lwp_topic_tag
    ADD CONSTRAINT "PK_b4186ec85f2ca72f184ba70cd06" PRIMARY KEY (id);


--
-- Name: static_lwp_page_announcement PK_b46807faf617d78703ca884c235; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.static_lwp_page_announcement
    ADD CONSTRAINT "PK_b46807faf617d78703ca884c235" PRIMARY KEY (id);


--
-- Name: static_lwp_period PK_b5b4e2f0e5e97ea7ff856a5c763; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.static_lwp_period
    ADD CONSTRAINT "PK_b5b4e2f0e5e97ea7ff856a5c763" PRIMARY KEY (index);


--
-- Name: lwp_magic_link PK_b8e05e799d438db279ed840c75f; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lwp_magic_link
    ADD CONSTRAINT "PK_b8e05e799d438db279ed840c75f" PRIMARY KEY (url);


--
-- Name: static_lwp_year_group PK_ba5f69064482be1a268000a0b76; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.static_lwp_year_group
    ADD CONSTRAINT "PK_ba5f69064482be1a268000a0b76" PRIMARY KEY (id);


--
-- Name: log_parent_activity PK_bc9809875707a2e7e2d0fee5b32; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.log_parent_activity
    ADD CONSTRAINT "PK_bc9809875707a2e7e2d0fee5b32" PRIMARY KEY (id);


--
-- Name: lwp_teacher_liked_pupil_activity PK_bef124e336176eef46c6c036d0e; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lwp_teacher_liked_pupil_activity
    ADD CONSTRAINT "PK_bef124e336176eef46c6c036d0e" PRIMARY KEY ("lwpUserId", "lwpPupilFeedbackId");


--
-- Name: lwp_topic_year_groups PK_bf4137de3723e91ebee7010c39f; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lwp_topic_year_groups
    ADD CONSTRAINT "PK_bf4137de3723e91ebee7010c39f" PRIMARY KEY ("staticLwpTopicId", "staticLwpYearGroupId");


--
-- Name: lwp_pupil_feedback_edit_log PK_bf9bfd3be97cd2b1ad78fa2aa86; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lwp_pupil_feedback_edit_log
    ADD CONSTRAINT "PK_bf9bfd3be97cd2b1ad78fa2aa86" PRIMARY KEY (id);


--
-- Name: static_lwp_admin_query PK_c220f8def2bf479a2edc756a985; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.static_lwp_admin_query
    ADD CONSTRAINT "PK_c220f8def2bf479a2edc756a985" PRIMARY KEY (id);


--
-- Name: lwp_pupil_activity_feedback PK_c552035d050656ff1e90b56a785; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lwp_pupil_activity_feedback
    ADD CONSTRAINT "PK_c552035d050656ff1e90b56a785" PRIMARY KEY (id);


--
-- Name: lwp_feedback_reply PK_c5542c8d91662260ef9d8582af1; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lwp_feedback_reply
    ADD CONSTRAINT "PK_c5542c8d91662260ef9d8582af1" PRIMARY KEY (id);


--
-- Name: static_lwp_resource PK_c95dd78ef9c2de5173873d1e8dc; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.static_lwp_resource
    ADD CONSTRAINT "PK_c95dd78ef9c2de5173873d1e8dc" PRIMARY KEY (id);


--
-- Name: lwp_pupil_mathscot PK_ca866dca4237762e1d7da1cb9d2; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lwp_pupil_mathscot
    ADD CONSTRAINT "PK_ca866dca4237762e1d7da1cb9d2" PRIMARY KEY (id);


--
-- Name: log_lwp_access PK_cb8235bd87471ee6013e21911d0; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.log_lwp_access
    ADD CONSTRAINT "PK_cb8235bd87471ee6013e21911d0" PRIMARY KEY (id);


--
-- Name: log_pupil_merge_operation PK_cbb3b977a13783613709ec85442; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.log_pupil_merge_operation
    ADD CONSTRAINT "PK_cbb3b977a13783613709ec85442" PRIMARY KEY (id);


--
-- Name: lwp_class_teacher PK_cf0469510765b42c1a39161026a; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lwp_class_teacher
    ADD CONSTRAINT "PK_cf0469510765b42c1a39161026a" PRIMARY KEY ("lwpUserId", "lwpSchoolClassId");


--
-- Name: lwp_features_school_tags PK_d33811ec730cc4fe7f4f9de8024; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lwp_features_school_tags
    ADD CONSTRAINT "PK_d33811ec730cc4fe7f4f9de8024" PRIMARY KEY ("staticLwpFeaturesId", "staticLwpSchoolTagId");


--
-- Name: imported_school_class PK_d3de9b706efcc8ff2aef544c535; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.imported_school_class
    ADD CONSTRAINT "PK_d3de9b706efcc8ff2aef544c535" PRIMARY KEY (id);


--
-- Name: static_lwp_interstitial PK_d4afc3850b340eee0d644f4fdfd; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.static_lwp_interstitial
    ADD CONSTRAINT "PK_d4afc3850b340eee0d644f4fdfd" PRIMARY KEY (id);


--
-- Name: lwp_user_tooltip_history PK_d76deabcd913c4cb3493a071bb7; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lwp_user_tooltip_history
    ADD CONSTRAINT "PK_d76deabcd913c4cb3493a071bb7" PRIMARY KEY (id);


--
-- Name: log_lwp_contact PK_d91b5b2f05a7438d72fd59831e7; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.log_lwp_contact
    ADD CONSTRAINT "PK_d91b5b2f05a7438d72fd59831e7" PRIMARY KEY (id);


--
-- Name: static_lwp_email_template PK_d923cb45e38e84e195f95114a3d; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.static_lwp_email_template
    ADD CONSTRAINT "PK_d923cb45e38e84e195f95114a3d" PRIMARY KEY (id);


--
-- Name: log_static_lwp_email_template_history PK_d9a7541b0d74684d245fd8cafd4; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.log_static_lwp_email_template_history
    ADD CONSTRAINT "PK_d9a7541b0d74684d245fd8cafd4" PRIMARY KEY (id);


--
-- Name: static_lwp_mathscot_item PK_de634e08c9418f5e5b18cd0e238; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.static_lwp_mathscot_item
    ADD CONSTRAINT "PK_de634e08c9418f5e5b18cd0e238" PRIMARY KEY (id);


--
-- Name: static_lwp_interstitial_school_tags PK_dfcdb5d85f450de2488fe08b60e; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.static_lwp_interstitial_school_tags
    ADD CONSTRAINT "PK_dfcdb5d85f450de2488fe08b60e" PRIMARY KEY ("staticLwpInterstitialId", "staticLwpSchoolTagId");


--
-- Name: static_lwp_activity_steps PK_e0bb2ffe41d6b72225c45c18240; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.static_lwp_activity_steps
    ADD CONSTRAINT "PK_e0bb2ffe41d6b72225c45c18240" PRIMARY KEY (id);


--
-- Name: static_lwp_staff PK_e246f977b992ac976ee5c9089f5; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.static_lwp_staff
    ADD CONSTRAINT "PK_e246f977b992ac976ee5c9089f5" PRIMARY KEY (id);


--
-- Name: lwp_pupil_topic PK_e36488747ee0e8920ea23b6b1ab; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lwp_pupil_topic
    ADD CONSTRAINT "PK_e36488747ee0e8920ea23b6b1ab" PRIMARY KEY (id);


--
-- Name: imported_student PK_e4551a61acd6fd717c7eaf0b60e; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.imported_student
    ADD CONSTRAINT "PK_e4551a61acd6fd717c7eaf0b60e" PRIMARY KEY (id);


--
-- Name: lwp_parent_pupil PK_e80618f96552dc7f1264c89d4d0; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lwp_parent_pupil
    ADD CONSTRAINT "PK_e80618f96552dc7f1264c89d4d0" PRIMARY KEY ("lwpPupilId", "lwpUserId");


--
-- Name: lwp_school_static_tags PK_e972a0f09e21137de553f2e6024; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lwp_school_static_tags
    ADD CONSTRAINT "PK_e972a0f09e21137de553f2e6024" PRIMARY KEY (id);


--
-- Name: lwp_school PK_ea692e16a682fda1f8c5c907e5e; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lwp_school
    ADD CONSTRAINT "PK_ea692e16a682fda1f8c5c907e5e" PRIMARY KEY (id);


--
-- Name: static_lwp_school_tag PK_eab047b3f7bfb8a6d0d21726262; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.static_lwp_school_tag
    ADD CONSTRAINT "PK_eab047b3f7bfb8a6d0d21726262" PRIMARY KEY (id);


--
-- Name: imported_school_data_proposed_link PK_eb5c8d3c029eb62dc2b99fcc478; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.imported_school_data_proposed_link
    ADD CONSTRAINT "PK_eb5c8d3c029eb62dc2b99fcc478" PRIMARY KEY (id);


--
-- Name: lwp_notification_event_history PK_eba9cda3a0bfbd49c24737fef2d; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lwp_notification_event_history
    ADD CONSTRAINT "PK_eba9cda3a0bfbd49c24737fef2d" PRIMARY KEY (id);


--
-- Name: static_lwp_files PK_ebb356b1e2e926140af047e9c7e; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.static_lwp_files
    ADD CONSTRAINT "PK_ebb356b1e2e926140af047e9c7e" PRIMARY KEY (id);


--
-- Name: lwp_topic_school_tags PK_ee2b1f67d22f917eec885db1c2d; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lwp_topic_school_tags
    ADD CONSTRAINT "PK_ee2b1f67d22f917eec885db1c2d" PRIMARY KEY ("staticLwpSchoolTagId", "staticLwpTopicId");


--
-- Name: wonde_school_class_user PK_eeec6771ec76a15b972c60542ff; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wonde_school_class_user
    ADD CONSTRAINT "PK_eeec6771ec76a15b972c60542ff" PRIMARY KEY ("wondeSchoolClassId", "wondePupilId");


--
-- Name: lwp_user_interstitial PK_ef430d168347f0a6ef99bc06686; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lwp_user_interstitial
    ADD CONSTRAINT "PK_ef430d168347f0a6ef99bc06686" PRIMARY KEY (id);


--
-- Name: wonde_parent_pupil PK_f13e5e2ae6c82181c3c02456a09; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wonde_parent_pupil
    ADD CONSTRAINT "PK_f13e5e2ae6c82181c3c02456a09" PRIMARY KEY ("wondeUserId", "wondePupilId");


--
-- Name: lwp_reading_log PK_f2a6b2ab8485b9db89f21233ef4; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lwp_reading_log
    ADD CONSTRAINT "PK_f2a6b2ab8485b9db89f21233ef4" PRIMARY KEY (id);


--
-- Name: static_lwp_logo PK_f3973628ce77314080fafa2b7eb; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.static_lwp_logo
    ADD CONSTRAINT "PK_f3973628ce77314080fafa2b7eb" PRIMARY KEY (id);


--
-- Name: lwp_user_page_announcement PK_f97da7c5800f744177363c536aa; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lwp_user_page_announcement
    ADD CONSTRAINT "PK_f97da7c5800f744177363c536aa" PRIMARY KEY (id);


--
-- Name: static_lwp_modal PK_f9e0fc7d920f7824fb81b319ad9; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.static_lwp_modal
    ADD CONSTRAINT "PK_f9e0fc7d920f7824fb81b319ad9" PRIMARY KEY (id);


--
-- Name: imported_student_contact PK_fb3ac7740137acabc0f289d1dcb; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.imported_student_contact
    ADD CONSTRAINT "PK_fb3ac7740137acabc0f289d1dcb" PRIMARY KEY (id);


--
-- Name: lwp_school_impact_report PK_fb99a3c20df0e251c633ff8b396; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lwp_school_impact_report
    ADD CONSTRAINT "PK_fb99a3c20df0e251c633ff8b396" PRIMARY KEY (id);


--
-- Name: static_lwp_faq PK_fea175282b102273f87ef0a496c; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.static_lwp_faq
    ADD CONSTRAINT "PK_fea175282b102273f87ef0a496c" PRIMARY KEY (id);


--
-- Name: static_lwp_period REL_142bb485c4507a790ebcdfd38a; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.static_lwp_period
    ADD CONSTRAINT "REL_142bb485c4507a790ebcdfd38a" UNIQUE ("nextPeriodIndex");


--
-- Name: wonde_user REL_346c69e50662acb211b73d44b6; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wonde_user
    ADD CONSTRAINT "REL_346c69e50662acb211b73d44b6" UNIQUE ("lwpUserId");


--
-- Name: static_lwp_period REL_76ebbcc2bd77860732d59e7fec; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.static_lwp_period
    ADD CONSTRAINT "REL_76ebbcc2bd77860732d59e7fec" UNIQUE ("previousPeriodIndex");


--
-- Name: wonde_pupil REL_7e523d5e830cf5ce507156031c; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wonde_pupil
    ADD CONSTRAINT "REL_7e523d5e830cf5ce507156031c" UNIQUE ("lwpPupilId");


--
-- Name: lwp_user_associated_login UQ_4586e2df1b9603ef59f69870bbc; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lwp_user_associated_login
    ADD CONSTRAINT "UQ_4586e2df1b9603ef59f69870bbc" UNIQUE ("accountId");


--
-- Name: static_lwp_staff UQ_4a5c6069d99576367a6c24e5f93; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.static_lwp_staff
    ADD CONSTRAINT "UQ_4a5c6069d99576367a6c24e5f93" UNIQUE ("order");


--
-- Name: imported_student UQ_69fda933a456b29ca2fdcbc1298; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.imported_student
    ADD CONSTRAINT "UQ_69fda933a456b29ca2fdcbc1298" UNIQUE ("lwpPupilId");


--
-- Name: static_lwp_email_template UQ_6a0b0873916c0555e380a926885; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.static_lwp_email_template
    ADD CONSTRAINT "UQ_6a0b0873916c0555e380a926885" UNIQUE ("lwpNotificationId");


--
-- Name: imported_school UQ_6bb3e8b21bfeac40c064aac2c5a; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.imported_school
    ADD CONSTRAINT "UQ_6bb3e8b21bfeac40c064aac2c5a" UNIQUE ("proposedSchoolId");


--
-- Name: static_lwp_whole_school_sequence_member UQ_6f053301bf84c6f714fe64b9b81; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.static_lwp_whole_school_sequence_member
    ADD CONSTRAINT "UQ_6f053301bf84c6f714fe64b9b81" UNIQUE ("wholeSchoolSequenceId", "yearGroupId");


--
-- Name: imported_school_class UQ_76379a02c944a9df9922feeb932; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.imported_school_class
    ADD CONSTRAINT "UQ_76379a02c944a9df9922feeb932" UNIQUE ("lwpSchoolClassId");


--
-- Name: static_lwp_whole_school_sequence UQ_8514162e96b49caac474e2dad3c; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.static_lwp_whole_school_sequence
    ADD CONSTRAINT "UQ_8514162e96b49caac474e2dad3c" UNIQUE ("subjectId", "periodIndex");


--
-- Name: imported_school UQ_873c0d696fddc98663dbb58e31d; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.imported_school
    ADD CONSTRAINT "UQ_873c0d696fddc98663dbb58e31d" UNIQUE ("lwpSchoolId");


--
-- Name: lwp_user UQ_8fba726d5b4a95a33f6394f3f5e; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lwp_user
    ADD CONSTRAINT "UQ_8fba726d5b4a95a33f6394f3f5e" UNIQUE ("phoneNumber");


--
-- Name: imported_school_data_proposed_link UQ_IMPORTED_PLATFORM_ENTITY_ID; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.imported_school_data_proposed_link
    ADD CONSTRAINT "UQ_IMPORTED_PLATFORM_ENTITY_ID" UNIQUE ("importedEntityId", "platformEntityId");


--
-- Name: lwp_pupil_parent UQ_PUPIL_PARENT; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lwp_pupil_parent
    ADD CONSTRAINT "UQ_PUPIL_PARENT" UNIQUE ("parentId", "pupilId");


--
-- Name: lwp_school_static_tags UQ_SCHOOL_TAG; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lwp_school_static_tags
    ADD CONSTRAINT "UQ_SCHOOL_TAG" UNIQUE ("schoolId", "tagId");


--
-- Name: static_lwp_feature_tooltip UQ_STATIC_LWP_FEATURE_TOOLTIP_TARGET_ID; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.static_lwp_feature_tooltip
    ADD CONSTRAINT "UQ_STATIC_LWP_FEATURE_TOOLTIP_TARGET_ID" UNIQUE ("targetId");


--
-- Name: static_lwp_subject UQ_cffcd1870dc3568f40a99843a79; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.static_lwp_subject
    ADD CONSTRAINT "UQ_cffcd1870dc3568f40a99843a79" UNIQUE (name);


--
-- Name: lwp_class_topic UQ_class_topic_assignment_topic; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lwp_class_topic
    ADD CONSTRAINT "UQ_class_topic_assignment_topic" UNIQUE ("classSequenceAssignmentId", "topicId");


--
-- Name: lwp_school UQ_e48f6ab787308b9bd9a099c3da8; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lwp_school
    ADD CONSTRAINT "UQ_e48f6ab787308b9bd9a099c3da8" UNIQUE ("importedSchoolId");


--
-- Name: lwp_school UQ_e99d671aedbb98d8b468ea39b2e; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lwp_school
    ADD CONSTRAINT "UQ_e99d671aedbb98d8b468ea39b2e" UNIQUE (urn);


--
-- Name: lwp_user UQ_ea4d20aef44ad9459af29f92005; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lwp_user
    ADD CONSTRAINT "UQ_ea4d20aef44ad9459af29f92005" UNIQUE (email);


--
-- Name: static_lwp_whole_school_sequence_member UQ_fb035cc242eeaff29608f0031df; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.static_lwp_whole_school_sequence_member
    ADD CONSTRAINT "UQ_fb035cc242eeaff29608f0031df" UNIQUE ("wholeSchoolSequenceId", "sequenceId");


--
-- Name: lwp_set_by_teacher_step_media UQ_sbt_step_media_step_class_topic; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lwp_set_by_teacher_step_media
    ADD CONSTRAINT "UQ_sbt_step_media_step_class_topic" UNIQUE ("stepId", "classTopicId");


--
-- Name: static_lwp_topic_sequence_item UQ_topic_sequence_item_sequence_order; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.static_lwp_topic_sequence_item
    ADD CONSTRAINT "UQ_topic_sequence_item_sequence_order" UNIQUE ("sequenceId", "order");


--
-- Name: static_lwp_topic_sequence_item UQ_topic_sequence_item_sequence_topic; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.static_lwp_topic_sequence_item
    ADD CONSTRAINT "UQ_topic_sequence_item_sequence_topic" UNIQUE ("sequenceId", "topicId");


--
-- Name: analytics_content_fact analytics_content_fact_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.analytics_content_fact
    ADD CONSTRAINT analytics_content_fact_pkey PRIMARY KEY (id);


--
-- Name: analytics_content_fact analytics_content_fact_timeKey_timeGrain_activityId_topicId_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.analytics_content_fact
    ADD CONSTRAINT "analytics_content_fact_timeKey_timeGrain_activityId_topicId_key" UNIQUE ("timeKey", "timeGrain", "activityId", "topicId", "segmentId");


--
-- Name: analytics_pupil_dim analytics_pupil_dim_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.analytics_pupil_dim
    ADD CONSTRAINT analytics_pupil_dim_pkey PRIMARY KEY ("segmentId");


--
-- Name: analytics_pupil_dim analytics_pupil_dim_segmentType_segmentValue_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.analytics_pupil_dim
    ADD CONSTRAINT "analytics_pupil_dim_segmentType_segmentValue_key" UNIQUE ("segmentType", "segmentValue");


--
-- Name: analytics_pupil_fact analytics_pupil_fact_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.analytics_pupil_fact
    ADD CONSTRAINT analytics_pupil_fact_pkey PRIMARY KEY (id);


--
-- Name: analytics_pupil_fact analytics_pupil_fact_pupilId_schoolId_timeKey_timeGrain_sub_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.analytics_pupil_fact
    ADD CONSTRAINT "analytics_pupil_fact_pupilId_schoolId_timeKey_timeGrain_sub_key" UNIQUE ("pupilId", "schoolId", "timeKey", "timeGrain", "subjectId");


--
-- Name: analytics_school_fact analytics_school_fact_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.analytics_school_fact
    ADD CONSTRAINT analytics_school_fact_pkey PRIMARY KEY ("schoolId", "subjectId", "timeKey");


--
-- Name: analytics_school_groups_dim analytics_school_groups_dim_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.analytics_school_groups_dim
    ADD CONSTRAINT analytics_school_groups_dim_pkey PRIMARY KEY ("groupId");


--
-- Name: analytics_schools_in_groups_dim analytics_schools_in_groups_dim_groupId_schoolId_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.analytics_schools_in_groups_dim
    ADD CONSTRAINT "analytics_schools_in_groups_dim_groupId_schoolId_key" UNIQUE ("groupId", "schoolId");


--
-- Name: analytics_schools_in_groups_dim analytics_schools_in_groups_dim_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.analytics_schools_in_groups_dim
    ADD CONSTRAINT analytics_schools_in_groups_dim_pkey PRIMARY KEY (id);


--
-- Name: analytics_time_dim analytics_time_dim_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.analytics_time_dim
    ADD CONSTRAINT analytics_time_dim_pkey PRIMARY KEY ("timeKey", "timeGrain");


--
-- Name: deleted_item_default deleted_item_default_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.deleted_item_default
    ADD CONSTRAINT deleted_item_default_pkey PRIMARY KEY (id);


--
-- Name: deleted_item_p202608 deleted_item_p20260801_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.deleted_item_p202608
    ADD CONSTRAINT deleted_item_p20260801_pkey PRIMARY KEY (id);


--
-- Name: deleted_item_p202609 deleted_item_p20260901_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.deleted_item_p202609
    ADD CONSTRAINT deleted_item_p20260901_pkey PRIMARY KEY (id);


--
-- Name: deleted_item_p202610 deleted_item_p20261001_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.deleted_item_p202610
    ADD CONSTRAINT deleted_item_p20261001_pkey PRIMARY KEY (id);


--
-- Name: deleted_item_p202611 deleted_item_p20261101_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.deleted_item_p202611
    ADD CONSTRAINT deleted_item_p20261101_pkey PRIMARY KEY (id);


--
-- Name: deleted_item_p202612 deleted_item_p20261201_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.deleted_item_p202612
    ADD CONSTRAINT deleted_item_p20261201_pkey PRIMARY KEY (id);


--
-- Name: backup_20230906_lwp_user_status_corrections log_migration_lwp_user_status_corrections_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.backup_20230906_lwp_user_status_corrections
    ADD CONSTRAINT log_migration_lwp_user_status_corrections_pkey PRIMARY KEY (user_id);


--
-- Name: IDX_014fbe23f71fe48068ad70b714; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_014fbe23f71fe48068ad70b714" ON public.lwp_notification USING btree (recipient);


--
-- Name: IDX_023ebe8504c5ba03393725c694; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_023ebe8504c5ba03393725c694" ON public.wonde_parent_pupil USING btree ("wondeUserId");


--
-- Name: IDX_054f240cad5e4ac4c6bca3ad58; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_054f240cad5e4ac4c6bca3ad58" ON public.lwp_user_tooltip_history USING btree ("userId");


--
-- Name: IDX_05b324c4cb7769f7b2acf28c50; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_05b324c4cb7769f7b2acf28c50" ON public.lwp_feedback_reply USING btree ("deletedById");


--
-- Name: IDX_076dfc682ecef44411355f6904; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_076dfc682ecef44411355f6904" ON public.lwp_class_teacher USING btree ("lwpUserId");


--
-- Name: IDX_08b502e90f091cc84768661804; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_08b502e90f091cc84768661804" ON public.static_lwp_interstitial_school_tags USING btree ("staticLwpSchoolTagId");


--
-- Name: IDX_0984b81f175de9510698bcda08; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_0984b81f175de9510698bcda08" ON public.lwp_school_holidays USING btree ("lwpSchoolHolidayId");


--
-- Name: IDX_0a85cd33702c81d9d6dfeda6bf; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_0a85cd33702c81d9d6dfeda6bf" ON public.static_lwp_admin_query USING btree ("logCreatedById");


--
-- Name: IDX_0af64e2f7ef9249a68d46fdafc; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_0af64e2f7ef9249a68d46fdafc" ON public.lwp_class_subjects USING btree ("staticLwpSubjectId");


--
-- Name: IDX_0be2abc8ff1982f258a11fa654; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_0be2abc8ff1982f258a11fa654" ON public.static_lwp_interstitial USING btree ("deletedById");


--
-- Name: IDX_0d6fdfa35762b4d3c0bbc40080; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_0d6fdfa35762b4d3c0bbc40080" ON public.static_lwp_trophy USING btree ("logUpdatedById");


--
-- Name: IDX_0e74c8dd936d77abcbb6b08e6c; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_0e74c8dd936d77abcbb6b08e6c" ON public.lwp_page_announcement_school_tags USING btree ("staticLwpSchoolTagId");


--
-- Name: IDX_0f4265aca2a028752221d4569c; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "IDX_0f4265aca2a028752221d4569c" ON public.static_lwp_data_query USING btree (name);


--
-- Name: IDX_0f7a40f291d88aaae96f58a1aa; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_0f7a40f291d88aaae96f58a1aa" ON public.lwp_magic_link USING btree ("userId");


--
-- Name: IDX_135655718f2843f18475941efb; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_135655718f2843f18475941efb" ON public.lwp_notification USING btree ("apiId");


--
-- Name: IDX_14cc634c3b92ca4779275fd155; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_14cc634c3b92ca4779275fd155" ON public.lwp_user_associated_login USING btree ("logUpdatedById");


--
-- Name: IDX_16ba0a7751b9525b80d977aae2; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_16ba0a7751b9525b80d977aae2" ON public.static_lwp_whole_school_sequence USING btree ("subjectId");


--
-- Name: IDX_16ce399c90c3f84a15452cbb78; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_16ce399c90c3f84a15452cbb78" ON public.lwp_pupil_parent USING btree ("parentId");


--
-- Name: IDX_17636cefd338c53baa99e1027e; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_17636cefd338c53baa99e1027e" ON public.static_lwp_activity_tag USING btree ("logUpdatedById");


--
-- Name: IDX_18c1cc22b7a4218f7ddda076eb; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_18c1cc22b7a4218f7ddda076eb" ON public.lwp_class_sequence_assignment USING btree ("wholeSchoolAssignmentId");


--
-- Name: IDX_1915c5a8e1d6fef62535cb4790; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_1915c5a8e1d6fef62535cb4790" ON public.imported_school_class_student USING btree ("importedSchoolClassId");


--
-- Name: IDX_19b344e5b8bd29e60586b80dc8; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_19b344e5b8bd29e60586b80dc8" ON public.lwp_features_school_tags USING btree ("staticLwpSchoolTagId");


--
-- Name: IDX_1a1fb7e26fa2ee368363133db5; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_1a1fb7e26fa2ee368363133db5" ON public.lwp_pupil_topic_sbt_step_media USING btree ("lwpSetByTeacherStepMediaId");


--
-- Name: IDX_1c4528f48668f132128f05d6b7; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_1c4528f48668f132128f05d6b7" ON public.static_lwp_activity USING btree ("logCreatedById");


--
-- Name: IDX_1c4e84326e8667efdddc341913; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_1c4e84326e8667efdddc341913" ON public.lwp_pupil_feedback_history USING btree ("lwpPupilId");


--
-- Name: IDX_1cdf48d94a440692ed29aa735f; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_1cdf48d94a440692ed29aa735f" ON public.imported_school_class USING btree ("schoolId");


--
-- Name: IDX_1eceaee44587d22880d44a5f1d; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_1eceaee44587d22880d44a5f1d" ON public.log_lwp_entity_status_change USING btree ("entityId");


--
-- Name: IDX_1efe79f8f8e52b0b2a788f4fa5; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_1efe79f8f8e52b0b2a788f4fa5" ON public.lwp_topic_tags USING btree ("staticLwpTopicTagId");


--
-- Name: IDX_20ad452112100d1a2feb31358c; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_20ad452112100d1a2feb31358c" ON public.lwp_pupil_topic USING btree ("logUpdatedById");


--
-- Name: IDX_24a59de7276b0c552745d00fa8; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_24a59de7276b0c552745d00fa8" ON public.static_lwp_activity_tag USING btree ("deletedById");


--
-- Name: IDX_26bae6bd4f819eed6b80e19f92; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_26bae6bd4f819eed6b80e19f92" ON public.lwp_class_topic USING btree ("deletedById");


--
-- Name: IDX_2796d417f6bf4b1d40c5effef5; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_2796d417f6bf4b1d40c5effef5" ON public.wonde_school_class_user USING btree ("wondeSchoolClassId");


--
-- Name: IDX_282255dcbb7f683d3fdf5b03cd; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_282255dcbb7f683d3fdf5b03cd" ON public.lwp_features_school_tags USING btree ("staticLwpFeaturesId");


--
-- Name: IDX_283654b1c9cc9f7934d5957b1f; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_283654b1c9cc9f7934d5957b1f" ON public.static_lwp_news USING btree ("logUpdatedById");


--
-- Name: IDX_28d7a5b946daa6d4f5d963ac0c; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_28d7a5b946daa6d4f5d963ac0c" ON public.wonde_contact_student USING btree ("wondeStudentId");


--
-- Name: IDX_2a655ce9718a4945edeae4960d; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_2a655ce9718a4945edeae4960d" ON public.static_lwp_school_tag USING btree ("logCreatedById");


--
-- Name: IDX_2af81902508ea3a8642ff570e5; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_2af81902508ea3a8642ff570e5" ON public.lwp_class_sequence_assignment USING btree ("logCreatedById");


--
-- Name: IDX_2bfb5c86b0fe76e9991b0ec990; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_2bfb5c86b0fe76e9991b0ec990" ON public.static_lwp_activity USING btree ("deletedById");


--
-- Name: IDX_2c57c20c9b77065de705c73f30; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_2c57c20c9b77065de705c73f30" ON public.lwp_notification_event_history USING btree (status);


--
-- Name: IDX_2ef3f597a486dbcfe7c1c6942f; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_2ef3f597a486dbcfe7c1c6942f" ON public.lwp_school_impact_report USING btree ("logCreatedById");


--
-- Name: IDX_3050b8005ed864bb612f527fec; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_3050b8005ed864bb612f527fec" ON public.static_lwp_activity USING btree ("logUpdatedById");


--
-- Name: IDX_31c9495dc85864eca933b6f928; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_31c9495dc85864eca933b6f928" ON public.static_lwp_data_query USING btree ("logCreatedById");


--
-- Name: IDX_31dc0989ede8ef8584abb61b29; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_31dc0989ede8ef8584abb61b29" ON public.lwp_set_by_teacher_step_media USING btree ("logCreatedById");


--
-- Name: IDX_33b5f81d807493605398f372e5; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_33b5f81d807493605398f372e5" ON public.lwp_pupil_feedback USING btree ("logUpdatedById");


--
-- Name: IDX_33cd7aa73e0fc074d4d2525882; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_33cd7aa73e0fc074d4d2525882" ON public.lwp_school_holiday USING btree ("logCreatedById");


--
-- Name: IDX_3405c33e7db626983a427afbb4; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_3405c33e7db626983a427afbb4" ON public.static_lwp_topic_domain USING btree ("deletedById");


--
-- Name: IDX_354bdd5cabaae4416e03d48c86; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_354bdd5cabaae4416e03d48c86" ON public.lwp_school_class USING btree ("deletedById");


--
-- Name: IDX_35affb8be93b2e89771abbb3be; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_35affb8be93b2e89771abbb3be" ON public.lwp_demo_activity_feedback USING btree ("deletedById");


--
-- Name: IDX_377a44e70b697bc51306a35d08; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_377a44e70b697bc51306a35d08" ON public.lwp_user_interstitial USING btree ("userId");


--
-- Name: IDX_39ff1ccaeacc7a49cb4e3b4176; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_39ff1ccaeacc7a49cb4e3b4176" ON public.lwp_teacher_liked_pupil_activity USING btree ("lwpUserId");


--
-- Name: IDX_3c4acbc1a3ac5b558aa23f1ceb; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_3c4acbc1a3ac5b558aa23f1ceb" ON public.lwp_whole_school_sequence_assignment USING btree ("periodIndex");


--
-- Name: IDX_3c77e387bbf92f70e5fca50ff3; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_3c77e387bbf92f70e5fca50ff3" ON public.lwp_topic_school_tags USING btree ("staticLwpSchoolTagId");


--
-- Name: IDX_3d874a69cc610e6edb47643d27; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_3d874a69cc610e6edb47643d27" ON public.static_lwp_topic_tag USING btree ("deletedById");


--
-- Name: IDX_3efa30cd4c01885fc707ec788f; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_3efa30cd4c01885fc707ec788f" ON public.lwp_pupil_parent USING btree ("logCreatedById");


--
-- Name: IDX_3facafb0780aa9376a5be7878b; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_3facafb0780aa9376a5be7878b" ON public.imported_contact USING btree ("schoolId");


--
-- Name: IDX_42602b69e01152aa1dd61724e5; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_42602b69e01152aa1dd61724e5" ON public.static_lwp_topic_sequence_item USING btree ("sequenceId");


--
-- Name: IDX_42e678039940cc979ec557351e; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_42e678039940cc979ec557351e" ON public.lwp_school_class USING btree ("schoolId");


--
-- Name: IDX_4448b1f9d59cd074d949a699b0; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_4448b1f9d59cd074d949a699b0" ON public.lwp_pupil USING btree ("deletedById");


--
-- Name: IDX_4495384384c9431f796a8df409; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_4495384384c9431f796a8df409" ON public.lwp_pupil_topic USING btree ("logCreatedById");


--
-- Name: IDX_4586e2df1b9603ef59f69870bb; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "IDX_4586e2df1b9603ef59f69870bb" ON public.lwp_user_associated_login USING btree ("accountId");


--
-- Name: IDX_45c00d9a6b0d0dbec8bb7f5b17; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_45c00d9a6b0d0dbec8bb7f5b17" ON public.static_lwp_period USING btree ("logUpdatedById");


--
-- Name: IDX_463957978afdfb82fac87b0ee7; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_463957978afdfb82fac87b0ee7" ON public.lwp_class_topic USING btree ("logUpdatedById");


--
-- Name: IDX_4641a4ec4b379c8289e579243c; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_4641a4ec4b379c8289e579243c" ON public.lwp_pupil_mathscot USING btree ("logCreatedById");


--
-- Name: IDX_467487742580cea78125ff2d35; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_467487742580cea78125ff2d35" ON public.log_school_class_license USING btree ("logCreatedById");


--
-- Name: IDX_46ecec32d5bc90fe9e09dbc9d4; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_46ecec32d5bc90fe9e09dbc9d4" ON public.static_lwp_school_tag USING btree ("deletedById");


--
-- Name: IDX_47ea6289a076da87976c988be3; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_47ea6289a076da87976c988be3" ON public.log_lwp_contact USING btree ("logUpdatedById");


--
-- Name: IDX_4927ba841bf7fcb3c044d1e9d9; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_4927ba841bf7fcb3c044d1e9d9" ON public.imported_student_contact USING btree ("schoolId");


--
-- Name: IDX_4a6bb580e0c7c6b593f9722a40; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_4a6bb580e0c7c6b593f9722a40" ON public.lwp_topic_school_tags USING btree ("staticLwpTopicId");


--
-- Name: IDX_4af14f483eda27be61690bbba3; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_4af14f483eda27be61690bbba3" ON public.static_lwp_interstitial_school_tags USING btree ("staticLwpInterstitialId");


--
-- Name: IDX_4b04a09a2c69ed35d50b000d0c; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_4b04a09a2c69ed35d50b000d0c" ON public.lwp_activity_tags USING btree ("staticLwpActivityTagId");


--
-- Name: IDX_4c0bedc0586a720226d0e27315; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_4c0bedc0586a720226d0e27315" ON public.lwp_parent_pupil_invited USING btree ("lwpUserId");


--
-- Name: IDX_4db45ebcfe911a159ec87fb82c; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_4db45ebcfe911a159ec87fb82c" ON ONLY public.deleted_item USING btree (source, "recordId");


--
-- Name: IDX_4dcfa67450484437b5da1feaab; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_4dcfa67450484437b5da1feaab" ON public.imported_school_class USING btree ("yearGroup");


--
-- Name: IDX_50a970c277e059d7b7c08e5a92; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_50a970c277e059d7b7c08e5a92" ON public.lwp_school_class USING btree ("logCreatedById");


--
-- Name: IDX_50d86b423a249d2b05471aebb8; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_50d86b423a249d2b05471aebb8" ON public.static_lwp_topic_sequence_item USING btree ("logCreatedById");


--
-- Name: IDX_526a6f719fe468910d8d4644a3; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_526a6f719fe468910d8d4644a3" ON public.lwp_pupil_feedback USING btree ("deletedById");


--
-- Name: IDX_5350669a5bbef9ea1d3abb1e62; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_5350669a5bbef9ea1d3abb1e62" ON public.lwp_pupil USING btree ("logUpdatedById");


--
-- Name: IDX_540c5134753fbac866502d554e; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_540c5134753fbac866502d554e" ON public.lwp_class_sequence_assignment USING btree ("classId");


--
-- Name: IDX_550f0f2b9e085371cb007b725f; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_550f0f2b9e085371cb007b725f" ON public.static_lwp_topic USING btree ("logUpdatedById");


--
-- Name: IDX_5539d20509b8823beb51d52254; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "IDX_5539d20509b8823beb51d52254" ON public.lwp_pupil_trophy USING btree ("pupilId", "trophyId");


--
-- Name: IDX_5639163ec3bbfc107354f610bc; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_5639163ec3bbfc107354f610bc" ON public.lwp_parent_pupil_imported USING btree ("lwpPupilId");


--
-- Name: IDX_56914a5c98348e7b0d64d28196; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_56914a5c98348e7b0d64d28196" ON public.static_lwp_topic USING btree ("deletedById");


--
-- Name: IDX_579c57aeaa13d383c32f558968; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_579c57aeaa13d383c32f558968" ON public.lwp_activity_tags USING btree ("staticLwpActivityId");


--
-- Name: IDX_57b4aec2ff47cf5b0d0f594f5a; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_57b4aec2ff47cf5b0d0f594f5a" ON public.lwp_pupil_parent USING btree ("invitedById");


--
-- Name: IDX_583e79cf7877b76264f60ae04a; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_583e79cf7877b76264f60ae04a" ON public.imported_student_contact USING btree ("importedContactId");


--
-- Name: IDX_58644bf62445e8c5bac8677e85; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_58644bf62445e8c5bac8677e85" ON public.static_lwp_whole_school_sequence USING btree ("logCreatedById");


--
-- Name: IDX_58e9503d40ddad35743e499d89; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_58e9503d40ddad35743e499d89" ON public.static_lwp_files USING btree ("logUpdatedById");


--
-- Name: IDX_59d800c86979858bd00e0432b3; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_59d800c86979858bd00e0432b3" ON public.static_lwp_activity_tag USING btree ("logCreatedById");


--
-- Name: IDX_5e64b24ddda1270717de019941; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_5e64b24ddda1270717de019941" ON public.lwp_school USING btree ("deletedById");


--
-- Name: IDX_5ee4fa5f5b9beaafa1d0286284; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_5ee4fa5f5b9beaafa1d0286284" ON public.lwp_user_associated_login USING btree ("logCreatedById");


--
-- Name: IDX_5f78ad70ac8e15243540b56978; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_5f78ad70ac8e15243540b56978" ON public.lwp_pupil_mathscot USING btree ("pupilId", "periodIndex");


--
-- Name: IDX_5fd36d760e6f6db1bbd8dd93b5; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_5fd36d760e6f6db1bbd8dd93b5" ON public.lwp_whole_school_sequence_assignment USING btree ("schoolId");


--
-- Name: IDX_6344fe1415e601e5b7c6bf0485; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_6344fe1415e601e5b7c6bf0485" ON public.static_lwp_topic_sequence USING btree ("logUpdatedById");


--
-- Name: IDX_6442bd69af1158768dd29a64d7; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_6442bd69af1158768dd29a64d7" ON public.static_lwp_feature_tooltip USING btree ("userTypes");


--
-- Name: IDX_66125e54df0ed1a92e2ec94a30; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_66125e54df0ed1a92e2ec94a30" ON public.lwp_notification USING btree ("logCreatedById");


--
-- Name: IDX_662ff91cd885473c9047f60cee; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_662ff91cd885473c9047f60cee" ON public.static_lwp_feature_tooltip USING btree ("order");


--
-- Name: IDX_6751a3de932c6c8a10fc5e8c2d; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_6751a3de932c6c8a10fc5e8c2d" ON public.static_lwp_topic_tag USING btree ("logCreatedById");


--
-- Name: IDX_69fda933a456b29ca2fdcbc129; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_69fda933a456b29ca2fdcbc129" ON public.imported_student USING btree ("lwpPupilId");


--
-- Name: IDX_6bb3e8b21bfeac40c064aac2c5; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_6bb3e8b21bfeac40c064aac2c5" ON public.imported_school USING btree ("proposedSchoolId");


--
-- Name: IDX_6cf14575292716f2837fd4915c; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_6cf14575292716f2837fd4915c" ON public.imported_student USING btree ("schoolId");


--
-- Name: IDX_6d29d30843337e30775ad14bf7; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_6d29d30843337e30775ad14bf7" ON public.lwp_class_sequence_assignment USING btree ("sequenceId");


--
-- Name: IDX_6d2f8d4af7840a9961ab3266c1; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_6d2f8d4af7840a9961ab3266c1" ON public.lwp_class_topic USING btree ("logCreatedById");


--
-- Name: IDX_6da9024ce11b794ce5ad14a9be; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_6da9024ce11b794ce5ad14a9be" ON public.lwp_school_holidays USING btree ("lwpSchoolId");


--
-- Name: IDX_6de6dec113817625220ee50fc9; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_6de6dec113817625220ee50fc9" ON public.lwp_user_tooltip_history USING btree ("featureTooltipId");


--
-- Name: IDX_6efdd2affbf620737afee37152; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_6efdd2affbf620737afee37152" ON public.lwp_pupil_feedback_media USING btree ("logCreatedById");


--
-- Name: IDX_6ffb008a0098499deb896d5595; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_6ffb008a0098499deb896d5595" ON public.lwp_class_pupil USING btree ("lwpPupilId");


--
-- Name: IDX_701f16c4ea9031846285e7d522; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_701f16c4ea9031846285e7d522" ON public.lwp_class_subjects USING btree ("lwpSchoolClassId");


--
-- Name: IDX_710266aa10ba8639a8df0bda18; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_710266aa10ba8639a8df0bda18" ON public.lwp_user_page_announcement USING btree ("userId");


--
-- Name: IDX_717bdce37292529e51213e85c8; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_717bdce37292529e51213e85c8" ON public.static_lwp_resource USING btree ("logUpdatedById");


--
-- Name: IDX_74ec697bf0e09b8e9cbb315b18; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_74ec697bf0e09b8e9cbb315b18" ON public.lwp_topic_year_groups USING btree ("staticLwpYearGroupId");


--
-- Name: IDX_76379a02c944a9df9922feeb93; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_76379a02c944a9df9922feeb93" ON public.imported_school_class USING btree ("lwpSchoolClassId");


--
-- Name: IDX_771710799b2752e6c993b0647e; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_771710799b2752e6c993b0647e" ON public.lwp_school_dates USING btree ("logUpdatedById");


--
-- Name: IDX_77215dbca0812b6d47fbd94aa5; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_77215dbca0812b6d47fbd94aa5" ON public.lwp_school_dates USING btree ("startDate");


--
-- Name: IDX_7773d6f4bfb3f1047340409a5f; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_7773d6f4bfb3f1047340409a5f" ON public.lwp_user_associated_login USING btree ("deletedById");


--
-- Name: IDX_778cd0bf9a5918ebeccd79da7b; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_778cd0bf9a5918ebeccd79da7b" ON public.lwp_pupil_feedback_edit_log USING btree ("feedbackId");


--
-- Name: IDX_787e185dd5b12c5d8fc66aed0c; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_787e185dd5b12c5d8fc66aed0c" ON public.static_lwp_modal USING btree ("logCreatedById");


--
-- Name: IDX_7887f55f5621933a33d291e959; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_7887f55f5621933a33d291e959" ON public.imported_student_contact USING btree ("importedStudentId");


--
-- Name: IDX_78c748cf7a31641237cc68d0ae; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_78c748cf7a31641237cc68d0ae" ON public.static_lwp_features USING btree ("logCreatedById");


--
-- Name: IDX_795faebf34cac5923dc012743d; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_795faebf34cac5923dc012743d" ON public.static_lwp_topic_domain USING btree ("logUpdatedById");


--
-- Name: IDX_7a3ce64e96f8cea64723fc268e; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_7a3ce64e96f8cea64723fc268e" ON public.static_lwp_faq USING btree ("logUpdatedById");


--
-- Name: IDX_7aa7195aa7dd08de3fe5c818d7; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_7aa7195aa7dd08de3fe5c818d7" ON public.static_lwp_topic_sequence USING btree ("subjectId");


--
-- Name: IDX_7ba90d8508a5d220d878b20b89; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_7ba90d8508a5d220d878b20b89" ON public.static_lwp_topic_tag USING btree ("logUpdatedById");


--
-- Name: IDX_7c62de4d52d33cb7000554ffaa; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_7c62de4d52d33cb7000554ffaa" ON public.lwp_school_holiday USING btree ("logUpdatedById");


--
-- Name: IDX_7d4cfca9d87858f7ec57c262f1; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_7d4cfca9d87858f7ec57c262f1" ON public.lwp_school_class USING btree ("parentClassId");


--
-- Name: IDX_7dd2e51924f7835aade3467442; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_7dd2e51924f7835aade3467442" ON public.lwp_domain_year_groups USING btree ("staticLwpTopicDomainId");


--
-- Name: IDX_7f2306880a317351b6e621d0e1; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_7f2306880a317351b6e621d0e1" ON public.lwp_class_teacher USING btree ("lwpSchoolClassId");


--
-- Name: IDX_8019bce83a2fb14f7a4acdbb97; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_8019bce83a2fb14f7a4acdbb97" ON public.lwp_feedback_reply USING btree ("logCreatedById");


--
-- Name: IDX_811ab1ecba16aaefbb473a5af9; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_811ab1ecba16aaefbb473a5af9" ON public.static_lwp_whole_school_sequence_member USING btree ("sequenceId");


--
-- Name: IDX_82fc14817f0ef0b64239c3abd5; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_82fc14817f0ef0b64239c3abd5" ON public.static_lwp_parameter USING btree ("logCreatedById");


--
-- Name: IDX_83a90c78f9e7e756d840c242d3; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "IDX_83a90c78f9e7e756d840c242d3" ON public.log_lwp_parent_sticker_notification USING btree ("stickerId", "userId");


--
-- Name: IDX_873c0d696fddc98663dbb58e31; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_873c0d696fddc98663dbb58e31" ON public.imported_school USING btree ("lwpSchoolId");


--
-- Name: IDX_87e9dc9ffc9ce8b5ee5c7704f9; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_87e9dc9ffc9ce8b5ee5c7704f9" ON public.lwp_pupil_parent USING btree ("logUpdatedById");


--
-- Name: IDX_8a648f6142f6bf4762d4cf2d3b; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_8a648f6142f6bf4762d4cf2d3b" ON public.static_lwp_school_tag USING btree ("logUpdatedById");


--
-- Name: IDX_8b41f2bc9d2b812960d38229c5; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_8b41f2bc9d2b812960d38229c5" ON public.lwp_class_topic USING btree ("classSequenceAssignmentId");


--
-- Name: IDX_8cad5c74a4117a3f54ee2d791c; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_8cad5c74a4117a3f54ee2d791c" ON public.lwp_pupil_mathscot USING btree ("logUpdatedById");


--
-- Name: IDX_8cb56f5f4ef593346bc93ec797; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_8cb56f5f4ef593346bc93ec797" ON public.log_parent_activity USING btree ("logUpdatedById");


--
-- Name: IDX_8d7e47c56aefa9eec9df317251; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_8d7e47c56aefa9eec9df317251" ON public.lwp_pupil_feedback_media USING btree ("logUpdatedById");


--
-- Name: IDX_8e75c0db68d199f72bae5142b8; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_8e75c0db68d199f72bae5142b8" ON public.static_lwp_files USING btree ("logCreatedById");


--
-- Name: IDX_8f09deee8e720e55e9e9fee9a2; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_8f09deee8e720e55e9e9fee9a2" ON public.lwp_school_impact_report USING btree ("logUpdatedById");


--
-- Name: IDX_8f6bf7e571afd306bafab81f60; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_8f6bf7e571afd306bafab81f60" ON public.lwp_sticker USING btree ("logUpdatedById");


--
-- Name: IDX_927124abbdc80527aaf40c3945; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_927124abbdc80527aaf40c3945" ON public.static_lwp_news USING btree ("logCreatedById");


--
-- Name: IDX_93a355ce04c02cf8305e7a764d; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_93a355ce04c02cf8305e7a764d" ON public.lwp_class_sequence_assignment USING btree ("logUpdatedById");


--
-- Name: IDX_941cf21b1baa1009ca8700369c; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_941cf21b1baa1009ca8700369c" ON public.static_lwp_admin_query USING btree ("logUpdatedById");


--
-- Name: IDX_98f9d5c8ffa862d231ad5d88ad; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_98f9d5c8ffa862d231ad5d88ad" ON public.imported_school_class_student USING btree ("importedStudentId");


--
-- Name: IDX_998db88f5b48088826c7ded895; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_998db88f5b48088826c7ded895" ON public.lwp_school_holiday USING btree ("deletedById");


--
-- Name: IDX_99eb7b3e12f774993f936ae458; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_99eb7b3e12f774993f936ae458" ON public.lwp_whole_school_sequence_assignment USING btree ("subjectId");


--
-- Name: IDX_9b0ec8cb04d577fd6e4384d499; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_9b0ec8cb04d577fd6e4384d499" ON public.lwp_pupil_feedback_media USING btree ("deletedById");


--
-- Name: IDX_9b4da38958c186ae30da04490f; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_9b4da38958c186ae30da04490f" ON public.wonde_parent_pupil USING btree ("wondePupilId");


--
-- Name: IDX_9c317a875d0f7923e5885535fc; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_9c317a875d0f7923e5885535fc" ON public.static_lwp_data_query USING btree ("logUpdatedById");


--
-- Name: IDX_9cdffa8315c4b8db3f8aace6c4; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_9cdffa8315c4b8db3f8aace6c4" ON public.log_static_lwp_email_template_history USING btree (type, "logCreatedAt");


--
-- Name: IDX_9d47ba874a88d6884ae4d71bd5; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_9d47ba874a88d6884ae4d71bd5" ON public.lwp_school USING btree ("logCreatedById");


--
-- Name: IDX_a1515e99b330ec6552c4aa7cc3; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_a1515e99b330ec6552c4aa7cc3" ON public.lwp_pupil_feedback_media USING btree ("feedbackId");


--
-- Name: IDX_a15ff23b3be6426d4d2d03ad71; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_a15ff23b3be6426d4d2d03ad71" ON public.static_lwp_year_group USING btree ("logUpdatedById");


--
-- Name: IDX_a58714f2da14193cfd898b26de; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_a58714f2da14193cfd898b26de" ON public.log_school_class_license USING btree ("logUpdatedById");


--
-- Name: IDX_a6bae53c6d50d6c9f05ca16fe2; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_a6bae53c6d50d6c9f05ca16fe2" ON public.lwp_user USING btree ("logCreatedById");


--
-- Name: IDX_a8655cd0de0ea30db727110d02; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_a8655cd0de0ea30db727110d02" ON public.lwp_school USING btree ("logUpdatedById");


--
-- Name: IDX_a8d05133c82fb8814ab94ce58d; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_a8d05133c82fb8814ab94ce58d" ON public.lwp_user_tooltip_history USING btree ("logUpdatedById");


--
-- Name: IDX_a97cc03ec9076cdeca3d3217b3; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_a97cc03ec9076cdeca3d3217b3" ON public.static_lwp_topic_sequence USING btree ("yearGroupId");


--
-- Name: IDX_a9e0395312a118ffa5f3087233; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_a9e0395312a118ffa5f3087233" ON public.wonde_school_class_user USING btree ("wondePupilId");


--
-- Name: IDX_ad67af2a7d0eb9e2105a24201d; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_ad67af2a7d0eb9e2105a24201d" ON public.static_lwp_email_template USING btree ("logCreatedById");


--
-- Name: IDX_ad96c8e531a7d33b0c14947bf1; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_ad96c8e531a7d33b0c14947bf1" ON public.static_lwp_faq USING btree ("logCreatedById");


--
-- Name: IDX_adb1eca4cb3c8486cff649aa2f; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_adb1eca4cb3c8486cff649aa2f" ON public.log_lwp_contact USING btree ("logCreatedById");


--
-- Name: IDX_b0c69ed64ccf659c5cbbed112f; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_b0c69ed64ccf659c5cbbed112f" ON public.lwp_pupil_activity USING btree ("deletedById");


--
-- Name: IDX_b1338181c3cedda4b30acb0e28; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_b1338181c3cedda4b30acb0e28" ON public.static_lwp_whole_school_sequence USING btree ("logUpdatedById");


--
-- Name: IDX_b27674871a58aa5a9ef34d0e2a; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_b27674871a58aa5a9ef34d0e2a" ON public.lwp_pupil_feedback USING btree ("tickedById");


--
-- Name: IDX_b29da7091980e90f89dc4f134a; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_b29da7091980e90f89dc4f134a" ON public.lwp_trophy_subjects USING btree ("staticLwpTrophyId");


--
-- Name: IDX_b3d815fc22fed4cabc54a751de; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_b3d815fc22fed4cabc54a751de" ON public.lwp_pupil_feedback_history USING btree ("lwpPupilFeedbackId");


--
-- Name: IDX_b5a4ab848388aaf0b61340aaa8; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_b5a4ab848388aaf0b61340aaa8" ON public.lwp_pupil USING btree ("logCreatedById");


--
-- Name: IDX_b5f4856fe443aea6e1d91db64d; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_b5f4856fe443aea6e1d91db64d" ON public.wonde_contact_student USING btree ("wondeContactId");


--
-- Name: IDX_b8244b3c456d9332d0320d2e00; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_b8244b3c456d9332d0320d2e00" ON public.lwp_user_interstitial USING btree ("logUpdatedById");


--
-- Name: IDX_b9660f31445d7310736437175a; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_b9660f31445d7310736437175a" ON public.static_lwp_topic_sequence USING btree ("logCreatedById");


--
-- Name: IDX_b99bccfe69966d60358e997bc6; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_b99bccfe69966d60358e997bc6" ON public.static_lwp_modal USING btree ("logUpdatedById");


--
-- Name: IDX_bb93e46f7bde371d8e7a4304ae; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_bb93e46f7bde371d8e7a4304ae" ON public.lwp_parent_pupil_imported USING btree ("lwpUserId");


--
-- Name: IDX_bc2f2bdb1b0af114ed923f2540; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_bc2f2bdb1b0af114ed923f2540" ON public.static_lwp_period USING btree ("logCreatedById");


--
-- Name: IDX_bc62fe8bd60d9e4d84722f198c; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "IDX_bc62fe8bd60d9e4d84722f198c" ON public.static_lwp_admin_query USING btree (name);


--
-- Name: IDX_bd7f79c52a3d7e0f7c30690617; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_bd7f79c52a3d7e0f7c30690617" ON public.static_lwp_topic_sequence_item USING btree ("topicId");


--
-- Name: IDX_be5a6de81153750e487cc0ff6f; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_be5a6de81153750e487cc0ff6f" ON public.static_lwp_whole_school_sequence_member USING btree ("wholeSchoolSequenceId");


--
-- Name: IDX_c073f5bf6bec7433a90dac58f4; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_c073f5bf6bec7433a90dac58f4" ON public.lwp_pupil_tag_pupil USING btree ("lwpPupilTagId");


--
-- Name: IDX_c11cc3e1832ec9b6fdc033b1f6; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_c11cc3e1832ec9b6fdc033b1f6" ON public.lwp_user USING btree ("deletedById");


--
-- Name: IDX_c6019e142545572e5aff10dda4; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_c6019e142545572e5aff10dda4" ON public.lwp_topic_tags USING btree ("staticLwpTopicId");


--
-- Name: IDX_c8202e1571c50001f58d3ea213; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_c8202e1571c50001f58d3ea213" ON public.lwp_pupil_topic_sbt_step_media USING btree ("lwpPupilTopicId");


--
-- Name: IDX_c8f1d4ebd6ed1b80a4347a0213; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_c8f1d4ebd6ed1b80a4347a0213" ON public.static_lwp_activity_steps USING btree ("deletedById");


--
-- Name: IDX_cc24334d0a96e5f4debcf0fad4; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_cc24334d0a96e5f4debcf0fad4" ON public.lwp_pupil_trophy USING btree ("logUpdatedById");


--
-- Name: IDX_d184c5efd0cca96a99114e8c77; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_d184c5efd0cca96a99114e8c77" ON public.log_lwp_entity_status_change USING btree ("entityType");


--
-- Name: IDX_d1dc2ff8f84e50d62ef01ffebf; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_d1dc2ff8f84e50d62ef01ffebf" ON public.static_lwp_whole_school_sequence USING btree ("periodIndex");


--
-- Name: IDX_d2d40ddc1cee199bec2f93f8ad; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_d2d40ddc1cee199bec2f93f8ad" ON public.lwp_user USING btree ("logUpdatedById");


--
-- Name: IDX_d3c67b6a0fa260f0a207b5b24c; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_d3c67b6a0fa260f0a207b5b24c" ON public.static_lwp_topic_sequence USING btree ("periodIndex");


--
-- Name: IDX_d3faa4307272bb302a429decc6; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_d3faa4307272bb302a429decc6" ON public.static_lwp_whole_school_sequence_member USING btree ("logUpdatedById");


--
-- Name: IDX_d4c298103da504ce2bd6aed54a; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_d4c298103da504ce2bd6aed54a" ON public.static_lwp_interstitial USING btree ("logUpdatedById");


--
-- Name: IDX_d4cc56a4a584209ccfc183ead1; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_d4cc56a4a584209ccfc183ead1" ON public.static_lwp_year_group USING btree ("logCreatedById");


--
-- Name: IDX_d4e185faa0eefe66a188e31cb6; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_d4e185faa0eefe66a188e31cb6" ON public.imported_contact USING btree ("lwpUserId");


--
-- Name: IDX_d4f850f36449eb270ed351ffbd; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_d4f850f36449eb270ed351ffbd" ON public.lwp_pupil_activity USING btree ("logCreatedById");


--
-- Name: IDX_d7129a850dfa514a11d7513654; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_d7129a850dfa514a11d7513654" ON public.lwp_pupil_topic USING btree ("deletedById");


--
-- Name: IDX_d7374797c1ac40f19166ffbe6a; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_d7374797c1ac40f19166ffbe6a" ON public.static_lwp_whole_school_sequence_member USING btree ("yearGroupId");


--
-- Name: IDX_d814ad29e9f058105ef64880a4; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_d814ad29e9f058105ef64880a4" ON public.log_parent_topic USING btree ("logUpdatedById");


--
-- Name: IDX_d8becb2a1d3359f1595f45300a; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_d8becb2a1d3359f1595f45300a" ON public.lwp_school_class USING btree ("logUpdatedById");


--
-- Name: IDX_d8cc8a8bb88bb96b14479acd92; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_d8cc8a8bb88bb96b14479acd92" ON public.lwp_user_interstitial USING btree ("logCreatedById");


--
-- Name: IDX_d8e04c34539afb0a8c5c377bab; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_d8e04c34539afb0a8c5c377bab" ON public.static_lwp_topic_domain USING btree ("logCreatedById");


--
-- Name: IDX_d9f63cf96aa629f7dd0f4047af; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_d9f63cf96aa629f7dd0f4047af" ON public.lwp_pupil_feedback USING btree ("logCreatedById");


--
-- Name: IDX_da532eeb17709fb5ab959ee6a9; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_da532eeb17709fb5ab959ee6a9" ON public.lwp_pupil_parent USING btree ("deletedById");


--
-- Name: IDX_da76dd27319e273f02ace9a455; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_da76dd27319e273f02ace9a455" ON public.static_lwp_topic_sequence_item USING btree ("logUpdatedById");


--
-- Name: IDX_dc1a9dffbea825626a6c2822c4; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_dc1a9dffbea825626a6c2822c4" ON public.static_lwp_features USING btree ("logUpdatedById");


--
-- Name: IDX_dc74a6d9174f1d33b88e060828; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_dc74a6d9174f1d33b88e060828" ON public.lwp_user_interstitial USING btree ("deletedById");


--
-- Name: IDX_dca2804565d4955f17444e5347; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_dca2804565d4955f17444e5347" ON public.lwp_parent_pupil USING btree ("lwpPupilId");


--
-- Name: IDX_dd391908d6abde73a14df4423a; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_dd391908d6abde73a14df4423a" ON public.lwp_whole_school_sequence_assignment USING btree ("logCreatedById");


--
-- Name: IDX_ddad7cf69273440f9d517ea51b; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_ddad7cf69273440f9d517ea51b" ON public.static_lwp_topic USING btree ("logCreatedById");


--
-- Name: IDX_dec5239d68bc0f3d6092fdf856; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_dec5239d68bc0f3d6092fdf856" ON public.log_parent_topic USING btree ("logCreatedById");


--
-- Name: IDX_deletedItem_deletedAt_BRIN; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_deletedItem_deletedAt_BRIN" ON ONLY public.deleted_item USING brin ("deletedAt");


--
-- Name: IDX_df0f479d7c2b0d03226a29be8f; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_df0f479d7c2b0d03226a29be8f" ON public.lwp_topic_year_groups USING btree ("staticLwpTopicId");


--
-- Name: IDX_e068b1f1f8fd4dcf849f2b02b0; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_e068b1f1f8fd4dcf849f2b02b0" ON public.static_lwp_topic_domain_year_group USING btree ("logUpdatedById");


--
-- Name: IDX_e0a7de29247f64105fbd742ed6; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_e0a7de29247f64105fbd742ed6" ON public.lwp_trophy_subjects USING btree ("staticLwpSubjectId");


--
-- Name: IDX_e10e3ceb583c0bcd8ba4082baf; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_e10e3ceb583c0bcd8ba4082baf" ON public.lwp_teacher_liked_pupil_activity USING btree ("lwpPupilFeedbackId");


--
-- Name: IDX_e1f843c022ace5ffed5af0e8fe; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_e1f843c022ace5ffed5af0e8fe" ON public.static_lwp_email_template USING btree ("deletedById");


--
-- Name: IDX_e2a73e71fe37d6f70f43ccaa67; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_e2a73e71fe37d6f70f43ccaa67" ON public.lwp_sticker USING btree ("logCreatedById");


--
-- Name: IDX_e3c232d4a37f3374a72b14b327; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_e3c232d4a37f3374a72b14b327" ON public.lwp_notification_event_history USING btree ("notificationId", status);


--
-- Name: IDX_e67ee4033a9902c634ef4bc7d7; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_e67ee4033a9902c634ef4bc7d7" ON public.lwp_pupil_activity USING btree ("logUpdatedById");


--
-- Name: IDX_e82ea8d489cd056e5476bfd274; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_e82ea8d489cd056e5476bfd274" ON public.static_lwp_parameter USING btree ("logUpdatedById");


--
-- Name: IDX_e841fc7d2cf5f6898e719b251f; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_e841fc7d2cf5f6898e719b251f" ON public.static_lwp_trophy USING btree ("logCreatedById");


--
-- Name: IDX_e9dbc23633bec240bcb0278a04; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_e9dbc23633bec240bcb0278a04" ON public.lwp_page_announcement_school_tags USING btree ("staticLwpPageAnnouncementId");


--
-- Name: IDX_ea80fe59ddaa4a932e7232f738; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_ea80fe59ddaa4a932e7232f738" ON public.lwp_set_by_teacher_step_media USING btree ("deletedById");


--
-- Name: IDX_eadc23c6b1ddecdced5f3ad613; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_eadc23c6b1ddecdced5f3ad613" ON public.lwp_set_by_teacher_step_media USING btree ("classTopicId");


--
-- Name: IDX_eb27ed4c12a7b0f71853226c61; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_eb27ed4c12a7b0f71853226c61" ON public.static_lwp_feature_tooltip USING btree (status);


--
-- Name: IDX_ebcafb720cbb9f689516f23023; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_ebcafb720cbb9f689516f23023" ON public.static_lwp_interstitial USING btree ("logCreatedById");


--
-- Name: IDX_ee3f1a4e3dc112c02363da74f0; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_ee3f1a4e3dc112c02363da74f0" ON public.static_lwp_whole_school_sequence_member USING btree ("logCreatedById");


--
-- Name: IDX_ef0ec84bccbb9408c20f1ccb07; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_ef0ec84bccbb9408c20f1ccb07" ON public.lwp_class_pupil USING btree ("lwpSchoolClassId");


--
-- Name: IDX_effc65b4cfba0969bbbbc1f5e8; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_effc65b4cfba0969bbbbc1f5e8" ON public.lwp_pupil_tag_pupil USING btree ("lwpPupilId");


--
-- Name: IDX_f042874b958f3a9c3707d57f02; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_f042874b958f3a9c3707d57f02" ON public.lwp_user_tooltip_history USING btree ("logCreatedById");


--
-- Name: IDX_f0516961726b8118e2e2f6b634; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_f0516961726b8118e2e2f6b634" ON public.lwp_parent_pupil USING btree ("lwpUserId");


--
-- Name: IDX_f08d18a132d1635c944184cb7c; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_f08d18a132d1635c944184cb7c" ON public.log_parent_activity USING btree ("logCreatedById");


--
-- Name: IDX_f0a375b6d7323a6ab4f59c8eca; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_f0a375b6d7323a6ab4f59c8eca" ON public.static_lwp_resource USING btree ("logCreatedById");


--
-- Name: IDX_f0e6e319b36542ad10976c0396; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_f0e6e319b36542ad10976c0396" ON public.lwp_pupil_trophy USING btree ("logCreatedById");


--
-- Name: IDX_f110371c18b6a8ee913f06ea14; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_f110371c18b6a8ee913f06ea14" ON public.lwp_set_by_teacher_step_media USING btree ("stepId");


--
-- Name: IDX_f201e47357276b98d934574b81; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_f201e47357276b98d934574b81" ON public.lwp_set_by_teacher_step_media USING btree ("logUpdatedById");


--
-- Name: IDX_f2292376f78e629b883a794491; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_f2292376f78e629b883a794491" ON public.lwp_feedback_reply USING btree ("feedbackId");


--
-- Name: IDX_f26694a15188cc59278a3a8dc1; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_f26694a15188cc59278a3a8dc1" ON public.static_lwp_email_template USING btree ("logUpdatedById");


--
-- Name: IDX_f7780dc9409a0424be362f0075; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_f7780dc9409a0424be362f0075" ON public.lwp_whole_school_sequence_assignment USING btree ("logUpdatedById");


--
-- Name: IDX_f80895a1ee7491e0d383532988; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_f80895a1ee7491e0d383532988" ON public.lwp_domain_year_groups USING btree ("staticLwpYearGroupId");


--
-- Name: IDX_f8af153fb49519bb073f62708b; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_f8af153fb49519bb073f62708b" ON public.lwp_feedback_reply USING btree ("logUpdatedById");


--
-- Name: IDX_f9d60a30966674e62ef3f7de0f; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_f9d60a30966674e62ef3f7de0f" ON public.lwp_whole_school_sequence_assignment USING btree ("wholeSchoolSequenceId");


--
-- Name: IDX_faf38b707d849f5163c055fea6; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_faf38b707d849f5163c055fea6" ON public.lwp_school_dates USING btree ("logCreatedById");


--
-- Name: IDX_fc671d09c11d32b25117f2b1c6; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_fc671d09c11d32b25117f2b1c6" ON public.static_lwp_topic_domain_year_group USING btree ("logCreatedById");


--
-- Name: IDX_fdd8dcaf2aea58985f026212ae; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_fdd8dcaf2aea58985f026212ae" ON public.static_lwp_feature_tooltip USING btree ("targetId");


--
-- Name: IDX_fef2213d29b4f44db71ed4322c; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_fef2213d29b4f44db71ed4322c" ON public.lwp_parent_pupil_invited USING btree ("lwpPupilId");


--
-- Name: IDX_ff7a0ae6a7badcdee63d9e1451; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_ff7a0ae6a7badcdee63d9e1451" ON public.lwp_notification USING btree ("logUpdatedById");


--
-- Name: deleted_item_default_deletedAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "deleted_item_default_deletedAt_idx" ON public.deleted_item_default USING brin ("deletedAt");


--
-- Name: deleted_item_default_source_recordId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "deleted_item_default_source_recordId_idx" ON public.deleted_item_default USING btree (source, "recordId");


--
-- Name: deleted_item_p20260801_deletedAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "deleted_item_p20260801_deletedAt_idx" ON public.deleted_item_p202608 USING brin ("deletedAt");


--
-- Name: deleted_item_p20260801_source_recordId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "deleted_item_p20260801_source_recordId_idx" ON public.deleted_item_p202608 USING btree (source, "recordId");


--
-- Name: deleted_item_p20260901_deletedAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "deleted_item_p20260901_deletedAt_idx" ON public.deleted_item_p202609 USING brin ("deletedAt");


--
-- Name: deleted_item_p20260901_source_recordId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "deleted_item_p20260901_source_recordId_idx" ON public.deleted_item_p202609 USING btree (source, "recordId");


--
-- Name: deleted_item_p20261001_deletedAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "deleted_item_p20261001_deletedAt_idx" ON public.deleted_item_p202610 USING brin ("deletedAt");


--
-- Name: deleted_item_p20261001_source_recordId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "deleted_item_p20261001_source_recordId_idx" ON public.deleted_item_p202610 USING btree (source, "recordId");


--
-- Name: deleted_item_p20261101_deletedAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "deleted_item_p20261101_deletedAt_idx" ON public.deleted_item_p202611 USING brin ("deletedAt");


--
-- Name: deleted_item_p20261101_source_recordId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "deleted_item_p20261101_source_recordId_idx" ON public.deleted_item_p202611 USING btree (source, "recordId");


--
-- Name: deleted_item_p20261201_deletedAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "deleted_item_p20261201_deletedAt_idx" ON public.deleted_item_p202612 USING brin ("deletedAt");


--
-- Name: deleted_item_p20261201_source_recordId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "deleted_item_p20261201_source_recordId_idx" ON public.deleted_item_p202612 USING btree (source, "recordId");


--
-- Name: idx_analytics_content_fact_activity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_analytics_content_fact_activity ON public.analytics_content_fact USING btree ("activityId");


--
-- Name: idx_analytics_content_fact_activity_time; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_analytics_content_fact_activity_time ON public.analytics_content_fact USING btree ("activityId", "timeKey");


--
-- Name: idx_analytics_content_fact_assignments; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_analytics_content_fact_assignments ON public.analytics_content_fact USING btree ("totalAssignmentsCount") WHERE ("totalAssignmentsCount" > 0);


--
-- Name: idx_analytics_content_fact_segment; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_analytics_content_fact_segment ON public.analytics_content_fact USING btree ("segmentId");


--
-- Name: idx_analytics_content_fact_subject; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_analytics_content_fact_subject ON public.analytics_content_fact USING btree (subject);


--
-- Name: idx_analytics_content_fact_time; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_analytics_content_fact_time ON public.analytics_content_fact USING btree ("timeKey", "timeGrain");


--
-- Name: idx_analytics_content_fact_time_segment; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_analytics_content_fact_time_segment ON public.analytics_content_fact USING btree ("timeKey", "segmentId");


--
-- Name: idx_analytics_content_fact_topic; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_analytics_content_fact_topic ON public.analytics_content_fact USING btree ("topicId");


--
-- Name: idx_analytics_content_fact_topic_segment; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_analytics_content_fact_topic_segment ON public.analytics_content_fact USING btree ("topicId", "segmentId");


--
-- Name: idx_analytics_pupil_dim_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_analytics_pupil_dim_type ON public.analytics_pupil_dim USING btree ("segmentType");


--
-- Name: idx_analytics_pupil_dim_value; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_analytics_pupil_dim_value ON public.analytics_pupil_dim USING btree ("segmentValue");


--
-- Name: idx_analytics_pupil_fact_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_analytics_pupil_fact_active ON public.analytics_pupil_fact USING btree ("isActive") WHERE ("isActive" = true);


--
-- Name: idx_analytics_pupil_fact_pp; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_analytics_pupil_fact_pp ON public.analytics_pupil_fact USING btree ("isPupilPremium");


--
-- Name: idx_analytics_pupil_fact_pupil; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_analytics_pupil_fact_pupil ON public.analytics_pupil_fact USING btree ("pupilId");


--
-- Name: idx_analytics_pupil_fact_school; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_analytics_pupil_fact_school ON public.analytics_pupil_fact USING btree ("schoolId");


--
-- Name: idx_analytics_pupil_fact_school_time; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_analytics_pupil_fact_school_time ON public.analytics_pupil_fact USING btree ("schoolId", "timeKey", "timeGrain");


--
-- Name: idx_analytics_pupil_fact_subject; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_analytics_pupil_fact_subject ON public.analytics_pupil_fact USING btree ("subjectId");


--
-- Name: idx_analytics_pupil_fact_time; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_analytics_pupil_fact_time ON public.analytics_pupil_fact USING btree ("timeKey", "timeGrain");


--
-- Name: idx_analytics_school_fact_schoolid; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_analytics_school_fact_schoolid ON public.analytics_school_fact USING btree ("schoolId");


--
-- Name: idx_analytics_school_fact_subjectid; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_analytics_school_fact_subjectid ON public.analytics_school_fact USING btree ("subjectId");


--
-- Name: idx_analytics_school_fact_timekey; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_analytics_school_fact_timekey ON public.analytics_school_fact USING btree ("timeKey");


--
-- Name: idx_analytics_schools_in_groups_dim_group; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_analytics_schools_in_groups_dim_group ON public.analytics_schools_in_groups_dim USING btree ("groupId");


--
-- Name: idx_analytics_schools_in_groups_dim_school; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_analytics_schools_in_groups_dim_school ON public.analytics_schools_in_groups_dim USING btree ("schoolId");


--
-- Name: idx_class_release_due; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_class_release_due ON public.lwp_class_topic USING btree ("classId", "releaseDate", "dueDate");


--
-- Name: idx_email_template_type_temporal_search; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_email_template_type_temporal_search ON public.lwp_notification USING btree ("emailTemplateType", status, "logCreatedAt");


--
-- Name: idx_schoolTag; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "idx_schoolTag" ON public.static_lwp_program USING btree ("schoolTagId");


--
-- Name: idx_statusLogs_newStatus_prevStatus_logCreatedAt; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_statusLogs_newStatus_prevStatus_logCreatedAt" ON public.log_lwp_entity_status_change USING btree ("newStatus", "previousStatus", "logCreatedAt");


--
-- Name: idx_unique_order_topic; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_unique_order_topic ON public.static_lwp_activity USING btree ("order", "topicId");


--
-- Name: idx_unique_school_isprogramtag; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_unique_school_isprogramtag ON public.lwp_school_static_tags USING btree ("schoolId", "isProgramTag") WHERE ("isProgramTag" = true);


--
-- Name: idx_unique_user_interstitial; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_unique_user_interstitial ON public.lwp_user_interstitial USING btree ("userId", "interstitialId");


--
-- Name: idx_unique_user_pageAnnouncement; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "idx_unique_user_pageAnnouncement" ON public.lwp_user_page_announcement USING btree ("userId", "pageAnnouncementId");


--
-- Name: idx_unique_whole_school_assignment_live; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_unique_whole_school_assignment_live ON public.lwp_whole_school_sequence_assignment USING btree ("schoolId", "subjectId", "periodIndex") WHERE ((status)::text = 'ASSIGNED'::text);


--
-- Name: lwp_pupil_activity_pupilid_activityid_topicid_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX lwp_pupil_activity_pupilid_activityid_topicid_idx ON public.lwp_pupil_activity USING btree ("activityId", "pupilId", "topicId");


--
-- Name: lwp_pupil_activity_pupilid_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX lwp_pupil_activity_pupilid_idx ON public.lwp_pupil_activity USING btree ("pupilId");


--
-- Name: lwp_pupil_activity_topicid_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX lwp_pupil_activity_topicid_idx ON public.lwp_pupil_activity USING btree ("topicId");


--
-- Name: lwp_pupil_feedback_activityid_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX lwp_pupil_feedback_activityid_idx ON public.lwp_pupil_feedback USING btree ("activityId");


--
-- Name: lwp_pupil_feedback_bookname_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX lwp_pupil_feedback_bookname_id_idx ON public.lwp_pupil_feedback USING btree ("normalisedBookName", id);


--
-- Name: lwp_pupil_feedback_readingmode_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX lwp_pupil_feedback_readingmode_idx ON public.lwp_pupil_feedback USING btree ("readingMode") WHERE ("readingMode" IS NOT NULL);


--
-- Name: lwp_pupil_feedback_type_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX lwp_pupil_feedback_type_id ON public.lwp_pupil_feedback USING btree (type, id);


--
-- Name: lwp_pupil_parent_pupilid_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX lwp_pupil_parent_pupilid_idx ON public.lwp_pupil_parent USING btree ("pupilId");


--
-- Name: lwp_pupil_topic_pupilid_classtopicid_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX lwp_pupil_topic_pupilid_classtopicid_idx ON public.lwp_pupil_topic USING btree ("classTopicId", "pupilId");


--
-- Name: lwp_pupil_topic_pupilid_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX lwp_pupil_topic_pupilid_idx ON public.lwp_pupil_topic USING btree ("pupilId");


--
-- Name: lwp_pupil_topic_pupilid_periodindex_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX lwp_pupil_topic_pupilid_periodindex_idx ON public.lwp_pupil_topic USING btree ("pupilId", "periodIndex");


--
-- Name: lwp_school_class_schoolid_periodindex_isregclass_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX lwp_school_class_schoolid_periodindex_isregclass_status_idx ON public.lwp_school_class USING btree ("schoolId", "periodIndex", "isRegistrationClass", status);


--
-- Name: lwp_user_session_user_refresh_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX lwp_user_session_user_refresh_idx ON public.lwp_user_session USING btree ("userId", "refreshToken");


--
-- Name: lwp_view_parent_pupil_action_stats_actionId_param2_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "lwp_view_parent_pupil_action_stats_actionId_param2_idx" ON public.lwp_view_parent_pupil_action_stats USING btree ("actionId", param2);


--
-- Name: lwp_view_parent_pupil_action_stats_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX lwp_view_parent_pupil_action_stats_id_idx ON public.lwp_view_parent_pupil_action_stats USING btree (id);


--
-- Name: lwp_view_parent_pupil_action_stats_pupilId_parentId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "lwp_view_parent_pupil_action_stats_pupilId_parentId_idx" ON public.lwp_view_parent_pupil_action_stats USING btree ("pupilId", "parentId");


--
-- Name: lwp_view_parent_pupil_action_stats_time_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX lwp_view_parent_pupil_action_stats_time_idx ON public.lwp_view_parent_pupil_action_stats USING btree ("time");


--
-- Name: lwp_view_parent_pupil_action_stats_userId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "lwp_view_parent_pupil_action_stats_userId_idx" ON public.lwp_view_parent_pupil_action_stats USING btree ("userId");


--
-- Name: lwp_view_spm_school_class_reading_targets_classId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "lwp_view_spm_school_class_reading_targets_classId_idx" ON public.lwp_view_spm_school_class_reading_targets USING btree ("classId");


--
-- Name: lwp_view_spm_school_class_reading_targets_schoolId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "lwp_view_spm_school_class_reading_targets_schoolId_idx" ON public.lwp_view_spm_school_class_reading_targets USING btree ("schoolId");


--
-- Name: lwp_view_spm_school_metrics_schoolId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "lwp_view_spm_school_metrics_schoolId_idx" ON public.lwp_view_spm_school_metrics USING btree ("schoolId");


--
-- Name: deleted_item_default_deletedAt_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public."IDX_deletedItem_deletedAt_BRIN" ATTACH PARTITION public."deleted_item_default_deletedAt_idx";


--
-- Name: deleted_item_default_source_recordId_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public."IDX_4db45ebcfe911a159ec87fb82c" ATTACH PARTITION public."deleted_item_default_source_recordId_idx";


--
-- Name: deleted_item_p20260801_deletedAt_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public."IDX_deletedItem_deletedAt_BRIN" ATTACH PARTITION public."deleted_item_p20260801_deletedAt_idx";


--
-- Name: deleted_item_p20260801_source_recordId_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public."IDX_4db45ebcfe911a159ec87fb82c" ATTACH PARTITION public."deleted_item_p20260801_source_recordId_idx";


--
-- Name: deleted_item_p20260901_deletedAt_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public."IDX_deletedItem_deletedAt_BRIN" ATTACH PARTITION public."deleted_item_p20260901_deletedAt_idx";


--
-- Name: deleted_item_p20260901_source_recordId_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public."IDX_4db45ebcfe911a159ec87fb82c" ATTACH PARTITION public."deleted_item_p20260901_source_recordId_idx";


--
-- Name: deleted_item_p20261001_deletedAt_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public."IDX_deletedItem_deletedAt_BRIN" ATTACH PARTITION public."deleted_item_p20261001_deletedAt_idx";


--
-- Name: deleted_item_p20261001_source_recordId_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public."IDX_4db45ebcfe911a159ec87fb82c" ATTACH PARTITION public."deleted_item_p20261001_source_recordId_idx";


--
-- Name: deleted_item_p20261101_deletedAt_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public."IDX_deletedItem_deletedAt_BRIN" ATTACH PARTITION public."deleted_item_p20261101_deletedAt_idx";


--
-- Name: deleted_item_p20261101_source_recordId_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public."IDX_4db45ebcfe911a159ec87fb82c" ATTACH PARTITION public."deleted_item_p20261101_source_recordId_idx";


--
-- Name: deleted_item_p20261201_deletedAt_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public."IDX_deletedItem_deletedAt_BRIN" ATTACH PARTITION public."deleted_item_p20261201_deletedAt_idx";


--
-- Name: deleted_item_p20261201_source_recordId_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public."IDX_4db45ebcfe911a159ec87fb82c" ATTACH PARTITION public."deleted_item_p20261201_source_recordId_idx";


--
-- Name: lwp_notification_event_history after_lwp_notification_event_history_change; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER after_lwp_notification_event_history_change AFTER INSERT OR DELETE OR UPDATE ON public.lwp_notification_event_history FOR EACH ROW EXECUTE FUNCTION public.update_lwp_notification_from_event_history();


--
-- Name: lwp_notification after_lwp_notification_insert; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER after_lwp_notification_insert AFTER INSERT ON public.lwp_notification FOR EACH ROW EXECUTE FUNCTION public.insert_lwp_notification_event_history();


--
-- Name: lwp_school_static_tags before_lwp_school_static_tags_change; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER before_lwp_school_static_tags_change BEFORE INSERT OR UPDATE ON public.lwp_school_static_tags FOR EACH ROW EXECUTE FUNCTION public.set_is_program_tag();


--
-- Name: static_lwp_program before_static_lwp_program_change; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER before_static_lwp_program_change AFTER INSERT OR UPDATE ON public.static_lwp_program FOR EACH ROW EXECUTE FUNCTION public.set_is_program_tag();


--
-- Name: lwp_pupil_parent check_lwp_pupil_parent_users_must_be_parents; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER check_lwp_pupil_parent_users_must_be_parents BEFORE INSERT OR UPDATE OF "parentId" ON public.lwp_pupil_parent FOR EACH ROW EXECUTE FUNCTION public.check_lwp_pupil_parent_user_is_a_parent();


--
-- Name: migrations create_delete_auditing_triggers; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER create_delete_auditing_triggers AFTER INSERT ON public.migrations FOR EACH STATEMENT EXECUTE FUNCTION public.do_create_delete_auditing_triggers();


--
-- Name: migrations create_deleted_by_deletion_triggers; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER create_deleted_by_deletion_triggers AFTER INSERT ON public.migrations FOR EACH STATEMENT EXECUTE FUNCTION public.do_create_deleted_by_deletion_triggers();


--
-- Name: lwp_activity_tags delete_auditing; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER delete_auditing BEFORE DELETE ON public.lwp_activity_tags FOR EACH ROW EXECUTE FUNCTION public.do_delete_auditing();


--
-- Name: lwp_admin_sticker_school_status delete_auditing; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER delete_auditing BEFORE DELETE ON public.lwp_admin_sticker_school_status FOR EACH ROW EXECUTE FUNCTION public.do_delete_auditing();


--
-- Name: lwp_blog_post delete_auditing; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER delete_auditing BEFORE DELETE ON public.lwp_blog_post FOR EACH ROW EXECUTE FUNCTION public.do_delete_auditing();


--
-- Name: lwp_class_pupil delete_auditing; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER delete_auditing BEFORE DELETE ON public.lwp_class_pupil FOR EACH ROW EXECUTE FUNCTION public.do_delete_auditing();


--
-- Name: lwp_class_sequence_assignment delete_auditing; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER delete_auditing BEFORE DELETE ON public.lwp_class_sequence_assignment FOR EACH ROW EXECUTE FUNCTION public.do_delete_auditing();


--
-- Name: lwp_class_subjects delete_auditing; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER delete_auditing BEFORE DELETE ON public.lwp_class_subjects FOR EACH ROW EXECUTE FUNCTION public.do_delete_auditing();


--
-- Name: lwp_class_teacher delete_auditing; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER delete_auditing BEFORE DELETE ON public.lwp_class_teacher FOR EACH ROW EXECUTE FUNCTION public.do_delete_auditing();


--
-- Name: lwp_class_topic delete_auditing; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER delete_auditing BEFORE DELETE ON public.lwp_class_topic FOR EACH ROW EXECUTE FUNCTION public.do_delete_auditing();


--
-- Name: lwp_demo_activity_feedback delete_auditing; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER delete_auditing BEFORE DELETE ON public.lwp_demo_activity_feedback FOR EACH ROW EXECUTE FUNCTION public.do_delete_auditing();


--
-- Name: lwp_domain_year_groups delete_auditing; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER delete_auditing BEFORE DELETE ON public.lwp_domain_year_groups FOR EACH ROW EXECUTE FUNCTION public.do_delete_auditing();


--
-- Name: lwp_features_school_tags delete_auditing; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER delete_auditing BEFORE DELETE ON public.lwp_features_school_tags FOR EACH ROW EXECUTE FUNCTION public.do_delete_auditing();


--
-- Name: lwp_feedback_reply delete_auditing; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER delete_auditing BEFORE DELETE ON public.lwp_feedback_reply FOR EACH ROW EXECUTE FUNCTION public.do_delete_auditing();


--
-- Name: lwp_magic_link delete_auditing; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER delete_auditing BEFORE DELETE ON public.lwp_magic_link FOR EACH ROW EXECUTE FUNCTION public.do_delete_auditing();


--
-- Name: lwp_notification delete_auditing; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER delete_auditing BEFORE DELETE ON public.lwp_notification FOR EACH ROW EXECUTE FUNCTION public.do_delete_auditing();


--
-- Name: lwp_notification_event_history delete_auditing; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER delete_auditing BEFORE DELETE ON public.lwp_notification_event_history FOR EACH ROW EXECUTE FUNCTION public.do_delete_auditing();


--
-- Name: lwp_page_announcement_school_tags delete_auditing; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER delete_auditing BEFORE DELETE ON public.lwp_page_announcement_school_tags FOR EACH ROW EXECUTE FUNCTION public.do_delete_auditing();


--
-- Name: lwp_parent_pupil delete_auditing; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER delete_auditing BEFORE DELETE ON public.lwp_parent_pupil FOR EACH ROW EXECUTE FUNCTION public.do_delete_auditing();


--
-- Name: lwp_parent_pupil_imported delete_auditing; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER delete_auditing BEFORE DELETE ON public.lwp_parent_pupil_imported FOR EACH ROW EXECUTE FUNCTION public.do_delete_auditing();


--
-- Name: lwp_parent_pupil_invited delete_auditing; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER delete_auditing BEFORE DELETE ON public.lwp_parent_pupil_invited FOR EACH ROW EXECUTE FUNCTION public.do_delete_auditing();


--
-- Name: lwp_pupil delete_auditing; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER delete_auditing BEFORE DELETE ON public.lwp_pupil FOR EACH ROW EXECUTE FUNCTION public.do_delete_auditing();


--
-- Name: lwp_pupil_activity delete_auditing; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER delete_auditing BEFORE DELETE ON public.lwp_pupil_activity FOR EACH ROW EXECUTE FUNCTION public.do_delete_auditing();


--
-- Name: lwp_pupil_activity_feedback delete_auditing; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER delete_auditing BEFORE DELETE ON public.lwp_pupil_activity_feedback FOR EACH ROW EXECUTE FUNCTION public.do_delete_auditing();


--
-- Name: lwp_pupil_feedback delete_auditing; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER delete_auditing BEFORE DELETE ON public.lwp_pupil_feedback FOR EACH ROW EXECUTE FUNCTION public.do_delete_auditing();


--
-- Name: lwp_pupil_feedback_edit_log delete_auditing; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER delete_auditing BEFORE DELETE ON public.lwp_pupil_feedback_edit_log FOR EACH ROW EXECUTE FUNCTION public.do_delete_auditing();


--
-- Name: lwp_pupil_feedback_history delete_auditing; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER delete_auditing BEFORE DELETE ON public.lwp_pupil_feedback_history FOR EACH ROW EXECUTE FUNCTION public.do_delete_auditing();


--
-- Name: lwp_pupil_feedback_media delete_auditing; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER delete_auditing BEFORE DELETE ON public.lwp_pupil_feedback_media FOR EACH ROW EXECUTE FUNCTION public.do_delete_auditing();


--
-- Name: lwp_pupil_mathscot delete_auditing; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER delete_auditing BEFORE DELETE ON public.lwp_pupil_mathscot FOR EACH ROW EXECUTE FUNCTION public.do_delete_auditing();


--
-- Name: lwp_pupil_parent delete_auditing; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER delete_auditing BEFORE DELETE ON public.lwp_pupil_parent FOR EACH ROW EXECUTE FUNCTION public.do_delete_auditing();


--
-- Name: lwp_pupil_tag delete_auditing; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER delete_auditing BEFORE DELETE ON public.lwp_pupil_tag FOR EACH ROW EXECUTE FUNCTION public.do_delete_auditing();


--
-- Name: lwp_pupil_tag_pupil delete_auditing; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER delete_auditing BEFORE DELETE ON public.lwp_pupil_tag_pupil FOR EACH ROW EXECUTE FUNCTION public.do_delete_auditing();


--
-- Name: lwp_pupil_topic delete_auditing; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER delete_auditing BEFORE DELETE ON public.lwp_pupil_topic FOR EACH ROW EXECUTE FUNCTION public.do_delete_auditing();


--
-- Name: lwp_pupil_topic_sbt_step_media delete_auditing; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER delete_auditing BEFORE DELETE ON public.lwp_pupil_topic_sbt_step_media FOR EACH ROW EXECUTE FUNCTION public.do_delete_auditing();


--
-- Name: lwp_pupil_trophy delete_auditing; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER delete_auditing BEFORE DELETE ON public.lwp_pupil_trophy FOR EACH ROW EXECUTE FUNCTION public.do_delete_auditing();


--
-- Name: lwp_reading_log delete_auditing; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER delete_auditing BEFORE DELETE ON public.lwp_reading_log FOR EACH ROW EXECUTE FUNCTION public.do_delete_auditing();


--
-- Name: lwp_school delete_auditing; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER delete_auditing BEFORE DELETE ON public.lwp_school FOR EACH ROW EXECUTE FUNCTION public.do_delete_auditing();


--
-- Name: lwp_school_class delete_auditing; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER delete_auditing BEFORE DELETE ON public.lwp_school_class FOR EACH ROW EXECUTE FUNCTION public.do_delete_auditing();


--
-- Name: lwp_school_dates delete_auditing; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER delete_auditing BEFORE DELETE ON public.lwp_school_dates FOR EACH ROW EXECUTE FUNCTION public.do_delete_auditing();


--
-- Name: lwp_school_holiday delete_auditing; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER delete_auditing BEFORE DELETE ON public.lwp_school_holiday FOR EACH ROW EXECUTE FUNCTION public.do_delete_auditing();


--
-- Name: lwp_school_holidays delete_auditing; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER delete_auditing BEFORE DELETE ON public.lwp_school_holidays FOR EACH ROW EXECUTE FUNCTION public.do_delete_auditing();


--
-- Name: lwp_school_impact_report delete_auditing; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER delete_auditing BEFORE DELETE ON public.lwp_school_impact_report FOR EACH ROW EXECUTE FUNCTION public.do_delete_auditing();


--
-- Name: lwp_school_impact_report_feedback delete_auditing; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER delete_auditing BEFORE DELETE ON public.lwp_school_impact_report_feedback FOR EACH ROW EXECUTE FUNCTION public.do_delete_auditing();


--
-- Name: lwp_school_impact_report_graphs delete_auditing; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER delete_auditing BEFORE DELETE ON public.lwp_school_impact_report_graphs FOR EACH ROW EXECUTE FUNCTION public.do_delete_auditing();


--
-- Name: lwp_school_static_tags delete_auditing; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER delete_auditing BEFORE DELETE ON public.lwp_school_static_tags FOR EACH ROW EXECUTE FUNCTION public.do_delete_auditing();


--
-- Name: lwp_set_by_teacher_step_media delete_auditing; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER delete_auditing BEFORE DELETE ON public.lwp_set_by_teacher_step_media FOR EACH ROW EXECUTE FUNCTION public.do_delete_auditing();


--
-- Name: lwp_sticker delete_auditing; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER delete_auditing BEFORE DELETE ON public.lwp_sticker FOR EACH ROW EXECUTE FUNCTION public.do_delete_auditing();


--
-- Name: lwp_sticker_character_item delete_auditing; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER delete_auditing BEFORE DELETE ON public.lwp_sticker_character_item FOR EACH ROW EXECUTE FUNCTION public.do_delete_auditing();


--
-- Name: lwp_teacher_liked_pupil_activity delete_auditing; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER delete_auditing BEFORE DELETE ON public.lwp_teacher_liked_pupil_activity FOR EACH ROW EXECUTE FUNCTION public.do_delete_auditing();


--
-- Name: lwp_token delete_auditing; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER delete_auditing BEFORE DELETE ON public.lwp_token FOR EACH ROW EXECUTE FUNCTION public.do_delete_auditing();


--
-- Name: lwp_topic_school_tags delete_auditing; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER delete_auditing BEFORE DELETE ON public.lwp_topic_school_tags FOR EACH ROW EXECUTE FUNCTION public.do_delete_auditing();


--
-- Name: lwp_topic_tags delete_auditing; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER delete_auditing BEFORE DELETE ON public.lwp_topic_tags FOR EACH ROW EXECUTE FUNCTION public.do_delete_auditing();


--
-- Name: lwp_topic_year_groups delete_auditing; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER delete_auditing BEFORE DELETE ON public.lwp_topic_year_groups FOR EACH ROW EXECUTE FUNCTION public.do_delete_auditing();


--
-- Name: lwp_trophy_subjects delete_auditing; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER delete_auditing BEFORE DELETE ON public.lwp_trophy_subjects FOR EACH ROW EXECUTE FUNCTION public.do_delete_auditing();


--
-- Name: lwp_user delete_auditing; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER delete_auditing BEFORE DELETE ON public.lwp_user FOR EACH ROW EXECUTE FUNCTION public.do_delete_auditing();


--
-- Name: lwp_user_associated_login delete_auditing; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER delete_auditing BEFORE DELETE ON public.lwp_user_associated_login FOR EACH ROW EXECUTE FUNCTION public.do_delete_auditing();


--
-- Name: lwp_user_interstitial delete_auditing; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER delete_auditing BEFORE DELETE ON public.lwp_user_interstitial FOR EACH ROW EXECUTE FUNCTION public.do_delete_auditing();


--
-- Name: lwp_user_page_announcement delete_auditing; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER delete_auditing BEFORE DELETE ON public.lwp_user_page_announcement FOR EACH ROW EXECUTE FUNCTION public.do_delete_auditing();


--
-- Name: lwp_user_session delete_auditing; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER delete_auditing BEFORE DELETE ON public.lwp_user_session FOR EACH ROW EXECUTE FUNCTION public.do_delete_auditing();


--
-- Name: lwp_user_tooltip_history delete_auditing; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER delete_auditing BEFORE DELETE ON public.lwp_user_tooltip_history FOR EACH ROW EXECUTE FUNCTION public.do_delete_auditing();


--
-- Name: lwp_whole_school_sequence_assignment delete_auditing; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER delete_auditing BEFORE DELETE ON public.lwp_whole_school_sequence_assignment FOR EACH ROW EXECUTE FUNCTION public.do_delete_auditing();


--
-- Name: static_lwp_activity delete_auditing; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER delete_auditing BEFORE DELETE ON public.static_lwp_activity FOR EACH ROW EXECUTE FUNCTION public.do_delete_auditing();


--
-- Name: static_lwp_activity_steps delete_auditing; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER delete_auditing BEFORE DELETE ON public.static_lwp_activity_steps FOR EACH ROW EXECUTE FUNCTION public.do_delete_auditing();


--
-- Name: static_lwp_activity_tag delete_auditing; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER delete_auditing BEFORE DELETE ON public.static_lwp_activity_tag FOR EACH ROW EXECUTE FUNCTION public.do_delete_auditing();


--
-- Name: static_lwp_admin_query delete_auditing; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER delete_auditing BEFORE DELETE ON public.static_lwp_admin_query FOR EACH ROW EXECUTE FUNCTION public.do_delete_auditing();


--
-- Name: static_lwp_contact delete_auditing; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER delete_auditing BEFORE DELETE ON public.static_lwp_contact FOR EACH ROW EXECUTE FUNCTION public.do_delete_auditing();


--
-- Name: static_lwp_data_query delete_auditing; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER delete_auditing BEFORE DELETE ON public.static_lwp_data_query FOR EACH ROW EXECUTE FUNCTION public.do_delete_auditing();


--
-- Name: static_lwp_email_template delete_auditing; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER delete_auditing BEFORE DELETE ON public.static_lwp_email_template FOR EACH ROW EXECUTE FUNCTION public.do_delete_auditing();


--
-- Name: static_lwp_faq delete_auditing; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER delete_auditing BEFORE DELETE ON public.static_lwp_faq FOR EACH ROW EXECUTE FUNCTION public.do_delete_auditing();


--
-- Name: static_lwp_feature_tooltip delete_auditing; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER delete_auditing BEFORE DELETE ON public.static_lwp_feature_tooltip FOR EACH ROW EXECUTE FUNCTION public.do_delete_auditing();


--
-- Name: static_lwp_features delete_auditing; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER delete_auditing BEFORE DELETE ON public.static_lwp_features FOR EACH ROW EXECUTE FUNCTION public.do_delete_auditing();


--
-- Name: static_lwp_files delete_auditing; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER delete_auditing BEFORE DELETE ON public.static_lwp_files FOR EACH ROW EXECUTE FUNCTION public.do_delete_auditing();


--
-- Name: static_lwp_interstitial delete_auditing; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER delete_auditing BEFORE DELETE ON public.static_lwp_interstitial FOR EACH ROW EXECUTE FUNCTION public.do_delete_auditing();


--
-- Name: static_lwp_interstitial_school_tags delete_auditing; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER delete_auditing BEFORE DELETE ON public.static_lwp_interstitial_school_tags FOR EACH ROW EXECUTE FUNCTION public.do_delete_auditing();


--
-- Name: static_lwp_logo delete_auditing; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER delete_auditing BEFORE DELETE ON public.static_lwp_logo FOR EACH ROW EXECUTE FUNCTION public.do_delete_auditing();


--
-- Name: static_lwp_mathscot_item delete_auditing; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER delete_auditing BEFORE DELETE ON public.static_lwp_mathscot_item FOR EACH ROW EXECUTE FUNCTION public.do_delete_auditing();


--
-- Name: static_lwp_modal delete_auditing; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER delete_auditing BEFORE DELETE ON public.static_lwp_modal FOR EACH ROW EXECUTE FUNCTION public.do_delete_auditing();


--
-- Name: static_lwp_news delete_auditing; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER delete_auditing BEFORE DELETE ON public.static_lwp_news FOR EACH ROW EXECUTE FUNCTION public.do_delete_auditing();


--
-- Name: static_lwp_page_announcement delete_auditing; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER delete_auditing BEFORE DELETE ON public.static_lwp_page_announcement FOR EACH ROW EXECUTE FUNCTION public.do_delete_auditing();


--
-- Name: static_lwp_parameter delete_auditing; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER delete_auditing BEFORE DELETE ON public.static_lwp_parameter FOR EACH ROW EXECUTE FUNCTION public.do_delete_auditing();


--
-- Name: static_lwp_period delete_auditing; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER delete_auditing BEFORE DELETE ON public.static_lwp_period FOR EACH ROW EXECUTE FUNCTION public.do_delete_auditing();


--
-- Name: static_lwp_program delete_auditing; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER delete_auditing BEFORE DELETE ON public.static_lwp_program FOR EACH ROW EXECUTE FUNCTION public.do_delete_auditing();


--
-- Name: static_lwp_resource delete_auditing; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER delete_auditing BEFORE DELETE ON public.static_lwp_resource FOR EACH ROW EXECUTE FUNCTION public.do_delete_auditing();


--
-- Name: static_lwp_school_tag delete_auditing; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER delete_auditing BEFORE DELETE ON public.static_lwp_school_tag FOR EACH ROW EXECUTE FUNCTION public.do_delete_auditing();


--
-- Name: static_lwp_staff delete_auditing; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER delete_auditing BEFORE DELETE ON public.static_lwp_staff FOR EACH ROW EXECUTE FUNCTION public.do_delete_auditing();


--
-- Name: static_lwp_subject delete_auditing; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER delete_auditing BEFORE DELETE ON public.static_lwp_subject FOR EACH ROW EXECUTE FUNCTION public.do_delete_auditing();


--
-- Name: static_lwp_topic delete_auditing; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER delete_auditing BEFORE DELETE ON public.static_lwp_topic FOR EACH ROW EXECUTE FUNCTION public.do_delete_auditing();


--
-- Name: static_lwp_topic_domain delete_auditing; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER delete_auditing BEFORE DELETE ON public.static_lwp_topic_domain FOR EACH ROW EXECUTE FUNCTION public.do_delete_auditing();


--
-- Name: static_lwp_topic_domain_year_group delete_auditing; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER delete_auditing BEFORE DELETE ON public.static_lwp_topic_domain_year_group FOR EACH ROW EXECUTE FUNCTION public.do_delete_auditing();


--
-- Name: static_lwp_topic_sequence delete_auditing; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER delete_auditing BEFORE DELETE ON public.static_lwp_topic_sequence FOR EACH ROW EXECUTE FUNCTION public.do_delete_auditing();


--
-- Name: static_lwp_topic_sequence_item delete_auditing; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER delete_auditing BEFORE DELETE ON public.static_lwp_topic_sequence_item FOR EACH ROW EXECUTE FUNCTION public.do_delete_auditing();


--
-- Name: static_lwp_topic_tag delete_auditing; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER delete_auditing BEFORE DELETE ON public.static_lwp_topic_tag FOR EACH ROW EXECUTE FUNCTION public.do_delete_auditing();


--
-- Name: static_lwp_trophy delete_auditing; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER delete_auditing BEFORE DELETE ON public.static_lwp_trophy FOR EACH ROW EXECUTE FUNCTION public.do_delete_auditing();


--
-- Name: static_lwp_video_tutorial delete_auditing; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER delete_auditing BEFORE DELETE ON public.static_lwp_video_tutorial FOR EACH ROW EXECUTE FUNCTION public.do_delete_auditing();


--
-- Name: static_lwp_whole_school_sequence delete_auditing; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER delete_auditing BEFORE DELETE ON public.static_lwp_whole_school_sequence FOR EACH ROW EXECUTE FUNCTION public.do_delete_auditing();


--
-- Name: static_lwp_whole_school_sequence_member delete_auditing; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER delete_auditing BEFORE DELETE ON public.static_lwp_whole_school_sequence_member FOR EACH ROW EXECUTE FUNCTION public.do_delete_auditing();


--
-- Name: static_lwp_year_group delete_auditing; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER delete_auditing BEFORE DELETE ON public.static_lwp_year_group FOR EACH ROW EXECUTE FUNCTION public.do_delete_auditing();


--
-- Name: lwp_class_topic delete_on_deleted_by_set; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER delete_on_deleted_by_set AFTER UPDATE ON public.lwp_class_topic FOR EACH ROW WHEN (((old."deletedById" IS NULL) AND (new."deletedById" IS NOT NULL))) EXECUTE FUNCTION public.do_delete_on_deleted_by_set();


--
-- Name: lwp_demo_activity_feedback delete_on_deleted_by_set; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER delete_on_deleted_by_set AFTER UPDATE ON public.lwp_demo_activity_feedback FOR EACH ROW WHEN (((old."deletedById" IS NULL) AND (new."deletedById" IS NOT NULL))) EXECUTE FUNCTION public.do_delete_on_deleted_by_set();


--
-- Name: lwp_feedback_reply delete_on_deleted_by_set; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER delete_on_deleted_by_set AFTER UPDATE ON public.lwp_feedback_reply FOR EACH ROW WHEN (((old."deletedById" IS NULL) AND (new."deletedById" IS NOT NULL))) EXECUTE FUNCTION public.do_delete_on_deleted_by_set();


--
-- Name: lwp_pupil delete_on_deleted_by_set; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER delete_on_deleted_by_set AFTER UPDATE ON public.lwp_pupil FOR EACH ROW WHEN (((old."deletedById" IS NULL) AND (new."deletedById" IS NOT NULL))) EXECUTE FUNCTION public.do_delete_on_deleted_by_set();


--
-- Name: lwp_pupil_activity delete_on_deleted_by_set; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER delete_on_deleted_by_set AFTER UPDATE ON public.lwp_pupil_activity FOR EACH ROW WHEN (((old."deletedById" IS NULL) AND (new."deletedById" IS NOT NULL))) EXECUTE FUNCTION public.do_delete_on_deleted_by_set();


--
-- Name: lwp_pupil_activity_feedback delete_on_deleted_by_set; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER delete_on_deleted_by_set AFTER UPDATE ON public.lwp_pupil_activity_feedback FOR EACH ROW WHEN (((old."deletedById" IS NULL) AND (new."deletedById" IS NOT NULL))) EXECUTE FUNCTION public.do_delete_on_deleted_by_set();


--
-- Name: lwp_pupil_feedback delete_on_deleted_by_set; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER delete_on_deleted_by_set AFTER UPDATE ON public.lwp_pupil_feedback FOR EACH ROW WHEN (((old."deletedById" IS NULL) AND (new."deletedById" IS NOT NULL))) EXECUTE FUNCTION public.do_delete_on_deleted_by_set();


--
-- Name: lwp_pupil_feedback_media delete_on_deleted_by_set; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER delete_on_deleted_by_set AFTER UPDATE ON public.lwp_pupil_feedback_media FOR EACH ROW WHEN (((old."deletedById" IS NULL) AND (new."deletedById" IS NOT NULL))) EXECUTE FUNCTION public.do_delete_on_deleted_by_set();


--
-- Name: lwp_pupil_parent delete_on_deleted_by_set; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER delete_on_deleted_by_set AFTER UPDATE ON public.lwp_pupil_parent FOR EACH ROW WHEN (((old."deletedById" IS NULL) AND (new."deletedById" IS NOT NULL))) EXECUTE FUNCTION public.do_delete_on_deleted_by_set();


--
-- Name: lwp_pupil_tag delete_on_deleted_by_set; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER delete_on_deleted_by_set AFTER UPDATE ON public.lwp_pupil_tag FOR EACH ROW WHEN (((old."deletedById" IS NULL) AND (new."deletedById" IS NOT NULL))) EXECUTE FUNCTION public.do_delete_on_deleted_by_set();


--
-- Name: lwp_pupil_topic delete_on_deleted_by_set; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER delete_on_deleted_by_set AFTER UPDATE ON public.lwp_pupil_topic FOR EACH ROW WHEN (((old."deletedById" IS NULL) AND (new."deletedById" IS NOT NULL))) EXECUTE FUNCTION public.do_delete_on_deleted_by_set();


--
-- Name: lwp_school delete_on_deleted_by_set; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER delete_on_deleted_by_set AFTER UPDATE ON public.lwp_school FOR EACH ROW WHEN (((old."deletedById" IS NULL) AND (new."deletedById" IS NOT NULL))) EXECUTE FUNCTION public.do_delete_on_deleted_by_set();


--
-- Name: lwp_school_class delete_on_deleted_by_set; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER delete_on_deleted_by_set AFTER UPDATE ON public.lwp_school_class FOR EACH ROW WHEN (((old."deletedById" IS NULL) AND (new."deletedById" IS NOT NULL))) EXECUTE FUNCTION public.do_delete_on_deleted_by_set();


--
-- Name: lwp_school_holiday delete_on_deleted_by_set; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER delete_on_deleted_by_set AFTER UPDATE ON public.lwp_school_holiday FOR EACH ROW WHEN (((old."deletedById" IS NULL) AND (new."deletedById" IS NOT NULL))) EXECUTE FUNCTION public.do_delete_on_deleted_by_set();


--
-- Name: lwp_set_by_teacher_step_media delete_on_deleted_by_set; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER delete_on_deleted_by_set AFTER UPDATE ON public.lwp_set_by_teacher_step_media FOR EACH ROW WHEN (((old."deletedById" IS NULL) AND (new."deletedById" IS NOT NULL))) EXECUTE FUNCTION public.do_delete_on_deleted_by_set();


--
-- Name: lwp_user delete_on_deleted_by_set; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER delete_on_deleted_by_set AFTER UPDATE ON public.lwp_user FOR EACH ROW WHEN (((old."deletedById" IS NULL) AND (new."deletedById" IS NOT NULL))) EXECUTE FUNCTION public.do_delete_on_deleted_by_set();


--
-- Name: lwp_user_associated_login delete_on_deleted_by_set; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER delete_on_deleted_by_set AFTER UPDATE ON public.lwp_user_associated_login FOR EACH ROW WHEN (((old."deletedById" IS NULL) AND (new."deletedById" IS NOT NULL))) EXECUTE FUNCTION public.do_delete_on_deleted_by_set();


--
-- Name: lwp_user_interstitial delete_on_deleted_by_set; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER delete_on_deleted_by_set AFTER UPDATE ON public.lwp_user_interstitial FOR EACH ROW WHEN (((old."deletedById" IS NULL) AND (new."deletedById" IS NOT NULL))) EXECUTE FUNCTION public.do_delete_on_deleted_by_set();


--
-- Name: static_lwp_activity delete_on_deleted_by_set; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER delete_on_deleted_by_set AFTER UPDATE ON public.static_lwp_activity FOR EACH ROW WHEN (((old."deletedById" IS NULL) AND (new."deletedById" IS NOT NULL))) EXECUTE FUNCTION public.do_delete_on_deleted_by_set();


--
-- Name: static_lwp_activity_steps delete_on_deleted_by_set; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER delete_on_deleted_by_set AFTER UPDATE ON public.static_lwp_activity_steps FOR EACH ROW WHEN (((old."deletedById" IS NULL) AND (new."deletedById" IS NOT NULL))) EXECUTE FUNCTION public.do_delete_on_deleted_by_set();


--
-- Name: static_lwp_activity_tag delete_on_deleted_by_set; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER delete_on_deleted_by_set AFTER UPDATE ON public.static_lwp_activity_tag FOR EACH ROW WHEN (((old."deletedById" IS NULL) AND (new."deletedById" IS NOT NULL))) EXECUTE FUNCTION public.do_delete_on_deleted_by_set();


--
-- Name: static_lwp_email_template delete_on_deleted_by_set; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER delete_on_deleted_by_set AFTER UPDATE ON public.static_lwp_email_template FOR EACH ROW WHEN (((old."deletedById" IS NULL) AND (new."deletedById" IS NOT NULL))) EXECUTE FUNCTION public.do_delete_on_deleted_by_set();


--
-- Name: static_lwp_feature_tooltip delete_on_deleted_by_set; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER delete_on_deleted_by_set AFTER UPDATE ON public.static_lwp_feature_tooltip FOR EACH ROW WHEN (((old."deletedById" IS NULL) AND (new."deletedById" IS NOT NULL))) EXECUTE FUNCTION public.do_delete_on_deleted_by_set();


--
-- Name: static_lwp_interstitial delete_on_deleted_by_set; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER delete_on_deleted_by_set AFTER UPDATE ON public.static_lwp_interstitial FOR EACH ROW WHEN (((old."deletedById" IS NULL) AND (new."deletedById" IS NOT NULL))) EXECUTE FUNCTION public.do_delete_on_deleted_by_set();


--
-- Name: static_lwp_program delete_on_deleted_by_set; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER delete_on_deleted_by_set AFTER UPDATE ON public.static_lwp_program FOR EACH ROW WHEN (((old."deletedById" IS NULL) AND (new."deletedById" IS NOT NULL))) EXECUTE FUNCTION public.do_delete_on_deleted_by_set();


--
-- Name: static_lwp_school_tag delete_on_deleted_by_set; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER delete_on_deleted_by_set AFTER UPDATE ON public.static_lwp_school_tag FOR EACH ROW WHEN (((old."deletedById" IS NULL) AND (new."deletedById" IS NOT NULL))) EXECUTE FUNCTION public.do_delete_on_deleted_by_set();


--
-- Name: static_lwp_subject delete_on_deleted_by_set; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER delete_on_deleted_by_set AFTER UPDATE ON public.static_lwp_subject FOR EACH ROW WHEN (((old."deletedById" IS NULL) AND (new."deletedById" IS NOT NULL))) EXECUTE FUNCTION public.do_delete_on_deleted_by_set();


--
-- Name: static_lwp_topic delete_on_deleted_by_set; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER delete_on_deleted_by_set AFTER UPDATE ON public.static_lwp_topic FOR EACH ROW WHEN (((old."deletedById" IS NULL) AND (new."deletedById" IS NOT NULL))) EXECUTE FUNCTION public.do_delete_on_deleted_by_set();


--
-- Name: static_lwp_topic_domain delete_on_deleted_by_set; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER delete_on_deleted_by_set AFTER UPDATE ON public.static_lwp_topic_domain FOR EACH ROW WHEN (((old."deletedById" IS NULL) AND (new."deletedById" IS NOT NULL))) EXECUTE FUNCTION public.do_delete_on_deleted_by_set();


--
-- Name: static_lwp_topic_tag delete_on_deleted_by_set; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER delete_on_deleted_by_set AFTER UPDATE ON public.static_lwp_topic_tag FOR EACH ROW WHEN (((old."deletedById" IS NULL) AND (new."deletedById" IS NOT NULL))) EXECUTE FUNCTION public.do_delete_on_deleted_by_set();


--
-- Name: lwp_class_pupil lwp_class_pupil_update_class_counts; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER lwp_class_pupil_update_class_counts BEFORE INSERT OR DELETE OR UPDATE ON public.lwp_class_pupil FOR EACH ROW EXECUTE FUNCTION public.update_class_counts_from_lwp_class_pupil();


--
-- Name: lwp_pupil_feedback_history lwp_pupil_feedback_history_fill_in_period_index_for_feedbacks; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER lwp_pupil_feedback_history_fill_in_period_index_for_feedbacks BEFORE INSERT ON public.lwp_pupil_feedback_history FOR EACH ROW EXECUTE FUNCTION public.lwp_pupil_feedback_history_fill_in_period_index_for_feedbacks_a();


--
-- Name: lwp_pupil set_deleted_school_id_for_pupil; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_deleted_school_id_for_pupil BEFORE UPDATE ON public.lwp_pupil FOR EACH ROW WHEN (((old."schoolId" IS NOT NULL) AND (new."schoolId" IS NULL))) EXECUTE FUNCTION public.do_set_deleted_school_id_for_pupil();


--
-- Name: typeorm_metadata set_security_invoker_for_views_in_typeorm_metadata; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_security_invoker_for_views_in_typeorm_metadata AFTER INSERT OR UPDATE ON public.typeorm_metadata FOR EACH ROW WHEN (((new.type)::text = 'VIEW'::text)) EXECUTE FUNCTION public.set_security_invoker_for_views();


--
-- Name: lwp_magic_link triggersetuptimesifunset; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER triggersetuptimesifunset BEFORE INSERT ON public.lwp_magic_link FOR EACH ROW WHEN ((new."expiryTime" IS NULL)) EXECUTE FUNCTION public.lwp_setup_magic_link_times_if_unset();


--
-- Name: lwp_pupil_parent update_log_lwp_entity_status_change; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_log_lwp_entity_status_change AFTER UPDATE ON public.lwp_pupil_parent FOR EACH ROW WHEN (((old.status)::text IS DISTINCT FROM (new.status)::text)) EXECUTE FUNCTION public.lwp_log_entity_status_change('status');


--
-- Name: lwp_user update_log_lwp_entity_status_change; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_log_lwp_entity_status_change AFTER UPDATE ON public.lwp_user FOR EACH ROW WHEN (((old."userStatus")::text IS DISTINCT FROM (new."userStatus")::text)) EXECUTE FUNCTION public.lwp_log_entity_status_change('userStatus');


--
-- Name: wonde_parent_pupil FK_023ebe8504c5ba03393725c6943; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wonde_parent_pupil
    ADD CONSTRAINT "FK_023ebe8504c5ba03393725c6943" FOREIGN KEY ("wondeUserId") REFERENCES public.wonde_user(id) ON DELETE CASCADE DEFERRABLE;


--
-- Name: log_lwp_parent_sticker_notification FK_031e3ba6a0151aef9e36d2f0f5f; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.log_lwp_parent_sticker_notification
    ADD CONSTRAINT "FK_031e3ba6a0151aef9e36d2f0f5f" FOREIGN KEY ("stickerId") REFERENCES public.lwp_sticker(id) ON DELETE CASCADE DEFERRABLE;


--
-- Name: lwp_user_tooltip_history FK_054f240cad5e4ac4c6bca3ad584; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lwp_user_tooltip_history
    ADD CONSTRAINT "FK_054f240cad5e4ac4c6bca3ad584" FOREIGN KEY ("userId") REFERENCES public.lwp_user(id) ON DELETE SET NULL DEFERRABLE;


--
-- Name: lwp_feedback_reply FK_05b324c4cb7769f7b2acf28c50a; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lwp_feedback_reply
    ADD CONSTRAINT "FK_05b324c4cb7769f7b2acf28c50a" FOREIGN KEY ("deletedById") REFERENCES public.lwp_user(id) ON DELETE SET NULL DEFERRABLE;


--
-- Name: lwp_class_teacher FK_076dfc682ecef44411355f6904d; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lwp_class_teacher
    ADD CONSTRAINT "FK_076dfc682ecef44411355f6904d" FOREIGN KEY ("lwpUserId") REFERENCES public.lwp_user(id) ON UPDATE CASCADE ON DELETE CASCADE DEFERRABLE;


--
-- Name: static_lwp_interstitial_school_tags FK_08b502e90f091cc847686618040; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.static_lwp_interstitial_school_tags
    ADD CONSTRAINT "FK_08b502e90f091cc847686618040" FOREIGN KEY ("staticLwpSchoolTagId") REFERENCES public.static_lwp_school_tag(id) ON DELETE CASCADE;


--
-- Name: lwp_class_topic FK_09806e3f26a9dbe3d1b0c4d5328; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lwp_class_topic
    ADD CONSTRAINT "FK_09806e3f26a9dbe3d1b0c4d5328" FOREIGN KEY ("topicId") REFERENCES public.static_lwp_topic(id) ON DELETE RESTRICT;


--
-- Name: lwp_school_holidays FK_0984b81f175de9510698bcda08d; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lwp_school_holidays
    ADD CONSTRAINT "FK_0984b81f175de9510698bcda08d" FOREIGN KEY ("lwpSchoolHolidayId") REFERENCES public.lwp_school_holiday(id) ON UPDATE CASCADE ON DELETE CASCADE DEFERRABLE;


--
-- Name: static_lwp_admin_query FK_0a85cd33702c81d9d6dfeda6bfb; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.static_lwp_admin_query
    ADD CONSTRAINT "FK_0a85cd33702c81d9d6dfeda6bfb" FOREIGN KEY ("logCreatedById") REFERENCES public.lwp_user(id) ON DELETE SET NULL DEFERRABLE;


--
-- Name: lwp_class_subjects FK_0af64e2f7ef9249a68d46fdafc6; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lwp_class_subjects
    ADD CONSTRAINT "FK_0af64e2f7ef9249a68d46fdafc6" FOREIGN KEY ("staticLwpSubjectId") REFERENCES public.static_lwp_subject(id) ON UPDATE CASCADE ON DELETE CASCADE DEFERRABLE;


--
-- Name: static_lwp_interstitial FK_0be2abc8ff1982f258a11fa6545; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.static_lwp_interstitial
    ADD CONSTRAINT "FK_0be2abc8ff1982f258a11fa6545" FOREIGN KEY ("deletedById") REFERENCES public.lwp_user(id) ON DELETE SET NULL DEFERRABLE;


--
-- Name: lwp_pupil_tag FK_0c4842757a45a023ea0cc5453d6; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lwp_pupil_tag
    ADD CONSTRAINT "FK_0c4842757a45a023ea0cc5453d6" FOREIGN KEY ("logCreatedById") REFERENCES public.lwp_user(id) ON DELETE SET NULL DEFERRABLE;


--
-- Name: static_lwp_logo FK_0cfbc12baae43ef59e7a07ebbab; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.static_lwp_logo
    ADD CONSTRAINT "FK_0cfbc12baae43ef59e7a07ebbab" FOREIGN KEY ("logUpdatedById") REFERENCES public.lwp_user(id) ON DELETE SET NULL DEFERRABLE;


--
-- Name: static_lwp_trophy FK_0d6fdfa35762b4d3c0bbc40080b; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.static_lwp_trophy
    ADD CONSTRAINT "FK_0d6fdfa35762b4d3c0bbc40080b" FOREIGN KEY ("logUpdatedById") REFERENCES public.lwp_user(id) ON DELETE SET NULL DEFERRABLE;


--
-- Name: lwp_page_announcement_school_tags FK_0e74c8dd936d77abcbb6b08e6ce; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lwp_page_announcement_school_tags
    ADD CONSTRAINT "FK_0e74c8dd936d77abcbb6b08e6ce" FOREIGN KEY ("staticLwpSchoolTagId") REFERENCES public.static_lwp_school_tag(id) ON DELETE CASCADE;


--
-- Name: lwp_magic_link FK_0f7a40f291d88aaae96f58a1aad; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lwp_magic_link
    ADD CONSTRAINT "FK_0f7a40f291d88aaae96f58a1aad" FOREIGN KEY ("userId") REFERENCES public.lwp_user(id) ON DELETE CASCADE DEFERRABLE;


--
-- Name: static_lwp_period FK_142bb485c4507a790ebcdfd38aa; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.static_lwp_period
    ADD CONSTRAINT "FK_142bb485c4507a790ebcdfd38aa" FOREIGN KEY ("nextPeriodIndex") REFERENCES public.static_lwp_period(index) ON DELETE SET NULL DEFERRABLE;


--
-- Name: lwp_user_associated_login FK_14cc634c3b92ca4779275fd1558; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lwp_user_associated_login
    ADD CONSTRAINT "FK_14cc634c3b92ca4779275fd1558" FOREIGN KEY ("logUpdatedById") REFERENCES public.lwp_user(id) ON DELETE SET NULL DEFERRABLE;


--
-- Name: static_lwp_program FK_14f9e68f50114ce220cfea80a1f; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.static_lwp_program
    ADD CONSTRAINT "FK_14f9e68f50114ce220cfea80a1f" FOREIGN KEY ("logCreatedById") REFERENCES public.lwp_user(id) ON DELETE SET NULL DEFERRABLE;


--
-- Name: lwp_demo_activity_feedback FK_150785c8cc36da7b9093adda3d2; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lwp_demo_activity_feedback
    ADD CONSTRAINT "FK_150785c8cc36da7b9093adda3d2" FOREIGN KEY ("activityId") REFERENCES public.static_lwp_activity(id) ON DELETE RESTRICT;


--
-- Name: static_lwp_whole_school_sequence FK_16ba0a7751b9525b80d977aae26; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.static_lwp_whole_school_sequence
    ADD CONSTRAINT "FK_16ba0a7751b9525b80d977aae26" FOREIGN KEY ("subjectId") REFERENCES public.static_lwp_subject(id) ON DELETE RESTRICT;


--
-- Name: lwp_pupil_parent FK_16ce399c90c3f84a15452cbb782; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lwp_pupil_parent
    ADD CONSTRAINT "FK_16ce399c90c3f84a15452cbb782" FOREIGN KEY ("parentId") REFERENCES public.lwp_user(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: static_lwp_activity_tag FK_17636cefd338c53baa99e1027e7; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.static_lwp_activity_tag
    ADD CONSTRAINT "FK_17636cefd338c53baa99e1027e7" FOREIGN KEY ("logUpdatedById") REFERENCES public.lwp_user(id) ON DELETE SET NULL DEFERRABLE;


--
-- Name: static_lwp_topic_domain_year_group FK_1789782fdd60cea44dbcf221086; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.static_lwp_topic_domain_year_group
    ADD CONSTRAINT "FK_1789782fdd60cea44dbcf221086" FOREIGN KEY ("domainId") REFERENCES public.static_lwp_topic_domain(id) ON DELETE CASCADE DEFERRABLE;


--
-- Name: lwp_class_sequence_assignment FK_18c1cc22b7a4218f7ddda076eb6; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lwp_class_sequence_assignment
    ADD CONSTRAINT "FK_18c1cc22b7a4218f7ddda076eb6" FOREIGN KEY ("wholeSchoolAssignmentId") REFERENCES public.lwp_whole_school_sequence_assignment(id) ON DELETE SET NULL;


--
-- Name: imported_school_class_student FK_1915c5a8e1d6fef62535cb47901; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.imported_school_class_student
    ADD CONSTRAINT "FK_1915c5a8e1d6fef62535cb47901" FOREIGN KEY ("importedSchoolClassId") REFERENCES public.imported_school_class(id) ON UPDATE CASCADE ON DELETE CASCADE DEFERRABLE;


--
-- Name: lwp_features_school_tags FK_19b344e5b8bd29e60586b80dc8d; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lwp_features_school_tags
    ADD CONSTRAINT "FK_19b344e5b8bd29e60586b80dc8d" FOREIGN KEY ("staticLwpSchoolTagId") REFERENCES public.static_lwp_school_tag(id) ON DELETE CASCADE;


--
-- Name: lwp_pupil_topic_sbt_step_media FK_1a1fb7e26fa2ee368363133db5a; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lwp_pupil_topic_sbt_step_media
    ADD CONSTRAINT "FK_1a1fb7e26fa2ee368363133db5a" FOREIGN KEY ("lwpSetByTeacherStepMediaId") REFERENCES public.lwp_set_by_teacher_step_media(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: static_lwp_program FK_1aaeccb9440690ed9fc5cc4dde1; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.static_lwp_program
    ADD CONSTRAINT "FK_1aaeccb9440690ed9fc5cc4dde1" FOREIGN KEY ("schoolTagId") REFERENCES public.static_lwp_school_tag(id) ON DELETE SET NULL DEFERRABLE;


--
-- Name: static_lwp_activity FK_1c4528f48668f132128f05d6b70; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.static_lwp_activity
    ADD CONSTRAINT "FK_1c4528f48668f132128f05d6b70" FOREIGN KEY ("logCreatedById") REFERENCES public.lwp_user(id) ON DELETE SET NULL DEFERRABLE;


--
-- Name: lwp_pupil_feedback_history FK_1c4e84326e8667efdddc3419131; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lwp_pupil_feedback_history
    ADD CONSTRAINT "FK_1c4e84326e8667efdddc3419131" FOREIGN KEY ("lwpPupilId") REFERENCES public.lwp_pupil(id) ON UPDATE CASCADE ON DELETE CASCADE DEFERRABLE;


--
-- Name: imported_school_class FK_1cdf48d94a440692ed29aa735f4; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.imported_school_class
    ADD CONSTRAINT "FK_1cdf48d94a440692ed29aa735f4" FOREIGN KEY ("schoolId") REFERENCES public.imported_school(id) ON DELETE CASCADE DEFERRABLE;


--
-- Name: lwp_pupil_topic FK_1dfd7970d0b5d7193854766dc2c; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lwp_pupil_topic
    ADD CONSTRAINT "FK_1dfd7970d0b5d7193854766dc2c" FOREIGN KEY ("classTopicId") REFERENCES public.lwp_class_topic(id) ON DELETE SET NULL;


--
-- Name: lwp_school_impact_report_graphs FK_1ef4b700ae7f03254e81c6e9412; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lwp_school_impact_report_graphs
    ADD CONSTRAINT "FK_1ef4b700ae7f03254e81c6e9412" FOREIGN KEY ("impactReportId") REFERENCES public.lwp_school_impact_report(id) ON DELETE CASCADE;


--
-- Name: lwp_topic_tags FK_1efe79f8f8e52b0b2a788f4fa5a; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lwp_topic_tags
    ADD CONSTRAINT "FK_1efe79f8f8e52b0b2a788f4fa5a" FOREIGN KEY ("staticLwpTopicTagId") REFERENCES public.static_lwp_topic_tag(id) ON DELETE CASCADE;


--
-- Name: static_lwp_feature_tooltip FK_1f076191a7695997b1b22979387; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.static_lwp_feature_tooltip
    ADD CONSTRAINT "FK_1f076191a7695997b1b22979387" FOREIGN KEY ("logUpdatedById") REFERENCES public.lwp_user(id) ON DELETE SET NULL;


--
-- Name: lwp_pupil_tag FK_1ff52a874f69b42179381862267; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lwp_pupil_tag
    ADD CONSTRAINT "FK_1ff52a874f69b42179381862267" FOREIGN KEY ("logUpdatedById") REFERENCES public.lwp_user(id) ON DELETE SET NULL DEFERRABLE;


--
-- Name: lwp_pupil_topic FK_20ad452112100d1a2feb31358c5; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lwp_pupil_topic
    ADD CONSTRAINT "FK_20ad452112100d1a2feb31358c5" FOREIGN KEY ("logUpdatedById") REFERENCES public.lwp_user(id) ON DELETE SET NULL DEFERRABLE;


--
-- Name: static_lwp_activity_steps FK_2134d24521e0b1222f28dd093fd; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.static_lwp_activity_steps
    ADD CONSTRAINT "FK_2134d24521e0b1222f28dd093fd" FOREIGN KEY ("activityId") REFERENCES public.static_lwp_activity(id) ON DELETE CASCADE;


--
-- Name: lwp_pupil_topic FK_2312801d3b36bf7246c1ebec25a; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lwp_pupil_topic
    ADD CONSTRAINT "FK_2312801d3b36bf7246c1ebec25a" FOREIGN KEY ("periodIndex") REFERENCES public.static_lwp_period(index) ON DELETE RESTRICT;


--
-- Name: static_lwp_activity_tag FK_24a59de7276b0c552745d00fa83; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.static_lwp_activity_tag
    ADD CONSTRAINT "FK_24a59de7276b0c552745d00fa83" FOREIGN KEY ("deletedById") REFERENCES public.lwp_user(id) ON DELETE SET NULL DEFERRABLE;


--
-- Name: lwp_pupil_topic FK_25cbfe3d28ebefc869ace0a030a; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lwp_pupil_topic
    ADD CONSTRAINT "FK_25cbfe3d28ebefc869ace0a030a" FOREIGN KEY ("pupilId") REFERENCES public.lwp_pupil(id) ON DELETE CASCADE DEFERRABLE;


--
-- Name: lwp_school_static_tags FK_26b43bae3da6e06f8e491989f4f; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lwp_school_static_tags
    ADD CONSTRAINT "FK_26b43bae3da6e06f8e491989f4f" FOREIGN KEY ("logUpdatedById") REFERENCES public.lwp_user(id) ON DELETE SET NULL DEFERRABLE;


--
-- Name: lwp_class_topic FK_26bae6bd4f819eed6b80e19f922; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lwp_class_topic
    ADD CONSTRAINT "FK_26bae6bd4f819eed6b80e19f922" FOREIGN KEY ("deletedById") REFERENCES public.lwp_user(id) ON DELETE SET NULL DEFERRABLE;


--
-- Name: wonde_school_class_user FK_2796d417f6bf4b1d40c5effef57; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wonde_school_class_user
    ADD CONSTRAINT "FK_2796d417f6bf4b1d40c5effef57" FOREIGN KEY ("wondeSchoolClassId") REFERENCES public.imported_school_class(id) ON DELETE CASCADE DEFERRABLE;


--
-- Name: static_lwp_video_tutorial FK_280da6d1af9baf314bf6095c0da; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.static_lwp_video_tutorial
    ADD CONSTRAINT "FK_280da6d1af9baf314bf6095c0da" FOREIGN KEY ("logUpdatedById") REFERENCES public.lwp_user(id) ON DELETE SET NULL DEFERRABLE;


--
-- Name: lwp_features_school_tags FK_282255dcbb7f683d3fdf5b03cda; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lwp_features_school_tags
    ADD CONSTRAINT "FK_282255dcbb7f683d3fdf5b03cda" FOREIGN KEY ("staticLwpFeaturesId") REFERENCES public.static_lwp_features(id) ON UPDATE CASCADE ON DELETE CASCADE DEFERRABLE;


--
-- Name: static_lwp_news FK_283654b1c9cc9f7934d5957b1ff; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.static_lwp_news
    ADD CONSTRAINT "FK_283654b1c9cc9f7934d5957b1ff" FOREIGN KEY ("logUpdatedById") REFERENCES public.lwp_user(id) ON DELETE SET NULL DEFERRABLE;


--
-- Name: wonde_contact_student FK_28d7a5b946daa6d4f5d963ac0cb; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wonde_contact_student
    ADD CONSTRAINT "FK_28d7a5b946daa6d4f5d963ac0cb" FOREIGN KEY ("wondeStudentId") REFERENCES public.imported_student(id) ON DELETE CASCADE DEFERRABLE;


--
-- Name: lwp_pupil_activity FK_2a425ff523faaf0ea52ccd37364; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lwp_pupil_activity
    ADD CONSTRAINT "FK_2a425ff523faaf0ea52ccd37364" FOREIGN KEY ("pupilId") REFERENCES public.lwp_pupil(id) ON DELETE CASCADE DEFERRABLE;


--
-- Name: static_lwp_school_tag FK_2a655ce9718a4945edeae4960d9; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.static_lwp_school_tag
    ADD CONSTRAINT "FK_2a655ce9718a4945edeae4960d9" FOREIGN KEY ("logCreatedById") REFERENCES public.lwp_user(id) ON DELETE SET NULL DEFERRABLE;


--
-- Name: lwp_class_sequence_assignment FK_2af81902508ea3a8642ff570e5f; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lwp_class_sequence_assignment
    ADD CONSTRAINT "FK_2af81902508ea3a8642ff570e5f" FOREIGN KEY ("logCreatedById") REFERENCES public.lwp_user(id) ON DELETE SET NULL;


--
-- Name: static_lwp_activity FK_2bfb5c86b0fe76e9991b0ec990d; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.static_lwp_activity
    ADD CONSTRAINT "FK_2bfb5c86b0fe76e9991b0ec990d" FOREIGN KEY ("deletedById") REFERENCES public.lwp_user(id) ON DELETE SET NULL DEFERRABLE;


--
-- Name: static_lwp_logo FK_2d4fd9184149d95191194eabe3b; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.static_lwp_logo
    ADD CONSTRAINT "FK_2d4fd9184149d95191194eabe3b" FOREIGN KEY ("logCreatedById") REFERENCES public.lwp_user(id) ON DELETE SET NULL DEFERRABLE;


--
-- Name: lwp_pupil_mathscot FK_2e24b82aa240f047113847b21e1; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lwp_pupil_mathscot
    ADD CONSTRAINT "FK_2e24b82aa240f047113847b21e1" FOREIGN KEY ("pupilId") REFERENCES public.lwp_pupil(id) ON DELETE CASCADE;


--
-- Name: lwp_school_impact_report FK_2ef3f597a486dbcfe7c1c6942f9; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lwp_school_impact_report
    ADD CONSTRAINT "FK_2ef3f597a486dbcfe7c1c6942f9" FOREIGN KEY ("logCreatedById") REFERENCES public.lwp_user(id) ON DELETE SET NULL DEFERRABLE;


--
-- Name: static_lwp_activity FK_3050b8005ed864bb612f527fecb; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.static_lwp_activity
    ADD CONSTRAINT "FK_3050b8005ed864bb612f527fecb" FOREIGN KEY ("logUpdatedById") REFERENCES public.lwp_user(id) ON DELETE SET NULL DEFERRABLE;


--
-- Name: static_lwp_data_query FK_31c9495dc85864eca933b6f9280; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.static_lwp_data_query
    ADD CONSTRAINT "FK_31c9495dc85864eca933b6f9280" FOREIGN KEY ("logCreatedById") REFERENCES public.lwp_user(id) ON DELETE SET NULL DEFERRABLE;


--
-- Name: lwp_set_by_teacher_step_media FK_31dc0989ede8ef8584abb61b297; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lwp_set_by_teacher_step_media
    ADD CONSTRAINT "FK_31dc0989ede8ef8584abb61b297" FOREIGN KEY ("logCreatedById") REFERENCES public.lwp_user(id) ON DELETE SET NULL;


--
-- Name: lwp_pupil_feedback FK_33b5f81d807493605398f372e58; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lwp_pupil_feedback
    ADD CONSTRAINT "FK_33b5f81d807493605398f372e58" FOREIGN KEY ("logUpdatedById") REFERENCES public.lwp_user(id) ON DELETE SET NULL DEFERRABLE;


--
-- Name: lwp_school_holiday FK_33cd7aa73e0fc074d4d25258827; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lwp_school_holiday
    ADD CONSTRAINT "FK_33cd7aa73e0fc074d4d25258827" FOREIGN KEY ("logCreatedById") REFERENCES public.lwp_user(id) ON DELETE SET NULL DEFERRABLE;


--
-- Name: static_lwp_topic_domain FK_3405c33e7db626983a427afbb45; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.static_lwp_topic_domain
    ADD CONSTRAINT "FK_3405c33e7db626983a427afbb45" FOREIGN KEY ("deletedById") REFERENCES public.lwp_user(id) ON DELETE SET NULL DEFERRABLE;


--
-- Name: static_lwp_interstitial FK_345735bc2ffcd6f10c1f4c56c2c; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.static_lwp_interstitial
    ADD CONSTRAINT "FK_345735bc2ffcd6f10c1f4c56c2c" FOREIGN KEY ("subjectId") REFERENCES public.static_lwp_subject(id) ON DELETE SET NULL;


--
-- Name: wonde_user FK_346c69e50662acb211b73d44b65; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wonde_user
    ADD CONSTRAINT "FK_346c69e50662acb211b73d44b65" FOREIGN KEY ("lwpUserId") REFERENCES public.lwp_user(id) DEFERRABLE;


--
-- Name: lwp_school_class FK_354bdd5cabaae4416e03d48c868; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lwp_school_class
    ADD CONSTRAINT "FK_354bdd5cabaae4416e03d48c868" FOREIGN KEY ("deletedById") REFERENCES public.lwp_user(id) ON DELETE SET NULL DEFERRABLE;


--
-- Name: lwp_demo_activity_feedback FK_35affb8be93b2e89771abbb3be2; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lwp_demo_activity_feedback
    ADD CONSTRAINT "FK_35affb8be93b2e89771abbb3be2" FOREIGN KEY ("deletedById") REFERENCES public.lwp_user(id) ON DELETE SET NULL DEFERRABLE;


--
-- Name: static_lwp_staff FK_367f8f1310388771cf57fccd7e4; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.static_lwp_staff
    ADD CONSTRAINT "FK_367f8f1310388771cf57fccd7e4" FOREIGN KEY ("logCreatedById") REFERENCES public.lwp_user(id) ON DELETE SET NULL DEFERRABLE;


--
-- Name: lwp_user_interstitial FK_377a44e70b697bc51306a35d084; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lwp_user_interstitial
    ADD CONSTRAINT "FK_377a44e70b697bc51306a35d084" FOREIGN KEY ("userId") REFERENCES public.lwp_user(id) ON DELETE CASCADE DEFERRABLE;


--
-- Name: log_school_class_license FK_382678814aa2af18b9916630816; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.log_school_class_license
    ADD CONSTRAINT "FK_382678814aa2af18b9916630816" FOREIGN KEY ("schoolId") REFERENCES public.lwp_school(id) ON DELETE SET NULL DEFERRABLE;


--
-- Name: lwp_user FK_388e90cf90b6e53463906e1d861; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lwp_user
    ADD CONSTRAINT "FK_388e90cf90b6e53463906e1d861" FOREIGN KEY ("schoolId") REFERENCES public.lwp_school(id) ON DELETE CASCADE;


--
-- Name: lwp_teacher_liked_pupil_activity FK_39ff1ccaeacc7a49cb4e3b41769; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lwp_teacher_liked_pupil_activity
    ADD CONSTRAINT "FK_39ff1ccaeacc7a49cb4e3b41769" FOREIGN KEY ("lwpUserId") REFERENCES public.lwp_user(id) ON UPDATE CASCADE ON DELETE CASCADE DEFERRABLE;


--
-- Name: lwp_whole_school_sequence_assignment FK_3c4acbc1a3ac5b558aa23f1ceb9; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lwp_whole_school_sequence_assignment
    ADD CONSTRAINT "FK_3c4acbc1a3ac5b558aa23f1ceb9" FOREIGN KEY ("periodIndex") REFERENCES public.static_lwp_period(index) ON DELETE RESTRICT;


--
-- Name: lwp_topic_school_tags FK_3c77e387bbf92f70e5fca50ff34; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lwp_topic_school_tags
    ADD CONSTRAINT "FK_3c77e387bbf92f70e5fca50ff34" FOREIGN KEY ("staticLwpSchoolTagId") REFERENCES public.static_lwp_school_tag(id) ON UPDATE CASCADE ON DELETE CASCADE DEFERRABLE;


--
-- Name: static_lwp_topic_tag FK_3d874a69cc610e6edb47643d27e; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.static_lwp_topic_tag
    ADD CONSTRAINT "FK_3d874a69cc610e6edb47643d27e" FOREIGN KEY ("deletedById") REFERENCES public.lwp_user(id) ON DELETE SET NULL DEFERRABLE;


--
-- Name: lwp_pupil_parent FK_3efa30cd4c01885fc707ec788f3; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lwp_pupil_parent
    ADD CONSTRAINT "FK_3efa30cd4c01885fc707ec788f3" FOREIGN KEY ("logCreatedById") REFERENCES public.lwp_user(id) ON DELETE SET NULL DEFERRABLE;


--
-- Name: imported_contact FK_3facafb0780aa9376a5be7878b8; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.imported_contact
    ADD CONSTRAINT "FK_3facafb0780aa9376a5be7878b8" FOREIGN KEY ("schoolId") REFERENCES public.imported_school(id) ON DELETE CASCADE DEFERRABLE;


--
-- Name: log_lwp_parent_sticker_notification FK_401c331a16a22f0ffbab1210bc0; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.log_lwp_parent_sticker_notification
    ADD CONSTRAINT "FK_401c331a16a22f0ffbab1210bc0" FOREIGN KEY ("userId") REFERENCES public.lwp_user(id) ON DELETE CASCADE DEFERRABLE;


--
-- Name: static_lwp_topic_sequence_item FK_42602b69e01152aa1dd61724e5d; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.static_lwp_topic_sequence_item
    ADD CONSTRAINT "FK_42602b69e01152aa1dd61724e5d" FOREIGN KEY ("sequenceId") REFERENCES public.static_lwp_topic_sequence(id) ON DELETE CASCADE;


--
-- Name: lwp_school_class FK_42e678039940cc979ec557351e7; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lwp_school_class
    ADD CONSTRAINT "FK_42e678039940cc979ec557351e7" FOREIGN KEY ("schoolId") REFERENCES public.lwp_school(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: lwp_sticker FK_436e297dae53b26591969d75e26; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lwp_sticker
    ADD CONSTRAINT "FK_436e297dae53b26591969d75e26" FOREIGN KEY ("characterId") REFERENCES public.lwp_sticker_character_item(id) ON DELETE SET NULL DEFERRABLE;


--
-- Name: lwp_pupil FK_4448b1f9d59cd074d949a699b05; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lwp_pupil
    ADD CONSTRAINT "FK_4448b1f9d59cd074d949a699b05" FOREIGN KEY ("deletedById") REFERENCES public.lwp_user(id) ON DELETE SET NULL DEFERRABLE;


--
-- Name: lwp_school FK_44581a626d5d41a61a4dde7da69; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lwp_school
    ADD CONSTRAINT "FK_44581a626d5d41a61a4dde7da69" FOREIGN KEY ("curentPeriodIndex") REFERENCES public.static_lwp_period(index) ON DELETE RESTRICT;


--
-- Name: lwp_pupil_topic FK_4495384384c9431f796a8df409f; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lwp_pupil_topic
    ADD CONSTRAINT "FK_4495384384c9431f796a8df409f" FOREIGN KEY ("logCreatedById") REFERENCES public.lwp_user(id) ON DELETE SET NULL DEFERRABLE;


--
-- Name: lwp_pupil_activity FK_44affa0209b7618300700e64666; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lwp_pupil_activity
    ADD CONSTRAINT "FK_44affa0209b7618300700e64666" FOREIGN KEY ("topicId") REFERENCES public.lwp_pupil_topic(id) ON DELETE CASCADE DEFERRABLE;


--
-- Name: static_lwp_period FK_45c00d9a6b0d0dbec8bb7f5b179; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.static_lwp_period
    ADD CONSTRAINT "FK_45c00d9a6b0d0dbec8bb7f5b179" FOREIGN KEY ("logUpdatedById") REFERENCES public.lwp_user(id) ON DELETE SET NULL DEFERRABLE;


--
-- Name: lwp_class_topic FK_463957978afdfb82fac87b0ee78; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lwp_class_topic
    ADD CONSTRAINT "FK_463957978afdfb82fac87b0ee78" FOREIGN KEY ("logUpdatedById") REFERENCES public.lwp_user(id) ON DELETE SET NULL DEFERRABLE;


--
-- Name: lwp_pupil_mathscot FK_4641a4ec4b379c8289e579243c0; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lwp_pupil_mathscot
    ADD CONSTRAINT "FK_4641a4ec4b379c8289e579243c0" FOREIGN KEY ("logCreatedById") REFERENCES public.lwp_user(id) ON DELETE SET NULL DEFERRABLE;


--
-- Name: log_school_class_license FK_467487742580cea78125ff2d35f; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.log_school_class_license
    ADD CONSTRAINT "FK_467487742580cea78125ff2d35f" FOREIGN KEY ("logCreatedById") REFERENCES public.lwp_user(id) ON DELETE SET NULL DEFERRABLE;


--
-- Name: lwp_sticker_character_item FK_46805cf5c3d571fa788f453483d; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lwp_sticker_character_item
    ADD CONSTRAINT "FK_46805cf5c3d571fa788f453483d" FOREIGN KEY ("logCreatedById") REFERENCES public.lwp_user(id) ON DELETE SET NULL DEFERRABLE;


--
-- Name: static_lwp_school_tag FK_46ecec32d5bc90fe9e09dbc9d4b; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.static_lwp_school_tag
    ADD CONSTRAINT "FK_46ecec32d5bc90fe9e09dbc9d4b" FOREIGN KEY ("deletedById") REFERENCES public.lwp_user(id) ON DELETE SET NULL DEFERRABLE;


--
-- Name: log_lwp_contact FK_47ea6289a076da87976c988be3d; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.log_lwp_contact
    ADD CONSTRAINT "FK_47ea6289a076da87976c988be3d" FOREIGN KEY ("logUpdatedById") REFERENCES public.lwp_user(id) ON DELETE SET NULL DEFERRABLE;


--
-- Name: lwp_feedback_reply FK_4917abd6f80f559fe58ec0011e3; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lwp_feedback_reply
    ADD CONSTRAINT "FK_4917abd6f80f559fe58ec0011e3" FOREIGN KEY ("stickerId") REFERENCES public.lwp_sticker(id) ON DELETE CASCADE;


--
-- Name: imported_student_contact FK_4927ba841bf7fcb3c044d1e9d91; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.imported_student_contact
    ADD CONSTRAINT "FK_4927ba841bf7fcb3c044d1e9d91" FOREIGN KEY ("schoolId") REFERENCES public.imported_school(id) ON DELETE CASCADE DEFERRABLE;


--
-- Name: lwp_topic_school_tags FK_4a6bb580e0c7c6b593f9722a405; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lwp_topic_school_tags
    ADD CONSTRAINT "FK_4a6bb580e0c7c6b593f9722a405" FOREIGN KEY ("staticLwpTopicId") REFERENCES public.static_lwp_topic(id) ON DELETE CASCADE;


--
-- Name: lwp_admin_sticker_school_status FK_4aa05a9a79d81a1462e358527d2; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lwp_admin_sticker_school_status
    ADD CONSTRAINT "FK_4aa05a9a79d81a1462e358527d2" FOREIGN KEY ("stickerId") REFERENCES public.lwp_sticker(id) ON DELETE CASCADE DEFERRABLE;


--
-- Name: static_lwp_interstitial_school_tags FK_4af14f483eda27be61690bbba38; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.static_lwp_interstitial_school_tags
    ADD CONSTRAINT "FK_4af14f483eda27be61690bbba38" FOREIGN KEY ("staticLwpInterstitialId") REFERENCES public.static_lwp_interstitial(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: lwp_activity_tags FK_4b04a09a2c69ed35d50b000d0c8; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lwp_activity_tags
    ADD CONSTRAINT "FK_4b04a09a2c69ed35d50b000d0c8" FOREIGN KEY ("staticLwpActivityTagId") REFERENCES public.static_lwp_activity_tag(id) ON DELETE CASCADE;


--
-- Name: lwp_parent_pupil_invited FK_4c0bedc0586a720226d0e273158; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lwp_parent_pupil_invited
    ADD CONSTRAINT "FK_4c0bedc0586a720226d0e273158" FOREIGN KEY ("lwpUserId") REFERENCES public.lwp_user(id) DEFERRABLE;


--
-- Name: imported_school_class FK_4dcfa67450484437b5da1feaab7; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.imported_school_class
    ADD CONSTRAINT "FK_4dcfa67450484437b5da1feaab7" FOREIGN KEY ("yearGroup") REFERENCES public.static_lwp_year_group(id) ON DELETE SET NULL;


--
-- Name: static_lwp_page_announcement FK_5038a2f1d3f5933440fe97af356; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.static_lwp_page_announcement
    ADD CONSTRAINT "FK_5038a2f1d3f5933440fe97af356" FOREIGN KEY ("logUpdatedById") REFERENCES public.lwp_user(id) ON DELETE SET NULL;


--
-- Name: lwp_school_class FK_50a970c277e059d7b7c08e5a922; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lwp_school_class
    ADD CONSTRAINT "FK_50a970c277e059d7b7c08e5a922" FOREIGN KEY ("logCreatedById") REFERENCES public.lwp_user(id) ON DELETE SET NULL DEFERRABLE;


--
-- Name: static_lwp_video_tutorial FK_50c049ac4cddc6c651094b8c5d3; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.static_lwp_video_tutorial
    ADD CONSTRAINT "FK_50c049ac4cddc6c651094b8c5d3" FOREIGN KEY ("logCreatedById") REFERENCES public.lwp_user(id) ON DELETE SET NULL DEFERRABLE;


--
-- Name: lwp_school_static_tags FK_50d1858e4c7e9f97a4a3f571193; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lwp_school_static_tags
    ADD CONSTRAINT "FK_50d1858e4c7e9f97a4a3f571193" FOREIGN KEY ("logCreatedById") REFERENCES public.lwp_user(id) ON DELETE SET NULL DEFERRABLE;


--
-- Name: static_lwp_topic_sequence_item FK_50d86b423a249d2b05471aebb8f; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.static_lwp_topic_sequence_item
    ADD CONSTRAINT "FK_50d86b423a249d2b05471aebb8f" FOREIGN KEY ("logCreatedById") REFERENCES public.lwp_user(id) ON DELETE SET NULL;


--
-- Name: lwp_pupil_parent FK_5123c0ddb3e6f7587d74b24c0db; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lwp_pupil_parent
    ADD CONSTRAINT "FK_5123c0ddb3e6f7587d74b24c0db" FOREIGN KEY ("pupilId") REFERENCES public.lwp_pupil(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: lwp_pupil_feedback FK_526a6f719fe468910d8d4644a35; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lwp_pupil_feedback
    ADD CONSTRAINT "FK_526a6f719fe468910d8d4644a35" FOREIGN KEY ("deletedById") REFERENCES public.lwp_user(id) ON DELETE SET NULL DEFERRABLE;


--
-- Name: lwp_pupil FK_5350669a5bbef9ea1d3abb1e62f; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lwp_pupil
    ADD CONSTRAINT "FK_5350669a5bbef9ea1d3abb1e62f" FOREIGN KEY ("logUpdatedById") REFERENCES public.lwp_user(id) ON DELETE SET NULL DEFERRABLE;


--
-- Name: lwp_class_sequence_assignment FK_540c5134753fbac866502d554ef; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lwp_class_sequence_assignment
    ADD CONSTRAINT "FK_540c5134753fbac866502d554ef" FOREIGN KEY ("classId") REFERENCES public.lwp_school_class(id) ON DELETE CASCADE;


--
-- Name: static_lwp_topic FK_550f0f2b9e085371cb007b725f6; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.static_lwp_topic
    ADD CONSTRAINT "FK_550f0f2b9e085371cb007b725f6" FOREIGN KEY ("logUpdatedById") REFERENCES public.lwp_user(id) ON DELETE SET NULL DEFERRABLE;


--
-- Name: lwp_parent_pupil_imported FK_5639163ec3bbfc107354f610bc8; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lwp_parent_pupil_imported
    ADD CONSTRAINT "FK_5639163ec3bbfc107354f610bc8" FOREIGN KEY ("lwpPupilId") REFERENCES public.lwp_pupil(id) ON UPDATE CASCADE ON DELETE CASCADE DEFERRABLE;


--
-- Name: static_lwp_topic FK_56914a5c98348e7b0d64d281964; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.static_lwp_topic
    ADD CONSTRAINT "FK_56914a5c98348e7b0d64d281964" FOREIGN KEY ("deletedById") REFERENCES public.lwp_user(id) ON DELETE SET NULL DEFERRABLE;


--
-- Name: lwp_pupil_trophy FK_571ce4024cd2d7732b361954d0e; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lwp_pupil_trophy
    ADD CONSTRAINT "FK_571ce4024cd2d7732b361954d0e" FOREIGN KEY ("pupilId") REFERENCES public.lwp_pupil(id) ON DELETE CASCADE;


--
-- Name: lwp_activity_tags FK_579c57aeaa13d383c32f558968c; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lwp_activity_tags
    ADD CONSTRAINT "FK_579c57aeaa13d383c32f558968c" FOREIGN KEY ("staticLwpActivityId") REFERENCES public.static_lwp_activity(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: lwp_pupil_parent FK_57b4aec2ff47cf5b0d0f594f5a3; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lwp_pupil_parent
    ADD CONSTRAINT "FK_57b4aec2ff47cf5b0d0f594f5a3" FOREIGN KEY ("invitedById") REFERENCES public.lwp_user(id) ON DELETE SET NULL DEFERRABLE;


--
-- Name: imported_student_contact FK_583e79cf7877b76264f60ae04a8; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.imported_student_contact
    ADD CONSTRAINT "FK_583e79cf7877b76264f60ae04a8" FOREIGN KEY ("importedContactId") REFERENCES public.imported_contact(id) ON DELETE CASCADE DEFERRABLE;


--
-- Name: static_lwp_whole_school_sequence FK_58644bf62445e8c5bac8677e852; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.static_lwp_whole_school_sequence
    ADD CONSTRAINT "FK_58644bf62445e8c5bac8677e852" FOREIGN KEY ("logCreatedById") REFERENCES public.lwp_user(id) ON DELETE SET NULL;


--
-- Name: static_lwp_files FK_58e9503d40ddad35743e499d89b; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.static_lwp_files
    ADD CONSTRAINT "FK_58e9503d40ddad35743e499d89b" FOREIGN KEY ("logUpdatedById") REFERENCES public.lwp_user(id) ON DELETE SET NULL DEFERRABLE;


--
-- Name: static_lwp_activity_tag FK_59d800c86979858bd00e0432b3f; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.static_lwp_activity_tag
    ADD CONSTRAINT "FK_59d800c86979858bd00e0432b3f" FOREIGN KEY ("logCreatedById") REFERENCES public.lwp_user(id) ON DELETE SET NULL DEFERRABLE;


--
-- Name: lwp_school_impact_report_graphs FK_5d169f3a9215ebdfa1266133abb; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lwp_school_impact_report_graphs
    ADD CONSTRAINT "FK_5d169f3a9215ebdfa1266133abb" FOREIGN KEY ("subjectId") REFERENCES public.static_lwp_subject(id);


--
-- Name: lwp_school FK_5e64b24ddda1270717de0199410; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lwp_school
    ADD CONSTRAINT "FK_5e64b24ddda1270717de0199410" FOREIGN KEY ("deletedById") REFERENCES public.lwp_user(id) ON DELETE SET NULL DEFERRABLE;


--
-- Name: lwp_user_associated_login FK_5ee4fa5f5b9beaafa1d02862847; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lwp_user_associated_login
    ADD CONSTRAINT "FK_5ee4fa5f5b9beaafa1d02862847" FOREIGN KEY ("logCreatedById") REFERENCES public.lwp_user(id) ON DELETE SET NULL DEFERRABLE;


--
-- Name: lwp_whole_school_sequence_assignment FK_5fd36d760e6f6db1bbd8dd93b58; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lwp_whole_school_sequence_assignment
    ADD CONSTRAINT "FK_5fd36d760e6f6db1bbd8dd93b58" FOREIGN KEY ("schoolId") REFERENCES public.lwp_school(id) ON DELETE CASCADE;


--
-- Name: lwp_pupil_trophy FK_61c3d6145d984394bf81385a4d2; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lwp_pupil_trophy
    ADD CONSTRAINT "FK_61c3d6145d984394bf81385a4d2" FOREIGN KEY ("trophyId") REFERENCES public.static_lwp_trophy(id) ON DELETE RESTRICT;


--
-- Name: static_lwp_topic_sequence FK_6344fe1415e601e5b7c6bf04855; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.static_lwp_topic_sequence
    ADD CONSTRAINT "FK_6344fe1415e601e5b7c6bf04855" FOREIGN KEY ("logUpdatedById") REFERENCES public.lwp_user(id) ON DELETE SET NULL;


--
-- Name: lwp_sticker FK_6516af9634e9ebeed44ff8102e8; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lwp_sticker
    ADD CONSTRAINT "FK_6516af9634e9ebeed44ff8102e8" FOREIGN KEY ("schoolId") REFERENCES public.lwp_school(id) ON DELETE CASCADE DEFERRABLE;


--
-- Name: lwp_notification FK_66125e54df0ed1a92e2ec94a302; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lwp_notification
    ADD CONSTRAINT "FK_66125e54df0ed1a92e2ec94a302" FOREIGN KEY ("logCreatedById") REFERENCES public.lwp_user(id) ON DELETE SET NULL DEFERRABLE;


--
-- Name: lwp_class_topic FK_6706c04f4503fce8d3a9a5dad92; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lwp_class_topic
    ADD CONSTRAINT "FK_6706c04f4503fce8d3a9a5dad92" FOREIGN KEY ("classId") REFERENCES public.lwp_school_class(id) ON DELETE CASCADE;


--
-- Name: static_lwp_topic_tag FK_6751a3de932c6c8a10fc5e8c2df; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.static_lwp_topic_tag
    ADD CONSTRAINT "FK_6751a3de932c6c8a10fc5e8c2df" FOREIGN KEY ("logCreatedById") REFERENCES public.lwp_user(id) ON DELETE SET NULL DEFERRABLE;


--
-- Name: lwp_school_impact_report FK_69c777042c2edaa3404c9804b38; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lwp_school_impact_report
    ADD CONSTRAINT "FK_69c777042c2edaa3404c9804b38" FOREIGN KEY ("schoolId") REFERENCES public.lwp_school(id) ON DELETE CASCADE;


--
-- Name: imported_student FK_69fda933a456b29ca2fdcbc1298; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.imported_student
    ADD CONSTRAINT "FK_69fda933a456b29ca2fdcbc1298" FOREIGN KEY ("lwpPupilId") REFERENCES public.lwp_pupil(id) ON DELETE SET NULL DEFERRABLE;


--
-- Name: imported_school FK_6bb3e8b21bfeac40c064aac2c5a; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.imported_school
    ADD CONSTRAINT "FK_6bb3e8b21bfeac40c064aac2c5a" FOREIGN KEY ("proposedSchoolId") REFERENCES public.lwp_school(id) ON DELETE CASCADE DEFERRABLE;


--
-- Name: imported_student FK_6cf14575292716f2837fd4915c5; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.imported_student
    ADD CONSTRAINT "FK_6cf14575292716f2837fd4915c5" FOREIGN KEY ("schoolId") REFERENCES public.imported_school(id) ON DELETE CASCADE DEFERRABLE;


--
-- Name: lwp_class_sequence_assignment FK_6d29d30843337e30775ad14bf74; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lwp_class_sequence_assignment
    ADD CONSTRAINT "FK_6d29d30843337e30775ad14bf74" FOREIGN KEY ("sequenceId") REFERENCES public.static_lwp_topic_sequence(id) ON DELETE SET NULL;


--
-- Name: lwp_class_topic FK_6d2f8d4af7840a9961ab3266c1f; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lwp_class_topic
    ADD CONSTRAINT "FK_6d2f8d4af7840a9961ab3266c1f" FOREIGN KEY ("logCreatedById") REFERENCES public.lwp_user(id) ON DELETE SET NULL DEFERRABLE;


--
-- Name: lwp_school_holidays FK_6da9024ce11b794ce5ad14a9bee; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lwp_school_holidays
    ADD CONSTRAINT "FK_6da9024ce11b794ce5ad14a9bee" FOREIGN KEY ("lwpSchoolId") REFERENCES public.lwp_school(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: lwp_user_tooltip_history FK_6de6dec113817625220ee50fc90; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lwp_user_tooltip_history
    ADD CONSTRAINT "FK_6de6dec113817625220ee50fc90" FOREIGN KEY ("featureTooltipId") REFERENCES public.static_lwp_feature_tooltip(id) ON DELETE SET NULL;


--
-- Name: lwp_pupil_feedback_media FK_6efdd2affbf620737afee371524; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lwp_pupil_feedback_media
    ADD CONSTRAINT "FK_6efdd2affbf620737afee371524" FOREIGN KEY ("logCreatedById") REFERENCES public.lwp_user(id) ON DELETE SET NULL DEFERRABLE;


--
-- Name: static_lwp_feature_tooltip FK_6f26ef0bd27df4e4fbca71d9cc0; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.static_lwp_feature_tooltip
    ADD CONSTRAINT "FK_6f26ef0bd27df4e4fbca71d9cc0" FOREIGN KEY ("logCreatedById") REFERENCES public.lwp_user(id) ON DELETE SET NULL;


--
-- Name: lwp_class_pupil FK_6ffb008a0098499deb896d55955; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lwp_class_pupil
    ADD CONSTRAINT "FK_6ffb008a0098499deb896d55955" FOREIGN KEY ("lwpPupilId") REFERENCES public.lwp_pupil(id) ON UPDATE CASCADE ON DELETE CASCADE DEFERRABLE;


--
-- Name: lwp_class_subjects FK_701f16c4ea9031846285e7d5224; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lwp_class_subjects
    ADD CONSTRAINT "FK_701f16c4ea9031846285e7d5224" FOREIGN KEY ("lwpSchoolClassId") REFERENCES public.lwp_school_class(id) ON DELETE CASCADE;


--
-- Name: lwp_user_page_announcement FK_710266aa10ba8639a8df0bda184; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lwp_user_page_announcement
    ADD CONSTRAINT "FK_710266aa10ba8639a8df0bda184" FOREIGN KEY ("userId") REFERENCES public.lwp_user(id) ON DELETE CASCADE;


--
-- Name: static_lwp_resource FK_717bdce37292529e51213e85c85; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.static_lwp_resource
    ADD CONSTRAINT "FK_717bdce37292529e51213e85c85" FOREIGN KEY ("logUpdatedById") REFERENCES public.lwp_user(id) ON DELETE SET NULL DEFERRABLE;


--
-- Name: static_lwp_activity_steps FK_71da5ce3407be69a22ae9879c88; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.static_lwp_activity_steps
    ADD CONSTRAINT "FK_71da5ce3407be69a22ae9879c88" FOREIGN KEY ("modalId") REFERENCES public.static_lwp_modal(id) ON DELETE SET NULL;


--
-- Name: lwp_pupil_activity_feedback FK_7247af0fb6a837433910bae2819; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lwp_pupil_activity_feedback
    ADD CONSTRAINT "FK_7247af0fb6a837433910bae2819" FOREIGN KEY ("logUpdatedById") REFERENCES public.lwp_user(id) ON DELETE SET NULL DEFERRABLE;


--
-- Name: lwp_topic_year_groups FK_74ec697bf0e09b8e9cbb315b188; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lwp_topic_year_groups
    ADD CONSTRAINT "FK_74ec697bf0e09b8e9cbb315b188" FOREIGN KEY ("staticLwpYearGroupId") REFERENCES public.static_lwp_year_group(id) DEFERRABLE;


--
-- Name: lwp_pupil_mathscot FK_75a1f6bc37c94733f7d07ccdf1e; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lwp_pupil_mathscot
    ADD CONSTRAINT "FK_75a1f6bc37c94733f7d07ccdf1e" FOREIGN KEY ("periodIndex") REFERENCES public.static_lwp_period(index) ON DELETE RESTRICT;


--
-- Name: imported_school_class FK_76379a02c944a9df9922feeb932; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.imported_school_class
    ADD CONSTRAINT "FK_76379a02c944a9df9922feeb932" FOREIGN KEY ("lwpSchoolClassId") REFERENCES public.lwp_school_class(id) ON DELETE SET NULL DEFERRABLE;


--
-- Name: static_lwp_period FK_76ebbcc2bd77860732d59e7fec6; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.static_lwp_period
    ADD CONSTRAINT "FK_76ebbcc2bd77860732d59e7fec6" FOREIGN KEY ("previousPeriodIndex") REFERENCES public.static_lwp_period(index) ON DELETE SET NULL DEFERRABLE;


--
-- Name: lwp_school_dates FK_771710799b2752e6c993b0647e7; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lwp_school_dates
    ADD CONSTRAINT "FK_771710799b2752e6c993b0647e7" FOREIGN KEY ("logUpdatedById") REFERENCES public.lwp_user(id) ON DELETE SET NULL DEFERRABLE;


--
-- Name: lwp_user_associated_login FK_7773d6f4bfb3f1047340409a5f3; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lwp_user_associated_login
    ADD CONSTRAINT "FK_7773d6f4bfb3f1047340409a5f3" FOREIGN KEY ("deletedById") REFERENCES public.lwp_user(id) ON DELETE SET NULL DEFERRABLE;


--
-- Name: lwp_pupil_feedback_edit_log FK_778cd0bf9a5918ebeccd79da7bd; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lwp_pupil_feedback_edit_log
    ADD CONSTRAINT "FK_778cd0bf9a5918ebeccd79da7bd" FOREIGN KEY ("feedbackId") REFERENCES public.lwp_pupil_feedback(id) ON DELETE CASCADE DEFERRABLE;


--
-- Name: static_lwp_modal FK_787e185dd5b12c5d8fc66aed0c8; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.static_lwp_modal
    ADD CONSTRAINT "FK_787e185dd5b12c5d8fc66aed0c8" FOREIGN KEY ("logCreatedById") REFERENCES public.lwp_user(id) ON DELETE SET NULL DEFERRABLE;


--
-- Name: imported_student_contact FK_7887f55f5621933a33d291e959f; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.imported_student_contact
    ADD CONSTRAINT "FK_7887f55f5621933a33d291e959f" FOREIGN KEY ("importedStudentId") REFERENCES public.imported_student(id) ON DELETE CASCADE DEFERRABLE;


--
-- Name: static_lwp_features FK_78c748cf7a31641237cc68d0ae4; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.static_lwp_features
    ADD CONSTRAINT "FK_78c748cf7a31641237cc68d0ae4" FOREIGN KEY ("logCreatedById") REFERENCES public.lwp_user(id) ON DELETE SET NULL DEFERRABLE;


--
-- Name: lwp_pupil_tag FK_78e25a8e1141d213da6406c4a2c; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lwp_pupil_tag
    ADD CONSTRAINT "FK_78e25a8e1141d213da6406c4a2c" FOREIGN KEY ("deletedById") REFERENCES public.lwp_user(id) ON DELETE SET NULL DEFERRABLE;


--
-- Name: static_lwp_topic_domain FK_795faebf34cac5923dc012743d4; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.static_lwp_topic_domain
    ADD CONSTRAINT "FK_795faebf34cac5923dc012743d4" FOREIGN KEY ("logUpdatedById") REFERENCES public.lwp_user(id) ON DELETE SET NULL DEFERRABLE;


--
-- Name: static_lwp_faq FK_7a3ce64e96f8cea64723fc268ee; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.static_lwp_faq
    ADD CONSTRAINT "FK_7a3ce64e96f8cea64723fc268ee" FOREIGN KEY ("logUpdatedById") REFERENCES public.lwp_user(id) ON DELETE SET NULL DEFERRABLE;


--
-- Name: lwp_user_interstitial FK_7a804a3c3880408d571c068b07b; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lwp_user_interstitial
    ADD CONSTRAINT "FK_7a804a3c3880408d571c068b07b" FOREIGN KEY ("interstitialId") REFERENCES public.static_lwp_interstitial(id) ON DELETE CASCADE;


--
-- Name: static_lwp_topic_sequence FK_7aa7195aa7dd08de3fe5c818d78; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.static_lwp_topic_sequence
    ADD CONSTRAINT "FK_7aa7195aa7dd08de3fe5c818d78" FOREIGN KEY ("subjectId") REFERENCES public.static_lwp_subject(id) ON DELETE RESTRICT;


--
-- Name: lwp_school_holiday FK_7ba77137c56781fb8f116ad2a45; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lwp_school_holiday
    ADD CONSTRAINT "FK_7ba77137c56781fb8f116ad2a45" FOREIGN KEY ("periodIndex") REFERENCES public.static_lwp_period(index) ON DELETE RESTRICT;


--
-- Name: static_lwp_topic_tag FK_7ba90d8508a5d220d878b20b893; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.static_lwp_topic_tag
    ADD CONSTRAINT "FK_7ba90d8508a5d220d878b20b893" FOREIGN KEY ("logUpdatedById") REFERENCES public.lwp_user(id) ON DELETE SET NULL DEFERRABLE;


--
-- Name: lwp_school_class FK_7be148edb9ff8ca3ffa41bc394d; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lwp_school_class
    ADD CONSTRAINT "FK_7be148edb9ff8ca3ffa41bc394d" FOREIGN KEY ("periodIndex") REFERENCES public.static_lwp_period(index) ON DELETE RESTRICT;


--
-- Name: lwp_school_holiday FK_7c62de4d52d33cb7000554ffaab; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lwp_school_holiday
    ADD CONSTRAINT "FK_7c62de4d52d33cb7000554ffaab" FOREIGN KEY ("logUpdatedById") REFERENCES public.lwp_user(id) ON DELETE SET NULL DEFERRABLE;


--
-- Name: lwp_school_class FK_7d4cfca9d87858f7ec57c262f1e; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lwp_school_class
    ADD CONSTRAINT "FK_7d4cfca9d87858f7ec57c262f1e" FOREIGN KEY ("parentClassId") REFERENCES public.lwp_school_class(id) ON DELETE CASCADE;


--
-- Name: lwp_domain_year_groups FK_7dd2e51924f7835aade34674424; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lwp_domain_year_groups
    ADD CONSTRAINT "FK_7dd2e51924f7835aade34674424" FOREIGN KEY ("staticLwpTopicDomainId") REFERENCES public.static_lwp_topic_domain(id) ON UPDATE CASCADE ON DELETE CASCADE DEFERRABLE;


--
-- Name: lwp_pupil_feedback_edit_log FK_7e01a08468e5fb8d5bd5f6ed9f9; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lwp_pupil_feedback_edit_log
    ADD CONSTRAINT "FK_7e01a08468e5fb8d5bd5f6ed9f9" FOREIGN KEY ("logCreatedById") REFERENCES public.lwp_user(id) ON DELETE SET NULL DEFERRABLE;


--
-- Name: lwp_pupil_activity_feedback FK_7e05629a16c06efaea253c4fbc4; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lwp_pupil_activity_feedback
    ADD CONSTRAINT "FK_7e05629a16c06efaea253c4fbc4" FOREIGN KEY ("deletedById") REFERENCES public.lwp_user(id) ON DELETE SET NULL DEFERRABLE;


--
-- Name: wonde_pupil FK_7e523d5e830cf5ce507156031c8; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wonde_pupil
    ADD CONSTRAINT "FK_7e523d5e830cf5ce507156031c8" FOREIGN KEY ("lwpPupilId") REFERENCES public.lwp_pupil(id) DEFERRABLE;


--
-- Name: lwp_class_teacher FK_7f2306880a317351b6e621d0e19; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lwp_class_teacher
    ADD CONSTRAINT "FK_7f2306880a317351b6e621d0e19" FOREIGN KEY ("lwpSchoolClassId") REFERENCES public.lwp_school_class(id) ON DELETE CASCADE;


--
-- Name: lwp_feedback_reply FK_8019bce83a2fb14f7a4acdbb974; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lwp_feedback_reply
    ADD CONSTRAINT "FK_8019bce83a2fb14f7a4acdbb974" FOREIGN KEY ("logCreatedById") REFERENCES public.lwp_user(id) ON DELETE SET NULL DEFERRABLE;


--
-- Name: lwp_pupil_trophy FK_80a7d4df6b1d2edc3b14b5ab570; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lwp_pupil_trophy
    ADD CONSTRAINT "FK_80a7d4df6b1d2edc3b14b5ab570" FOREIGN KEY ("schoolClassId") REFERENCES public.lwp_school_class(id) ON DELETE SET NULL;


--
-- Name: static_lwp_whole_school_sequence_member FK_811ab1ecba16aaefbb473a5af97; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.static_lwp_whole_school_sequence_member
    ADD CONSTRAINT "FK_811ab1ecba16aaefbb473a5af97" FOREIGN KEY ("sequenceId") REFERENCES public.static_lwp_topic_sequence(id) ON DELETE RESTRICT;


--
-- Name: static_lwp_parameter FK_82fc14817f0ef0b64239c3abd55; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.static_lwp_parameter
    ADD CONSTRAINT "FK_82fc14817f0ef0b64239c3abd55" FOREIGN KEY ("logCreatedById") REFERENCES public.lwp_user(id) ON DELETE SET NULL DEFERRABLE;


--
-- Name: imported_school FK_873c0d696fddc98663dbb58e31d; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.imported_school
    ADD CONSTRAINT "FK_873c0d696fddc98663dbb58e31d" FOREIGN KEY ("lwpSchoolId") REFERENCES public.lwp_school(id) ON DELETE CASCADE DEFERRABLE;


--
-- Name: lwp_pupil_parent FK_87e9dc9ffc9ce8b5ee5c7704f9a; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lwp_pupil_parent
    ADD CONSTRAINT "FK_87e9dc9ffc9ce8b5ee5c7704f9a" FOREIGN KEY ("logUpdatedById") REFERENCES public.lwp_user(id) ON DELETE SET NULL DEFERRABLE;


--
-- Name: static_lwp_subject FK_87fc9f0144987f62c63ed52a1c6; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.static_lwp_subject
    ADD CONSTRAINT "FK_87fc9f0144987f62c63ed52a1c6" FOREIGN KEY ("logCreatedById") REFERENCES public.lwp_user(id) ON DELETE SET NULL DEFERRABLE;


--
-- Name: static_lwp_school_tag FK_8a648f6142f6bf4762d4cf2d3b1; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.static_lwp_school_tag
    ADD CONSTRAINT "FK_8a648f6142f6bf4762d4cf2d3b1" FOREIGN KEY ("logUpdatedById") REFERENCES public.lwp_user(id) ON DELETE SET NULL DEFERRABLE;


--
-- Name: lwp_pupil_activity_feedback FK_8a94cb5f9f5217990060a239e3a; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lwp_pupil_activity_feedback
    ADD CONSTRAINT "FK_8a94cb5f9f5217990060a239e3a" FOREIGN KEY ("pupilId") REFERENCES public.lwp_pupil(id) DEFERRABLE;


--
-- Name: static_lwp_contact FK_8ac597bfb636456e8fc364cf413; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.static_lwp_contact
    ADD CONSTRAINT "FK_8ac597bfb636456e8fc364cf413" FOREIGN KEY ("logCreatedById") REFERENCES public.lwp_user(id) ON DELETE CASCADE DEFERRABLE;


--
-- Name: lwp_class_topic FK_8b41f2bc9d2b812960d38229c50; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lwp_class_topic
    ADD CONSTRAINT "FK_8b41f2bc9d2b812960d38229c50" FOREIGN KEY ("classSequenceAssignmentId") REFERENCES public.lwp_class_sequence_assignment(id) ON DELETE SET NULL;


--
-- Name: lwp_pupil_mathscot FK_8cad5c74a4117a3f54ee2d791c7; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lwp_pupil_mathscot
    ADD CONSTRAINT "FK_8cad5c74a4117a3f54ee2d791c7" FOREIGN KEY ("logUpdatedById") REFERENCES public.lwp_user(id) ON DELETE SET NULL DEFERRABLE;


--
-- Name: log_parent_activity FK_8cb56f5f4ef593346bc93ec7971; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.log_parent_activity
    ADD CONSTRAINT "FK_8cb56f5f4ef593346bc93ec7971" FOREIGN KEY ("logUpdatedById") REFERENCES public.lwp_user(id) ON DELETE SET NULL DEFERRABLE;


--
-- Name: imported_school FK_8d0538ffecef27e643d3a163205; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.imported_school
    ADD CONSTRAINT "FK_8d0538ffecef27e643d3a163205" FOREIGN KEY ("periodIndex") REFERENCES public.static_lwp_period(index) ON DELETE RESTRICT;


--
-- Name: lwp_pupil_feedback_media FK_8d7e47c56aefa9eec9df3172510; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lwp_pupil_feedback_media
    ADD CONSTRAINT "FK_8d7e47c56aefa9eec9df3172510" FOREIGN KEY ("logUpdatedById") REFERENCES public.lwp_user(id) ON DELETE SET NULL DEFERRABLE;


--
-- Name: static_lwp_files FK_8e75c0db68d199f72bae5142b8a; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.static_lwp_files
    ADD CONSTRAINT "FK_8e75c0db68d199f72bae5142b8a" FOREIGN KEY ("logCreatedById") REFERENCES public.lwp_user(id) ON DELETE SET NULL DEFERRABLE;


--
-- Name: static_lwp_staff FK_8e9d879ebc77f6e692146ed0be0; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.static_lwp_staff
    ADD CONSTRAINT "FK_8e9d879ebc77f6e692146ed0be0" FOREIGN KEY ("logUpdatedById") REFERENCES public.lwp_user(id) ON DELETE SET NULL DEFERRABLE;


--
-- Name: lwp_school_impact_report FK_8f09deee8e720e55e9e9fee9a2c; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lwp_school_impact_report
    ADD CONSTRAINT "FK_8f09deee8e720e55e9e9fee9a2c" FOREIGN KEY ("logUpdatedById") REFERENCES public.lwp_user(id) ON DELETE SET NULL DEFERRABLE;


--
-- Name: lwp_sticker FK_8f6bf7e571afd306bafab81f607; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lwp_sticker
    ADD CONSTRAINT "FK_8f6bf7e571afd306bafab81f607" FOREIGN KEY ("logUpdatedById") REFERENCES public.lwp_user(id) ON DELETE SET NULL DEFERRABLE;


--
-- Name: lwp_blog_post FK_9148dfd11e7e8fe95a12067cdff; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lwp_blog_post
    ADD CONSTRAINT "FK_9148dfd11e7e8fe95a12067cdff" FOREIGN KEY ("logCreatedById") REFERENCES public.lwp_user(id) ON DELETE SET NULL DEFERRABLE;


--
-- Name: lwp_user_page_announcement FK_91b5ed313b4cde5f767344206aa; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lwp_user_page_announcement
    ADD CONSTRAINT "FK_91b5ed313b4cde5f767344206aa" FOREIGN KEY ("logCreatedById") REFERENCES public.lwp_user(id) ON DELETE SET NULL;


--
-- Name: static_lwp_news FK_927124abbdc80527aaf40c39454; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.static_lwp_news
    ADD CONSTRAINT "FK_927124abbdc80527aaf40c39454" FOREIGN KEY ("logCreatedById") REFERENCES public.lwp_user(id) ON DELETE SET NULL DEFERRABLE;


--
-- Name: lwp_school_impact_report_feedback FK_92d01a4e47e2e5e70021fd080fe; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lwp_school_impact_report_feedback
    ADD CONSTRAINT "FK_92d01a4e47e2e5e70021fd080fe" FOREIGN KEY ("logCreatedById") REFERENCES public.lwp_user(id) ON DELETE SET NULL DEFERRABLE;


--
-- Name: lwp_class_sequence_assignment FK_93a355ce04c02cf8305e7a764de; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lwp_class_sequence_assignment
    ADD CONSTRAINT "FK_93a355ce04c02cf8305e7a764de" FOREIGN KEY ("logUpdatedById") REFERENCES public.lwp_user(id) ON DELETE SET NULL;


--
-- Name: static_lwp_admin_query FK_941cf21b1baa1009ca8700369c8; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.static_lwp_admin_query
    ADD CONSTRAINT "FK_941cf21b1baa1009ca8700369c8" FOREIGN KEY ("logUpdatedById") REFERENCES public.lwp_user(id) ON DELETE SET NULL DEFERRABLE;


--
-- Name: lwp_user_associated_login FK_94f30c4658579135f5d32d23998; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lwp_user_associated_login
    ADD CONSTRAINT "FK_94f30c4658579135f5d32d23998" FOREIGN KEY ("userId") REFERENCES public.lwp_user(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: lwp_user_page_announcement FK_95c8865a1a4918509816b4692c8; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lwp_user_page_announcement
    ADD CONSTRAINT "FK_95c8865a1a4918509816b4692c8" FOREIGN KEY ("logUpdatedById") REFERENCES public.lwp_user(id) ON DELETE SET NULL;


--
-- Name: static_lwp_activity FK_9661697eb75e3e11890dde67d09; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.static_lwp_activity
    ADD CONSTRAINT "FK_9661697eb75e3e11890dde67d09" FOREIGN KEY ("rationaleModalId") REFERENCES public.static_lwp_modal(id) ON DELETE SET NULL;


--
-- Name: lwp_school_class FK_9712293bbad097999c48154ae62; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lwp_school_class
    ADD CONSTRAINT "FK_9712293bbad097999c48154ae62" FOREIGN KEY ("yearGroup") REFERENCES public.static_lwp_year_group(id) ON DELETE RESTRICT;


--
-- Name: lwp_school_impact_report FK_98a4fb18d2cbec5e9749ae7a8b4; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lwp_school_impact_report
    ADD CONSTRAINT "FK_98a4fb18d2cbec5e9749ae7a8b4" FOREIGN KEY ("periodIndex") REFERENCES public.static_lwp_period(index) ON DELETE RESTRICT;


--
-- Name: imported_school_class_student FK_98f9d5c8ffa862d231ad5d88adf; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.imported_school_class_student
    ADD CONSTRAINT "FK_98f9d5c8ffa862d231ad5d88adf" FOREIGN KEY ("importedStudentId") REFERENCES public.imported_student(id) ON DELETE CASCADE DEFERRABLE;


--
-- Name: static_lwp_program FK_998b928910d00bd81b75ad041d1; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.static_lwp_program
    ADD CONSTRAINT "FK_998b928910d00bd81b75ad041d1" FOREIGN KEY ("logUpdatedById") REFERENCES public.lwp_user(id) ON DELETE SET NULL DEFERRABLE;


--
-- Name: lwp_school_holiday FK_998db88f5b48088826c7ded8953; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lwp_school_holiday
    ADD CONSTRAINT "FK_998db88f5b48088826c7ded8953" FOREIGN KEY ("deletedById") REFERENCES public.lwp_user(id) ON DELETE SET NULL DEFERRABLE;


--
-- Name: lwp_whole_school_sequence_assignment FK_99eb7b3e12f774993f936ae4589; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lwp_whole_school_sequence_assignment
    ADD CONSTRAINT "FK_99eb7b3e12f774993f936ae4589" FOREIGN KEY ("subjectId") REFERENCES public.static_lwp_subject(id) ON DELETE RESTRICT;


--
-- Name: lwp_pupil_feedback_media FK_9b0ec8cb04d577fd6e4384d499c; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lwp_pupil_feedback_media
    ADD CONSTRAINT "FK_9b0ec8cb04d577fd6e4384d499c" FOREIGN KEY ("deletedById") REFERENCES public.lwp_user(id) ON DELETE SET NULL DEFERRABLE;


--
-- Name: wonde_parent_pupil FK_9b4da38958c186ae30da04490f4; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wonde_parent_pupil
    ADD CONSTRAINT "FK_9b4da38958c186ae30da04490f4" FOREIGN KEY ("wondePupilId") REFERENCES public.wonde_pupil(id) ON DELETE CASCADE DEFERRABLE;


--
-- Name: static_lwp_data_query FK_9c317a875d0f7923e5885535fc2; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.static_lwp_data_query
    ADD CONSTRAINT "FK_9c317a875d0f7923e5885535fc2" FOREIGN KEY ("logUpdatedById") REFERENCES public.lwp_user(id) ON DELETE SET NULL DEFERRABLE;


--
-- Name: lwp_school FK_9d47ba874a88d6884ae4d71bd52; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lwp_school
    ADD CONSTRAINT "FK_9d47ba874a88d6884ae4d71bd52" FOREIGN KEY ("logCreatedById") REFERENCES public.lwp_user(id) ON DELETE SET NULL DEFERRABLE;


--
-- Name: imported_school_class FK_9e88162afc52c8f38872ede4f48; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.imported_school_class
    ADD CONSTRAINT "FK_9e88162afc52c8f38872ede4f48" FOREIGN KEY ("periodIndex") REFERENCES public.static_lwp_period(index) ON DELETE RESTRICT;


--
-- Name: lwp_admin_sticker_school_status FK_a01a4c005740ab913adf0726d18; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lwp_admin_sticker_school_status
    ADD CONSTRAINT "FK_a01a4c005740ab913adf0726d18" FOREIGN KEY ("schoolId") REFERENCES public.lwp_school(id) ON DELETE CASCADE DEFERRABLE;


--
-- Name: lwp_pupil_activity_feedback FK_a0c81dc844fd93ef128b596e998; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lwp_pupil_activity_feedback
    ADD CONSTRAINT "FK_a0c81dc844fd93ef128b596e998" FOREIGN KEY ("logCreatedById") REFERENCES public.lwp_user(id) ON DELETE SET NULL DEFERRABLE;


--
-- Name: lwp_pupil_feedback_media FK_a1515e99b330ec6552c4aa7cc3a; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lwp_pupil_feedback_media
    ADD CONSTRAINT "FK_a1515e99b330ec6552c4aa7cc3a" FOREIGN KEY ("feedbackId") REFERENCES public.lwp_pupil_feedback(id) ON DELETE SET NULL DEFERRABLE;


--
-- Name: static_lwp_year_group FK_a15ff23b3be6426d4d2d03ad710; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.static_lwp_year_group
    ADD CONSTRAINT "FK_a15ff23b3be6426d4d2d03ad710" FOREIGN KEY ("logUpdatedById") REFERENCES public.lwp_user(id) ON DELETE SET NULL DEFERRABLE;


--
-- Name: lwp_pupil FK_a29d525fe2df99b183d967312e4; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lwp_pupil
    ADD CONSTRAINT "FK_a29d525fe2df99b183d967312e4" FOREIGN KEY ("schoolId") REFERENCES public.lwp_school(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: log_school_class_license FK_a58714f2da14193cfd898b26de1; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.log_school_class_license
    ADD CONSTRAINT "FK_a58714f2da14193cfd898b26de1" FOREIGN KEY ("logUpdatedById") REFERENCES public.lwp_user(id) ON DELETE SET NULL DEFERRABLE;


--
-- Name: lwp_user FK_a6bae53c6d50d6c9f05ca16fe2e; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lwp_user
    ADD CONSTRAINT "FK_a6bae53c6d50d6c9f05ca16fe2e" FOREIGN KEY ("logCreatedById") REFERENCES public.lwp_user(id) ON DELETE SET NULL DEFERRABLE;


--
-- Name: lwp_school FK_a8655cd0de0ea30db727110d020; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lwp_school
    ADD CONSTRAINT "FK_a8655cd0de0ea30db727110d020" FOREIGN KEY ("logUpdatedById") REFERENCES public.lwp_user(id) ON DELETE SET NULL DEFERRABLE;


--
-- Name: lwp_user_tooltip_history FK_a8d05133c82fb8814ab94ce58dc; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lwp_user_tooltip_history
    ADD CONSTRAINT "FK_a8d05133c82fb8814ab94ce58dc" FOREIGN KEY ("logUpdatedById") REFERENCES public.lwp_user(id) ON DELETE SET NULL DEFERRABLE;


--
-- Name: static_lwp_topic_sequence FK_a97cc03ec9076cdeca3d3217b39; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.static_lwp_topic_sequence
    ADD CONSTRAINT "FK_a97cc03ec9076cdeca3d3217b39" FOREIGN KEY ("yearGroupId") REFERENCES public.static_lwp_year_group(id) ON DELETE RESTRICT;


--
-- Name: static_lwp_topic_domain_year_group FK_a97dcf82701afc0efded9db8feb; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.static_lwp_topic_domain_year_group
    ADD CONSTRAINT "FK_a97dcf82701afc0efded9db8feb" FOREIGN KEY ("yearGroupId") REFERENCES public.static_lwp_year_group(id) ON DELETE CASCADE DEFERRABLE;


--
-- Name: wonde_school_class_user FK_a9e0395312a118ffa5f3087233c; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wonde_school_class_user
    ADD CONSTRAINT "FK_a9e0395312a118ffa5f3087233c" FOREIGN KEY ("wondePupilId") REFERENCES public.wonde_pupil(id) ON DELETE CASCADE DEFERRABLE;


--
-- Name: lwp_school_impact_report FK_aa25272e2c9b6b21c5d331648fa; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lwp_school_impact_report
    ADD CONSTRAINT "FK_aa25272e2c9b6b21c5d331648fa" FOREIGN KEY ("termId") REFERENCES public.lwp_school_dates(id) ON DELETE RESTRICT;


--
-- Name: static_lwp_page_announcement FK_ac7c56a7b558b55834ed606d26a; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.static_lwp_page_announcement
    ADD CONSTRAINT "FK_ac7c56a7b558b55834ed606d26a" FOREIGN KEY ("logCreatedById") REFERENCES public.lwp_user(id) ON DELETE SET NULL;


--
-- Name: static_lwp_email_template FK_ad67af2a7d0eb9e2105a24201d4; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.static_lwp_email_template
    ADD CONSTRAINT "FK_ad67af2a7d0eb9e2105a24201d4" FOREIGN KEY ("logCreatedById") REFERENCES public.lwp_user(id) ON DELETE SET NULL DEFERRABLE;


--
-- Name: static_lwp_faq FK_ad96c8e531a7d33b0c14947bf1d; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.static_lwp_faq
    ADD CONSTRAINT "FK_ad96c8e531a7d33b0c14947bf1d" FOREIGN KEY ("logCreatedById") REFERENCES public.lwp_user(id) ON DELETE SET NULL DEFERRABLE;


--
-- Name: log_lwp_contact FK_adb1eca4cb3c8486cff649aa2f5; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.log_lwp_contact
    ADD CONSTRAINT "FK_adb1eca4cb3c8486cff649aa2f5" FOREIGN KEY ("logCreatedById") REFERENCES public.lwp_user(id) ON DELETE SET NULL DEFERRABLE;


--
-- Name: lwp_pupil_tag FK_adc3799b3fafff1125b6840e561; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lwp_pupil_tag
    ADD CONSTRAINT "FK_adc3799b3fafff1125b6840e561" FOREIGN KEY ("schoolId") REFERENCES public.lwp_school(id) ON DELETE CASCADE DEFERRABLE;


--
-- Name: lwp_sticker_character_item FK_ae03fdb6994a432366d29e3d9af; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lwp_sticker_character_item
    ADD CONSTRAINT "FK_ae03fdb6994a432366d29e3d9af" FOREIGN KEY ("logUpdatedById") REFERENCES public.lwp_user(id) ON DELETE SET NULL DEFERRABLE;


--
-- Name: lwp_sticker FK_aeff9636071d001b32586037c4c; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lwp_sticker
    ADD CONSTRAINT "FK_aeff9636071d001b32586037c4c" FOREIGN KEY ("itemId") REFERENCES public.lwp_sticker_character_item(id) ON DELETE SET NULL DEFERRABLE;


--
-- Name: lwp_pupil_activity FK_b0c69ed64ccf659c5cbbed112f7; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lwp_pupil_activity
    ADD CONSTRAINT "FK_b0c69ed64ccf659c5cbbed112f7" FOREIGN KEY ("deletedById") REFERENCES public.lwp_user(id) ON DELETE SET NULL DEFERRABLE;


--
-- Name: static_lwp_whole_school_sequence FK_b1338181c3cedda4b30acb0e283; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.static_lwp_whole_school_sequence
    ADD CONSTRAINT "FK_b1338181c3cedda4b30acb0e283" FOREIGN KEY ("logUpdatedById") REFERENCES public.lwp_user(id) ON DELETE SET NULL;


--
-- Name: lwp_pupil_feedback FK_b27674871a58aa5a9ef34d0e2ac; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lwp_pupil_feedback
    ADD CONSTRAINT "FK_b27674871a58aa5a9ef34d0e2ac" FOREIGN KEY ("tickedById") REFERENCES public.lwp_user(id) ON DELETE SET NULL DEFERRABLE;


--
-- Name: lwp_trophy_subjects FK_b29da7091980e90f89dc4f134ac; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lwp_trophy_subjects
    ADD CONSTRAINT "FK_b29da7091980e90f89dc4f134ac" FOREIGN KEY ("staticLwpTrophyId") REFERENCES public.static_lwp_trophy(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: lwp_reading_log FK_b335d94a1635cc277fc9930c37e; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lwp_reading_log
    ADD CONSTRAINT "FK_b335d94a1635cc277fc9930c37e" FOREIGN KEY ("pupilTopicId") REFERENCES public.lwp_pupil_topic(id) DEFERRABLE;


--
-- Name: lwp_pupil_feedback_history FK_b3d815fc22fed4cabc54a751de6; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lwp_pupil_feedback_history
    ADD CONSTRAINT "FK_b3d815fc22fed4cabc54a751de6" FOREIGN KEY ("lwpPupilFeedbackId") REFERENCES public.lwp_pupil_feedback(id) ON DELETE CASCADE;


--
-- Name: lwp_school_class FK_b44ed3f4d72ebca63d2d9961e6b; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lwp_school_class
    ADD CONSTRAINT "FK_b44ed3f4d72ebca63d2d9961e6b" FOREIGN KEY ("mainTeacherId") REFERENCES public.lwp_user(id) ON DELETE SET NULL DEFERRABLE;


--
-- Name: lwp_admin_sticker_school_status FK_b51999f0b02716f56adc59ad8d4; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lwp_admin_sticker_school_status
    ADD CONSTRAINT "FK_b51999f0b02716f56adc59ad8d4" FOREIGN KEY ("logUpdatedById") REFERENCES public.lwp_user(id) ON DELETE SET NULL DEFERRABLE;


--
-- Name: lwp_pupil FK_b5a4ab848388aaf0b61340aaa8c; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lwp_pupil
    ADD CONSTRAINT "FK_b5a4ab848388aaf0b61340aaa8c" FOREIGN KEY ("logCreatedById") REFERENCES public.lwp_user(id) ON DELETE SET NULL DEFERRABLE;


--
-- Name: lwp_school_static_tags FK_b5f11483d6f415906ad5e5983c0; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lwp_school_static_tags
    ADD CONSTRAINT "FK_b5f11483d6f415906ad5e5983c0" FOREIGN KEY ("tagId") REFERENCES public.static_lwp_school_tag(id) ON DELETE CASCADE DEFERRABLE;


--
-- Name: wonde_contact_student FK_b5f4856fe443aea6e1d91db64df; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wonde_contact_student
    ADD CONSTRAINT "FK_b5f4856fe443aea6e1d91db64df" FOREIGN KEY ("wondeContactId") REFERENCES public.imported_contact(id) ON DELETE CASCADE DEFERRABLE;


--
-- Name: lwp_user_interstitial FK_b8244b3c456d9332d0320d2e004; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lwp_user_interstitial
    ADD CONSTRAINT "FK_b8244b3c456d9332d0320d2e004" FOREIGN KEY ("logUpdatedById") REFERENCES public.lwp_user(id) ON DELETE SET NULL DEFERRABLE;


--
-- Name: static_lwp_program FK_b90c802c94cdd3f0914e97f2526; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.static_lwp_program
    ADD CONSTRAINT "FK_b90c802c94cdd3f0914e97f2526" FOREIGN KEY ("deletedById") REFERENCES public.lwp_user(id) ON DELETE SET NULL DEFERRABLE;


--
-- Name: static_lwp_topic_sequence FK_b9660f31445d7310736437175a3; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.static_lwp_topic_sequence
    ADD CONSTRAINT "FK_b9660f31445d7310736437175a3" FOREIGN KEY ("logCreatedById") REFERENCES public.lwp_user(id) ON DELETE SET NULL;


--
-- Name: static_lwp_modal FK_b99bccfe69966d60358e997bc67; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.static_lwp_modal
    ADD CONSTRAINT "FK_b99bccfe69966d60358e997bc67" FOREIGN KEY ("logUpdatedById") REFERENCES public.lwp_user(id) ON DELETE SET NULL DEFERRABLE;


--
-- Name: static_lwp_topic_domain_year_group FK_ba0255d7bbdab6a0f1bc022b89b; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.static_lwp_topic_domain_year_group
    ADD CONSTRAINT "FK_ba0255d7bbdab6a0f1bc022b89b" FOREIGN KEY ("topicId") REFERENCES public.static_lwp_topic(id) ON DELETE CASCADE DEFERRABLE;


--
-- Name: lwp_parent_pupil_imported FK_bb93e46f7bde371d8e7a4304aeb; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lwp_parent_pupil_imported
    ADD CONSTRAINT "FK_bb93e46f7bde371d8e7a4304aeb" FOREIGN KEY ("lwpUserId") REFERENCES public.lwp_user(id) DEFERRABLE;


--
-- Name: static_lwp_period FK_bc2f2bdb1b0af114ed923f25400; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.static_lwp_period
    ADD CONSTRAINT "FK_bc2f2bdb1b0af114ed923f25400" FOREIGN KEY ("logCreatedById") REFERENCES public.lwp_user(id) ON DELETE SET NULL DEFERRABLE;


--
-- Name: lwp_user_page_announcement FK_bcafec249e3cb5cf552270412e5; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lwp_user_page_announcement
    ADD CONSTRAINT "FK_bcafec249e3cb5cf552270412e5" FOREIGN KEY ("pageAnnouncementId") REFERENCES public.static_lwp_page_announcement(id) ON DELETE CASCADE;


--
-- Name: static_lwp_topic_sequence_item FK_bd7f79c52a3d7e0f7c306906176; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.static_lwp_topic_sequence_item
    ADD CONSTRAINT "FK_bd7f79c52a3d7e0f7c306906176" FOREIGN KEY ("topicId") REFERENCES public.static_lwp_topic(id) ON DELETE RESTRICT;


--
-- Name: static_lwp_whole_school_sequence_member FK_be5a6de81153750e487cc0ff6fc; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.static_lwp_whole_school_sequence_member
    ADD CONSTRAINT "FK_be5a6de81153750e487cc0ff6fc" FOREIGN KEY ("wholeSchoolSequenceId") REFERENCES public.static_lwp_whole_school_sequence(id) ON DELETE CASCADE;


--
-- Name: lwp_pupil_tag_pupil FK_c073f5bf6bec7433a90dac58f4b; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lwp_pupil_tag_pupil
    ADD CONSTRAINT "FK_c073f5bf6bec7433a90dac58f4b" FOREIGN KEY ("lwpPupilTagId") REFERENCES public.lwp_pupil_tag(id) ON UPDATE CASCADE ON DELETE CASCADE DEFERRABLE;


--
-- Name: lwp_user FK_c11cc3e1832ec9b6fdc033b1f68; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lwp_user
    ADD CONSTRAINT "FK_c11cc3e1832ec9b6fdc033b1f68" FOREIGN KEY ("deletedById") REFERENCES public.lwp_user(id) ON DELETE SET NULL DEFERRABLE;


--
-- Name: lwp_topic_tags FK_c6019e142545572e5aff10dda4f; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lwp_topic_tags
    ADD CONSTRAINT "FK_c6019e142545572e5aff10dda4f" FOREIGN KEY ("staticLwpTopicId") REFERENCES public.static_lwp_topic(id) ON UPDATE CASCADE ON DELETE CASCADE DEFERRABLE;


--
-- Name: lwp_reading_log FK_c758902c7383fc484cb3838c88c; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lwp_reading_log
    ADD CONSTRAINT "FK_c758902c7383fc484cb3838c88c" FOREIGN KEY ("logCreatedById") REFERENCES public.lwp_user(id) ON DELETE SET NULL DEFERRABLE;


--
-- Name: lwp_pupil_topic_sbt_step_media FK_c8202e1571c50001f58d3ea213e; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lwp_pupil_topic_sbt_step_media
    ADD CONSTRAINT "FK_c8202e1571c50001f58d3ea213e" FOREIGN KEY ("lwpPupilTopicId") REFERENCES public.lwp_pupil_topic(id);


--
-- Name: static_lwp_activity_steps FK_c8f1d4ebd6ed1b80a4347a0213b; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.static_lwp_activity_steps
    ADD CONSTRAINT "FK_c8f1d4ebd6ed1b80a4347a0213b" FOREIGN KEY ("deletedById") REFERENCES public.lwp_user(id) ON DELETE SET NULL DEFERRABLE;


--
-- Name: lwp_pupil_trophy FK_cc24334d0a96e5f4debcf0fad4e; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lwp_pupil_trophy
    ADD CONSTRAINT "FK_cc24334d0a96e5f4debcf0fad4e" FOREIGN KEY ("logUpdatedById") REFERENCES public.lwp_user(id) ON DELETE SET NULL DEFERRABLE;


--
-- Name: lwp_pupil_topic FK_d04d2144098f4ef6937704ee88a; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lwp_pupil_topic
    ADD CONSTRAINT "FK_d04d2144098f4ef6937704ee88a" FOREIGN KEY ("topicId") REFERENCES public.static_lwp_topic(id) ON DELETE RESTRICT;


--
-- Name: static_lwp_whole_school_sequence FK_d1dc2ff8f84e50d62ef01ffebf4; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.static_lwp_whole_school_sequence
    ADD CONSTRAINT "FK_d1dc2ff8f84e50d62ef01ffebf4" FOREIGN KEY ("periodIndex") REFERENCES public.static_lwp_period(index) ON DELETE RESTRICT;


--
-- Name: lwp_user FK_d2d40ddc1cee199bec2f93f8add; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lwp_user
    ADD CONSTRAINT "FK_d2d40ddc1cee199bec2f93f8add" FOREIGN KEY ("logUpdatedById") REFERENCES public.lwp_user(id) ON DELETE SET NULL DEFERRABLE;


--
-- Name: static_lwp_email_template FK_d315af31fd70fb8f7232de033d9; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.static_lwp_email_template
    ADD CONSTRAINT "FK_d315af31fd70fb8f7232de033d9" FOREIGN KEY ("lwpNotificationId") REFERENCES public.lwp_notification(id) ON DELETE SET NULL DEFERRABLE;


--
-- Name: static_lwp_topic_sequence FK_d3c67b6a0fa260f0a207b5b24c9; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.static_lwp_topic_sequence
    ADD CONSTRAINT "FK_d3c67b6a0fa260f0a207b5b24c9" FOREIGN KEY ("periodIndex") REFERENCES public.static_lwp_period(index) ON DELETE RESTRICT;


--
-- Name: static_lwp_whole_school_sequence_member FK_d3faa4307272bb302a429decc63; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.static_lwp_whole_school_sequence_member
    ADD CONSTRAINT "FK_d3faa4307272bb302a429decc63" FOREIGN KEY ("logUpdatedById") REFERENCES public.lwp_user(id) ON DELETE SET NULL;


--
-- Name: static_lwp_interstitial FK_d4c298103da504ce2bd6aed54ac; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.static_lwp_interstitial
    ADD CONSTRAINT "FK_d4c298103da504ce2bd6aed54ac" FOREIGN KEY ("logUpdatedById") REFERENCES public.lwp_user(id) ON DELETE SET NULL DEFERRABLE;


--
-- Name: static_lwp_year_group FK_d4cc56a4a584209ccfc183ead10; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.static_lwp_year_group
    ADD CONSTRAINT "FK_d4cc56a4a584209ccfc183ead10" FOREIGN KEY ("logCreatedById") REFERENCES public.lwp_user(id) ON DELETE SET NULL DEFERRABLE;


--
-- Name: imported_contact FK_d4e185faa0eefe66a188e31cb6b; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.imported_contact
    ADD CONSTRAINT "FK_d4e185faa0eefe66a188e31cb6b" FOREIGN KEY ("lwpUserId") REFERENCES public.lwp_user(id) ON DELETE SET NULL DEFERRABLE;


--
-- Name: lwp_reading_log FK_d4f5ffe9f3bb5b5a1d8a1af96a2; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lwp_reading_log
    ADD CONSTRAINT "FK_d4f5ffe9f3bb5b5a1d8a1af96a2" FOREIGN KEY ("logUpdatedById") REFERENCES public.lwp_user(id) ON DELETE SET NULL DEFERRABLE;


--
-- Name: lwp_pupil_activity FK_d4f850f36449eb270ed351ffbd7; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lwp_pupil_activity
    ADD CONSTRAINT "FK_d4f850f36449eb270ed351ffbd7" FOREIGN KEY ("logCreatedById") REFERENCES public.lwp_user(id) ON DELETE SET NULL DEFERRABLE;


--
-- Name: static_lwp_feature_tooltip FK_d5eac1380c3d652c69a2cba5756; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.static_lwp_feature_tooltip
    ADD CONSTRAINT "FK_d5eac1380c3d652c69a2cba5756" FOREIGN KEY ("deletedById") REFERENCES public.lwp_user(id) ON DELETE SET NULL;


--
-- Name: lwp_pupil_topic FK_d7129a850dfa514a11d7513654a; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lwp_pupil_topic
    ADD CONSTRAINT "FK_d7129a850dfa514a11d7513654a" FOREIGN KEY ("deletedById") REFERENCES public.lwp_user(id) ON DELETE SET NULL DEFERRABLE;


--
-- Name: static_lwp_whole_school_sequence_member FK_d7374797c1ac40f19166ffbe6a7; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.static_lwp_whole_school_sequence_member
    ADD CONSTRAINT "FK_d7374797c1ac40f19166ffbe6a7" FOREIGN KEY ("yearGroupId") REFERENCES public.static_lwp_year_group(id) ON DELETE RESTRICT;


--
-- Name: lwp_pupil_activity FK_d74169e9556eaf2fd691efdb366; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lwp_pupil_activity
    ADD CONSTRAINT "FK_d74169e9556eaf2fd691efdb366" FOREIGN KEY ("activityId") REFERENCES public.static_lwp_activity(id) ON DELETE RESTRICT;


--
-- Name: log_parent_topic FK_d814ad29e9f058105ef64880a4e; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.log_parent_topic
    ADD CONSTRAINT "FK_d814ad29e9f058105ef64880a4e" FOREIGN KEY ("logUpdatedById") REFERENCES public.lwp_user(id) ON DELETE SET NULL DEFERRABLE;


--
-- Name: lwp_school_class FK_d8becb2a1d3359f1595f45300a6; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lwp_school_class
    ADD CONSTRAINT "FK_d8becb2a1d3359f1595f45300a6" FOREIGN KEY ("logUpdatedById") REFERENCES public.lwp_user(id) ON DELETE SET NULL DEFERRABLE;


--
-- Name: lwp_user_interstitial FK_d8cc8a8bb88bb96b14479acd922; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lwp_user_interstitial
    ADD CONSTRAINT "FK_d8cc8a8bb88bb96b14479acd922" FOREIGN KEY ("logCreatedById") REFERENCES public.lwp_user(id) ON DELETE SET NULL DEFERRABLE;


--
-- Name: static_lwp_topic_domain FK_d8e04c34539afb0a8c5c377bab6; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.static_lwp_topic_domain
    ADD CONSTRAINT "FK_d8e04c34539afb0a8c5c377bab6" FOREIGN KEY ("logCreatedById") REFERENCES public.lwp_user(id) ON DELETE SET NULL DEFERRABLE;


--
-- Name: lwp_pupil_feedback FK_d9f63cf96aa629f7dd0f4047aff; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lwp_pupil_feedback
    ADD CONSTRAINT "FK_d9f63cf96aa629f7dd0f4047aff" FOREIGN KEY ("logCreatedById") REFERENCES public.lwp_user(id) ON DELETE SET NULL DEFERRABLE;


--
-- Name: lwp_pupil_parent FK_da532eeb17709fb5ab959ee6a9c; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lwp_pupil_parent
    ADD CONSTRAINT "FK_da532eeb17709fb5ab959ee6a9c" FOREIGN KEY ("deletedById") REFERENCES public.lwp_user(id) ON DELETE SET NULL DEFERRABLE;


--
-- Name: static_lwp_topic_sequence_item FK_da76dd27319e273f02ace9a4554; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.static_lwp_topic_sequence_item
    ADD CONSTRAINT "FK_da76dd27319e273f02ace9a4554" FOREIGN KEY ("logUpdatedById") REFERENCES public.lwp_user(id) ON DELETE SET NULL;


--
-- Name: log_lwp_parent_sticker_notification FK_da7bc4fd8a81140ce3864938572; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.log_lwp_parent_sticker_notification
    ADD CONSTRAINT "FK_da7bc4fd8a81140ce3864938572" FOREIGN KEY ("feedbackId") REFERENCES public.lwp_pupil_feedback(id) ON DELETE SET NULL DEFERRABLE;


--
-- Name: static_lwp_features FK_dc1a9dffbea825626a6c2822c45; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.static_lwp_features
    ADD CONSTRAINT "FK_dc1a9dffbea825626a6c2822c45" FOREIGN KEY ("logUpdatedById") REFERENCES public.lwp_user(id) ON DELETE SET NULL DEFERRABLE;


--
-- Name: lwp_user_interstitial FK_dc74a6d9174f1d33b88e060828e; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lwp_user_interstitial
    ADD CONSTRAINT "FK_dc74a6d9174f1d33b88e060828e" FOREIGN KEY ("deletedById") REFERENCES public.lwp_user(id) ON DELETE SET NULL DEFERRABLE;


--
-- Name: lwp_parent_pupil FK_dca2804565d4955f17444e53477; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lwp_parent_pupil
    ADD CONSTRAINT "FK_dca2804565d4955f17444e53477" FOREIGN KEY ("lwpPupilId") REFERENCES public.lwp_pupil(id) ON UPDATE CASCADE ON DELETE CASCADE DEFERRABLE;


--
-- Name: lwp_whole_school_sequence_assignment FK_dd391908d6abde73a14df4423a5; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lwp_whole_school_sequence_assignment
    ADD CONSTRAINT "FK_dd391908d6abde73a14df4423a5" FOREIGN KEY ("logCreatedById") REFERENCES public.lwp_user(id) ON DELETE SET NULL;


--
-- Name: static_lwp_topic FK_ddad7cf69273440f9d517ea51b8; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.static_lwp_topic
    ADD CONSTRAINT "FK_ddad7cf69273440f9d517ea51b8" FOREIGN KEY ("logCreatedById") REFERENCES public.lwp_user(id) ON DELETE SET NULL DEFERRABLE;


--
-- Name: log_parent_topic FK_dec5239d68bc0f3d6092fdf8568; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.log_parent_topic
    ADD CONSTRAINT "FK_dec5239d68bc0f3d6092fdf8568" FOREIGN KEY ("logCreatedById") REFERENCES public.lwp_user(id) ON DELETE SET NULL DEFERRABLE;


--
-- Name: lwp_topic_year_groups FK_df0f479d7c2b0d03226a29be8fa; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lwp_topic_year_groups
    ADD CONSTRAINT "FK_df0f479d7c2b0d03226a29be8fa" FOREIGN KEY ("staticLwpTopicId") REFERENCES public.static_lwp_topic(id) ON UPDATE CASCADE ON DELETE CASCADE DEFERRABLE;


--
-- Name: static_lwp_topic_domain_year_group FK_e068b1f1f8fd4dcf849f2b02b0e; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.static_lwp_topic_domain_year_group
    ADD CONSTRAINT "FK_e068b1f1f8fd4dcf849f2b02b0e" FOREIGN KEY ("logUpdatedById") REFERENCES public.lwp_user(id) ON DELETE SET NULL DEFERRABLE;


--
-- Name: lwp_trophy_subjects FK_e0a7de29247f64105fbd742ed61; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lwp_trophy_subjects
    ADD CONSTRAINT "FK_e0a7de29247f64105fbd742ed61" FOREIGN KEY ("staticLwpSubjectId") REFERENCES public.static_lwp_subject(id) ON DELETE CASCADE;


--
-- Name: lwp_teacher_liked_pupil_activity FK_e10e3ceb583c0bcd8ba4082bafc; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lwp_teacher_liked_pupil_activity
    ADD CONSTRAINT "FK_e10e3ceb583c0bcd8ba4082bafc" FOREIGN KEY ("lwpPupilFeedbackId") REFERENCES public.lwp_pupil_feedback(id) ON DELETE CASCADE;


--
-- Name: static_lwp_email_template FK_e1f843c022ace5ffed5af0e8fed; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.static_lwp_email_template
    ADD CONSTRAINT "FK_e1f843c022ace5ffed5af0e8fed" FOREIGN KEY ("deletedById") REFERENCES public.lwp_user(id) ON DELETE SET NULL DEFERRABLE;


--
-- Name: lwp_admin_sticker_school_status FK_e20aaeb0942ec875e8d69676b0d; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lwp_admin_sticker_school_status
    ADD CONSTRAINT "FK_e20aaeb0942ec875e8d69676b0d" FOREIGN KEY ("logCreatedById") REFERENCES public.lwp_user(id) ON DELETE SET NULL DEFERRABLE;


--
-- Name: lwp_pupil_feedback FK_e28b6e084362d8ebdcee79f4e27; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lwp_pupil_feedback
    ADD CONSTRAINT "FK_e28b6e084362d8ebdcee79f4e27" FOREIGN KEY ("periodIndex") REFERENCES public.static_lwp_period(index) ON DELETE RESTRICT;


--
-- Name: lwp_sticker FK_e2a73e71fe37d6f70f43ccaa675; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lwp_sticker
    ADD CONSTRAINT "FK_e2a73e71fe37d6f70f43ccaa675" FOREIGN KEY ("logCreatedById") REFERENCES public.lwp_user(id) ON DELETE SET NULL DEFERRABLE;


--
-- Name: lwp_blog_post FK_e63176932e421e282647b7202e0; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lwp_blog_post
    ADD CONSTRAINT "FK_e63176932e421e282647b7202e0" FOREIGN KEY ("logUpdatedById") REFERENCES public.lwp_user(id) ON DELETE SET NULL DEFERRABLE;


--
-- Name: lwp_pupil_activity FK_e67ee4033a9902c634ef4bc7d7b; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lwp_pupil_activity
    ADD CONSTRAINT "FK_e67ee4033a9902c634ef4bc7d7b" FOREIGN KEY ("logUpdatedById") REFERENCES public.lwp_user(id) ON DELETE SET NULL DEFERRABLE;


--
-- Name: static_lwp_parameter FK_e82ea8d489cd056e5476bfd2740; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.static_lwp_parameter
    ADD CONSTRAINT "FK_e82ea8d489cd056e5476bfd2740" FOREIGN KEY ("logUpdatedById") REFERENCES public.lwp_user(id) ON DELETE SET NULL DEFERRABLE;


--
-- Name: static_lwp_trophy FK_e841fc7d2cf5f6898e719b251f7; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.static_lwp_trophy
    ADD CONSTRAINT "FK_e841fc7d2cf5f6898e719b251f7" FOREIGN KEY ("logCreatedById") REFERENCES public.lwp_user(id) ON DELETE SET NULL DEFERRABLE;


--
-- Name: lwp_school_impact_report_feedback FK_e8a3d0d44f3da69747601a64812; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lwp_school_impact_report_feedback
    ADD CONSTRAINT "FK_e8a3d0d44f3da69747601a64812" FOREIGN KEY ("impactReportId") REFERENCES public.lwp_school_impact_report(id) ON DELETE CASCADE;


--
-- Name: lwp_page_announcement_school_tags FK_e9dbc23633bec240bcb0278a040; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lwp_page_announcement_school_tags
    ADD CONSTRAINT "FK_e9dbc23633bec240bcb0278a040" FOREIGN KEY ("staticLwpPageAnnouncementId") REFERENCES public.static_lwp_page_announcement(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: lwp_set_by_teacher_step_media FK_ea80fe59ddaa4a932e7232f7382; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lwp_set_by_teacher_step_media
    ADD CONSTRAINT "FK_ea80fe59ddaa4a932e7232f7382" FOREIGN KEY ("deletedById") REFERENCES public.lwp_user(id) ON DELETE SET NULL;


--
-- Name: lwp_set_by_teacher_step_media FK_eadc23c6b1ddecdced5f3ad6138; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lwp_set_by_teacher_step_media
    ADD CONSTRAINT "FK_eadc23c6b1ddecdced5f3ad6138" FOREIGN KEY ("classTopicId") REFERENCES public.lwp_class_topic(id) ON DELETE SET NULL;


--
-- Name: static_lwp_interstitial FK_ebcafb720cbb9f689516f23023d; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.static_lwp_interstitial
    ADD CONSTRAINT "FK_ebcafb720cbb9f689516f23023d" FOREIGN KEY ("logCreatedById") REFERENCES public.lwp_user(id) ON DELETE SET NULL DEFERRABLE;


--
-- Name: static_lwp_whole_school_sequence_member FK_ee3f1a4e3dc112c02363da74f03; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.static_lwp_whole_school_sequence_member
    ADD CONSTRAINT "FK_ee3f1a4e3dc112c02363da74f03" FOREIGN KEY ("logCreatedById") REFERENCES public.lwp_user(id) ON DELETE SET NULL;


--
-- Name: lwp_class_pupil FK_ef0ec84bccbb9408c20f1ccb07c; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lwp_class_pupil
    ADD CONSTRAINT "FK_ef0ec84bccbb9408c20f1ccb07c" FOREIGN KEY ("lwpSchoolClassId") REFERENCES public.lwp_school_class(id) ON DELETE CASCADE DEFERRABLE;


--
-- Name: lwp_pupil_tag_pupil FK_effc65b4cfba0969bbbbc1f5e8d; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lwp_pupil_tag_pupil
    ADD CONSTRAINT "FK_effc65b4cfba0969bbbbc1f5e8d" FOREIGN KEY ("lwpPupilId") REFERENCES public.lwp_pupil(id) ON DELETE CASCADE DEFERRABLE;


--
-- Name: lwp_user_tooltip_history FK_f042874b958f3a9c3707d57f024; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lwp_user_tooltip_history
    ADD CONSTRAINT "FK_f042874b958f3a9c3707d57f024" FOREIGN KEY ("logCreatedById") REFERENCES public.lwp_user(id) ON DELETE SET NULL DEFERRABLE;


--
-- Name: lwp_parent_pupil FK_f0516961726b8118e2e2f6b634c; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lwp_parent_pupil
    ADD CONSTRAINT "FK_f0516961726b8118e2e2f6b634c" FOREIGN KEY ("lwpUserId") REFERENCES public.lwp_user(id) DEFERRABLE;


--
-- Name: log_parent_activity FK_f08d18a132d1635c944184cb7c2; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.log_parent_activity
    ADD CONSTRAINT "FK_f08d18a132d1635c944184cb7c2" FOREIGN KEY ("logCreatedById") REFERENCES public.lwp_user(id) ON DELETE SET NULL DEFERRABLE;


--
-- Name: static_lwp_resource FK_f0a375b6d7323a6ab4f59c8eca6; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.static_lwp_resource
    ADD CONSTRAINT "FK_f0a375b6d7323a6ab4f59c8eca6" FOREIGN KEY ("logCreatedById") REFERENCES public.lwp_user(id) ON DELETE SET NULL DEFERRABLE;


--
-- Name: lwp_school_static_tags FK_f0aa274054cba5d8ac6d260d4f5; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lwp_school_static_tags
    ADD CONSTRAINT "FK_f0aa274054cba5d8ac6d260d4f5" FOREIGN KEY ("schoolId") REFERENCES public.lwp_school(id) ON DELETE CASCADE DEFERRABLE;


--
-- Name: lwp_pupil_trophy FK_f0e6e319b36542ad10976c03961; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lwp_pupil_trophy
    ADD CONSTRAINT "FK_f0e6e319b36542ad10976c03961" FOREIGN KEY ("logCreatedById") REFERENCES public.lwp_user(id) ON DELETE SET NULL DEFERRABLE;


--
-- Name: lwp_set_by_teacher_step_media FK_f110371c18b6a8ee913f06ea14d; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lwp_set_by_teacher_step_media
    ADD CONSTRAINT "FK_f110371c18b6a8ee913f06ea14d" FOREIGN KEY ("stepId") REFERENCES public.static_lwp_activity_steps(id) ON DELETE CASCADE;


--
-- Name: lwp_set_by_teacher_step_media FK_f201e47357276b98d934574b81c; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lwp_set_by_teacher_step_media
    ADD CONSTRAINT "FK_f201e47357276b98d934574b81c" FOREIGN KEY ("logUpdatedById") REFERENCES public.lwp_user(id) ON DELETE SET NULL;


--
-- Name: lwp_feedback_reply FK_f2292376f78e629b883a7944917; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lwp_feedback_reply
    ADD CONSTRAINT "FK_f2292376f78e629b883a7944917" FOREIGN KEY ("feedbackId") REFERENCES public.lwp_pupil_feedback(id) ON DELETE CASCADE;


--
-- Name: static_lwp_email_template FK_f26694a15188cc59278a3a8dc1f; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.static_lwp_email_template
    ADD CONSTRAINT "FK_f26694a15188cc59278a3a8dc1f" FOREIGN KEY ("logUpdatedById") REFERENCES public.lwp_user(id) ON DELETE SET NULL DEFERRABLE;


--
-- Name: lwp_school_impact_report_feedback FK_f3b809b9fbdabf6b380c515d8c9; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lwp_school_impact_report_feedback
    ADD CONSTRAINT "FK_f3b809b9fbdabf6b380c515d8c9" FOREIGN KEY ("pupilFeedbackId") REFERENCES public.lwp_pupil_feedback(id) ON DELETE SET NULL DEFERRABLE;


--
-- Name: lwp_school_impact_report_feedback FK_f400d1f85f4821bccb847b58051; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lwp_school_impact_report_feedback
    ADD CONSTRAINT "FK_f400d1f85f4821bccb847b58051" FOREIGN KEY ("logUpdatedById") REFERENCES public.lwp_user(id) ON DELETE SET NULL DEFERRABLE;


--
-- Name: lwp_school_dates FK_f5c4b5b3ccd06f559707bbbeaa6; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lwp_school_dates
    ADD CONSTRAINT "FK_f5c4b5b3ccd06f559707bbbeaa6" FOREIGN KEY ("periodIndex") REFERENCES public.static_lwp_period(index) ON DELETE SET NULL DEFERRABLE;


--
-- Name: static_lwp_activity FK_f61bdd664f13011b48108f590a1; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.static_lwp_activity
    ADD CONSTRAINT "FK_f61bdd664f13011b48108f590a1" FOREIGN KEY ("topicId") REFERENCES public.static_lwp_topic(id) ON DELETE SET NULL;


--
-- Name: static_lwp_topic_domain FK_f735ad5671b1069011e79798b0f; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.static_lwp_topic_domain
    ADD CONSTRAINT "FK_f735ad5671b1069011e79798b0f" FOREIGN KEY ("subjectId") REFERENCES public.static_lwp_subject(id) ON DELETE RESTRICT;


--
-- Name: lwp_whole_school_sequence_assignment FK_f7780dc9409a0424be362f0075f; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lwp_whole_school_sequence_assignment
    ADD CONSTRAINT "FK_f7780dc9409a0424be362f0075f" FOREIGN KEY ("logUpdatedById") REFERENCES public.lwp_user(id) ON DELETE SET NULL;


--
-- Name: lwp_domain_year_groups FK_f80895a1ee7491e0d383532988d; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lwp_domain_year_groups
    ADD CONSTRAINT "FK_f80895a1ee7491e0d383532988d" FOREIGN KEY ("staticLwpYearGroupId") REFERENCES public.static_lwp_year_group(id) ON DELETE CASCADE;


--
-- Name: lwp_notification_event_history FK_f82cec2bb855dc61e734c7c5e6c; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lwp_notification_event_history
    ADD CONSTRAINT "FK_f82cec2bb855dc61e734c7c5e6c" FOREIGN KEY ("notificationId") REFERENCES public.lwp_notification(id) ON DELETE CASCADE DEFERRABLE;


--
-- Name: static_lwp_subject FK_f84d9fc968b0e7cffc30d9a93bc; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.static_lwp_subject
    ADD CONSTRAINT "FK_f84d9fc968b0e7cffc30d9a93bc" FOREIGN KEY ("deletedById") REFERENCES public.lwp_user(id) ON DELETE SET NULL DEFERRABLE;


--
-- Name: lwp_feedback_reply FK_f8af153fb49519bb073f62708b2; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lwp_feedback_reply
    ADD CONSTRAINT "FK_f8af153fb49519bb073f62708b2" FOREIGN KEY ("logUpdatedById") REFERENCES public.lwp_user(id) ON DELETE SET NULL DEFERRABLE;


--
-- Name: lwp_whole_school_sequence_assignment FK_f9d60a30966674e62ef3f7de0fc; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lwp_whole_school_sequence_assignment
    ADD CONSTRAINT "FK_f9d60a30966674e62ef3f7de0fc" FOREIGN KEY ("wholeSchoolSequenceId") REFERENCES public.static_lwp_whole_school_sequence(id) ON DELETE SET NULL;


--
-- Name: static_lwp_contact FK_f9fec01ccb3ebbfe3a65c0182de; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.static_lwp_contact
    ADD CONSTRAINT "FK_f9fec01ccb3ebbfe3a65c0182de" FOREIGN KEY ("logUpdatedById") REFERENCES public.lwp_user(id) DEFERRABLE;


--
-- Name: lwp_school_dates FK_faf38b707d849f5163c055fea6e; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lwp_school_dates
    ADD CONSTRAINT "FK_faf38b707d849f5163c055fea6e" FOREIGN KEY ("logCreatedById") REFERENCES public.lwp_user(id) ON DELETE SET NULL DEFERRABLE;


--
-- Name: static_lwp_topic_domain_year_group FK_fc671d09c11d32b25117f2b1c6d; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.static_lwp_topic_domain_year_group
    ADD CONSTRAINT "FK_fc671d09c11d32b25117f2b1c6d" FOREIGN KEY ("logCreatedById") REFERENCES public.lwp_user(id) ON DELETE SET NULL DEFERRABLE;


--
-- Name: lwp_pupil_feedback FK_fdcac1133fcd423b4c0be913e91; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lwp_pupil_feedback
    ADD CONSTRAINT "FK_fdcac1133fcd423b4c0be913e91" FOREIGN KEY ("activityId") REFERENCES public.lwp_pupil_activity(id) ON DELETE RESTRICT;


--
-- Name: lwp_parent_pupil_invited FK_fef2213d29b4f44db71ed4322c1; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lwp_parent_pupil_invited
    ADD CONSTRAINT "FK_fef2213d29b4f44db71ed4322c1" FOREIGN KEY ("lwpPupilId") REFERENCES public.lwp_pupil(id) ON UPDATE CASCADE ON DELETE CASCADE DEFERRABLE;


--
-- Name: static_lwp_subject FK_ff0918183567249c19648c1de75; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.static_lwp_subject
    ADD CONSTRAINT "FK_ff0918183567249c19648c1de75" FOREIGN KEY ("logUpdatedById") REFERENCES public.lwp_user(id) ON DELETE SET NULL DEFERRABLE;


--
-- Name: lwp_notification FK_ff7a0ae6a7badcdee63d9e1451f; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lwp_notification
    ADD CONSTRAINT "FK_ff7a0ae6a7badcdee63d9e1451f" FOREIGN KEY ("logUpdatedById") REFERENCES public.lwp_user(id) ON DELETE SET NULL DEFERRABLE;


--
-- Name: analytics_content_fact analytics_content_fact_activityId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.analytics_content_fact
    ADD CONSTRAINT "analytics_content_fact_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES public.static_lwp_activity(id) ON DELETE SET NULL;


--
-- Name: analytics_content_fact analytics_content_fact_segmentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.analytics_content_fact
    ADD CONSTRAINT "analytics_content_fact_segmentId_fkey" FOREIGN KEY ("segmentId") REFERENCES public.analytics_pupil_dim("segmentId") ON DELETE CASCADE;


--
-- Name: analytics_content_fact analytics_content_fact_topicId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.analytics_content_fact
    ADD CONSTRAINT "analytics_content_fact_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES public.static_lwp_topic(id) ON DELETE SET NULL;


--
-- Name: analytics_pupil_fact analytics_pupil_fact_pupilId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.analytics_pupil_fact
    ADD CONSTRAINT "analytics_pupil_fact_pupilId_fkey" FOREIGN KEY ("pupilId") REFERENCES public.lwp_pupil(id) ON DELETE SET NULL;


--
-- Name: analytics_pupil_fact analytics_pupil_fact_schoolId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.analytics_pupil_fact
    ADD CONSTRAINT "analytics_pupil_fact_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES public.lwp_school(id) ON DELETE SET NULL;


--
-- Name: analytics_schools_in_groups_dim analytics_schools_in_groups_dim_groupId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.analytics_schools_in_groups_dim
    ADD CONSTRAINT "analytics_schools_in_groups_dim_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES public.analytics_school_groups_dim("groupId") ON DELETE CASCADE;


--
-- Name: analytics_schools_in_groups_dim analytics_schools_in_groups_dim_schoolId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.analytics_schools_in_groups_dim
    ADD CONSTRAINT "analytics_schools_in_groups_dim_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES public.lwp_school(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict dyRKogcbaf6mBorKgOYkiwxPiF801jG63QXseXhSKLpaJ0TvPBHmMhqtJmvzHPz

