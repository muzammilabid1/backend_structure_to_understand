import { MigrationInterface, QueryRunner } from 'typeorm';

export class ImportedDataChangeValueColumnTypeToJsonb1754411004464 implements MigrationInterface {
    name = 'ImportedDataChangeValueColumnTypeToJsonb1754411004464';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "imported_school_data_proposed_change" DROP COLUMN "proposedValue"`);
        await queryRunner.query(`ALTER TABLE "imported_school_data_proposed_change" ADD "proposedValue" jsonb`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "imported_school_data_proposed_change" DROP COLUMN "proposedValue"`);
        await queryRunner.query(`ALTER TABLE "imported_school_data_proposed_change" ADD "proposedValue" character varying`);
    }
}
