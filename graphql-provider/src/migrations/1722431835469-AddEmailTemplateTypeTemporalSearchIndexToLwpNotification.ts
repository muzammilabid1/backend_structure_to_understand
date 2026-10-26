import {MigrationInterface, QueryRunner} from "typeorm";

export class AddEmailTemplateTypeTemporalSearchIndexToLwpNotification1722431835469 implements MigrationInterface {
    name = 'AddEmailTemplateTypeTemporalSearchIndexToLwpNotification1722431835469'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE INDEX "idx_email_template_type_temporal_search" ON "lwp_notification" ("emailTemplateType", "logCreatedAt") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."idx_email_template_type_temporal_search"`);
    }

}
