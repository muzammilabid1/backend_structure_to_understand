import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTeacherPowerpointToStaticLwpTopicTable1789043996980 implements MigrationInterface {
    name = 'AddTeacherPowerpointToStaticLwpTopicTable1789043996980';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "static_lwp_topic" ADD "teacherPowerpoint" character varying`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "static_lwp_topic" DROP COLUMN "teacherPowerpoint"`);
    }
}
