import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Lets a topic sequence item carry no start date, because an INTERVAL sequence no longer has any
 * dates to give it (LEA-6594).
 *
 * A FIXED sequence carries concrete dates and still requires one per item, enforced in
 * `resolveSequenceItemDates` rather than by the column. An INTERVAL sequence is an ordered list of
 * topics and nothing else: the anchor and the interval belong to the class it is given to, and the
 * teacher supplies both at assignment time.
 *
 * No backfill. Interval sequences created before this keep the dates that were generated for them,
 * and those go on being ignored at assignment exactly as they always were, because
 * `planClassTopicDates` re-anchors from the class's own start date and never reads the template's.
 * So there is nothing to correct, only something to stop requiring.
 *
 * **The `down` deliberately does not restore `NOT NULL`.** See the note on it below.
 */
export class MakeStartDateOptionalOnStaticLwpTopicSequenceItem1788248395134 implements MigrationInterface {
    name = 'MakeStartDateOptionalOnStaticLwpTopicSequenceItem1788248395134';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "static_lwp_topic_sequence_item" ALTER COLUMN "startDate" DROP NOT NULL`);
    }

    /**
     * Deliberately does not restore `NOT NULL`, and this is the considered choice rather than an
     * omission.
     *
     * Widening a column is not meaningfully reversible once rows have used the width. An interval
     * sequence item written under the new shape has no start date and there is none to give it: any
     * value would be invented, and an invented date here is indistinguishable from one an admin
     * chose. Filling them would make the rollback *complete* without making it *correct*, and the
     * fabricated rows would survive a roll-forward.
     *
     * Restoring the constraint instead would abort the revert with Postgres's "column contains null
     * values", which protects nothing: the null rows exist either way, and `migration:revert` runs
     * one migration at a time, so failing here also blocks everything below it in the chain. That is
     * the worst outcome of the three, and it arrives at the worst possible moment.
     *
     * Leaving the column nullable is harmless to the code this rolls back to, which only ever writes
     * a date. What that code cannot handle is the null **rows**, and no constraint change fixes
     * those, so this reports them and continues rather than pretending either way.
     */
    public async down(queryRunner: QueryRunner): Promise<void> {
        const [{ count }] = await queryRunner.query(
            `SELECT count(*)::int AS count FROM static_lwp_topic_sequence_item WHERE "startDate" IS NULL`
        );

        if (count > 0) {
            console.warn(
                `${count} topic sequence items have no start date, which the code being rolled back to does not expect. ` +
                    'They belong to interval sequences created after LEA-6594. The column is left nullable rather than ' +
                    'given invented dates; review those sequences before relying on interval scheduling again.'
            );
        }
    }
}
