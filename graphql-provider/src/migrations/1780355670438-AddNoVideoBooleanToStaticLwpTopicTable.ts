import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddNoVideoBooleanToStaticLwpTopicTable1780355670438 implements MigrationInterface {
    name = 'AddNoVideoBooleanToStaticLwpTopicTable1780355670438';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "static_lwp_topic" ADD "noVideo" boolean NOT NULL DEFAULT false`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "static_lwp_topic" DROP COLUMN "noVideo"`);
    }
}
