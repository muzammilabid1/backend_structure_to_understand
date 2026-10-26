import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddIncludeSchoolsWithTagsBooleanInStaticLwpFeaturesTable1759679887695 implements MigrationInterface {
    name = 'AddIncludeSchoolsWithTagsBooleanInStaticLwpFeaturesTable1759679887695';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "static_lwp_features" ADD "includeSchoolsWithTags" boolean NOT NULL DEFAULT true`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "static_lwp_features" DROP COLUMN "includeSchoolsWithTags"`);
    }
}
