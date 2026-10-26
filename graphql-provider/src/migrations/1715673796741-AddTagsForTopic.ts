import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTagsForTopic1715673796741 implements MigrationInterface {
    name = 'AddTagsForTopic1715673796741';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `CREATE TABLE "static_lwp_topic_tag" ("id" BIGSERIAL NOT NULL, "name" character varying NOT NULL, "color" character varying NOT NULL, "deletedAt" TIMESTAMP, "logCreatedAt" TIMESTAMP DEFAULT ('now'::text)::timestamp(6) with time zone, "logUpdatedAt" TIMESTAMP NOT NULL DEFAULT ('now'::text)::timestamp(6) with time zone, "deletedById" bigint, "logCreatedById" bigint, "logUpdatedById" bigint, CONSTRAINT "PK_b4186ec85f2ca72f184ba70cd06" PRIMARY KEY ("id"))`
        );
        await queryRunner.query(
            `CREATE TABLE "lwp_topic_tags" ("staticLwpTopicId" bigint NOT NULL, "staticLwpTopicTagId" bigint NOT NULL, CONSTRAINT "PK_2c13c7cd7af1321ff654235cf27" PRIMARY KEY ("staticLwpTopicId", "staticLwpTopicTagId"))`
        );
        await queryRunner.query(`CREATE INDEX "IDX_c6019e142545572e5aff10dda4" ON "lwp_topic_tags" ("staticLwpTopicId") `);
        await queryRunner.query(`CREATE INDEX "IDX_1efe79f8f8e52b0b2a788f4fa5" ON "lwp_topic_tags" ("staticLwpTopicTagId") `);
        await queryRunner.query(
            `ALTER TABLE "static_lwp_topic_tag" ADD CONSTRAINT "FK_3d874a69cc610e6edb47643d27e" FOREIGN KEY ("deletedById") REFERENCES "lwp_user"("id") ON DELETE SET NULL ON UPDATE NO ACTION`
        );
        await queryRunner.query(
            `ALTER TABLE "static_lwp_topic_tag" ADD CONSTRAINT "FK_6751a3de932c6c8a10fc5e8c2df" FOREIGN KEY ("logCreatedById") REFERENCES "lwp_user"("id") ON DELETE SET NULL ON UPDATE NO ACTION`
        );
        await queryRunner.query(
            `ALTER TABLE "static_lwp_topic_tag" ADD CONSTRAINT "FK_7ba90d8508a5d220d878b20b893" FOREIGN KEY ("logUpdatedById") REFERENCES "lwp_user"("id") ON DELETE SET NULL ON UPDATE NO ACTION`
        );
        await queryRunner.query(
            `ALTER TABLE "lwp_topic_tags" ADD CONSTRAINT "FK_c6019e142545572e5aff10dda4f" FOREIGN KEY ("staticLwpTopicId") REFERENCES "static_lwp_topic"("id") ON DELETE CASCADE ON UPDATE CASCADE`
        );
        await queryRunner.query(
            `ALTER TABLE "lwp_topic_tags" ADD CONSTRAINT "FK_1efe79f8f8e52b0b2a788f4fa5a" FOREIGN KEY ("staticLwpTopicTagId") REFERENCES "static_lwp_topic_tag"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "lwp_topic_tags" DROP CONSTRAINT "FK_1efe79f8f8e52b0b2a788f4fa5a"`);
        await queryRunner.query(`ALTER TABLE "lwp_topic_tags" DROP CONSTRAINT "FK_c6019e142545572e5aff10dda4f"`);
        await queryRunner.query(`ALTER TABLE "static_lwp_topic_tag" DROP CONSTRAINT "FK_7ba90d8508a5d220d878b20b893"`);
        await queryRunner.query(`ALTER TABLE "static_lwp_topic_tag" DROP CONSTRAINT "FK_6751a3de932c6c8a10fc5e8c2df"`);
        await queryRunner.query(`ALTER TABLE "static_lwp_topic_tag" DROP CONSTRAINT "FK_3d874a69cc610e6edb47643d27e"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_1efe79f8f8e52b0b2a788f4fa5"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_c6019e142545572e5aff10dda4"`);
        await queryRunner.query(`DROP TABLE "lwp_topic_tags"`);
        await queryRunner.query(`DROP TABLE "static_lwp_topic_tag"`);
    }
}
