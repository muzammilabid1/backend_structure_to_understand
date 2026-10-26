import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddRejectedImportedAtColumnInImportedSchoolDataProposedChange1760609890294 implements MigrationInterface {
    name = 'AddRejectedImportedAtColumnInImportedSchoolDataProposedChange1760609890294';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "imported_school_data_proposed_change" ADD "rejectedImportedAt" TIMESTAMP`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "imported_school_data_proposed_change" DROP COLUMN "rejectedImportedAt"`);
    }
}
