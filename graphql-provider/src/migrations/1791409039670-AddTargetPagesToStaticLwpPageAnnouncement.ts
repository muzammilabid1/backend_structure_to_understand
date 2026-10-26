import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTargetPagesToStaticLwpPageAnnouncement1791409039670 implements MigrationInterface {
    name = 'AddTargetPagesToStaticLwpPageAnnouncement1791409039670';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "static_lwp_page_announcement" ADD "targetPages" jsonb NOT NULL DEFAULT '[]'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "static_lwp_page_announcement" DROP COLUMN "targetPages"`);
    }
}
