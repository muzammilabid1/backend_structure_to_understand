import { FeatureCode, FeatureStatus } from 'lwp-shared';
import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddReadyTeddyFeature1740556862884 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "lwp_school" ADD "numOfReadyTeddyClassesAllowed" integer NOT NULL DEFAULT '0'`);
        await queryRunner.query(`ALTER TABLE "log_school_class_license" ADD "readyTeddyClassCount" integer DEFAULT '0'`);
        await queryRunner.query(`ALTER TABLE "log_school_class_license" ADD "requestedReadyTeddyClassCount" integer DEFAULT '0'`);
        await queryRunner.query(`ALTER TABLE "log_school_class_license" ADD "readyTeddyClassPrice" integer DEFAULT '0'`);

        await queryRunner.query(`
            INSERT INTO static_lwp_features 
            (
                name,
                status,
                code
            )
            VALUES 
            (
                'Ready Teddy licences can be purchased by school leaders',
                '${FeatureStatus.NO_SCHOOLS}',
                '${FeatureCode.READY_TEDDY}'
            )
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            DELETE FROM static_lwp_features 
            WHERE code = '${FeatureCode.READY_TEDDY}'
        `);

        await queryRunner.query(`ALTER TABLE "log_school_class_license" DROP COLUMN "readyTeddyClassPrice"`);
        await queryRunner.query(`ALTER TABLE "log_school_class_license" DROP COLUMN "requestedReadyTeddyClassCount"`);
        await queryRunner.query(`ALTER TABLE "log_school_class_license" DROP COLUMN "readyTeddyClassCount"`);
        await queryRunner.query(`ALTER TABLE "lwp_school" DROP COLUMN "numOfReadyTeddyClassesAllowed"`);
    }
}
