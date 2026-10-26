WITH classes_with_topics_count AS (
    SELECT
        class.*,
        COUNT(*) FILTER (WHERE topic."isReading" != TRUE) AS topics_count,
        COUNT(class_subject."staticLwpSubjectId") AS subjects_count
    FROM lwp_school_class class
        LEFT JOIN lwp_class_topic class_topic ON class_topic."classId" = class.id
        LEFT JOIN static_lwp_topic topic ON topic.id = class_topic."topicId"
        LEFT JOIN lwp_school school ON school.id = class."schoolId"
        LEFT JOIN lwp_class_subjects class_subject ON class_subject."lwpSchoolClassId" = class.id
    WHERE
        school.inactive != TRUE
        AND school."isTestSchool" != TRUE
        AND school."curentPeriodIndex" = 2024
        AND class.status = 'ACTIVE'
        AND class."periodIndex" = 2024
    GROUP BY class.id
)
SELECT
    year_group.year AS "Year Group",
    COUNT(*) AS "Total classes activated in this academic year",
    COUNT(*) FILTER (WHERE class."isFullProgramme" OR class.subjects_count > 0) AS "Classes with Full Programme enabled",
    COUNT(*) FILTER (WHERE class.topics_count > 0) AS "Classes with at least one topic set"
FROM classes_with_topics_count class
    LEFT JOIN static_lwp_year_group year_group ON year_group.id = class."yearGroup"
GROUP BY  year_group.id
ORDER BY year_group.id
;
