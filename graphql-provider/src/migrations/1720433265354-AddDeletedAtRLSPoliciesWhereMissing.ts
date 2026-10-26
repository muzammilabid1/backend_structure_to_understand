/* eslint-disable */

import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDeletedAtRLSPoliciesWhereMissing1720433265354 implements MigrationInterface {
    NEW_DELETABLE_TABLES = [
        'static_lwp_activity',
        'static_lwp_activity_steps',
        'static_lwp_activity_tag',
        'static_lwp_email_template',
        'static_lwp_school_tag',
        'static_lwp_topic_tag',
        'static_lwp_topic',
        'static_lwp_topic_domain'
    ];

    public async up(queryRunner: QueryRunner): Promise<void> {
        const hasZeus = await queryRunner.query(`SELECT 1 from pg_roles where rolname='zeus'`);

        this.NEW_DELETABLE_TABLES.forEach((tblName) => {
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
        this.NEW_DELETABLE_TABLES.forEach((tblName) => {
            queryRunner.query(`
            alter table ${tblName} disable row level security;
            drop policy if exists zeus_perms on ${tblName};
            drop policy if exists lwpUser_perms on ${tblName};
            drop policy if exists lwpAdminUser_perms on ${tblName};
            `);
        });
    }
}
