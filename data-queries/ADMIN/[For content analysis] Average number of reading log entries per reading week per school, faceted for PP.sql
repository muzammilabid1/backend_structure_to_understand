SELECT
    "schoolName" as "School name",
    CASE WHEN "isPremium" IS TRUE THEN
        'Yes'
    WHEN "isPremium" IS FALSE THEN
        'No'
    ELSE
        'Overall'
    END AS "Pupil Premium",
    avg("avgPupilReadings") as "Average number of reading log entries per reading week",
    avg("avgPupilReadings") filter (where "yearGroup" = 55) as "YR Average number of reading log entries per reading week",
    avg("avgPupilReadings") filter (where "yearGroup" = 1) as "Y1 Average number of reading log entries per reading week",
    avg("avgPupilReadings") filter (where "yearGroup" = 2) as "Y2 Average number of reading log entries per reading week",
	avg("avgPupilReadings") filter (where "yearGroup" = 3) as "Y3 Average number of reading log entries per reading week",
	avg("avgPupilReadings") filter (where "yearGroup" = 4) as "Y4 Average number of reading log entries per reading week",
	avg("avgPupilReadings") filter (where "yearGroup" = 5) as "Y5 Average number of reading log entries per reading week",
	avg("avgPupilReadings") filter (where "yearGroup" = 6) as "Y6 Average number of reading log entries per reading week"
FROM (
    SELECT
        ls."schoolName",
        lsc."yearGroup",
        lct."releaseDate",
        lp."isPremium",
        (count(DISTINCT lpf.id)::float) / count(DISTINCT lpt.id) AS "avgPupilReadings"
    FROM
        lwp_school ls
        JOIN lwp_school_class lsc ON lsc."schoolId" = ls.id
            AND lsc."periodIndex" = '2023'
        JOIN lwp_class_topic lct ON lct."classId" = lsc.id
        JOIN lwp_pupil_topic lpt ON lpt."classTopicId" = lct.id
        JOIN lwp_view_reading_log_to_reading_topic lvrltrt ON lvrltrt."pupilTopicId" = lpt.id
        JOIN lwp_pupil_feedback lpf ON lpf.id = lvrltrt."pupilFeedbackId"
            AND lpf."userType" IN ('PARENT', 'TOPICACCESS')
        JOIN lwp_pupil lp ON lpt."pupilId" = lp.id
    WHERE
        NOT ls."isTestSchool"
        AND NOT ls.inactive
        AND lct."readingTarget" > 0
    GROUP BY
        ls.id,
        lp."isPremium",
        lct."releaseDate",
        lsc."yearGroup") iQ
GROUP BY
    "schoolName",
    ROLLUP ("isPremium")