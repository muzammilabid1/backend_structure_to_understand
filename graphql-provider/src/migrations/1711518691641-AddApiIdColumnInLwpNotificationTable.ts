import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddApiIdColumnInLwpNotificationTable1711518691641 implements MigrationInterface {
    name = 'AddApiIdColumnInLwpNotificationTable1711518691641';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "lwp_notification" ADD "apiId" character varying`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "lwp_notification" DROP COLUMN "apiId"`);
    }
}
