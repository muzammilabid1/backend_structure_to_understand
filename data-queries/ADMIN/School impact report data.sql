with pupilActivityCompletion as (
  select
	p.id as pupil,
	count(*) filter (where pt."readingTarget" > 0) as reading_completions,
    count(*) filter (where pt."readingTarget" is null) as mathsenglish_completions
  from
    lwp_pupil p
  join static_lwp_period slp on slp."isCurrentPeriod"
  join lwp_pupil_topic pt on (
    pt."pupilId" = p.id 
    and pt."periodIndex" = slp.index
	and pt."earnedGoldStar"
  )
  group by p.id
)
/* All calculations only include any pupils who have had any topics set for them */
select 
  case when s."schoolName" is null then 'ALL' else s."schoolName" end as school_name, 
  case when syg.year is null then 'ALL' else syg.year end as year_group,
  case when sc.name is null then 'ALL' else sc.name end as class_name,
  coalesce(premium.str, 'ALL') as pupil_premium_status,
  count(distinct p.id) as pupils_count,
  
  /* percentage of active families - defined by whether the child has watched at least one video or recorded at least one reading log or activity feedback for which they earned a star in the term in question */
  count(distinct p.id) filter (
    where 
      pt."silverStars" > 0
  ) / lwp_bigenough(
    count(distinct p.id)
  ) as pupils_active,
  
  /* == MATHS AND ENGLISH == */
  
  /* average number of topics set per pupil */
  count(distinct pt.id) filter (
    where 
      pt."readingTarget" is null
  ) / lwp_bigenough(count(distinct p.id)) as average_number_mathsenglish_topics_set, 
  
  /* active families - i.e. based on non-reading topics */
  count(distinct p.id) filter (
    where 
      pt."readingTarget" is null 
      and pt."silverStars" > 0
  ) / lwp_bigenough(
    count(distinct p.id) filter (
      where 
        pt."readingTarget" is null
    )
  ) as mathsenglish_pupils_active, 

  /* completed at least n topics */
  count(distinct p.id) filter (
    where
	  pac.mathsenglish_completions >= 1
  ) / lwp_bigenough(
    count(distinct p.id) filter (
      where 
        pt."readingTarget" is null
    )
  ) as mathsenglish_completed_1_topic,

  count(distinct p.id) filter (
    where
	  pac.mathsenglish_completions >= 2
  ) / lwp_bigenough(
    count(distinct p.id) filter (
      where 
        pt."readingTarget" is null
    )
  ) as mathsenglish_completed_2_topics,
  
  count(distinct p.id) filter (
    where
	  pac.mathsenglish_completions >= 3
  ) / lwp_bigenough(
    count(distinct p.id) filter (
      where 
        pt."readingTarget" is null
    )
  ) as mathsenglish_completed_3_topics,
  
  count(distinct p.id) filter (
    where
	  pac.mathsenglish_completions >= 4
  ) / lwp_bigenough(
    count(distinct p.id) filter (
      where 
        pt."readingTarget" is null
    )
  ) as mathsenglish_completed_4_topics,
  
  count(distinct p.id) filter (
    where
	  pac.mathsenglish_completions >= 5
  ) / lwp_bigenough(
    count(distinct p.id) filter (
      where 
        pt."readingTarget" is null
    )
  ) as mathsenglish_completed_5_topics,
  
  /* topic completion rate */
  count(distinct pt.id) filter (
    where 
      pt."readingTarget" is null 
      and pt."earnedGoldStar"
  ) / lwp_bigenough(
    count(distinct pt.id) filter (
      where 
        pt."readingTarget" is null
    )
  ) as mathsenglish_average_topic_completion_rate,
  
  /* == READING == */
  
  /* percentage who have done any at all out of those who have had any reading topics set for them */
  count(distinct p.id) filter (
    where 
      pt."readingTarget" is not null 
      and pt."silverStars" > 0
  ) / lwp_bigenough(
    count(distinct p.id) filter (
      where 
        pt."readingTarget" is not null
    )
  ) as reading_pupils_active, 
  
  /* percentage who have hit their target for at least n weeks */
  count(distinct p.id) filter (
    where
	  pac.reading_completions >= 1
  ) / lwp_bigenough(
    count(distinct p.id) filter (
      where 
        pt."readingTarget" > 0
    )
  ) as reading_pupils_reached_target_at_least_1_topic,

  count(distinct p.id) filter (
    where
	  pac.reading_completions >= 2
  ) / lwp_bigenough(
    count(distinct p.id) filter (
      where 
        pt."readingTarget" > 0
    )
  ) as reading_pupils_reached_target_at_least_2_weeks,
  
  count(distinct p.id) filter (
    where
	  pac.reading_completions >= 3
  ) / lwp_bigenough(
    count(distinct p.id) filter (
      where 
        pt."readingTarget" > 0
    )
  ) as reading_pupils_reached_target_at_least_3_weeks,
  
  count(distinct p.id) filter (
    where
	  pac.reading_completions >= 4
  ) / lwp_bigenough(
    count(distinct p.id) filter (
      where 
        pt."readingTarget" > 0
    )
  ) as reading_pupils_reached_target_at_least_4_weeks,
  
  count(distinct p.id) filter (
    where
	  pac.reading_completions >= 5
  ) / lwp_bigenough(
    count(distinct p.id) filter (
      where 
        pt."readingTarget" > 0
    )
  ) as reading_pupils_reached_target_at_least_5_weeks,

  /* completion rate */
  count(distinct pt.id) filter (
    where 
      pt."readingTarget" > 0 
      and pt."earnedGoldStar"
  ) / lwp_bigenough(
    count(distinct pt.id) filter (
      where 
        pt."readingTarget" > 0
    )
  ) as reading_average_hitting_target_rate, 
  
  /* link to school details on site */
  concat('https://explore.learningwithparents.com/school/', s.id) as "school_details" 
from 
  static_lwp_year_group syg
  join static_lwp_period slp on slp."isCurrentPeriod"
  join lwp_school s on (
    not s."inactive" 
    and not s."isTestSchool"
  ) 
  join lwp_school_class sc on (
    sc."schoolId" = s.id
    and sc."isRegistrationClass" 
    and sc."periodIndex" = slp.index
	and sc."yearGroup" = syg.id
  ) 
  join lwp_class_pupil cp on cp."lwpSchoolClassId" = sc.id
  join lwp_pupil p on (
    p."schoolId" = s.id
    and cp."lwpPupilId" = p.id 
  )
  left join pupilActivityCompletion pac on pac."pupil" = p.id
  join lwp_pupil_topic pt on (
    pt."pupilId" = p.id 
    and pt."periodIndex" = slp.index
  ) 
  left join (
    select 
      * 
    from 
      (
        values 
          (1, 'PP', true), 
          (2, 'Non-PP', false),
          (3, 'Unknown', null)
      ) as t(ord, str, val)
  ) premium on (p."isPremium" = premium.val or (p."isPremium" is null and premium.val is null))
group by 
  rollup(premium.str),
  rollup(syg.year),
  rollup(
	(s.id,
	s."schoolName"),
	sc."name"
  )
having sc.name is null or syg.year is not null
order by 
  s."schoolName",
  syg.year,
  sc.name, 
  premium.str
