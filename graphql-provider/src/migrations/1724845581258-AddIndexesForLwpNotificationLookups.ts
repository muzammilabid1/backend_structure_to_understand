import {MigrationInterface, QueryRunner} from "typeorm";

export class AddIndexesForLwpNotificationLookups1724845581258 implements MigrationInterface {
    name = 'AddIndexesForLwpNotificationLookups1724845581258'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."idx_email_template_type_temporal_search"`);
        await queryRunner.query(`CREATE INDEX "IDX_014fbe23f71fe48068ad70b714" ON "lwp_notification" ("recipient") `);
        await queryRunner.query(`CREATE INDEX "idx_email_template_type_temporal_search" ON "lwp_notification" ("emailTemplateType", "status", "logCreatedAt") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."idx_email_template_type_temporal_search"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_014fbe23f71fe48068ad70b714"`);
        await queryRunner.query(`CREATE INDEX "idx_email_template_type_temporal_search" ON "lwp_notification" ("emailTemplateType", "logCreatedAt") `);
    }

}
