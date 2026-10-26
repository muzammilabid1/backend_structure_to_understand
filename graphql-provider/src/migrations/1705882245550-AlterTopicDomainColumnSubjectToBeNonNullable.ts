import { MigrationInterface, QueryRunner } from 'typeorm';

export class AlterTopicDomainColumnSubjectToBeNonNullable1705882245550 implements MigrationInterface {
    name = 'AlterTopicDomainColumnSubjectToBeNonNullable1705882245550';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "static_lwp_topic_domain" ALTER COLUMN "subject" SET NOT NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "static_lwp_topic_domain" ALTER COLUMN "subject" DROP NOT NULL`);
    }
}
