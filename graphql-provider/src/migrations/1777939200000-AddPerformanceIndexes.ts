import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPerformanceIndexes1777939200000 implements MigrationInterface {
    name = 'AddPerformanceIndexes1777939200000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE INDEX "lwp_pupil_parent_pupilid_idx" ON "lwp_pupil_parent" ("pupilId")`);
        await queryRunner.query(
            `CREATE INDEX "lwp_school_class_schoolid_periodindex_isregclass_status_idx" ON "lwp_school_class" ("schoolId", "periodIndex", "isRegistrationClass", "status")`
        );
        await queryRunner.query(`CREATE INDEX "lwp_pupil_topic_pupilid_periodindex_idx" ON "lwp_pupil_topic" ("pupilId", "periodIndex")`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "lwp_pupil_topic_pupilid_periodindex_idx"`);
        await queryRunner.query(`DROP INDEX "lwp_school_class_schoolid_periodindex_isregclass_status_idx"`);
        await queryRunner.query(`DROP INDEX "lwp_pupil_parent_pupilid_idx"`);
    }
}
