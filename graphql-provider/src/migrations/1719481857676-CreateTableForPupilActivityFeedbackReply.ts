import { disableRLS, enableRLS } from 'src/migration_helpers/1721038124744-enable_rls';
import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateTableForPupilActivityFeedbackReplies1719481857676 implements MigrationInterface {
    name = 'CreateTableForPupilActivityFeedbackReplies1719481857676';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE "lwp_feedback_reply" (
                "id" BIGSERIAL NOT NULL,
                "reply" character varying,
                "parentNotified" boolean NOT NULL DEFAULT false,
                "logCreatedAt" TIMESTAMP DEFAULT ('now'::text)::timestamp(6) with time zone,
                "logUpdatedAt" TIMESTAMP NOT NULL DEFAULT ('now'::text)::timestamp(6) with time zone,
                "feedbackId" bigint,
                "logCreatedById" bigint,
                "logUpdatedById" bigint,
                "deletedAt" TIMESTAMP,
                "deletedById" bigint,
                CONSTRAINT "PK_c5542c8d91662260ef9d8582af1" PRIMARY KEY ("id")
            )
        `);

        await queryRunner.query(`
            ALTER TABLE "lwp_feedback_reply" 
            ADD CONSTRAINT "FK_f2292376f78e629b883a7944917" FOREIGN KEY ("feedbackId") 
            REFERENCES "lwp_pupil_feedback"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);

        await queryRunner.query(`
            ALTER TABLE "lwp_feedback_reply" 
            ADD CONSTRAINT "FK_8019bce83a2fb14f7a4acdbb974" FOREIGN KEY ("logCreatedById") 
            REFERENCES "lwp_user"("id") ON DELETE SET NULL ON UPDATE NO ACTION
        `);

        await queryRunner.query(`
            ALTER TABLE "lwp_feedback_reply" 
            ADD CONSTRAINT "FK_f8af153fb49519bb073f62708b2" FOREIGN KEY ("logUpdatedById") 
            REFERENCES "lwp_user"("id") ON DELETE SET NULL ON UPDATE NO ACTION
        `);

        await queryRunner.query(`
            ALTER TABLE "lwp_feedback_reply" 
            ADD CONSTRAINT "FK_05b324c4cb7769f7b2acf28c50a" FOREIGN KEY ("deletedById") 
            REFERENCES "lwp_user"("id") ON DELETE SET NULL ON UPDATE NO ACTION
        `);

        await queryRunner.query(`
            ALTER TABLE "lwp_school" 
            ADD "parentFeedbackReplyFeatureEnabledAt" date
        `);

        await enableRLS(queryRunner, 'lwp_feedback_reply');
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await disableRLS(queryRunner, 'lwp_feedback_reply');

        await queryRunner.query(`
            ALTER TABLE "lwp_feedback_reply" 
            DROP CONSTRAINT "FK_05b324c4cb7769f7b2acf28c50a"
        `);

        await queryRunner.query(`
            ALTER TABLE "lwp_feedback_reply" 
            DROP CONSTRAINT "FK_f8af153fb49519bb073f62708b2"
        `);

        await queryRunner.query(`
            ALTER TABLE "lwp_feedback_reply" 
            DROP CONSTRAINT "FK_8019bce83a2fb14f7a4acdbb974"
        `);

        await queryRunner.query(`
            ALTER TABLE "lwp_feedback_reply" 
            DROP CONSTRAINT "FK_f2292376f78e629b883a7944917"
        `);

        await queryRunner.query(`
            ALTER TABLE "lwp_school" 
            DROP COLUMN "parentFeedbackReplyFeatureEnabledAt"
        `);

        await queryRunner.query(`DROP TABLE "lwp_feedback_reply"
        `);
    }
}
