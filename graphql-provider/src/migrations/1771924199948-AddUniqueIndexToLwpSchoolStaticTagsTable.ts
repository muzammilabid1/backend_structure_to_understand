import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUniqueIndexToLwpSchoolStaticTagsTable1771924199948 implements MigrationInterface {
    name = 'AddUniqueIndexToLwpSchoolStaticTagsTable1771924199948';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "lwp_school_static_tags" ADD CONSTRAINT "UQ_SCHOOL_TAG" UNIQUE ("schoolId", "tagId")`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "lwp_school_static_tags" DROP CONSTRAINT "UQ_SCHOOL_TAG"`);
    }
}
