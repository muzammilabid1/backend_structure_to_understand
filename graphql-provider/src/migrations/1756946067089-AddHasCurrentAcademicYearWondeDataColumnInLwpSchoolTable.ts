import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddHasCurrentAcademicYearWondeDataColumnInLwpSchoolTable1756946067089 implements MigrationInterface {
    name = 'AddHasCurrentAcademicYearWondeDataColumnInLwpSchoolTable1756946067089';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "lwp_school" ADD "hasCurrentAcademicYearWondeData" boolean NOT NULL DEFAULT false`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "lwp_school" DROP COLUMN "hasCurrentAcademicYearWondeData"`);
    }
}
