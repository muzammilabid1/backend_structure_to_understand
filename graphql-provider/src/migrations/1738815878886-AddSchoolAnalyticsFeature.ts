import { FeatureCode, FeatureStatus } from 'lwp-shared';
import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSchoolAnalyticsFeature1738815878886 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            INSERT INTO static_lwp_features 
            (
                name,
                status,
                code
            )
            VALUES 
            (
                'School analytics',
                '${FeatureStatus.ALL_SCHOOLS}',
                '${FeatureCode.SCHOOL_ANALYTICS}'
            )
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            DELETE FROM static_lwp_features 
            WHERE code = '${FeatureCode.SCHOOL_ANALYTICS}'
        `);
    }
}
