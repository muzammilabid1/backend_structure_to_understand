import { Injectable } from '@nestjs/common';
import type { ImportStatus } from 'src/data-import/types/import-status';
import { Connection, type EntityManager } from 'typeorm';

@Injectable()
export class ImportStatusService {
    constructor(private readonly connection: Connection) {}

    public async getImportStatus(manager: EntityManager, importedSchoolId: string): Promise<ImportStatus> {
        const [{ importStatus }] = await manager.query(
            `
                select ls."importStatus"
                from lwp_school ls
                where ls."importedSchoolId" = $1
            `,
            [importedSchoolId]
        );

        return importStatus;
    }

    public async setImportStatus(manager: EntityManager | null, importedSchoolId: string, importStatus: ImportStatus): Promise<void> {
        await (manager ?? this.connection).query(
            `
                update lwp_school ls
                set "importStatus" = $1,
                "lastImportedAt" = CURRENT_TIMESTAMP
                where ls."importedSchoolId" = $2
            `,
            [importStatus, importedSchoolId]
        );
    }
}
