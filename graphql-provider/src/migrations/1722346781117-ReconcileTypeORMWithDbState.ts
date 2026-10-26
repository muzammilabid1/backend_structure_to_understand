import {MigrationInterface, QueryRunner} from "typeorm";

export class ReconcileTypeORMWithDbState1722346781117 implements MigrationInterface {
    name = 'ReconcileTypeORMWithDbState1722346781117'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "static_lwp_email_template" DROP CONSTRAINT "FK_e8faf28491416c452bf9167d845"`);
        await queryRunner.query(`ALTER TABLE "static_lwp_email_template" DROP CONSTRAINT "FK_f3420b55b946428dd93fdded258"`);
        await queryRunner.query(`ALTER TABLE "static_lwp_email_template" DROP CONSTRAINT "FK_6a0b0873916c0555e380a926885"`);
        await queryRunner.query(`ALTER TABLE "static_lwp_email_template" DROP CONSTRAINT "FK_32caae413858ec7b43d2d141d34"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_e8faf28491416c452bf9167d84"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_f3420b55b946428dd93fdded25"`);
        await queryRunner.query(`CREATE SEQUENCE IF NOT EXISTS "static_lwp_email_template_id_seq" OWNED BY "static_lwp_email_template"."id"`);
        await queryRunner.query(`ALTER TABLE "static_lwp_email_template" ALTER COLUMN "id" SET DEFAULT nextval('"static_lwp_email_template_id_seq"')`);
        await queryRunner.query(`CREATE INDEX "IDX_ad67af2a7d0eb9e2105a24201d" ON "static_lwp_email_template" ("logCreatedById") `);
        await queryRunner.query(`CREATE INDEX "IDX_f26694a15188cc59278a3a8dc1" ON "static_lwp_email_template" ("logUpdatedById") `);
        await queryRunner.query(`ALTER TABLE "static_lwp_email_template" ADD CONSTRAINT "FK_d315af31fd70fb8f7232de033d9" FOREIGN KEY ("lwpNotificationId") REFERENCES "lwp_notification"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "static_lwp_email_template" ADD CONSTRAINT "FK_ad67af2a7d0eb9e2105a24201d4" FOREIGN KEY ("logCreatedById") REFERENCES "lwp_user"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "static_lwp_email_template" ADD CONSTRAINT "FK_f26694a15188cc59278a3a8dc1f" FOREIGN KEY ("logUpdatedById") REFERENCES "lwp_user"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "static_lwp_email_template" ADD CONSTRAINT "FK_e1f843c022ace5ffed5af0e8fed" FOREIGN KEY ("deletedById") REFERENCES "lwp_user"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "static_lwp_email_template" DROP CONSTRAINT "FK_e1f843c022ace5ffed5af0e8fed"`);
        await queryRunner.query(`ALTER TABLE "static_lwp_email_template" DROP CONSTRAINT "FK_f26694a15188cc59278a3a8dc1f"`);
        await queryRunner.query(`ALTER TABLE "static_lwp_email_template" DROP CONSTRAINT "FK_ad67af2a7d0eb9e2105a24201d4"`);
        await queryRunner.query(`ALTER TABLE "static_lwp_email_template" DROP CONSTRAINT "FK_d315af31fd70fb8f7232de033d9"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_f26694a15188cc59278a3a8dc1"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_ad67af2a7d0eb9e2105a24201d"`);
        await queryRunner.query(`ALTER TABLE "static_lwp_email_template" ALTER COLUMN "id" DROP DEFAULT`);
        await queryRunner.query(`DROP SEQUENCE "static_lwp_email_template_id_seq"`);
        await queryRunner.query(`CREATE INDEX "IDX_f3420b55b946428dd93fdded25" ON "static_lwp_email_template" ("logUpdatedById") `);
        await queryRunner.query(`CREATE INDEX "IDX_e8faf28491416c452bf9167d84" ON "static_lwp_email_template" ("logCreatedById") `);
        await queryRunner.query(`ALTER TABLE "static_lwp_email_template" ADD CONSTRAINT "FK_32caae413858ec7b43d2d141d34" FOREIGN KEY ("deletedById") REFERENCES "lwp_user"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "static_lwp_email_template" ADD CONSTRAINT "FK_6a0b0873916c0555e380a926885" FOREIGN KEY ("lwpNotificationId") REFERENCES "lwp_notification"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "static_lwp_email_template" ADD CONSTRAINT "FK_f3420b55b946428dd93fdded258" FOREIGN KEY ("logUpdatedById") REFERENCES "lwp_user"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "static_lwp_email_template" ADD CONSTRAINT "FK_e8faf28491416c452bf9167d845" FOREIGN KEY ("logCreatedById") REFERENCES "lwp_user"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
    }

}
