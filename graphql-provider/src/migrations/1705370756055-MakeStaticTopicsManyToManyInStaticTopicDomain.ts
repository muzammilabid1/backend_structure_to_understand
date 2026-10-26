import { MigrationInterface, QueryRunner } from 'typeorm';

export class MakeStaticTopicsManyToManyInStaticTopicDomain1705370756055 implements MigrationInterface {
    name = 'MakeStaticTopicsManyToManyInStaticTopicDomain1705370756055';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE "backup_staticLwpTopicIds_domainIds" AS (
                SELECT 
                    id AS "staticLwpTopicId",
                    "domainId" AS "staticLwpTopicDomainId"
                FROM 
                    static_lwp_topic
            )
        `);
        await queryRunner.query(`ALTER TABLE "static_lwp_topic" DROP CONSTRAINT "FK_6196aeffde40e5f2bce1985fd8b"`);
        await queryRunner.query(
            `CREATE TABLE "lwp_domains_topics" ("staticLwpTopicId" bigint NOT NULL, "staticLwpTopicDomainId" bigint NOT NULL, CONSTRAINT "PK_d6779403c67e6d7f040dd6dd258" PRIMARY KEY ("staticLwpTopicId", "staticLwpTopicDomainId"))`
        );
        await queryRunner.query(`CREATE INDEX "IDX_9ed3b1d927dabbfd242cc535f8" ON "lwp_domains_topics" ("staticLwpTopicId") `);
        await queryRunner.query(`CREATE INDEX "IDX_8104bab1b40c3a4ab215a69736" ON "lwp_domains_topics" ("staticLwpTopicDomainId") `);
        await queryRunner.query(`ALTER TABLE "static_lwp_topic" DROP COLUMN "domainId"`);
        await queryRunner.query(
            `ALTER TABLE "lwp_domains_topics" ADD CONSTRAINT "FK_9ed3b1d927dabbfd242cc535f80" FOREIGN KEY ("staticLwpTopicId") REFERENCES "static_lwp_topic"("id") ON DELETE CASCADE ON UPDATE CASCADE`
        );
        await queryRunner.query(
            `ALTER TABLE "lwp_domains_topics" ADD CONSTRAINT "FK_8104bab1b40c3a4ab215a69736d" FOREIGN KEY ("staticLwpTopicDomainId") REFERENCES "static_lwp_topic_domain"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
        );
        // Copy data from backup table to lwp_domains_topics
        await queryRunner.query(`
            INSERT INTO "lwp_domains_topics" ("staticLwpTopicId", "staticLwpTopicDomainId")
            SELECT 
                "staticLwpTopicId",
                "staticLwpTopicDomainId"
            FROM 
                "backup_staticLwpTopicIds_domainIds"
`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "lwp_domains_topics" DROP CONSTRAINT "FK_8104bab1b40c3a4ab215a69736d"`);
        await queryRunner.query(`ALTER TABLE "lwp_domains_topics" DROP CONSTRAINT "FK_9ed3b1d927dabbfd242cc535f80"`);
        await queryRunner.query(`ALTER TABLE "static_lwp_topic" ADD "domainId" bigint`);
        await queryRunner.query(`DROP INDEX "public"."IDX_8104bab1b40c3a4ab215a69736"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_9ed3b1d927dabbfd242cc535f8"`);
        await queryRunner.query(`DROP TABLE "lwp_domains_topics"`);
        await queryRunner.query(
            `ALTER TABLE "static_lwp_topic" ADD CONSTRAINT "FK_6196aeffde40e5f2bce1985fd8b" FOREIGN KEY ("domainId") REFERENCES "static_lwp_topic_domain"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
        );
    }
}
