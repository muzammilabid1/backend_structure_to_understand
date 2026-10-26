import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDefaultMessageLayoutToLwpEmailTemplate1709532692852 implements MigrationInterface {
    name = 'AddDefaultMessageLayoutToLwpEmailTemplate1709532692852';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "lwp_email_template" ADD "defaultMessageLayout" character varying`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "lwp_email_template" DROP COLUMN "defaultMessageLayout"`);
    }
}
