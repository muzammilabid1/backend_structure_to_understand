import {MigrationInterface, QueryRunner} from "typeorm";

export class migration1675764695040 implements MigrationInterface {
    name = 'migration1675764695040'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "static_lwp_tag" ("id" BIGSERIAL NOT NULL, "name" character varying NOT NULL, "color" character varying NOT NULL, "deletedAt" TIMESTAMP, "logCreatedAt" TIMESTAMP DEFAULT ('now'::text)::timestamp(6) with time zone, "logUpdatedAt" TIMESTAMP NOT NULL DEFAULT ('now'::text)::timestamp(6) with time zone, "deletedById" bigint, "logCreatedById" bigint, "logUpdatedById" bigint, CONSTRAINT "PK_07f9c78b0c3f33cf57f13a07a78" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "lwp_activity_tags" ("staticLwpActivityId" bigint NOT NULL, "staticLwpTagId" bigint NOT NULL, CONSTRAINT "PK_aeefca6f5e805143674af8c165d" PRIMARY KEY ("staticLwpActivityId", "staticLwpTagId"))`);
        await queryRunner.query(`CREATE INDEX "IDX_579c57aeaa13d383c32f558968" ON "lwp_activity_tags" ("staticLwpActivityId") `);
        await queryRunner.query(`CREATE INDEX "IDX_9fe005a233ecfdb9d8b6f3c388" ON "lwp_activity_tags" ("staticLwpTagId") `);
        await queryRunner.query(`ALTER TABLE "lwp_pupil" DROP COLUMN "watchedIntoVideo"`);
        await queryRunner.query(`ALTER TABLE "static_lwp_activity" ADD "resources" jsonb`);
        await queryRunner.query(`ALTER TABLE "lwp_user" DROP COLUMN "resetPassToken"`);
        await queryRunner.query(`ALTER TABLE "lwp_user" ADD "microsoftAuth" boolean`);
        await queryRunner.query(`ALTER TABLE "static_lwp_tag" ADD CONSTRAINT "FK_e9c4b22eef2c41bac64c6b5bcc8" FOREIGN KEY ("deletedById") REFERENCES "lwp_user"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "static_lwp_tag" ADD CONSTRAINT "FK_d2554853e4ab4af739d75b23e5e" FOREIGN KEY ("logCreatedById") REFERENCES "lwp_user"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "static_lwp_tag" ADD CONSTRAINT "FK_7f22a7a4bc06719b7309983d0f5" FOREIGN KEY ("logUpdatedById") REFERENCES "lwp_user"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "lwp_activity_tags" ADD CONSTRAINT "FK_579c57aeaa13d383c32f558968c" FOREIGN KEY ("staticLwpActivityId") REFERENCES "static_lwp_activity"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
        await queryRunner.query(`ALTER TABLE "lwp_activity_tags" ADD CONSTRAINT "FK_9fe005a233ecfdb9d8b6f3c388c" FOREIGN KEY ("staticLwpTagId") REFERENCES "static_lwp_tag"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "lwp_activity_tags" DROP CONSTRAINT "FK_9fe005a233ecfdb9d8b6f3c388c"`);
        await queryRunner.query(`ALTER TABLE "lwp_activity_tags" DROP CONSTRAINT "FK_579c57aeaa13d383c32f558968c"`);
        await queryRunner.query(`ALTER TABLE "static_lwp_tag" DROP CONSTRAINT "FK_7f22a7a4bc06719b7309983d0f5"`);
        await queryRunner.query(`ALTER TABLE "static_lwp_tag" DROP CONSTRAINT "FK_d2554853e4ab4af739d75b23e5e"`);
        await queryRunner.query(`ALTER TABLE "static_lwp_tag" DROP CONSTRAINT "FK_e9c4b22eef2c41bac64c6b5bcc8"`);
        await queryRunner.query(`ALTER TABLE "lwp_user" DROP COLUMN "microsoftAuth"`);
        await queryRunner.query(`ALTER TABLE "lwp_user" ADD "microsoftAuth" character varying`);
        await queryRunner.query(`ALTER TABLE "static_lwp_activity" DROP COLUMN "resources"`);
        await queryRunner.query(`ALTER TABLE "lwp_pupil" ADD "watchedIntoVideo" boolean NOT NULL DEFAULT false`);
        await queryRunner.query(`DROP INDEX "public"."IDX_9fe005a233ecfdb9d8b6f3c388"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_579c57aeaa13d383c32f558968"`);
        await queryRunner.query(`DROP TABLE "lwp_activity_tags"`);
        await queryRunner.query(`DROP TABLE "static_lwp_tag"`);
        await queryRunner.query(`ALTER TABLE "lwp_user" RENAME COLUMN "microsoftAuth" TO "resetPassToken"`);
    }

}
