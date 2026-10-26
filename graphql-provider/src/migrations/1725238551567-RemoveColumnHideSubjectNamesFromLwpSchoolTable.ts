import {MigrationInterface, QueryRunner} from "typeorm";

export class RemoveColumnHideSubjectNamesFromLwpSchoolTable1725238551567 implements MigrationInterface {
    name = 'RemoveColumnHideSubjectNamesFromLwpSchoolTable1725238551567'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "lwp_school" DROP COLUMN "hideSubjectNames"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "lwp_school" ADD "hideSubjectNames" boolean NOT NULL DEFAULT false`);
    }

}
