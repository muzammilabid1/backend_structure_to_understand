import { Injectable, Logger } from '@nestjs/common';
import { ChangeStatus } from 'src/data-import/types/change-status';
import type { EntityManager } from 'typeorm';

@Injectable()
export class EntityChangeService {
    public deleteStaleChanges(manager: EntityManager, importedSchoolId: string): Promise<void> {
        Logger.debug('DELETING STALE CHANGES');

        return manager.query(
            `
                delete from imported_school_data_proposed_change isdpc
                using imported_school is1
                where isdpc."platformSchoolId" = is1."lwpSchoolId"::varchar
                    and is1.id = $1
                    and isdpc."status" != $2
            `,
            [importedSchoolId, ChangeStatus.REJECTED]
        );
    }

    public async hasPendingChanges(manager: EntityManager, importedSchoolId: string): Promise<boolean> {
        const [{ hasPendingChanges }] = await manager.query(
            `
                select exists (
                    select 1
                    from imported_school is1
                    join imported_school_data_proposed_change isdpc
                        on isdpc."platformSchoolId" = is1."lwpSchoolId"::varchar
                    where is1.id = $1
                        and isdpc."status" = $2
                ) as "hasPendingChanges"
            `,
            [importedSchoolId, ChangeStatus.PENDING]
        );

        return hasPendingChanges;
    }
}
