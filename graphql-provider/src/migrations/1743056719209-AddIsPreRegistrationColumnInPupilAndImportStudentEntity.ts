import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddIsPreRegistrationColumnInPupilAndImportStudentEntity1743056719209 implements MigrationInterface {
    name = 'AddIsPreRegistrationColumnInPupilAndImportStudentEntity1743056719209';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "lwp_pupil" ADD "isPreRegistration" boolean DEFAULT false`);
        await queryRunner.query(`ALTER TABLE "lwp_pupil" ADD "isIgnoredForFutureYearClasses" boolean DEFAULT false`);
        await queryRunner.query(`ALTER TABLE "imported_student" ADD "isPreRegistration" boolean DEFAULT false`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "imported_student" DROP COLUMN "isPreRegistration"`);
        await queryRunner.query(`ALTER TABLE "lwp_pupil" DROP COLUMN "isIgnoredForFutureYearClasses"`);
        await queryRunner.query(`ALTER TABLE "lwp_pupil" DROP COLUMN "isPreRegistration"`);
    }
}
