import { ViewColumn, ViewEntity } from 'typeorm';
/**
 * LwpViewCanNotifySchool allows us to view whether a school
 * has notifications allowed at the current time, based on its
 * holiday state, the current time and day, and the parameters
 * configuring weekend or weekday release. For a generic lookup
 * that doesn't include a specific school, schoolId -1 can be
 * used.
 *
 * @export
 * @class LwpViewCanNotifySchool
 */
@ViewEntity({
    expression: `
    select
	id as "schoolId",
	(
		current_time::TIME - TO_TIMESTAMP(
			case
				(
					extract(
						isodow
					from
						current_date
					) > 5
				)
				or (
					id != -1
					and exists
				(
						select
							1
						from
							lwp_school_holidays lshs
						join lwp_school_holiday lsh on
							lsh.id = lshs."lwpSchoolHolidayId"
						where
							lshs."lwpSchoolId" = ls.id
							and lsh."startDate" <= current_date
							and lsh."endDate" >= current_date
							and lsh."periodIndex" = ls."curentPeriodIndex"
					)
				)
				when true then (
					select
						coalesce(
							min(value),
							'10:00'
						)
					from
						static_lwp_parameter
					where
						key = 'WEEKEND_TOPIC_RELEASE_EMAILS'
				)
				else (
					select
						coalesce(
							min(value),
							'15:00'
						)
					from
						static_lwp_parameter
					where
						key = 'WEEKDAY_TOPIC_RELEASE_EMAILS'
				)
			end,
			'HH24:MI'
		)::TIME >= interval '0'
	) as "canNotify"
    from
        (
            select
                id,
                "curentPeriodIndex"
            from
                lwp_school
            -- -1 is the default if we aren't trying to get holiday dates included in our query.
            union all
                select
                    -1,
                    -1
        ) ls;
    `
})
export class LwpViewCanNotifySchool {
    @ViewColumn()
    schoolId: number;

    @ViewColumn()
    canNotify: boolean;
}
