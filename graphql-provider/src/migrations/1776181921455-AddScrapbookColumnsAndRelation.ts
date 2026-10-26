import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddScrapbookColumnsAndRelation1776181921455 implements MigrationInterface {
    name = 'AddScrapbookColumnsAndRelation1776181921455';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "static_lwp_topic" ADD "scrapbookPrompt" character varying`);
        await queryRunner.query(`ALTER TABLE "lwp_class_topic" ADD "scrapbookPrompt" character varying`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "lwp_class_topic" DROP COLUMN "scrapbookPrompt"`);
        await queryRunner.query(`ALTER TABLE "static_lwp_topic" DROP COLUMN "scrapbookPrompt"`);
    }
}
