import { MigrationInterface, QueryRunner } from 'typeorm';

export class DropDeleteTriggerFromLwpUserSessionAndRecreateDoCreateDeleteAuditingTriggersFunction1747257353656
    implements MigrationInterface
{
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TRIGGER delete_auditing ON lwp_user_session`);

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
                            AND NOT x.table_name = 'lwp_user_session'
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
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
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
    }
}
