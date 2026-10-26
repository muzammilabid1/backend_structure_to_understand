/* eslint-disable */

import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddNormaliseNameCaseFunction1714478427933 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        queryRunner.query(`CREATE FUNCTION lwp_normalise_name_case (varchar)
        RETURNS varchar
        LANGUAGE SQL
        IMMUTABLE LEAKPROOF
        RETURNS NULL ON NULL INPUT
        AS $$
            SELECT CASE WHEN $1 ~ '^([^A-Z]+|[^a-z]+)$' THEN
                initcap ($1)
            ELSE
                $1
            END
        $$`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        queryRunner.query(`DROP FUNCTION lwp_normalise_name_case`);
    }
}
