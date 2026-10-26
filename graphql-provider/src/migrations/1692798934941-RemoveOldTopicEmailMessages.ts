import {MigrationInterface, QueryRunner} from "typeorm";

export class RemoveOldTopicEmailMessages1692798934941 implements MigrationInterface {
    name = 'RemoveOldTopicEmailMessages1692798934941'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "static_lwp_topic" DROP COLUMN "defaultEmailMessage"`);
        await queryRunner.query(`ALTER TABLE "lwp_class_topic" DROP COLUMN "teacherEmailMessage"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "lwp_class_topic" ADD "teacherEmailMessage" character varying`);
        await queryRunner.query(`ALTER TABLE "static_lwp_topic" ADD "defaultEmailMessage" character varying`);
    }

}
