import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddModalAndLinkOpenCount1762408740093 implements MigrationInterface {
    name = 'AddModalAndLinkOpenCount1762408740093';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "static_lwp_modal" ADD "openCount" integer NOT NULL DEFAULT '0'`);
        await queryRunner.query(`ALTER TABLE "static_lwp_activity_steps" ADD "linkOpenCount" integer NOT NULL DEFAULT '0'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "static_lwp_activity_steps" DROP COLUMN "linkOpenCount"`);
        await queryRunner.query(`ALTER TABLE "static_lwp_modal" DROP COLUMN "openCount"`);
    }
}
