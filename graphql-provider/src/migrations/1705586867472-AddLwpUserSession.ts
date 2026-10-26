import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddLwpUserSession1705586867472 implements MigrationInterface {
    name = 'AddLwpUserSession1705586867472';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `CREATE TABLE "lwp_user_session" ("userId" integer NOT NULL, "ip" character varying NOT NULL, "userAgent" character varying NOT NULL, "authMethod" integer NOT NULL, "sessionLength" integer NOT NULL, "refreshToken" character varying NOT NULL, "id" BIGSERIAL NOT NULL, "logCreatedAt" TIMESTAMP DEFAULT ('now'::text)::timestamp(6) with time zone, "logUpdatedAt" TIMESTAMP NOT NULL DEFAULT ('now'::text)::timestamp(6) with time zone, CONSTRAINT "PK_872e28a3d312aac3b20f8ee1d24" PRIMARY KEY ("id"))`
        );
        await queryRunner.query(
            `CREATE UNIQUE INDEX "lwp_user_session_user_refresh_idx" ON "lwp_user_session" ("userId", "refreshToken") `
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."lwp_user_session_user_refresh_idx"`);
        await queryRunner.query(`DROP TABLE "lwp_user_session"`);
    }
}
