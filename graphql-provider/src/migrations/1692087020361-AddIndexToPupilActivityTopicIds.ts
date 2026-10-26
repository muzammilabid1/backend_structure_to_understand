import {MigrationInterface, QueryRunner} from "typeorm";

export class AddIndexToPupilActivityTopicIds1692087020361 implements MigrationInterface {
    name = 'AddIndexToPupilActivityTopicIds1692087020361'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE INDEX "lwp_pupil_activity_topicid_idx" ON "lwp_pupil_activity" ("topicId") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."lwp_pupil_activity_topicid_idx"`);
    }

}
