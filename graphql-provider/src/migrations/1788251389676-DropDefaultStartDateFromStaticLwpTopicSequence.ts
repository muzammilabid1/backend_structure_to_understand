import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Removes the one column a topic sequence has no use for (LEA-6595).
 *
 * `defaultStartDate` was the anchor an INTERVAL sequence's item dates were generated from, and it
 * prefilled the assignment date picker. Interval sequences carry no item dates at all as of
 * LEA-6594, and the anchor is the class's to choose: a sequence is used by many classes starting at
 * different times, so the template never had a defensible answer for it. A FIXED sequence never
 * used it either, since its dates live on its items.
 *
 * ⚠️ **`intervalDays` is deliberately NOT dropped, and an earlier version of this migration dropped
 * it.** The cadence turned out to be the opposite case: it belongs to Learning with Parents rather
 * than to the school, because Ready Teddy is designed to run weekly and letting a teacher pick their
 * own number changes the programme's outcome (LEA-6624). It stays on the sequence, is read at
 * assignment time, and the teacher is not asked for it. If you are here because the column is
 * missing from a database, that database ran the earlier version of this file.
 *
 * ⚠️ **`lwp_class_sequence_assignment.intervalDays` is a different column again and is untouched.**
 * That one records the cadence a class was actually given, copied from the sequence when it was
 * assigned, and it exists precisely because the sequence is mutable. Check the table name before
 * assuming this migration is the one you are looking for.
 *
 * ⚠️ **The `down` restores the column but not the data, and cannot.** The values are gone the moment
 * `up` runs, so reverting gives back one empty nullable column. That loses nothing that matters,
 * because nothing has read it since LEA-6594, but it does mean this is not a migration to bounce up
 * and down expecting the old behaviour back with it: the code that read it has gone too.
 */
export class DropDefaultStartDateFromStaticLwpTopicSequence1788251389676 implements MigrationInterface {
    name = 'DropDefaultStartDateFromStaticLwpTopicSequence1788251389676';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "static_lwp_topic_sequence" DROP COLUMN "defaultStartDate"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "static_lwp_topic_sequence" ADD "defaultStartDate" date`);
    }
}
