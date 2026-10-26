import { FeedbackType } from 'src/api/model';
import { MigrationInterface, QueryRunner } from 'typeorm';

export class FixReadingTypeValuesInNonReadingFeedbackEntries1771920495872 implements MigrationInterface {
    name = 'FixReadingTypeValuesInNonReadingFeedbackEntries1771920495872';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "lwp_pupil_feedback" ALTER COLUMN "readingType" DROP DEFAULT`);

        await queryRunner.query(
            `
                UPDATE "lwp_pupil_feedback"
                SET "readingType" = NULL
                WHERE
                    "type" != '${FeedbackType.READING}'
                    AND "readingType" IS NOT NULL
                ;
            `
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "lwp_pupil_feedback" ALTER COLUMN "readingType" SET DEFAULT 'SOMETHING_ELSE'`);
    }
}
