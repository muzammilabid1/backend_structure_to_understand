/* eslint-disable */

import {MigrationInterface, QueryRunner} from "typeorm";

export class FixEscapeOnSafeCastToInteger1725366560978 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        return queryRunner.query(String.raw`
            CREATE OR REPLACE FUNCTION safe_integer_cast(varchar)
            RETURNS int AS
            $$
                BEGIN
                    IF $1 = '' THEN -- short-circuit empty string
                        RETURN null;
                    ELSIF $1 !~ '^[+-]*\d+$' THEN  -- obviously invalid (would also catch '')
                        RETURN null;
                    ELSE
                        RETURN $1::int;
                    END IF;
                EXCEPTION WHEN invalid_text_representation THEN -- catch anything else that might be invalid (relatively expensive)
                    RETURN null;
                END
            $$ LANGUAGE plpgsql IMMUTABLE LEAKPROOF PARALLEL SAFE;
            `)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        return queryRunner.query(`
            CREATE OR REPLACE FUNCTION safe_integer_cast(varchar)
            RETURNS int AS
            $$
                BEGIN
                    IF $1 = '' THEN -- short-circuit empty string
                        RETURN null;
                    ELSIF $1 !~ '^[+-]*\d+$' THEN  -- obviously invalid (would also catch '')
                        RETURN null;
                    ELSE
                        RETURN $1::int;
                    END IF;
                EXCEPTION WHEN invalid_text_representation THEN -- catch anything else that might be invalid (relatively expensive)
                    RETURN null;
                END
            $$ LANGUAGE plpgsql IMMUTABLE LEAKPROOF PARALLEL SAFE;
            `)
    }

}
