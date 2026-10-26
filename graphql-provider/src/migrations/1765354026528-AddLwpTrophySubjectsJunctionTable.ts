import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddLwpTrophySubjectsJunctionTable1765354026528 implements MigrationInterface {
    name = 'AddLwpTrophySubjectsJunctionTable1765354026528';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `CREATE TABLE "lwp_trophy_subjects" ("staticLwpTrophyId" bigint NOT NULL, "staticLwpSubjectId" bigint NOT NULL, CONSTRAINT "PK_2e6e01bd49be31dd93f758d8358" PRIMARY KEY ("staticLwpTrophyId", "staticLwpSubjectId"))`
        );
        await queryRunner.query(`CREATE INDEX "IDX_b29da7091980e90f89dc4f134a" ON "lwp_trophy_subjects" ("staticLwpTrophyId") `);
        await queryRunner.query(`CREATE INDEX "IDX_e0a7de29247f64105fbd742ed6" ON "lwp_trophy_subjects" ("staticLwpSubjectId") `);
        await queryRunner.query(
            `ALTER TABLE "lwp_trophy_subjects" ADD CONSTRAINT "FK_b29da7091980e90f89dc4f134ac" FOREIGN KEY ("staticLwpTrophyId") REFERENCES "static_lwp_trophy"("id") ON DELETE CASCADE ON UPDATE CASCADE`
        );
        await queryRunner.query(
            `ALTER TABLE "lwp_trophy_subjects" ADD CONSTRAINT "FK_e0a7de29247f64105fbd742ed61" FOREIGN KEY ("staticLwpSubjectId") REFERENCES "static_lwp_subject"("id") ON DELETE CASCADE ON UPDATE NO ACTION`
        );

        // Insert all combinations of trophies and subjects into the junction table
        await queryRunner.query(`
            INSERT INTO "lwp_trophy_subjects" ("staticLwpTrophyId", "staticLwpSubjectId")
            SELECT t.id, s.id
            FROM "static_lwp_trophy" t
            CROSS JOIN "static_lwp_subject" s
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "lwp_trophy_subjects" DROP CONSTRAINT "FK_e0a7de29247f64105fbd742ed61"`);
        await queryRunner.query(`ALTER TABLE "lwp_trophy_subjects" DROP CONSTRAINT "FK_b29da7091980e90f89dc4f134ac"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_e0a7de29247f64105fbd742ed6"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_b29da7091980e90f89dc4f134a"`);
        await queryRunner.query(`DROP TABLE "lwp_trophy_subjects"`);
    }
}
