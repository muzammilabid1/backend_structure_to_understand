import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddLinkedClassShouldBeActiveColumnToImportedSchoolClassTable1747255003357 implements MigrationInterface {
    name = 'AddLinkedClassShouldBeActiveColumnToImportedSchoolClassTable1747255003357';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "imported_school_class" ADD "linkedClassShouldBeActive" boolean NOT NULL DEFAULT false`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "imported_school_class" DROP COLUMN "linkedClassShouldBeActive"`);
    }
}
