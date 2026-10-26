WITH feedback_counts AS (
    SELECT
        lp.id AS "pupilId",
        COUNT(*) AS feedback_count,
        lp."isPremium"
    FROM
        lwp_pupil_feedback lpf
        JOIN lwp_pupil_feedback_history lpfh ON lpfh."lwpPupilFeedbackId" = lpf.id
        JOIN lwp_pupil lp ON lpfh."lwpPupilId" = lp.id
    WHERE
        lpf."logCreatedAt" >= '2022-09-01'
				AND "bookReadAt" is not null
    GROUP BY
        "pupilId", lp."isPremium"
),
count_distribution AS (
    SELECT
        feedback_count, count(*) as pupil_count,
        count(*) filter (where "isPremium") AS premium_pupil_count,
        count(*) filter (where not "isPremium") AS non_premium_pupil_count
    FROM
        feedback_counts
    GROUP BY
        feedback_count
),
cumulative_counts AS (
    SELECT
        feedback_count, sum(pupil_count) over (order by feedback_count desc) as cumulative_pupils,
        SUM(premium_pupil_count) OVER (ORDER BY feedback_count DESC) AS cumulative_premium_pupils,
        SUM(non_premium_pupil_count) OVER (ORDER BY feedback_count DESC) AS cumulative_non_premium_pupils
    FROM
        count_distribution
)
SELECT *
FROM
    cumulative_counts where feedback_count <= 10
ORDER BY
    feedback_count