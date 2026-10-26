import { MigrationInterface, QueryRunner } from 'typeorm';

export class DoNotInsertEmptyPupilIdsIntoLwpPupilFeedbackHistory1701192784440 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
        DROP TRIGGER lwp_pupil_feedback_history_sync_inserts ON lwp_pupil_feedback;
        CREATE TRIGGER lwp_pupil_feedback_history_sync_inserts
        BEFORE INSERT ON lwp_pupil_feedback
        FOR EACH ROW
        WHEN (NEW."pupilId" IS NOT NULL)
        EXECUTE FUNCTION lwp_pupil_feedback_history_sync();

        DROP TRIGGER lwp_pupil_feedback_history_sync_updates ON lwp_pupil_feedback;
        CREATE TRIGGER lwp_pupil_feedback_history_sync_updates
        BEFORE UPDATE OF "pupilId" ON lwp_pupil_feedback
        FOR EACH ROW
        WHEN (OLD."pupilId" IS DISTINCT FROM NEW."pupilId" AND NEW."pupilId" IS NOT NULL)
        EXECUTE FUNCTION lwp_pupil_feedback_history_sync();
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
        DROP TRIGGER lwp_pupil_feedback_history_sync_inserts ON lwp_pupil_feedback;
        CREATE TRIGGER lwp_pupil_feedback_history_sync_inserts
        BEFORE INSERT ON lwp_pupil_feedback
        FOR EACH ROW
        EXECUTE FUNCTION lwp_pupil_feedback_history_sync();

        DROP TRIGGER lwp_pupil_feedback_history_sync_updates ON lwp_pupil_feedback;
        CREATE TRIGGER lwp_pupil_feedback_history_sync_updates
        BEFORE UPDATE OF "pupilId" ON lwp_pupil_feedback
        FOR EACH ROW
        WHEN (OLD."pupilId" IS DISTINCT FROM NEW."pupilId")
        EXECUTE FUNCTION lwp_pupil_feedback_history_sync();
        `);
    }
}
