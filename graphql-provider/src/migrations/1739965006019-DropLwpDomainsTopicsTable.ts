import {MigrationInterface, QueryRunner} from "typeorm";

export class DropLwpDomainsTopicsTable1739965006019 implements MigrationInterface {
    name = 'DropLwpDomainsTopicsTable1739965006019'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "lwp_domains_topics"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `CREATE TABLE "lwp_domains_topics" ("staticLwpTopicId" bigint NOT NULL, "staticLwpTopicDomainId" bigint NOT NULL, CONSTRAINT "PK_d6779403c67e6d7f040dd6dd258" PRIMARY KEY ("staticLwpTopicId", "staticLwpTopicDomainId"))`
        );
        await queryRunner.query(`CREATE INDEX "IDX_9ed3b1d927dabbfd242cc535f8" ON "lwp_domains_topics" ("staticLwpTopicId") `);
        await queryRunner.query(`CREATE INDEX "IDX_8104bab1b40c3a4ab215a69736" ON "lwp_domains_topics" ("staticLwpTopicDomainId") `);
        await queryRunner.query(
            `ALTER TABLE "lwp_domains_topics" ADD CONSTRAINT "FK_9ed3b1d927dabbfd242cc535f80" FOREIGN KEY ("staticLwpTopicId") REFERENCES "static_lwp_topic"("id") ON DELETE CASCADE ON UPDATE CASCADE`
        );
        await queryRunner.query(
            `ALTER TABLE "lwp_domains_topics" ADD CONSTRAINT "FK_8104bab1b40c3a4ab215a69736d" FOREIGN KEY ("staticLwpTopicDomainId") REFERENCES "static_lwp_topic_domain"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
        );
    }

}
