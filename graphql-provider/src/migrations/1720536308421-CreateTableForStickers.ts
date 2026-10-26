import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateTableForStickers1720536308421 implements MigrationInterface {
    name = 'CreateTableForStickers1720536308421';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `CREATE TABLE "lwp_sticker" ("id" BIGSERIAL NOT NULL, "alt" character varying NOT NULL, "fileName" character varying NOT NULL, "isActive" boolean DEFAULT false, "logCreatedAt" TIMESTAMP DEFAULT ('now'::text)::timestamp(6) with time zone, "logUpdatedAt" TIMESTAMP NOT NULL DEFAULT ('now'::text)::timestamp(6) with time zone, "logCreatedById" bigint, "logUpdatedById" bigint, CONSTRAINT "PK_225717c3eb45bda327f3ccc4397" PRIMARY KEY ("id"))`
        );
        await queryRunner.query(`CREATE INDEX "IDX_e2a73e71fe37d6f70f43ccaa67" ON "lwp_sticker" ("logCreatedById") `);
        await queryRunner.query(`CREATE INDEX "IDX_8f6bf7e571afd306bafab81f60" ON "lwp_sticker" ("logUpdatedById") `);
        await queryRunner.query(`ALTER TABLE "lwp_school" ADD "parentFeedbackStickerFeatureEnabledAt" date`);
        await queryRunner.query(
            `ALTER TABLE "lwp_sticker" ADD CONSTRAINT "FK_e2a73e71fe37d6f70f43ccaa675" FOREIGN KEY ("logCreatedById") REFERENCES "lwp_user"("id") ON DELETE SET NULL ON UPDATE NO ACTION`
        );
        await queryRunner.query(
            `ALTER TABLE "lwp_sticker" ADD CONSTRAINT "FK_8f6bf7e571afd306bafab81f607" FOREIGN KEY ("logUpdatedById") REFERENCES "lwp_user"("id") ON DELETE SET NULL ON UPDATE NO ACTION`
        );
        await queryRunner.query(`ALTER TABLE "lwp_feedback_reply" ADD "stickerId" bigint`);
        await queryRunner.query(
            `ALTER TABLE "lwp_feedback_reply" ADD CONSTRAINT "FK_4917abd6f80f559fe58ec0011e3" FOREIGN KEY ("stickerId") REFERENCES "lwp_sticker"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "lwp_sticker" DROP CONSTRAINT "FK_8f6bf7e571afd306bafab81f607"`);
        await queryRunner.query(`ALTER TABLE "lwp_sticker" DROP CONSTRAINT "FK_e2a73e71fe37d6f70f43ccaa675"`);
        await queryRunner.query(`ALTER TABLE "lwp_school" DROP COLUMN "parentFeedbackStickerFeatureEnabledAt"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_8f6bf7e571afd306bafab81f60"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_e2a73e71fe37d6f70f43ccaa67"`);
        await queryRunner.query(`DROP TABLE "lwp_sticker"`);
        await queryRunner.query(`ALTER TABLE "lwp_feedback_reply" DROP CONSTRAINT "FK_4917abd6f80f559fe58ec0011e3"`);
        await queryRunner.query(`ALTER TABLE "lwp_feedback_reply" DROP COLUMN "stickerId"`);
    }
}
