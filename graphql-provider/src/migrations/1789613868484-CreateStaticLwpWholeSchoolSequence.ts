import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * The header of a whole-school sequence: the object an admin builds per subject per academic year,
 * and that a school leader later schedules their whole school from (LEA-6694, part of LEA-6504).
 *
 * Migration 1 of 3 for the feature. The members table follows in LEA-6695 and the per-school
 * assignment in LEA-6698, each with its own migration, so a schema problem stays isolated to the
 * slice that caused it.
 *
 * **`periodIndex` is NOT NULL here**, unlike on `static_lwp_topic_sequence` where an INTERVAL
 * sequence carries no academic year at all. Every member of a whole-school sequence will be FIXED,
 * so it always belongs to exactly one year, and that year is half of what this row is keyed on.
 *
 * **`UQ_8514162e96b49caac474e2dad3c` is a plain unique key on (subjectId, periodIndex), not a
 * partial one.** That is deliberate and differs from the per-school assignment index arriving in
 * LEA-6698, which is partial so a school can schedule again after a removal. A partial index here,
 * on `WHERE status = 'PUBLISHED'`, would permit unlimited drafts for the same subject and year with
 * nothing to tell them apart, which is the only case a `name` column would have been needed for.
 * This key is what makes that column redundant rather than merely unnecessary.
 *
 * Nothing reads this table yet. The admin screens write it; the leader-facing half arrives in
 * LEA-6697, so `up` on its own changes no behaviour anywhere.
 */
export class CreateStaticLwpWholeSchoolSequence1789613868484 implements MigrationInterface {
    name = 'CreateStaticLwpWholeSchoolSequence1789613868484';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `CREATE TABLE "static_lwp_whole_school_sequence" ("status" character varying NOT NULL DEFAULT 'DRAFT', "id" BIGSERIAL NOT NULL, "logCreatedAt" TIMESTAMP DEFAULT ('now'::text)::timestamp(6) with time zone, "logUpdatedAt" TIMESTAMP NOT NULL DEFAULT ('now'::text)::timestamp(6) with time zone, "subjectId" bigint NOT NULL, "periodIndex" integer NOT NULL, "logCreatedById" bigint, "logUpdatedById" bigint, CONSTRAINT "UQ_8514162e96b49caac474e2dad3c" UNIQUE ("subjectId", "periodIndex"), CONSTRAINT "PK_88ba20e0276e151825683c201c7" PRIMARY KEY ("id"))`
        );
        await queryRunner.query(`CREATE INDEX "IDX_16ba0a7751b9525b80d977aae2" ON "static_lwp_whole_school_sequence" ("subjectId") `);
        await queryRunner.query(`CREATE INDEX "IDX_d1dc2ff8f84e50d62ef01ffebf" ON "static_lwp_whole_school_sequence" ("periodIndex") `);
        await queryRunner.query(`CREATE INDEX "IDX_58644bf62445e8c5bac8677e85" ON "static_lwp_whole_school_sequence" ("logCreatedById") `);
        await queryRunner.query(`CREATE INDEX "IDX_b1338181c3cedda4b30acb0e28" ON "static_lwp_whole_school_sequence" ("logUpdatedById") `);
        await queryRunner.query(
            `ALTER TABLE "static_lwp_whole_school_sequence" ADD CONSTRAINT "FK_16ba0a7751b9525b80d977aae26" FOREIGN KEY ("subjectId") REFERENCES "static_lwp_subject"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`
        );
        await queryRunner.query(
            `ALTER TABLE "static_lwp_whole_school_sequence" ADD CONSTRAINT "FK_d1dc2ff8f84e50d62ef01ffebf4" FOREIGN KEY ("periodIndex") REFERENCES "static_lwp_period"("index") ON DELETE RESTRICT ON UPDATE NO ACTION`
        );
        await queryRunner.query(
            `ALTER TABLE "static_lwp_whole_school_sequence" ADD CONSTRAINT "FK_58644bf62445e8c5bac8677e852" FOREIGN KEY ("logCreatedById") REFERENCES "lwp_user"("id") ON DELETE SET NULL ON UPDATE NO ACTION`
        );
        await queryRunner.query(
            `ALTER TABLE "static_lwp_whole_school_sequence" ADD CONSTRAINT "FK_b1338181c3cedda4b30acb0e283" FOREIGN KEY ("logUpdatedById") REFERENCES "lwp_user"("id") ON DELETE SET NULL ON UPDATE NO ACTION`
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "static_lwp_whole_school_sequence" DROP CONSTRAINT "FK_b1338181c3cedda4b30acb0e283"`);
        await queryRunner.query(`ALTER TABLE "static_lwp_whole_school_sequence" DROP CONSTRAINT "FK_58644bf62445e8c5bac8677e852"`);
        await queryRunner.query(`ALTER TABLE "static_lwp_whole_school_sequence" DROP CONSTRAINT "FK_d1dc2ff8f84e50d62ef01ffebf4"`);
        await queryRunner.query(`ALTER TABLE "static_lwp_whole_school_sequence" DROP CONSTRAINT "FK_16ba0a7751b9525b80d977aae26"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_b1338181c3cedda4b30acb0e28"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_58644bf62445e8c5bac8677e85"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_d1dc2ff8f84e50d62ef01ffebf"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_16ba0a7751b9525b80d977aae2"`);
        await queryRunner.query(`DROP TABLE "static_lwp_whole_school_sequence"`);
    }
}
