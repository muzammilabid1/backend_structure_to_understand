import { MigrationInterface, QueryRunner } from 'typeorm';

export class SoftDeleteSurveyOfUsers1698813298332 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE OR REPLACE FUNCTION reset_survey_form_of_users(p_interstitial_form_id integer, p_user_id integer)
            RETURNS void LANGUAGE plpgsql AS $$
            DECLARE 
                v_interstitial_form record;
            BEGIN

                -- Fetch interstitial form details
                SELECT * INTO v_interstitial_form 
                FROM static_lwp_interstitial 
                WHERE id = p_interstitial_form_id;

                -- Check if there are any user interstitials associated with the form
                IF EXISTS (
                    SELECT 1 
                    FROM lwp_user_interstitial 
                    WHERE "interstitialId" = p_interstitial_form_id AND "userId" IS NOT NULL AND "deletedAt" IS NULL
                ) THEN
                    
                    -- Soft delete the user interstitials and set deletedById
                    UPDATE lwp_user_interstitial 
                    SET "deletedAt" = CURRENT_TIMESTAMP, 
                        "deletedById" = p_user_id 
                    WHERE "interstitialId" = p_interstitial_form_id AND "deletedAt" IS NULL;

                    -- Update interstitial form details
                    UPDATE static_lwp_interstitial
                    SET "lastAction" = 'CLEARED',
                        "lastActionAt" = CURRENT_TIMESTAMP
                    WHERE id = p_interstitial_form_id;

                ELSE
                    RAISE EXCEPTION 'There are no users released with this form.';
                END IF;

            END;
            $$;
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP FUNCTION reset_survey_form_of_users;`);
    }
}
