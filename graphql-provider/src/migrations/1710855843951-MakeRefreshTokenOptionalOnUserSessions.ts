import { MigrationInterface, QueryRunner } from 'typeorm';

export class MakeRefreshTokenOptionalOnUserSessions1710855843951 implements MigrationInterface {
    name = 'MakeRefreshTokenOptionalOnUserSessions1710855843951';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."lwp_user_session_user_refresh_idx"`);
        await queryRunner.query(`ALTER TABLE "lwp_user_session" ALTER COLUMN "refreshToken" DROP NOT NULL`);
        await queryRunner.query(
            `CREATE UNIQUE INDEX "lwp_user_session_user_refresh_idx" ON "lwp_user_session" ("userId", "refreshToken") `
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."lwp_user_session_user_refresh_idx"`);
        await queryRunner.query(`ALTER TABLE "lwp_user_session" ALTER COLUMN "refreshToken" SET NOT NULL`);
        await queryRunner.query(
            `CREATE UNIQUE INDEX "lwp_user_session_user_refresh_idx" ON "lwp_user_session" ("userId", "refreshToken") `
        );
    }
}
