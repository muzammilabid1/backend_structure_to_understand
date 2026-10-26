select
    slyg."year" as "Year group",
    count(distinct lsc.id) as "Full programme classes"
from static_lwp_period slp
join lwp_school_class lsc on lsc."periodIndex" = slp."index" and lsc."isRegistrationClass" and lsc."isFullProgramme"
join lwp_school ls on ls."id" = lsc."schoolId" and not ls."isTestSchool"
join static_lwp_year_group slyg on slyg."id" = lsc."yearGroup"
where slp."isCurrentPeriod"
group by slyg.id, slyg."year"
order by case slyg."year"
    when 'Preschool' then -1
    when 'Reception' then 0
    when 'Unknown' then 99
    else slyg."id"
end;
