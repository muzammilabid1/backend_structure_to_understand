/* eslint-disable */

import { MigrationInterface, QueryRunner } from 'typeorm';

export class EmailValidation1713514166748 implements MigrationInterface {
    name = 'EmailValidation1713514166748';
    public async up(queryRunner: QueryRunner): Promise<void> {
        const emailRegex = `^(([^<>()[\\]\\\\.,;:\\s@\"]+(\\.[^<>()[\\]\\\\.,;:\\s@\"]+)*)|(\\".+\\"))@((\\[[0-9]{1,3}\\.[0-9]{1,3}\\.[0-9]{1,3}\\.[0-9]{1,3}\\])|(([a-zA-Z\\-0-9]+\\.)+[a-zA-Z]{2,}))$`;
        const phoneRegex = `^((0|(\\+|00)44)7\\d{9}|(\\+|00)([1-35-9]\\d|4[01-35-9])\\d{4,13})$`;

        await queryRunner.query(`
            CREATE TEMP TABLE "temp_users_to_update" AS
            SELECT 
                "id" as "id",
                "email" as "email",
                "phoneNumber" as "phoneNumber",
            CASE
                WHEN email IS NULL OR email !~* '${emailRegex}' THEN NULL ELSE email END AS new_email,
            CASE
                WHEN "phoneNumber" IS NULL OR "phoneNumber" !~ '${phoneRegex}' THEN NULL ELSE "phoneNumber" END AS new_phoneNumber,
            CASE
                WHEN (email IS NULL OR email !~* '${emailRegex}') AND ("phoneNumber" IS NULL OR "phoneNumber" !~ '${phoneRegex}') THEN CURRENT_TIMESTAMP ELSE "deletedAt" END AS new_deletedAt,
            CASE 
                WHEN ("email" IS NULL OR "email" !~* '${emailRegex}') AND ("phoneNumber" IS NULL OR "phoneNumber" !~ '${phoneRegex}') THEN 'SOFTDELETED'
                WHEN "email" IS NULL OR "email" !~* '${emailRegex}' OR "phoneNumber" IS NULL OR "phoneNumber" !~ '${phoneRegex}' THEN 'UPDATED'
            END AS "status"
            FROM public.lwp_user
            WHERE 
                "email" IS NOT NULL AND "email" !~* '${emailRegex}'
                OR "phoneNumber" IS NOT NULL AND "phoneNumber" !~ '${phoneRegex}'
                OR ("email" IS NULL AND "phoneNumber" IS NULL);
        `);

        await queryRunner.query(`
            UPDATE public.lwp_user
            SET 
                email = v.new_email,
                "phoneNumber" = v.new_phoneNumber,
                "deletedAt" = v.new_deletedAt
            FROM "temp_users_to_update" v
            WHERE public.lwp_user.id = v.id;
        `);

        await queryRunner.query(`
            CREATE TABLE "backup_lwp_deleted_users" AS
            SELECT 
                "id",
                "email",
                "phoneNumber",
                "status"
            FROM "temp_users_to_update";
        `);

        await queryRunner.query(`DROP TABLE "temp_users_to_update";`);

        await queryRunner.query(`
            ALTER TABLE public.lwp_user
            ADD CONSTRAINT email_valid CHECK (email ~* '${emailRegex}'),
            ADD CONSTRAINT phone_valid CHECK ("phoneNumber" ~ '${phoneRegex}');
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE public.lwp_user
            DROP CONSTRAINT email_valid,
            DROP CONSTRAINT phone_valid;
        `);
    }
}
