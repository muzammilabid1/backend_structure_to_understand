import { MigrationInterface, QueryRunner } from 'typeorm';

export class StaticLwpTopicDomainYearGroupTable1706675489421 implements MigrationInterface {
    name = 'StaticLwpTopicDomainYearGroupTable1706675489421';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `CREATE TABLE "static_lwp_topic_domain_year_group" ("id" BIGSERIAL NOT NULL, "logCreatedAt" TIMESTAMP DEFAULT ('now'::text)::timestamp(6) with time zone, "logUpdatedAt" TIMESTAMP NOT NULL DEFAULT ('now'::text)::timestamp(6) with time zone, "topicId" bigint, "domainId" bigint, "yearGroupId" bigint, "logCreatedById" bigint, "logUpdatedById" bigint, CONSTRAINT "PK_4552b5d85ddd3f57a74b5bef086" PRIMARY KEY ("id"))`
        );
        await queryRunner.query(
            `ALTER TABLE "static_lwp_topic_domain_year_group" ADD CONSTRAINT "FK_ba0255d7bbdab6a0f1bc022b89b" FOREIGN KEY ("topicId") REFERENCES "static_lwp_topic"("id") ON DELETE CASCADE ON UPDATE NO ACTION`
        );
        await queryRunner.query(
            `ALTER TABLE "static_lwp_topic_domain_year_group" ADD CONSTRAINT "FK_1789782fdd60cea44dbcf221086" FOREIGN KEY ("domainId") REFERENCES "static_lwp_topic_domain"("id") ON DELETE CASCADE ON UPDATE NO ACTION`
        );
        await queryRunner.query(
            `ALTER TABLE "static_lwp_topic_domain_year_group" ADD CONSTRAINT "FK_a97dcf82701afc0efded9db8feb" FOREIGN KEY ("yearGroupId") REFERENCES "static_lwp_year_group"("id") ON DELETE CASCADE ON UPDATE NO ACTION`
        );
        await queryRunner.query(
            `ALTER TABLE "static_lwp_topic_domain_year_group" ADD CONSTRAINT "FK_fc671d09c11d32b25117f2b1c6d" FOREIGN KEY ("logCreatedById") REFERENCES "lwp_user"("id") ON DELETE SET NULL ON UPDATE NO ACTION`
        );
        await queryRunner.query(
            `ALTER TABLE "static_lwp_topic_domain_year_group" ADD CONSTRAINT "FK_e068b1f1f8fd4dcf849f2b02b0e" FOREIGN KEY ("logUpdatedById") REFERENCES "lwp_user"("id") ON DELETE SET NULL ON UPDATE NO ACTION`
        );
        await queryRunner.query(`
            WITH topicAndDomainsAndYearGroups AS (
                SELECT 
                    d."staticLwpTopicId" AS "staticLwpTopicId",
                    d."staticLwpTopicDomainId" AS "staticLwpTopicDomainId",
                    y."staticLwpYearGroupId" AS "staticLwpYearGroupId"
                FROM 
                    public.lwp_domains_topics AS d
                JOIN 
                    public.lwp_topic_year_groups AS y ON d."staticLwpTopicId" = y."staticLwpTopicId"
                )
                INSERT INTO "static_lwp_topic_domain_year_group" ("topicId", "domainId", "yearGroupId")
                SELECT
                    topicAndDomainsAndYearGroups."staticLwpTopicId",
                    topicAndDomainsAndYearGroups."staticLwpTopicDomainId",
                    topicAndDomainsAndYearGroups."staticLwpYearGroupId"
                FROM
                    topicAndDomainsAndYearGroups
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "static_lwp_topic_domain_year_group" DROP CONSTRAINT "FK_e068b1f1f8fd4dcf849f2b02b0e"`);
        await queryRunner.query(`ALTER TABLE "static_lwp_topic_domain_year_group" DROP CONSTRAINT "FK_fc671d09c11d32b25117f2b1c6d"`);
        await queryRunner.query(`ALTER TABLE "static_lwp_topic_domain_year_group" DROP CONSTRAINT "FK_a97dcf82701afc0efded9db8feb"`);
        await queryRunner.query(`ALTER TABLE "static_lwp_topic_domain_year_group" DROP CONSTRAINT "FK_1789782fdd60cea44dbcf221086"`);
        await queryRunner.query(`ALTER TABLE "static_lwp_topic_domain_year_group" DROP CONSTRAINT "FK_ba0255d7bbdab6a0f1bc022b89b"`);
        await queryRunner.query(`DROP TABLE "static_lwp_topic_domain_year_group"`);
    }
}
