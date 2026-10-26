import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateLwpSchoolImpactReportFeedbackTable1733068216860 implements MigrationInterface {
    name = 'CreateLwpSchoolImpactReportFeedbackTable1733068216860';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `CREATE TABLE "lwp_school_impact_report_feedback" ("content" character varying NOT NULL, "contentType" character varying NOT NULL, "pupilFirstName" character varying NOT NULL, "className" character varying NOT NULL, "includedInImpactReport" boolean NOT NULL DEFAULT false, "classYearGroup" character varying NOT NULL, "id" BIGSERIAL NOT NULL, "logCreatedAt" TIMESTAMP DEFAULT ('now'::text)::timestamp(6) with time zone, "logUpdatedAt" TIMESTAMP NOT NULL DEFAULT ('now'::text)::timestamp(6) with time zone, "impactReportId" bigint, "pupilFeedbackId" bigint, "logCreatedById" bigint, "logUpdatedById" bigint, CONSTRAINT "PK_56c8372abb20688a65ed7cc49fd" PRIMARY KEY ("id"))`
        );
        await queryRunner.query(`ALTER TABLE "lwp_pupil_feedback" ADD "includePhotoInImpactReport" boolean NOT NULL DEFAULT false`);
        await queryRunner.query(`ALTER TABLE "lwp_pupil_feedback" ADD "includeParentCommentInImpactReport" boolean NOT NULL DEFAULT false`);
        await queryRunner.query(`ALTER TABLE "lwp_pupil_feedback" ADD "includePupilCommentInImpactReport" boolean NOT NULL DEFAULT false`);
        await queryRunner.query(`ALTER TABLE "lwp_pupil_feedback" ADD "includeReadingCommentInImpactReport" boolean NOT NULL DEFAULT false`);
        await queryRunner.query(
            `ALTER TABLE "lwp_school_impact_report_feedback" ADD CONSTRAINT "FK_e8a3d0d44f3da69747601a64812" FOREIGN KEY ("impactReportId") REFERENCES "lwp_school_impact_report"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
        );
        await queryRunner.query(
            `ALTER TABLE "lwp_school_impact_report_feedback" ADD CONSTRAINT "FK_f3b809b9fbdabf6b380c515d8c9" FOREIGN KEY ("pupilFeedbackId") REFERENCES "lwp_pupil_feedback"("id") ON DELETE SET NULL ON UPDATE NO ACTION`
        );
        await queryRunner.query(
            `ALTER TABLE "lwp_school_impact_report_feedback" ADD CONSTRAINT "FK_92d01a4e47e2e5e70021fd080fe" FOREIGN KEY ("logCreatedById") REFERENCES "lwp_user"("id") ON DELETE SET NULL ON UPDATE NO ACTION`
        );
        await queryRunner.query(
            `ALTER TABLE "lwp_school_impact_report_feedback" ADD CONSTRAINT "FK_f400d1f85f4821bccb847b58051" FOREIGN KEY ("logUpdatedById") REFERENCES "lwp_user"("id") ON DELETE SET NULL ON UPDATE NO ACTION`
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "lwp_school_impact_report_feedback" DROP CONSTRAINT "FK_f400d1f85f4821bccb847b58051"`);
        await queryRunner.query(`ALTER TABLE "lwp_school_impact_report_feedback" DROP CONSTRAINT "FK_92d01a4e47e2e5e70021fd080fe"`);
        await queryRunner.query(`ALTER TABLE "lwp_school_impact_report_feedback" DROP CONSTRAINT "FK_f3b809b9fbdabf6b380c515d8c9"`);
        await queryRunner.query(`ALTER TABLE "lwp_school_impact_report_feedback" DROP CONSTRAINT "FK_e8a3d0d44f3da69747601a64812"`);
        await queryRunner.query(`ALTER TABLE "lwp_pupil_feedback" DROP COLUMN "includeReadingCommentInImpactReport"`);
        await queryRunner.query(`ALTER TABLE "lwp_pupil_feedback" DROP COLUMN "includePupilCommentInImpactReport"`);
        await queryRunner.query(`ALTER TABLE "lwp_pupil_feedback" DROP COLUMN "includeParentCommentInImpactReport"`);
        await queryRunner.query(`ALTER TABLE "lwp_pupil_feedback" DROP COLUMN "includePhotoInImpactReport"`);
        await queryRunner.query(`DROP TABLE "lwp_school_impact_report_feedback"`);
    }
}
