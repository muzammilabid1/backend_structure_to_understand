select
  u.firstname,
  u.lastname,
  u.email,
  u."phoneNumber",
  string_agg(distinct p.firstname, ' and ') as pupils
from lwp_user u
join lwp_parent_pupil pp on pp."lwpUserId" = u.id
join lwp_pupil p on p.id = pp."lwpPupilId"
join lwp_pupil_topic pt on pt."pupilId" = p.id
join static_lwp_topic st on pt."topicId" = st.id and st."isReading" = false
join static_lwp_period pd on pd.index = pt."periodIndex"
where pd."isCurrentPeriod"
and u."userStatus" in ('ACTIVE', 'ACCOUNTLESS')
group by u.id
