import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddLwpPupilClassChangeLogTable1767082917465 implements MigrationInterface {
    name = 'AddLwpPupilClassChangeLogTable1767082917465';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `CREATE TABLE "log_lwp_pupil_class_change" ("id" BIGSERIAL NOT NULL, "pupilId" bigint NOT NULL, "classId" bigint NOT NULL, "action" character varying NOT NULL, "status" character varying NOT NULL, "logCreatedById" bigint, "logCreatedAt" TIMESTAMP NOT NULL DEFAULT ('now'::text)::timestamp(6) with time zone, CONSTRAINT "PK_145c731c95420f433832d7550f3" PRIMARY KEY ("id"))`
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "log_lwp_pupil_class_change"`);
    }
}
