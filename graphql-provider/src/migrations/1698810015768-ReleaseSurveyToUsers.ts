import { MigrationInterface, QueryRunner } from 'typeorm';

export class ReleaseSurveyToUsers1698810015768 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE OR REPLACE FUNCTION release_survey_form_to_users(p_interstitial_form_id integer, p_user_id integer)
            RETURNS void LANGUAGE plpgsql AS $$
            DECLARE 
            v_interstitial_form record;
            v_user record;
            v_users_cursor refcursor;
            v_current_user_id integer;
            BEGIN
                -- Fetch interstitial form by ID, excluding soft-deleted records
                SELECT INTO v_interstitial_form * FROM static_lwp_interstitial
                WHERE id = p_interstitial_form_id AND "deletedAt" IS NULL;

                IF NOT FOUND THEN
                    RAISE EXCEPTION 'Interstitial Form not found';
                END IF;

                -- Logic to release interstitial form
                FOR v_user IN (SELECT * FROM lwp_user WHERE type = ANY(ARRAY(SELECT jsonb_array_elements_text(v_interstitial_form."userTypes"))) AND "deletedAt" IS NULL)
                LOOP
                    -- Insert or update the record in lwp_user_interstitial, excluding soft-deleted records
                    INSERT INTO lwp_user_interstitial ("userId", "interstitialId", "logCreatedById", "logUpdatedById") 
                    VALUES (v_user.id, v_interstitial_form.id, p_user_id, p_user_id)
                    ON CONFLICT ("userId", "interstitialId") WHERE "deletedAt" IS NULL
                    DO UPDATE SET "logUpdatedById" = p_user_id;
                END LOOP;

                -- Update interstitial form with last action and last action time
                UPDATE static_lwp_interstitial SET "lastAction" = 'RELEASED', "lastActionAt" = CURRENT_TIMESTAMP, "logUpdatedById" = p_user_id
                WHERE id = p_interstitial_form_id AND "deletedAt" IS NULL;

            END;
            $$;
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP FUNCTION release_survey_form_to_users;`);
    }
}
