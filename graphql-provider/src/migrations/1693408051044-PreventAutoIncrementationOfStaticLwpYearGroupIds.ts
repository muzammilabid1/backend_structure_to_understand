import {MigrationInterface, QueryRunner} from "typeorm";

export class PreventAutoIncrementationOfStaticLwpYearGroupIds1693408051044 implements MigrationInterface {
    name = 'PreventAutoIncrementationOfStaticLwpYearGroupIds1693408051044'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "wonde_school_class" DROP CONSTRAINT "FK_199c61922532abd0f739639db75"`);
        await queryRunner.query(`ALTER TABLE "lwp_topic_year_groups" DROP CONSTRAINT "FK_74ec697bf0e09b8e9cbb315b188"`);
        await queryRunner.query(`ALTER TABLE "lwp_school_class" DROP CONSTRAINT "FK_9712293bbad097999c48154ae62"`);
        await queryRunner.query(`ALTER TABLE "static_lwp_year_group" ALTER COLUMN "id" DROP DEFAULT`);
        await queryRunner.query(`DROP SEQUENCE "static_lwp_year_group_id_seq"`);
        await queryRunner.query(`ALTER TABLE "wonde_school_class" ADD CONSTRAINT "FK_199c61922532abd0f739639db75" FOREIGN KEY ("yearGroup") REFERENCES "static_lwp_year_group"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "lwp_school_class" ADD CONSTRAINT "FK_9712293bbad097999c48154ae62" FOREIGN KEY ("yearGroup") REFERENCES "static_lwp_year_group"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "lwp_topic_year_groups" ADD CONSTRAINT "FK_74ec697bf0e09b8e9cbb315b188" FOREIGN KEY ("staticLwpYearGroupId") REFERENCES "static_lwp_year_group"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "lwp_topic_year_groups" DROP CONSTRAINT "FK_74ec697bf0e09b8e9cbb315b188"`);
        await queryRunner.query(`ALTER TABLE "lwp_school_class" DROP CONSTRAINT "FK_9712293bbad097999c48154ae62"`);
        await queryRunner.query(`ALTER TABLE "wonde_school_class" DROP CONSTRAINT "FK_199c61922532abd0f739639db75"`);
        await queryRunner.query(`CREATE SEQUENCE IF NOT EXISTS "static_lwp_year_group_id_seq" OWNED BY "static_lwp_year_group"."id"`);
        await queryRunner.query(`ALTER TABLE "static_lwp_year_group" ALTER COLUMN "id" SET DEFAULT nextval('"static_lwp_year_group_id_seq"')`);
        await queryRunner.query(`ALTER TABLE "lwp_school_class" ADD CONSTRAINT "FK_9712293bbad097999c48154ae62" FOREIGN KEY ("yearGroup") REFERENCES "static_lwp_year_group"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "lwp_topic_year_groups" ADD CONSTRAINT "FK_74ec697bf0e09b8e9cbb315b188" FOREIGN KEY ("staticLwpYearGroupId") REFERENCES "static_lwp_year_group"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "wonde_school_class" ADD CONSTRAINT "FK_199c61922532abd0f739639db75" FOREIGN KEY ("yearGroup") REFERENCES "static_lwp_year_group"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

}
