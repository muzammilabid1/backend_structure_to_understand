import {MigrationInterface, QueryRunner} from "typeorm";

export class DropLwpSchoolTagsTable1739955402130 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "lwp_school_tags"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `CREATE TABLE "lwp_school_tags" ("staticLwpSchoolTagId" bigint NOT NULL, "lwpSchoolId" bigint NOT NULL, CONSTRAINT "PK_0f29c3a1c374d4802c73f305679" PRIMARY KEY ("staticLwpSchoolTagId", "lwpSchoolId"))`
        );
        await queryRunner.query(`CREATE INDEX "IDX_92877775eac967fecd9fffcdfd" ON "lwp_school_tags" ("staticLwpSchoolTagId") `);
        await queryRunner.query(`CREATE INDEX "IDX_3c94e85ec87816a64a712efa09" ON "lwp_school_tags" ("lwpSchoolId") `);
        await queryRunner.query(
            `ALTER TABLE "lwp_school_tags" ADD CONSTRAINT "FK_92877775eac967fecd9fffcdfdd" FOREIGN KEY ("staticLwpSchoolTagId") REFERENCES "static_lwp_school_tag"("id") ON DELETE CASCADE ON UPDATE CASCADE`
        );
        await queryRunner.query(
            `ALTER TABLE "lwp_school_tags" ADD CONSTRAINT "FK_3c94e85ec87816a64a712efa09c" FOREIGN KEY ("lwpSchoolId") REFERENCES "lwp_school"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
        );
    }

}
