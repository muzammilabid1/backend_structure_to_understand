import { HttpException, Injectable, Logger } from '@nestjs/common';
import { Gender, PupilParentStatus } from 'lwp-shared';
import { ImportedSchoolDataProposedLink } from 'src/api/entities/imported_school_data_proposed_link';
import { ImportedStudent } from 'src/api/entities/imported_student';
import { LwpPupil } from 'src/api/entities/pupil';
import { ErrorStatusCodeEnum, WondeGender } from 'src/api/model';
import { EntityLinkService } from 'src/data-import/service/entity-link.service';
import { ChangeOperation } from 'src/data-import/types/change-operation';
import { ChangeStatus } from 'src/data-import/types/change-status';
import { EntityType } from 'src/data-import/types/entity-type';
import { LinkStatus } from 'src/data-import/types/link-status';
import { PupilMatchCriterion } from 'src/data-import/types/pupil-match-criterion';
import type { EntityManager } from 'typeorm';

@Injectable()
export class PupilLinkService {
    private static readonly firstNamesMatchClause = `
        (
            lp.firstname = is2.forename
            or exists (
                select 1
                from imported_school_data_proposed_change isdpc
                where isdpc."entityType" = '${EntityType.PUPIL}'
                    and isdpc."status" = '${ChangeStatus.REJECTED}'
                    and isdpc."platformEntityId" = lp.id
                    and isdpc."fieldName" = 'firstname'
                    and isdpc."proposedValue"::varchar = is2."forename"
            )
        )
    `;

    private static readonly lastNamesMatchClause = `
        (
            lp.lastname = is2.surname
            or exists (
                select 1
                from imported_school_data_proposed_change isdpc
                where isdpc."entityType" = '${EntityType.PUPIL}'
                    and isdpc."status" = '${ChangeStatus.REJECTED}'
                    and isdpc."platformEntityId" = lp.id
                    and isdpc."fieldName" = 'lastname'
                    and isdpc."proposedValue"::varchar = is2."surname"
            )
        )
    `;

    private static readonly dobsMatchClause = `
        (
            lp."dateOfBirth" = is2."dateOfBirth"
            or exists (
                select 1
                from imported_school_data_proposed_change isdpc
                where isdpc."entityType" = '${EntityType.PUPIL}'
                    and isdpc."status" = '${ChangeStatus.REJECTED}'
                    and isdpc."platformEntityId" = lp.id
                    and isdpc."fieldName" = 'dateOfBirth'
                    and cast(isdpc."proposedValue"::varchar as date) = is2."dateOfBirth"
            )
        )
    `;

    public constructor(private readonly entityLinkService: EntityLinkService) {}

    public async refreshLinks(manager: EntityManager, importedSchoolId: string): Promise<void> {
        Logger.debug('REFRESHING PUPIL LINKS');

        await this.generateLinks(manager, importedSchoolId);
        await this.entityLinkService.resolveLinksExhaustively(manager, EntityType.PUPIL, importedSchoolId);
        await this.finaliseLinks(manager, importedSchoolId);
    }

    public async selectLink(
        manager: EntityManager,
        importedSchoolId: string,
        importedPupilId: string,
        platformPupilId: string
    ): Promise<void> {
        const invalidatedImportedPupilIds = await this.entityLinkService.selectLinkInternal(
            manager,
            EntityType.PUPIL,
            importedPupilId,
            platformPupilId,
            false
        );

        await this.entityLinkService.resolveLinksExhaustively(manager, EntityType.PUPIL, importedSchoolId, invalidatedImportedPupilIds);
        await this.finaliseLinks(manager, importedSchoolId);
    }

    public async rejectLinks(manager: EntityManager, importedSchoolId: string, importedPupilId: string): Promise<void> {
        const invalidatedImportedPupilIds = await this.entityLinkService.rejectLinksInternal(
            manager,
            EntityType.PUPIL,
            importedPupilId,
            false
        );

        await this.entityLinkService.resolveLinksExhaustively(manager, EntityType.PUPIL, importedSchoolId, invalidatedImportedPupilIds);
        await this.finaliseLinks(manager, importedSchoolId);
    }

    private async generateLinks(manager: EntityManager, importedSchoolId: string, importedPupilIds?: Array<string>): Promise<void> {
        return manager.query(
            `
                with candidates as (
                    select
                        ls.id::varchar as "platformSchoolId",
                        is2.id as "importedPupilId",
                        lp.id as "platformPupilId",
                        (lp."importedStudentId" = is2.id) as "idsMatch",
                        (lp."UPN" != '[Unknown]' and lp."UPN" = is2."UPN") as "upnsMatch",
                        (lp."UPN" is null or lp."UPN" = '[Unknown]' or lp."UPN" ~ '[A-Za-z]$') as "platformUpnIsTemporary",
                        /* A UPN can only contradict when both sides carry a real one. Absent or
                         * temporary on either side tells us nothing either way. */
                        (
                            not (lp."UPN" is null or lp."UPN" = '[Unknown]' or lp."UPN" ~ '[A-Za-z]$')
                            and is2."UPN" is not null
                            and is2."UPN" != '[Unknown]'
                        ) as "upnsComparable",
                        ${PupilLinkService.firstNamesMatchClause} as "firstNamesMatch",
                        ${PupilLinkService.lastNamesMatchClause} as "lastNamesMatch",
                        ${PupilLinkService.dobsMatchClause} as "datesOfBirthMatch"
                    from imported_school is1
                    join imported_student is2 on is2."schoolId" = is1.id
                    join lwp_school ls on ls.id = is1."lwpSchoolId"
                    join lwp_pupil lp on lp."schoolId" = ls.id
                        and (
                            lp."importedStudentId" = is2.id
                            or lp."UPN" = is2."UPN"
                            or ${PupilLinkService.firstNamesMatchClause}
                            or ${PupilLinkService.lastNamesMatchClause}
                            or ${PupilLinkService.dobsMatchClause}
                        )
                    -- Don't offer a pupil the orphan cleanup in reLinkingLwpWithWonde would wipe:
                    -- it deletes the school's IMPORTED links, then pupils left with none.
                    and exists (
                        select 1
                        from lwp_pupil_parent lpp
                        where lpp."pupilId" = lp.id
                            and lpp.status != '${PupilParentStatus.IMPORTED}'
                    )
                    where is1.id = $1
                    and ($3 or is2.id = any($2))
                ),
                scored as (
                    select
                        c.*,
                        (
                            c."idsMatch"
                            or c."upnsMatch"
                            or (
                                coalesce(c."firstNamesMatch"::int, 0) +
                                coalesce(c."lastNamesMatch"::int, 0) +
                                coalesce(c."datesOfBirthMatch"::int, 0)
                            ) >= 2
                        ) as "isMatch",
                        (
                            coalesce(c."idsMatch"::int, 0) +
                            coalesce((c."upnsMatch" or c."platformUpnIsTemporary")::int, 0) +
                            coalesce(c."firstNamesMatch"::int, 0) +
                            coalesce(c."lastNamesMatch"::int, 0) +
                            coalesce(c."datesOfBirthMatch"::int, 0)
                        ) >= 4 as "isHighConfidence",
                        /* A link this review has already made, on evidence the MIS still agrees
                         * with. The MIS id is only stamped onto a pupil by a decision - a leader's
                         * or an earlier automatic one - so this cannot invent a link, only carry a
                         * standing one forward. A name that has since diverged does not undo it:
                         * the decision is about which child this is, and a rename is a change to
                         * that child's details, not evidence of a different person. Without this,
                         * the divergence is put back to the leader after every sync, because the
                         * decision itself is not persisted - deleteStaleLinks keeps only
                         * rejections - so it has to re-qualify on data that no longer agrees. */
                        (
                            c."idsMatch"
                            and not (c."upnsComparable" and not coalesce(c."upnsMatch", false))
                            and coalesce(c."datesOfBirthMatch", false)
                        ) as "isStandingLink"
                    from candidates c
                ),
                contacts as (
                    select
                        s.*,
                        count(distinct lu.id) as "lwpParentCount",
                        /* A MIS contact with neither an email nor a phone number can never match a
                         * platform parent, so counting it would hold the count above zero and sink
                         * every link on evidence the MIS never supplied. It says nothing either
                         * way, so it is left out of the comparison entirely. */
                        count(distinct ic.id) filter (
                            where ic.email is not null or ic."phoneNumber" is not null
                        ) as "importedContactCount",
                        /* lu."importedContactId" is the same-parent check: the platform parent
                         * already points at this MIS contact, which settles identity far better
                         * than comparing details a parent may have changed in either system.
                         * It has to be read from the platform side - imported_contact."lwpUserId"
                         * is null at this point, because the pull recreates the shadow rows and
                         * nothing repopulates it until the relink runs at review completion. */
                        bool_or(lu.email = ic.email)
                            or bool_or(lu."phoneNumber" = ic."phoneNumber")
                            or bool_or(lu."importedContactId" = ic.id) as "hasMatchingContact"
                    from scored s
                    left join imported_student_contact isc on isc."importedStudentId" = s."importedPupilId"
                    left join imported_contact ic on ic.id = isc."importedContactId"
                    left join lwp_pupil_parent lpp on lpp."pupilId" = s."platformPupilId"
                    left join lwp_user lu on lu.id = lpp."parentId"
                    group by
                        s."platformSchoolId",
                        s."importedPupilId",
                        s."platformPupilId",
                        s."idsMatch",
                        s."upnsMatch",
                        s."platformUpnIsTemporary",
                        s."upnsComparable",
                        s."firstNamesMatch",
                        s."lastNamesMatch",
                        s."datesOfBirthMatch",
                        s."isMatch",
                        s."isHighConfidence",
                        s."isStandingLink"
                )
                insert into imported_school_data_proposed_link (
                    "platformSchoolId",
                    status,
                    "entityType",
                    "importedEntityId",
                    "platformEntityId",
                    "isHighConfidence",
                    "matchCriteria"
                )
                select distinct
                    c."platformSchoolId" as "platformSchoolId",
                    $4 as status,
                    $5 as "entityType",
                    c."importedPupilId" as "importedEntityId",
                    c."platformPupilId" as "platformEntityId",
                    coalesce(
                        (c."isHighConfidence" or c."isStandingLink") and (
                            c."lwpParentCount" = 0
                            or c."importedContactCount" = 0
                            or c."hasMatchingContact"
                        ),
                        false
                    ) as "isHighConfidence",
                    /* What this candidate is actually built on, kept alongside the verdict so two
                     * candidates for the same pupil can be weighed against each other and not just
                     * counted. Only evidence the MIS and the platform positively agree on: a
                     * temporary UPN and a MIS that holds no contact details are both silence, and
                     * silence must not outweigh a rival that has something to show. */
                    (
                        (case when c."idsMatch" then ${PupilMatchCriterion.MIS_ID} else 0 end) |
                        (case when c."upnsMatch" then ${PupilMatchCriterion.UPN} else 0 end) |
                        (case when c."firstNamesMatch" then ${PupilMatchCriterion.FIRST_NAME} else 0 end) |
                        (case when c."lastNamesMatch" then ${PupilMatchCriterion.LAST_NAME} else 0 end) |
                        (case when c."datesOfBirthMatch" then ${PupilMatchCriterion.DATE_OF_BIRTH} else 0 end) |
                        (case when c."hasMatchingContact" then ${PupilMatchCriterion.PARENT_CONTACT} else 0 end)
                    ) as "matchCriteria"
                from contacts c
                where c."isMatch"
                on conflict ("importedEntityId", "platformEntityId") do update
                    set "isHighConfidence" = (excluded."isHighConfidence" or imported_school_data_proposed_link."isHighConfidence"),
                        "matchCriteria" = (excluded."matchCriteria" | imported_school_data_proposed_link."matchCriteria")
                returning *
            `,
            [importedSchoolId, importedPupilIds ?? [], !importedPupilIds, LinkStatus.PENDING, EntityType.PUPIL]
        );
    }

    /**
     * Project the settled proposal state onto the real columns: stamp lwpPupilId /
     * importedStudentId for every SELECTED and AUTO_SELECTED link, clear them for rejected ones.
     * Idempotent and school-wide.
     */
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
                update_imported_pupils as (
                    update imported_student is1
                    set "lwpPupilId" = null
                    from rejected_links rl
                    where is1.id = rl."importedEntityId"
                ),
                update_platform_pupils as (
                    update lwp_pupil lp
                    set "importedStudentId" = null
                    from rejected_links rl
                    where lp.id = rl."platformEntityId"
                )
                select true
            `,
            [importedSchoolId, EntityType.PUPIL, [LinkStatus.REJECTED, LinkStatus.AUTO_REJECTED]]
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
                update_imported_pupils as (
                    update imported_student is1
                    set "lwpPupilId" = sl."platformEntityId"
                    from selected_links sl
                    where is1.id = sl."importedEntityId"
                ),
                update_platform_pupils as (
                    update lwp_pupil lp
                    set "importedStudentId" = sl."importedEntityId"
                    from selected_links sl
                    where lp.id = sl."platformEntityId"
                )
                select true
            `,
            [importedSchoolId, EntityType.PUPIL, [LinkStatus.SELECTED, LinkStatus.AUTO_SELECTED]]
        );
    }

    /**
     * Create platform pupils for imported students the review cannot link to anything: no pending
     * candidate link, and no rejected CREATE change recording an earlier "ignore" decision. With
     * the ignore option gone, the linking screen could only offer "create new" for these rows, so
     * the review makes that choice itself and the leader only ever sees rows with a real decision
     * to take. Each created pupil gets an AUTO_SELECTED link. A leader's "no existing pupil" is
     * implicit creation too: it only rejects the candidates, and this sweep builds the pupil.
     *
     * Runs only after BOTH linking gates have passed, immediately before the review completes.
     * Any earlier and the created pupils - possibly duplicates of stale parentless records the
     * completion relink is about to replace - would sit on the platform while teachers are still
     * mid-review, free to act on them (e.g. invite parents).
     */
    public async autoCreateUnmatchedPupils(manager: EntityManager, importedSchoolId: string): Promise<void> {
        const unmatchedStudents: Array<{ id: string }> = await manager.query(
            `
                select is1.id
                from imported_student is1
                join imported_school is2 on is2.id = is1."schoolId"
                join lwp_school ls on ls.id = is2."lwpSchoolId"
                where is1."schoolId" = $1
                    and is1."lwpPupilId" is null
                    and not exists (
                        select 1
                        from imported_school_data_proposed_link isdpl
                        where isdpl."entityType" = $2
                            and isdpl."importedEntityId" = is1.id
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
                                        (isdpc."proposedValue" - 'logCreatedAt' - 'logUpdatedAt' - 'id') = (to_jsonb(is1) - 'logCreatedAt' - 'logUpdatedAt' - 'id')
                                    else
                                        (isdpc."proposedValue" - 'logCreatedAt' - 'logUpdatedAt') = (to_jsonb(is1) - 'logCreatedAt' - 'logUpdatedAt')
                                end
                            )
                    )
            `,
            [
                importedSchoolId,
                EntityType.PUPIL,
                [LinkStatus.PENDING, LinkStatus.SELECTED, LinkStatus.AUTO_SELECTED],
                ChangeOperation.CREATE,
                ChangeStatus.REJECTED
            ]
        );

        if (unmatchedStudents.length > 0) {
            Logger.debug(`AUTO-CREATING ${unmatchedStudents.length} UNMATCHED PUPILS`);

            for (const { id } of unmatchedStudents) {
                const lwpPupil = await this.createPlatformPupilFromImportedStudent(manager, id);

                const link = new ImportedSchoolDataProposedLink();

                link.entityType = EntityType.PUPIL;
                link.status = LinkStatus.AUTO_SELECTED;
                link.platformEntityId = lwpPupil.id;
                link.importedEntityId = id;
                link.platformSchoolId = lwpPupil.school.id;
                link.isHighConfidence = true;

                await manager.getRepository(ImportedSchoolDataProposedLink).save(link);
            }
        }

        // Apply the AUTO_SELECTED links this sweep just wrote (idempotent, so also a safety net
        // for any decided link an earlier pass left unstamped).
        await this.finaliseLinks(manager, importedSchoolId);
    }

    public calculatePlatformPupilStartedSchool(periodIndex: number, importNcYear?: string): number {
        if (!importNcYear || importNcYear === '[Unknown]') {
            return periodIndex;
        }

        const cleanedImportNcYear = importNcYear.replace(/[^-0-9]/g, '');

        if (cleanedImportNcYear === '') {
            return periodIndex;
        }

        const numericYear = parseInt(cleanedImportNcYear, 10);

        if (isNaN(numericYear)) {
            return periodIndex;
        }

        return periodIndex - numericYear;
    }

    public async createPlatformPupilFromImportedStudent(manager: EntityManager, importedStudentId: string): Promise<LwpPupil> {
        const importedStudent = await manager
            .getRepository(ImportedStudent)
            .createQueryBuilder('ws')
            .leftJoin('ws.school', 'importedSchool')
            .leftJoin('importedSchool.lwpSchool', 'lwpSchool')
            .leftJoin('importedSchool.period', 'importedSchoolPeriod')
            .where('ws.id = :id', { id: importedStudentId })
            .select([
                'ws.id',
                'ws.forename',
                'ws.surname',
                'ws.dateOfBirth',
                'ws.UPN',
                'ws.isPremium',
                'ws.isPreRegistration',
                'ws.gender',
                'ws.details',
                'importedSchool.id',
                'lwpSchool.id',
                'importedSchoolPeriod.index'
            ])
            .getOne();

        if (!importedStudent) {
            throw new HttpException(`Imported student with ID ${importedStudentId} not found`, ErrorStatusCodeEnum._535);
        }

        const importedStudentNcYear = JSON.parse(importedStudent?.details)?.import_nc_year || '[Unknown]';

        const genderMap: Record<WondeGender, Gender> = {
            [WondeGender.MALE]: Gender.MALE,
            [WondeGender.FEMALE]: Gender.FEMALE,
            [WondeGender.OTHER]: Gender.OTHER
        };

        const platFormPupil = new LwpPupil();

        platFormPupil.firstname = importedStudent?.forename;
        platFormPupil.lastname = importedStudent?.surname;
        platFormPupil.UPN = importedStudent?.UPN;
        platFormPupil.isPremium = importedStudent?.isPremium;
        platFormPupil.isPreRegistration = importedStudent?.isPreRegistration;
        platFormPupil.dateOfBirth = importedStudent?.dateOfBirth;
        platFormPupil.gender = genderMap[importedStudent?.gender];
        platFormPupil.school = importedStudent?.school?.lwpSchool;
        platFormPupil.startedSchool = this.calculatePlatformPupilStartedSchool(
            importedStudent?.school?.period?.index,
            importedStudentNcYear
        )?.toString();
        platFormPupil.importedStudent = importedStudent;
        platFormPupil.importedStudentId = importedStudent?.id;

        return await manager.getRepository(LwpPupil).save(platFormPupil);
    }
}
