import {MigrationInterface, QueryRunner} from "typeorm";

export class AddLastAccess1730456138106 implements MigrationInterface {
    name = 'AddLastAccess1730456138106'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "lwp_user" ADD "lastAccess" TIMESTAMP`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "lwp_user" DROP COLUMN "lastAccess"`);
    }

}
