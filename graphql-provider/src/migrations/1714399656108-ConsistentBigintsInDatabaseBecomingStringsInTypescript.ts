import { MigrationInterface, QueryRunner } from 'typeorm';

export class ConsistentBigintsInDatabaseBecomingStringsInTypescript1714399656108 implements MigrationInterface {
    name = 'ConsistentBigintsInDatabaseBecomingStringsInTypescript1714399656108';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `ALTER TABLE "lwp_pupil_parent" ALTER COLUMN "wondeStudentContactID" TYPE bigint USING "wondeStudentContactID"::bigint`
        );
        await queryRunner.query(`ALTER TABLE "lwp_pupil_feedback" ALTER COLUMN "userId" TYPE bigint USING "userId"::bigint`);
        await queryRunner.query(`ALTER TABLE "lwp_magic_link" ALTER COLUMN "pupilId" TYPE bigint USING "pupilId"::bigint`);
        await queryRunner.query(`ALTER TABLE "static_lwp_activity_steps" ALTER COLUMN "id" TYPE bigint USING "id"::bigint`);
        await queryRunner.query(`ALTER TABLE "log_lwp_access" ALTER COLUMN "userId" TYPE bigint USING "userId"::bigint`);
        await queryRunner.query(`ALTER TABLE "lwp_notification" ALTER COLUMN "userId" TYPE bigint USING "userId"::bigint`);
        await queryRunner.query(`ALTER TABLE "log_parent_pupil_action" ALTER COLUMN "userId" TYPE bigint USING "userId"::bigint`);
        await queryRunner.query(`ALTER TABLE "log_parent_pupil_action" ALTER COLUMN "parentId" TYPE bigint USING "parentId"::bigint`);
        await queryRunner.query(`ALTER TABLE "log_parent_pupil_action" ALTER COLUMN "pupilId" TYPE bigint USING "pupilId"::bigint`);
        await queryRunner.query(`ALTER TABLE "log_parent_pupil_action" ALTER COLUMN "param1" TYPE bigint USING "param1"::bigint`);
        await queryRunner.query(`ALTER TABLE "log_parent_pupil_action" ALTER COLUMN "param2" TYPE bigint USING "param2"::bigint`);
        await queryRunner.query(`DROP INDEX "public"."lwp_user_session_user_refresh_idx"`);
        await queryRunner.query(`ALTER TABLE "lwp_user_session" ALTER COLUMN "userId" TYPE bigint USING "userId"::bigint`);
        await queryRunner.query(
            `CREATE UNIQUE INDEX "lwp_user_session_user_refresh_idx" ON "lwp_user_session" ("userId", "refreshToken") `
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `ALTER TABLE "lwp_pupil_parent" ALTER COLUMN "wondeStudentContactID" TYPE integer USING "wondeStudentContactID"::integer`
        );
        await queryRunner.query(`ALTER TABLE "lwp_pupil_feedback" ALTER COLUMN "userId" TYPE integer USING "userId"::integer`);
        await queryRunner.query(`ALTER TABLE "lwp_magic_link" ALTER COLUMN "pupilId" TYPE integer USING "pupilId"::integer`);
        await queryRunner.query(`ALTER TABLE "static_lwp_activity_steps" ALTER COLUMN "id" TYPE integer USING "id"::integer`);
        await queryRunner.query(`ALTER TABLE "log_lwp_access" ALTER COLUMN "userId" TYPE integer USING "userId"::integer`);
        await queryRunner.query(`ALTER TABLE "lwp_notification" ALTER COLUMN "userId" TYPE integer USING "userId"::integer`);
        await queryRunner.query(`ALTER TABLE "log_parent_pupil_action" ALTER COLUMN "userId" TYPE integer USING "userId"::integer`);
        await queryRunner.query(`ALTER TABLE "log_parent_pupil_action" ALTER COLUMN "parentId" TYPE integer USING "parentId"::integer`);
        await queryRunner.query(`ALTER TABLE "log_parent_pupil_action" ALTER COLUMN "pupilId" TYPE integer USING "pupilId"::integer`);
        await queryRunner.query(`ALTER TABLE "log_parent_pupil_action" ALTER COLUMN "param1" TYPE integer USING "param1"::integer`);
        await queryRunner.query(`ALTER TABLE "log_parent_pupil_action" ALTER COLUMN "param2" TYPE integer USING "param2"::integer`);
        await queryRunner.query(`DROP INDEX "public"."lwp_user_session_user_refresh_idx"`);
        await queryRunner.query(`ALTER TABLE "lwp_user_session" ALTER COLUMN "userId" TYPE integer USING "userId"::integer`);
        await queryRunner.query(
            `CREATE UNIQUE INDEX "lwp_user_session_user_refresh_idx" ON "lwp_user_session" ("userId", "refreshToken") `
        );
    }
}
