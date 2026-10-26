import {MigrationInterface, QueryRunner} from "typeorm";

export class CreateDeletedCreatedAndUpdatedByFieldsOnPupilParent1692631412280 implements MigrationInterface {
    name = 'CreateDeletedCreatedAndUpdatedByFieldsOnPupilParent1692631412280'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "lwp_pupil_feedback" ADD "deletedUserCreatedBy" integer`);
        await queryRunner.query(`ALTER TABLE "lwp_pupil_feedback" ADD "deletedUserUpdatedBy" integer`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "lwp_pupil_feedback" DROP COLUMN "deletedUserUpdatedBy"`);
        await queryRunner.query(`ALTER TABLE "lwp_pupil_feedback" DROP COLUMN "deletedUserCreatedBy"`);
    }

}
