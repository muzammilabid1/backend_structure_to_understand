import {MigrationInterface, QueryRunner} from "typeorm";

export class DropTitleFromReadingTopics1689772180285 implements MigrationInterface {
    name = 'DropTitleFromReadingTopics1689772180285'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "lwp_class_topic" DROP COLUMN "title"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "lwp_class_topic" ADD "title" character varying`);
    }

}
