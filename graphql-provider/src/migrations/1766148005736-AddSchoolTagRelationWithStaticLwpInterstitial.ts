import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSchoolTagRelationWithStaticLwpInterstitial1766148005736 implements MigrationInterface {
    name = 'AddSchoolTagRelationWithStaticLwpInterstitial1766148005736';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `CREATE TABLE "static_lwp_interstitial_school_tags" ("staticLwpInterstitialId" bigint NOT NULL, "staticLwpSchoolTagId" bigint NOT NULL, CONSTRAINT "PK_dfcdb5d85f450de2488fe08b60e" PRIMARY KEY ("staticLwpInterstitialId", "staticLwpSchoolTagId"))`
        );
        await queryRunner.query(
            `CREATE INDEX "IDX_4af14f483eda27be61690bbba3" ON "static_lwp_interstitial_school_tags" ("staticLwpInterstitialId") `
        );
        await queryRunner.query(
            `CREATE INDEX "IDX_08b502e90f091cc84768661804" ON "static_lwp_interstitial_school_tags" ("staticLwpSchoolTagId") `
        );

        await queryRunner.query(
            `ALTER TABLE "static_lwp_interstitial_school_tags" ADD CONSTRAINT "FK_4af14f483eda27be61690bbba38" FOREIGN KEY ("staticLwpInterstitialId") REFERENCES "static_lwp_interstitial"("id") ON DELETE CASCADE ON UPDATE CASCADE`
        );
        await queryRunner.query(
            `ALTER TABLE "static_lwp_interstitial_school_tags" ADD CONSTRAINT "FK_08b502e90f091cc847686618040" FOREIGN KEY ("staticLwpSchoolTagId") REFERENCES "static_lwp_school_tag"("id") ON DELETE CASCADE ON UPDATE NO ACTION`
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "static_lwp_interstitial_school_tags" DROP CONSTRAINT "FK_08b502e90f091cc847686618040"`);
        await queryRunner.query(`ALTER TABLE "static_lwp_interstitial_school_tags" DROP CONSTRAINT "FK_4af14f483eda27be61690bbba38"`);

        await queryRunner.query(`DROP INDEX "public"."IDX_08b502e90f091cc84768661804"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_4af14f483eda27be61690bbba3"`);
        await queryRunner.query(`DROP TABLE "static_lwp_interstitial_school_tags"`);
    }
}
