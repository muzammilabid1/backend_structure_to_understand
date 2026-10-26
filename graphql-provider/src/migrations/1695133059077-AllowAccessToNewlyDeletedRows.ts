/* eslint-disable */

import {MigrationInterface, QueryRunner} from "typeorm";

export class AllowAccessToNewlyDeletedRows1695133059077 implements MigrationInterface {
    DELETABLE_TABLES = [
        'lwp_class_topic',
        'lwp_demo_activity_feedback',
        'lwp_pupil_feedback_media',
        'lwp_pupil_feedback',
        'lwp_school_holiday',
        'static_lwp_tag',
        'lwp_user_interstitial',
        'lwp_pupil_parent',
        'lwp_pupil_topic',
        'lwp_pupil_activity',
        'lwp_pupil',
        'lwp_school_class',
        'lwp_school',
        'static_lwp_interstitial',
        'lwp_user'
    ];

    public async up(queryRunner: QueryRunner): Promise<void> {
        queryRunner.query(`
        create or replace function isCurrentlyDeleted (tblName varchar, _id bigint)
            returns boolean
            as $$
        declare
            currentDeletedAt timestamp;
        begin
            execute format('select "deletedAt" from %I where id = %L', tblName, _id) into currentDeletedAt;
            return currentDeletedAt is not null;
        end;
        $$
        language plpgsql
        security definer stable;
        `);

        this.DELETABLE_TABLES.forEach((tblName) => {
            queryRunner.query(`
            alter policy lwpUser_perms on ${tblName} using (("deletedAt" is null) or (NOT isCurrentlyDeleted('${tblName}', "id")));
            `);
        });
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        this.DELETABLE_TABLES.forEach((tblName) => {
            queryRunner.query(`
            alter policy lwpUser_perms on ${tblName} using ("deletedAt" is null);
            `);
        });

        await queryRunner.query(`drop function isCurrentlyDeleted;`);
    }
}
