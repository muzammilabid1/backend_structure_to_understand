import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPreviousRefreshTokenToLwpUserSessions1720442446280 implements MigrationInterface {
    name = 'AddPreviousRefreshTokenToLwpUserSessions1720442446280';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "lwp_user_session" ADD "previousRefreshToken" character varying`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "lwp_user_session" DROP COLUMN "previousRefreshToken"`);
    }
}
