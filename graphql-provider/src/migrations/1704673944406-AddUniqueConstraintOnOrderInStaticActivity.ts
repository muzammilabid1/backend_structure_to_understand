import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUniqueConstraintOnOrderInStaticActivity1704673944406 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        // Create an index for rows where deletedAt is NOT NULL
        await queryRunner.query(`
            CREATE UNIQUE INDEX idx_unique_order_topic 
            ON static_lwp_activity("order", "topicId", "deletedAt") 
            WHERE "deletedAt" IS NOT NULL;
        `);

        // Create another index for rows where deletedAt IS NULL
        await queryRunner.query(`
            CREATE UNIQUE INDEX idx_unique_order_topic_null_deleted 
            ON static_lwp_activity("order", "topicId") 
            WHERE "deletedAt" IS NULL;
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX idx_unique_order_topic;`);
        await queryRunner.query(`DROP INDEX idx_unique_order_topic_null_deleted;`);
    }
}
