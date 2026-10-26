import {MigrationInterface, QueryRunner} from "typeorm";

export class AddTriggerGeneratedLatestStatusColumnToLwpNotification1722441789788 implements MigrationInterface {
    name = 'AddTriggerGeneratedLatestStatusColumnToLwpNotification1722441789788'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "lwp_notification" ADD "status" "public"."lwp_notification_event_history_status_enum" NOT NULL DEFAULT 'WAITING'`);

        // make sure future ones are updated
        await queryRunner.query(`
            CREATE FUNCTION update_lwp_notification_from_event_history()
            RETURNS TRIGGER AS $$
            BEGIN
                WITH max_notif_status AS (
                    SELECT MAX(status) AS status, "notificationId"
                    FROM lwp_notification_event_history
                    WHERE "notificationId" = COALESCE(NEW."notificationId", OLD."notificationId")
                    GROUP BY "notificationId"
                )
                UPDATE lwp_notification ln2
                SET status = mns.status
                FROM max_notif_status mns
                WHERE ln2.id = mns."notificationId";

                RETURN NULL;
            END;
            $$
            LANGUAGE plpgsql VOLATILE;
            
            CREATE TRIGGER after_lwp_notification_event_history_change
            AFTER INSERT OR UPDATE OR DELETE ON lwp_notification_event_history
            FOR EACH ROW
            EXECUTE FUNCTION update_lwp_notification_from_event_history();
        `);

        // update all our existing ones
        await queryRunner.query(`
            WITH max_notif_statuses AS (
                SELECT MAX(status) AS status, "notificationId"
                FROM lwp_notification_event_history
                GROUP BY "notificationId"
            )
            UPDATE lwp_notification ln2
            SET status = mns.status
            FROM max_notif_statuses mns
            WHERE ln2.id = mns."notificationId";
        `)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "lwp_notification" DROP COLUMN "status"`);
        await queryRunner.query(`DROP TRIGGER after_lwp_notification_event_history_change ON lwp_notification_event_history;`)
        await queryRunner.query(`DROP FUNCTION update_lwp_notification_from_event_history;`)
    }

}
