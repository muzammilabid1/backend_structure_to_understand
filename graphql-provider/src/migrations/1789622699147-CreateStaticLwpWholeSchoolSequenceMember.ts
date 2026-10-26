import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * What each year group gets from a whole-school sequence: an existing class sequence, one per year
 * group (LEA-6695, part of LEA-6504).
 *
 * Migration 2 of 3 for the feature. The per-school assignment follows in LEA-6698.
 *
 * **`sequenceId` is RESTRICT, not SET NULL**, which differs from the same link on
 * `lwp_class_sequence_assignment`. That one survives its sequence being deleted because the class
 * already holds the topics it was given; a member holds nothing at all, so a null there would
 * silently shrink what every school is offered rather than leave a record of something that
 * happened. An admin who wants a sequence gone removes it from the whole-school sequence first.
 *
 * **`wholeSchoolSequenceId` is CASCADE**, because a member has no meaning without its parent, the
 * same way sequence items die with their sequence.
 *
 * **Two unique keys, both plain.** `(wholeSchoolSequenceId, yearGroupId)` is the rule the feature is
 * built on: a class is matched to its year group's member, and two members for one year group would
 * make that match ambiguous. `(wholeSchoolSequenceId, sequenceId)` stops the same sequence appearing
 * under two year groups, which the denormalised `yearGroupId` would otherwise permit.
 *
 * `yearGroupId` is denormalised from the sequence, which carries its own. That is what makes the
 * first key enforceable in the database rather than in code, and it lets LEA-6698's fan-out match a
 * class to its member without joining through the sequence. The service reads it off the sequence
 * and never takes it from a caller, so the two columns cannot disagree.
 */
export class CreateStaticLwpWholeSchoolSequenceMember1789622699147 implements MigrationInterface {
    name = 'CreateStaticLwpWholeSchoolSequenceMember1789622699147';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `CREATE TABLE "static_lwp_whole_school_sequence_member" ("id" BIGSERIAL NOT NULL, "logCreatedAt" TIMESTAMP DEFAULT ('now'::text)::timestamp(6) with time zone, "logUpdatedAt" TIMESTAMP NOT NULL DEFAULT ('now'::text)::timestamp(6) with time zone, "wholeSchoolSequenceId" bigint NOT NULL, "sequenceId" bigint NOT NULL, "yearGroupId" bigint NOT NULL, "logCreatedById" bigint, "logUpdatedById" bigint, CONSTRAINT "UQ_fb035cc242eeaff29608f0031df" UNIQUE ("wholeSchoolSequenceId", "sequenceId"), CONSTRAINT "UQ_6f053301bf84c6f714fe64b9b81" UNIQUE ("wholeSchoolSequenceId", "yearGroupId"), CONSTRAINT "PK_57ee71fcf4a9ad25d1c4ca2346e" PRIMARY KEY ("id"))`
        );
        await queryRunner.query(
            `CREATE INDEX "IDX_be5a6de81153750e487cc0ff6f" ON "static_lwp_whole_school_sequence_member" ("wholeSchoolSequenceId") `
        );
        await queryRunner.query(
            `CREATE INDEX "IDX_811ab1ecba16aaefbb473a5af9" ON "static_lwp_whole_school_sequence_member" ("sequenceId") `
        );
        await queryRunner.query(
            `CREATE INDEX "IDX_d7374797c1ac40f19166ffbe6a" ON "static_lwp_whole_school_sequence_member" ("yearGroupId") `
        );
        await queryRunner.query(
            `CREATE INDEX "IDX_ee3f1a4e3dc112c02363da74f0" ON "static_lwp_whole_school_sequence_member" ("logCreatedById") `
        );
        await queryRunner.query(
            `CREATE INDEX "IDX_d3faa4307272bb302a429decc6" ON "static_lwp_whole_school_sequence_member" ("logUpdatedById") `
        );
        await queryRunner.query(
            `ALTER TABLE "static_lwp_whole_school_sequence_member" ADD CONSTRAINT "FK_be5a6de81153750e487cc0ff6fc" FOREIGN KEY ("wholeSchoolSequenceId") REFERENCES "static_lwp_whole_school_sequence"("id") ON DELETE CASCADE ON UPDATE NO ACTION`
        );
        await queryRunner.query(
            `ALTER TABLE "static_lwp_whole_school_sequence_member" ADD CONSTRAINT "FK_811ab1ecba16aaefbb473a5af97" FOREIGN KEY ("sequenceId") REFERENCES "static_lwp_topic_sequence"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`
        );
        await queryRunner.query(
            `ALTER TABLE "static_lwp_whole_school_sequence_member" ADD CONSTRAINT "FK_d7374797c1ac40f19166ffbe6a7" FOREIGN KEY ("yearGroupId") REFERENCES "static_lwp_year_group"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`
        );
        await queryRunner.query(
            `ALTER TABLE "static_lwp_whole_school_sequence_member" ADD CONSTRAINT "FK_ee3f1a4e3dc112c02363da74f03" FOREIGN KEY ("logCreatedById") REFERENCES "lwp_user"("id") ON DELETE SET NULL ON UPDATE NO ACTION`
        );
        await queryRunner.query(
            `ALTER TABLE "static_lwp_whole_school_sequence_member" ADD CONSTRAINT "FK_d3faa4307272bb302a429decc63" FOREIGN KEY ("logUpdatedById") REFERENCES "lwp_user"("id") ON DELETE SET NULL ON UPDATE NO ACTION`
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "static_lwp_whole_school_sequence_member" DROP CONSTRAINT "FK_d3faa4307272bb302a429decc63"`);
        await queryRunner.query(`ALTER TABLE "static_lwp_whole_school_sequence_member" DROP CONSTRAINT "FK_ee3f1a4e3dc112c02363da74f03"`);
        await queryRunner.query(`ALTER TABLE "static_lwp_whole_school_sequence_member" DROP CONSTRAINT "FK_d7374797c1ac40f19166ffbe6a7"`);
        await queryRunner.query(`ALTER TABLE "static_lwp_whole_school_sequence_member" DROP CONSTRAINT "FK_811ab1ecba16aaefbb473a5af97"`);
        await queryRunner.query(`ALTER TABLE "static_lwp_whole_school_sequence_member" DROP CONSTRAINT "FK_be5a6de81153750e487cc0ff6fc"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_d3faa4307272bb302a429decc6"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_ee3f1a4e3dc112c02363da74f0"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_d7374797c1ac40f19166ffbe6a"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_811ab1ecba16aaefbb473a5af9"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_be5a6de81153750e487cc0ff6f"`);
        await queryRunner.query(`DROP TABLE "static_lwp_whole_school_sequence_member"`);
    }
}
