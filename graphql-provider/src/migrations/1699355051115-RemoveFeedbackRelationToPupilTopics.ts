import { MigrationInterface, QueryRunner } from 'typeorm';

export class RemoveFeedbackRelationToPupilTopics1699355051115 implements MigrationInterface {
    name = 'RemoveFeedbackRelationToPupilTopics1699355051115';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "lwp_pupil_feedback" DROP CONSTRAINT "FK_d55637bc53c616bda78519944b6"`);
        await queryRunner.query(`DROP INDEX "public"."lwp_pupil_feedback_pupiltopic_idx"`);
        // await queryRunner.query(
        //     `CREATE TABLE backup_lwp_pupil_feedback_pupil_topic_ids AS (SELECT "id" as "pupilFeedbackId", "pupilTopicId" FROM lwp_pupil_feedback WHERE "pupilTopicId" IS NOT NULL)`
        // );
        // await queryRunner.query(`ALTER TABLE "lwp_pupil_feedback" DROP COLUMN "pupilTopicId"`);
        await queryRunner.query(`CREATE VIEW "lwp_view_reading_log_to_reading_topic" AS               
    SELECT
        lpf.id as "pupilFeedbackId",
        lpt.id as "pupilTopicId"
    FROM
        lwp_pupil_feedback lpf
        JOIN static_lwp_topic slt ON slt.subject = 'READING'
        JOIN lwp_pupil_topic lpt ON lpt."pupilId" = lpf."pupilId"
            AND daterange(lpt."releaseDate", (lpt."releaseDate" + interval '1 week')::date) @> coalesce(lpf."bookReadAt", lpf."logCreatedAt")::date
            AND lpt."topicId" = slt.id
    WHERE
        lpf."type" = 'READING'
        AND lpf."deletedAt" IS NULL
    `);
        await queryRunner.query(
            `INSERT INTO "typeorm_metadata"("database", "schema", "table", "type", "name", "value") VALUES (DEFAULT, $1, DEFAULT, $2, $3, $4)`,
            [
                'public',
                'VIEW',
                'lwp_view_reading_log_to_reading_topic',
                'SELECT\n        lpf.id as "pupilFeedbackId",\n        lpt.id as "pupilTopicId"\n    FROM\n        lwp_pupil_feedback lpf\n        JOIN static_lwp_topic slt ON slt.subject = \'READING\'\n        JOIN lwp_pupil_topic lpt ON lpt."pupilId" = lpf."pupilId"\n            AND daterange(lpt."releaseDate", (lpt."releaseDate" + interval \'1 week\')::date) @> coalesce(lpf."bookReadAt", lpf."logCreatedAt")::date\n            AND lpt."topicId" = slt.id\n    WHERE\n        lpf."type" = \'READING\'\n        AND lpf."deletedAt" IS NULL'
            ]
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DELETE FROM "typeorm_metadata" WHERE "type" = $1 AND "name" = $2 AND "schema" = $3`, [
            'VIEW',
            'lwp_view_reading_log_to_reading_topic',
            'public'
        ]);
        await queryRunner.query(`DROP VIEW "lwp_view_reading_log_to_reading_topic"`);
        // await queryRunner.query(`ALTER TABLE "lwp_pupil_feedback" ADD "pupilTopicId" bigint`);
        await queryRunner.query(`CREATE INDEX "lwp_pupil_feedback_pupiltopic_idx" ON "lwp_pupil_feedback" ("pupilTopicId") `);
        await queryRunner.query(
            `ALTER TABLE "lwp_pupil_feedback" ADD CONSTRAINT "FK_d55637bc53c616bda78519944b6" FOREIGN KEY ("pupilTopicId") REFERENCES "lwp_pupil_topic"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
        );
    }
}
