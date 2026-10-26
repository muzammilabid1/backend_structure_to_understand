import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddLimitedRelease1719310601135 implements MigrationInterface {
    name = 'AddLimitedRelease1719310601135';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `CREATE TABLE "lwp_topic_school_tags" ("staticLwpSchoolTagId" bigint NOT NULL, "staticLwpTopicId" bigint NOT NULL, CONSTRAINT "PK_ee2b1f67d22f917eec885db1c2d" PRIMARY KEY ("staticLwpSchoolTagId", "staticLwpTopicId"))`
        );
        await queryRunner.query(`CREATE INDEX "IDX_3c77e387bbf92f70e5fca50ff3" ON "lwp_topic_school_tags" ("staticLwpSchoolTagId") `);
        await queryRunner.query(`CREATE INDEX "IDX_4a6bb580e0c7c6b593f9722a40" ON "lwp_topic_school_tags" ("staticLwpTopicId") `);
        await queryRunner.query(`ALTER TABLE "static_lwp_topic" ADD "isPublished" boolean NOT NULL DEFAULT true`);
        await queryRunner.query(
            `ALTER TABLE "lwp_topic_school_tags" ADD CONSTRAINT "FK_3c77e387bbf92f70e5fca50ff34" FOREIGN KEY ("staticLwpSchoolTagId") REFERENCES "static_lwp_school_tag"("id") ON DELETE CASCADE ON UPDATE CASCADE`
        );
        await queryRunner.query(
            `ALTER TABLE "lwp_topic_school_tags" ADD CONSTRAINT "FK_4a6bb580e0c7c6b593f9722a405" FOREIGN KEY ("staticLwpTopicId") REFERENCES "static_lwp_topic"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "lwp_topic_school_tags" DROP CONSTRAINT "FK_4a6bb580e0c7c6b593f9722a405"`);
        await queryRunner.query(`ALTER TABLE "lwp_topic_school_tags" DROP CONSTRAINT "FK_3c77e387bbf92f70e5fca50ff34"`);
        await queryRunner.query(`ALTER TABLE "static_lwp_topic" DROP COLUMN "isPublished"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_4a6bb580e0c7c6b593f9722a40"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_3c77e387bbf92f70e5fca50ff3"`);
        await queryRunner.query(`DROP TABLE "lwp_topic_school_tags"`);
    }
}
