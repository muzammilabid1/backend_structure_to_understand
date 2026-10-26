import {MigrationInterface, QueryRunner} from "typeorm";

export class migration1679914673406 implements MigrationInterface {
    name = 'migration1679914673406'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "lwp_user_associated_login" ("accountId" character varying NOT NULL, "firstname" character varying NOT NULL, "lastname" character varying, "email" character varying, "picture" character varying, "phone" character varying, "accountType" character varying NOT NULL DEFAULT 'MICROSOFT', "id" BIGSERIAL NOT NULL, "logCreatedAt" TIMESTAMP DEFAULT ('now'::text)::timestamp(6) with time zone, "logUpdatedAt" TIMESTAMP NOT NULL DEFAULT ('now'::text)::timestamp(6) with time zone, "userId" bigint, "logCreatedById" bigint, "logUpdatedById" bigint, CONSTRAINT "UQ_4586e2df1b9603ef59f69870bbc" UNIQUE ("accountId"), CONSTRAINT "PK_8e540e98c6e5cc1e1b1e53c8acc" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "lwp_pupil" DROP COLUMN "sharePhotos"`);
        await queryRunner.query(`ALTER TABLE "lwp_school" ADD "socialLoginPermissions" jsonb DEFAULT '{"email":true,"microsoft":false,"google":false}'`);
        await queryRunner.query(`ALTER TABLE "lwp_user" ADD "badLoginAttempts" integer NOT NULL DEFAULT '0'`);
        await queryRunner.query(`ALTER TABLE "lwp_user" ADD "unlockAccountTime" TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE "lwp_user_associated_login" ADD CONSTRAINT "FK_94f30c4658579135f5d32d23998" FOREIGN KEY ("userId") REFERENCES "lwp_user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "lwp_user_associated_login" ADD CONSTRAINT "FK_5ee4fa5f5b9beaafa1d02862847" FOREIGN KEY ("logCreatedById") REFERENCES "lwp_user"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "lwp_user_associated_login" ADD CONSTRAINT "FK_14cc634c3b92ca4779275fd1558" FOREIGN KEY ("logUpdatedById") REFERENCES "lwp_user"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "lwp_user_associated_login" DROP CONSTRAINT "FK_14cc634c3b92ca4779275fd1558"`);
        await queryRunner.query(`ALTER TABLE "lwp_user_associated_login" DROP CONSTRAINT "FK_5ee4fa5f5b9beaafa1d02862847"`);
        await queryRunner.query(`ALTER TABLE "lwp_user_associated_login" DROP CONSTRAINT "FK_94f30c4658579135f5d32d23998"`);
        await queryRunner.query(`ALTER TABLE "lwp_user" DROP COLUMN "unlockAccountTime"`);
        await queryRunner.query(`ALTER TABLE "lwp_user" DROP COLUMN "badLoginAttempts"`);
        await queryRunner.query(`ALTER TABLE "lwp_school" DROP COLUMN "socialLoginPermissions"`);
        await queryRunner.query(`ALTER TABLE "lwp_pupil" ADD "sharePhotos" boolean`);
        await queryRunner.query(`DROP TABLE "lwp_user_associated_login"`);
    }

}
