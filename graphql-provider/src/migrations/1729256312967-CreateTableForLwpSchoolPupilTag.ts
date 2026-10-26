import { disableRLS, enableRLS } from 'src/migration_helpers/1721038124744-enable_rls';
import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateTableForLwpSchoolPupilTag1729256312967 implements MigrationInterface {
    name = 'CreateTableForLwpSchoolPupilTag1729256312967';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `CREATE TABLE "lwp_pupil_tag" ("id" BIGSERIAL NOT NULL, "name" character varying NOT NULL, "color" character varying NOT NULL, "deletedAt" TIMESTAMP, "logCreatedAt" TIMESTAMP DEFAULT ('now'::text)::timestamp(6) with time zone, "logUpdatedAt" TIMESTAMP NOT NULL DEFAULT ('now'::text)::timestamp(6) with time zone, "schoolId" bigint, "deletedById" bigint, "logCreatedById" bigint, "logUpdatedById" bigint, CONSTRAINT "PK_a0941e34b566e4290f15e4eb2d8" PRIMARY KEY ("id"))`
        );
        await queryRunner.query(
            `CREATE TABLE "lwp_pupil_tag_pupil" ("lwpPupilTagId" bigint NOT NULL, "lwpPupilId" bigint NOT NULL, CONSTRAINT "PK_18d2a64bfdcc34d62b7d6899c03" PRIMARY KEY ("lwpPupilTagId", "lwpPupilId"))`
        );
        await queryRunner.query(`CREATE INDEX "IDX_c073f5bf6bec7433a90dac58f4" ON "lwp_pupil_tag_pupil" ("lwpPupilTagId") `);
        await queryRunner.query(`CREATE INDEX "IDX_effc65b4cfba0969bbbbc1f5e8" ON "lwp_pupil_tag_pupil" ("lwpPupilId") `);
        await queryRunner.query(
            `ALTER TABLE "lwp_pupil_tag" ADD CONSTRAINT "FK_adc3799b3fafff1125b6840e561" FOREIGN KEY ("schoolId") REFERENCES "lwp_school"("id") ON DELETE CASCADE ON UPDATE NO ACTION`
        );
        await queryRunner.query(
            `ALTER TABLE "lwp_pupil_tag" ADD CONSTRAINT "FK_78e25a8e1141d213da6406c4a2c" FOREIGN KEY ("deletedById") REFERENCES "lwp_user"("id") ON DELETE SET NULL ON UPDATE NO ACTION`
        );
        await queryRunner.query(
            `ALTER TABLE "lwp_pupil_tag" ADD CONSTRAINT "FK_0c4842757a45a023ea0cc5453d6" FOREIGN KEY ("logCreatedById") REFERENCES "lwp_user"("id") ON DELETE SET NULL ON UPDATE NO ACTION`
        );
        await queryRunner.query(
            `ALTER TABLE "lwp_pupil_tag" ADD CONSTRAINT "FK_1ff52a874f69b42179381862267" FOREIGN KEY ("logUpdatedById") REFERENCES "lwp_user"("id") ON DELETE SET NULL ON UPDATE NO ACTION`
        );
        await queryRunner.query(
            `ALTER TABLE "lwp_pupil_tag_pupil" ADD CONSTRAINT "FK_c073f5bf6bec7433a90dac58f4b" FOREIGN KEY ("lwpPupilTagId") REFERENCES "lwp_pupil_tag"("id") ON DELETE CASCADE ON UPDATE CASCADE`
        );
        await queryRunner.query(
            `ALTER TABLE "lwp_pupil_tag_pupil" ADD CONSTRAINT "FK_effc65b4cfba0969bbbbc1f5e8d" FOREIGN KEY ("lwpPupilId") REFERENCES "lwp_pupil"("id") ON DELETE CASCADE ON UPDATE NO ACTION`
        );
        await enableRLS(queryRunner, 'lwp_pupil_tag');
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await disableRLS(queryRunner, 'lwp_pupil_tag');

        await queryRunner.query(`ALTER TABLE "lwp_pupil_tag_pupil" DROP CONSTRAINT "FK_effc65b4cfba0969bbbbc1f5e8d"`);
        await queryRunner.query(`ALTER TABLE "lwp_pupil_tag_pupil" DROP CONSTRAINT "FK_c073f5bf6bec7433a90dac58f4b"`);
        await queryRunner.query(`ALTER TABLE "lwp_pupil_tag" DROP CONSTRAINT "FK_1ff52a874f69b42179381862267"`);
        await queryRunner.query(`ALTER TABLE "lwp_pupil_tag" DROP CONSTRAINT "FK_0c4842757a45a023ea0cc5453d6"`);
        await queryRunner.query(`ALTER TABLE "lwp_pupil_tag" DROP CONSTRAINT "FK_78e25a8e1141d213da6406c4a2c"`);
        await queryRunner.query(`ALTER TABLE "lwp_pupil_tag" DROP CONSTRAINT "FK_adc3799b3fafff1125b6840e561"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_effc65b4cfba0969bbbbc1f5e8"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_c073f5bf6bec7433a90dac58f4"`);
        await queryRunner.query(`DROP TABLE "lwp_pupil_tag_pupil"`);
        await queryRunner.query(`DROP TABLE "lwp_pupil_tag"`);
    }
}
