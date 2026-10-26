import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddLwpPageAnnouncementSchoolTagsTable1759128626960 implements MigrationInterface {
    name = 'AddLwpPageAnnouncementSchoolTagsTable1759128626960';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `CREATE TABLE "lwp_page_announcement_school_tags" ("staticLwpPageAnnouncementId" bigint NOT NULL, "staticLwpSchoolTagId" bigint NOT NULL, CONSTRAINT "PK_761cdcf9b607a1b110145248514" PRIMARY KEY ("staticLwpPageAnnouncementId", "staticLwpSchoolTagId"))`
        );
        await queryRunner.query(
            `CREATE INDEX "IDX_e9dbc23633bec240bcb0278a04" ON "lwp_page_announcement_school_tags" ("staticLwpPageAnnouncementId") `
        );
        await queryRunner.query(
            `CREATE INDEX "IDX_0e74c8dd936d77abcbb6b08e6c" ON "lwp_page_announcement_school_tags" ("staticLwpSchoolTagId") `
        );
        await queryRunner.query(
            `ALTER TABLE "lwp_page_announcement_school_tags" ADD CONSTRAINT "FK_e9dbc23633bec240bcb0278a040" FOREIGN KEY ("staticLwpPageAnnouncementId") REFERENCES "static_lwp_page_announcement"("id") ON DELETE CASCADE ON UPDATE CASCADE`
        );
        await queryRunner.query(
            `ALTER TABLE "lwp_page_announcement_school_tags" ADD CONSTRAINT "FK_0e74c8dd936d77abcbb6b08e6ce" FOREIGN KEY ("staticLwpSchoolTagId") REFERENCES "static_lwp_school_tag"("id") ON DELETE CASCADE ON UPDATE NO ACTION`
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "lwp_page_announcement_school_tags" DROP CONSTRAINT "FK_0e74c8dd936d77abcbb6b08e6ce"`);
        await queryRunner.query(`ALTER TABLE "lwp_page_announcement_school_tags" DROP CONSTRAINT "FK_e9dbc23633bec240bcb0278a040"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_0e74c8dd936d77abcbb6b08e6c"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_e9dbc23633bec240bcb0278a04"`);
        await queryRunner.query(`DROP TABLE "lwp_page_announcement_school_tags"`);
    }
}
