import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMatchCriteriaToImportedSchoolDataProposedLink1789430400000 implements MigrationInterface {
    name = 'AddMatchCriteriaToImportedSchoolDataProposedLink1789430400000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "imported_school_data_proposed_link" ADD "matchCriteria" integer NOT NULL DEFAULT 0`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "imported_school_data_proposed_link" DROP COLUMN "matchCriteria"`);
    }
}
