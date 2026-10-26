import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddProgramTypeColumnInLwpSubjectColumn1747317159210 implements MigrationInterface {
    name = 'AddProgramTypeColumnInLwpSubjectColumn1747317159210';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "static_lwp_subject" ADD "programmeType" character varying NOT NULL DEFAULT 'FULL_PROGRAMME'`);

        await queryRunner.query(`
            WITH subject_program_type AS (
              SELECT 
                sub.id AS "subjectId",
                CASE 
                  WHEN BOOL_OR(sltt."isReadyTeddyTag") THEN 'READY_TEDDY'
                  ELSE 'FULL_PROGRAMME'
                END AS programmeType
              FROM static_lwp_subject sub
              LEFT JOIN static_lwp_topic_domain sltd ON sltd."subjectId" = sub.id
              LEFT JOIN static_lwp_topic_domain_year_group sltdyg ON sltdyg."domainId" = sltd.id
              LEFT JOIN static_lwp_topic slt ON slt.id = sltdyg."topicId"
              LEFT JOIN lwp_topic_tags ltt ON ltt."staticLwpTopicId" = slt.id
              LEFT JOIN static_lwp_topic_tag sltt ON sltt.id = ltt."staticLwpTopicTagId"
              GROUP BY sub.id
            )
            
            UPDATE static_lwp_subject sub
            SET "programmeType" = sp.programmeType
            FROM subject_program_type sp
            WHERE sub.id = sp."subjectId";
        `);

        await queryRunner.query(`ALTER TABLE "static_lwp_topic_tag" DROP COLUMN "isReadyTeddyTag"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "static_lwp_topic_tag" ADD "isReadyTeddyTag" boolean NOT NULL DEFAULT false`);
        await queryRunner.query(`ALTER TABLE "static_lwp_subject" DROP COLUMN "programmeType"`);
    }
}
