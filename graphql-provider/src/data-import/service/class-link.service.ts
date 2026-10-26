import { forwardRef, HttpException, Inject, Injectable, Logger } from '@nestjs/common';
import { PupilParentStatus } from 'lwp-shared';
import { ImportedSchoolClass } from 'src/api/entities/imported_school_class';
import { ImportedSchoolDataProposedLink } from 'src/api/entities/imported_school_data_proposed_link';
import { LwpSchoolClass } from 'src/api/entities/school_class';
import { ErrorStatusCodeEnum, SchoolClassStatus } from 'src/api/model';
import { PupilService } from 'src/api/service/pupil.service';
import { EntityLinkService } from 'src/data-import/service/entity-link.service';
import { ChangeOperation } from 'src/data-import/types/change-operation';
import { ChangeStatus } from 'src/data-import/types/change-status';
import { EntityType } from 'src/data-import/types/entity-type';
import { LinkStatus } from 'src/data-import/types/link-status';
import type { EntityManager } from 'typeorm';

@Injectable()
export class ClassLinkService {
    private static readonly namesMatchClause = `
        (
            lsc.name = isc.name
            or exists (
                select 1
                from imported_school_data_proposed_change isdpc
                where isdpc."entityType" = '${EntityType.CLASS}'
                    and isdpc."status" = '${ChangeStatus.REJECTED}'
                    and isdpc."platformEntityId" = lsc.id
                    and isdpc."fieldName" = 'name'
                    and isdpc."proposedValue"::varchar = isc."name"
            )
        )
    `;

    public constructor(
        private readonly entityLinkService: EntityLinkService,
        @Inject(forwardRef(() => PupilService)) private readonly pupilService: PupilService
    ) {}

    public async refreshLinks(manager: EntityManager, importedSchoolId: string): Promise<void> {
        Logger.debug('REFRESHING CLASS LINKS');

        await this.generateLinks(manager, importedSchoolId);
        await this.entityLinkService.resolveLinksExhaustively(manager, EntityType.CLASS, importedSchoolId);
        await this.finaliseLinks(manager, importedSchoolId);
    }

    public async selectLink(
        manager: EntityManager,
        importedSchoolId: string,
        importedClassId: string,
        platformClassId: string
    ): Promise<void> {
        const invalidatedImportedClassIds = await this.entityLinkService.selectLinkInternal(
            manager,
            EntityType.CLASS,
            importedClassId,
            platformClassId,
            false
        );

        await this.entityLinkService.resolveLinksExhaustively(manager, EntityType.CLASS, importedSchoolId, invalidatedImportedClassIds);
        await this.finaliseLinks(manager, importedSchoolId);
    }

    public async rejectLinks(manager: EntityManager, importedSchoolId: string, importedClassId: string): Promise<void> {
        const invalidatedImportedClassIds = await this.entityLinkService.rejectLinksInternal(
            manager,
            EntityType.CLASS,
            importedClassId,
            false
        );

        await this.entityLinkService.resolveLinksExhaustively(manager, EntityType.CLASS, importedSchoolId, invalidatedImportedClassIds);
        await this.finaliseLinks(manager, importedSchoolId);
    }

    private generateLinks(manager: EntityManager, importedSchoolId: string, importedClassIds?: Array<string>): Promise<void> {
        return manager.query(
            `
                with candidates as (
                    select
                        isc.id as "importedClassId",
                        lsc.id as "platformClassId",
                        (lsc."importedSchoolClassId" = isc.id) as "idsMatch",
                        ${ClassLinkService.namesMatchClause} as "namesMatch",
                        /* True when there is nothing on either side that could prove an overlap:
                         * the MIS class is empty, or every pupil in the platform class is one the
                         * completion relink deletes and recreates (no invited or active parent),
                         * so none of them carry a pupil link to match against. */
                        (
                            count(is2.id) = 0
                            or not bool_or(lpp_engaged."pupilId" is not null)
                        ) as "hasNoComparablePupils",
                        (lsc."yearGroup" = isc."yearGroup") as "sameYearGroup",
                        bool_or(is2."lwpPupilId" = lp.id) as "hasPupilsInCommon",
                        ls.id::varchar as "platformSchoolId"
                    from imported_school is1
                    join lwp_school ls on ls.id = is1."lwpSchoolId"
                    join imported_school_class isc on isc."schoolId" = is1.id
                        and isc."periodIndex" = ls."curentPeriodIndex"
                    join lwp_school_class lsc on lsc."schoolId" = ls.id
                        and lsc."isRegistrationClass" = true
                        and lsc."periodIndex" = isc."periodIndex"
                        /* No name/id gate here on purpose. Gating candidates in the join makes the
                         * "hasPupilsInCommon" arm of the filter below unreachable, so a class the MIS
                         * renamed is never proposed even when its pupils plainly identify it. The
                         * filter decides what qualifies; this join only decides what is comparable. */
                    left join imported_school_class_student iscs on iscs."importedSchoolClassId" = isc.id
                    left join imported_student is2 on is2.id = iscs."importedStudentId"
                    left join lwp_class_pupil lcp on lcp."lwpSchoolClassId" = lsc."id"
                    left join lwp_pupil lp on lp.id = lcp."lwpPupilId"
                    /* Joined rather than tested with a correlated exists per pupil: the rows are
                     * already grouped, and every aggregate here is blind to the fan-out this adds -
                     * "bool_or" is idempotent and the one count is only compared against zero. */
                    left join lwp_pupil_parent lpp_engaged on lpp_engaged."pupilId" = lp.id
                        and lpp_engaged.status != '${PupilParentStatus.IMPORTED}'
                    where is1."id" = $1
                        and (
                            $3
                            or isc.id = any($2)
                        )
                    group by isc.id, lsc.id, ls.id
                )
                insert into imported_school_data_proposed_link(
                    "platformSchoolId",
                    "status",
                    "entityType",
                    "importedEntityId",
                    "platformEntityId",
                    "isHighConfidence"
                )
                select
                    c."platformSchoolId" as "platformSchoolId",
                    $5 as "status",
                    $4 as "entityType",
                    c."importedClassId" as "importedEntityId",
                    c."platformClassId" as "platformEntityId",
                    coalesce(
                        (
                            c."idsMatch"
                            or c."namesMatch"
                        )
                        /* Requiring a shared pupil is right whenever a shared pupil could exist -
                         * it is what stops a reused class name merging two unrelated classes. It
                         * cannot be required when no pupil on either side is capable of carrying a
                         * link, or the class is proposed to the leader again after every sync and
                         * their answer is never remembered. Ambiguity is still safe: uniqueness is
                         * judged among high-confidence links, so two candidates resolve to neither. */
                        and (
                            c."hasPupilsInCommon"
                            or c."hasNoComparablePupils"
                        ),
                        false
                    ) as "isHighConfidence"
                from candidates c
                /* "hasNoComparablePupils" is deliberately not an arm of its own: it would propose
                 * every registration class for any class with no comparable students. A
                 * name-matching empty class still qualifies via "namesMatch". It only relaxes
                 * confidence above, where an id-or-name match has already been established. */
                where c."idsMatch"
                    or c."namesMatch"
                    or c."hasPupilsInCommon"
                    /* Any registration class in the same year group is a possible home for an
                     * arriving class, even with nothing else in common - a leader can tell which of
                     * their Year 3 classes it is far better than a name comparison can. Null on
                     * either side yields null, so a class with no year group falls back to the arms
                     * above rather than matching everything. */
                    or c."sameYearGroup"
                on conflict("importedEntityId", "platformEntityId") do update
                    set "isHighConfidence" = excluded."isHighConfidence"
            `,
            [importedSchoolId, importedClassIds ?? [], !importedClassIds, EntityType.CLASS, LinkStatus.PENDING]
        );
    }

    private async finaliseLinks(manager: EntityManager, importedSchoolId: string): Promise<void> {
        await manager.query(
            `
                    with rejected_links as (
                        select
                            isdpl."importedEntityId",
                            isdpl."platformEntityId"
                        from imported_school_data_proposed_link isdpl
                        join imported_school is1 on is1."lwpSchoolId"::varchar = isdpl."platformSchoolId"
                        where is1.id = $1
                            and isdpl."entityType" = $2
                            and isdpl."status" = any($3)
                    ),
                    update_imported_classes as (
                        update imported_school_class isc
                        set "lwpSchoolClassId" = null
                        from rejected_links rl
                        where isc.id = rl."importedEntityId"
                    ),
                    update_platform_classes as (
                        update lwp_school_class lsc
                        set "importedSchoolClassId" = null
                        from rejected_links rl
                        where lsc.id = rl."platformEntityId"
                    )
                    select true
                `,
            [importedSchoolId, EntityType.CLASS, [LinkStatus.REJECTED, LinkStatus.AUTO_REJECTED]]
        );

        await manager.query(
            `
                    with selected_links as (
                        select
                            isdpl."importedEntityId",
                            isdpl."platformEntityId"
                        from imported_school_data_proposed_link isdpl
                        join imported_school is1 on is1."lwpSchoolId"::varchar = isdpl."platformSchoolId"
                        where is1.id = $1
                            and isdpl."entityType" = $2
                            and isdpl."status" = any($3)
                    ),
                    update_imported_classes as (
                        update imported_school_class isc
                        set "lwpSchoolClassId" = sl."platformEntityId"
                        from selected_links sl
                        where isc.id = sl."importedEntityId"
                    ),
                    update_platform_classes as (
                        update lwp_school_class lsc
                        set "importedSchoolClassId" = sl."importedEntityId"
                        from selected_links sl
                        where lsc.id = sl."platformEntityId"
                    )
                    select true
                `,
            [importedSchoolId, EntityType.CLASS, [LinkStatus.SELECTED, LinkStatus.AUTO_SELECTED]]
        );
    }

    /**
     * Create platform registration classes for imported classes the review cannot link to
     * anything: no pending candidate link, and no rejected CREATE change recording an earlier
     * "ignore" decision. The current-period filter mirrors {@link generateLinks} and the implicit
     * pending-create check: only this year's MIS classes take part in the review. Each created
     * class gets an AUTO_SELECTED link.
     *
     * Runs only after BOTH linking gates have passed, immediately before the review completes -
     * same reasoning as {@link PupilLinkService.autoCreateUnmatchedPupils}: nothing real is put
     * on the platform while teachers are still mid-review.
     */
    public async autoCreateUnmatchedClasses(manager: EntityManager, importedSchoolId: string): Promise<void> {
        const unmatchedClasses: Array<{ id: string }> = await manager.query(
            `
                select isc.id
                from imported_school_class isc
                join imported_school is2 on is2.id = isc."schoolId"
                join lwp_school ls on ls.id = is2."lwpSchoolId"
                where isc."schoolId" = $1
                    and isc."periodIndex" = ls."curentPeriodIndex"
                    and isc."lwpSchoolClassId" is null
                    and not exists (
                        select 1
                        from imported_school_data_proposed_link isdpl
                        where isdpl."entityType" = $2
                            and isdpl."importedEntityId" = isc.id
                            and isdpl.status = any($3)
                    )
                    and not exists (
                        select 1
                        from imported_school_data_proposed_change isdpc
                        where isdpc."platformSchoolId" = ls.id::varchar
                            and isdpc."entityType" = $2
                            and isdpc."operation" = $4
                            and isdpc."status" = $5
                            and (
                                case
                                    when ls."misIntegration" = 'CSV' then
                                        (isdpc."proposedValue" - 'logCreatedAt' - 'logUpdatedAt' - 'id') = (to_jsonb(isc) - 'logCreatedAt' - 'logUpdatedAt' - 'id')
                                    else
                                        (isdpc."proposedValue" - 'logCreatedAt' - 'logUpdatedAt') = (to_jsonb(isc) - 'logCreatedAt' - 'logUpdatedAt')
                                end
                            )
                    )
            `,
            [
                importedSchoolId,
                EntityType.CLASS,
                [LinkStatus.PENDING, LinkStatus.SELECTED, LinkStatus.AUTO_SELECTED],
                ChangeOperation.CREATE,
                ChangeStatus.REJECTED
            ]
        );

        if (unmatchedClasses.length > 0) {
            Logger.debug(`AUTO-CREATING ${unmatchedClasses.length} UNMATCHED CLASSES`);

            for (const { id } of unmatchedClasses) {
                const schoolClass = await this.createPlatformSchoolClassFromImportedSchoolClass(manager, id);

                const link = new ImportedSchoolDataProposedLink();

                link.entityType = EntityType.CLASS;
                link.status = LinkStatus.AUTO_SELECTED;
                link.platformEntityId = schoolClass.id;
                link.importedEntityId = id;
                link.platformSchoolId = schoolClass.school.id;
                link.isHighConfidence = true;

                await manager.getRepository(ImportedSchoolDataProposedLink).save(link);
            }
        }

        // Apply the AUTO_SELECTED links this sweep just wrote (idempotent, so also a safety net
        // for any decided link an earlier pass left unstamped).
        await this.finaliseLinks(manager, importedSchoolId);
    }

    public async createPlatformSchoolClassFromImportedSchoolClass(
        manager: EntityManager,
        importedSchoolClassId: string
    ): Promise<LwpSchoolClass> {
        const importedSchoolClass = await manager
            .getRepository(ImportedSchoolClass)
            .createQueryBuilder('wsc')
            .leftJoin('wsc.school', 'importedSchool')
            .leftJoin('wsc.period', 'importedSchoolClassPeriod')
            .leftJoin('wsc.yearGroup', 'importedSchoolClassYearGroup')
            .leftJoin('importedSchool.lwpSchool', 'lwpSchool')
            .leftJoin('importedSchool.period', 'importedSchoolPeriod')
            .where('wsc.id = :id', { id: importedSchoolClassId })
            .select([
                'wsc.id',
                'wsc.name',
                'importedSchoolClassYearGroup.id',
                'importedSchool.id',
                'lwpSchool.id',
                'importedSchoolPeriod.index',
                'importedSchoolClassPeriod.index'
            ])
            .getOne();

        if (!importedSchoolClass) {
            throw new HttpException(`Imported school class with ID ${importedSchoolClassId} not found`, ErrorStatusCodeEnum._535);
        }

        const lwpSchoolClass = new LwpSchoolClass();

        lwpSchoolClass.name = importedSchoolClass.name;
        lwpSchoolClass.isRegistrationClass = true;
        lwpSchoolClass.yearGroup = importedSchoolClass.yearGroup;
        lwpSchoolClass.school = importedSchoolClass?.school?.lwpSchool;
        lwpSchoolClass.status = SchoolClassStatus.IMPORTED;
        lwpSchoolClass.period = importedSchoolClass?.school?.period;
        lwpSchoolClass.importedSchoolClass = importedSchoolClass;
        lwpSchoolClass.importedSchoolClassId = importedSchoolClass.id;
        lwpSchoolClass.isReadyTeddyEnabled = importedSchoolClass.period.index > importedSchoolClass.school.period.index;

        const schoolClass = await manager.getRepository(LwpSchoolClass).save(lwpSchoolClass);

        // const lwpPupils = await manager
        //     .getRepository(LwpPupil)
        //     .createQueryBuilder('lwpPupil')
        //     .leftJoin('lwpPupil.importedStudent', 'importedStudent')
        //     .leftJoin('importedStudent.schoolClasses', 'importedSchoolClass')
        //     .where('importedSchoolClass.id = :importedSchoolClassId', { importedSchoolClassId })
        //     .select(['lwpPupil.id'])
        //     .getMany();

        // const lwpPupilIds = lwpPupils.map((pupil) => pupil.id);

        // if (lwpPupilIds.length === 0) return schoolClass;

        // await this.pupilService.addPupilToClass(schoolClass?.id, lwpPupilIds, false, true, manager);

        return schoolClass;
    }
}
