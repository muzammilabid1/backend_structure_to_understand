import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddStaticLwpFeatureTooltipTable1739632289727 implements MigrationInterface {
    name = 'AddStaticLwpFeatureTooltipTable1739632289727';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `CREATE TABLE "static_lwp_feature_tooltip" ("name" character varying NOT NULL, "targetId" character varying NOT NULL, "order" integer NOT NULL, "userTypes" jsonb NOT NULL DEFAULT '[]', "status" character varying NOT NULL, "message" character varying NOT NULL, "imageUrl" character varying, "id" BIGSERIAL NOT NULL, "logCreatedAt" TIMESTAMP DEFAULT ('now'::text)::timestamp(6) with time zone, "logUpdatedAt" TIMESTAMP NOT NULL DEFAULT ('now'::text)::timestamp(6) with time zone, "deletedAt" TIMESTAMP, "logCreatedById" bigint, "logUpdatedById" bigint, "deletedById" bigint, CONSTRAINT "UQ_STATIC_LWP_FEATURE_TOOLTIP_TARGET_ID" UNIQUE ("targetId"), CONSTRAINT "PK_5486288cce1a5a28b3a451bc4e6" PRIMARY KEY ("id"))`
        );
        await queryRunner.query(`CREATE INDEX "IDX_fdd8dcaf2aea58985f026212ae" ON "static_lwp_feature_tooltip" ("targetId") `);
        await queryRunner.query(`CREATE INDEX "IDX_662ff91cd885473c9047f60cee" ON "static_lwp_feature_tooltip" ("order") `);
        await queryRunner.query(`CREATE INDEX "IDX_6442bd69af1158768dd29a64d7" ON "static_lwp_feature_tooltip" ("userTypes") `);
        await queryRunner.query(`CREATE INDEX "IDX_eb27ed4c12a7b0f71853226c61" ON "static_lwp_feature_tooltip" ("status") `);
        await queryRunner.query(`CREATE INDEX "IDX_06f7b1e827de53dcace76ea575" ON "static_lwp_feature_tooltip" ("deletedAt") `);
        await queryRunner.query(`ALTER TABLE "lwp_user_tooltip_history" ADD "featureTooltipId" bigint`);
        await queryRunner.query(`ALTER TABLE "lwp_user_tooltip_history" ALTER COLUMN "type" DROP NOT NULL`);
        await queryRunner.query(`CREATE INDEX "IDX_6de6dec113817625220ee50fc9" ON "lwp_user_tooltip_history" ("featureTooltipId") `);
        await queryRunner.query(
            `ALTER TABLE "static_lwp_feature_tooltip" ADD CONSTRAINT "FK_6f26ef0bd27df4e4fbca71d9cc0" FOREIGN KEY ("logCreatedById") REFERENCES "lwp_user"("id") ON DELETE SET NULL ON UPDATE NO ACTION`
        );
        await queryRunner.query(
            `ALTER TABLE "static_lwp_feature_tooltip" ADD CONSTRAINT "FK_1f076191a7695997b1b22979387" FOREIGN KEY ("logUpdatedById") REFERENCES "lwp_user"("id") ON DELETE SET NULL ON UPDATE NO ACTION`
        );
        await queryRunner.query(
            `ALTER TABLE "static_lwp_feature_tooltip" ADD CONSTRAINT "FK_d5eac1380c3d652c69a2cba5756" FOREIGN KEY ("deletedById") REFERENCES "lwp_user"("id") ON DELETE SET NULL ON UPDATE NO ACTION`
        );
        await queryRunner.query(
            `ALTER TABLE "lwp_user_tooltip_history" ADD CONSTRAINT "FK_6de6dec113817625220ee50fc90" FOREIGN KEY ("featureTooltipId") REFERENCES "static_lwp_feature_tooltip"("id") ON DELETE SET NULL ON UPDATE NO ACTION`
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "lwp_user_tooltip_history" DROP CONSTRAINT "FK_6de6dec113817625220ee50fc90"`);
        await queryRunner.query(`ALTER TABLE "static_lwp_feature_tooltip" DROP CONSTRAINT "FK_d5eac1380c3d652c69a2cba5756"`);
        await queryRunner.query(`ALTER TABLE "static_lwp_feature_tooltip" DROP CONSTRAINT "FK_1f076191a7695997b1b22979387"`);
        await queryRunner.query(`ALTER TABLE "static_lwp_feature_tooltip" DROP CONSTRAINT "FK_6f26ef0bd27df4e4fbca71d9cc0"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_6de6dec113817625220ee50fc9"`);
        await queryRunner.query(`ALTER TABLE "lwp_user_tooltip_history" ALTER COLUMN "type" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "lwp_user_tooltip_history" DROP COLUMN "featureTooltipId"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_06f7b1e827de53dcace76ea575"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_eb27ed4c12a7b0f71853226c61"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_6442bd69af1158768dd29a64d7"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_662ff91cd885473c9047f60cee"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_fdd8dcaf2aea58985f026212ae"`);
        await queryRunner.query(`DROP TABLE "static_lwp_feature_tooltip"`);
    }
}
