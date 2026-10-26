/* eslint-disable */

import { query } from "express";
import {MigrationInterface, QueryRunner, Table} from "typeorm";

export class correctLwpUserStatusesBasedOnLwpPupilParents1694009126760 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            create table log_migration_lwp_user_status_corrections (
                user_id bigint primary key,
                old_status varchar(25),
                foreign key (user_id) references lwp_user(id)
            );
        `);

        await queryRunner.query(`
            with relevantUsers as (
                update
                    lwp_user lu
                set
                    "userStatus" = 'INVITED'
                from
                    lwp_pupil_parent lpp
                where
                    lu.id = lpp."parentId"
                    and lu."userStatus" = 'IMPORTED'
                    and lpp.status = 'INVITED'
                returning lu.id as id
            )
            insert
                into
                log_migration_lwp_user_status_corrections (
                    select
                        id,
                        'IMPORTED'
                    from
                        relevantUsers
                );
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        queryRunner.query(`update lwp_user lu set lu."userStatus" = lmlusc.old_status from log_migration_lwp_user_status_corrections lmlusc where lmlusc.user_id = lu.id;`)
    }

}
