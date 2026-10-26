import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddActivityStepVisibilityRules1786594371577 implements MigrationInterface {
    name = 'AddActivityStepVisibilityRules1786594371577';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "static_lwp_activity_steps" ADD "visibilityRules" jsonb`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "static_lwp_activity_steps" DROP COLUMN "visibilityRules"`);
    }
}
