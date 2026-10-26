import { MigrationInterface, QueryRunner } from 'typeorm';

export class RemoveAndRenameColumnsInStaticLwpTopicTable1701239714303 implements MigrationInterface {
    name = 'RemoveAndRenameColumnsInStaticLwpTopicTable1701239714303';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "static_lwp_topic" RENAME COLUMN "name" TO "teacherTopicName"`);
        await queryRunner.query(`ALTER TABLE "static_lwp_topic" RENAME COLUMN "parentEmailSubject" TO "parentTopicName"`);
        // split into 1704189272096-RemoveColumnsInStaticLwpTopicTable.ts
        // await queryRunner.query(`ALTER TABLE "static_lwp_topic" DROP COLUMN "parentEmailBody"`);
        // await queryRunner.query(`ALTER TABLE "static_lwp_topic" DROP COLUMN "teacherEmailSubject"`);
        // await queryRunner.query(`ALTER TABLE "static_lwp_topic" DROP COLUMN "defaultTeacherMessage"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "static_lwp_topic" RENAME COLUMN "teacherTopicName" TO "name"`);
        await queryRunner.query(`ALTER TABLE "static_lwp_topic" RENAME COLUMN "parentTopicName" TO "parentEmailSubject"`);
        // await queryRunner.query(`ALTER TABLE "static_lwp_topic" ADD "parentEmailBody" character varying`);
        // await queryRunner.query(`ALTER TABLE "static_lwp_topic" ADD "teacherEmailSubject" character varying`);
        // await queryRunner.query(`ALTER TABLE "static_lwp_topic" ADD "defaultTeacherMessage" character varying`);
    }
}
