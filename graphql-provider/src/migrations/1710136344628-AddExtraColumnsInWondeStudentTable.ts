import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddExtraColumnsInWondeStudentTable1710136344628 implements MigrationInterface {
    name = 'AddExtraColumnsInWondeStudentTable1710136344628';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "wonde_student" ADD "ethnicity" character varying`);
        await queryRunner.query(`ALTER TABLE "wonde_student" ADD "ethnicity_code" character varying`);
        await queryRunner.query(`ALTER TABLE "wonde_student" ADD "english_as_additional_language" boolean`);
        await queryRunner.query(`ALTER TABLE "wonde_student" ADD "english_as_additional_language_status" character varying`);
        await queryRunner.query(`ALTER TABLE "wonde_student" ADD "sen_status" character varying`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "wonde_student" DROP COLUMN "sen_status"`);
        await queryRunner.query(`ALTER TABLE "wonde_student" DROP COLUMN "english_as_additional_language_status"`);
        await queryRunner.query(`ALTER TABLE "wonde_student" DROP COLUMN "english_as_additional_language"`);
        await queryRunner.query(`ALTER TABLE "wonde_student" DROP COLUMN "ethnicity_code"`);
        await queryRunner.query(`ALTER TABLE "wonde_student" DROP COLUMN "ethnicity"`);
    }
}
