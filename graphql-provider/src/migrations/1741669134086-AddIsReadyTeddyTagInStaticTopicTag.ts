import {MigrationInterface, QueryRunner} from "typeorm";

export class AddIsReadyTeddyTagInStaticTopicTag1741669134086 implements MigrationInterface {
    name = 'AddIsReadyTeddyTagInStaticTopicTag1741669134086'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "static_lwp_topic_tag" ADD "isReadyTeddyTag" boolean NOT NULL DEFAULT false`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "static_lwp_topic_tag" DROP COLUMN "isReadyTeddyTag"`);
    }

}
