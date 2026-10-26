import {MigrationInterface, QueryRunner} from "typeorm";

export class migration1680102966148 implements MigrationInterface {
    name = 'migration1680102966148'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "lwp_user" ADD "adminRestrictions" jsonb`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "lwp_user" DROP COLUMN "adminRestrictions"`);
    }

}
