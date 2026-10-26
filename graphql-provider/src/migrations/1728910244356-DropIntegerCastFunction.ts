import {MigrationInterface, QueryRunner} from "typeorm";

export class DropIntegerCastFunction1728910244356 implements MigrationInterface {
    name = 'DropIntegerCastFunction1728910244356'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP FUNCTION safe_integer_cast;`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            String.raw`
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
            `,
        );
    }

}
