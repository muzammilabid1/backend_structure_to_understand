import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateNewTableForStaticLwpDataQuery1714140686475 implements MigrationInterface {
    name = 'CreateNewTableForStaticLwpDataQuery1714140686475';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `CREATE TABLE "static_lwp_data_query" ("name" character varying NOT NULL, "type" character varying NOT NULL, "category" character varying, "status" character varying NOT NULL, "description" character varying, "query" character varying NOT NULL, "order" integer NOT NULL, "csvFileLocation" character varying, "lastCsvGenerated" TIMESTAMP, "id" BIGSERIAL NOT NULL, "logCreatedAt" TIMESTAMP DEFAULT ('now'::text)::timestamp(6) with time zone, "logUpdatedAt" TIMESTAMP NOT NULL DEFAULT ('now'::text)::timestamp(6) with time zone, "logCreatedById" bigint, "logUpdatedById" bigint, CONSTRAINT "PK_ac50439d624b11bfe4a80c74ac2" PRIMARY KEY ("id"))`
        );
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_0f4265aca2a028752221d4569c" ON "static_lwp_data_query" ("name") `);
        await queryRunner.query(`CREATE INDEX "IDX_31c9495dc85864eca933b6f928" ON "static_lwp_data_query" ("logCreatedById") `);
        await queryRunner.query(`CREATE INDEX "IDX_9c317a875d0f7923e5885535fc" ON "static_lwp_data_query" ("logUpdatedById") `);
        await queryRunner.query(
            `ALTER TABLE "static_lwp_data_query" ADD CONSTRAINT "FK_31c9495dc85864eca933b6f9280" FOREIGN KEY ("logCreatedById") REFERENCES "lwp_user"("id") ON DELETE SET NULL ON UPDATE NO ACTION`
        );
        await queryRunner.query(
            `ALTER TABLE "static_lwp_data_query" ADD CONSTRAINT "FK_9c317a875d0f7923e5885535fc2" FOREIGN KEY ("logUpdatedById") REFERENCES "lwp_user"("id") ON DELETE SET NULL ON UPDATE NO ACTION`
        );

        await queryRunner.query(`
            INSERT INTO static_lwp_data_query (
                "name",
                "type",
                "category",
                "status",
                "description",
                "query",
                "order",
                "csvFileLocation",
                "lastCsvGenerated",
                "logCreatedAt",
                "logUpdatedAt",
                "logCreatedById",
                "logUpdatedById"
            )
            SELECT
                name,
                'ADMIN' AS type,
                NULL AS category,
                'PUBLISHED' AS status,
                NULL AS description,
                "sqlQuery" AS query,
                "order",
                "csvFileLocation",
                "lastCsvGenerated",
                "logCreatedAt",
                "logUpdatedAt",
                "logCreatedById",
                "logUpdatedById"
            FROM static_lwp_admin_query
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "static_lwp_data_query" DROP CONSTRAINT "FK_9c317a875d0f7923e5885535fc2"`);
        await queryRunner.query(`ALTER TABLE "static_lwp_data_query" DROP CONSTRAINT "FK_31c9495dc85864eca933b6f9280"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_9c317a875d0f7923e5885535fc"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_31c9495dc85864eca933b6f928"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_0f4265aca2a028752221d4569c"`);
        await queryRunner.query(`DROP TABLE "static_lwp_data_query"`);
    }
}
