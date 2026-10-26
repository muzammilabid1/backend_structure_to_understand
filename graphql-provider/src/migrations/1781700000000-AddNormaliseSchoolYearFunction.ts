import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddNormaliseSchoolYearFunction1781700000000 implements MigrationInterface {
    name = 'AddNormaliseSchoolYearFunction1781700000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // SQL mirror of normaliseSchoolYear() in src/api/service/helper.service.ts.
        // Resolves an MIS/Wonde nc_year value (e.g. 'R', 'Reception', 'N2', '3', '( 4)')
        // into a numeric NC year group where Reception = 0 and nursery years are negative.
        // Returns NULL for genuinely unresolvable values ('X', 'Unknown', '[Unknown]', blank, NULL).
        // NOTE: keep this in sync with normaliseSchoolYear() — they are two sources of the same logic.
        await queryRunner.query(`
            CREATE OR REPLACE FUNCTION normalise_school_year(year_string text)
            RETURNS integer AS $$
            DECLARE
                cleaned text;
                matched text;
            BEGIN
                IF year_string IS NULL THEN
                    RETURN NULL;
                END IF;

                cleaned := regexp_replace(lower(year_string), '[^a-z0-9-]', '', 'g');

                IF cleaned LIKE 'r%' THEN
                    RETURN 0; -- Reception
                END IF;

                IF cleaned IN ('n', 'n1', 'e1') THEN
                    RETURN -2; -- Nursery (two years below Reception)
                END IF;

                IF cleaned IN ('nursery', 'n2', 'e2') THEN
                    RETURN -1; -- Nursery (one year below Reception)
                END IF;

                matched := substring(cleaned from '-?[0-9]+');

                IF matched IS NOT NULL THEN
                    RETURN matched::int; -- numeric year (0 = Reception)
                END IF;

                RETURN NULL; -- unresolvable: X, Unknown, [Unknown], blank, etc.
            END;
            $$ LANGUAGE plpgsql IMMUTABLE;
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP FUNCTION IF EXISTS normalise_school_year(text);`);
    }
}
