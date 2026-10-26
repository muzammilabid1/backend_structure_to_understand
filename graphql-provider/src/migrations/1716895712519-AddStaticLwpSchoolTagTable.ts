import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddStaticLwpSchoolTagTable1716895712519 implements MigrationInterface {
    name = 'AddStaticLwpSchoolTagTable1716895712519';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `CREATE TABLE "static_lwp_school_tag" ("id" BIGSERIAL NOT NULL, "name" character varying NOT NULL, "color" character varying NOT NULL, "deletedAt" TIMESTAMP, "logCreatedAt" TIMESTAMP DEFAULT ('now'::text)::timestamp(6) with time zone, "logUpdatedAt" TIMESTAMP NOT NULL DEFAULT ('now'::text)::timestamp(6) with time zone, "deletedById" bigint, "logCreatedById" bigint, "logUpdatedById" bigint, CONSTRAINT "PK_eab047b3f7bfb8a6d0d21726262" PRIMARY KEY ("id"))`
        );
        await queryRunner.query(
            `CREATE TABLE "lwp_school_tags" ("staticLwpSchoolTagId" bigint NOT NULL, "lwpSchoolId" bigint NOT NULL, CONSTRAINT "PK_0f29c3a1c374d4802c73f305679" PRIMARY KEY ("staticLwpSchoolTagId", "lwpSchoolId"))`
        );
        await queryRunner.query(`CREATE INDEX "IDX_92877775eac967fecd9fffcdfd" ON "lwp_school_tags" ("staticLwpSchoolTagId") `);
        await queryRunner.query(`CREATE INDEX "IDX_3c94e85ec87816a64a712efa09" ON "lwp_school_tags" ("lwpSchoolId") `);
        await queryRunner.query(
            `ALTER TABLE "static_lwp_school_tag" ADD CONSTRAINT "FK_46ecec32d5bc90fe9e09dbc9d4b" FOREIGN KEY ("deletedById") REFERENCES "lwp_user"("id") ON DELETE SET NULL ON UPDATE NO ACTION`
        );
        await queryRunner.query(
            `ALTER TABLE "static_lwp_school_tag" ADD CONSTRAINT "FK_2a655ce9718a4945edeae4960d9" FOREIGN KEY ("logCreatedById") REFERENCES "lwp_user"("id") ON DELETE SET NULL ON UPDATE NO ACTION`
        );
        await queryRunner.query(
            `ALTER TABLE "static_lwp_school_tag" ADD CONSTRAINT "FK_8a648f6142f6bf4762d4cf2d3b1" FOREIGN KEY ("logUpdatedById") REFERENCES "lwp_user"("id") ON DELETE SET NULL ON UPDATE NO ACTION`
        );
        await queryRunner.query(
            `ALTER TABLE "lwp_school_tags" ADD CONSTRAINT "FK_92877775eac967fecd9fffcdfdd" FOREIGN KEY ("staticLwpSchoolTagId") REFERENCES "static_lwp_school_tag"("id") ON DELETE CASCADE ON UPDATE CASCADE`
        );
        await queryRunner.query(
            `ALTER TABLE "lwp_school_tags" ADD CONSTRAINT "FK_3c94e85ec87816a64a712efa09c" FOREIGN KEY ("lwpSchoolId") REFERENCES "lwp_school"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "lwp_school_tags" DROP CONSTRAINT "FK_3c94e85ec87816a64a712efa09c"`);
        await queryRunner.query(`ALTER TABLE "lwp_school_tags" DROP CONSTRAINT "FK_92877775eac967fecd9fffcdfdd"`);
        await queryRunner.query(`ALTER TABLE "static_lwp_school_tag" DROP CONSTRAINT "FK_8a648f6142f6bf4762d4cf2d3b1"`);
        await queryRunner.query(`ALTER TABLE "static_lwp_school_tag" DROP CONSTRAINT "FK_2a655ce9718a4945edeae4960d9"`);
        await queryRunner.query(`ALTER TABLE "static_lwp_school_tag" DROP CONSTRAINT "FK_46ecec32d5bc90fe9e09dbc9d4b"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_3c94e85ec87816a64a712efa09"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_92877775eac967fecd9fffcdfd"`);
        await queryRunner.query(`DROP TABLE "lwp_school_tags"`);
        await queryRunner.query(`DROP TABLE "static_lwp_school_tag"`);
    }
}
