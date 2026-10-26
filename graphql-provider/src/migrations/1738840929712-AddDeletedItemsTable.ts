import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDeletedItemsTable1738840929712 implements MigrationInterface {
    name = 'AddDeletedItemsTable1738840929712';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `CREATE TABLE "deleted_item" ("id" BIGSERIAL NOT NULL, "deletedAt" TIMESTAMP DEFAULT ('now'::text)::timestamp(6) with time zone, "recordId" bigint GENERATED ALWAYS AS ((record ->> 'id'::text)::bigint) STORED, "source" character varying NOT NULL, "record" jsonb NOT NULL, CONSTRAINT "PK_5e22a7faae28e3c07157d3ab71b" PRIMARY KEY ("id"))`
        );
        await queryRunner.query(`INSERT INTO "typeorm_metadata"("database", "schema", "table", "type", "name", "value") VALUES (current_database(), $1, $2, $3, $4, $5)`, ["public","deleted_item","GENERATED_COLUMN","recordId","(record ->> 'id'::text)::bigint"]);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "deleted_item"`);
    }
}
