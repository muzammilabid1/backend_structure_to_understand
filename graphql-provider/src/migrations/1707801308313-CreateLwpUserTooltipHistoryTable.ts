import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateLwpUserTooltipHistoryTable1707801308313 implements MigrationInterface {
    name = 'CreateLwpUserTooltipHistoryTable1707801308313';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `CREATE TABLE "lwp_user_tooltip_history" ("type" character varying NOT NULL, "id" BIGSERIAL NOT NULL, "logCreatedAt" TIMESTAMP DEFAULT ('now'::text)::timestamp(6) with time zone, "logUpdatedAt" TIMESTAMP NOT NULL DEFAULT ('now'::text)::timestamp(6) with time zone, "userId" bigint, "logCreatedById" bigint, "logUpdatedById" bigint, CONSTRAINT "PK_d76deabcd913c4cb3493a071bb7" PRIMARY KEY ("id"))`
        );
        await queryRunner.query(
            `ALTER TABLE "lwp_user_tooltip_history" ADD CONSTRAINT "FK_054f240cad5e4ac4c6bca3ad584" FOREIGN KEY ("userId") REFERENCES "lwp_user"("id") ON DELETE SET NULL ON UPDATE NO ACTION`
        );
        await queryRunner.query(
            `ALTER TABLE "lwp_user_tooltip_history" ADD CONSTRAINT "FK_f042874b958f3a9c3707d57f024" FOREIGN KEY ("logCreatedById") REFERENCES "lwp_user"("id") ON DELETE SET NULL ON UPDATE NO ACTION`
        );
        await queryRunner.query(
            `ALTER TABLE "lwp_user_tooltip_history" ADD CONSTRAINT "FK_a8d05133c82fb8814ab94ce58dc" FOREIGN KEY ("logUpdatedById") REFERENCES "lwp_user"("id") ON DELETE SET NULL ON UPDATE NO ACTION`
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "lwp_user_tooltip_history" DROP CONSTRAINT "FK_a8d05133c82fb8814ab94ce58dc"`);
        await queryRunner.query(`ALTER TABLE "lwp_user_tooltip_history" DROP CONSTRAINT "FK_f042874b958f3a9c3707d57f024"`);
        await queryRunner.query(`ALTER TABLE "lwp_user_tooltip_history" DROP CONSTRAINT "FK_054f240cad5e4ac4c6bca3ad584"`);
        await queryRunner.query(`DROP TABLE "lwp_user_tooltip_history"`);
    }
}
