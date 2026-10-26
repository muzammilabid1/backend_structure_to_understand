import { FeatureCode } from 'lwp-shared';
import { MigrationInterface, QueryRunner } from 'typeorm';

export class RemoveMoneySkillsFeatureFlag1779408000000 implements MigrationInterface {
    name = 'RemoveMoneySkillsFeatureFlag1779408000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            DELETE FROM static_lwp_features
            WHERE code = '${FeatureCode.MONEY_SKILLS}'
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            INSERT INTO static_lwp_features (name, status, code)
            VALUES (
                'Money Skills can be used by schools',
                'NO_SCHOOLS',
                '${FeatureCode.MONEY_SKILLS}'
            )
        `);
    }
}
