import { MigrationInterface, QueryRunner } from 'typeorm';

export class RemoveLegacySubjectColumnAndMigrateSubjectDataIntoStaticLwpTopicDomainTable1723522290820 implements MigrationInterface {
    name = 'RemoveLegacySubjectColumnAndMigrateSubjectDataIntoStaticLwpTopicDomainTable1723522290820';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `
                UPDATE static_lwp_topic_domain AS sltd
                SET
                    "subjectId" = sls.id
                FROM
                    static_lwp_subject AS sls
                WHERE
                    LOWER(sltd."legacySubject") = LOWER(sls.name)
            `
        );
        await queryRunner.query(`ALTER TABLE "static_lwp_topic_domain" DROP COLUMN "legacySubject"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "static_lwp_topic_domain" ADD "legacySubject" character varying`);
        await queryRunner.query(
            `
                UPDATE static_lwp_topic_domain
                SET
                    "subjectId" = NULL
            `
        );
    }
}
