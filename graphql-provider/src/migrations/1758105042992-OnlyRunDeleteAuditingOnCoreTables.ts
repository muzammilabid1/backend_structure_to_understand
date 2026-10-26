import {MigrationInterface, QueryRunner} from "typeorm";

export class OnlyRunDeleteAuditingOnCoreTables1758105042992 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE SCHEMA partman;`);
        await queryRunner.query(`CREATE SCHEMA partman_templates;`);
        await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS pg_partman WITH SCHEMA partman;`);
        await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS pg_cron;`);

        // Keep three months of cron run details so we can troubleshoot if needed
        await queryRunner.query(`SELECT cron.schedule('0 0 * * *', $$DELETE
        FROM cron.job_run_details
        WHERE end_time < now() - interval '3 months'$$);`)

        await queryRunner.query(`
            CREATE OR REPLACE FUNCTION do_create_delete_auditing_triggers()
                RETURNS TRIGGER
                LANGUAGE plpgsql
                VOLATILE
                SECURITY DEFINER
                AS $$
            DECLARE
                table_row record;
            BEGIN
                FOR table_row IN
                        SELECT
                            x.table_name
                        FROM
                            information_schema.tables x
                            LEFT JOIN information_schema.triggers t ON t.event_object_table = x.table_name
                                AND t.event_object_catalog = x.table_catalog
                                AND t.event_object_schema = x.table_schema
                                AND t.trigger_name = 'delete_auditing'
                        WHERE
                            t.trigger_name IS NULL
                            AND (
                                x.table_name ^@ 'static_lwp_'
                                OR x.table_name ^@ 'lwp_'
                            )
                            AND x.table_type <> 'VIEW'
                            AND x.table_schema = TG_TABLE_SCHEMA
                    LOOP
                        EXECUTE format('CREATE TRIGGER delete_auditing '
                                    'BEFORE DELETE ON %I '
                                    'FOR EACH ROW '
                                    'EXECUTE FUNCTION do_delete_auditing ();', table_row.table_name);
                    END LOOP;
                RETURN NULL;
            END;
            $$;`);

        await queryRunner.query(`
            DO $$
            DECLARE
                table_row record;
            BEGIN
                FOR table_row IN
                        SELECT
                            x.table_name
                        FROM
                            information_schema.tables x
                            JOIN information_schema.triggers t ON t.event_object_table = x.table_name
                                AND t.event_object_catalog = x.table_catalog
                                AND t.event_object_schema = x.table_schema
                                AND t.trigger_name = 'delete_auditing'
                        WHERE
                            NOT (x.table_name ^@ 'static_lwp_'
                                OR x.table_name ^@ 'lwp_')
                    LOOP
                        EXECUTE format('DROP TRIGGER delete_auditing ON %I;', table_row.table_name);
                    END LOOP;
                RETURN;
            END;
            $$;`);

        await queryRunner.query(`ALTER TABLE deleted_item RENAME TO backup_deleted_item;`);

        await queryRunner.query(`ALTER TABLE backup_deleted_item DROP CONSTRAINT "PK_5e22a7faae28e3c07157d3ab71b";`)

        await queryRunner.query(`DROP INDEX "IDX_4db45ebcfe911a159ec87fb82c"`);

        await queryRunner.query(
            `CREATE TABLE "deleted_item" ("id" BIGSERIAL NOT NULL, "deletedAt" TIMESTAMP NOT NULL DEFAULT ('now'::text)::timestamp(6) with time zone, "recordId" text GENERATED ALWAYS AS (record ->> 'id'::text) STORED, "source" character varying NOT NULL, "record" jsonb NOT NULL) PARTITION BY RANGE ("deletedAt")`
        );

        await queryRunner.query(`ALTER SEQUENCE IF EXISTS "deleted_item_id_seq" OWNED BY "deleted_item"."id"`);
        // Here for posterity, but this should really continue the existing deleted_item_id_seq
        await queryRunner.query(`CREATE SEQUENCE IF NOT EXISTS "deleted_item_id_seq" OWNED BY "deleted_item"."id"`);

        await queryRunner.query(`ALTER TABLE "deleted_item" ALTER COLUMN "id" SET DEFAULT nextval('"deleted_item_id_seq"')`);

        await queryRunner.query(`CREATE INDEX "IDX_4db45ebcfe911a159ec87fb82c" ON "deleted_item" ("source", "recordId") `);

        await queryRunner.query(`CREATE INDEX "IDX_deletedItem_deletedAt_BRIN" ON "deleted_item" USING brin ("deletedAt") `);

        await queryRunner.query(`DELETE FROM "typeorm_metadata" WHERE "type" = $1 AND "name" = $2 AND "database" = $3 AND "schema" = $4 AND "table" = $5`, ["GENERATED_COLUMN","recordId","postgres","public","deleted_item"]);
        await queryRunner.query(`INSERT INTO "typeorm_metadata"("database", "schema", "table", "type", "name", "value") VALUES ($1, $2, $3, $4, $5, $6)`, ["postgres","public","deleted_item","GENERATED_COLUMN","recordId","(record ->> 'id'::text)"]);

        await queryRunner.query(`CREATE TABLE partman_templates.deleted_item_partition_template (LIKE deleted_item);`);
        await queryRunner.query(`ALTER TABLE partman_templates.deleted_item_partition_template ADD PRIMARY KEY (id);`);

        await queryRunner.query(
            `SELECT partman.create_parent(
                p_parent_table   => concat(current_schema, '.deleted_item'),
                p_control        => 'deletedAt',
                p_type           => 'range',
                p_interval       => '1 month',
                p_premake        => 2,
                p_template_table => 'partman_templates.deleted_item_partition_template'
            );`
        );

        await queryRunner.query(
            `UPDATE partman.part_config
                SET infinite_time_partitions = true,
                retention = '3 months',
                retention_keep_table = false,
                datetime_string = 'YYYYMM'
                WHERE parent_table = concat(current_schema, '.deleted_item');
        `);

        await queryRunner.query(`DO $$
            DECLARE
                month record;
            BEGIN
                FOR month IN (
                    select date_trunc('month', current_date + month_intervals.i * interval '1 month') as start_date
                    from (select generate_series(-2,2) AS i) month_intervals
                ) LOOP
                    EXECUTE format(
                        'ALTER TABLE %I RENAME TO %I',
                        concat('deleted_item_p', to_char(month.start_date, 'YYYYMMDD')),
                        concat('deleted_item_p', to_char(month.start_date, 'YYYYMM'))
                    );
                END LOOP;
            END;
        $$;`);

        await queryRunner.query(`SELECT cron.schedule('partman_maintenance', '@hourly', $$CALL partman.run_maintenance_proc()$$);`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP FUNCTION create_deleted_items_table_for_month;`);

        await queryRunner.query(`DROP TABLE deleted_item;`);

        await queryRunner.query(`DROP EXTENSION pg_partman;`);
        await queryRunner.query(`DROP SCHEMA partman;`);
        await queryRunner.query(`DROP SCHEMA partman_templates;`);
        await queryRunner.query(`DROP EXTENSION pg_cron;`);

        await queryRunner.query(`ALTER TABLE backup_deleted_item RENAME TO deleted_item;`);
        await queryRunner.query(`ALTER TABLE deleted_item ADD CONSTRAINT "PK_5e22a7faae28e3c07157d3ab71b" PRIMARY KEY ("id");`);
        await queryRunner.query(`ALTER SEQUENCE IF EXISTS "deleted_item_id_seq" OWNED BY "deleted_item"."id"`);

        await queryRunner.query(`
            CREATE OR REPLACE FUNCTION do_create_delete_auditing_triggers()
                RETURNS TRIGGER
                LANGUAGE plpgsql
                VOLATILE
                SECURITY DEFINER
                AS $$
            DECLARE
                table_row record;
            BEGIN
                FOR table_row IN
                        SELECT
                            x.table_name
                        FROM
                            information_schema.tables x
                            LEFT JOIN information_schema.triggers t ON t.event_object_table = x.table_name
                                AND t.event_object_catalog = x.table_catalog
                                AND t.event_object_schema = x.table_schema
                                AND t.trigger_name = 'delete_auditing'
                        WHERE
                            t.trigger_name IS NULL
                            AND NOT x.table_name ^@ 'backup_'
                            AND NOT x.table_name = 'deleted_item'
                            AND NOT x.table_name = 'typeorm_metadata'
                            AND x.table_type <> 'VIEW'
                            AND x.table_schema = TG_TABLE_SCHEMA
                    LOOP
                        EXECUTE format('CREATE TRIGGER delete_auditing '
                                    'BEFORE DELETE ON %I '
                                    'FOR EACH ROW '
                                    'EXECUTE FUNCTION do_delete_auditing ();', table_row.table_name);
                    END LOOP;
                RETURN NULL;
            END;
            $$;`);

        await queryRunner.query(`DROP EXTENSION pg_cron;`);
    }

}
