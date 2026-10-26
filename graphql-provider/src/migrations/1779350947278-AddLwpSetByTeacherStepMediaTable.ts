import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddLwpSetByTeacherStepMediaTable1779350947278 implements MigrationInterface {
    name = 'AddLwpSetByTeacherStepMediaTable1779350947278';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `CREATE TABLE "lwp_set_by_teacher_step_media" ("filename" character varying NOT NULL, "id" BIGSERIAL NOT NULL, "logCreatedAt" TIMESTAMP DEFAULT ('now'::text)::timestamp(6) with time zone, "logUpdatedAt" TIMESTAMP NOT NULL DEFAULT ('now'::text)::timestamp(6) with time zone, "stepId" bigint NOT NULL, "classTopicId" bigint, "deletedById" bigint, "logCreatedById" bigint, "logUpdatedById" bigint, CONSTRAINT "UQ_sbt_step_media_step_class_topic" UNIQUE ("stepId", "classTopicId"), CONSTRAINT "PK_68a239d749b16158c48d68e02a9" PRIMARY KEY ("id"))`
        );
        await queryRunner.query(`CREATE INDEX "IDX_f110371c18b6a8ee913f06ea14" ON "lwp_set_by_teacher_step_media" ("stepId") `);
        await queryRunner.query(`CREATE INDEX "IDX_eadc23c6b1ddecdced5f3ad613" ON "lwp_set_by_teacher_step_media" ("classTopicId") `);
        await queryRunner.query(`CREATE INDEX "IDX_ea80fe59ddaa4a932e7232f738" ON "lwp_set_by_teacher_step_media" ("deletedById") `);
        await queryRunner.query(`CREATE INDEX "IDX_31dc0989ede8ef8584abb61b29" ON "lwp_set_by_teacher_step_media" ("logCreatedById") `);
        await queryRunner.query(`CREATE INDEX "IDX_f201e47357276b98d934574b81" ON "lwp_set_by_teacher_step_media" ("logUpdatedById") `);
        await queryRunner.query(
            `CREATE TABLE "lwp_pupil_topic_sbt_step_media" ("lwpSetByTeacherStepMediaId" bigint NOT NULL, "lwpPupilTopicId" bigint NOT NULL, CONSTRAINT "PK_58f087798fcb240365c6bda9998" PRIMARY KEY ("lwpSetByTeacherStepMediaId", "lwpPupilTopicId"))`
        );
        await queryRunner.query(
            `CREATE INDEX "IDX_1a1fb7e26fa2ee368363133db5" ON "lwp_pupil_topic_sbt_step_media" ("lwpSetByTeacherStepMediaId") `
        );
        await queryRunner.query(`CREATE INDEX "IDX_c8202e1571c50001f58d3ea213" ON "lwp_pupil_topic_sbt_step_media" ("lwpPupilTopicId") `);
        await queryRunner.query(
            `ALTER TABLE "lwp_set_by_teacher_step_media" ADD CONSTRAINT "FK_f110371c18b6a8ee913f06ea14d" FOREIGN KEY ("stepId") REFERENCES "static_lwp_activity_steps"("id") ON DELETE CASCADE ON UPDATE NO ACTION`
        );
        await queryRunner.query(
            `ALTER TABLE "lwp_set_by_teacher_step_media" ADD CONSTRAINT "FK_eadc23c6b1ddecdced5f3ad6138" FOREIGN KEY ("classTopicId") REFERENCES "lwp_class_topic"("id") ON DELETE SET NULL ON UPDATE NO ACTION`
        );
        await queryRunner.query(
            `ALTER TABLE "lwp_set_by_teacher_step_media" ADD CONSTRAINT "FK_ea80fe59ddaa4a932e7232f7382" FOREIGN KEY ("deletedById") REFERENCES "lwp_user"("id") ON DELETE SET NULL ON UPDATE NO ACTION`
        );
        await queryRunner.query(
            `ALTER TABLE "lwp_set_by_teacher_step_media" ADD CONSTRAINT "FK_31dc0989ede8ef8584abb61b297" FOREIGN KEY ("logCreatedById") REFERENCES "lwp_user"("id") ON DELETE SET NULL ON UPDATE NO ACTION`
        );
        await queryRunner.query(
            `ALTER TABLE "lwp_set_by_teacher_step_media" ADD CONSTRAINT "FK_f201e47357276b98d934574b81c" FOREIGN KEY ("logUpdatedById") REFERENCES "lwp_user"("id") ON DELETE SET NULL ON UPDATE NO ACTION`
        );
        await queryRunner.query(
            `ALTER TABLE "lwp_pupil_topic_sbt_step_media" ADD CONSTRAINT "FK_1a1fb7e26fa2ee368363133db5a" FOREIGN KEY ("lwpSetByTeacherStepMediaId") REFERENCES "lwp_set_by_teacher_step_media"("id") ON DELETE CASCADE ON UPDATE CASCADE`
        );
        await queryRunner.query(
            `ALTER TABLE "lwp_pupil_topic_sbt_step_media" ADD CONSTRAINT "FK_c8202e1571c50001f58d3ea213e" FOREIGN KEY ("lwpPupilTopicId") REFERENCES "lwp_pupil_topic"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "lwp_pupil_topic_sbt_step_media" DROP CONSTRAINT "FK_c8202e1571c50001f58d3ea213e"`);
        await queryRunner.query(`ALTER TABLE "lwp_pupil_topic_sbt_step_media" DROP CONSTRAINT "FK_1a1fb7e26fa2ee368363133db5a"`);
        await queryRunner.query(`ALTER TABLE "lwp_set_by_teacher_step_media" DROP CONSTRAINT "FK_f201e47357276b98d934574b81c"`);
        await queryRunner.query(`ALTER TABLE "lwp_set_by_teacher_step_media" DROP CONSTRAINT "FK_31dc0989ede8ef8584abb61b297"`);
        await queryRunner.query(`ALTER TABLE "lwp_set_by_teacher_step_media" DROP CONSTRAINT "FK_ea80fe59ddaa4a932e7232f7382"`);
        await queryRunner.query(`ALTER TABLE "lwp_set_by_teacher_step_media" DROP CONSTRAINT "FK_eadc23c6b1ddecdced5f3ad6138"`);
        await queryRunner.query(`ALTER TABLE "lwp_set_by_teacher_step_media" DROP CONSTRAINT "FK_f110371c18b6a8ee913f06ea14d"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_c8202e1571c50001f58d3ea213"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_1a1fb7e26fa2ee368363133db5"`);
        await queryRunner.query(`DROP TABLE "lwp_pupil_topic_sbt_step_media"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_f201e47357276b98d934574b81"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_31dc0989ede8ef8584abb61b29"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_ea80fe59ddaa4a932e7232f738"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_eadc23c6b1ddecdced5f3ad613"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_f110371c18b6a8ee913f06ea14"`);
        await queryRunner.query(`DROP TABLE "lwp_set_by_teacher_step_media"`);
    }
}
