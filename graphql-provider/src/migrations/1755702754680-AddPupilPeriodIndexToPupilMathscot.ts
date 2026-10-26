import { MigrationInterface, QueryRunner } from "typeorm";

export class AddPupilPeriodIndexToPupilMathscot1755702754680 implements MigrationInterface {
    name = 'AddPupilPeriodIndexToPupilMathscot1755702754680'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE INDEX "IDX_5f78ad70ac8e15243540b56978" ON "lwp_pupil_mathscot" ("pupilId", "periodIndex") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_5f78ad70ac8e15243540b56978"`);
    }

}
