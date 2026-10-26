import {MigrationInterface, QueryRunner} from "typeorm";

export class migration1689166792879 implements MigrationInterface {
    name = 'migration1689166792879'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "lwp_notification" ADD "userType" character varying`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "lwp_notification" DROP COLUMN "userType"`);
    }

}
