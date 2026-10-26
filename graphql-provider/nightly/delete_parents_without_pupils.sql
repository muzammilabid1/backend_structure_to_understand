delete from
	lwp_user
where
	type = 'PARENT'
	and id not in (
		select
			lu.id
		from
			lwp_user lu
		join lwp_pupil_parent lpp on
			lu.id = lpp."parentId"
		join lwp_pupil lp on
			lpp."pupilId" = lp.id
	);
