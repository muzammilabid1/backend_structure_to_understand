/* eslint-disable */

import {MigrationInterface, QueryRunner} from "typeorm";

export class enableRowLevelSecurity1690885473911 implements MigrationInterface {

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
        const hasLwpUserAlready = await queryRunner.query(`SELECT 1 from pg_roles where rolname='lwpUser'`);

        if (hasLwpUserAlready.length == 0) {
            queryRunner.query(`
            create role "lwpUser";
            create role "lwpAdminUser";
            `);
        }

        queryRunner.query(`grant usage on schema public to "lwpUser";
        grant usage on schema public to "lwpAdminUser";
        grant select, insert, update, delete on all tables in schema public to "lwpUser";
        grant select, insert, update, delete on all tables in schema public to "lwpAdminUser";
        grant usage, select on all sequences in schema public to "lwpUser";
        grant usage, select on all sequences in schema public to "lwpAdminUser";`);

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

        const hasZeus = await queryRunner.query(`SELECT 1 from pg_roles where rolname='zeus'`);

        this.DELETABLE_TABLES.forEach((tblName) => {
            queryRunner.query(`
            alter table ${tblName} enable row level security, force row level security;
            drop policy if exists zeus_perms on ${tblName};
            create policy zeus_perms on ${tblName} to ${hasZeus.length > 0 ? 'zeus' : 'postgres'} using (true);
            drop policy if exists lwpUser_perms on ${tblName};
            create policy lwpUser_perms on ${tblName} to "lwpUser" using (NOT isCurrentlyDeleted('${tblName}', "id")) with check (true);
            drop policy if exists lwpAdminUser_perms on ${tblName};
            create policy lwpAdminUser_perms on ${tblName} to "lwpAdminUser" using (true);
            `);
        });
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        this.DELETABLE_TABLES.forEach((tblName) => {
            queryRunner.query(`
            alter table ${tblName} disable row level security;
            drop policy if exists zeus_perms on ${tblName};
            drop policy if exists lwpUser_perms on ${tblName};
            drop policy if exists lwpAdminUser_perms on ${tblName};
            `);
        });

        queryRunner.query(`
        revoke select, insert, update, delete on all tables in schema public from "lwpUser";
        revoke select, insert, update, delete on all tables in schema public from "lwpAdminUser";
        revoke usage on schema public from "lwpUser";
        revoke usage on schema public from "lwpAdminUser";
        revoke usage, select on all sequences in schema public from "lwpUser";
        revoke usage, select on all sequences in schema public from "lwpAdminUser";
        drop role "lwpUser";
        drop role "lwpAdminUser";
        `);
    }

}
