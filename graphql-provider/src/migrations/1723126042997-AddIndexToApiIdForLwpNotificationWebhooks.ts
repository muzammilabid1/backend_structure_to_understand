import {MigrationInterface, QueryRunner} from "typeorm";

export class AddIndexToApiIdForLwpNotificationWebhooks1723126042997 implements MigrationInterface {
    name = 'AddIndexToApiIdForLwpNotificationWebhooks1723126042997'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE INDEX "IDX_135655718f2843f18475941efb" ON "lwp_notification" ("apiId") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_135655718f2843f18475941efb"`);
    }

}
