import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddReadingModeIndexToLwpPupilFeedback1786437456492 implements MigrationInterface {
    name = 'AddReadingModeIndexToLwpPupilFeedback1786437456492';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await this.outsideTransaction(queryRunner, async () => {
            await queryRunner.query(`DROP INDEX CONCURRENTLY IF EXISTS "public"."lwp_pupil_feedback_readingmode_idx"`);
            await queryRunner.query(
                `CREATE INDEX CONCURRENTLY "lwp_pupil_feedback_readingmode_idx" ON "lwp_pupil_feedback" ("readingMode") WHERE "readingMode" IS NOT NULL`
            );
        });
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await this.outsideTransaction(queryRunner, async () => {
            await queryRunner.query(`DROP INDEX CONCURRENTLY IF EXISTS "public"."lwp_pupil_feedback_readingmode_idx"`);
        });
    }

    private async outsideTransaction(queryRunner: QueryRunner, run: () => Promise<void>): Promise<void> {
        const wasInTransaction = queryRunner.isTransactionActive;

        if (wasInTransaction) await queryRunner.commitTransaction();

        try {
            await run();
        } finally {
            if (wasInTransaction) await queryRunner.startTransaction();
        }
    }
}
