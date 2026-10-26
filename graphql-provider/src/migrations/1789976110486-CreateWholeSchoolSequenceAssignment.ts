import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateWholeSchoolSequenceAssignment1789976110486 implements MigrationInterface {
    name = 'CreateWholeSchoolSequenceAssignment1789976110486';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `CREATE TABLE "lwp_whole_school_sequence_assignment" ("status" character varying NOT NULL DEFAULT 'ASSIGNED', "id" BIGSERIAL NOT NULL, "logCreatedAt" TIMESTAMP DEFAULT ('now'::text)::timestamp(6) with time zone, "logUpdatedAt" TIMESTAMP NOT NULL DEFAULT ('now'::text)::timestamp(6) with time zone, "schoolId" bigint NOT NULL, "wholeSchoolSequenceId" bigint, "subjectId" bigint NOT NULL, "periodIndex" integer NOT NULL, "logCreatedById" bigint, "logUpdatedById" bigint, CONSTRAINT "PK_2f51ec45e885929c65c0d37cbf2" PRIMARY KEY ("id"))`
        );
        await queryRunner.query(`CREATE INDEX "IDX_5fd36d760e6f6db1bbd8dd93b5" ON "lwp_whole_school_sequence_assignment" ("schoolId") `);
        await queryRunner.query(
            `CREATE INDEX "IDX_f9d60a30966674e62ef3f7de0f" ON "lwp_whole_school_sequence_assignment" ("wholeSchoolSequenceId") `
        );
        await queryRunner.query(`CREATE INDEX "IDX_99eb7b3e12f774993f936ae458" ON "lwp_whole_school_sequence_assignment" ("subjectId") `);
        await queryRunner.query(`CREATE INDEX "IDX_3c4acbc1a3ac5b558aa23f1ceb" ON "lwp_whole_school_sequence_assignment" ("periodIndex") `);
        await queryRunner.query(
            `CREATE INDEX "IDX_dd391908d6abde73a14df4423a" ON "lwp_whole_school_sequence_assignment" ("logCreatedById") `
        );
        await queryRunner.query(
            `CREATE INDEX "IDX_f7780dc9409a0424be362f0075" ON "lwp_whole_school_sequence_assignment" ("logUpdatedById") `
        );
        await queryRunner.query(
            `CREATE UNIQUE INDEX "idx_unique_whole_school_assignment_live" ON "lwp_whole_school_sequence_assignment" ("schoolId", "subjectId", "periodIndex") WHERE "status" = 'ASSIGNED'`
        );
        await queryRunner.query(`ALTER TABLE "lwp_class_sequence_assignment" ADD "wholeSchoolAssignmentId" bigint`);
        await queryRunner.query(
            `CREATE INDEX "IDX_18c1cc22b7a4218f7ddda076eb" ON "lwp_class_sequence_assignment" ("wholeSchoolAssignmentId") `
        );
        await queryRunner.query(
            `ALTER TABLE "lwp_whole_school_sequence_assignment" ADD CONSTRAINT "FK_5fd36d760e6f6db1bbd8dd93b58" FOREIGN KEY ("schoolId") REFERENCES "lwp_school"("id") ON DELETE CASCADE ON UPDATE NO ACTION`
        );
        await queryRunner.query(
            `ALTER TABLE "lwp_whole_school_sequence_assignment" ADD CONSTRAINT "FK_f9d60a30966674e62ef3f7de0fc" FOREIGN KEY ("wholeSchoolSequenceId") REFERENCES "static_lwp_whole_school_sequence"("id") ON DELETE SET NULL ON UPDATE NO ACTION`
        );
        await queryRunner.query(
            `ALTER TABLE "lwp_whole_school_sequence_assignment" ADD CONSTRAINT "FK_99eb7b3e12f774993f936ae4589" FOREIGN KEY ("subjectId") REFERENCES "static_lwp_subject"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`
        );
        await queryRunner.query(
            `ALTER TABLE "lwp_whole_school_sequence_assignment" ADD CONSTRAINT "FK_3c4acbc1a3ac5b558aa23f1ceb9" FOREIGN KEY ("periodIndex") REFERENCES "static_lwp_period"("index") ON DELETE RESTRICT ON UPDATE NO ACTION`
        );
        await queryRunner.query(
            `ALTER TABLE "lwp_whole_school_sequence_assignment" ADD CONSTRAINT "FK_dd391908d6abde73a14df4423a5" FOREIGN KEY ("logCreatedById") REFERENCES "lwp_user"("id") ON DELETE SET NULL ON UPDATE NO ACTION`
        );
        await queryRunner.query(
            `ALTER TABLE "lwp_whole_school_sequence_assignment" ADD CONSTRAINT "FK_f7780dc9409a0424be362f0075f" FOREIGN KEY ("logUpdatedById") REFERENCES "lwp_user"("id") ON DELETE SET NULL ON UPDATE NO ACTION`
        );
        await queryRunner.query(
            `ALTER TABLE "lwp_class_sequence_assignment" ADD CONSTRAINT "FK_18c1cc22b7a4218f7ddda076eb6" FOREIGN KEY ("wholeSchoolAssignmentId") REFERENCES "lwp_whole_school_sequence_assignment"("id") ON DELETE SET NULL ON UPDATE NO ACTION`
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "lwp_class_sequence_assignment" DROP CONSTRAINT "FK_18c1cc22b7a4218f7ddda076eb6"`);
        await queryRunner.query(`ALTER TABLE "lwp_whole_school_sequence_assignment" DROP CONSTRAINT "FK_f7780dc9409a0424be362f0075f"`);
        await queryRunner.query(`ALTER TABLE "lwp_whole_school_sequence_assignment" DROP CONSTRAINT "FK_dd391908d6abde73a14df4423a5"`);
        await queryRunner.query(`ALTER TABLE "lwp_whole_school_sequence_assignment" DROP CONSTRAINT "FK_3c4acbc1a3ac5b558aa23f1ceb9"`);
        await queryRunner.query(`ALTER TABLE "lwp_whole_school_sequence_assignment" DROP CONSTRAINT "FK_99eb7b3e12f774993f936ae4589"`);
        await queryRunner.query(`ALTER TABLE "lwp_whole_school_sequence_assignment" DROP CONSTRAINT "FK_f9d60a30966674e62ef3f7de0fc"`);
        await queryRunner.query(`ALTER TABLE "lwp_whole_school_sequence_assignment" DROP CONSTRAINT "FK_5fd36d760e6f6db1bbd8dd93b58"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_18c1cc22b7a4218f7ddda076eb"`);
        await queryRunner.query(`ALTER TABLE "lwp_class_sequence_assignment" DROP COLUMN "wholeSchoolAssignmentId"`);
        await queryRunner.query(`DROP INDEX "public"."idx_unique_whole_school_assignment_live"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_f7780dc9409a0424be362f0075"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_dd391908d6abde73a14df4423a"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_3c4acbc1a3ac5b558aa23f1ceb"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_99eb7b3e12f774993f936ae458"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_f9d60a30966674e62ef3f7de0f"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_5fd36d760e6f6db1bbd8dd93b5"`);
        await queryRunner.query(`DROP TABLE "lwp_whole_school_sequence_assignment"`);
    }
}
