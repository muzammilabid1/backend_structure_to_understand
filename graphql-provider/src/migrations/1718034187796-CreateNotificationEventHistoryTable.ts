import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateNotificationEventHistoryTable1718034187796 implements MigrationInterface {
    name = 'CreateNotificationEventHistoryTable1718034187796';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `CREATE TABLE "lwp_notification_event_history" ("id" BIGSERIAL NOT NULL, "status" character varying DEFAULT 'WAITING', "logCreatedAt" TIMESTAMP DEFAULT ('now'::text)::timestamp(6) with time zone, "logUpdatedAt" TIMESTAMP NOT NULL DEFAULT ('now'::text)::timestamp(6) with time zone, "notificationId" bigint, "error" jsonb, CONSTRAINT "PK_eba9cda3a0bfbd49c24737fef2d" PRIMARY KEY ("id"))`
        );

        await queryRunner.query(
            `INSERT INTO "lwp_notification_event_history" 
            ("notificationId", "status", "logCreatedAt", "error")
            SELECT id, 'WAITING', "logCreatedAt", NULL::jsonb FROM "lwp_notification"
            UNION ALL
            SELECT id, 'SENT', "sentAt", NULL::jsonb FROM "lwp_notification" WHERE "sentAt" IS NOT NULL
            UNION ALL
            SELECT id, 'QUEUED', "queuedAt", NULL::jsonb FROM "lwp_notification" WHERE "queuedAt" IS NOT NULL
            UNION ALL
            SELECT id, 'DELIVERED', "deliveredAt", NULL::jsonb FROM "lwp_notification" WHERE "deliveredAt" IS NOT NULL
            UNION ALL
            SELECT id, 'FAILED', "failedAt", error FROM "lwp_notification" WHERE "failedAt" IS NOT NULL
            UNION ALL
            SELECT id, 'REJECTED', "rejectedAt", error FROM "lwp_notification" WHERE "rejectedAt" IS NOT NULL
            UNION ALL
            SELECT id, 'OPENED', "openedAt", NULL::jsonb FROM "lwp_notification" WHERE "openedAt" IS NOT NULL
            UNION ALL
            SELECT id, 'CLICKED', "clickedAt", NULL::jsonb FROM "lwp_notification" WHERE "clickedAt" IS NOT NULL`
        );

        await queryRunner.query(
            `ALTER TABLE "lwp_notification_event_history" ADD CONSTRAINT "FK_f82cec2bb855dc61e734c7c5e6c" FOREIGN KEY ("notificationId") REFERENCES "lwp_notification"("id") ON DELETE CASCADE ON UPDATE NO ACTION`
        );

        await queryRunner.query(`ALTER TABLE "lwp_notification" DROP COLUMN "sentAt"`);
        await queryRunner.query(`ALTER TABLE "lwp_notification" DROP COLUMN "status"`);
        await queryRunner.query(`ALTER TABLE "lwp_notification" DROP COLUMN "queuedAt"`);
        await queryRunner.query(`ALTER TABLE "lwp_notification" DROP COLUMN "deliveredAt"`);
        await queryRunner.query(`ALTER TABLE "lwp_notification" DROP COLUMN "failedAt"`);
        await queryRunner.query(`ALTER TABLE "lwp_notification" DROP COLUMN "rejectedAt"`);
        await queryRunner.query(`ALTER TABLE "lwp_notification" DROP COLUMN "openedAt"`);
        await queryRunner.query(`ALTER TABLE "lwp_notification" DROP COLUMN "clickedAt"`);
        await queryRunner.query(`ALTER TABLE "lwp_notification" DROP COLUMN "error"`);

        await queryRunner.query(`
            CREATE FUNCTION insert_lwp_notification_event_history()
            RETURNS TRIGGER AS $$
            BEGIN
                INSERT INTO lwp_notification_event_history (status, "notificationId")
                VALUES ('WAITING', NEW.id);
                
                RETURN NEW;
            END;
            $$
            LANGUAGE plpgsql;
            
            CREATE TRIGGER after_lwp_notification_insert
            AFTER INSERT ON lwp_notification
            FOR EACH ROW
            EXECUTE FUNCTION insert_lwp_notification_event_history();
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "lwp_notification_event_history" DROP CONSTRAINT "FK_f82cec2bb855dc61e734c7c5e6c"`);
        await queryRunner.query(`ALTER TABLE "lwp_notification" ADD "clickedAt" TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE "lwp_notification" ADD "openedAt" TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE "lwp_notification" ADD "rejectedAt" TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE "lwp_notification" ADD "failedAt" TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE "lwp_notification" ADD "deliveredAt" TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE "lwp_notification" ADD "queuedAt" TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE "lwp_notification" ADD "status" character varying DEFAULT 'WAITING'`);
        await queryRunner.query(`ALTER TABLE "lwp_notification" ADD "sentAt" TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE "lwp_notification" ADD "error" jsonb`);
        await queryRunner.query(`DROP TABLE "lwp_notification_event_history"`);
        await queryRunner.query(`
            DROP FUNCTION IF EXISTS insert_lwp_notification_event_history();
        `);
    }
}
