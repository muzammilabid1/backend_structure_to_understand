import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddIsReadyTeddyClassColumnInImportedAndLwpSchoolClassTable1741120002053 implements MigrationInterface {
    name = 'AddIsReadyTeddyClassColumnInImportedAndLwpSchoolClassTable1741120002053';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "lwp_school_class" ADD "isReadyTeddyClass" boolean NOT NULL DEFAULT false`);
        await queryRunner.query(`ALTER TABLE "imported_school_class" ADD "isReadyTeddyClass" boolean NOT NULL DEFAULT false`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "imported_school_class" DROP COLUMN "isReadyTeddyClass"`);
        await queryRunner.query(`ALTER TABLE "lwp_school_class" DROP COLUMN "isReadyTeddyClass"`);
    }
}
