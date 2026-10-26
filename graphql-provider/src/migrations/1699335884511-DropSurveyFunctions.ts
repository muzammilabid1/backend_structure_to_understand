import { MigrationInterface, QueryRunner } from 'typeorm';

export class DropSurveyFunctions1699335884511 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP FUNCTION IF EXISTS release_survey_form_to_users(integer, integer)`);
        await queryRunner.query(`DROP FUNCTION IF EXISTS reset_survey_form_of_users(integer, integer)`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE OR REPLACE FUNCTION release_survey_form_to_users(p_interstitial_form_id integer, p_user_id integer)
            RETURNS void LANGUAGE plpgsql AS $$
            DECLARE 
                v_interstitial_form static_lwp_interstitial%ROWTYPE;
            BEGIN
                -- Fetch interstitial form by ID, excluding soft-deleted records
                SELECT * INTO v_interstitial_form FROM static_lwp_interstitial
                WHERE id = p_interstitial_form_id AND "deletedAt" IS NULL;
            
                IF NOT FOUND THEN
                    RAISE EXCEPTION 'Interstitial Form not found';
                END IF;
            
                -- Insert or update records in lwp_user_interstitial for all users that meet the criteria
                WITH targeted_users AS (
                    SELECT id FROM lwp_user
                    WHERE type = ANY(ARRAY(SELECT jsonb_array_elements_text(v_interstitial_form."userTypes")))
                    AND "deletedAt" IS NULL
                )
                INSERT INTO lwp_user_interstitial ("userId", "interstitialId", "logCreatedById", "logUpdatedById")
                SELECT tu.id, v_interstitial_form.id, p_user_id, p_user_id
                FROM targeted_users tu
                ON CONFLICT ("userId", "interstitialId") WHERE "deletedAt" IS NULL
                DO UPDATE SET "logUpdatedById" = p_user_id;
            
                -- Update interstitial form with last action and last action time
                UPDATE static_lwp_interstitial SET "lastAction" = 'RELEASED', "lastActionAt" = CURRENT_TIMESTAMP, "logUpdatedById" = p_user_id
                WHERE id = v_interstitial_form.id AND "deletedAt" IS NULL;
            
            END;
            $$;
        `);

        await queryRunner.query(`
            CREATE OR REPLACE FUNCTION reset_survey_form_of_users(p_interstitial_form_id integer, p_user_id integer)
            RETURNS void LANGUAGE plpgsql AS $$
            DECLARE 
                v_rows_affected integer;
            BEGIN
                -- Soft delete the user interstitials and set deletedById
                UPDATE lwp_user_interstitial 
                SET "deletedAt" = CURRENT_TIMESTAMP, 
                    "deletedById" = p_user_id 
                WHERE "interstitialId" = p_interstitial_form_id 
                AND "deletedAt" IS NULL;
            
                -- Get the number of rows affected by the previous UPDATE
                GET DIAGNOSTICS v_rows_affected = ROW_COUNT;
            
                -- Check if any rows were affected
                IF v_rows_affected > 0 THEN
                    -- Update the interstitial form to mark as cleared
                    UPDATE static_lwp_interstitial
                    SET "lastAction" = 'CLEARED', 
                        "lastActionAt" = CURRENT_TIMESTAMP
                    WHERE id = p_interstitial_form_id;
                ELSE
                    -- If no rows were updated, no users were associated with the form
                    RAISE EXCEPTION 'There are no users released with this form.';
                END IF;
            END;
            $$;
        `);
    }
}
