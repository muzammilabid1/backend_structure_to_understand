import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddIsGroupAcrossClassesBooleanInLwpSchoolClassTable1768964534891 implements MigrationInterface {
    name = 'AddIsGroupAcrossClassesBooleanInLwpSchoolClassTable1768964534891';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "lwp_school_class" ADD "isGroupAcrossClasses" boolean NOT NULL DEFAULT false`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "lwp_school_class" DROP COLUMN "isGroupAcrossClasses"`);
    }
}
