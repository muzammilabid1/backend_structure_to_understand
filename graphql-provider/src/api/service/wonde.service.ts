import { HttpService } from '@nestjs/axios';
import { HttpException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { AxiosRequestConfig, AxiosResponse } from 'axios';
import { ImportStatus, UserStatus, validations } from 'lwp-shared';
import { ConfigService } from 'nestjs-config';
import newrelic from 'newrelic';
import { map } from 'rxjs/operators';
import { Connection, EntityManager, In, Repository } from 'typeorm';
import { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity';

import { LwpClassTopic } from '../entities/class_topic';
import { ImportedContact } from '../entities/imported_contact';
import { ImportedSchool } from '../entities/imported_school';
import { ImportedSchoolClass } from '../entities/imported_school_class';
import { ImportedStudent } from '../entities/imported_student';
import { ImportedStudentContact } from '../entities/imported_student_contact';
import { LogLwpPupilClassChange } from '../entities/log_lwp_pupil_class_change';
import { LwpPupil } from '../entities/pupil';
import { LwpSchool } from '../entities/school';
import { LwpSchoolClass } from '../entities/school_class';
import { StaticLwpPeriod } from '../entities/static_period';
import { LwpUser } from '../entities/user';
import {
    ErrorStatusCodeEnum,
    ImportedType,
    PupilStatus,
    SchoolClassStatus,
    WondeContactResponse,
    WondeContactsResponse,
    WondeGender,
    WondeLwpSchoolClassResponse,
    WondeMultiResponse,
    WondeResponse,
    WondeSchoolResponse,
    WondeStudentResponse
} from '../model';
import { PupilClassActionType } from '../types/PupilClassActionType';
import { HelperService } from './helper.service';
import { LwpPupilFeedbackService } from './lwp_pupil_feedback.service';
import { PupilParentService } from './pupil_parent.service';
import { StaticLwpPeriodService } from './static_period.service';
import { YearGroupService } from './year_group.service';

@Injectable()
export class WondeService {
    constructor(
        private httpService: HttpService,
        private configService: ConfigService,
        @InjectRepository(LwpSchool)
        private lwpSchoolRepository: Repository<LwpSchool>,
        @InjectRepository(LwpUser)
        private lwpUserRepository: Repository<LwpUser>,
        @InjectRepository(LwpPupil)
        private lwpPupilRepository: Repository<LwpPupil>,
        @InjectRepository(LwpSchoolClass)
        private lwpSchoolClassRepository: Repository<LwpSchoolClass>,
        @InjectRepository(ImportedSchool)
        private importedSchoolRepository: Repository<ImportedSchool>,
        @InjectRepository(ImportedSchoolClass)
        private importedSchoolClassRepository: Repository<ImportedSchoolClass>,
        @InjectRepository(ImportedStudent)
        private importedStudentRepository: Repository<ImportedStudent>,
        @InjectRepository(ImportedContact)
        private importedContactRepository: Repository<ImportedContact>,
        @InjectRepository(ImportedStudentContact)
        private importedStudentContactRepository: Repository<ImportedStudentContact>,
        @InjectRepository(LogLwpPupilClassChange)
        private logLwpPupilClassChangeRepository: Repository<LogLwpPupilClassChange>,
        private helperService: HelperService,
        private periodService: StaticLwpPeriodService,
        private yearGroupService: YearGroupService,
        private pupilParentService: PupilParentService,
        private pupilFeedbackService: LwpPupilFeedbackService,
        private connection: Connection
    ) {}

    private getAuthHeaderForWonde(): AxiosRequestConfig {
        const wondeApiToken = this.configService.get('key.wonde_api_token');

        return {
            headers: { authorization: `Bearer ${wondeApiToken}` }
        };
    }

    private getWondeApi(s: string): string {
        return `https://api.wonde.com/v1.0/${s}`;
    }

    private getEmptyWondeResponse<T>(): WondeResponse<T> {
        return {
            data: null,
            meta: {
                pagination: {
                    current_page: 0,
                    more: false,
                    next: null,
                    per_page: 0,
                    previous: null
                }
            }
        };
    }

    private getEmptyWondeSchoolClassResponse<T>(): WondeMultiResponse<T> {
        return {
            data: [],
            meta: {
                pagination: {
                    current_page: 0,
                    more: false,
                    next: null,
                    per_page: 0,
                    previous: null
                }
            }
        };
    }

    private async pullSingleDataSequentiallyFromWonde<T>(
        initialUrl: string,
        onData: (w: WondeResponse<T>) => Promise<void>
    ): Promise<void> {
        const wondeHeader = this.getAuthHeaderForWonde();
        let url = initialUrl;

        // Pull data sequentially to avoid overwhelming the server
        const wondeResponse: WondeResponse<T> = await this.httpService
            .get(url, wondeHeader)
            .pipe(map((d: AxiosResponse) => d.data))
            .toPromise()
            .catch((): WondeResponse<T> => {
                // These errors are commented out to avoid too much error logs
                // this.logger.error('Below error occurred while pulling data from wonde, skipping and proceeding with next.');
                // this.logger.error(e);

                return this.getEmptyWondeResponse<T>();
            });

        if (wondeResponse.data) {
            await onData(wondeResponse);
        } else {
            await onData(wondeResponse);
        }

        url = wondeResponse.meta?.pagination?.next;
    }

    private async pullMultiDataSequentiallyFromWonde<T>(
        initialUrl: string,
        isTestSchool: boolean,
        onData: (w: WondeMultiResponse<T>) => Promise<void>
    ): Promise<void> {
        const wondeHeader = this.getAuthHeaderForWonde();
        let url = initialUrl;
        let isMore: boolean;

        do {
            const wondeResponse: WondeMultiResponse<T> = await this.httpService
                .get(url, wondeHeader)
                .pipe(map((d: AxiosResponse) => d.data))
                .toPromise()
                .catch((): WondeMultiResponse<T> => {
                    // These errors are commented out to avoid too much error logs
                    // this.logger.error('Below error occurred while pulling data from wonde, skipping and proceeding with next.');
                    // this.logger.error(e);

                    return this.getEmptyWondeSchoolClassResponse<T>();
                });

            if (wondeResponse.data) {
                await onData(wondeResponse);
            }

            isMore = isTestSchool ? false : wondeResponse.meta?.pagination?.more;

            url = wondeResponse.meta?.pagination?.next;
        } while (isMore === true);
    }

    private getPhoneNumber(w: WondeContactsResponse | WondeContactResponse): string {
        const phoneRegex = new RegExp(validations.user.phoneRegex);
        let phoneNumber =
            w?.contact_details?.data?.phones?.phone ??
            w?.contact_details?.data?.phones?.primary ??
            w?.contact_details?.data?.phones?.mobile ??
            w?.contact_details?.data?.phones?.home ??
            w?.contact_details?.data?.phones?.work ??
            null;

        if (!phoneNumber) return null;

        phoneNumber = phoneNumber?.replace(/ /g, '');

        return phoneRegex.test(phoneNumber) ? this.helperService.formatPhoneNumber(phoneNumber) : null;
    }

    private getEmail(w: WondeContactsResponse | WondeContactResponse): string {
        const emailRegex = new RegExp(validations.user.emailRegex);
        const email = w?.contact_details?.data?.emails?.email
            ? w?.contact_details?.data?.emails?.email?.toLowerCase()
            : w?.contact_details?.data?.emails?.primary
              ? w?.contact_details?.data?.emails?.primary?.toLowerCase()
              : w?.contact_details?.data?.emails?.home
                ? w?.contact_details?.data?.emails?.home.toLowerCase()
                : w?.contact_details?.data?.emails.work
                  ? w?.contact_details?.data?.emails.work?.toLowerCase()
                  : null;

        return emailRegex.test(email) ? email : null;
    }

    public async reLinkingLwpWithWonde(wondeSchoolId: string, lwpSchoolId: string, contextUserId?: string): Promise<void> {
        console.log(`Beginning transaction for importedSchool ${wondeSchoolId}, LwpSchool ${lwpSchoolId}`);
        await this.importedSchoolRepository.manager.transaction(async (manager) => {
            // SET LOCAL should set this only for one specified transaction.
            await manager.query("SET LOCAL statement_timeout = '300s'");

            console.log('Remove all IMPORTED PupilParent links in this school');
            await manager.query(
                `
                delete from lwp_pupil_parent
                where id in (
                    select 
                        lpp.id
                    from
                        lwp_pupil_parent lpp
                        join lwp_pupil lp on lpp."pupilId" = lp.id
                    where
                        lp."schoolId" = $1
                        and lpp.status = 'IMPORTED'
                );
            `,
                [lwpSchoolId]
            );

            console.log('Remove all orphaned MISSING pupils in this school');
            await manager.query(
                `
                with orphaned_pupils_need_to_remove as (
                    select lp.id as "pupilId"
                    from lwp_pupil lp
                    join lwp_view_pupil_status lvps on lvps."pupilId" = lp.id
                        left join lwp_pupil_parent lpp on lpp."pupilId" = lp.id
                        left join lwp_pupil_feedback_history lpfh ON lpfh."lwpPupilId" = lp.id
                    where
                        lpp.id is null
                        and lpfh."lwpPupilFeedbackId" is null
                        and lvps."pupilStatus" = 'MISSING'
                        and lp."importedStudentId" is not null
                        and lp."schoolId" = $1
                ),
                logs_for_orphaned_pupils_classes as (
                    select opnr."pupilId", lsc.id as "classId", lsc.status
                    from orphaned_pupils_need_to_remove opnr
                    join lwp_class_pupil lcp ON lcp."lwpPupilId" = opnr."pupilId"
                    join lwp_school_class lsc ON lsc.id = lcp."lwpSchoolClassId"
                ),
                removed as (
                    delete from lwp_pupil
                    where id in (select "pupilId" from orphaned_pupils_need_to_remove)
                )
                insert into log_lwp_pupil_class_change ("pupilId", "classId", "status", "action")
                SELECT DISTINCT ON (lfopc."pupilId", lfopc."classId")
                    lfopc."pupilId",
                    lfopc."classId",
                    lfopc.status,
                    $2
                from logs_for_orphaned_pupils_classes lfopc;
            `,
                [lwpSchoolId, PupilClassActionType.REMOVED]
            );

            console.log('Remove ALL parents with no pupils WITH GLOBAL SCOPE');
            await manager.query(`
                delete from lwp_user
                where id in (
                        select
                            lu.id
                        from
                            lwp_user lu
                        left join lwp_pupil_parent lpp on lpp."parentId" = lu.id
                    where
                        lu.type = 'PARENT'
                        and lu."userStatus" = 'IMPORTED'
                        and lpp.id is null
                        and lu."importedContactId" is not null);             
            `);

            console.log('Removing pupils from imported and hidden classes within the school');
            await manager.query(
                `
                with removed as (
                    delete from lwp_class_pupil lcp
                    using lwp_school_class lsc
                    where lcp."lwpSchoolClassId" = lsc.id
                    and lsc.status = ANY('{IMPORTED, HIDDEN}')
                    and lsc."schoolId" = $1
                    returning lcp."lwpPupilId" AS "pupilId", lcp."lwpSchoolClassId" AS "classId", lsc.status
                 ) 
                INSERT INTO log_lwp_pupil_class_change ("pupilId", "classId", "status", "action")
                SELECT "pupilId", "classId", "status", $2 from removed;
            `,
                [lwpSchoolId, PupilClassActionType.REMOVED]
            );

            console.log('Match Wonde classes with LWP classes');
            await manager.query(
                `
                update
                    imported_school_class wsc
                set "lwpSchoolClassId" = lsc.id
                from lwp_school_class lsc
                where wsc.id = lsc."importedSchoolClassId"
                and wsc."schoolId" = $1
                and wsc."periodIndex" = lsc."periodIndex"
                and lsc."schoolId" = $2
            `,
                [wondeSchoolId, lwpSchoolId]
            );

            console.log('Create LWP classes for orphaned Wonde classes');
            await manager.query(
                `
                with createdClasses as (
                    insert into lwp_school_class (name, "isRegistrationClass", "yearGroup", "schoolId", status, "periodIndex", "importedSchoolClassId") (
                            select
                                wsc.name,
                                true,
                                wsc."yearGroup",
                                $2,
                                CASE
                                    WHEN wsc."linkedClassShouldBeActive" THEN '${SchoolClassStatus.ACTIVE}'
                                    ELSE '${SchoolClassStatus.IMPORTED}'
                                END,
                                wsc."periodIndex",
                                wsc.id
                            from
                                imported_school_class wsc
                                join imported_school_class_student wscs on wsc.id = wscs."importedSchoolClassId"
                                join imported_school ws on wsc."schoolId" = ws.id
                            where
                                "lwpSchoolClassId" is null
                                and wsc."schoolId" = $1
                            group by
                                wsc.id,
                                ws."periodIndex"
                            )
                        returning
                            "importedSchoolClassId",
                            id as "lwpSchoolClassId"
                )
                update
                    imported_school_class
                set
                    "lwpSchoolClassId" = cc."lwpSchoolClassId"
                from
                    createdClasses cc
                where
                    id = cc."importedSchoolClassId";            
            `,
                [wondeSchoolId, lwpSchoolId]
            );

            console.log('Creating normalised contact details');
            await manager.query(
                String.raw`
                CREATE TEMPORARY TABLE normalised_imported_contacts ON COMMIT DROP AS
                SELECT
                    *
                FROM (
                    SELECT
                        wc.id,
                        lwp_normalise_name_case (wc.forename) AS "forename",
                        lwp_normalise_name_case (wc.surname) AS "surname",
                        CASE WHEN wc.email ~ '^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$' THEN
                            lower(wc.email)
                        ELSE
                            NULL
                        END AS "email", CASE WHEN replace(wc."phoneNumber", ' ', '') ~ '^((0|(\+|00)44)?7\d{9}|(\+|00)([1-35-9]\d|4[01-35-9])\d{4,13})$' THEN
                            regexp_replace(regexp_replace(regexp_replace(replace(wc."phoneNumber", ' ', ''), '^00', '+'), '^7(?=\d{9}$)', '+447'), '^0', '+44')
                        ELSE
                            NULL
                        END AS "phoneNumber",
                        wc."lwpUserId"
                    FROM
                        imported_contact wc
                    WHERE wc."schoolId" = $1) iQ
                WHERE
                    iQ.email IS NOT NULL
                    OR iq."phoneNumber" IS NOT NULL
            `,
                [wondeSchoolId]
            );
            await manager.query(`ALTER TABLE normalised_imported_contacts ADD PRIMARY KEY (id)`); // to make groupings work

            console.log('Match Wonde contacts with LWP users');
            await this.matchWondeContactsWithLwpUsers(manager);

            console.log('Create LWP users for unmatched Wonde contacts');
            await manager.query(
                `
                    insert into lwp_user (firstname, lastname, email, "phoneNumber", type, "userStatus", "importedContactId") (
                        select
                            forename,
                            surname,
                            email,
                            "phoneNumber",
                            'PARENT',
                            'IMPORTED',
                            nwc.id
                        from normalised_imported_contacts nwc
                            join imported_student_contact wsc on nwc.id = wsc."importedContactId"   
                        where
                            "lwpUserId" is null
                            and (
                                nwc."email" is not null
                                or nwc."phoneNumber" is not null
                            )
                        group by nwc.id, nwc.forename, nwc.surname, nwc.email, nwc."phoneNumber"
                        order by max(wsc.priority)
                    )
                    -- Imported contacts are not unique emails. We have unique emails. We need to resolve this.
                    -- The resolution for the time being is to ignore everything other than the first email.
                    on conflict do nothing        
                `
            );

            console.log('Match Wonde contacts with LWP users (again after new users have been created)');
            await this.matchWondeContactsWithLwpUsers(manager);

            console.log('Prune temporary Wonde table');
            await manager.query(`DROP TABLE normalised_imported_contacts`);

            console.log('Match Wonde students with LWP pupils');
            await manager.query(
                `
                with matchingPupils as (
                    select distinct on ( case when lp_wID.id is not null then
                            lp_wID.id
                        else
                            lp_UPN.id
                        end)
                        ws.id as "importedStudentId",
                        case when lp_wID.id is not null then
                            lp_wID.id
                        else
                            lp_UPN.id
                        end as "lwpPupilId"
                    from
                        imported_student ws
                        left join lwp_pupil lp_wID on ws.id = lp_wID."importedStudentId" and lp_wID."schoolId" = $1
                        left join lwp_pupil lp_UPN on ws."UPN" = lp_UPN."UPN"
                            and lp_UPN."schoolId" = $1
                            and ws."UPN" is not null
                            and ws."UPN" != '[Unknown]'
                    where
                        (lp_wID.id is not null
                        or lp_UPN.id is not null)
                        and ws."schoolId" = $2
                    order by
                        case when lp_wID.id is not null then
                            lp_wID.id
                        else
                            lp_UPN.id
                        end,
                        ws."logUpdatedAt" desc
                )
                update
                    imported_student ws
                set
                    "lwpPupilId" = mp."lwpPupilId"
                from
                    matchingPupils mp
                where
                    mp."importedStudentId" = ws.id;      
            `,
                [lwpSchoolId, wondeSchoolId]
            );

            console.log('Backfill startedSchool for matched pupils where it is currently null');
            await manager.query(
                `
                with matched_students as (
                    -- Only matched pupils that still need a startedSchool; parse nc_year once per student.
                    select
                        ws.id,
                        ws."lwpPupilId",
                        ws."schoolId",
                        (((ws.details#>>'{}')::jsonb)->>'import_nc_year') as import_nc_year
                    from
                        imported_student ws
                        join lwp_pupil lp on lp.id = ws."lwpPupilId" and lp."startedSchool" is null
                    where
                        ws."schoolId" = $1
                ),
                chosen as (
                    -- Pick one class per pupil: registration class first, then most recent period.
                    select distinct on (ms."lwpPupilId")
                        ms."lwpPupilId" as pupil_id,
                        COALESCE(lsc."periodIndex", w_sc."periodIndex") - normalise_school_year(ms.import_nc_year) as started_school
                    from
                        matched_students ms
                        join imported_school w_sc on ms."schoolId" = w_sc.id
                        left join imported_school_class_student wscs on ms.id = wscs."importedStudentId"
                        left join imported_school_class wsc on wscs."importedSchoolClassId" = wsc.id
                        -- No "class period >= school current period" guard needed here: lsc is reached only via
                        -- the current import's imported classes, so it is always the current (or future Ready
                        -- Teddy) period, never a past academic year. (The guard is applied where we join
                        -- lwp_class_pupil directly, e.g. the backfill migration, since that spans a pupil's full history.)
                        left join lwp_school_class lsc on wsc."lwpSchoolClassId" = lsc.id
                    order by
                        ms."lwpPupilId",
                        lsc."isRegistrationClass" desc nulls last,
                        lsc."periodIndex" desc nulls last
                )
                update lwp_pupil lp
                set "startedSchool" = chosen.started_school
                from chosen
                where
                    lp.id = chosen.pupil_id
                    and chosen.started_school is not null;
            `,
                [wondeSchoolId]
            );

            console.log('Sync isPreRegistration onto linked pupils');
            /* The MIS is authoritative for this flag and every sync rewrites it on the imported
             * student (a pre-admission pupil moving into the current year arrives through the
             * regular pull as isPreRegistration = false). It was only ever copied onto lwp_pupil
             * at creation, so pupils kept a stale true forever - leaving current-year pupils in
             * the pre-registration bucket, whose assign flow builds classes for a next academic
             * year that may not exist yet. */
            await manager.query(
                `
                update lwp_pupil lp
                set "isPreRegistration" = ws."isPreRegistration"
                from imported_student ws
                where lp.id = ws."lwpPupilId"
                    and ws."schoolId" = $1
                    and lp."isPreRegistration" is distinct from ws."isPreRegistration";
            `,
                [wondeSchoolId]
            );

            console.log('Create MISSING pupils for unlinked Wonde students');
            await manager.query(
                `
                with importedStudentsWithYears as (
                    select *, (((ws.details#>>'{}')::jsonb)->>'import_nc_year') as import_nc_year from imported_student ws
                ), createdPupils as (
                    insert into lwp_pupil (firstname, lastname, "importedStudentId", "isPremium", "schoolId", "UPN", "startedSchool","isPreRegistration", "dateOfBirth", gender) (
                        select
                            forename,
                            surname,
                            ws.id,
                            ws."isPremium",
                            w_sc."lwpSchoolId",
                            "UPN",
                            COALESCE(lsc."periodIndex", w_sc."periodIndex") - normalise_school_year(import_nc_year),
                            ws."isPreRegistration",
                            ws."dateOfBirth",
                            ws.gender
                        from
                            importedStudentsWithYears ws
                            join imported_school w_sc on ws."schoolId" = w_sc.id
                            left join imported_school_class_student wscs on ws.id = wscs."importedStudentId"
                            left join imported_school_class wsc on wscs."importedSchoolClassId" = wsc.id
                            -- No "class period >= school current period" guard needed here: lsc is reached only via
                            -- the current import's imported classes, so it is always the current (or future Ready
                            -- Teddy) period, never a past academic year. (The guard is applied where we join
                            -- lwp_class_pupil directly, e.g. the backfill migration, since that spans a pupil's full history.)
                            left join lwp_school_class lsc on wsc."lwpSchoolClassId" = lsc.id
                        where
                            "lwpPupilId" is null
                            and w_sc.id = $1)
                    returning
                        "importedStudentId",
                        id as "lwpPupilId"
                )
                update
                    imported_student
                set
                    "lwpPupilId" = cp."lwpPupilId"
                from
                    createdPupils cp
                where
                    id = cp."importedStudentId";
            `,
                [wondeSchoolId]
            );

            console.log('Match pupils to classes where they are not already in a current registration class');
            const creationResult = await manager.query(
                `
                with added as (
                    insert into lwp_class_pupil ("lwpPupilId", "lwpSchoolClassId") (
                        select DISTINCT ON (ws."lwpPupilId")
                            ws."lwpPupilId",
                            lsc.id
                        from
                            imported_student ws
                            join imported_school_class_student wscs on ws.id = wscs."importedStudentId"
                            join imported_school_class wsc on wscs."importedSchoolClassId" = wsc.id
                            join lwp_school_class lsc on wsc."lwpSchoolClassId" = lsc.id
                            join lwp_school ls on lsc."schoolId" = ls.id and (
                                lsc."periodIndex" = ls."curentPeriodIndex" 
                                OR (lsc."periodIndex" > ls."curentPeriodIndex") 
                            )
                        where
                            ws."schoolId" = $1
                            and not exists(
                                SELECT 1
                                FROM lwp_class_pupil lcp
                                JOIN lwp_school_class lsc2 ON lcp."lwpSchoolClassId" = lsc2.id
                                WHERE lcp."lwpPupilId" = ws."lwpPupilId"
                                AND lsc2."isRegistrationClass" = true
                                AND lsc2."periodIndex" = ls."curentPeriodIndex"
                            )
                    ) on conflict do nothing
                    returning "lwpPupilId" as "pupilId", "lwpSchoolClassId" as "classId"
                )
                insert into log_lwp_pupil_class_change ("pupilId", "classId", "status", "action")
                select "pupilId", "classId", lsc.status, $2
                from added
                join lwp_school_class lsc on added."classId" = lsc.id
                returning "classId" as id;
                `,
                [wondeSchoolId, PupilClassActionType.ADDED]
            );

            const affectedClasses = this.mapDbResultToIds(creationResult);

            console.log('Guess year groups for undefined year group LWP classes');
            await manager.query(
                `
                update
                    lwp_school_class lsc_outer
                set
                    "yearGroup" = slyg_best_guess.id
                from (
                    select
                        lsc.id as "schoolClassId",
                        (lsc."periodIndex" - (mode() within group (order by lp."startedSchool" desc))::int) as "bestGuessYearGroup"
                    from
                        lwp_school_class lsc
                    left join static_lwp_year_group slyg on lsc."yearGroup" = slyg.id
                    join lwp_class_pupil lcp on lsc.id = lcp."lwpSchoolClassId"
                    join lwp_pupil lp on lcp."lwpPupilId" = lp.id
                    where
                        slyg.id is null
                        or slyg."year" = 'Unknown' group by
                            lsc.id) guessing
                join static_lwp_year_group slyg_best_guess on guessing."bestGuessYearGroup" = slyg_best_guess.id
                where
                    lsc_outer."importedSchoolClassId" is not null
                    and lsc_outer."schoolId" = $1
                    and lsc_outer.id = guessing."schoolClassId";
            `,
                [lwpSchoolId]
            );

            console.log('Release PupilTopics for created pupils');
            const relevantClassTopics = await manager.query(
                `
                select
                    id
                from
                    lwp_class_topic lct
                where
                    lct."classId" = any ($1)
                    and lct."released";
            `,
                [affectedClasses]
            );

            const classTopicIds = this.mapDbResultToIds(relevantClassTopics);

            if (classTopicIds?.length > 0) await manager.getRepository(LwpClassTopic).update(classTopicIds, { released: false });

            const numTopicsAffected = await this.helperService.releasePupilTopicsHelper(new Date(), manager);

            if (numTopicsAffected > 0) {
                const pupilTopicsForReadingThatMayNeedStarUpdate: { id: string }[] = await manager.query(
                    `
                    select
                    id
                    from
                    lwp_pupil_topic lpt
                    where
                    lpt."classTopicId" = any ($1)
                    and lpt."readingTarget" > 0;
                    `,
                    [classTopicIds]
                );

                await this.pupilFeedbackService.updatePupilTopicStarCountReadingBatch(
                    this.mapDbResultToIds(pupilTopicsForReadingThatMayNeedStarUpdate),
                    manager
                );
            }

            console.log('Set Pupil Premium statuses');
            await manager.query(
                `
                update
                    lwp_pupil lp
                set
                    "isPremium" = ws."isPremium"
                from
                    imported_student ws
                where
                    lp.id = ws."lwpPupilId"
                    and ws."isPremium" is not null
                    and ws."schoolId" = $1
            `,
                [wondeSchoolId]
            );

            /* The MIS owns the UPN and the date of birth, so every sync rewrites them onto the
             * linked pupil rather than only filling a blank. Both are load-bearing for the review:
             * a standing link is carried forward on the strength of the MIS id, a UPN that does not
             * contradict, and a matching date of birth, so a stale value on the platform reopens a
             * decision the leader has already taken. Filling blanks alone left that unreachable -
             * a value that was merely wrong stayed wrong. */
            console.log('Update pupil upn');
            await manager.query(
                `
                UPDATE 
                    lwp_pupil AS lp
                SET 
                    "UPN" = im."UPN"
                FROM 
                    imported_student AS im
                WHERE 
                    lp."importedStudentId" = im."id"
                    AND im."UPN" != '[Unknown]'
                    AND lp."UPN" IS DISTINCT FROM im."UPN"
                    AND lp."schoolId" = $2
                    AND im."schoolId" = $1
            `,
                [wondeSchoolId, lwpSchoolId]
            );

            console.log('Update pupil dob');
            await manager.query(
                `
                UPDATE 
                    lwp_pupil AS lp
                SET 
                    "dateOfBirth" = im."dateOfBirth"
                FROM 
                    imported_student AS im
                WHERE 
                    lp."importedStudentId" = im."id"
                    AND im."dateOfBirth" IS NOT NULL
                    AND lp."dateOfBirth" IS DISTINCT FROM im."dateOfBirth"
                    AND lp."schoolId" = $2
                    AND im."schoolId" = $1
            `,
                [wondeSchoolId, lwpSchoolId]
            );

            console.log('Update pupil gender');
            await manager.query(
                `
                UPDATE 
                    lwp_pupil AS lp
                SET 
                    "gender" = ws."gender"
                FROM 
                    imported_student AS ws
                WHERE 
                    lp.id = ws."lwpPupilId" 
                    AND lp."gender" IS NULL
                    AND ws."gender" IS NOT NULL
                    AND lp."schoolId" = $2
                    AND ws."schoolId" = $1
            `,
                [wondeSchoolId, lwpSchoolId]
            );

            console.log('Create PupilParent relationships for parents that are disconnected from their pupils');
            await manager.query(
                `
                insert into lwp_pupil_parent ("parentId", "pupilId", "importedStudentContactID", status, "logCreatedById") (
                    select
                        wc."lwpUserId",
                        ws."lwpPupilId",
                        min(wsc.id),
                        'IMPORTED',
                        $2
                    from
                        imported_student_contact wsc
                        join imported_student ws on ws.id = wsc."importedStudentId"
                        join imported_contact wc on wc.id = wsc."importedContactId"
                        left join lwp_pupil_parent lpp on lpp."pupilId" = ws."lwpPupilId" and lpp."parentId" = wc."lwpUserId"
                    where lpp.id is null and ws."lwpPupilId" is not null and wc."lwpUserId" is not null and wsc."schoolId" = $1
                    group by wc."lwpUserId", ws."lwpPupilId"
                )
            `,
                [wondeSchoolId, contextUserId]
            );

            console.log('Delete unmatched IMPORTED or HIDDEN classes');
            await manager.query(
                `
                delete from lwp_school_class
                where id in (
                        select
                            lsc.id
                        from
                            lwp_school_class lsc
                        left join imported_school_class wsc on lsc."importedSchoolClassId" = wsc.id
                    where
                        lsc.status in ('IMPORTED', 'HIDDEN')
                        and wsc.id is null
                        and lsc."schoolId" = $1);
            `,
                [lwpSchoolId]
            );
        });
        console.log(`Ended transaction for importedSchool ${wondeSchoolId}, LwpSchool ${lwpSchoolId}`);
    }

    private async matchWondeContactsWithLwpUsers(manager: EntityManager): Promise<void> {
        await manager.query(
            `
                with userParents as (
                    select *
                    from lwp_user
                    where type = 'PARENT'
                ),
                matchingContacts as (
                    select nwc.id as "importedContactId",
                    coalesce(lu_wID.id, lu_email.id, lu_phone.id) as "lwpUserId"
                    from normalised_imported_contacts nwc
                        left join userParents lu_wID on nwc.id = lu_wID."importedContactId"
                        left join userParents lu_email on nwc.email = lu_email.email
                        left join userParents lu_phone on nwc."phoneNumber" = lu_phone."phoneNumber"
                )
                update
                    imported_contact wc
                set "lwpUserId" = mc."lwpUserId"
                from matchingContacts mc
                where
                    mc."importedContactId" = wc.id;
            `
        );
    }

    private mapDbResultToIds(dbResult: { id: string }[]): string[] {
        if (!dbResult?.length) return [];

        return Array.from(new Set(dbResult.map((res) => res?.id)));
    }

    public async deleteWondeData(lwpSchoolId: string, deleteStatus: boolean): Promise<void> {
        const lwpSchool = await this.lwpSchoolRepository.findOne({ where: { id: lwpSchoolId }, relations: ['importedSchool'] });

        if (!lwpSchool?.importedSchool?.id) return;

        await this.connection.manager.transaction(async (manager) => {
            await manager.query("SET LOCAL statement_timeout = '300s'");

            await manager.delete(ImportedSchool, lwpSchool.importedSchool.id);

            lwpSchool.importedSchool = null;
            lwpSchool.isWondeDataSyncedWithLwp = false;
            if (deleteStatus) {
                lwpSchool.misIntegration = null;
                lwpSchool.importStatus = null;
            }

            await manager.save(lwpSchool);
        });
    }

    public async removeUnusedWondeData(wondeSchoolId: string): Promise<boolean> {
        const importedClasses = await this.importedSchoolClassRepository
            .createQueryBuilder('importedSchoolClass')
            .leftJoinAndSelect('importedSchoolClass.school', 'classSchool')
            .leftJoinAndSelect('importedSchoolClass.students', 'students')
            .where('classSchool.id = :wondeSchoolId', { wondeSchoolId })
            .getMany();

        const importedContacts = await this.importedContactRepository
            .createQueryBuilder('importedContacts')
            .leftJoinAndSelect('importedContacts.school', 'contactSchool')
            .leftJoinAndSelect('importedContacts.importedStudentContacts', 'importedStudentContacts')
            .where('contactSchool.id = :wondeSchoolId', { wondeSchoolId })
            .getMany();

        const importedStudents = await this.importedStudentRepository
            .createQueryBuilder('importedStudents')
            .leftJoinAndSelect('importedStudents.school', 'studentSchool')
            .leftJoinAndSelect('importedStudents.importedStudentContacts', 'importedStudentContacts')
            .where('studentSchool.id = :wondeSchoolId', { wondeSchoolId })
            .getMany();

        const importedStudentContacts = await this.importedStudentContactRepository
            .createQueryBuilder('importedStudentContacts')
            .leftJoinAndSelect('importedStudentContacts.school', 'importedStudentContactSchool')
            .where('importedStudentContactSchool.id = :wondeSchoolId', { wondeSchoolId })
            .getMany();

        await this.connection.manager.transaction(async (manager) => {
            if (importedClasses?.length > 0) {
                for (const importedClass of importedClasses) {
                    await manager.delete(ImportedSchoolClass, importedClass?.id);
                }
            }

            if (importedContacts?.length > 0) {
                for (const importedContact of importedContacts) {
                    await manager.delete(ImportedContact, importedContact?.id);
                }
            }

            if (importedStudents?.length > 0) {
                for (const importedStudent of importedStudents) {
                    await manager.delete(ImportedStudent, importedStudent?.id);
                }
            }

            if (importedStudentContacts?.length > 0) {
                for (const importedStudentContact of importedStudentContacts) {
                    await manager.delete(ImportedStudentContact, importedStudentContact?.id);
                }
            }

            const lwpSchool = await this.lwpSchoolRepository
                .createQueryBuilder('lwpSchool')
                .leftJoinAndSelect('lwpSchool.importedSchool', 'importedSchool')
                .where('importedSchool.id = :wondeSchoolId', { wondeSchoolId })
                .getOne();

            if (lwpSchool) {
                lwpSchool.misIntegration = null;
                lwpSchool.importStatus = null;

                await manager.save(lwpSchool);
            }

            await manager.delete(ImportedSchool, wondeSchoolId);
        });

        return true;
    }

    public async removeWondeAndUnusedLwpDataFromWonde(lwpSchoolId: string): Promise<boolean> {
        const school = await this.lwpSchoolRepository.findOne({ where: { id: lwpSchoolId }, relations: ['importedSchool'] });

        if (!school) throw new HttpException('LWP School does not exist', ErrorStatusCodeEnum._535);

        const wondeSchoolId = school?.importedSchool?.id ?? null;

        if (wondeSchoolId) {
            // getting unused parents before we remove relation of parents with wonde data and before deleting wonde data
            const parents = await this.lwpUserRepository
                .createQueryBuilder('user')
                .leftJoinAndSelect('user.importedContacts', 'importedContacts')
                .leftJoinAndSelect('importedContacts.school', 'school')
                .where('user.userStatus = :userStatus', { userStatus: UserStatus.IMPORTED })
                .andWhere('school.id = :wondeSchoolId', { wondeSchoolId })
                .getMany();

            // getting pupil Ids before we remove relation of pupils with wonde data and before deleting wonde data
            const pupilsWithIds = await this.lwpPupilRepository
                .createQueryBuilder('pupil')
                .leftJoinAndSelect('pupil.importedStudent', 'importedStudent')
                .leftJoinAndSelect('pupil.statusView', 'status')
                .leftJoinAndSelect('importedStudent.school', 'school')
                .where('status.pupilStatus = :pupilStatus', { pupilStatus: PupilStatus.MISSING })
                .andWhere('school.id = :wondeSchoolId', { wondeSchoolId })
                .select(['pupil.id'])
                .getMany();

            // deleting wonde data
            if (school?.isWondeDataSyncedWithLwp) {
                await this.deleteWondeData(lwpSchoolId, true);
            } else {
                await this.removeUnusedWondeData(wondeSchoolId);
            }

            // deleting lwp data of unused parents
            if (parents.length > 0) {
                for (const parent of parents) {
                    await this.lwpUserRepository.delete(parent?.id);
                    await this.pupilParentService.deletePupilParentRelationByParentId(parent?.id);
                }
            }

            if (pupilsWithIds.length > 0) {
                // ## need to look it in pupil parent table work
                // getting pupils (saved pupil ids) after we delete wonde data
                const pupils = await this.lwpPupilRepository
                    .createQueryBuilder('pupil')
                    .leftJoin('pupil.parents', 'parents')
                    .leftJoin('pupil.classes', 'classes')
                    .select(['pupil.id', 'parents.id', 'classes.id', 'classes.status'])
                    .where('pupil.id IN (:...pupilIds)', { pupilIds: pupilsWithIds.map((p) => p?.id) })
                    .andWhere('parents.id IS NULL')
                    .getMany();

                // deleting lwp data of pupils where there are no parents
                if (pupils.length > 0) {
                    const logs = [];

                    for (const pupil of pupils) {
                        if (pupil?.parents?.length === 0) {
                            await this.lwpPupilRepository.delete(pupil?.id);
                        }

                        if (pupil?.classes?.length > 0) {
                            for (const cls of pupil.classes) {
                                const removedLog = new LogLwpPupilClassChange();

                                removedLog.pupilId = pupil.id;
                                removedLog.classId = cls.id;
                                removedLog.status = cls.status;
                                removedLog.action = PupilClassActionType.REMOVED;

                                logs.push(removedLog);
                            }
                        }
                    }

                    if (logs?.length) await this.logLwpPupilClassChangeRepository.save(logs);
                }
            }

            return true;
        }

        return false;
    }

    // Inactive schools count too: two schools sharing a Wonde ID end up syncing over each other.
    public async assertWondeIdAvailable(wondeSchoolId: string, lwpSchoolId: string): Promise<void> {
        const otherSchool = await this.lwpSchoolRepository
            .createQueryBuilder('school')
            .select(['school.id', 'school.schoolName', 'school.inactive'])
            .where('LOWER(school."importedSchoolId") = LOWER(:wondeSchoolId)', { wondeSchoolId })
            .andWhere('school.id != :lwpSchoolId', { lwpSchoolId })
            .getOne();

        if (otherSchool) {
            throw new HttpException(
                `Wonde ID ${wondeSchoolId} is already used by '${otherSchool.schoolName}'${otherSchool.inactive ? ' (inactive)' : ''}. Remove it from that school first.`,
                ErrorStatusCodeEnum._535
            );
        }
    }

    public async removeWondeSchoolId(lwpSchoolId: string): Promise<boolean> {
        const school = await this.lwpSchoolRepository.findOne({ where: { id: lwpSchoolId } });

        if (!school) throw new HttpException('LWP School does not exist', ErrorStatusCodeEnum._535);

        if (school.importStatus === ImportStatus.IMPORTING_DATA) {
            throw new HttpException('An import is in progress for this school', ErrorStatusCodeEnum._535);
        }

        // Removes the Wonde data too, if there is any
        await this.removeWondeAndUnusedLwpDataFromWonde(lwpSchoolId);

        await this.lwpSchoolRepository.update({ id: lwpSchoolId }, { importedSchoolId: null, misIntegration: null, importStatus: null });

        return true;
    }

    public async createDummyWondeStudentData(
        manager: EntityManager,
        studentId: string,
        isPreRegistration: boolean,
        importNcYear: number,
        wondeSchool: ImportedSchool
    ): Promise<void> {
        const importedStudent = new ImportedStudent();

        importedStudent.id = studentId;
        importedStudent.mis_id = studentId;
        importedStudent.initials = '[Unknown]';
        importedStudent.forename = `Wonde ${studentId}`;
        importedStudent.surname = 'Student';
        importedStudent.importedFrom = ImportedType.WONDE;
        importedStudent.gender = WondeGender.MALE;
        importedStudent.UPN = studentId;

        importedStudent.isPremium = false;

        importedStudent.details = JSON.stringify({
            fsm6: false,
            premium_pupil_indicator: false,
            premium_pupil_eligible: null,
            premium_pupil_notes: '[Unknown]',
            import_nc_year: importNcYear
        });

        importedStudent.isPreRegistration = isPreRegistration ?? false;

        importedStudent.school = wondeSchool;
        const savedWondeStudent = await manager.save(importedStudent);

        if (savedWondeStudent) {
            for (let k = 0; k < 2; k++) {
                const importedContact = new ImportedContact();

                importedContact.id = `${studentId}${k}`;
                importedContact.email = `dummyparent${studentId}${k}@example.com`;
                importedContact.phoneNumber = null;
                importedContact.forename = `Wonde ${studentId}${k}`;
                importedContact.surname = 'Parent';
                importedContact.title = k === 0 ? 'Mr' : 'Mrs';
                importedContact.importedFrom = ImportedType.WONDE;
                importedContact.school = wondeSchool;

                const savedWondeContact = await manager.save(importedContact);

                const importedStudentContact = new ImportedStudentContact();

                importedStudentContact.pupil_report = false;
                importedStudentContact.parental_responsibility = true;
                importedStudentContact.correspondence = false;
                importedStudentContact.importedFrom = ImportedType.WONDE;
                importedStudentContact.email_notification = null;
                importedStudentContact.sms_notification = null;
                importedStudentContact.mail_notification = null;
                importedStudentContact.push_notification = null;
                importedStudentContact.in_touch_communication = null;
                importedStudentContact.priority = k;
                importedStudentContact.relationship = k === 0 ? 'Father' : 'Mother';
                importedStudentContact.importedStudent = savedWondeStudent;
                importedStudentContact.importedContact = savedWondeContact;
                importedStudentContact.school = wondeSchool;

                await manager.save(importedStudentContact);
            }
        }
    }

    public async createDummyWondeSchoolData(lwpSchoolId: string): Promise<ImportedSchool> {
        const lwpSchool = await this.lwpSchoolRepository.findOne({ where: { id: lwpSchoolId }, relations: ['curentPeriod'] });
        let dummyImportedSchool: ImportedSchool = null;

        await this.connection.manager.transaction(async (manager) => {
            const importedSchool = new ImportedSchool();

            importedSchool.id = this.helperService.generateId(6, '');
            importedSchool.name = lwpSchool?.schoolName;
            importedSchool.urn = parseInt(lwpSchool?.id + this.helperService.generateId(6, ''));
            importedSchool.lwpSchool = lwpSchool;
            importedSchool.period = await this.periodService.getCurrentPeriod();
            importedSchool.importedFrom = ImportedType.WONDE;
            importedSchool.classes = [];
            importedSchool.importedContacts = [];
            importedSchool.importedStudents = [];
            importedSchool.importedStudentContacts = [];
            const savedWondeSchool = await manager.save(importedSchool);

            if (savedWondeSchool) {
                dummyImportedSchool = savedWondeSchool;
                lwpSchool.importedSchoolId = savedWondeSchool.id;
                lwpSchool.misIntegration = 'SIMS';

                await manager.save(lwpSchool);

                const currentYearStudents = Array.from({ length: 25 }, (_, index) => ({
                    id: `${index}${this.helperService.generateId(6, '')}`
                }));

                const preAdmissionStudents = Array.from({ length: 10 }, (_, index) => ({
                    id: `${index}${this.helperService.generateId(6, '')}`
                }));

                for (let i = 0; i < currentYearStudents.length; i++) {
                    await this.createDummyWondeStudentData(
                        manager,
                        currentYearStudents[i].id,
                        false, // isPreRegistration,
                        i >= 20 ? -1 : 10, // set -1 for last 5 students, -1 means nursery pupils
                        savedWondeSchool
                    );
                }

                for (let i = 0; i < preAdmissionStudents.length; i++) {
                    await this.createDummyWondeStudentData(
                        manager,
                        preAdmissionStudents[i].id,
                        true, // isPreRegistration,
                        -1,
                        savedWondeSchool
                    );
                }

                for (let i = 0; i < 7; i++) {
                    const newImportedSchoolClass = new ImportedSchoolClass();
                    const classId = `${lwpSchool?.id}${i}`;

                    newImportedSchoolClass.id = `${classId}`;
                    newImportedSchoolClass.name = `Wonde Class ${classId}`;

                    newImportedSchoolClass.code = `Wonde Class ${classId}`;
                    newImportedSchoolClass.yearGroup = await this.yearGroupService.getYearGroupByName('Unknown');
                    newImportedSchoolClass.period =
                        i > 4 ? ({ index: savedWondeSchool.period.index + 1 } as StaticLwpPeriod) : savedWondeSchool.period;

                    newImportedSchoolClass.importedFrom = ImportedType.WONDE;
                    newImportedSchoolClass.nc_year = '10';
                    newImportedSchoolClass.school = importedSchool;

                    const savedWondeSchoolClass = await manager.save(newImportedSchoolClass);

                    // Prevent assigning students to class 5 (current year) and class 6 (pre-admission)
                    if (savedWondeSchoolClass && i !== 4 && i !== 5) {
                        let students = [];

                        if (i > 4) {
                            // For pre-admission students, we only take the first 5 students to insert in the class
                            students = preAdmissionStudents.slice(0, 5);
                        } else {
                            // For current year students, we take 5 students for each class

                            const startIndex = i * 5; // Start index for each group of 5 students
                            const endIndex = startIndex + 5; // End index for each group of 5 students

                            students = currentYearStudents.slice(startIndex, endIndex);
                        }

                        const studentIds = students.map((student) => student.id);

                        const existingStudents = await manager.find(ImportedStudent, {
                            where: { id: In(studentIds) },
                            select: ['id']
                        });

                        for (const student of existingStudents) {
                            student.schoolClasses = [savedWondeSchoolClass];
                        }

                        await manager.save(existingStudents);
                    }
                }
            }
        });

        return dummyImportedSchool;
    }

    public async importWondeStudents(
        manager: EntityManager,
        savedWondeSchool: ImportedSchool,
        isPreRegistration: boolean,
        wondeStudenUrl: string
    ): Promise<number> {
        let importedIgnoredContacts = 0;

        await this.pullMultiDataSequentiallyFromWonde<WondeStudentResponse>(wondeStudenUrl, false, async (d) => {
            console.log(`=> got ${d?.data?.length} students`);
            if (d?.data?.length) {
                for (const student of d.data) {
                    // Saving the importedStudents in importedStudent Table
                    const importedStudent = new ImportedStudent();

                    importedStudent.id = student.id;
                    importedStudent.mis_id = student.mis_id ?? '[Unknown]';
                    importedStudent.initials = student.initials ?? '[Unknown]';
                    importedStudent.forename = student.forename ?? '[Unknown]';
                    importedStudent.surname = student.surname ?? '[Unknown]';
                    importedStudent.gender = student.gender;
                    importedStudent.UPN = student.education_details?.data.upn ?? '[Unknown]';
                    importedStudent.dateOfBirth = student.date_of_birth?.date ? new Date(student.date_of_birth?.date) : null;
                    importedStudent.importedFrom = ImportedType.WONDE;
                    importedStudent.ethnicity = student?.extended_details?.data?.ethnicity ?? null;
                    importedStudent.ethnicity_code = student?.extended_details?.data?.ethnicity_code ?? null;
                    importedStudent.english_as_additional_language =
                        student?.extended_details?.data?.english_as_additional_language ?? null;
                    importedStudent.english_as_additional_language_status =
                        student?.extended_details?.data?.english_as_additional_language_status ?? null;
                    importedStudent.sen_status = student?.extended_details?.data?.sen_status ?? null;
                    importedStudent.isPreRegistration = isPreRegistration ?? false;

                    // Logic below sets the value to true if any of the fields are true, else false if any are false, else null
                    importedStudent.isPremium = [
                        student.extended_details.data.premium_pupil_indicator,
                        student.extended_details.data.premium_pupil_eligible,
                        student.extended_details.data.free_school_meals_6
                    ].reduce((a, c) => (a == null ? c : c || a));

                    importedStudent.details = JSON.stringify({
                        fsm6: student.extended_details.data.free_school_meals_6,
                        premium_pupil_indicator: student.extended_details.data.premium_pupil_indicator,
                        premium_pupil_eligible: student.extended_details.data.premium_pupil_eligible,
                        premium_pupil_notes: student.extended_details.data.premium_pupil_notes ?? '[Unknown]',
                        import_nc_year: student.education_details.data.current_nc_year ?? '[Unknown]'
                    });

                    importedStudent.school = savedWondeSchool;

                    const savedWondeStudent = await manager.save(importedStudent);

                    if (savedWondeStudent) {
                        for (const parent of student.contacts.data) {
                            if (
                                (parent?.relationship?.priority == 1 || parent?.relationship?.parental_responsibility) &&
                                !parent?.relationship?.court_order
                            ) {
                                // Saving the ImportedContacts in ImportedContact Table
                                const importedContact = new ImportedContact();

                                importedContact.id = parent.id;
                                importedContact.email = this.getEmail(parent) ?? null;
                                importedContact.phoneNumber = this.getPhoneNumber(parent) ?? null;
                                importedContact.forename = parent.forename ?? '[Unknown]';
                                importedContact.surname = parent.surname ?? '[Unknown]';
                                importedContact.title = parent.title ?? '[Unknown]';
                                importedContact.importedFrom = ImportedType.WONDE;
                                importedContact.school = savedWondeSchool;
                                const savedWondeContact = await manager.save(importedContact);

                                const importedStudentContact = new ImportedStudentContact();

                                importedStudentContact.pupil_report = parent?.relationship?.pupil_report;
                                importedStudentContact.parental_responsibility = parent?.relationship?.parental_responsibility;
                                importedStudentContact.correspondence = parent?.relationship?.correspondence;
                                importedStudentContact.email_notification = parent?.relationship?.email_notification;
                                importedStudentContact.sms_notification = parent?.relationship?.sms_notification;
                                importedStudentContact.mail_notification = parent?.relationship?.mail_notification;
                                importedStudentContact.push_notification = parent?.relationship?.push_notification;
                                importedStudentContact.in_touch_communication = parent?.relationship?.in_touch_communication;
                                importedStudentContact.priority = parent?.relationship?.priority;
                                importedStudentContact.relationship = parent?.relationship?.relationship;
                                importedStudentContact.importedFrom = ImportedType.WONDE;
                                importedStudentContact.importedStudent = savedWondeStudent;
                                importedStudentContact.importedContact = savedWondeContact;
                                importedStudentContact.school = savedWondeSchool;

                                await manager.save(importedStudentContact);
                            } else {
                                importedIgnoredContacts = importedIgnoredContacts + 1;
                            }
                        }
                    }
                }
            }
        });

        return importedIgnoredContacts;
    }

    public async pullWondeSchoolClasses(
        manager: EntityManager,
        importedSchool: ImportedSchool,
        lwpSchool: LwpSchool,
        isTestSchool: boolean,
        wondeSchoolId: string
    ): Promise<void> {
        const wondeSchoolClassUrl = this.getWondeApi(
            `schools/${wondeSchoolId}/groups?per_page=5&type=REGISTRATION&include=students,students_pre_admission`
        );

        console.log('=> started pulling classes from Wonde API');

        await this.pullMultiDataSequentiallyFromWonde<WondeLwpSchoolClassResponse>(wondeSchoolClassUrl, isTestSchool, async (d) => {
            console.log(`=> got ${d.data.length} classes`);
            if (d.data.length) {
                const data = isTestSchool ? d?.data?.splice(0, 5) : d?.data;

                for (const importedSchoolClass of data) {
                    // Saving the SchoolClass in ImportedSchoolClass Table
                    let savedWondeSchoolClass = null;
                    const studentsData = importedSchoolClass?.students?.data;
                    const preAdmissionData = importedSchoolClass?.students_pre_admission?.data;

                    const newImportedSchoolClass = new ImportedSchoolClass();

                    newImportedSchoolClass.id = importedSchoolClass.id;
                    newImportedSchoolClass.name = importedSchoolClass.name ?? '[Unknown]';
                    newImportedSchoolClass.code = importedSchoolClass.code ?? '[Unknown]';
                    newImportedSchoolClass.yearGroup = await this.yearGroupService.getYearGroupByName('Unknown');
                    newImportedSchoolClass.period = importedSchool?.period;
                    newImportedSchoolClass.importedFrom = ImportedType.WONDE;

                    const studentIds = studentsData?.map((student) => student.id) ?? [];
                    const preAdmissionStudentIds = preAdmissionData?.map((student) => student.id) ?? [];
                    const allStudentIds = [...studentIds, ...preAdmissionStudentIds];

                    const existingStudents = await manager.find(ImportedStudent, {
                        where: { id: In(allStudentIds) },
                        select: ['id', 'details']
                    });

                    newImportedSchoolClass.nc_year =
                        existingStudents?.length > 0 ? JSON.parse(existingStudents?.[0]?.details)?.import_nc_year : '[Unknown]';

                    newImportedSchoolClass.school = importedSchool;

                    console.log(`===> Saving ImportedSchoolClass`, importedSchoolClass.id);
                    savedWondeSchoolClass = await manager.save(newImportedSchoolClass);

                    if (savedWondeSchoolClass) {
                        for (const student of existingStudents) {
                            student.schoolClasses = [savedWondeSchoolClass];
                        }

                        await manager.save(existingStudents);

                        const missingStudentIds = allStudentIds.filter((id) => !existingStudents.some((student) => student.id === id));

                        if (missingStudentIds.length > 0 && !isTestSchool) {
                            newrelic.recordCustomEvent('MissingStudentsInClass', {
                                groupId: savedWondeSchoolClass.id,
                                missingStudentIds: missingStudentIds.join(','),
                                message: `The following students in class ${savedWondeSchoolClass.name} were not found in the list of all students fetched from the Wonde API.`
                            });
                        }
                    }
                }
            }
        });
        console.log('=> finished pulling classes from Wonde API');
    }

    public async isWondeDataCurrent(importedSchoolId: string, schoolAcademicYear: number): Promise<boolean> {
        const importedStudents = await this.importedStudentRepository.find({
            where: { school: { id: importedSchoolId } },
            select: ['id', 'dateOfBirth', 'details']
        });

        let studentsWithoutDoB: number = 0;
        let studentsWithNoNcYear: number = 0;
        let validCount: number = 0;
        const totalStudents: number = importedStudents.length;

        for (const student of importedStudents) {
            if (!student.dateOfBirth) {
                studentsWithoutDoB++;
                continue;
            }

            let ncYear: string | null = null;

            try {
                const details = JSON.parse(student.details);

                ncYear = details.import_nc_year;
            } catch {
                console.error(`Failed to parse details for student ${student.id}`);
                studentsWithNoNcYear++;
                continue;
            }

            if (!ncYear || ncYear === '[Unknown]') {
                studentsWithNoNcYear++;
                continue;
            }

            const normalizedNcYear = this.helperService.normalizeSchoolYear(ncYear);

            if (normalizedNcYear === -999) {
                studentsWithNoNcYear++;
                continue;
            }

            const expectedNcYear = this.helperService.calculateExpectedNcYear(new Date(student.dateOfBirth), schoolAcademicYear);

            if (!expectedNcYear) {
                studentsWithoutDoB++;
                continue;
            }

            if (normalizedNcYear === expectedNcYear) {
                validCount++;
            }
        }

        if (validCount > totalStudents / 2) {
            await this.lwpSchoolRepository.update(
                { importedSchoolId },
                {
                    importStatus: ImportStatus.DATA_IMPORTED,
                    lastImportedAt: () => 'CURRENT_TIMESTAMP',
                    hasCurrentAcademicYearWondeData: true
                }
            );

            return true; // ✅ New Wonde data
        } else if (studentsWithoutDoB > totalStudents / 2 || studentsWithNoNcYear > totalStudents / 2) {
            await this.lwpSchoolRepository.update(
                { importedSchoolId },
                { importStatus: ImportStatus.PERMISSION_NEED_UPDATING, lastImportedAt: () => 'CURRENT_TIMESTAMP' }
            );
        } else {
            await this.lwpSchoolRepository.update(
                { importedSchoolId },
                { importStatus: ImportStatus.WRONG_ACADEMIC_YEAR, lastImportedAt: () => 'CURRENT_TIMESTAMP' }
            );
        }

        return false;
    }

    public async pullWondeSchoolData(wondeSchoolId: string, lwpSchoolId: string, extendStatementTimeout = false): Promise<void> {
        const lwpSchool = await this.lwpSchoolRepository.findOne({ where: { id: lwpSchoolId }, relations: ['curentPeriod'] });

        if (!lwpSchool) throw new HttpException('LWP School does not exist', ErrorStatusCodeEnum._535);

        const wondeSchoolUrl = this.getWondeApi(`schools/${wondeSchoolId}`);

        await this.connection.manager.transaction(async (manager) => {
            // The review-based import pulls under a longer statement timeout (3374de460,
            // raised here from 300s); the legacy nightly sync keeps the connection default.
            if (extendStatementTimeout) await manager.query("SET LOCAL statement_timeout = '30min'");

            await this.pullSingleDataSequentiallyFromWonde<WondeSchoolResponse>(wondeSchoolUrl, async (d) => {
                // Saving the school in ImportedSchool Table

                if (!d?.data) throw new HttpException(`No response from Wonde for ${wondeSchoolId}`, ErrorStatusCodeEnum._535);

                const importedSchool = new ImportedSchool();

                importedSchool.id = d?.data?.id;
                importedSchool.name = d?.data?.name ?? '[Unknown]';
                importedSchool.urn = d?.data?.urn;

                importedSchool.postCode = d?.data?.address?.address_postcode;

                importedSchool.lwpSchool = lwpSchool;
                importedSchool.period = await this.periodService.getCurrentPeriod();
                importedSchool.classes = [];
                importedSchool.importedContacts = [];
                importedSchool.importedStudents = [];
                importedSchool.importedStudentContacts = [];
                importedSchool.importedFrom = ImportedType.WONDE;
                console.log('=> Saving wonde School');
                const savedWondeSchool = await manager.save(importedSchool);

                if (savedWondeSchool) {
                    lwpSchool.importedSchoolId = savedWondeSchool.id;
                    lwpSchool.misIntegration = d?.data?.mis ?? '[Unknown]';

                    await manager.save(lwpSchool);

                    let importedIgnoredContacts = 0;

                    const isTestSchool = wondeSchoolId === 'A1930499544';

                    const wondeStudentsUrl = this.getWondeApi(
                        `schools/${wondeSchoolId}/students?per_page=200&include=education_details,extended_details,contacts,contacts.contact_details`
                    );

                    const importedIgnoredContactsForImportedStudents = await this.importWondeStudents(
                        manager,
                        savedWondeSchool,
                        false, // isPreRegistration
                        wondeStudentsUrl
                    );

                    importedIgnoredContacts += importedIgnoredContactsForImportedStudents;

                    const wondePreAdmissionStudentsUrl = this.getWondeApi(
                        `schools/${wondeSchoolId}/students-pre-admission?per_page=200&include=education_details,extended_details,contacts,contacts.contact_details`
                    );

                    const importedIgnoredContactsForImportedPreRegStudents = await this.importWondeStudents(
                        manager,
                        savedWondeSchool,
                        true, // isPreRegistration
                        wondePreAdmissionStudentsUrl
                    );

                    importedIgnoredContacts += importedIgnoredContactsForImportedPreRegStudents;

                    await this.pullWondeSchoolClasses(manager, savedWondeSchool, lwpSchool, isTestSchool, wondeSchoolId);

                    await manager.update(ImportedSchool, savedWondeSchool?.id, { importedIgnoredContacts });
                }

                console.log('=> End of school Wonde update transaction');
            });

            console.log('=> End of Wonde DB transaction');
        });
    }

    public async importWondeSchoolData(wondeSchoolId: string, lwpSchoolId: string, contextUser?: string | LwpUser): Promise<void> {
        const conextUserId = typeof contextUser === 'string' ? contextUser : contextUser?.id;
        let canLink = true;
        let isDataFromCurrentAcademicYear = true;
        const isTestSchool = wondeSchoolId === 'A1930499544';

        try {
            await this.notifyNewRelicIfCurrentlyInProgress(lwpSchoolId, conextUserId);

            const lwpSchool = await this.lwpSchoolRepository
                .createQueryBuilder('lwpSchool')
                .leftJoin('lwpSchool.curentPeriod', 'period')
                .where('lwpSchool.id = :id', { id: lwpSchoolId })
                .select([
                    'lwpSchool.id',
                    'lwpSchool.ignoreAcademicYearCheckDuringImport',
                    'lwpSchool.hasCurrentAcademicYearWondeData',
                    'period.index'
                ])
                .getOne();

            await this.lwpSchoolRepository.update(
                { id: lwpSchoolId },
                {
                    lastImportedAt: new Date(),
                    importStatus: ImportStatus.IMPORTING_DATA
                }
            );

            // It will delete old wonde data associated with $lwpSchool
            console.log('> Deleting old wonde data');
            await this.deleteWondeData(lwpSchoolId, false);

            // It will import new wonde data and associate it with $lwpSchool
            console.log('> Updating shadow database');
            await this.pullWondeSchoolData(wondeSchoolId, lwpSchoolId);

            if (!lwpSchool?.ignoreAcademicYearCheckDuringImport && !lwpSchool?.hasCurrentAcademicYearWondeData) {
                // It will check if the new wonde data is current
                console.log('> Checking if the new wonde data is current');
                isDataFromCurrentAcademicYear = await this.isWondeDataCurrent(wondeSchoolId, lwpSchool?.curentPeriod?.index);
            }

            if (!isDataFromCurrentAcademicYear && !isTestSchool) canLink = false;

            if (canLink) {
                // It will find old wonde's lwp data and associate them
                console.log('> Relinking LWP data with Wonde data (and adding parents of existing LWP pupils)');
                await this.reLinkingLwpWithWonde(wondeSchoolId, lwpSchoolId, conextUserId);
            }

            const updatedSchoolValues: QueryDeepPartialEntity<LwpSchool> = {
                lastImportedAt: new Date()
            };

            if (canLink) updatedSchoolValues.importStatus = ImportStatus.COMPLETE;

            console.log('> Saving the result of the wonde operation');
            await this.lwpSchoolRepository.update({ id: lwpSchoolId }, updatedSchoolValues);
        } catch (err) {
            const errorMessage = err?.message || 'Unknown error occurred';

            await this.lwpSchoolRepository.update(
                { id: lwpSchoolId },
                {
                    lastImportedAt: new Date(),
                    importStatus: ImportStatus.FAILED
                }
            );
            console.error('Wonde import failed:', { lwpSchoolId, error: errorMessage });
            throw err;
        }
    }

    /**
     * Notify to NewRelic if the school importStatus was "In progress...", but continue with current process anyway
     */
    public async notifyNewRelicIfCurrentlyInProgress(lwpSchoolId: string, contextUserId: string): Promise<void> {
        const school = await this.lwpSchoolRepository.findOne({ id: lwpSchoolId });

        if (ImportStatus.IMPORTING_DATA === school?.importStatus) {
            newrelic.noticeError(new Error("The school didn't finished last Wonde import successfully"), {
                caught: true,
                handled: false,
                schoolId: school?.id,
                wondeSchoolId: school?.importedSchool?.id,
                userId: contextUserId
            });
        }
    }
}
