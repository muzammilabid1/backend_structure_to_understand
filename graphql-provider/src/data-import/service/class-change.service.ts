import { forwardRef, Inject, Injectable, InternalServerErrorException } from '@nestjs/common';
import { SchoolClassService } from 'src/api/service/school_class.service';
import { IS_COMPLETE_IMPORT } from 'src/data-import/constants';
import { ChangeOperation } from 'src/data-import/types/change-operation';
import { ChangeStatus } from 'src/data-import/types/change-status';
import type { ClassChange } from 'src/data-import/types/class-change';
import { EntityType } from 'src/data-import/types/entity-type';
import { Connection, type EntityManager } from 'typeorm';

@Injectable()
export class ClassChangeService {
    constructor(
        private readonly connection: Connection,
        @Inject(forwardRef(() => SchoolClassService)) private readonly schoolClassService: SchoolClassService
    ) {}

    public async getPendingChanges(importedSchoolId: string, operation?: ChangeOperation): Promise<Array<ClassChange>> {
        return this.connection.query(
            `
                select isdpc.*
                from imported_school is1
                join imported_school_data_proposed_change isdpc
                    on isdpc."platformSchoolId" = is1."lwpSchoolId"::varchar
                where "importedSchoolId" = $1
                    and isdpc.status = $2
                    and isdpc."entityType" = $3
                    ${operation ? 'and isdpc.operation = $4' : ''}  
            `,
            [importedSchoolId, ChangeStatus.PENDING, EntityType.CLASS, operation]
        );
    }

    public async selectChange(manager: EntityManager, importedSchoolId: string, id: string, userId: string): Promise<void> {
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
            [importedSchoolId, id, ChangeStatus.SELECTED, EntityType.CLASS]
        );

        const change = result?.[0]?.[0];

        switch (change?.operation) {
            case ChangeOperation.UPDATE:
                const columnMapping = {
                    name: 'name'
                };

                const column = columnMapping[change.fieldName];

                if (column) {
                    const _result = await manager.query(
                        `
                            with old_values as (
                                select * from lwp_school_class where id = $1
                            )
                            update lwp_school_class
                                set "${column}" = $2
                            from old_values
                            where lwp_school_class.id = old_values.id
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
                    //         EntityType.CLASS,
                    //         ChangeOperation.UPDATE,
                    //         change.platformEntityId,
                    //         change.fieldName,
                    //         JSON.stringify(result[0][0][column])
                    //     ]
                    // );
                }

                return;

            case ChangeOperation.DELETE:
                if (IS_COMPLETE_IMPORT) {
                    await this.schoolClassService.deleteSchoolClass(change.platformEntityId, userId, manager);
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
            [importedSchoolId, id, ChangeStatus.REJECTED, EntityType.CLASS, ChangeStatus.PENDING]
        );
    }

    public async generateChanges(manager: EntityManager, importedSchoolId: string, _isCompleteImport: boolean): Promise<void> {
        await manager.query(
            `
                with linked_classes as (
                    select
                        lsc.id as "platformClassId",
                        isc.id as "importedClassId",
                        isc."name" as "importedClassName",
                        (lsc.name != isc.name) as "nameChanged",
                        ls.id::varchar as "platformSchoolId"
                    from lwp_school ls
                    join imported_school is1
                        on is1.id = ls."importedSchoolId"
                        and is1."lwpSchoolId" = ls.id
                    join lwp_school_class lsc on lsc."schoolId" = ls.id and lsc."isRegistrationClass" = true
                        and lsc."periodIndex" = ls."curentPeriodIndex"
                    join imported_school_class isc on isc."lwpSchoolClassId" = lsc.id
                    where is1.id = $1
                        and (
                            lsc.name != isc.name
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
                select
                    lc."platformSchoolId" as "platformSchoolId",
                    $2 as "status",
                    $3 as "operation",
                    $4 as "entityType",
                    lc."platformClassId" as "platformEntityId",
                    'name' as "fieldName",
                    to_jsonb(lc."importedClassName") as "proposedValue"
                from linked_classes lc
                where lc."nameChanged" = true
                returning *
            `,
            [importedSchoolId, ChangeStatus.PENDING, ChangeOperation.UPDATE, EntityType.CLASS]
        );

        if (IS_COMPLETE_IMPORT) {
            await manager.query(
                `
                    with classes_to_delete as (
                        select
                            lsc.id as "platformClassId",
                            ls.id::varchar as "platformSchoolId"
                        from lwp_school_class lsc
                        join lwp_school ls
                            on ls.id = lsc."schoolId"
                        join imported_school is1
                            on is1.id = ls."importedSchoolId"
                        left join imported_school_class isc
                            on isc.id = lsc."importedSchoolClassId"
                        left join imported_school_data_proposed_change isdpc
                            on isdpc."platformSchoolId" = ls.id::varchar
                            and isdpc."operation" = $3
                            and isdpc."entityType" = $4
                            and isdpc."status" = $5
                            and isdpc."platformEntityId" = lsc.id
                        where is1."id" = $1
                            and lsc."isRegistrationClass" = true
                            and lsc."periodIndex" = ls."curentPeriodIndex"
                            and isc.id is null
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
                        ctd."platformSchoolId" as "platformSchoolId",
                        $2 as "status",
                        $3 as "operation",
                        $4 as "entityType",
                        ctd."platformClassId" as "platformEntityId",
                        null as "fieldName",
                        null as "proposedValue"
                    from classes_to_delete ctd
                    returning *
                `,
                [importedSchoolId, ChangeStatus.PENDING, ChangeOperation.DELETE, EntityType.CLASS, ChangeStatus.REJECTED]
            );
        }
    }

    /**
     * Currently unreferenced: the LINKING_CLASSES gate relies on pending links alone, because the
     * auto-create sweep resolves every class this would count before the gate runs. It cannot
     * return to the gate as-is — it treats a decided-but-not-yet-finalised create
     * (lwpSchoolClassId still null) as pending, which wedges the review open on rows the leader
     * cannot see. Kept for a future return of the reject/ignore flow.
     */
    public async hasImplicitPendingCreateOperations(manager: EntityManager, importedSchoolId: string): Promise<boolean> {
        const [{ hasImplicitPendingCreateOperations }] = await manager.query(
            `
                select exists (
                    select 1
                    from imported_school_class isc
                    join imported_school is2 on is2.id = isc."schoolId"
                    join lwp_school ls on ls.id = is2."lwpSchoolId"
                    left join imported_school_data_proposed_change isdpc on isdpc."platformSchoolId" = ls.id::varchar
                        and isdpc."entityType" = $2
                        and isdpc."operation" = $3
                        and isdpc."status" = $4
                        and (
                            case
                                when ls."misIntegration" = 'CSV' then
                                    (isdpc."proposedValue" - 'logCreatedAt' - 'logUpdatedAt' - 'id') = (to_jsonb(isc) - 'logCreatedAt' - 'logUpdatedAt' - 'id')
                                else
                                    (isdpc."proposedValue" - 'logCreatedAt' - 'logUpdatedAt') = (to_jsonb(isc) - 'logCreatedAt' - 'logUpdatedAt')
                            end
                        )
                    where isc."schoolId" = $1
                        and isc."periodIndex" = ls."curentPeriodIndex"
                        and isc."lwpSchoolClassId" is null
                        and isdpc.id is null
                ) as "hasImplicitPendingCreateOperations"
            `,
            [importedSchoolId, EntityType.CLASS, ChangeOperation.CREATE, ChangeStatus.REJECTED]
        );

        return hasImplicitPendingCreateOperations;
    }
}
