import {MigrationInterface, QueryRunner} from "typeorm";

export class CreateLogStaticLwpEmailTemplateHistory1700571321351 implements MigrationInterface {
    name = 'CreateLogStaticLwpEmailTemplateHistory1700571321351'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "log_static_lwp_email_template_history" ("type" character varying NOT NULL, "subject" character varying NOT NULL, "senderEmail" character varying NOT NULL, "senderName" character varying NOT NULL, "email" character varying, "sms" character varying, "schoolId" integer, "id" BIGSERIAL NOT NULL, "logCreatedAt" TIMESTAMP DEFAULT ('now'::text)::timestamp(6) with time zone, CONSTRAINT "PK_d9a7541b0d74684d245fd8cafd4" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_9cdffa8315c4b8db3f8aace6c4" ON "log_static_lwp_email_template_history" ("type", "logCreatedAt") `);

        await queryRunner.query(`
        CREATE FUNCTION lwp_log_static_email_template_change ()
            RETURNS TRIGGER
            AS $$
        BEGIN
            EXECUTE 'INSERT INTO log_static_lwp_email_template_history ("type", "subject", "senderEmail", "senderName", "email", "sms", "schoolId") VALUES ($1."type", $1."subject", $1."senderEmail", $1."senderName", $1."email", $1."sms", $1."schoolId")'
            USING NEW;
            RETURN NEW;
        END;
        $$
        LANGUAGE plpgsql
        SECURITY DEFINER;

                    
        CREATE TRIGGER update_log_static_lwp_email_template_history
            AFTER UPDATE ON static_lwp_email_template
            FOR EACH ROW
            EXECUTE FUNCTION lwp_log_static_email_template_change();
        `);

        await queryRunner.query(`
        INSERT INTO log_static_lwp_email_template_history ("type", "subject", "senderEmail", "senderName", "email", "sms", "schoolId", "logCreatedAt")
            SELECT
                "type",
                "subject",
                "senderEmail",
                "senderName",
                "email",
                "sms",
                "schoolId",
                '1970-01-01 00:00:00' -- just so we know these are "fake" history entries if we ever need to discover that.
            FROM
                static_lwp_email_template;
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TRIGGER update_log_static_lwp_email_template_history ON static_lwp_email_template`);
        await queryRunner.query(`DROP FUNCTION lwp_log_static_email_template_change`);
        await queryRunner.query(`DROP INDEX "public"."IDX_9cdffa8315c4b8db3f8aace6c4"`);
        await queryRunner.query(`DROP TABLE "log_static_lwp_email_template_history"`);
    }

}
