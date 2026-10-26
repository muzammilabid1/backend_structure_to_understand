import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSoftDeleteToStaticLwpEmailTemplateTable1706769285917 implements MigrationInterface {
    name = 'AddSoftDeleteToStaticLwpEmailTemplateTable1706769285917';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "static_lwp_email_template" ADD "deletedAt" TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE "static_lwp_email_template" ADD "deletedById" bigint`);
        await queryRunner.query(
            `ALTER TABLE "static_lwp_email_template" ADD CONSTRAINT "FK_e1f843c022ace5ffed5af0e8fed" FOREIGN KEY ("deletedById") REFERENCES "lwp_user"("id") ON DELETE SET NULL ON UPDATE NO ACTION`
        );
        await queryRunner.query(`DROP TRIGGER update_log_static_lwp_email_template_history ON static_lwp_email_template`);
        await queryRunner.query(`DROP FUNCTION lwp_log_static_email_template_change`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "static_lwp_email_template" DROP CONSTRAINT "FK_e1f843c022ace5ffed5af0e8fed"`);
        await queryRunner.query(`ALTER TABLE "static_lwp_email_template" DROP COLUMN "deletedById"`);
        await queryRunner.query(`ALTER TABLE "static_lwp_email_template" DROP COLUMN "deletedAt"`);
    }
}
