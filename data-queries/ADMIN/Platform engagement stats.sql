-- Convenience CTE to join `static_lwp_topic` to `static_lwp_subject`.
--
-- Topics are associated with one or more topic domains (`static_lwp_topic_domain`)
-- via the `static_lwp_topic_domain_year_group` table.
--
-- A domain is associated with exactly one subject.
--
-- N.B. Although our schema allows topics to be associated with multiple domains
-- (and therefore subjects), we operate under the assumption that every topic
-- will be associated with exactly one domain (and therefore subject).
--
-- This CTE can be used to look up the canonical subject for a given topic.
-- It returns a single row per topic, comprising a topic ID and a subject ID.
-- If multiple subjects are associated with a topic, it will NOT return a row
-- for that topic.
--
with canonical_topic_subject as (
    select
        sltdyg."topicId",
        any_value(sltd."subjectId") as "subjectId"
    from static_lwp_topic_domain_year_group sltdyg
    join static_lwp_topic_domain sltd on sltd."id" = sltdyg."domainId"
    group by sltdyg."topicId"
    having count(distinct sltd."subjectId") = 1
),
--
-- One row per (pupilId, pupilTopicId). Handles the lpa fan-out via GROUP BY lpt.id.
-- Provides scalar topicId for distinct-topic counting, and per-topic counts/flags for filters.
per_topic as materialized (
    select
        lp."id" as "pupilId",
        lp."isPremium",
        coalesce(ls."region", '[unknown region]') as "region",
        lpt."periodIndex",
        lpt."id" as "pupilTopicId",
        lpt."topicId",
        coalesce(sls."name", '[unknown subject]')as "subjectName",
        coalesce(slyg."year", '[unknown year group]') as "yearGroup",
        lpt."watchedVideo",
        lpt."earnedGoldStar",
        count(distinct lpa."id") filter (where lpa."logAccessedOnMobile" <> 0 or lpa."logAccessedOnDesktop" <> 0) as "activitiesClicked",
        count(distinct lpa."id") filter (where lpa."earnedStar") as "activitiesCompleted"
    from lwp_pupil lp
    join lwp_school ls on ls."id" = coalesce(lp."schoolId", lp."deletedSchoolId") and not ls."isTestSchool"
    join lwp_pupil_topic lpt on lpt."pupilId" = lp."id"
    left join lwp_pupil_activity lpa on lpa."topicId" = lpt."id"
    join static_lwp_topic slt on slt."id" = lpt."topicId" and not slt."isReading"
    left join canonical_topic_subject cts on cts."topicId" = slt."id"
    left join static_lwp_subject sls on sls."id" = cts."subjectId"
    join lwp_class_topic lct on lct."id" = lpt."classTopicId"
    left join lwp_school_class lsc on lsc."id" = lct."classId"
    left join static_lwp_year_group slyg on slyg."id" = lsc."yearGroup"
    group by lp."id", lp."isPremium", ls."region", lpt."periodIndex", lpt.id, lpt."topicId", sls."name", slyg."year", lpt."watchedVideo", lpt."earnedGoldStar"
),
-- One row per (pupilId, period, subject, yearGroup, region).
-- topicsCompleted, activitiesClicked and activitiesCompleted are genuine counts (not capped at 1), so the >= N
-- threshold filters in pupil_metrics work correctly for the vast majority of pupils.
-- Residual caveat: a pupil assigned topics from classes of different year groups within one
-- subject+period will have their totals split across yearGroup slices, so the >= N thresholds
-- are checked per-slice rather than per-total. Region cannot split because a pupil always
-- belongs to one school and a school's region never changes.
pupil_scope_stats as (
    select
        "pupilId",
        "isPremium",
        "region",
        "periodIndex",
        "subjectName",
        "yearGroup",
        count(distinct "topicId") as "topicsSet",
        count(distinct "topicId") filter (where "watchedVideo") as "videosWatched",
        count(distinct "topicId") filter (where "activitiesClicked" > 0) as "topicsWithActivityClicked",
        count(distinct "topicId") filter (where "earnedGoldStar") as "topicsCompleted",
        sum("activitiesClicked") as "activitiesClicked",
        sum("activitiesCompleted") as "activitiesCompleted"
    from per_topic
    group by "pupilId", "isPremium", "region", "periodIndex", "subjectName", "yearGroup"
),
-- Distinct static topic (topicId) metrics. Each row in per_topic has a scalar topicId
-- so count(distinct topicId) rolls up cleanly across all grouping sets.
topic_metrics as (
    select
        case when grouping(t."periodIndex") = 1 then '[all academic years]' else t."periodIndex"::text end as "periodIndex",
        case when grouping(t."subjectName") = 1 then '[all subjects]' else t."subjectName" end as "subjectName",
        case when grouping(t."yearGroup") = 1 then '[all year groups]' else t."yearGroup" end as "yearGroup",
        case when grouping(t."region") = 1 then '[all regions]' else t."region" end as "region",
        count(distinct t."topicId") as "distinctTopicsSet",
        count(distinct t."topicId") filter (where t."watchedVideo") as "distinctVideosWatched",
        count(distinct t."topicId") filter (where t."activitiesClicked" > 0) as "distinctTopicsClicked",
        count(distinct t."topicId") filter (where t."earnedGoldStar") as "distinctTopicsCompleted",
        count(distinct t."topicId") filter (where t."isPremium") as "distinctTopicsSet_pp",
        count(distinct t."topicId") filter (where t."watchedVideo" and t."isPremium") as "distinctVideosWatched_pp",
        count(distinct t."topicId") filter (where t."activitiesClicked" > 0 and t."isPremium") as "distinctTopicsClicked_pp",
        count(distinct t."topicId") filter (where t."earnedGoldStar" and t."isPremium") as "distinctTopicsCompleted_pp"
    from per_topic t
    group by grouping sets (
        (),
        (t."subjectName"),
        (t."subjectName", t."yearGroup"),
        (t."subjectName", t."yearGroup", t."region"),
        (t."subjectName", t."region"),
        (t."yearGroup"),
        (t."yearGroup", t."region"),
        (t."region"),
        (t."periodIndex"),
        (t."periodIndex", t."subjectName"),
        (t."periodIndex", t."subjectName", t."yearGroup"),
        (t."periodIndex", t."subjectName", t."yearGroup", t."region"),
        (t."periodIndex", t."subjectName", t."region"),
        (t."periodIndex", t."yearGroup"),
        (t."periodIndex", t."yearGroup", t."region"),
        (t."periodIndex", t."region")
    )
),
-- Pupil-count and per-assignment metrics, driven by pupil_scope_stats.
-- sum() is correct for per-assignment totals: each lpt.id maps to exactly one
-- pupil_scope_stats row so summing topicsSet/videosWatched/topicsWithActivityClicked/
-- topicsCompleted/activitiesClicked/activitiesCompleted across rows gives the right total without double-counting.
pupil_metrics as (
    select
        case when grouping(ps."periodIndex") = 1 then '[all academic years]' else ps."periodIndex"::text end as "periodIndex",
        case when grouping(ps."subjectName") = 1 then '[all subjects]' else ps."subjectName" end as "subjectName",
        case when grouping(ps."yearGroup") = 1 then '[all year groups]' else ps."yearGroup" end as "yearGroup",
        case when grouping(ps."region") = 1 then '[all regions]' else ps."region" end as "region",
        sum(ps."topicsSet") as "topicsSet",
        sum(ps."videosWatched") as "videosWatched",
        sum(ps."topicsWithActivityClicked") as "topicsClicked",
        sum(ps."topicsCompleted") as "topicsCompleted",
        sum(ps."topicsSet") filter (where ps."isPremium") as "topicsSet_pp",
        sum(ps."videosWatched") filter (where ps."isPremium") as "videosWatched_pp",
        sum(ps."topicsWithActivityClicked") filter (where ps."isPremium") as "topicsClicked_pp",
        sum(ps."topicsCompleted") filter (where ps."isPremium") as "topicsCompleted_pp",
        count(distinct ps."pupilId") as "pupilsSetTopic",
        count(distinct ps."pupilId") filter (where ps."videosWatched" >= 1) as "pupilsWatchedVideo",
        count(distinct ps."pupilId") filter (where ps."topicsWithActivityClicked"  >= 1) as "pupilsClickedActivity",
        count(distinct ps."pupilId") filter (where ps."topicsCompleted" >= 1) as "pupilsCompleted1Topic",
        count(distinct ps."pupilId") filter (where ps."topicsCompleted" >= 2) as "pupilsCompleted2Topics",
        count(distinct ps."pupilId") filter (where ps."topicsCompleted" >= 3) as "pupilsCompleted3Topics",
        count(distinct ps."pupilId") filter (where ps."topicsCompleted" >= 4) as "pupilsCompleted4Topics",
        count(distinct ps."pupilId") filter (where ps."topicsCompleted" >= 5) as "pupilsCompleted5Topics",
        count(distinct ps."pupilId") filter (where ps."activitiesCompleted" >= 1) as "pupilsCompleted1Activity",
        count(distinct ps."pupilId") filter (where ps."activitiesCompleted" >= 2) as "pupilsCompleted2Activities",
        count(distinct ps."pupilId") filter (where ps."activitiesCompleted" >= 3) as "pupilsCompleted3Activities",
        count(distinct ps."pupilId") filter (where ps."activitiesCompleted" >= 4) as "pupilsCompleted4Activities",
        count(distinct ps."pupilId") filter (where ps."activitiesCompleted" >= 5) as "pupilsCompleted5Activities",
        count(distinct ps."pupilId") filter (where ps."isPremium") as "pupilsSetTopic_pp",
        count(distinct ps."pupilId") filter (where ps."videosWatched" >= 1 and ps."isPremium") as "pupilsWatchedVideo_pp",
        count(distinct ps."pupilId") filter (where ps."topicsWithActivityClicked" >= 1 and ps."isPremium") as "pupilsClickedActivity_pp",
        count(distinct ps."pupilId") filter (where ps."topicsCompleted" >= 1 and ps."isPremium") as "pupilsCompleted1Topic_pp",
        count(distinct ps."pupilId") filter (where ps."topicsCompleted" >= 2 and ps."isPremium") as "pupilsCompleted2Topics_pp",
        count(distinct ps."pupilId") filter (where ps."topicsCompleted" >= 3 and ps."isPremium") as "pupilsCompleted3Topics_pp",
        count(distinct ps."pupilId") filter (where ps."topicsCompleted" >= 4 and ps."isPremium") as "pupilsCompleted4Topics_pp",
        count(distinct ps."pupilId") filter (where ps."topicsCompleted" >= 5 and ps."isPremium") as "pupilsCompleted5Topics_pp",
        count(distinct ps."pupilId") filter (where ps."activitiesCompleted" >= 1 and ps."isPremium") as "pupilsCompleted1Activity_pp",
        count(distinct ps."pupilId") filter (where ps."activitiesCompleted" >= 2 and ps."isPremium") as "pupilsCompleted2Activities_pp",
        count(distinct ps."pupilId") filter (where ps."activitiesCompleted" >= 3 and ps."isPremium") as "pupilsCompleted3Activities_pp",
        count(distinct ps."pupilId") filter (where ps."activitiesCompleted" >= 4 and ps."isPremium") as "pupilsCompleted4Activities_pp",
        count(distinct ps."pupilId") filter (where ps."activitiesCompleted" >= 5 and ps."isPremium") as "pupilsCompleted5Activities_pp"
    from pupil_scope_stats ps
    group by grouping sets (
        (),
        (ps."subjectName"),
        (ps."subjectName", ps."yearGroup"),
        (ps."subjectName", ps."yearGroup", ps."region"),
        (ps."subjectName", ps."region"),
        (ps."yearGroup"),
        (ps."yearGroup", ps."region"),
        (ps."region"),
        (ps."periodIndex"),
        (ps."periodIndex", ps."subjectName"),
        (ps."periodIndex", ps."subjectName", ps."yearGroup"),
        (ps."periodIndex", ps."subjectName", ps."yearGroup", ps."region"),
        (ps."periodIndex", ps."subjectName", ps."region"),
        (ps."periodIndex", ps."yearGroup"),
        (ps."periodIndex", ps."yearGroup", ps."region"),
        (ps."periodIndex", ps."region")
    )
)
-- Both CTEs produce identical grouping-set rows, identified by the same dimension strings.
-- Sentinel strings replace NULLs from grouping sets in both CTEs, so = suffices for the join.
select
    pm."periodIndex" as "Academic year",
    pm."subjectName" as "Subject",
    pm."yearGroup" as "Year group",
    pm."region" as "Region",
    tm."distinctTopicsSet" as "Distinct topics set",
    tm."distinctVideosWatched" as "Distinct videos watched",
    tm."distinctTopicsClicked" as "Distinct topics clicked",
    tm."distinctTopicsCompleted" as "Distinct topics completed",
    tm."distinctTopicsSet_pp" as "Distinct topics set (PP)",
    tm."distinctVideosWatched_pp" as "Distinct videos watched (PP)",
    tm."distinctTopicsClicked_pp" as "Distinct topics clicked (PP)",
    tm."distinctTopicsCompleted_pp" as "Distinct topics completed (PP)",
    pm."topicsSet" as "Topics set",
    pm."videosWatched" as "Videos watched",
    pm."topicsClicked" as "Topics clicked",
    pm."topicsCompleted" as "Topics completed",
    pm."topicsSet_pp" as "Topics set (PP)",
    pm."videosWatched_pp" as "Videos watched (PP)",
    pm."topicsClicked_pp" as "Topics clicked (PP)",
    pm."topicsCompleted_pp" as "Topics completed (PP)",
    pm."pupilsSetTopic" as "Pupils set topic",
    pm."pupilsWatchedVideo" as "Pupils watched video",
    pm."pupilsClickedActivity" as "Pupils clicked activity",
    pm."pupilsCompleted1Topic" as "Pupils completed >= 1 topic",
    pm."pupilsCompleted2Topics" as "Pupils completed >= 2 topics",
    pm."pupilsCompleted3Topics" as "Pupils completed >= 3 topics",
    pm."pupilsCompleted4Topics" as "Pupils completed >= 4 topics",
    pm."pupilsCompleted5Topics" as "Pupils completed >= 5 topics",
    pm."pupilsSetTopic_pp" as "Pupils set topic (PP)",
    pm."pupilsWatchedVideo_pp" as "Pupils watched video (PP)",
    pm."pupilsClickedActivity_pp" as "Pupils clicked activity (PP)",
    pm."pupilsCompleted1Topic_pp" as "Pupils completed >= 1 topic (PP)",
    pm."pupilsCompleted2Topics_pp" as "Pupils completed >= 2 topics (PP)",
    pm."pupilsCompleted3Topics_pp" as "Pupils completed >= 3 topics (PP)",
    pm."pupilsCompleted4Topics_pp" as "Pupils completed >= 4 topics (PP)",
    pm."pupilsCompleted5Topics_pp" as "Pupils completed >= 5 topics (PP)",
    pm."pupilsCompleted1Activity" as "Pupils completed >= 1 activity",
    pm."pupilsCompleted2Activities" as "Pupils completed >= 2 activities",
    pm."pupilsCompleted3Activities" as "Pupils completed >= 3 activities",
    pm."pupilsCompleted4Activities" as "Pupils completed >= 4 activities",
    pm."pupilsCompleted5Activities" as "Pupils completed >= 5 activities",
    pm."pupilsCompleted1Activity_pp" as "Pupils completed >= 1 activity (PP)",
    pm."pupilsCompleted2Activities_pp" as "Pupils completed >= 2 activities (PP)",
    pm."pupilsCompleted3Activities_pp" as "Pupils completed >= 3 activities (PP)",
    pm."pupilsCompleted4Activities_pp" as "Pupils completed >= 4 activities (PP)",
    pm."pupilsCompleted5Activities_pp" as "Pupils completed >= 5 activities (PP)"
from pupil_metrics pm
join topic_metrics tm
    on pm."periodIndex" = tm."periodIndex"
    and pm."subjectName" = tm."subjectName"
    and pm."yearGroup" = tm."yearGroup"
    and pm."region" = tm."region"
order by
    case when pm."periodIndex" = '[all academic years]' then null else pm."periodIndex"::int end desc nulls last,
    case when pm."subjectName" = '[all subjects]' then 0 when pm."subjectName" = '[unknown subject]' then 2 else 1 end,
    pm."subjectName",
    case when pm."yearGroup" = '[all year groups]' then 0 when pm."yearGroup" = '[unknown year group]' then 2 else 1 end,
    pm."yearGroup",
    case when pm."region" = '[all regions]' then 0 when pm."region" = '[unknown region]' then 2 else 1 end,
    pm."region"
;
