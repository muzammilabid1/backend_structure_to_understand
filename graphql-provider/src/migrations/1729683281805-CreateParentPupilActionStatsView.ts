import {MigrationInterface, QueryRunner} from "typeorm";

export class CreateParentPupilActionStatsView1729683281805 implements MigrationInterface {
    name = 'CreateParentPupilActionStatsView1729683281805'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // We create the view with no data to avoid frontloading all the work here; we can do this overnight at the next refresh
        await queryRunner.query(`CREATE MATERIALIZED VIEW "lwp_view_parent_pupil_action_stats" AS (select "actionId", "userId", "parentId", "pupilId", param1, param2, param3, time, id from log_parent_pupil_action) WITH NO DATA`);
        await queryRunner.query(`ALTER MATERIALIZED VIEW "lwp_view_parent_pupil_action_stats" OWNER TO "lwpUser"`);
        // Managing these indices through TypeORM isn't supported in our current version of TypeORM - so whilst these are declared in the code too, we have to manually migrate them.
        // It was added in https://github.com/typeorm/typeorm/pull/9414 - but that needs TypeORM from 2023 to work.
        await queryRunner.query(`CREATE UNIQUE INDEX ON "lwp_view_parent_pupil_action_stats" (id)`);
        await queryRunner.query(`CREATE INDEX ON "lwp_view_parent_pupil_action_stats" ("userId")`);
        await queryRunner.query(`CREATE INDEX ON "lwp_view_parent_pupil_action_stats" ("time")`);
        await queryRunner.query(`CREATE INDEX ON "lwp_view_parent_pupil_action_stats" ("pupilId", "parentId")`);
        await queryRunner.query(`CREATE INDEX ON "lwp_view_parent_pupil_action_stats" ("actionId", "param2")`);
        await queryRunner.query(`INSERT INTO "typeorm_metadata"("database", "schema", "table", "type", "name", "value") VALUES (DEFAULT, $1, DEFAULT, $2, $3, $4)`, ["public","MATERIALIZED_VIEW","lwp_view_parent_pupil_action_stats","select \"actionId\", \"userId\", \"parentId\", \"pupilId\", param1, param2, param3, time, id from log_parent_pupil_action"]);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DELETE FROM "typeorm_metadata" WHERE "type" = $1 AND "name" = $2 AND "schema" = $3`, ["MATERIALIZED_VIEW","lwp_view_parent_pupil_action_stats","public"]);
        await queryRunner.query(`DROP MATERIALIZED VIEW "lwp_view_parent_pupil_action_stats"`);
    }

}
