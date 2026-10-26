import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddIsAvailableForPreviousYearToStaticLwpDataQuery1787000000000 implements MigrationInterface {
    name = 'AddIsAvailableForPreviousYearToStaticLwpDataQuery1787000000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "static_lwp_data_query" ADD "isAvailableForPreviousYear" boolean NOT NULL DEFAULT false`);

        // Queries reading lwp.period_index can run for a chosen year, so start those off as
        // available. Anything added later needs setting by hand - there is no screen for this.
        await queryRunner.query(`
            UPDATE "static_lwp_data_query"
            SET "isAvailableForPreviousYear" = true
            WHERE type = 'LEADER'
              AND query LIKE '%lwp.period_index%'
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "static_lwp_data_query" DROP COLUMN "isAvailableForPreviousYear"`);
    }
}
