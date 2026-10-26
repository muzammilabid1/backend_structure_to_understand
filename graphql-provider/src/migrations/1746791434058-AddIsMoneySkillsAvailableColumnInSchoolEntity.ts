import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddIsMoneySkillsAvailableColumnInSchoolEntity1746791434058 implements MigrationInterface {
    name = 'AddIsMoneySkillsAvailableColumnInSchoolEntity1746791434058';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "lwp_school" ADD "isMoneySkillsAvailable" boolean DEFAULT false`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "lwp_school" DROP COLUMN "isMoneySkillsAvailable"`);
    }
}
