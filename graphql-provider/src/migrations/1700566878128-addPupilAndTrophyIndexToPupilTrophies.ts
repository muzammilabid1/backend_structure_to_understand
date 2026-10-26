import {MigrationInterface, QueryRunner} from "typeorm";

export class addPupilAndTrophyIndexToPupilTrophies1700566878128 implements MigrationInterface {
    name = 'addPupilAndTrophyIndexToPupilTrophies1700566878128'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_571ce4024cd2d7732b361954d0"`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_5539d20509b8823beb51d52254" ON "lwp_pupil_trophy" ("pupilId", "trophyId") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_5539d20509b8823beb51d52254"`);
        await queryRunner.query(`CREATE INDEX "IDX_571ce4024cd2d7732b361954d0" ON "lwp_pupil_trophy" ("pupilId") `);
    }

}
