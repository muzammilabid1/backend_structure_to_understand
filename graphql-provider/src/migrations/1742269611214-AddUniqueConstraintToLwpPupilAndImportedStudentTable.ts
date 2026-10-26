/* eslint-disable */

import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUniqueConstraintToLwpPupilAndImportedStudentTable1742269611214 implements MigrationInterface {
    name = 'AddUniqueConstraintToLwpPupilAndImportedStudentTable1742269611214';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // N.B. The below ran against dev, but cannot not be run on staging or production at the time of writing.
        // await queryRunner.query(
        //     `CREATE UNIQUE INDEX "lwp_pupil_schoolId_upn_unique" ON "lwp_pupil" ("schoolId", "UPN") WHERE "UPN" != '[Unknown]'`
        // );
        // await queryRunner.query(
        //     `CREATE UNIQUE INDEX "imported_student_schoolId_upn_unique" ON "imported_student" ("schoolId", "UPN") WHERE "UPN" != '[Unknown]'`
        // );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // await queryRunner.query(`DROP INDEX "public"."imported_student_schoolId_upn_unique"`);
        // await queryRunner.query(`DROP INDEX "public"."lwp_pupil_schoolId_upn_unique"`);
    }
}
