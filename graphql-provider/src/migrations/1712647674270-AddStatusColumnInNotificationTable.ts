import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddStatusColumnInNotificationTable1712647674270 implements MigrationInterface {
    name = 'AddStatusColumnInNotificationTable1712647674270';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "lwp_notification" ADD "status" character varying DEFAULT 'WAITING'`);

        await queryRunner.query(`
            UPDATE "lwp_notification"
            SET "status" = CASE
                WHEN "sentAt" IS NOT NULL THEN 'SENT'
                WHEN "error" IS NOT NULL THEN 'FAILED'
                ELSE 'WAITING'
            END
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "lwp_notification" DROP COLUMN "status"`);
    }
}
