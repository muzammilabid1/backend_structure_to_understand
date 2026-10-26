import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateReadOnlyDatabaseUser1750236142155 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            do
            $$
            begin
                if not exists (
                    select from pg_roles where rolname = 'lwpRoUser'
                ) then
                    create role "lwpRoUser";
                end if;
            end
            $$;

            grant select on all tables in schema public to "lwpRoUser";
            grant usage, select on all sequences in schema public to "lwpRoUser";
            alter default privileges in schema public grant select on tables to "lwpRoUser";
            alter default privileges in schema public grant usage, select on sequences to "lwpRoUser";
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            drop role "lwpRoUser";
        `);
    }
}
