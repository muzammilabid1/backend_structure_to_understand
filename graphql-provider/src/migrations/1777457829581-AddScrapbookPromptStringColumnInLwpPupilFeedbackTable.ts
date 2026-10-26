import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddScrapbookPromptStringColumnInLwpPupilFeedbackTable1777457829581 implements MigrationInterface {
    name = 'AddScrapbookPromptStringColumnInLwpPupilFeedbackTable1777457829581';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "lwp_pupil_feedback" ADD "scrapbookPrompt" character varying`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "lwp_pupil_feedback" DROP COLUMN "scrapbookPrompt"`);
    }
}
