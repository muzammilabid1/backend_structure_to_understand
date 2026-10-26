import {MigrationInterface, QueryRunner} from "typeorm";

export class FixPupilTopicsForNotificationsViewAndAutomaticallySetViewsToSecurityInvokerAfterTypeormMetadataInsertion1725545831242 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER VIEW lwp_view_pupil_topics_for_notifications SET (security_invoker = true);`);
        await queryRunner.query(`
            CREATE FUNCTION set_security_invoker_for_views() RETURNS trigger AS $$
                BEGIN
                    EXECUTE 'ALTER VIEW ' || NEW.name || ' SET (security_invoker = true);';
                    RETURN NULL;
                END;
            $$ LANGUAGE plpgsql SECURITY DEFINER;

            CREATE TRIGGER set_security_invoker_for_views_in_typeorm_metadata AFTER INSERT OR UPDATE ON typeorm_metadata
                FOR EACH ROW WHEN (NEW.type = 'VIEW') EXECUTE FUNCTION set_security_invoker_for_views();
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            DROP TRIGGER set_security_invoker_for_views_in_typeorm_metadata ON typeorm_metadata;
            DROP FUNCTION set_security_invoker_for_views;
        `);
        await queryRunner.query(`ALTER VIEW lwp_view_pupil_topics_for_notifications SET (security_invoker = false);`);
    }

}
