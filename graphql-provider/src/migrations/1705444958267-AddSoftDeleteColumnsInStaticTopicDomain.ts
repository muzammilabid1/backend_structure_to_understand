import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSoftDeleteColumnsInStaticTopicDomain1705444958267 implements MigrationInterface {
    name = 'AddSoftDeleteColumnsInStaticTopicDomain1705444958267';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "static_lwp_topic_domain" ADD "deletedAt" TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE "static_lwp_topic_domain" ADD "deletedById" bigint`);
        await queryRunner.query(
            `ALTER TABLE "static_lwp_topic_domain" ADD CONSTRAINT "FK_3405c33e7db626983a427afbb45" FOREIGN KEY ("deletedById") REFERENCES "lwp_user"("id") ON DELETE SET NULL ON UPDATE NO ACTION`
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "static_lwp_topic_domain" DROP CONSTRAINT "FK_3405c33e7db626983a427afbb45"`);
        await queryRunner.query(`ALTER TABLE "static_lwp_topic_domain" DROP COLUMN "deletedById"`);
        await queryRunner.query(`ALTER TABLE "static_lwp_topic_domain" DROP COLUMN "deletedAt"`);
    }
}
