import { MigrationInterface, QueryRunner } from 'typeorm';

export class MakeAllForeignKeyConstraintsDeferrable1739367459818 implements MigrationInterface {
    name = 'MakeAllForeignKeyConstraintsDeferrable1739367459818';

    public async up(queryRunner: QueryRunner): Promise<void> {
        const statements = await queryRunner.query(`
            SELECT
                'ALTER TABLE ' || quote_ident(nsp.nspname) || '.' || quote_ident(cls.relname) ||
                ' ALTER CONSTRAINT ' || quote_ident(con.conname) ||
                ' DEFERRABLE INITIALLY IMMEDIATE;'
            AS stmt
            FROM pg_constraint con
            JOIN pg_class cls ON cls.oid = con.conrelid
            JOIN pg_namespace nsp ON nsp.oid = cls.relnamespace
            WHERE
                nsp.nspname = current_schema
                AND con.contype = 'f'
                AND NOT con.condeferrable;
        `);

        for (const { stmt } of statements) {
            await queryRunner.query(stmt);
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        const statements = await queryRunner.query(`
            SELECT
                'ALTER TABLE ' || quote_ident(nsp.nspname) || '.' || quote_ident(cls.relname) ||
                ' ALTER CONSTRAINT ' || quote_ident(con.conname) ||
                ' NOT DEFERRABLE;'
            AS stmt
            FROM pg_constraint con
            JOIN pg_class cls ON cls.oid = con.conrelid
            JOIN pg_namespace nsp ON nsp.oid = cls.relnamespace
            WHERE
                nsp.nspname = current_schema
                AND con.contype = 'f'
                AND con.condeferrable;
        `);

        for (const { stmt } of statements) {
            await queryRunner.query(stmt);
        }
    }
}
