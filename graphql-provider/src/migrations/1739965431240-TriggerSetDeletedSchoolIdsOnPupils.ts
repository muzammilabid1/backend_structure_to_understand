import {MigrationInterface, QueryRunner} from "typeorm";

export class TriggerSetDeletedSchoolIdsOnPupils1739965431240 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE FUNCTION do_set_deleted_school_id_for_pupil()
                RETURNS TRIGGER
                LANGUAGE PLPGSQL
                VOLATILE
                AS $$
            BEGIN
                NEW."deletedSchoolId" := OLD."schoolId";
                RETURN NEW;
            END
            $$;
        `);

        await queryRunner.query(`
            CREATE TRIGGER set_deleted_school_id_for_pupil
            BEFORE UPDATE ON lwp_pupil
            FOR EACH ROW
            WHEN (OLD."schoolId" IS NOT NULL AND NEW."schoolId" IS NULL)
            EXECUTE FUNCTION do_set_deleted_school_id_for_pupil();
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP FUNCTION do_set_deleted_school_id_for_pupil CASCADE;`)
    }

}
