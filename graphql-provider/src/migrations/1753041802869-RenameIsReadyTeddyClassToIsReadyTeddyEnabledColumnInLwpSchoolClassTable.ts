import { MigrationInterface, QueryRunner } from 'typeorm';

export class RenameIsReadyTeddyClassToIsReadyTeddyEnabledColumnInLwpSchoolClassTable1753041802869 implements MigrationInterface {
    name = 'RenameIsReadyTeddyClassToIsReadyTeddyEnabledColumnInLwpSchoolClassTable1753041802869';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "imported_school_class" DROP COLUMN "isReadyTeddyClass"`);
        await queryRunner.query(`ALTER TABLE "lwp_school_class" RENAME COLUMN "isReadyTeddyClass" TO "isReadyTeddyEnabled"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "imported_school_class" ADD "isReadyTeddyClass" boolean NOT NULL DEFAULT false`);
        await queryRunner.query(`ALTER TABLE "lwp_school_class" RENAME COLUMN "isReadyTeddyEnabled" TO "isReadyTeddyClass"`);
    }
}
