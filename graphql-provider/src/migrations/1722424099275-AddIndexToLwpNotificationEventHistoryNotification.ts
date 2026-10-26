import {MigrationInterface, QueryRunner} from "typeorm";

export class AddIndexToLwpNotificationEventHistoryNotification1722424099275 implements MigrationInterface {
    name = 'AddIndexToLwpNotificationEventHistoryNotification1722424099275'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE INDEX "IDX_f82cec2bb855dc61e734c7c5e6" ON "lwp_notification_event_history" ("notificationId") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_f82cec2bb855dc61e734c7c5e6"`);
    }

}
