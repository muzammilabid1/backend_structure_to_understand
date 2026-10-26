import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPeriodToPupilFeedbacks1701688488598 implements MigrationInterface {
    name = 'AddPeriodToPupilFeedbacks1701688488598';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "lwp_pupil_feedback" ADD "periodIndex" integer`);
        await queryRunner.query(
            `ALTER TABLE "lwp_pupil_feedback" ADD CONSTRAINT "FK_e28b6e084362d8ebdcee79f4e27" FOREIGN KEY ("periodIndex") REFERENCES "static_lwp_period"("index") ON DELETE NO ACTION ON UPDATE NO ACTION`
        );
        await queryRunner.query(`
            UPDATE lwp_pupil_feedback lpf
            SET "periodIndex" = iQ."periodIndex"
            FROM (
                SELECT lpf.id AS id, lpt_reading."periodIndex" AS "periodIndex"
                FROM lwp_pupil_feedback lpf
                JOIN lwp_view_reading_log_to_reading_topic lvrltrt
                    ON lvrltrt."pupilFeedbackId" = lpf.id
                JOIN lwp_pupil_topic lpt_reading
                    ON lpt_reading.id = lvrltrt."pupilTopicId"
                WHERE lpf.type = 'READING'
                UNION ALL
                SELECT lpf.id AS id, lpt_activity."periodIndex" AS "periodIndex"
                FROM lwp_pupil_feedback lpf
                LEFT JOIN lwp_pupil_activity lpa
                    ON lpa.id = lpf."activityId"
                LEFT JOIN lwp_pupil_topic lpt_activity
                    ON lpt_activity.id = lpa."topicId"
                WHERE lpf.type = 'ACTIVITY'
            ) iQ
            WHERE
                iQ.id = lpf.id
                AND iQ."periodIndex" IS NOT NULL
        `);
        await queryRunner.query(`
        CREATE FUNCTION lwp_pupil_feedback_history_fill_in_period_index_for_feedbacks_after_pupil_add()
        RETURNS TRIGGER AS
        $$
        declare
        feedback   lwp_pupil_feedback;
        begin
            SELECT * FROM lwp_pupil_feedback lpf
            WHERE
                lpf.id = NEW."lwpPupilFeedbackId"
                AND lpf."periodIndex" IS NULL
            INTO feedback;

            if FOUND then
                UPDATE lwp_pupil_feedback lpf
                SET "periodIndex" = (
                    SELECT ls."curentPeriodIndex"
                    FROM lwp_school ls
                    JOIN lwp_pupil lp
                        ON lp.id = NEW."lwpPupilId"
                    WHERE
                        ls.id = lp."schoolId"
                )
                WHERE lpf.id = NEW."lwpPupilFeedbackId";
            end if;
            
            return NEW;
        end;
        $$
        LANGUAGE PLPGSQL;

        CREATE TRIGGER lwp_pupil_feedback_history_fill_in_period_index_for_feedbacks
        BEFORE INSERT ON lwp_pupil_feedback_history
        FOR EACH ROW
        EXECUTE FUNCTION lwp_pupil_feedback_history_fill_in_period_index_for_feedbacks_after_pupil_add();
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TRIGGER lwp_pupil_feedback_history_fill_in_period_index_for_feedbacks ON lwp_pupil_feedback_history`);
        await queryRunner.query(`DROP FUNCTION lwp_pupil_feedback_history_fill_in_period_index_for_feedbacks_after_pupil_add`);
        await queryRunner.query(`ALTER TABLE "lwp_pupil_feedback" DROP CONSTRAINT "FK_e28b6e084362d8ebdcee79f4e27"`);
        await queryRunner.query(`ALTER TABLE "lwp_pupil_feedback" DROP COLUMN "periodIndex"`);
    }
}
