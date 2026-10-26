import { MigrationInterface, QueryRunner } from 'typeorm';

export class RenameImportedDataTablesSchoolIdColumns1756178216770 implements MigrationInterface {
    name = 'RenameImportedDataTablesSchoolIdColumns1756178216770';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "imported_school_data_proposed_link" RENAME COLUMN "importedSchoolId" TO "platformSchoolId"`);
        await queryRunner.query(
            `ALTER TABLE "imported_school_data_proposed_change" RENAME COLUMN "importedSchoolId" TO "platformSchoolId"`
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `ALTER TABLE "imported_school_data_proposed_change" RENAME COLUMN "platformSchoolId" TO "importedSchoolId"`
        );
        await queryRunner.query(`ALTER TABLE "imported_school_data_proposed_link" RENAME COLUMN "platformSchoolId" TO "importedSchoolId"`);
    }
}
