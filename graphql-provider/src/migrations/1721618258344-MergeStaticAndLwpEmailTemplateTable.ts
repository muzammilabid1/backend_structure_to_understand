import {MigrationInterface, QueryRunner} from "typeorm";

export class MergeStaticAndLwpEmailTemplateTable1721618258344 implements MigrationInterface {
    name = 'MergeStaticAndLwpEmailTemplateTable1721618258344'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "lwp_email_template" ADD "subject" character varying NOT NULL DEFAULT 'Learning With Parents'`);
        await queryRunner.query(`ALTER TABLE "lwp_email_template" ADD "senderEmail" character varying NOT NULL DEFAULT 'hello@learningwithparents.com'`);
        await queryRunner.query(`ALTER TABLE "lwp_email_template" ADD "senderName" character varying NOT NULL DEFAULT 'Learning With Parents'`);
        await queryRunner.query(`ALTER TABLE "lwp_email_template" ADD "previewLine" character varying`);
        await queryRunner.query(`ALTER TABLE "lwp_email_template" ADD "type" character varying`);
        await queryRunner.query(`ALTER TABLE "lwp_email_template" ADD "deletedAt" TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE "lwp_email_template" ADD "lwpNotificationId" bigint`);
        await queryRunner.query(`ALTER TABLE "lwp_email_template" ADD CONSTRAINT "UQ_6a0b0873916c0555e380a926885" UNIQUE ("lwpNotificationId")`);
        await queryRunner.query(`ALTER TABLE "lwp_email_template" ADD "deletedById" bigint`);
        await queryRunner.query(`ALTER TABLE "lwp_email_template" ADD CONSTRAINT "FK_6a0b0873916c0555e380a926885" FOREIGN KEY ("lwpNotificationId") REFERENCES "lwp_notification"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "lwp_email_template" ADD CONSTRAINT "FK_32caae413858ec7b43d2d141d34" FOREIGN KEY ("deletedById") REFERENCES "lwp_user"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "lwp_email_template" DROP CONSTRAINT "FK_32caae413858ec7b43d2d141d34"`);
        await queryRunner.query(`ALTER TABLE "lwp_email_template" DROP CONSTRAINT "FK_6a0b0873916c0555e380a926885"`);
        await queryRunner.query(`ALTER TABLE "lwp_email_template" DROP COLUMN "deletedById"`);
        await queryRunner.query(`ALTER TABLE "lwp_email_template" DROP CONSTRAINT "UQ_6a0b0873916c0555e380a926885"`);
        await queryRunner.query(`ALTER TABLE "lwp_email_template" DROP COLUMN "lwpNotificationId"`);
        await queryRunner.query(`ALTER TABLE "lwp_email_template" DROP COLUMN "deletedAt"`);
        await queryRunner.query(`ALTER TABLE "lwp_email_template" DROP COLUMN "type"`);
        await queryRunner.query(`ALTER TABLE "lwp_email_template" DROP COLUMN "previewLine"`);
        await queryRunner.query(`ALTER TABLE "lwp_email_template" DROP COLUMN "senderName"`);
        await queryRunner.query(`ALTER TABLE "lwp_email_template" DROP COLUMN "senderEmail"`);
        await queryRunner.query(`ALTER TABLE "lwp_email_template" DROP COLUMN "subject"`);
    }

}
