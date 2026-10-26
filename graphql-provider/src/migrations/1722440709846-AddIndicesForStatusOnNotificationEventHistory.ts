import {MigrationInterface, QueryRunner} from "typeorm";

export class AddIndicesForStatusOnNotificationEventHistory1722440709846 implements MigrationInterface {
    name = 'AddIndicesForStatusOnNotificationEventHistory1722440709846'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_f82cec2bb855dc61e734c7c5e6"`);
        await queryRunner.query(`CREATE INDEX "IDX_2c57c20c9b77065de705c73f30" ON "lwp_notification_event_history" ("status") `);
        await queryRunner.query(`CREATE INDEX "IDX_e3c232d4a37f3374a72b14b327" ON "lwp_notification_event_history" ("notificationId", "status") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_e3c232d4a37f3374a72b14b327"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_2c57c20c9b77065de705c73f30"`);
        await queryRunner.query(`CREATE INDEX "IDX_f82cec2bb855dc61e734c7c5e6" ON "lwp_notification_event_history" ("notificationId") `);
    }

}
