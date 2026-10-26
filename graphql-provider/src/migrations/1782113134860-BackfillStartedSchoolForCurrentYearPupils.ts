import { MigrationInterface, QueryRunner } from 'typeorm';

export class BackfillStartedSchoolForCurrentYearPupils1782113134860 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        // One-time backfill of startedSchool for existing pupils whose value is null, limited to
        // schools whose Wonde data is for the current academic year (hasCurrentAcademicYearWondeData).
        // Layered fallback, applied in order; each layer only fills rows still null after the previous,
        // and never overwrites an existing value (so this is safe to re-run):
        //   1. nc_year from the linked imported student (resolved via normalise_school_year)
        //   2. date of birth (academic year of the pupil's 5th birthday)
        //   3. the pupil's registration class (period - year group)
        //
        // Relationship to LEA-6177: that change added a *runtime* backfill in wonde.service.ts, so pupils
        // get startedSchool populated during Wonde relinking going forward. This migration is the one-time
        // sweep for the remaining pupils - those who existed before relinking ran, or who never had an
        // importedStudentId set.

        // Layer 1: nc_year from the linked imported student.
        await queryRunner.query(`
            UPDATE lwp_pupil p
            SET "startedSchool" = sub.started_school
            FROM (
                SELECT DISTINCT ON (p.id)
                    p.id AS pupil_id,
                    (COALESCE(lsc."periodIndex", ischool."periodIndex") - normalise_school_year(
                        (((ist.details#>>'{}')::jsonb)->>'import_nc_year')
                    ))::text AS started_school
                FROM lwp_pupil p
                JOIN lwp_school s ON s.id = p."schoolId" AND s."hasCurrentAcademicYearWondeData" = true
                JOIN imported_student ist ON ist.id = p."importedStudentId"
                JOIN imported_school ischool ON ischool.id = ist."schoolId"
                LEFT JOIN imported_school_class_student iscs ON iscs."importedStudentId" = ist.id
                LEFT JOIN imported_school_class isc ON isc.id = iscs."importedSchoolClassId"
                LEFT JOIN lwp_school_class lsc ON lsc.id = isc."lwpSchoolClassId"
                    AND lsc."periodIndex" >= s."curentPeriodIndex"
                WHERE p."startedSchool" IS NULL
                ORDER BY p.id, lsc."isRegistrationClass" DESC NULLS LAST, lsc."periodIndex" DESC NULLS LAST
            ) sub
            WHERE p.id = sub.pupil_id
              AND sub.started_school IS NOT NULL;
        `);

        // Layer 2: date of birth - the academic year period containing the pupil's 5th birthday.
        await queryRunner.query(`
            UPDATE lwp_pupil p
            SET "startedSchool" = sub.started_school
            FROM (
                SELECT DISTINCT ON (p.id)
                    p.id AS pupil_id,
                    per.index::text AS started_school
                FROM lwp_pupil p
                JOIN lwp_school s ON s.id = p."schoolId" AND s."hasCurrentAcademicYearWondeData" = true
                JOIN static_lwp_period per
                    ON (p."dateOfBirth" + INTERVAL '5 years')::date BETWEEN per."startDate" AND per."endDate"
                WHERE p."startedSchool" IS NULL
                  AND p."dateOfBirth" IS NOT NULL
                ORDER BY p.id, per.index
            ) sub
            WHERE p.id = sub.pupil_id;
        `);

        // Layer 3: the pupil's registration class (most recent), period - year group.
        await queryRunner.query(`
            UPDATE lwp_pupil p
            SET "startedSchool" = sub.started_school
            FROM (
                SELECT DISTINCT ON (p.id)
                    p.id AS pupil_id,
                    (lsc."periodIndex" - normalise_school_year(slyg.year))::text AS started_school
                FROM lwp_pupil p
                JOIN lwp_school s ON s.id = p."schoolId" AND s."hasCurrentAcademicYearWondeData" = true
                JOIN lwp_class_pupil lcp ON lcp."lwpPupilId" = p.id
                JOIN lwp_school_class lsc ON lsc.id = lcp."lwpSchoolClassId" AND lsc."isRegistrationClass" = true
                    AND lsc."periodIndex" >= s."curentPeriodIndex"
                LEFT JOIN static_lwp_year_group slyg ON slyg.id = lsc."yearGroup"
                WHERE p."startedSchool" IS NULL
                ORDER BY p.id, lsc."periodIndex" DESC NULLS LAST
            ) sub
            WHERE p.id = sub.pupil_id
              AND sub.started_school IS NOT NULL;
        `);
    }

    public async down(_queryRunner: QueryRunner): Promise<void> {
        // One-time data backfill: it only ever filled previously-null startedSchool values and cannot be
        // cleanly reversed (we cannot identify which rows were null beforehand), so down() is a no-op.
    }
}
