import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddStaticLwpFeaturesTable1738815626656 implements MigrationInterface {
    name = 'AddStaticLwpFeaturesTable1738815626656';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `CREATE TABLE "static_lwp_features" ("name" character varying NOT NULL, "description" character varying, "status" character varying NOT NULL, "code" character varying NOT NULL, "id" BIGSERIAL NOT NULL, "logCreatedAt" TIMESTAMP DEFAULT ('now'::text)::timestamp(6) with time zone, "logUpdatedAt" TIMESTAMP NOT NULL DEFAULT ('now'::text)::timestamp(6) with time zone, "logCreatedById" bigint, "logUpdatedById" bigint, CONSTRAINT "PK_aefee1aae734c186728e14964c7" PRIMARY KEY ("id"))`
        );
        await queryRunner.query(`CREATE INDEX "IDX_78c748cf7a31641237cc68d0ae" ON "static_lwp_features" ("logCreatedById") `);
        await queryRunner.query(`CREATE INDEX "IDX_dc1a9dffbea825626a6c2822c4" ON "static_lwp_features" ("logUpdatedById") `);
        await queryRunner.query(
            `CREATE TABLE "lwp_features_school_tags" ("staticLwpFeaturesId" bigint NOT NULL, "staticLwpSchoolTagId" bigint NOT NULL, CONSTRAINT "PK_d33811ec730cc4fe7f4f9de8024" PRIMARY KEY ("staticLwpFeaturesId", "staticLwpSchoolTagId"))`
        );
        await queryRunner.query(`CREATE INDEX "IDX_282255dcbb7f683d3fdf5b03cd" ON "lwp_features_school_tags" ("staticLwpFeaturesId") `);
        await queryRunner.query(`CREATE INDEX "IDX_19b344e5b8bd29e60586b80dc8" ON "lwp_features_school_tags" ("staticLwpSchoolTagId") `);
        await queryRunner.query(
            `ALTER TABLE "static_lwp_features" ADD CONSTRAINT "FK_78c748cf7a31641237cc68d0ae4" FOREIGN KEY ("logCreatedById") REFERENCES "lwp_user"("id") ON DELETE SET NULL ON UPDATE NO ACTION`
        );
        await queryRunner.query(
            `ALTER TABLE "static_lwp_features" ADD CONSTRAINT "FK_dc1a9dffbea825626a6c2822c45" FOREIGN KEY ("logUpdatedById") REFERENCES "lwp_user"("id") ON DELETE SET NULL ON UPDATE NO ACTION`
        );
        await queryRunner.query(
            `ALTER TABLE "lwp_features_school_tags" ADD CONSTRAINT "FK_282255dcbb7f683d3fdf5b03cda" FOREIGN KEY ("staticLwpFeaturesId") REFERENCES "static_lwp_features"("id") ON DELETE CASCADE ON UPDATE CASCADE`
        );
        await queryRunner.query(
            `ALTER TABLE "lwp_features_school_tags" ADD CONSTRAINT "FK_19b344e5b8bd29e60586b80dc8d" FOREIGN KEY ("staticLwpSchoolTagId") REFERENCES "static_lwp_school_tag"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "lwp_features_school_tags" DROP CONSTRAINT "FK_19b344e5b8bd29e60586b80dc8d"`);
        await queryRunner.query(`ALTER TABLE "lwp_features_school_tags" DROP CONSTRAINT "FK_282255dcbb7f683d3fdf5b03cda"`);
        await queryRunner.query(`ALTER TABLE "static_lwp_features" DROP CONSTRAINT "FK_dc1a9dffbea825626a6c2822c45"`);
        await queryRunner.query(`ALTER TABLE "static_lwp_features" DROP CONSTRAINT "FK_78c748cf7a31641237cc68d0ae4"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_19b344e5b8bd29e60586b80dc8"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_282255dcbb7f683d3fdf5b03cd"`);
        await queryRunner.query(`DROP TABLE "lwp_features_school_tags"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_dc1a9dffbea825626a6c2822c4"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_78c748cf7a31641237cc68d0ae"`);
        await queryRunner.query(`DROP TABLE "static_lwp_features"`);
    }
}
