import {MigrationInterface, QueryRunner} from "typeorm";

export class AddIndexToLwpPupilTrophyOnPupilId1695815792066 implements MigrationInterface {
    name = 'AddIndexToLwpPupilTrophyOnPupilId1695815792066'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE INDEX "IDX_571ce4024cd2d7732b361954d0" ON "lwp_pupil_trophy" ("pupilId") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_571ce4024cd2d7732b361954d0"`);
    }

}
