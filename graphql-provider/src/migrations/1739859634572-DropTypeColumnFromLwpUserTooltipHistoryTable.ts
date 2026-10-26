import { MigrationInterface, QueryRunner } from 'typeorm';

export class DropTypeColumnFromLwpUserTooltipHistoryTable1739859634572 implements MigrationInterface {
    name = 'DropTypeColumnFromLwpUserTooltipHistoryTable1739859634572';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "lwp_user_tooltip_history" DROP COLUMN "type"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "lwp_user_tooltip_history" ADD "type" character varying`);
    }
}
