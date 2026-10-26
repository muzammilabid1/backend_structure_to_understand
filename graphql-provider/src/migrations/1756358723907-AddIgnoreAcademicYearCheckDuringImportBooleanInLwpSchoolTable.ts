import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddIgnoreAcademicYearCheckDuringImportBooleanInLwpSchoolTable1756358723907 implements MigrationInterface {
    name = 'AddIgnoreAcademicYearCheckDuringImportBooleanInLwpSchoolTable1756358723907';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "lwp_school" ADD "ignoreAcademicYearCheckDuringImport" boolean NOT NULL DEFAULT false`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "lwp_school" DROP COLUMN "ignoreAcademicYearCheckDuringImport"`);
    }
}
