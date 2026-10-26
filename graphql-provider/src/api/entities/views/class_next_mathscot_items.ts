import { ViewColumn, ViewEntity } from 'typeorm';

@ViewEntity({
    expression: `
    with releasedTopics as (
        select
            lsc.id as "classId",
            slyg."mathscotThemes",
            count(1) filter (where lct.id is not null
                and lct.released = true) as "releasedTopics"
        from
            lwp_school_class lsc
            left join static_lwp_topic slt on slt."isReading" = true
            left join lwp_class_topic lct on lsc.id = lct."classId"
                and lct."topicId" != slt.id
            join static_lwp_year_group slyg on lsc."yearGroup" = slyg.id
        group by
            lsc.id,
            slyg."mathscotThemes"
    )
    select
        "classId",
        case
            when array_length(
                array_remove(
                    array_agg(slmi.id),
                    null
                ),
                1
            ) is not null then array_agg(
                distinct slmi.id
            )
            else array_agg(
                distinct rand.id
            )
        end as "mathscotItems"
    from
        releasedTopics rt
    left join static_lwp_mathscot_item slmi on
        slmi."sequenceOrder" = "releasedTopics" + 1
        and rt."mathscotThemes" ? slmi.theme
    left outer join (
            select
                id
            from
                static_lwp_mathscot_item
            order by
                RANDOM()
            limit 3
        ) rand on
        1 = 1
    group by
        "classId"
`
})
export class LwpViewClassNextMathscotItems {
    @ViewColumn()
    classId: number;

    @ViewColumn()
    mathscotItems: number[];
}
