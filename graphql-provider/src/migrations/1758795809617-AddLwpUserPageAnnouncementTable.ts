import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddLwpUserPageAnnouncementTable1758795809617 implements MigrationInterface {
    name = 'AddLwpUserPageAnnouncementTable1758795809617';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `CREATE TABLE "lwp_user_page_announcement" ("seenAt" TIMESTAMP NOT NULL DEFAULT ('now'::text)::timestamp(6) with time zone, "id" BIGSERIAL NOT NULL, "logCreatedAt" TIMESTAMP NOT NULL DEFAULT ('now'::text)::timestamp(6) with time zone, "logUpdatedAt" TIMESTAMP NOT NULL DEFAULT ('now'::text)::timestamp(6) with time zone, "userId" bigint, "pageAnnouncementId" bigint, "logCreatedById" bigint, "logUpdatedById" bigint, CONSTRAINT "PK_f97da7c5800f744177363c536aa" PRIMARY KEY ("id"))`
        );
        await queryRunner.query(`CREATE INDEX "IDX_710266aa10ba8639a8df0bda18" ON "lwp_user_page_announcement" ("userId") `);
        await queryRunner.query(
            `CREATE UNIQUE INDEX "idx_unique_user_pageAnnouncement" ON "lwp_user_page_announcement" ("userId", "pageAnnouncementId") `
        );
        await queryRunner.query(
            `ALTER TABLE "lwp_user_page_announcement" ADD CONSTRAINT "FK_710266aa10ba8639a8df0bda184" FOREIGN KEY ("userId") REFERENCES "lwp_user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`
        );
        await queryRunner.query(
            `ALTER TABLE "lwp_user_page_announcement" ADD CONSTRAINT "FK_bcafec249e3cb5cf552270412e5" FOREIGN KEY ("pageAnnouncementId") REFERENCES "static_lwp_page_announcement"("id") ON DELETE CASCADE ON UPDATE NO ACTION`
        );
        await queryRunner.query(
            `ALTER TABLE "lwp_user_page_announcement" ADD CONSTRAINT "FK_91b5ed313b4cde5f767344206aa" FOREIGN KEY ("logCreatedById") REFERENCES "lwp_user"("id") ON DELETE SET NULL ON UPDATE NO ACTION`
        );
        await queryRunner.query(
            `ALTER TABLE "lwp_user_page_announcement" ADD CONSTRAINT "FK_95c8865a1a4918509816b4692c8" FOREIGN KEY ("logUpdatedById") REFERENCES "lwp_user"("id") ON DELETE SET NULL ON UPDATE NO ACTION`
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "lwp_user_page_announcement" DROP CONSTRAINT "FK_95c8865a1a4918509816b4692c8"`);
        await queryRunner.query(`ALTER TABLE "lwp_user_page_announcement" DROP CONSTRAINT "FK_91b5ed313b4cde5f767344206aa"`);
        await queryRunner.query(`ALTER TABLE "lwp_user_page_announcement" DROP CONSTRAINT "FK_bcafec249e3cb5cf552270412e5"`);
        await queryRunner.query(`ALTER TABLE "lwp_user_page_announcement" DROP CONSTRAINT "FK_710266aa10ba8639a8df0bda184"`);
        await queryRunner.query(`DROP INDEX "public"."idx_unique_user_pageAnnouncement"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_710266aa10ba8639a8df0bda18"`);
        await queryRunner.query(`DROP TABLE "lwp_user_page_announcement"`);
    }
}
