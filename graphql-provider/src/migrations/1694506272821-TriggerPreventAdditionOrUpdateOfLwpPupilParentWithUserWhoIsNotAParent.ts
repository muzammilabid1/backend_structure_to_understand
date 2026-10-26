/* eslint-disable */

import {MigrationInterface, QueryRunner} from "typeorm";

export class TriggerPreventAdditionOrUpdateOfLwpPupilParentWithUserWhoIsNotAParent1694506272821 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
        CREATE FUNCTION check_lwp_pupil_parent_user_is_a_parent ()
            RETURNS TRIGGER
            AS $$
        DECLARE
            isParent boolean;
        BEGIN
            SELECT
                type = 'PARENT' INTO isParent
            FROM
                lwp_user
            WHERE
                id = NEW."parentId";
            
            IF NOT isParent THEN
                RAISE EXCEPTION 'parent of an lwp_pupil_parent must be a parent user';
            END IF;
        
            RETURN NEW;
        END;
        $$
        LANGUAGE plpgsql;
        
        
        CREATE TRIGGER check_lwp_pupil_parent_users_must_be_parents
            BEFORE INSERT OR UPDATE OF "parentId" ON lwp_pupil_parent
            FOR EACH ROW
            EXECUTE FUNCTION check_lwp_pupil_parent_user_is_a_parent ();
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        queryRunner.query(`
        DROP TRIGGER check_lwp_pupil_parent_users_must_be_parents;
        DROP FUNCTION check_lwp_pupil_parent_user_is_a_parent;
        `);
    }

}
