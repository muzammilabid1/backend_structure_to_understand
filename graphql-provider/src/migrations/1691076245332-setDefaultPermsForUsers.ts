/* eslint-disable */

import {MigrationInterface, QueryRunner} from "typeorm";

export class setDefaultPermsForUsers1691076245332 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        const hasZeus = await queryRunner.query(`SELECT 1 from pg_roles where rolname='zeus'`);

        queryRunner.query(`
        alter default privileges for role "${hasZeus.length > 0 ? 'zeus' : 'postgres'}" in schema public grant select, insert, update, delete on tables to "lwpUser";
        alter default privileges for role "${hasZeus.length > 0 ? 'zeus' : 'postgres'}" in schema public grant select, insert, update, delete on tables to "lwpAdminUser";
        `)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
    }

}
