import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateTriggerToUpdatePupilFeedbackHistoryWhenPupilIdUpdatesOnPupilFeedback1701189443589 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
        CREATE FUNCTION lwp_pupil_feedback_history_sync()
        RETURNS TRIGGER AS
        $$
        begin
            if tg_op = 'UPDATE' then
                DELETE FROM
                    lwp_pupil_feedback_history
                WHERE
                    "lwpPupilFeedbackId" = OLD.id
                    AND "lwpPupilId" = OLD."pupilId";
            end if;

            INSERT INTO
                lwp_pupil_feedback_history
                ("lwpPupilId", "lwpPupilFeedbackId")
            VALUES (NEW."pupilId", NEW.id);
            
            return new;
        end;
        $$
        LANGUAGE PLPGSQL;

        CREATE TRIGGER lwp_pupil_feedback_history_sync_inserts
        BEFORE INSERT ON lwp_pupil_feedback
        FOR EACH ROW
        EXECUTE FUNCTION lwp_pupil_feedback_history_sync();

        CREATE TRIGGER lwp_pupil_feedback_history_sync_updates
        BEFORE UPDATE OF "pupilId" ON lwp_pupil_feedback
        FOR EACH ROW
        WHEN (OLD."pupilId" IS DISTINCT FROM NEW."pupilId")
        EXECUTE FUNCTION lwp_pupil_feedback_history_sync();
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TRIGGER lwp_pupil_feedback_history_sync_updates ON lwp_pupil_feedback`);
        await queryRunner.query(`DROP TRIGGER lwp_pupil_feedback_history_sync_inserts ON lwp_pupil_feedback`);
        await queryRunner.query(`DROP FUNCTION lwp_pupil_feedback_history_sync`);
    }
}
