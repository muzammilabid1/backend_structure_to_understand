import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDeferSchoolLeaderInviteModeColumnInLwpSchoolTable1782296673597 implements MigrationInterface {
    name = 'AddDeferSchoolLeaderInviteModeColumnInLwpSchoolTable1782296673597';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."school_leader_invite_mode_enum" AS ENUM('SEND_NOW', 'SEND_LATER', 'DO_NOT_SEND')`);
        await queryRunner.query(
            `ALTER TABLE "lwp_school" ADD "schoolLeaderInviteMode" "public"."school_leader_invite_mode_enum" NOT NULL DEFAULT 'SEND_NOW'`
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "lwp_school" DROP COLUMN "schoolLeaderInviteMode"`);
        await queryRunner.query(`DROP TYPE "public"."school_leader_invite_mode_enum"`);
    }
}
