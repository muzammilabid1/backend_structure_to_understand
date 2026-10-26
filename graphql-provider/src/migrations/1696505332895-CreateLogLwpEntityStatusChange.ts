/* eslint-disable */

import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateLogLwpEntityStatusChange1696505332895 implements MigrationInterface {
    name = 'CreateLogLwpEntityStatusChange1696505332895';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `CREATE TABLE "log_lwp_entity_status_change" ("entityId" integer, "newStatus" character varying, "previousStatus" character varying, "entityType" character varying NOT NULL, "id" BIGSERIAL NOT NULL, "logCreatedAt" TIMESTAMP DEFAULT ('now'::text)::timestamp(6) with time zone, CONSTRAINT "PK_8f0a4882178d343278751b226ff" PRIMARY KEY ("id"))`
        );
        await queryRunner.query(`CREATE INDEX "IDX_1eceaee44587d22880d44a5f1d" ON "log_lwp_entity_status_change" ("entityId") `);
        await queryRunner.query(`CREATE INDEX "IDX_d184c5efd0cca96a99114e8c77" ON "log_lwp_entity_status_change" ("entityType") `);

        await queryRunner.query(`
            CREATE FUNCTION lwp_log_entity_status_change()
            RETURNS TRIGGER
            AS $$
            BEGIN
                EXECUTE FORMAT('INSERT INTO log_lwp_entity_status_change SELECT $1.id, $2.%1$I, $1.%1$I, $3', TG_ARGV[0])
                USING OLD, NEW, TG_TABLE_NAME;
            
                RETURN NEW;
            END;
            $$
            LANGUAGE plpgsql
            SECURITY DEFINER;
        `);

        Object.entries({
            lwp_user: 'userStatus',
            lwp_pupil_parent: 'status'
        }).forEach(async ([tbl, field]) => {
            await queryRunner.query(`
                CREATE TRIGGER update_log_lwp_entity_status_change
                AFTER UPDATE ON ${tbl}
                FOR EACH ROW
                WHEN (OLD."${field}" IS DISTINCT FROM NEW."${field}")
                EXECUTE FUNCTION lwp_log_entity_status_change('${field}');
            `);
        });

        await queryRunner.query(`INSERT INTO log_lwp_entity_status_change ("entityId", "newStatus", "previousStatus", "entityType", "logCreatedAt") (
            SELECT id, "userStatus", "logPreviousStatus", 'lwp_user', "logLastStatusChange" from lwp_user lu where lu."logLastStatusChange" is not null
        )`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_d184c5efd0cca96a99114e8c77"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_1eceaee44587d22880d44a5f1d"`);
        await queryRunner.query(`DROP TABLE "log_lwp_entity_status_change"`);
    }
}
