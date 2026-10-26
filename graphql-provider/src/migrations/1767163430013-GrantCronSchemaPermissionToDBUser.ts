import { MigrationInterface, QueryRunner } from 'typeorm';

export class GrantCronSchemaPermissionToDBUser1767163430013 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            grant usage on schema cron to "lwpUser";
            grant usage on schema cron to "lwpAdminUser";
            grant select, insert, update, delete on all tables in schema cron to "lwpUser";
            grant select, insert, update, delete on all tables in schema cron to "lwpAdminUser";
            grant usage, select on all sequences in schema cron to "lwpUser";
            grant usage, select on all sequences in schema cron to "lwpAdminUser";
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            revoke usage on schema cron to "lwpUser";
            revoke usage on schema cron to "lwpAdminUser";
            revoke select, insert, update, delete on all tables in schema cron to "lwpUser";
            revoke select, insert, update, delete on all tables in schema cron to "lwpAdminUser";
            revoke usage, select on all sequences in schema cron to "lwpUser";
            revoke usage, select on all sequences in schema cron to "lwpAdminUser";
        `);
    }
}
