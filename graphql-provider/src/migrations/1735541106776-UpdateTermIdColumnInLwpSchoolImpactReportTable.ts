/* eslint-disable */

import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateTermIdColumnInLwpSchoolImpactReportTable1735541106776 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            UPDATE "lwp_school_impact_report" r
                SET
                    "termId" = d."id"
                FROM
                    "lwp_school_dates" d
                WHERE
                    r."termId" IS NULL
                    AND d."endDate" < r."logCreatedAt"
					AND d."periodIndex" = r."periodIndex"
                    AND d."endDate" = (
                        SELECT
                            MAX(d2."endDate")
                        FROM
                            "lwp_school_dates" d2
                        WHERE
                            d2."endDate" < r."logCreatedAt"
                    );    
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {}
}
