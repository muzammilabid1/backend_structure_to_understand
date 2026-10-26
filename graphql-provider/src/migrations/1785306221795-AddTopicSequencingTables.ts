import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTopicSequencingTables1785306221795 implements MigrationInterface {
    name = 'AddTopicSequencingTables1785306221795';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `CREATE TABLE "static_lwp_topic_sequence_item" ("order" integer NOT NULL, "startDate" date NOT NULL, "endDate" date, "id" BIGSERIAL NOT NULL, "logCreatedAt" TIMESTAMP DEFAULT ('now'::text)::timestamp(6) with time zone, "logUpdatedAt" TIMESTAMP NOT NULL DEFAULT ('now'::text)::timestamp(6) with time zone, "sequenceId" bigint NOT NULL, "topicId" bigint NOT NULL, "logCreatedById" bigint, "logUpdatedById" bigint, CONSTRAINT "UQ_topic_sequence_item_sequence_topic" UNIQUE ("sequenceId", "topicId"), CONSTRAINT "UQ_topic_sequence_item_sequence_order" UNIQUE ("sequenceId", "order"), CONSTRAINT "PK_0e95c37ecd7377e4ec1ea4fa23d" PRIMARY KEY ("id"))`
        );
        await queryRunner.query(`CREATE INDEX "IDX_42602b69e01152aa1dd61724e5" ON "static_lwp_topic_sequence_item" ("sequenceId") `);
        await queryRunner.query(`CREATE INDEX "IDX_bd7f79c52a3d7e0f7c30690617" ON "static_lwp_topic_sequence_item" ("topicId") `);
        await queryRunner.query(`CREATE INDEX "IDX_50d86b423a249d2b05471aebb8" ON "static_lwp_topic_sequence_item" ("logCreatedById") `);
        await queryRunner.query(`CREATE INDEX "IDX_da76dd27319e273f02ace9a455" ON "static_lwp_topic_sequence_item" ("logUpdatedById") `);
        await queryRunner.query(
            `CREATE TABLE "static_lwp_topic_sequence" ("name" character varying NOT NULL, "timingMode" character varying NOT NULL, "intervalDays" integer, "defaultStartDate" date, "id" BIGSERIAL NOT NULL, "logCreatedAt" TIMESTAMP DEFAULT ('now'::text)::timestamp(6) with time zone, "logUpdatedAt" TIMESTAMP NOT NULL DEFAULT ('now'::text)::timestamp(6) with time zone, "subjectId" bigint NOT NULL, "yearGroupId" bigint NOT NULL, "logCreatedById" bigint, "logUpdatedById" bigint, CONSTRAINT "PK_91dcaee411cf61b23e6b7b7d3b4" PRIMARY KEY ("id"))`
        );
        await queryRunner.query(`CREATE INDEX "IDX_7aa7195aa7dd08de3fe5c818d7" ON "static_lwp_topic_sequence" ("subjectId") `);
        await queryRunner.query(`CREATE INDEX "IDX_a97cc03ec9076cdeca3d3217b3" ON "static_lwp_topic_sequence" ("yearGroupId") `);
        await queryRunner.query(`CREATE INDEX "IDX_b9660f31445d7310736437175a" ON "static_lwp_topic_sequence" ("logCreatedById") `);
        await queryRunner.query(`CREATE INDEX "IDX_6344fe1415e601e5b7c6bf0485" ON "static_lwp_topic_sequence" ("logUpdatedById") `);
        await queryRunner.query(
            `CREATE TABLE "lwp_class_sequence_assignment" ("sequenceName" character varying, "startDate" date, "intervalDays" integer, "status" character varying NOT NULL DEFAULT 'ASSIGNED', "id" BIGSERIAL NOT NULL, "logCreatedAt" TIMESTAMP DEFAULT ('now'::text)::timestamp(6) with time zone, "logUpdatedAt" TIMESTAMP NOT NULL DEFAULT ('now'::text)::timestamp(6) with time zone, "classId" bigint NOT NULL, "sequenceId" bigint, "logCreatedById" bigint, "logUpdatedById" bigint, CONSTRAINT "PK_7b5cac90d63a61381a20e398a1c" PRIMARY KEY ("id"))`
        );
        await queryRunner.query(`CREATE INDEX "IDX_540c5134753fbac866502d554e" ON "lwp_class_sequence_assignment" ("classId") `);
        await queryRunner.query(`CREATE INDEX "IDX_6d29d30843337e30775ad14bf7" ON "lwp_class_sequence_assignment" ("sequenceId") `);
        await queryRunner.query(`CREATE INDEX "IDX_2af81902508ea3a8642ff570e5" ON "lwp_class_sequence_assignment" ("logCreatedById") `);
        await queryRunner.query(`CREATE INDEX "IDX_93a355ce04c02cf8305e7a764d" ON "lwp_class_sequence_assignment" ("logUpdatedById") `);
        await queryRunner.query(`ALTER TABLE "lwp_class_topic" ADD "classSequenceAssignmentId" bigint`);
        await queryRunner.query(`CREATE INDEX "IDX_8b41f2bc9d2b812960d38229c5" ON "lwp_class_topic" ("classSequenceAssignmentId") `);
        await queryRunner.query(
            `ALTER TABLE "lwp_class_topic" ADD CONSTRAINT "UQ_class_topic_assignment_topic" UNIQUE ("classSequenceAssignmentId", "topicId")`
        );
        await queryRunner.query(
            `ALTER TABLE "static_lwp_topic_sequence_item" ADD CONSTRAINT "FK_42602b69e01152aa1dd61724e5d" FOREIGN KEY ("sequenceId") REFERENCES "static_lwp_topic_sequence"("id") ON DELETE CASCADE ON UPDATE NO ACTION`
        );
        await queryRunner.query(
            `ALTER TABLE "static_lwp_topic_sequence_item" ADD CONSTRAINT "FK_bd7f79c52a3d7e0f7c306906176" FOREIGN KEY ("topicId") REFERENCES "static_lwp_topic"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`
        );
        await queryRunner.query(
            `ALTER TABLE "static_lwp_topic_sequence_item" ADD CONSTRAINT "FK_50d86b423a249d2b05471aebb8f" FOREIGN KEY ("logCreatedById") REFERENCES "lwp_user"("id") ON DELETE SET NULL ON UPDATE NO ACTION`
        );
        await queryRunner.query(
            `ALTER TABLE "static_lwp_topic_sequence_item" ADD CONSTRAINT "FK_da76dd27319e273f02ace9a4554" FOREIGN KEY ("logUpdatedById") REFERENCES "lwp_user"("id") ON DELETE SET NULL ON UPDATE NO ACTION`
        );
        await queryRunner.query(
            `ALTER TABLE "static_lwp_topic_sequence" ADD CONSTRAINT "FK_7aa7195aa7dd08de3fe5c818d78" FOREIGN KEY ("subjectId") REFERENCES "static_lwp_subject"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`
        );
        await queryRunner.query(
            `ALTER TABLE "static_lwp_topic_sequence" ADD CONSTRAINT "FK_a97cc03ec9076cdeca3d3217b39" FOREIGN KEY ("yearGroupId") REFERENCES "static_lwp_year_group"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`
        );
        await queryRunner.query(
            `ALTER TABLE "static_lwp_topic_sequence" ADD CONSTRAINT "FK_b9660f31445d7310736437175a3" FOREIGN KEY ("logCreatedById") REFERENCES "lwp_user"("id") ON DELETE SET NULL ON UPDATE NO ACTION`
        );
        await queryRunner.query(
            `ALTER TABLE "static_lwp_topic_sequence" ADD CONSTRAINT "FK_6344fe1415e601e5b7c6bf04855" FOREIGN KEY ("logUpdatedById") REFERENCES "lwp_user"("id") ON DELETE SET NULL ON UPDATE NO ACTION`
        );
        await queryRunner.query(
            `ALTER TABLE "lwp_class_sequence_assignment" ADD CONSTRAINT "FK_540c5134753fbac866502d554ef" FOREIGN KEY ("classId") REFERENCES "lwp_school_class"("id") ON DELETE CASCADE ON UPDATE NO ACTION`
        );
        await queryRunner.query(
            `ALTER TABLE "lwp_class_sequence_assignment" ADD CONSTRAINT "FK_6d29d30843337e30775ad14bf74" FOREIGN KEY ("sequenceId") REFERENCES "static_lwp_topic_sequence"("id") ON DELETE SET NULL ON UPDATE NO ACTION`
        );
        await queryRunner.query(
            `ALTER TABLE "lwp_class_sequence_assignment" ADD CONSTRAINT "FK_2af81902508ea3a8642ff570e5f" FOREIGN KEY ("logCreatedById") REFERENCES "lwp_user"("id") ON DELETE SET NULL ON UPDATE NO ACTION`
        );
        await queryRunner.query(
            `ALTER TABLE "lwp_class_sequence_assignment" ADD CONSTRAINT "FK_93a355ce04c02cf8305e7a764de" FOREIGN KEY ("logUpdatedById") REFERENCES "lwp_user"("id") ON DELETE SET NULL ON UPDATE NO ACTION`
        );
        await queryRunner.query(
            `ALTER TABLE "lwp_class_topic" ADD CONSTRAINT "FK_8b41f2bc9d2b812960d38229c50" FOREIGN KEY ("classSequenceAssignmentId") REFERENCES "lwp_class_sequence_assignment"("id") ON DELETE SET NULL ON UPDATE NO ACTION`
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "lwp_class_topic" DROP CONSTRAINT "FK_8b41f2bc9d2b812960d38229c50"`);
        await queryRunner.query(`ALTER TABLE "lwp_class_sequence_assignment" DROP CONSTRAINT "FK_93a355ce04c02cf8305e7a764de"`);
        await queryRunner.query(`ALTER TABLE "lwp_class_sequence_assignment" DROP CONSTRAINT "FK_2af81902508ea3a8642ff570e5f"`);
        await queryRunner.query(`ALTER TABLE "lwp_class_sequence_assignment" DROP CONSTRAINT "FK_6d29d30843337e30775ad14bf74"`);
        await queryRunner.query(`ALTER TABLE "lwp_class_sequence_assignment" DROP CONSTRAINT "FK_540c5134753fbac866502d554ef"`);
        await queryRunner.query(`ALTER TABLE "static_lwp_topic_sequence" DROP CONSTRAINT "FK_6344fe1415e601e5b7c6bf04855"`);
        await queryRunner.query(`ALTER TABLE "static_lwp_topic_sequence" DROP CONSTRAINT "FK_b9660f31445d7310736437175a3"`);
        await queryRunner.query(`ALTER TABLE "static_lwp_topic_sequence" DROP CONSTRAINT "FK_a97cc03ec9076cdeca3d3217b39"`);
        await queryRunner.query(`ALTER TABLE "static_lwp_topic_sequence" DROP CONSTRAINT "FK_7aa7195aa7dd08de3fe5c818d78"`);
        await queryRunner.query(`ALTER TABLE "static_lwp_topic_sequence_item" DROP CONSTRAINT "FK_da76dd27319e273f02ace9a4554"`);
        await queryRunner.query(`ALTER TABLE "static_lwp_topic_sequence_item" DROP CONSTRAINT "FK_50d86b423a249d2b05471aebb8f"`);
        await queryRunner.query(`ALTER TABLE "static_lwp_topic_sequence_item" DROP CONSTRAINT "FK_bd7f79c52a3d7e0f7c306906176"`);
        await queryRunner.query(`ALTER TABLE "static_lwp_topic_sequence_item" DROP CONSTRAINT "FK_42602b69e01152aa1dd61724e5d"`);
        await queryRunner.query(`ALTER TABLE "lwp_class_topic" DROP CONSTRAINT "UQ_class_topic_assignment_topic"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_8b41f2bc9d2b812960d38229c5"`);
        await queryRunner.query(`ALTER TABLE "lwp_class_topic" DROP COLUMN "classSequenceAssignmentId"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_93a355ce04c02cf8305e7a764d"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_2af81902508ea3a8642ff570e5"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_6d29d30843337e30775ad14bf7"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_540c5134753fbac866502d554e"`);
        await queryRunner.query(`DROP TABLE "lwp_class_sequence_assignment"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_6344fe1415e601e5b7c6bf0485"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_b9660f31445d7310736437175a"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_a97cc03ec9076cdeca3d3217b3"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_7aa7195aa7dd08de3fe5c818d7"`);
        await queryRunner.query(`DROP TABLE "static_lwp_topic_sequence"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_da76dd27319e273f02ace9a455"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_50d86b423a249d2b05471aebb8"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_bd7f79c52a3d7e0f7c30690617"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_42602b69e01152aa1dd61724e5"`);
        await queryRunner.query(`DROP TABLE "static_lwp_topic_sequence_item"`);
    }
}
