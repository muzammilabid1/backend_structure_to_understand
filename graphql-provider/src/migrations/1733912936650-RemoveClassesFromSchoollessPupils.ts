/* eslint-disable */

import {MigrationInterface, QueryRunner} from "typeorm";

export class RemoveClassesFromSchoollessPupils1733912936650 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            DELETE FROM lwp_class_pupil
            WHERE ("lwpPupilId", "lwpSchoolClassId") IN (
                    SELECT
                        lp.id,
                        lsc.id
                    FROM
                        lwp_class_pupil lcp
                        JOIN lwp_school_class lsc ON lsc.id = lcp."lwpSchoolClassId"
                        JOIN lwp_pupil lp ON lp.id = lcp."lwpPupilId"
                    WHERE
                        lp."schoolId" IS NULL
                        AND lsc."periodIndex" = 2024);
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // irreversible
    }

}
