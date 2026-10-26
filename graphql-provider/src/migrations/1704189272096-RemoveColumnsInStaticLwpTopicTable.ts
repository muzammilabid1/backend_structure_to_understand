import { MigrationInterface, QueryRunner } from 'typeorm';

export class RemoveColumnsInStaticLwpTopicTable1704189272096 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "static_lwp_topic" DROP COLUMN "parentEmailBody"`);
        await queryRunner.query(`ALTER TABLE "static_lwp_topic" DROP COLUMN "teacherEmailSubject"`);
        await queryRunner.query(`ALTER TABLE "static_lwp_topic" DROP COLUMN "defaultTeacherMessage"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "static_lwp_topic" ADD "parentEmailBody" character varying`);
        await queryRunner.query(`ALTER TABLE "static_lwp_topic" ADD "teacherEmailSubject" character varying`);
        await queryRunner.query(`ALTER TABLE "static_lwp_topic" ADD "defaultTeacherMessage" character varying`);
    }
}
