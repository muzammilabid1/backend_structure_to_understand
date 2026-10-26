import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPriorityColumnInStaticLwpPageAnnouncementTable1759125733890 implements MigrationInterface {
    name = 'AddPriorityColumnInStaticLwpPageAnnouncementTable1759125733890';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "static_lwp_page_announcement" ADD "priority" integer NOT NULL DEFAULT '1'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "static_lwp_page_announcement" DROP COLUMN "priority"`);
    }
}
