import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddEnableReadingAsGroupColumnToLwpSchool1698911307269 implements MigrationInterface {
    name = 'AddEnableReadingAsGroupColumnToLwpSchool1698911307269';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "lwp_school" ADD "enableReadingAsGroup" boolean NOT NULL DEFAULT false`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "lwp_school" DROP COLUMN "enableReadingAsGroup"`);
    }
}
