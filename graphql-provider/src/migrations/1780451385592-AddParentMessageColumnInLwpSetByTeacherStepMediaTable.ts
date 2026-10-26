import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddParentMessageColumnInLwpSetByTeacherStepMediaTable1780451385592 implements MigrationInterface {
    name = 'AddParentMessageColumnInLwpSetByTeacherStepMediaTable1780451385592';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "lwp_set_by_teacher_step_media" ADD "parentMessage" character varying`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "lwp_set_by_teacher_step_media" DROP COLUMN "parentMessage"`);
    }
}
