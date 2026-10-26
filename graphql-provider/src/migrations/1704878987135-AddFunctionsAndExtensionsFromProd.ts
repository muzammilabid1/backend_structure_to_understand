/* eslint-disable */

import {MigrationInterface, QueryRunner} from "typeorm";

export class AddFunctionsAndExtensionsFromProd1704878987135 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        queryRunner.query('CREATE EXTENSION IF NOT EXISTS tablefunc;');
        queryRunner.query(`
        CREATE OR REPLACE FUNCTION public.lwp_id_gen()
        RETURNS bigint
        LANGUAGE plpgsql
        AS $function$
        DECLARE
            our_epoch BIGINT := 1609459200;
            seq_id BIGINT;
            now_secs BIGINT;
        BEGIN
            SELECT nextval('lwp_global_seq') INTO seq_id;
            SELECT FLOOR(EXTRACT(EPOCH FROM clock_timestamp())) INTO now_secs;
            return ((now_secs - our_epoch) + (seq_id << 4) + FLOOR(RANDOM() * 16));
        END;
        $function$
        ;
        `);
        queryRunner.query(`
        CREATE OR REPLACE FUNCTION public.lwp_bigenough(bigint)
        RETURNS double precision
        LANGUAGE sql
        IMMUTABLE
        AS $function$select case when $1 >= 3 then $1::float else null end$function$
        ;
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
    }

}
