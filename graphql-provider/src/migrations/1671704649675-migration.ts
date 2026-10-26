import {MigrationInterface, QueryRunner} from "typeorm";

export class migration1671704649675 implements MigrationInterface {
    name = 'migration1671704649675'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "lwp_pupil_parent" ("pupilId" bigint NOT NULL, "parentId" bigint NOT NULL, "status" character varying NOT NULL, "wondeStudentContactID" integer, "lastInvitationEmailSent" TIMESTAMP, "logLastStatusChange" TIMESTAMP, "id" BIGSERIAL NOT NULL, "deletedAt" TIMESTAMP, "logCreatedAt" TIMESTAMP DEFAULT ('now'::text)::timestamp(6) with time zone, "logUpdatedAt" TIMESTAMP NOT NULL DEFAULT ('now'::text)::timestamp(6) with time zone, "invitedById" bigint, "deletedById" bigint, "logCreatedById" bigint, "logUpdatedById" bigint, CONSTRAINT "UQ_PUPIL_PARENT" UNIQUE ("parentId", "pupilId"), CONSTRAINT "PK_27b58f9b25e29d6473ce6206887" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "lwp_magic_link" ("url" character varying NOT NULL, "expiryTime" TIMESTAMP NOT NULL, "lastRegeneratedAt" TIMESTAMP, "type" character varying NOT NULL, "isUsed" boolean NOT NULL DEFAULT false, "pupilTopicId" integer, "pupilId" integer, "trophyId" integer, "context" jsonb, "id" BIGSERIAL NOT NULL, "logCreatedAt" TIMESTAMP DEFAULT ('now'::text)::timestamp(6) with time zone, "logUpdatedAt" TIMESTAMP NOT NULL DEFAULT ('now'::text)::timestamp(6) with time zone, "userId" bigint, CONSTRAINT "PK_7a9b994adb6b97dce181701a00b" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "log_lwp_email_sms" ADD "error" jsonb`);
        await queryRunner.query(`ALTER TABLE "lwp_pupil_topic" ADD "logAccessedWithTopicLink" integer NOT NULL DEFAULT '0'`);
        await queryRunner.query(`ALTER TABLE "lwp_pupil_feedback" DROP CONSTRAINT "FK_fdcac1133fcd423b4c0be913e91"`);
        await queryRunner.query(`ALTER TABLE "lwp_pupil_feedback" DROP CONSTRAINT "REL_fdcac1133fcd423b4c0be913e9"`);
        await queryRunner.query(`ALTER TABLE "lwp_user" ADD "watchedIntroVideo" boolean NOT NULL DEFAULT false`);
        await queryRunner.query(`ALTER TABLE "lwp_pupil_parent" ADD CONSTRAINT "FK_5123c0ddb3e6f7587d74b24c0db" FOREIGN KEY ("pupilId") REFERENCES "lwp_pupil"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "lwp_pupil_parent" ADD CONSTRAINT "FK_16ce399c90c3f84a15452cbb782" FOREIGN KEY ("parentId") REFERENCES "lwp_user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "lwp_pupil_parent" ADD CONSTRAINT "FK_da532eeb17709fb5ab959ee6a9c" FOREIGN KEY ("deletedById") REFERENCES "lwp_user"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "lwp_pupil_parent" ADD CONSTRAINT "FK_3efa30cd4c01885fc707ec788f3" FOREIGN KEY ("logCreatedById") REFERENCES "lwp_user"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "lwp_pupil_parent" ADD CONSTRAINT "FK_57b4aec2ff47cf5b0d0f594f5a3" FOREIGN KEY ("invitedById") REFERENCES "lwp_user"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "lwp_pupil_parent" ADD CONSTRAINT "FK_87e9dc9ffc9ce8b5ee5c7704f9a" FOREIGN KEY ("logUpdatedById") REFERENCES "lwp_user"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "lwp_pupil_feedback" ADD CONSTRAINT "FK_fdcac1133fcd423b4c0be913e91" FOREIGN KEY ("activityId") REFERENCES "lwp_pupil_activity"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "lwp_magic_link" ADD CONSTRAINT "FK_0f7a40f291d88aaae96f58a1aad" FOREIGN KEY ("userId") REFERENCES "lwp_user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
	await queryRunner.query(`insert into lwp_pupil_parent("pupilId", "parentId", status, "lastInvitationEmailSent", "logLastStatusChange") select "lwpPupilId", "lwpUserId", 'ACTIVE', '2000-01-01'::date, '2000-01-01'::date from lwp_parent_pupil`);
	await queryRunner.query(`insert into lwp_pupil_parent("pupilId", "parentId", status, "lastInvitationEmailSent", "logLastStatusChange") select "lwpPupilId", "lwpUserId", 'INVITED', '2000-01-01'::date, '2000-01-01'::date from lwp_parent_pupil_invited`);
	await queryRunner.query(`insert into lwp_pupil_parent("pupilId", "parentId", status, "lastInvitationEmailSent", "logLastStatusChange") select "lwpPupilId", "lwpUserId", 'IMPORTED', '2000-01-01'::date, '2000-01-01'::date from lwp_parent_pupil_imported`);
	await queryRunner.query(`insert into lwp_magic_link("url", "expiryTime", "type", "userId") select "resetPassToken", '2022-04-30'::date, 'INVITATION', id from lwp_user where "userStatus" = 'INVITED' and "resetPassToken" is not null`);
	await queryRunner.query(`update lwp_pupil_parent set "deletedAt" = u."deletedAt" from lwp_user u where u.id = "parentId" and u."deletedAt" is not null`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "lwp_magic_link" DROP CONSTRAINT "FK_0f7a40f291d88aaae96f58a1aad"`);
        await queryRunner.query(`ALTER TABLE "lwp_pupil_feedback" DROP CONSTRAINT "FK_fdcac1133fcd423b4c0be913e91"`);
        await queryRunner.query(`ALTER TABLE "lwp_pupil_parent" DROP CONSTRAINT "FK_87e9dc9ffc9ce8b5ee5c7704f9a"`);
        await queryRunner.query(`ALTER TABLE "lwp_pupil_parent" DROP CONSTRAINT "FK_57b4aec2ff47cf5b0d0f594f5a3"`);
        await queryRunner.query(`ALTER TABLE "lwp_pupil_parent" DROP CONSTRAINT "FK_3efa30cd4c01885fc707ec788f3"`);
        await queryRunner.query(`ALTER TABLE "lwp_pupil_parent" DROP CONSTRAINT "FK_da532eeb17709fb5ab959ee6a9c"`);
        await queryRunner.query(`ALTER TABLE "lwp_pupil_parent" DROP CONSTRAINT "FK_16ce399c90c3f84a15452cbb782"`);
        await queryRunner.query(`ALTER TABLE "lwp_pupil_parent" DROP CONSTRAINT "FK_5123c0ddb3e6f7587d74b24c0db"`);
        await queryRunner.query(`ALTER TABLE "lwp_user" DROP COLUMN "watchedIntroVideo"`);
        await queryRunner.query(`ALTER TABLE "lwp_user" ADD "watchedIntroVideo" character varying`);
        await queryRunner.query(`ALTER TABLE "lwp_pupil_feedback" ADD CONSTRAINT "REL_fdcac1133fcd423b4c0be913e9" UNIQUE ("activityId")`);
        await queryRunner.query(`ALTER TABLE "lwp_pupil_feedback" ADD CONSTRAINT "FK_fdcac1133fcd423b4c0be913e91" FOREIGN KEY ("activityId") REFERENCES "lwp_pupil_activity"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "lwp_pupil_topic" DROP COLUMN "logAccessedWithTopicLink"`);
        await queryRunner.query(`ALTER TABLE "log_lwp_email_sms" DROP COLUMN "error"`);
        await queryRunner.query(`DROP TABLE "lwp_magic_link"`);
        await queryRunner.query(`DROP TABLE "lwp_pupil_parent"`);
        await queryRunner.query(`ALTER TABLE "lwp_user" RENAME COLUMN "watchedIntroVideo" TO "resetPassToken"`);
    }

}
