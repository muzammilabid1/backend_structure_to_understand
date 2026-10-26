import { MigrationInterface, QueryRunner } from 'typeorm';

export class moveLogMigrationLwpUserStatusCorrectionsToBackupTable1694082692588 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `alter table log_migration_lwp_user_status_corrections drop constraint log_migration_lwp_user_status_corrections_user_id_fkey;`
        );
        await queryRunner.query(
            `alter table log_migration_lwp_user_status_corrections rename to backup_20230906_lwp_user_status_corrections;`
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `alter table backup_20230906_lwp_user_status_corrections rename to log_migration_lwp_user_status_corrections;`
        );
    }
}
