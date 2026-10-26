import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateLogMergePupilOperationTable1757940659759 implements MigrationInterface {
    name = 'CreateLogMergePupilOperationTable1757940659759';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `CREATE TABLE "log_pupil_merge_operation" ("id" BIGSERIAL NOT NULL, "logCreatedAt" TIMESTAMP NOT NULL DEFAULT ('now'::text)::timestamp(6) with time zone, "userId" bigint NOT NULL, "schoolId" bigint NOT NULL, "sourcePupilId" bigint NOT NULL, "destinationPupilId" bigint NOT NULL, "reassignedPupilFeedbackIds" bigint array NOT NULL, "redundantPupilFeedbackIds" bigint array NOT NULL, "reassignedReadingPupilTopicIds" bigint array NOT NULL, "reassignedActivityPupilTopicIds" bigint array NOT NULL, "reassignedActivityPupilActivityIds" bigint array NOT NULL, "detachedParentIds" bigint array NOT NULL, "detachedClassIds" bigint array NOT NULL, "sourcePupilRemovedFromSchool" boolean NOT NULL, CONSTRAINT "PK_cbb3b977a13783613709ec85442" PRIMARY KEY ("id"))`
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "log_pupil_merge_operation"`);
    }
}
