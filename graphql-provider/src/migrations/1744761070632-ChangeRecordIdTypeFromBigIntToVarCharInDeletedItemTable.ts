import { MigrationInterface, QueryRunner } from 'typeorm';

export class ChangeRecordIdTypeFromBigIntToVarCharInDeletedItemTable1744761070632 implements MigrationInterface {
    name = 'ChangeRecordIdTypeFromBigIntToVarCharInDeletedItemTable1744761070632';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_4db45ebcfe911a159ec87fb82c"`);
        await queryRunner.query(`ALTER TABLE "deleted_item" DROP COLUMN "recordId"`);
        await queryRunner.query(
            `DELETE FROM "typeorm_metadata" WHERE "type" = $1 AND "name" = $2 AND "database" = $3 AND "schema" = $4 AND "table" = $5`,
            ['GENERATED_COLUMN', 'recordId', 'lwp', 'public', 'deleted_item']
        );
        await queryRunner.query(
            `ALTER TABLE "deleted_item" ADD "recordId" character varying GENERATED ALWAYS AS ((record ->> 'id'::text)) STORED`
        );
        await queryRunner.query(
            `DELETE FROM "typeorm_metadata" WHERE "type" = $1 AND "name" = $2 AND "database" = $3 AND "schema" = $4 AND "table" = $5`,
            ['GENERATED_COLUMN', 'recordId', 'lwp', 'public', 'deleted_item']
        );
        await queryRunner.query(
            `INSERT INTO "typeorm_metadata"("database", "schema", "table", "type", "name", "value") VALUES ($1, $2, $3, $4, $5, $6)`,
            ['lwp', 'public', 'deleted_item', 'GENERATED_COLUMN', 'recordId', "(record ->> 'id'::text)"]
        );
        await queryRunner.query(`CREATE INDEX "IDX_4db45ebcfe911a159ec87fb82c" ON "deleted_item" ("source", "recordId") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_4db45ebcfe911a159ec87fb82c"`);
        await queryRunner.query(
            `DELETE FROM "typeorm_metadata" WHERE "type" = $1 AND "name" = $2 AND "database" = $3 AND "schema" = $4 AND "table" = $5`,
            ['GENERATED_COLUMN', 'recordId', 'lwp', 'public', 'deleted_item']
        );
        await queryRunner.query(`ALTER TABLE "deleted_item" DROP COLUMN "recordId"`);
        await queryRunner.query(
            `INSERT INTO "typeorm_metadata"("database", "schema", "table", "type", "name", "value") VALUES ($1, $2, $3, $4, $5, $6)`,
            ['lwp', 'public', 'deleted_item', 'GENERATED_COLUMN', 'recordId', "(record ->> 'id'::text)::bigint"]
        );
        await queryRunner.query(
            `ALTER TABLE "deleted_item" ADD "recordId" bigint GENERATED ALWAYS AS ((record ->> 'id'::text)::bigint) STORED`
        );
        await queryRunner.query(`CREATE INDEX "IDX_4db45ebcfe911a159ec87fb82c" ON "deleted_item" ("source", "recordId") `);
    }
}
