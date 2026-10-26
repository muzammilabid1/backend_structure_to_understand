import {MigrationInterface, QueryRunner} from "typeorm";

export class migration1662480398625 implements MigrationInterface {
    name = 'migration1662480398625'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "static_lwp_year_group" ADD "hiddenFromLists" boolean NOT NULL DEFAULT false`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "static_lwp_year_group" DROP COLUMN "hiddenFromLists"`);
    }

}
