import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSoftDeleteColumnsInTopicAndActivity1704666381960 implements MigrationInterface {
    name = 'AddSoftDeleteColumnsInTopicAndActivity1704666381960';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "static_lwp_topic" ADD "deletedAt" TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE "static_lwp_topic" ADD "deletedById" bigint`);
        await queryRunner.query(`ALTER TABLE "static_lwp_activity" ADD "deletedAt" TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE "static_lwp_activity" ADD "deletedById" bigint`);
        await queryRunner.query(`ALTER TABLE "static_lwp_activity_steps" ADD "deletedAt" TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE "static_lwp_activity_steps" ADD "deletedById" bigint`);
        await queryRunner.query(
            `ALTER TABLE "static_lwp_topic" ADD CONSTRAINT "FK_56914a5c98348e7b0d64d281964" FOREIGN KEY ("deletedById") REFERENCES "lwp_user"("id") ON DELETE SET NULL ON UPDATE NO ACTION`
        );
        await queryRunner.query(
            `ALTER TABLE "static_lwp_activity" ADD CONSTRAINT "FK_2bfb5c86b0fe76e9991b0ec990d" FOREIGN KEY ("deletedById") REFERENCES "lwp_user"("id") ON DELETE SET NULL ON UPDATE NO ACTION`
        );
        await queryRunner.query(
            `ALTER TABLE "static_lwp_activity_steps" ADD CONSTRAINT "FK_c8f1d4ebd6ed1b80a4347a0213b" FOREIGN KEY ("deletedById") REFERENCES "lwp_user"("id") ON DELETE SET NULL ON UPDATE NO ACTION`
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "static_lwp_activity_steps" DROP CONSTRAINT "FK_c8f1d4ebd6ed1b80a4347a0213b"`);
        await queryRunner.query(`ALTER TABLE "static_lwp_activity" DROP CONSTRAINT "FK_2bfb5c86b0fe76e9991b0ec990d"`);
        await queryRunner.query(`ALTER TABLE "static_lwp_topic" DROP CONSTRAINT "FK_56914a5c98348e7b0d64d281964"`);
        await queryRunner.query(`ALTER TABLE "static_lwp_activity_steps" DROP COLUMN "deletedById"`);
        await queryRunner.query(`ALTER TABLE "static_lwp_activity_steps" DROP COLUMN "deletedAt"`);
        await queryRunner.query(`ALTER TABLE "static_lwp_activity" DROP COLUMN "deletedById"`);
        await queryRunner.query(`ALTER TABLE "static_lwp_activity" DROP COLUMN "deletedAt"`);
        await queryRunner.query(`ALTER TABLE "static_lwp_topic" DROP COLUMN "deletedById"`);
        await queryRunner.query(`ALTER TABLE "static_lwp_topic" DROP COLUMN "deletedAt"`);
    }
}
