import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddRegionInLwpSchool1770640409187 implements MigrationInterface {
    name = 'AddRegionInLwpSchool1770640409187';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "lwp_school" ADD "region" character varying`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "lwp_school" DROP COLUMN "region"`);
    }
}
