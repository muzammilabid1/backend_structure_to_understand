import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCheckListText1702926238134 implements MigrationInterface {
    name = 'AddCheckListText1702926238134';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "static_lwp_activity_steps" ADD "checkListTextData" jsonb`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "static_lwp_activity_steps" DROP COLUMN "checkListTextData"`);
    }
}
