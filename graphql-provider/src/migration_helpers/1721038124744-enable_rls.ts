import { QueryRunner } from 'typeorm';

/**
 * This file is VERSIONED. Do NOT edit - it is included in migrations.
 * Instead, create a new version of the file with new contents to include in future migrations if you are changing it.
 * Do not rewrite history!
 */

/**
 * Enables row-level security protection for deleted items for a given table,
 * using the standard LWP policies for deletedAt access (blocking for the app user).
 *
 * @param queryRunner the query runner to use to enable it
 * @param tblName the name of the table to enable RLS on
 */
export async function enableRLS(queryRunner: QueryRunner, tblName: string): Promise<void> {
    const hasZeus = await queryRunner.query(`SELECT 1 from pg_roles where rolname='zeus'`);

    await queryRunner.query(`
        alter table ${tblName} enable row level security, force row level security;
        drop policy if exists zeus_perms on ${tblName};
        create policy zeus_perms on ${tblName} to ${hasZeus.length > 0 ? 'zeus' : 'postgres'} using (true);
        drop policy if exists lwpUser_perms on ${tblName};
        create policy lwpUser_perms on ${tblName} to "lwpUser" using (("deletedAt" is null) or (NOT isCurrentlyDeleted('${tblName}', "id"))) with check (true);
        drop policy if exists lwpAdminUser_perms on ${tblName};
        create policy lwpAdminUser_perms on ${tblName} to "lwpAdminUser" using (true);
    `);
}

/**
 * Disables row-level security for a table, assuming it currently has
 * the standard LWP policies for deletedAt access (blocking for the app user).
 *
 * @param queryRunner the query runner to use to disable it
 * @param tblName the name of the table to disable RLS on
 */
export async function disableRLS(queryRunner: QueryRunner, tblName: string): Promise<void> {
    await queryRunner.query(`
        alter table ${tblName} disable row level security;
        drop policy if exists zeus_perms on ${tblName};
        drop policy if exists lwpUser_perms on ${tblName};
        drop policy if exists lwpAdminUser_perms on ${tblName};
    `);
}
