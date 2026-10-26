/* eslint-disable */

import {MigrationInterface, QueryRunner} from "typeorm";

export class SetIsBookFinishedNull1730123813778 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`UPDATE lwp_pupil_feedback SET "pageNumber" = NULL WHERE TRIM("pageNumber") = ''`);
        await queryRunner.query(`UPDATE lwp_pupil_feedback SET "isBookFinished" = NULL WHERE "isBookFinished" = FALSE AND "pageNumber" IS NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Do nothing
    }
}
