import { MigrationInterface, QueryRunner } from "typeorm";

export class RemoveDeletedAtFromStaticLwpFeatureTooltip1743592280646 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_06f7b1e827de53dcace76ea575"`);
        await queryRunner.query(`DELETE FROM "static_lwp_feature_tooltip" WHERE "deletedAt" IS NOT NULL;`);
        await queryRunner.query(`ALTER TABLE "static_lwp_feature_tooltip" DROP COLUMN "deletedAt" CASCADE`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "static_lwp_feature_tooltip" ADD COLUMN "deletedAt" TIMESTAMP`);
        await queryRunner.query(`CREATE INDEX "IDX_06f7b1e827de53dcace76ea575" ON "static_lwp_feature_tooltip" ("deletedAt") `);
    }

}
