import { MigrationInterface, QueryRunner } from 'typeorm';

export class FixMixedDataInJsonbActivityStepProperties1701855533329 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
        UPDATE
            static_lwp_activity_steps
        SET
            properties = CASE WHEN substr(properties #>> '{}', 1, 1) = '"' THEN
                substr(properties #>> '{}', 2, length(properties #>> '{}') - 2)::jsonb
            ELSE
                (properties #>> '{}')::jsonb
            END;
    `);
    }

    public async down(_queryRunner: QueryRunner): Promise<void> {
        // not easily reversible
    }
}
