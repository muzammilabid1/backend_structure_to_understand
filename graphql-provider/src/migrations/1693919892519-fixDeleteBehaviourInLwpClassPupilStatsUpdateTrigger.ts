import {MigrationInterface, QueryRunner} from "typeorm";

export class fixDeleteBehaviourInLwpClassPupilStatsUpdateTrigger1693919892519 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`create or replace
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

            if tg_op = 'DELETE' then
                return old;
            else
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
        language plpgsql;`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`create or replace
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
        language plpgsql;`);
    }

}
