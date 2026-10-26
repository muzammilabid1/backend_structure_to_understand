/* eslint-disable */

import {MigrationInterface, QueryRunner} from "typeorm";

export class MigrateDataFromStaticToLwpEmailTemplate1721618661257 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `
                UPDATE lwp_email_template AS let
                SET
                    "subject" = slet.subject,
                    "senderEmail" = slet."senderEmail",
                    "senderName" = slet."senderName",
                    "previewLine" = slet."previewLine",
                    "type" = slet."type",
                    "lwpNotificationId" = case when let."status" = 'CURRENT' then slet."lwpNotificationId" else null end,
                    "logCreatedById" = COALESCE(let."logCreatedById", slet."logCreatedById"),
                    "logUpdatedById" = COALESCE(let."logUpdatedById", slet."logUpdatedById"),
                    "deletedAt" = slet."deletedAt",
                    "deletedById" = slet."deletedById"
                FROM
                    static_lwp_email_template AS slet
                WHERE
                    let."emailTemplateId" = slet.id
            `
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {}

}
