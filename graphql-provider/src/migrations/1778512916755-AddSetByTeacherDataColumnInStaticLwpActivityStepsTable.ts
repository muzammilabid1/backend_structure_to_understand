import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSetByTeacherDataColumnInStaticLwpActivityStepsTable1778512916755 implements MigrationInterface {
    name = 'AddSetByTeacherDataColumnInStaticLwpActivityStepsTable1778512916755';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "static_lwp_activity_steps" ADD "setByTeacherData" jsonb`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "static_lwp_activity_steps" DROP COLUMN "setByTeacherData"`);
    }
}
