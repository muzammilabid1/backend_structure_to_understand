select
	s."schoolName",
	u.firstname,
	u.lastname,
	u."nameForChildren",
	u.email,
	u."isSchoolLeader",
    (SELECT COUNT(*) > 0 FROM lwp_school_class sc WHERE sc."mainTeacherId" = u.id) as "isMainClassTeacher",
	(select count(*) > 0
		from lwp_class_teacher ct
		join lwp_school_class sc on ct."lwpSchoolClassId" = sc.id
		join static_lwp_period p on p.index = sc."periodIndex" and p."isCurrentPeriod"
		where u.id = ct. "lwpUserId" and sc."yearGroup" in (55,1,2,3)
	) as "EYFS or KS1",
	(select count(*) > 0
		from lwp_class_teacher ct
		join lwp_school_class sc on ct."lwpSchoolClassId" = sc.id
		join static_lwp_period p on p.index = sc."periodIndex" and p."isCurrentPeriod"
		where u.id = ct. "lwpUserId" and sc."yearGroup" in (4,5,6)
	) as "KS2",
	string_agg(distinct slst.name, ', ') as "schoolTags"
from lwp_school s
left join lwp_school_static_tags lsst on lsst."schoolId" = s.id
left join static_lwp_school_tag slst on slst.id = lsst."tagId"
join lwp_user u on u."schoolId" = s.id and u."type" = 'TEACHER' and u."userStatus" = 'ACTIVE'
join lwp_class_teacher ct on u.id = ct."lwpUserId"
join lwp_school_class sc on ct."lwpSchoolClassId" = sc.id and sc."IsReadingLogsEnabled" and sc."isRegistrationClass"
join static_lwp_period p on p.index = sc."periodIndex" and p."isCurrentPeriod"
where not s.inactive and not s."isTestSchool"
group by s.id, u.id
order by "schoolName"
;
