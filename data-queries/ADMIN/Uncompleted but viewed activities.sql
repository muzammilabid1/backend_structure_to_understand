SELECT
    count(1) FILTER (WHERE lpa."earnedStar") AS "Number of activities viewed & completed",
    count(1) FILTER (WHERE NOT lpa."earnedStar") AS "Number of activities viewed & not completed"
FROM ( SELECT DISTINCT ON (lpa.id)
        lpa."earnedStar"
    FROM
        lwp_view_parent_pupil_action_stats lppa
        JOIN lwp_pupil_activity lpa ON lppa.param2 = lpa.id
    WHERE
        lppa."actionId" = 10) lpa;