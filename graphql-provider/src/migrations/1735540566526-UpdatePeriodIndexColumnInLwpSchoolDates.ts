/* eslint-disable */

import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdatePeriodIndexColumnInLwpSchoolDates1735540566526 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            UPDATE lwp_school_dates AS lsd
            SET "periodIndex" = slp.index
            FROM static_lwp_period AS slp
            WHERE lsd."endDate" BETWEEN slp."startDate" AND slp."endDate"  
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {}
}
