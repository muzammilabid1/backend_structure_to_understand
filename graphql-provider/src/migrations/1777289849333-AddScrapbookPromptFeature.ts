import { FeatureCode, FeatureStatus } from 'lwp-shared';
import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddScrapbookPromptFeature1777289849333 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
               INSERT INTO static_lwp_features
               (
                   name,
                   status,
                   code
               )
               VALUES
               (
                   'Ready Teddy scrapbook prompt',
                   '${FeatureStatus.NO_SCHOOLS}',
                   '${FeatureCode.READY_TEDDY_SCRAPBOOK_PROMPT}'
               )
           `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
               DELETE FROM static_lwp_features
               WHERE code = '${FeatureCode.READY_TEDDY_SCRAPBOOK_PROMPT}'
           `);
    }
}
