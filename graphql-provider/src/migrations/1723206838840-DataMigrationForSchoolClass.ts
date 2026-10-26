import { MigrationInterface, QueryRunner } from 'typeorm';

export class DataMigrationForSchoolClass1723206838840 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
             WITH legacy_subjects AS (
    SELECT
        lsc.id AS "lwpSchoolClassId",
        jsonb_array_elements_text(lsc."legacySubjects") AS "legacySubject"
    FROM lwp_school_class lsc
)
INSERT INTO lwp_class_subjects ("lwpSchoolClassId", "staticLwpSubjectId")
SELECT DISTINCT
    lsc.id AS "lwpSchoolClassId",
    ss.id AS "staticLwpSubjectId"
FROM lwp_school_class lsc
LEFT JOIN lwp_class_topic lct ON lct."classId" = lsc.id
LEFT JOIN static_lwp_topic slt ON slt.id = lct."topicId"
LEFT JOIN legacy_subjects ls ON ls."lwpSchoolClassId" = lsc.id
LEFT JOIN static_lwp_subject ss ON UPPER(ss.name) = UPPER(slt.subject) OR UPPER(ss.name) = UPPER(ls."legacySubject")
WHERE ((UPPER(slt.subject) <> 'READING' OR slt.subject IS NULL)
  OR (UPPER(ls."legacySubject") <> 'READING' OR ls."legacySubject" IS NULL)) AND ss.id IS NOT NULL;
        `);

        await queryRunner.query(`
            UPDATE lwp_school_class ls
            SET "IsReadingLogsEnabled" = TRUE
            WHERE "legacySubjects" ? 'READING'
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            DELETE FROM lwp_class_subjects
        `);

        await queryRunner.query(`
            UPDATE lwp_school_class
            SET "IsReadingLogsEnabled" = FALSE
            WHERE "legacySubjects" ? 'READING'
        `);
    }
}
