import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateReadingTargetDefaultValueInLwpSchoolClass1761313131852 implements MigrationInterface {
    name = 'UpdateReadingTargetDefaultValueInLwpSchoolClass1761313131852';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "lwp_school_class" ALTER COLUMN "readingTarget" SET DEFAULT '3'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "lwp_school_class" ALTER COLUMN "readingTarget" SET DEFAULT '5'`);
    }
}
