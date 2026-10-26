select
	ls."schoolName",
	string_agg(distinct slt.name, ', ') filter (where slt.name not like 'SPM%') as "tags (excluding SPM tags)",
	string_agg(distinct slt.name, ', ') filter (where slt.name like 'SPM%') as "SPM tags",
	string_agg(distinct slyg.year, ', ') as "schoolYearGroups",
	lu.firstname,
	lu.lastname,
	lu.email,
	case when lu."isSchoolLeader" then 'School Leader' else 'Class Teacher' end as "role",
	string_agg(distinct slyg.year, ', ') filter (where lct."lwpUserId" = lu.id) as "assignedYearGroups"
from lwp_school ls
left join lwp_school_static_tags lsst on lsst."schoolId" = ls.id
left join static_lwp_school_tag slt on slt.id = lsst."tagId"
join static_lwp_period slp on not slp."isPreviousPeriod"
join lwp_school_class lsc on lsc."schoolId" = ls.id and lsc."periodIndex" = slp.index and lsc."isFullProgramme"
left join static_lwp_year_group slyg on slyg.id = lsc."yearGroup"
left join lwp_class_teacher lct on lct."lwpSchoolClassId" = lsc.id
left join lwp_user lu on lu."schoolId" = ls.id and lu."type" = 'TEACHER' and lu."userStatus" = 'ACTIVE' and (
    lu."isSchoolLeader" or lu.id = lct."lwpUserId"
)
where not ls.inactive and not ls."isTestSchool" and lu.id is not null
group by ls.id, lu.id
;