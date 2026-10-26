import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddConvertedFromPreAdmissionPeriodIndexColumnToLwpSchoolClass1785398400000 implements MigrationInterface {
    name = 'AddConvertedFromPreAdmissionPeriodIndexColumnToLwpSchoolClass1785398400000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "lwp_school_class" ADD "convertedFromPreAdmissionPeriodIndex" integer`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "lwp_school_class" DROP COLUMN "convertedFromPreAdmissionPeriodIndex"`);
    }
}
