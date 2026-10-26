import { disableRLS, enableRLS } from 'src/migration_helpers/1721038124744-enable_rls';
import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddStaticLwpSubjectEntity1723016150200 implements MigrationInterface {
    name = 'AddStaticLwpSubjectEntity1723016150200';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "lwp_school_class" RENAME COLUMN "subjects" TO "legacySubjects"`);
        await queryRunner.query(`ALTER TABLE "static_lwp_topic_domain" RENAME COLUMN "subject" TO "legacySubject"`);

        await queryRunner.query(
            `CREATE TABLE "static_lwp_subject" ("id" BIGSERIAL NOT NULL, "name" character varying NOT NULL, "deletedAt" TIMESTAMP, "logCreatedAt" TIMESTAMP DEFAULT ('now'::text)::timestamp(6) with time zone, "logUpdatedAt" TIMESTAMP NOT NULL DEFAULT ('now'::text)::timestamp(6) with time zone, "deletedById" bigint, "logCreatedById" bigint, "logUpdatedById" bigint, CONSTRAINT "UQ_cffcd1870dc3568f40a99843a79" UNIQUE ("name"), CONSTRAINT "PK_b0604e1efc51e462ada715d1bdb" PRIMARY KEY ("id"))`
        );
        await queryRunner.query(
            `CREATE TABLE "lwp_class_subjects" ("staticLwpSubjectId" bigint NOT NULL, "lwpSchoolClassId" bigint NOT NULL, CONSTRAINT "PK_6c80eaf1fc6d7488a7ffde1e643" PRIMARY KEY ("staticLwpSubjectId", "lwpSchoolClassId"))`
        );
        await queryRunner.query(`CREATE INDEX "IDX_0af64e2f7ef9249a68d46fdafc" ON "lwp_class_subjects" ("staticLwpSubjectId") `);
        await queryRunner.query(`CREATE INDEX "IDX_701f16c4ea9031846285e7d522" ON "lwp_class_subjects" ("lwpSchoolClassId") `);

        await queryRunner.query(`INSERT INTO "static_lwp_subject" ("name", "logCreatedAt", "logUpdatedAt") VALUES ('English', '2024-08-07 07:35:50', '2024-08-07 07:35:50'), ('Maths', '2024-08-07 07:35:50', '2024-08-07 07:35:50')`);

        await queryRunner.query(`ALTER TABLE "static_lwp_topic_domain" ADD "subjectId" bigint`);
        await queryRunner.query(
            `ALTER TABLE "static_lwp_subject" ADD CONSTRAINT "FK_f84d9fc968b0e7cffc30d9a93bc" FOREIGN KEY ("deletedById") REFERENCES "lwp_user"("id") ON DELETE SET NULL ON UPDATE NO ACTION`
        );
        await queryRunner.query(
            `ALTER TABLE "static_lwp_subject" ADD CONSTRAINT "FK_87fc9f0144987f62c63ed52a1c6" FOREIGN KEY ("logCreatedById") REFERENCES "lwp_user"("id") ON DELETE SET NULL ON UPDATE NO ACTION`
        );
        await queryRunner.query(
            `ALTER TABLE "static_lwp_subject" ADD CONSTRAINT "FK_ff0918183567249c19648c1de75" FOREIGN KEY ("logUpdatedById") REFERENCES "lwp_user"("id") ON DELETE SET NULL ON UPDATE NO ACTION`
        );
        await queryRunner.query(
            `ALTER TABLE "static_lwp_topic_domain" ADD CONSTRAINT "FK_f735ad5671b1069011e79798b0f" FOREIGN KEY ("subjectId") REFERENCES "static_lwp_subject"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
        );
        await queryRunner.query(
            `ALTER TABLE "lwp_class_subjects" ADD CONSTRAINT "FK_0af64e2f7ef9249a68d46fdafc6" FOREIGN KEY ("staticLwpSubjectId") REFERENCES "static_lwp_subject"("id") ON DELETE CASCADE ON UPDATE CASCADE`
        );
        await queryRunner.query(
            `ALTER TABLE "lwp_class_subjects" ADD CONSTRAINT "FK_701f16c4ea9031846285e7d5224" FOREIGN KEY ("lwpSchoolClassId") REFERENCES "lwp_school_class"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
        );

        await queryRunner.query(`ALTER TABLE "lwp_pupil_feedback" DROP COLUMN "isMaths"`);
        await queryRunner.query(`ALTER TABLE "lwp_pupil_feedback" DROP COLUMN "isEnglish"`);
        await queryRunner.query(`ALTER TABLE "lwp_pupil_feedback" DROP COLUMN "otherSubject"`);

        await enableRLS(queryRunner, 'static_lwp_subject');
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await disableRLS(queryRunner, 'static_lwp_subject');

        await queryRunner.query(`ALTER TABLE "lwp_pupil_feedback" ADD "otherSubject" character varying`);
        await queryRunner.query(`ALTER TABLE "lwp_pupil_feedback" ADD "isEnglish" boolean`);
        await queryRunner.query(`ALTER TABLE "lwp_pupil_feedback" ADD "isMaths" boolean`);

        await queryRunner.query(`ALTER TABLE "lwp_class_subjects" DROP CONSTRAINT "FK_701f16c4ea9031846285e7d5224"`);
        await queryRunner.query(`ALTER TABLE "lwp_class_subjects" DROP CONSTRAINT "FK_0af64e2f7ef9249a68d46fdafc6"`);
        await queryRunner.query(`ALTER TABLE "static_lwp_topic_domain" DROP CONSTRAINT "FK_f735ad5671b1069011e79798b0f"`);
        await queryRunner.query(`ALTER TABLE "static_lwp_subject" DROP CONSTRAINT "FK_ff0918183567249c19648c1de75"`);
        await queryRunner.query(`ALTER TABLE "static_lwp_subject" DROP CONSTRAINT "FK_87fc9f0144987f62c63ed52a1c6"`);
        await queryRunner.query(`ALTER TABLE "static_lwp_subject" DROP CONSTRAINT "FK_f84d9fc968b0e7cffc30d9a93bc"`);
        await queryRunner.query(`ALTER TABLE "static_lwp_topic_domain" DROP COLUMN "subjectId"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_701f16c4ea9031846285e7d522"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_0af64e2f7ef9249a68d46fdafc"`);
        await queryRunner.query(`DROP TABLE "lwp_class_subjects"`);
        await queryRunner.query(`DROP TABLE "static_lwp_subject"`);

        await queryRunner.query(`ALTER TABLE "static_lwp_topic_domain" RENAME COLUMN "legacySubject" TO "subject"`);
        await queryRunner.query(`ALTER TABLE "lwp_school_class" RENAME COLUMN "legacySubjects" TO "subjects"`);
    }
}
