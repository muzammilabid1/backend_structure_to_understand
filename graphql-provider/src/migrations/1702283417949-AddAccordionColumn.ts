import { MigrationInterface, QueryRunner } from 'typeorm';

export class addAccordionColumn1702283417949 implements MigrationInterface {
    name = 'addAccordionColumn1702283417949';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "static_lwp_activity_steps" ADD "accordionData" jsonb`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "static_lwp_activity_steps" DROP COLUMN "accordionData"`);
    }
}
