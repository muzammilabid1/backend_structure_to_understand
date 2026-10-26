import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateLwpSchoolFeatureColumnsFromDateToBoolean1727424646571 implements MigrationInterface {
    name = 'UpdateLwpSchoolFeatureColumnsFromDateToBoolean1727424646571';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "lwp_school" ADD "isParentFeedbackReplyFeatureEnabled" boolean DEFAULT false`);
        await queryRunner.query(`ALTER TABLE "lwp_school" ADD "isParentFeedbackStickerFeatureEnabled" boolean DEFAULT false`);

        await queryRunner.query(`
            UPDATE "lwp_school" 
            SET "isParentFeedbackReplyFeatureEnabled" = true 
            WHERE "parentFeedbackReplyFeatureEnabledAt" IS NOT NULL
        `);

        await queryRunner.query(`
            UPDATE "lwp_school" 
            SET "isParentFeedbackStickerFeatureEnabled" = true 
            WHERE "parentFeedbackStickerFeatureEnabledAt" IS NOT NULL
        `);

        // Remove the old date columns
        await queryRunner.query(`ALTER TABLE "lwp_school" DROP COLUMN "parentFeedbackReplyFeatureEnabledAt"`);
        await queryRunner.query(`ALTER TABLE "lwp_school" DROP COLUMN "parentFeedbackStickerFeatureEnabledAt"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "lwp_school" ADD "parentFeedbackStickerFeatureEnabledAt" date`);
        await queryRunner.query(`ALTER TABLE "lwp_school" ADD "parentFeedbackReplyFeatureEnabledAt" date`);

        // Restore the old date columns' values based on the new boolean columns
        await queryRunner.query(`
            UPDATE "lwp_school"
            SET "parentFeedbackReplyFeatureEnabledAt" = NOW()
            WHERE "isParentFeedbackReplyFeatureEnabled" = true
        `);

        await queryRunner.query(`
            UPDATE "lwp_school"
            SET "parentFeedbackStickerFeatureEnabledAt" = NOW()
            WHERE "isParentFeedbackStickerFeatureEnabled" = true
        `);

        // Remove the new boolean columns
        await queryRunner.query(`ALTER TABLE "lwp_school" DROP COLUMN "isParentFeedbackStickerFeatureEnabled"`);
        await queryRunner.query(`ALTER TABLE "lwp_school" DROP COLUMN "isParentFeedbackReplyFeatureEnabled"`);
    }
}
