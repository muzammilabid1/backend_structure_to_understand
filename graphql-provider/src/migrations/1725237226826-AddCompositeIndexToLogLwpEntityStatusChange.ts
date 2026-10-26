import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCompositeIndexToLogLwpEntityStatusChange1725237226826 implements MigrationInterface {
    name = 'AddCompositeIndexToLogLwpEntityStatusChange1725237226826';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `CREATE INDEX "idx_statusLogs_newStatus_prevStatus_logCreatedAt" ON "log_lwp_entity_status_change" ("newStatus", "previousStatus", "logCreatedAt") `
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."idx_statusLogs_newStatus_prevStatus_logCreatedAt"`);
    }
}
