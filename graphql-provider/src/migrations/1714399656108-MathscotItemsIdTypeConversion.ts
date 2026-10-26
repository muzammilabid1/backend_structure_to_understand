import { MigrationInterface, QueryRunner } from 'typeorm';

export class MathscotItemsIdTypeConversion1714399656108 implements MigrationInterface {
    name = 'MathscotItemsIdTypeConversion1714399656108';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP VIEW lwp_view_class_next_mathscot_items`);
        await queryRunner.query(`ALTER SEQUENCE "static_lwp_mathscot_item_id_seq" AS BIGINT`);
        await queryRunner.query(`ALTER TABLE "static_lwp_mathscot_item" ALTER ID TYPE BIGINT`);
        await queryRunner.query(`CREATE VIEW lwp_view_class_next_mathscot_items
        AS WITH releasedtopics AS (
                 SELECT lsc.id AS "classId",
                    slyg."mathscotThemes",
                    count(1) FILTER (WHERE lct.id IS NOT NULL AND lct.released = true) AS "releasedTopics"
                   FROM lwp_school_class lsc
                     LEFT JOIN static_lwp_topic slt ON slt.subject::text = 'READING'::text
                     LEFT JOIN lwp_class_topic lct ON lsc.id = lct."classId" AND lct."topicId" <> slt.id
                     JOIN static_lwp_year_group slyg ON lsc."yearGroup" = slyg.id
                  GROUP BY lsc.id, slyg."mathscotThemes"
                )
         SELECT rt."classId",
                CASE
                    WHEN array_length(array_remove(array_agg(slmi.id), NULL::bigint), 1) IS NOT NULL THEN array_agg(DISTINCT slmi.id)
                    ELSE array_agg(DISTINCT rand.id)
                END AS "mathscotItems"
           FROM releasedtopics rt
             LEFT JOIN static_lwp_mathscot_item slmi ON slmi."sequenceOrder" = (rt."releasedTopics" + 1) AND rt."mathscotThemes" ? slmi.theme::text
             LEFT JOIN ( SELECT static_lwp_mathscot_item.id
                   FROM static_lwp_mathscot_item
                  ORDER BY (random())
                 LIMIT 3) rand ON 1 = 1
          GROUP BY rt."classId"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP VIEW lwp_view_class_next_mathscot_items`);
        await queryRunner.query(`ALTER SEQUENCE "static_lwp_mathscot_item_id_seq" AS integer`);
        await queryRunner.query(`ALTER TABLE "static_lwp_mathscot_item" ALTER ID TYPE integer`);
        await queryRunner.query(`CREATE VIEW lwp_view_class_next_mathscot_items
        AS WITH releasedtopics AS (
                 SELECT lsc.id AS "classId",
                    slyg."mathscotThemes",
                    count(1) FILTER (WHERE lct.id IS NOT NULL AND lct.released = true) AS "releasedTopics"
                   FROM lwp_school_class lsc
                     LEFT JOIN static_lwp_topic slt ON slt.subject::text = 'READING'::text
                     LEFT JOIN lwp_class_topic lct ON lsc.id = lct."classId" AND lct."topicId" <> slt.id
                     JOIN static_lwp_year_group slyg ON lsc."yearGroup" = slyg.id
                  GROUP BY lsc.id, slyg."mathscotThemes"
                )
         SELECT rt."classId",
                CASE
                    WHEN array_length(array_remove(array_agg(slmi.id), NULL::integer), 1) IS NOT NULL THEN array_agg(DISTINCT slmi.id)
                    ELSE array_agg(DISTINCT rand.id)
                END AS "mathscotItems"
           FROM releasedtopics rt
             LEFT JOIN static_lwp_mathscot_item slmi ON slmi."sequenceOrder" = (rt."releasedTopics" + 1) AND rt."mathscotThemes" ? slmi.theme::text
             LEFT JOIN ( SELECT static_lwp_mathscot_item.id
                   FROM static_lwp_mathscot_item
                  ORDER BY (random())
                 LIMIT 3) rand ON 1 = 1
          GROUP BY rt."classId"`);
    }
}
