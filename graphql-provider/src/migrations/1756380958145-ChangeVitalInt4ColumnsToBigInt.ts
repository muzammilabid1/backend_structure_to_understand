import { MigrationInterface, QueryRunner } from 'typeorm';

export class ChangeVitalInt4ColumnsToBigInt1756380958145 implements MigrationInterface {
    name = 'ChangeVitalInt4ColumnsToBigInt1756380958145';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "log_lwp_entity_status_change" ALTER COLUMN "entityId" TYPE bigint`);
        await queryRunner.query(`ALTER TABLE "log_static_lwp_email_template_history" ALTER COLUMN "schoolId" TYPE bigint`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "log_lwp_entity_status_change" ALTER COLUMN "entityId" TYPE integer`);
        await queryRunner.query(`ALTER TABLE "log_static_lwp_email_template_history" ALTER COLUMN "schoolId" TYPE integer`);
    }
}
