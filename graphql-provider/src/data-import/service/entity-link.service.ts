import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ChangeOperation, PupilSourceType, UserType } from 'lwp-shared';
import moment from 'moment';
import { ImportedSchoolClass } from 'src/api/entities/imported_school_class';
import { ImportedStudent } from 'src/api/entities/imported_student';
import { LwpPupil } from 'src/api/entities/pupil';
import { StaticLwpYearGroup } from 'src/api/entities/year_group';
import { ImportedType } from 'src/api/model';
import type { ClassLink } from 'src/data-import/types/class-link';
import { EntityType } from 'src/data-import/types/entity-type';
import { LinkStatus } from 'src/data-import/types/link-status';
import type { PupilLink } from 'src/data-import/types/pupil-link';
import { Connection, type EntityManager, Repository, SelectQueryBuilder } from 'typeorm';

import { ClassDataForComparisonOutput } from '../dtos/ClassDataForComparisonOutput';
import { ParentDetails } from '../dtos/ParentDetails';
import { PendingClassLinkOutput } from '../dtos/PendingClassLinkOutput';
import { PendingPupilLinkOutput } from '../dtos/PendingPupilLinkOutput';
import { PupilDataForComparisonOutput } from '../dtos/PupilDataForComparisonOutput';
import { PupilDetails } from '../dtos/PupilDetails';
import { PupilSummary } from '../dtos/PupilSummary';
import { ChangeStatus } from '../types/change-status';

/**
 * Shared logic for managing pupil and class links.
 */
@Injectable()
export class EntityLinkService {
    public constructor(
        private readonly connection: Connection,
        @InjectRepository(StaticLwpYearGroup)
        private yearGroupRepository: Repository<StaticLwpYearGroup>
    ) {}

    /**
     * Return pending links for the given imported school and link type (pupil or class).
     */
    public getPendingLinks<TEntityType extends EntityType>(
        entityType: TEntityType,
        importedSchoolId: string
    ): Promise<Array<TEntityType extends EntityType.PUPIL ? PupilLink : ClassLink>> {
        return this.connection.query(
            `
                select
                    isdpl.*
                from imported_school is1
                join imported_school_data_proposed_link isdpl
                    on isdpl."platformSchoolId" = is1."lwpSchoolId"::varchar
                where is1.id = $1
                and isdpl."entityType" = $2
                and isdpl."status" = $3
            `,
            [importedSchoolId, entityType, LinkStatus.PENDING]
        );
    }

    /**
     * Delete all links for the given imported school except explicitly rejected ones.
     */
    public deleteStaleLinks(manager: EntityManager, importedSchoolId: string): Promise<void> {
        Logger.debug('DELETING STALE LINKS');

        return manager.query(
            `
                delete from imported_school_data_proposed_link isdpl
                using imported_school is1
                where isdpl."platformSchoolId" = is1."lwpSchoolId"::varchar
                    and is1.id = $1
                    and isdpl."status" != $2
            `,
            [importedSchoolId, LinkStatus.REJECTED]
        );
    }

    public async selectLinkInternal(
        manager: EntityManager,
        entityType: EntityType,
        importedEntityId: string,
        platformEntityId: string,
        isAuto: boolean
    ): Promise<Array<string>> {
        const [_, affectedRows] = await manager.query(
            `
                update imported_school_data_proposed_link isdpl
                set status = $4
                where isdpl."entityType" = $1
                    and isdpl.status = $5
                    and isdpl."importedEntityId" = $2
                    and isdpl."platformEntityId" = $3
                returning *
            `,
            [entityType, importedEntityId, platformEntityId, isAuto ? LinkStatus.AUTO_SELECTED : LinkStatus.SELECTED, LinkStatus.PENDING]
        );

        if (affectedRows === 0) {
            throw new NotFoundException('Link not found');
        }

        await manager.query(
            `
                update imported_school_data_proposed_link isdpl
                set status = $4
                where isdpl."entityType" = $1
                    and isdpl.status = $5
                    and isdpl."importedEntityId" = $2
                    and isdpl."platformEntityId" != $3
            `,
            [entityType, importedEntityId, platformEntityId, isAuto ? LinkStatus.AUTO_REJECTED : LinkStatus.REJECTED, LinkStatus.PENDING]
        );

        const affectedImportedEntities: Array<{ importedEntityId: string }> = await manager.query(
            `
                with reject_other_links_for_platform_entity as (
                    update imported_school_data_proposed_link isdpl
                    set status = $3
                    where isdpl."entityType" = $1
                        and isdpl."platformEntityId" = $2
                        and isdpl."status" = $4
                    returning isdpl."importedEntityId"
                )
                select distinct(rolfpe."importedEntityId") as "importedEntityId"
                from reject_other_links_for_platform_entity rolfpe
            `,
            [entityType, platformEntityId, LinkStatus.AUTO_REJECTED, LinkStatus.PENDING]
        );

        return affectedImportedEntities.map(({ importedEntityId }) => importedEntityId);
    }

    public pendingPupilLinksQueryBuilder(manager: EntityManager, importedSchoolId: string): SelectQueryBuilder<ImportedStudent> {
        return (
            manager
                .createQueryBuilder()
                .select([
                    'ims.id as id',
                    'ims.forename as forename',
                    'ims.surname as surname',
                    `COALESCE(links."proposedPlatformPupilLinks", '[]'::jsonb) as "proposedPlatformPupilLinks"`
                ])
                .from(ImportedStudent, 'ims')
                .leftJoin('ims.school', 'isch')
                .leftJoin('imported_school', 'is2', 'is2.id = ims."schoolId"')
                .leftJoin('lwp_school', 'ls_check', 'ls_check.id = is2."lwpSchoolId"')
                .leftJoin(
                    (subQuery) => {
                        return (
                            subQuery
                                .select([
                                    'isdpl."importedEntityId"',
                                    `JSONB_AGG(
                                DISTINCT JSONB_BUILD_OBJECT(
                                    'id', lp.id,
                                    'firstname', lp.firstname,
                                    'lastname', lp.lastname,
                                    'pupilClass', CASE
                                        WHEN lsc.id IS NOT NULL THEN jsonb_build_object(
                                            'id', lsc.id,
                                            'name', lsc.name,
                                            'yearGroup', slyg.year
                                        )
                                        ELSE NULL
                                    END,
                                    'isPreviouslyLinked', COALESCE(lp."importedStudentId" = isdpl."importedEntityId", false)
                                )
                            ) AS "proposedPlatformPupilLinks"`
                                ])
                                .from('imported_school_data_proposed_link', 'isdpl')
                                .leftJoin('lwp_pupil', 'lp', 'lp.id = isdpl."platformEntityId"')
                                .leftJoin('lwp_school', 'ls', 'ls.id = lp."schoolId"')
                                /* Registration membership joined through in one go, so a pupil yields
                                 * exactly one row per current class. Joined the other way round - every
                                 * membership row, then the class - a prior-year membership survives as
                                 * its own row with the class nulled, and JSONB_AGG(DISTINCT ...) sees
                                 * two objects for one pupil (one carrying the class, one with
                                 * pupilClass null): the leader is offered the same pupil twice. */
                                .leftJoin(
                                    (membership) => {
                                        return membership
                                            .select([
                                                'lcp."lwpPupilId" AS "pupilId"',
                                                'lsc_reg.id AS id',
                                                'lsc_reg.name AS name',
                                                'lsc_reg."yearGroup" AS "yearGroup"',
                                                'lsc_reg."periodIndex" AS "periodIndex"'
                                            ])
                                            .from('lwp_class_pupil', 'lcp')
                                            .innerJoin('lwp_school_class', 'lsc_reg', 'lsc_reg.id = lcp."lwpSchoolClassId"')
                                            .where('lsc_reg."isRegistrationClass" = true');
                                    },
                                    'lsc',
                                    'lsc."pupilId" = lp.id AND lsc."periodIndex" = ls."curentPeriodIndex"'
                                )
                                .leftJoin('static_lwp_year_group', 'slyg', 'slyg.id = lsc."yearGroup"')
                                .where('isdpl."entityType" = :entityType', { entityType: EntityType.PUPIL })
                                .andWhere('isdpl.status = :status', { status: LinkStatus.PENDING })
                                .andWhere('lp.id IS NOT NULL')
                                .groupBy('isdpl."importedEntityId"')
                        );
                    },
                    'links',
                    'links."importedEntityId" = ims.id'
                )
                .where('isch.id = :schoolId', { schoolId: importedSchoolId })
                .andWhere('ims."lwpPupilId" IS NULL')
                /* Only rows with a live candidate reach the leader. A row with none is not a decision:
                 * the auto-create sweep builds it once both linking gates have passed, and showing it
                 * would only offer "no existing pupil" - which is already its fate. */
                .andWhere('links."importedEntityId" IS NOT NULL')
                .andWhere(
                    `
                    NOT EXISTS (
                        SELECT 1
                        FROM imported_school_data_proposed_change isdpc_check 
                        WHERE isdpc_check."platformSchoolId" = is2."lwpSchoolId"::varchar
                        AND isdpc_check."entityType" = :entityType
                        AND isdpc_check."operation" = :operation
                        AND isdpc_check."status" = :rejectedStatus
                        AND (
                            CASE
                                WHEN ls_check."misIntegration" = :misIntegration THEN
                                    (isdpc_check."proposedValue" - 'logCreatedAt' - 'logUpdatedAt' - 'id') = (to_jsonb(ims) - 'logCreatedAt' - 'logUpdatedAt' - 'id')
                                ELSE
                                    (isdpc_check."proposedValue" - 'logCreatedAt' - 'logUpdatedAt') = (to_jsonb(ims) - 'logCreatedAt' - 'logUpdatedAt')
                            END
                        )
                    )
                `
                )
                .orderBy('ims.forename')
                .addOrderBy('ims.surname')
                .setParameters({
                    schoolId: importedSchoolId,
                    entityType: EntityType.PUPIL,
                    operation: ChangeOperation.CREATE,
                    rejectedStatus: ChangeStatus.REJECTED,
                    status: LinkStatus.PENDING,
                    misIntegration: ImportedType.CSV
                })
        );
    }

    public async getPendingPupilLinks(importedSchoolId: string): Promise<PendingPupilLinkOutput[]> {
        return await this.connection.transaction(async (manager) => {
            const pendingPupilLinks: PendingPupilLinkOutput[] = [];

            const rawImportedStudentResults = await this.pendingPupilLinksQueryBuilder(manager, importedSchoolId).getRawMany();

            for (const rawImportedStudentResult of rawImportedStudentResults) {
                pendingPupilLinks.push({
                    importedStudent: {
                        id: rawImportedStudentResult?.id,
                        firstname: rawImportedStudentResult?.forename,
                        lastname: rawImportedStudentResult?.surname,
                        sourceType: PupilSourceType.IMPORTED
                    },
                    proposedPlatformPupilLinks: rawImportedStudentResult.proposedPlatformPupilLinks.map((proposedPlatformPupilLink) => ({
                        id: proposedPlatformPupilLink?.id,
                        firstname: proposedPlatformPupilLink?.firstname,
                        lastname: proposedPlatformPupilLink?.lastname,
                        sourceType: PupilSourceType.PLATFORM,
                        pupilClass: proposedPlatformPupilLink?.pupilClass
                            ? {
                                  id: proposedPlatformPupilLink?.pupilClass?.id,
                                  name: proposedPlatformPupilLink?.pupilClass?.name,
                                  yearGroup: proposedPlatformPupilLink?.pupilClass?.yearGroup
                              }
                            : null,
                        isPreviouslyLinked: proposedPlatformPupilLink?.isPreviouslyLinked ?? false
                    }))
                });
            }

            return pendingPupilLinks;
        });
    }

    public pendingClassLinksQueryBuilder(manager: EntityManager, importedSchoolId: string): SelectQueryBuilder<ImportedSchoolClass> {
        return (
            manager
                .createQueryBuilder()
                .select([
                    'isc.id as id',
                    'isc.name as name',
                    `COALESCE(links."proposedPlatformSchoolClasses", '[]'::json) as "proposedPlatformSchoolClasses"`
                ])
                .from(ImportedSchoolClass, 'isc')
                .leftJoin('isc.school', 'isch')
                .leftJoin('imported_school', 'is2', 'is2.id = isc."schoolId"')
                .leftJoin('lwp_school', 'ls_check', 'ls_check.id = is2."lwpSchoolId"')
                .leftJoin(
                    (subQuery) => {
                        return subQuery
                            .select([
                                'isdpl."importedEntityId"',
                                `JSON_AGG(
                                    JSON_BUILD_OBJECT(
                                        'id', lsc.id,
                                        'name', lsc.name,
                                        'yearGroup', slyg."year"
                                    )
                                ) as "proposedPlatformSchoolClasses"`
                            ])
                            .from('imported_school_data_proposed_link', 'isdpl')
                            .leftJoin('lwp_school', 'ls', 'ls.id::varchar = isdpl."platformSchoolId"')
                            .leftJoin(
                                'lwp_school_class',
                                'lsc',
                                'lsc.id = isdpl."platformEntityId" AND lsc."isRegistrationClass" = true AND lsc."periodIndex" = ls."curentPeriodIndex"'
                            )
                            .leftJoin('static_lwp_year_group', 'slyg', 'slyg.id = lsc."yearGroup"')
                            .where('isdpl."entityType" = :entityType', { entityType: EntityType.CLASS })
                            .andWhere('isdpl.status = :status', { status: LinkStatus.PENDING })
                            .andWhere('lsc.id IS NOT NULL')
                            .groupBy('isdpl."importedEntityId"');
                    },
                    'links',
                    'links."importedEntityId" = isc.id'
                )
                .where('isch.id = :schoolId', { schoolId: importedSchoolId })
                .andWhere('isc."lwpSchoolClassId" IS NULL')
                // Only rows with a live candidate reach the leader - see the pupil builder above.
                .andWhere('links."importedEntityId" IS NOT NULL')
                .andWhere(
                    `
                    NOT EXISTS (
                        SELECT 1
                        FROM imported_school_data_proposed_change isdpc_check 
                        WHERE isdpc_check."platformSchoolId" = is2."lwpSchoolId"::varchar
                        AND isdpc_check."entityType" = :entityType
                        AND isdpc_check."operation" = :operation
                        AND isdpc_check."status" = :rejectedStatus
                        AND (
                            CASE
                                WHEN ls_check."misIntegration" = :misIntegration THEN
                                    (isdpc_check."proposedValue" - 'logCreatedAt' - 'logUpdatedAt' - 'id') = (to_jsonb(isc) - 'logCreatedAt' - 'logUpdatedAt' - 'id')
                                ELSE
                                    (isdpc_check."proposedValue" - 'logCreatedAt' - 'logUpdatedAt') = (to_jsonb(isc) - 'logCreatedAt' - 'logUpdatedAt')
                            END
                        )
                    )
                `
                )
                .orderBy('isc.id')
                .setParameters({
                    schoolId: importedSchoolId,
                    entityType: EntityType.CLASS,
                    operation: ChangeOperation.CREATE,
                    rejectedStatus: ChangeStatus.REJECTED,
                    status: LinkStatus.PENDING,
                    misIntegration: ImportedType.CSV
                })
        );
    }

    public async getPendingClassLinks(importedSchoolId: string): Promise<PendingClassLinkOutput[]> {
        return await this.connection.transaction(async (manager) => {
            const pendingClassLinks: PendingClassLinkOutput[] = [];
            const rawImportedSchoolClassResults = await this.pendingClassLinksQueryBuilder(manager, importedSchoolId).getRawMany();

            for (const rawImportedSchoolClassResult of rawImportedSchoolClassResults) {
                pendingClassLinks.push({
                    importedSchoolClass: {
                        id: rawImportedSchoolClassResult?.id,
                        name: rawImportedSchoolClassResult?.name
                    },
                    proposedPlatformSchoolClasses: rawImportedSchoolClassResult.proposedPlatformSchoolClasses.map(
                        (proposedPlatformSchoolClass) => ({
                            id: proposedPlatformSchoolClass?.id,
                            name: proposedPlatformSchoolClass?.name,
                            yearGroup: proposedPlatformSchoolClass?.yearGroup
                        })
                    )
                });
            }

            return pendingClassLinks;
        });
    }

    public async getClassDataForComparison(
        importedSchoolClassId: string,
        platformSchoolClassId?: string
    ): Promise<ClassDataForComparisonOutput> {
        return await this.connection.transaction(async (manager) => {
            const importedStudentRepository = manager.getRepository(ImportedStudent);
            const lwpPupilRepository = manager.getRepository(LwpPupil);

            const importedStudents = await importedStudentRepository
                .createQueryBuilder('importedStudent')
                .leftJoin('importedStudent.schoolClasses', 'importedSchoolClass')
                .leftJoin('importedStudent.lwpPupil', 'lwpPupil')
                .where('importedSchoolClass.id = :id', { id: importedSchoolClassId })
                .select([
                    'importedStudent.id',
                    'importedStudent.forename',
                    'importedStudent.surname',
                    'lwpPupil.id',
                    'lwpPupil.firstname',
                    'lwpPupil.lastname'
                ])
                .getMany();

            const processedImportedSchoolClassPupilData: PupilSummary[] = (importedStudents || []).map((student: ImportedStudent) => ({
                id: student?.lwpPupil?.id ?? student.id,
                firstname: student?.lwpPupil?.firstname ?? student.forename,
                lastname: student?.lwpPupil?.lastname ?? student.surname,
                sourceType: student?.lwpPupil ? PupilSourceType.PLATFORM : PupilSourceType.IMPORTED
            }));

            let processedPlatFormSchoolClassPupilData: PupilSummary[] = [];

            if (platformSchoolClassId) {
                const lwpPupils = await lwpPupilRepository
                    .createQueryBuilder('lwpPupil')
                    .leftJoin('lwpPupil.classes', 'schoolClass')
                    .where('schoolClass.id = :id', { id: platformSchoolClassId })
                    .select(['lwpPupil.id', 'lwpPupil.firstname', 'lwpPupil.lastname'])
                    .getMany();

                processedPlatFormSchoolClassPupilData = (lwpPupils || []).map((pupil: LwpPupil) => ({
                    id: pupil?.id,
                    firstname: pupil?.firstname,
                    lastname: pupil?.lastname,
                    sourceType: PupilSourceType.PLATFORM
                }));
            }

            return {
                importedSchoolClassPupilData: processedImportedSchoolClassPupilData,
                platformSchoolClassPupilData: processedPlatFormSchoolClassPupilData
            };
        });
    }

    public async getYearGroupById(manager: EntityManager, yearGroupId: string): Promise<string> {
        if (yearGroupId == null) return '-';

        const yearGroup = await manager.findOne(StaticLwpYearGroup, { where: { id: yearGroupId }, select: ['year'] });

        return yearGroup?.year ?? '-';
    }

    public async getPupilDataForComparison(importedStudentId?: string, platformPupilId?: string): Promise<PupilDataForComparisonOutput> {
        return await this.connection.transaction(async (manager) => {
            let importedStudent: PupilDetails | null = null;

            if (importedStudentId) {
                const [rawImportedStudent] = await manager.query(
                    `
                        WITH student_data AS (
                        select 
                            is1.id as "id",
                            is1.forename as "firstname",
                            is1.surname as "lastname",
                            is1."dateOfBirth" as "dateOfBirth", 
                            is1."UPN" as "UPN",
                            is1."gender" as "gender",
                            (((is1.details#>>'{}')::jsonb)->>'import_nc_year') as "import_nc_year"
                        from imported_student is1
                        where is1.id = $1
                        ), 
                        student_school_class AS (
                        select 
                            iscs."importedStudentId",
                            isc."name" as "schoolClassName",
                            isc."periodIndex" as "periodIndex"
                        from imported_school_class_student iscs
                        join imported_school_class isc on isc.id = iscs."importedSchoolClassId"
                        where iscs."importedStudentId" = $1
                        order by iscs."importedSchoolClassId"
                        limit 1
                        ),
                        aggregated_data AS (
                        SELECT 
                            sd.*,
                            ssc."schoolClassName",
                            ssc."periodIndex",
                            (select "index" from static_lwp_period where "isCurrentPeriod" = true) as "currentPeriodIndex",
                            (select json_agg(
                                json_build_object(
                                    'firstname', ic.forename,
                                    'lastname', ic.surname,
                                    'email', ic.email,
                                    'phoneNumber', ic."phoneNumber"
                                )
                            ) from imported_contact ic
                            join imported_student_contact isc2 on isc2."importedContactId" = ic.id 
                            where isc2."importedStudentId" = $1) as parents
                        FROM student_data sd
                        LEFT JOIN student_school_class ssc ON ssc."importedStudentId" = sd."id"
                        )
                        SELECT 
                        ad."id",
                        ad."firstname",
                        ad."lastname",
                        ad."dateOfBirth",
                        ad."UPN",
                        ad."gender",
                        ad."schoolClassName",
                        ad."currentPeriodIndex" - (
                            ad."periodIndex" - 
                            CASE 
                                WHEN ad."import_nc_year" IS NULL 
                                    OR ad."import_nc_year" IN ('[Unknown]', '') 
                                    OR regexp_replace(ad."import_nc_year", '[^-0-9]', '', 'g') = ''
                                THEN NULL
                                ELSE regexp_replace(ad."import_nc_year", '[^-0-9]', '', 'g')::int
                            END
                        ) as "yearGroup",
                        ad.parents
                        FROM aggregated_data ad;
                    `,
                    [importedStudentId]
                );

                importedStudent = rawImportedStudent;
            }

            const processedImportedStudent: PupilDetails = importedStudent?.id
                ? {
                      id: importedStudent?.id,
                      firstname: importedStudent?.firstname,
                      lastname: importedStudent?.lastname,
                      dateOfBirth: importedStudent?.dateOfBirth ? importedStudent?.dateOfBirth : '-',
                      UPN: ['[Unknown]', null].includes(importedStudent?.UPN) ? '-' : importedStudent?.UPN,
                      gender: importedStudent?.gender ? importedStudent?.gender : '-',
                      schoolClassName: importedStudent?.schoolClassName ? importedStudent?.schoolClassName : '-',
                      yearGroup: await this.getYearGroupById(manager, importedStudent?.yearGroup),
                      parents: Array.isArray(importedStudent?.parents)
                          ? Array.from(importedStudent?.parents).map((parent: ParentDetails) => ({
                                firstname: parent?.firstname,
                                lastname: parent?.lastname,
                                email: parent?.email,
                                phoneNumber: parent?.phoneNumber
                            }))
                          : []
                  }
                : null;

            let platFormPupil: PupilDetails | null = null;

            if (platformPupilId) {
                const [rawPlatFormPupil] = await manager.query(
                    `
                        WITH pupil_data AS (
                            select 
                                lp.id as "id",
                                lp.firstname as "firstname",
                                lp.lastname as "lastname",
                                lp."dateOfBirth" as "dateOfBirth", 
                                lp."UPN" as "UPN",
                                lp."gender" as "gender",
                                CASE 
                                    WHEN lp."startedSchool" ~ '^[0-9]+$' THEN lp."startedSchool"::int 
                                    ELSE NULL 
                                END as "startedSchool",
                                COALESCE(lp."importedStudentId" = $2, false) as "isPreviouslyLinked"
                            from lwp_pupil lp
                            where lp.id = $1
                        ), 
                        pupil_feedback AS (
                            -- "In use" means the family has left feedback of any kind: activity feedback,
                            -- reading logs and scrapbook entries all land here, reached through the
                            -- history table as the platform's own reading-log view does. Only family
                            -- authors count, as in lwp_view_pupil_status: teacher comments are not use.
                            -- Tombstone copies left by deletes and edits (originalFeedbackId set) are
                            -- not feedback. The last activity is a calendar date, the same one the
                            -- status view compares against the term.
                            select
                                count(*)::int as "feedbackCount",
                                max(coalesce(lpf."bookReadAt", lpf."logCreatedAt"::date)) as "lastActivity"
                            from lwp_pupil_feedback lpf
                            join lwp_pupil_feedback_history lpfh on lpfh."lwpPupilFeedbackId" = lpf.id
                            where lpfh."lwpPupilId" = $1
                                and lpf."originalFeedbackId" is null
                                and lpf."userType" = any($3)
                        ),
                        pupil_status AS (
                            -- The same status the teacher's pupil list shows (lwp_view_pupil_status).
                            select lvps."pupilStatus"
                            from lwp_view_pupil_status lvps
                            where lvps."pupilId" = $1
                        ), 
                        pupil_school_class AS (
                            select 
                                lcp."lwpPupilId",
                                lsc."name" as "schoolClassName",
                                lsc."periodIndex" as "periodIndex"
                            from lwp_class_pupil lcp
                            join lwp_school_class lsc on lsc.id = lcp."lwpSchoolClassId"
                            join lwp_school ls on ls.id = lsc."schoolId"
                            where lcp."lwpPupilId" = $1
                                and lsc."isRegistrationClass" = true 
                                and lsc."periodIndex" = ls."curentPeriodIndex"
                            order by lcp."lwpSchoolClassId"
                            limit 1
                        ),
                        aggregated_data AS (
                            SELECT 
                                pd.*,
                                psc."schoolClassName",
                                psc."periodIndex",
                                (select "index" from static_lwp_period where "isCurrentPeriod" = true) as "currentPeriodIndex",
                                (select json_agg(
                                    json_build_object(
                                        'firstname', lu.firstname,
                                        'lastname', lu.lastname,
                                        'email', lu.email,
                                        'phoneNumber', lu."phoneNumber",
                                        'status', lpp.status
                                    )
                                ) from lwp_user lu
                                join lwp_pupil_parent lpp on lpp."parentId" = lu.id 
                                where lpp."pupilId" = $1) as parents,
                                pf."feedbackCount",
                                pf."lastActivity",
                                ps."pupilStatus"
                            FROM pupil_data pd
                            LEFT JOIN pupil_school_class psc ON psc."lwpPupilId" = pd."id"
                            CROSS JOIN pupil_feedback pf
                            LEFT JOIN pupil_status ps ON true
                        )
                        SELECT 
                            ad."id",
                            ad."firstname",
                            ad."lastname",
                            ad."dateOfBirth",
                            ad."UPN",
                            ad."gender",
                            ad."schoolClassName",
                            ad."currentPeriodIndex" - ad."startedSchool" as "yearGroup",
                            ad.parents,
                            ad."feedbackCount",
                            ad."lastActivity",
                            ad."pupilStatus",
                            ad."isPreviouslyLinked"
                        FROM aggregated_data ad;
                    `,
                    [platformPupilId, importedStudentId ?? null, [UserType.PARENT, UserType.TOPICACCESS, UserType.MAGICPARENT]]
                );

                platFormPupil = rawPlatFormPupil;
            }

            const processedPlatformPupil: PupilDetails = platFormPupil?.id
                ? {
                      id: platFormPupil?.id,
                      firstname: platFormPupil?.firstname,
                      lastname: platFormPupil?.lastname,
                      dateOfBirth: platFormPupil?.dateOfBirth ? platFormPupil?.dateOfBirth : '-',
                      UPN: ['[Unknown]', null].includes(platFormPupil?.UPN) ? '-' : platFormPupil?.UPN,
                      gender: platFormPupil?.gender ? platFormPupil?.gender : '-',
                      schoolClassName: platFormPupil?.schoolClassName ? platFormPupil?.schoolClassName : '-',
                      yearGroup: await this.getYearGroupById(manager, platFormPupil?.yearGroup),
                      parents: Array.isArray(platFormPupil?.parents)
                          ? Array.from(platFormPupil?.parents).map((parent: ParentDetails) => ({
                                firstname: parent?.firstname,
                                lastname: parent?.lastname,
                                email: parent?.email,
                                phoneNumber: parent?.phoneNumber,
                                status: parent?.status ?? null
                            }))
                          : [],
                      feedbackCount: platFormPupil?.feedbackCount ?? 0,
                      // the driver hands a date column back as local midnight, so format it in local time too
                      lastActivity: platFormPupil?.lastActivity ? moment(platFormPupil.lastActivity).format('YYYY-MM-DD') : null,
                      pupilStatus: platFormPupil?.pupilStatus ?? null,
                      isPreviouslyLinked: platFormPupil?.isPreviouslyLinked ?? false
                  }
                : null;

            return {
                importedStudent: processedImportedStudent,
                platformPupil: processedPlatformPupil
            };
        });
    }

    public async getPupilData(pupilId: string, sourceType: PupilSourceType): Promise<PupilDetails | null> {
        const platformPupilId = sourceType === PupilSourceType.PLATFORM ? pupilId : null;
        const importedStudentId = sourceType === PupilSourceType.IMPORTED ? pupilId : null;

        const { importedStudent, platformPupil } = await this.getPupilDataForComparison(importedStudentId, platformPupilId);

        return sourceType === PupilSourceType.PLATFORM ? platformPupil : importedStudent;
    }

    public async rejectLinksInternal(
        manager: EntityManager,
        entityType: EntityType,
        importedEntityId: string,
        isAuto: boolean
    ): Promise<Array<string>> {
        const affectedImportedEntities: Array<{ importedEntityId: string }> = await manager.query(
            `
                with reject_links as (
                    update imported_school_data_proposed_link isdpl
                    set status = $3
                    where isdpl."entityType" = $1
                        and isdpl."importedEntityId" = $2
                    returning isdpl."platformEntityId"
                )
                select distinct isdpl."importedEntityId"
                from reject_links rl
                join imported_school_data_proposed_link isdpl
                    on rl."platformEntityId" = isdpl."platformEntityId"
                    and isdpl."entityType" = $1
                    and isdpl.status = $4
            `,
            [entityType, importedEntityId, isAuto ? LinkStatus.AUTO_REJECTED : LinkStatus.REJECTED, LinkStatus.PENDING]
        );

        return affectedImportedEntities.map(({ importedEntityId }) => importedEntityId);
    }

    /**
     * Return true if there are any pending links for the given imported school and link type (pupil or class),
     * otherwise false.
     */
    public async hasPendingLinks(manager: EntityManager, entityType: EntityType, importedSchoolId: string): Promise<boolean> {
        const [{ hasPendingLinks }] = await manager.query(
            `
                select exists (
                    select 1
                    from imported_school_data_proposed_link isdpl
                    join imported_school is1 on is1."lwpSchoolId"::varchar = isdpl."platformSchoolId"
                    where is1.id = $1
                        and isdpl."entityType" = $2
                        and isdpl."status" = $3
                ) as "hasPendingLinks"
            `,
            [importedSchoolId, entityType, LinkStatus.PENDING]
        );

        return hasPendingLinks;
    }

    public async resolveLinksExhaustively(
        manager: EntityManager,
        entityType: EntityType,
        importedSchoolId: string,
        importedEntityIds?: Array<string>
    ): Promise<void> {
        if (!!importedEntityIds && importedEntityIds.length === 0) {
            return;
        }

        let invalidatedImportedEntityIds: Array<string> = [];

        let iterations = 0;

        do {
            invalidatedImportedEntityIds = await this.resolveLinks(manager, entityType, importedSchoolId, importedEntityIds);
            ++iterations;
            if (iterations > 10) {
                Logger.warn('Too many iterations resolving imported entity links');
                break;
            }
        } while (invalidatedImportedEntityIds.length > 0);
    }

    private async resolveLinks(
        manager: EntityManager,
        entityType: EntityType,
        importedSchoolId: string,
        importedEntityIds?: Array<string>
    ): Promise<Array<string>> {
        const invalidatedImportedEntityIds = new Set<string>();

        /*
         * A high-confidence candidate is taken automatically when nothing else can reasonably be
         * meant: either it is the only high-confidence candidate on both sides, or every rival is
         * a strictly weaker reading of the same pupil - the winner agrees on everything the rival
         * does and on something more besides. Anything else, including two candidates whose
         * evidence merely differs, is a judgement about which child this is, and belongs to a
         * school leader.
         *
         * A candidate is kept when no rival survives comparison with it, so each rival is asked
         * what it has that would stay the decision: evidence this candidate lacks
         * ("matchCriteria" & ~ leaves the rival's bits this one does not hold), or exactly the
         * same evidence, which is a tie and nothing to choose between them.
         *
         * Criteria are therefore compared as sets, not totals, so a candidate can never win on a
         * different kind of evidence, only on more of the same. The tie clause is what keeps it
         * strict, so at most one candidate per entity can survive. Class links carry no criteria
         * at all (all zero), where every second candidate is a tie and this reduces to the
         * one-each rule it replaces.
         */
        const matches = await manager.query(
            `
                with pending_links as (
                    select
                        isdpl."importedEntityId",
                        isdpl."platformEntityId",
                        isdpl."isHighConfidence",
                        isdpl."matchCriteria"
                    from imported_school_data_proposed_link isdpl
                    join imported_school is1 on is1."lwpSchoolId"::varchar = isdpl."platformSchoolId"
                    where is1.id = $1
                        and isdpl."entityType" = $3
                        and isdpl."status" = $4
                        and (
                            $5
                            or isdpl."importedEntityId" = any($2)
                        )
                ),
                high_confidence_pending as (
                    select *
                    from pending_links
                    where "isHighConfidence" = true
                ),
                unrivalled_for_imported as (
                    select
                        hcp."importedEntityId",
                        hcp."platformEntityId"
                    from high_confidence_pending hcp
                    where not exists (
                        select 1
                        from high_confidence_pending rival
                        where rival."importedEntityId" = hcp."importedEntityId"
                            and rival."platformEntityId" != hcp."platformEntityId"
                            and (
                                (rival."matchCriteria" & ~hcp."matchCriteria") != 0
                                or rival."matchCriteria" = hcp."matchCriteria"
                            )
                    )
                ),
                unrivalled_for_platform as (
                    select
                        hcp."importedEntityId",
                        hcp."platformEntityId"
                    from high_confidence_pending hcp
                    where not exists (
                        select 1
                        from high_confidence_pending rival
                        where rival."platformEntityId" = hcp."platformEntityId"
                            and rival."importedEntityId" != hcp."importedEntityId"
                            and (
                                (rival."matchCriteria" & ~hcp."matchCriteria") != 0
                                or rival."matchCriteria" = hcp."matchCriteria"
                            )
                    )
                )
                select
                    hcp."importedEntityId",
                    hcp."platformEntityId"
                from high_confidence_pending hcp
                join unrivalled_for_imported ufi
                    on ufi."importedEntityId" = hcp."importedEntityId"
                    and ufi."platformEntityId" = hcp."platformEntityId"
                join unrivalled_for_platform ufp
                    on ufp."importedEntityId" = hcp."importedEntityId"
                    and ufp."platformEntityId" = hcp."platformEntityId"
            `,
            [importedSchoolId, importedEntityIds ?? [], entityType, LinkStatus.PENDING, !importedEntityIds]
        );

        for (const match of matches) {
            const invalidated = await this.selectLinkInternal(manager, entityType, match.importedEntityId, match.platformEntityId, true);

            invalidated.forEach((id) => invalidatedImportedEntityIds.add(id));
        }

        return Array.from(invalidatedImportedEntityIds);
    }
}
