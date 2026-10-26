import { MigrationInterface, QueryRunner } from 'typeorm';

export class ChangeAnalyticsSchoolFactColumnsToBigInt1779780178705 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "analytics_school_fact" ALTER COLUMN "schoolId" TYPE bigint`);
        await queryRunner.query(`ALTER TABLE "analytics_school_fact" ALTER COLUMN "subjectId" TYPE bigint`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "analytics_school_fact" ALTER COLUMN "subjectId" TYPE integer`);
        await queryRunner.query(`ALTER TABLE "analytics_school_fact" ALTER COLUMN "schoolId" TYPE integer`);
    }
}
