import { FeatureCode, FeatureStatus } from 'lwp-shared';
import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDataImportReviewFeature1752836353159 implements MigrationInterface {
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
                     'Schools manually review imported data changes',
                     '${FeatureStatus.NO_SCHOOLS}',
                     '${FeatureCode.DATA_IMPORT_REVIEW}'
                 )
             `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
                 DELETE FROM static_lwp_features 
                 WHERE code = '${FeatureCode.DATA_IMPORT_REVIEW}'
             `);
    }
}
