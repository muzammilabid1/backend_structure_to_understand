/* eslint-disable */

import {MigrationInterface, QueryRunner} from "typeorm";

export class AddTriggerToLwpClassPupilForClassStatsUpdate1693828078224 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        queryRunner.query(`
        create or replace
        function update_class_counts_from_lwp_class_pupil()
        returns trigger as
        $$
        begin
            -- TODO eventually deprecate the flag on the table and do all of this in-trigger
            if tg_op != 'INSERT' then
                update
                    lwp_school_class
                set
                    "isStatsNeedUpdate" = true
                where
                    id = old."lwpSchoolClassId";
            end if;

            if tg_op != 'DELETE' then
                update
                    lwp_school_class
                set
                    "isStatsNeedUpdate" = true
                where
                    id = new."lwpSchoolClassId";
            end if;
            
            return new;
        end;

        $$
        language plpgsql;

        drop trigger if exists lwp_class_pupil_update_class_counts on lwp_class_pupil;
        create trigger lwp_class_pupil_update_class_counts
        before insert or update or delete
        on
            lwp_class_pupil
        for each row execute function update_class_counts_from_lwp_class_pupil();
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        queryRunner.query(`drop trigger lwp_class_pupil_update_class_counts;`)
        queryRunner.query(`drop function update_class_counts_from_lwp_class_pupil;`)
    }

}
