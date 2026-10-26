import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddYearGroupsInStaticTopicDomain1705365474856 implements MigrationInterface {
    name = 'AddYearGroupsInStaticTopicDomain1705365474856';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `CREATE TABLE "lwp_domain_year_groups" ("staticLwpTopicDomainId" bigint NOT NULL, "staticLwpYearGroupId" bigint NOT NULL, CONSTRAINT "PK_b17a9b4ab21d2cd085d09b56360" PRIMARY KEY ("staticLwpTopicDomainId", "staticLwpYearGroupId"))`
        );
        await queryRunner.query(`CREATE INDEX "IDX_7dd2e51924f7835aade3467442" ON "lwp_domain_year_groups" ("staticLwpTopicDomainId") `);
        await queryRunner.query(`CREATE INDEX "IDX_f80895a1ee7491e0d383532988" ON "lwp_domain_year_groups" ("staticLwpYearGroupId") `);
        await queryRunner.query(
            `ALTER TABLE "lwp_domain_year_groups" ADD CONSTRAINT "FK_7dd2e51924f7835aade34674424" FOREIGN KEY ("staticLwpTopicDomainId") REFERENCES "static_lwp_topic_domain"("id") ON DELETE CASCADE ON UPDATE CASCADE`
        );
        await queryRunner.query(
            `ALTER TABLE "lwp_domain_year_groups" ADD CONSTRAINT "FK_f80895a1ee7491e0d383532988d" FOREIGN KEY ("staticLwpYearGroupId") REFERENCES "static_lwp_year_group"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
        );
        await queryRunner.query(`
            WITH domainsAndYearGroups AS (
                SELECT
                    d.id AS "staticLwpTopicDomainId",
                    y.id AS "staticLwpYearGroupId"
                FROM
                    "static_lwp_topic_domain" d
                CROSS JOIN
                    "static_lwp_year_group" y
            )
            INSERT INTO "lwp_domain_year_groups" ("staticLwpTopicDomainId", "staticLwpYearGroupId")
            SELECT
                domainsAndYearGroups."staticLwpTopicDomainId",
                domainsAndYearGroups."staticLwpYearGroupId"
            FROM
                domainsAndYearGroups
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "lwp_domain_year_groups" DROP CONSTRAINT "FK_f80895a1ee7491e0d383532988d"`);
        await queryRunner.query(`ALTER TABLE "lwp_domain_year_groups" DROP CONSTRAINT "FK_7dd2e51924f7835aade34674424"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_f80895a1ee7491e0d383532988"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_7dd2e51924f7835aade3467442"`);
        await queryRunner.query(`DROP TABLE "lwp_domain_year_groups"`);
    }
}
