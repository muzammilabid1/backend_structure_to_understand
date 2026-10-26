import {MigrationInterface, QueryRunner} from "typeorm";

export class ConvertNotificationStatusToEnum1722439860556 implements MigrationInterface {
    name = 'ConvertNotificationStatusToEnum1722439860556'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."lwp_notification_event_history_status_enum" AS ENUM('WAITING', 'SENT', 'QUEUED', 'DELIVERED', 'OPENED', 'CLICKED', 'REJECTED', 'FAILED')`);
        await queryRunner.query(`ALTER TABLE "lwp_notification_event_history" ALTER COLUMN "status" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "lwp_notification_event_history" ALTER COLUMN "status" TYPE "public"."lwp_notification_event_history_status_enum" USING "status"::"public"."lwp_notification_event_history_status_enum"`);
        await queryRunner.query(`ALTER TABLE "lwp_notification_event_history" ALTER COLUMN "status" SET DEFAULT 'WAITING'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "lwp_notification_event_history" ALTER COLUMN "status" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "lwp_notification_event_history" ALTER COLUMN "status" TYPE varchar USING "status"::varchar`);
        await queryRunner.query(`ALTER TABLE "lwp_notification_event_history" ALTER COLUMN "status" SET DEFAULT 'WAITING'`);
        await queryRunner.query(`DROP TYPE "public"."lwp_notification_event_history_status_enum"`);
    }

}
