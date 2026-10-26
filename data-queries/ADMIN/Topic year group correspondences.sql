select
    case when lpt."periodIndex" is null then '2024 and beyond' else lpt."periodIndex"::text end as "A/Y",
    slt."teacherTopicName" as "Topic",
    string_agg(distinct sls.name, ', ') as "Subject",
    string_agg(distinct(slyg."year"), ', ') as "Intended year groups",
    string_agg(distinct(cslyg."year"), ', ') as "Set year groups",
    count(distinct ls.id) as "Num schools that set topic",
    count(distinct lpt."pupilId") as "Num pupils been set topic",
    count(distinct lpt."pupilId") filter (where lsc.id is not null and lsc."parentClassId" is null) as "Num pupils been set topic (via a class)",
    count(distinct lpt."pupilId") filter (where lsc."parentClassId" is not null) as "Num pupils been set topic (via a group)",
    count(distinct lpt."pupilId") filter (where cslyg.id != slyg.id) as "Num pupils been set topic out of intended year group",
    count(distinct lpt."pupilId") filter (where lsc.id is not null and lsc."parentClassId" is null and cslyg.id != slyg.id) as "Num pupils been set topic out of intended year group (via a class)",
    count(distinct lpt."pupilId") filter (where lsc."parentClassId" is not null and cslyg.id != slyg.id) as "Num pupils been set topic out of intended year group (via a group)",
    count(distinct lpt."pupilId") filter (where lpt."earnedGoldStar") as "Num pupils completed topic",
    count(distinct lpt."pupilId") filter (where lsc.id is not null and lsc."parentClassId" is null and lpt."earnedGoldStar") as "Num pupils completed topic (via a class)",
    count(distinct lpt."pupilId") filter (where lsc."parentClassId" is not null and lpt."earnedGoldStar") as "Num pupils completed topic (via a group)"
from static_lwp_topic slt
join static_lwp_topic_domain_year_group sltdyg on sltdyg."topicId" = slt.id
join static_lwp_topic_domain sltd on sltd.id = sltdyg."domainId"
join static_lwp_subject sls on sls.id = sltd."subjectId"
join static_lwp_year_group slyg on slyg.id = sltdyg."yearGroupId"
join lwp_pupil_topic lpt on lpt."topicId" = slt.id
join lwp_pupil lp on lp.id = lpt."pupilId"
join lwp_school ls on ls.id = coalesce(lp."schoolId", lp."deletedSchoolId") and not ls."isTestSchool"
left join lwp_class_topic lct on lct.id = lpt."classTopicId"
left join lwp_school_class lsc on lsc.id = lct."classId"
left join static_lwp_year_group cslyg on cslyg.id = lsc."yearGroup"
where
    lpt."periodIndex" >= 2024
    and not slt."isHidden"
group by
    rollup(lpt."periodIndex"),
    slt.id
;
