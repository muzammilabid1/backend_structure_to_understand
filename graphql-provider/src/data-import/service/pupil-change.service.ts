import { forwardRef, Inject, Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { PupilService } from 'src/api/service/pupil.service';
import { IS_COMPLETE_IMPORT } from 'src/data-import/constants';
import { EntityChangeService } from 'src/data-import/service/entity-change.service';
import { ImportStatusService } from 'src/data-import/service/import-status.service';
import { ChangeOperation } from 'src/data-import/types/change-operation';
import { ChangeStatus } from 'src/data-import/types/change-status';
import { EntityType } from 'src/data-import/types/entity-type';
import { Connection, type EntityManager } from 'typeorm';

@Injectable()
export class PupilChangeService {
    constructor(
        private readonly connection: Connection,
        @Inject(forwardRef(() => PupilService)) private readonly pupilService: PupilService,
        private readonly entityChangeService: EntityChangeService,
        private readonly importStatusService: ImportStatusService
    ) {}

    public async getPendingChanges(importedSchoolId: string, operation?: ChangeOperation): Promise<Array<unknown>> {
        return this.connection.query(
            `
                select isdpc.*
                from imported_school_data_proposed_change isdpc
                join imported_school is1 on is1."lwpSchoolId"::varchar = isdpc."platformSchoolId"
                where is1.id = $1
                    and isdpc."entityType" = $3
                    and isdpc.status = $4
                    ${operation ? 'and isdpc.operation = $2' : ''}  
            `,
            [importedSchoolId, operation, EntityType.PUPIL, ChangeStatus.PENDING]
        );
    }

    public async selectChange(manager: EntityManager, importedSchoolId: string, id: string, contextUserId: string): Promise<void> {
        const result = await manager.query(
            `
                update imported_school_data_proposed_change isdpc
                set status = $3
                from imported_school is1
                where isdpc."platformSchoolId" = is1."lwpSchoolId"::varchar
                    and is1.id = $1
                    and isdpc."entityType" = $4
                    and isdpc."id" = $2
                returning *
            `,
            [importedSchoolId, id, ChangeStatus.SELECTED, EntityType.PUPIL]
        );

        const change = result?.[0]?.[0];

        switch (change?.operation) {
            case ChangeOperation.UPDATE:
                const columnMapping = {
                    firstName: 'firstname',
                    lastName: 'lastname',
                    upn: 'UPN',
                    dateOfBirth: 'dateOfBirth'
                };

                const column = columnMapping[change.fieldName];

                if (column) {
                    const _result = await manager.query(
                        `
                            with old_values as (
                                select * from lwp_pupil where id = $1
                            )
                            update lwp_pupil
                                set "${column}" = $2
                            from old_values
                            where lwp_pupil.id = old_values.id
                            returning old_values.*
                        `,
                        [change.platformEntityId, change.proposedValue]
                    );

                    // await manager.query(
                    //     `
                    //         insert into imported_school_data_proposed_change(
                    //             "importedSchoolId",
                    //             "status",
                    //             "entityType",
                    //             "operation",
                    //             "platformEntityId",
                    //             "fieldName",
                    //             "proposedValue"
                    //         )
                    //         values (
                    //             $1,
                    //             $2,
                    //             $3,
                    //             $4,
                    //             $5,
                    //             $6,
                    //             $7
                    //         )
                    //     `,
                    //     [
                    //         importedSchoolId,
                    //         ChangeStatus.REJECTED,
                    //         EntityType.PUPIL,
                    //         ChangeOperation.UPDATE,
                    //         change.platformEntityId,
                    //         change.fieldName,
                    //         JSON.stringify(result[0][0][column])
                    //     ]
                    // );
                } else if (change.fieldName === 'registrationClass') {
                    const platformPupilId = change.platformEntityId;
                    const newRegistrationClassId = result[0][0].proposedValue;

                    if (newRegistrationClassId) {
                        await this.pupilService.addPupilToClass(
                            newRegistrationClassId,
                            [platformPupilId],
                            contextUserId,
                            false,
                            true,
                            manager
                        );
                    } else {
                        const oldRegistrationClass = await this.pupilService.getPupilRegistrationClass(platformPupilId, manager);

                        if (oldRegistrationClass) {
                            await this.pupilService.removePupilFromClass(platformPupilId, oldRegistrationClass.id, contextUserId, manager);
                        }
                    }
                }

                return;

            case ChangeOperation.DELETE:
                if (IS_COMPLETE_IMPORT) {
                    await this.pupilService.removePupilsFromSchool([change.platformEntityId], contextUserId, manager);
                } else {
                    throw new InternalServerErrorException('Cannot select delete operations for partial imports');
                }

                return;

            default:
                return;
        }
    }

    public async rejectChange(manager: EntityManager, importedSchoolId: string, id: string): Promise<void> {
        await manager.query(
            `
                update imported_school_data_proposed_change isdpc
                set 
                    status = $3,
                    "rejectedImportedAt" = ls."lastImportedAt"
                from imported_school is1
                inner join lwp_school ls on ls.id = is1."lwpSchoolId"
                where isdpc."platformSchoolId" = is1."lwpSchoolId"::varchar
                    and is1.id = $1
                    and isdpc."id" = $2
                    and isdpc."entityType" = $4
                    and isdpc.status = $5
            `,
            [importedSchoolId, id, ChangeStatus.REJECTED, EntityType.PUPIL, ChangeStatus.PENDING]
        );
    }

    public async generateChanges(manager: EntityManager, importedSchoolId: string, _isCompleteImport: boolean): Promise<void> {
        Logger.debug('REFRESHING PUPIL CHANGES');

        await manager.query(
            `
                with linked_pupils as (
                    select
                        ls.id::varchar as "platformSchoolId",
                        lp.id as "platformPupilId",
                        is2.id as "importedPupilId",
                        is2."UPN" as "importedPupilUPN",
                        is2."forename" as "importedPupilFirstName",
                        is2."surname" as "importedPupilLastName",
                        is2."dateOfBirth" as "importedPupilDateOfBirth",
                        lsc2.id::varchar as "importedPupilRegistrationClassId",
                        lp."UPN" is distinct from is2."UPN" as "upnChanged",
                        lp.firstname != is2."forename" as "firstNameChanged",
                        lp.lastname != is2."surname" as "lastNameChanged",
                        lp."dateOfBirth" is distinct from is2."dateOfBirth" as "dateOfBirthChanged",
                        lsc.id is distinct from lsc2.id as "registrationClassChanged"
                    from lwp_school ls
                    join imported_school is1
                        on is1.id = ls."importedSchoolId"
                        and is1."lwpSchoolId" = ls.id
                    join lwp_pupil lp
                        on lp."schoolId" = ls.id
                    left join lwp_class_pupil lcp on lcp."lwpPupilId" = lp.id
                    left join lwp_school_class lsc on lsc.id = lcp."lwpSchoolClassId"
                        and lsc."isRegistrationClass" = true
                        and lsc."periodIndex" = ls."curentPeriodIndex"
                    join imported_student is2
                        on is2.id = lp."importedStudentId"
                        and is2."lwpPupilId" = lp.id
                    left join imported_school_class_student iscs on iscs."importedStudentId" = is2.id
                    left join imported_school_class isc on isc.id = iscs."importedSchoolClassId"
                        and isc."periodIndex" >= ls."curentPeriodIndex"
                    left join lwp_school_class lsc2 on lsc2.id = isc."lwpSchoolClassId"
                        and lsc2."periodIndex" = ls."curentPeriodIndex"
                        and lsc2."importedSchoolClassId" = isc.id
                        and lsc2."isRegistrationClass" = true
                    where is1.id = $1
                        and (
                            lp."UPN" is distinct from is2."UPN"
                            or lp.firstname != is2."forename"
                            or lp.lastname != is2."surname"
                            or lp."dateOfBirth" is distinct from is2."dateOfBirth"
                            or lsc.id is distinct from lsc2.id
                        )
                )
                insert into imported_school_data_proposed_change(
                    "platformSchoolId",
                    "status",
                    "operation",
                    "entityType",
                    "platformEntityId",
                    "fieldName",
                    "proposedValue"
                )
                select distinct
                    lp."platformSchoolId" as "platformSchoolId",
                    $2 as "status",
                    $3 as "operation",
                    $4 as "entityType",
                    lp."platformPupilId" as "platformEntityId",
                    'upn' as "fieldName",
                    to_jsonb(lp."importedPupilUPN") as "proposedValue"
                from linked_pupils lp
                where lp."upnChanged" = true
                    and not exists (
                        select 1 from imported_school_data_proposed_change prev
                        where prev."status" = $5
                            and prev."entityType" = $4
                            and prev."platformEntityId" = lp."platformPupilId"
                            and prev."fieldName" = 'upn'
                            and prev."proposedValue" = to_jsonb(lp."importedPupilUPN")
                    )
                union all
                select distinct
                    lp."platformSchoolId" as "platformSchoolId",
                    $2 as "status",
                    $3 as "operation",
                    $4 as "entityType",
                    lp."platformPupilId" as "platformEntityId",
                    'firstName' as "fieldName",
                    to_jsonb(lp."importedPupilFirstName") as "proposedValue"
                from linked_pupils lp
                where lp."firstNameChanged" = true
                    and not exists (
                        select 1 from imported_school_data_proposed_change prev
                        where prev."status" = $5
                            and prev."entityType" = $4
                            and prev."platformEntityId" = lp."platformPupilId"
                            and prev."fieldName" = 'firstName'
                            and prev."proposedValue" = to_jsonb(lp."importedPupilFirstName")
                    )
                union all
                select distinct
                    lp."platformSchoolId" as "platformSchoolId",
                    $2 as "status",
                    $3 as "operation",
                    $4 as "entityType",
                    lp."platformPupilId" as "platformEntityId",
                    'lastName' as "fieldName",
                    to_jsonb(lp."importedPupilLastName") as "proposedValue"
                from linked_pupils lp
                where lp."lastNameChanged" = true
                    and not exists (
                        select 1 from imported_school_data_proposed_change prev
                        where prev."status" = $5
                            and prev."entityType" = $4
                            and prev."platformEntityId" = lp."platformPupilId"
                            and prev."fieldName" = 'lastName'
                            and prev."proposedValue" = to_jsonb(lp."importedPupilLastName")
                    )
                union all
                select distinct
                    lp."platformSchoolId" as "platformSchoolId",
                    $2 as "status",
                    $3 as "operation",
                    $4 as "entityType",
                    lp."platformPupilId" as "platformEntityId",
                    'dateOfBirth' as "fieldName",
                    to_jsonb(lp."importedPupilDateOfBirth"::varchar) as "proposedValue"
                from linked_pupils lp
                where lp."dateOfBirthChanged" = true
                    and not exists (
                        select 1 from imported_school_data_proposed_change prev
                        where prev."status" = $5
                            and prev."entityType" = $4
                            and prev."platformEntityId" = lp."platformPupilId"
                            and prev."fieldName" = 'dateOfBirth'
                            and prev."proposedValue" = to_jsonb(lp."importedPupilDateOfBirth"::varchar)
                    )
                union all
                select distinct
                    lp."platformSchoolId" as "platformSchoolId",
                    $2 as "status",
                    $3 as "operation",
                    $4 as "entityType",
                    lp."platformPupilId" as "platformEntityId",
                    'registrationClass' as "fieldName",
                    to_jsonb(lp."importedPupilRegistrationClassId") as "proposedValue"
                from linked_pupils lp
                where lp."registrationClassChanged" = true
                    and not exists (
                        select 1 from imported_school_data_proposed_change prev
                        where prev."status" = $5
                            and prev."entityType" = $4
                            and prev."platformEntityId" = lp."platformPupilId"
                            and prev."fieldName" = 'registrationClass'
                            and prev."proposedValue" = to_jsonb(lp."importedPupilRegistrationClassId")
                    )
                returning *
            `,
            [importedSchoolId, ChangeStatus.PENDING, ChangeOperation.UPDATE, EntityType.PUPIL, ChangeStatus.REJECTED]
        );

        if (IS_COMPLETE_IMPORT) {
            await manager.query(
                `
                    with pupils_to_delete as (
                        select
                            lp.id as "platformPupilId",
                            ls.id::varchar as "platformSchoolId"
                        from lwp_pupil lp
                        join lwp_school ls
                            on ls.id = lp."schoolId"
                        join imported_school is1
                            on is1.id = ls."importedSchoolId"
                        left join imported_student is2
                            on is2.id = lp."importedStudentId"
                        left join imported_school_data_proposed_change isdpc
                            on isdpc."platformSchoolId" = ls.id::varchar
                            and isdpc."operation" = $3
                            and isdpc."entityType" = $4
                            and isdpc."status" = $5
                            and isdpc."platformEntityId" = lp.id
                        where is1."id" = $1
                            and is2.id is null
                            and isdpc.id is null
                    )
                    insert into imported_school_data_proposed_change(
                        "platformSchoolId",
                        "status",
                        "operation",
                        "entityType",
                        "platformEntityId",
                        "fieldName",
                        "proposedValue"
                    )
                    select
                        ptd."platformSchoolId" as "platformSchoolId",
                        $2 as "status",
                        $3 as "operation",
                        $4 as "entityType",
                        ptd."platformPupilId" as "platformEntityId",
                        null as "fieldName",
                        null as "proposedValue"
                    from pupils_to_delete ptd
                    returning *
                `,
                [importedSchoolId, ChangeStatus.PENDING, ChangeOperation.DELETE, EntityType.PUPIL, ChangeStatus.REJECTED]
            );
        }
    }

    /**
     * Currently unreferenced: the LINKING_PUPILS gate relies on pending links alone, because the
     * auto-create sweep resolves every pupil this would count before the gate runs. It cannot
     * return to the gate as-is — it treats a decided-but-not-yet-finalised create (lwpPupilId
     * still null) as pending, which wedges the review open on rows the leader cannot see. Kept
     * for a future return of the reject/ignore flow.
     */
    public async hasImplicitPendingCreateOperations(manager: EntityManager, importedSchoolId: string): Promise<boolean> {
        const [{ hasImplicitPendingCreateOperations }] = await manager.query(
            `
                select exists (
                    select 1
                    from imported_student is1
                    join imported_school is2 on is2.id = is1."schoolId"
                    join lwp_school ls on ls.id = is2."lwpSchoolId"
                    left join imported_school_data_proposed_change isdpc on isdpc."platformSchoolId" = ls.id::varchar
                        and isdpc."entityType" = $2
                        and isdpc."operation" = $3
                        and isdpc."status" = $4
                        and (
                            case
                                when ls."misIntegration" = 'CSV' then
                                    (isdpc."proposedValue" - 'logCreatedAt' - 'logUpdatedAt' - 'id') = (to_jsonb(is1) - 'logCreatedAt' - 'logUpdatedAt' - 'id')
                                else
                                    (isdpc."proposedValue" - 'logCreatedAt' - 'logUpdatedAt') = (to_jsonb(is1) - 'logCreatedAt' - 'logUpdatedAt')
                            end
                            
                        )
                    where is1."schoolId" = $1
                        and is1."lwpPupilId" is null
                        and isdpc.id is null
                ) as "hasImplicitPendingCreateOperations"
            `,
            [importedSchoolId, EntityType.PUPIL, ChangeOperation.CREATE, ChangeStatus.REJECTED]
        );

        return hasImplicitPendingCreateOperations;
    }

    public async applyAutomaticUpdates(manager: EntityManager, importedSchoolId: string): Promise<void> {
        await manager.query(
            `
                update lwp_pupil lp
                set
                    "isPremium" = coalesce(is1."isPremium", lp."isPremium"),
                    gender = coalesce(is1."gender", lp."gender"),
                    "isPreRegistration" = is1."isPreRegistration"
                from imported_student is1
                where lp."importedStudentId" = is1.id
                    and is1."schoolId" = $1
            `,
            [importedSchoolId]
        );
    }
}
