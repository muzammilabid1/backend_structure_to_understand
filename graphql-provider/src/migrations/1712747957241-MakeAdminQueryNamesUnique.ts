import { MigrationInterface, QueryRunner } from 'typeorm';

export class MakeAdminQueryNamesUnique1712747957241 implements MigrationInterface {
    name = 'MakeAdminQueryNamesUnique1712747957241';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_bc62fe8bd60d9e4d84722f198c" ON "static_lwp_admin_query" ("name") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_bc62fe8bd60d9e4d84722f198c"`);
    }
}
