import { MigrationInterface, QueryRunner } from 'typeorm';

export class DropOldStaticLwpEmailTemplateTable1721794524547 implements MigrationInterface {
    name = 'DropOldStaticLwpEmailTemplateTable1721794524547';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "lwp_email_template" DROP CONSTRAINT "FK_b68573588c2fcdf2fcf74177a30"`);
        await queryRunner.query(`ALTER TABLE "lwp_email_template" DROP COLUMN "emailTemplateId"`);
        await queryRunner.query(`
            CREATE TABLE "backup_${new Date().toISOString().slice(0, 10).replace('-', '_')}_static_lwp_email_template" AS (
                SELECT * FROM static_lwp_email_template
            )
        `);
        await queryRunner.query(`DROP TABLE static_lwp_email_template`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "lwp_email_template" ADD "emailTemplateId" bigint`);
        await queryRunner.query(
            `ALTER TABLE "lwp_email_template" ADD CONSTRAINT "FK_b68573588c2fcdf2fcf74177a30" FOREIGN KEY ("emailTemplateId") REFERENCES "static_lwp_email_template"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
        );
    }
}
