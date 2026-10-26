import {MigrationInterface, QueryRunner} from "typeorm";

export class migration1661862194395 implements MigrationInterface {
    name = 'migration1661862194395'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "static_lwp_topic" DROP CONSTRAINT "FK_52f3018dcb9c1e9db5e4eff2d84"`);
        await queryRunner.query(`ALTER TABLE "static_lwp_topic" DROP CONSTRAINT "FK_4ecf4c345fef244098effded11b"`);
        await queryRunner.query(`CREATE TABLE "lwp_topic_year_groups" ("staticLwpTopicId" bigint NOT NULL, "staticLwpYearGroupId" bigint NOT NULL, CONSTRAINT "PK_bf4137de3723e91ebee7010c39f" PRIMARY KEY ("staticLwpTopicId", "staticLwpYearGroupId"))`);
	await queryRunner.query(`INSERT INTO lwp_topic_year_groups ("staticLwpTopicId", "staticLwpYearGroupId") SELECT id, "yearGroup" FROM static_lwp_topic WHERE "yearGroup" IS NOT NULL`);
	await queryRunner.query(`INSERT INTO lwp_topic_year_groups ("staticLwpTopicId", "staticLwpYearGroupId") SELECT id, "alternativeYear" FROM static_lwp_topic WHERE "alternativeYear" IS NOT NULL`);
        await queryRunner.query(`CREATE INDEX "IDX_df0f479d7c2b0d03226a29be8f" ON "lwp_topic_year_groups" ("staticLwpTopicId") `);
        await queryRunner.query(`CREATE INDEX "IDX_74ec697bf0e09b8e9cbb315b18" ON "lwp_topic_year_groups" ("staticLwpYearGroupId") `);
        await queryRunner.query(`ALTER TABLE "lwp_class_topic" ADD "skipGroupPupils" boolean NOT NULL DEFAULT false`);
        await queryRunner.query(`ALTER TABLE "lwp_topic_year_groups" ADD CONSTRAINT "FK_df0f479d7c2b0d03226a29be8fa" FOREIGN KEY ("staticLwpTopicId") REFERENCES "static_lwp_topic"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
        await queryRunner.query(`ALTER TABLE "lwp_topic_year_groups" ADD CONSTRAINT "FK_74ec697bf0e09b8e9cbb315b188" FOREIGN KEY ("staticLwpYearGroupId") REFERENCES "static_lwp_year_group"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "lwp_topic_year_groups" DROP CONSTRAINT "FK_74ec697bf0e09b8e9cbb315b188"`);
        await queryRunner.query(`ALTER TABLE "lwp_topic_year_groups" DROP CONSTRAINT "FK_df0f479d7c2b0d03226a29be8fa"`);
        await queryRunner.query(`ALTER TABLE "lwp_class_topic" DROP COLUMN "skipGroupPupils"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_74ec697bf0e09b8e9cbb315b18"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_df0f479d7c2b0d03226a29be8f"`);
        await queryRunner.query(`DROP TABLE "lwp_topic_year_groups"`);
        await queryRunner.query(`ALTER TABLE "static_lwp_topic" ADD CONSTRAINT "FK_4ecf4c345fef244098effded11b" FOREIGN KEY ("alternativeYear") REFERENCES "static_lwp_year_group"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "static_lwp_topic" ADD CONSTRAINT "FK_52f3018dcb9c1e9db5e4eff2d84" FOREIGN KEY ("yearGroup") REFERENCES "static_lwp_year_group"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

}
