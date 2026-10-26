import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddIsTeacherPdfRequiredColumnInStaticTopicTable1704328093717 implements MigrationInterface {
    name = 'AddIsTeacherPdfRequiredColumnInStaticTopicTable1704328093717';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "static_lwp_topic" ADD "isTeacherPdfRequired" boolean NOT NULL DEFAULT false`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "static_lwp_topic" DROP COLUMN "isTeacherPdfRequired"`);
    }
}
