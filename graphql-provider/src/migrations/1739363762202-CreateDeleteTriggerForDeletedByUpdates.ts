import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateDeleteTriggerForDeletedByUpdates1739363762202 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE FUNCTION do_delete_on_deleted_by_set()
                RETURNS TRIGGER
                LANGUAGE plpgsql
                VOLATILE
                SECURITY DEFINER
                AS $$
            BEGIN
                EXECUTE format('DELETE FROM %I source_table WHERE (source_table.*) = $1;', TG_TABLE_NAME) USING NEW;
                RETURN NULL;
            END;
            $$;`);

        await queryRunner.query(`
            CREATE FUNCTION do_create_deleted_by_deletion_triggers()
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
                            c.table_name
                        FROM
                            information_schema.columns c
                            JOIN information_schema.tables x ON c.table_name = x.table_name
                                AND c.table_catalog = x.table_catalog
                                AND c.table_schema = x.table_schema
                            LEFT JOIN information_schema.triggers t ON t.event_object_table = c.table_name
                                AND t.trigger_name = 'delete_on_deleted_by_set'
                        WHERE
                            c.column_name = 'deletedById'
                            AND t.trigger_name IS NULL
                            AND NOT c.table_name ^@ 'backup_'
                            AND x.table_type <> 'VIEW'
                            AND x.table_schema = current_schema
                    LOOP
                        EXECUTE format('CREATE TRIGGER delete_on_deleted_by_set '
                                    'AFTER UPDATE ON %I '
                                    'FOR EACH ROW '
                                    'WHEN (OLD."deletedById" IS NULL AND NEW."deletedById" IS NOT NULL) '
                                    'EXECUTE FUNCTION do_delete_on_deleted_by_set ();', table_row.table_name);
                    END LOOP;
                RETURN NULL;
            END;
            $$;`);

        await queryRunner.query(`
            CREATE TRIGGER create_deleted_by_deletion_triggers
                AFTER INSERT ON migrations
                FOR EACH STATEMENT
                EXECUTE FUNCTION do_create_deleted_by_deletion_triggers ();`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP FUNCTION do_create_deleted_by_deletion_triggers CASCADE`);
        await queryRunner.query(`DROP FUNCTION do_delete_on_deleted_by_set CASCADE`);
    }
}
