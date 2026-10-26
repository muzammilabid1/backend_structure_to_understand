select t.title,
       count(distinct p.id)
from lwp_pupil p
    join lwp_pupil_trophy pt
        on pt."pupilId" = p.id
    join static_lwp_trophy t
        on t.id = pt."trophyId"
group by t.id
order by t."order"