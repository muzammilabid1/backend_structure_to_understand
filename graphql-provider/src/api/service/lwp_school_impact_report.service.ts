import { HttpException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import Handlebars from 'handlebars';
import { kebabCase } from 'lodash';
import {
    Gender,
    ImpactReportVersion,
    PupilParentStatus,
    SchoolAnalyticsGraphType,
    SchoolImpactReportType,
    SubjectProgrammeType,
    UserStatus
} from 'lwp-shared';
import moment from 'moment';
import { ShallowUserService } from 'src/auth/service/shallowuser.service';
import { AuthTokenJWT } from 'src/auth/types/AuthToken';
import { Brackets, Connection, EntityManager, Repository } from 'typeorm';

import { LwpSchoolImpactReportV1Output } from '../dtos/LwpSchoolImpactReportV1Output';
import { SchoolAnalyticsGraphOutput } from '../dtos/SchoolAnalyticsGraphOutput';
import { LwpSchoolDates } from '../entities/lwp_school_dates';
import { LwpSchoolImpactReport } from '../entities/lwp_school_impact_report';
import { LwpSchoolImpactReportGraphs } from '../entities/lwp_school_impact_report_graphs';
import { LwpMagicLink } from '../entities/magic_link';
import { LwpSchool } from '../entities/school';
import { StaticLwpSubject } from '../entities/static_lwp_subject';
import { StaticLwpPeriod } from '../entities/static_period';
import {
    ErrorStatusCodeEnum,
    GenrateSchoolImpactReportInput,
    MagicLinkType,
    SchoolAnalyticsDataQueryInput,
    SchoolClassStatus,
    SchoolImpactReportForMagicLinkOutput,
    UpdateSchoolImpactReportInput
} from '../model';
import { HelperService } from './helper.service';
import { LwpSchoolImpactReportFeedbackService } from './lwp_school_impact_report_feedback.service';
import { MagicLinkService } from './magic_link.service';
import { ParameterService } from './parameter.service';

@Injectable()
export class LwpSchoolImpactReportService {
    constructor(
        @InjectRepository(LwpSchoolImpactReport)
        private schoolImpactReportRepository: Repository<LwpSchoolImpactReport>,
        @InjectRepository(StaticLwpPeriod)
        private staticPeriodRepository: Repository<StaticLwpPeriod>,
        @InjectRepository(LwpSchool)
        private schoolRepository: Repository<LwpSchool>,
        @InjectRepository(LwpSchoolDates)
        private schoolDatesRepository: Repository<LwpSchoolDates>,
        @InjectRepository(StaticLwpSubject)
        private lwpSubjectRepository: Repository<StaticLwpSubject>,
        @InjectRepository(LwpSchoolImpactReportGraphs)
        private schoolImpactReportGraphsRepository: Repository<LwpSchoolImpactReportGraphs>,
        private shallowUserService: ShallowUserService,
        private parameterService: ParameterService,
        private schoolImpactReportFeedbackService: LwpSchoolImpactReportFeedbackService,
        private magicLinkService: MagicLinkService,
        private connection: Connection,
        private helperService: HelperService
    ) {}

    async impactReportDataForReading(
        schoolId: string,
        period: number,
        graphType?: SchoolAnalyticsGraphType
    ): Promise<SchoolAnalyticsGraphOutput[]> {
        const selectClauses: string[] = [];
        const withClauses: string[] = [];

        const oneWeekReadingTargetMetQuery = (fieldName: string, selectName: string, groupBy: string, orderBy: string = ''): void => {
            withClauses.push(`
            -- data for target met 1 week by: 
            ${fieldName}Data AS (
                SELECT 
                ${selectName} AS "name",
                
                COALESCE(COUNT(DISTINCT base."pupilId"), 0) AS "allPupilsCount",
                calculate_percentage(COUNT(DISTINCT base."pupilId")::int, COUNT(DISTINCT base."pupilId") FILTER (WHERE base."earnedGoldStar" = true)::int) AS "activeFamiliesPercentage",
                
                COALESCE(COUNT(DISTINCT base."pupilId") FILTER (WHERE base."isPremium" = true), 0) AS "premiumPupilCount",
                calculate_percentage(
                    COUNT(DISTINCT base."pupilId") FILTER (WHERE base."isPremium" = true)::int,
                    COUNT(DISTINCT base."pupilId") FILTER (WHERE base."earnedGoldStar" = true AND base."isPremium" = true)::int
                ) AS "activePremiumFamiliesPercentage",

                COALESCE(COUNT(DISTINCT base."pupilId") FILTER (WHERE base."isSend" = true), 0) AS "sendPupilCount",
                calculate_percentage(
                    COUNT(DISTINCT base."pupilId") FILTER (WHERE base."isSend" = true)::int,
                    COUNT(DISTINCT base."pupilId") FILTER (WHERE base."earnedGoldStar" = true AND base."isSend" = true)::int
                ) AS "activeSendFamiliesPercentage",

                COALESCE(COUNT(DISTINCT base."pupilId") FILTER (WHERE base."isEal" = true), 0) AS "ealPupilCount",
                calculate_percentage(
                    COUNT(DISTINCT base."pupilId") FILTER (WHERE base."isEal" = true)::int,
                    COUNT(DISTINCT base."pupilId") FILTER (WHERE base."earnedGoldStar" = true AND base."isEal" = true)::int
                ) AS "activeEalFamiliesPercentage",

                COALESCE(COUNT(DISTINCT base."pupilId") FILTER (WHERE base."gender" = $3), 0) AS "boysCount",
                calculate_percentage(
                    COUNT(DISTINCT base."pupilId") FILTER (WHERE base."gender" = $3)::int,
                    COUNT(DISTINCT base."pupilId") FILTER (WHERE base."earnedGoldStar" = true AND base."gender" = $3)::int
                ) AS "activeBoysPercentage",

                COALESCE(COUNT(DISTINCT base."pupilId") FILTER (WHERE base."gender" = $4), 0) AS "girlsCount",
                calculate_percentage(
                    COUNT(DISTINCT base."pupilId") FILTER (WHERE base."gender" = $4)::int,
                    COUNT(DISTINCT base."pupilId") FILTER (WHERE base."earnedGoldStar" = true AND base."gender" = $4)::int
                ) AS "activeGirlsPercentage"
                FROM base_data base
                ${groupBy}
                ${orderBy}
            )
            `);
            selectClauses.push(`
            (
                SELECT COALESCE(jsonb_agg(engagement.*), jsonb_build_array())
                FROM ${fieldName}Data engagement
            ) as "graphData"
            `);
        };

        // this will be included only for the school analytics
        if (graphType === SchoolAnalyticsGraphType.ENGAGEMENT_BY_SCHOOL) {
            oneWeekReadingTargetMetQuery('engagementBySchool', `'Overall'`, 'GROUP BY base."schoolId"');
        }

        if (graphType === SchoolAnalyticsGraphType.ENGAGEMENT_BY_YEAR_GROUP) {
            oneWeekReadingTargetMetQuery('engagementByYearGroup', `base."classYearGroup"`, 'GROUP BY base."classYearGroup"');
        }

        if (graphType === SchoolAnalyticsGraphType.ENGAGEMENT_BY_CLASS) {
            oneWeekReadingTargetMetQuery(
                'engagementByClass',
                `base."className"`,
                'GROUP BY base."className", base."classYearGroup"',
                `ORDER BY base."classYearGroup" ASC, base."className" ASC`
            );
        }

        const averageWeeklyTargetMetQuery = (fieldName: string, selectName: string, groupBy: string, orderBy: string = ''): void => {
            withClauses.push(`
                -- data for target met 1 week by: 
                ${fieldName}Data AS (
                    SELECT 
                        ${selectName} AS "name",
                        COALESCE(COUNT(DISTINCT base."pupilId"), 0) AS "allPupilsCount",
                        calculate_percentage(COUNT(DISTINCT base."pupilTopicId")::int, COUNT(DISTINCT base."pupilTopicId") FILTER (WHERE base."earnedGoldStar" = true)::int) AS "activeFamiliesPercentage",
                        
                        COALESCE(COUNT(DISTINCT base."pupilId") FILTER (WHERE base."isPremium" = true), 0) AS "premiumPupilCount",
                        calculate_percentage(
                            COUNT(DISTINCT base."pupilTopicId") FILTER (WHERE base."isPremium" = true)::int,
                            COUNT(DISTINCT base."pupilTopicId") FILTER (WHERE base."isPremium" = true AND base."earnedGoldStar" = true)::int
                        ) AS "activePremiumFamiliesPercentage",

                        COALESCE(COUNT(DISTINCT base."pupilId") FILTER (WHERE base."isSend" = true), 0) AS "sendPupilCount",
                        calculate_percentage(
                            COUNT(DISTINCT base."pupilTopicId") FILTER (WHERE base."isSend" = true)::int,
                            COUNT(DISTINCT base."pupilTopicId") FILTER (WHERE base."isSend" = true AND base."earnedGoldStar" = true)::int
                        ) AS "activeSendFamiliesPercentage",

                        COALESCE(COUNT(DISTINCT base."pupilId") FILTER (WHERE base."isEal" = true), 0) AS "ealPupilCount",
                        calculate_percentage(
                            COUNT(DISTINCT base."pupilTopicId") FILTER (WHERE base."isEal" = true)::int,
                            COUNT(DISTINCT base."pupilTopicId") FILTER (WHERE base."isEal" = true AND base."earnedGoldStar" = true)::int
                        ) AS "activeEalFamiliesPercentage",

                        COALESCE(COUNT(DISTINCT base."pupilId") FILTER (WHERE base."gender" = $3), 0) AS "boysCount",
                        calculate_percentage(
                            COUNT(DISTINCT base."pupilTopicId") FILTER (WHERE base."gender" = $3)::int,
                            COUNT(DISTINCT base."pupilTopicId") FILTER (WHERE base."gender" = $3 AND base."earnedGoldStar" = true)::int
                        ) AS "activeBoysPercentage",

                        COALESCE(COUNT(DISTINCT base."pupilId") FILTER (WHERE base."gender" = $4), 0) AS "girlsCount",
                        calculate_percentage(
                            COUNT(DISTINCT base."pupilTopicId") FILTER (WHERE base."gender" = $4)::int,
                            COUNT(DISTINCT base."pupilTopicId") FILTER (WHERE base."gender" = $4 AND base."earnedGoldStar" = true)::int
                        ) AS "activeGirlsPercentage"
                    FROM base_data base
                    ${groupBy}
                    ${orderBy}
                )
                `);
            selectClauses.push(`
                (
                    SELECT COALESCE(jsonb_agg(averageWeekTarget.*), jsonb_build_array())
                    FROM ${fieldName}Data averageWeekTarget
                ) as "graphData"
                `);
        };

        // this will be included only for the school analytics
        if (graphType === SchoolAnalyticsGraphType.AVG_WEEKLY_TARGET_MET_BY_SCHOOL) {
            averageWeeklyTargetMetQuery('avgWeeklyTargetMetBySchool', `'Overall'`, 'GROUP BY base."schoolId"');
        }

        if (graphType === SchoolAnalyticsGraphType.AVG_WEEKLY_TARGET_MET_BY_YEAR_GROUP) {
            averageWeeklyTargetMetQuery('avgWeeklyTargetMetByYearGroup', 'base."classYearGroup"', 'GROUP BY base."classYearGroup"');
        }

        if (graphType === SchoolAnalyticsGraphType.AVG_WEEKLY_TARGET_MET_BY_CLASS) {
            averageWeeklyTargetMetQuery(
                'avgWeeklyTargetMetByClass',
                'base."className"',
                'GROUP BY base."className", base."classYearGroup"',
                'ORDER BY base."classYearGroup" ASC, base."className" ASC'
            );
        }

        if (graphType === SchoolAnalyticsGraphType.BUILDING_ENGAGEMENT) {
            withClauses.push(`
                pupilReadingCompletion as (
                    select
                        base."pupilId" as pupil,
                        count(distinct base."pupilTopicId") as reading_completions
                    from base_data base where base."earnedGoldStar" = true
                    group by base."pupilId"
                ),
                reading_pupils_reached_target_at_least_1_weeks as (
                    select 
                            '1' AS "name",
                            calculate_percentage(COUNT(DISTINCT base."pupilId")::int, COUNT(DISTINCT base."pupilId") FILTER (WHERE prc.reading_completions >= 1)::int) AS "activeFamiliesPercentage",
                            
                            calculate_percentage(
                                COUNT(DISTINCT base."pupilId") FILTER (WHERE base."isPremium" = true)::int,
                                COUNT(DISTINCT base."pupilId") FILTER (WHERE base."isPremium" = true AND prc.reading_completions >= 1)::int) AS "activePremiumFamiliesPercentage",

                            calculate_percentage(
                                COUNT(DISTINCT base."pupilId") FILTER (WHERE base."isSend" = true)::int,
                                COUNT(DISTINCT base."pupilId") FILTER (WHERE base."isSend" = true AND prc.reading_completions >= 1)::int) AS "activeSendFamiliesPercentage",

                            calculate_percentage(
                                COUNT(DISTINCT base."pupilId") FILTER (WHERE base."isEal" = true)::int,
                                COUNT(DISTINCT base."pupilId") FILTER (WHERE base."isEal" = true AND prc.reading_completions >= 1)::int) AS "activeEalFamiliesPercentage",

                            calculate_percentage(
                                COUNT(DISTINCT base."pupilId") FILTER (WHERE base."gender" = $3)::int,
                                COUNT(DISTINCT base."pupilId") FILTER (WHERE base."gender" = $3 AND prc.reading_completions >= 1)::int) AS "activeBoysPercentage",

                            calculate_percentage(
                                COUNT(DISTINCT base."pupilId") FILTER (WHERE base."gender" = $4)::int,
                                COUNT(DISTINCT base."pupilId") FILTER (WHERE base."gender" = $4 AND prc.reading_completions >= 1)::int) AS "activeGirlsPercentage"
                        from base_data base
                    left join pupilReadingCompletion prc on prc.pupil = base."pupilId" 
                    group by base."schoolId"
                ),
                reading_pupils_reached_target_at_least_2_weeks as (
                    select 
                            '2' AS "name",
                            calculate_percentage(COUNT(DISTINCT base."pupilId")::int, COUNT(DISTINCT base."pupilId") FILTER (WHERE prc.reading_completions >= 2)::int) AS "activeFamiliesPercentage",
                            
                            calculate_percentage(
                                COUNT(DISTINCT base."pupilId") FILTER (WHERE base."isPremium" = true)::int,
                                COUNT(DISTINCT base."pupilId") FILTER (WHERE base."isPremium" = true AND prc.reading_completions >= 2)::int) AS "activePremiumFamiliesPercentage",

                            calculate_percentage(
                                COUNT(DISTINCT base."pupilId") FILTER (WHERE base."isSend" = true)::int,
                                COUNT(DISTINCT base."pupilId") FILTER (WHERE base."isSend" = true AND prc.reading_completions >= 2)::int) AS "activeSendFamiliesPercentage",

                            calculate_percentage(
                                COUNT(DISTINCT base."pupilId") FILTER (WHERE base."isEal" = true)::int,
                                COUNT(DISTINCT base."pupilId") FILTER (WHERE base."isEal" = true AND prc.reading_completions >= 2)::int) AS "activeEalFamiliesPercentage",

                            calculate_percentage(
                                COUNT(DISTINCT base."pupilId") FILTER (WHERE base."gender" = $3)::int,
                                COUNT(DISTINCT base."pupilId") FILTER (WHERE base."gender" = $3 AND prc.reading_completions >= 2)::int) AS "activeBoysPercentage",

                            calculate_percentage(
                                COUNT(DISTINCT base."pupilId") FILTER (WHERE base."gender" = $4)::int,
                                COUNT(DISTINCT base."pupilId") FILTER (WHERE base."gender" = $4 AND prc.reading_completions >= 2)::int) AS "activeGirlsPercentage"
                        from base_data base
                    left join pupilReadingCompletion prc on prc.pupil = base."pupilId" 
                    group by base."schoolId"
                ),
                reading_pupils_reached_target_at_least_3_weeks as (
                    select 
                            '3' AS "name",
                            calculate_percentage(COUNT(DISTINCT base."pupilId")::int, COUNT(DISTINCT base."pupilId") FILTER (WHERE prc.reading_completions >= 3)::int) AS "activeFamiliesPercentage",
                            
                            calculate_percentage(
                                COUNT(DISTINCT base."pupilId") FILTER (WHERE base."isPremium" = true)::int,
                                COUNT(DISTINCT base."pupilId") FILTER (WHERE base."isPremium" = true AND prc.reading_completions >= 3)::int) AS "activePremiumFamiliesPercentage",

                            calculate_percentage(
                                COUNT(DISTINCT base."pupilId") FILTER (WHERE base."isSend" = true)::int,
                                COUNT(DISTINCT base."pupilId") FILTER (WHERE base."isSend" = true AND prc.reading_completions >= 3)::int) AS "activeSendFamiliesPercentage",

                            calculate_percentage(
                                COUNT(DISTINCT base."pupilId") FILTER (WHERE base."isEal" = true)::int,
                                COUNT(DISTINCT base."pupilId") FILTER (WHERE base."isEal" = true AND prc.reading_completions >= 3)::int) AS "activeEalFamiliesPercentage",

                            calculate_percentage(
                                COUNT(DISTINCT base."pupilId") FILTER (WHERE base."gender" = $3)::int,
                                COUNT(DISTINCT base."pupilId") FILTER (WHERE base."gender" = $3 AND prc.reading_completions >= 3)::int) AS "activeBoysPercentage",

                            calculate_percentage(
                                COUNT(DISTINCT base."pupilId") FILTER (WHERE base."gender" = $4)::int,
                                COUNT(DISTINCT base."pupilId") FILTER (WHERE base."gender" = $4 AND prc.reading_completions >= 3)::int) AS "activeGirlsPercentage"
                        from base_data base
                    left join pupilReadingCompletion prc on prc.pupil = base."pupilId" 
                    group by base."schoolId"
                ),
                reading_pupils_reached_target_at_least_4_weeks as (
                    select 
                            '4' AS "name",
                            calculate_percentage(COUNT(DISTINCT base."pupilId")::int, COUNT(DISTINCT base."pupilId") FILTER (WHERE prc.reading_completions >= 4)::int) AS "activeFamiliesPercentage",
                            
                            calculate_percentage(
                                COUNT(DISTINCT base."pupilId") FILTER (WHERE base."isPremium" = true)::int,
                                COUNT(DISTINCT base."pupilId") FILTER (WHERE base."isPremium" = true AND prc.reading_completions >= 4)::int) AS "activePremiumFamiliesPercentage",

                            calculate_percentage(
                                COUNT(DISTINCT base."pupilId") FILTER (WHERE base."isSend" = true)::int,
                                COUNT(DISTINCT base."pupilId") FILTER (WHERE base."isSend" = true AND prc.reading_completions >= 4)::int) AS "activeSendFamiliesPercentage",

                            calculate_percentage(
                                COUNT(DISTINCT base."pupilId") FILTER (WHERE base."isEal" = true)::int,
                                COUNT(DISTINCT base."pupilId") FILTER (WHERE base."isEal" = true AND prc.reading_completions >= 4)::int) AS "activeEalFamiliesPercentage",

                            calculate_percentage(
                                COUNT(DISTINCT base."pupilId") FILTER (WHERE base."gender" = $3)::int,
                                COUNT(DISTINCT base."pupilId") FILTER (WHERE base."gender" = $3 AND prc.reading_completions >= 4)::int) AS "activeBoysPercentage",

                            calculate_percentage(
                                COUNT(DISTINCT base."pupilId") FILTER (WHERE base."gender" = $4)::int,
                                COUNT(DISTINCT base."pupilId") FILTER (WHERE base."gender" = $4 AND prc.reading_completions >= 4)::int) AS "activeGirlsPercentage"
                        from base_data base
                    left join pupilReadingCompletion prc on prc.pupil = base."pupilId" 
                    group by base."schoolId"
                ),
                reading_pupils_reached_target_at_least_5_weeks as (
                    select 
                            '5' AS "name",
                            calculate_percentage(COUNT(DISTINCT base."pupilId")::int, COUNT(DISTINCT base."pupilId") FILTER (WHERE prc.reading_completions >= 5)::int) AS "activeFamiliesPercentage",
                            
                            calculate_percentage(
                                COUNT(DISTINCT base."pupilId") FILTER (WHERE base."isPremium" = true)::int,
                                COUNT(DISTINCT base."pupilId") FILTER (WHERE base."isPremium" = true AND prc.reading_completions >= 5)::int) AS "activePremiumFamiliesPercentage",

                            calculate_percentage(
                                COUNT(DISTINCT base."pupilId") FILTER (WHERE base."isSend" = true)::int,
                                COUNT(DISTINCT base."pupilId") FILTER (WHERE base."isSend" = true AND prc.reading_completions >= 5)::int) AS "activeSendFamiliesPercentage",

                            calculate_percentage(
                                COUNT(DISTINCT base."pupilId") FILTER (WHERE base."isEal" = true)::int,
                                COUNT(DISTINCT base."pupilId") FILTER (WHERE base."isEal" = true AND prc.reading_completions >= 5)::int) AS "activeEalFamiliesPercentage",

                            calculate_percentage(
                                COUNT(DISTINCT base."pupilId") FILTER (WHERE base."gender" = $3)::int,
                                COUNT(DISTINCT base."pupilId") FILTER (WHERE base."gender" = $3 AND prc.reading_completions >= 5)::int) AS "activeBoysPercentage",

                            calculate_percentage(
                                COUNT(DISTINCT base."pupilId") FILTER (WHERE base."gender" = $4)::int,
                                COUNT(DISTINCT base."pupilId") FILTER (WHERE base."gender" = $4 AND prc.reading_completions >= 5)::int) AS "activeGirlsPercentage"
                        from base_data base
                    left join pupilReadingCompletion prc on prc.pupil = base."pupilId" 
                    group by base."schoolId"
                ),
                  -- Calculate premium pupils and total pupils count
                pupil_counts as (
                    select 
                        COALESCE(COUNT(DISTINCT base."pupilId"), 0) AS "allPupilsCount",
                        COALESCE(COUNT(DISTINCT base."pupilId") FILTER (WHERE base."isPremium" = true), 0) AS "premiumPupilCount",
                        COALESCE(COUNT(DISTINCT base."pupilId") FILTER (WHERE base."isSend" = true), 0) AS "sendPupilCount",
                        COALESCE(COUNT(DISTINCT base."pupilId") FILTER (WHERE base."isEal" = true), 0) AS "ealPupilCount",
                        COALESCE(COUNT(DISTINCT base."pupilId") FILTER (WHERE base."gender" = $3), 0) AS "boysCount",
                        COALESCE(COUNT(DISTINCT base."pupilId") FILTER (WHERE base."gender" = $4), 0) AS "girlsCount"
                    FROM base_data base
                    GROUP BY base."schoolId"
                )
            `);

            selectClauses.push(`
                (
                    SELECT COALESCE(
                        jsonb_build_object(
                            'name', '0',
                            'activeFamiliesPercentage', 100,
                            'activePremiumFamiliesPercentage', 100,
                            'activeSendFamiliesPercentage', 100,
                            'activeEalFamiliesPercentage', 100,
                            'activeBoysPercentage', 100,
                            'activeGirlsPercentage', 100
                        ) || jsonb_agg(week1.*) || jsonb_agg(week2.*) || jsonb_agg(week3.*) || jsonb_agg(week4.*) || jsonb_agg(week5.*),
                        jsonb_build_array()
                    )
                    FROM 
                        reading_pupils_reached_target_at_least_1_weeks week1,
                        reading_pupils_reached_target_at_least_2_weeks week2,
                        reading_pupils_reached_target_at_least_3_weeks week3,
                        reading_pupils_reached_target_at_least_4_weeks week4,
                        reading_pupils_reached_target_at_least_5_weeks week5
                ) AS "graphData",
                pc."allPupilsCount",
                pc."premiumPupilCount",
                pc."sendPupilCount",
                pc."ealPupilCount",
                pc."boysCount",
                pc."girlsCount"
                FROM pupil_counts pc
            `);
        }

        const query = `
            WITH base_data AS (
                select 
                    lsc."schoolId" AS "schoolId",
                    lsc.id AS "classId",
                    lsc."name" AS "className",
                    lsc."readingTarget" AS "readingTarget",
                    lct."releaseDate" AS "classTopicReleaseDate",
                    lpt."earnedGoldStar",
                    lpt."silverStars",
                    lpt."id" as "pupilTopicId",
                    lp."isPremium",
                    lp.id AS "pupilId",
                    lp.gender as gender,
                    ws.english_as_additional_language as "isEal",
                    (ws.sen_status IS NOT NULL AND ws.sen_status <> '') AS "isSend",
                    slyg.year AS "classYearGroup",
                    slp."index" AS "periodIndex",
                    slp."endDate" as "staticPeriodEndDate",
                    slp."isCurrentPeriod" as "isCurrentPeriod"
                FROM lwp_school ls    
                    JOIN lwp_school_class lsc ON lsc."schoolId" = ls.id and lsc."periodIndex" = $2 and lsc."isRegistrationClass" = true and lsc."status" = '${SchoolClassStatus.ACTIVE}' and lsc."IsReadingLogsEnabled" = true
                    Join lwp_class_pupil lcp on lcp."lwpSchoolClassId" = lsc.id
                    Join lwp_pupil lp on lp.id = lcp."lwpPupilId"
                    join lwp_pupil_parent lpp on lpp."pupilId" = lp.id and lpp.status IN ('${PupilParentStatus.INVITED}', '${PupilParentStatus.ACTIVE}')
                    Left Join imported_student ws on ws."lwpPupilId" = lp.id
                    Join lwp_pupil_topic lpt on lpt."pupilId" = lp.id and lpt."periodIndex" = $2 and lpt."readingTarget" > 0
                    Join lwp_class_topic lct on lct.id = lpt."classTopicId" and lct."released" = true and lct."readingTarget" > 0
                    JOIN static_lwp_topic slt ON slt.id = lct."topicId" AND slt."isReading" = true
                    JOIN static_lwp_year_group slyg ON slyg.id = lsc."yearGroup"
                    JOIN static_lwp_period slp ON slp."index" = lsc."periodIndex"
                    WHERE 
                        ls."id" = $1 
            ),
        ${withClauses.join(', ')}
        SELECT 
            ${selectClauses.join(', ')}
    `;

        const impactReport: SchoolAnalyticsGraphOutput[] = await this.connection.query(query, [
            schoolId,
            period,
            Gender.MALE,
            Gender.FEMALE
        ]);

        return impactReport;
    }

    async impactReportDataForTopicAndActivity(
        schoolId: string,
        period: number,
        graphType?: SchoolAnalyticsGraphType,
        subjectIds?: string[]
    ): Promise<SchoolAnalyticsGraphOutput[]> {
        const selectClauses: string[] = [];
        const withClauses: string[] = [];

        const oneTopicCompletionQuery = (fieldName: string, selectName: string, groupBy: string, orderBy: string = ''): void => {
            withClauses.push(`
            -- data for complete at least one topic by: 
            ${fieldName}Data AS (
                SELECT 
                ${selectName} AS "name",
                COALESCE(COUNT(DISTINCT base."pupilId"), 0) AS "allPupilsCount",
                calculate_percentage(COUNT(DISTINCT base."pupilId")::int, COUNT(DISTINCT base."pupilId") FILTER (WHERE base."earnedGoldStar" = true And base."subjectId" = any($5))::int) AS "activeFamiliesPercentage",

                COALESCE(COUNT(DISTINCT base."pupilId") FILTER (WHERE base."isPremium" = true), 0) AS "premiumPupilCount",
                calculate_percentage(
                    COUNT(DISTINCT base."pupilId") FILTER (WHERE base."isPremium" = true)::int,
                    COUNT(DISTINCT base."pupilId") FILTER (WHERE base."earnedGoldStar" = true And base."subjectId" = any($5) AND base."isPremium" = true)::int
                ) AS "activePremiumFamiliesPercentage",

                COALESCE(COUNT(DISTINCT base."pupilId") FILTER (WHERE base."isSend" = true), 0) AS "sendPupilCount",
                calculate_percentage(
                    COUNT(DISTINCT base."pupilId") FILTER (WHERE base."isSend" = true)::int,
                    COUNT(DISTINCT base."pupilId") FILTER (WHERE base."earnedGoldStar" = true And base."subjectId" = any($5) AND base."isSend" = true)::int
                ) AS "activeSendFamiliesPercentage",

                COALESCE(COUNT(DISTINCT base."pupilId") FILTER (WHERE base."isEal" = true), 0) AS "ealPupilCount",
                calculate_percentage(
                    COUNT(DISTINCT base."pupilId") FILTER (WHERE base."isEal" = true)::int,
                    COUNT(DISTINCT base."pupilId") FILTER (WHERE base."earnedGoldStar" = true And base."subjectId" = any($5) AND base."isEal" = true)::int
                ) AS "activeEalFamiliesPercentage",

                COALESCE(COUNT(DISTINCT base."pupilId") FILTER (WHERE base."gender" = $3), 0) AS "boysCount",
                calculate_percentage(
                    COUNT(DISTINCT base."pupilId") FILTER (WHERE base."gender" = $3)::int,
                    COUNT(DISTINCT base."pupilId") FILTER (WHERE base."earnedGoldStar" = true And base."subjectId" = any($5) AND base."gender" = $3)::int
                ) AS "activeBoysPercentage",

                COALESCE(COUNT(DISTINCT base."pupilId") FILTER (WHERE base."gender" = $4), 0) AS "girlsCount",
                calculate_percentage(
                    COUNT(DISTINCT base."pupilId") FILTER (WHERE base."gender" = $4)::int,
                    COUNT(DISTINCT base."pupilId") FILTER (WHERE base."earnedGoldStar" = true And base."subjectId" = any($5) AND base."gender" = $4)::int
                ) AS "activeGirlsPercentage"
                FROM base_data base
                ${groupBy}
                ${orderBy}
            )
            `);
            selectClauses.push(`
            (
                SELECT COALESCE(jsonb_agg(engagement.*), jsonb_build_array())
                FROM ${fieldName}Data engagement
            ) as "graphData"
            `);
        };

        // this will be included only for the school analytics
        if (graphType === SchoolAnalyticsGraphType.ENGAGEMENT_BY_SCHOOL) {
            oneTopicCompletionQuery('engagementBySchool', `'Overall'`, 'GROUP BY base."schoolId"');
        }

        if (graphType === SchoolAnalyticsGraphType.ENGAGEMENT_BY_YEAR_GROUP) {
            oneTopicCompletionQuery('engagementByYearGroup', `base."classYearGroup"`, 'GROUP BY base."classYearGroup"');
        }

        if (graphType === SchoolAnalyticsGraphType.ENGAGEMENT_BY_CLASS) {
            oneTopicCompletionQuery(
                'engagementByClass',
                `base."className"`,
                'GROUP BY base."className", base."classYearGroup"',
                'ORDER BY base."classYearGroup" ASC, base."className" ASC'
            );
        }

        const averageTopicSetQuery = (fieldName: string, selectName: string, groupBy: string, orderBy: string = ''): void => {
            withClauses.push(`
            -- data for topic setting by: 
            ${fieldName}Data AS (
                SELECT 
                ${selectName} AS "name",
                COALESCE(COUNT(DISTINCT base."pupilId"), 0) AS "allPupilsCount",
                COALESCE(
                    ROUND(
                        (COUNT(DISTINCT base."pupilTopicId") FILTER (WHERE base."subjectId" = ANY($3)))::NUMERIC / NULLIF(COUNT(DISTINCT base."pupilId"), 
                        0)
                    ), 
                    0
                ) AS "activeFamiliesPercentage"
                FROM base_data base
                ${groupBy}
                ${orderBy}
            )
            `);
            selectClauses.push(`
            (
                SELECT COALESCE(jsonb_agg(topic_set.*), jsonb_build_array())
                FROM ${fieldName}Data topic_set
            ) as "graphData"
            `);
        };

        // this will be included only for the school analytics
        if (graphType === SchoolAnalyticsGraphType.AVG_TOPIC_SET_BY_SCHOOL) {
            averageTopicSetQuery('avgTopicSetBySchool', `'Overall'`, 'GROUP BY base."schoolId"');
        }

        if (graphType === SchoolAnalyticsGraphType.AVG_TOPIC_SET_BY_YEAR_GROUP) {
            averageTopicSetQuery('avgTopicSetByYearGroup', `base."classYearGroup"`, 'GROUP BY base."classYearGroup"');
        }

        if (graphType === SchoolAnalyticsGraphType.AVG_TOPIC_SET_BY_CLASS) {
            averageTopicSetQuery(
                'avgTopicSetByClass',
                `base."className"`,
                'GROUP BY base."className", base."classYearGroup"',
                'ORDER BY base."classYearGroup" ASC, base."className" ASC'
            );
        }

        const averageTopicCompletionQuery = (fieldName: string, selectName: string, groupBy: string, orderBy: string = ''): void => {
            withClauses.push(`
            -- data for average pupil topic completion by: 
            ${fieldName}Data AS (
                SELECT 
                    ${selectName} AS "name",
                    COALESCE(COUNT(DISTINCT base."pupilId"), 0) AS "allPupilsCount",
                    calculate_percentage(COUNT(DISTINCT base."pupilTopicId")::int, COUNT(DISTINCT base."pupilTopicId") FILTER (WHERE base."earnedGoldStar" = true And base."subjectId" = any($5))::int) AS "activeFamiliesPercentage",
                    
                    COALESCE(COUNT(DISTINCT base."pupilId") FILTER (WHERE base."isPremium" = true), 0) AS "premiumPupilCount",
                    calculate_percentage(
                        COUNT(DISTINCT base."pupilTopicId") FILTER (WHERE base."isPremium" = true)::int,
                        COUNT(DISTINCT base."pupilTopicId") FILTER (WHERE base."isPremium" = true AND base."earnedGoldStar" = true And base."subjectId" = any($5))::int
                    ) AS "activePremiumFamiliesPercentage",

                    COALESCE(COUNT(DISTINCT base."pupilId") FILTER (WHERE base."isSend" = true), 0) AS "sendPupilCount",
                    calculate_percentage(
                        COUNT(DISTINCT base."pupilTopicId") FILTER (WHERE base."isSend" = true)::int,
                        COUNT(DISTINCT base."pupilTopicId") FILTER (WHERE base."isSend" = true AND base."earnedGoldStar" = true And base."subjectId" = any($5))::int
                    ) AS "activeSendFamiliesPercentage",

                    COALESCE(COUNT(DISTINCT base."pupilId") FILTER (WHERE base."isEal" = true), 0) AS "ealPupilCount",
                    calculate_percentage(
                        COUNT(DISTINCT base."pupilTopicId") FILTER (WHERE base."isEal" = true)::int,
                        COUNT(DISTINCT base."pupilTopicId") FILTER (WHERE base."isEal" = true AND base."earnedGoldStar" = true And base."subjectId" = any($5))::int
                    ) AS "activeEalFamiliesPercentage",

                    COALESCE(COUNT(DISTINCT base."pupilId") FILTER (WHERE base."gender" = $3), 0) AS "boysCount",
                    calculate_percentage(
                        COUNT(DISTINCT base."pupilTopicId") FILTER (WHERE base."gender" = $3)::int,
                        COUNT(DISTINCT base."pupilTopicId") FILTER (WHERE base."gender" = $3 AND base."earnedGoldStar" = true And base."subjectId" = any($5))::int
                    ) AS "activeBoysPercentage",

                    COALESCE(COUNT(DISTINCT base."pupilId") FILTER (WHERE base."gender" = $4), 0) AS "girlsCount",
                    calculate_percentage(
                        COUNT(DISTINCT base."pupilTopicId") FILTER (WHERE base."gender" = $4)::int,
                        COUNT(DISTINCT base."pupilTopicId") FILTER (WHERE base."gender" = $4 AND base."earnedGoldStar" = true And base."subjectId" = any($5))::int
                    ) AS "activeGirlsPercentage"
                FROM base_data base
                ${groupBy}
                ${orderBy}
            )
            `);
            selectClauses.push(`
            (
                SELECT COALESCE(jsonb_agg(avg_topic_completion.*), jsonb_build_array())
                FROM ${fieldName}Data avg_topic_completion
            ) as "graphData"
            `);
        };

        // this will be included only for the school analytics
        if (graphType === SchoolAnalyticsGraphType.AVG_TOPIC_COMPLETION_BY_SCHOOL) {
            averageTopicCompletionQuery('avgTopicCompletionBySchool', `'Overall'`, ' GROUP BY base."schoolId"');
        }

        // this will be included only for the school analytics
        if (graphType === SchoolAnalyticsGraphType.AVG_TOPIC_COMPLETION_BY_YEAR_GROUP) {
            averageTopicCompletionQuery('avgTopicCompletionByYearGroup', `base."classYearGroup"`, 'GROUP BY base."classYearGroup"');
        }

        // this will be included only for the school analytics
        if (graphType === SchoolAnalyticsGraphType.AVG_TOPIC_COMPLETION_BY_CLASS) {
            averageTopicCompletionQuery(
                'avgTopicCompletionByClass',
                `base."className"`,
                'GROUP BY base."className", base."classYearGroup"',
                `ORDER BY base."classYearGroup" ASC, base."className" ASC`
            );
        }

        if (graphType === SchoolAnalyticsGraphType.BUILDING_ENGAGEMENT) {
            withClauses.push(`
                pupilTopicCompletion as (
                  select
                	base."pupilId" as pupil,
                	count(distinct base."pupilTopicId") as topic_completions
                  from base_data base where base."earnedGoldStar"
                  group by base."pupilId"
                ),
                pupil_completed_at_least_1_topic as (
                  select 
                        '1' AS "name",
                        calculate_percentage(COUNT(DISTINCT base."pupilId")::int, COUNT(DISTINCT base."pupilId") FILTER (WHERE ptc.topic_completions >= 1)::int) AS "activeFamiliesPercentage",
                        
                        calculate_percentage(
                            COUNT(DISTINCT base."pupilId") FILTER (WHERE base."isPremium" = true)::int,
                            COUNT(DISTINCT base."pupilId") FILTER (WHERE base."isPremium" = true AND ptc.topic_completions >= 1)::int) AS "activePremiumFamiliesPercentage",
                        
                        calculate_percentage(
                            COUNT(DISTINCT base."pupilId") FILTER (WHERE base."isSend" = true)::int,
                            COUNT(DISTINCT base."pupilId") FILTER (WHERE base."isSend" = true AND ptc.topic_completions >= 1)::int) AS "activeSendFamiliesPercentage",

                        calculate_percentage(
                            COUNT(DISTINCT base."pupilId") FILTER (WHERE base."isEal" = true)::int,
                            COUNT(DISTINCT base."pupilId") FILTER (WHERE base."isEal" = true AND ptc.topic_completions >= 1)::int) AS "activeEalFamiliesPercentage",

                        calculate_percentage(
                            COUNT(DISTINCT base."pupilId") FILTER (WHERE base."gender" = $3)::int,
                            COUNT(DISTINCT base."pupilId") FILTER (WHERE base."gender" = $3 AND ptc.topic_completions >= 1)::int) AS "activeBoysPercentage",

                        calculate_percentage(
                            COUNT(DISTINCT base."pupilId") FILTER (WHERE base."gender" = $4)::int,
                            COUNT(DISTINCT base."pupilId") FILTER (WHERE base."gender" = $4 AND ptc.topic_completions >= 1)::int) AS "activeGirlsPercentage"
                    from base_data base
                  left join pupilTopicCompletion ptc on ptc.pupil = base."pupilId" 
                  group by base."schoolId"
                ),
                pupil_completed_at_least_2_topic as (
                  select 
                        '2' AS "name",
                        calculate_percentage(COUNT(DISTINCT base."pupilId")::int, COUNT(DISTINCT base."pupilId") FILTER (WHERE ptc.topic_completions >= 2)::int) AS "activeFamiliesPercentage",
                        
                        calculate_percentage(
                            COUNT(DISTINCT base."pupilId") FILTER (WHERE base."isPremium" = true)::int,
                            COUNT(DISTINCT base."pupilId") FILTER (WHERE base."isPremium" = true AND ptc.topic_completions >= 2)::int) AS "activePremiumFamiliesPercentage",
                        
                        calculate_percentage(
                            COUNT(DISTINCT base."pupilId") FILTER (WHERE base."isSend" = true)::int,
                            COUNT(DISTINCT base."pupilId") FILTER (WHERE base."isSend" = true AND ptc.topic_completions >= 2)::int) AS "activeSendFamiliesPercentage",

                        calculate_percentage(
                            COUNT(DISTINCT base."pupilId") FILTER (WHERE base."isEal" = true)::int,
                            COUNT(DISTINCT base."pupilId") FILTER (WHERE base."isEal" = true AND ptc.topic_completions >= 2)::int) AS "activeEalFamiliesPercentage",

                        calculate_percentage(
                            COUNT(DISTINCT base."pupilId") FILTER (WHERE base."gender" = $3)::int,
                            COUNT(DISTINCT base."pupilId") FILTER (WHERE base."gender" = $3 AND ptc.topic_completions >= 2)::int) AS "activeBoysPercentage",

                        calculate_percentage(
                            COUNT(DISTINCT base."pupilId") FILTER (WHERE base."gender" = $4)::int,
                            COUNT(DISTINCT base."pupilId") FILTER (WHERE base."gender" = $4 AND ptc.topic_completions >= 2)::int) AS "activeGirlsPercentage"
                    from base_data base
                  left join pupilTopicCompletion ptc on ptc.pupil = base."pupilId" 
                  group by base."schoolId"
                ),
                pupil_completed_at_least_3_topic as (
                  select 
                        '3' AS "name",
                        calculate_percentage(COUNT(DISTINCT base."pupilId")::int, COUNT(DISTINCT base."pupilId") FILTER (WHERE ptc.topic_completions >= 3)::int) AS "activeFamiliesPercentage",
                        
                        calculate_percentage(
                            COUNT(DISTINCT base."pupilId") FILTER (WHERE base."isPremium" = true)::int,
                            COUNT(DISTINCT base."pupilId") FILTER (WHERE base."isPremium" = true AND ptc.topic_completions >= 3)::int) AS "activePremiumFamiliesPercentage",
                        
                        calculate_percentage(
                            COUNT(DISTINCT base."pupilId") FILTER (WHERE base."isSend" = true)::int,
                            COUNT(DISTINCT base."pupilId") FILTER (WHERE base."isSend" = true AND ptc.topic_completions >= 3)::int) AS "activeSendFamiliesPercentage",

                        calculate_percentage(
                            COUNT(DISTINCT base."pupilId") FILTER (WHERE base."isEal" = true)::int,
                            COUNT(DISTINCT base."pupilId") FILTER (WHERE base."isEal" = true AND ptc.topic_completions >= 3)::int) AS "activeEalFamiliesPercentage",

                        calculate_percentage(
                            COUNT(DISTINCT base."pupilId") FILTER (WHERE base."gender" = $3)::int,
                            COUNT(DISTINCT base."pupilId") FILTER (WHERE base."gender" = $3 AND ptc.topic_completions >= 3)::int) AS "activeBoysPercentage",

                        calculate_percentage(
                            COUNT(DISTINCT base."pupilId") FILTER (WHERE base."gender" = $4)::int,
                            COUNT(DISTINCT base."pupilId") FILTER (WHERE base."gender" = $4 AND ptc.topic_completions >= 3)::int) AS "activeGirlsPercentage"
                    from base_data base
                  left join pupilTopicCompletion ptc on ptc.pupil = base."pupilId" 
                  group by base."schoolId"
                ),
                pupil_completed_at_least_4_topic as (
                  select 
                        '4' AS "name",
                        calculate_percentage(COUNT(DISTINCT base."pupilId")::int, COUNT(DISTINCT base."pupilId") FILTER (WHERE ptc.topic_completions >= 4)::int) AS "activeFamiliesPercentage",
                        
                        calculate_percentage(
                            COUNT(DISTINCT base."pupilId") FILTER (WHERE base."isPremium" = true)::int,
                            COUNT(DISTINCT base."pupilId") FILTER (WHERE base."isPremium" = true AND ptc.topic_completions >= 4)::int) AS "activePremiumFamiliesPercentage",
                        
                        calculate_percentage(
                            COUNT(DISTINCT base."pupilId") FILTER (WHERE base."isSend" = true)::int,
                            COUNT(DISTINCT base."pupilId") FILTER (WHERE base."isSend" = true AND ptc.topic_completions >= 4)::int) AS "activeSendFamiliesPercentage",

                        calculate_percentage(
                            COUNT(DISTINCT base."pupilId") FILTER (WHERE base."isEal" = true)::int,
                            COUNT(DISTINCT base."pupilId") FILTER (WHERE base."isEal" = true AND ptc.topic_completions >= 4)::int) AS "activeEalFamiliesPercentage",

                        calculate_percentage(
                            COUNT(DISTINCT base."pupilId") FILTER (WHERE base."gender" = $3)::int,
                            COUNT(DISTINCT base."pupilId") FILTER (WHERE base."gender" = $3 AND ptc.topic_completions >= 4)::int) AS "activeBoysPercentage",

                        calculate_percentage(
                            COUNT(DISTINCT base."pupilId") FILTER (WHERE base."gender" = $4)::int,
                            COUNT(DISTINCT base."pupilId") FILTER (WHERE base."gender" = $4 AND ptc.topic_completions >= 4)::int) AS "activeGirlsPercentage"
                    from base_data base
                  left join pupilTopicCompletion ptc on ptc.pupil = base."pupilId" 
                  group by base."schoolId"
                ),
                pupil_completed_at_least_5_topic as (
                  select 
                        '5' AS "name",
                        calculate_percentage(COUNT(DISTINCT base."pupilId")::int, COUNT(DISTINCT base."pupilId") FILTER (WHERE ptc.topic_completions >= 5)::int) AS "activeFamiliesPercentage",
                        
                        calculate_percentage(
                            COUNT(DISTINCT base."pupilId") FILTER (WHERE base."isPremium" = true)::int,
                            COUNT(DISTINCT base."pupilId") FILTER (WHERE base."isPremium" = true AND ptc.topic_completions >= 5)::int) AS "activePremiumFamiliesPercentage",
                        
                        calculate_percentage(
                            COUNT(DISTINCT base."pupilId") FILTER (WHERE base."isSend" = true)::int,
                            COUNT(DISTINCT base."pupilId") FILTER (WHERE base."isSend" = true AND ptc.topic_completions >= 5)::int) AS "activeSendFamiliesPercentage",

                        calculate_percentage(
                            COUNT(DISTINCT base."pupilId") FILTER (WHERE base."isEal" = true)::int,
                            COUNT(DISTINCT base."pupilId") FILTER (WHERE base."isEal" = true AND ptc.topic_completions >= 5)::int) AS "activeEalFamiliesPercentage",

                        calculate_percentage(
                            COUNT(DISTINCT base."pupilId") FILTER (WHERE base."gender" = $3)::int,
                            COUNT(DISTINCT base."pupilId") FILTER (WHERE base."gender" = $3 AND ptc.topic_completions >= 5)::int) AS "activeBoysPercentage",

                        calculate_percentage(
                            COUNT(DISTINCT base."pupilId") FILTER (WHERE base."gender" = $4)::int,
                            COUNT(DISTINCT base."pupilId") FILTER (WHERE base."gender" = $4 AND ptc.topic_completions >= 5)::int) AS "activeGirlsPercentage"
                    from base_data base
                  left join pupilTopicCompletion ptc on ptc.pupil = base."pupilId" 
                  group by base."schoolId"
                ),
                -- Calculate premium pupils and total pupils count
                pupil_counts as (
                    select 
                    COALESCE(COUNT(DISTINCT base."pupilId"), 0) AS "allPupilsCount",
                    COALESCE(COUNT(DISTINCT base."pupilId") FILTER (WHERE base."isPremium" = true), 0) AS "premiumPupilCount",
                    COALESCE(COUNT(DISTINCT base."pupilId") FILTER (WHERE base."isSend" = true), 0) AS "sendPupilCount",
                    COALESCE(COUNT(DISTINCT base."pupilId") FILTER (WHERE base."isEal" = true), 0) AS "ealPupilCount",
                    COALESCE(COUNT(DISTINCT base."pupilId") FILTER (WHERE base."gender" = $3), 0) AS "boysCount",
                    COALESCE(COUNT(DISTINCT base."pupilId") FILTER (WHERE base."gender" = $4), 0) AS "girlsCount"
                    FROM base_data base
                    GROUP BY base."schoolId"
                )
            `);
            selectClauses.push(`
                (
                    SELECT COALESCE(
                        jsonb_build_object(
                            'name', '0',
                            'activeFamiliesPercentage', 100,
                            'activePremiumFamiliesPercentage', 100,
                            'activeSendFamiliesPercentage', 100,
                            'activeEalFamiliesPercentage', 100,
                            'activeBoysPercentage', 100,
                            'activeGirlsPercentage', 100
                        ) || jsonb_agg(topic1.*) || jsonb_agg(topic2.*) || jsonb_agg(topic3.*) || jsonb_agg(topic4.*) || jsonb_agg(topic5.*),
                        jsonb_build_array()
                    )
                    FROM 
                        pupil_completed_at_least_1_topic topic1,
                        pupil_completed_at_least_2_topic topic2,
                        pupil_completed_at_least_3_topic topic3,
                        pupil_completed_at_least_4_topic topic4,
                        pupil_completed_at_least_5_topic topic5
                ) AS "graphData",
                pc."allPupilsCount",
                pc."premiumPupilCount",
                pc."sendPupilCount",
                pc."ealPupilCount",
                pc."boysCount",
                pc."girlsCount"
                FROM pupil_counts pc
            `);
        }

        const query = `
            WITH base_data AS (
                select 
                    lsc."schoolId" AS "schoolId",
                    lsc.id AS "classId",
                    lsc."name" AS "className",
                    lct."releaseDate" AS "classTopicReleaseDate",
                    lpt."earnedGoldStar",
                    lpt."silverStars",
                    lpt."id" as "pupilTopicId",
                    lp."isPremium",
                    lp.id AS "pupilId",
                    lp.gender as gender,
                    ws.english_as_additional_language as "isEal",
                    (ws.sen_status IS NOT NULL AND ws.sen_status <> '') AS "isSend",
                    slyg.year AS "classYearGroup",
                    slp."index" AS "periodIndex",
                    slp."endDate" as "staticPeriodEndDate",
                    slp."isCurrentPeriod" as "isCurrentPeriod",
                    sls.id AS "subjectId"
                FROM lwp_school ls    
                    JOIN lwp_school_class lsc ON lsc."schoolId" = ls.id and lsc."periodIndex" >= $2 and lsc."isRegistrationClass" = true and lsc."status" = '${SchoolClassStatus.ACTIVE}' and (lsc."isFullProgramme" = true or lsc."isReadyTeddyEnabled" or ls."isMoneySkillsAvailable")
                    Join lwp_class_pupil lcp on lcp."lwpSchoolClassId" = lsc.id
                    Join lwp_pupil lp on lp.id = lcp."lwpPupilId"
                    join lwp_pupil_parent lpp on lpp."pupilId" = lp.id and lpp.status IN ('${PupilParentStatus.INVITED}', '${PupilParentStatus.ACTIVE}')
                    Left Join imported_student ws on ws."lwpPupilId" = lp.id
                    Join lwp_pupil_topic lpt on lpt."pupilId" = lp.id and lpt."periodIndex" >= $2 and lpt."readingTarget" is null
                    Join lwp_class_topic lct on lct.id = lpt."classTopicId" and lct."released" = true and lct."readingTarget" is null
                    JOIN static_lwp_topic slt ON slt.id = lct."topicId" AND slt."isReading" = false
                    join static_lwp_topic_domain_year_group sltdyg on slt."id" = sltdyg."topicId"
                    join static_lwp_topic_domain sltd on sltdyg."domainId" = sltd."id"
                    join static_lwp_subject sls on sltd."subjectId" = sls."id"
                    JOIN static_lwp_year_group slyg ON slyg.id = lsc."yearGroup"
                    JOIN static_lwp_period slp ON slp."index" = lsc."periodIndex"
                    WHERE 
                        ls."id" = $1
            ),
        ${withClauses.join(', ')}
        SELECT 
            ${selectClauses.join(', ')}
    `;

        const parameters: Array<string | number | string[]> = [schoolId, period];

        // Gender parameters are not needed for average topic set graphs
        if (
            ![
                SchoolAnalyticsGraphType.AVG_TOPIC_SET_BY_SCHOOL,
                SchoolAnalyticsGraphType.AVG_TOPIC_SET_BY_YEAR_GROUP,
                SchoolAnalyticsGraphType.AVG_TOPIC_SET_BY_CLASS
            ].includes(graphType)
        )
            parameters.push(Gender.MALE, Gender.FEMALE);

        // Subject IDs parameter is needed for all graphs except Building Engagement
        if (graphType !== SchoolAnalyticsGraphType.BUILDING_ENGAGEMENT) parameters.push(subjectIds);

        const impactReport: SchoolAnalyticsGraphOutput[] = await this.connection.query(query, parameters);

        return impactReport;
    }

    async impactReportData(
        schoolId: string,
        periodIndex: number,
        term: LwpSchoolDates,
        manager: EntityManager
    ): Promise<{
        programOverview: LwpSchoolImpactReport;
        readingGraphs: LwpSchoolImpactReportGraphs;
        subjectsSpecificGraphs: LwpSchoolImpactReportGraphs[];
    }> {
        const termEndDate = moment(term.endDate).format('YYYY-MM-DD');

        const [programOverview]: LwpSchoolImpactReport[] = await manager.query(
            `WITH base AS (
            	SELECT 
            		ls.id as "schoolId",
            		lp.id as "pupilId",
            		lp."isPremium",
            		lpt."silverStars",
            		lct."releaseDate" as "classTopicReleaseDate",
            		lsc.id as "classId",
            		lsc."readingTarget" AS "classReadingTarget",
            		lsc."IsReadingLogsEnabled" as "isReadingLogsEnabledInClass",
            		slyg.year AS "classYearGroup",
            		slp."index" AS "periodIndex",
            		slp."endDate" as "staticPeriodEndDate",
            		slp."isCurrentPeriod" as "isCurrentPeriod"
            	FROM lwp_school ls
            	JOIN lwp_school_class lsc 
            		ON lsc."schoolId" = ls.id 
            		AND lsc."periodIndex" = $2 
            		AND lsc."isRegistrationClass" = true 
            		AND lsc."status" = $3 
            	JOIN lwp_class_pupil lcp on lcp."lwpSchoolClassId" = lsc.id
            	JOIN lwp_pupil lp on lp.id = lcp."lwpPupilId"
                join lwp_pupil_parent lpp on lpp."pupilId" = lp.id and lpp.status = ANY($6)
            	JOIN lwp_pupil_topic lpt 
            		ON lpt."pupilId" = lp.id 
            		AND lpt."periodIndex" = $2
            	Join lwp_class_topic lct 
            		ON lct.id = lpt."classTopicId" 
            		AND lct."released" = true 
                    AND lct."releaseDate" <= $5
            	JOIN static_lwp_topic slt 
            		ON slt.id = lct."topicId"
            		AND (
            			slt."isReading" 
            			OR EXISTS(
            				SELECT 1 
            				FROM static_lwp_topic_domain_year_group sltdyg
            				JOIN static_lwp_topic_domain sltd 
            					ON sltdyg."domainId" = sltd."id"
            			    JOIN static_lwp_subject sls 
            					ON sltd."subjectId" = sls."id"
            				WHERE slt.id = sltdyg."topicId"
            					AND sls."programmeType" = ANY($4)
            			)
            		)
            	LEFT JOIN static_lwp_year_group slyg ON slyg.id = lsc."yearGroup"
            	LEFT JOIN static_lwp_period slp ON slp."index" = lsc."periodIndex"
            ),
            program_overview_for_all_schools as (
            	SELECT 
            		calculate_percentage(COUNT(DISTINCT base."pupilId")::int, COUNT(DISTINCT base."pupilId") FILTER (WHERE base."silverStars" > 0)::int) AS "activeFamiliesPercentageAllSchools",
            		calculate_percentage(
            			COUNT(DISTINCT base."pupilId") FILTER (WHERE base."isPremium" = true)::int, 
            			COUNT(DISTINCT base."pupilId") FILTER (WHERE base."silverStars" > 0 AND base."isPremium" = true)::int
            		) AS "activePremiumFamiliesPercentageAllSchools"
            	FROM base
            	JOIN lwp_school ls
            		ON ls.id = base."schoolId"
            	WHERE 
            		NOT ls."inactive"
            		AND NOT ls."isTestSchool" 
            ),
            program_overview_for_school_specific AS (
            	SELECT
            		MIN(base."classTopicReleaseDate") AS "launchDate",
            		calculate_percentage(COUNT(DISTINCT base."pupilId")::int, COUNT(DISTINCT base."pupilId") FILTER (WHERE base."silverStars" > 0)::int) AS "activeFamiliesPercentage",
            		calculate_percentage(COUNT(DISTINCT base."pupilId") FILTER (WHERE base."isPremium" = true)::int, COUNT(DISTINCT base."pupilId") FILTER (WHERE base."silverStars" > 0 AND base."isPremium" = true)::int) AS "activePremiumFamiliesPercentage",
            		COUNT(DISTINCT base."classId") AS "numberOfClasses",
            		CASE 
            			WHEN MIN(base."classYearGroup") = MAX(base."classYearGroup") 
            			THEN MIN(base."classYearGroup")
            			ELSE CONCAT(MIN(base."classYearGroup"), ' to ', MAX(base."classYearGroup"))
            		END AS "yearGroupCoverage",  -- Year group range
            		(
            			CASE 
            				WHEN base."isCurrentPeriod" AND base."staticPeriodEndDate" > NOW()::DATE 
            				THEN NOW()::DATE 
            				ELSE base."staticPeriodEndDate" 
            			END - MIN(base."classTopicReleaseDate")
            		) / 7 AS "numberOfWeeks",
            		CASE 
            			WHEN COUNT(DISTINCT base."classReadingTarget") FILTER (WHERE base."isReadingLogsEnabledInClass" = true)::int = 1 
            			THEN MIN(base."classReadingTarget") 
            			ELSE NULL
            		END AS "weeklyReadingTarget"
            	FROM base 
            	WHERE 
            		"schoolId" = $1
            	GROUP BY base."schoolId", base."isCurrentPeriod", base."staticPeriodEndDate"
            )
            SELECT *
            FROM program_overview_for_all_schools poas
            CROSS JOIN program_overview_for_school_specific pos;
            `,
            [
                schoolId,
                periodIndex,
                SchoolClassStatus.ACTIVE,
                [SubjectProgrammeType.FULL_PROGRAMME, SubjectProgrammeType.MONEY_SKILLS],
                termEndDate,
                [PupilParentStatus.INVITED, PupilParentStatus.ACTIVE]
            ]
        );

        if (!programOverview) throw new HttpException('No data found for the given academic year', ErrorStatusCodeEnum._535);

        const [readingGraphs]: LwpSchoolImpactReportGraphs[] = await manager.query(
            `
            WITH base AS (
                SELECT
                    lsc."schoolId",
                    lsc."readingTarget",
                    lpt."earnedGoldStar",
                    lpt."silverStars",
                    lpt."id" as "pupilTopicId",
                    lp."isPremium",
                    lp.id AS "pupilId",
                    slyg.year AS "classYearGroup"
                FROM lwp_school ls
                JOIN lwp_school_class lsc 
                    ON lsc."schoolId" = ls.id 
                    AND lsc."periodIndex" = $2 
                    AND lsc."isRegistrationClass" = true 
                    AND lsc."status" = $3 
                    AND lsc."IsReadingLogsEnabled" = true
                JOIN lwp_class_pupil lcp ON lcp."lwpSchoolClassId" = lsc.id
                JOIN lwp_pupil lp ON lp.id = lcp."lwpPupilId"
                join lwp_pupil_parent lpp on lpp."pupilId" = lp.id and lpp.status = ANY($5)
                JOIN lwp_pupil_topic lpt on lpt."pupilId" = lp.id AND lpt."periodIndex" = $2 AND lpt."readingTarget" > 0
                JOIN lwp_class_topic lct ON 
                    lct.id = lpt."classTopicId" 
                    AND lct."released" = true 
                    AND lct."readingTarget" > 0
                    AND lct."releaseDate" <= $4
                JOIN static_lwp_topic slt ON slt.id = lct."topicId" AND slt."isReading" = true
                JOIN static_lwp_year_group slyg ON slyg.id = lsc."yearGroup"
                JOIN static_lwp_period slp ON slp."index" = lsc."periodIndex"
                WHERE
                    ls."id" = $1
            ),
            -- One weekly reading engagement by year group
            engagementByYearGroupData AS (
                SELECT
                    b."classYearGroup" AS "name",
                    COALESCE(COUNT(DISTINCT b."pupilId") FILTER (WHERE b."isPremium" = true), 0) AS "premiumPupilCount",
                    COALESCE(COUNT(DISTINCT b."pupilId"), 0) AS "allPupilsCount",
                    calculate_percentage(COUNT(DISTINCT b."pupilId")::int, COUNT(DISTINCT b."pupilId") FILTER (WHERE b."earnedGoldStar" = true)::int) AS "activeFamiliesPercentage",
                    calculate_percentage(
                        COUNT(DISTINCT b."pupilId") FILTER (WHERE b."isPremium" = true)::int,
                        COUNT(DISTINCT b."pupilId") FILTER (WHERE b."earnedGoldStar" = true AND b."isPremium" = true)::int
                    ) AS "activePremiumFamiliesPercentage"
                FROM base b
                GROUP BY b."classYearGroup"
            ),
            -- average weekly target met by year group
            avgWeeklyTargetMetByYearGroup AS (
                SELECT
                    b."classYearGroup" AS "name",
                    COALESCE(COUNT(DISTINCT b."pupilId") FILTER (WHERE b."isPremium" = true), 0) AS "premiumPupilCount",
                    COALESCE(COUNT(DISTINCT b."pupilId"), 0) AS "allPupilsCount",
                    calculate_percentage(COUNT(DISTINCT b."pupilTopicId")::int, COUNT(DISTINCT b."pupilTopicId") FILTER (WHERE b."earnedGoldStar" = true)::int) AS "activeFamiliesPercentage",
                    calculate_percentage(
                        COUNT(DISTINCT b."pupilTopicId") FILTER (WHERE b."isPremium" = true)::int,
                        COUNT(DISTINCT b."pupilTopicId") FILTER (WHERE b."isPremium" = true AND b."earnedGoldStar" = true)::int
                    ) AS "activePremiumFamiliesPercentage"
                FROM base b
                GROUP BY b."classYearGroup"

            ),
            pupilReadingCompletion as (
                SELECT
                    b."pupilId" as pupil,
                    count(DISTINCT b."pupilTopicId") as reading_completions
                FROM base b where b."silverStars" >= 1 OR b."earnedGoldStar" = true
                GROUP BY b."pupilId"
            ),
            pupils_log_reading_at_least_1_weeks as (
                SELECT
                    '1' AS "name",
                    calculate_percentage(COUNT(DISTINCT b."pupilId")::int, COUNT(DISTINCT b."pupilId") FILTER (WHERE prc.reading_completions >= 1)::int) AS "activeFamiliesPercentage",
                    calculate_percentage(
                        COUNT(DISTINCT b."pupilId") FILTER (WHERE b."isPremium" = true)::int,
                        COUNT(DISTINCT b."pupilId") FILTER (WHERE b."isPremium" = true AND prc.reading_completions >= 1)::int) AS "activePremiumFamiliesPercentage"
                    FROM base b
                LEFT JOIN pupilReadingCompletion prc ON prc.pupil = b."pupilId"
                GROUP BY b."schoolId"
            ),
            pupils_log_reading_at_least_2_weeks as (
                SELECT
                        '2' AS "name",
                        calculate_percentage(COUNT(DISTINCT b."pupilId")::int, COUNT(DISTINCT b."pupilId") FILTER (WHERE prc.reading_completions >= 2)::int) AS "activeFamiliesPercentage",
                        calculate_percentage(
                            COUNT(DISTINCT b."pupilId") FILTER (WHERE b."isPremium" = true)::int,
                            COUNT(DISTINCT b."pupilId") FILTER (WHERE b."isPremium" = true AND prc.reading_completions >= 2)::int) AS "activePremiumFamiliesPercentage"
                    FROM base b
                LEFT JOIN pupilReadingCompletion prc ON prc.pupil = b."pupilId"
                GROUP BY b."schoolId"
            ),
            pupils_log_reading_at_least_3_weeks as (
                SELECT
                        '3' AS "name",
                        calculate_percentage(COUNT(DISTINCT b."pupilId")::int, COUNT(DISTINCT b."pupilId") FILTER (WHERE prc.reading_completions >= 3)::int) AS "activeFamiliesPercentage",
                        calculate_percentage(
                            COUNT(DISTINCT b."pupilId") FILTER (WHERE b."isPremium" = true)::int,
                            COUNT(DISTINCT b."pupilId") FILTER (WHERE b."isPremium" = true AND prc.reading_completions >= 3)::int) AS "activePremiumFamiliesPercentage"
                    FROM base b
                LEFT JOIN pupilReadingCompletion prc ON prc.pupil = b."pupilId"
                GROUP BY b."schoolId"
            ),
            pupils_log_reading_at_least_4_weeks as (
                SELECT
                        '4' AS "name",
                        calculate_percentage(COUNT(DISTINCT b."pupilId")::int, COUNT(DISTINCT b."pupilId") FILTER (WHERE prc.reading_completions >= 4)::int) AS "activeFamiliesPercentage",
                        calculate_percentage(
                            COUNT(DISTINCT b."pupilId") FILTER (WHERE b."isPremium" = true)::int,
                            COUNT(DISTINCT b."pupilId") FILTER (WHERE b."isPremium" = true AND prc.reading_completions >= 4)::int) AS "activePremiumFamiliesPercentage"
                    FROM base b
                LEFT JOIN pupilReadingCompletion prc ON prc.pupil = b."pupilId"
                GROUP BY b."schoolId"
            ),
            pupils_log_reading_at_least_5_weeks as (
                SELECT
                        '5' AS "name",
                        calculate_percentage(COUNT(DISTINCT b."pupilId")::int, COUNT(DISTINCT b."pupilId") FILTER (WHERE prc.reading_completions >= 5)::int) AS "activeFamiliesPercentage",
                        calculate_percentage(
                            COUNT(DISTINCT b."pupilId") FILTER (WHERE b."isPremium" = true)::int,
                            COUNT(DISTINCT b."pupilId") FILTER (WHERE b."isPremium" = true AND prc.reading_completions >= 5)::int) AS "activePremiumFamiliesPercentage"
                    FROM base b
                LEFT JOIN pupilReadingCompletion prc ON prc.pupil = b."pupilId"
                GROUP BY b."schoolId"
            ),
            -- Calculate premium pupils and total pupils count
            pupil_counts as (
                SELECT
                    COALESCE(COUNT(DISTINCT b."pupilId") FILTER (WHERE b."isPremium" = true), 0) AS "premiumPupilsCount",
                    COALESCE(COUNT(DISTINCT b."pupilId"), 0) AS "pupilsCount"
                FROM base b
                GROUP BY b."schoolId"
            )
            SELECT
                (
                    SELECT COALESCE(jsonb_agg(engagement.*), jsonb_build_array())
                    FROM engagementByYearGroupData engagement
                ) as "engagementByYearGroup",
                (
                    SELECT COALESCE(jsonb_agg(averageWeekTarget.*), jsonb_build_array())
                    FROM avgWeeklyTargetMetByYearGroup averageWeekTarget
                ) as "avgCompletionRateByYearGroup",
                (
                    SELECT COALESCE(
                        jsonb_build_object(
                            'name', '0',
                            'activeFamiliesPercentage', 100,
                            'activePremiumFamiliesPercentage', 100
                        ) || jsonb_agg(week1.*) || jsonb_agg(week2.*) || jsonb_agg(week3.*) || jsonb_agg(week4.*) || jsonb_agg(week5.*),
                        jsonb_build_array()
                    )
                    FROM
                        pupils_log_reading_at_least_1_weeks week1,
                        pupils_log_reading_at_least_2_weeks week2,
                        pupils_log_reading_at_least_3_weeks week3,
                        pupils_log_reading_at_least_4_weeks week4,
                        pupils_log_reading_at_least_5_weeks week5
                ) AS "buildingEngagement",
                (SELECT "premiumPupilsCount" FROM pupil_counts) AS "premiumPupilsCount",
                (SELECT "pupilsCount" FROM pupil_counts ) AS "pupilsCount",
                base."schoolId"
            FROM base
            GROUP BY base."schoolId"
            `,
            [schoolId, periodIndex, SchoolClassStatus.ACTIVE, termEndDate, [PupilParentStatus.INVITED, PupilParentStatus.ACTIVE]]
        );

        const subjectsSpecificGraphs: LwpSchoolImpactReportGraphs[] = await manager.query(
            `
            WITH subjects AS (
                SELECT 
                    sls.id AS "subjectId",
                    sls.name AS "subjectName"
                FROM static_lwp_subject sls
                WHERE sls."programmeType" = ANY($4)
            ),
            school_data_base_query AS (
                SELECT
                    ls."id" AS "schoolId",
                    lpt."id" AS "pupilTopicId",
                    lsc.id AS "classId",
                    lsc."name" AS "className",
                    lpt."earnedGoldStar",
                    lp.id AS "pupilId",
                    lp."isPremium",
                    slyg.year AS "classYearGroup",
                    sls.id AS "subjectId"
                FROM lwp_school ls
                JOIN lwp_school_class lsc 
                    ON lsc."schoolId" = ls.id
                    AND lsc."periodIndex" = $2
                    AND lsc."isRegistrationClass" = TRUE
                    AND lsc."status" = $3
                    AND (lsc."isFullProgramme" = TRUE OR ls."isMoneySkillsAvailable")
                JOIN lwp_class_pupil lcp 
                    ON lcp."lwpSchoolClassId" = lsc.id
                JOIN lwp_pupil lp 
                    ON lp.id = lcp."lwpPupilId"
                join lwp_pupil_parent lpp on lpp."pupilId" = lp.id and lpp.status = ANY($6)
                JOIN lwp_pupil_topic lpt 
                    ON lpt."pupilId" = lp.id
                    AND lpt."periodIndex" = $2
                    AND lpt."readingTarget" IS NULL
                JOIN lwp_class_topic lct 
                    ON lct.id = lpt."classTopicId"
                    AND lct."released" = TRUE
                    AND lct."readingTarget" IS NULL
                    AND lct."releaseDate" <= $5
                JOIN static_lwp_topic slt 
                    ON slt.id = lct."topicId"
                    AND slt."isReading" = FALSE
                JOIN static_lwp_topic_domain_year_group sltdyg 
                    ON slt."id" = sltdyg."topicId"
                JOIN static_lwp_topic_domain sltd 
                    ON sltdyg."domainId" = sltd."id"
                JOIN static_lwp_subject sls 
                    ON sltd."subjectId" = sls."id" 
            		AND sls."programmeType" = ANY($4)
                JOIN static_lwp_year_group slyg 
                    ON slyg.id = lsc."yearGroup"
                WHERE ls."id" = $1
            ),
            pupil_topic_completion AS (
                SELECT
                    base."pupilId" AS pupil,
                    base."subjectId",
                    COUNT(DISTINCT base."pupilTopicId") AS topic_completions
                FROM school_data_base_query base
                WHERE base."earnedGoldStar"
                GROUP BY base."subjectId", base."pupilId"
            ),
            buildingEngagementData AS (
                SELECT 
                    sub."subjectId",
                    COALESCE(
                        COUNT(DISTINCT base."pupilId") FILTER (WHERE base."isPremium" = TRUE), 0
                    ) AS "premiumPupilsCount",
                    COALESCE(COUNT(DISTINCT base."pupilId"), 0) AS "pupilsCount",
                    (
                        SELECT COALESCE(
                            jsonb_build_array(
                                jsonb_build_object(
                                    'name', '0',
                                    'activeFamiliesPercentage', 100,
                                    'activePremiumFamiliesPercentage', 100
                                ),
                                jsonb_build_object(
                                    'name', '1',
                                    'pupil_count', COUNT(DISTINCT base."pupilId"),
                                    'pupil_with_active', COUNT(DISTINCT base."pupilId") FILTER (WHERE ptc.topic_completions >= 1),
                                    'activeFamiliesPercentage',
                                        calculate_percentage(
                                            COUNT(DISTINCT base."pupilId")::int,
                                            COUNT(DISTINCT base."pupilId")
                                                FILTER (WHERE ptc.topic_completions >= 1)::int
                                        ),
                                    'activePremiumFamiliesPercentage',
                                        calculate_percentage(
                                            COUNT(DISTINCT base."pupilId") FILTER (WHERE base."isPremium" = TRUE)::int,
                                            COUNT(DISTINCT base."pupilId") FILTER (WHERE base."isPremium" = TRUE AND ptc.topic_completions >= 1)::int
                                        )
                                ),
                                jsonb_build_object(
                                    'name', '2',
                                    'pupil_count', COUNT(DISTINCT base."pupilId"),
                                    'pupil_with_active',
                                        COUNT(DISTINCT base."pupilId") FILTER (WHERE ptc.topic_completions >= 2),
                                    'activeFamiliesPercentage',
                                        calculate_percentage(
                                            COUNT(DISTINCT base."pupilId")::int,
                                            COUNT(DISTINCT base."pupilId") FILTER (WHERE ptc.topic_completions >= 2)::int
                                        ),
                                    'activePremiumFamiliesPercentage',
                                        calculate_percentage(
                                            COUNT(DISTINCT base."pupilId") FILTER (WHERE base."isPremium" = TRUE)::int,
                                            COUNT(DISTINCT base."pupilId") FILTER (WHERE base."isPremium" = TRUE AND ptc.topic_completions >= 2)::int
                                        )
                                ),
                                jsonb_build_object(
                                    'name', '3',
                                    'pupil_count', COUNT(DISTINCT base."pupilId"),
                                    'pupil_with_active',
                                        COUNT(DISTINCT base."pupilId") FILTER (WHERE ptc.topic_completions >= 3),
                                    'activeFamiliesPercentage',
                                        calculate_percentage(
                                            COUNT(DISTINCT base."pupilId")::int,
                                            COUNT(DISTINCT base."pupilId") FILTER (WHERE ptc.topic_completions >= 3)::int
                                        ),
                                    'activePremiumFamiliesPercentage',
                                        calculate_percentage(
                                            COUNT(DISTINCT base."pupilId") FILTER (WHERE base."isPremium" = TRUE)::int,
                                            COUNT(DISTINCT base."pupilId") FILTER (WHERE base."isPremium" = TRUE AND ptc.topic_completions >= 3)::int
                                        )
                                ),
                                jsonb_build_object(
                                    'name', '4',
                                    'pupil_count', COUNT(DISTINCT base."pupilId"),
                                    'pupil_with_active',
                                        COUNT(DISTINCT base."pupilId") FILTER (WHERE ptc.topic_completions >= 4),
                                    'activeFamiliesPercentage',
                                        calculate_percentage(
                                            COUNT(DISTINCT base."pupilId")::int,
                                            COUNT(DISTINCT base."pupilId") FILTER (WHERE ptc.topic_completions >= 4)::int
                                        ),
                                    'activePremiumFamiliesPercentage',
                                        calculate_percentage(
                                            COUNT(DISTINCT base."pupilId") FILTER (WHERE base."isPremium" = TRUE)::int,
                                            COUNT(DISTINCT base."pupilId") FILTER (WHERE base."isPremium" = TRUE AND ptc.topic_completions >= 4)::int
                                        )
                                ),
                                jsonb_build_object(
                                    'name', '5',
                                    'pupil_count', COUNT(DISTINCT base."pupilId"),
                                    'pupil_with_active',
                                        COUNT(DISTINCT base."pupilId") FILTER (WHERE ptc.topic_completions >= 5),
                                    'activeFamiliesPercentage',
                                        calculate_percentage(
                                            COUNT(DISTINCT base."pupilId")::int,
                                            COUNT(DISTINCT base."pupilId") FILTER (WHERE ptc.topic_completions >= 5)::int
                                        ),
                                    'activePremiumFamiliesPercentage',
                                        calculate_percentage(
                                            COUNT(DISTINCT base."pupilId") FILTER (WHERE base."isPremium" = TRUE)::int,
                                            COUNT(DISTINCT base."pupilId") FILTER (WHERE base."isPremium" = TRUE AND ptc.topic_completions >= 5)::int
                                        )
                                )
                            ),
                            jsonb_build_array()
                        )
                    ) AS "buildingEngagement"
                FROM subjects sub
                JOIN school_data_base_query base
                    ON base."subjectId" = sub."subjectId"
                LEFT JOIN pupil_topic_completion ptc
                    ON ptc.pupil = base."pupilId"
                    AND ptc."subjectId" = base."subjectId"
                GROUP BY sub."subjectId"
            )
            SELECT 
                sub."subjectName",
                sub."subjectId",
                bed."premiumPupilsCount",
                bed."pupilsCount",
                bed."buildingEngagement",
                (
                    SELECT COALESCE(jsonb_agg(engagement.*), jsonb_build_array())
                    FROM (
                        SELECT
                            base."classYearGroup" AS "name",
                            COALESCE(
                                COUNT(DISTINCT base."pupilId")
                                    FILTER (WHERE base."isPremium" = TRUE),
                                0
                            ) AS "premiumPupilCount",
                            COALESCE(COUNT(DISTINCT base."pupilId"), 0) AS "allPupilsCount",
                            calculate_percentage(
                                COUNT(DISTINCT base."pupilId")::int,
                                COUNT(DISTINCT base."pupilId")
                                    FILTER (WHERE base."earnedGoldStar" = TRUE
                                            AND base."subjectId" = sub."subjectId")::int
                            ) AS "activeFamiliesPercentage",
                            calculate_percentage(
                                COUNT(DISTINCT base."pupilId")
                                    FILTER (WHERE base."isPremium" = TRUE)::int,
                                COUNT(DISTINCT base."pupilId")
                                    FILTER (WHERE base."earnedGoldStar" = TRUE
                                            AND base."isPremium" = TRUE
                                            AND base."subjectId" = sub."subjectId")::int
                            ) AS "activePremiumFamiliesPercentage"
                        FROM school_data_base_query base
                        GROUP BY base."classYearGroup"
                    ) engagement
                ) AS "engagementByYearGroup",
                (
                    SELECT COALESCE(jsonb_agg("avgTopicSetting".*), jsonb_build_array())
                    FROM (
                        SELECT
                            base."className" AS "name",
                            COALESCE(COUNT(DISTINCT base."pupilId"), 0) AS "allPupilsCount",
                            COUNT(DISTINCT base."pupilTopicId")
                                FILTER (WHERE base."subjectId" = sub."subjectId") AS topic_count,
                            COALESCE(
                                ROUND(
                                    (COUNT(DISTINCT base."pupilTopicId")
                                        FILTER (WHERE base."subjectId" = sub."subjectId"))::NUMERIC
                                    / NULLIF(COUNT(DISTINCT base."pupilId"), 0)
                                ),
                                0
                            ) AS "activeFamiliesPercentage"
                        FROM school_data_base_query base
                        GROUP BY base."className", base."classId", base."classYearGroup"
                        ORDER BY base."classYearGroup" ASC, base."className" ASC
                    ) "avgTopicSetting"
                ) AS "avgTopicSetByClass",
                (
                    SELECT COALESCE(jsonb_agg("avgCompletionRate".*), jsonb_build_array())
                    FROM (
                        SELECT
                            base."classYearGroup" AS "name",
                            COALESCE(
                                COUNT(DISTINCT base."pupilId")
                                    FILTER (WHERE base."isPremium" = TRUE),
                                0
                            ) AS "premiumPupilCount",
                            COALESCE(COUNT(DISTINCT base."pupilId"), 0) AS "allPupilsCount",
                            calculate_percentage(
                                COUNT(DISTINCT base."pupilTopicId")::int,
                                COUNT(DISTINCT base."pupilTopicId")
                                    FILTER (WHERE base."earnedGoldStar" = TRUE
                                            AND base."subjectId" = sub."subjectId")::int
                            ) AS "activeFamiliesPercentage",
                            calculate_percentage(
                                COUNT(DISTINCT base."pupilTopicId")
                                    FILTER (WHERE base."isPremium" = TRUE)::int,
                                COUNT(DISTINCT base."pupilTopicId")
                                    FILTER (WHERE base."earnedGoldStar" = TRUE
                                            AND base."isPremium" = TRUE
                                            AND base."subjectId" = sub."subjectId")::int
                            ) AS "activePremiumFamiliesPercentage"
                        FROM school_data_base_query base
                        GROUP BY base."classYearGroup"
                    ) "avgCompletionRate"
                ) AS "avgCompletionRateByYearGroup"
            FROM subjects sub
            JOIN buildingEngagementData bed
                ON bed."subjectId" = sub."subjectId"
            ORDER BY sub."subjectId" ASC;
            `,
            [
                schoolId,
                periodIndex,
                SchoolClassStatus.ACTIVE,
                [SubjectProgrammeType.FULL_PROGRAMME, SubjectProgrammeType.MONEY_SKILLS],
                termEndDate,
                [PupilParentStatus.INVITED, PupilParentStatus.ACTIVE]
            ]
        );

        return {
            programOverview,
            readingGraphs,
            subjectsSpecificGraphs
        };
    }

    async addGraphsToImpactReport(
        impactReport: LwpSchoolImpactReport,
        readingGraphs: LwpSchoolImpactReportGraphs,
        subjectsSpecificGraphs: LwpSchoolImpactReportGraphs[],
        manager: EntityManager
    ): Promise<LwpSchoolImpactReportGraphs[]> {
        const graphsToSave: LwpSchoolImpactReportGraphs[] = [];

        if (readingGraphs) {
            const schoolImpactReportGraphs = new LwpSchoolImpactReportGraphs();

            schoolImpactReportGraphs.impactReport = impactReport;

            schoolImpactReportGraphs.buildingEngagement = readingGraphs?.buildingEngagement || [];
            schoolImpactReportGraphs.engagementByYearGroup = readingGraphs?.engagementByYearGroup || [];
            schoolImpactReportGraphs.avgCompletionRateByYearGroup = readingGraphs?.avgCompletionRateByYearGroup || [];
            schoolImpactReportGraphs.premiumPupilsCount = readingGraphs?.premiumPupilsCount || 0;
            schoolImpactReportGraphs.pupilsCount = readingGraphs?.pupilsCount || 0;

            graphsToSave.push(schoolImpactReportGraphs);
        }

        if (subjectsSpecificGraphs.length) {
            for (const subjectGraph of subjectsSpecificGraphs) {
                const schoolImpactReportGraphs = new LwpSchoolImpactReportGraphs();

                schoolImpactReportGraphs.impactReport = impactReport;
                schoolImpactReportGraphs.subject = { id: subjectGraph?.subjectId } as StaticLwpSubject;
                schoolImpactReportGraphs.buildingEngagement = subjectGraph?.buildingEngagement || [];
                schoolImpactReportGraphs.engagementByYearGroup = subjectGraph?.engagementByYearGroup || [];
                schoolImpactReportGraphs.avgCompletionRateByYearGroup = subjectGraph?.avgCompletionRateByYearGroup || [];
                schoolImpactReportGraphs.avgTopicSetByClass = subjectGraph?.avgTopicSetByClass || [];
                schoolImpactReportGraphs.premiumPupilsCount = subjectGraph?.premiumPupilsCount || 0;
                schoolImpactReportGraphs.pupilsCount = subjectGraph?.pupilsCount || 0;

                graphsToSave.push(schoolImpactReportGraphs);
            }
        }

        return await manager.getRepository(LwpSchoolImpactReportGraphs).save(graphsToSave);
    }

    async generateSchoolImpactReport(input: GenrateSchoolImpactReportInput, userId: string): Promise<LwpSchoolImpactReport> {
        const draftImpactReport = await this.schoolImpactReportRepository.find({
            where: { school: { id: input.schoolId }, term: { id: input.termId }, isPublished: false },
            select: ['id', 'spmNote', 'version'],
            order: {
                logCreatedAt: 'DESC'
            }
        });

        if (draftImpactReport?.length > 0) {
            for (const draft of draftImpactReport) {
                await this.deleteImpactReport(draft.id);
            }
        }

        const user = this.shallowUserService.newShallowUser(userId);

        return this.connection.transaction(async (manager) => {
            await manager.query(`SET LOCAL statement_timeout = 300000;`);

            const period = await manager
                .getRepository(StaticLwpPeriod)
                .createQueryBuilder('p')
                .leftJoin('p.terms', 't')
                .where('t.id = :termId', { termId: input.termId })
                .select(['p.index', 't.id', 't.endDate'])
                .getOne();

            if (!period?.index) throw new HttpException('Academic year not found', ErrorStatusCodeEnum._535);

            const { programOverview, readingGraphs, subjectsSpecificGraphs } = await this.impactReportData(
                input.schoolId,
                period.index,
                period?.terms?.[0],
                manager
            );

            const publishedImpactReport = await manager.getRepository(LwpSchoolImpactReport).findOne({
                where: {
                    school: { id: input.schoolId },
                    term: { id: input.termId },
                    isPublished: true,
                    version: ImpactReportVersion.VERSION_2
                },
                select: ['spmNote', 'version']
            });

            const schoolImpactReport = new LwpSchoolImpactReport();

            schoolImpactReport.school = { id: input.schoolId } as LwpSchool;
            schoolImpactReport.term = { id: input.termId } as LwpSchoolDates;
            schoolImpactReport.period = { index: period?.index } as StaticLwpPeriod;
            schoolImpactReport.version = ImpactReportVersion.VERSION_2;

            schoolImpactReport.activeFamiliesPercentage = programOverview?.activeFamiliesPercentage || null;
            schoolImpactReport.activePremiumFamiliesPercentage = programOverview?.activePremiumFamiliesPercentage || null;
            schoolImpactReport.activeFamiliesPercentageAllSchools = programOverview?.activeFamiliesPercentageAllSchools || null;
            schoolImpactReport.activePremiumFamiliesPercentageAllSchools =
                programOverview?.activePremiumFamiliesPercentageAllSchools || null;
            schoolImpactReport.launchDate = programOverview?.launchDate;
            schoolImpactReport.numberOfClasses = programOverview?.numberOfClasses;
            schoolImpactReport.yearGroupCoverage = programOverview?.yearGroupCoverage;
            schoolImpactReport.numberOfWeeks = programOverview?.numberOfWeeks;
            schoolImpactReport.weeklyReadingTarget = programOverview?.weeklyReadingTarget;

            schoolImpactReport.isPublished = false;
            schoolImpactReport.logUpdatedBy = user;
            schoolImpactReport.logCreatedBy = user;

            const draftV2ImpactReport = draftImpactReport?.find((report) => report.version === ImpactReportVersion.VERSION_2);

            schoolImpactReport.spmNote = draftV2ImpactReport?.spmNote ?? publishedImpactReport?.spmNote ?? null;

            const savedSchoolImpactReport = await manager.getRepository(LwpSchoolImpactReport).save(schoolImpactReport);

            await this.addGraphsToImpactReport(savedSchoolImpactReport, readingGraphs, subjectsSpecificGraphs, manager);

            await this.schoolImpactReportFeedbackService.addFeedbacksToImpactReport(
                savedSchoolImpactReport.id,
                savedSchoolImpactReport?.term?.id,
                savedSchoolImpactReport?.school?.id,
                savedSchoolImpactReport.period?.index,
                user,
                manager
            );

            return savedSchoolImpactReport;
        });
    }

    async updateImpactReport(input: UpdateSchoolImpactReportInput, userId: string): Promise<LwpSchoolImpactReport> {
        const user = this.shallowUserService.newShallowUser(userId);
        const impactReport = await this.schoolImpactReportRepository.findOne(input.id);

        if (!impactReport) throw new HttpException('Impact report does not exist', ErrorStatusCodeEnum._535);

        impactReport.spmNote = input.spmNote;
        impactReport.spmNextStepsProgram = input.spmNextStepsProgram;
        impactReport.logUpdatedBy = user;

        return this.schoolImpactReportRepository.save(impactReport);
    }

    async toggleNationalDataAverageDisplay(impactReportId: string, showNationalDataAverage: boolean, userId: string): Promise<boolean> {
        const updatedImpactReport = await this.schoolImpactReportRepository.update(impactReportId, {
            showNationalDataAverage,
            logUpdatedBy: this.shallowUserService.newShallowUser(userId)
        });

        return updatedImpactReport.affected > 0;
    }

    async publishSchoolImpactReport(id: string, userId: string): Promise<LwpSchoolImpactReport> {
        const user = this.shallowUserService.newShallowUser(userId);

        const draftReport = await this.schoolImpactReportRepository.findOne({
            where: {
                id,
                isPublished: false
            },
            relations: ['school', 'term']
        });

        if (!draftReport) throw new HttpException('Draft impact report does not exist', ErrorStatusCodeEnum._535);

        const conditions = {
            school: { id: draftReport?.school?.id },
            term: { id: draftReport.term.id },
            isPublished: true
        };

        if (draftReport.version === ImpactReportVersion.VERSION_1) conditions['reportType'] = draftReport?.reportType;

        const publishedReport = await this.schoolImpactReportRepository.find({
            where: conditions,
            select: ['id']
        });

        if (publishedReport?.length) {
            for (const report of publishedReport) {
                await this.deleteImpactReport(report?.id);
            }
        }

        draftReport.logUpdatedBy = user;
        draftReport.isPublished = true;

        return this.schoolImpactReportRepository.save(draftReport);
    }

    async deleteGraphFromSchoolImpactReport(id: string, graphName: string): Promise<void> {
        if (graphName === 'avgWeeklyTargetMetByYearGroup') graphName = 'avgCompletionRateByYearGroup';
        if (graphName === 'avgWeeklyTargetMetByClass') graphName = 'avgCompletionRateByClass';

        await this.schoolImpactReportGraphsRepository.update({ impactReport: { id } }, { [graphName]: null });
    }

    async deleteImpactReport(impactReportId: string): Promise<void> {
        await this.schoolImpactReportFeedbackService.deleteImpactReportFeedbacks(impactReportId);
        await this.schoolImpactReportRepository.delete(impactReportId);
    }

    async generateSchoolImpactReportMagicLink(schoolId: string, termId: string, reportType: SchoolImpactReportType): Promise<LwpMagicLink> {
        return await this.magicLinkService.generateMagicLink({
            type: MagicLinkType.SCHOOL_IMPACT_REPORT,
            topicId: null,
            pupilId: null,
            pupilTopicId: null,
            reportType,
            schoolId,
            termId,
            trophyId: null,
            userId: null
        });
    }

    mapToImpactReportV1Output(impactReport: LwpSchoolImpactReport): LwpSchoolImpactReportV1Output {
        if (!impactReport) return null;

        const { id: _, ...graphsData } = (impactReport?.graphs?.[0] ?? {}) as LwpSchoolImpactReportGraphs;

        const output = Object.assign(new LwpSchoolImpactReportV1Output(), impactReport, graphsData);

        if (output.reportType === SchoolImpactReportType.READING && graphsData) {
            output.avgWeeklyTargetMetByYearGroup = graphsData?.avgCompletionRateByYearGroup;
            output.avgWeeklyTargetMetByClass = graphsData?.avgCompletionRateByClass;
        }

        return output;
    }

    async getV1SchoolImpactReport(
        schoolId: string,
        termId: string,
        reportType: SchoolImpactReportType,
        isPublished: boolean
    ): Promise<LwpSchoolImpactReportV1Output> {
        const impactReportBaseQuery = this.schoolImpactReportRepository
            .createQueryBuilder('report')
            .leftJoinAndSelect('report.graphs', 'graphs')
            .leftJoinAndSelect('report.period', 'period')
            .leftJoinAndSelect('report.feedbacks', 'feedbacks')
            .leftJoinAndSelect('report.term', 'term')
            .where('report.school.id = :schoolId', { schoolId })
            .andWhere('report.term.id = :termId', { termId })
            .andWhere('report.reportType = :reportType', { reportType })
            .andWhere('report.version = :version', { version: ImpactReportVersion.VERSION_1 });

        if (isPublished) impactReportBaseQuery.andWhere('report.isPublished = :isPublished', { isPublished });

        const impactReport = await impactReportBaseQuery.orderBy('report.logCreatedAt', 'DESC').getOne();

        if (!impactReport) return null;

        return this.mapToImpactReportV1Output(impactReport);
    }

    async getSchoolImpactReportFromMagicLink(token: string): Promise<SchoolImpactReportForMagicLinkOutput> {
        const magicLink = await this.magicLinkService.verifyMagicLink(token);

        if (!magicLink?.context?.schoolId) {
            throw new HttpException('This link is invalid.', ErrorStatusCodeEnum._535);
        }

        const { schoolId, termId, periodIndex, reportType } = magicLink.context;

        if (!termId && !periodIndex) {
            throw new HttpException('This link is invalid.', ErrorStatusCodeEnum._535);
        }

        const impactReportBaseQuery = this.schoolImpactReportRepository
            .createQueryBuilder('report')
            .leftJoinAndSelect('report.graphs', 'graphs')
            .leftJoinAndSelect('report.period', 'period')
            .leftJoinAndSelect('report.feedbacks', 'feedbacks')
            .leftJoinAndSelect('report.term', 'term')
            .where('report.isPublished = :isPublished', { isPublished: true })
            .andWhere('report.school.id = :schoolId', { schoolId });

        if (termId) impactReportBaseQuery.andWhere('report.term.id = :termId', { termId });

        if (!termId && periodIndex) impactReportBaseQuery.andWhere('report.period.index = :periodIndex', { periodIndex });

        const impactReports = await impactReportBaseQuery.orderBy('report.logUpdatedAt', 'DESC').getMany();

        if (!impactReports?.length) throw new HttpException('Impact report not found for this link.', ErrorStatusCodeEnum._535);

        const school = await this.schoolRepository.findOne({
            where: { id: schoolId },
            select: ['schoolName']
        });

        const isV1Report = impactReports.every((report) => report?.version === ImpactReportVersion.VERSION_1);

        const impactReportOutput: SchoolImpactReportForMagicLinkOutput = {
            schoolName: school?.schoolName,
            impactReportVersion: isV1Report ? ImpactReportVersion.VERSION_1 : ImpactReportVersion.VERSION_2
        };

        /**
         * Impact Report V1 consists of two types of reports (Topic & Activity and Reading) for single term.
         * Whereas Impact Report V2 is a consolidated report containing both types in a single report.
         */

        if (isV1Report) {
            const mappedImpactReports: LwpSchoolImpactReportV1Output[] = impactReports?.map((report) =>
                this.mapToImpactReportV1Output(report)
            );

            impactReportOutput.reportType = reportType;
            impactReportOutput.topicsVersion =
                mappedImpactReports?.find((impactReport) => impactReport?.reportType === SchoolImpactReportType.TOPIC_ACTIVITY) ?? null;
            impactReportOutput.readingVersion =
                mappedImpactReports?.find((impactReport) => impactReport?.reportType === SchoolImpactReportType.READING) ?? null;
        } else {
            impactReportOutput.impactReportV2 = impactReports?.[0];
        }

        return impactReportOutput;
    }

    async getImpactReportPeriod(id: string): Promise<StaticLwpPeriod> {
        const impactReportPeriod = await this.staticPeriodRepository
            .createQueryBuilder('static_period')
            .leftJoin('static_period.impactReports', 'impactReports')
            .where('impactReports.id = :id', { id })
            .getOne();

        return impactReportPeriod;
    }

    async doesImpactReportExist(schoolId: string, termId: string): Promise<boolean> {
        const impactReportCount = await this.schoolImpactReportRepository.count({
            where: {
                school: { id: schoolId },
                term: { id: termId },
                isPublished: true
            }
        });

        return impactReportCount > 0;
    }

    async generateImpactReportEmailLinkForSchoolLeaders(schoolId: string, termId: string, authInfo: AuthTokenJWT): Promise<string> {
        const school = await this.schoolRepository
            .createQueryBuilder('school')
            .leftJoin('school.schoolLeaders', 'schoolLeaders')
            .leftJoin('school.impactReports', 'impactReports')
            .leftJoin('impactReports.term', 'term')
            .where('school.id = :schoolId', { schoolId })
            .andWhere(
                'schoolLeaders.isSchoolLeader = true and schoolLeaders.email IS NOT NULL and schoolLeaders.userStatus = :userStatus',
                { userStatus: UserStatus.ACTIVE }
            )
            .andWhere('term.id = :termId and impactReports.isPublished = true', { termId })
            .select([
                'school.schoolName',
                'schoolLeaders.email',
                'schoolLeaders.firstname',
                'impactReports.reportType',
                'impactReports.version',
                'term.termName'
            ])
            .getOne();

        if (!school)
            throw new HttpException(
                'School not found or no published impact report exists for the provided period index',
                ErrorStatusCodeEnum._535
            );

        const schoolLeadersEmail = school.schoolLeaders.map((schoolLeader) => schoolLeader.email);

        // Determine if all impact reports for the school are of version 1
        const isV1Reports = school?.impactReports?.every((report) => report?.version === ImpactReportVersion.VERSION_1);

        const isTopicAndActivityImpactReportExist = school.impactReports.some(
            (report) => report.reportType === SchoolImpactReportType.TOPIC_ACTIVITY
        );
        /**
         * Determine the report type based on the version and available report types:
         * - For V1 reports: Use TOPIC_ACTIVITY if available, otherwise use READING
         * - For V2 reports: Set to null (V2 reports contain both types in a single report)
         */
        const reportType = isV1Reports
            ? isTopicAndActivityImpactReportExist
                ? SchoolImpactReportType.TOPIC_ACTIVITY
                : SchoolImpactReportType.READING
            : null;

        const magicLink = await this.generateSchoolImpactReportMagicLink(schoolId, termId, reportType);

        const impactReportTemplateParams = await this.parameterService.getParameterByKey('EMAIL_TEMPLATE_FOR_IMPACT_REPORT');

        const compiledTemplate = Handlebars.compile(impactReportTemplateParams?.value);

        const baseUrl = `${process.env.HOSTED_URL}/magic/`;

        const termName = school?.impactReports?.find((report) => report?.term?.termName)?.term?.termName;
        const subject = `${termName} Impact Report for ${school.schoolName}`;

        const body = compiledTemplate({
            RECIPIENT_NAME:
                schoolLeadersEmail.length === 1 ? school.schoolLeaders[0].firstname : schoolLeadersEmail.length > 2 ? 'all' : 'both',
            TERM_NAME: termName,
            SCHOOL_NAME: school.schoolName,
            IMPACT_REPORT_MAGIC_LINK: `${baseUrl}${magicLink.url}`,
            SPM_NAME_FOR_URL: kebabCase(`${authInfo.firstName} ${authInfo.lastName}`),
            FIRST_NAME: authInfo.firstName
        });

        const emailLink = `https://mail.google.com/mail/?authuser=${encodeURIComponent(authInfo.email)}&view=cm&fs=1&to=${encodeURIComponent(
            schoolLeadersEmail.join(',')
        )}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}&tf=1`;

        return emailLink;
    }

    async hasPublishedVersion(impactReport: LwpSchoolImpactReport): Promise<boolean> {
        const publishedImpactReport = await this.schoolImpactReportRepository.findOne({
            where: {
                reportType: impactReport.reportType,
                school: { id: impactReport.schoolId },
                term: { id: impactReport.termId },
                isPublished: true
            },
            select: ['id']
        });

        return !!publishedImpactReport;
    }

    async getSchoolImpactReportTerm(termId: string): Promise<LwpSchoolDates> {
        return await this.schoolDatesRepository.findOne(termId);
    }

    private validateGraphTypeForReportType(reportType: SchoolImpactReportType, graphType: SchoolAnalyticsGraphType): void {
        const allowedGraphTypesMap = {
            [SchoolImpactReportType.READING]: [
                SchoolAnalyticsGraphType.ENGAGEMENT_BY_YEAR_GROUP,
                SchoolAnalyticsGraphType.ENGAGEMENT_BY_CLASS,
                SchoolAnalyticsGraphType.ENGAGEMENT_BY_SCHOOL,
                SchoolAnalyticsGraphType.AVG_WEEKLY_TARGET_MET_BY_YEAR_GROUP,
                SchoolAnalyticsGraphType.AVG_WEEKLY_TARGET_MET_BY_CLASS,
                SchoolAnalyticsGraphType.AVG_WEEKLY_TARGET_MET_BY_SCHOOL,
                SchoolAnalyticsGraphType.BUILDING_ENGAGEMENT
            ],
            [SchoolImpactReportType.TOPIC_ACTIVITY]: [
                SchoolAnalyticsGraphType.ENGAGEMENT_BY_YEAR_GROUP,
                SchoolAnalyticsGraphType.ENGAGEMENT_BY_CLASS,
                SchoolAnalyticsGraphType.ENGAGEMENT_BY_SCHOOL,
                SchoolAnalyticsGraphType.BUILDING_ENGAGEMENT,
                SchoolAnalyticsGraphType.AVG_TOPIC_SET_BY_YEAR_GROUP,
                SchoolAnalyticsGraphType.AVG_TOPIC_SET_BY_CLASS,
                SchoolAnalyticsGraphType.AVG_TOPIC_SET_BY_SCHOOL,
                SchoolAnalyticsGraphType.AVG_TOPIC_COMPLETION_BY_SCHOOL,
                SchoolAnalyticsGraphType.AVG_TOPIC_COMPLETION_BY_YEAR_GROUP,
                SchoolAnalyticsGraphType.AVG_TOPIC_COMPLETION_BY_CLASS
            ]
        };
        const allowedGraphTypes = allowedGraphTypesMap?.[reportType];

        if (!allowedGraphTypes || !allowedGraphTypes.includes(graphType)) {
            throw new HttpException(
                `The graph type '${graphType}' is not supported for the report type '${reportType}'`,
                ErrorStatusCodeEnum._535
            );
        }
    }

    async getSchoolAnalyticsDataQuery(input: SchoolAnalyticsDataQueryInput): Promise<SchoolAnalyticsGraphOutput | null> {
        const { schoolId, graphType, reportType, subjectIds } = input;

        // Validate graph type against report type
        this.validateGraphTypeForReportType(reportType, graphType);

        const schoolCurrentPeriod = await this.schoolRepository
            .createQueryBuilder('school')
            .leftJoin('school.curentPeriod', 'period')
            .where('school.id = :schoolId', { schoolId })
            .select(['period.index AS "periodIndex"'])
            .getRawOne<{ periodIndex: number }>();

        const [reportData] = await (reportType === SchoolImpactReportType.READING
            ? this.impactReportDataForReading(schoolId, schoolCurrentPeriod.periodIndex, graphType)
            : this.impactReportDataForTopicAndActivity(schoolId, schoolCurrentPeriod.periodIndex, graphType, subjectIds));

        return reportData;
    }

    public async getSubjectsForFiltersOnTopicAnalyticGraphs(schoolId: string): Promise<StaticLwpSubject[]> {
        const subjects = await this.lwpSubjectRepository
            .createQueryBuilder('subject')
            .innerJoin(LwpSchool, 'school', 'school.id= :schoolId', { schoolId })
            .innerJoin(
                'school.classes',
                'classes',
                `classes."periodIndex" >= school."curentPeriodIndex" AND classes."isRegistrationClass" = true and classes.status = '${SchoolClassStatus.ACTIVE}'`
            )
            .where(
                new Brackets((qb) => {
                    qb.where(`classes."isFullProgramme" = true AND subject."programmeType" = '${SubjectProgrammeType.FULL_PROGRAMME}'`)
                        .orWhere(`classes."isReadyTeddyEnabled" = true AND subject."programmeType" = '${SubjectProgrammeType.READY_TEDDY}'`)
                        .orWhere(
                            `school."isMoneySkillsAvailable" = true  AND subject."programmeType" = '${SubjectProgrammeType.MONEY_SKILLS}'`
                        );
                })
            );

        return subjects.orderBy('subject.name', 'ASC').getMany();
    }

    public async getSchoolImpactReportsByTerm(schoolId: string, termId: string): Promise<LwpSchoolImpactReport[]> {
        /**
         * If a v2 report exists for this term, return only that report.
         */
        const v2Report = await this.schoolImpactReportRepository
            .createQueryBuilder('report')
            .where('report.school.id = :schoolId AND report.term.id = :termId AND report.version = :version', {
                schoolId,
                termId,
                version: ImpactReportVersion.VERSION_2
            })
            .orderBy('report.logCreatedAt', 'DESC')
            .getOne();

        if (v2Report) return [v2Report];

        /**
         * Otherwise return legacy v1 reports.
         * DISTINCT ON ensures we only get the latest report for each reportType.
         */

        return await this.schoolImpactReportRepository
            .createQueryBuilder('report')
            .distinctOn(['report.reportType'])
            .where('report.school.id = :schoolId AND report.term.id = :termId', { schoolId, termId })
            .orderBy('report.reportType', 'ASC')
            .addOrderBy('report.logCreatedAt', 'DESC')
            .getMany();
    }

    async getV2SchoolImpactReport(schoolId: string, termId: string, isPublished: boolean): Promise<LwpSchoolImpactReport> {
        const impactReportBaseQuery = this.schoolImpactReportRepository
            .createQueryBuilder('report')
            .where('report.school.id = :schoolId', { schoolId })
            .andWhere('report.term.id = :termId', { termId });

        if (isPublished) impactReportBaseQuery.andWhere('report.isPublished = :isPublished', { isPublished });

        const impactReport = await impactReportBaseQuery.orderBy('report.logCreatedAt', 'DESC').getOne();

        if (!impactReport) return null;

        return impactReport;
    }

    async getV2ImpactReportGraphsById(impactReportId: string): Promise<LwpSchoolImpactReportGraphs[]> {
        return await this.schoolImpactReportGraphsRepository
            .createQueryBuilder('graphs')
            .leftJoin('graphs.subject', 'subject')
            .where('graphs.impactReport.id = :impactReportId', { impactReportId })
            .orderBy('subject.name', 'ASC', 'NULLS FIRST')
            .getMany();
    }

    async deleteGraphFromImpactReportV2(graphId: string, graphName: string): Promise<boolean> {
        return await this.connection.manager.transaction(async (manager) => {
            const impactReportGraphsRepo = manager.getRepository(LwpSchoolImpactReportGraphs);

            const result = await impactReportGraphsRepo.update({ id: graphId }, { [graphName]: null });

            if (result?.affected === 0) return false;

            const updatedGraph = await impactReportGraphsRepo.findOne({
                where: { id: graphId },
                select: ['id', 'engagementByYearGroup', 'avgCompletionRateByYearGroup', 'buildingEngagement', 'avgTopicSetByClass']
            });

            // If all the columns are null in the graph, delete the row
            if (
                updatedGraph &&
                !updatedGraph.engagementByYearGroup &&
                !updatedGraph.avgCompletionRateByYearGroup &&
                !updatedGraph.avgTopicSetByClass &&
                !updatedGraph.buildingEngagement
            ) {
                await impactReportGraphsRepo.delete({ id: graphId });
            }

            return true;
        });
    }
}
