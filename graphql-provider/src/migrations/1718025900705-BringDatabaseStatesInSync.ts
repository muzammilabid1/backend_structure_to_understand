import { MigrationInterface, QueryRunner } from 'typeorm';

export class BringDatabaseStatesInSync1718025900705 implements MigrationInterface {
    name = 'BringDatabaseStatesInSync1718025900705';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "lwp_activity_tags" DROP CONSTRAINT "FK_9fe005a233ecfdb9d8b6f3c388c"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_9fe005a233ecfdb9d8b6f3c388"`);

        await queryRunner.query(`DROP TRIGGER lwp_pupil_feedback_history_sync_updates ON lwp_pupil_feedback`);
        await queryRunner.query(`DROP TRIGGER lwp_pupil_feedback_history_sync_inserts ON lwp_pupil_feedback`);
        await queryRunner.query(`DROP FUNCTION lwp_pupil_feedback_history_sync`);

        await queryRunner.query(`ALTER TABLE "lwp_pupil_feedback" DROP COLUMN "pupilId"`);
        await queryRunner.query(`ALTER TABLE "lwp_pupil_feedback" DROP COLUMN "pupilTopicId"`);
        await queryRunner.query(
            `ALTER TABLE "static_lwp_activity_steps" ALTER COLUMN "selectedModalId" TYPE bigint USING "selectedModalId"::bigint`
        );
        await queryRunner.query(`CREATE INDEX "IDX_4b04a09a2c69ed35d50b000d0c" ON "lwp_activity_tags" ("staticLwpActivityTagId") `);
        await queryRunner.query(
            `ALTER TABLE "lwp_activity_tags" ADD CONSTRAINT "FK_4b04a09a2c69ed35d50b000d0c8" FOREIGN KEY ("staticLwpActivityTagId") REFERENCES "static_lwp_activity_tag"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "lwp_activity_tags" DROP CONSTRAINT "FK_4b04a09a2c69ed35d50b000d0c8"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_4b04a09a2c69ed35d50b000d0c"`);
        await queryRunner.query(
            `ALTER TABLE "static_lwp_activity_steps" ALTER COLUMN "selectedModalId" TYPE integer USING "selectedModalId"::integer`
        );
        await queryRunner.query(`ALTER TABLE "lwp_pupil_feedback" ADD "pupilTopicId" bigint`);
        await queryRunner.query(`ALTER TABLE "lwp_pupil_feedback" ADD "pupilId" bigint`);

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

        await queryRunner.query(`CREATE INDEX "IDX_9fe005a233ecfdb9d8b6f3c388" ON "lwp_activity_tags" ("staticLwpActivityTagId") `);
        await queryRunner.query(
            `ALTER TABLE "lwp_activity_tags" ADD CONSTRAINT "FK_9fe005a233ecfdb9d8b6f3c388c" FOREIGN KEY ("staticLwpActivityTagId") REFERENCES "static_lwp_activity_tag"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
        );
    }
}
