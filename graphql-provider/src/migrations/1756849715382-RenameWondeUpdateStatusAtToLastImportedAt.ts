import { MigrationInterface, QueryRunner } from 'typeorm';

export class RenameWondeUpdateStatusAtToLastImportedAt1756849715382 implements MigrationInterface {
    name = 'RenameWondeUpdateStatusAtToLastImportedAt1756849715382';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "lwp_school" RENAME COLUMN "wondeUpdateStatusAt" TO "lastImportedAt"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "lwp_school" RENAME COLUMN "lastImportedAt" TO "wondeUpdateStatusAt"`);
    }
}
