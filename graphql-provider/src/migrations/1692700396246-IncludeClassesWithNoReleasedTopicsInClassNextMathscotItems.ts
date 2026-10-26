import {MigrationInterface, QueryRunner} from "typeorm";

export class IncludeClassesWithNoReleasedTopicsInClassNextMathscotItems1692700396246 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DELETE FROM "typeorm_metadata" WHERE "type" = $1 AND "name" = $2 AND "schema" = $3`, ["VIEW","lwp_view_class_next_mathscot_items","public"]);
        await queryRunner.query(`DROP VIEW "lwp_view_class_next_mathscot_items"`);
        await queryRunner.query(`CREATE VIEW "lwp_view_class_next_mathscot_items" AS 
        with releasedTopics as (
            select
                lsc.id as "classId",
                slyg."mathscotThemes",
                count(1) filter (where lct.id is not null
                    and lct.released = true) as "releasedTopics"
            from
                lwp_school_class lsc
                left join static_lwp_topic slt on slt.subject = 'READING'
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
        `);
        await queryRunner.query(`INSERT INTO "typeorm_metadata"("database", "schema", "table", "type", "name", "value") VALUES (DEFAULT, $1, DEFAULT, $2, $3, $4)`, ["public","VIEW","lwp_view_class_next_mathscot_items","with releasedTopics as (\n        select\n            lsc.id as \"classId\",\n            slyg.\"mathscotThemes\",\n            count(1) filter (where lct.id is not null\n                and lct.released = true) as \"releasedTopics\"\n        from\n            lwp_school_class lsc\n            left join static_lwp_topic slt on slt.subject = 'READING'\n            left join lwp_class_topic lct on lsc.id = lct.\"classId\"\n                and lct.\"topicId\" != slt.id\n            join static_lwp_year_group slyg on lsc.\"yearGroup\" = slyg.id\n        group by\n            lsc.id,\n            slyg.\"mathscotThemes\"\n    )\n    select\n        \"classId\",\n        case\n            when array_length(\n                array_remove(\n                    array_agg(slmi.id),\n                    null\n                ),\n                1\n            ) is not null then array_agg(\n                distinct slmi.id\n            )\n            else array_agg(\n                distinct rand.id\n            )\n        end as \"mathscotItems\"\n    from\n        releasedTopics rt\n    left join static_lwp_mathscot_item slmi on\n        slmi.\"sequenceOrder\" = \"releasedTopics\" + 1\n        and rt.\"mathscotThemes\" ? slmi.theme\n    left outer join (\n            select\n                id\n            from\n                static_lwp_mathscot_item\n            order by\n                RANDOM()\n            limit 3\n        ) rand on\n        1 = 1\n    group by\n        \"classId\""]);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DELETE FROM "typeorm_metadata" WHERE "type" = $1 AND "name" = $2 AND "schema" = $3`, ["VIEW","lwp_view_class_next_mathscot_items","public"]);
        await queryRunner.query(`DROP VIEW "lwp_view_class_next_mathscot_items"`);
        await queryRunner.query(`CREATE VIEW "lwp_view_class_next_mathscot_items" AS 
    with releasedTopics as (
        select
            "classId",
            "mathscotThemes",
            count(1) as "releasedTopics"
        from
            lwp_class_topic lct
        join lwp_school_class lsc on
            lct."classId" = lsc.id
        join static_lwp_year_group slyg on
            lsc."yearGroup" = slyg.id
        where
            released = true
        group by
            "classId",
            "mathscotThemes"
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
    `);
    await queryRunner.query(`INSERT INTO "typeorm_metadata"("database", "schema", "table", "type", "name", "value") VALUES (DEFAULT, $1, DEFAULT, $2, $3, $4)`, ["public","VIEW","lwp_view_class_next_mathscot_items","with releasedTopics as (\n        select\n            \"classId\",\n            \"mathscotThemes\",\n            count(1) as \"releasedTopics\"\n        from\n            lwp_class_topic lct\n        join lwp_school_class lsc on\n            lct.\"classId\" = lsc.id\n        join static_lwp_year_group slyg on\n            lsc.\"yearGroup\" = slyg.id\n        where\n            released = true\n        group by\n            \"classId\",\n            \"mathscotThemes\"\n    )\n    select\n        \"classId\",\n        case\n            when array_length(\n                array_remove(\n                    array_agg(slmi.id),\n                    null\n                ),\n                1\n            ) is not null then array_agg(\n                distinct slmi.id\n            )\n            else array_agg(\n                distinct rand.id\n            )\n        end as \"mathscotItems\"\n    from\n        releasedTopics rt\n    left join static_lwp_mathscot_item slmi on\n        slmi.\"sequenceOrder\" = \"releasedTopics\" + 1\n        and rt.\"mathscotThemes\" ? slmi.theme\n    left outer join (\n            select\n                id\n            from\n                static_lwp_mathscot_item\n            order by\n                RANDOM()\n            limit 3\n        ) rand on\n        1 = 1\n    group by\n        \"classId\""]);
    }

}
