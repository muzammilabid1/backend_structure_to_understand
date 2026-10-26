import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateRelationBetweenLwpPeriodAndLwpSchoolDates1735539742179 implements MigrationInterface {
    name = 'CreateRelationBetweenLwpPeriodAndLwpSchoolDates1735539742179';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "lwp_school_dates" ADD "periodIndex" integer`);
        await queryRunner.query(
            `ALTER TABLE "lwp_school_dates" ADD CONSTRAINT "FK_f5c4b5b3ccd06f559707bbbeaa6" FOREIGN KEY ("periodIndex") REFERENCES "static_lwp_period"("index") ON DELETE SET NULL ON UPDATE NO ACTION`
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "lwp_school_dates" DROP CONSTRAINT "FK_f5c4b5b3ccd06f559707bbbeaa6"`);
        await queryRunner.query(`ALTER TABLE "lwp_school_dates" DROP COLUMN "periodIndex"`);
    }
}
