import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddClassReleaseDueDateIndexToLwpClassTopic1724768245070 implements MigrationInterface {
    name = 'AddClassReleaseDueDateIndexToLwpClassTopic1724768245070';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `CREATE INDEX "idx_class_release_due" ON "lwp_class_topic" ("classId", "releaseDate", "dueDate") WHERE "deletedAt" IS NULL`
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."idx_class_release_due"`);
    }
}
