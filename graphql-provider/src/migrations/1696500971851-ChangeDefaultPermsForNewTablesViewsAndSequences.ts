/* eslint-disable */

import { MigrationInterface, QueryRunner } from 'typeorm';

export class ChangeDefaultPermsForNewTablesViewsAndSequences1696500971851 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        ['lwpUser', 'lwpAdminUser'].forEach(async (user) => {
            await queryRunner.query(`
                alter default privileges in schema public grant select, insert, update, delete on tables to "${user}";
                alter default privileges in schema public grant usage, select on sequences to "${user}";
            `);
        });
    }

    public async down(queryRunner: QueryRunner): Promise<void> {}
}
