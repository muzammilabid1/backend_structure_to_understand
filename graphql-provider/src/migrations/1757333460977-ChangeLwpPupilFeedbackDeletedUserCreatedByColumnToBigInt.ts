import { MigrationInterface, QueryRunner } from 'typeorm';

export class ChangeLwpPupilFeedbackDeletedUserCreatedByColumnToBigInt1757333460977 implements MigrationInterface {
    name = 'ChangeLwpPupilFeedbackDeletedUserCreatedByColumnToBigInt1757333460977';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "lwp_pupil_feedback" ALTER COLUMN "deletedUserCreatedBy" TYPE bigint`);
        await queryRunner.query(`ALTER TABLE "lwp_pupil_feedback" ALTER COLUMN "deletedUserUpdatedBy" TYPE bigint`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "lwp_pupil_feedback" ALTER COLUMN "deletedUserUpdatedBy" TYPE integer`);
        await queryRunner.query(`ALTER TABLE "lwp_pupil_feedback" ALTER COLUMN "deletedUserCreatedBy" TYPE integer`);
    }
}
