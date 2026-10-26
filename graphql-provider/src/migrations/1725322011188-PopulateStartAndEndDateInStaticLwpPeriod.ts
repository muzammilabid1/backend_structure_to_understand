/* eslint-disable */

import { MigrationInterface, QueryRunner } from 'typeorm';

export class PopulateStartAndEndDateInStaticLwpPeriod1725322011188 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            UPDATE static_lwp_period
            SET "startDate" = TO_DATE("index" || '-09-01', 'YYYY-MM-DD'),
                "endDate" = TO_DATE(("index" + 1) || '-08-31', 'YYYY-MM-DD')
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {}
}
