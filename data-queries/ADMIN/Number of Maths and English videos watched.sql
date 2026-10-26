-- Number of Maths and English videos watched

with maths_english_topics as (
    select sltdyg."topicId" as topic_id
    from static_lwp_topic_domain_year_group sltdyg
    join static_lwp_topic_domain sltd on sltd.id = sltdyg."domainId"
    join static_lwp_subject sls on sls.id = sltd."subjectId"
    group by sltdyg."topicId"
    having count(distinct sls.id) = 1 and max(sls.name) in ('Maths', 'English')
)
SELECT
    count(distinct lpt.id) FILTER (WHERE lpt."watchedVideo" = true) AS "Number of videos watched by all pupils",
    calculate_percentage(
        count(distinct lpt.id)::int,
        count(distinct lpt.id) FILTER (WHERE lpt."watchedVideo" = true)::int
    ) AS "Percentage of videos watched by all pupils",
    count(distinct lpt.id) FILTER (WHERE lp."isPremium" = true and lpt."watchedVideo" = true) AS "Number of videos watched by pp pupils",
    calculate_percentage(
        count(distinct lpt.id) FILTER (WHERE lp."isPremium" = true)::int,
        count(distinct lpt.id) FILTER (WHERE lp."isPremium" = true and lpt."watchedVideo" = true)::int
    ) AS "Percentage of videos watched by premium pupils",
    count(distinct lpt.id) FILTER (WHERE lp."isPremium" is not true and lpt."watchedVideo" = true) AS "Number of videos watched by nonpp pupils",
    calculate_percentage(
        count(distinct lpt.id) FILTER (WHERE lp."isPremium" is not true)::int,
        count(distinct lpt.id) FILTER (WHERE lp."isPremium" is not true and lpt."watchedVideo" = true)::int
    ) AS "Percentage of videos watched by nonpp pupils"
FROM lwp_pupil lp
JOIN lwp_school ls ON ls.id = lp."schoolId"
JOIN lwp_pupil_topic lpt ON lpt."pupilId" = lp.id AND lpt."periodIndex" = ls."curentPeriodIndex"
JOIN static_lwp_topic slt ON slt.id = lpt."topicId" AND slt."isReading" IS FALSE
join maths_english_topics met on met.topic_id = slt.id
WHERE
    NOT ls."isTestSchool"
    AND NOT ls."inactive"
    AND slt.video IS NOT null;
