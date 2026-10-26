import { MigrationInterface, QueryRunner } from 'typeorm';

export class RenamePupilFactFunctionAndAddCleanupFunction1774337910177 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        // Unschedule the existing cron job
        await queryRunner.query(`
            SELECT cron.unschedule('clean-up-and-insert-pupil-fact-job-4am');
        `);

        // Rename the existing upsert function from clean_up_and_insert_pupil_fact to upsert_pupil_fact
        await queryRunner.query(`
            ALTER FUNCTION clean_up_and_insert_pupil_fact() RENAME TO upsert_pupil_fact;
        `);

        // Create the new clean_up_and_insert_pupil_fact function that deletes then reinserts
        // It reuses upsert_pupil_fact() to avoid duplicating the insert logic
        await queryRunner.query(`
            CREATE OR REPLACE FUNCTION clean_up_and_insert_pupil_fact()
            RETURNS void AS $$
            BEGIN
                DELETE FROM analytics_pupil_fact
                WHERE "timeKey" = (
                    SELECT index FROM static_lwp_period slp
                    WHERE slp."isCurrentPeriod" = true
                );

                PERFORM upsert_pupil_fact();
            END;
            $$ LANGUAGE plpgsql;
        `);

        // Reschedule the cron job to call the renamed upsert function
        await queryRunner.query(`
            SELECT cron.schedule(
                'upsert-pupil-fact-job-4am',
                '0 4 * * *',
                $$ SELECT upsert_pupil_fact(); $$
            );
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Unschedule the new cron job
        await queryRunner.query(`
            SELECT cron.unschedule('upsert-pupil-fact-job-4am');
        `);

        // Drop the cleanup function
        await queryRunner.query(`
            DROP FUNCTION IF EXISTS clean_up_and_insert_pupil_fact();
        `);

        // Rename back to original
        await queryRunner.query(`
            ALTER FUNCTION upsert_pupil_fact() RENAME TO clean_up_and_insert_pupil_fact;
        `);

        // Reschedule the original cron job
        await queryRunner.query(`
            SELECT cron.schedule(
                'clean-up-and-insert-pupil-fact-job-4am',
                '0 4 * * *',
                $$ SELECT clean_up_and_insert_pupil_fact(); $$
            );
        `);
    }
}
