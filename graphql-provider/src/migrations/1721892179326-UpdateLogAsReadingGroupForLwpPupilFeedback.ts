import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateLogAsReadingGroupForLwpPupilFeedback1721892179326 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `ALTER TABLE "lwp_pupil_feedback" ADD "normalisedBookName" character varying GENERATED ALWAYS AS (trim(lower("bookName"))) STORED`
        );

        await queryRunner.query(`CREATE INDEX "IDX_95e1919661dd4da2685b47ac87" ON "lwp_pupil_feedback" ("normalisedBookName") `);

        await queryRunner.query(`UPDATE lwp_pupil_feedback lpf
            SET "logOnReadingAsGroupTab" = true
            WHERE lpf.id IN (
                SELECT lpf.id
                FROM lwp_pupil_feedback lpf
                LEFT JOIN lwp_pupil_feedback_history lpfh ON lpfh."lwpPupilFeedbackId" = lpf.id
                LEFT JOIN lwp_pupil lp ON lp.id = lpfh."lwpPupilId"
                GROUP BY lpf.id
                HAVING COUNT(lp.id) > 1
            );
`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`UPDATE lwp_pupil_feedback lpf
            SET "logOnReadingAsGroupTab" = false
            WHERE lpf.id IN (
                SELECT lpf.id
                FROM lwp_pupil_feedback lpf
                LEFT JOIN lwp_pupil_feedback_history lpfh ON lpfh."lwpPupilFeedbackId" = lpf.id
                LEFT JOIN lwp_pupil lp ON lp.id = lpfh."lwpPupilId"
                GROUP BY lpf.id
                HAVING COUNT(lp.id) > 1
            );
`);

        await queryRunner.query(`DROP INDEX "public"."IDX_95e1919661dd4da2685b47ac87"`);

        await queryRunner.query(`ALTER TABLE "lwp_pupil_feedback" DROP COLUMN "normalisedBookName"`);
    }
}
