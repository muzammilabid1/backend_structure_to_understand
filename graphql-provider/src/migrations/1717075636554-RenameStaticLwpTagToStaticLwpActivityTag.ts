import { MigrationInterface, QueryRunner } from 'typeorm';

export class RenameStaticLwpTagToStaticLwpActivityTag1717075636554 implements MigrationInterface {
    name = 'RenameStaticLwpTagToStaticLwpActivityTag1717075636554';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.renameTable('static_lwp_tag', 'static_lwp_activity_tag');

        await queryRunner.query(`
            ALTER TABLE "lwp_activity_tags"
            RENAME COLUMN "staticLwpTagId" TO "staticLwpActivityTagId";
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "lwp_activity_tags"
            RENAME COLUMN "staticLwpActivityTagId" TO "staticLwpTagId";
        `);

        await queryRunner.renameTable('static_lwp_activity_tag', 'static_lwp_tag');
    }
}
