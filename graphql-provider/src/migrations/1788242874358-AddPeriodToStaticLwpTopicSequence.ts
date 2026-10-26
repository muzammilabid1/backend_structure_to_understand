import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Gives a FIXED topic sequence the academic year it was built for, so it can only ever be offered
 * while a school is teaching that year (LEA-6581).
 *
 * The column is deliberately NULLABLE, and null is a meaningful value rather than missing data. A
 * FIXED sequence carries concrete dates and belongs to exactly one year. An INTERVAL sequence
 * carries no dates, belongs to no year, and is offered in every academic year forever, so its
 * period stays null. Corrected by the team on 2026-08-27, after a first version of this work that
 * made the column NOT NULL on every row.
 *
 * The ADD, the index and the foreign key are exactly as `migration:generate` produced them, names
 * included, so a future generate sees no drift. Only the backfill is written by hand: a generate
 * cannot know what an existing row's year should be.
 *
 * The backfill touches FIXED rows only, and its two passes between them cover all of them.
 */
export class AddPeriodToStaticLwpTopicSequence1788242874358 implements MigrationInterface {
    name = 'AddPeriodToStaticLwpTopicSequence1788242874358';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "static_lwp_topic_sequence" ADD "periodIndex" integer`);

        // 1. Each FIXED sequence takes the academic year its first topic falls in. A well-formed
        //    sequence runs September to July inside one year, so its first and last topics agree on
        //    which year that is; the rule only decides anything for data crossing a year boundary,
        //    and the first topic is the conventional reading of which year a sequence belongs to.
        //
        //    A period with either date missing is skipped rather than matched, because those dates
        //    are nullable and were read nowhere in application code before this feature.
        await queryRunner.query(`
            UPDATE static_lwp_topic_sequence s
            SET "periodIndex" = (
                SELECT p.index
                FROM static_lwp_period p
                WHERE p."startDate" IS NOT NULL
                  AND p."endDate" IS NOT NULL
                  AND (
                      SELECT MIN(i."startDate")
                      FROM static_lwp_topic_sequence_item i
                      WHERE i."sequenceId" = s.id
                  ) BETWEEN p."startDate" AND p."endDate"
                ORDER BY p.index
                LIMIT 1
            )
            WHERE s."timingMode" = 'FIXED'
        `);

        // 2. Any FIXED sequence left has no topics at all, or topics dated outside every academic
        //    year, so there is nothing to derive a year from. The current year is the only sensible
        //    default: it keeps the sequence visible and editable rather than burying it in a
        //    finished year, and an admin re-saving it gets a clear message naming the year and its
        //    range if the dates do not in fact fit.
        //
        //    Still FIXED-only, so an interval sequence is never given a year here. If no period is
        //    flagged current the subselect yields null and the row simply stays null, which the
        //    column now permits; that is a degradation rather than a failed migration.
        await queryRunner.query(`
            UPDATE static_lwp_topic_sequence
            SET "periodIndex" = (SELECT index FROM static_lwp_period WHERE "isCurrentPeriod" = true LIMIT 1)
            WHERE "periodIndex" IS NULL
              AND "timingMode" = 'FIXED'
        `);

        // Deliberately no `SET NOT NULL`. INTERVAL rows are left null on purpose, and constraining
        // the column would both fail here and make the interval work that follows impossible.

        await queryRunner.query(`CREATE INDEX "IDX_d3c67b6a0fa260f0a207b5b24c" ON "static_lwp_topic_sequence" ("periodIndex") `);
        await queryRunner.query(
            `ALTER TABLE "static_lwp_topic_sequence" ADD CONSTRAINT "FK_d3c67b6a0fa260f0a207b5b24c9" FOREIGN KEY ("periodIndex") REFERENCES "static_lwp_period"("index") ON DELETE RESTRICT ON UPDATE NO ACTION`
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "static_lwp_topic_sequence" DROP CONSTRAINT "FK_d3c67b6a0fa260f0a207b5b24c9"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_d3c67b6a0fa260f0a207b5b24c"`);
        await queryRunner.query(`ALTER TABLE "static_lwp_topic_sequence" DROP COLUMN "periodIndex"`);
    }
}
