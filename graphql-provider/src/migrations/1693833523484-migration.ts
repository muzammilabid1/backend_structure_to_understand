import {MigrationInterface, QueryRunner} from "typeorm";

export class migration1693833523484 implements MigrationInterface {
    name = 'migration1693833523484'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "lwp_school" DROP COLUMN "IsReadingLogsEnabled"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "lwp_school" ADD "IsReadingLogsEnabled" boolean NOT NULL DEFAULT false`);
    }

}
