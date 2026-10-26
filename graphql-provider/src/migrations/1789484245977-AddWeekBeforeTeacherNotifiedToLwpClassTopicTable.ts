import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddWeekBeforeTeacherNotifiedToLwpClassTopicTable1789484245977 implements MigrationInterface {
    name = 'AddWeekBeforeTeacherNotifiedToLwpClassTopicTable1789484245977';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "lwp_class_topic" ADD "weekBeforeTeacherNotified" boolean NOT NULL DEFAULT false`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "lwp_class_topic" DROP COLUMN "weekBeforeTeacherNotified"`);
    }
}
