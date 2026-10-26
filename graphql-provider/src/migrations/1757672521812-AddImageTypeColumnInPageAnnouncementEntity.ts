import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddImageTypeColumnInPageAnnouncementEntity1757672521812 implements MigrationInterface {
    name = 'AddImageTypeColumnInPageAnnouncementEntity1757672521812';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "static_lwp_page_announcement" ADD "imageType" character varying`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "static_lwp_page_announcement" DROP COLUMN "imageType"`);
    }
}
