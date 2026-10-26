import { disableRLS, enableRLS } from 'src/migration_helpers/1721038124744-enable_rls';
import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddStaticLwpProgramTable1728045113462 implements MigrationInterface {
    name = 'AddStaticLwpProgramTable1728045113462';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `CREATE TABLE "static_lwp_program" ("id" BIGSERIAL NOT NULL, "name" character varying NOT NULL, "logoFileName" character varying, "characterFileName" character varying, "deletedAt" TIMESTAMP, "logCreatedAt" TIMESTAMP DEFAULT ('now'::text)::timestamp(6) with time zone, "logUpdatedAt" TIMESTAMP NOT NULL DEFAULT ('now'::text)::timestamp(6) with time zone, "schoolTagId" bigint, "deletedById" bigint, "logCreatedById" bigint, "logUpdatedById" bigint, CONSTRAINT "PK_a6c17717b01e39ea8d05509452d" PRIMARY KEY ("id"))`
        );
        await queryRunner.query(
            `ALTER TABLE "static_lwp_program" ADD CONSTRAINT "FK_1aaeccb9440690ed9fc5cc4dde1" FOREIGN KEY ("schoolTagId") REFERENCES "static_lwp_school_tag"("id") ON DELETE SET NULL ON UPDATE NO ACTION`
        );
        await queryRunner.query(
            `ALTER TABLE "static_lwp_program" ADD CONSTRAINT "FK_b90c802c94cdd3f0914e97f2526" FOREIGN KEY ("deletedById") REFERENCES "lwp_user"("id") ON DELETE SET NULL ON UPDATE NO ACTION`
        );
        await queryRunner.query(
            `ALTER TABLE "static_lwp_program" ADD CONSTRAINT "FK_14f9e68f50114ce220cfea80a1f" FOREIGN KEY ("logCreatedById") REFERENCES "lwp_user"("id") ON DELETE SET NULL ON UPDATE NO ACTION`
        );
        await queryRunner.query(
            `ALTER TABLE "static_lwp_program" ADD CONSTRAINT "FK_998b928910d00bd81b75ad041d1" FOREIGN KEY ("logUpdatedById") REFERENCES "lwp_user"("id") ON DELETE SET NULL ON UPDATE NO ACTION`
        );
        await enableRLS(queryRunner, 'static_lwp_program');
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await disableRLS(queryRunner, 'static_lwp_program');

        await queryRunner.query(`ALTER TABLE "static_lwp_program" DROP CONSTRAINT "FK_998b928910d00bd81b75ad041d1"`);
        await queryRunner.query(`ALTER TABLE "static_lwp_program" DROP CONSTRAINT "FK_14f9e68f50114ce220cfea80a1f"`);
        await queryRunner.query(`ALTER TABLE "static_lwp_program" DROP CONSTRAINT "FK_b90c802c94cdd3f0914e97f2526"`);
        await queryRunner.query(`ALTER TABLE "static_lwp_program" DROP CONSTRAINT "FK_1aaeccb9440690ed9fc5cc4dde1"`);
        await queryRunner.query(`DROP TABLE "static_lwp_program"`);
    }
}
