import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateStaticLwpPageAnnouncementTable1757371022809 implements MigrationInterface {
    name = 'CreateStaticLwpPageAnnouncementTable1757371022809';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `CREATE TABLE "static_lwp_page_announcement" ("userOptions" jsonb NOT NULL, "status" character varying NOT NULL, "title" character varying NOT NULL, "message" character varying NOT NULL, "imageUrl" character varying, "includeImage" boolean NOT NULL DEFAULT false, "id" BIGSERIAL NOT NULL, "logCreatedAt" TIMESTAMP NOT NULL DEFAULT ('now'::text)::timestamp(6) with time zone, "logUpdatedAt" TIMESTAMP NOT NULL DEFAULT ('now'::text)::timestamp(6) with time zone, "logCreatedById" bigint, "logUpdatedById" bigint, CONSTRAINT "PK_b46807faf617d78703ca884c235" PRIMARY KEY ("id"))`
        );
        await queryRunner.query(
            `ALTER TABLE "static_lwp_page_announcement" ADD CONSTRAINT "FK_ac7c56a7b558b55834ed606d26a" FOREIGN KEY ("logCreatedById") REFERENCES "lwp_user"("id") ON DELETE SET NULL ON UPDATE NO ACTION`
        );
        await queryRunner.query(
            `ALTER TABLE "static_lwp_page_announcement" ADD CONSTRAINT "FK_5038a2f1d3f5933440fe97af356" FOREIGN KEY ("logUpdatedById") REFERENCES "lwp_user"("id") ON DELETE SET NULL ON UPDATE NO ACTION`
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "static_lwp_page_announcement" DROP CONSTRAINT "FK_5038a2f1d3f5933440fe97af356"`);
        await queryRunner.query(`ALTER TABLE "static_lwp_page_announcement" DROP CONSTRAINT "FK_ac7c56a7b558b55834ed606d26a"`);
        await queryRunner.query(`DROP TABLE "static_lwp_page_announcement"`);
    }
}
