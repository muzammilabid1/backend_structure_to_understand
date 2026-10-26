import { MigrationInterface, QueryRunner } from 'typeorm';

export class RevokeCronSchemaPermissionToDBUser1767774003932 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            revoke usage on schema cron from "lwpUser";
            revoke usage on schema cron from "lwpAdminUser";
            revoke select, insert, update, delete on all tables in schema cron from "lwpUser";
            revoke select, insert, update, delete on all tables in schema cron from "lwpAdminUser";
            revoke usage, select on all sequences in schema cron from "lwpUser";
            revoke usage, select on all sequences in schema cron from "lwpAdminUser";
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {}
}
