import {MigrationInterface, QueryRunner} from "typeorm";

export class ParentFeedbackTickByTeacherColumns1719395067916 implements MigrationInterface {
    name = 'ParentFeedbackTickByTeacherColumns1719395067916'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "lwp_school" ADD "parentFeedbackTickFeatureEnabledAt" date`);
        await queryRunner.query(`ALTER TABLE "lwp_pupil_feedback" ADD "tickedById" bigint`);
        await queryRunner.query(`ALTER TABLE "lwp_pupil_feedback" ADD CONSTRAINT "FK_b27674871a58aa5a9ef34d0e2ac" FOREIGN KEY ("tickedById") REFERENCES "lwp_user"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "lwp_pupil_feedback" DROP CONSTRAINT "FK_b27674871a58aa5a9ef34d0e2ac"`);
        await queryRunner.query(`ALTER TABLE "lwp_pupil_feedback" DROP COLUMN "tickedById"`);
        await queryRunner.query(`ALTER TABLE "lwp_school" DROP COLUMN "parentFeedbackTickFeatureEnabledAt"`);
    }

}
