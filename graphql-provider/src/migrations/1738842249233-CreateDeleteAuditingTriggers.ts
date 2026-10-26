import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateDeleteAuditingTriggers1738842249233 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE FUNCTION do_delete_auditing()
                RETURNS TRIGGER
                LANGUAGE plpgsql
                VOLATILE
                SECURITY DEFINER
                AS $$
            BEGIN
                INSERT INTO deleted_item (source, record) VALUES (TG_TABLE_NAME, to_jsonb(OLD.*));
                RETURN OLD;
            END;
            $$;`);

        await queryRunner.query(`
            CREATE FUNCTION do_create_delete_auditing_triggers()
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

        await queryRunner.query(`
            CREATE TRIGGER create_delete_auditing_triggers
                AFTER INSERT ON migrations
                FOR EACH STATEMENT
                EXECUTE FUNCTION do_create_delete_auditing_triggers();`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP FUNCTION do_create_delete_auditing_triggers CASCADE`);
        await queryRunner.query(`DROP FUNCTION do_delete_auditing CASCADE`);
    }
}
