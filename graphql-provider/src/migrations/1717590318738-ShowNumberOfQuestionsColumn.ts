import { MigrationInterface, QueryRunner } from 'typeorm';

export class ShowNumberOfQuestionsColumn1717590318738 implements MigrationInterface {
    name = 'ShowNumberOfQuestionsColumn1717590318738';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "static_lwp_interstitial" ADD "showQuestion" boolean NOT NULL DEFAULT true`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "static_lwp_interstitial" DROP COLUMN "showQuestion"`);
    }
}
